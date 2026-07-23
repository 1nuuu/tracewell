#!/usr/bin/env python3
"""
Tracewell Agent — Deploy a Ritual Sovereign Agent harness that reads
OracleFeed data and posts AI market analysis on-chain.

Uses SovereignAgentFactory (Mode 2) for persistent agent identity
visible in the Ritual explorer's Agents tab.

Flow:
1. deployHarness(salt) → creates harness
2. configureFundAndStart with market data prompt
3. Harness autonomously calls 0x080C → LLM → result on-chain

Prerequisites:
    pip install web3 eth-abi eciespy
    cp .env.example .env

Usage:
    python3 scripts/deploy-tracewell-agent.py
"""

import json, os, sys, time
from pathlib import Path
from ecies import encrypt as ecies_encrypt
from ecies.config import ECIES_CONFIG
from eth_abi.abi import encode
from web3 import Web3

ECIES_CONFIG.symmetric_nonce_length = 12

def load_env():
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
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
PRIVATE_KEY = os.environ["PRIVATE_KEY"]
ORACLE_FEED = os.environ.get("ORACLE_FEED_ADDRESS", "0x19688CdD80F011814FA9a67CFe1A8e375CC7E57F")

FACTORY = "0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304"
REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F"
WALLET = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948"

SALT = os.environ.get("TRACEWELL_AGENT_SALT", "tracewell-agent-v1")
CLI_TYPE = int(os.environ.get("CLI_TYPE", "6"))  # ZeroClaw
FREQUENCY = int(os.environ.get("FREQUENCY", "5000"))  # ~29 min
FUND_AMOUNT = float(os.environ.get("FUND_AMOUNT", "0.5"))

TOKENS = [
    "bitcoin", "ethereum", "tether", "binancecoin", "solana",
    "ripple", "usd-coin", "cardano", "dogecoin",
    "chainlink", "avalanche-2", "sui", "polkadot",
    "shiba-inu", "litecoin", "bitcoin-cash", "uniswap", "near",
]

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

FACTORY_ABI = [
    {"name": "predictHarness", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "owner", "type": "address"}, {"name": "userSalt", "type": "bytes32"}],
     "outputs": [{"name": "harness", "type": "address"}, {"name": "childSalt", "type": "bytes32"}]},
    {"name": "deployHarness", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "userSalt", "type": "bytes32"}],
     "outputs": [{"name": "harness", "type": "address"}]},
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

SOVEREIGN_REQUEST_TYPES = [
    "address", "uint256", "bytes", "uint64", "uint64", "string",
    "address", "bytes4", "uint256", "uint256", "uint256", "uint16",
    "string", "bytes",
    "(string,string,string)", "(string,string,string)",
    "(string,string,string)[]", "(string,string,string)",
    "string", "string[]", "uint16", "uint32", "string",
]


def send_tx(w3, tx_data, to, value=0, gas_limit=5_000_000):
    account = w3.eth.account.from_key(PRIVATE_KEY)
    if isinstance(tx_data, str):
        tx_data = bytes.fromhex(tx_data[2:]) if tx_data.startswith("0x") else bytes.fromhex(tx_data)
    tx = {
        "from": account.address, "to": Web3.to_checksum_address(to),
        "value": value, "data": tx_data,
        "nonce": w3.eth.get_transaction_count(account.address),
        "maxFeePerGas": w3.to_wei(20, "gwei"),
        "maxPriorityFeePerGas": w3.to_wei(1, "gwei"),
        "chainId": 1979, "type": 2, "gas": gas_limit,
    }
    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  tx: {tx_hash.hex()}")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    print(f"  status: {'OK' if receipt.status == 1 else 'FAIL'} (gas {receipt.gasUsed})")
    return receipt


def format_feed(feed, token_name):
    price = feed[0] / 1e18
    volume = feed[1] / 1e18
    vol_pct = feed[2] / 1e18
    f_mean = feed[3] / 1e18
    f_low = feed[4] / 1e18
    f_high = feed[5] / 1e18
    return (f"{token_name}: ${price:,.2f} | 24h vol ${volume:,.0f} | "
            f"change {vol_pct:+.2f}% | forecast ${f_low:,.0f}-${f_high:,.0f} (mean ${f_mean:,.0f})")


def main():
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    account = w3.eth.account.from_key(PRIVATE_KEY)
    print(f"Sender:  {account.address}")
    print(f"Chain:   {w3.eth.chain_id}")
    print(f"Oracle:  {ORACLE_FEED}")
    print()

    # ── 1. Read OracleFeed ──
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
        except:
            pass
    if not feeds:
        print("ERROR: No feed data"); sys.exit(1)
    print()

    # ── 2. Build prompt ──
    feed_lines = [format_feed(f, name) for name, f in feeds.items()]
    prompt = (
        "You are Tracewell, an on-chain market analysis agent on Ritual Chain.\n\n"
        "Analyze the following cryptocurrency market data from Tracewell OracleFeed.\n\n"
        "MARKET DATA:\n" + "\n".join(feed_lines) + "\n\n"
        "Respond with JSON:\n"
        '{"sentiment":"bullish|bearish|neutral","top_movers":[...],"summary":"..."}'
    )
    print(f"Prompt: {len(prompt)} chars\n")

    # ── 3. Deploy harness via factory ──
    factory = w3.eth.contract(address=FACTORY, abi=FACTORY_ABI)
    user_salt = Web3.keccak(text=SALT)
    predicted, _ = factory.functions.predictHarness(account.address, user_salt).call()
    print(f"Predicted harness: {predicted}")
    code = w3.eth.get_code(predicted)
    if code and code != b"":
        print("Harness already deployed!")
        harness = predicted
    else:
        print("Deploying harness...")
        data = factory.encode_abi("deployHarness", [user_salt])
        r = send_tx(w3, data, FACTORY, gas_limit=3_000_000)
        if r.status != 1: print("deployHarness failed!"); sys.exit(1)
        harness = predicted
    print(f"Harness: {harness}\n")

    # ── 4. Get executor + encrypt ──
    registry = w3.eth.contract(address=REGISTRY, abi=REGISTRY_ABI)
    services = registry.functions.getServicesByCapability(0, True).call()
    if not services: print("No executors"); sys.exit(1)
    node = services[0][0]
    executor = Web3.to_checksum_address(node[1])
    pub_key = bytes(node[3])
    print(f"Executor: {executor}")

    llm_provider = os.environ.get("LLM_PROVIDER", "openai").lower()
    secrets = {"LLM_PROVIDER": llm_provider}
    if llm_provider == "openai":
        secrets["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "")
    elif llm_provider == "openrouter":
        secrets["OPENROUTER_API_KEY"] = os.environ.get("OPENROUTER_API_KEY", "")
    secrets["HF_TOKEN"] = os.environ.get("HF_TOKEN", "")
    secrets_json = json.dumps(secrets)
    encrypted = ecies_encrypt(pub_key.hex(), secrets_json.encode())
    model = os.environ.get("MODEL", "gpt-4o-mini")
    print(f"Model: {model}")

    # ── 5. configureFundAndStart ──
    delivery_selector = Web3.keccak(text="onSovereignAgentResult(bytes32,bytes)")[:4]
    receiver = os.environ.get("RECEIVER_ADDRESS", "0x6f9e33170C2d063a126BC591339C87faAF6dFFdf")
    print(f"Receiver:      {receiver}")

    params = [
        executor, 10_000, b"", 5, 6000, "SOVEREIGN_AGENT_TASK",
        Web3.to_checksum_address(receiver), delivery_selector,
        3_000_000, 1_000_000_000, 100_000_000, CLI_TYPE,
        prompt, encrypted,
        ("", "", ""), ("", "", ""), [],
        ("", "", ""), model, [], 50, 0, RPC_URL,
    ]

    schedule = (500000, FREQUENCY, 1000,
                w3.to_wei(20, "gwei"), w3.to_wei(1, "gwei"), 0)
    rolling = (5, 5000, 1)
    lock_duration = 0

    selector = bytes.fromhex("b1906702")
    encoded_args = encode(
        [f"({','.join(SOVEREIGN_REQUEST_TYPES)})",
         "(uint32,uint32,uint32,uint256,uint256,uint256)",
         "(uint32,uint16,uint16)", "uint256"],
        [params, schedule, rolling, lock_duration]
    )
    calldata = selector + encoded_args
    scheduler_funding = w3.to_wei(FUND_AMOUNT, "ether")
    print(f"Funding: {FUND_AMOUNT} RITUAL\n")

    print("configureFundAndStart...")
    r = send_tx(w3, calldata, harness, value=scheduler_funding, gas_limit=6_000_000)
    if r.status == 1:
        print(f"\n{'='*60}")
        print("TRACEWELL AGENT DEPLOYED!")
        print(f"Harness:   {harness}")
        print(f"Model:     {model}")
        print(f"Frequency: every {FREQUENCY} blocks (~{FREQUENCY*0.35/60:.1f} min)")
        print(f"Explorer:  https://explorer.ritualfoundation.org/address/{harness}")
        print(f"Agents tab: https://explorer.ritualfoundation.org/agents/{harness}")
        print(f"{'='*60}")
    else:
        print("configureFundAndStart FAILED")


if __name__ == "__main__":
    main()
