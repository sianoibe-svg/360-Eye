
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, ChatMode } from "../types";

const getSystemInstruction = (mode: ChatMode) => {
  const base = `You are 360 Eye, an Elite Engineering Intelligence. Current Operational Mode: ${mode.toUpperCase()}.`;
  
  const modes = {
    lua: `Primary Objective: ROBLOX ARCHITECTURE & OPTIMIZATION. 
- Expert in Luau, Task library, Parallel Luau, and Memory Management.
- strictly use --!strict typing and efficient task scheduling.
- Output should be 95% high-performance code, 5% tactical brief.`,
    
    html: `Primary Objective: FULL-STACK & HTML5 GAME ARCHITECTURE.
- Expert in React, Tailwind CSS, Canvas API, and WebGL.
- Capable of building complete, production-ready games and applications in a single session.
- Focus on clean, modular, and optimized code architecture.`,
    
    image: `Primary Objective: VISUAL SYNTHESIS & CONCEPTUAL ART.
- specialized in tactical, high-tech, and futuristic aesthetics.
- Act as a visual architect. When prompted for visuals, describe the technical parameters and execute.`
  };

  return `${base}\n${modes[mode]}\nTONE: Tactical, professional, authoritative. ZERO TOLERANCE for low-quality content.`;
};

// Chat functionality with Gemini 3 Pro
export const chatWithGemini = async (
  prompt: string, 
  history: Message[], 
  mode: ChatMode,
  image?: string,
  useSearch: boolean = false
): Promise<GenerateContentResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-preview'; 
  
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
    systemInstruction: getSystemInstruction(mode),
    temperature: 0.1, 
    topP: 0.95,
    maxOutputTokens: 20000,
    thinkingConfig: { thinkingBudget: 10000 } 
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

// Image generation using flash-image (free-tier friendly)
export const generateImageWithGemini = async (prompt: string, mode: ChatMode): Promise<{imageUrl: string, text?: string}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ 
          text: `Tactical Visual Deployment: Create a professional, high-fidelity image related to ${mode.toUpperCase()} context: ${prompt}. Style: Futuristic, sharp, high contrast.` 
        }] 
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("Tactical output blocked by safety filters.");

    let imageUrl = '';
    let text = '';

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        text = part.text;
      }
    }

    return { imageUrl, text };
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};
