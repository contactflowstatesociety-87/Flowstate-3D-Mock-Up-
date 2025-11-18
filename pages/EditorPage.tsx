
import React, { useState, useCallback, useEffect } from 'react';
import type { Operation, GenerateVideosResponse } from '@google/genai';
import Canvas from '../components/Canvas';
import Loader from '../components/Loader';
import ProjectsModal from '../components/ProjectsModal';
import SaveProjectModal from '../components/SaveProjectModal';
import WorkflowPanel from '../components/WorkflowPanel';
import Toast from '../components/Toast';
import ImageEditorModal from '../components/ImageEditorModal';
import MediaPreviewModal from '../components/MediaPreviewModal';
import useHistoryState from '../hooks/useHistoryState';
import * as service from '../services/geminiService';
import * as projectService from '../services/projectService';
import type { Asset, VeoGenerationMessages, User, Project, EditorState, AnimationConfig, AnimationPreset, GenerationMode } from '../types';

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
  generationMode: 'default',
  uploadedAssets: [],
  generatedFlatLays: [],
  selectedFlatLay: null,
  staticMockup: null,
  animatedMockup: null,
  animationConfig: {
    preset: '360 Spin',
    aspectRatio: '9:16',
    customPrompt: null,
    generateStatic: true,
    generateVideo: true,
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
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  
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

  const downloadAsset = (asset: Asset) => {
    const link = document.createElement('a');
    if (asset.type === 'video' && asset.processedUrl) {
        link.href = asset.processedUrl;
        link.download = `${asset.originalFile.name || 'video'}.mp4`;
    } else {
        link.href = `data:${asset.originalFile.type};base64,${asset.originalB64}`;
        link.download = `${asset.originalFile.name || 'image'}-${asset.id.slice(-6)}.png`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePreviewAsset = (asset: Asset) => {
      setPreviewAsset(asset);
  };

  const handleVeoOperation = useCallback(async (operationPromise: Promise<Operation<GenerateVideosResponse>>) => {
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
        operation = await service.checkVideoOperationStatus(operation);
      }
  
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);
        return {
          id: `asset-${Date.now()}`,
          type: 'video',
          originalFile: { name: 'animated-mockup.mp4', type: 'video/mp4' },
          originalB64: '',
          processedUrl: videoUrl,
        } as Asset;
      } else {
        throw new Error("Video generation completed, but no download link was provided.");
      }
    } catch (err: any) {
        throw err;
    } finally {
      // @ts-ignore
      clearInterval(messageTimer);
    }
  }, []);

  const handleFilesUploaded = (files: File[]) => {
    if (!files || files.length === 0) return;

    setLoadingMessage('Preparing your images...');
    setIsLoading(true);
    setError(null);
    setIsSidebarOpen(false);

    const assetPromises = files.map(file =>
      new Promise<Asset>((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          return reject(new Error(`"${file.name}" is not a valid image.`));
        }
        if (file.size > 15 * 1024 * 1024) {
          return reject(new Error(`"${file.name}" is too large (over 15MB).`));
        }

        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            const parts = result.split(',');
            if (parts.length !== 2 || !parts[1]) return reject(new Error(`Could not read "${file.name}".`));
            resolve({
              id: `asset-${Date.now()}-${Math.random()}`,
              type: 'image',
              originalFile: { name: file.name, type: file.type },
              originalB64: parts[1],
            });
          } else {
            reject(new Error(`Failed to read "${file.name}".`));
          }
        };
        reader.onerror = () => reject(new Error(`Error reading "${file.name}".`));
        reader.readAsDataURL(file);
      })
    );

    Promise.all(assetPromises)
      .then(newAssets => {
        setEditorState(prev => ({
          ...prev,
          uploadedAssets: newAssets,
          currentStep: 'flatlay'
        }));
      })
      .catch(err => {
        console.error("File upload failed:", err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  const handleGenerateFlatLays = async () => {
    if (editorState.uploadedAssets.length === 0) {
        setError("Please upload an image first.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setIsSidebarOpen(false);

    const primaryAsset = editorState.uploadedAssets[0];
    const { originalB64 } = primaryAsset;
    const mimeType = primaryAsset.originalFile.type;
    const mode = editorState.generationMode;

    const newGeneratedAssets: Asset[] = [];

    try {
        // Helper functions to generate sets
        const generateStrictSet = async (suffix = '') => {
            // Strict Flat Lay
             try {
                 const res1 = await service.generateStrictFlatLay(originalB64, mimeType, mode);
                 newGeneratedAssets.push({
                    id: `asset-strict-flat-${Date.now()}${suffix}`,
                    type: 'image',
                    label: `Strict Mode: Flat Lay${suffix}`,
                    originalFile: { name: `strict-flatlay${suffix}.png`, type: res1.mimeType },
                    originalB64: res1.base64,
                 });
             } catch (e) { console.warn("Strict flat lay failed", e); }
             
             // Strict 3D Mockup
             try {
                 const res2 = await service.generateStrict3DMockup(originalB64, mimeType, mode);
                 newGeneratedAssets.push({
                    id: `asset-strict-3d-${Date.now()}${suffix}`,
                    type: 'image',
                    label: `Strict Mode: 3D Mockup${suffix}`,
                    originalFile: { name: `strict-3d-mockup${suffix}.png`, type: res2.mimeType },
                    originalB64: res2.base64,
                 });
             } catch (e) { console.warn("Strict 3D mockup failed", e); }
        };

        const generateFlexibleSet = async (suffix = '') => {
            // Flexible Studio Photo
             try {
                const res3 = await service.generateFlexibleStudioPhoto(originalB64, mimeType, mode);
                newGeneratedAssets.push({
                   id: `asset-flex-photo-${Date.now()}${suffix}`,
                   type: 'image',
                   label: `Flexible Mode: Studio Photo${suffix}`,
                   originalFile: { name: `flexible-studio${suffix}.png`, type: res3.mimeType },
                   originalB64: res3.base64,
                });
             } catch (e) { console.warn("Flexible studio photo failed", e); }

             // Flexible Video
             try {
                 if (!suffix) setLoadingMessage("Generating Flexible 3D Video...");
                 const videoAsset = await handleVeoOperation(service.generateFlexibleVideo(originalB64, mimeType, mode));
                 videoAsset.label = `Flexible Mode: 3D Video${suffix}`;
                 newGeneratedAssets.push(videoAsset);
             } catch (e: any) { 
                 console.warn("Flexible video failed", e);
                 if (e.message?.includes("Requested entity was not found")) {
                    throw new Error("Your API Key is invalid or expired. Please select a valid key.");
                 }
             }
        };

        if (mode === 'strict') {
            setLoadingMessage(`Generating Strict Mode outputs (Batch 1)...`);
            await generateStrictSet();
            setLoadingMessage(`Generating Strict Mode outputs (Batch 2)...`);
            await generateStrictSet(' (2)');
        } else if (mode === 'flexible') {
             setLoadingMessage(`Generating Flexible Mode outputs (Batch 1)...`);
             await generateFlexibleSet();
             setLoadingMessage(`Generating Flexible Mode outputs (Batch 2)...`);
             await generateFlexibleSet(' (2)');
        } else {
             // Default or Mixed modes: Generate 1 full set (4 items)
             setLoadingMessage(`Generating Strict outputs...`);
             await generateStrictSet();
             setLoadingMessage(`Generating Flexible outputs...`);
             await generateFlexibleSet();
        }

        if (newGeneratedAssets.length === 0) {
            throw new Error("Generation failed to produce any outputs. Please try again.");
        }

        setEditorState(prev => ({
            ...prev,
            generatedFlatLays: newGeneratedAssets,
            // Auto-select the first image for editing
            selectedFlatLay: newGeneratedAssets.find(a => a.type === 'image') || null
        }));

    } catch (err: any) {
        console.error(err);
        setError(`Generation failed: ${err.message || "Unknown error"}`);
        if (err.message?.includes("API Key")) {
             resetApiKeyStatus();
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleSelectFlatLay = (asset: Asset) => {
    setEditorState(prev => ({...prev, selectedFlatLay: asset, currentStep: 'animate'}));
  };

  const handleApplyEdit = async (modifiedBase64: string, prompt: string) => {
      setIsEditorModalOpen(false);
      setIsLoading(true);
      setLoadingMessage("Applying your edits...");
      
      try {
          const result = await service.editImage(modifiedBase64, 'image/png', prompt);
          
          const newAsset: Asset = {
              id: `asset-${Date.now()}`,
              type: 'image',
              label: 'Edited Asset',
              originalFile: { name: 'edited-flatlay.png', type: result.mimeType },
              originalB64: result.base64,
          };

          setEditorState(prev => ({
              ...prev,
              generatedFlatLays: [newAsset, ...prev.generatedFlatLays],
              selectedFlatLay: newAsset
          }));
          setToastMessage("Edit applied successfully!");
      } catch (err: any) {
          setError("Failed to apply edit: " + err.message);
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleAnimate = async () => {
    if (!editorState.selectedFlatLay) return;
    const { originalB64, originalFile } = editorState.selectedFlatLay;
    const { preset, aspectRatio, customPrompt, generateStatic, generateVideo } = editorState.animationConfig;

    setIsLoading(true);
    setError(null);
    setIsSidebarOpen(false);

    try {
        const tasks = [];
        
        if (generateStatic) {
            tasks.push((async () => {
                setLoadingMessage("Generating 3D Static Mockup...");
                const res = await service.generateStaticMockup(originalB64, originalFile.type);
                const staticAsset: Asset = {
                    id: `asset-static-${Date.now()}`,
                    type: 'image',
                    label: 'Static Mockup',
                    originalFile: { name: '3d-mockup.png', type: res.mimeType },
                    originalB64: res.base64,
                };
                setEditorState(prev => ({ ...prev, staticMockup: staticAsset }));
            })());
        }

        if (generateVideo) {
            tasks.push((async () => {
                let prompt = "A short hyper realistic 3D mock up video of this clothing item. ";
                prompt += "Mannequin Requirements: Use INVISIBLE GHOST MANNEQUIN. The clothing must look like it is floating in mid-air. Hollow clothing form. No visible mannequin. No clear or glass mannequin. No body parts visible. Show the inside of the collar if applicable. The body shape implied by the drape must be male (broad shoulders, squared torso). ";
                prompt += "Video Requirements: Clean professional studio lighting, minimal seamless background. 4K visual detail. The clothing must move naturally. ";
                
                if (customPrompt) {
                  prompt += `The animation should show the garment ${customPrompt}.`
                } else if (preset) {
                    const presetPrompts: Record<AnimationPreset, string> = {
                        '360 Spin': 'rotating slowly 360 degrees. Use smooth camera motion.',
                        'Walking': 'in a natural walking motion, showcasing how it moves with the body.',
                        'Windy': 'with a strong wind effect from the front, making the fabric ripple and flow.',
                        'Jumping Jacks': 'moving as if the person is doing jumping jacks, showing flexibility.',
                        'Arm Flex': 'moving in a bicep flexing motion.',
                        'Sleeve in Pocket': 'as one of the sleeves moves to place a hand in its own pocket.'
                    };
                    prompt += presetPrompts[preset];
                }
                
                const videoAsset = await handleVeoOperation(service.generateVideoFromImage(originalB64, originalFile.type, prompt, aspectRatio));
                videoAsset.label = 'Animated Video';
                setEditorState(prev => ({ ...prev, animatedMockup: videoAsset }));
            })());
        }

        await Promise.all(tasks);
        
        if (generateVideo) {
            setEditorState(prev => ({ ...prev, currentStep: 'scene' }));
        }

    } catch (err: any) {
      console.error(err);
      let errorMessage = "An unknown error occurred.";
      if (err.message) errorMessage = err.message;
      if (err.message?.includes("Requested entity was not found")) {
        errorMessage = "Your API Key is invalid or expired. Please select a valid key.";
        resetApiKeyStatus();
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScene = async (scenePrompt: string) => {
    if (!editorState.selectedFlatLay) return;
    const { originalB64, originalFile } = editorState.selectedFlatLay;
    const { preset, customPrompt, aspectRatio } = editorState.animationConfig;

    let animationDescription = "";
    if (customPrompt) {
        animationDescription = `doing the following action: ${customPrompt}`;
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
    
    const prompt = `A short hyper realistic 3D mock up video of this clothing item. 
    Mannequin Requirements: Use INVISIBLE GHOST MANNEQUIN. The clothing must look like it is floating in mid-air. Hollow clothing form. No visible mannequin. No clear or glass mannequin. No body parts visible. Show the inside of the collar if applicable. The body shape implied by the drape must be male (broad shoulders, squared torso).
    Action: The clothing must move naturally ${animationDescription}.
    Scene Requirements: The scene is: ${scenePrompt}. Always center the product and keep it clearly readable.`;

    setIsLoading(true);
    setLoadingMessage("Placing your animation in a new scene...");
    try {
        const videoAsset = await handleVeoOperation(service.generateVideoFromImage(originalB64, originalFile.type, prompt, aspectRatio));
        videoAsset.label = 'Scene Animation';
        setEditorState(prev => ({ ...prev, animatedMockup: videoAsset }));
    } catch (e: any) {
        setError(e.message || "Failed to generate scene.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleUpdateAnimationConfig = (config: Partial<AnimationConfig>) => {
    setEditorState(prev => ({...prev, animationConfig: { ...prev.animationConfig, ...config }}));
  };

  const handleModeChange = (mode: GenerationMode) => {
      setEditorState(prev => ({ ...prev, generationMode: mode }));
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

  const downloadFlatLays = () => {
    editorState.generatedFlatLays.forEach((asset, index) => {
        setTimeout(() => downloadAsset(asset), index * 500);
    });
  };
  
  const downloadResults = () => {
      if (editorState.staticMockup) downloadAsset(editorState.staticMockup);
      if (editorState.animatedMockup) {
          setTimeout(() => downloadAsset(editorState.animatedMockup!), 500);
      }
  };

  const getCanvasAssets = () => {
    switch(editorState.currentStep) {
        case 'upload': return editorState.uploadedAssets;
        case 'flatlay': return editorState.generatedFlatLays.length > 0 ? editorState.generatedFlatLays : editorState.uploadedAssets;
        case 'animate': 
        case 'scene':
             const results = [];
             if (editorState.staticMockup) results.push(editorState.staticMockup);
             if (editorState.animatedMockup) results.push(editorState.animatedMockup);
             if (results.length > 0) return results;
             return editorState.selectedFlatLay ? [editorState.selectedFlatLay] : [];
        default: return [];
    }
  };
  
  return (
    <div className="flex h-screen bg-surface-dark text-text overflow-hidden relative">
      {(isLoading || isSaving) && <Loader message={isSaving ? 'Saving project...' : loadingMessage} />}
      {isProjectsModalOpen && <ProjectsModal projects={projects} onLoad={handleLoadProject} onDelete={handleDeleteProject} onClose={() => setIsProjectsModalOpen(false)} />}
      {isSaveModalOpen && <SaveProjectModal projectName={currentProject?.name || ''} onSave={handleSaveProject} onClose={() => setIsSaveModalOpen(false)} />}
      {isEditorModalOpen && editorState.selectedFlatLay && (
          <ImageEditorModal 
            imageUrl={`data:${editorState.selectedFlatLay.originalFile.type};base64,${editorState.selectedFlatLay.originalB64}`} 
            onSave={handleApplyEdit}
            onClose={() => setIsEditorModalOpen(false)} 
          />
      )}
      
      {previewAsset && (
        <MediaPreviewModal 
            asset={previewAsset} 
            onClose={() => setPreviewAsset(null)} 
            onDownload={downloadAsset}
        />
      )}
      
      <Toast message={toastMessage} />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-30 w-full md:w-96 md:static md:inset-auto 
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
            onDownloadAllFlatLays={downloadFlatLays}
            onEditFlatLay={() => setIsEditorModalOpen(true)}
            onDownloadAssets={downloadResults}
            onModeChange={handleModeChange}
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
                onPreview={handlePreviewAsset}
                onDownload={downloadAsset}
            />
        </div>
      </main>
    </div>
  );
};

export default EditorPage;
