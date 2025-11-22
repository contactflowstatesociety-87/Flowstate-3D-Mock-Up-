
import { GoogleGenAI, Modality } from "@google/genai";
import type { Operation, GenerateVideosResponse, GenerateContentResponse } from "@google/genai";
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
  default: "Mode Default5X. Use the full Flowstate Society 5X Generation Engine. You must generate one of each style (Strict, Flexible, Ecommerce, Luxury, Complex) to provide a full range of options.",
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
 * Generic function to transform images using Gemini 2.5 Flash Image.
 */
const transformImage = async (base64Images: string | string[], mimeType: string, prompt: string): Promise<GenerationResult> => {
    const ai = getAiClient();
    const images = Array.isArray(base64Images) ? base64Images : [base64Images];
    
    const parts = [];
    for (const b64 of images) {
        if (!b64) continue; // Skip empty strings
        parts.push({ inlineData: { data: b64, mimeType: mimeType } });
    }
    parts.push({ text: prompt });

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: parts,
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
    // Kept for backward compatibility
    const prompt = "Create a professional studio flat lay of this clothing item on a clean, neutral light-gray background. Strictly preserve the exact original product details, logos, colors, and fabric texture. Do not alter the design of the garment. High resolution, photorealistic, soft studio lighting.";
    try {
        const result = await transformImage(base64Image, mimeType, prompt);
        return [result];
    } catch (error) {
        throw new Error("Flat lay generation failed.");
    }
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
    const prompt = "A hyper-realistic 3D studio photography mock up of this product. CATEGORY DETECTION: If Clothing -> Use INVISIBLE GHOST MANNEQUIN (Hollow form, floating, no visible body). If Accessory (Watch, Bag, Shoe) -> Show as floating 3D object (No mannequin). High detail.";
    return transformImage(base64Image, mimeType, prompt);
};

// --- 4X GENERATION ENGINE FUNCTIONS (UPDATED FOR 5X DEFAULT) ---

export const generateStrictFlatLay = async (base64Image: string, mimeType: string, mode: GenerationMode): Promise<GenerationResult> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 1 & 2: STRICT MODE FLAT LAY
Generate an ULTRA-HIGH RESOLUTION 8K studio flat lay of this product.
Rules:
- Extract Product Truth File from image.
- Preserve exact silhouette, logo placement, stitching, and fabric texture.
- CRITICAL: EXACT COPY REQUIRED. DO NOT CHANGE LOGO, TEXT, OR COLORS.
- Use clean light gray to white gradient studio background.
- Soft, balanced, diffused lighting.
- No creative angles. Straight down.
- Pixel perfect accuracy to the original.
- Remove all original background imperfections.`;
    return transformImage(base64Image, mimeType, prompt);
};

export const generateStrict3DMockup = async (base64Images: string | string[], mimeType: string, mode: GenerationMode): Promise<GenerationResult> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 2: STRICT MODE 3D MOCKUP
Generate an ULTRA-HIGH RESOLUTION 8K 3D studio mockup photo.

CATEGORY ANALYSIS & RULES:
1. IF CLOTHING (Jacket, Hoodie, Shirt, Pants):
   - Use INVISIBLE GHOST MANNEQUIN.
   - The clothing must look like it is floating in mid-air.
   - Hollow clothing form. NO VISIBLE MANNEQUIN. NO CLEAR OR GLASS MANNEQUIN. NO BODY PARTS VISIBLE.
   - Show the inside of the collar/neck area if applicable.
   - Clothing must hang naturally with realistic physics.

2. IF ACCESSORY / HARD GOODS (Watch, Bag, Shoe, Hat, Bottle):
   - Display as a floating 3D product object.
   - CRITICAL: PRESERVE EXACT DIAL DETAILS, MARKERS, HANDS, AND BRANDING.
   - DO NOT REBRAND. DO NOT ALTER COLORS.
   - DO NOT use a mannequin. DO NOT morph into clothing.
   - Maintain rigid or semi-rigid structure appropriate for the material.
   - Center in frame, floating in mid-air.

UNIVERSAL RULES:
- Preserve all original product details (logos, colors, seams). DO NOT COMPROMISE LOGOS.
- Lighting: Soft diffused studio light, no harsh contrast.
- Background: Clean studio gray/white.
- Camera: Centered, 50-85mm lens equivalent.`;
    return transformImage(base64Images, mimeType, prompt);
};

export const generateFlexibleStudioPhoto = async (base64Images: string | string[], mimeType: string, mode: GenerationMode): Promise<GenerationResult> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 3: FLEXIBLE MODE STUDIO PHOTO
Generate a Premium Enhanced 8K Studio Photo.

CATEGORY ANALYSIS:
- IF CLOTHING: Use INVISIBLE GHOST MANNEQUIN. Floating in mid-air. Hollow form. NO CLEAR OR GLASS MANNEQUIN.
- IF ACCESSORY/WATCH/BAG: Display as floating 3D product. DO NOT morph into clothing.
  - CRITICAL: EXACT REPLICA OF DIAL, LOGO, AND TEXTURE REQUIRED.

Rules:
- Maintain product accuracy (colors, logos, details). DO NOT COMPROMISE LOGOS.
- Allow creative lighting (rim lights, gradients, dramatic shadows).
- Allow creative background (dark, textured, or soft commercial backdrop).
- Camera angle can be slightly more dynamic.
- Enhance fabric/material microtexture and realism.
- Look like a high-end commercial campaign.`;
    return transformImage(base64Images, mimeType, prompt);
};

export const generateFlexibleVideo = async (base64Image: string, mimeType: string, mode: GenerationMode): Promise<Operation<GenerateVideosResponse>> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 3: FLEXIBLE MODE 3D ANIMATED VIDEO
Generate a 4K 3D animated mockup video.

CATEGORY ANALYSIS & RULES (CRITICAL):
1. IF CLOTHING (Jacket, Shirt, Hoodie):
   - Use INVISIBLE GHOST MANNEQUIN.
   - Hollow clothing form. NO VISIBLE MANNEQUIN. NO BODY PARTS.
   - Show inside of collar.
   - Fabric moves with gentle breeze or breathing motion.

2. IF ACCESSORY (Watch, Bag, Shoe):
   - Display as a 3D object floating in mid-air.
   - CRITICAL: EXACT COPY OF ORIGINAL PRODUCT. DO NOT CHANGE LOGO.
   - PRESERVE WATCH FACES, DIALS, AND TEXT EXACTLY.
   - DO NOT morph into clothing.
   - DO NOT use a mannequin.
   - Rigid/Semi-rigid motion (slow float, rotation).

UNIVERSAL RULES:
- SILENT VIDEO. NO AUDIO TRACK.
- Maintain 100% product design accuracy. DO NOT COMPROMISE LOGOS.
- Clean professional studio lighting.
- Smooth camera motion (slow orbit or gentle push in).
- Output must be professional, hyper realistic, ecommerce grade.`;

    const ai = getAiClient();
    
    return ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        image: {
            imageBytes: base64Image,
            mimeType: mimeType,
        },
        prompt: prompt,
        config: {
             numberOfVideos: 1,
             resolution: '1080p', // Enforce 1080p or higher
             aspectRatio: '9:16'
        }
    });
};

export const generateVideoFromImage = async (base64Image: string, mimeType: string, prompt: string, aspectRatio: '16:9' | '9:16'): Promise<Operation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    
    // Append safety checks to user/system prompt
    const safePrompt = `${prompt} 
    CRITICAL: 
    1. EXACT COPY OF PRODUCT. DO NOT CHANGE LOGOS, COLORS, OR TEXT. 
    2. IF WATCH/ACCESSORY: PRESERVE DIAL AND HANDS EXACTLY. DO NOT MORPH INTO CLOTHING.
    3. SILENT VIDEO. NO AUDIO TRACK.`;

    // Ensure resolution is high
    const config = {
        numberOfVideos: 1,
        resolution: '1080p', // Enforce 1080p
        aspectRatio: aspectRatio
    };

    return ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        image: {
            imageBytes: base64Image,
            mimeType: mimeType,
        },
        prompt: safePrompt,
        config: config
    });
};

export const checkVideoOperationStatus = async (operation: Operation<GenerateVideosResponse>): Promise<Operation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    return ai.operations.getVideosOperation({ operation });
};
