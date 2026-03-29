import { execSync } from 'child_process';
import { createHash } from 'crypto';
import os from 'os';

/**
 * Hardware ID Detection Module
 * 
 * Generates a unique hardware identifier based on:
 * - Motherboard serial number
 * - CPU ID
 * - System UUID (if available)
 * 
 * Works on Windows, Linux, and macOS
 */

export interface HardwareInfo {
  motherboardSerial: string;
  cpuId: string;
  systemUuid: string;
  compositeHash: string;
  platform: string;
  hostname: string;
}

/**
 * Get motherboard serial number based on platform
 */
function getMotherboardSerial(): string {
  try {
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows: Use WMIC
      const output = execSync('wmic baseboard get serialnumber', { 
        encoding: 'utf8',
        timeout: 5000 
      });
      const lines = output.trim().split('\n');
      // Return the second line (first line is header)
      return lines.length > 1 ? lines[1].trim() : 'unknown';
    } else if (platform === 'linux') {
      // Linux: Read from /sys/class/dmi/id/board_serial
      try {
        const output = execSync('cat /sys/class/dmi/id/board_serial 2>/dev/null || echo "unknown"', {
          encoding: 'utf8',
          timeout: 5000
        });
        return output.trim() || 'unknown';
      } catch {
        // Fallback: use dmidecode
        const output = execSync('sudo dmidecode -s baseboard-serial-number 2>/dev/null || echo "unknown"', {
          encoding: 'utf8',
          timeout: 5000
        });
        return output.trim() || 'unknown';
      }
    } else if (platform === 'darwin') {
      // macOS: Use system_profiler
      const output = execSync('system_profiler SPHardwareDataType | grep "Serial Number" | awk \'{print $4}\'', {
        encoding: 'utf8',
        timeout: 5000
      });
      return output.trim() || 'unknown';
    }
    
    return 'unknown';
  } catch (error) {
    console.warn('Failed to get motherboard serial:', error);
    return 'unknown';
  }
}

/**
 * Get CPU ID based on platform
 */
function getCpuId(): string {
  try {
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows: Use WMIC
      const output = execSync('wmic cpu get ProcessorId', {
        encoding: 'utf8',
        timeout: 5000
      });
      const lines = output.trim().split('\n');
      return lines.length > 1 ? lines[1].trim() : 'unknown';
    } else if (platform === 'linux') {
      // Linux: Read from /proc/cpuinfo
      const output = execSync('grep -m 1 "model name" /proc/cpuinfo | cut -d: -f2 | xargs', {
        encoding: 'utf8',
        timeout: 5000
      });
      return output.trim() || 'unknown';
    } else if (platform === 'darwin') {
      // macOS: Use sysctl
      const output = execSync('sysctl -n machdep.cpu.brand_string', {
        encoding: 'utf8',
        timeout: 5000
      });
      return output.trim() || 'unknown';
    }
    
    return 'unknown';
  } catch (error) {
    console.warn('Failed to get CPU ID:', error);
    return 'unknown';
  }
}

/**
 * Get system UUID based on platform
 */
function getSystemUuid(): string {
  try {
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows: Use WMIC
      const output = execSync('wmic csproduct get UUID', {
        encoding: 'utf8',
        timeout: 5000
      });
      const lines = output.trim().split('\n');
      return lines.length > 1 ? lines[1].trim() : 'unknown';
    } else if (platform === 'linux') {
      // Linux: Read from /sys/class/dmi/id/product_uuid
      try {
        const output = execSync('cat /sys/class/dmi/id/product_uuid 2>/dev/null || echo "unknown"', {
          encoding: 'utf8',
          timeout: 5000
        });
        return output.trim() || 'unknown';
      } catch {
        // Fallback: use dmidecode
        const output = execSync('sudo dmidecode -s system-uuid 2>/dev/null || echo "unknown"', {
          encoding: 'utf8',
          timeout: 5000
        });
        return output.trim() || 'unknown';
      }
    } else if (platform === 'darwin') {
      // macOS: Use ioreg
      const output = execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID | awk \'{print $3}\' | tr -d \'"\'', {
        encoding: 'utf8',
        timeout: 5000
      });
      return output.trim() || 'unknown';
    }
    
    return 'unknown';
  } catch (error) {
    console.warn('Failed to get system UUID:', error);
    return 'unknown';
  }
}

/**
 * Generate a composite hardware hash from multiple hardware identifiers
 * This provides more stability - if one identifier changes, others may remain the same
 */
export function generateHardwareId(): HardwareInfo {
  const motherboardSerial = getMotherboardSerial();
  const cpuId = getCpuId();
  const systemUuid = getSystemUuid();
  const platform = os.platform();
  const hostname = os.hostname();
  
  // Create composite string from all hardware identifiers
  // Use a consistent order for hashing
  const compositeString = [
    `MB:${motherboardSerial}`,
    `CPU:${cpuId}`,
    `UUID:${systemUuid}`,
    `HOST:${hostname}`,
    `PLATFORM:${platform}`
  ].join('|');
  
  // Generate SHA-256 hash of the composite string
  const compositeHash = createHash('sha256')
    .update(compositeString)
    .digest('hex')
    .toUpperCase();
  
  return {
    motherboardSerial,
    cpuId,
    systemUuid,
    compositeHash,
    platform,
    hostname
  };
}

/**
 * Get just the hardware hash (for quick comparisons)
 */
export function getHardwareHash(): string {
  const hardwareInfo = generateHardwareId();
  return hardwareInfo.compositeHash;
}

/**
 * Compare two hardware hashes with tolerance for minor changes
 * Returns true if they match or are similar enough
 */
export function compareHardwareHashes(hash1: string, hash2: string): boolean {
  // Exact match
  if (hash1 === hash2) {
    return true;
  }
  
  // For now, require exact match
  // In the future, could implement fuzzy matching for minor hardware changes
  return false;
}

/**
 * Check if hardware has changed significantly
 * Returns true if the change is significant enough to require reactivation
 */
export function hasHardwareChanged(storedHash: string, currentHash: string): boolean {
  return !compareHardwareHashes(storedHash, currentHash);
}
