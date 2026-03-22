import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-KE').format(num);
}

export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${year}${month}${day}${random}`;
}

/**
 * Generate a sequential cash sale number like CSH-00001
 * Uses the settings to track and increment the number
 */
export function generateCashSaleNumber(settings: { cashSalePrefix?: string; cashSaleNumber?: number }): { 
  invoiceNumber: string; 
  newCashSaleNumber: number 
} {
  const prefix = settings.cashSalePrefix || 'CSH';
  const currentNumber = settings.cashSaleNumber || 1;
  const newNumber = currentNumber + 1;
  const invoiceNumber = `${prefix}-${String(currentNumber).padStart(5, '0')}`;
  return {
    invoiceNumber,
    newCashSaleNumber: newNumber
  };
}

// Financial Year Types and Functions

export interface FinancialYearConfig {
  startMonth: number; // 1-12
  endMonth: number; // 1-12
  currentYear: string;
  startDate: Date;
  invoiceNumbersByYear: Record<string, number>;
  cashSaleNumbersByYear: Record<string, number>;
}

/**
 * Calculate the financial year string for a given date
 * Format: "2025-2026"
 */
export function getFinancialYear(date: Date, startMonth: number): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  // If we're in months before the start month, we're in the previous financial year
  if (month < startMonth) {
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
}

/**
 * Get the start date of a financial year
 */
export function getFinancialYearStartDate(financialYear: string, startMonth: number): Date {
  const [startYear] = financialYear.split('-').map(Number);
  return new Date(startYear, startMonth - 1, 1);
}

/**
 * Check if a date is in a new financial year compared to the stored current year
 */
export function isNewFinancialYear(
  currentDate: Date,
  currentFinancialYear: string,
  startMonth: number
): boolean {
  const newYear = getFinancialYear(currentDate, startMonth);
  return newYear !== currentFinancialYear;
}

/**
 * Generate invoice number with financial year (e.g., INV2526-00001)
 */
export function generateInvoiceNumberWithFY(
  prefix: string,
  financialYear: string,
  currentNumber: number
): { invoiceNumber: string; newNumber: number } {
  // Extract short year from format "2025-2026" -> "2526"
  const shortYear = financialYear.replace('-', '').slice(-4);
  const newNumber = currentNumber + 1;
  const invoiceNumber = `${prefix}${shortYear}-${String(currentNumber).padStart(5, '0')}`;
  return {
    invoiceNumber,
    newNumber
  };
}

/**
 * Generate cash sale number with financial year (e.g., CSH2526-00001)
 */
export function generateCashSaleNumberWithFY(
  prefix: string,
  financialYear: string,
  currentNumber: number
): { invoiceNumber: string; newNumber: number } {
  // Extract short year from format "2025-2026" -> "2526"
  const shortYear = financialYear.replace('-', '').slice(-4);
  const newNumber = currentNumber + 1;
  const invoiceNumber = `${prefix}${shortYear}-${String(currentNumber).padStart(5, '0')}`;
  return {
    invoiceNumber,
    newNumber
  };
}

/**
 * Check and update financial year if needed
 * Returns the current (potentially updated) financial year
 */
export function checkAndUpdateFinancialYear(
  settings: FinancialYearConfig
): { 
  financialYear: string; 
  isNewYear: boolean;
  resetInvoiceNumber: boolean;
  resetCashSaleNumber: boolean;
} {
  const today = new Date();
  const { startMonth, currentYear, invoiceNumbersByYear, cashSaleNumbersByYear } = settings;
  
  const newYear = getFinancialYear(today, startMonth);
  const isNewYear = newYear !== currentYear;
  
  // Check if we need to reset counters
  const shouldResetInvoice = isNewYear && (!invoiceNumbersByYear || !invoiceNumbersByYear[newYear]);
  const shouldResetCashSale = isNewYear && (!cashSaleNumbersByYear || !cashSaleNumbersByYear[newYear]);
  
  return {
    financialYear: newYear,
    isNewYear,
    resetInvoiceNumber: shouldResetInvoice,
    resetCashSaleNumber: shouldResetCashSale
  };
}

export function generateSKU(categoryCode: string): string {
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${categoryCode.toUpperCase()}${random}`;
}

export function generateBarcode(): string {
  const random = Math.floor(Math.random() * 100000000000).toString().padStart(12, '0');
  return random;
}

export function calculateDiscount(
  subtotal: number,
  discount: number,
  discountType: 'percentage' | 'fixed'
): number {
  if (discountType === 'percentage') {
    return (subtotal * discount) / 100;
  }
  return discount;
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return (subtotal * taxRate) / 100;
}

export function calculateProfit(
  sellingPrice: number,
  costPrice: number,
  quantity: number
): number {
  return (sellingPrice - costPrice) * quantity;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(date);
}
