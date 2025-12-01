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

export const getFriendlyErrorMessage = (error: any): string => {
  const msg = (error.message || error.toString()).toLowerCase();
  
  if (msg.includes('api key') || msg.includes('403') || msg.includes('requested entity was not found')) {
    return "API Key Error: Access denied. Please ensure you have selected a valid paid API key in the settings.";
  }
  if (msg.includes('safety') || msg.includes('blocked') || msg.includes('policy')) {
    return "Content Blocked: The AI safety filters blocked this request. Please try a different image or a milder prompt.";
  }
  if (msg.includes('quota') || msg.includes('429')) {
    return "Quota Exceeded: You have hit the API rate limit. Please wait a moment or check your Google Cloud billing.";
  }
  if (msg.includes('503') || msg.includes('overloaded')) {
    return "Service Overloaded: Google's AI servers are currently experiencing high traffic. Please try again in a moment.";
  }
  if (msg.includes('400') || msg.includes('invalid_argument')) {
    return "Invalid Input: The image format or size might be unsupported. Please ensure you are using a standard PNG or JPEG under 20MB.";
  }
  if (msg.includes('candidate')) { // Often "No candidate was returned"
    return "Generation Failed: The model couldn't generate a valid result for this input. Please try a different image.";
  }
  
  return `An unexpected error occurred: ${error.message || "Unknown error"}`;
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
    throw new Error("No candidate was returned from the model.");
};


export const generateFlatLayOptions = async (base64Image: string, mimeType: string): Promise<GenerationResult[]> => {
    // Kept for backward compatibility
    const prompt = "Create a professional studio flat lay of this clothing item on a clean, neutral light-gray background. Strictly preserve the exact original product details, logos, colors, and fabric texture. Do not alter the design of the garment. High resolution, photorealistic, soft studio lighting.";
    try {
        const result = await transformImage(base64Image, mimeType, prompt);
        return [result];
    } catch (error) {
        throw error;
    }
};

export const editImage = async (base64Image: string, mimeType: string, userPrompt: string): Promise<GenerationResult> => {
    // Enhanced prompt for cleaner editing and higher perceived resolution
    const prompt = `INSTRUCT-EDIT: Perform the following edit on the image: "${userPrompt}".
    RULES:
    1. RESOLUTION & CLARITY: Output must be 8K Ultra-High Definition. 
    2. MARKUP: If there are colored lines/markup drawn on the input, treat them ONLY as a guide for where to apply the edit. YOU MUST REMOVE THE MARKUP LINES COMPLETELY in the final result.
    3. STRICT FIDELITY: Preserve 100% of the original image details (fabric grain, lighting, shadows, logos, stitching) outside of the marked/edited area. Do not hallucinate new details or change the product unless asked.
    4. QUALITY: Photorealistic, commercial grade, no artifacts.
    5. LOGO PROTECTION: DO NOT ALTER TEXT OR LOGOS.`;

    return transformImage(base64Image, mimeType, prompt);
};

export const generateStaticMockup = async (base64Image: string, mimeType: string): Promise<GenerationResult> => {
     // Kept for backward compatibility
    const prompt = "A hyper-realistic 3D studio photography mock up of this product. CATEGORY DETECTION: If Clothing -> Use INVISIBLE GHOST MANNEQUIN (Hollow form, floating, no visible body). If Accessory (Watch, Bag, Shoe) -> Show as floating 3D object (No mannequin). High detail. PRESERVE LOGOS.";
    return transformImage(base64Image, mimeType, prompt);
};

// --- 4X GENERATION ENGINE FUNCTIONS (UPDATED FOR 5X DEFAULT) ---

export const generateStrictFlatLay = async (base64Image: string, mimeType: string, mode: GenerationMode): Promise<GenerationResult> => {
    const header = getModeHeader(mode);
    const prompt = `${header}

PHASE 1 & 2: STRICT MODE FLAT LAY
Generate an ULTRA-HIGH RESOLUTION 8K studio flat lay of this product.

QUALITY PROTOCOL:
- UPSCALING: Render at max texture resolution (6K+).
- SHARPNESS: Enhance fabric grain, stitching, and hardware details.
- LOGO PROTECTION: FREEZE all logo pixels. Do not blur, warp, or change spelling.

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
INPUT CONTEXT: Use the primary image and any provided reference images to construct a perfect 360 understanding of the product.

QUALITY PROTOCOL:
- UPSCALING: Render at 8K resolution.
- TEXTURE: Hyper-realistic fabric weave and material properties.
- LOGO PRESERVATION: 100% ACCURACY. NO DISTORTION.

CATEGORY ANALYSIS & RULES:
1. IF CLOTHING (Jacket, Hoodie, Shirt, Pants):
   - TRANSFORM GEOMETRY: Convert flat lay input into a VOLUMETRIC 3D FORM.
   - INFLATE THE GARMENT: It must look like it is worn by an invisible body. Sleeves must be round and filled, not flat.
   - PERSPECTIVE SHIFT: Change view from Top-Down to STRAIGHT-ON EYE-LEVEL.
   - GHOST MANNEQUIN EFFECT: Create a deep 3D cavity at the neck/collar area. Show the inside back label to prove depth.
   - NO VISIBLE MANNEQUIN. NO CLEAR OR GLASS MANNEQUIN. NO BODY PARTS VISIBLE.
   - Gravity and Drapery: Fabric must hang naturally from the invisible shoulders.
   - MATERIAL PHYSICS: Maintain 100% accurate fabric texture, grain, and stiffness.

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
INPUT CONTEXT: Use all provided images to ensure 3D accuracy from all angles.

QUALITY PROTOCOL:
- RESOLUTION: 8K. Maximize detail in shadows and highlights.
- LOGOS: Absolute preservation.

CATEGORY ANALYSIS:
- IF CLOTHING: Use INVISIBLE GHOST MANNEQUIN. 
  - TRANSFORM GEOMETRY: Inflate the garment to look filled and worn.
  - VOLUMETRIC DEPTH: Sleeves and torso must be cylindrical and full, never flat.
  - HOLLOW FORM: Show the inside neck/collar details.
  - NO VISIBLE MANNEQUIN. NO CLEAR OR GLASS MANNEQUIN.
- IF ACCESSORY/WATCH/BAG: Display as floating 3D product. DO NOT morph into clothing.
  - CRITICAL: EXACT REPLICA OF DIAL, LOGO, AND TEXTURE REQUIRED.

Rules:
- Maintain product accuracy (colors, logos, details, fabric texture). DO NOT COMPROMISE LOGOS.
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

QUALITY PROTOCOL:
- RENDER: 4K VISUAL FIDELITY.
- DETAILS: Upscale fabric textures.
- LOGOS: FREEZE and PROTECT branding.

CATEGORY ANALYSIS & RULES (CRITICAL):
1. IF CLOTHING (Jacket, Shirt, Hoodie):
   - Use INVISIBLE GHOST MANNEQUIN.
   - INFLATE THE GARMENT. It must look worn and volumetric.
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
             resolution: '1080p', // Enforce 1080p minimum, model attempts higher detail based on prompt
             aspectRatio: '9:16'
        }
    });
};

export const generateVideoFromImage = async (base64Image: string, mimeType: string, prompt: string, aspectRatio: '16:9' | '9:16'): Promise<Operation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    
    // Append safety checks to user/system prompt
    const safePrompt = `${prompt} 
    CRITICAL QUALITY CONTROL: 
    1. EXACT COPY OF PRODUCT. DO NOT CHANGE LOGOS, COLORS, OR TEXT. 
    2. VISUAL QUALITY: 4K TEXTURE DETAIL. UPSCALED.
    3. IF WATCH/ACCESSORY: PRESERVE DIAL AND HANDS EXACTLY. DO NOT MORPH INTO CLOTHING.
    4. SILENT VIDEO. NO AUDIO TRACK.`;

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