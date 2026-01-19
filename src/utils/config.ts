import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export interface AppConfig {
  logLevel: string;
  enableAutoUpdates: boolean;
  enableDriverUpdates: boolean;
  enablePerformanceOptimization: boolean;
  enableFileSystemCleanup: boolean;
  scanIntervalMinutes: number;
  cleanupPaths: string[];
  tempFileMaxAgeDays: number;
  // AI Configuration
  aiProvider: string;
  aiApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  geminiModel: string;
}

const config: AppConfig = {
  logLevel: process.env.LOG_LEVEL || 'info',
  enableAutoUpdates: process.env.ENABLE_AUTO_UPDATES !== 'false',
  enableDriverUpdates: process.env.ENABLE_DRIVER_UPDATES !== 'false',
  enablePerformanceOptimization: process.env.ENABLE_PERFORMANCE_OPTIMIZATION !== 'false',
  enableFileSystemCleanup: process.env.ENABLE_FILE_SYSTEM_CLEANUP !== 'false',
  scanIntervalMinutes: parseInt(process.env.SCAN_INTERVAL_MINUTES || '60', 10),
  cleanupPaths: (process.env.CLEANUP_PATHS || '').split(',').filter(Boolean),
  tempFileMaxAgeDays: parseInt(process.env.TEMP_FILE_MAX_AGE_DAYS || '7', 10),
  // AI Configuration
  aiProvider: process.env.AI_PROVIDER || 'rule-based',
  aiApiKey: process.env.AI_API_KEY || '',
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama2',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-pro',
};

export default config;
