
import React, { useState } from 'react';
import type { AnimationConfig, AspectRatio } from '../../types';

interface Props {
  onGenerateScene: (prompt: string) => void;
  isLoading: boolean;
  config: AnimationConfig;
  onConfigChange: (config: Partial<AnimationConfig>) => void;
  hasGeneratedAssets: boolean;
}

const Step4Scene: React.FC<Props> = ({ onGenerateScene, isLoading, config, onConfigChange, hasGeneratedAssets }) => {
  const [prompt, setPrompt] = useState('');
  const aspectRatios: AspectRatio[] = ['16:9', '9:16'];
  const aspectRatioLabels: Record<AspectRatio, string> = { '16:9': 'Landscape', '9:16': 'Portrait' };


  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerateScene(prompt.trim());
    }
  };

  return (
    <>
      <p className="text-text-subtle text-sm leading-relaxed">
        Place your animated product in any environment. Describe the scene below and choose an aspect ratio.
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., walking through a neon-lit Tokyo street at night..."
        className="w-full h-24 p-3 bg-surface-light rounded-lg placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary border border-surface-light focus:border-transparent text-sm"
        disabled={isLoading}
      />

       <div>
        <label className="block text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">Aspect Ratio</label>
         <div className="grid grid-cols-2 gap-2">
            {aspectRatios.map(ratio => (
                <button
                    key={ratio}
                    onClick={() => onConfigChange({ aspectRatio: ratio })}
                    className={`p-2 text-sm rounded-lg transition-all border ${config.aspectRatio === ratio ? 'bg-primary border-primary text-white font-semibold' : 'bg-surface-light border-surface-light text-text-subtle hover:border-surface-lighter hover:text-white'}`}
                >
                    {aspectRatioLabels[ratio]} ({ratio})
                </button>
            ))}
        </div>
      </div>

      {!hasGeneratedAssets && (
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:text-text-subtle disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/10"
        >
          {isLoading ? 'Generating Scene...' : 'Generate Scene'}
        </button>
      )}

      {hasGeneratedAssets && (
          <div className="pt-6 border-t border-surface-light mt-2 space-y-3">
             <button
                 onClick={handleGenerate}
                 disabled={isLoading || !prompt.trim()}
                 className="w-full bg-surface-light text-text font-medium py-3 rounded-lg hover:bg-surface-lighter hover:text-white border border-surface-lighter transition-all text-sm flex items-center justify-center gap-2"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generate Again (Create Alternative)
             </button>
          </div>
      )}
    </>
  );
};

export default Step4Scene;
