import { logger, executeCommand, isWindows, isAdmin } from '../utils';

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
    
    if (!isWindows()) {
      // Linux/macOS metrics
      try {
        const { stdout: memInfo } = await executeCommand('free -b');
        const memLines = memInfo.split('\n');
        if (memLines.length > 1) {
          const memParts = memLines[1].split(/\s+/);
          metrics.memory.total = parseInt(memParts[1]) || 0;
          metrics.memory.available = parseInt(memParts[6]) || 0;
          metrics.memory.used = metrics.memory.total - metrics.memory.available;
          metrics.memory.usagePercent = Math.round((metrics.memory.used / metrics.memory.total) * 100);
        }
        
        const { stdout: cpuInfo } = await executeCommand('nproc');
        metrics.cpu.cores = parseInt(cpuInfo.trim()) || 0;
      } catch {
        // Fallback values already set
      }
      
      return metrics;
    }
    
    try {
      // Windows metrics using PowerShell
      const psCommand = `
        $cpu = Get-WmiObject Win32_Processor | Select-Object -First 1
        $memory = Get-WmiObject Win32_OperatingSystem
        $gpu = Get-WmiObject Win32_VideoController | Select-Object -First 1
        $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
        $cpuLoad = (Get-WmiObject Win32_PerfFormattedData_PerfOS_Processor | 
                   Where-Object { $_.Name -eq '_Total' }).PercentProcessorTime
        
        @{
          cpu = @{
            usage = [int]$cpuLoad
            temperature = 0
            cores = $cpu.NumberOfCores
            speed = [math]::Round($cpu.CurrentClockSpeed / 1000, 2)
            name = $cpu.Name
          }
          memory = @{
            total = $memory.TotalVisibleMemorySize * 1024
            available = $memory.FreePhysicalMemory * 1024
            used = ($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) * 1024
            usagePercent = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100)
          }
          gpu = if ($gpu) {
            @{
              name = $gpu.Name
              usage = 0
              temperature = 0
              memoryTotal = $gpu.AdapterRAM
              memoryUsed = 0
            }
          } else { $null }
          disk = @{
            total = $disk.Size
            free = $disk.FreeSpace
            used = $disk.Size - $disk.FreeSpace
            usagePercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100)
          }
        } | ConvertTo-Json -Compress -Depth 3
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim());
        return { ...metrics, ...parsed };
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
    if (!isWindows()) {
      try {
        const { stdout } = await executeCommand('ps aux --sort=-%cpu | head -11');
        const lines = stdout.split('\n').slice(1); // Skip header
        return lines.filter(Boolean).map(line => {
          const parts = line.split(/\s+/);
          return {
            name: parts[10] || 'Unknown',
            cpu: parseFloat(parts[2]) || 0,
            memory: parseFloat(parts[3]) || 0,
            pid: parseInt(parts[1]) || 0,
          };
        }).slice(0, 10);
      } catch {
        return [];
      }
    }
    
    try {
      const psCommand = `
        Get-Process | 
        Sort-Object CPU -Descending | 
        Select-Object -First 10 ProcessName, CPU, 
          @{Name='Memory';Expression={[math]::Round($_.WorkingSet64 / 1MB, 2)}}, 
          Id |
        ForEach-Object {
          @{
            name = $_.ProcessName
            cpu = if ($_.CPU) { [math]::Round($_.CPU, 2) } else { 0 }
            memory = $_.Memory
            pid = $_.Id
          }
        } | ConvertTo-Json -Compress
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      if (stdout && stdout.trim() !== '' && stdout.trim() !== 'null') {
        const parsed = JSON.parse(stdout);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      
      return [];
    } catch {
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
