// Part B: End-to-end EIP-712 interoperability check with viem
// Verifies that a viem-generated signature (independent types/domain definition)
// is accepted by OracleFeed.batchUpdate() on a local Anvil instance.

import { createPublicClient, createWalletClient, http, keccak256, toHex } from "viem";
import { anvil } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.ANVIL_RPC || "http://localhost:8545";
const KEEPER_PK = process.env.KEEPER_PK;
const CONTRACT_ADDR = process.env.CONTRACT;

if (!KEEPER_PK || !CONTRACT_ADDR) {
    console.error("Usage: ANVIL_RPC=... KEEPER_PK=0x... CONTRACT=0x... node scripts/verify-viem-signing.mjs");
    process.exit(1);
}

// Independent EIP-712 domain definition — NOT imported from the contract
const domain = {
    name: "OracleFeed",
    version: "1",
    chainId: 31337,
    verifyingContract: CONTRACT_ADDR,
};

// Independent EIP-712 types — NOT imported from the contract
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
};

const oracleAbi = [
    {
        type: "function",
        name: "batchUpdate",
        inputs: [
            { name: "tokenIds", type: "bytes32[]" },
            { name: "data", type: "tuple[]", components: [
                { name: "price", type: "uint256" },
                { name: "volume", type: "uint256" },
                { name: "volatility", type: "uint256" },
                { name: "forecastMean", type: "uint256" },
                { name: "forecastLow", type: "uint256" },
                { name: "forecastHigh", type: "uint256" },
                { name: "lastUpdated", type: "uint64" },
            ]},
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
            { name: "signature", type: "bytes" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "getFeed",
        inputs: [{ name: "tokenId", type: "bytes32" }],
        outputs: [{ type: "tuple", components: [
            { name: "price", type: "uint256" },
            { name: "volume", type: "uint256" },
            { name: "volatility", type: "uint256" },
            { name: "forecastMean", type: "uint256" },
            { name: "forecastLow", type: "uint256" },
            { name: "forecastHigh", type: "uint256" },
            { name: "lastUpdated", type: "uint64" },
        ]}],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "lastNonce",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
];

async function main() {
    const account = privateKeyToAccount(KEEPER_PK);
    console.log("Keeper address:", account.address);

    const publicClient = createPublicClient({ chain: anvil, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ chain: anvil, transport: http(RPC_URL), account });

    // Sample 1-token batch for bitcoin
    const BTC_ID = keccak256(toHex("bitcoin"));
    const tokenIds = [BTC_ID];
    const now = BigInt(Math.floor(Date.now() / 1000));
    const btcData = {
        price: 50000n * 10n**18n,
        volume: 20n * 10n**9n * 10n**18n,
        volatility: 3n * 10n**18n,
        forecastMean: 51000n * 10n**18n,
        forecastLow: 49000n * 10n**18n,
        forecastHigh: 53000n * 10n**18n,
        lastUpdated: now,
    };
    const data = [btcData];

    // Get current nonce
    const lastNonce = await publicClient.readContract({
        address: CONTRACT_ADDR,
        abi: oracleAbi,
        functionName: "lastNonce",
    });
    const nonce = lastNonce + 1n;
    const deadline = now + 3600n;

    const value = { tokenIds, data, nonce, deadline };
    console.log("Signing batch — nonce:", nonce.toString(), "deadline:", deadline.toString());

    // Sign using viem's signTypedData — independent EIP-712 implementation
    const signature = await walletClient.signTypedData({
        domain,
        types,
        primaryType: "BatchUpdate",
        message: value,
    });
    console.log("Signature:", signature);

    // Submit to contract
    console.log("Submitting batchUpdate...");
    try {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDR,
            abi: oracleAbi,
            functionName: "batchUpdate",
            args: [tokenIds, data, nonce, deadline, signature],
            chain: anvil,
        });
        console.log("TX hash:", hash);

        // Verify storage — read back the feed
        const stored = await publicClient.readContract({
            address: CONTRACT_ADDR,
            abi: oracleAbi,
            functionName: "getFeed",
            args: [tokenIds[0]],
        });
        console.log("Stored price:", stored.price.toString());
        console.log("");
        console.log("SUCCESS — viem-signed batch accepted by OracleFeed.batchUpdate()");
    } catch (err) {
        console.error("REVERT:", err.shortMessage || err.message || String(err));
        process.exit(1);
    }
}

main().catch(err => { console.error(err); process.exit(1); });
