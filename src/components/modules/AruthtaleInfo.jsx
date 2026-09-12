import React from 'react';
import { Sparkles, Shield, Cpu, ExternalLink, GitBranch, Terminal, ArrowLeft } from 'lucide-react';

export default function AruthtaleInfo({ setActiveTab }) {
  const envInfo = [
    { label: 'Environment', value: 'Client-Side (PWA / Android Native)' },
    { label: 'Core Version', value: 'v0.1.0' },
    { label: 'Design System', value: 'Neon Protocol (#0C0E13 / Mint / Coral)' },
    { label: 'Platform Bridge', value: 'CapacitorJS Native Bridge' },
    { label: 'Telemetry & Ads', value: '0% — Fully telemetry-free' },
  ];

  return (
    <div className="space-y-6 pb-20 pt-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#111319] border border-[#262B3B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hub</span>
        </button>

        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/30">
          Module Aruthtale
        </span>
      </div>

      <div className="rounded-2xl border border-[#262B3B] bg-gradient-to-br from-[#181B24] to-[#111319] p-6 text-center relative overflow-hidden">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#FF525E] to-[#05C46B] p-0.5 mb-4 shadow-xl">
          <div className="w-full h-full bg-[#0C0E13] rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#05C46B]" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Aruthtale Ecosystem</h2>
        <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
          Arplication is an integrated personal utility suite crafted by Aruthtale. Built for speed, privacy, and full offline resilience.
        </p>
      </div>

      {/* Diagnostics & Specs */}
      <div className="rounded-xl border border-[#262B3B] bg-[#111319] p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#05C46B]" />
          System Diagnostics
        </h3>
        <div className="divide-y divide-[#262B3B]/60 text-xs">
          {envInfo.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between">
              <span className="text-gray-400">{item.label}</span>
              <span className="font-mono text-gray-200">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Repository Card */}
      <div className="rounded-xl border border-[#262B3B] bg-[#111319] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#181B24] border border-[#262B3B]">
            <GitBranch className="w-5 h-5 text-[#05C46B]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Aruthtale/Arplication</h4>
            <p className="text-xs text-gray-400 font-mono">git@github.com:Aruthtale/Arplication.git</p>
          </div>
        </div>

        <a
          href="https://github.com/Aruthtale/Arplication"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#181B24] hover:bg-[#222634] border border-[#262B3B] text-xs text-white font-medium transition-colors"
        >
          <span>View on GitHub</span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
        </a>
      </div>
    </div>
  );
}
