import React from 'react';
import type { AnimationConfig, AnimationPreset, AspectRatio } from '../../types';

interface Props {
  onAnimate: () => void;
  isLoading: boolean;
  config: AnimationConfig;
  onConfigChange: (config: Partial<AnimationConfig>) => void;
}

const Step3Animate: React.FC<Props> = ({ onAnimate, isLoading, config, onConfigChange }) => {
  const presets: AnimationPreset[] = ['360 Spin', 'Walking', 'Windy', 'Jumping Jacks', 'Arm Flex', 'Sleeve in Pocket'];
  const aspectRatios: AspectRatio[] = ['9:16', '16:9'];
  const aspectRatioLabels: Record<AspectRatio, string> = { '9:16': 'Portrait', '16:9': 'Landscape' };

  const handlePresetClick = (preset: AnimationPreset) => {
    onConfigChange({ preset, customPrompt: null });
  };

  const handleCustomPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onConfigChange({ customPrompt: e.target.value, preset: null });
  };

  return (
    <>
      <p className="text-text-subtle text-sm">
        Bring your design to life. Choose a preset motion or describe your own.
      </p>
      
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
        disabled={isLoading || (!config.preset && !config.customPrompt)}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-hover disabled:bg-surface-lightest disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Animating...' : 'Create 3D Animated Mockup'}
      </button>
       <p className="text-xs text-text-subtle/80 text-center">This can take a few moments to render.</p>
    </>
  );
};

export default Step3Animate;