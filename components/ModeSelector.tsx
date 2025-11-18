
import React from 'react';
import type { GenerationMode } from '../types';

interface ModeSelectorProps {
  selectedMode: GenerationMode;
  onChangeMode: (mode: GenerationMode) => void;
}

const modes: { key: GenerationMode; label: string }[] = [
  { key: 'default', label: 'Default 4X' },
  { key: 'strict', label: 'Strict Only' },
  { key: 'flexible', label: 'Flexible Only' },
  { key: 'ecommerce', label: 'Ecommerce' },
  { key: 'luxury', label: 'Luxury' },
  { key: 'complex', label: 'Complex Mat.' },
];

const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onChangeMode }) => {
  return (
    <div className="w-full mb-6">
      <label className="block text-sm font-bold text-text mb-2">Generation Mode</label>
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => onChangeMode(mode.key)}
            className={`px-3 py-1 text-sm rounded-full border transition-all duration-200 ${
              selectedMode === mode.key
                ? 'bg-surface-dark text-white border-surface-dark font-semibold shadow-md'
                : 'bg-transparent text-text-subtle border-surface-lighter hover:border-primary hover:text-primary'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
