# Arc Terminal: Mainnet Migration Plan

This document outlines the step-by-step strategy for migrating all Arc Terminal features from testnet/mock data to fully live smart contracts on Arc Mainnet. We are moving module by module to ensure absolute stability.

## Phase 1: SafePay Escrow (✅ COMPLETED)
- **Status:** Fully Live
- **Contract:** `ArcSafePay.sol` deployed at `0xCA51920257DD503150F3eF9a3fE4a34B2176C866`
- **Actions Completed:** Smart contract written, deployed via Remix, ABI synced with frontend, and real on-chain UI functionality verified.

## Phase 2: DEX Swaps (⏳ IN PROGRESS)
- **Status:** Test UX Implemented
- **Current State:** The UI successfully intercepts trades and mocks an EIP-2612 Gasless Permit flow to bypass the clunky "Approve" popup.
- **Next Steps (Tonight/Tomorrow):**
  1. Verify if the Arc Mainnet `SynthraV3` SwapRouter supports Permit Multicalls.
  2. If yes: Write the real multicall transaction bytes so the swap executes fully gasless.
  3. If no: Revert the UX slightly to use standard on-chain ERC-20 `Approve` -> `SwapExactInputSingle` so it works flawlessly on-chain.

## Phase 3: Perpetuals Integration (⏳ PENDING SYNTHRA LAUNCH)
- **Status:** UI Built, Awaiting Smart Contracts
- **Current State:** The frontend is beautiful but relies on mocked local state for open positions and PnL.
- **Next Steps:**
  1. Obtain the official `Router` and `PositionManager` contract addresses from the Synthra team.
  2. Obtain the Synthra ABIs.
  3. Replace the mock "Long/Short" buttons with actual `ethers.js` contract calls.
  4. Replace the "Open Positions" table with real-time on-chain read calls.

## Phase 4: Cross-Chain Bridge (⏳ PENDING CIRCLE/LI.FI)
- **Status:** Simulated Fallback
- **Current State:** Circle's `@circle-fin/app-kit` hard-crashes because `Arc_Mainnet` isn't in their internal Enum list yet, so the UI currently simulates a successful bridge.
- **Next Steps:**
  1. **Option A:** Wait for Circle to update their NPM package to include `Arc_Mainnet`.
  2. **Option B:** Rip out Circle entirely and wire up the raw **LI.FI API** (like Xylo did) to generate real bridging transaction bytes.

## Phase 5: AI Agents & Portfolio (🔮 FINAL POLISH)
- **Status:** UI Built
- **Next Steps:**
  1. **Portfolio:** Ensure it accurately reads the user's unified balances and real margin usage from the Synthra integration (from Phase 3).
  2. **Agents:** Wire up the frontend chat prompts to actually trigger backend execution logic.

---

*Rule of Thumb: Do not move to the next phase until the current phase is fully tested and confirmed working on Arc Mainnet.*
