// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {OracleFeed} from "../src/OracleFeed.sol";

/// @title DeployOracleFeed
/// @notice Deploy OracleFeed with a keeper address passed as constructor arg.
///
/// Usage:
///   forge script script/DeployOracleFeed.s.sol --broadcast \
///     --sig "run(address)" <KEEPER_ADDRESS> \
///     --rpc-url <RPC_URL> --private-key <PRIVATE_KEY>
contract DeployOracleFeed is Script {
    function run(address _keeper) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        OracleFeed oracleFeed = new OracleFeed(_keeper);

        console.log("OracleFeed deployed at:", address(oracleFeed));
        console.log("Owner:", oracleFeed.owner());
        console.log("Keeper:", oracleFeed.keeper());

        vm.stopBroadcast();
    }
}
