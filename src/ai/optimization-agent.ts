import { logger, config } from '../utils';
import { 
  systemUpdater, 
  driverManager, 
  performanceOptimizer, 
  fileSystemCleaner,
  SystemMetrics,
  UpdateResult,
  DriverUpdateResult,
  OptimizationResult,
  CleanupResult
} from '../core';

export interface OptimizationRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'updates' | 'drivers' | 'performance' | 'cleanup';
  action: string;
  reason: string;
  autoFix: boolean;
}

export interface SystemAnalysis {
  metrics: SystemMetrics;
  recommendations: OptimizationRecommendation[];
  overallScore: number;
  summary: string;
}

/**
 * AI Optimization Agent - Intelligent system analyzer and optimizer
 * Uses AI-driven decision making to optimize PC performance
 */
export class AIOptimizationAgent {
  
  private lastAnalysis: SystemAnalysis | null = null;
  
  /**
   * Analyze system state and generate recommendations
   */
  async analyzeSystem(): Promise<SystemAnalysis> {
    logger.info('AI Agent: Analyzing system state...');
    
    const recommendations: OptimizationRecommendation[] = [];
    let overallScore = 100;
    
    // Get current system metrics
    const metrics = await performanceOptimizer.getSystemMetrics();
    
    // Analyze CPU usage
    if (metrics.cpu.usage > 80) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        action: 'Investigate high CPU usage',
        reason: `CPU usage is at ${metrics.cpu.usage}%. High CPU usage can slow down your system significantly.`,
        autoFix: false,
      });
      overallScore -= 15;
    } else if (metrics.cpu.usage > 60) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        action: 'Monitor CPU usage',
        reason: `CPU usage is at ${metrics.cpu.usage}%. Consider closing unnecessary applications.`,
        autoFix: false,
      });
      overallScore -= 5;
    }
    
    // Analyze memory usage
    if (metrics.memory.usagePercent > 85) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        action: 'Free up system memory',
        reason: `Memory usage is at ${metrics.memory.usagePercent}%. This can cause system slowdowns and crashes.`,
        autoFix: true,
      });
      overallScore -= 15;
    } else if (metrics.memory.usagePercent > 70) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        action: 'Optimize memory usage',
        reason: `Memory usage is at ${metrics.memory.usagePercent}%. Consider closing unused applications.`,
        autoFix: true,
      });
      overallScore -= 5;
    }
    
    // Analyze disk usage
    if (metrics.disk.usagePercent > 90) {
      recommendations.push({
        priority: 'high',
        category: 'cleanup',
        action: 'Free up disk space urgently',
        reason: `Disk is ${metrics.disk.usagePercent}% full. Low disk space can severely impact performance.`,
        autoFix: true,
      });
      overallScore -= 20;
    } else if (metrics.disk.usagePercent > 75) {
      recommendations.push({
        priority: 'medium',
        category: 'cleanup',
        action: 'Clean up disk space',
        reason: `Disk is ${metrics.disk.usagePercent}% full. Consider removing unnecessary files.`,
        autoFix: true,
      });
      overallScore -= 10;
    }
    
    // Check for Windows updates
    if (config.enableAutoUpdates) {
      try {
        const updateResult = await systemUpdater.checkForUpdates();
        if (updateResult.updatesAvailable > 0) {
          recommendations.push({
            priority: updateResult.updatesAvailable > 5 ? 'high' : 'medium',
            category: 'updates',
            action: `Install ${updateResult.updatesAvailable} pending Windows updates`,
            reason: 'Keeping Windows updated improves security and performance.',
            autoFix: true,
          });
          overallScore -= Math.min(updateResult.updatesAvailable * 2, 15);
        }
      } catch {
        logger.warn('Could not check for Windows updates');
      }
    }
    
    // Check for driver updates
    if (config.enableDriverUpdates) {
      try {
        const driverResult = await driverManager.checkForDriverUpdates();
        if (driverResult.drivers.length > 0) {
          recommendations.push({
            priority: 'medium',
            category: 'drivers',
            action: `Update ${driverResult.drivers.length} drivers`,
            reason: 'Updated drivers can improve stability and performance.',
            autoFix: true,
          });
          overallScore -= Math.min(driverResult.drivers.length * 3, 15);
        }
      } catch {
        logger.warn('Could not check for driver updates');
      }
    }
    
    // Check for problematic devices
    try {
      const deviceStatus = await driverManager.getDeviceStatus();
      if (deviceStatus.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'drivers',
          action: `Fix ${deviceStatus.length} device issues`,
          reason: `Found devices with problems: ${deviceStatus.map(d => d.name).join(', ')}`,
          autoFix: false,
        });
        overallScore -= deviceStatus.length * 5;
      }
    } catch {
      // Ignore
    }
    
    // Analyze cleanup potential
    if (config.enableFileSystemCleanup) {
      try {
        const cleanupTargets = await fileSystemCleaner.getCleanupTargets();
        const totalCleanupSize = cleanupTargets.reduce((sum, t) => sum + t.size, 0);
        const totalCleanupSizeGB = totalCleanupSize / (1024 * 1024 * 1024);
        
        if (totalCleanupSizeGB > 5) {
          recommendations.push({
            priority: 'high',
            category: 'cleanup',
            action: `Clean ${totalCleanupSizeGB.toFixed(1)} GB of temporary files`,
            reason: 'Large amount of temporary files detected. Cleaning them will free up significant disk space.',
            autoFix: true,
          });
          overallScore -= 10;
        } else if (totalCleanupSizeGB > 1) {
          recommendations.push({
            priority: 'low',
            category: 'cleanup',
            action: `Clean ${totalCleanupSizeGB.toFixed(1)} GB of temporary files`,
            reason: 'Temporary files detected. Cleaning them will free up disk space.',
            autoFix: true,
          });
          overallScore -= 5;
        }
      } catch {
        logger.warn('Could not analyze cleanup targets');
      }
    }
    
    // Ensure score is within bounds
    overallScore = Math.max(0, Math.min(100, overallScore));
    
    // Generate summary
    let summary: string;
    if (overallScore >= 90) {
      summary = 'Your system is running optimally. No immediate action required.';
    } else if (overallScore >= 70) {
      summary = 'Your system is running well but could benefit from some optimizations.';
    } else if (overallScore >= 50) {
      summary = 'Your system needs attention. Several optimizations are recommended.';
    } else {
      summary = 'Your system requires immediate attention. Multiple issues detected.';
    }
    
    const analysis: SystemAnalysis = {
      metrics,
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      overallScore,
      summary,
    };
    
    this.lastAnalysis = analysis;
    
    logger.info(`AI Agent: Analysis complete. Score: ${overallScore}/100`);
    
    return analysis;
  }
  
  /**
   * Execute auto-fix recommendations
   */
  async executeAutoFix(): Promise<{
    executed: string[];
    skipped: string[];
    results: {
      action: string;
      success: boolean;
      message: string;
    }[];
  }> {
    logger.info('AI Agent: Executing auto-fix recommendations...');
    
    if (!this.lastAnalysis) {
      await this.analyzeSystem();
    }
    
    const executed: string[] = [];
    const skipped: string[] = [];
    const results: { action: string; success: boolean; message: string }[] = [];
    
    if (!this.lastAnalysis) {
      return { executed, skipped, results };
    }
    
    const autoFixRecommendations = this.lastAnalysis.recommendations.filter(r => r.autoFix);
    
    for (const recommendation of autoFixRecommendations) {
      try {
        let success = false;
        let message = '';
        
        switch (recommendation.category) {
          case 'updates':
            if (config.enableAutoUpdates) {
              const updateResult = await systemUpdater.installUpdates();
              success = updateResult.success;
              message = updateResult.message;
            } else {
              skipped.push(recommendation.action);
              continue;
            }
            break;
            
          case 'drivers':
            if (config.enableDriverUpdates) {
              const driverResult = await driverManager.installDriverUpdates();
              success = driverResult.success;
              message = driverResult.message;
            } else {
              skipped.push(recommendation.action);
              continue;
            }
            break;
            
          case 'performance':
            if (config.enablePerformanceOptimization) {
              const perfResult = await performanceOptimizer.clearMemory();
              success = perfResult.success;
              message = perfResult.message;
            } else {
              skipped.push(recommendation.action);
              continue;
            }
            break;
            
          case 'cleanup':
            if (config.enableFileSystemCleanup) {
              const cleanResult = await fileSystemCleaner.runFullCleanup();
              success = cleanResult.success;
              message = `Deleted ${cleanResult.filesDeleted} files`;
            } else {
              skipped.push(recommendation.action);
              continue;
            }
            break;
        }
        
        executed.push(recommendation.action);
        results.push({
          action: recommendation.action,
          success,
          message,
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          action: recommendation.action,
          success: false,
          message: errorMessage,
        });
      }
    }
    
    logger.info(`AI Agent: Auto-fix complete. Executed: ${executed.length}, Skipped: ${skipped.length}`);
    
    return { executed, skipped, results };
  }
  
  /**
   * Run a full optimization cycle
   */
  async runOptimizationCycle(): Promise<{
    analysis: SystemAnalysis;
    autoFixResults: {
      executed: string[];
      skipped: string[];
      results: { action: string; success: boolean; message: string }[];
    };
    finalScore: number;
  }> {
    logger.info('AI Agent: Starting optimization cycle...');
    
    // Initial analysis
    const analysis = await this.analyzeSystem();
    
    // Execute auto-fixes
    const autoFixResults = await this.executeAutoFix();
    
    // Re-analyze to get final score
    const finalAnalysis = await this.analyzeSystem();
    
    return {
      analysis,
      autoFixResults,
      finalScore: finalAnalysis.overallScore,
    };
  }
  
  /**
   * Get resource-hungry processes with AI recommendations
   */
  async analyzeProcesses(): Promise<{
    processes: { name: string; cpu: number; memory: number; pid: number }[];
    recommendation: string;
  }> {
    const processes = await performanceOptimizer.getResourceHungryProcesses();
    
    let recommendation = 'System processes appear normal.';
    
    const highCpuProcesses = processes.filter(p => p.cpu > 50);
    const highMemProcesses = processes.filter(p => p.memory > 1024);
    
    if (highCpuProcesses.length > 0) {
      recommendation = `High CPU usage detected in: ${highCpuProcesses.map(p => p.name).join(', ')}. Consider closing these applications if not needed.`;
    } else if (highMemProcesses.length > 0) {
      recommendation = `High memory usage detected in: ${highMemProcesses.map(p => p.name).join(', ')}. Consider closing these applications to free up memory.`;
    }
    
    return { processes, recommendation };
  }
}

export default new AIOptimizationAgent();
