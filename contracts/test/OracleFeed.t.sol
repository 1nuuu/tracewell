// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {OracleFeed} from "../src/OracleFeed.sol";

contract OracleFeedTest is Test {
    OracleFeed public feed;

    // Test accounts
    address public owner = makeAddr("owner");
    uint256 public keeperPk = 0xA11CE;
    address public keeper = vm.addr(keeperPk);
    uint256 public attackerPk = 0xB0B;
    address public attacker = vm.addr(attackerPk);

    // Token IDs: keccak256 of CoinGecko ID strings
    bytes32 public constant BTC = keccak256("bitcoin");
    bytes32 public constant ETH = keccak256("ethereum");
    bytes32 public constant SOL = keccak256("solana");
    bytes32 public constant BNB = keccak256("binancecoin");
    bytes32 public constant XRP = keccak256("ripple");

    function setUp() public {
        vm.prank(owner);
        feed = new OracleFeed(keeper);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    /// @dev Create sample feed data entries
    function _sampleData(uint8 count) internal view returns (OracleFeed.FeedData[] memory) {
        OracleFeed.FeedData[] memory data = new OracleFeed.FeedData[](count);
        for (uint8 i = 0; i < count; i++) {
            data[i] = OracleFeed.FeedData({
                price: uint256(50000 + i * 1000) * 1e18,
                volume: uint256(20 + i) * 1e9 * 1e18,
                volatility: uint256(3 + i) * 1e18,
                forecastMean: uint256(51000 + i * 1000) * 1e18,
                forecastLow: uint256(49000 + i * 1000) * 1e18,
                forecastHigh: uint256(53000 + i * 1000) * 1e18,
                lastUpdated: uint64(block.timestamp)
            });
        }
        return data;
    }

    /// @dev Sign a batch update using the contract's own hash function
    function _signBatch(
        bytes32[] memory tokenIds,
        OracleFeed.FeedData[] memory data,
        uint256 nonce,
        uint256 deadline,
        uint256 signerPk
    ) internal view returns (bytes memory) {
        bytes32 digest = feed.hashBatchUpdate(tokenIds, data, nonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Sign with keeper's key
    function _signKeeper(
        bytes32[] memory tokenIds,
        OracleFeed.FeedData[] memory data,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        return _signBatch(tokenIds, data, nonce, deadline, keeperPk);
    }

    // ─── Happy Path ───────────────────────────────────────────────────────

    function test_HappyPath_SingleToken() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signKeeper(tokenIds, data, nonce, deadline);
        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);

        // Verify storage
        OracleFeed.FeedData memory stored = feed.getFeed(BTC);
        assertEq(stored.price, data[0].price);
        assertEq(stored.volume, data[0].volume);
        assertEq(stored.volatility, data[0].volatility);
        assertEq(feed.lastNonce(), nonce);
    }

    function test_HappyPath_AllFiveTokens() public {
        bytes32[] memory tokenIds = new bytes32[](5);
        tokenIds[0] = BTC;
        tokenIds[1] = ETH;
        tokenIds[2] = SOL;
        tokenIds[3] = BNB;
        tokenIds[4] = XRP;
        OracleFeed.FeedData[] memory data = _sampleData(5);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signKeeper(tokenIds, data, nonce, deadline);

        // Expect 5 FeedUpdated + 1 BatchUpdated events
        vm.expectEmit(true, true, false, true);
        emit OracleFeed.FeedUpdated(BTC, data[0].price, data[0].volatility, data[0].lastUpdated);
        vm.expectEmit(true, true, false, true);
        emit OracleFeed.FeedUpdated(ETH, data[1].price, data[1].volatility, data[1].lastUpdated);
        vm.expectEmit(true, true, false, true);
        emit OracleFeed.FeedUpdated(SOL, data[2].price, data[2].volatility, data[2].lastUpdated);
        vm.expectEmit(true, true, false, true);
        emit OracleFeed.FeedUpdated(BNB, data[3].price, data[3].volatility, data[3].lastUpdated);
        vm.expectEmit(true, true, false, true);
        emit OracleFeed.FeedUpdated(XRP, data[4].price, data[4].volatility, data[4].lastUpdated);
        vm.expectEmit(true, false, false, true);
        emit OracleFeed.BatchUpdated(nonce, 5, uint64(block.timestamp));

        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);

        // Verify all 5 stored correctly
        assertEq(feed.getFeed(BTC).price, data[0].price);
        assertEq(feed.getFeed(ETH).price, data[1].price);
        assertEq(feed.getFeed(SOL).price, data[2].price);
        assertEq(feed.getFeed(BNB).price, data[3].price);
        assertEq(feed.getFeed(XRP).price, data[4].price);
        assertEq(feed.lastNonce(), nonce);
    }

    function test_HappyPath_NonceIncrement() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);

        // First update with nonce 1
        bytes memory sig1 = _signKeeper(tokenIds, data, 1, block.timestamp + 1 hours);
        feed.batchUpdate(tokenIds, data, 1, block.timestamp + 1 hours, sig1);
        assertEq(feed.lastNonce(), 1);

        // Second update with nonce 2
        bytes memory sig2 = _signKeeper(tokenIds, data, 2, block.timestamp + 1 hours);
        feed.batchUpdate(tokenIds, data, 2, block.timestamp + 1 hours, sig2);
        assertEq(feed.lastNonce(), 2);
    }

    function test_GetFeed_ReturnsDefaultWhenEmpty() public {
        OracleFeed.FeedData memory stored = feed.getFeed(BTC);
        assertEq(stored.price, 0);
        assertEq(stored.lastUpdated, 0);
    }

    // ─── Reject: Wrong Signer ─────────────────────────────────────────────

    function test_Revert_WrongSigner() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signBatch(tokenIds, data, nonce, deadline, attackerPk);

        vm.expectRevert(OracleFeed.OnlyKeeper.selector);
        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);
    }

    // ─── Reject: Invalid/Malformed Signature ──────────────────────────────

    function test_Revert_InvalidSignature() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        // Create a valid signature, then corrupt it
        bytes memory sig = _signKeeper(tokenIds, data, nonce, deadline);
        // Flip a bit in the r value — ECDSA.recover will fail to recover a valid address
        sig[0] = bytes1(uint8(sig[0]) ^ 0x01);

        // OpenZeppelin's ECDSA.recover reverts with ECDSAInvalidSignature
        // when it cannot recover a valid address from the corrupted signature
        vm.expectRevert(); // accept any revert — both ECDSAInvalidSignature and OnlyKeeper are correct rejections
        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);
    }

    // ─── Reject: Replay Attack (Nonce Too Low) ────────────────────────────

    function test_Revert_NonceTooLow() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);

        // Accept nonce 5
        bytes memory sig5 = _signKeeper(tokenIds, data, 5, block.timestamp + 1 hours);
        feed.batchUpdate(tokenIds, data, 5, block.timestamp + 1 hours, sig5);

        // Replay with same nonce 5
        vm.expectRevert(
            abi.encodeWithSelector(OracleFeed.InvalidNonce.selector, 5, 5)
        );
        feed.batchUpdate(tokenIds, data, 5, block.timestamp + 1 hours, sig5);
    }

    function test_Revert_NonceEqual() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);

        // Accept nonce 5
        bytes memory sig5 = _signKeeper(tokenIds, data, 5, block.timestamp + 1 hours);
        feed.batchUpdate(tokenIds, data, 5, block.timestamp + 1 hours, sig5);

        // Try nonce 5 with a new signature
        bytes memory sig5b = _signKeeper(tokenIds, data, 5, block.timestamp + 1 hours);
        vm.expectRevert(
            abi.encodeWithSelector(OracleFeed.InvalidNonce.selector, 5, 5)
        );
        feed.batchUpdate(tokenIds, data, 5, block.timestamp + 1 hours, sig5b);
    }

    function test_Revert_NonceLower() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);

        // Accept nonce 5
        bytes memory sig5 = _signKeeper(tokenIds, data, 5, block.timestamp + 1 hours);
        feed.batchUpdate(tokenIds, data, 5, block.timestamp + 1 hours, sig5);

        // Try nonce 3 (lower)
        bytes memory sig3 = _signKeeper(tokenIds, data, 3, block.timestamp + 1 hours);
        vm.expectRevert(
            abi.encodeWithSelector(OracleFeed.InvalidNonce.selector, 3, 5)
        );
        feed.batchUpdate(tokenIds, data, 3, block.timestamp + 1 hours, sig3);
    }

    // ─── Reject: Deadline Expired ─────────────────────────────────────────

    function test_Revert_DeadlineExpired() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp; // == timestamp (expired)

        bytes memory sig = _signKeeper(tokenIds, data, nonce, deadline);
        // warp past the deadline
        vm.warp(block.timestamp + 1);

        vm.expectRevert(
            abi.encodeWithSelector(OracleFeed.Expired.selector, deadline, block.timestamp)
        );
        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);
    }

    function test_Revert_DeadlineInPast() public {
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp - 1; // in the past

        bytes memory sig = _signKeeper(tokenIds, data, nonce, deadline);

        vm.expectRevert(
            abi.encodeWithSelector(OracleFeed.Expired.selector, deadline, block.timestamp)
        );
        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);
    }

    // ─── Reject: Empty Batch ──────────────────────────────────────────────

    function test_Revert_EmptyTokenIds() public {
        bytes32[] memory tokenIds = new bytes32[](0);
        OracleFeed.FeedData[] memory data = new OracleFeed.FeedData[](0);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signKeeper(tokenIds, data, nonce, deadline);

        vm.expectRevert(OracleFeed.EmptyBatch.selector);
        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);
    }

    // ─── Reject: Length Mismatch ──────────────────────────────────────────

    function test_Revert_LengthMismatch() public {
        bytes32[] memory tokenIds = new bytes32[](2);
        tokenIds[0] = BTC;
        tokenIds[1] = ETH;
        OracleFeed.FeedData[] memory data = _sampleData(1); // only 1 entry
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        // Sign with mismatched lengths
        bytes memory sig = _signKeeper(tokenIds, data, nonce, deadline);

        vm.expectRevert(OracleFeed.LengthMismatch.selector);
        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);
    }

    // ─── Reject: Invalid Entry — FAIL-CLOSED ──────────────────────────────

    function test_Revert_ZeroPriceRevertsEntireBatch() public {
        bytes32[] memory tokenIds = new bytes32[](3);
        tokenIds[0] = BTC;
        tokenIds[1] = ETH;
        tokenIds[2] = SOL;

        OracleFeed.FeedData[] memory data = _sampleData(3);
        // Make the second entry have price == 0
        data[1].price = 0;

        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signKeeper(tokenIds, data, nonce, deadline);

        vm.expectRevert(
            abi.encodeWithSelector(OracleFeed.InvalidPrice.selector, ETH)
        );
        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);

        // FAIL-CLOSED: lastNonce was NOT updated (stayed at 0)
        assertEq(feed.lastNonce(), 0, "lastNonce should not have been updated");

        // FAIL-CLOSED: BTC was NOT written (even though it was valid)
        OracleFeed.FeedData memory btcData = feed.getFeed(BTC);
        assertEq(btcData.price, 0, "BTC should NOT have been stored");
    }

    // ─── Keeper Rotation ──────────────────────────────────────────────────

    function test_KeeperRotation_OnlyOwner() public {
        address newKeeper = makeAddr("newKeeper");

        // Non-owner cannot rotate
        vm.prank(attacker);
        vm.expectRevert(OracleFeed.OnlyOwner.selector);
        feed.setKeeper(newKeeper);

        // Owner can rotate
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit OracleFeed.KeeperRotated(keeper, newKeeper);
        feed.setKeeper(newKeeper);

        assertEq(feed.keeper(), newKeeper);
    }

    function test_KeeperRotation_NewKeeperWorks() public {
        uint256 newKeeperPk = 0xC0FFEE;
        address newKeeper = vm.addr(newKeeperPk);

        // Rotate keeper
        vm.prank(owner);
        feed.setKeeper(newKeeper);

        // Sign with new keeper's key
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signBatch(tokenIds, data, nonce, deadline, newKeeperPk);

        feed.batchUpdate(tokenIds, data, nonce, deadline, sig);
        assertEq(feed.getFeed(BTC).price, data[0].price);
    }

    function test_KeeperRotation_OldKeeperRejected() public {
        uint256 newKeeperPk = 0xC0FFEE;
        address newKeeper = vm.addr(newKeeperPk);

        // Rotate keeper
        vm.prank(owner);
        feed.setKeeper(newKeeper);

        // Old keeper's signature should now be rejected
        bytes32[] memory tokenIds = new bytes32[](1);
        tokenIds[0] = BTC;
        OracleFeed.FeedData[] memory data = _sampleData(1);
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory oldSig = _signKeeper(tokenIds, data, nonce, deadline);

        vm.expectRevert(OracleFeed.OnlyKeeper.selector);
        feed.batchUpdate(tokenIds, data, nonce, deadline, oldSig);
    }

    function test_KeeperRotation_CannotSetZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Keeper cannot be zero address");
        feed.setKeeper(address(0));
    }
}
