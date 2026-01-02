
export type Role = 'user' | 'assistant';
export type ChatMode = 'lua' | 'html' | 'image';

// Grounding chunk interface updated to handle optional properties from Gemini API
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
  };
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  image?: string;
  groundingLinks?: GroundingChunk[];
}

export interface ChatSession {
  id: string;
  title: string;
  mode: ChatMode;
  messages: Message[];
  createdAt: number;
}

export interface UserProfile {
  firstName: string;
  email: string;
  birthDate: string;
}

export enum AppTab {
  CHAT = 'chat',
  VISION = 'vision'
}
