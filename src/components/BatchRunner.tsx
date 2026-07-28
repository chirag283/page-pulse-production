import React, { useState } from 'react';
import { Layers, Play, CheckCircle2, XCircle, Clock, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import { AuditResultData } from '../types';

export const BatchRunner: React.FC = () => {
  const defaultUrls = [
    'https://example.com',
    'https://digitalheroesco.com',
    'https://github.com',
    'https://wikipedia.org',
    'https://news.ycombinator.com',
    'http://127.0.0.1:8080', // SSRF trigger
  ];

  const [rawText, setRawText] = useState(defaultUrls.join('\n'));
  const [loading, setLoading] = useState(false);
  const [forceFresh, setForceFresh] = useState(true);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [batchDurationMs, setBatchDurationMs] = useState<number | null>(null);

  const runBatch = async () => {
    const urls = rawText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)
      .slice(0, 10);

    if (urls.length === 0) return;

    setLoading(true);
    setBatchResults([]);
    const startTime = performance.now();

    try {
      const res = await fetch('/api/audit/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          forceFresh,
          timeoutMs: 5000,
        }),
      });

      const json = await res.json();
      if (json.success && json.results) {
        setBatchResults(json.results);
      }
    } catch (err: any) {
      console.error('Batch execution failed:', err);
    } finally {
      setBatchDurationMs(Math.round(performance.now() - startTime));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Batch Concurrency Stress Tester</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute up to 10 URL audits concurrently. Tests semaphore queue management and parallelism.
            </p>
          </div>

          <label className="flex items-center space-x-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={forceFresh}
              onChange={(e) => setForceFresh(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-cyan-500"
            />
            <span>Bypass Redis Caching</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
            URLs to Audit (One URL per line, max 10):
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          onClick={runBatch}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Processing Parallel Queue...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Execute Parallel Batch</span>
            </>
          )}
        </button>
      </div>

      {batchDurationMs !== null && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold uppercase">
              Batch Execution Results ({batchResults.length} Targets)
            </span>
            <span className="text-cyan-400 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Total Duration: {batchDurationMs}ms</span>
            </span>
          </div>

          <div className="space-y-2.5">
            {batchResults.map((item, idx) => {
              const success = item.success;
              const data: AuditResultData = item.data;

              return (
                <div
                  key={idx}
                  className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs"
                >
                  <div className="flex items-center space-x-3 truncate max-w-lg">
                    {success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="text-slate-200 truncate">{item.url}</span>
                  </div>

                  <div className="flex items-center space-x-4">
                    {success && data ? (
                      <>
                        <span className="text-slate-400">
                          {data.durationMs}ms
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                          {data.scores.overall}/100 Score
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          Grade {data.security.grade}
                        </span>
                      </>
                    ) : (
                      <span className="text-rose-400 text-[11px]">
                        [{item.error?.code || 'BLOCKED'}] {item.error?.message}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
