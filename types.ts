export interface User {
  id: string;
  email: string;
}

export type WorkflowStep = 'upload' | 'flatlay' | 'animate' | 'scene';

export type AnimationPreset = '360 Spin' | 'Walking' | 'Windy' | 'Jumping Jacks' | 'Arm Flex' | 'Sleeve in Pocket';
export type AspectRatio = '16:9' | '9:16';

export interface AnimationConfig {
  preset: AnimationPreset | null;
  aspectRatio: AspectRatio;
  customPrompt: string | null;
}

export interface EditorState {
  currentStep: WorkflowStep;
  uploadedAssets: Asset[];
  generatedFlatLays: Asset[];
  selectedFlatLay: Asset | null;
  animatedMockup: Asset | null;
  animationConfig: AnimationConfig;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  lastSaved: string;
  editorState: EditorState;
}

export interface Asset {
  id: string;
  type: 'image' | 'video';
  originalFile: { name: string; type: string; };
  originalB64: string;
  processedB64?: string;
  processedUrl?: string;
  prompt?: string;
}

export interface VeoGenerationMessages {
  [key: number]: string;
}

export interface GenerationResult {
    base64: string;
    mimeType: string;
}