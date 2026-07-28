import React from 'react';
import { ExternalLink, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const appUrl = 'https://ais-dev-jqy5z24h23j63erks6syi4-525209508268.asia-southeast1.run.app';

  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12 text-slate-400 font-mono text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Mandated Digital Heroes Link */}
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-200 hover:text-cyan-400 font-bold transition-all underline underline-offset-4 flex items-center space-x-1"
          >
            <span>Built for Digital Heroes Training Task</span>
            <ExternalLink className="w-3 h-3 text-cyan-400" />
          </a>
        </div>

        {/* Center Deployed App URL */}
        <div className="flex items-center space-x-2 text-slate-400">
          <span className="text-slate-500">Deployed App:</span>
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline truncate max-w-xs sm:max-w-md font-mono"
          >
            {appUrl}
          </a>
        </div>

        {/* Right Tag */}
        <div className="text-slate-500 text-[11px] flex items-center space-x-1">
          <span>Page Pulse SDE Submission</span>
          <span>•</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};
