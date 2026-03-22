import crypto from 'crypto';

// License key format: POS-XXXX-XXXX-XXXX-XXXX (where X is alphanumeric)
// Example: POS-A1B2-C3D4-E5F6-G7H8

const LICENSE_PREFIX = 'POS';
const KEY_SEGMENT_LENGTH = 4;

function generateSegment(): string {
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

export function generateLicenseKey(
  licenseType: 'trial' | 'annual' | 'lifetime' = 'annual',
  businessName?: string
): string {
  const segments = [
    LICENSE_PREFIX,
    generateSegment(),
    generateSegment(),
    generateSegment(),
    generateSegment(),
  ];
  
  // Add type prefix for tracking
  const typePrefix = licenseType === 'trial' ? 'T' : licenseType === 'lifetime' ? 'L' : 'A';
  segments[1] = typePrefix + segments[1].slice(1);
  
  return segments.join('-');
}

export function generateRenewalKey(originalKey: string): string {
  // Renewal keys start with REN-
  const segments = [
    'REN',
    generateSegment(),
    generateSegment(),
    generateSegment(),
  ];
  
  return segments.join('-');
}

export function validateLicenseKeyFormat(key: string): boolean {
  // Check format: POS-XXXX-XXXX-XXXX-XXXX or REN-XXXX-XXXX-XXXX
  const posPattern = /^POS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  const renPattern = /^REN-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  
  return posPattern.test(key) || renPattern.test(key);
}

export function getLicenseTypeFromKey(key: string): 'trial' | 'annual' | 'lifetime' | null {
  if (!validateLicenseKeyFormat(key)) return null;
  
  const segment = key.split('-')[1];
  if (!segment) return null;
  
  const firstChar = segment[0];
  
  if (firstChar === 'T') return 'trial';
  if (firstChar === 'L') return 'lifetime';
  if (firstChar === 'A') return 'annual';
  
  return null;
}

export function calculateExpirationDate(
  licenseType: 'trial' | 'annual' | 'lifetime',
  fromDate: Date = new Date()
): Date {
  const expiration = new Date(fromDate);
  
  switch (licenseType) {
    case 'trial':
      // 14 days trial
      expiration.setDate(expiration.getDate() + 14);
      break;
    case 'annual':
      // 1 year
      expiration.setFullYear(expiration.getFullYear() + 1);
      break;
    case 'lifetime':
      // 50 years (practically forever)
      expiration.setFullYear(expiration.getFullYear() + 50);
      break;
  }
  
  return expiration;
}

export interface LicenseValidationResult {
  valid: boolean;
  error?: string;
  license?: {
    licenseKey: string;
    businessName: string;
    expirationDate: string;
    daysRemaining: number;
    licenseType: string;
    status: string;
  };
}

export function isLicenseExpired(expirationDate: Date): boolean {
  return new Date() > expirationDate;
}

export function getDaysUntilExpiration(expirationDate: Date): number {
  const now = new Date();
  const diff = expirationDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isLicenseExpiringSoon(expirationDate: Date, daysThreshold: number = 30): boolean {
  const daysRemaining = getDaysUntilExpiration(expirationDate);
  return daysRemaining > 0 && daysRemaining <= daysThreshold;
}

// Hash license key for storage comparison (adds security)
export function hashLicenseKey(key: string): string {
  return crypto
    .createHash('sha256')
    .update(key.toUpperCase())
    .digest('hex')
    .substring(0, 32);
}
