
import React from 'react';
import type { EditorState, AnimationConfig, GenerationMode } from '../types';
import Step1Upload from './workflow/Step1_Upload';
import Step2FlatLay from './workflow/Step2_FlatLay';
import Step3Animate from './workflow/Step3_Animate';
import Step4Scene from './workflow/Step4_Scene';
import ModeSelector from './ModeSelector';

interface WorkflowPanelProps {
  editorState: EditorState;
  isLoading: boolean;
  onFilesUploaded: (files: File[]) => void;
  onGenerateFlatLays: () => void;
  onAnimate: () => void;
  onGenerateScene: (prompt: string) => void;
  onUpdateAnimationConfig: (config: Partial<AnimationConfig>) => void;
  onClose?: () => void;
  onDownloadAllFlatLays?: () => void;
  onEditFlatLay?: () => void;
  onDownloadAssets?: () => void;
  onModeChange: (mode: GenerationMode) => void;
  onNextStep?: () => void;
}

const WorkflowStep: React.FC<{ number: number; title: string; isActive: boolean; isComplete: boolean; children: React.ReactNode; }> = ({ number, title, isActive, isComplete, children }) => {
    // Brighter active border, subtle inactive
    const statusClass = isActive ? 'border-primary' : (isComplete ? 'border-brand-green' : 'border-surface-light');
    
    return (
        <div className={`border-l-2 ${statusClass} pl-5 py-4 transition-all duration-300`}>
            <h3 className={`text-lg mb-3 flex items-center transition-colors ${isActive ? 'font-bold text-white' : 'font-medium text-text-subtle'}`}>
                <span className={`flex items-center justify-center w-6 h-6 rounded-full mr-3 text-xs font-bold transition-colors ${isActive ? 'bg-primary text-white' : (isComplete ? 'bg-brand-green text-surface-dark' : 'bg-surface-light text-text-subtle')}`}>
                    {isComplete ? '✓' : number}
                </span>
                {title}
            </h3>
            {isActive && <div className="space-y-4 mt-2 animate-in fade-in slide-in-from-left-2 duration-300">{children}</div>}
        </div>
    );
};

const WorkflowPanel: React.FC<WorkflowPanelProps> = (props) => {
    const { 
        editorState, isLoading, onFilesUploaded, onGenerateFlatLays, onAnimate, onGenerateScene, onUpdateAnimationConfig, onClose,
        onDownloadAllFlatLays, onEditFlatLay, onDownloadAssets, onModeChange, onNextStep
    } = props;
    const { currentStep, uploadedAssets, generatedFlatLays, selectedFlatLays, animatedMockup, staticMockup, animationConfig, generationMode } = editorState;
  
    return (
    <aside className="w-full md:w-96 bg-surface-DEFAULT flex flex-col h-full border-r border-surface-light shadow-xl z-20">
      <div className="p-6 border-b border-surface-light flex justify-between items-start z-10 relative bg-surface-DEFAULT">
        <div>
            <h2 className="text-2xl font-bold tracking-tighter text-white">Creative Workflow</h2>
            <p className="text-text-subtle text-sm mt-1">Bring your design to life.</p>
        </div>
        {onClose && (
            <button 
                onClick={onClose}
                className="md:hidden p-2 text-text-subtle hover:text-white rounded-full hover:bg-surface-light transition-colors"
                aria-label="Close menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}
      </div>
      
      {/* Mode Selector */}
      <div className="px-6 pt-6 pb-2 z-20 relative bg-surface-DEFAULT">
        <ModeSelector selectedMode={generationMode} onChangeMode={onModeChange} />
      </div>
      
      <div className="flex-grow overflow-y-auto px-6 pb-6 space-y-2 custom-scrollbar">
        <WorkflowStep number={1} title="Upload Images" isActive={currentStep === 'upload'} isComplete={uploadedAssets.length > 0}>
          <Step1Upload onFilesUploaded={onFilesUploaded} isLoading={isLoading} />
        </WorkflowStep>
        
        <WorkflowStep number={2} title="Generate Assets" isActive={currentStep === 'flatlay'} isComplete={generatedFlatLays.length > 0}>
          <Step2FlatLay 
            onGenerate={onGenerateFlatLays} 
            onEdit={onEditFlatLay || (() => {})} 
            onDownloadAll={onDownloadAllFlatLays || (() => {})}
            onNext={onNextStep || (() => {})}
            isLoading={isLoading} 
            hasUploadedAssets={uploadedAssets.length > 0} 
            hasGeneratedLays={generatedFlatLays.length > 0}
            selectedCount={selectedFlatLays ? selectedFlatLays.length : 0}
          />
        </WorkflowStep>

        <WorkflowStep number={3} title="Create Animation" isActive={currentStep === 'animate'} isComplete={animatedMockup !== null || staticMockup !== null}>
          <Step3Animate 
            onAnimate={onAnimate} 
            onDownloadAssets={onDownloadAssets || (() => {})}
            isLoading={isLoading} 
            config={animationConfig} 
            onConfigChange={onUpdateAnimationConfig}
            hasGeneratedAssets={!!(animatedMockup || staticMockup)}
          />
        </WorkflowStep>

        <WorkflowStep number={4} title="Place in Scene" isActive={currentStep === 'scene'} isComplete={false}>
            <Step4Scene onGenerateScene={onGenerateScene} isLoading={isLoading} config={animationConfig} onConfigChange={onUpdateAnimationConfig} />
        </WorkflowStep>
      </div>
    </aside>
  );
};

export default WorkflowPanel;
