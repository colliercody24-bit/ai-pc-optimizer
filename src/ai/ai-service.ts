import { logger, config } from '../utils';
import { AIProvider, AIMessage, AIResponse, OllamaProvider, GeminiProvider } from './providers';
import { SystemMetrics } from '../core';

export type AIProviderType = 'ollama' | 'gemini' | 'rule-based';

export interface AIServiceConfig {
  provider: AIProviderType;
  apiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  geminiModel?: string;
}

/**
 * AI Service - Manages AI providers and generates intelligent recommendations
 */
export class AIService {
  private provider: AIProvider | null = null;
  private providerType: AIProviderType = 'rule-based';
  private isInitialized = false;
  
  constructor() {
    // Auto-initialize from config
    this.initializeFromConfig();
  }
  
  /**
   * Initialize from environment config
   */
  private initializeFromConfig(): void {
    const providerName = config.aiProvider?.toLowerCase() || 'rule-based';
    
    if (providerName === 'ollama') {
      this.setProvider('ollama', {
        ollamaUrl: config.ollamaUrl,
        ollamaModel: config.ollamaModel,
      });
    } else if (providerName === 'gemini' || providerName === 'google') {
      this.setProvider('gemini', {
        apiKey: config.aiApiKey,
        geminiModel: config.geminiModel,
      });
    } else {
      this.providerType = 'rule-based';
      this.isInitialized = true;
    }
  }
  
  /**
   * Set the AI provider
   */
  setProvider(type: AIProviderType, options?: Partial<AIServiceConfig>): void {
    this.providerType = type;
    
    switch (type) {
      case 'ollama':
        this.provider = new OllamaProvider(
          options?.ollamaUrl || 'http://localhost:11434',
          options?.ollamaModel || 'llama2'
        );
        break;
        
      case 'gemini':
        this.provider = new GeminiProvider(
          options?.apiKey || config.aiApiKey || '',
          options?.geminiModel || 'gemini-pro'
        );
        break;
        
      case 'rule-based':
      default:
        this.provider = null;
        break;
    }
    
    this.isInitialized = true;
    logger.info(`AI Service: Provider set to ${type}`);
  }
  
  /**
   * Get current provider type
   */
  getProviderType(): AIProviderType {
    return this.providerType;
  }
  
  /**
   * Check if AI provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.providerType === 'rule-based') {
      return true; // Rule-based is always available
    }
    
    if (!this.provider) {
      return false;
    }
    
    return this.provider.isAvailable();
  }
  
  /**
   * Get available models for current provider
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.provider || this.providerType === 'rule-based') {
      return [];
    }
    
    return this.provider.getModels();
  }
  
  /**
   * Generate AI-enhanced analysis summary
   */
  async generateAnalysisSummary(metrics: SystemMetrics, issues: string[]): Promise<string> {
    if (this.providerType === 'rule-based' || !this.provider) {
      return this.generateRuleBasedSummary(metrics, issues);
    }
    
    const prompt = `Analyze this PC's health and provide a brief, helpful summary:

System Metrics:
- CPU: ${metrics.cpu.name}, ${metrics.cpu.usage}% usage, ${metrics.cpu.cores} cores
- Memory: ${metrics.memory.usagePercent}% used (${Math.round(metrics.memory.used / 1024 / 1024 / 1024)}GB / ${Math.round(metrics.memory.total / 1024 / 1024 / 1024)}GB)
- Disk: ${metrics.disk.usagePercent}% used
- GPU: ${metrics.gpu?.name || 'Unknown'}

Detected Issues:
${issues.length > 0 ? issues.map(i => `- ${i}`).join('\n') : '- No major issues detected'}

Provide a 2-3 sentence summary of the system's health and one key recommendation. Be concise and actionable.`;

    const response = await this.provider.chat([
      { role: 'user', content: prompt }
    ]);
    
    if (response.success) {
      return response.content;
    }
    
    // Fallback to rule-based if AI fails
    logger.warn(`AI provider failed, using rule-based summary: ${response.error}`);
    return this.generateRuleBasedSummary(metrics, issues);
  }
  
  /**
   * Generate AI-enhanced recommendation explanation
   */
  async explainRecommendation(action: string, reason: string): Promise<string> {
    if (this.providerType === 'rule-based' || !this.provider) {
      return reason;
    }
    
    const prompt = `Explain this PC optimization recommendation in simple terms:

Action: ${action}
Technical Reason: ${reason}

Provide a brief, user-friendly explanation (2-3 sentences) that helps a non-technical user understand why this is important and what will happen.`;

    const response = await this.provider.chat([
      { role: 'user', content: prompt }
    ]);
    
    if (response.success) {
      return response.content;
    }
    
    return reason;
  }
  
  /**
   * Chat with AI about system optimization
   */
  async chat(userMessage: string, context?: { metrics?: SystemMetrics; history?: AIMessage[] }): Promise<AIResponse> {
    if (this.providerType === 'rule-based' || !this.provider) {
      return {
        content: 'AI chat requires Ollama or Gemini provider. Set AI_PROVIDER=ollama or AI_PROVIDER=gemini in your .env file.',
        provider: 'rule-based',
        model: 'none',
        success: false,
        error: 'Rule-based mode does not support chat',
      };
    }
    
    const messages: AIMessage[] = context?.history || [];
    
    // Add context about system if provided
    if (context?.metrics) {
      const contextMessage = `Current system state:
- CPU: ${context.metrics.cpu.usage}% usage
- Memory: ${context.metrics.memory.usagePercent}% used
- Disk: ${context.metrics.disk.usagePercent}% used`;
      
      messages.push({
        role: 'user',
        content: `[System Context: ${contextMessage}]\n\n${userMessage}`,
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }
    
    return this.provider.chat(messages);
  }
  
  /**
   * Rule-based summary generation (fallback)
   */
  private generateRuleBasedSummary(metrics: SystemMetrics, issues: string[]): string {
    const score = this.calculateHealthScore(metrics, issues);
    
    if (score >= 90) {
      return 'Your system is running optimally. All metrics are within healthy ranges.';
    } else if (score >= 70) {
      return `Your system is running well but could benefit from some optimizations. ${issues.length > 0 ? `Key issue: ${issues[0]}` : ''}`;
    } else if (score >= 50) {
      return `Your system needs attention. ${issues.length} issues detected that may affect performance.`;
    } else {
      return `Your system requires immediate attention. Multiple issues detected: ${issues.slice(0, 2).join(', ')}.`;
    }
  }
  
  /**
   * Calculate health score (rule-based)
   */
  private calculateHealthScore(metrics: SystemMetrics, issues: string[]): number {
    let score = 100;
    
    if (metrics.cpu.usage > 80) score -= 15;
    else if (metrics.cpu.usage > 60) score -= 5;
    
    if (metrics.memory.usagePercent > 85) score -= 15;
    else if (metrics.memory.usagePercent > 70) score -= 5;
    
    if (metrics.disk.usagePercent > 90) score -= 20;
    else if (metrics.disk.usagePercent > 75) score -= 10;
    
    score -= issues.length * 3;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Get provider info for display
   */
  getProviderInfo(): { name: string; description: string; setupUrl?: string } {
    switch (this.providerType) {
      case 'ollama':
        return {
          name: 'Ollama (Local)',
          description: 'Free, private AI running locally on your machine',
          setupUrl: 'https://ollama.ai',
        };
      case 'gemini':
        return {
          name: 'Google Gemini',
          description: 'Cloud AI with free tier (15 req/min, 1M tokens/month free)',
          setupUrl: 'https://makersuite.google.com/app/apikey',
        };
      default:
        return {
          name: 'Rule-Based',
          description: 'Built-in analysis using predefined rules (no AI required)',
        };
    }
  }
}

export default new AIService();
