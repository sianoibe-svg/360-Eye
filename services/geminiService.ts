
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message } from "../types";

export const chatWithGemini = async (
  prompt: string, 
  history: Message[], 
  image?: string,
  useSearch: boolean = false
): Promise<GenerateContentResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const modelName = 'gemini-3-pro-preview'; 
  
  const systemInstruction = `You are 360 Eye, an elite AI assistant with profound expertise in video games across all platforms (PC, Console, Mobile, Retro). 
You possess deep knowledge of game mechanics, lore, industry history, competitive metas, hardware specs, and development insights. 
When asked about games, provide detailed, accurate, and passionate responses. 
For other tasks, remain a highly capable, multi-modal assistant. 
Always be concise but thorough.`;

  const contents: any[] = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const currentParts: any[] = [{ text: prompt }];
  
  if (image) {
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1];
    currentParts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    });
  }

  contents.push({ role: 'user', parts: currentParts });

  const config: any = {
    systemInstruction,
    temperature: 0.8,
    topP: 0.95,
  };

  if (useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  return await ai.models.generateContent({
    model: modelName,
    contents,
    config
  });
};
