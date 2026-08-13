const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

// 1. Fix the `eth` variable issue
content = content.replace(
  /const { walletConnected, walletAddress, setBalances, balances, addNotification, eth } = useAppState\(\);/,
  'const { walletConnected, walletAddress, setBalances, balances, addNotification, getProvider } = useAppState();\n  const eth = getProvider();'
);

// 2. Remove the left sidebar menu
content = content.replace(
  /        \{\/\* Left Side "ArcFun" Style Menu \(Optional to match aesthetic\) \*\/\}\s*<div className="hidden md:flex flex-col gap-6 pt-8 min-w-\[200px\]">[\s\S]*?<\/div>\r?\n\r?\n/,
  ''
);

// 3. Update the Action button area
const oldActionArea = `          {/* ACTION BUTTON */}
          <div className="bg-white rounded-[20px] p-1.5 border border-slate-100 flex items-center gap-2 shadow-sm">
             <div className="bg-[#EBF3FF] rounded-full px-4 py-2 flex items-center justify-center shrink-0">
               <span className="text-xs font-semibold text-[#0052FF]">Rabby Wallet ^</span>
             </div>
             <button
               onClick={executeBridge}
               disabled={isBridging || !walletConnected || !amount || parseFloat(amount) <= 0}
               className={\`flex-1 py-3 rounded-[16px] font-semibold text-sm transition-colors flex items-center justify-center \${
                 isBridging || !walletConnected || !amount || parseFloat(amount) <= 0
                   ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                   : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
               }\`}
             >
               {isBridging ? (
                 <span className="flex items-center gap-2">
                   <span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                   Bridging...
                 </span>
               ) : !walletConnected ? (
                 'Connect Wallet'
               ) : (
                 'Select a chain / Bridge'
               )}
             </button>
          </div>`;

const newActionArea = `          {/* ACTION BUTTON */}
          <div className="bg-white rounded-[20px] p-1.5 border border-slate-100 flex flex-col items-center gap-2 shadow-sm">
             {walletConnected && (
               <div className="bg-[#EBF3FF] rounded-full px-4 py-1.5 mt-1 flex items-center justify-center">
                 <span className="text-[11px] font-semibold text-[#0052FF]">{walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}</span>
               </div>
             )}
             <button
               onClick={executeBridge}
               disabled={isBridging || !walletConnected || !amount || parseFloat(amount) <= 0}
               className={\`w-full py-3.5 rounded-[16px] font-bold text-sm transition-colors flex items-center justify-center gap-2 \${
                 isBridging || !walletConnected || !amount || parseFloat(amount) <= 0
                   ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                   : 'bg-[#0052FF] text-white shadow-md hover:bg-blue-600'
               }\`}
             >
               {isBridging ? (
                 <span className="flex items-center gap-2">
                   <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   Bridging...
                 </span>
               ) : !walletConnected ? (
                 'Connect Wallet'
               ) : (
                 <>
                   <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                     <span className="text-white text-xs">→</span>
                   </div>
                   Approve & Bridge
                 </>
               )}
             </button>
          </div>`;

content = content.replace(oldActionArea, newActionArea);

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Fixed eth variable, removed sidebar, updated action button.');
