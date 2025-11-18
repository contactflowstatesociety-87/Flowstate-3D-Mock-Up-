
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

  // Determine button label
  let buttonLabel = "Generate";
  if (config.generateStatic && config.generateVideo) buttonLabel = "Generate Both";
  else if (config.generateStatic) buttonLabel = "Generate Static Mockup";
  else if (config.generateVideo) buttonLabel = "Generate Animated Video";

  return (
    <>
      <p className="text-text-subtle text-sm">
        Choose to create a high-end static 3D mockup, a dynamic video animation, or both.
      </p>

      {/* Generation Type Selection */}
      <div className="bg-surface-lighter/50 p-3 rounded-lg space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.generateStatic}
                onChange={(e) => onConfigChange({ generateStatic: e.target.checked })}
                className="w-4 h-4 text-primary rounded focus:ring-primary bg-surface-dark border-surface-lightest"
              />
              <span className="text-sm font-medium text-text">3D Static Mockup (Photo)</span>
          </label>
           <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.generateVideo}
                onChange={(e) => onConfigChange({ generateVideo: e.target.checked })}
                className="w-4 h-4 text-primary rounded focus:ring-primary bg-surface-dark border-surface-lightest"
              />
              <span className="text-sm font-medium text-text">3D Animated Mockup (Video)</span>
          </label>
      </div>
      
      {/* Animation Controls - Only show if video is selected */}
      {config.generateVideo && (
        <div className="space-y-4 pt-2 border-t border-surface-lighter/50">
            <div>
                <label className="block text-sm font-medium text-text mb-2">Animation Presets</label>
                <div className="grid grid-cols-2 gap-2">
                    {presets.map(p => (
                        <button
                            key={p}
                            onClick={() => handlePresetClick(p)}
                            className={`p-2 text-xs rounded-md transition-colors ${config.preset === p ? 'bg-primary font-semibold' : 'bg-surface-lighter hover:bg-surface-lightest'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-text mb-2">Or Describe a Custom Motion</label>
                <textarea
                    value={config.customPrompt || ''}
                    onChange={handleCustomPromptChange}
                    placeholder="e.g., doing a cartwheel"
                    className="w-full h-20 p-2 bg-surface-lighter rounded-md placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary"
                    disabled={isLoading}
                />
            </div>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-text mb-2">Aspect Ratio</label>
         <div className="grid grid-cols-2 gap-2">
            {aspectRatios.map(ratio => (
                <button
                    key={ratio}
                    onClick={() => onConfigChange({ aspectRatio: ratio })}
                    className={`p-2 text-sm rounded-md transition-colors ${config.aspectRatio === ratio ? 'bg-primary font-semibold' : 'bg-surface-lighter hover:bg-surface-lightest'}`}
                >
                    {aspectRatioLabels[ratio]} ({ratio})
                </button>
            ))}
        </div>
      </div>
      
      <button
        onClick={onAnimate}
        disabled={isLoading || (!config.generateStatic && !config.generateVideo) || (config.generateVideo && !config.preset && !config.customPrompt)}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-lightest disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Processing...' : buttonLabel}
      </button>

       {hasGeneratedAssets && (
        <div className="pt-4 border-t border-surface-lighter">
             <button
              onClick={onDownloadAssets}
              className="w-full bg-surface-lighter text-text font-medium py-2 rounded-lg hover:bg-surface-lightest transition-colors flex items-center justify-center gap-2"
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
