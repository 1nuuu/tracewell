// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TracewellAgent — On-chain market analysis via Ritual Sovereign Agent
/// @notice Reads OracleFeed data, invokes the Sovereign Agent precompile (0x080C)
///         with a structured market data prompt, and stores the AI analysis on-chain.
///
/// ## Architecture
/// 1. Off-chain trigger script reads OracleFeed, builds a prompt, encrypts LLM API key
/// 2. Calls requestAnalysis() with the ABI-encoded SovereignAgentRequest
/// 3. 0x080C precompile routes to a TEE executor which runs the LLM
/// 4. Executor calls onSovereignAgentResult() with the AI analysis
/// 5. Analysis is stored on-chain, emitted as an event

interface ISovereignAgent {
    /// @notice Submit an ephemeral async agent job
    /// @param request ABI-encoded SovereignAgentRequest (23-field tuple)
    function execute(bytes calldata request) external;
}

interface IOracleFeed {
    struct FeedData {
        uint256 price;
        uint256 volume;
        uint256 volatility;
        uint256 forecastMean;
        uint256 forecastLow;
        uint256 forecastHigh;
        uint64 lastUpdated;
    }
    function getFeed(bytes32 tokenId) external view returns (FeedData memory);
}

contract TracewellAgent {
    // ─── Constants ──────────────────────────────────────────────────────
    address public constant SOVEREIGN_AGENT = address(0x080C);
    address public immutable ORACLE_FEED;

    // ─── Storage ────────────────────────────────────────────────────────
    address public owner;
    string public latestAnalysis;       // AI-generated market analysis (JSON)
    uint256 public lastAnalysisTime;    // Timestamp of last analysis
    bytes32 public lastCallId;          // Last agent call ID for tracking

    // ─── Events ─────────────────────────────────────────────────────────
    event AnalysisRequested(bytes32 indexed callId, uint256 timestamp);
    event AnalysisReceived(bytes32 indexed callId, string analysis, uint256 timestamp);

    // ─── Errors ─────────────────────────────────────────────────────────
    error OnlyOwner();

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(address _oracleFeed) {
        ORACLE_FEED = _oracleFeed;
        owner = msg.sender;
    }

    // ─── External Functions ─────────────────────────────────────────────

    /// @notice Submit an analysis request to the Sovereign Agent precompile.
    ///         Called by the off-chain trigger script after building the
    ///         ABI-encoded SovereignAgentRequest with encrypted secrets.
    /// @param encodedRequest Full ABI-encoded SovereignAgentRequest (23 fields)
    function requestAnalysis(bytes calldata encodedRequest) external payable onlyOwner {
        lastCallId = keccak256(abi.encodePacked(encodedRequest, block.timestamp));
        ISovereignAgent(SOVEREIGN_AGENT).execute(encodedRequest);
        emit AnalysisRequested(lastCallId, block.timestamp);
    }

    /// @notice Callback for Sovereign Agent precompile results.
    ///         Called by the TEE executor after LLM inference completes.
    /// @param callId Unique identifier for this agent invocation
    /// @param result Raw bytes containing the agent's analysis (UTF-8 JSON)
    function onSovereignAgentResult(bytes32 callId, bytes calldata result) external {
        latestAnalysis = string(result);
        lastAnalysisTime = block.timestamp;
        emit AnalysisReceived(callId, string(result), block.timestamp);
    }

    // ─── View Functions ─────────────────────────────────────────────────

    /// @notice Read OracleFeed data for a single token
    function getFeed(bytes32 tokenId) external view returns (IOracleFeed.FeedData memory) {
        return IOracleFeed(ORACLE_FEED).getFeed(tokenId);
    }
}
