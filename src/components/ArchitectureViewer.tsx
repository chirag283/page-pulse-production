import React, { useState } from 'react';
import { BookOpen, Network, CheckCircle, ShieldAlert, Activity, RefreshCw, Layers } from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeDocSection, setActiveDocSection] = useState<'architecture' | 'tdr' | 'fma' | 'observability' | 'rollback'>('architecture');

  return (
    <div className="space-y-6">
      {/* Doc Header & Tab Nav */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>Task B: Architecture & Engineering Specification</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Production Architecture Specification for 10,000 Audits/Day, 500 Peak Concurrency & Customer SLA.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {[
            { id: 'architecture', label: '1. System Architecture', icon: Network },
            { id: 'tdr', label: '2. Tech Decision Record', icon: CheckCircle },
            { id: 'fma', label: '3. Failure Mode Analysis', icon: ShieldAlert },
            { id: 'observability', label: '4. Observability Plan', icon: Activity },
            { id: 'rollback', label: '5. Rollback & Deployment', icon: RefreshCw },
          ].map((sec) => {
            const Icon = sec.icon;
            const isActive = activeDocSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveDocSection(sec.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Panels */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {activeDocSection === 'architecture' && (
          <div className="space-y-6 text-slate-300 text-xs sm:text-sm font-sans leading-relaxed">
            <h3 className="text-base font-bold text-slate-100 font-mono">
              1. System Architecture & High-Concurrency Data Flow
            </h3>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-cyan-400 font-bold">Data Flow Pipeline Architecture:</span>
              <div className="text-slate-300 leading-relaxed space-y-2">
                <p>1. <strong>Ingress Rate Limiter</strong>: Sliding window per IP (100 req/min limit). Blocks flood attacks with HTTP 429.</p>
                <p>2. <strong>SSRF Shield & Normalizer</strong>: Validates HTTP/HTTPS protocols and screens target hostnames against RFC 1918 private ranges, loopback IPs, link-local, and cloud metadata (169.254.169.254).</p>
                <p>3. <strong>Distributed Redis Cache</strong>: Checks for cached audit results (TTL 300s). Falls back seamlessly to an in-memory LRU store if Redis is disconnected.</p>
                <p>4. <strong>Concurrency Semaphore Queue</strong>: Caps active audit workers at MAX_CONCURRENCY=500. Queues bursts to avoid CPU starvation.</p>
                <p>5. <strong>URL Audit Service</strong>: Executes fetch with AbortController timeout (5,000ms). Parses security headers, SEO tags, performance metrics, and SSL certificates.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500">Target Throughput:</span>
                <p className="text-base font-bold text-cyan-400">10,000 Audits / Day</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500">Peak Burst Capacity:</span>
                <p className="text-base font-bold text-cyan-400">500 Concurrent Requests</p>
              </div>
            </div>
          </div>
        )}

        {activeDocSection === 'tdr' && (
          <div className="space-y-4 text-xs font-mono">
            <h3 className="text-base font-bold text-slate-100 font-mono">
              2. Technology Decision Record (TDR)
            </h3>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Technology</th>
                    <th className="p-3">Reason Chosen</th>
                    <th className="p-3">Alternative Considered</th>
                    <th className="p-3">Reason Alternative Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-cyan-400">Node.js + Express</td>
                    <td className="p-3">Asynchronous event loop natively handles non-blocking socket I/O at high concurrency.</td>
                    <td className="p-3 text-slate-400">Python FastAPI</td>
                    <td className="p-3 text-slate-400">Higher memory overhead per concurrent un-bound socket connection.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-cyan-400">Redis (ioredis)</td>
                    <td className="p-3">Sub-millisecond key-value caching and built-in TTL expiration.</td>
                    <td className="p-3 text-slate-400">Memcached</td>
                    <td className="p-3 text-slate-400">Lacks persistence and flexible memory fallbacks.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-cyan-400">In-Memory LRU Fallback</td>
                    <td className="p-3">Guarantees 100% service uptime during Redis server outages.</td>
                    <td className="p-3 text-slate-400">Hard Redis Dependency</td>
                    <td className="p-3 text-slate-400">App crashes or returns 500 errors if Redis drops.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-cyan-400">Pino Logger</td>
                    <td className="p-3">Extremely fast JSON serializer that won't lock event loop under load.</td>
                    <td className="p-3 text-slate-400">Winston</td>
                    <td className="p-3 text-slate-400">Higher CPU overhead when writing thousands of logs/sec.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeDocSection === 'fma' && (
          <div className="space-y-4 text-xs font-mono">
            <h3 className="text-base font-bold text-slate-100 font-mono">
              3. Failure Mode Analysis (FMA)
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-rose-400 font-bold uppercase">Failure Scenario 1: Redis Cache Outage</span>
                <p className="text-slate-300">
                  <strong>Impact:</strong> Inability to read or write remote cache keys.<br />
                  <strong>Detection:</strong> Pino logger captures connection failure; /api/health reports cache.isRedis: false.<br />
                  <strong>Mitigation:</strong> App fails over to in-memory LRU cache automatically. Zero request drops.<br />
                  <strong>Recovery:</strong> Reconnects to Redis silently when service returns.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold uppercase">Failure Scenario 2: Traffic Spike (2,000 Concurrent Requests)</span>
                <p className="text-slate-300">
                  <strong>Impact:</strong> High CPU/RAM consumption and potential socket exhaustion.<br />
                  <strong>Detection:</strong> Rate limiter active counters spike; queue length reaches warning threshold.<br />
                  <strong>Mitigation:</strong> Throttles flood IPs with 429 Retry-After. Queues up to MAX_CONCURRENCY=500 and rejects beyond MAX_QUEUE_LENGTH=1000.<br />
                  <strong>Recovery:</strong> Drains queue safely without process crash.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-bold uppercase">Failure Scenario 3: External Target Site Hanging / Tarpit</span>
                <p className="text-slate-300">
                  <strong>Impact:</strong> Worker threads locked waiting for HTTP responses.<br />
                  <strong>Detection:</strong> Spike in duration telemetry.<br />
                  <strong>Mitigation:</strong> AbortController enforces a hard 5,000ms timeout, freeing workers immediately.<br />
                  <strong>Recovery:</strong> Returns structured 504 HTTP_TIMEOUT error to caller.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeDocSection === 'observability' && (
          <div className="space-y-4 text-xs font-mono">
            <h3 className="text-base font-bold text-slate-100 font-mono">
              4. Observability & Alerting Plan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-bold">Key Telemetry Metrics</span>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  <li>P50, P95, and P99 response latency (ms)</li>
                  <li>Cache hit ratio percentage</li>
                  <li>Concurrency queue depth & active workers</li>
                  <li>4xx (SSRF/Client) and 5xx (Upstream) error rates</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold">Prometheus Alert Rules</span>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  <li>Alert if P95 latency &gt; 1,500ms over 5 minutes</li>
                  <li>Alert if 5xx error rate exceeds 2% of total traffic</li>
                  <li>Alert if queue length &gt; 800 items (80% capacity)</li>
                  <li>Alert if cache hit ratio &lt; 40% under steady load</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeDocSection === 'rollback' && (
          <div className="space-y-4 text-xs font-mono">
            <h3 className="text-base font-bold text-slate-100 font-mono">
              5. Rollback & Deployment Strategy
            </h3>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-cyan-400 font-bold">Deployment & Emergency Rollback Protocol:</span>
              <ol className="list-decimal list-inside text-slate-300 space-y-1.5">
                <li><strong>Blue-Green Deployment</strong>: Run new container tag alongside existing version. Test /api/health probe before shifting traffic.</li>
                <li><strong>Canary Release</strong>: Route 10% of traffic to new deployment for 15 minutes while monitoring P95 latency and error rate.</li>
                <li><strong>Emergency Rollback</strong>: Shift 100% of ingress router traffic back to previous container image tag. Flush corrupt Redis cache keys if required.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
