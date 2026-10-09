const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const regex = /const usdcAbi = \["function approve\(address spender, uint256 amount\) external returns \(bool\)"\];\s*const usdcContract = new ethers\.Contract\(targetUSDC, usdcAbi, signer\);\s*\/\/\ 1\. Approve USDC on source chain for Omnibus Router\s*const approveTx = await usdcContract\.approve\(targetRouter, parsedAmount\);\s*await approveTx\.wait\(\);/;

const replacement = `const usdcAbi = [
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)"
          ];
          const usdcContract = new ethers.Contract(targetUSDC, usdcAbi, signer);
          
          // 1. Check Allowance and Approve Unlimited if needed
          const currentAllowance = await usdcContract.allowance(currentAddress, targetRouter);
          if (currentAllowance < parsedAmount) {
            const approveTx = await usdcContract.approve(targetRouter, ethers.MaxUint256);
            await approveTx.wait();
          }`;

code = code.replace(regex, replacement);

const regex2 = /const usdcAbi = \["function approve\(address spender, uint256 amount\) external returns \(bool\)"\];\s*const usdcContract = new ethers\.Contract\(ARB_USDC, usdcAbi, signer\);\s*\/\/\ 1\. Approve USDC\s*const approveTx = await usdcContract\.approve\(HL_BRIDGE_ADDRESS, parsedAmount\);\s*await approveTx\.wait\(\);/;

const replacement2 = `const usdcAbi = [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) view returns (uint256)"
        ];
        const usdcContract = new ethers.Contract(ARB_USDC, usdcAbi, signer);
        
        // 1. Check Allowance and Approve Unlimited if needed
        const currentAllowance = await usdcContract.allowance(currentAddress, HL_BRIDGE_ADDRESS);
        if (currentAllowance < parsedAmount) {
          const approveTx = await usdcContract.approve(HL_BRIDGE_ADDRESS, ethers.MaxUint256);
          await approveTx.wait();
        }`;

code = code.replace(regex2, replacement2);

fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
