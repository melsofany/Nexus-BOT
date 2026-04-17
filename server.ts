import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";
import axios from "axios";

dotenv.config();

const KNOWLEDGE_BASE_URL = "https://knowledge-base-bot.onrender.com";
const BLOCKCHAIN_API_KEY = process.env.BLOCKCHAIN_API_KEY || "5f4d82e38ed62f36b49a3fbbd1bb051078d6010e53d0ab2ae91ab29b3f08fc98";

interface TradeRecord {
  id: number;
  type: string;
  asset: string;
  platforms: string;
  profit: string;
  status: string;
  time: string;
  hash?: string;
}

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

  const BOT_ABI = [
    "function executeArbitrage(address[] calldata routers, address[][] calldata paths, uint256 initialAmountIn, uint256 minFinalAmountOut) external",
    "function withdraw(address token, uint256 amount) external",
    "function owner() external view returns (address)"
  ];

  const DEX_ROUTERS = {
    'PancakeSwap': "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    'SushiSwap': "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    'BiSwap': "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
    'ApeSwap': "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7"
  };

  const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
  const BOT_CONTRACT_ADDRESS = process.env.BOT_CONTRACT_ADDRESS || "";
  
  const TOKENS_BSC = [
    { name: 'USDT', address: "0x55d398326f99059fF775485246999027B3197955" },
    { name: 'CAKE', address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82" },
    { name: 'BTCB', address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c" },
    { name: 'ETH', address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8" }
  ];

  let botStatus = "stopped";
  let walletAddress = "Not Connected";
  let balances: Record<string, string> = { ethereum: "0.00 ETH", bsc: "0.00 BNB", polygon: "0.00 MATIC", arbitrum: "0.00 ETH" };
  let strategies: any[] = [];
  let trades: TradeRecord[] = [];
  let gasPrices: Record<string, string> = { ethereum: "Loading...", bsc: "Loading...", polygon: "Loading...", arbitrum: "Loading..." };
  let marketPrices: Record<string, string> = { ethereum: "0.00", bsc: "0.00", polygon: "0.00", arbitrum: "0.00" };
  let totalProfit = 0;
  let successCount = 0;
  let totalCount = 0;
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
  let wallet: ethers.Wallet | null = null;
  if (privateKey) {
    try {
      wallet = new ethers.Wallet(privateKey);
      walletAddress = wallet.address;
    } catch (e) { console.error("Invalid WALLET_PRIVATE_KEY"); }
  }

  async function syncKnowledge() {
    try {
      const response = await axios.get(`${KNOWLEDGE_BASE_URL}/api/project`, {
        headers: { 'Authorization': `Bearer ${BLOCKCHAIN_API_KEY}` }
      }).catch(() => null);
      strategies = response?.data?.strategies || [
        { id: 1, name: 'Real-Time Arbitrage', enabled: true, networks: ['BSC'] }
      ];
    } catch (error) {}
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

  async function botLoop() {
    console.log("🚀 NEXUS ENGINE: Starting Real Mode...");
    await syncKnowledge();
    await fetchMarketPrices();

    setInterval(async () => {
      await fetchMarketPrices();
      for (const [key, provider] of Object.entries(providers)) {
        try {
          const feeData = await provider.getFeeData();
          if (feeData.gasPrice) gasPrices[key] = `${parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')).toFixed(1)} Gwei`;
          if (walletAddress !== "Not Connected") {
            const balanceWei = await provider.getBalance(walletAddress);
            const symbol = key === 'bsc' ? 'BNB' : (key === 'polygon' ? 'MATIC' : 'ETH');
            balances[key] = `${parseFloat(ethers.formatUnits(balanceWei, 'ether')).toFixed(4)} ${symbol}`;
          }
        } catch (e) {}
      }
    }, 15000);

    while (true) {
      if (botStatus === "running" && wallet) {
        try { await scanForOpportunities(); } catch (e) { console.error("Scan error:", e.message); }
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  async function scanForOpportunities() {
    if (!BOT_CONTRACT_ADDRESS) {
      botIdleReason = "Error: BOT_CONTRACT_ADDRESS not set in .env";
      return;
    }

    let bscBalanceStr = balances.bsc || "0";
    let bscBalance = parseFloat(bscBalanceStr.split(' ')[0]);
    if (bscBalance < 0.05) {
      botIdleReason = "Waiting for Real Funds (Min 0.05 BNB required for gas & trade)";
      return;
    }
    botIdleReason = "Scanning Real Market Spreads...";

    const tradeAmountBNB = 0.02; 
    const amountIn = ethers.parseEther(tradeAmountBNB.toString());
    const activeProvider = providers.bsc;

    for (const targetToken of TOKENS_BSC) {
      try {
        const quotes = await Promise.all(
          Object.entries(DEX_ROUTERS).map(async ([name, address]) => {
            try {
              const router = new ethers.Contract(address, ROUTER_ABI, activeProvider);
              const amounts = await router.getAmountsOut(amountIn, [WBNB, targetToken.address]);
              return { name, address, output: BigInt(amounts[1]) };
            } catch (e) { return null; }
          })
        );

        const validQuotes = quotes.filter((q): q is { name: string, address: string, output: bigint } => q !== null);
        if (validQuotes.length < 2) continue;

        validQuotes.sort((a, b) => b.output > a.output ? 1 : -1);
        const bestBuy = validQuotes[0];

        const exitQuotes = await Promise.all(
          validQuotes.map(async (q) => {
            if (q.name === bestBuy.name) return null;
            try {
              const router = new ethers.Contract(q.address, ROUTER_ABI, activeProvider);
              const amounts = await router.getAmountsOut(bestBuy.output, [targetToken.address, WBNB]);
              return { name: q.name, address: q.address, bnbBack: BigInt(amounts[1]) };
            } catch (e) { return null; }
          })
        );

        const bestSell = exitQuotes.filter((q): q is { name: string, address: string, bnbBack: bigint } => q !== null).sort((a, b) => b.bnbBack > a.bnbBack ? 1 : -1)[0];
        if (!bestSell) continue;

        const feeData = await activeProvider.getFeeData();
        const gasLimit = 300000n;
        const gasPrice = feeData.gasPrice || 5000000000n; // Fallback to 5 gwei
        const gasCost = gasPrice * gasLimit;
        
        // BIGINT Calculation to avoid error
        const netProfitBNB = bestSell.bnbBack - amountIn - gasCost;

        if (netProfitBNB > 0n) {
          const profitBNBStr = ethers.formatUnits(netProfitBNB, 18);
          console.log(`💰 PROFIT FOUND: ${targetToken.name} | Net: ${profitBNBStr} BNB`);
          
          const trade: TradeRecord = {
            id: Date.now(),
            type: "REAL ARBITRAGE",
            asset: targetToken.name,
            platforms: `${bestBuy.name}➔${bestSell.name}`,
            profit: `+${profitBNBStr} BNB`,
            status: "Executing...",
            time: new Date().toLocaleTimeString()
          };
          trades.unshift(trade);

          if (wallet) {
            const signer = wallet.connect(activeProvider);
            const botContract = new ethers.Contract(BOT_CONTRACT_ADDRESS, BOT_ABI, signer);
            
            try {
              const tx = await botContract.executeArbitrage(
                [bestBuy.address, bestSell.address],
                [[WBNB, targetToken.address], [targetToken.address, WBNB]],
                amountIn,
                amountIn + (netProfitBNB / 2n), 
                { gasLimit, gasPrice }
              );
              trade.status = "Success";
              trade.hash = tx.hash;
              successCount++;
            } catch (err: any) {
              trade.status = "Failed (On-chain)";
              console.error("Execution failed:", err.message);
            }
          }
          totalCount++;
        }
      } catch (err) {}
    }
  }

  botLoop();

  app.get("/api/status", (req, res) => {
    res.json({ 
      status: botStatus, 
      walletAddress,
      balances,
      strategies,
      trades: trades.slice(0, 20),
      gasPrices,
      marketPrices,
      botIdleReason,
      totalProfit: totalProfit.toFixed(4),
      successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : "100"
    });
  });

  app.post("/api/start", (req, res) => { botStatus = "running"; res.json({ message: "Started" }); });
  app.post("/api/stop", (req, res) => { botStatus = "stopped"; res.json({ message: "Stopped" }); });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
