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


  return (
    <>
      <Head>
        <title>Privy Auth Demo</title>
      </Head>

      <main className="flex flex-col min-h-screen px-4 sm:px-20 py-6 sm:py-10 bg-privy-light-blue">
        <div className="flex flex-row justify-between">
          <button
            className="text-sm bg-green-600 hover:bg-green-700 py-2 px-4 rounded-md text-white"
            onClick={handleClick}
          >Test</button>
        </div>
        {ready && authenticated ? (
          <>
            <div className="flex flex-row justify-between">
              <h1 className="text-2xl font-semibold">Privy Auth Demo</h1>
              <button
                onClick={logout}
                className="text-sm bg-violet-200 hover:text-violet-900 py-2 px-4 rounded-md text-violet-700"
              >
                Logout
              </button>
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
        ) : null}
      </main>
    </>
  );
}
