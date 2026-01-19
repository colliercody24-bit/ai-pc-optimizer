import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // System Analysis
  analyzeSystem: () => ipcRenderer.invoke('analyze-system'),
  runOptimization: () => ipcRenderer.invoke('run-optimization'),
  getSystemMetrics: () => ipcRenderer.invoke('get-system-metrics'),
  getProcesses: () => ipcRenderer.invoke('get-processes'),
  
  // Windows Updates
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  installUpdates: () => ipcRenderer.invoke('install-updates'),
  
  // Drivers
  scanDrivers: () => ipcRenderer.invoke('scan-drivers'),
  checkDriverUpdates: () => ipcRenderer.invoke('check-driver-updates'),
  getGpuInfo: () => ipcRenderer.invoke('get-gpu-info'),
  
  // Cleanup
  scanCleanup: () => ipcRenderer.invoke('scan-cleanup'),
  runCleanup: () => ipcRenderer.invoke('run-cleanup'),
  emptyRecycleBin: () => ipcRenderer.invoke('empty-recycle-bin'),
  
  // Performance
  optimizePerformance: () => ipcRenderer.invoke('optimize-performance'),
  setPowerPlan: (plan: string) => ipcRenderer.invoke('set-power-plan', plan),
  
  // Utils
  formatBytes: (bytes: number) => ipcRenderer.invoke('format-bytes', bytes),
});
