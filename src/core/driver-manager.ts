import { logger, executeCommand, isWindows, isAdmin } from '../utils';

export interface DriverInfo {
  deviceName: string;
  driverVersion: string;
  driverDate: string;
  manufacturer: string;
  deviceClass: string;
  updateAvailable: boolean;
  latestVersion?: string;
}

export interface DriverUpdateResult {
  success: boolean;
  driversScanned: number;
  driversUpdated: number;
  drivers: DriverInfo[];
  message: string;
}

/**
 * Driver Manager - Manages GPU, CPU, and other hardware drivers
 * Handles scanning, checking for updates, and installing driver updates
 */
export class DriverManager {
  
  /**
   * Scan and list all installed drivers
   */
  async scanDrivers(): Promise<DriverInfo[]> {
    logger.info('Scanning installed drivers...');
    
    if (!isWindows()) {
      logger.warn('Driver management is only supported on Windows');
      return [];
    }
    
    try {
      // Use PowerShell to get driver information
      const psCommand = `
        Get-WmiObject Win32_PnPSignedDriver | 
        Where-Object { $_.DeviceName -ne $null } |
        Select-Object -First 50 DeviceName, DriverVersion, DriverDate, Manufacturer, DeviceClass |
        ForEach-Object {
          @{
            deviceName = $_.DeviceName
            driverVersion = $_.DriverVersion
            driverDate = if ($_.DriverDate) { $_.DriverDate.Substring(0,8) } else { 'Unknown' }
            manufacturer = $_.Manufacturer
            deviceClass = $_.DeviceClass
            updateAvailable = $false
          }
        } | ConvertTo-Json -Compress
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      if (stdout && stdout.trim() !== '' && stdout.trim() !== 'null') {
        const parsed = JSON.parse(stdout);
        const drivers = Array.isArray(parsed) ? parsed : [parsed];
        logger.info(`Found ${drivers.length} installed drivers`);
        return drivers;
      }
      
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to scan drivers: ${errorMessage}`);
      return [];
    }
  }
  
  /**
   * Get GPU-specific driver information
   */
  async getGPUDrivers(): Promise<DriverInfo[]> {
    logger.info('Getting GPU driver information...');
    
    if (!isWindows()) {
      return [];
    }
    
    try {
      const psCommand = `
        Get-WmiObject Win32_VideoController | 
        ForEach-Object {
          @{
            deviceName = $_.Name
            driverVersion = $_.DriverVersion
            driverDate = if ($_.DriverDate) { $_.DriverDate.Substring(0,8) } else { 'Unknown' }
            manufacturer = $_.AdapterCompatibility
            deviceClass = 'Display'
            updateAvailable = $false
          }
        } | ConvertTo-Json -Compress
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      if (stdout && stdout.trim() !== '' && stdout.trim() !== 'null') {
        const parsed = JSON.parse(stdout);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to get GPU drivers: ${errorMessage}`);
      return [];
    }
  }
  
  /**
   * Check for driver updates using Windows Update
   */
  async checkForDriverUpdates(): Promise<DriverUpdateResult> {
    logger.info('Checking for driver updates...');
    
    if (!isWindows()) {
      return {
        success: false,
        driversScanned: 0,
        driversUpdated: 0,
        drivers: [],
        message: 'Driver management is only supported on Windows',
      };
    }
    
    if (!await isAdmin()) {
      return {
        success: false,
        driversScanned: 0,
        driversUpdated: 0,
        drivers: [],
        message: 'Administrator privileges required',
      };
    }
    
    try {
      // Check Windows Update for driver updates
      const psCommand = `
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Driver'")
        $Drivers = @()
        foreach ($Update in $SearchResult.Updates) {
          $Drivers += @{
            deviceName = $Update.Title
            driverVersion = 'Latest'
            driverDate = (Get-Date).ToString('yyyyMMdd')
            manufacturer = 'Windows Update'
            deviceClass = 'Driver Update'
            updateAvailable = $true
          }
        }
        @{
          count = $Drivers.Count
          drivers = $Drivers
        } | ConvertTo-Json -Compress -Depth 3
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      const result = JSON.parse(stdout.trim());
      
      logger.info(`Found ${result.count} driver updates available`);
      
      return {
        success: true,
        driversScanned: 0,
        driversUpdated: 0,
        drivers: result.drivers || [],
        message: `Found ${result.count} driver updates available`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to check for driver updates: ${errorMessage}`);
      return {
        success: false,
        driversScanned: 0,
        driversUpdated: 0,
        drivers: [],
        message: `Failed to check for driver updates: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Install driver updates via Windows Update
   */
  async installDriverUpdates(): Promise<DriverUpdateResult> {
    logger.info('Installing driver updates...');
    
    if (!isWindows()) {
      return {
        success: false,
        driversScanned: 0,
        driversUpdated: 0,
        drivers: [],
        message: 'Driver management is only supported on Windows',
      };
    }
    
    if (!await isAdmin()) {
      return {
        success: false,
        driversScanned: 0,
        driversUpdated: 0,
        drivers: [],
        message: 'Administrator privileges required',
      };
    }
    
    try {
      const psCommand = `
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Driver'")
        
        if ($SearchResult.Updates.Count -eq 0) {
          Write-Output '{"installed":0}'
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
        
        Write-Output "{\\"installed\\":$($UpdatesToInstall.Count)}"
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      const result = JSON.parse(stdout.trim());
      
      logger.info(`Installed ${result.installed} driver updates`);
      
      return {
        success: true,
        driversScanned: 0,
        driversUpdated: result.installed,
        drivers: [],
        message: `Installed ${result.installed} driver updates`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to install driver updates: ${errorMessage}`);
      return {
        success: false,
        driversScanned: 0,
        driversUpdated: 0,
        drivers: [],
        message: `Failed to install driver updates: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Get device manager information for troubleshooting
   */
  async getDeviceStatus(): Promise<{ name: string; status: string; problem: string }[]> {
    if (!isWindows()) {
      return [];
    }
    
    try {
      const psCommand = `
        Get-WmiObject Win32_PnPEntity |
        Where-Object { $_.ConfigManagerErrorCode -ne 0 } |
        Select-Object -First 20 Name, Status, ConfigManagerErrorCode |
        ForEach-Object {
          @{
            name = $_.Name
            status = $_.Status
            problem = switch ($_.ConfigManagerErrorCode) {
              1 { 'Device not configured correctly' }
              3 { 'Driver corrupted' }
              10 { 'Device cannot start' }
              12 { 'Not enough resources' }
              14 { 'Restart required' }
              18 { 'Reinstall drivers' }
              22 { 'Device disabled' }
              24 { 'Device not present' }
              28 { 'No driver installed' }
              29 { 'Firmware not providing resources' }
              31 { 'Device not working properly' }
              default { 'Unknown error' }
            }
          }
        } | ConvertTo-Json -Compress
      `;
      
      const { stdout } = await executeCommand(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
      
      if (stdout && stdout.trim() !== '' && stdout.trim() !== 'null' && stdout.trim() !== '[]') {
        const parsed = JSON.parse(stdout);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      
      return [];
    } catch {
      return [];
    }
  }
}

export default new DriverManager();
