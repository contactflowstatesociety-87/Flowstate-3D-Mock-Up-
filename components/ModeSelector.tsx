
import React from 'react';
import type { GenerationMode } from '../types';

interface ModeSelectorProps {
  selectedMode: GenerationMode;
  onChangeMode: (mode: GenerationMode) => void;
}

interface ModeOption {
  key: GenerationMode;
  label: string;
  description: string;
}

const modes: ModeOption[] = [
  { 
    key: 'default', 
    label: 'Default 5X', 
    description: 'Full Spectrum. Generates 6 assets: Strict, Flexible, Ecommerce, Luxury, Complex styles + Video.' 
  },
  { 
    key: 'strict', 
    label: 'Strict Only', 
    description: 'Accuracy Focus. Generates: 2 Flat Lays, 2 Static 3D Mockups. (No Video).' 
  },
  { 
    key: 'flexible', 
    label: 'Flexible Only', 
    description: 'Creative Focus. Generates: 2 Studio Photos, 2 Animated Videos. (No Flat Lays).' 
  },
  { 
    key: 'ecommerce', 
    label: 'Ecommerce', 
    description: 'Sales Focus (Clean). Generates: 1 Flat Lay, 1 Static 3D Mockup, 1 Photo, 1 Video.' 
  },
  { 
    key: 'luxury', 
    label: 'Luxury', 
    description: 'Cinematic Focus. Generates: 1 Flat Lay, 1 Static 3D Mockup, 1 Photo, 1 Video.' 
  },
  { 
    key: 'complex', 
    label: 'Complex Mat.', 
    description: 'Texture Focus. Generates: 1 Flat Lay, 1 Static 3D Mockup, 1 Photo, 1 Video.' 
  },
];

const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onChangeMode }) => {
  return (
    <div className="w-full mb-6">
      <label className="block text-sm font-bold text-text mb-2">Generation Mode</label>
      <div className="flex flex-wrap gap-2">
        {modes.map((mode, index) => {
            // Determine tooltip position classes based on index
            let positionClasses = "left-1/2 transform -translate-x-1/2 text-center"; // Default Center
            let arrowClasses = "left-1/2 transform -translate-x-1/2"; // Default Center Arrow

            if (index === 0) {
                // First item: Align Left
                positionClasses = "left-0 text-left";
                arrowClasses = "left-4"; 
            } else if (index === modes.length - 1) {
                // Last item: Align Right
                positionClasses = "right-0 text-right";
                arrowClasses = "right-4";
            }

            return (
              <div key={mode.key} className="group relative">
                <button
                  onClick={() => onChangeMode(mode.key)}
                  className={`px-3 py-1 text-sm rounded-full border transition-all duration-200 ${
                    selectedMode === mode.key
                      ? 'bg-surface-dark text-white border-surface-dark font-semibold shadow-md'
                      : 'bg-transparent text-text-subtle border-surface-lighter hover:border-primary hover:text-primary'
                  }`}
                >
                  {mode.label}
                </button>
                
                {/* Tooltip */}
                <div className={`absolute bottom-full mb-2 w-48 p-3 bg-surface-lightest text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 border border-surface-lighter ${positionClasses}`}>
                  {mode.description}
                  <div className={`absolute top-full border-4 border-transparent border-t-surface-lightest ${arrowClasses}`}></div>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default ModeSelector;
