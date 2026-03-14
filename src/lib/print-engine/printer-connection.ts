// ============================================================
// PRINTER CONNECTION HANDLERS
// Handles USB, Bluetooth, Network, and Serial connections
// ============================================================

import { 
  PrinterConfig, 
  ConnectionType, 
  PrinterStatus, 
  PrinterConnectionError,
  PrinterNotFoundError 
} from './types';

// Base printer connection interface
export interface PrinterConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(data: Uint8Array): Promise<void>;
  getStatus(): Promise<PrinterStatus>;
  isConnected(): boolean;
}

// ============================================================
// NETWORK PRINTER CONNECTION
// ============================================================

export class NetworkPrinterConnection implements PrinterConnection {
  private host: string;
  private port: number;
  private timeout: number;
  private socket: any = null;
  private connected: boolean = false;

  constructor(config: { host: string; port: number; timeout?: number }) {
    this.host = config.host;
    this.port = config.port;
    this.timeout = config.timeout || 30000;
  }

  async connect(): Promise<void> {
    // In browser environment, we use WebSocket
    // In Node.js environment, we use net.Socket
    
    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      await this.connectBrowser();
    } else {
      await this.connectNode();
    }
  }

  private async connectBrowser(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Note: Direct TCP not available in browser, would need a relay server
        // This is a placeholder - in production use a print server
        const wsUrl = `ws://${this.host}:${this.port}`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          this.socket = ws;
          this.connected = true;
          resolve();
        };
        
        ws.onerror = (error) => {
          reject(new PrinterConnectionError('WebSocket connection failed', { error }));
        };
        
        ws.onclose = () => {
          this.connected = false;
        };
        
        setTimeout(() => {
          if (!this.connected) {
            reject(new PrinterConnectionError('Connection timeout'));
          }
        }, this.timeout);
      } catch (error) {
        reject(new PrinterConnectionError('Failed to establish connection', { error }));
      }
    });
  }

  private async connectNode(): Promise<void> {
    // Node.js - would use net module
    // For now, throw not implemented
    throw new PrinterConnectionError('Network printing requires server-side implementation');
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      if (typeof window !== 'undefined' && this.socket instanceof WebSocket) {
        this.socket.close();
      }
      this.socket = null;
    }
    this.connected = false;
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.connected || !this.socket) {
      throw new PrinterConnectionError('Printer not connected');
    }

    if (typeof window !== 'undefined' && this.socket instanceof WebSocket) {
      // Convert to base64 for WebSocket transfer
      let binary = '';
      for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i]);
      }
      const base64 = btoa(binary);
      this.socket.send(JSON.stringify({ type: 'print', data: base64 }));
    } else {
      throw new PrinterConnectionError('Socket not available');
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this.connected) {
      return { online: false, paper: 'out', cashDrawer: 'closed', error: 'Not connected' };
    }

    // Request status via WebSocket
    return {
      online: true,
      paper: 'ok',
      cashDrawer: 'closed'
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ============================================================
// USB PRINTER CONNECTION
// ============================================================

export class USBPrinterConnection implements PrinterConnection {
  private vendorId: number;
  private productId: number;
  private device: any = null;
  private endpoint: any = null;
  private connected: boolean = false;

  constructor(config: { vendorId: number; productId: number }) {
    this.vendorId = config.vendorId;
    this.productId = config.productId;
  }

  async connect(): Promise<void> {
    // WebUSB API for browser
    if (typeof window !== 'undefined' && typeof (navigator as any).usb !== 'undefined') {
      await this.connectWebUSB();
    } else {
      throw new PrinterConnectionError('USB printing requires WebUSB support or server-side implementation');
    }
  }

  private async connectWebUSB(): Promise<void> {
    try {
      const devices = await (navigator as any).usb.getDevices();
      
      const device = devices.find((d: any) => 
        d.vendorId === this.vendorId && d.productId === this.productId
      );

      if (!device) {
        throw new PrinterNotFoundError(`USB device ${this.vendorId}:${this.productId}`);
      }

      await device.open();
      
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Find bulk OUT endpoint
      const interface_ = device.configuration.interfaces.find((i: any) => 
        i.alternates.some((a: any) => a.interfaceClass === 7)
      );
      
      if (interface_) {
        await device.claimInterface(interface_.interfaceNumber);
        const alternate = interface_.alternates[0];
        const endpoint = alternate.endpoints.find((e: any) => 
          e.direction === 'out' && e.type === 'bulk'
        );
        this.endpoint = endpoint;
      }

      this.device = device;
      this.connected = true;
    } catch (error) {
      throw new PrinterConnectionError('Failed to connect to USB device', { error });
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.releaseInterface(0);
        await this.device.close();
      } catch (e) {
        // Ignore errors on disconnect
      }
      this.device = null;
      this.connected = false;
    }
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.connected || !this.device || !this.endpoint) {
      throw new PrinterConnectionError('Printer not connected');
    }

    try {
      await this.device.transferOut(this.endpoint.endpointNumber, data);
    } catch (error) {
      throw new PrinterConnectionError('Failed to send data to USB device', { error });
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this.connected || !this.device) {
      return { online: false, paper: 'out', cashDrawer: 'closed', error: 'Not connected' };
    }

    // WebUSB doesn't have a standard status query
    return {
      online: true,
      paper: 'ok',
      cashDrawer: 'closed'
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ============================================================
// BLUETOOTH PRINTER CONNECTION
// ============================================================

export class BluetoothPrinterConnection implements PrinterConnection {
  private device: any = null;
  private server: any = null;
  private characteristic: any = null;
  private connected: boolean = false;
  private deviceUuid: string;

  constructor(config: { uuid?: string }) {
    this.deviceUuid = config.uuid || '00001800-0000-1000-8000-00805f9b34fb'; // Default SPP
  }

  async connect(): Promise<void> {
    if (typeof window !== 'undefined' && typeof (navigator as any).bluetooth !== 'undefined') {
      await this.connectWebBluetooth();
    } else {
      throw new PrinterConnectionError('Bluetooth printing requires Web Bluetooth API support');
    }
  }

  private async connectWebBluetooth(): Promise<void> {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['00001800-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['00001801-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('00001800-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002a00-0000-1000-8000-00805f9b34fb');

      this.device = device;
      this.server = server;
      this.characteristic = characteristic;
      this.connected = true;

      // Handle disconnect
      device.addEventListener('gattserverdisconnected', () => {
        this.connected = false;
      });
    } catch (error) {
      throw new PrinterConnectionError('Failed to connect to Bluetooth device', { error });
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        if (this.server && this.server.connected) {
          this.server.disconnect();
        }
      } catch (e) {
        // Ignore errors
      }
      this.device = null;
      this.server = null;
      this.characteristic = null;
      this.connected = false;
    }
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.connected || !this.characteristic) {
      throw new PrinterConnectionError('Printer not connected');
    }

    try {
      await this.characteristic.writeValue(data);
    } catch (error) {
      throw new PrinterConnectionError('Failed to send data to Bluetooth device', { error });
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this.connected) {
      return { online: false, paper: 'out', cashDrawer: 'closed', error: 'Not connected' };
    }

    return {
      online: true,
      paper: 'ok',
      cashDrawer: 'closed'
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ============================================================
// SERIAL PRINTER CONNECTION
// ============================================================

export class SerialPrinterConnection implements PrinterConnection {
  private port: any = null;
  private writer: any = null;
  private reader: any = null;
  private connected: boolean = false;
  private portPath: string;
  private baudRate: number;

  constructor(config: { path: string; baudRate?: number }) {
    this.portPath = config.path;
    this.baudRate = config.baudRate || 9600;
  }

  async connect(): Promise<void> {
    if (typeof window !== 'undefined' && typeof (navigator as any).serial !== 'undefined') {
      await this.connectWebSerial();
    } else {
      throw new PrinterConnectionError('Serial printing requires Web Serial API support or server-side');
    }
  }

  private async connectWebSerial(): Promise<void> {
    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
      
      this.writer = this.port.writable.getWriter();
      this.connected = true;
    } catch (error) {
      throw new PrinterConnectionError('Failed to connect to serial device', { error });
    }
  }

  async disconnect(): Promise<void> {
    if (this.port) {
      try {
        if (this.writer) {
          await this.writer.close();
          this.writer = null;
        }
        await this.port.close();
      } catch (e) {
        // Ignore errors
      }
      this.port = null;
      this.connected = false;
    }
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.connected || !this.writer) {
      throw new PrinterConnectionError('Printer not connected');
    }

    try {
      await this.writer.write(data);
    } catch (error) {
      throw new PrinterConnectionError('Failed to send data to serial device', { error });
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this.connected) {
      return { online: false, paper: 'out', cashDrawer: 'closed', error: 'Not connected' };
    }

    return {
      online: true,
      paper: 'ok',
      cashDrawer: 'closed'
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ============================================================
// PRINT SERVER CONNECTION (For browser-based printing)
// ============================================================

export class PrintServerConnection implements PrinterConnection {
  private serverUrl: string;
  private apiKey: string;
  private sessionId: string | null = null;

  constructor(config: { serverUrl: string; apiKey?: string }) {
    this.serverUrl = config.serverUrl;
    this.apiKey = config.apiKey || '';
  }

  async connect(): Promise<void> {
    // Validate server is reachable
    try {
      const response = await fetch(`${this.serverUrl}/api/health`, {
        method: 'GET',
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });
      
      if (!response.ok) {
        throw new Error('Print server not available');
      }
    } catch (error) {
      throw new PrinterConnectionError('Cannot connect to print server', { error });
    }
  }

  async disconnect(): Promise<void> {
    this.sessionId = null;
  }

  async send(data: Uint8Array): Promise<void> {
    // Convert to base64
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64 = btoa(binary);

    const response = await fetch(`${this.serverUrl}/api/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        data: base64,
        sessionId: this.sessionId
      })
    });

    if (!response.ok) {
      throw new PrinterConnectionError('Print server rejected the job', { 
        status: response.status 
      });
    }

    const result = await response.json();
    if (result.sessionId) {
      this.sessionId = result.sessionId;
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    const response = await fetch(`${this.serverUrl}/api/status`, {
      method: 'GET',
      headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
    });

    if (!response.ok) {
      return { online: false, paper: 'out', cashDrawer: 'closed', error: 'Cannot get status' };
    }

    return await response.json();
  }

  isConnected(): boolean {
    return true; // Server connection is assumed
  }
}

// ============================================================
// CONNECTION FACTORY
// ============================================================

export function createPrinterConnection(
  type: ConnectionType, 
  config: any
): PrinterConnection {
  switch (type) {
    case 'network':
      return new NetworkPrinterConnection({
        host: config.address,
        port: config.port || 9100,
        timeout: config.timeout
      });
    
    case 'usb':
      return new USBPrinterConnection({
        vendorId: config.vendorId,
        productId: config.productId
      });
    
    case 'bluetooth':
      return new BluetoothPrinterConnection({
        uuid: config.uuid
      });
    
    case 'serial':
      return new SerialPrinterConnection({
        path: config.address,
        baudRate: config.baudRate || 9600
      });
    
    default:
      throw new Error(`Unsupported connection type: ${type}`);
  }
}

// ============================================================
// PRINT SERVER API (Server-side handler)
// ============================================================

export class PrintServer {
  private connections: Map<string, PrinterConnection> = new Map();
  private printQueue: Array<{ connectionId: string; data: Uint8Array; timestamp: Date }> = [];

  /**
   * Register a printer connection
   */
  registerPrinter(id: string, connection: PrinterConnection): void {
    this.connections.set(id, connection);
  }

  /**
   * Unregister a printer connection
   */
  async unregisterPrinter(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(id);
    }
  }

  /**
   * Get all registered printers
   */
  getPrinters(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Send print job to specific printer
   */
  async print(connectionId: string, data: Uint8Array): Promise<void> {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new PrinterNotFoundError(connectionId);
    }

    if (!connection.isConnected()) {
      await connection.connect();
    }

    await connection.send(data);
  }

  /**
   * Get printer status
   */
  async getStatus(connectionId: string): Promise<PrinterStatus> {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new PrinterNotFoundError(connectionId);
    }

    return await connection.getStatus();
  }

  /**
   * Add to print queue
   */
  queuePrint(connectionId: string, data: Uint8Array): void {
    this.printQueue.push({
      connectionId,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Process print queue
   */
  async processQueue(): Promise<void> {
    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift();
      if (job) {
        try {
          await this.print(job.connectionId, job.data);
        } catch (error) {
          console.error('Print queue error:', error);
          // Re-queue failed jobs
          this.printQueue.push(job);
        }
      }
    }
  }
}

// Export singleton instance
export const printServer = new PrintServer();

export default {
  NetworkPrinterConnection,
  USBPrinterConnection,
  BluetoothPrinterConnection,
  SerialPrinterConnection,
  PrintServerConnection,
  createPrinterConnection,
  printServer
};
