import * as fs from 'fs';
import * as path from 'path';
import { logger, formatBytes, getFileAgeDays, getFilesRecursively, isWindows, executeCommand, isAdmin } from '../utils';
import config from '../utils/config';

export interface CleanupTarget {
  path: string;
  type: 'temp' | 'cache' | 'logs' | 'downloads' | 'browser' | 'custom';
  description: string;
  safeToDelete: boolean;
}

export interface CleanupResult {
  success: boolean;
  filesDeleted: number;
  spaceFreed: number;
  errors: string[];
  details: { path: string; size: number; deleted: boolean; error?: string }[];
}

/**
 * File System Cleaner - Manages file system cleanup and optimization
 * Handles temp files, cache, browser data, and disk cleanup
 */
export class FileSystemCleaner {
  
  private readonly tempPaths: CleanupTarget[] = [];
  
  constructor() {
    this.initializeCleanupTargets();
  }
  
  /**
   * Initialize cleanup targets based on OS
   */
  private initializeCleanupTargets(): void {
    if (isWindows()) {
      const userProfile = process.env.USERPROFILE || 'C:\\Users\\Default';
      const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
      const appData = process.env.APPDATA || path.join(userProfile, 'AppData', 'Roaming');
      
      this.tempPaths.push(
        {
          path: process.env.TEMP || path.join(localAppData, 'Temp'),
          type: 'temp',
          description: 'Windows Temp folder',
          safeToDelete: true,
        },
        {
          path: 'C:\\Windows\\Temp',
          type: 'temp',
          description: 'System Temp folder',
          safeToDelete: true,
        },
        {
          path: path.join(localAppData, 'Microsoft', 'Windows', 'INetCache'),
          type: 'cache',
          description: 'Internet Explorer Cache',
          safeToDelete: true,
        },
        {
          path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
          type: 'browser',
          description: 'Chrome Cache',
          safeToDelete: true,
        },
        {
          path: path.join(localAppData, 'Mozilla', 'Firefox', 'Profiles'),
          type: 'browser',
          description: 'Firefox Profiles (cache)',
          safeToDelete: false, // Contains profile data, not just cache
        },
        {
          path: path.join(appData, 'Microsoft', 'Windows', 'Recent'),
          type: 'cache',
          description: 'Recent files shortcuts',
          safeToDelete: true,
        },
        {
          path: 'C:\\Windows\\Prefetch',
          type: 'cache',
          description: 'Windows Prefetch',
          safeToDelete: true,
        },
        {
          path: path.join(localAppData, 'Temp'),
          type: 'temp',
          description: 'Local App Data Temp',
          safeToDelete: true,
        },
      );
    } else {
      // Linux/macOS
      const home = process.env.HOME || '/home/user';
      
      this.tempPaths.push(
        {
          path: '/tmp',
          type: 'temp',
          description: 'System temp folder',
          safeToDelete: true,
        },
        {
          path: path.join(home, '.cache'),
          type: 'cache',
          description: 'User cache folder',
          safeToDelete: true,
        },
        {
          path: '/var/log',
          type: 'logs',
          description: 'System logs',
          safeToDelete: false,
        },
      );
    }
    
    // Add custom paths from config
    for (const customPath of config.cleanupPaths) {
      this.tempPaths.push({
        path: customPath,
        type: 'custom',
        description: 'Custom cleanup path',
        safeToDelete: true,
      });
    }
  }
  
  /**
   * Analyze a directory and return file statistics
   */
  async analyzeDirectory(dirPath: string): Promise<{
    totalFiles: number;
    totalSize: number;
    oldFiles: number;
    oldFilesSize: number;
  }> {
    const result = {
      totalFiles: 0,
      totalSize: 0,
      oldFiles: 0,
      oldFilesSize: 0,
    };
    
    try {
      const files = await getFilesRecursively(dirPath);
      
      for (const file of files) {
        try {
          const stats = await fs.promises.stat(file);
          result.totalFiles++;
          result.totalSize += stats.size;
          
          const ageDays = await getFileAgeDays(file);
          if (ageDays > config.tempFileMaxAgeDays) {
            result.oldFiles++;
            result.oldFilesSize += stats.size;
          }
        } catch {
          // File might have been deleted or inaccessible
        }
      }
    } catch {
      // Directory might not exist or be accessible
    }
    
    return result;
  }
  
  /**
   * Get cleanup targets and their current sizes
   */
  async getCleanupTargets(): Promise<(CleanupTarget & { size: number; fileCount: number })[]> {
    logger.info('Scanning cleanup targets...');
    
    const results = [];
    
    for (const target of this.tempPaths) {
      try {
        const stats = await this.analyzeDirectory(target.path);
        results.push({
          ...target,
          size: stats.totalSize,
          fileCount: stats.totalFiles,
        });
      } catch {
        results.push({
          ...target,
          size: 0,
          fileCount: 0,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Clean a specific directory
   */
  async cleanDirectory(dirPath: string, olderThanDays: number = 0): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      filesDeleted: 0,
      spaceFreed: 0,
      errors: [],
      details: [],
    };
    
    try {
      if (!fs.existsSync(dirPath)) {
        return result;
      }
      
      const files = await getFilesRecursively(dirPath);
      
      for (const file of files) {
        try {
          const stats = await fs.promises.stat(file);
          
          // Check age if specified
          if (olderThanDays > 0) {
            const ageDays = await getFileAgeDays(file);
            if (ageDays <= olderThanDays) {
              continue;
            }
          }
          
          // Try to delete the file
          await fs.promises.unlink(file);
          result.filesDeleted++;
          result.spaceFreed += stats.size;
          result.details.push({
            path: file,
            size: stats.size,
            deleted: true,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.details.push({
            path: file,
            size: 0,
            deleted: false,
            error: errorMsg,
          });
          // Don't add to errors array for common permission issues
          if (!errorMsg.includes('EBUSY') && !errorMsg.includes('EPERM') && !errorMsg.includes('EACCES')) {
            result.errors.push(`${file}: ${errorMsg}`);
          }
        }
      }
      
      // Try to remove empty directories
      try {
        const entries = await fs.promises.readdir(dirPath);
        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry);
          const entryStat = await fs.promises.stat(entryPath);
          if (entryStat.isDirectory()) {
            try {
              await fs.promises.rmdir(entryPath);
            } catch {
              // Directory not empty or permission denied
            }
          }
        }
      } catch {
        // Access denied or other error
      }
      
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to clean directory: ${errorMsg}`);
    }
    
    return result;
  }
  
  /**
   * Run Windows Disk Cleanup utility
   */
  async runDiskCleanup(): Promise<CleanupResult> {
    logger.info('Running Windows Disk Cleanup...');
    
    const result: CleanupResult = {
      success: false,
      filesDeleted: 0,
      spaceFreed: 0,
      errors: [],
      details: [],
    };
    
    if (!isWindows()) {
      result.errors.push('Disk Cleanup is only supported on Windows');
      return result;
    }
    
    if (!await isAdmin()) {
      result.errors.push('Administrator privileges required for Disk Cleanup');
      return result;
    }
    
    try {
      // Set up Disk Cleanup with common cleanup options
      const psCommand = `
        $volumeCaches = Get-ChildItem -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VolumeCaches'
        foreach ($cache in $volumeCaches) {
          Set-ItemProperty -Path $cache.PSPath -Name 'StateFlags0100' -Value 2 -ErrorAction SilentlyContinue
        }
        Start-Process -FilePath 'cleanmgr.exe' -ArgumentList '/sagerun:100' -Wait -NoNewWindow
        'complete'
      `;
      
      await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`, );
      
      result.success = true;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Disk Cleanup failed: ${errorMsg}`);
    }
    
    return result;
  }
  
  /**
   * Empty the Recycle Bin
   */
  async emptyRecycleBin(): Promise<CleanupResult> {
    logger.info('Emptying Recycle Bin...');
    
    const result: CleanupResult = {
      success: false,
      filesDeleted: 0,
      spaceFreed: 0,
      errors: [],
      details: [],
    };
    
    if (!isWindows()) {
      result.errors.push('Recycle Bin emptying is only supported on Windows');
      return result;
    }
    
    try {
      const psCommand = `
        $shell = New-Object -ComObject Shell.Application
        $recycleBin = $shell.NameSpace(0xa)
        $items = $recycleBin.Items()
        $count = $items.Count
        Clear-RecycleBin -Force -ErrorAction SilentlyContinue
        $count
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      result.success = true;
      result.filesDeleted = parseInt(stdout.trim()) || 0;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to empty Recycle Bin: ${errorMsg}`);
    }
    
    return result;
  }
  
  /**
   * Clean browser cache and data
   */
  async cleanBrowserCache(): Promise<CleanupResult> {
    logger.info('Cleaning browser cache...');
    
    const totalResult: CleanupResult = {
      success: true,
      filesDeleted: 0,
      spaceFreed: 0,
      errors: [],
      details: [],
    };
    
    const browserTargets = this.tempPaths.filter(t => t.type === 'browser' && t.safeToDelete);
    
    for (const target of browserTargets) {
      const result = await this.cleanDirectory(target.path);
      totalResult.filesDeleted += result.filesDeleted;
      totalResult.spaceFreed += result.spaceFreed;
      totalResult.errors.push(...result.errors);
      totalResult.details.push(...result.details);
    }
    
    return totalResult;
  }
  
  /**
   * Run full cleanup operation
   */
  async runFullCleanup(): Promise<CleanupResult> {
    logger.info('Starting full system cleanup...');
    
    const totalResult: CleanupResult = {
      success: true,
      filesDeleted: 0,
      spaceFreed: 0,
      errors: [],
      details: [],
    };
    
    // Clean temp folders
    const tempTargets = this.tempPaths.filter(t => t.safeToDelete);
    for (const target of tempTargets) {
      logger.info(`Cleaning: ${target.description}`);
      const result = await this.cleanDirectory(target.path, config.tempFileMaxAgeDays);
      totalResult.filesDeleted += result.filesDeleted;
      totalResult.spaceFreed += result.spaceFreed;
      totalResult.errors.push(...result.errors);
    }
    
    // Empty recycle bin
    const recycleBinResult = await this.emptyRecycleBin();
    totalResult.filesDeleted += recycleBinResult.filesDeleted;
    totalResult.spaceFreed += recycleBinResult.spaceFreed;
    totalResult.errors.push(...recycleBinResult.errors);
    
    logger.info(`Cleanup complete. Deleted ${totalResult.filesDeleted} files, freed ${formatBytes(totalResult.spaceFreed)}`);
    
    return totalResult;
  }
  
  /**
   * Get disk space information
   */
  async getDiskSpace(): Promise<{ drive: string; total: number; free: number; used: number }[]> {
    if (!isWindows()) {
      try {
        const { stdout } = await executeCommand("df -B1 --output=target,size,avail,used | grep -E '^/'");
        const lines = stdout.trim().split('\n');
        return lines.map(line => {
          const parts = line.split(/\s+/);
          return {
            drive: parts[0],
            total: parseInt(parts[1]) || 0,
            free: parseInt(parts[2]) || 0,
            used: parseInt(parts[3]) || 0,
          };
        });
      } catch {
        return [];
      }
    }
    
    try {
      const psCommand = `
        Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" |
        ForEach-Object {
          @{
            drive = $_.DeviceID
            total = $_.Size
            free = $_.FreeSpace
            used = $_.Size - $_.FreeSpace
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
}

export default new FileSystemCleaner();
