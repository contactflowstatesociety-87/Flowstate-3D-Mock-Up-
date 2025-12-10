import React from 'react';
import type { StrictnessLevel } from '../types';

interface StrictnessSelectorProps {
  value: StrictnessLevel;
  onChange: (value: StrictnessLevel) => void;
}

const StrictnessSelector: React.FC<StrictnessSelectorProps> = ({ value, onChange }) => {
  const options: { key: StrictnessLevel; label: string; desc: string }[] = [
    { key: 'strict', label: 'Very Strict', desc: '100% adherence to original. No creative changes.' },
    { key: 'balanced', label: 'Balanced', desc: 'Best of both. High accuracy with professional lighting.' },
    { key: 'creative', label: 'Creative', desc: 'Preserves logo/brand, but enhances mood, drape, and lighting.' },
  ];

  return (
    <div className="w-full mb-4">
      <label className="block text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">
        AI Strictness (Fidelity)
      </label>
      <div className="flex bg-surface-light rounded-lg p-1 border border-surface-light">
        {options.map((option) => (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 relative group ${
              value === option.key
                ? 'bg-surface-dark text-white shadow-sm ring-1 ring-white/10'
                : 'text-text-subtle hover:text-text hover:bg-white/5'
            }`}
          >
            {option.label}
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 p-2 bg-surface-dark text-white text-[10px] leading-tight rounded border border-surface-light opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              {option.desc}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-surface-dark"></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StrictnessSelector;
