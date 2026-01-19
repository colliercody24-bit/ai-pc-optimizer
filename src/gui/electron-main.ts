import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { aiOptimizationAgent, aiService } from '../ai';
import { 
  systemUpdater, 
  driverManager, 
  performanceOptimizer, 
  fileSystemCleaner 
} from '../core';
import { formatBytes } from '../utils';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hiddenInset',
    frame: true,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for communication with renderer process

ipcMain.handle('analyze-system', async () => {
  try {
    const analysis = await aiOptimizationAgent.analyzeSystem();
    return { success: true, data: analysis };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('run-optimization', async () => {
  try {
    const result = await aiOptimizationAgent.runOptimizationCycle();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('get-system-metrics', async () => {
  try {
    const metrics = await performanceOptimizer.getSystemMetrics();
    return { success: true, data: metrics };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('get-processes', async () => {
  try {
    const result = await aiOptimizationAgent.analyzeProcesses();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('check-updates', async () => {
  try {
    const result = await systemUpdater.checkForUpdates();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('install-updates', async () => {
  try {
    const result = await systemUpdater.installUpdates();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('scan-drivers', async () => {
  try {
    const drivers = await driverManager.scanDrivers();
    return { success: true, data: drivers };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('check-driver-updates', async () => {
  try {
    const result = await driverManager.checkForDriverUpdates();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('get-gpu-info', async () => {
  try {
    const gpuDrivers = await driverManager.getGPUDrivers();
    return { success: true, data: gpuDrivers };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('scan-cleanup', async () => {
  try {
    const targets = await fileSystemCleaner.getCleanupTargets();
    return { success: true, data: targets };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('run-cleanup', async () => {
  try {
    const result = await fileSystemCleaner.runFullCleanup();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('empty-recycle-bin', async () => {
  try {
    const result = await fileSystemCleaner.emptyRecycleBin();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('optimize-performance', async () => {
  try {
    const results = await performanceOptimizer.runFullOptimization();
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('set-power-plan', async (_event, plan: 'balanced' | 'high-performance' | 'power-saver') => {
  try {
    const result = await performanceOptimizer.setPowerPlan(plan);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('format-bytes', (_event, bytes: number) => {
  return formatBytes(bytes);
});

// AI Provider IPC Handlers

ipcMain.handle('ai-get-provider-info', async () => {
  try {
    const info = aiService.getProviderInfo();
    const providerType = aiService.getProviderType();
    const isAvailable = await aiService.isAvailable();
    return { success: true, data: { ...info, providerType, isAvailable } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('ai-set-provider', async (_event, provider: string, options?: { apiKey?: string }) => {
  try {
    aiService.setProvider(provider as 'ollama' | 'gemini' | 'rule-based', options);
    const isAvailable = await aiService.isAvailable();
    return { success: true, data: { provider, isAvailable } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('ai-get-models', async () => {
  try {
    const models = await aiService.getAvailableModels();
    return { success: true, data: models };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('ai-chat', async (_event, message: string) => {
  try {
    const metrics = await performanceOptimizer.getSystemMetrics();
    const response = await aiService.chat(message, { metrics });
    return { success: response.success, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});
