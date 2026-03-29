import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * System-Wide License Storage Module
 * 
 * Stores license activation data in a system-wide location that:
 * - Persists across user switches
 * - Persists across system reboots
 * - Is accessible to all users on the system
 * 
 * Storage locations:
 * - Windows: C:\ProgramData\NairobiPOS\license.dat (or registry)
 * - Linux: /etc/nairobi-pos/license.dat
 * - macOS: /Library/Application Support/NairobiPOS/license.dat
 */

export interface SystemLicenseData {
  licenseKey: string;
  hardwareHash: string;
  activatedAt: string;
  lastValidated: string;
  businessName: string;
  email: string;
  licenseType: string;
  status: string;
  expirationDate: string;
}

/**
 * Get the system-wide storage directory path
 */
function getSystemStorageDir(): string {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Windows: Use ProgramData
    const programData = process.env.ProgramData || 'C:\\ProgramData';
    return path.join(programData, 'NairobiPOS');
  } else if (platform === 'linux') {
    // Linux: Use /etc
    return '/etc/nairobi-pos';
  } else if (platform === 'darwin') {
    // macOS: Use /Library/Application Support
    return '/Library/Application Support/NairobiPOS';
  }
  
  // Fallback: Use home directory
  return path.join(os.homedir(), '.nairobi-pos');
}

/**
 * Get the full path to the license file
 */
function getLicenseFilePath(): string {
  return path.join(getSystemStorageDir(), 'license.dat');
}

/**
 * Ensure the storage directory exists with proper permissions
 */
function ensureStorageDirectory(): void {
  const dir = getSystemStorageDir();
  
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      
      // On Unix-like systems, ensure the directory is world-readable
      if (os.platform() !== 'win32') {
        try {
          execSync(`chmod 755 "${dir}"`, { timeout: 5000 });
        } catch (error) {
          console.warn('Failed to set directory permissions:', error);
        }
      }
    } catch (error) {
      console.error('Failed to create storage directory:', error);
      throw new Error('Cannot create system storage directory. Please run as administrator/root.');
    }
  }
}

/**
 * Save license data to system-wide storage
 */
export function saveSystemLicense(data: SystemLicenseData): boolean {
  try {
    ensureStorageDirectory();
    
    const filePath = getLicenseFilePath();
    const jsonData = JSON.stringify(data, null, 2);
    
    // Write to a temporary file first, then rename for atomicity
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, jsonData, { encoding: 'utf8', mode: 0o644 });
    
    // On Unix-like systems, ensure the file is world-readable
    if (os.platform() !== 'win32') {
      try {
        execSync(`chmod 644 "${tempPath}"`, { timeout: 5000 });
      } catch (error) {
        console.warn('Failed to set file permissions:', error);
      }
    }
    
    // Atomic rename
    fs.renameSync(tempPath, filePath);
    
    console.log('License data saved to system storage:', filePath);
    return true;
  } catch (error) {
    console.error('Failed to save system license:', error);
    return false;
  }
}

/**
 * Load license data from system-wide storage
 */
export function loadSystemLicense(): SystemLicenseData | null {
  try {
    const filePath = getLicenseFilePath();
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const jsonData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonData) as SystemLicenseData;
    
    return data;
  } catch (error) {
    console.error('Failed to load system license:', error);
    return null;
  }
}

/**
 * Check if system license exists
 */
export function hasSystemLicense(): boolean {
  const filePath = getLicenseFilePath();
  return fs.existsSync(filePath);
}

/**
 * Delete system license (for deactivation)
 */
export function deleteSystemLicense(): boolean {
  try {
    const filePath = getLicenseFilePath();
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('System license deleted:', filePath);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete system license:', error);
    return false;
  }
}

/**
 * Get the storage path for display purposes
 */
export function getStoragePath(): string {
  return getLicenseFilePath();
}

/**
 * Verify hardware matches stored hardware hash
 * Returns true if hardware matches or no stored license exists
 */
export function verifyHardwareMatch(currentHardwareHash: string): {
  matches: boolean;
  storedHash: string | null;
  requiresReactivation: boolean;
} {
  const storedLicense = loadSystemLicense();
  
  if (!storedLicense) {
    // No stored license - first time activation
    return {
      matches: true,
      storedHash: null,
      requiresReactivation: false
    };
  }
  
  const storedHash = storedLicense.hardwareHash;
  const matches = storedHash === currentHardwareHash;
  
  return {
    matches,
    storedHash,
    requiresReactivation: !matches
  };
}

/**
 * Update last validated timestamp
 */
export function updateLastValidated(): boolean {
  try {
    const storedLicense = loadSystemLicense();
    
    if (!storedLicense) {
      return false;
    }
    
    storedLicense.lastValidated = new Date().toISOString();
    return saveSystemLicense(storedLicense);
  } catch (error) {
    console.error('Failed to update last validated:', error);
    return false;
  }
}
