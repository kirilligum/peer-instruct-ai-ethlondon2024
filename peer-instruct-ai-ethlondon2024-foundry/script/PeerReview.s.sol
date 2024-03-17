// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "../src/PeerReview.sol";

contract PeerReviewScript is Script {
    PeerReview peerReview;
    string expectedLicense = "odc-by";
    uint256 expectedRoiDenominator = 100;

    function setUp() public {
        peerReview = new PeerReview(expectedLicense, expectedRoiDenominator);
    }

    function run() public {
        vm.broadcast();
    }
}
