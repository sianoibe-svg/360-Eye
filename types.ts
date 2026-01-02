
export type Role = 'user' | 'assistant';

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
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
