#!/usr/bin/env bun
// Tracewell Keeper — OracleFeed batch updater
//
// Fetches feed data for 5 tokens from Tracewell API, signs an EIP-712
// batch update with viem, and submits to OracleFeed on Ritual Chain testnet.
//
// Usage:
//   cp keeper/.env.example keeper/.env
//   # Fill in KEEPER_PRIVATE_KEY in keeper/.env
//   cd keeper && bun run updateFeed.ts
//
// Or inline:
//   KEEPER_PRIVATE_KEY=0x... TRACEWELL_API_URL=... bun run keeper/updateFeed.ts

import { createPublicClient, createWalletClient, http, keccak256, toHex, parseEther, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ─── Configuration (from env) ────────────────────────────────────────────

const TRACEWELL_API_URL = process.env.TRACEWELL_API_URL || "https://tracewell-zeta.vercel.app";
const ORACLE_FEED_ADDRESS = process.env.ORACLE_FEED_ADDRESS || "0x19688CdD80F011814FA9a67CFe1A8e375CC7E57F";
const RITUAL_RPC_URL = process.env.RITUAL_RPC_URL || "https://rpc.ritualfoundation.org";
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "1979", 10);
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;

if (!KEEPER_PRIVATE_KEY) {
    console.error("ERROR: KEEPER_PRIVATE_KEY not set. Export it or create keeper/.env");
    process.exit(1);
}

// ─── Ritual Chain definition ──────────────────────────────────────────────

const ritualChain = defineChain({
    id: CHAIN_ID,
    name: "Ritual Chain Testnet",
    nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
    rpcUrls: { default: { http: [RITUAL_RPC_URL] } },
});

// ─── Token list (must match OracleFeed tokenIds exactly) ─────────────────

const TOKENS = [
    "bitcoin", "ethereum", "tether", "binancecoin", "solana",
    "ripple", "usd-coin", "staked-ether", "cardano", "dogecoin",
    "tron", "chainlink", "avalanche-2", "sui", "polkadot",
    "shiba-inu", "litecoin", "bitcoin-cash", "uniswap", "near",
    "aptos", "monero", "arbitrum", "cosmos", "filecoin",
] as const;

// ─── EIP-712 domain + types (verified working in verify-viem-signing.mjs) ─

const domain = {
    name: "OracleFeed",
    version: "1",
    chainId: CHAIN_ID,
    verifyingContract: ORACLE_FEED_ADDRESS as `0x${string}`,
} as const;

const types = {
    FeedData: [
        { name: "price", type: "uint256" },
        { name: "volume", type: "uint256" },
        { name: "volatility", type: "uint256" },
        { name: "forecastMean", type: "uint256" },
        { name: "forecastLow", type: "uint256" },
        { name: "forecastHigh", type: "uint256" },
        { name: "lastUpdated", type: "uint64" },
    ],
    BatchUpdate: [
        { name: "tokenIds", type: "bytes32[]" },
        { name: "data", type: "FeedData[]" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
} as const;

// ─── OracleFeed ABI (minimal — just what the keeper needs) ───────────────

const oracleAbi = [
    {
        type: "function",
        name: "batchUpdate",
        inputs: [
            { name: "tokenIds", type: "bytes32[]" },
            {
                name: "data", type: "tuple[]", components: [
                    { name: "price", type: "uint256" },
                    { name: "volume", type: "uint256" },
                    { name: "volatility", type: "uint256" },
                    { name: "forecastMean", type: "uint256" },
                    { name: "forecastLow", type: "uint256" },
                    { name: "forecastHigh", type: "uint256" },
                    { name: "lastUpdated", type: "uint64" },
                ]
            },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
            { name: "signature", type: "bytes" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "lastNonce",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
] as const;

// ─── Custom error selectors (for decoding revert reasons) ────────────────

const ERROR_SELECTORS: Record<string, string> = {
    "0x5fc483c5": "OnlyOwner()",
    "0xc60eb335": "OnlyKeeper()",
    "0xc2e5347d": "EmptyBatch()",
    "0xff633a38": "LengthMismatch()",
    "0xaa2fd925": "Expired(deadline, timestamp)",
    "0x06427aeb": "InvalidNonce(provided, lastNonce)",
    "0xcd97203f": "InvalidPrice(tokenId)",
};

function decodeRevertReason(data: string): string {
    if (!data || data === "0x") return "unknown revert (no data)";
    const selector = data.slice(0, 10);
    return ERROR_SELECTORS[selector] || `unknown selector ${selector}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function scaleTo1e18(value: number): bigint {
    // String-based: avoids floating-point multiplication for values that
    // exceed Number.MAX_SAFE_INTEGER when scaled (critical for volume fields
    // in the tens of billions). Uses toFixed(18) for exact decimal
    // representation, then splits integer/fractional parts.
    const [intPart, fracPart] = value.toFixed(18).split(".");
    return BigInt(intPart) * (10n ** 18n) + BigInt(fracPart);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Fetch a single token's feed data from Tracewell API ─────────────────

async function fetchTokenData(tokenId: string): Promise<{
    price: number;
    volume: number;
    volatility: number;
    forecast: { mean: number; low: number; high: number };
}> {
    const url = `${TRACEWELL_API_URL}/api/features/all/${encodeURIComponent(tokenId)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.error) {
        throw new Error(`API error: ${json.error}`);
    }

    // Validate required fields
    if (json.price === undefined || json.price === null) throw new Error("Missing price");
    if (json.volume === undefined || json.volume === null) throw new Error("Missing volume");
    if (json.volatility === undefined || json.volatility === null) throw new Error("Missing volatility");
    if (!json.forecast || json.forecast.mean === undefined) throw new Error("Missing forecast");

    return {
        price: Number(json.price),
        volume: Number(json.volume),
        volatility: Number(json.volatility),
        forecast: {
            mean: Number(json.forecast.mean),
            low: Number(json.forecast.low),
            high: Number(json.forecast.high),
        },
    };
}

async function fetchWithRetry(tokenId: string): Promise<{
    price: number; volume: number; volatility: number;
    forecast: { mean: number; low: number; high: number };
}> {
    try {
        return await fetchTokenData(tokenId);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  Retry needed for ${tokenId}: ${msg}`);
        await sleep(3000);
        return await fetchTokenData(tokenId); // let this throw on second failure
    }
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
    const account = privateKeyToAccount(KEEPER_PRIVATE_KEY as `0x${string}`);
    console.log(`Keeper address: ${account.address}`);
    console.log(`OracleFeed:      ${ORACLE_FEED_ADDRESS}`);
    console.log(`API:             ${TRACEWELL_API_URL}`);
    console.log(`Chain ID:        ${CHAIN_ID}`);
    console.log();

    const publicClient = createPublicClient({
        chain: ritualChain,
        transport: http(),
    });
    const walletClient = createWalletClient({
        account,
        chain: ritualChain,
        transport: http(),
    });

    // ── Step 1: Fetch all 5 tokens sequentially with delay ──
    console.log("Fetching token data...");
    const tokenDataMap = new Map<string, { price: number; volume: number; volatility: number; forecast: { mean: number; low: number; high: number } }>();
    const failedTokens: string[] = [];

    for (let i = 0; i < TOKENS.length; i++) {
        const tokenId = TOKENS[i];
        try {
            const data = await fetchWithRetry(tokenId);
            tokenDataMap.set(tokenId, data);
            console.log(`  [${i + 1}/${TOKENS.length}] ${tokenId}: price=${data.price.toFixed(2)}, vol=${data.volatility.toFixed(2)}%`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`  [${i + 1}/${TOKENS.length}] ${tokenId}: FAILED — ${msg}`);
            failedTokens.push(tokenId);
        }

        // Delay between requests (skip after the last one)
        if (i < TOKENS.length - 1) {
            await sleep(1500);
        }
    }

    // ── Step 2: Fail if any token fetch failed ──
    if (failedTokens.length > 0) {
        console.error(`\nERROR: ${failedTokens.length} token(s) failed: ${failedTokens.join(", ")}`);
        console.error("Aborting — no partial batch submitted.");
        process.exit(1);
    }
    console.log();

    // ── Step 3: Fetch chain timestamp + build tokenIds/FeedData arrays ──
    //
    // NOTE: Ritual Chain uses block.timestamp in MILLISECONDS, not seconds.
    // This is a known quirk — standard EVM chains use seconds. All timestamp
    // values (lastUpdated, deadline) must be in milliseconds for consistency
    // with block.timestamp comparisons in OracleFeed.batchUpdate().
    console.log("Fetching chain timestamp...");
    const chainBlock = await publicClient.getBlock();
    const chainTimestamp = chainBlock.timestamp; // milliseconds on Ritual Chain
    console.log(`  Chain timestamp: ${chainTimestamp} ms`);
    const tokenIds: `0x${string}`[] = [];
    const feedData: {
        price: bigint; volume: bigint; volatility: bigint;
        forecastMean: bigint; forecastLow: bigint; forecastHigh: bigint;
        lastUpdated: bigint;
    }[] = [];

    for (const tokenId of TOKENS) {
        const d = tokenDataMap.get(tokenId)!;
        tokenIds.push(keccak256(toHex(tokenId)));
        feedData.push({
            price: scaleTo1e18(d.price),
            volume: scaleTo1e18(d.volume),
            volatility: scaleTo1e18(Math.abs(d.volatility)), // unsigned magnitude
            forecastMean: scaleTo1e18(d.forecast.mean),
            forecastLow: scaleTo1e18(d.forecast.low),
            forecastHigh: scaleTo1e18(d.forecast.high),
            lastUpdated: chainTimestamp,
        });
    }

    // ── Step 4: Read nonce from chain ──
    console.log("Reading lastNonce from OracleFeed...");
    const lastNonce = await publicClient.readContract({
        address: ORACLE_FEED_ADDRESS as `0x${string}`,
        abi: oracleAbi,
        functionName: "lastNonce",
    }) as bigint;
    const nonce = lastNonce + 1n;
    // Ritual Chain uses millisecond timestamps — 600000 ms = 10 minutes
    const deadline = chainTimestamp + 600000n;
    console.log(`  lastNonce: ${lastNonce.toString()} → using nonce: ${nonce.toString()}`);
    console.log(`  deadline:  ${deadline.toString()} ms (${new Date(Number(deadline)).toISOString()})`);
    console.log();

    // ── Step 5: Sign batch with viem EIP-712 ──
    console.log("Signing batch with viem signTypedData...");
    const value = { tokenIds, data: feedData, nonce, deadline };
    const signature = await walletClient.signTypedData({
        domain,
        types,
        primaryType: "BatchUpdate",
        message: value,
    });
    console.log(`  Signature: ${signature.slice(0, 42)}...`);
    console.log();

    // ── Step 6: Submit batchUpdate ──
    console.log("Submitting batchUpdate transaction...");
    try {
        const hash = await walletClient.writeContract({
            address: ORACLE_FEED_ADDRESS as `0x${string}`,
            abi: oracleAbi,
            functionName: "batchUpdate",
            args: [tokenIds, feedData, nonce, deadline, signature],
        });
        console.log(`  TX hash: ${hash}`);

        // Wait for receipt
        console.log("Waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`  Block:   ${receipt.blockNumber}`);
        console.log(`  Status:  ${receipt.status === "success" ? "SUCCESS" : "FAILED"}`);
        console.log(`  Gas:     ${receipt.gasUsed}`);
        console.log();
        console.log("Batch update complete.");
    } catch (err: any) {
        // Try to decode revert reason
        const data = err?.data || err?.cause?.data || "";
        const reason = decodeRevertReason(data);
        console.error(`\nREVERT: ${reason}`);
        if (err.shortMessage) console.error(`  Message: ${err.shortMessage}`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
