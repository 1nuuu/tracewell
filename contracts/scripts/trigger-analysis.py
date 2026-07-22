#!/usr/bin/env python3
"""
Tracewell Agent Trigger — reads OracleFeed, invokes Sovereign Agent for analysis.

Flow:
1. Read 18 token feeds from OracleFeed on Ritual Chain
2. Build structured market analysis prompt
3. Get TEE executor from registry + encrypt LLM API key (ECIES)
4. Build SovereignAgentRequest (23-field tuple) + ABI encode
5. Call TracewellAgent.requestAnalysis() with encoded request
6. Wait for onSovereignAgentResult callback (60-90s for TEE + LLM)

Prerequisites:
    pip install web3 eth-abi eciespy
    cp .env.example .env  # set TRACEWELL_AGENT_ADDRESS, LLM_PROVIDER, API key

Usage:
    python3 scripts/trigger-analysis.py
"""

import json, os, sys, time
from pathlib import Path
from ecies import encrypt as ecies_encrypt
from ecies.config import ECIES_CONFIG
from eth_abi.abi import encode
from web3 import Web3

ECIES_CONFIG.symmetric_nonce_length = 12

# ── Load .env ──
def load_env():
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        # Try project root
        env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())

load_env()

RPC_URL = os.environ.get("RITUAL_RPC_URL", "https://rpc.ritualfoundation.org")
PRIVATE_KEY = os.environ.get("PRIVATE_KEY", "")
ORACLE_FEED = os.environ.get("ORACLE_FEED_ADDRESS", "0x19688CdD80F011814FA9a67CFe1A8e375CC7E57F")
AGENT_ADDRESS = os.environ.get("TRACEWELL_AGENT_ADDRESS", "")
REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F"

# ── Token list (must match keeper + OracleFeed) ──
TOKENS = [
    "bitcoin", "ethereum", "tether", "binancecoin", "solana",
    "ripple", "usd-coin", "cardano", "dogecoin",
    "chainlink", "avalanche-2", "sui", "polkadot",
    "shiba-inu", "litecoin", "bitcoin-cash", "uniswap", "near",
]

# ── ABIs ──
ORACLE_FEED_ABI = [
    {"name": "getFeed", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "tokenId", "type": "bytes32"}],
     "outputs": [{"name": "", "type": "tuple", "components": [
         {"name": "price", "type": "uint256"}, {"name": "volume", "type": "uint256"},
         {"name": "volatility", "type": "uint256"}, {"name": "forecastMean", "type": "uint256"},
         {"name": "forecastLow", "type": "uint256"}, {"name": "forecastHigh", "type": "uint256"},
         {"name": "lastUpdated", "type": "uint64"}
     ]}]
    },
]

AGENT_ABI = [
    {"name": "requestAnalysis", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "encodedRequest", "type": "bytes"}], "outputs": []},
]

REGISTRY_ABI = [
    {"name": "getServicesByCapability", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "capability", "type": "uint8"}, {"name": "checkValidity", "type": "bool"}],
     "outputs": [{"name": "", "type": "tuple[]", "components": [
         {"name": "node", "type": "tuple", "components": [
             {"name": "paymentAddress", "type": "address"}, {"name": "teeAddress", "type": "address"},
             {"name": "teeType", "type": "uint8"}, {"name": "publicKey", "type": "bytes"},
             {"name": "endpoint", "type": "string"}, {"name": "certPubKeyHash", "type": "bytes32"},
             {"name": "capability", "type": "uint8"}
         ]},
         {"name": "isValid", "type": "bool"}, {"name": "workloadId", "type": "bytes32"}
     ]}]
    },
]

# ── 23-field request types ──
SOVEREIGN_REQUEST_TYPES = [
    "address", "uint256", "bytes", "uint64", "uint64", "string",
    "address", "bytes4", "uint256", "uint256", "uint256", "uint16",
    "string", "bytes",
    "(string,string,string)", "(string,string,string)",
    "(string,string,string)[]", "(string,string,string)",
    "string", "string[]", "uint16", "uint32", "string",
]


def format_feed(feed, token_name):
    """Format a feed entry for human-readable prompt."""
    price = feed[0] / 1e18
    volume = feed[1] / 1e18
    vol_pct = feed[2] / 1e18
    f_mean = feed[3] / 1e18
    f_low = feed[4] / 1e18
    f_high = feed[5] / 1e18
    return (f"{token_name}: ${price:,.2f} | 24h vol ${volume:,.0f} | "
            f"change {vol_pct:+.2f}% | forecast ${f_low:,.0f}-${f_high:,.0f} (mean ${f_mean:,.0f})")


def main():
    if not PRIVATE_KEY:
        print("ERROR: PRIVATE_KEY not set")
        sys.exit(1)
    if not AGENT_ADDRESS:
        print("ERROR: TRACEWELL_AGENT_ADDRESS not set")
        sys.exit(1)

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    account = w3.eth.account.from_key(PRIVATE_KEY)
    print(f"Sender:  {account.address}")
    print(f"Chain:   {w3.eth.chain_id}")
    print(f"Oracle:  {ORACLE_FEED}")
    print(f"Agent:   {AGENT_ADDRESS}")
    print()

    # ── Step 1: Read OracleFeed ──
    oracle = w3.eth.contract(address=ORACLE_FEED, abi=ORACLE_FEED_ABI)
    feeds = {}
    print("Reading OracleFeed...")
    for token in TOKENS:
        token_id = Web3.keccak(text=token)
        try:
            feed = oracle.functions.getFeed(token_id).call()
            if feed[0] > 0:
                feeds[token] = feed
                print(f"  {token}: ${feed[0]/1e18:,.2f}")
            else:
                print(f"  {token}: no data yet (price=0)")
        except Exception as e:
            print(f"  {token}: ERROR — {e}")

    if not feeds:
        print("ERROR: No feed data available. Run keeper first.")
        sys.exit(1)
    print()

    # ── Step 2: Build prompt ──
    feed_lines = [format_feed(f, name) for name, f in feeds.items()]
    prompt = (
        "You are Tracewell, an on-chain market analysis agent on Ritual Chain.\n\n"
        "Analyze the following cryptocurrency market data from the Tracewell OracleFeed.\n"
        "Each entry shows: token name, current price, 24h volume, 24h price change %,\n"
        "and forecast range (low-high) with mean.\n\n"
        "MARKET DATA:\n"
        + "\n".join(feed_lines) + "\n\n"
        "TASK:\n"
        "1. Identify the top 3 most notable movements (positive or negative)\n"
        "2. Note any unusual volume or volatility patterns\n"
        "3. Assess overall market sentiment (bullish/bearish/neutral)\n"
        "4. Highlight any tokens where the forecast range is tight (high confidence)\n\n"
        "Respond with a JSON object:\n"
        "{\n"
        '  "sentiment": "bullish|bearish|neutral",\n'
        '  "top_movers": [{"token": "BTC", "change_pct": +1.2, "reason": "..."}],\n'
        '  "unusual_volume": [{"token": "ETH", "note": "..."}],\n'
        '  "high_confidence": [{"token": "SOL", "range_width_pct": 2.1}],\n'
        '  "summary": "One-paragraph market overview."\n'
        "}"
    )
    print(f"Prompt: {len(prompt)} chars")
    print()

    # ── Step 3: Get executor + encrypt secrets ──
    registry = w3.eth.contract(address=REGISTRY, abi=REGISTRY_ABI)
    services = registry.functions.getServicesByCapability(0, True).call()
    if not services:
        print("ERROR: No valid executors found")
        sys.exit(1)

    node = services[0][0]
    executor = Web3.to_checksum_address(node[1])
    pub_key = bytes(node[3])
    print(f"Executor: {executor}")

    # Build secrets JSON
    llm_provider = os.environ.get("LLM_PROVIDER", "openrouter").lower()
    secrets = {"LLM_PROVIDER": llm_provider}
    if llm_provider == "openrouter":
        secrets["OPENROUTER_API_KEY"] = os.environ.get("OPENROUTER_API_KEY", "")
    elif llm_provider == "openai":
        secrets["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "")
    elif llm_provider == "anthropic":
        secrets["ANTHROPIC_API_KEY"] = os.environ.get("ANTHROPIC_API_KEY", "")

    secrets_json = json.dumps(secrets)
    encrypted = ecies_encrypt(pub_key.hex(), secrets_json.encode())
    print(f"Secrets encrypted ({len(encrypted)} bytes)")

    model = os.environ.get("MODEL", "google/gemini-2.5-flash")
    print(f"Model: {model}")
    print()

    # ── Step 4: Build request + encode ──
    delivery_selector = Web3.keccak(text="onSovereignAgentResult(bytes32,bytes)")[:4]

    params = [
        executor, 0, b"", 10, 6000, "TRACEWELL_AGENT",
        Web3.to_checksum_address(AGENT_ADDRESS), delivery_selector,
        3_000_000, 1_000_000_000, 100_000_000, 6,  # cliType=6 (ZeroClaw)
        prompt, encrypted,
        ("", "", ""), ("", "", ""), [],
        ("", "", ""), model, [], 10, 0, RPC_URL,
    ]

    print("Encoding SovereignAgentRequest...")
    encoded = encode([f"({','.join(SOVEREIGN_REQUEST_TYPES)})"], [params])
    print(f"Encoded: {len(encoded)} bytes")
    print()

    # ── Step 5: Submit ──
    agent = w3.eth.contract(address=AGENT_ADDRESS, abi=AGENT_ABI)
    tx_data = agent.encode_abi("requestAnalysis", [encoded])

    tx = {
        "from": account.address,
        "to": Web3.to_checksum_address(AGENT_ADDRESS),
        "data": tx_data,
        "nonce": w3.eth.get_transaction_count(account.address),
        "maxFeePerGas": w3.to_wei(20, "gwei"),
        "maxPriorityFeePerGas": w3.to_wei(1, "gwei"),
        "chainId": 1979,
        "type": 2,
        "gas": 5_000_000,
    }
    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"TX: {tx_hash.hex()}")
    print("Waiting for confirmation...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    print(f"Status: {'OK' if receipt.status == 1 else 'FAIL'} (gas: {receipt.gasUsed})")
    print()
    print("Agent invoked. Analysis will arrive via onSovereignAgentResult callback (60-90s).")
    print(f"Check explorer: https://explorer.ritualfoundation.org/address/{AGENT_ADDRESS}")


if __name__ == "__main__":
    main()
