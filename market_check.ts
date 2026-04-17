import { ethers } from "ethers";

const RPC_URL = "https://bsc-dataseed.binance.org/";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

const DEX_ROUTERS = {
  'PancakeSwap': "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  'SushiSwap': "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  'BiSwap': "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
  'ApeSwap': "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7"
};

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

const TOKENS = [
  { name: 'USDT', address: "0x55d398326f99059fF775485246999027B3197955" },
  { name: 'CAKE', address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82" },
  { name: 'BTCB', address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c" },
  { name: 'ETH', address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8" },
  { name: 'FLOKI', address: "0xfb06a0dfc83664d4d3def429bbbe249ed1362f6b" },
  { name: 'PEPE', address: "0x25d8039b039cc804245ce600e0fe361f364741cc" },
  { name: 'BABYDOGE', address: "0xc748673057861a797275CD8A068AbB95A902e8de" },
  { name: 'DOGE', address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43" }
];

async function checkMarket() {
  console.log("--- Real-Time Market Arbitrage Check (BSC) ---");
  const amountIn = ethers.parseEther("1"); // Check with 1 BNB for clearer spread

  for (const token of TOKENS) {
    console.log(`\nChecking Token: ${token.name}`);
    const quotes = [];

    for (const [name, address] of Object.entries(DEX_ROUTERS)) {
      try {
        const router = new ethers.Contract(address, ROUTER_ABI, provider);
        const amounts = await router.getAmountsOut(amountIn, [WBNB, token.address]);
        quotes.push({ name, output: amounts[1] });
      } catch (e) {
        // console.log(`Failed to get quote from ${name}`);
      }
    }

    if (quotes.length < 2) continue;

    // Sort to find best buy and best sell
    quotes.sort((a, b) => b.output > a.output ? 1 : -1);
    const bestBuy = quotes[0]; // Most tokens for 1 BNB

    const exitQuotes = [];
    for (const q of quotes) {
      if (q.name === bestBuy.name) continue;
      try {
        const router = new ethers.Contract(DEX_ROUTERS[q.name as keyof typeof DEX_ROUTERS], ROUTER_ABI, provider);
        const amounts = await router.getAmountsOut(bestBuy.output, [token.address, WBNB]);
        exitQuotes.push({ name: q.name, bnbBack: amounts[1] });
      } catch (e) {}
    }

    if (exitQuotes.length === 0) continue;

    exitQuotes.sort((a, b) => b.bnbBack > a.bnbBack ? 1 : -1);
    const bestSell = exitQuotes[0];

    const profit = bestSell.bnbBack - amountIn;
    const profitPercentage = (Number(profit) / Number(amountIn)) * 100;

    console.log(`Best Path: ${bestBuy.name} -> ${bestSell.name}`);
    console.log(`Gross Profit: ${ethers.formatUnits(profit, 18)} BNB (${profitPercentage.toFixed(4)}%)`);
  }
}

checkMarket();
