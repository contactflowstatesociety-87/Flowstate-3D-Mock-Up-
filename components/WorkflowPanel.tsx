
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
  // New props for mode selection
  onModeChange: (mode: GenerationMode) => void;
  onNextStep?: () => void;
}

const WorkflowStep: React.FC<{ number: number; title: string; isActive: boolean; isComplete: boolean; children: React.ReactNode; }> = ({ number, title, isActive, isComplete, children }) => {
    const statusClass = isActive ? 'border-primary' : (isComplete ? 'border-brand-green' : 'border-surface-lighter');
    return (
        <div className={`border-l-4 ${statusClass} pl-4 py-4 transition-colors`}>
            <h3 className="font-bold text-xl mb-2 flex items-center">
                <span className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-bold ${isActive ? 'bg-primary' : (isComplete ? 'bg-brand-green' : 'bg-surface-lightest')}`}>
                    {isComplete ? '✓' : number}
                </span>
                {title}
            </h3>
            {isActive && <div className="space-y-4 mt-4">{children}</div>}
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
    <aside className="w-full md:w-96 bg-surface-light flex flex-col h-full border-r border-surface-lighter">
      <div className="p-4 border-b border-surface-lighter flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold">Creative Workflow</h2>
            <p className="text-text-subtle text-sm">Follow the steps to bring your design to life.</p>
        </div>
        {onClose && (
            <button 
                onClick={onClose}
                className="md:hidden p-2 text-text-subtle hover:text-text rounded-full hover:bg-surface-lighter transition-colors"
                aria-label="Close menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        
        {/* Mode Selector at the top of the controls */}
        <ModeSelector selectedMode={generationMode} onChangeMode={onModeChange} />

        <WorkflowStep number={1} title="Upload Images" isActive={currentStep === 'upload'} isComplete={uploadedAssets.length > 0}>
          <Step1Upload onFilesUploaded={onFilesUploaded} isLoading={isLoading} />
        </WorkflowStep>
        
        <WorkflowStep number={2} title="4X Generation" isActive={currentStep === 'flatlay'} isComplete={generatedFlatLays.length > 0}>
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
