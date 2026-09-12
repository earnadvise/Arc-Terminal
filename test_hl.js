const url = "https://api.hyperliquid.xyz/info";
const payload = {
    type: "candleSnapshot",
    req: {
        coin: "HYPE",
        interval: "1h",
        startTime: Date.now() - (7 * 24 * 60 * 60 * 1000),
        endTime: Date.now()
    }
};

fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log(data.slice(0, 2)))
.catch(err => console.error(err));
