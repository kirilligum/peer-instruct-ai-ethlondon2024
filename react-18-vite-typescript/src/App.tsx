import { useState } from 'react'
import { InteractionForm } from "./InteractionForm";
import './App.css'
import {
  DynamicWidget,
} from "@dynamic-labs/sdk-react-core";


interface IInputField {
  name: string;
  value: string;
  description: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('owner');
  const [thisContractAddress, setThisContractAddress] = useState("0x29fAc56b5f34e29BC363cA18ACB33924f2Ce166c");

  const [showOnChainSection, setShowOnChainSection] = useState(false);

  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <DynamicWidget />
        <div>
          <label htmlFor="contractAddress">Contract Address:</label>
          <input
            id="contractAddress"
            type="text"
            value={thisContractAddress}
            onChange={(e) => setThisContractAddress(e.target.value)}
            style={{ marginLeft: '10px' }}
          />
        </div>
      </div>
      <h1>Peer Instruct AI</h1>

      <div>
        <button onClick={() => setActiveTab('owner')}>Owner</button>
        <button onClick={() => setActiveTab('author')}>Author</button>
        <button onClick={() => setActiveTab('reviewers')}>Reviewers</button>
      </div>
      {activeTab === 'owner' && (
        <>
          <InteractionForm
            description="add author"
            defaultInputs={[{ name: "author", value: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", description: "author" }]}
            functionName="addAuthor"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value];
            }}
          />
          <InteractionForm
            description="add reviewer"
            defaultInputs={[
              { name: "reviewer", value: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", description: "reviewer" },
              { name: "keywords", value: "dao", description: "keywords" }
            ]}
            functionName="addReviewer"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value, inputs[1].value.split(',').map(keyword => keyword.trim())]
            }}
          />
        </>
      )}
      {activeTab === 'author' && (
        <>
          <InteractionForm
            description="Submit Data"
            defaultInputs={[{
              name: "data", value: '{\n  "task_definition": "Explain the concept of account abstraction in the context of blockchain technology.",\n              "is_positive_example": true,\n              "input": "What is account abstraction in blockchain?",\n              "response": "Account abstraction in blockchain refers to the idea of making smart contract accounts and externally owned accounts (EOAs) indistinguishable. This allows smart contracts to initiate transactions, pay fees, and perform actions like EOAs, enhancing flexibility, security, and user experience.",\n              "explanation": "The response concisely explains account abstraction, highlighting its key aspects and benefits. It mentions the distinction between smart contract accounts and EOAs, and how account abstraction removes this distinction. The response also notes the potential improvements in flexibility, security, and user experience."\n            }', description: "Data to submit"
            }]}
            functionName="submitData"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value]
            }}
          />
          <InteractionForm
            description="Check if Submission is Approved"
            defaultInputs={[{ name: "submissionId", value: "0", description: "Submission ID" }]}
            functionName="getIsApproved"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value]
            }}
            isReadCall={true}
          />
        </>
      )}
      {activeTab === 'reviewers' && (
        <>
          <InteractionForm
            description="Add Keyword to Reviewer"
            defaultInputs={[
              { name: "reviewerIndex", value: "0", description: "Reviewer Index" },
              { name: "newKeyword", value: "", description: "New Keyword" }
            ]}
            functionName="addKeywordToReviewer"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value, inputs[1].value]
            }}
          />
          <InteractionForm
            description="Reviewer Vote"
            defaultInputs={[
              { name: "submissionId", value: "0", description: "Submission ID" },
              { name: "vote", value: "1", description: "Vote (1 for accept, 0 for reject)" }
            ]}
            functionName="reviewerVote"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[1].value, inputs[0].value]
            }}
          />
        </>
      )}
      <br />
      <h3>Peer review steps</h3>
      <p>anyone can do these steps</p>
      <InteractionForm
        description="Assign Random Seed"
        defaultInputs={[{ name: "submissionId", value: "0", description: "Submission ID" }]}
        functionName="assignRandomSeedToSubmission"
        functionArgs={(inputs: IInputField[]) => {
          return [inputs[0].value];
        }}
      />
      <InteractionForm
        description="Shuffle Reviewers"
        defaultInputs={[{ name: "submissionId", value: "0", description: "Submission ID" }]}
        functionName="shuffleReviewers"
        functionArgs={(inputs: IInputField[]) => {
          return [inputs[0].value];
        }}
      />
      <InteractionForm
        description="Find Top Reviewers"
        defaultInputs={[{ name: "submissionId", value: "0", description: "Submission ID" }]}
        functionName="findTopReviewersForSubmission"
        functionArgs={(inputs: IInputField[]) => {
          return [inputs[0].value];
        }}
      />
      <InteractionForm
        description="Reveal Votes"
        defaultInputs={[{ name: "submissionId", value: "0", description: "Submission ID" }]}
        functionName="revealVotes"
        functionArgs={(inputs: IInputField[]) => {
          return [inputs[0].value];
        }}
      />

      <br />

      <button onClick={() => setShowOnChainSection(!showOnChainSection)}>
        {showOnChainSection ? 'Hide On-Chain Section' : 'See What is On-Chain'}
      </button>
      {showOnChainSection && (
        <>
          <InteractionForm
            description="Get Reviewers"
            defaultInputs={[]}
            functionName="getReviewers"
            functionArgs={() => []}
            isReadCall={true}
          />
          <InteractionForm
            description="Get Reviewer Keywords"
            defaultInputs={[{ name: "reviewerAddress", value: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", description: "Reviewer Address" }]}
            functionName="getReviewerKeywords"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value];
            }}
            isReadCall={true}
          />
          <InteractionForm
            description="Get Submission"
            defaultInputs={[{ name: "submissionId", value: "0", description: "Submission ID" }]}
            functionName="getSubmission"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value];
            }}
            //     author: result.author,
            //     data: result.data,
            //     selectedReviewers: result.selectedReviewers,
            //     shuffledReviewers: result.shuffledReviewers,
            //     isApproved: result.isApproved,
            //     seed: result.seed.toString(),
            //     countVotes: result.countVotes.toString()
            isReadCall={true}
          />
          <InteractionForm
            description="Get Shuffled Reviewers"
            defaultInputs={[{ name: "submissionId", value: "0", description: "Submission ID" }]}
            functionName="getShuffledReviewers"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value];
            }}
            isReadCall={true}
          />
          <InteractionForm
            description="Get Selected Reviewers"
            defaultInputs={[{ name: "submissionId", value: "0", description: "Submission ID" }]}
            functionName="getSelectedReviewers"
            functionArgs={(inputs: IInputField[]) => {
              return [inputs[0].value];
            }}
            isReadCall={true}
          />
        </>
      )}
      <br />

      <br />
      Follow @kirill_igum
    </>
  )
}
export default App
