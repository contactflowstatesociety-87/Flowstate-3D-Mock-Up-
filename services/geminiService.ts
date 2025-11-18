
import { GoogleGenAI } from "@google/genai";
import type { Operation, GenerateContentResponse, GenerateImagesResponse, GenerateVideosResponse } from "@google/genai";
import type { GenerationResult } from '../types';

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


export const generateFlatLayOptions = async (base64Image: string, mimeType: string): Promise<GenerationResult[]> => {
    const ai = getAiClient();

    // Step 1: Use a powerful text model to analyze the image and create a highly detailed description.
    // FIX: Explicitly type the response to avoid 'unknown' type from the generic withRetry function.
    const descriptionResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType: mimeType } },
                { text: "Analyze this image of a clothing item. Provide a detailed, photorealistic description suitable for a text-to-image AI generator. Focus meticulously on the garment's specific type (e.g., 'heavyweight cotton oversized t-shirt'), material, texture, exact colors (use specific shade names if possible), patterns, and any graphics, logos, or text. The goal is to create a prompt that can perfectly replicate this item." },
            ],
        },
    }));
    const detailedPrompt = descriptionResponse.text;
    
    // Step 2: Use the detailed description to generate 4 photorealistic flat lay images.
    const imageGenerationPrompt = `An ultra-high resolution 4K photo, top-down flat lay of the following clothing item: ${detailedPrompt}. The item must be perfectly flat on a clean, neutral light-gray studio background. The lighting should be soft and even, without harsh shadows, to showcase all details and textures accurately.`;

    // FIX: Explicitly type the response to avoid 'unknown' type from the generic withRetry function.
    const imageResponse: GenerateImagesResponse = await withRetry(() => ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: imageGenerationPrompt,
        config: {
            numberOfImages: 4,
            outputMimeType: 'image/png',
            aspectRatio: '1:1',
        },
    }));

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }
    
    return imageResponse.generatedImages.map(img => ({
        base64: img.image.imageBytes,
        mimeType: 'image/png'
    }));
};

// FIX: Update function to return Promise<Operation<GenerateVideosResponse>> to correctly type the video generation operation.
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

// FIX: Update function parameter and return type to Operation<GenerateVideosResponse> to correctly type the video generation operation.
export const checkVideoOperationStatus = async (operation: Operation<GenerateVideosResponse>): Promise<Operation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    return withRetry(() => ai.operations.getVideosOperation({ operation: operation }));
};
