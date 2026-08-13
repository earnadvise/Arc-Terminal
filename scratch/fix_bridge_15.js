const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

const routeDetailsHTML = `
        {/* Route Details Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-[360px] bg-white/60 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white h-fit hidden lg:block"
        >
          <h2 className="text-[15px] font-bold text-slate-800 mb-6">Route Details</h2>
          
          <div className="flex flex-col gap-5 text-[13px]">
            {/* Expected Output */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="font-semibold text-slate-400">Expected Output</span>
              <span className="font-bold text-slate-800">{amount || '0'} USDC</span>
            </div>

            {/* Via */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="font-semibold text-slate-400">Via</span>
              <div className="flex items-center gap-1.5 bg-[#4F46E5] text-white px-2 py-0.5 rounded-md font-bold text-[10px]">
                 CCTP V2
              </div>
            </div>

            {/* Route */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="font-semibold text-slate-400">Route</span>
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                   {fromNet.split(' ')[0]}
                </div>
                <span className="text-slate-300">→</span>
                <div className="flex items-center gap-1.5">
                   {toNet.split(' ')[0]}
                </div>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="font-semibold text-slate-400">Estimated Time</span>
              <span className="font-bold text-slate-800">~ 15 - 20s</span>
            </div>

            {/* Est. Network Fee */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <span className="font-semibold text-slate-400 mt-0.5">Est. Network Fee</span>
              <div className="flex flex-col items-end gap-1 text-[11px] font-semibold text-slate-400 text-right">
                 <span>Approve: <span className="text-slate-300">Unavailable ETH</span></span>
                 <span>Burn: <span className="text-slate-300">Unavailable ETH</span></span>
                 <span>Mint: <span className="text-slate-300">Unavailable USDC</span></span>
              </div>
            </div>

            {/* Platform Fee */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">Platform Fee</span>
              <span className="font-bold text-[#10B981]">$0</span>
            </div>
          </div>
        </motion.div>
`;

// Insert it right after the main bridge widget closing tag </motion.div>
// There is a </div> right after </motion.div> for the "flex gap-12" container.

content = content.replace(
  /        <\/motion\.div>\r?\n      <\/div>/,
  '        </motion.div>\n' + routeDetailsHTML + '\n      </div>'
);

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Added Route Details card!');
