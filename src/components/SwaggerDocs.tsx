import React from 'react';
import { FileCode2, ExternalLink } from 'lucide-react';

export const SwaggerDocs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <FileCode2 className="w-5 h-5 text-cyan-400" />
            <span>OpenAPI 3.0 Interactive Specification</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete OpenAPI / Swagger REST contract specification for Page Pulse URL Audit Service.
          </p>
        </div>

        <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-cyan-500/20"
        >
          <span>Open Swagger UI Tab</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-[750px]">
        <iframe
          src="/api-docs"
          className="w-full h-full border-0 bg-white"
          title="Page Pulse Swagger UI"
        />
      </div>
    </div>
  );
};
