// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentReceiver — Receives Sovereign Agent LLM output and stores it publicly
/// @notice The 0x080C precompile calls onSovereignAgentResult after TEE execution.
///         This contract stores the result as a public string + emits an event.
contract AgentReceiver {
    string public analysis;
    bytes32 public lastCallId;
    uint256 public lastUpdated;
    address public agentHarness;

    event AnalysisReceived(bytes32 indexed callId, string analysis, uint256 timestamp);

    /// @notice Called by 0x080C precompile when the agent finishes processing
    /// @param callId Unique ID for this agent invocation
    /// @param result Raw bytes from the LLM output (UTF-8 string)
    function onSovereignAgentResult(bytes32 callId, bytes calldata result) external {
        analysis = string(result);
        lastCallId = callId;
        lastUpdated = block.timestamp;
        agentHarness = msg.sender;
        emit AnalysisReceived(callId, string(result), block.timestamp);
    }

    /// @notice Quick check if analysis data exists
    function exists() external view returns (bool) {
        return bytes(analysis).length > 0;
    }
}
