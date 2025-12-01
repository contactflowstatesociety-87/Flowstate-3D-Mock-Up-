
import React from 'react';
import type { AnimationConfig, AnimationPreset, AspectRatio } from '../../types';

interface Props {
  onAnimate: () => void;
  onDownloadAssets: () => void;
  isLoading: boolean;
  config: AnimationConfig;
  onConfigChange: (config: Partial<AnimationConfig>) => void;
  hasGeneratedAssets: boolean;
}

const Step3Animate: React.FC<Props> = ({ onAnimate, onDownloadAssets, isLoading, config, onConfigChange, hasGeneratedAssets }) => {
  const presets: AnimationPreset[] = ['360 Spin', 'Walking', 'Windy', 'Jumping Jacks', 'Arm Flex', 'Sleeve in Pocket'];
  const aspectRatios: AspectRatio[] = ['9:16', '16:9'];
  const aspectRatioLabels: Record<AspectRatio, string> = { '9:16': 'Portrait', '16:9': 'Landscape' };

  const handlePresetClick = (preset: AnimationPreset) => {
    onConfigChange({ preset, customPrompt: null });
  };

  const handleCustomPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onConfigChange({ customPrompt: e.target.value, preset: null });
  };

  let buttonLabel = "Generate";
  if (config.generateStatic && config.generateVideo) buttonLabel = "Generate Both";
  else if (config.generateStatic) buttonLabel = "Generate Static Mockup";
  else if (config.generateVideo) buttonLabel = "Generate Animated Video";

  return (
    <>
      <p className="text-text-subtle text-sm leading-relaxed">
        Choose to create a high-end static 3D mockup, a dynamic video animation, or both.
      </p>

      {/* Generation Type Selection */}
      <div className="bg-surface-light/50 p-4 rounded-lg space-y-3 border border-surface-light">
          <label className="flex items-center space-x-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={config.generateStatic}
                onChange={(e) => onConfigChange({ generateStatic: e.target.checked })}
                className="w-4 h-4 text-primary rounded focus:ring-primary bg-surface-dark border-surface-light"
              />
              <span className="text-sm font-medium text-text group-hover:text-white transition-colors">3D Static Mockup (Photo)</span>
          </label>
           <label className="flex items-center space-x-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={config.generateVideo}
                onChange={(e) => onConfigChange({ generateVideo: e.target.checked })}
                className="w-4 h-4 text-primary rounded focus:ring-primary bg-surface-dark border-surface-light"
              />
              <span className="text-sm font-medium text-text group-hover:text-white transition-colors">3D Animated Mockup (Video)</span>
          </label>
      </div>
      
      {config.generateVideo && (
        <div className="space-y-4 pt-4 border-t border-surface-light">
            <div>
                <label className="block text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">Animation Presets</label>
                <div className="grid grid-cols-2 gap-2">
                    {presets.map(p => (
                        <button
                            key={p}
                            onClick={() => handlePresetClick(p)}
                            className={`p-2 text-xs rounded-lg transition-all border ${config.preset === p ? 'bg-primary border-primary text-white font-semibold' : 'bg-surface-light border-surface-light text-text-subtle hover:border-surface-lighter hover:text-white'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">Or Custom Motion</label>
                <textarea
                    value={config.customPrompt || ''}
                    onChange={handleCustomPromptChange}
                    placeholder="e.g., doing a cartwheel"
                    className="w-full h-20 p-3 bg-surface-light rounded-lg placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary border border-surface-light focus:border-transparent text-sm"
                    disabled={isLoading}
                />
            </div>
        </div>
      )}
      
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
      
      <button
        onClick={onAnimate}
        disabled={isLoading || (!config.generateStatic && !config.generateVideo) || (config.generateVideo && !config.preset && !config.customPrompt)}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:text-text-subtle disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/10 mt-2"
      >
        {isLoading ? 'Processing...' : buttonLabel}
      </button>

       {hasGeneratedAssets && (
        <div className="pt-6 border-t border-surface-light mt-2">
             <button
              onClick={onDownloadAssets}
              className="w-full bg-surface-light text-text font-medium py-2.5 rounded-lg hover:bg-surface-lighter transition-colors flex items-center justify-center gap-2 border border-surface-lighter"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Results
           </button>
        </div>
       )}
    </>
  );
};

export default Step3Animate;
