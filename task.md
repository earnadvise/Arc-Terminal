# BridgingKitContract Testnet Implementation

- [ ] Install `ethers` for frontend signing.
- [ ] Create `contracts/BridgingKitContract.sol` (CCTP wrapper).
- [ ] Update `src/lib/cctp.ts` with Testnet addresses:
  - [ ] Ethereum Sepolia
  - [ ] Arbitrum Sepolia
  - [ ] Base Sepolia
  - [ ] Linea Sepolia
- [ ] Update `src/components/views/BridgeView.tsx`:
  - [ ] Include all 4 testnets + Arc Testnet in the network selectors.
  - [ ] Wire `executeBridge` to use `ethers` and trigger MetaMask.
- [ ] Verify TypeScript and build.
