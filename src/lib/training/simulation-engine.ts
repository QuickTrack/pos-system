import { v4 as uuidv4 } from 'uuid';

export interface SimulationConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  intensity: 'low' | 'medium' | 'high';
  scenarios: SimulationScenario[];
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  type: 'sales' | 'inventory' | 'customer' | 'payment';
  enabled: boolean;
  weight: number; // Probability weight
}

export interface SimulatedActivity {
  id: string;
  type: 'sale' | 'inventory_movement' | 'customer_interaction' | 'payment';
  timestamp: Date;
  data: Record<string, any>;
  description: string;
}

const DEFAULT_SCENARIOS: SimulationScenario[] = [
  {
    id: 'daily-sales',
    name: 'Daily Sales Trend',
    description: 'Simulate realistic daily sales patterns',
    type: 'sales',
    enabled: true,
    weight: 3,
  },
  {
    id: 'stock-movements',
    name: 'Stock Movements',
    description: 'Simulate inventory changes and restocking',
    type: 'inventory',
    enabled: true,
    weight: 2,
  },
  {
    id: 'customer-interactions',
    name: 'Customer Interactions',
    description: 'Simulate customer inquiries and visits',
    type: 'customer',
    enabled: true,
    weight: 2,
  },
  {
    id: 'payment-processing',
    name: 'Payment Processing',
    description: 'Simulate payment transactions',
    type: 'payment',
    enabled: true,
    weight: 1,
  },
];

export class SimulationEngine {
  private config: SimulationConfig;
  private activities: SimulatedActivity[] = [];
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config?: Partial<SimulationConfig>) {
    this.config = {
      enabled: true,
      frequency: 'daily',
      intensity: 'medium',
      scenarios: DEFAULT_SCENARIOS,
      ...config,
    };
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[SimulationEngine] Started');
    
    // Generate initial batch of activities
    this.generateActivities();
    
    // Set up interval based on frequency
    const intervalMs = this.getIntervalMs();
    this.intervalId = setInterval(() => {
      this.generateActivities();
    }, intervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[SimulationEngine] Stopped');
  }

  private getIntervalMs(): number {
    switch (this.config.frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private getIntensityMultiplier(): number {
    switch (this.config.intensity) {
      case 'low':
        return 0.5;
      case 'medium':
        return 1;
      case 'high':
        return 2;
      default:
        return 1;
    }
  }

  generateActivities(): SimulatedActivity[] {
    const enabledScenarios = this.config.scenarios.filter(s => s.enabled);
    const totalWeight = enabledScenarios.reduce((sum, s) => sum + s.weight, 0);
    const multiplier = this.getIntensityMultiplier();
    
    const newActivities: SimulatedActivity[] = [];
    const activityCount = Math.floor(Math.random() * 5 * multiplier) + 1;

    for (let i = 0; i < activityCount; i++) {
      // Select scenario based on weight
      let random = Math.random() * totalWeight;
      let selectedScenario: SimulationScenario | null = null;
      
      for (const scenario of enabledScenarios) {
        random -= scenario.weight;
        if (random <= 0) {
          selectedScenario = scenario;
          break;
        }
      }

      if (selectedScenario) {
        const activity = this.generateActivityForScenario(selectedScenario);
        if (activity) {
          newActivities.push(activity);
        }
      }
    }

    this.activities.push(...newActivities);
    return newActivities;
  }

  private generateActivityForScenario(scenario: SimulationScenario): SimulatedActivity | null {
    const timestamp = new Date();
    
    switch (scenario.type) {
      case 'sales':
        return this.generateSaleActivity(timestamp);
      case 'inventory':
        return this.generateInventoryActivity(timestamp);
      case 'customer':
        return this.generateCustomerActivity(timestamp);
      case 'payment':
        return this.generatePaymentActivity(timestamp);
      default:
        return null;
    }
  }

  private generateSaleActivity(timestamp: Date): SimulatedActivity {
    const products = [
      'Electronics Bundle',
      'Office Supplies Pack',
      'Cleaning Products Set',
      'Kitchen Appliances',
      'Stationery Items',
    ];
    
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 10) + 1;
    const unitPrice = Math.floor(Math.random() * 5000) + 100;
    const total = quantity * unitPrice;

    return {
      id: uuidv4(),
      type: 'sale',
      timestamp,
      data: {
        product,
        quantity,
        unitPrice,
        total,
        paymentMethod: ['cash', 'mpesa', 'card'][Math.floor(Math.random() * 3)],
      },
      description: `Sale of ${quantity}x ${product} for KES ${total.toLocaleString()}`,
    };
  }

  private generateInventoryActivity(timestamp: Date): SimulatedActivity {
    const movements = ['restock', 'adjustment', 'transfer', 'return'];
    const movement = movements[Math.floor(Math.random() * movements.length)];
    const quantity = Math.floor(Math.random() * 50) + 1;

    return {
      id: uuidv4(),
      type: 'inventory_movement',
      timestamp,
      data: {
        movement,
        quantity,
        product: `Product-${Math.floor(Math.random() * 100)}`,
        reason: movement === 'restock' ? 'Supplier delivery' : 'Inventory count',
      },
      description: `Inventory ${movement}: ${quantity} units`,
    };
  }

  private generateCustomerActivity(timestamp: Date): SimulatedActivity {
    const interactions = ['inquiry', 'visit', 'complaint', 'feedback'];
    const interaction = interactions[Math.floor(Math.random() * interactions.length)];

    return {
      id: uuidv4(),
      type: 'customer_interaction',
      timestamp,
      data: {
        interaction,
        customer: `Customer-${Math.floor(Math.random() * 1000)}`,
        channel: ['phone', 'email', 'in-store'][Math.floor(Math.random() * 3)],
      },
      description: `Customer ${interaction} received`,
    };
  }

  private generatePaymentActivity(timestamp: Date): SimulatedActivity {
    const methods = ['mpesa', 'bank_transfer', 'cash', 'card'];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const amount = Math.floor(Math.random() * 100000) + 1000;

    return {
      id: uuidv4(),
      type: 'payment',
      timestamp,
      data: {
        method,
        amount,
        reference: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: Math.random() > 0.1 ? 'completed' : 'pending',
      },
      description: `Payment of KES ${amount.toLocaleString()} via ${method}`,
    };
  }

  getActivities(): SimulatedActivity[] {
    return [...this.activities];
  }

  getRecentActivities(count: number = 10): SimulatedActivity[] {
    return this.activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  clearActivities(): void {
    this.activities = [];
  }

  updateConfig(config: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }
}

// Singleton instance
let simulationEngineInstance: SimulationEngine | null = null;

export function getSimulationEngine(): SimulationEngine {
  if (!simulationEngineInstance) {
    simulationEngineInstance = new SimulationEngine();
  }
  return simulationEngineInstance;
}
