/**
 * KRA (Kenya Revenue Authority) e-Invoice QR Code Generator
 * 
 * Generates a QR code containing tax compliance information as per KRA requirements.
 * The QR code data is formatted as a JSON string that can be scanned for tax verification.
 */

export interface KRAInvoiceData {
  /** Seller's KRA PIN */
  sellerPin: string;
  /** Invoice number */
  invoiceNumber: string;
  /** Date of issue (ISO 8601 format) */
  dateOfIssue: string;
  /** Total taxable amount (excluding VAT) */
  taxableAmount: number;
  /** VAT amount */
  vatAmount: number;
  /** Total amount (including VAT) */
  totalAmount: number;
  /** Invoice type: 'RECEIPT' or 'INVOICE' */
  invoiceType: string;
  /** Optional: Internal QR identifier */
  qrId?: string;
}

/**
 * Generate KRA-compliant QR code data as JSON string
 */
export function generateKRAQRData(invoiceData: KRAInvoiceData): string {
  const qrData: KRAInvoiceData = {
    sellerPin: invoiceData.sellerPin || '',
    invoiceNumber: invoiceData.invoiceNumber || '',
    dateOfIssue: invoiceData.dateOfIssue || new Date().toISOString(),
    taxableAmount: invoiceData.taxableAmount || 0,
    vatAmount: invoiceData.vatAmount || 0,
    totalAmount: invoiceData.totalAmount || 0,
    invoiceType: invoiceData.invoiceType || 'INVOICE',
    qrId: invoiceData.qrId || generateQRId()
  };
  
  return JSON.stringify(qrData);
}

/**
 * Generate a unique QR identifier
 */
function generateQRId(): string {
  return `QR${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Format date for KRA compliance (ISO 8601)
 */
export function formatKRADate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Calculate taxable amount from total and VAT
 */
export function calculateTaxableAmount(total: number, vatRate: number): number {
  // If VAT is included in total, extract it
  // taxable = total / (1 + vatRate/100)
  if (vatRate > 0) {
    return total / (1 + vatRate / 100);
  }
  return total;
}

/**
 * Calculate VAT from total and rate
 */
export function calculateVAT(total: number, vatRate: number): number {
  const taxable = calculateTaxableAmount(total, vatRate);
  return total - taxable;
}
