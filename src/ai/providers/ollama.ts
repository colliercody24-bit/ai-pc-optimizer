import { BaseAIProvider, AIMessage, AIResponse } from './index';
import { logger } from '../../utils';

/**
 * Ollama Provider - Local AI models (completely free)
 * 
 * Ollama runs AI models locally on your machine.
 * No API key required, no usage limits, complete privacy.
 * 
 * Setup:
 * 1. Download Ollama from https://ollama.ai
 * 2. Install and run: ollama serve
 * 3. Pull a model: ollama pull llama2 (or mistral, codellama, etc.)
 * 4. Set AI_PROVIDER=ollama in .env
 */
export class OllamaProvider extends BaseAIProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;
  
  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2') {
    super();
    this.baseUrl = baseUrl;
    this.model = model;
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch {
      return [];
    }
  }
  
  async chat(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    try {
      // Add system prompt
      const fullMessages = [
        { role: 'system' as const, content: this.createSystemPrompt() },
        ...messages,
      ];
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: fullMessages,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 1024,
          },
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        content: data.message?.content || '',
        provider: this.name,
        model: this.model,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Ollama error: ${errorMessage}`);
      
      return {
        content: '',
        provider: this.name,
        model: this.model,
        success: false,
        error: errorMessage,
      };
    }
  }
  
  setModel(model: string): void {
    this.model = model;
  }
  
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}
