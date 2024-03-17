import React, { useState, useEffect, useRef } from 'react';
import PeerReviewAbi from '../abi/PeerReview.json'
import { PublicClient, type WalletClient } from "viem";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

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
  const contractAddress = "0x29fAc56b5f34e29BC363cA18ACB33924f2Ce166c"; // base sepolia
  // const contractAddress = "0xb1fEC5fe2d82A189eE793aE9a675eA4a7caC6e99"; // arbitrum sepolia
  const { primaryWallet, network } = useDynamicContext();

  const [transactionHash, setTransactionHash] = useState<string>('');
  const [readResult, setReadResult] = useState<string>('');

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
    if (!primaryWallet) return;
    try {
      const publicClient: PublicClient = await primaryWallet.connector.getPublicClient();
      if (isReadCall) {
        const data = await publicClient.readContract({
          address: contractAddress,
          abi: PeerReviewAbi,
          functionName: functionName,
          args: functionArgs(inputs)
        })
        console.log("data", data);
        setReadResult(JSON.stringify(data));
      } else {
        const walletClient: WalletClient = await primaryWallet.connector.getWalletClient(network);
        const account = (await walletClient.getAddresses());
        console.log(account, primaryWallet.address)
        const { request } = await publicClient.simulateContract({
          // @ts-ignore
          account: primaryWallet.address,
          address: contractAddress,
          abi: PeerReviewAbi,
          // functionName: "addAuthor",
          functionName: functionName,
          args: functionArgs(inputs)
        })
        const hash = await walletClient.writeContract(request)
        setTransactionHash(hash);
        console.log('Transaction successful with hash:', hash);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    }
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
        <button type="submit" disabled={!primaryWallet} style={{ marginTop: 'auto' }}>{description}</button>
      </form>
      {!isReadCall ? (
        transactionHash && (
          <p>Transaction sent! Hash: {transactionHash}</p>
        )
      ) : (
        readResult && (
          <p>Read call result: {readResult}</p>
        )
      )}
    </div>
  );
};

