#!/usr/bin/env node

import { Command } from 'commander';
import { logger, formatBytes, config } from './utils';
import { 
  systemUpdater, 
  driverManager, 
  performanceOptimizer, 
  fileSystemCleaner 
} from './core';
import { aiOptimizationAgent } from './ai';

const program = new Command();

program
  .name('ai-pc-optimizer')
  .description('AI-powered PC optimization system with automated updates, driver management, and performance monitoring')
  .version('1.0.0');

// Analyze command
program
  .command('analyze')
  .description('Analyze system and get optimization recommendations')
  .action(async () => {
    try {
      console.log('\n🔍 Analyzing your system...\n');
      
      const analysis = await aiOptimizationAgent.analyzeSystem();
      
      console.log('━'.repeat(60));
      console.log(`📊 System Health Score: ${analysis.overallScore}/100`);
      console.log('━'.repeat(60));
      console.log(`\n${analysis.summary}\n`);
      
      if (analysis.recommendations.length > 0) {
        console.log('📋 Recommendations:\n');
        
        for (const rec of analysis.recommendations) {
          const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          const autoFixLabel = rec.autoFix ? ' [Auto-fixable]' : '';
          console.log(`  ${priorityEmoji} [${rec.priority.toUpperCase()}] ${rec.action}${autoFixLabel}`);
          console.log(`     ${rec.reason}\n`);
        }
      } else {
        console.log('✅ No issues detected. Your system is running optimally!\n');
      }
      
      // Display metrics
      console.log('━'.repeat(60));
      console.log('📈 System Metrics:');
      console.log('━'.repeat(60));
      console.log(`  CPU: ${analysis.metrics.cpu.name}`);
      console.log(`       ${analysis.metrics.cpu.usage}% usage, ${analysis.metrics.cpu.cores} cores`);
      console.log(`  Memory: ${formatBytes(analysis.metrics.memory.used)} / ${formatBytes(analysis.metrics.memory.total)} (${analysis.metrics.memory.usagePercent}%)`);
      console.log(`  Disk: ${formatBytes(analysis.metrics.disk.used)} / ${formatBytes(analysis.metrics.disk.total)} (${analysis.metrics.disk.usagePercent}%)`);
      if (analysis.metrics.gpu) {
        console.log(`  GPU: ${analysis.metrics.gpu.name}`);
      }
      console.log('');
      
    } catch (error) {
      logger.error('Analysis failed:', error);
      process.exit(1);
    }
  });

// Optimize command
program
  .command('optimize')
  .description('Run full AI-powered optimization')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (options) => {
    try {
      console.log('\n🚀 Starting AI-powered optimization...\n');
      
      const result = await aiOptimizationAgent.runOptimizationCycle();
      
      console.log('━'.repeat(60));
      console.log('📊 Optimization Results');
      console.log('━'.repeat(60));
      
      console.log(`\nInitial Score: ${result.analysis.overallScore}/100`);
      console.log(`Final Score: ${result.finalScore}/100`);
      console.log(`Improvement: +${result.finalScore - result.analysis.overallScore} points\n`);
      
      if (result.autoFixResults.executed.length > 0) {
        console.log('✅ Actions Executed:');
        for (const action of result.autoFixResults.executed) {
          console.log(`   • ${action}`);
        }
        console.log('');
      }
      
      if (result.autoFixResults.skipped.length > 0) {
        console.log('⏭️  Actions Skipped (disabled in config):');
        for (const action of result.autoFixResults.skipped) {
          console.log(`   • ${action}`);
        }
        console.log('');
      }
      
      if (result.autoFixResults.results.some(r => !r.success)) {
        console.log('⚠️  Issues:');
        for (const r of result.autoFixResults.results.filter(r => !r.success)) {
          console.log(`   • ${r.action}: ${r.message}`);
        }
        console.log('');
      }
      
    } catch (error) {
      logger.error('Optimization failed:', error);
      process.exit(1);
    }
  });

// Updates command
program
  .command('updates')
  .description('Check and install Windows updates')
  .option('-c, --check', 'Only check for updates, do not install')
  .option('-i, --install', 'Install available updates')
  .action(async (options) => {
    try {
      if (options.check || !options.install) {
        console.log('\n🔍 Checking for Windows updates...\n');
        
        const result = await systemUpdater.checkForUpdates();
        
        if (result.success) {
          if (result.updatesAvailable > 0) {
            console.log(`📦 Found ${result.updatesAvailable} available updates:\n`);
            for (const update of result.updates) {
              console.log(`   • ${update.name}`);
              if (update.kb) console.log(`     KB: ${update.kb}`);
              if (update.size) console.log(`     Size: ${update.size} MB`);
              console.log('');
            }
            console.log('Run "ai-pc-optimizer updates --install" to install updates.\n');
          } else {
            console.log('✅ Your system is up to date!\n');
          }
        } else {
          console.log(`⚠️  ${result.message}\n`);
        }
      }
      
      if (options.install) {
        console.log('\n📥 Installing Windows updates...\n');
        console.log('This may take a while. Please do not shut down your computer.\n');
        
        const result = await systemUpdater.installUpdates();
        
        if (result.success) {
          console.log(`✅ Installed ${result.updatesInstalled} updates.`);
          if (result.requiresReboot) {
            console.log('⚠️  A system restart is required to complete the installation.\n');
          }
        } else {
          console.log(`⚠️  ${result.message}\n`);
        }
      }
      
    } catch (error) {
      logger.error('Update operation failed:', error);
      process.exit(1);
    }
  });

// Drivers command
program
  .command('drivers')
  .description('Manage hardware drivers')
  .option('-s, --scan', 'Scan and list all installed drivers')
  .option('-c, --check', 'Check for driver updates')
  .option('-i, --install', 'Install available driver updates')
  .option('-g, --gpu', 'Show GPU driver information')
  .action(async (options) => {
    try {
      if (options.gpu) {
        console.log('\n🎮 GPU Driver Information:\n');
        const gpuDrivers = await driverManager.getGPUDrivers();
        
        if (gpuDrivers.length > 0) {
          for (const driver of gpuDrivers) {
            console.log(`   Name: ${driver.deviceName}`);
            console.log(`   Manufacturer: ${driver.manufacturer}`);
            console.log(`   Version: ${driver.driverVersion}`);
            console.log(`   Date: ${driver.driverDate}`);
            console.log('');
          }
        } else {
          console.log('   No GPU detected or unable to retrieve GPU information.\n');
        }
      }
      
      if (options.scan) {
        console.log('\n🔍 Scanning installed drivers...\n');
        const drivers = await driverManager.scanDrivers();
        
        console.log(`Found ${drivers.length} drivers:\n`);
        
        // Group by device class
        const grouped = new Map<string, typeof drivers>();
        for (const driver of drivers) {
          const key = driver.deviceClass || 'Other';
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(driver);
        }
        
        for (const [category, items] of grouped) {
          console.log(`📁 ${category}:`);
          for (const driver of items.slice(0, 5)) {
            console.log(`   • ${driver.deviceName} (v${driver.driverVersion})`);
          }
          if (items.length > 5) {
            console.log(`   ... and ${items.length - 5} more`);
          }
          console.log('');
        }
      }
      
      if (options.check) {
        console.log('\n🔍 Checking for driver updates...\n');
        const result = await driverManager.checkForDriverUpdates();
        
        if (result.success) {
          if (result.drivers.length > 0) {
            console.log(`📦 Found ${result.drivers.length} driver updates available:\n`);
            for (const driver of result.drivers) {
              console.log(`   • ${driver.deviceName}`);
            }
            console.log('\nRun "ai-pc-optimizer drivers --install" to install updates.\n');
          } else {
            console.log('✅ All drivers are up to date!\n');
          }
        } else {
          console.log(`⚠️  ${result.message}\n`);
        }
      }
      
      if (options.install) {
        console.log('\n📥 Installing driver updates...\n');
        const result = await driverManager.installDriverUpdates();
        
        if (result.success) {
          console.log(`✅ Installed ${result.driversUpdated} driver updates.\n`);
        } else {
          console.log(`⚠️  ${result.message}\n`);
        }
      }
      
      // Default action if no options specified
      if (!options.scan && !options.check && !options.install && !options.gpu) {
        console.log('\n🎮 GPU Driver Information:\n');
        const gpuDrivers = await driverManager.getGPUDrivers();
        if (gpuDrivers.length > 0) {
          for (const driver of gpuDrivers) {
            console.log(`   ${driver.deviceName} (v${driver.driverVersion})`);
          }
        }
        
        console.log('\n🔍 Checking for driver updates...\n');
        const result = await driverManager.checkForDriverUpdates();
        if (result.drivers.length > 0) {
          console.log(`📦 ${result.drivers.length} driver updates available.`);
        } else {
          console.log('✅ All drivers are up to date!');
        }
        console.log('');
      }
      
    } catch (error) {
      logger.error('Driver operation failed:', error);
      process.exit(1);
    }
  });

// Performance command
program
  .command('performance')
  .description('View and optimize system performance')
  .option('-m, --metrics', 'Show current system metrics')
  .option('-p, --processes', 'Show resource-hungry processes')
  .option('-o, --optimize', 'Run performance optimizations')
  .option('--power <plan>', 'Set power plan (balanced, high-performance, power-saver)')
  .action(async (options) => {
    try {
      if (options.metrics || (!options.processes && !options.optimize && !options.power)) {
        console.log('\n📊 System Metrics:\n');
        const metrics = await performanceOptimizer.getSystemMetrics();
        
        console.log('━'.repeat(50));
        console.log('CPU');
        console.log('━'.repeat(50));
        console.log(`  Name: ${metrics.cpu.name}`);
        console.log(`  Cores: ${metrics.cpu.cores}`);
        console.log(`  Speed: ${metrics.cpu.speed} GHz`);
        console.log(`  Usage: ${metrics.cpu.usage}%`);
        
        console.log('\n━'.repeat(50));
        console.log('Memory');
        console.log('━'.repeat(50));
        console.log(`  Total: ${formatBytes(metrics.memory.total)}`);
        console.log(`  Used: ${formatBytes(metrics.memory.used)} (${metrics.memory.usagePercent}%)`);
        console.log(`  Available: ${formatBytes(metrics.memory.available)}`);
        
        if (metrics.gpu) {
          console.log('\n━'.repeat(50));
          console.log('GPU');
          console.log('━'.repeat(50));
          console.log(`  Name: ${metrics.gpu.name}`);
          console.log(`  Memory: ${formatBytes(metrics.gpu.memoryTotal)}`);
        }
        
        console.log('\n━'.repeat(50));
        console.log('Disk');
        console.log('━'.repeat(50));
        console.log(`  Total: ${formatBytes(metrics.disk.total)}`);
        console.log(`  Used: ${formatBytes(metrics.disk.used)} (${metrics.disk.usagePercent}%)`);
        console.log(`  Free: ${formatBytes(metrics.disk.free)}`);
        console.log('');
      }
      
      if (options.processes) {
        console.log('\n🔝 Resource-Hungry Processes:\n');
        const { processes, recommendation } = await aiOptimizationAgent.analyzeProcesses();
        
        console.log('━'.repeat(60));
        console.log(`${'Name'.padEnd(25)} ${'CPU'.padStart(10)} ${'Memory'.padStart(12)}`);
        console.log('━'.repeat(60));
        
        for (const proc of processes) {
          console.log(`${proc.name.slice(0, 24).padEnd(25)} ${(proc.cpu.toFixed(1) + '%').padStart(10)} ${(proc.memory.toFixed(1) + ' MB').padStart(12)}`);
        }
        
        console.log('━'.repeat(60));
        console.log(`\n💡 ${recommendation}\n`);
      }
      
      if (options.power) {
        const validPlans = ['balanced', 'high-performance', 'power-saver'];
        if (!validPlans.includes(options.power)) {
          console.log(`\n⚠️  Invalid power plan. Choose from: ${validPlans.join(', ')}\n`);
          process.exit(1);
        }
        
        console.log(`\n⚡ Setting power plan to "${options.power}"...\n`);
        const result = await performanceOptimizer.setPowerPlan(options.power as 'balanced' | 'high-performance' | 'power-saver');
        
        if (result.success) {
          console.log(`✅ ${result.message}\n`);
        } else {
          console.log(`⚠️  ${result.message}\n`);
        }
      }
      
      if (options.optimize) {
        console.log('\n🚀 Running performance optimizations...\n');
        const results = await performanceOptimizer.runFullOptimization();
        
        for (const result of results) {
          const icon = result.success ? '✅' : '⚠️';
          console.log(`${icon} ${result.action}: ${result.message}`);
        }
        console.log('');
      }
      
    } catch (error) {
      logger.error('Performance operation failed:', error);
      process.exit(1);
    }
  });

// Cleanup command
program
  .command('cleanup')
  .description('Clean up disk space and temporary files')
  .option('-s, --scan', 'Scan and show cleanup opportunities')
  .option('-c, --clean', 'Run cleanup operation')
  .option('-b, --browser', 'Clean browser cache only')
  .option('-r, --recycle', 'Empty recycle bin')
  .option('-d, --disk', 'Run Windows Disk Cleanup')
  .action(async (options) => {
    try {
      if (options.scan || (!options.clean && !options.browser && !options.recycle && !options.disk)) {
        console.log('\n🔍 Scanning for cleanup opportunities...\n');
        
        const targets = await fileSystemCleaner.getCleanupTargets();
        const totalSize = targets.reduce((sum, t) => sum + t.size, 0);
        
        console.log('━'.repeat(60));
        console.log(`${'Location'.padEnd(35)} ${'Files'.padStart(8)} ${'Size'.padStart(12)}`);
        console.log('━'.repeat(60));
        
        for (const target of targets.filter(t => t.fileCount > 0)) {
          console.log(`${target.description.slice(0, 34).padEnd(35)} ${target.fileCount.toString().padStart(8)} ${formatBytes(target.size).padStart(12)}`);
        }
        
        console.log('━'.repeat(60));
        console.log(`${'Total'.padEnd(35)} ${' '.padStart(8)} ${formatBytes(totalSize).padStart(12)}`);
        console.log('━'.repeat(60));
        
        console.log('\nRun "ai-pc-optimizer cleanup --clean" to clean these files.\n');
      }
      
      if (options.clean) {
        console.log('\n🧹 Running cleanup...\n');
        const result = await fileSystemCleaner.runFullCleanup();
        
        console.log(`✅ Cleanup complete!`);
        console.log(`   Files deleted: ${result.filesDeleted}`);
        console.log(`   Space freed: ${formatBytes(result.spaceFreed)}\n`);
        
        if (result.errors.length > 0) {
          console.log(`⚠️  ${result.errors.length} errors occurred (some files may be in use)\n`);
        }
      }
      
      if (options.browser) {
        console.log('\n🌐 Cleaning browser cache...\n');
        const result = await fileSystemCleaner.cleanBrowserCache();
        
        console.log(`✅ Browser cache cleaned!`);
        console.log(`   Files deleted: ${result.filesDeleted}`);
        console.log(`   Space freed: ${formatBytes(result.spaceFreed)}\n`);
      }
      
      if (options.recycle) {
        console.log('\n🗑️  Emptying Recycle Bin...\n');
        const result = await fileSystemCleaner.emptyRecycleBin();
        
        if (result.success) {
          console.log(`✅ Recycle Bin emptied! ${result.filesDeleted} items removed.\n`);
        } else {
          console.log(`⚠️  ${result.errors.join(', ')}\n`);
        }
      }
      
      if (options.disk) {
        console.log('\n💿 Running Windows Disk Cleanup...\n');
        console.log('This will open the Disk Cleanup utility.\n');
        
        const result = await fileSystemCleaner.runDiskCleanup();
        
        if (result.success) {
          console.log('✅ Disk Cleanup completed.\n');
        } else {
          console.log(`⚠️  ${result.errors.join(', ')}\n`);
        }
      }
      
    } catch (error) {
      logger.error('Cleanup operation failed:', error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current system status')
  .action(async () => {
    try {
      console.log('\n📊 AI PC Optimizer - System Status\n');
      console.log('━'.repeat(60));
      
      const metrics = await performanceOptimizer.getSystemMetrics();
      
      // CPU status
      const cpuStatus = metrics.cpu.usage < 50 ? '🟢' : metrics.cpu.usage < 80 ? '🟡' : '🔴';
      console.log(`${cpuStatus} CPU: ${metrics.cpu.usage}% usage`);
      
      // Memory status
      const memStatus = metrics.memory.usagePercent < 60 ? '🟢' : metrics.memory.usagePercent < 85 ? '🟡' : '🔴';
      console.log(`${memStatus} Memory: ${metrics.memory.usagePercent}% used (${formatBytes(metrics.memory.available)} available)`);
      
      // Disk status
      const diskStatus = metrics.disk.usagePercent < 70 ? '🟢' : metrics.disk.usagePercent < 90 ? '🟡' : '🔴';
      console.log(`${diskStatus} Disk: ${metrics.disk.usagePercent}% used (${formatBytes(metrics.disk.free)} free)`);
      
      console.log('━'.repeat(60));
      console.log('\nRun "ai-pc-optimizer analyze" for detailed analysis.');
      console.log('Run "ai-pc-optimizer optimize" to run optimizations.\n');
      
    } catch (error) {
      logger.error('Status check failed:', error);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();

// If no command specified, show help
if (!process.argv.slice(2).length) {
  console.log('\n🖥️  AI PC Optimizer v1.0.0\n');
  console.log('An AI-powered tool to keep your PC updated, optimized, and clean.\n');
  program.outputHelp();
}
