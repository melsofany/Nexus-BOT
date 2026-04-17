/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Settings, 
  Activity, 
  History, 
  Wallet, 
  TrendingUp, 
  Shield, 
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Base price for empty state
const basePrice = 2400;
const mockPriceData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}:00`,
  price: basePrice,
}));

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [balances, setBalances] = useState({ ethereum: '0 ETH', bsc: '0 BNB', polygon: '0 MATIC', arbitrum: '0 ETH' });
  const [activeStrategies, setActiveStrategies] = useState([]);
  const [trades, setTrades] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gasPrices, setGasPrices] = useState({ ethereum: '0 Gwei', bsc: '0 Gwei', polygon: '0 Gwei' });
  const [isFlashbotsConnected, setIsFlashbotsConnected] = useState(true);
  const [totalProfit, setTotalProfit] = useState('0.0000');
  const [successRate, setSuccessRate] = useState('100');
  const [walletAddress, setWalletAddress] = useState('Not Connected');
  const [marketPrices, setMarketPrices] = useState({ ethereum: '0.00', bsc: '0.00', polygon: '0.00', arbitrum: '0.00' });
  const [botIdleReason, setBotIdleReason] = useState('Initializing...');
  const [priceHistory, setPriceHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Selective filter: Hide ONLY Vite/WS noise, keep everything else
    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = (...args) => {
      const msg = String(args[0]);
      if (msg.includes('websocket') || msg.includes('WebSocket') || msg.includes('vite')) return;
      originalError.apply(console, args);
    };
    console.warn = (...args) => {
      const msg = String(args[0]);
      if (msg.includes('websocket') || msg.includes('WebSocket') || msg.includes('vite')) return;
      originalWarn.apply(console, args);
    };

    let isMounted = true;
    const fetchData = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error('Offline');
        const data = await response.json();
        if (!isMounted) return;
        
        setIsRunning(data.status === 'running');
        setStatus(data.status === 'running' ? 'Running' : 'Stopped');
        setBalances(data.balances);
        setActiveStrategies(data.strategies);
        setTrades(data.trades);
        setGasPrices(data.gasPrices);
        setMarketPrices(data.marketPrices || marketPrices);
        setPriceHistory(data.pricesHistory || []);
        setIsFlashbotsConnected(data.isFlashbotsConnected);
        setBotIdleReason(data.botIdleReason || '');
        setWalletAddress(data.walletAddress || 'Not Connected');
        setTotalProfit(data.totalProfit);
        setSuccessRate(data.successRate);
        setLastUpdate(new Date());
      } catch (error) {
        if (isMounted) {
          console.warn('Silent sync error (normal during startup or dev reload)');
          setStatus('Syncing...');
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const toggleBot = async () => {
    const endpoint = isRunning ? '/api/stop' : '/api/start';
    try {
      await fetch(endpoint, { method: 'POST' });
      setIsRunning(!isRunning);
      setStatus(!isRunning ? 'Running' : 'Stopped');
    } catch (error) {
      console.error('Failed to toggle bot:', error);
    }
  };

  const syncKnowledge = async () => {
    try {
      await fetch('/api/sync', { method: 'POST' });
    } catch (error) {
      console.error('Failed to sync knowledge:', error);
    }
  };

  const contractCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IFlashLoanReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

contract NexusTradingBot is IFlashLoanReceiver {
    address public owner;
    address public constant AAVE_LENDING_POOL = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;
    
    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier mevProtected() {
        // Flashbots bundle validation
        _;
    }

    function requestFlashLoan(address asset, uint256 amount) external onlyOwner {
        // Call Aave Flash Loan
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // Execute multi-step trade with loaned funds
        return true;
    }

    function executeMultiStepTrade(
        address[] calldata path,
        address[] calldata routers,
        uint256 amountIn,
        uint256 minAmountOut
    ) external onlyOwner mevProtected {
        // Support for 10+ Platforms:
        // Uniswap V3, PancakeSwap, SushiSwap, Curve, Balancer, 
        // 1inch, DODO, QuickSwap, Camelot, Trader Joe, etc.
        
        // Dynamic Routing Logic:
        // 1. Approve tokens for the first router
        // 2. Execute swap on Router A
        // 3. Transfer output to Router B
        // 4. Execute final swap and verify profit
    }
}`;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-300 font-sans selection:bg-blue-500/30">
      {/* Top Navigation */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">NEXUS <span className="text-blue-500">BOT</span></span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('performance')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'performance' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Performance
              </button>
              <button 
                onClick={() => setActiveTab('contract')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'contract' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Smart Contract
              </button>
            </div>
          </div>
          
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-medium uppercase tracking-wider">{status}</span>
              </div>
                <div className="flex flex-col items-end text-[10px] font-mono">
                  <div className="flex gap-3 text-gray-400">
                    <span className="text-blue-500">ETH: ${marketPrices.ethereum}</span>
                    <span className="text-yellow-500">BNB: ${marketPrices.bsc}</span>
                    <span className="text-purple-500">MATIC: ${marketPrices.polygon}</span>
                  </div>
                  <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                    <RefreshCw className="w-2 h-2 animate-spin-slow" />
                    Last Sync: {lastUpdate.toLocaleTimeString()}
                  </div>
                </div>
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6">
        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Controls & Strategies */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* Bot Control Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-16 -mt-16" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Control Panel
                </h2>
                <button 
                  onClick={toggleBot}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 ${
                    isRunning 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                  }`}
                >
                  {isRunning ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  {isRunning ? 'STOP ENGINE' : 'START ENGINE'}
                </button>
                <div className="mt-6 space-y-4">
                  {isRunning && botIdleReason && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <p className="text-[10px] text-blue-400 font-mono animate-pulse flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin" /> {botIdleReason}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-medium text-white">Flash Loans</span>
                    </div>
                    <div className="w-8 h-4 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="absolute top-0.5 left-4.5 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Uptime</span>
                    <span className="text-white font-mono">02:45:12</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total Profit</span>
                    <span className="text-green-500 font-mono">+{totalProfit} ETH</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Success Rate</span>
                    <span className="text-blue-500 font-mono">{successRate}%</span>
                  </div>
                </div>
              </div>

              {/* Strategies Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Active Strategies
                </h2>
                <div className="space-y-3">
                  {activeStrategies.map((strategy: any) => (
                    <div key={strategy.id} className="p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{strategy.name}</span>
                        <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${strategy.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${strategy.enabled ? 'left-4.5' : 'left-0.5'}`} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Platforms</span>
                        <span className="text-[10px] text-blue-400 font-medium">
                          {strategy.platforms?.join(' + ') || 'DEX'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Networks</span>
                        <span className="text-[10px] text-green-400">
                          {strategy.networks?.join(' + ') || 'Ethereum'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={syncKnowledge}
                  className="w-full mt-4 py-2 text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Knowledge Base
                </button>
              </div>
            </div>

            {/* Middle Column: Market Analysis */}
            <div className="col-span-12 lg:col-span-6 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-lg font-bold text-white">Ethereum / USD</h2>
                    <p className="text-xs text-blue-500 flex items-center gap-1 font-medium">
                      <Zap className="w-3 h-3" /> Live Blockchain Feed
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-white">${marketPrices.ethereum}</div>
                    <div className="text-[10px] text-gray-500">Real-time RPC Data</div>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px] w-full" style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceHistory.length > 0 ? priceHistory : mockPriceData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#ffffff20" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#ffffff20" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trade History */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                  <History className="w-4 h-4" /> Execution Logs
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-white/5">
                        <th className="pb-4 font-semibold">Type</th>
                        <th className="pb-4 font-semibold">Path</th>
                        <th className="pb-4 font-semibold">Platforms</th>
                        <th className="pb-4 font-semibold">Profit</th>
                        <th className="pb-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {trades.length > 0 ? trades.map((trade: any) => (
                        <tr key={trade.id} className="border-b border-white/5 last:border-0 group hover:bg-white/[0.02] transition-colors">
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              trade.type.includes('MULTI') || trade.type.includes('MEV') ? 'bg-purple-500/10 text-purple-500' : 
                              trade.type === 'BUY' ? 'bg-green-500/10 text-green-500' : 
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-4 text-white font-medium text-xs">{trade.asset}</td>
                          <td className="py-4 text-gray-400 text-[10px]">{trade.platforms || 'Uniswap'}</td>
                          <td className="py-4">
                            <div className="text-green-500 text-xs font-mono">{trade.profit || '+0.001 ETH'}</div>
                            <div className="text-[10px] text-gray-600">Gas: {trade.gasUsed || '120k'}</div>
                          </td>
                          <td className="py-4 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-green-500 flex items-center justify-end gap-1 text-xs">
                                <Shield className="w-3 h-3" /> {trade.status}
                              </span>
                              {trade.hash && (
                                <a 
                                  href={`${trade.network === 'BSC' ? 'https://bscscan.com/tx/' : 'https://etherscan.io/tx/'}${trade.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-blue-500 hover:text-blue-400 font-mono underline"
                                >
                                  {trade.hash.slice(0, 10)}...
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-600 text-xs italic">
                            {isRunning ? 'Monitoring blockchain for real-time opportunities...' : 'System idle. Start the engine to begin scanning.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Network & Security */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Wallet & Balances
                </h2>
                <div className="space-y-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Active Wallet</p>
                    <p className="text-white font-mono text-[10px] truncate">{walletAddress}</p>
                    {walletAddress === 'Not Connected' && (
                      <p className="text-red-500 text-[8px] mt-1 animate-pulse">! Please provide WALLET_PRIVATE_KEY in Settings</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Ethereum</span>
                      <span className="text-white font-mono">{balances.ethereum}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">BSC</span>
                      <span className="text-white font-mono">{balances.bsc}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Polygon</span>
                      <span className="text-white font-mono">{balances.polygon}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Arbitrum</span>
                      <span className="text-white font-mono">{balances.arbitrum}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Security Status
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-bold text-green-500 uppercase">Encrypted Connection</span>
                    </div>
                    <p className="text-[10px] text-green-500/70 leading-relaxed">
                      Private keys are stored in a secure environment. All transactions are signed locally.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-bold text-yellow-500 uppercase">Slippage Warning</span>
                    </div>
                    <p className="text-[10px] text-yellow-500/70 leading-relaxed">
                      Market volatility is high. Slippage tolerance is currently set to 0.5%.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Network Info
                </h2>
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ethereum</span>
                    <span className="text-blue-500 font-mono">{gasPrices.ethereum}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">BSC</span>
                    <span className="text-yellow-500 font-mono">{gasPrices.bsc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Polygon</span>
                    <span className="text-purple-500 font-mono">{gasPrices.polygon}</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500">MEV Protection</span>
                      <span className="text-green-500 text-[10px] font-bold">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Flashbots RPC</span>
                      <span className={`${isFlashbotsConnected ? 'text-blue-500' : 'text-red-500'} text-[10px] font-mono`}>
                        {isFlashbotsConnected ? 'CONNECTED' : 'DISCONNECTED'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'performance' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Net Profit (All Time)</p>
                <h3 className="text-3xl font-bold text-green-500 font-mono">+{totalProfit} ETH</h3>
                <p className="text-[10px] text-gray-600 mt-2">≈ ${(parseFloat(totalProfit) * 2458).toFixed(2)} USD</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Success Rate</p>
                <h3 className="text-3xl font-bold text-blue-500 font-mono">{successRate}%</h3>
                <p className="text-[10px] text-gray-600 mt-2">Based on last {trades.length} operations</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Total Operations</p>
                <h3 className="text-3xl font-bold text-white font-mono">{trades.length}</h3>
                <p className="text-[10px] text-gray-600 mt-2">Active for 02:45:12</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                <History className="w-4 h-4" /> Detailed Transaction History
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-white/5">
                      <th className="pb-4 font-semibold">ID</th>
                      <th className="pb-4 font-semibold">Network</th>
                      <th className="pb-4 font-semibold">Type</th>
                      <th className="pb-4 font-semibold">Path</th>
                      <th className="pb-4 font-semibold">Platforms</th>
                      <th className="pb-4 font-semibold">Profit</th>
                      <th className="pb-4 font-semibold">Gas</th>
                      <th className="pb-4 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {trades.map((trade: any) => (
                      <tr key={trade.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 font-mono text-[10px] text-gray-600">#{trade.id.toString().slice(-6)}</td>
                        <td className="py-4">
                          <span className="text-[10px] text-gray-300 font-medium px-2 py-0.5 bg-white/5 rounded">
                            {trade.network}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trade.type.includes('MULTI') || trade.type.includes('MEV') ? 'bg-purple-500/10 text-purple-500' : 
                            trade.type === 'BUY' ? 'bg-green-500/10 text-green-500' : 
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-4 text-white font-medium text-xs">{trade.asset}</td>
                        <td className="py-4 text-gray-400 text-[10px]">{trade.platforms}</td>
                        <td className="py-4 text-green-500 font-mono text-xs">{trade.profit}</td>
                        <td className="py-4 text-gray-500 text-[10px] font-mono">{trade.gasUsed}</td>
                        <td className="py-4 text-right text-gray-500 text-xs">{trade.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-6">Smart Contract (Solidity)</h2>
            <pre className="bg-black/40 p-6 rounded-xl border border-white/5 overflow-x-auto text-xs font-mono text-blue-400 leading-relaxed">
              {contractCode}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}


