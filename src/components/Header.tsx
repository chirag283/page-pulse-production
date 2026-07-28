import React from 'react';
import { Activity, ShieldCheck, Layers, FileCode2, BarChart3, BookOpen } from 'lucide-react';

export type ActiveTab = 'single' | 'batch' | 'telemetry' | 'swagger' | 'architecture';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isOnline }) => {
  const tabs = [
    { id: 'single' as ActiveTab, label: 'Single URL Audit', icon: ShieldCheck },
    { id: 'batch' as ActiveTab, label: 'Batch Stress Audit', icon: Layers },
    { id: 'telemetry' as ActiveTab, label: 'System Telemetry', icon: BarChart3 },
    { id: 'swagger' as ActiveTab, label: 'OpenAPI Spec', icon: FileCode2 },
    { id: 'architecture' as ActiveTab, label: 'Task B Architecture', icon: BookOpen },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Status */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">PAGE PULSE</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                  PROD v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono hidden sm:block">
                URL Audit Service & Concurrency Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Live System Indicator */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-mono text-slate-300">
              {isOnline ? 'Engine Healthy (3000)' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
