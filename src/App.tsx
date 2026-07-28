import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { AuditDashboard } from './components/AuditDashboard';
import { BatchRunner } from './components/BatchRunner';
import { TelemetryDashboard } from './components/TelemetryDashboard';
import { SwaggerDocs } from './components/SwaggerDocs';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { Footer } from './components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('single');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} isOnline={isOnline} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {activeTab === 'single' && <AuditDashboard />}
        {activeTab === 'batch' && <BatchRunner />}
        {activeTab === 'telemetry' && <TelemetryDashboard />}
        {activeTab === 'swagger' && <SwaggerDocs />}
        {activeTab === 'architecture' && <ArchitectureViewer />}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
