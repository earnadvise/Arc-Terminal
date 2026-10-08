import { useState, useCallback } from 'react';
import { BrowserProvider, ethers } from 'ethers';

// Hyperliquid API Constants
const HL_API_URL = 'https://api.hyperliquid.xyz/info';
const HL_EXCHANGE_URL = 'https://api.hyperliquid.xyz/exchange';

// Arc Terminal Builder Address for collecting the 10bps fee
const ARC_BUILDER_ADDRESS = '0x0000000000000000000000000000000000ArcFee'; 

export function useHyperliquid() {
  const [hlBalance, setHlBalance] = useState<number>(0);
  const [sessionKeyActive, setSessionKeyActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Fetch real balance from Hyperliquid L1
  const fetchRealBalance = useCallback(async (userAddress: string) => {
    try {
      const res = await fetch(HL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: "clearinghouseState", user: userAddress })
      });
      if (res.ok) {
        const data = await res.json();
        const margin = parseFloat(data.marginSummary.accountValue);
        setHlBalance(margin);
      }
    } catch (e) {
      console.error('Failed to fetch HL balance:', e);
    }
  }, []);

  /**
   * 1. CROSS-CHAIN FUNDING (SynRoute Simulation)
   * In a full production environment, this calls POST /v1/hyperliquid/deposit/quote
   * to bridge USDC from the source chain (Arbitrum, Base, Arc) to the Hyperliquid L1.
   */
  const depositToHyperliquid = async (amount: number, sourceChain: string, userAddress?: string) => {
    setIsProcessing(true);
    try {
      // Simulate the SynRoute cross-chain bridge and Hyperliquid L1 confirmation delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setHlBalance(prev => prev + amount);
      if (userAddress) {
        fetchRealBalance(userAddress);
      }
      return { success: true, message: `Successfully deposited ${amount} USDC via ${sourceChain}` };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Deposit failed' };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 2. SESSION KEYS (1-Click Trading)
   * Prompts the user to sign an EIP-712 message approving a temporary session key.
   * This allows placing trades without MetaMask popups for every order.
   */
  const enableTrading = async () => {
    setIsProcessing(true);
    try {
      if (!window.ethereum) throw new Error("No crypto wallet found");
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // The EIP-712 domain for Hyperliquid Session Keys
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: 42161, // Arbitrum is used for HL L1 auth
        verifyingContract: '0x0000000000000000000000000000000000000000'
      };

      const types = {
        Agent: [
          { name: "source", type: "string" },
          { name: "connectionId", type: "bytes32" }
        ]
      };

      const value = {
        source: "arcterminalai.xyz",
        connectionId: ethers.keccak256(ethers.toUtf8Bytes(Date.now().toString()))
      };

      // Prompt MetaMask signature
      await signer.signTypedData(domain, types, value);
      
      setSessionKeyActive(true);
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'User rejected session key signature' };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 3. ORDER EXECUTION WITH BUILDER FEE
   * Formats the exact JSON payload expected by Hyperliquid and attaches the Arc Terminal builder fee.
   */
  const placeHyperliquidOrder = async (
    symbol: string, 
    isBuy: boolean, 
    sz: number, 
    limitPx: number, 
    leverage: number
  ) => {
    if (!sessionKeyActive) {
      return { success: false, message: 'Trading not enabled. Please sign session key.' };
    }

    setIsProcessing(true);
    try {
      // Create the Hyperliquid action payload
      const orderAction = {
        type: "order",
        orders: [{
          coin: symbol.replace('-PERP', ''),
          is_buy: isBuy,
          sz: sz.toString(),
          limit_px: limitPx.toString(),
          order_type: { limit: { tif: "Gtc" } },
          reduce_only: false
        }],
        grouping: "na",
        // The crucial Builder Fee configuration matching Synthra's architecture (10 bps)
        builder: {
          b: ARC_BUILDER_ADDRESS,
          f: 10 // 10 bps
        }
      };

      // Simulate network request to Hyperliquid L1
      console.log('Sending to Hyperliquid L1:', orderAction);
      await new Promise(resolve => setTimeout(resolve, 800));

      return { success: true, message: `Placed ${isBuy ? 'LONG' : 'SHORT'} order for ${sz} ${symbol}` };
    } catch (error) {
      return { success: false, message: 'Order execution failed' };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    hlBalance,
    sessionKeyActive,
    isProcessing,
    fetchRealBalance,
    depositToHyperliquid,
    enableTrading,
    placeHyperliquidOrder
  };
}
