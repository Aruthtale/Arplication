import React from 'react';
import { Layers, ShieldCheck, Sparkles } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262B3B] bg-[#0C0E13]/85 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveTab('home')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF525E] to-[#05C46B] flex items-center justify-center p-0.5 shadow-lg shadow-[#FF525E]/10">
            <div className="w-full h-full bg-[#0C0E13] rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#05C46B] group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-white font-sans">
                Arplication
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-[#181B24] text-[#05C46B] border border-[#262B3B]">
                v0.1.0
              </span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">Modular Client-Side Utility Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111319] border border-[#262B3B] text-xs text-gray-300">
            <span className="w-2 h-2 rounded-full bg-[#05C46B] animate-pulse"></span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              {activeTab === 'home' ? 'Hub' : activeTab}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('aruthtale')}
            className="p-2 rounded-lg bg-[#111319] hover:bg-[#181B24] border border-[#262B3B] text-gray-300 hover:text-white transition-colors"
            title="Ecosystem Info"
          >
            <Sparkles className="w-4 h-4 text-[#FF525E]" />
          </button>
        </div>
      </div>
    </header>
  );
}
