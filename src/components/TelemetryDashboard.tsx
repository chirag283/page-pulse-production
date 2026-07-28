import React, { useEffect, useState } from 'react';
import { BarChart3, Activity, Cpu, Database, Server, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { HealthResponse, StatsResponse } from '../types';

export const TelemetryDashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchTelemetry = async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/stats'),
      ]);

      if (hRes.ok) setHealth(await hRes.json());
      if (sRes.ok) setStats(await sRes.json());
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Telemetry fetch error:', err);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>System Telemetry & SLA Metrics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Real-time monitor tracking P50/P95/P99 latency, cache hit ratios, and queue semaphore state.
          </p>
        </div>

        <button
          onClick={fetchTelemetry}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center space-x-2"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Last updated: {lastRefreshed || 'Just now'}</span>
        </button>
      </div>

      {/* Latency Percentiles Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-mono">P50 Latency (Median)</span>
          <div className="text-3xl font-extrabold text-cyan-400 font-mono">
            {stats?.latencyMs.p50 ?? 0} <span className="text-xs text-slate-500">ms</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">50% of requests complete within this window.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-mono">P95 Latency (SLA Threshold)</span>
          <div className="text-3xl font-extrabold text-indigo-400 font-mono">
            {stats?.latencyMs.p95 ?? 0} <span className="text-xs text-slate-500">ms</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Target SLA limit: &lt; 1,500ms.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-mono">P99 Latency (Tail Latency)</span>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {stats?.latencyMs.p99 ?? 0} <span className="text-xs text-slate-500">ms</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Worst 1% tail execution duration.</p>
        </div>
      </div>

      {/* Detailed Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cache Performance Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Redis & Memory Caching Engine</span>
            </h3>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                health?.cache.isRedis
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {health?.cache.isRedis ? 'Redis Active' : 'Memory Fallback'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500">Cache Hits:</span>
              <p className="text-lg font-bold text-emerald-400">{health?.cache.hits ?? 0}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500">Cache Misses:</span>
              <p className="text-lg font-bold text-slate-300">{health?.cache.misses ?? 0}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500">Hit Ratio:</span>
              <p className="text-lg font-bold text-cyan-400">{health?.cache.hitRatio ?? '0.000'}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500">In-Memory Items:</span>
              <p className="text-lg font-bold text-slate-300">{health?.cache.memoryItems ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Concurrency & Queue Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Concurrency Semaphore & Queue</span>
            </h3>
            <span className="text-xs font-mono text-cyan-400">
              Max Workers: {health?.concurrency.maxConcurrency ?? 500}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500">Active Workers:</span>
              <p className="text-lg font-bold text-cyan-400">
                {health?.concurrency.activeWorkers ?? 0}
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500">Queued Requests:</span>
              <p className="text-lg font-bold text-slate-300">
                {health?.concurrency.queuedRequests ?? 0}
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500">Total Audits Handled:</span>
              <p className="text-lg font-bold text-emerald-400">
                {health?.concurrency.totalAuditsProcessed ?? 0}
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500">Avg Queue Wait:</span>
              <p className="text-lg font-bold text-amber-400">
                {health?.concurrency.avgQueueWaitTimeMs ?? 0}ms
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
