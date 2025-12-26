
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { PlantData } from '../types';
import { blobToBase64 } from './imageUtils';
import { HARDCODED_GEMINI_KEY } from '../config';

// Helper to get the AI client dynamically
const getAiClient = () => {
    // Priority:
    // 1. System Environment Variable (process.env)
    // 2. Hardcoded Key (config.ts)
    // 3. Browser LocalStorage (Settings Tab)
    const apiKey = process.env.API_KEY || HARDCODED_GEMINI_KEY || localStorage.getItem('GOOGLE_API_KEY');
    
    if (!apiKey) {
        throw new Error("Google API Key missing. Please add it in Settings > API Configuration or in config.ts");
    }
    return new GoogleGenAI({ apiKey });
};

// Schema for structured plant identification
const plantSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Common name of the plant" },
    scientificName: { type: Type.STRING, description: "Scientific Latin name" },
    care: {
      type: Type.OBJECT,
      properties: {
        lifespan: { type: Type.STRING, description: "Lifespan type (e.g., Annual, Perennial, Biennial)" },
        water: { type: Type.STRING, description: "Watering frequency and detailed instructions" },
        light: { type: Type.STRING, description: "Light requirements (e.g., direct sun, shade)" },
        soil: { type: Type.STRING, description: "Soil type and pH preferences" },
        temperature: { type: Type.STRING, description: "Ideal temperature range and frost tolerance" },
        fertilizer: { type: Type.STRING, description: "Fertilizer type and frequency" },
        pruning: { type: Type.STRING, description: "When and how to prune" },
        pests: { type: Type.STRING, description: "Common pests/diseases and treatment" },
        toxicity: { type: Type.STRING, description: "Toxicity details for pets and humans" }
      },
      required: ["lifespan", "water", "light", "soil", "temperature", "fertilizer", "pruning", "pests", "toxicity"]
    }
  },
  required: ["name", "scientificName", "care"]
};

// Original Image-based Identification (Fallback)
export const identifyPlant = async (imageBlob: Blob): Promise<Partial<PlantData> | null> => {
  try {
    const ai = getAiClient();
    const base64Image = await blobToBase64(imageBlob);
    
    // Using gemini-2.0-flash for better stability and access
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Identify this plant and provide a comprehensive care guide." }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: plantSchema,
        systemInstruction: "You are an expert botanist. Identify the plant in the image accurately. If the image is not a plant, return generic fallback data but try your best to identify vegetation. Provide detailed, practical care instructions."
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Plant identification failed", error);
    throw error;
  }
};

// Text-based Care Guide (Used when PlantNet identifies the plant)
export const getPlantCare = async (plantName: string, imageContextBlob?: Blob): Promise<Partial<PlantData> | null> => {
  try {
     const ai = getAiClient();
     const parts: any[] = [{ text: `Provide a comprehensive care guide for the plant: ${plantName}. Use the image for context on its current health if provided.` }];
     
     if (imageContextBlob) {
         const base64Image = await blobToBase64(imageContextBlob);
         parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
     }

     const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts: parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: plantSchema,
        systemInstruction: `You are an expert botanist. The user has identified this plant as ${plantName}. Provide detailed, practical care instructions matching the requested JSON schema.`
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Care guide generation failed", error);
    throw error;
  }
}

export const analyzeLight = async (imageBlob: Blob): Promise<string> => {
  try {
    const ai = getAiClient();
    const base64Image = await blobToBase64(imageBlob);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Analyze the lighting conditions in this photo for gardening purposes. Is it direct sun, bright indirect light, medium light, or low light? Provide a 1-sentence summary." }
        ]
      }
    });
    return response.text || "Could not analyze light.";
  } catch (error) {
     console.error("Light analysis failed", error);
     return "Error analyzing light conditions. Please check your API Key.";
  }
}

export const chatWithBotanist = async (history: {role: string, parts: {text: string}[]}[], message: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const chat = ai.chats.create({
            model: 'gemini-2.0-flash',
            history: history,
            config: {
                systemInstruction: "You are a helpful, friendly, and knowledgeable gardening assistant named Evan. Keep answers concise and helpful for mobile users."
            }
        });

        const result = await chat.sendMessage({ message });
        return result.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
        console.error("Chat error", error);
        return "Sorry, I'm having trouble connecting to the garden network. Please check your API Key in Settings.";
    }
}

export const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Fenrir' }, 
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
        console.error("TTS failed", error);
        return null;
    }
}
