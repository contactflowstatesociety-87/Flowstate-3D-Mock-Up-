
import { GoogleGenAI, Modality } from "@google/genai";
import type { Operation, GenerateVideosResponse } from "@google/genai";
import type { GenerationResult, GenerationMode } from '../types';

// This function will be called before every API call to ensure the latest key is used.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Add a retry utility for transient API errors
const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 2000 // Start with 2 seconds
): Promise<T> => {
  let attempts = 0;
  let delay = initialDelay;

  while (attempts < maxRetries) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempts++;
      const errorMessage = (error.message || error.toString()).toLowerCase();
      const isRetryable = errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('overloaded');

      if (isRetryable && attempts < maxRetries) {
        console.warn(`API call failed with transient error, retrying in ${delay}ms... (Attempt ${attempts}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Re-throw if not a retryable error or max retries are reached
      }
    }
  }
  // This line is for TypeScript's benefit; the loop will always throw or return.
  throw new Error('Exhausted all retries.');
};

const modeHeaderMap: Record<string, string> = {
  default: "Mode Default4X. Use the full Flowstate Society 4X Generation Engine that produces 2 strict outputs and 2 flexible outputs.",
  strict: "Mode Strict. Activate Strict Only Mode. Generate only strict outputs with locked lighting, locked camera, and zero creative variation.",
  flexible: "Mode Flexible. Activate Flexible Only Mode. Generate only flexible premium creative outputs while keeping product details accurate.",
  ecommerce: "Mode Ecommerce. Activate Ecommerce Optimized Mode for clean white or light gray backgrounds and marketplace ready outputs.",
  luxury: "Mode Luxury. Activate Luxury Brand Advertising Mode with cinematic lighting and premium commercial style while preserving product accuracy.",
  complex: "Mode ComplexMaterial. Activate Complex Material Mode for highly accurate soft shell, down, fleece, nylon, leather, and other technical fabrics."
};

const getModeHeader = (mode: GenerationMode) => {
    return modeHeaderMap[mode] || modeHeaderMap['default'];
};


/**
 * Generic function to transform an image using Gemini 2.5 Flash Image.
 * Used for Flat Lays, Editing, and Static Mockups.
 */
const transformImage = async (base64Image: string, mimeType: string, prompt: string): Promise<GenerationResult> => {
    const ai = getAiClient();
    const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    }));

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part && part.inlineData && part.inlineData.data) {
        return {
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
        };
    }
    throw new Error("No image generated.");
};


export const generateFlatLayOptions = async (base64Image: string, mimeType: string): Promise<GenerationResult[]> => {
    // Kept for backward compatibility or generic use if needed, but primary logic uses specific functions below
    const prompt = "Create a professional studio flat lay of this clothing item on a clean, neutral light-gray background. Strictly preserve the exact original product details, logos, colors, and fabric texture. Do not alter the design of the garment. High resolution, photorealistic, soft studio lighting.";

    const results: GenerationResult[] = [];
    try {
        const result = await transformImage(base64Image, mimeType, prompt);
        results.push(result);
    } catch (error) {
        console.warn(`Flat lay generation failed`, error);
    }
    
    if (results.length === 0) {
        throw new Error("Flat lay generation failed. Please try again.");
    }
    
    return results;
};

export const editImage = async (base64Image: string, mimeType: string, userPrompt: string): Promise<GenerationResult> => {
    const prompt = `Edit this image based on the following instruction: "${userPrompt}". 
    Maintain the highest quality and resolution. 
    If there are specific markup lines or colors drawn on the image, use them as a guide for the edit, then remove the markup lines in the final output. 
    Preserve all other details of the product exactly as they are.`;

    return transformImage(base64Image, mimeType, prompt);
};

export const generateStaticMockup = async (base64Image: string, mimeType: string): Promise<GenerationResult> => {
     // Kept for backward compatibility
    const prompt = "A hyper-realistic 3D studio photography mock up of this clothing item. Use INVISIBLE GHOST MANNEQUIN. The clothing must look like it is floating in mid-air. Hollow clothing form. No visible mannequin. No clear or glass mannequin. No body parts visible. High detail.";
    return transformImage(base64Image, mimeType, prompt);
};

// --- 4X GENERATION ENGINE FUNCTIONS ---

export const generateStrictFlatLay = async (base64Image: string, mimeType: string, mode: GenerationMode): Promise<GenerationResult> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 1 & 2: STRICT MODE FLAT LAY
Generate a 4K studio flat lay of this product.
Rules:
- Extract Product Truth File from image.
- Preserve exact silhouette, logo placement, stitching, and fabric texture.
- Use clean light gray to white gradient studio background.
- Soft, balanced, diffused lighting.
- No creative angles. Straight down.
- Pixel perfect accuracy to the original.
- Remove all original background imperfections.`;
    return transformImage(base64Image, mimeType, prompt);
};

export const generateStrict3DMockup = async (base64Image: string, mimeType: string, mode: GenerationMode): Promise<GenerationResult> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 2: STRICT MODE 3D MOCKUP
Generate a 4K 3D studio mockup photo.
Rules:
- Use INVISIBLE GHOST MANNEQUIN.
- The clothing must look like it is floating in mid-air.
- Hollow clothing form. No visible mannequin. No clear or glass mannequin. No body parts visible.
- Show the inside of the collar/neck area if applicable.
- Clothing must hang naturally with realistic physics (as if on a broad-shouldered male form, but the form is absent).
- Preserve all original product details (logos, colors, seams).
- Lighting: Soft diffused studio light, no harsh contrast.
- Background: Clean studio gray/white.
- Camera: Centered, 50-85mm lens equivalent.`;
    return transformImage(base64Image, mimeType, prompt);
};

export const generateFlexibleStudioPhoto = async (base64Image: string, mimeType: string, mode: GenerationMode): Promise<GenerationResult> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 3: FLEXIBLE MODE STUDIO PHOTO
Generate a Premium Enhanced 4K Studio Photo.
Rules:
- Use INVISIBLE GHOST MANNEQUIN. Floating in mid-air. Hollow form.
- Maintain product accuracy (colors, logos, details).
- Allow creative lighting (rim lights, gradients, dramatic shadows).
- Allow creative background (dark, textured, or soft commercial backdrop).
- Camera angle can be slightly more dynamic.
- Enhance fabric microtexture and realism.
- Look like a high-end commercial campaign.`;
    return transformImage(base64Image, mimeType, prompt);
};

export const generateFlexibleVideo = async (base64Image: string, mimeType: string, mode: GenerationMode): Promise<Operation<GenerateVideosResponse>> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 3: FLEXIBLE MODE 3D ANIMATED VIDEO
Generate a 4K 3D animated mockup video.
Rules:
- Use INVISIBLE GHOST MANNEQUIN.
- The clothing must look like it is floating in mid-air.
- Hollow clothing form. No visible mannequin. No clear or glass mannequin. No body parts visible.
- Cloth must move naturally with realistic physics (broad shoulders, squared torso implied by drape).
- Maintain 100% product design accuracy.
- Motion: Smooth cinematic camera motion (slow orbit or push in).
- Micro-motions: Gentle breeze or breathing effect.
- Lighting: Premium cinematic studio lighting.
- Output must be hyper-realistic 4K quality.`;

    const ai = getAiClient();
    return withRetry(() => ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: {
            imageBytes: base64Image,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '9:16', // Defaulting to portrait for social/mobile
        }
    }));
};


export const generateVideoFromImage = async (base64Image: string, mimeType: string, prompt: string, aspectRatio: '16:9' | '9:16'): Promise<Operation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    return withRetry(() => ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: {
            imageBytes: base64Image,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio,
        }
    }));
};

export const checkVideoOperationStatus = async (operation: Operation<GenerateVideosResponse>): Promise<Operation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    return withRetry(() => ai.operations.getVideosOperation({ operation: operation }));
};
