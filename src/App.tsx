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
  RefreshCw,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [balances, setBalances] = useState({ ethereum: '0 ETH', bsc: '0 BNB' });
  const [trades, setTrades] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gasPrices, setGasPrices] = useState({ ethereum: '0 Gwei', bsc: '0 Gwei' });
  const [walletAddress, setWalletAddress] = useState('Not Connected');
  const [marketPrices, setMarketPrices] = useState({ ethereum: '0.00', bsc: '0.00' });
  const [botIdleReason, setBotIdleReason] = useState('Initializing...');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Suppress noise logs
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
        setTrades(data.trades);
        setGasPrices(data.gasPrices);
        setMarketPrices(data.marketPrices);
        setBotIdleReason(data.botIdleReason || '');
        setWalletAddress(data.walletAddress || 'Not Connected');
        setLastUpdate(new Date());
      } catch (error) {
        if (isMounted) {
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

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-300 font-sans selection:bg-blue-500/30">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">NEXUS <span className="text-blue-500">BOT</span></span>
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
              </div>
              <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                <RefreshCw className="w-2 h-2 animate-spin-slow" />
                Last Sync: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3 space-y-6">
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
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700'
                }`}
              >
                {isRunning ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isRunning ? 'Stop Execution' : 'Start Sniper'}
              </button>
              
              <div className="mt-6 p-4 bg-black/40 rounded-xl border border-white/5">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Engine Status</div>
                <div className="text-xs text-blue-400 font-mono flex items-center gap-2">
                  <Zap className="w-3 h-3 animate-pulse" />
                  {botIdleReason}
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Wallets & Gas
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-400">Ethereum Mainnet</span>
                    <span className="text-[10px] text-blue-400 font-mono">{gasPrices.ethereum}</span>
                  </div>
                  <div className="text-lg font-bold text-white">{balances.ethereum}</div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-400">Binance Smart Chain</span>
                    <span className="text-[10px] text-yellow-400 font-mono">{gasPrices.bsc}</span>
                  </div>
                  <div className="text-lg font-bold text-white">{balances.bsc}</div>
                </div>
                <div className="pt-2">
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Active Address</div>
                  <div className="text-[10px] text-gray-400 font-mono break-all bg-black/40 p-2 rounded border border-white/5">
                    {walletAddress}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <History className="w-4 h-4" /> Live Market Scanner & Trades
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Time</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Network</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Asset</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Route</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Profit (Est)</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence initial={false}>
                      {trades.map((trade) => (
                        <motion.tr 
                          key={trade.id}
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4 text-xs font-mono text-gray-500">{trade.time}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${trade.network === 'BSC' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                              {trade.network}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-white">{trade.asset}</td>
                          <td className="px-6 py-4 text-[10px] font-mono text-gray-400">{trade.platforms}</td>
                          <td className="px-6 py-4 text-xs font-bold text-green-400">{trade.profit}</td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-blue-400">
                              <RefreshCw className="w-3 h-3 animate-spin-slow" />
                              {trade.status}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {trades.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic text-sm">
                          No active trades or scan results yet. Start the sniper to begin hunting.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
