import { logger, executeCommand, isWindows, isAdmin } from '../utils';

export interface UpdateInfo {
  name: string;
  kb: string;
  size: string;
  category: string;
  installed: boolean;
}

export interface UpdateResult {
  success: boolean;
  updatesAvailable: number;
  updatesInstalled: number;
  updates: UpdateInfo[];
  requiresReboot: boolean;
  message: string;
}

/**
 * System Updater - Manages Windows Updates
 * Handles checking for updates, downloading, and installing system updates
 */
export class SystemUpdater {
  
  /**
   * Check for available Windows updates
   */
  async checkForUpdates(): Promise<UpdateResult> {
    logger.info('Checking for system updates...');
    
    if (!isWindows()) {
      logger.warn('System updates are only supported on Windows');
      return {
        success: false,
        updatesAvailable: 0,
        updatesInstalled: 0,
        updates: [],
        requiresReboot: false,
        message: 'System updates are only supported on Windows',
      };
    }
    
    if (!await isAdmin()) {
      logger.warn('Administrator privileges required for update operations');
      return {
        success: false,
        updatesAvailable: 0,
        updatesInstalled: 0,
        updates: [],
        requiresReboot: false,
        message: 'Administrator privileges required',
      };
    }
    
    try {
      // Use PowerShell to check for updates via Windows Update API
      const psCommand = `
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0")
        $Updates = @()
        foreach ($Update in $SearchResult.Updates) {
          $Updates += @{
            Name = $Update.Title
            KB = ($Update.KBArticleIDs -join ',')
            Size = [math]::Round($Update.MaxDownloadSize / 1MB, 2)
            Category = ($Update.Categories | Select-Object -First 1).Name
            Installed = $false
          }
        }
        $Updates | ConvertTo-Json -Compress
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      let updates: UpdateInfo[] = [];
      if (stdout && stdout.trim() !== '' && stdout.trim() !== 'null') {
        const parsed = JSON.parse(stdout);
        updates = Array.isArray(parsed) ? parsed : [parsed];
      }
      
      logger.info(`Found ${updates.length} available updates`);
      
      return {
        success: true,
        updatesAvailable: updates.length,
        updatesInstalled: 0,
        updates,
        requiresReboot: false,
        message: `Found ${updates.length} available updates`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to check for updates: ${errorMessage}`);
      return {
        success: false,
        updatesAvailable: 0,
        updatesInstalled: 0,
        updates: [],
        requiresReboot: false,
        message: `Failed to check for updates: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Download and install available updates
   */
  async installUpdates(): Promise<UpdateResult> {
    logger.info('Starting update installation...');
    
    if (!isWindows()) {
      return {
        success: false,
        updatesAvailable: 0,
        updatesInstalled: 0,
        updates: [],
        requiresReboot: false,
        message: 'System updates are only supported on Windows',
      };
    }
    
    if (!await isAdmin()) {
      return {
        success: false,
        updatesAvailable: 0,
        updatesInstalled: 0,
        updates: [],
        requiresReboot: false,
        message: 'Administrator privileges required',
      };
    }
    
    try {
      // Use PowerShell to download and install updates
      const psCommand = `
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0")
        
        if ($SearchResult.Updates.Count -eq 0) {
          Write-Output '{"installed":0,"requiresReboot":false}'
          exit 0
        }
        
        $UpdatesToDownload = New-Object -ComObject Microsoft.Update.UpdateColl
        foreach ($Update in $SearchResult.Updates) {
          if ($Update.EulaAccepted -eq $false) { $Update.AcceptEula() }
          $UpdatesToDownload.Add($Update) | Out-Null
        }
        
        $Downloader = $UpdateSession.CreateUpdateDownloader()
        $Downloader.Updates = $UpdatesToDownload
        $DownloadResult = $Downloader.Download()
        
        $UpdatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
        foreach ($Update in $SearchResult.Updates) {
          if ($Update.IsDownloaded) {
            $UpdatesToInstall.Add($Update) | Out-Null
          }
        }
        
        $Installer = $UpdateSession.CreateUpdateInstaller()
        $Installer.Updates = $UpdatesToInstall
        $InstallResult = $Installer.Install()
        
        $RebootRequired = $InstallResult.RebootRequired
        $InstalledCount = $UpdatesToInstall.Count
        
        Write-Output "{\\"installed\\":$InstalledCount,\\"requiresReboot\\":$($RebootRequired.ToString().ToLower())}"
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      const result = JSON.parse(stdout.trim());
      
      logger.info(`Installed ${result.installed} updates. Reboot required: ${result.requiresReboot}`);
      
      return {
        success: true,
        updatesAvailable: 0,
        updatesInstalled: result.installed,
        updates: [],
        requiresReboot: result.requiresReboot,
        message: `Installed ${result.installed} updates`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to install updates: ${errorMessage}`);
      return {
        success: false,
        updatesAvailable: 0,
        updatesInstalled: 0,
        updates: [],
        requiresReboot: false,
        message: `Failed to install updates: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Get Windows Update history
   */
  async getUpdateHistory(): Promise<UpdateInfo[]> {
    if (!isWindows()) {
      return [];
    }
    
    try {
      const psCommand = `
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $History = $UpdateSearcher.QueryHistory(0, 50)
        $Updates = @()
        foreach ($Update in $History) {
          $Updates += @{
            Name = $Update.Title
            KB = ''
            Size = '0'
            Category = $Update.Categories
            Installed = $true
          }
        }
        $Updates | ConvertTo-Json -Compress
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

export default new SystemUpdater();
