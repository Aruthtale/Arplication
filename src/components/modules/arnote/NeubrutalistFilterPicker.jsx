import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function NeubrutalistFilterPicker({
  icon: Icon,
  label,
  value,
  options, // Array of { value, label, colorBg? }
  onChange,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:shadow-[3px_3px_0px_#121212] active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] text-xs font-black text-[#121212] transition-all cursor-pointer ${
          value ? 'bg-[#FFE600]/30' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-[#121212]/70" />}
          {selectedOption?.colorBg && (
            <span className={`w-3 h-3 rounded-full border border-[#121212] shrink-0 ${selectedOption.colorBg}`} />
          )}
          <span className="truncate">{selectedOption?.label || label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-[#121212]/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 min-w-[150px] w-full max-h-56 overflow-y-auto bg-[#F8F5EE] border-2 border-[#121212] shadow-[4px_4px_0px_#121212] rounded-xl z-50 p-1 space-y-1 animate-in fade-in slide-in-from-top-2 duration-100">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFE600] text-[#121212] border border-[#121212] shadow-[1px_1px_0px_#121212]'
                    : 'hover:bg-white text-[#121212]/85'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.colorBg && (
                    <span className={`w-3 h-3 rounded-full border border-[#121212] shrink-0 ${opt.colorBg}`} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#121212] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
