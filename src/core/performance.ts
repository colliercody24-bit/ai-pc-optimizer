import { logger, executeCommand, isWindows, isAdmin } from '../utils';
import * as si from 'systeminformation';

export interface SystemMetrics {
  cpu: {
    usage: number;
    temperature: number;
    cores: number;
    speed: number;
    name: string;
  };
  memory: {
    total: number;
    available: number;
    used: number;
    usagePercent: number;
  };
  gpu: {
    name: string;
    usage: number;
    temperature: number;
    memoryTotal: number;
    memoryUsed: number;
  } | null;
  disk: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
}

export interface OptimizationResult {
  success: boolean;
  action: string;
  impact: string;
  message: string;
}

/**
 * Performance Optimizer - Manages CPU and GPU performance
 * Handles monitoring system metrics and applying performance optimizations
 */
export class PerformanceOptimizer {
  
  /**
   * Get current system performance metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    logger.info('Gathering system metrics...');
    
    const metrics: SystemMetrics = {
      cpu: {
        usage: 0,
        temperature: 0,
        cores: 0,
        speed: 0,
        name: 'Unknown',
      },
      memory: {
        total: 0,
        available: 0,
        used: 0,
        usagePercent: 0,
      },
      gpu: null,
      disk: {
        total: 0,
        free: 0,
        used: 0,
        usagePercent: 0,
      },
    };
    
    try {
      // Get CPU information
      const [cpuData, currentLoad, memData, fsSize, graphics, cpuTemp] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.graphics(),
        si.cpuTemperature(),
      ]);
      
      // Populate CPU metrics
      metrics.cpu.usage = Math.round(currentLoad.currentLoad);
      metrics.cpu.temperature = cpuTemp.main || 0; // Use main CPU temperature, fallback to 0 if not available
      metrics.cpu.cores = cpuData.cores || 0;
      metrics.cpu.speed = cpuData.speed || 0;
      metrics.cpu.name = cpuData.brand || 'Unknown';
      
      // Populate memory metrics
      metrics.memory.total = memData.total;
      metrics.memory.available = memData.available;
      metrics.memory.used = memData.used;
      metrics.memory.usagePercent = Math.round((memData.used / memData.total) * 100);
      
      // Populate GPU metrics (if available)
      if (graphics.controllers && graphics.controllers.length > 0) {
        const primaryGpu = graphics.controllers[0];
        metrics.gpu = {
          name: primaryGpu.model || 'Unknown',
          usage: 0, // systeminformation doesn't provide real-time GPU usage reliably
          temperature: 0, // systeminformation doesn't provide GPU temperature reliably
          memoryTotal: primaryGpu.vram || 0,
          memoryUsed: 0, // systeminformation doesn't provide GPU memory usage reliably
        };
      }
      
      // Populate disk metrics (use first filesystem, typically C: on Windows or / on Linux)
      if (fsSize && fsSize.length > 0) {
        const primaryDisk = fsSize[0];
        metrics.disk.total = primaryDisk.size;
        metrics.disk.free = primaryDisk.available;
        metrics.disk.used = primaryDisk.used;
        metrics.disk.usagePercent = Math.round(primaryDisk.use);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to get system metrics: ${errorMessage}`);
    }
    
    return metrics;
  }
  
  /**
   * Get list of high CPU/memory usage processes
   */
  async getResourceHungryProcesses(): Promise<{ name: string; cpu: number; memory: number; pid: number }[]> {
    try {
      const processData = await si.processes();
      
      // Sort by CPU usage and take top 10
      const sortedProcesses = processData.list
        .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
        .slice(0, 10);
      
      return sortedProcesses.map(proc => ({
        name: proc.name || 'Unknown',
        cpu: proc.cpu || 0,
        memory: proc.memRss ? Math.round(proc.memRss / 1024) : 0, // memRss is in KB on Linux/macOS (from ps command), convert to MB
        pid: proc.pid || 0,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to get resource-hungry processes: ${errorMessage}`);
      return [];
    }
  }
  
  /**
   * Optimize power plan for performance
   */
  async setPowerPlan(plan: 'balanced' | 'high-performance' | 'power-saver'): Promise<OptimizationResult> {
    logger.info(`Setting power plan to: ${plan}`);
    
    if (!isWindows()) {
      return {
        success: false,
        action: 'setPowerPlan',
        impact: 'none',
        message: 'Power plan management is only supported on Windows',
      };
    }
    
    if (!await isAdmin()) {
      return {
        success: false,
        action: 'setPowerPlan',
        impact: 'none',
        message: 'Administrator privileges required',
      };
    }
    
    const planGuids: Record<string, string> = {
      'balanced': '381b4222-f694-41f0-9685-ff5bb260df2e',
      'high-performance': '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
      'power-saver': 'a1841308-3541-4fab-bc81-f71556f20b4a',
    };
    
    try {
      await executeCommand(`powercfg /setactive ${planGuids[plan]}`);
      
      logger.info(`Power plan set to ${plan}`);
      
      return {
        success: true,
        action: 'setPowerPlan',
        impact: plan === 'high-performance' ? 'high' : plan === 'balanced' ? 'medium' : 'low',
        message: `Power plan set to ${plan}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        action: 'setPowerPlan',
        impact: 'none',
        message: `Failed to set power plan: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Disable startup programs that slow down boot
   */
  async optimizeStartup(): Promise<OptimizationResult> {
    logger.info('Analyzing startup programs...');
    
    if (!isWindows()) {
      return {
        success: false,
        action: 'optimizeStartup',
        impact: 'none',
        message: 'Startup optimization is only supported on Windows',
      };
    }
    
    try {
      // List startup programs
      const psCommand = `
        Get-CimInstance Win32_StartupCommand | 
        Select-Object Name, Command, Location |
        ConvertTo-Json -Compress
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      let startupCount = 0;
      if (stdout && stdout.trim() !== '' && stdout.trim() !== 'null') {
        const parsed = JSON.parse(stdout);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        startupCount = items.length;
      }
      
      return {
        success: true,
        action: 'optimizeStartup',
        impact: 'medium',
        message: `Found ${startupCount} startup programs. Review in Task Manager to disable unnecessary ones.`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        action: 'optimizeStartup',
        impact: 'none',
        message: `Failed to analyze startup programs: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Adjust visual effects for better performance
   */
  async optimizeVisualEffects(): Promise<OptimizationResult> {
    logger.info('Optimizing visual effects...');
    
    if (!isWindows()) {
      return {
        success: false,
        action: 'optimizeVisualEffects',
        impact: 'none',
        message: 'Visual effects optimization is only supported on Windows',
      };
    }
    
    if (!await isAdmin()) {
      return {
        success: false,
        action: 'optimizeVisualEffects',
        impact: 'none',
        message: 'Administrator privileges required',
      };
    }
    
    try {
      // Set visual effects to "Adjust for best performance"
      const psCommand = `
        $path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects'
        Set-ItemProperty -Path $path -Name 'VisualFXSetting' -Value 2 -ErrorAction SilentlyContinue
        'success'
      `;
      
      await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      return {
        success: true,
        action: 'optimizeVisualEffects',
        impact: 'medium',
        message: 'Visual effects optimized for performance',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        action: 'optimizeVisualEffects',
        impact: 'none',
        message: `Failed to optimize visual effects: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Clear system memory (working set)
   */
  async clearMemory(): Promise<OptimizationResult> {
    logger.info('Clearing system memory...');
    
    if (!isWindows()) {
      return {
        success: false,
        action: 'clearMemory',
        impact: 'none',
        message: 'Memory clearing is only supported on Windows',
      };
    }
    
    try {
      // Get memory before
      const metricsBefore = await this.getSystemMetrics();
      
      // Request garbage collection from processes
      const psCommand = `
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
        'done'
      `;
      
      await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      // Get memory after (slight delay for effect)
      const metricsAfter = await this.getSystemMetrics();
      
      const freedMB = Math.round((metricsAfter.memory.available - metricsBefore.memory.available) / (1024 * 1024));
      
      return {
        success: true,
        action: 'clearMemory',
        impact: freedMB > 100 ? 'high' : freedMB > 50 ? 'medium' : 'low',
        message: `Memory optimization completed. ${freedMB > 0 ? `Freed approximately ${freedMB} MB` : 'No significant memory freed'}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        action: 'clearMemory',
        impact: 'none',
        message: `Failed to clear memory: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Run comprehensive performance optimization
   */
  async runFullOptimization(): Promise<OptimizationResult[]> {
    logger.info('Running full performance optimization...');
    
    const results: OptimizationResult[] = [];
    
    // Set high performance power plan
    results.push(await this.setPowerPlan('high-performance'));
    
    // Optimize startup
    results.push(await this.optimizeStartup());
    
    // Optimize visual effects
    results.push(await this.optimizeVisualEffects());
    
    // Clear memory
    results.push(await this.clearMemory());
    
    const successCount = results.filter(r => r.success).length;
    logger.info(`Full optimization complete. ${successCount}/${results.length} optimizations successful.`);
    
    return results;
  }
}

export default new PerformanceOptimizer();
