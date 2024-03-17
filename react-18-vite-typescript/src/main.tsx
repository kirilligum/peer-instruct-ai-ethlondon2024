import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectors } from "@dynamic-labs/ethereum-aa";
import App from './App.tsx'
import './index.css'
import { EthersExtension } from "@dynamic-labs/ethers-v6";


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DynamicContextProvider
      settings={{
        environmentId: import.meta.env.VITE_DYNAMIC_ID,
        walletConnectors: [
          EthereumWalletConnectors,
          ZeroDevSmartWalletConnectors,
        ],
        walletConnectorExtensions: [EthersExtension],
      }}
    >
      <App />
    </DynamicContextProvider>
  </React.StrictMode>,
)
