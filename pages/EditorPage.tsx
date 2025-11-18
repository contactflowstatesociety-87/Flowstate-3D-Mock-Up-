import React, { useState, useCallback, useEffect } from 'react';
// FIX: Add GenerateVideosResponse to correctly type the video generation operation.
import type { Operation, GenerateVideosResponse } from '@google/genai';
import Canvas from '../components/Canvas';
import Loader from '../components/Loader';
import ProjectsModal from '../components/ProjectsModal';
import SaveProjectModal from '../components/SaveProjectModal';
import WorkflowPanel from '../components/WorkflowPanel';
import Toast from '../components/Toast';
import useHistoryState from '../hooks/useHistoryState';
import { generateFlatLayOptions, generateVideoFromImage, checkVideoOperationStatus } from '../services/geminiService';
import * as projectService from '../services/projectService';
import type { Asset, VeoGenerationMessages, User, Project, EditorState, AnimationConfig, AnimationPreset } from '../types';

const VEO_GENERATION_MESSAGES: VeoGenerationMessages = {
  0: "Warming up the digital loom...",
  2_000: "Analyzing your design...",
  5_000: "Rendering initial frames...",
  10_000: "Animating your creation, this can take a moment...",
  30_000: "Applying finishing touches...",
  60_000: "Almost there, polishing the final render...",
};

const INITIAL_EDITOR_STATE: EditorState = {
  currentStep: 'upload',
  uploadedAssets: [],
  generatedFlatLays: [],
  selectedFlatLay: null,
  animatedMockup: null,
  animationConfig: {
    preset: '360 Spin',
    aspectRatio: '9:16',
    customPrompt: null,
  },
};

const Tooltip: React.FC<{ text: string; children: React.ReactNode; }> = ({ text, children }) => (
    <div className="group relative flex items-center">
        {children}
        <div className="absolute bottom-full mb-2 w-max bg-surface-lighter text-white text-xs rounded py-1 px-2
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
            {text}
        </div>
    </div>
);

interface EditorPageProps {
  resetApiKeyStatus: () => void;
  user: User;
  onLogout: () => void;
}

const EditorPage: React.FC<EditorPageProps> = ({ resetApiKeyStatus, user, onLogout }) => {
  const { state: editorState, setState: setEditorState, undo, redo, canUndo, canRedo } = useHistoryState(INITIAL_EDITOR_STATE);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing your request...');
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadProjects = useCallback(async () => {
      const userProjects = await projectService.getProjectsForUser(user.id);
      setProjects(userProjects);
  }, [user.id]);
  
  const createNewProject = useCallback(() => {
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        userId: user.id,
        name: 'Untitled Project',
        lastSaved: new Date().toISOString(),
        editorState: INITIAL_EDITOR_STATE,
    };
    setCurrentProject(newProject);
    setEditorState(INITIAL_EDITOR_STATE, true); // Clear history for new project
  }, [user.id, setEditorState]);

  useEffect(() => {
    loadProjects();
    createNewProject();
  }, [user.id, loadProjects, createNewProject]);

  // FIX: Use Operation<GenerateVideosResponse> to correctly type the video generation promise.
  const handleVeoOperation = useCallback(async (operationPromise: Promise<Operation<GenerateVideosResponse>>) => {
    setIsLoading(true);
    setError(null);
    // Close sidebar on mobile when operation starts to show progress/canvas
    setIsSidebarOpen(false); 
    let messageTimer: ReturnType<typeof setInterval>;
    let elapsedTime = 0;
  
    try {
      setLoadingMessage(VEO_GENERATION_MESSAGES[0]);
      messageTimer = setInterval(() => {
        elapsedTime += 1000;
        const sortedTimes = Object.keys(VEO_GENERATION_MESSAGES).map(Number).sort((a, b) => b - a);
        for (const time of sortedTimes) {
          if (elapsedTime >= time) {
            setLoadingMessage(VEO_GENERATION_MESSAGES[time]);
            break;
          }
        }
      }, 1000);
  
      let operation = await operationPromise;
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await checkVideoOperationStatus(operation);
      }
  
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);
        const newAsset: Asset = {
          id: `asset-${Date.now()}`,
          type: 'video',
          originalFile: { name: 'animated-mockup.mp4', type: 'video/mp4' },
          originalB64: '',
          processedUrl: videoUrl,
        };
        // Determine if this is the animation or the final scene
        if (editorState.currentStep === 'animate') {
          setEditorState(prev => ({ ...prev, animatedMockup: newAsset, currentStep: 'scene' }));
        } else {
           setEditorState(prev => ({ ...prev, animatedMockup: newAsset })); // Final asset
        }
      } else {
        throw new Error("Video generation completed, but no download link was provided.");
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = "An unknown error occurred during video generation.";
      if (err.message) errorMessage = `Video Generation Failed: ${err.message}`;
      if (err.message?.includes("Requested entity was not found")) {
        errorMessage = "Your API Key is invalid or expired. Please select a valid key.";
        resetApiKeyStatus();
      }
      setError(errorMessage);
    } finally {
      clearInterval(messageTimer);
      setIsLoading(false);
    }
  }, [resetApiKeyStatus, editorState.currentStep, setEditorState]);

  const handleFilesUploaded = (files: File[]) => {
    if (!files || files.length === 0) {
      return;
    }

    setLoadingMessage('Preparing your images...');
    setIsLoading(true);
    setError(null);
    // Keep sidebar open on mobile for user to verify upload or proceed? 
    // Usually better to see the canvas. Let's close it.
    setIsSidebarOpen(false);

    const assetPromises = files.map(file =>
      new Promise<Asset>((resolve, reject) => {
        // Validation Stage 1: File Type & Size
        if (!file.type.startsWith('image/')) {
          return reject(new Error(`"${file.name}" is not a valid image. Please upload a PNG, JPG, or similar file.`));
        }
        if (file.size > 15 * 1024 * 1024) { // 15 MB limit
          return reject(new Error(`"${file.name}" is too large (over 15MB).`));
        }

        const reader = new FileReader();

        // Validation Stage 2: File Reading
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            const parts = result.split(',');
            if (parts.length !== 2 || !parts[1]) {
              return reject(new Error(`Could not read "${file.name}". The file may be corrupt.`));
            }
            const base64String = parts[1];
            resolve({
              id: `asset-${Date.now()}-${Math.random()}`,
              type: 'image',
              originalFile: { name: file.name, type: file.type },
              originalB64: base64String,
            });
          } else {
            reject(new Error(`Failed to read "${file.name}" as a data URL.`));
          }
        };

        reader.onerror = () => {
          console.error('FileReader Error:', reader.error);
          reject(new Error(`Error reading "${file.name}". The file may be corrupt or unsupported.`));
        };
        
        reader.onabort = () => reject(new Error(`Upload of "${file.name}" was cancelled.`));

        reader.readAsDataURL(file);
      })
    );

    Promise.all(assetPromises)
      .then(newAssets => {
        setEditorState(prev => ({
          ...prev,
          uploadedAssets: newAssets, // Replace previous uploads to start the workflow fresh
          currentStep: 'flatlay'
        }));
      })
      .catch(err => {
        console.error("File upload failed:", err);
        setError(err.message || "An unknown error occurred during file upload.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleGenerateFlatLays = async () => {
    if (editorState.uploadedAssets.length === 0) {
        setError("Please upload an image first.");
        return;
    }
    setIsLoading(true);
    setLoadingMessage("Generating 4K flat lay options...");
    setError(null);
    setIsSidebarOpen(false); // Close sidebar to show loading/results
    try {
        const primaryAsset = editorState.uploadedAssets[0];
        const results = await generateFlatLayOptions(primaryAsset.originalB64, primaryAsset.originalFile.type);
        const flatLayAssets: Asset[] = results.map(res => ({
            id: `asset-${Date.now()}-${Math.random()}`,
            type: 'image',
            originalFile: { name: 'flatlay.png', type: res.mimeType },
            originalB64: res.base64,
        }));
        setEditorState(prev => ({...prev, generatedFlatLays: flatLayAssets}));
    } catch (err: any) {
        console.error(err);
        setError(`Failed to generate flat lays: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSelectFlatLay = (asset: Asset) => {
    setEditorState(prev => ({...prev, selectedFlatLay: asset, currentStep: 'animate'}));
    // If on mobile, maybe open the sidebar to prompt next step?
    // Or let user click "Menu" again. Keeping it closed is safer for viewing.
  };
  
  const handleAnimate = async () => {
    if (!editorState.selectedFlatLay) return;
    const { originalB64, originalFile } = editorState.selectedFlatLay;
    const { preset, aspectRatio, customPrompt } = editorState.animationConfig;

    let prompt = "Animate this garment with realistic fabric physics, as if worn by an invisible, well-built male model with a manly chest, against a neutral background. The animation should be photorealistic. ";
    
    if (customPrompt) {
      prompt += `The animation should show the garment ${customPrompt}.`
    } else if (preset) {
        const presetPrompts: Record<AnimationPreset, string> = {
            '360 Spin': 'rotating slowly 360 degrees.',
            'Walking': 'in a natural walking motion, showcasing how it moves with the body.',
            'Windy': 'with a strong wind effect from the front, making the fabric ripple and flow.',
            'Jumping Jacks': 'moving as if the person is doing jumping jacks, showing flexibility.',
            'Arm Flex': 'moving in a bicep flexing motion.',
            'Sleeve in Pocket': 'as one of the sleeves moves to place a hand in its own pocket.'
        };
        prompt += presetPrompts[preset];
    }
    
    setLoadingMessage("Creating your animation...");
    await handleVeoOperation(generateVideoFromImage(originalB64, originalFile.type, prompt, aspectRatio));
  };

  const handleGenerateScene = async (scenePrompt: string) => {
    if (!editorState.selectedFlatLay) return;
    const { originalB64, originalFile } = editorState.selectedFlatLay;
    const { preset, customPrompt, aspectRatio } = editorState.animationConfig;

    let animationDescription = "";
    if (customPrompt) {
        animationDescription = `doing the following action: ${customPrompt}.`;
    } else if (preset) {
        const presetPrompts: Record<AnimationPreset, string> = {
            '360 Spin': 'rotating slowly 360 degrees',
            'Walking': 'in a natural walking motion',
            'Windy': 'with a strong wind effect from the front',
            'Jumping Jacks': 'doing jumping jacks',
            'Arm Flex': 'flexing its bicep',
            'Sleeve in Pocket': 'placing a hand in its own pocket'
        };
        animationDescription = presetPrompts[preset];
    }
    
    const prompt = `A photorealistic video of this clothing item being worn by an invisible, well-built male model with a manly chest, ${animationDescription}. The scene is: ${scenePrompt}.`;

    setLoadingMessage("Placing your animation in a new scene...");
    await handleVeoOperation(generateVideoFromImage(originalB64, originalFile.type, prompt, aspectRatio));
  };
  
  const handleUpdateAnimationConfig = (config: Partial<AnimationConfig>) => {
    setEditorState(prev => ({...prev, animationConfig: { ...prev.animationConfig, ...config }}));
  };

  const handleSaveProject = async (projectName: string) => {
    if (!currentProject) return;
    setIsSaving(true);
    setIsSaveModalOpen(false);
    try {
        const projectToSave = {
          ...currentProject,
          name: projectName,
          lastSaved: new Date().toISOString(),
          editorState: editorState,
        };
        await projectService.saveProject(projectToSave);
        setCurrentProject(projectToSave);
        await loadProjects();
        setToastMessage("Project saved successfully!");
    } catch (e) {
        setError("Failed to save project.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleLoadProject = (project: Project) => {
    setCurrentProject(project);
    setEditorState(project.editorState, true); // Clear history when loading
    setIsProjectsModalOpen(false);
    setToastMessage(`Project "${project.name}" loaded.`);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      await projectService.deleteProject(projectId);
      await loadProjects();
      setToastMessage("Project deleted.");
      if (currentProject?.id === projectId) {
        createNewProject();
      }
    }
  };

  const getCanvasAssets = () => {
    switch(editorState.currentStep) {
        case 'upload': return editorState.uploadedAssets;
        case 'flatlay': return editorState.generatedFlatLays.length > 0 ? editorState.generatedFlatLays : editorState.uploadedAssets;
        case 'animate': return editorState.selectedFlatLay ? [editorState.selectedFlatLay] : [];
        case 'scene': return editorState.animatedMockup ? [editorState.animatedMockup] : (editorState.selectedFlatLay ? [editorState.selectedFlatLay] : []);
        default: return [];
    }
  };
  
  return (
    <div className="flex h-screen bg-surface-dark text-text overflow-hidden relative">
      {(isLoading || isSaving) && <Loader message={isSaving ? 'Saving project...' : loadingMessage} />}
      {isProjectsModalOpen && <ProjectsModal projects={projects} onLoad={handleLoadProject} onDelete={handleDeleteProject} onClose={() => setIsProjectsModalOpen(false)} />}
      {isSaveModalOpen && <SaveProjectModal projectName={currentProject?.name || ''} onSave={handleSaveProject} onClose={() => setIsSaveModalOpen(false)} />}
      <Toast message={toastMessage} />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Workflow Panel - Drawer on mobile, Sidebar on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-full md:w-auto md:static md:inset-auto 
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <WorkflowPanel 
            editorState={editorState}
            onFilesUploaded={handleFilesUploaded}
            onGenerateFlatLays={handleGenerateFlatLays}
            onAnimate={handleAnimate}
            onGenerateScene={handleGenerateScene}
            onUpdateAnimationConfig={handleUpdateAnimationConfig}
            isLoading={isLoading}
            onClose={() => setIsSidebarOpen(false)}
        />
      </div>
      
      <main className="flex-1 flex flex-col p-4 md:p-8 bg-surface-DEFAULT overflow-y-auto w-full min-w-0">
        <header className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <button 
                    className="md:hidden p-2 -ml-2 text-text hover:text-primary transition-colors"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open workflow menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <img src="https://hfjhiwexlywppvuftjfu.supabase.co/storage/v1/object/public/Flowstate%203D%20Mock%20Up/98A2DE26-3B81-4646-BDF1-BDB932920CF7%202.png.PNG" alt="Company Logo" className="h-20 w-20" />
                <h1 className="text-xl font-semibold hidden sm:block">{currentProject?.name || 'Virtual Threads Studio'}</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                <Tooltip text="Undo (Ctrl+Z)">
                    <button onClick={undo} disabled={!canUndo} className="p-2 rounded-md hover:bg-surface-lighter disabled:text-text-subtle/50 disabled:hover:bg-transparent disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H13a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    </button>
                </Tooltip>
                <Tooltip text="Redo (Ctrl+Y)">
                    <button onClick={redo} disabled={!canRedo} className="p-2 rounded-md hover:bg-surface-lighter disabled:text-text-subtle/50 disabled:hover:bg-transparent disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H7a1 1 0 110-2h7.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </Tooltip>

                <div className="w-px h-6 bg-surface-lighter mx-2"></div>

                <Tooltip text="Save Project">
                    <button onClick={() => setIsSaveModalOpen(true)} className="p-2 rounded-md hover:bg-surface-lighter">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm3 0v4h4V4H8zm5 8H7v4h6v-4z" /></svg>
                    </button>
                </Tooltip>
                <Tooltip text="My Projects">
                    <button onClick={() => { loadProjects(); setIsProjectsModalOpen(true); }} className="p-2 rounded-md hover:bg-surface-lighter">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                    </button>
                </Tooltip>

                <div className="w-px h-6 bg-surface-lighter mx-2"></div>

                <Tooltip text="Logout">
                    <button onClick={onLogout} className="p-2 rounded-md hover:bg-brand-red/20 text-brand-red transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                    </button>
                </Tooltip>
            </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0">
            {error && (
                <div className="mb-4 p-3 bg-brand-red/20 text-red-300 border border-brand-red rounded-md flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold text-lg hover:text-white transition-colors">&times;</button>
                </div>
            )}
            <Canvas
                assets={getCanvasAssets()}
                step={editorState.currentStep}
                selectedAssetId={editorState.selectedFlatLay?.id}
                onAssetClick={editorState.currentStep === 'flatlay' ? handleSelectFlatLay : undefined}
            />
        </div>
      </main>
    </div>
  );
};

export default EditorPage;