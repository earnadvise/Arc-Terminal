fetch("https://api.dexscreener.com/latest/dex/search?q=LITER").then(r=>r.json()).then(d => {
   if (d.pairs) {
      console.log(d.pairs[0].chainId, d.pairs[0].pairAddress);
   }
})
