import React from 'react';
import { Download, Timer, FileText, Info, LayoutGrid } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'home', label: 'Hub', iconUrl: '/logo.png', activeColor: 'bg-[#FFE600]' },
    { id: 'arloader', label: 'Arloader', iconUrl: '/arloader.png', badge: 'Active', activeColor: 'bg-[#38E54D]' },
    { id: 'ardoro', label: 'Ardoro', iconUrl: '/ardoro.png', activeColor: 'bg-[#FF70A6]' },
    { id: 'arnote', label: 'ArNote', iconUrl: '/arnote.png', activeColor: 'bg-[#C4FAF8]' },
    { id: 'aruthtale', label: 'Aruthtale', iconUrl: '/logo.png', activeColor: 'bg-[#A076F9]' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#F8F5EE] border-t-[3px] border-[#121212] px-2 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? `${item.activeColor} text-[#121212] border-2 border-[#121212] shadow-[2.5px_2.5px_0px_#121212] -translate-y-0.5 font-black`
                  : 'text-[#121212] hover:bg-white/80 border-2 border-transparent font-bold'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center">
                <img 
                  src={item.iconUrl} 
                  alt={item.label}
                  className={`w-5 h-5 object-contain transition-transform ${isActive ? 'scale-110' : 'grayscale opacity-80'}`} 
                />
                {item.badge && !isActive && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-[#38E54D] border border-[#121212]" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-mono-code uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
