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
  selectedFlatLays: [], 
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
        <div className="absolute top-full mt-2 w-max bg-surface-light text-white text-xs rounded py-1 px-2
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg border border-surface-lighter">
            {text}
        </div>
    </div>
);

// Helper to normalize images to ensure API compatibility
const normalizeImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      
      // Increased to 4096 for higher resolution inputs (closer to user request for 6K quality)
      const MAX_DIM = 4096; 
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Preserve PNG transparency if applicable, otherwise use JPEG for better compression
      const outputMimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = outputMimeType === 'image/jpeg' ? 0.98 : undefined;

      try {
          const dataUrl = canvas.toDataURL(outputMimeType, quality);
          const base64 = dataUrl.split(',')[1];
          if (!base64) throw new Error("Encoding failed");
          
          resolve({
            base64: base64,
            mimeType: outputMimeType
          });
      } catch (e) {
          reject(e);
      }
    };
    
    img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for normalization"));
    };
    
    img.src = url;
  });
};

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

  const downloadAsset = async (asset: Asset) => {
    try {
        let blob: Blob;
        const filename = asset.originalFile.name || (asset.type === 'video' ? 'video.mp4' : 'image.png');
        
        if (asset.type === 'video' && asset.processedUrl) {
            const res = await fetch(asset.processedUrl);
            blob = await res.blob();
        } else {
             // Convert Base64 to Blob
             const byteCharacters = atob(asset.originalB64);
             const byteNumbers = new Array(byteCharacters.length);
             for (let i = 0; i < byteCharacters.length; i++) {
                 byteNumbers[i] = byteCharacters.charCodeAt(i);
             }
             const byteArray = new Uint8Array(byteNumbers);
             blob = new Blob([byteArray], { type: asset.originalFile.type });
        }

        const file = new File([blob], filename, { type: blob.type });

        // Attempt to use Web Share API (native share sheet) for "Save to Photos" on Mobile
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                 files: [file],
                 title: 'Flowstate Asset',
                 text: 'Created with Flowstate'
             });
             return; 
        }
    } catch (e) {
        console.log("Share API unavailable or cancelled, falling back to download.", e);
    }

    // Fallback for Desktop or unsupported browsers
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

  const checkVideoResolution = (videoUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            // Check for 1080p (>= 1080 in either dimension)
            resolve(video.videoWidth >= 1080 || video.videoHeight >= 1080);
        };
        video.onerror = () => resolve(false);
        video.src = videoUrl;
    });
  };

  const handleVeoOperation = useCallback(async (videoGenerator: () => Promise<Operation<GenerateVideosResponse>>): Promise<Asset> => {
    let messageTimer: ReturnType<typeof setInterval>;
    let attempts = 0;
    const maxAttempts = 3;

    const startMessageTimer = () => {
        let elapsedTime = 0;
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
    };

    try {
      while (attempts < maxAttempts) {
        attempts++;
        if (attempts > 1) {
            setLoadingMessage(`Retrying generation (Attempt ${attempts}/${maxAttempts}) for 1080p quality...`);
        } else {
            startMessageTimer();
        }

        let operation = await videoGenerator();
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await service.checkVideoOperationStatus(operation);
        }

        // @ts-ignore
        if (messageTimer) clearInterval(messageTimer);

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await videoResponse.blob();
            const videoUrl = URL.createObjectURL(blob);

            // Resolution QA Check
            const isHighRes = await checkVideoResolution(videoUrl);
            if (isHighRes) {
                return {
                    id: `asset-${Date.now()}`,
                    type: 'video',
                    originalFile: { name: 'animated-mockup.mp4', type: 'video/mp4' },
                    originalB64: '',
                    processedUrl: videoUrl,
                } as Asset;
            } else {
                console.warn(`Video verification failed: Resolution < 1080p. Retrying...`);
                // Continue loop
            }
        } else {
            console.warn("Video generation completed, but no download link provided. Retrying...");
            // Continue loop
        }
      }
      throw new Error("Failed to generate video in 1080p after multiple attempts.");

    } catch (err: any) {
        throw err;
    } finally {
      // @ts-ignore
      if (messageTimer) clearInterval(messageTimer);
    }
  }, []);

  const handleFilesUploaded = (files: File[]) => {
    if (!files || files.length === 0) return;

    setLoadingMessage('Preparing your images...');
    setIsLoading(true);
    setError(null);
    setIsSidebarOpen(false);

    const assetPromises = files.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error(`"${file.name}" is not a valid image.`);
        }
        
        try {
            // Normalize the image (resize if needed, standardize mime type)
            const { base64, mimeType } = await normalizeImage(file);
            
            return {
              id: `asset-${Date.now()}-${Math.random()}`,
              type: 'image',
              originalFile: { name: file.name, type: mimeType },
              originalB64: base64,
            } as Asset;
        } catch (err: any) {
             throw new Error(`Failed to process "${file.name}": ${err.message}`);
        }
    });

    Promise.all(assetPromises)
      .then(newAssets => {
        // Append new assets (support multiple uploads in steps or at once)
        setEditorState(prev => ({
          ...prev,
          uploadedAssets: [...prev.uploadedAssets, ...newAssets],
          currentStep: 'flatlay'
        }));
      })
      .catch(err => {
        console.error("File upload failed:", err);
        setError(service.getFriendlyErrorMessage(err));
      })
      .finally(() => setIsLoading(false));
  };

  const handleGenerateFlatLays = async () => {
    if (editorState.uploadedAssets.length === 0) {
        setError("Please upload at least one image first.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setIsSidebarOpen(false);

    // Primary asset is the first one uploaded/selected
    const primaryAsset = editorState.uploadedAssets[0];
    const { originalB64 } = primaryAsset;
    const mimeType = primaryAsset.originalFile.type;
    const mode = editorState.generationMode;
    
    // Collect all uploaded images to use as reference context for 3D generations
    const allAssetsB64 = editorState.uploadedAssets.map(a => a.originalB64);

    const newGeneratedAssets: Asset[] = [];

    try {
        // --- Helper to generate Strict and Flexible sets ---
        const generateStrictSet = async (suffix = '') => {
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
             
             try {
                 // Use ALL assets for 3D mockup to improve angle accuracy
                 const res2 = await service.generateStrict3DMockup(allAssetsB64, mimeType, mode);
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
             try {
                // Use ALL assets for flexible photo
                const res3 = await service.generateFlexibleStudioPhoto(allAssetsB64, mimeType, mode);
                newGeneratedAssets.push({
                   id: `asset-flex-photo-${Date.now()}${suffix}`,
                   type: 'image',
                   label: `Flexible Mode: Studio Photo${suffix}`,
                   originalFile: { name: `flexible-studio${suffix}.png`, type: res3.mimeType },
                   originalB64: res3.base64,
                });
             } catch (e) { console.warn("Flexible studio photo failed", e); }

             try {
                 if (!suffix) setLoadingMessage("Generating Flexible 3D Video...");
                 const videoAsset = await handleVeoOperation(() => service.generateFlexibleVideo(originalB64, mimeType, mode));
                 videoAsset.label = `Flexible Mode: 3D Video${suffix}`;
                 newGeneratedAssets.push(videoAsset);
             } catch (e: any) { 
                 console.warn("Flexible video failed", e);
                 if (e.message?.includes("Requested entity was not found")) {
                    throw new Error("Your API Key is invalid or expired. Please select a valid key.");
                 }
             }
        };

        // --- MAIN GENERATION LOGIC ---

        if (mode === 'default') {
            // DEFAULT 5X LOGIC
            
            // 1. Strict Flat Lay (Uses Primary)
            setLoadingMessage("Generating Strict Flat Lay...");
            try {
                const res1 = await service.generateStrictFlatLay(originalB64, mimeType, 'strict');
                newGeneratedAssets.push({ 
                    id: `asset-strict-flat-${Date.now()}`, type: 'image', label: 'Strict Mode: Flat Lay',
                    originalFile: { name: 'strict-flatlay.png', type: res1.mimeType }, originalB64: res1.base64
                });
            } catch(e) { console.warn(e); }

            // 2. Strict 3D Mockup (Uses All References)
            setLoadingMessage("Generating Strict 3D Mockup...");
            try {
                const res2 = await service.generateStrict3DMockup(allAssetsB64, mimeType, 'strict');
                newGeneratedAssets.push({
                    id: `asset-strict-3d-${Date.now()}`, type: 'image', label: 'Strict Mode: 3D Mockup',
                    originalFile: { name: 'strict-mockup.png', type: res2.mimeType }, originalB64: res2.base64
                });
            } catch(e) { console.warn(e); }

            // 3. Flexible Studio Photo (Uses All References)
            setLoadingMessage("Generating Flexible Studio Photo...");
            try {
                const res3 = await service.generateFlexibleStudioPhoto(allAssetsB64, mimeType, 'flexible');
                newGeneratedAssets.push({
                    id: `asset-flex-photo-${Date.now()}`, type: 'image', label: 'Flexible Mode: Studio Photo',
                    originalFile: { name: 'flexible-photo.png', type: res3.mimeType }, originalB64: res3.base64
                });
            } catch(e) { console.warn(e); }

            // 4. Ecommerce Mockup (Uses All References)
            setLoadingMessage("Generating Ecommerce Mockup...");
            try {
                const res4 = await service.generateStrict3DMockup(allAssetsB64, mimeType, 'ecommerce');
                newGeneratedAssets.push({
                    id: `asset-ecom-mockup-${Date.now()}`, type: 'image', label: 'Ecommerce Mode: Mockup',
                    originalFile: { name: 'ecommerce-mockup.png', type: res4.mimeType }, originalB64: res4.base64
                });
            } catch(e) { console.warn(e); }

            // 5. Luxury Photo (Uses All References)
            setLoadingMessage("Generating Luxury Photo...");
            try {
                const res5 = await service.generateFlexibleStudioPhoto(allAssetsB64, mimeType, 'luxury');
                newGeneratedAssets.push({
                    id: `asset-luxury-photo-${Date.now()}`, type: 'image', label: 'Luxury Mode: Photo',
                    originalFile: { name: 'luxury-photo.png', type: res5.mimeType }, originalB64: res5.base64
                });
            } catch(e) { console.warn(e); }

            // 6. Complex Material Mockup (Uses All References)
            setLoadingMessage("Generating Complex Material Mockup...");
            try {
                const res6 = await service.generateStrict3DMockup(allAssetsB64, mimeType, 'complex');
                newGeneratedAssets.push({
                    id: `asset-complex-mockup-${Date.now()}`, type: 'image', label: 'Complex Mode: Mockup',
                    originalFile: { name: 'complex-mockup.png', type: res6.mimeType }, originalB64: res6.base64
                });
            } catch(e) { console.warn(e); }

            // 7. Video (Uses Primary)
            setLoadingMessage("Generating Animated Video...");
            try {
                const videoAsset = await handleVeoOperation(() => service.generateFlexibleVideo(originalB64, mimeType, 'default'));
                videoAsset.label = 'Default 5X: Video';
                newGeneratedAssets.push(videoAsset);
            } catch (e) { console.warn(e); }

        } else if (mode === 'strict') {
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
             // Specific modes (Ecommerce, Luxury, Complex)
             setLoadingMessage(`Generating ${mode} outputs...`);
             
             // Generate 1 Flat Lay
             try {
                 const res1 = await service.generateStrictFlatLay(originalB64, mimeType, mode);
                 newGeneratedAssets.push({
                    id: `asset-${mode}-flat-${Date.now()}`, type: 'image', label: `${mode}: Flat Lay`,
                    originalFile: { name: `${mode}-flat.png`, type: res1.mimeType }, originalB64: res1.base64
                 });
             } catch (e) { console.warn(e); }

             // Generate 1 Mockup (All refs)
             try {
                 const res2 = await service.generateStrict3DMockup(allAssetsB64, mimeType, mode);
                 newGeneratedAssets.push({
                    id: `asset-${mode}-mockup-${Date.now()}`, type: 'image', label: `${mode}: 3D Mockup`,
                    originalFile: { name: `${mode}-mockup.png`, type: res2.mimeType }, originalB64: res2.base64
                 });
             } catch (e) { console.warn(e); }

             // Generate 1 Studio Photo (All refs)
             try {
                 const res3 = await service.generateFlexibleStudioPhoto(allAssetsB64, mimeType, mode);
                 newGeneratedAssets.push({
                    id: `asset-${mode}-photo-${Date.now()}`, type: 'image', label: `${mode}: Studio Photo`,
                    originalFile: { name: `${mode}-photo.png`, type: res3.mimeType }, originalB64: res3.base64
                 });
             } catch (e) { console.warn(e); }
             
             // Generate 1 Video
             setLoadingMessage(`Generating ${mode} Video...`);
             try {
                 const videoAsset = await handleVeoOperation(() => service.generateFlexibleVideo(originalB64, mimeType, mode));
                 videoAsset.label = `${mode}: Video`;
                 newGeneratedAssets.push(videoAsset);
             } catch (e) { console.warn(e); }
        }

        if (newGeneratedAssets.length === 0) {
            throw new Error("Generation failed to produce any outputs. Please try again.");
        }

        setEditorState(prev => ({
            ...prev,
            generatedFlatLays: newGeneratedAssets,
            selectedFlatLays: [] 
        }));

    } catch (err: any) {
        console.error(err);
        const friendlyMsg = service.getFriendlyErrorMessage(err);
        setError(friendlyMsg);
        
        // Show key modal if specifically related to API key permissions
        if (friendlyMsg.includes("API Key")) {
             resetApiKeyStatus();
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleSelectFlatLay = (asset: Asset) => {
    setEditorState(prev => {
        const currentSelection = prev.selectedFlatLays || [];
        const isSelected = currentSelection.some(a => a.id === asset.id);
        
        let newSelection;
        if (isSelected) {
            newSelection = currentSelection.filter(a => a.id !== asset.id);
        } else {
            newSelection = [...currentSelection, asset];
        }
        return { ...prev, selectedFlatLays: newSelection };
    });
  };

  const handleNextStep = () => {
      if (editorState.selectedFlatLays.length > 0) {
          setEditorState(prev => ({ ...prev, currentStep: 'animate' }));
      } else {
          setError("Please select at least one image to proceed.");
      }
  };

  const handleApplyEdit = async (modifiedBase64: string, prompt: string) => {
      setIsEditorModalOpen(false);
      setIsLoading(true);
      setLoadingMessage("Applying your edits in 8K...");
      
      try {
          const result = await service.editImage(modifiedBase64, 'image/png', prompt);
          
          const newAsset: Asset = {
              id: `asset-${Date.now()}`,
              type: 'image',
              label: 'Edited Asset (8K)',
              originalFile: { name: 'edited-flatlay.png', type: result.mimeType },
              originalB64: result.base64,
          };

          setEditorState(prev => ({
              ...prev,
              generatedFlatLays: [newAsset, ...prev.generatedFlatLays],
              selectedFlatLays: [newAsset]
          }));
          setToastMessage("Edit applied successfully!");
      } catch (err: any) {
          setError(service.getFriendlyErrorMessage(err));
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleAnimate = async () => {
    if (editorState.selectedFlatLays.length === 0) return;
    
    const selectedAssets = editorState.selectedFlatLays;
    const primaryAsset = selectedAssets[0];
    
    const { preset, aspectRatio, customPrompt, generateStatic, generateVideo } = editorState.animationConfig;

    setIsLoading(true);
    setError(null);
    setIsSidebarOpen(false);

    try {
        const tasks = [];
        
        if (generateStatic) {
            tasks.push((async () => {
                setLoadingMessage("Generating 3D Static Mockup...");
                const base64Images = selectedAssets.map(a => a.originalB64);
                // Use generationMode from state to pass context
                const res = await service.generateStrict3DMockup(base64Images, primaryAsset.originalFile.type, editorState.generationMode);
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
                let prompt = "A short hyper realistic 3D mock up video. ";
                prompt += "CATEGORY ANALYSIS: IF CLOTHING -> Use INVISIBLE GHOST MANNEQUIN (Hollow form, floating, no visible body, show inside collar). IF ACCESSORY (Watch, Bag, Shoe) -> Display as floating 3D object (No mannequin). DO NOT morph accessories into clothing. ";
                prompt += "Video Requirements: Clean professional studio lighting, minimal seamless background. 4K visual detail. The product must move naturally. ";
                
                if (customPrompt) {
                  prompt += `The animation should show the product ${customPrompt}.`
                } else if (preset) {
                    const presetPrompts: Record<AnimationPreset, string> = {
                        '360 Spin': 'rotating slowly 360 degrees. Use smooth camera motion.',
                        'Walking': 'in a natural walking motion (if clothing) or dynamic float (if accessory).',
                        'Windy': 'with a strong wind effect (if fabric) or atmosphere (if rigid).',
                        'Jumping Jacks': 'moving dynamically (clothing only) or animated burst (accessory).',
                        'Arm Flex': 'moving in a flexing motion (clothing only) or structural flex (accessory).',
                        'Sleeve in Pocket': 'moving naturally (clothing only) or detail focus (accessory).'
                    };
                    prompt += presetPrompts[preset];
                }
                
                // Pass generator function
                const videoAsset = await handleVeoOperation(() => service.generateVideoFromImage(primaryAsset.originalB64, primaryAsset.originalFile.type, prompt, aspectRatio));
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
      const friendlyMsg = service.getFriendlyErrorMessage(err);
      setError(friendlyMsg);
      if (friendlyMsg.includes("API Key")) {
        resetApiKeyStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScene = async (scenePrompt: string) => {
    if (editorState.selectedFlatLays.length === 0) return;
    const primaryAsset = editorState.selectedFlatLays[0];
    const { preset, customPrompt, aspectRatio } = editorState.animationConfig;

    let animationDescription = "";
    if (customPrompt) {
        animationDescription = `doing the following action: ${customPrompt}`;
    } else if (preset) {
        const presetPrompts: Record<AnimationPreset, string> = {
            '360 Spin': 'rotating slowly 360 degrees',
            'Walking': 'in a natural walking motion',
            'Windy': 'with a strong wind effect',
            'Jumping Jacks': 'doing jumping jacks',
            'Arm Flex': 'flexing',
            'Sleeve in Pocket': 'placing a hand in pocket'
        };
        animationDescription = presetPrompts[preset];
    }
    
    const prompt = `A short hyper realistic 3D mock up video. 
    CATEGORY ANALYSIS: IF CLOTHING -> Use INVISIBLE GHOST MANNEQUIN (Hollow form, floating, no visible body). IF ACCESSORY -> Display as floating 3D object (No mannequin).
    Action: The product must move naturally ${animationDescription}.
    Scene Requirements: The scene is: ${scenePrompt}. Always center the product and keep it clearly readable.`;

    setIsLoading(true);
    setLoadingMessage("Placing your animation in a new scene...");
    try {
        // Pass generator function
        const videoAsset = await handleVeoOperation(() => service.generateVideoFromImage(primaryAsset.originalB64, primaryAsset.originalFile.type, prompt, aspectRatio));
        videoAsset.label = 'Scene Animation';
        setEditorState(prev => ({ ...prev, animatedMockup: videoAsset }));
    } catch (e: any) {
        setError(service.getFriendlyErrorMessage(e));
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
             return editorState.selectedFlatLays.length > 0 ? editorState.selectedFlatLays : [];
        default: return [];
    }
  };
  
  return (
    <div className="flex h-screen bg-surface-dark text-text overflow-hidden relative">
      {(isLoading || isSaving) && <Loader message={isSaving ? 'Saving project...' : loadingMessage} />}
      {isProjectsModalOpen && <ProjectsModal projects={projects} onLoad={handleLoadProject} onDelete={handleDeleteProject} onClose={() => setIsProjectsModalOpen(false)} />}
      {isSaveModalOpen && <SaveProjectModal projectName={currentProject?.name || ''} onSave={handleSaveProject} onClose={() => setIsSaveModalOpen(false)} />}
      
      {isEditorModalOpen && editorState.selectedFlatLays.length === 1 && (
          <ImageEditorModal 
            imageUrl={`data:${editorState.selectedFlatLays[0].originalFile.type};base64,${editorState.selectedFlatLays[0].originalB64}`} 
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
            onNextStep={handleNextStep}
        />
      </div>
      
      <main className="flex-1 flex flex-col p-0 md:p-0 bg-surface-DEFAULT w-full min-w-0">
        <header className="flex justify-between items-center p-4 border-b border-surface-light bg-surface-DEFAULT">
            <div className="flex items-center gap-4">
                <button 
                    className="md:hidden p-2 -ml-2 text-text hover:text-white transition-colors"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open workflow menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <img src="https://hfjhiwexlywppvuftjfu.supabase.co/storage/v1/object/public/Flowstate%203D%20Mock%20Up/98A2DE26-3B81-4646-BDF1-BDB932920CF7%202.png.PNG" alt="Company Logo" className="h-20 w-20" />
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                <Tooltip text="Undo (Ctrl+Z)">
                    <button onClick={undo} disabled={!canUndo} className="p-2 rounded-lg hover:bg-surface-light text-text-subtle hover:text-white disabled:text-text-subtle/30 disabled:hover:bg-transparent">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H13a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    </button>
                </Tooltip>
                <Tooltip text="Redo (Ctrl+Y)">
                    <button onClick={redo} disabled={!canRedo} className="p-2 rounded-lg hover:bg-surface-light text-text-subtle hover:text-white disabled:text-text-subtle/30 disabled:hover:bg-transparent">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H7a1 1 0 110-2h7.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </Tooltip>

                <div className="w-px h-6 bg-surface-light mx-2"></div>

                <Tooltip text="Save Project">
                    <button onClick={() => setIsSaveModalOpen(true)} className="p-2 rounded-lg hover:bg-surface-light text-text-subtle hover:text-white transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm3 0v4h4V4H8zm5 8H7v4h6v-4z" /></svg>
                    </button>
                </Tooltip>
                <Tooltip text="My Projects">
                    <button onClick={() => { loadProjects(); setIsProjectsModalOpen(true); }} className="p-2 rounded-lg hover:bg-surface-light text-text-subtle hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                    </button>
                </Tooltip>
            </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0 bg-surface-dark p-6">
            {error && (
                <div className="mb-4 p-4 bg-brand-red/10 text-brand-red border border-brand-red/20 rounded-lg flex justify-between items-center shadow-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                         </svg>
                         <span className="text-sm font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="font-bold text-lg hover:text-white transition-colors p-1 rounded hover:bg-brand-red/20">&times;</button>
                </div>
            )}
            <Canvas
                assets={getCanvasAssets()}
                step={editorState.currentStep}
                selectedAssetIds={editorState.selectedFlatLays.map(a => a.id)}
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