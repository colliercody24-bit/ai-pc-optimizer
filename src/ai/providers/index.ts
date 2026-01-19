import { logger } from '../../utils';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  success: boolean;
  error?: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  chat(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse>;
  getModels(): Promise<string[]>;
}

/**
 * Base class for AI providers
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  
  abstract isAvailable(): Promise<boolean>;
  abstract chat(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse>;
  abstract getModels(): Promise<string[]>;
  
  protected createSystemPrompt(): string {
    return `You are an AI assistant for PC optimization. You help users understand their system's health and provide recommendations for improving performance. Be concise and actionable in your responses. Focus on:
- System performance optimization
- Driver and update management
- Disk cleanup and storage optimization
- Memory and CPU usage optimization
- Security best practices`;
  }
}

export { OllamaProvider } from './ollama';
export { GeminiProvider } from './gemini';
