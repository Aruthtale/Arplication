import React from 'react';
import { Download, Sparkles, Layers, Terminal } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  const getTabLabel = () => {
    switch (activeTab) {
      case 'home':
        return 'HUB';
      case 'arloader':
        return 'ARLOADER';
      case 'ardoro':
        return 'ARDORO';
      case 'arnote':
        return 'ARNOTE';
      case 'aruthtale':
        return 'ARUTHTALE';
      default:
        return activeTab.toUpperCase();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F8F5EE] border-b-[3px] border-[#121212] text-[#121212]">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          onClick={() => setActiveTab('home')}
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFE600] flex items-center justify-center border-2 border-[#121212] shadow-[2px_2px_0px_#121212] transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5 overflow-hidden p-1.5">
            <img src="/logo.png" alt="Arplication Logo" className="w-full h-full object-contain" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-base uppercase tracking-wider text-[#121212]">
                ARPLICATION
              </span>
              <span className="text-[10px] font-mono-code font-black bg-[#38E54D] text-[#121212] px-1.5 py-0.5 border border-[#121212] rounded shadow-[1px_1px_0px_#121212]">
                BETA
              </span>
            </div>
            <span className="text-[9px] font-mono-code font-bold text-gray-600 tracking-wider block mt-0.5">
              MORI SUITE • v0.2.0
            </span>
          </div>
        </div>

        {/* Right Tab & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Active Tab Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border-2 border-[#121212] text-xs font-mono-code font-black text-[#121212] shadow-[2px_2px_0px_#121212]">
            <span className="w-2 h-2 rounded-full bg-[#38E54D] border border-black animate-pulse" />
            <span className="text-[11px] tracking-wide">
              {getTabLabel()}
            </span>
          </div>

          {/* Aruthtale Info Action */}
          <button
            onClick={() => setActiveTab('aruthtale')}
            className={`w-9 h-9 rounded-lg border-2 border-[#121212] flex items-center justify-center transition-all shadow-[2px_2px_0px_#121212] overflow-hidden p-1.5 ${
              activeTab === 'aruthtale'
                ? 'bg-[#FF70A6] text-[#121212]'
                : 'bg-white hover:bg-yellow-100 text-[#121212]'
            }`}
            title="Aruthtale Diagnostics & Info"
          >
            <img src="/logo.png" alt="Aruthtale Info" className="w-full h-full object-contain" />
          </button>
        </div>
      </div>
    </header>
  );
}
