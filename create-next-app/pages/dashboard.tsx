import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Head from 'next/head';

import { createSmartAccountClient } from "@alchemy/aa-core";
import { baseSepolia } from 'viem/chains';
import { encodeFunctionData } from "viem";
import { abi } from "../mint_src/abi.js";
import config from '../config_mint.json' assert { type: 'json' };
import { createLightAccount } from "@alchemy/aa-accounts";
import { LocalAccountSigner } from "@alchemy/aa-core";
import { deepHexlify, resolveProperties } from "@alchemy/aa-core";
import axios from "axios";
import { http } from "viem";
import { InteractionForm } from "../components/InteractionForm";

import { useState } from 'react'

interface IInputField {
  name: string;
  value: string;
  description: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    ready,
    authenticated,
    user,
    logout,
    linkEmail,
    linkWallet,
    unlinkEmail,
    linkPhone,
    unlinkPhone,
    unlinkWallet,
    linkGoogle,
    unlinkGoogle,
    linkTwitter,
    unlinkTwitter,
    linkDiscord,
    unlinkDiscord,
  } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  const numAccounts = user?.linkedAccounts?.length || 0;
  const canRemoveAccount = numAccounts > 1;

  const email = user?.email;
  const phone = user?.phone;
  const wallet = user?.wallet;

  const googleSubject = user?.google?.subject || null;
  const twitterSubject = user?.twitter?.subject || null;
  const discordSubject = user?.discord?.subject || null;

  const handleClick = async () => {
    console.log("test");

    const extractHashFromError = (errorString: any) => {
      const regex = /Transaction with hash "([^"]+)"/;
      const match = errorString.match(regex);

      if (match && match.length > 1) {
        return match[1];
      } else {
        return null;
      }
    }

    const transport = () => http(config.rpc_url)
    // Create the signer
    // To customize the signer, see https://accountkit.alchemy.com/signers/choosing-a-signer.html
    const signer = LocalAccountSigner.privateKeyToAccountSigner(config.private_key)

    // We use an EOA signer (private key) and a Simple Account for this example.
    // To use a different account, see https://accountkit.alchemy.com/smart-accounts/
    const account = await createLightAccount({
      transport: transport(),
      chain: baseSepolia,
      signer,
    })

    const paymasterRequest = (userOp: any, opts: any) => {
      return {
        jsonrpc: "2.0",
        method: "pm_sponsorUserOperation",
        id: "1",
        params: [userOp, config.entry_point],
      }
    }

    const sponsorUserOperation = async (userOp: any, opts: any) => {
      // resolve the promise fields on userOp
      // https://github.com/alchemyplatform/aa-sdk/blob/main/packages/core/src/middleware/defaults/gasEstimator.ts#L11C5-L11C66
      const resolvedUserOp = deepHexlify(await resolveProperties(userOp))

      const req = paymasterRequest(resolvedUserOp, opts)
      const res = await axios.post(config.rpc_url, req)
      return res.data.result
    }

    const updateUserOpGasFields = async (userop: any, paymasterResp: any) => {
      var updatedUserOp = {
        ...userop,
      }
      updatedUserOp.callGasLimit = paymasterResp.callGasLimit
      updatedUserOp.preVerificationGas = paymasterResp.preVerificationGas
      updatedUserOp.verificationGasLimit = paymasterResp.verificationGasLimit
      return deepHexlify(await resolveProperties(updatedUserOp))
    }




    const smartAccountClient = createSmartAccountClient({
      transport: transport(),
      chain: baseSepolia,
      account: account,
      gasEstimator: async (struct) => ({
        ...struct,
        callGasLimit: 0n,
        preVerificationGas: 0n,
        verificationGasLimit: 0n,
      }),
      paymasterAndData: {
        paymasterAndData: async (userop, opts) => {
          // request sponsorship
          const paymasterResp = await sponsorUserOperation(userop, opts)
          // replace the gas fields
          const updatedUserOp = await updateUserOpGasFields(userop, paymasterResp)
          return {
            ...updatedUserOp,
            paymasterAndData: paymasterResp.paymasterAndData
          }
        },
        dummyPaymasterAndData: () => "0x",
      },
    });
    console.log("\x1b[33m%s\x1b[0m", `Minting to ${smartAccountClient.account.address} (Account type: simple)`);

    // Encode the calldata
    const callData = encodeFunctionData({
      abi: abi,
      functionName: config.function_name,
      args: [smartAccountClient.account.address, 0],
    });
    const contractAddress = config.contract_address;
    console.log("Waiting for transaction...")

    // Send the sponsored transaction!
    const uo = await smartAccountClient.sendUserOperation({
      uo: { target: contractAddress, data: callData, value: BigInt(0) },
    });
    try {
      await smartAccountClient.waitForUserOperationTransaction(uo);
    } catch (error) {
      // There's currently an issue with viem not being able to find the transaction hash, but it does exist
      const txHash = extractHashFromError(error.toString())
      console.log("\x1b[32m", `⛽ Successfully sponsored gas for ${config.function_name} transaction with Coinbase Cloud!`);
      console.log("\x1b[36m", `🔍 View on Etherscan: https://sepolia.basescan.org/tx/${txHash}`);
    }
  }

  const [activeTab, setActiveTab] = useState('owner');
  const [showOnChainSection, setShowOnChainSection] = useState(false);
  const [showAa, setShowAa] = useState(false);

  return (
    <>
      <Head>
        <title>Peer Instruct AI</title>
      </Head>

      <main className="flex flex-col min-h-screen px-4 sm:px-20 py-6 sm:py-10 bg-privy-light-blue">
        {ready && authenticated ? (
          <>
            <div className="flex flex-row justify-between">
              <h1 className="text-2xl font-semibold">Peer Instruct AI</h1>
              <button
                onClick={logout}
                className="text-sm bg-violet-200 hover:text-violet-900 py-2 px-4 rounded-md text-violet-700"
              >
                Logout
              </button>
            </div>

            <div>
              <button
                className="text-sm bg-green-600 hover:bg-green-700 py-2 px-4 rounded-md text-white"
                onClick={() => setActiveTab('owner')}>Owner</button>
              <button
                className="text-sm bg-green-600 hover:bg-green-700 py-2 px-4 rounded-md text-white"
                onClick={() => setActiveTab('author')}>Author</button>
              <button
                className="text-sm bg-green-600 hover:bg-green-700 py-2 px-4 rounded-md text-white"
                onClick={() => setActiveTab('reviewers')}>Reviewers</button>
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

            <button onClick={() => setShowAa(!showAa)}>
              {showAa ? 'Hide Aa Section' : 'See Aa Section'}
            </button>
            {showAa && (
              <>
                <div className="flex flex-row justify-between">
                  <button
                    className="text-sm bg-green-600 hover:bg-green-700 py-2 px-4 rounded-md text-white"
                    onClick={handleClick}
                  >Test</button>
                </div>

                <div className="mt-12 flex gap-4 flex-wrap">
                  {googleSubject ? (
                    <button
                      onClick={() => {
                        unlinkGoogle(googleSubject);
                      }}
                      className="text-sm border border-violet-600 hover:border-violet-700 py-2 px-4 rounded-md text-violet-600 hover:text-violet-700 disabled:border-gray-500 disabled:text-gray-500 hover:disabled:text-gray-500"
                      disabled={!canRemoveAccount}
                    >
                      Unlink Google
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        linkGoogle();
                      }}
                      className="text-sm bg-violet-600 hover:bg-violet-700 py-2 px-4 rounded-md text-white"
                    >
                      Link Google
                    </button>
                  )}

                  {twitterSubject ? (
                    <button
                      onClick={() => {
                        unlinkTwitter(twitterSubject);
                      }}
                      className="text-sm border border-violet-600 hover:border-violet-700 py-2 px-4 rounded-md text-violet-600 hover:text-violet-700 disabled:border-gray-500 disabled:text-gray-500 hover:disabled:text-gray-500"
                      disabled={!canRemoveAccount}
                    >
                      Unlink Twitter
                    </button>
                  ) : (
                    <button
                      className="text-sm bg-violet-600 hover:bg-violet-700 py-2 px-4 rounded-md text-white"
                      onClick={() => {
                        linkTwitter();
                      }}
                    >
                      Link Twitter
                    </button>
                  )}

                  {discordSubject ? (
                    <button
                      onClick={() => {
                        unlinkDiscord(discordSubject);
                      }}
                      className="text-sm border border-violet-600 hover:border-violet-700 py-2 px-4 rounded-md text-violet-600 hover:text-violet-700 disabled:border-gray-500 disabled:text-gray-500 hover:disabled:text-gray-500"
                      disabled={!canRemoveAccount}
                    >
                      Unlink Discord
                    </button>
                  ) : (
                    <button
                      className="text-sm bg-violet-600 hover:bg-violet-700 py-2 px-4 rounded-md text-white"
                      onClick={() => {
                        linkDiscord();
                      }}
                    >
                      Link Discord
                    </button>
                  )}

                  {email ? (
                    <button
                      onClick={() => {
                        unlinkEmail(email.address);
                      }}
                      className="text-sm border border-violet-600 hover:border-violet-700 py-2 px-4 rounded-md text-violet-600 hover:text-violet-700 disabled:border-gray-500 disabled:text-gray-500 hover:disabled:text-gray-500"
                      disabled={!canRemoveAccount}
                    >
                      Unlink email
                    </button>
                  ) : (
                    <button
                      onClick={linkEmail}
                      className="text-sm bg-violet-600 hover:bg-violet-700 py-2 px-4 rounded-md text-white"
                    >
                      Connect email
                    </button>
                  )}
                  {wallet ? (
                    <button
                      onClick={() => {
                        unlinkWallet(wallet.address);
                      }}
                      className="text-sm border border-violet-600 hover:border-violet-700 py-2 px-4 rounded-md text-violet-600 hover:text-violet-700 disabled:border-gray-500 disabled:text-gray-500 hover:disabled:text-gray-500"
                      disabled={!canRemoveAccount}
                    >
                      Unlink wallet
                    </button>
                  ) : (
                    <button
                      onClick={linkWallet}
                      className="text-sm bg-violet-600 hover:bg-violet-700 py-2 px-4 rounded-md text-white border-none"
                    >
                      Connect wallet
                    </button>
                  )}
                  {phone ? (
                    <button
                      onClick={() => {
                        unlinkPhone(phone.number);
                      }}
                      className="text-sm border border-violet-600 hover:border-violet-700 py-2 px-4 rounded-md text-violet-600 hover:text-violet-700 disabled:border-gray-500 disabled:text-gray-500 hover:disabled:text-gray-500"
                      disabled={!canRemoveAccount}
                    >
                      Unlink phone
                    </button>
                  ) : (
                    <button
                      onClick={linkPhone}
                      className="text-sm bg-violet-600 hover:bg-violet-700 py-2 px-4 rounded-md text-white border-none"
                    >
                      Connect phone
                    </button>
                  )}
                </div>

                <p className="mt-6 font-bold uppercase text-sm text-gray-600">User object</p>
                <textarea
                  value={JSON.stringify(user, null, 2)}
                  className="max-w-4xl bg-slate-700 text-slate-50 font-mono p-4 text-xs sm:text-sm rounded-md mt-2"
                  rows={20}
                  disabled
                />
              </>
            )}
          </>
        ) : null}
      </main>
    </>
  );
}
