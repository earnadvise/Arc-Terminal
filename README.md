# ⚡ Arc Terminal

> **Next-Generation Agentic Derivatives, Spot AMM & Real-Yield Vault Interface on Arc Network.**

[![Live Web App](https://img.shields.io/badge/Web_App-arcterminalai.xyz-01C38E?style=for-the-badge&logo=vercel)](https://arcterminalai.xyz)
[![X / Twitter](https://img.shields.io/badge/Follow-@arcterminalai-0052FF?style=for-the-badge&logo=x)](https://x.com/arcterminalai)
[![Network](https://img.shields.io/badge/Network-Arc_Testnet-0A786A?style=for-the-badge)](https://rpc.testnet.arc.network)

---

## 🌟 Project Overview

**Arc Terminal** is a unified decentralized trading terminal designed for active traders and autonomous AI agents. Built natively on **Arc Network**, it combines agentic natural language trade execution via **Arc AI**, zero price-impact perpetual derivatives, and autocompounding ERC-4626 stablecoin **Vault** liquidity pools into a high-performance, non-custodial Web3 interface.

---

## 🔗 Live Demo & Video

- **Live Demo Link:** [https://arcterminalai.xyz](https://arcterminalai.xyz)
- **Demo Video Link:** [Watch Demo Video on YouTube](https://youtu.be/sW4ftxIae-o)

---

## 📸 Screenshots

![Interface View 1](./public/screenshot-1.png)
![Interface View 2](./public/screenshot-2.png)
![Interface View 3](./public/screenshot-3.png)

---

## 🔥 Features

### 🤖 1. Agentic Natural Language Execution (Arc AI)
- **LLM Intent Engine:** Execute complex token swaps, open leveraged positions, and optimize portfolio allocation using natural language chat prompts (e.g. `/swap 10 USDC to EURC`).
- **ABI Payload Encoding:** Automatically constructs optimal routing and contract payloads for one-click wallet signature approval.
- **100% Non-Custodial:** User funds remain fully controlled by the connected Web3 wallet.

### 📈 2. 20x Perpetual Derivatives
- **Zero Price Impact:** Execute leveraged trades up to 20x on BTC, ETH, and SOL index prices.
- **Vault LP Collateralization:** Leveraged positions are backed directly by the platform's multi-asset Vault liquidity pools.
- **Max Position Sizing:** Built-in dynamic MAX button calculating exact position limits accounting for margin, leverage, and fee buffers.

### 🏦 3. Real Yield Vaults (ERC-4626)
- **4.5% - 5.0% APY:** Generates organic, non-inflationary yield from perpetual trading fees, borrowing interest (funding rates), liquidations, and AMM swap fees.
- **Autocompounding Shares:** Tokenized vault shares (`aUSDC`, `aEURC`) automatically accrue value relative to underlying `totalAssets()`.

### 🛡️ 4. Direct RPC Failover Architecture
- **Zero-Latency Reads:** Routes read queries directly to `rpc.testnet.arc.network`, bypassing browser wallet read timeouts.
- **Resilient Polling:** 2-second fast balance polling, staggered post-transaction refreshes, and state synchronization to prevent UI flickering.

---

## 🔄 Recent Updates (Latest)
- **AppKit Cross-Chain Bridge:** Implemented a seamless cross-chain USDC bridge using Circle's AppKit and CCTP, enabling transfers between Arc Testnet and 6 major EVM testnets with real-time UI tracking.
- **Premium Light Mode Overhaul:** Fully migrated the decentralized application to a stunning, modern light theme featuring vivid sky blue gradients, frosted glassmorphism panels, and crisp charcoal text for enhanced professional aesthetics.
- **Client-Side Oracle Synchronization:** Resolved Vercel geo-blocking issues by migrating price fetching directly to the client side, ensuring 100% accurate real-time index prices for Perpetuals.
- **UI Legibility Enhancements:** Improved contrast and text visibility across the Arc AI Terminal and Yield Vaults to guarantee readability.
- **Contract Architecture Preserved:** All Arc Testnet smart contracts remain unchanged and fully functional without disruption.

---

## 🔵 Circle Products Used

Arc Terminal heavily relies on Circle's stablecoin infrastructure for routing, settlement, and yield generation:
- **Circle AppKit & CCTP:** Powers the native cross-chain bridging infrastructure between Arc Testnet and EVM testnets.
- **USDC:** Used as the primary base currency for swap routing, perpetual margin collateral, and our primary ERC-4626 Yield Vault.
- **EURC:** Supported for FX swaps against USDC and has its own dedicated Yield Vault.

---

## 📜 Smart Contracts (Arc Testnet)

- **ArcPerpVault (Perpetual Trading):** `0x1b31f6abFA626378096a73727830329BEECE5262`
- **ArcReversiblePayment (ArcSafePay Escrow):** `0x95D00C1B48218e44Be6fF1e90D2f473A646191f0`
- **USDC Yield Vault (ERC-4626):** `0xB5dAd4840ef25d6A7Ea8c19E8C6d438197F5AfB9`
- **EURC Yield Vault (ERC-4626):** `0xC2752C4e2c6FFaf4f8aBA432d98A9d2ae216BD8E`

---

## 🚀 Installation Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/earnadvise/Arc-Terminal.git
cd Arc-Terminal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```
