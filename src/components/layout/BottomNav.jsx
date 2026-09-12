import React from 'react';
import { Download, Timer, FileText, Info, LayoutGrid } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'home', label: 'Hub', icon: LayoutGrid },
    { id: 'arloader', label: 'Arloader', icon: Download, badge: 'Active' },
    { id: 'ardoro', label: 'Ardoro', icon: Timer },
    { id: 'arnote', label: 'ArNote', icon: FileText },
    { id: 'aruthtale', label: 'Aruthtale', icon: Info },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#262B3B] bg-[#0C0E13]/90 backdrop-blur-lg px-2 py-1.5 sm:py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[#05C46B]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#181B24]/40'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {item.badge && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF525E]" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#FF525E] to-[#05C46B]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
