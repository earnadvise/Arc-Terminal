'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '@/context/useAppState';
import {
  Bot, User, Send, Sparkles, Wallet, Shield, CheckCircle2,
  AlertTriangle, RefreshCw, Cpu, MessageSquare, Clipboard, HelpCircle, Trash2, ArrowRight, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ARC_TOKENS,
  SWAP_ROUTER_ADDRESS,
  getPoolFee,
  isRealSwapSupported,
  checkAllowance,
  encodeApprove,
  encodeExactInputSingle,
  calculateMinOutput,
  waitForTransaction,
  toWei,
  MAX_UINT256,
  getPoolExchangeRate
} from '@/lib/swapRouter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  customAction?: 'swap_tokens';
}

export default function AgentsView() {
  const {
    walletConnected,
    walletAddress,
    balances,
    positions,
    markets,
    addNotification
  } = useAppState();


  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am Arc Agent, your trading assistant. How can I help you today? You can ask me about your balances, open positions, market prices, or execute a token swap with the `/swap` command (e.g. `/swap 10 USDC to EURC`).',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);



  // Swap states inside chat
  const [chatSwapFromToken, setChatSwapFromToken] = useState('USDC');
  const [chatSwapToToken, setChatSwapToToken] = useState('EURC');
  const [chatSwapAmount, setChatSwapAmount] = useState('10');
  const [chatSwapStatus, setChatSwapStatus] = useState<'idle' | 'checking' | 'approving' | 'waitApproval' | 'swapping' | 'mining' | 'done' | 'error'>('idle');
  const [chatSwapError, setChatSwapError] = useState('');
  const [chatSwapTxHash, setChatSwapTxHash] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);


  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);



  // Chat-triggered on-chain Swap router handler
  const handleExecuteChatSwap = async () => {
    const eth = (window as any).ethereum;
    if (!eth || !walletConnected || !walletAddress) {
      addNotification('error', 'Execution Failed', 'Wallet not connected. Connect your wallet in the navbar.');
      return;
    }

    const parsed = parseFloat(chatSwapAmount);
    if (!parsed || parsed <= 0) {
      addNotification('warning', 'Invalid Amount', 'Enter a valid amount to swap.');
      return;
    }

    setChatSwapStatus('checking');
    setChatSwapError('');
    setChatSwapTxHash('');

    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const fromAddress = accounts[0];

      const tokenIn = ARC_TOKENS[chatSwapFromToken];
      const tokenOut = ARC_TOKENS[chatSwapToToken];
      
      if (!tokenIn || !tokenOut) {
        throw new Error('Unsupported swap pair.');
      }

      const amountInWei = toWei(parsed, tokenIn.decimals);

      // Fetch exchange rate
      const currentPoolRate = await getPoolExchangeRate(eth, chatSwapFromToken, chatSwapToToken);
      const minOutput = calculateMinOutput(
        parsed,
        tokenIn.decimals,
        tokenOut.decimals,
        0.5, // 0.5% slippage
        currentPoolRate || 1.0,
      );

      // Check allowance
      const allowance = await checkAllowance(eth, tokenIn.address, fromAddress, SWAP_ROUTER_ADDRESS);

      if (allowance < amountInWei) {
        setChatSwapStatus('approving');
        addNotification('info', 'Approval Required', `Approve ${chatSwapFromToken} spending in your wallet…`);
        const approveData = encodeApprove(SWAP_ROUTER_ADDRESS, MAX_UINT256);
        const approvalTxHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [{ from: fromAddress, to: tokenIn.address, data: approveData }],
        });

        setChatSwapStatus('waitApproval');
        await waitForTransaction(eth, approvalTxHash);
        addNotification('success', 'Token Approved', `${chatSwapFromToken} approved for swapping.`);
      }

      setChatSwapStatus('swapping');
      addNotification('info', 'Executing Swap', 'Confirm the swap transaction in your wallet…');

      const swapData = encodeExactInputSingle(
        tokenIn.address,
        tokenOut.address,
        getPoolFee(chatSwapFromToken, chatSwapToToken),
        fromAddress,
        amountInWei,
        minOutput,
      );

      const txHash: string = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: fromAddress, to: SWAP_ROUTER_ADDRESS, data: swapData }],
      });

      setChatSwapTxHash(txHash);
      setChatSwapStatus('mining');

      await waitForTransaction(eth, txHash);
      setChatSwapStatus('done');

      addNotification('success', 'Swap Executed ✓', `Swapped ${parsed} ${chatSwapFromToken} → ${chatSwapToToken} successfully.`);
      
      setMessages(prev => [...prev, {
        id: `msg-swap-success-${Date.now()}`,
        role: 'assistant',
        content: `🎉 **Swap Successful!** Swapped **${parsed} ${chatSwapFromToken}** to **${chatSwapToToken}** on-chain.\n\nTransaction Hash: \`${txHash}\`.\nBalances will update in your wallet shortly.`,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error(err);
      setChatSwapStatus('error');
      const isRejected = err.message?.includes('User rejected') || err.message?.includes('User denied') || err.message?.includes('rejected');
      const errMsg = isRejected ? 'Transaction rejected by user.' : (err.message || 'On-chain swap failed. Please try again.');
      setChatSwapError(errMsg);
      addNotification('error', 'Swap Failed', errMsg);

      setMessages(prev => [...prev, {
        id: `msg-swap-fail-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Swap Failed.** ${errMsg}\n\nYou can try again or use the **Swap** tab for more options.`,
        timestamp: new Date()
      }]);
    } finally {
      setChatSwapStatus('idle');
    }

  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsgId = `msg-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const query = text.toLowerCase();
      let responseContent = '';
      let action: 'swap_tokens' | undefined;

      const isSwapQuery = query.startsWith('/swap') || 
                          query === 'swap' || 
                          query.includes('swap tokens') || 
                          query.includes('exchange') ||
                          ((query.includes('usdc') || query.includes('eurc') || query.includes('usdt') || query.includes('cirbtc')) && query.includes('to'));

      if (isSwapQuery) {
        let parsedAmount = '10';
        let parsedFrom = 'USDC';
        let parsedTo = 'EURC';

        // Extract amount: find any number (integer or decimal)
        const amountMatch = query.match(/(\d+(\.\d+)?)/);
        if (amountMatch) {
          parsedAmount = amountMatch[1];
        }

        // Extract tokens
        const tokensFound = ['usdc', 'usdt', 'eurc', 'cirbtc'].filter(t => query.includes(t));
        if (tokensFound.length >= 2) {
          const toIndex = query.indexOf('to');
          if (toIndex !== -1) {
            const beforeTo = query.substring(0, toIndex);
            const afterTo = query.substring(toIndex + 2);
            
            const fromTokenMatch = tokensFound.find(t => beforeTo.includes(t));
            const toTokenMatch = tokensFound.find(t => afterTo.includes(t));
            
            if (fromTokenMatch) parsedFrom = fromTokenMatch.toUpperCase();
            if (toTokenMatch) parsedTo = toTokenMatch.toUpperCase();
          } else {
            parsedFrom = tokensFound[0].toUpperCase();
            parsedTo = tokensFound[1].toUpperCase();
          }
        } else if (tokensFound.length === 1) {
          parsedFrom = tokensFound[0].toUpperCase();
          parsedTo = parsedFrom === 'USDC' ? 'EURC' : 'USDC';
        }

        setChatSwapFromToken(parsedFrom);
        setChatSwapToToken(parsedTo);
        setChatSwapAmount(parsedAmount);

        responseContent = `I can help you swap assets on SynthraV3 Router. I parsed your swap request as: **${parsedAmount} ${parsedFrom}** → **${parsedTo}**.\n\nYou can customize the swap parameters in the card below and execute it directly from the chat:`;
        action = 'swap_tokens';
      } else if (query.includes('balance') || query.includes('portfolio') || query.includes('wallet') || query.includes('assets')) {
        if (!walletConnected) {
          responseContent = 'It looks like your wallet is not connected. Please connect your wallet in the navigation bar to view your balances.';
        } else {
          const balanceList = Object.entries(balances)
            .map(([token, val]) => `• **${token}**: ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`)
            .join('\n');
          
          responseContent = `Here are your current wallet balances:\n\n${balanceList}\n\nLet me know if you would like me to analyze your portfolio or suggest market opportunities.`;
        }
      } else if (query.includes('position') || query.includes('trade') || query.includes('leverage') || query.includes('open')) {
        if (!walletConnected) {
          responseContent = 'Please connect your wallet to query your active trading positions.';
        } else if (positions.length === 0) {
          responseContent = 'You currently have no open perpetual positions on Arc Terminal. Go to the Perpetuals tab to open your first leverage trade!';
        } else {
          const positionList = positions.map(pos => {
            const sideColor = pos.side === 'LONG' ? '🟢 LONG' : '🔴 SHORT';
            const pnlColor = pos.unrealizedPnl >= 0 ? `+$${pos.unrealizedPnl.toFixed(2)}` : `-$${Math.abs(pos.unrealizedPnl).toFixed(2)}`;
            return `• **${pos.symbol}** (${sideColor} x${pos.leverage})\n  Size: ${pos.size} | Entry: $${pos.entryPrice} | Mark: $${pos.markPrice}\n  Unrealized PnL: **${pnlColor}** | Margin: $${pos.margin} (${pos.marginMode})`;
          }).join('\n\n');
          responseContent = `You have **${positions.length}** active position(s):\n\n${positionList}`;
        }
      } else if (query.includes('market') || query.includes('price') || query.includes('ticker') || query.includes('rates')) {
        const marketList = markets.map(m => {
          const changeStr = m.change24h >= 0 ? `+${m.change24h.toFixed(2)}%` : `${m.change24h.toFixed(2)}%`;
          return `• **${m.symbol}**: $${m.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${changeStr})`;
        }).join('\n');
        responseContent = `Here are the current market prices on Arc Terminal:\n\n${marketList}`;

      } else if (query.includes('clear') || query.includes('reset')) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am Arc Agent, your trading assistant. How can I help you today?',
            timestamp: new Date()
          }
        ]);
        setIsTyping(false);
        return;

      } else {
        responseContent = `I can assist you with several trading tasks on Arc Terminal:\n\n` +
          `• **Swap Assets**: Ask "/swap 10 USDC to EURC"\n` +
          `• **Check Wallet Balances**: Ask "What are my balances?"\n` +
          `• **Monitor Active Trades**: Ask "Show my open positions"\n` +
          `• **List Market Prices**: Ask "Get current market rates"\n\n` +
          `What would you like me to do?`;
      }

      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        customAction: action
      }]);
      setIsTyping(false);
    }, 800);
  };

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      let elements: React.ReactNode = line;
      
      // Bold rendering
      const boldPattern = /\*\*(.*?)\*\*/g;
      if (boldPattern.test(line)) {
        const parts = line.split(boldPattern);
        elements = parts.map((part, idx) => (idx % 2 === 1 ? <strong key={idx} className="font-extrabold text-white">{part}</strong> : part));
      }
      
      return <p key={i} className="text-xs leading-relaxed text-slate-300">{elements}</p>;
    });
  };

  return (
    <div className="w-full flex-1 max-w-[1200px] mx-auto p-4 lg:p-6 flex flex-col gap-6 select-none animate-fadeIn">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#334155]/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01C38E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#01C38E]"></span>
            </div>
            <span className="text-[10px] text-[#01C38E] font-extrabold uppercase tracking-wider">Arc Agent active</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-[#01C38E]" size={22} />
            Arc Agent Terminal
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-[500px]">
        
        {/* ── LEFT: CHAT AREA ────────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-[#111827]/60 border border-[#334155]/60 rounded-2xl flex flex-col h-[550px] overflow-hidden backdrop-blur-md relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-[#01C38E] to-blue-500 opacity-60" />
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-gradient-to-tr from-[#0A786A] to-[#01C38E] border-[#01C38E]/20 text-white'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  msg.role === 'user'
                    ? 'bg-[#0A786A]/10 border-[#0A786A]/20 text-slate-100 rounded-tr-none'
                    : 'bg-[#1e293b]/70 border-[#334155]/50 text-slate-200 rounded-tl-none border-l-4 border-l-[#01C38E]'
                }`}>
                  <div className="space-y-1">{formatText(msg.content)}</div>

                  {/* Interactive Action Card Inside Chat */}


                  {/* Swap Card Inside Chat */}
                  {msg.customAction === 'swap_tokens' && (
                    <div className="mt-4 p-4 rounded-lg bg-[#070b19]/60 border border-[#334155]/50 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <Coins size={14} className="text-[#01C38E]" />
                        <span>Interactive Token Swap</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-[#101726]/60 rounded-lg p-2.5 border border-[#334155]/40 text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Sell</span>
                          <span className="text-xs font-mono text-white font-bold">{chatSwapAmount} {chatSwapFromToken}</span>
                        </div>
                        
                        <ArrowRight size={14} className="text-slate-400" />
                        
                        <div className="flex-1 bg-[#101726]/60 rounded-lg p-2.5 border border-[#334155]/40 text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Buy</span>
                          <span className="text-xs font-mono text-[#01C38E] font-bold">{chatSwapToToken}</span>
                        </div>
                      </div>

                      {chatSwapStatus === 'idle' ? (
                        <button
                          onClick={handleExecuteChatSwap}
                          disabled={!walletConnected}
                          className={`w-full py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                            walletConnected
                              ? 'bg-gradient-to-r from-[#0A786A] to-[#01C38E] text-white hover:brightness-110 shadow-md shadow-[#01c38e]/10 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <Sparkles size={13} className="text-[#01C38E]" />
                          {walletConnected ? 'Confirm & Execute Swap' : 'Connect Wallet to Swap'}
                        </button>
                      ) : (
                        <div className="p-3 bg-[#070b19] border border-[#334155]/60 rounded-lg space-y-2 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <RefreshCw size={12} className="animate-spin text-[#01C38E]" />
                            <span className="capitalize font-bold text-white">
                              {chatSwapStatus === 'checking' ? 'Checking allowance' : 
                               chatSwapStatus === 'approving' ? 'Approving token' : 
                               chatSwapStatus === 'waitApproval' ? 'Waiting for approval' : 
                               chatSwapStatus === 'swapping' ? 'Confirming in wallet' : 
                               chatSwapStatus === 'mining' ? 'Executing trade' : 'Processing'}...
                            </span>
                          </div>
                          {chatSwapTxHash && (
                            <div className="text-[10px] text-gray-400 truncate">
                              Tx: <span className="font-mono text-gray-300">{chatSwapTxHash}</span>
                            </div>
                          )}
                          {chatSwapStatus === 'error' && (
                            <div className="text-rose-400 text-[11px] leading-normal font-mono select-all">
                              Error: {chatSwapError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-tr from-[#0A786A] to-[#01C38E] border border-[#01C38E]/20 text-white shrink-0">
                  <Bot size={16} />
                </div>
                <div className="p-3 rounded-2xl bg-[#1e293b]/70 border border-[#334155]/50 text-slate-400 rounded-tl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Inputs */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
            className="p-4 border-t border-[#334155]/40 flex gap-2 bg-[#0b0f19]/80"
          >
            <input
              type="text"
              placeholder="Ask balances, positions, or execute swap (/swap 10 USDC to EURC)..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-[#1e293b] border border-[#334155] focus:border-[#01C38E] focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-[#0A786A] to-[#01C38E] text-white hover:brightness-115 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 shadow-lg shadow-[#01c38e]/10 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* ── RIGHT: TERMINAL CONNECTION & COLLATERAL CARD ──────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-[550px]">
          {/* Terminal Connection Card */}
          <div className="bg-[#0f172a]/40 border border-[#334155]/60 rounded-xl p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-semibold text-white pb-3 border-b border-[#334155]/40 mb-4">
              <Wallet size={16} className="text-emerald-400" />
              <h3>Terminal Connection</h3>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 uppercase font-semibold text-[9px] tracking-wider">Wallet Status</span>
                {walletConnected && walletAddress ? (
                  <span className="text-[#01C38E] font-bold flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected ({walletAddress.slice(0, 8)}...{walletAddress.slice(-4)})
                  </span>
                ) : (
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Not Connected
                  </span>
                )}
              </div>

            </div>
          </div>


        </div>

      </div>

    </div>
  );
}
