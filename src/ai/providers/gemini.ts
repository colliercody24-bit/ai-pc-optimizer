import { BaseAIProvider, AIMessage, AIResponse } from './index';
import { logger } from '../../utils';

/**
 * Google Gemini Provider - Cloud AI with generous free tier
 * 
 * Google Gemini offers powerful AI models with a free tier:
 * - 15 requests per minute (free)
 * - 1 million tokens per month (free)
 * 
 * Get your API key:
 * 1. Go to https://makersuite.google.com/app/apikey
 * 2. Create a new API key
 * 3. Set AI_PROVIDER=gemini and AI_API_KEY=your_key in .env
 * 
 * Pricing (if you exceed free tier):
 * - Gemini Pro: $0.00025 per 1K characters input, $0.0005 per 1K characters output
 * - See https://ai.google.dev/pricing for current pricing
 */
export class GeminiProvider extends BaseAIProvider {
  name = 'gemini';
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  
  constructor(apiKey: string, model: string = 'gemini-pro') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }
  
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(10000),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async getModels(): Promise<string[]> {
    if (!this.apiKey) {
      return [];
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.models
        ?.filter((m: { name: string }) => m.name.includes('gemini'))
        ?.map((m: { name: string }) => m.name.replace('models/', '')) || [];
    } catch {
      return [];
    }
  }
  
  async chat(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    if (!this.apiKey) {
      return {
        content: '',
        provider: this.name,
        model: this.model,
        success: false,
        error: 'API key not configured. Get your free API key at https://makersuite.google.com/app/apikey',
      };
    }
    
    try {
      // Convert messages to Gemini format
      const systemPrompt = this.createSystemPrompt();
      const contents = messages.map((msg, index) => {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        const isFirstUserMessage = msg.role === 'user' && index === 0;
        const text = isFirstUserMessage 
          ? `${systemPrompt}\n\nUser: ${msg.content}` 
          : msg.content;
        return { role, parts: [{ text }] };
      });
      
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options?.temperature ?? 0.7,
              maxOutputTokens: options?.maxTokens ?? 1024,
              topP: 0.95,
              topK: 40,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API error: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return {
        content,
        provider: this.name,
        model: this.model,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Gemini error: ${errorMessage}`);
      
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
  
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
