
export interface User {
  id: string;
  email: string;
}

export type WorkflowStep = 'upload' | 'flatlay' | 'animate' | 'scene';

export type AnimationPreset = '360 Spin' | 'Walking' | 'Windy' | 'Jumping Jacks' | 'Arm Flex' | 'Sleeve in Pocket';
export type AspectRatio = '16:9' | '9:16';

export type GenerationMode = 'default' | 'strict' | 'flexible' | 'ecommerce' | 'luxury' | 'complex';

export interface AnimationConfig {
  preset: AnimationPreset | null;
  aspectRatio: AspectRatio;
  customPrompt: string | null;
  generateStatic: boolean;
  generateVideo: boolean;
}

export interface EditorState {
  currentStep: WorkflowStep;
  generationMode: GenerationMode;
  uploadedAssets: Asset[];
  generatedFlatLays: Asset[];
  selectedFlatLays: Asset[]; // Changed from single Asset | null to Asset[]
  staticMockup: Asset | null;
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
  label?: string;
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
