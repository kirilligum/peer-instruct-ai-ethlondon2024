// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/PeerReview.sol";

contract PeerReviewTest is Test {
    PeerReview peerReview;
    string expectedLicense = "Test License";
    uint256 expectedRoiDenominator = 1000;

    function setUp() public {
        peerReview = new PeerReview(expectedLicense, expectedRoiDenominator);
    }

    function testInitialLicenseSetting() public view {
        assertEq(peerReview.LICENSE(), expectedLicense);
    }

    function addAuthors() internal {
        address[2] memory authors = [
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8, // Anvil's local test account 1
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC // Anvil's local test account 2
        ];

        for (uint256 i = 0; i < authors.length; i++) {
            peerReview.addAuthor(authors[i]);
        }
    }

    function testAddAuthor() public {
        addAuthors();

        address[2] memory expectedAuthors = [
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8, // Anvil's local test account 1
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC // Anvil's local test account 2
        ];

        for (uint256 i = 0; i < expectedAuthors.length; i++) {
            assertEq(peerReview.authors(i), expectedAuthors[i]);
        }
    }

    function setupReviewersAndKeywords() internal {
        address[4] memory reviewers = [
            0x90F79bf6EB2c4f870365E785982E1f101E93b906, // Anvil's local test account 3
            0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65, // Anvil's local test account 4
            0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc, // Anvil's local test account 5
            0x976EA74026E726554dB657fA54763abd0C3a0aa9 // Anvil's local test account 6
        ];
        string[][] memory keywords = new string[][](4);
        keywords[0] = new string[](1);
        keywords[0][0] = "gasless";
        keywords[1] = new string[](1);
        keywords[1][0] = "scalability";
        keywords[2] = new string[](1);
        keywords[2][0] = "security";
        keywords[3] = new string[](1);
        keywords[3][0] = "usability";

        for (uint256 i = 0; i < reviewers.length; i++) {
            peerReview.addReviewer(reviewers[i], keywords[i]);
        }
    }

    function testGetReviewerKeywords() public {
        setupReviewersAndKeywords(); // Ensure there are reviewers with keywords

        // Test getting keywords for a specific reviewer
        address reviewerAddress = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // Anvil's local test account 3
        string[] memory expectedKeywords = new string[](1);
        expectedKeywords[0] = "gasless";

        string[] memory actualKeywords = peerReview.getReviewerKeywords(
            reviewerAddress
        );

        for (uint256 i = 0; i < expectedKeywords.length; i++) {
            assertEq(
                actualKeywords[i],
                expectedKeywords[i],
                "Mismatch in reviewer keywords"
            );
        }
    }

    function testAddKeywordToReviewer() public {
        address[4] memory reviewers = [
            0x90F79bf6EB2c4f870365E785982E1f101E93b906, // Anvil's local test account 3
            0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65, // Anvil's local test account 4
            0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc, // Anvil's local test account 5
            0x976EA74026E726554dB657fA54763abd0C3a0aa9 // Anvil's local test account 6
        ];

        // Setup initial reviewers and keywords
        setupReviewersAndKeywords();

        // Index of the reviewer to add a keyword to
        uint256 reviewerIndex = 1; // Assuming this is the index of the reviewer we want to modify
        string memory newKeyword = "performance";

        // Add a new keyword to the specified reviewer
        peerReview.addKeywordToReviewer(reviewerIndex, newKeyword);

        // Retrieve the updated keywords list for the reviewer
        string[] memory updatedKeywords = peerReview.getReviewerKeywords(
            reviewers[reviewerIndex]
        );

        // Check if the new keyword is in the updated list
        bool foundNewKeyword = false;
        for (uint256 i = 0; i < updatedKeywords.length; i++) {
            if (
                keccak256(bytes(updatedKeywords[i])) ==
                keccak256(bytes(newKeyword))
            ) {
                foundNewKeyword = true;
                break;
            }
        }

        // Assert that the new keyword was successfully added
        assertTrue(
            foundNewKeyword,
            "New keyword was not added to the reviewer."
        );
    }

    function testAddReviewer() public {
        // Setup initial reviewers and keywords
        setupReviewersAndKeywords();

        // New reviewer to be added
        address newReviewer = 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2; // Anvil's local test account 7
        string[] memory newKeywords = new string[](1);
        newKeywords[0] = "innovation";

        // Add a new reviewer
        peerReview.addReviewer(newReviewer, newKeywords);

        // Retrieve the updated list of reviewers
        address[] memory updatedReviewers = peerReview.getReviewers();

        // Check if the new reviewer is in the updated list
        bool foundNewReviewer = false;
        for (uint256 i = 0; i < updatedReviewers.length; i++) {
            if (updatedReviewers[i] == newReviewer) {
                foundNewReviewer = true;
                break;
            }
        }

        // Assert that the new reviewer was successfully added
        assertTrue(foundNewReviewer, "New reviewer was not added.");
    }

    // Test for the submitData function with two specific submissions
    function testSubmitDataWithSpecificContexts() public {
        // First submission: Reflecting a DAO voter's preference to raise collateral threshold
        string
            memory testData1 = "As a DAO voter, I prefer to raise the collateral threshold to ensure more commitment from proposal submitters.";
        uint256 submissionId1 = peerReview.submitData(testData1);
        (, string memory data1, , , , , ) = peerReview.getSubmission(
            submissionId1
        );
        assertEq(data1, testData1, "Mismatch in first submission data");

        // Second submission: Checking if the DAO proposal team has previously worked together
        string
            memory testData2 = "The DAO proposal team should describe their previous collaborations to demonstrate their ability to work together effectively.";
        uint256 submissionId2 = peerReview.submitData(testData2);
        (, string memory data2, , , , , ) = peerReview.getSubmission(
            submissionId2
        );
        assertEq(data2, testData2, "Mismatch in second submission data");
    }

    // Test for the shuffleReviewers function
    function testShuffleReviewers() public {
        // Setup initial reviewers and keywords
        setupReviewersAndKeywords();

        // Create a new submission to have a context for shuffling
        string memory testData = "Test data for shuffling reviewers";
        uint256 submissionId = peerReview.submitData(testData);

        // Assign a seed to ensure deterministic shuffling for testing
        peerReview.assignRandomSeedToSubmission(submissionId);

        // Call shuffleReviewers with the submission ID
        peerReview.shuffleReviewers(submissionId);

        // Retrieve the shuffled reviewers
        address[] memory shuffledReviewers = peerReview.getShuffledReviewers(
            submissionId
        );

        // Retrieve all reviewers to compare against shuffled reviewers
        address[] memory allReviewers = peerReview.getReviewers();
        // Log the shuffledReviewers and allReviewers arrays for comparison
        // console.log("Shuffled Reviewers:");
        // for (uint256 i = 0; i < shuffledReviewers.length; i++) {
        //     console.log(shuffledReviewers[i]);
        // }
        // console.log("All Reviewers:");
        // for (uint256 i = 0; i < allReviewers.length; i++) {
        //     console.log(allReviewers[i]);
        // }

        // Assert that the shuffled reviewers are not in the same order as the original reviewers
        // This is a simplistic check and might need to be adjusted based on the shuffling algorithm's implementation details
        bool isShuffled = false;
        for (uint256 i = 0; i < shuffledReviewers.length; i++) {
            if (shuffledReviewers[i] != allReviewers[i]) {
                isShuffled = true;
                break;
            }
        }
        assertTrue(isShuffled, "Reviewers were not shuffled.");
    }

    // Test for the contains function
    function testStringContainsFunction() public view {
        // Test case where the substring is present
        bool result1 = peerReview.contains("Solidity is awesome", "awesome");
        assertTrue(result1, "The string should contain 'awesome'");

        // Test case where the substring is not present
        bool result2 = peerReview.contains("Solidity is awesome", "bad");
        assertFalse(result2, "The string should not contain 'bad'");
    }

    // Test for the getRandomNumber function
    function testGetRandomNumber() public view {
        uint256 randomNumber = peerReview.getRandomNumber();
        assertTrue(randomNumber != 0, "Random number should not be zero");
    }

    // Test for the assignRandomSeedToSubmission function
    function testAssignRandomSeedToSubmission() public {
        // Submit a new data object to get a submission ID
        string memory testData = "Test data for random seed assignment";
        uint256 submissionId = peerReview.submitData(testData);

        // Assign a random seed to the submission
        peerReview.assignRandomSeedToSubmission(submissionId);

        // Retrieve the submission to check the assigned seed
        (, , , , , uint256 seed, ) = peerReview.getSubmission(submissionId);

        // Assert that the seed is not zero
        assertTrue(seed != 0, "Random seed should not be zero");
    }

    // Test for the countReviewerKeywordsInSubmission function
    function testCountReviewerKeywordsInSubmission() public {
        // Explicitly add keywords to the reviewer before counting
        address reviewerAddress = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // Anvil's local test account 3
        string[] memory keywords = new string[](2);
        keywords[0] = "scalability";
        keywords[1] = "security";
        peerReview.addReviewer(reviewerAddress, keywords); // Assuming addReviewer function can be reused or modified for this purpose

        // Setup a submission with specific content
        string
            memory testData = "This submission discusses scalability and security in depth.";
        uint256 submissionId = peerReview.submitData(testData);

        // Call countReviewerKeywordsInSubmission with the submission ID and reviewer's address
        uint256 keywordCount = peerReview.countReviewerKeywordsInSubmission(
            submissionId,
            reviewerAddress
        );

        // Assert that the returned count matches our expectations (2 in this case)
        assertEq(
            keywordCount,
            2,
            "The keyword count does not match the expected value."
        );
    }

    // Test for findTopReviewersForSubmission with DAO and web3 keywords
    function testFindTopReviewersForSubmission() public {
        // Setup reviewers with DAO and web3 related keywords
        setupReviewersAndKeywords(); // Resetting reviewers
        peerReview.addKeywordToReviewer(1, "web3");
        peerReview.addKeywordToReviewer(2, "DAO");
        peerReview.addKeywordToReviewer(2, "web3");
        peerReview.addKeywordToReviewer(3, "DAO");

        // Submit data related to DAOs and web3
        string
            memory testData = "Exploring the impact of DAOs and web3 on decentralized governance.";
        uint256 submissionId = peerReview.submitData(testData);

        // Get a random seed, shuffle the reviewers, and find the top reviewers for the submission
        peerReview.assignRandomSeedToSubmission(submissionId);
        peerReview.shuffleReviewers(submissionId);
        peerReview.findTopReviewersForSubmission(submissionId);

        // Retrieve the top reviewers for the submission
        address[] memory topReviewers = peerReview.getSelectedReviewers(
            submissionId
        );

        // Assert that there are exactly 3 top reviewers
        assertEq(
            topReviewers.length,
            3,
            "There should be exactly 3 top reviewers."
        );

        // Optionally, assert that the top reviewers are the expected ones based on the submission's content
        // This part can be more specific based on the setup of reviewers and keywords
    }

    // Test for the reviewerVote function
    function testReviewerVote() public {
        // Setup initial reviewers and keywords
        setupReviewersAndKeywords();

        // Create a new submission to have a context for voting
        string memory testData = "Test data for voting";
        uint256 submissionId = peerReview.submitData(testData);

        // Reviewer addresses for voting
        address[3] memory reviewerAddresses = [
            0x90F79bf6EB2c4f870365E785982E1f101E93b906, // Anvil's local test account 3
            0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65, // Anvil's local test account 4
            0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc // Anvil's local test account 5
        ];

        // Simulate voting by each reviewer
        vm.prank(reviewerAddresses[0]);
        peerReview.reviewerVote(1, submissionId);

        vm.prank(reviewerAddresses[1]);
        peerReview.reviewerVote(1, submissionId);

        vm.prank(reviewerAddresses[2]);
        peerReview.reviewerVote(1, submissionId);

        // Assert that the submission's countVotes is 3
        (, , , , , , uint256 countVotes) = peerReview.getSubmission(
            submissionId
        );
        assertEq(countVotes, 3, "Submission should have 3 votes.");
    }

    // Test for the revealVotes function
    function testRevealVotes() public {
        // Setup initial reviewers and keywords
        setupReviewersAndKeywords();

        // Create a new submission to have a context for revealing votes
        string memory testData = "Test data for revealing votes";
        uint256 submissionId = peerReview.submitData(testData);

        // Assign votes to the submission
        vm.prank(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
        peerReview.reviewerVote(1, submissionId);
        vm.prank(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);
        peerReview.reviewerVote(1, submissionId);
        vm.prank(0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc);
        peerReview.reviewerVote(1, submissionId);

        // Reveal votes to update the isApproved status
        peerReview.revealVotes(submissionId);

        // Check the approval status of the submission
        bool revealResult = peerReview.getIsApproved(submissionId);

        // Assert that revealVotes returns true
        assertTrue(revealResult, "Votes should be revealed as true.");
    }

    // Test for the revealVotes function

    // function testRevealVotesFhe() public {
    //     // Setup initial reviewers and keywords
    //     setupReviewersAndKeywords();

    //     // Create a new submission to have a context for revealing votes
    //     string memory testData = "Test data for revealing votes";
    //     uint256 submissionId = peerReview.submitData(testData);

    //     // Assign votes to the submission
    //     vm.prank(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
    //     peerReview.reviewerVoteFhe(1, submissionId);
    //     vm.prank(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);
    //     peerReview.reviewerVoteFhe(1, submissionId);
    //     vm.prank(0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc);
    //     peerReview.reviewerVoteFhe(1, submissionId);

    //     // Attempt to reveal votes
    //     bool revealResult = peerReview.revealVotesFhe(submissionId);

    //     // Assert that revealVotes returns true
    //     assertTrue(revealResult, "Votes should be revealed as true.");
    // }

    //add new tests below

    // Test for the getIsApproved function
    function testGetIsApproved() public {
        // Setup initial reviewers and keywords
        setupReviewersAndKeywords();

        // Create a new submission to have a context for checking approval status
        string memory testData = "Test data for approval status";
        uint256 submissionId = peerReview.submitData(testData);

        // Assign votes to the submission to simulate approval
        vm.prank(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
        peerReview.reviewerVote(1, submissionId);
        vm.prank(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);
        peerReview.reviewerVote(1, submissionId);
        vm.prank(0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc);
        peerReview.reviewerVote(1, submissionId);

        // Reveal votes to update the isApproved status
        peerReview.revealVotes(submissionId);

        // Check the approval status of the submission
        bool isApproved = peerReview.getIsApproved(submissionId);

        // Assert that the submission is approved
        assertTrue(isApproved, "Submission should be approved.");
    }
}
