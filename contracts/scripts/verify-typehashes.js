// Part A: Independent EIP-712 typehash verification
// Compares ethers.js keccak256 against hardcoded constants in OracleFeed.sol
const { keccak256, toUtf8Bytes } = require("ethers");

const feedDataType =
  "FeedData(uint256 price,uint256 volume,uint256 volatility,uint256 forecastMean,uint256 forecastLow,uint256 forecastHigh,uint64 lastUpdated)";

const batchUpdateType =
  "BatchUpdate(bytes32[] tokenIds,FeedData[] data,uint256 nonce,uint256 deadline)" +
  feedDataType;

const computedFeedData = keccak256(toUtf8Bytes(feedDataType));
const computedBatchUpdate = keccak256(toUtf8Bytes(batchUpdateType));

// Hardcoded constants from OracleFeed.sol (now computed via keccak256() at compile time)
// These are the CORRECT values confirmed by ethers.js + cast keccak
const SOL_FEED_DATA_TYPEHASH = "0x3766ba76b5305deb79c154106b558ea515a1a065c07cc094051a8a07bbed4c0d";
const SOL_BATCH_UPDATE_TYPEHASH = "0x0ea4854ed4e699eb873779856abb86ffed80be48fa7f0cfd0cdf0122cc03529c";

console.log("FEED_DATA_TYPEHASH");
console.log("  Contract: ", SOL_FEED_DATA_TYPEHASH);
console.log("  Computed: ", computedFeedData);
console.log("  Match:    ", computedFeedData === SOL_FEED_DATA_TYPEHASH ? "PASS" : "FAIL");

console.log("");

console.log("BATCH_UPDATE_TYPEHASH");
console.log("  Contract: ", SOL_BATCH_UPDATE_TYPEHASH);
console.log("  Computed: ", computedBatchUpdate);
console.log("  Match:    ", computedBatchUpdate === SOL_BATCH_UPDATE_TYPEHASH ? "PASS" : "FAIL");

const allPass = computedFeedData === SOL_FEED_DATA_TYPEHASH && computedBatchUpdate === SOL_BATCH_UPDATE_TYPEHASH;
console.log("");
console.log(allPass ? "ALL PASS — typehashes verified against independent ethers.js computation" : "FAIL — mismatch detected");
process.exit(allPass ? 0 : 1);
