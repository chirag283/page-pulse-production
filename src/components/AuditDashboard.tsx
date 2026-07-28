import React, { useState } from 'react';
import {
  Search,
  Shield,
  Zap,
  Globe,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Database,
  Lock,
  LockOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AuditResultData, ApiResponse } from '../types';

export const AuditDashboard: React.FC = () => {
  const [urlInput, setUrlInput] = useState('https://example.com');
  const [forceFresh, setForceFresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResultData | null>(null);
  const [cachedStatus, setCachedStatus] = useState<boolean | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<{ code?: string; message: string; details?: any } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'security' | 'seo' | 'performance' | 'json'>('security');
  const [copied, setCopied] = useState(false);

  const handleAudit = async (targetUrl?: string) => {
    const urlToUse = targetUrl || urlInput;
    if (!urlToUse.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setCopied(false);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlToUse.trim(),
          forceFresh,
          timeoutMs: 5000,
        }),
      });

      const json: ApiResponse<AuditResultData> = await res.json();

      if (json.success && json.data) {
        setAuditResult(json.data);
        setCachedStatus(Boolean(json.cached));
        setRequestId(json.requestId);
      } else if (json.error) {
        setErrorMsg(json.error);
        setAuditResult(null);
      }
    } catch (err: any) {
      setErrorMsg({
        code: 'NETWORK_ERROR',
        message: err.message || 'Failed to connect to audit engine backend.',
      });
      setAuditResult(null);
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: 'Example Domain', url: 'https://example.com' },
    { label: 'Digital Heroes', url: 'https://digitalheroesco.com' },
    { label: 'GitHub Portal', url: 'https://github.com' },
    { label: 'Wikipedia', url: 'https://wikipedia.org' },
    { label: 'SSRF Test (Localhost)', url: 'http://127.0.0.1:8080' },
    { label: 'SSRF Test (Metadata)', url: 'http://169.254.169.254' },
  ];

  const copyJson = () => {
    if (!auditResult) return;
    navigator.clipboard.writeText(JSON.stringify(auditResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 65) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getGradeBg = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-500 text-slate-950';
      case 'B':
        return 'bg-cyan-500 text-slate-950';
      case 'C':
        return 'bg-amber-500 text-slate-950';
      default:
        return 'bg-rose-500 text-slate-950';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar & Input Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <span>URL Audit Engine</span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute low-latency HTTP header, security policy, performance, and SEO metadata audits.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={forceFresh}
                  onChange={(e) => setForceFresh(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                />
                <span>Bypass Cache (Force Fresh)</span>
              </label>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAudit();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL to audit (e.g. https://example.com)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Auditing...</span>
                </>
              ) : (
                <>
                  <span>Run Audit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-slate-500 font-medium mr-1">Presets:</span>
            {presets.map((preset) => (
              <button
                key={preset.url}
                onClick={() => {
                  setUrlInput(preset.url);
                  handleAudit(preset.url);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-all font-mono"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert Display */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-5 text-rose-200 flex items-start space-x-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-rose-300">
                Audit Error [{errorMsg.code || 'FAIL'}]
              </span>
            </div>
            <p className="text-xs text-rose-300/90 leading-relaxed font-mono">{errorMsg.message}</p>
            {errorMsg.details && (
              <pre className="mt-2 text-[11px] bg-slate-950 p-2.5 rounded-lg border border-rose-900/50 overflow-x-auto text-rose-200/80 font-mono">
                {JSON.stringify(errorMsg.details, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Audit Result Display */}
      {auditResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Score Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Overall Composite Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Overall Score</span>
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-slate-100 font-mono">
                  {auditResult.scores.overall}
                </span>
                <span className="text-xs text-slate-500 font-mono">/100</span>
              </div>
              <div className="mt-2 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${auditResult.scores.overall}%` }}
                />
              </div>
            </div>

            {/* Security Grade */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Security Grade</span>
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex items-center space-x-3">
                <span
                  className={`text-2xl font-black px-3 py-1 rounded-xl font-mono ${getGradeBg(
                    auditResult.security.grade
                  )}`}
                >
                  {auditResult.security.grade}
                </span>
                <div className="text-xs text-slate-400 font-mono">
                  <div>{auditResult.scores.security}/100 Score</div>
                  <div className="text-[11px] text-slate-500">
                    {auditResult.security.missingCount} Missing
                  </div>
                </div>
              </div>
            </div>

            {/* SEO Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>SEO Metadata</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-slate-100 font-mono">
                  {auditResult.scores.seo}
                </span>
                <span className="text-xs text-slate-500 font-mono">/100</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 truncate">
                Title: {auditResult.seo.title || 'Missing'}
              </div>
            </div>

            {/* Latency & TTFB */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Latency & TTFB</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-amber-400 font-mono">
                  {auditResult.durationMs}
                </span>
                <span className="text-xs text-slate-400 font-mono">ms Total</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono">
                TTFB: {auditResult.ttfbMs}ms | Size: {(auditResult.contentLengthBytes / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          {/* Quick Context Strip */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Target:</span>
              <span className="text-cyan-400 font-bold truncate max-w-xs sm:max-w-md">
                {auditResult.finalUrl}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-slate-500">Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                  {auditResult.statusCode} {auditResult.statusText}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                {auditResult.isHttps ? (
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>HTTPS</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-rose-400">
                    <LockOpen className="w-3.5 h-3.5" />
                    <span>HTTP</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span className={cachedStatus ? 'text-amber-400' : 'text-slate-400'}>
                  {cachedStatus ? 'Cache HIT (Redis)' : 'Cache MISS (Fresh)'}
                </span>
              </div>

              {requestId && (
                <div className="hidden lg:block text-slate-500">ID: {requestId}</div>
              )}
            </div>
          </div>

          {/* Detailed Sub-Tab Switcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="border-b border-slate-800 bg-slate-950/60 px-4 flex items-center space-x-4 overflow-x-auto">
              <button
                onClick={() => setActiveSubTab('security')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
                  activeSubTab === 'security'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Security Headers Audit</span>
              </button>

              <button
                onClick={() => setActiveSubTab('seo')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
                  activeSubTab === 'seo'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>SEO & Meta Inspection</span>
              </button>

              <button
                onClick={() => setActiveSubTab('performance')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
                  activeSubTab === 'performance'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Performance & Headers</span>
              </button>

              <button
                onClick={() => setActiveSubTab('json')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
                  activeSubTab === 'json'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Raw Response JSON</span>
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {/* Security Tab */}
              {activeSubTab === 'security' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                      HTTP Security Header Breakdown
                    </h3>
                    <span className="text-xs text-slate-400">
                      {auditResult.security.missingCount} Recommended headers missing
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {auditResult.security.headers.map((chk) => (
                      <div
                        key={chk.header}
                        className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                          chk.present
                            ? 'bg-emerald-950/10 border-emerald-800/40'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {chk.present ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        )}

                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-slate-200">
                              {chk.header}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold font-mono ${
                                chk.importance === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {chk.importance}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {chk.description}
                          </p>
                          {chk.present && chk.value && (
                            <div className="text-[11px] font-mono bg-slate-950 px-2 py-1 rounded text-cyan-300 border border-slate-800 break-all mt-1">
                              {chk.value}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {auditResult.security.recommendations.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                      <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold font-mono">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Security Hardening Recommendations</span>
                      </div>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 font-mono">
                        {auditResult.security.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* SEO Tab */}
              {activeSubTab === 'seo' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-300 uppercase font-mono">
                        HTML Meta Tags
                      </h4>
                      <div className="space-y-2 text-xs font-mono">
                        <div>
                          <span className="text-slate-500">Title Tag:</span>
                          <p className="text-slate-200 font-medium">
                            {auditResult.seo.title || 'Missing'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Meta Description:</span>
                          <p className="text-slate-300">
                            {auditResult.seo.description || 'Missing'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Canonical URL:</span>
                          <p className="text-cyan-400">
                            {auditResult.seo.canonical || 'Missing'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-300 uppercase font-mono">
                        Open Graph & Mobile
                      </h4>
                      <div className="space-y-2 text-xs font-mono">
                        <div>
                          <span className="text-slate-500">Viewport Tag:</span>
                          <p className="text-slate-200">
                            {auditResult.seo.viewport || 'Missing'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">OG Title:</span>
                          <p className="text-slate-200">
                            {auditResult.seo.ogTitle || 'Missing'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">OG Image:</span>
                          <p className="text-cyan-400 truncate">
                            {auditResult.seo.ogImage || 'Missing'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeSubTab === 'performance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-xs text-slate-500 font-mono">HTTP Compression</span>
                      <p className="text-base font-bold text-cyan-400 font-mono uppercase">
                        {auditResult.performance.compression}
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-xs text-slate-500 font-mono">Cache Control Header</span>
                      <p className="text-xs font-mono text-slate-200 truncate">
                        {auditResult.performance.cacheControl || 'None Specified'}
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-xs text-slate-500 font-mono">Server Header</span>
                      <p className="text-xs font-mono text-slate-200 truncate">
                        {auditResult.serverHeader || 'Hidden'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-300 uppercase font-mono mb-3">
                      Complete HTTP Response Headers ({Object.keys(auditResult.headers).length})
                    </h4>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-xs">
                      {Object.entries(auditResult.headers).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-start justify-between py-1 border-b border-slate-900"
                        >
                          <span className="text-cyan-400 font-semibold">{key}:</span>
                          <span className="text-slate-300 break-all max-w-lg text-right pl-4">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Raw JSON Tab */}
              {activeSubTab === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">
                      Structured JSON Contract Response
                    </span>
                    <button
                      onClick={copyJson}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-all"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-cyan-300 font-mono overflow-x-auto max-h-96">
                    {JSON.stringify(auditResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
