// ============================================================
// BARCODE AND QR CODE GENERATOR
// Generates barcode and QR code bitmaps for thermal printers
// ============================================================

import { BarcodeType, QRErrorCorrection, BarcodeGenerationError } from './types';

// Barcode patterns for CODE39
const CODE39_CHARS: Record<string, number[]> = {
  '0': [0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0],
  '1': [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
  '2': [0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0],
  '3': [1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0],
  '4': [0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0],
  '5': [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0],
  '6': [0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0],
  '7': [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
  '8': [1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
  '9': [0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0],
  'A': [1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  'B': [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
  'C': [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
  'D': [0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0],
  'E': [1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0],
  'F': [0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0],
  'G': [0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0],
  'H': [1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0],
  'I': [0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0],
  'J': [0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0],
  'K': [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
  'L': [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  'M': [1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  'N': [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  'O': [1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  'P': [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
  'Q': [0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0],
  'R': [1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0],
  'S': [0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0],
  'T': [0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0],
  'U': [1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  'V': [0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  'W': [1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  'X': [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  'Y': [1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  'Z': [0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0],
  '-': [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  '.': [1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  ' ': [0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  '$': [0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  '/': [0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  '+': [0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
  '%': [0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  '*': [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0]
};

// ============================================================
// BARCODE GENERATOR
// ============================================================

export class BarcodeGenerator {
  /**
   * Generate CODE39 barcode bitmap
   */
  static generateCODE39(data: string, width: number = 2, height: number = 50): number[] {
    const upperData = data.toUpperCase();
    const bits: number[] = [];
    
    // Start pattern (*)
    bits.push(...this.expandBits(CODE39_CHARS['*'], width));
    
    for (const char of upperData) {
      const pattern = CODE39_CHARS[char];
      if (!pattern) {
        throw new BarcodeGenerationError(`Invalid character for CODE39: ${char}`);
      }
      bits.push(0); // Inter-character gap
      bits.push(...this.expandBits(pattern, width));
    }
    
    // Stop pattern (*)
    bits.push(0);
    bits.push(...this.expandBits(CODE39_CHARS['*'], width));
    
    // Add quiet zone
    const quietZone = new Array(10 * width).fill(0);
    
    return [...quietZone, ...bits, ...quietZone];
  }

  /**
   * Generate CODE128 barcode (simplified - uses CODE C for numbers)
   */
  static generateCODE128(data: string, width: number = 2, height: number = 50): number[] {
    const bits: number[] = [];
    const patterns = this.getCODE128Patterns();
    
    // Start CODE C
    bits.push(...this.expandBits(patterns[105], width)); // CODE C start
    
    // Encode data using CODE C (pairs of digits)
    for (let i = 0; i < data.length; i += 2) {
      if (i + 1 < data.length && /^\d\d$/.test(data.substring(i, i + 2))) {
        // Two digits - use CODE C
        const value = parseInt(data.substring(i, i + 2), 10);
        bits.push(0); // Inter-character gap
        bits.push(...this.expandBits(patterns[value], width));
      } else {
        // Single character or non-digit
        const charCode = data.charCodeAt(i);
        let set = 0; // CODE A
        
        // Determine character set
        if (charCode >= 32 && charCode <= 95) {
          set = 0; // CODE A
        } else if (charCode >= 96 && charCode <= 127) {
          set = 1; // CODE B
        } else {
          set = 0; // Default to CODE A
        }
        
        // Add shift if needed
        const value = charCode - 32 + (set === 1 ? 64 : 0);
        bits.push(0);
        bits.push(...this.expandBits(patterns[value], width));
      }
    }
    
    // Calculate and add check digit
    let checksum = 105; // Start CODE C
    for (let i = 0; i < data.length; i++) {
      const value = data.charCodeAt(i) - 32;
      checksum += value * (i + 1);
    }
    bits.push(0);
    bits.push(...this.expandBits(patterns[checksum % 95], width));
    
    // Stop pattern
    bits.push(0);
    bits.push(...this.expandBits(patterns[106], width));
    
    // Quiet zone
    const quietZone = new Array(10 * width).fill(0);
    return [...quietZone, ...bits, ...quietZone];
  }

  /**
   * Generate UPC-A barcode
   */
  static generateUPCA(barcode: string, width: number = 2, height: number = 50): number[] {
    // Validate UPC-A (12 digits)
    if (!/^\d{12}$/.test(barcode)) {
      throw new BarcodeGenerationError('UPC-A requires exactly 12 digits');
    }

    const bits: number[] = [];
    const patterns = this.getUPCAPatterns();
    
    // Quiet zone
    bits.push(...new Array(9 * width).fill(0));
    
    // Start guard (101)
    bits.push(...this.expandBits([1, 0, 1], width));
    
    // Left side (first 6 digits, L patterns)
    for (let i = 0; i < 6; i++) {
      const digit = parseInt(barcode[i], 10);
      bits.push(...this.expandBits(patterns.l[digit], width));
    }
    
    // Center guard (01010)
    bits.push(...this.expandBits([0, 1, 0, 1, 0], width));
    
    // Right side (last 6 digits, R patterns)
    for (let i = 6; i < 12; i++) {
      const digit = parseInt(barcode[i], 10);
      bits.push(...this.expandBits(patterns.r[digit], width));
    }
    
    // End guard (101)
    bits.push(...this.expandBits([1, 0, 1], width));
    
    // Quiet zone
    bits.push(...new Array(9 * width).fill(0));
    
    return bits;
  }

  /**
   * Generate EAN-13 barcode
   */
  static generateEAN13(barcode: string, width: number = 2, height: number = 50): number[] {
    // Validate EAN-13 (13 digits)
    if (!/^\d{13}$/.test(barcode)) {
      throw new BarcodeGenerationError('EAN-13 requires exactly 13 digits');
    }

    const bits: number[] = [];
    const patterns = this.getEAN13Patterns();
    
    // Calculate check digit
    const digits = barcode.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    // Determine parity pattern based on first digit
    const parityPattern = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 1, 1],
      [0, 0, 1, 1, 0, 1],
      [0, 0, 1, 1, 1, 0],
      [0, 1, 0, 0, 1, 1],
      [0, 1, 1, 0, 0, 1],
      [0, 1, 1, 1, 0, 0],
      [0, 1, 0, 1, 0, 1],
      [0, 1, 0, 1, 1, 0],
      [0, 1, 1, 0, 1, 0]
    ];
    
    const firstDigit = digits[0];
    const parity = parityPattern[firstDigit];
    
    // Quiet zone
    bits.push(...new Array(7 * width).fill(0));
    
    // Start guard
    bits.push(...this.expandBits([1, 0, 1], width));
    
    // Left side (digits 2-7)
    for (let i = 1; i < 7; i++) {
      const digit = digits[i];
      const useLG = parity[i - 1] === 1;
      bits.push(...this.expandBits(useLG ? patterns.l[digit] : patterns.g[digit], width));
    }
    
    // Center guard
    bits.push(...this.expandBits([0, 1, 0, 1, 0], width));
    
    // Right side (digits 8-13)
    for (let i = 7; i < 13; i++) {
      const digit = digits[i];
      bits.push(...this.expandBits(patterns.r[digit], width));
    }
    
    // End guard
    bits.push(...this.expandBits([1, 0, 1], width));
    
    // Quiet zone
    bits.push(...new Array(7 * width).fill(0));
    
    return bits;
  }

  /**
   * Expand bits array with width multiplier
   */
  private static expandBits(bits: number[], width: number): number[] {
    const expanded: number[] = [];
    for (const bit of bits) {
      for (let i = 0; i < width; i++) {
        expanded.push(bit);
      }
    }
    return expanded;
  }

  /**
   * Get CODE128 patterns (simplified)
   */
  private static getCODE128Patterns(): Record<number, number[]> {
    // This is a simplified version - full implementation would include all 106 patterns
    const patterns: Record<number, number[]> = {};
    // Common patterns would need to be added here
    return patterns;
  }

  /**
   * Get UPC-A patterns
   */
  private static getUPCAPatterns(): { l: number[][]; r: number[][] } {
    return {
      l: [
        [0, 0, 0, 1, 1, 0, 1],
        [0, 0, 1, 1, 0, 0, 1],
        [0, 0, 1, 0, 0, 1, 1],
        [0, 1, 1, 1, 1, 0, 1],
        [0, 1, 0, 0, 0, 1, 1],
        [0, 1, 1, 0, 0, 0, 1],
        [0, 1, 0, 1, 1, 1, 1],
        [0, 1, 1, 1, 0, 1, 1],
        [0, 1, 1, 0, 1, 1, 1],
        [0, 0, 0, 1, 0, 1, 1]
      ],
      r: [
        [1, 1, 1, 0, 0, 1, 0],
        [1, 1, 0, 0, 1, 1, 0],
        [1, 1, 0, 1, 1, 0, 0],
        [1, 0, 0, 0, 0, 1, 0],
        [1, 0, 1, 1, 1, 0, 0],
        [1, 0, 0, 1, 1, 1, 0],
        [1, 0, 1, 0, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 1, 0, 0, 0],
        [1, 1, 1, 0, 1, 0, 0]
      ]
    };
  }

  /**
   * Get EAN-13 patterns
   */
  private static getEAN13Patterns(): { l: number[][]; g: number[][]; r: number[][] } {
    return {
      l: [
        [0, 0, 0, 1, 1, 0, 1],
        [0, 0, 1, 1, 0, 0, 1],
        [0, 0, 1, 0, 0, 1, 1],
        [0, 1, 1, 1, 1, 0, 1],
        [0, 1, 0, 0, 0, 1, 1],
        [0, 1, 1, 0, 0, 0, 1],
        [0, 1, 0, 1, 1, 1, 1],
        [0, 1, 1, 1, 0, 1, 1],
        [0, 1, 1, 0, 1, 1, 1],
        [0, 0, 0, 1, 0, 1, 1]
      ],
      g: [
        [1, 1, 1, 0, 0, 1, 0],
        [1, 1, 0, 0, 1, 1, 0],
        [1, 1, 0, 1, 1, 0, 0],
        [1, 0, 0, 0, 0, 1, 0],
        [1, 0, 1, 1, 1, 0, 0],
        [1, 0, 0, 1, 1, 1, 0],
        [1, 0, 1, 0, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 1, 0, 0, 0],
        [1, 1, 1, 0, 1, 0, 0]
      ],
      r: [
        [1, 1, 1, 0, 0, 1, 0],
        [1, 1, 0, 0, 1, 1, 0],
        [1, 1, 0, 1, 1, 0, 0],
        [1, 0, 0, 0, 0, 1, 0],
        [1, 0, 1, 1, 1, 0, 0],
        [1, 0, 0, 1, 1, 1, 0],
        [1, 0, 1, 0, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 1, 0, 0, 0],
        [1, 1, 1, 0, 1, 0, 0]
      ]
    };
  }
}

// ============================================================
// QR CODE GENERATOR (Simplified)
// ============================================================

export class QRCodeGenerator {
  // QR Code encoding tables (simplified)
  private static readonly ALIGNMENT_PATTERNS: Record<number, number[]> = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50],
    15: [6, 24, 42, 60],
    20: [6, 26, 46, 66],
    25: [6, 26, 48, 70],
    30: [6, 26, 50, 74]
  };

  /**
   * Generate QR code bitmap
   * This is a simplified implementation for basic QR codes
   * For production, consider using a library like qrcode
   */
  static generate(
    data: string, 
    size: number = 6, 
    errorCorrection: QRErrorCorrection = 'M'
  ): { width: number; height: number; data: number[] } {
    // Determine QR code version based on data length
    const version = this.determineVersion(data.length, errorCorrection);
    
    // Calculate module count
    const moduleCount = 17 + version * 4;
    
    // Create blank canvas
    const canvas = new Array(moduleCount).fill(null).map(() => new Array(moduleCount).fill(0));
    
    // Add finder patterns
    this.addFinderPatterns(canvas, moduleCount);
    
    // Add timing patterns
    this.addTimingPatterns(canvas, moduleCount);
    
    // Add alignment patterns (for version 2+)
    if (version >= 2) {
      this.addAlignmentPatterns(canvas, version);
    }
    
    // Add reserved areas
    this.addReservedAreas(canvas, version);
    
    // Encode data (simplified - uses basic encoding)
    this.encodeData(canvas, data, version, errorCorrection);
    
    // Apply error correction (simplified - just adds redundancy)
    this.applyErrorCorrection(canvas, version, errorCorrection);
    
    // Scale to requested size
    return this.scaleBitmap(canvas.flat(), moduleCount, moduleCount, size);
  }

  /**
   * Determine QR code version
   */
  private static determineVersion(dataLength: number, errorCorrection: QRErrorCorrection): number {
    const ecLevels: Record<QRErrorCorrection, number> = { 'L': 1, 'M': 0, 'Q': -1, 'H': -2 };
    const ec = ecLevels[errorCorrection];
    
    // Capacity table (simplified)
    const capacities = [
      25,    // Version 1
      47,    // Version 2
      77,    // Version 3
      114,   // Version 4
      154,   // Version 5
      195    // Version 6
    ];
    
    for (let i = 0; i < capacities.length; i++) {
      if (dataLength <= capacities[i] + ec * 5) {
        return i + 1;
      }
    }
    
    return 7; // Default to version 7 for larger data
  }

  /**
   * Add finder patterns
   */
  private static addFinderPatterns(canvas: number[][], size: number): void {
    const positions = [
      [0, 0],
      [size - 7, 0],
      [0, size - 7]
    ];
    
    for (const [row, col] of positions) {
      // Outer border
      for (let i = 0; i < 7; i++) {
        canvas[row + i][col] = 1;
        canvas[row + i][col + 6] = 1;
        canvas[row][col + i] = 1;
        canvas[row + 6][col + i] = 1;
      }
      
      // Inner 3x3
      for (let i = 2; i < 5; i++) {
        for (let j = 2; j < 5; j++) {
          canvas[row + i][col + j] = 1;
        }
      }
    }
  }

  /**
   * Add timing patterns
   */
  private static addTimingPatterns(canvas: number[][], size: number): void {
    for (let i = 8; i < size - 8; i++) {
      canvas[6][i] = i % 2 === 0 ? 1 : 0;
      canvas[i][6] = i % 2 === 0 ? 1 : 0;
    }
  }

  /**
   * Add alignment patterns
   */
  private static addAlignmentPatterns(canvas: number[][], version: number): void {
    const positions = this.ALIGNMENT_PATTERNS[version] || this.ALIGNMENT_PATTERNS[2];
    
    for (const row of positions) {
      for (const col of positions) {
        if (canvas[row][col] !== 1) { // Skip finder pattern areas
          for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
              const r = row + i;
              const c = col + j;
              if (r >= 0 && r < canvas.length && c >= 0 && c < canvas[0].length) {
                canvas[r][c] = (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)) ? 1 : 0;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Add reserved areas
   */
  private static addReservedAreas(canvas: number[][], version: number): void {
    // Reserve format info area
    for (let i = 0; i < 9; i++) {
      canvas[8][i] = -1;
      canvas[i][8] = -1;
    }
    
    // Version info for version 7+
    if (version >= 7) {
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
          canvas[canvas.length - 11 + j][i] = -1;
          canvas[i][canvas.length - 11 + j] = -1;
        }
      }
    }
  }

  /**
   * Encode data (simplified)
   */
  private static encodeData(canvas: number[][], data: string, version: number, ec: QRErrorCorrection): void {
    // Simplified data encoding
    // In production, use proper QR code encoding
    const bytes = new TextEncoder().encode(data);
    let bitIndex = 0;
    let dataEnd = canvas.length - 1;
    
    // Find data area (simplified)
    for (let col = canvas.length - 1; col >= 1; col -= 2) {
      if (col === 6) col--;
      
      for (let row = canvas.length - 1; row >= 0; row--) {
        for (let c = 0; c < 2; c++) {
          const currentCol = col - c;
          if (canvas[row][currentCol] === 0 && bitIndex < bytes.length * 8) {
            const byteIndex = Math.floor(bitIndex / 8);
            const bitPos = 7 - (bitIndex % 8);
            const bit = (bytes[byteIndex] >> bitPos) & 1;
            canvas[row][currentCol] = bit === 1 ? 2 : 0;
            bitIndex++;
          }
        }
      }
    }
  }

  /**
   * Apply error correction (simplified)
   */
  private static applyErrorCorrection(canvas: number[][], version: number, ec: QRErrorCorrection): void {
    // Mark data bits as 1/0
    for (let row = 0; row < canvas.length; row++) {
      for (let col = 0; col < canvas[0].length; col++) {
        if (canvas[row][col] === 2) {
          canvas[row][col] = 1;
        } else if (canvas[row][col] === -1) {
          canvas[row][col] = 0;
        }
      }
    }
  }

  /**
   * Scale bitmap
   */
  private static scaleBitmap(data: number[], width: number, height: number, scale: number): {
    width: number;
    height: number;
    data: number[];
  } {
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const scaled: number[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let sy = 0; sy < scale; sy++) {
        for (let x = 0; x < width; x++) {
          for (let sx = 0; sx < scale; sx++) {
            scaled.push(data[y * width + x]);
          }
        }
      }
    }
    
    return {
      width: scaledWidth,
      height: scaledHeight,
      data: scaled
    };
  }
}

// ============================================================
// FACTORY FUNCTIONS
// ============================================================

export function generateBarcode(
  data: string, 
  type: BarcodeType, 
  width: number = 2, 
  height: number = 50
): number[] {
  switch (type) {
    case 'CODE39':
      return BarcodeGenerator.generateCODE39(data, width, height);
    case 'CODE128':
      return BarcodeGenerator.generateCODE128(data, width, height);
    case 'UPC_A':
      return BarcodeGenerator.generateUPCA(data, width, height);
    case 'EAN13':
      return BarcodeGenerator.generateEAN13(data, width, height);
    default:
      throw new BarcodeGenerationError(`Unsupported barcode type: ${type}`);
  }
}

export function generateQRCode(
  data: string,
  size: number = 6,
  errorCorrection: QRErrorCorrection = 'M'
): { width: number; height: number; data: number[] } {
  return QRCodeGenerator.generate(data, size, errorCorrection);
}

export default { BarcodeGenerator, QRCodeGenerator, generateBarcode, generateQRCode };
