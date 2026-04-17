import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";
import axios from "axios";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const ROUTER_ABI = [
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function WETH() external pure returns (address)"
  ];

  // Extended DEX Routers for BSC
  const DEX_ROUTERS_BSC = {
    'PancakeSwap': "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    'SushiSwap': "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    'BiSwap': "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
    'ApeSwap': "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",
    'BabySwap': "0x325E343f1dE3559aa234472611737ed34484434a",
    'KnightSwap': "0x05E640ccCD0f5164E0341763F793f77df2307E3F",
    'Thena': "0x3D7f7A2F082531e0f0B55da5453fA7D0D7186176"
  };

  // Extended DEX Routers for ETH
  const DEX_ROUTERS_ETH = {
    'UniswapV2': "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    'SushiSwap': "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    'ShibaSwap': "0x03f772418051dc44851f1196783a94830de3ddb7",
    'KyberSwap': "0x818E0F5E51f9791756474095651379126d98636a"
  };

  const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
  const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  
  // High Liquidity & Volatility Tokens for BSC
  const TOKENS_BSC = [
    { name: 'USDT', address: "0x55d398326f99059fF775485246999027B3197955" },
    { name: 'CAKE', address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82" },
    { name: 'BTCB', address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c" },
    { name: 'ETH', address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8" },
    { name: 'FLOKI', address: "0xfb06a0dfc83664d4d3def429bbbe249ed1362f6b" },
    { name: 'PEPE', address: "0x25d8039b039cc804245ce600e0fe361f364741cc" },
    { name: 'DOGE', address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43" },
    { name: 'BIFI', address: "0x7160570BB1531289130D7bd4b735941da6931AC0" }
  ];

  // High Liquidity & Volatility Tokens for ETH
  const TOKENS_ETH = [
    { name: 'USDT', address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
    { name: 'USDC', address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { name: 'DAI', address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
    { name: 'WBTC', address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
    { name: 'SHIB', address: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce" },
    { name: 'LINK', address: "0x514910771af9ca656af840dff83e8264ecf986ca" }
  ];

  let botStatus = "stopped";
  let walletAddress = "Not Connected";
  let balances = { ethereum: "0.00 ETH", bsc: "0.00 BNB" };
  let trades = [];
  let gasPrices = { ethereum: "Loading...", bsc: "Loading..." };
  let marketPrices = { ethereum: "0.00", bsc: "0.00" };
  let botIdleReason = "Initializing...";

  const networks = {
    bsc: { name: 'BSC', chainId: 56, rpc: process.env.RPC_URL_BSC || "https://binance.llamarpc.com" },
    ethereum: { name: 'Ethereum', chainId: 1, rpc: process.env.RPC_URL_ETH || "https://eth.llamarpc.com" }
  };

  const providers = {
    bsc: new ethers.JsonRpcProvider(networks.bsc.rpc),
    ethereum: new ethers.JsonRpcProvider(networks.ethereum.rpc)
  };

  const privateKey = process.env.WALLET_PRIVATE_KEY;
  let wallet = null;
  if (privateKey) {
    try {
      wallet = new ethers.Wallet(privateKey);
      walletAddress = wallet.address;
    } catch (e) {
      console.error("Invalid WALLET_PRIVATE_KEY");
    }
  }

  async function fetchMarketPrices() {
    try {
      const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin&vs_currencies=usd");
      if (response.data) {
        if (response.data.ethereum?.usd) marketPrices.ethereum = response.data.ethereum.usd.toFixed(2);
        if (response.data.binancecoin?.usd) marketPrices.bsc = response.data.binancecoin.usd.toFixed(2);
      }
    } catch (error) {}
  }

  async function updateBalancesAndGas() {
    for (const [key, provider] of Object.entries(providers)) {
      try {
        const feeData = await provider.getFeeData();
        if (feeData.gasPrice) gasPrices[key] = `${parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')).toFixed(1)} Gwei`;
        if (walletAddress !== "Not Connected") {
          const balanceWei = await provider.getBalance(walletAddress);
          const symbol = key === 'bsc' ? 'BNB' : 'ETH';
          balances[key] = `${parseFloat(ethers.formatUnits(balanceWei, 'ether')).toFixed(4)} ${symbol}`;
        }
      } catch (e) {}
    }
  }

  async function scanNetwork(networkKey: 'bsc' | 'ethereum') {
    if (botStatus !== "running" || !wallet) return;
    const provider = providers[networkKey];
    const routers = networkKey === 'bsc' ? DEX_ROUTERS_BSC : DEX_ROUTERS_ETH;
    const tokens = networkKey === 'bsc' ? TOKENS_BSC : TOKENS_ETH;
    const nativeWrapped = networkKey === 'bsc' ? WBNB : WETH;
    const nativeSymbol = networkKey === 'bsc' ? 'BNB' : 'ETH';
    const balanceStr = balances[networkKey].split(' ')[0];
    const balance = parseFloat(balanceStr);

    // Dynamic Thresholds
    const minBalance = networkKey === 'bsc' ? 0.005 : 0.02; // Lowered for more aggressive scanning
    if (balance < minBalance) {
      botIdleReason = `Waiting for Funds on ${networkKey.toUpperCase()} (Min ${minBalance} ${nativeSymbol})`;
      return;
    }

    botIdleReason = `Aggressive Scan on ${networkKey.toUpperCase()} (${tokens.length} assets)...`;
    
    // Multiple trade sizes for better spread discovery
    const tradeSizes = [0.1, 0.5, 1.0].map(p => balance * p * 0.9);

    for (const tradeAmount of tradeSizes) {
      if (tradeAmount <= 0) continue;
      const amountIn = ethers.parseEther(tradeAmount.toFixed(6));

      for (const token of tokens) {
        try {
          const quotes = await Promise.all(Object.entries(routers).map(async ([name, address]) => {
            try {
              const router = new ethers.Contract(address, ROUTER_ABI, provider);
              const amounts = await router.getAmountsOut(amountIn, [nativeWrapped, token.address]);
              return { name, address, output: amounts[1] };
            } catch (e) { return null; }
          }));

          const validQuotes = quotes.filter(q => q !== null).sort((a, b) => b.output > a.output ? 1 : -1);
          if (validQuotes.length < 2) continue;

          const bestBuy = validQuotes[0];
          
          // Cross-check all other routers for best exit
          const exitQuotes = await Promise.all(validQuotes.map(async (q) => {
            if (q.name === bestBuy.name) return null;
            try {
              const router = new ethers.Contract(q.address, ROUTER_ABI, provider);
              const amounts = await router.getAmountsOut(bestBuy.output, [token.address, nativeWrapped]);
              return { name: q.name, address: q.address, back: amounts[1] };
            } catch (e) { return null; }
          }));

          const bestSell = exitQuotes.filter(q => q !== null).sort((a, b) => b.back > a.back ? 1 : -1)[0];
          if (!bestSell) continue;

          const grossProfit = bestSell.back - amountIn;
          const feeData = await provider.getFeeData();
          const gasLimit = 300000n; // Safer limit for multi-hop
          const gasCost = feeData.gasPrice * gasLimit;
          const netProfit = grossProfit - gasCost;

          // Logging logic: Show even small spreads to give user feedback
          const spreadPercent = (Number(grossProfit) / Number(amountIn)) * 100;
          
          if (spreadPercent > 0.1) { // Log any spread > 0.1% for transparency
            const isActuallyProfitable = netProfit > 0n;
            trades.unshift({
              id: Date.now(),
              type: "SCAN",
              asset: token.name,
              platforms: `${bestBuy.name}➔${bestSell.name}`,
              profit: `${isActuallyProfitable ? '+' : ''}${ethers.formatUnits(netProfit, 18).slice(0, 8)} ${nativeSymbol}`,
              status: isActuallyProfitable ? "PROFITABLE!" : "Low Spread (Gas > Profit)",
              network: networkKey.toUpperCase(),
              time: new Date().toLocaleTimeString(),
              spread: `${spreadPercent.toFixed(2)}%`
            });
            if (trades.length > 50) trades.pop();
          }
        } catch (e) {}
      }
    }
  }

  async function botLoop() {
    await fetchMarketPrices();
    await updateBalancesAndGas();
    setInterval(fetchMarketPrices, 30000);
    setInterval(updateBalancesAndGas, 15000);
    while (true) {
      if (botStatus === "running") {
        await scanNetwork('bsc');
        await scanNetwork('ethereum');
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Faster loop
    }
  }
  botLoop();

  app.get("/api/status", (req, res) => {
    res.json({ status: botStatus, walletAddress, balances, trades: trades.slice(0, 30), gasPrices, marketPrices, botIdleReason });
  });
  app.post("/api/start", (req, res) => { botStatus = "running"; res.json({ message: "Bot started" }); });
  app.post("/api/stop", (req, res) => { botStatus = "stopped"; res.json({ message: "Bot stopped" }); });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const serverPort = process.env.PORT || PORT;
  app.listen(serverPort, "0.0.0.0", () => { console.log(`Server running on port ${serverPort}`); });
}
startServer();
