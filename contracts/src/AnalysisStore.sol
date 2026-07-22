// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AnalysisStore — On-chain AI market analysis storage
/// @notice Stores the latest Tracewell AI analysis. Keeper writes, anyone reads.
contract AnalysisStore {
    string public analysis;
    uint256 public timestamp;
    address public analyzer;

    address public keeper;

    event AnalysisUpdated(string analysis, uint256 timestamp, address indexed analyzer);

    error OnlyKeeper();

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert OnlyKeeper();
        _;
    }

    constructor(address _keeper) {
        keeper = _keeper;
    }

    /// @notice Update the stored analysis. Only callable by the keeper.
    function update(string calldata _analysis) external onlyKeeper {
        analysis = _analysis;
        timestamp = block.timestamp;
        analyzer = msg.sender;
        emit AnalysisUpdated(_analysis, block.timestamp, msg.sender);
    }

    /// @notice Rotate keeper address
    function setKeeper(address _newKeeper) external onlyKeeper {
        keeper = _newKeeper;
    }
}
