import React, { useState, useEffect, useRef } from 'react';
// import PeerReviewAbi from '../abi/PeerReview.json'
import PeerReviewAbi from '../../abi/PeerReview.json'
// import { PublicClient, type WalletClient } from "viem";
// import { useDynamicContext } from "@dynamic-labs/sdk-react-core";


import { createSmartAccountClient } from "@alchemy/aa-core";
import { baseSepolia } from 'viem/chains';
import { encodeFunctionData } from "viem";
// import { abi } from "../mint_src/abi.js";
import config from '../config_mint.json' assert { type: 'json' };
import { createLightAccount } from "@alchemy/aa-accounts";
import { LocalAccountSigner } from "@alchemy/aa-core";
import { deepHexlify, resolveProperties } from "@alchemy/aa-core";
import axios from "axios";
import { http } from "viem";

interface IInputField {
  name: string;
  value: string;
  description: string;
}

interface IInteractionForm {
  description: string;
  defaultInputs: IInputField[];
  functionName: string;
  functionArgs: (inputs: IInputField[]) => any[];
  isReadCall?: boolean;
  onInputsChange?: (inputs: IInputField[]) => void; // Callback for when inputs change
}

export const InteractionForm: React.FC<IInteractionForm> = ({ description, defaultInputs, functionName, functionArgs, isReadCall, onInputsChange }) => {
  const contractAddress = "0x29fAc56b5f34e29BC363cA18ACB33924f2Ce166c";
  // const { primaryWallet, network } = useDynamicContext();

  // const [transactionHash, setTransactionHash] = useState<string>('');
  // const [readResult, setReadResult] = useState<string>('');

  const [inputs, setInputs] = useState<IInputField[]>(defaultInputs);

  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      setInputs(defaultInputs);
      initialRender.current = false;
    }
  }, []); // Removed defaultInputs from dependency array

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();


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
    console.log("\x1b[33m%s\x1b[0m", `executing ${functionName}. address: ${smartAccountClient.account.address} (Account type: simple)`);

    // Encode the calldata
    const callData = encodeFunctionData({
      // abi: abi,
      // functionName: config.function_name,
      // args: [smartAccountClient.account.address, 0],
      abi: PeerReviewAbi,
      functionName: functionName,
      args: functionArgs(inputs)
    });
    // const contractAddress = config.contract_address;
    console.log("Waiting for transaction...")

    // Send the sponsored transaction!
    const uo = await smartAccountClient.sendUserOperation({
      uo: { target: contractAddress, data: callData, value: BigInt(0) },
    });
    try {
      await smartAccountClient.waitForUserOperationTransaction(uo);
    } catch (error) {
      // There's currently an issue with viem not being able to find the transaction hash, but it does exist
      const txHash = extractHashFromError(error)
      // const txHash = extractHashFromError(error.toString())
      console.log("\x1b[32m", `⛽ Successfully sponsored gas for ${functionName} transaction with Coinbase Cloud!`);
      console.log("\x1b[36m", `🔍 View on Etherscan: https://sepolia.basescan.org/tx/${txHash}`);
    }






    // if (!primaryWallet) return;
    // try {
    //   const publicClient: PublicClient = await primaryWallet.connector.getPublicClient();
    //   if (isReadCall) {
    //     const data = await publicClient.readContract({
    //       address: contractAddress,
    //       abi: PeerReviewAbi,
    //       functionName: functionName,
    //       args: functionArgs(inputs)
    //     })
    //     console.log("data", data);
    //     setReadResult(JSON.stringify(data));
    //   } else {
    //     const walletClient: WalletClient = await primaryWallet.connector.getWalletClient(network);
    //     const account = (await walletClient.getAddresses());
    //     console.log(account, primaryWallet.address)
    //     const { request } = await publicClient.simulateContract({
    //       // @ts-ignore
    //       account: primaryWallet.address,
    //       address: contractAddress,
    //       abi: PeerReviewAbi,
    //       // functionName: "addAuthor",
    //       functionName: functionName,
    //       args: functionArgs(inputs)
    //     })
    //     const hash = await walletClient.writeContract(request)
    //     setTransactionHash(hash);
    //     console.log('Transaction successful with hash:', hash);
    //   }
    // } catch (error) {
    //   console.error('Transaction failed:', error);
    // }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {inputs.map((IinputField, index) => (
          <div key={IinputField.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <label htmlFor={IinputField.name}>{IinputField.description}</label>
            {functionName === 'submitData' ? (
              <textarea
                id={IinputField.name}
                rows="20"
                cols="80"
                value={IinputField.value}
                onChange={(e) => {
                  const newInputs = [...inputs];
                  newInputs[index] = { ...IinputField, value: e.target.value };
                  setInputs(newInputs);
                  if (onInputsChange) {
                    onInputsChange(newInputs); // Call the callback function with the new inputs
                  }
                }}
                placeholder={IinputField.description}
              />
            ) : (
              <input
                id={IinputField.name}
                type="text"
                value={IinputField.value}
                onChange={(e) => {
                  const newInputs = [...inputs];
                  newInputs[index] = { ...IinputField, value: e.target.value };
                  setInputs(newInputs);
                  if (onInputsChange) {
                    onInputsChange(newInputs); // Call the callback function with the new inputs
                  }
                }}
                placeholder={IinputField.description}
              />
            )}
          </div>
        ))}
        <button type="submit"
          className="text-sm bg-violet-600 hover:bg-violet-700 py-2 px-4 rounded-md text-white"
          style={{ marginTop: 'auto' }}>{description}</button>
        {/* <button type="submit" disabled={!primaryWallet} style={{ marginTop: 'auto' }}>{description}</button> */}
      </form>
      {/* {!isReadCall ? ( */}
      {/*   transactionHash && ( */}
      {/*     <p>Transaction sent! Hash: {transactionHash}</p> */}
      {/*   ) */}
      {/* ) : ( */}
      {/*   readResult && ( */}
      {/*     <p>Read call result: {readResult}</p> */}
      {/*   ) */}
      {/* )} */}
    </div>
  );
};

