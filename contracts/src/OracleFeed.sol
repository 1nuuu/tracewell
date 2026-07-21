// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title OracleFeed — On-chain signed market data feeds for Tracewell
/// @notice Stores keeper-signed price, volume, volatility, and forecast data
///         for a set of tokens. Designed for 5 tokens in the MVP phase (bitcoin,
///         ethereum, solana, binancecoin, ripple) but generic enough to extend.
///
/// ## EIP-712 Domain
/// - name:     "OracleFeed"
/// - version:  "1"
/// - chainId:  set at construction from block.chainid
/// - verifyingContract: address(this)
///
/// ## EIP-712 Type Definitions
/// The typed data for `batchUpdate` uses these Solidity structs hashed per EIP-712:
///
/// ```
/// struct FeedData {
///     uint256 price;
///     uint256 volume;
///     uint256 volatility;
///     uint256 forecastMean;
///     uint256 forecastLow;
///     uint256 forecastHigh;
///     uint64 lastUpdated;
/// }
///
/// struct BatchUpdate {
///     bytes32[] tokenIds;
///     FeedData[] data;
///     uint256 nonce;
///     uint256 deadline;
/// }
/// ```
///
/// Each `FeedData` is individually EIP-712 hashed, then the array of those
/// hashes is keccak256'd to produce the `data` field of `BatchUpdate`. The
/// full `BatchUpdate` hash is then wrapped in the EIP-712 domain separator
/// before recovery.
///
/// ## Fail-Closed Design (Intentional for MVP)
/// If ANY single entry in a batch is invalid (e.g. price == 0), the ENTIRE
/// batch reverts. This is an intentional fail-closed design — we prefer
/// missing a data update over silently accepting partial/corrupt data.
/// Future phases may add batch-partial-acceptance with explicit error
/// reporting, but for MVP: all-or-nothing.
contract OracleFeed is EIP712 {
    using ECDSA for bytes32;

    // ─── Structs ──────────────────────────────────────────────────────────

    struct FeedData {
        uint256 price;          // USD price scaled to 1e18
        uint256 volume;         // 24H USD volume scaled to 1e18
        uint256 volatility;     // 24H change % scaled to 1e18 (unsigned magnitude)
        uint256 forecastMean;   // Naive forecast mean price scaled to 1e18
        uint256 forecastLow;    // Forecast low bound scaled to 1e18
        uint256 forecastHigh;   // Forecast high bound scaled to 1e18
        uint64 lastUpdated;     // Unix timestamp of data fetch
    }

    // ─── Storage ──────────────────────────────────────────────────────────

    /// @notice Keeper address authorized to sign batch updates
    address public keeper;

    /// @notice Contract owner (deployer) — can rotate keeper
    address public owner;

    /// @notice Last accepted nonce — strictly monotonic to prevent replay
    uint256 public lastNonce;

    /// @notice Token feed data, keyed by keccak256(CoinGecko ID string)
    mapping(bytes32 => FeedData) public feeds;

    // ─── Events ───────────────────────────────────────────────────────────

    event KeeperRotated(address indexed oldKeeper, address indexed newKeeper);
    event FeedUpdated(
        bytes32 indexed tokenId,
        uint256 price,
        uint256 volatility,
        uint64 lastUpdated
    );
    event BatchUpdated(uint256 nonce, uint256 tokenCount, uint64 timestamp);

    // ─── Errors ───────────────────────────────────────────────────────────

    error OnlyOwner();
    error OnlyKeeper();
    error EmptyBatch();
    error LengthMismatch();
    error Expired(uint256 deadline, uint256 timestamp);
    error InvalidNonce(uint256 provided, uint256 lastNonce);
    error InvalidPrice(bytes32 tokenId);

    // ─── Modifiers ────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────

    /// @param _keeper Initial keeper address authorized to sign updates
    constructor(address _keeper) EIP712("OracleFeed", "1") {
        require(_keeper != address(0), "Keeper cannot be zero address");
        owner = msg.sender;
        keeper = _keeper;
    }

    // ─── EIP-712 Type Hashes ──────────────────────────────────────────────

    /// @dev keccak256("FeedData(uint256 price,uint256 volume,uint256 volatility,uint256 forecastMean,uint256 forecastLow,uint256 forecastHigh,uint64 lastUpdated)")
    bytes32 private constant FEED_DATA_TYPEHASH = keccak256(
        "FeedData(uint256 price,uint256 volume,uint256 volatility,uint256 forecastMean,uint256 forecastLow,uint256 forecastHigh,uint64 lastUpdated)"
    );

    /// @dev keccak256("BatchUpdate(bytes32[] tokenIds,FeedData[] data,uint256 nonce,uint256 deadline)FeedData(uint256 price,uint256 volume,uint256 volatility,uint256 forecastMean,uint256 forecastLow,uint256 forecastHigh,uint64 lastUpdated)")
    bytes32 private constant BATCH_UPDATE_TYPEHASH = keccak256(
        "BatchUpdate(bytes32[] tokenIds,FeedData[] data,uint256 nonce,uint256 deadline)FeedData(uint256 price,uint256 volume,uint256 volatility,uint256 forecastMean,uint256 forecastLow,uint256 forecastHigh,uint64 lastUpdated)"
    );

    // ─── Public Functions ─────────────────────────────────────────────────

    /// @notice Rotate the keeper address. Only callable by owner.
    /// @param _newKeeper New keeper address
    function setKeeper(address _newKeeper) external onlyOwner {
        require(_newKeeper != address(0), "Keeper cannot be zero address");
        address oldKeeper = keeper;
        keeper = _newKeeper;
        emit KeeperRotated(oldKeeper, _newKeeper);
    }

    /// @notice Batch-update feed data for multiple tokens. Entire batch must
    ///         be signed by the keeper via EIP-712.
    /// @dev FAIL-CLOSED: if ANY entry is invalid (e.g. price == 0), the
    ///      ENTIRE batch reverts. No partial state is written.
    /// @param tokenIds Token identifiers as keccak256(CoinGecko ID string)
    /// @param data FeedData for each token (must be same length as tokenIds)
    /// @param nonce Strictly monotonic nonce (must be > lastNonce)
    /// @param deadline Expiry timestamp (must be >= block.timestamp)
    /// @param signature EIP-712 signature from the keeper over the full batch
    function batchUpdate(
        bytes32[] calldata tokenIds,
        FeedData[] calldata data,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        // ── Input validation ──
        uint256 len = tokenIds.length;
        if (len == 0) revert EmptyBatch();
        if (len != data.length) revert LengthMismatch();
        if (block.timestamp > deadline) revert Expired(deadline, block.timestamp);
        if (nonce <= lastNonce) revert InvalidNonce(nonce, lastNonce);

        // ── Signature verification ──
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    BATCH_UPDATE_TYPEHASH,
                    keccak256(abi.encodePacked(tokenIds)),
                    _hashFeedDataArray(data),
                    nonce,
                    deadline
                )
            )
        );

        address signer = ECDSA.recover(digest, signature);
        if (signer != keeper) revert OnlyKeeper();

        // ── Validate data + store ──
        // FAIL-CLOSED: validate everything before writing any state (after
        // nonce update). If any entry fails, the whole call reverts.
        for (uint256 i = 0; i < len; i++) {
            if (data[i].price == 0) revert InvalidPrice(tokenIds[i]);
        }

        // ── Commit state ──
        lastNonce = nonce;

        for (uint256 i = 0; i < len; i++) {
            feeds[tokenIds[i]] = data[i];
            emit FeedUpdated(
                tokenIds[i],
                data[i].price,
                data[i].volatility,
                data[i].lastUpdated
            );
        }

        emit BatchUpdated(nonce, uint64(len), uint64(block.timestamp));
    }

    /// @notice Get the stored feed data for a single token
    /// @param tokenId Token identifier (keccak256 of CoinGecko ID string)
    /// @return FeedData struct for the token
    function getFeed(bytes32 tokenId) external view returns (FeedData memory) {
        return feeds[tokenId];
    }

    /// @notice Compute the EIP-712 typed data hash for a batch update.
    ///         Useful for off-chain signing — call this to get the digest
    ///         the keeper must sign.
    function hashBatchUpdate(
        bytes32[] calldata tokenIds,
        FeedData[] calldata data,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    BATCH_UPDATE_TYPEHASH,
                    keccak256(abi.encodePacked(tokenIds)),
                    _hashFeedDataArray(data),
                    nonce,
                    deadline
                )
            )
        );
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    /// @dev Hash a single FeedData struct per EIP-712 encoding rules
    function _hashFeedData(FeedData calldata fd) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                FEED_DATA_TYPEHASH,
                fd.price,
                fd.volume,
                fd.volatility,
                fd.forecastMean,
                fd.forecastLow,
                fd.forecastHigh,
                fd.lastUpdated
            )
        );
    }

    /// @dev Hash an array of FeedData by keccak256 of concatenated individual hashes
    function _hashFeedDataArray(FeedData[] calldata fds) internal pure returns (bytes32) {
        bytes32[] memory hashes = new bytes32[](fds.length);
        for (uint256 i = 0; i < fds.length; i++) {
            hashes[i] = _hashFeedData(fds[i]);
        }
        return keccak256(abi.encodePacked(hashes));
    }
}
