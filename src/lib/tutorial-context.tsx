'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'input' | 'select' | 'none';
  actionText?: string;
  validation?: () => boolean;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: 'sales' | 'inventory' | 'invoices' | 'payments' | 'reports';
  role: 'admin' | 'cashier' | 'store_manager' | 'all';
  steps: TutorialStep[];
  estimatedTime: number; // in minutes
}

interface TutorialContextType {
  tutorials: Tutorial[];
  currentTutorial: Tutorial | null;
  currentStepIndex: number;
  isTutorialActive: boolean;
  completedTutorials: string[];
  startTutorial: (tutorialId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeTutorial: () => void;
  exitTutorial: () => void;
  resetTutorial: (tutorialId: string) => void;
  getTutorialsByRole: (role: string) => Tutorial[];
  getTutorialsByCategory: (category: string) => Tutorial[];
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STORAGE_KEY = 'pos-training-tutorials';
const COMPLETED_TUTORIALS_KEY = 'pos-completed-tutorials';

// Define all available tutorials
const allTutorials: Tutorial[] = [
  {
    id: 'creating-a-sale',
    title: 'Creating a Sale',
    description: 'Learn how to process a sale transaction using the POS system',
    category: 'sales',
    role: 'all',
    estimatedTime: 5,
    steps: [
      {
        id: 'step-1',
        title: 'Navigate to POS',
        description: 'Click on "POS Sales" in the sidebar to open the Point of Sale interface',
        targetElement: '[href="/pos"]',
        position: 'right',
        action: 'click',
        actionText: 'Click on POS Sales',
      },
      {
        id: 'step-2',
        title: 'Search for Product',
        description: 'Use the search bar to find a product by name or SKU',
        targetElement: 'input[placeholder*="Search products"]',
        position: 'bottom',
        action: 'input',
        actionText: 'Type a product name',
      },
      {
        id: 'step-3',
        title: 'Add Product to Cart',
        description: 'Click on a product to add it to the shopping cart',
        targetElement: '.product-card',
        position: 'right',
        action: 'click',
        actionText: 'Click on a product',
      },
      {
        id: 'step-4',
        title: 'Adjust Quantity',
        description: 'Use the +/- buttons to adjust the quantity of the item',
        targetElement: '.quantity-controls',
        position: 'left',
        action: 'click',
        actionText: 'Click + or - to adjust quantity',
      },
      {
        id: 'step-5',
        title: 'Select Customer',
        description: 'Click on the customer dropdown to select a customer for the sale',
        targetElement: 'select[name="customer"]',
        position: 'bottom',
        action: 'select',
        actionText: 'Select a customer',
      },
      {
        id: 'step-6',
        title: 'Choose Payment Method',
        description: 'Select a payment method (Cash, M-Pesa, Card, or Account)',
        targetElement: '.payment-method-selector',
        position: 'top',
        action: 'select',
        actionText: 'Select payment method',
      },
      {
        id: 'step-7',
        title: 'Complete Sale',
        description: 'Click the "Complete Sale" button to process the transaction',
        targetElement: 'button:contains("Complete Sale")',
        position: 'top',
        action: 'click',
        actionText: 'Click Complete Sale',
      },
    ],
  },
  {
    id: 'adding-inventory',
    title: 'Adding Inventory',
    description: 'Learn how to add new products to your inventory',
    category: 'inventory',
    role: 'all',
    estimatedTime: 7,
    steps: [
      {
        id: 'step-1',
        title: 'Navigate to Inventory',
        description: 'Click on "Inventory" in the sidebar to open the inventory management page',
        targetElement: '[href="/inventory"]',
        position: 'right',
        action: 'click',
        actionText: 'Click on Inventory',
      },
      {
        id: 'step-2',
        title: 'Add New Product',
        description: 'Click the "Add Product" button to create a new product',
        targetElement: 'button:contains("Add Product")',
        position: 'bottom',
        action: 'click',
        actionText: 'Click Add Product',
      },
      {
        id: 'step-3',
        title: 'Enter Product Name',
        description: 'Type the name of the product in the name field',
        targetElement: 'input[name="name"]',
        position: 'bottom',
        action: 'input',
        actionText: 'Enter product name',
      },
      {
        id: 'step-4',
        title: 'Enter SKU',
        description: 'Type the SKU (Stock Keeping Unit) for the product',
        targetElement: 'input[name="sku"]',
        position: 'bottom',
        action: 'input',
        actionText: 'Enter SKU',
      },
      {
        id: 'step-5',
        title: 'Select Category',
        description: 'Choose a category for the product from the dropdown',
        targetElement: 'select[name="category"]',
        position: 'bottom',
        action: 'select',
        actionText: 'Select category',
      },
      {
        id: 'step-6',
        title: 'Set Prices',
        description: 'Enter the cost price, retail price, and wholesale price',
        targetElement: '.price-inputs',
        position: 'top',
        action: 'input',
        actionText: 'Enter prices',
      },
      {
        id: 'step-7',
        title: 'Set Stock Quantity',
        description: 'Enter the initial stock quantity for the product',
        targetElement: 'input[name="stockQuantity"]',
        position: 'bottom',
        action: 'input',
        actionText: 'Enter stock quantity',
      },
      {
        id: 'step-8',
        title: 'Save Product',
        description: 'Click the "Save" button to add the product to inventory',
        targetElement: 'button[type="submit"]',
        position: 'top',
        action: 'click',
        actionText: 'Click Save',
      },
    ],
  },
  {
    id: 'generating-invoices',
    title: 'Generating Invoices',
    description: 'Learn how to create and manage customer invoices',
    category: 'invoices',
    role: 'all',
    estimatedTime: 6,
    steps: [
      {
        id: 'step-1',
        title: 'Navigate to Invoices',
        description: 'Click on "Customer Invoices" in the sidebar',
        targetElement: '[href="/create-invoice"]',
        position: 'right',
        action: 'click',
        actionText: 'Click on Customer Invoices',
      },
      {
        id: 'step-2',
        title: 'Create New Invoice',
        description: 'Click the "Create Invoice" button to start a new invoice',
        targetElement: 'button:contains("Create Invoice")',
        position: 'bottom',
        action: 'click',
        actionText: 'Click Create Invoice',
      },
      {
        id: 'step-3',
        title: 'Select Customer',
        description: 'Choose the customer for this invoice from the dropdown',
        targetElement: 'select[name="customer"]',
        position: 'bottom',
        action: 'select',
        actionText: 'Select customer',
      },
      {
        id: 'step-4',
        title: 'Add Line Items',
        description: 'Click "Add Item" to add products to the invoice',
        targetElement: 'button:contains("Add Item")',
        position: 'bottom',
        action: 'click',
        actionText: 'Click Add Item',
      },
      {
        id: 'step-5',
        title: 'Enter Item Details',
        description: 'Select a product and enter quantity and price for each item',
        targetElement: '.invoice-item-row',
        position: 'top',
        action: 'input',
        actionText: 'Enter item details',
      },
      {
        id: 'step-6',
        title: 'Add Notes',
        description: 'Add any notes or terms for the invoice',
        targetElement: 'textarea[name="notes"]',
        position: 'top',
        action: 'input',
        actionText: 'Enter notes',
      },
      {
        id: 'step-7',
        title: 'Save Invoice',
        description: 'Click "Save Invoice" to create the invoice',
        targetElement: 'button:contains("Save Invoice")',
        position: 'top',
        action: 'click',
        actionText: 'Click Save Invoice',
      },
    ],
  },
  {
    id: 'recording-payments',
    title: 'Recording Payments',
    description: 'Learn how to record customer payments',
    category: 'payments',
    role: 'all',
    estimatedTime: 4,
    steps: [
      {
        id: 'step-1',
        title: 'Navigate to Payments',
        description: 'Click on "Customer Payments" in the sidebar',
        targetElement: '[href="/customer-payments"]',
        position: 'right',
        action: 'click',
        actionText: 'Click on Customer Payments',
      },
      {
        id: 'step-2',
        title: 'Record New Payment',
        description: 'Click the "Record Payment" button',
        targetElement: 'button:contains("Record Payment")',
        position: 'bottom',
        action: 'click',
        actionText: 'Click Record Payment',
      },
      {
        id: 'step-3',
        title: 'Select Customer',
        description: 'Choose the customer making the payment',
        targetElement: 'select[name="customer"]',
        position: 'bottom',
        action: 'select',
        actionText: 'Select customer',
      },
      {
        id: 'step-4',
        title: 'Select Invoices',
        description: 'Choose which invoices this payment applies to',
        targetElement: '.invoice-selection',
        position: 'top',
        action: 'click',
        actionText: 'Select invoices',
      },
      {
        id: 'step-5',
        title: 'Enter Payment Details',
        description: 'Enter the payment amount and select payment method',
        targetElement: '.payment-details',
        position: 'top',
        action: 'input',
        actionText: 'Enter payment details',
      },
      {
        id: 'step-6',
        title: 'Save Payment',
        description: 'Click "Save Payment" to record the payment',
        targetElement: 'button:contains("Save Payment")',
        position: 'top',
        action: 'click',
        actionText: 'Click Save Payment',
      },
    ],
  },
  {
    id: 'viewing-reports',
    title: 'Viewing Reports',
    description: 'Learn how to access and understand business reports',
    category: 'reports',
    role: 'admin',
    estimatedTime: 5,
    steps: [
      {
        id: 'step-1',
        title: 'Navigate to Reports',
        description: 'Click on "Reports" in the sidebar',
        targetElement: '[href="/reports"]',
        position: 'right',
        action: 'click',
        actionText: 'Click on Reports',
      },
      {
        id: 'step-2',
        title: 'Select Report Type',
        description: 'Choose the type of report you want to view',
        targetElement: '.report-type-selector',
        position: 'bottom',
        action: 'select',
        actionText: 'Select report type',
      },
      {
        id: 'step-3',
        title: 'Set Date Range',
        description: 'Select the date range for the report',
        targetElement: '.date-range-picker',
        position: 'bottom',
        action: 'input',
        actionText: 'Select date range',
      },
      {
        id: 'step-4',
        title: 'Generate Report',
        description: 'Click "Generate Report" to create the report',
        targetElement: 'button:contains("Generate Report")',
        position: 'top',
        action: 'click',
        actionText: 'Click Generate Report',
      },
      {
        id: 'step-5',
        title: 'Export Report',
        description: 'Click "Export" to download the report as PDF or CSV',
        targetElement: 'button:contains("Export")',
        position: 'top',
        action: 'click',
        actionText: 'Click Export',
      },
    ],
  },
];

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [tutorials] = useState<Tutorial[]>(allTutorials);
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  // Load completed tutorials from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(COMPLETED_TUTORIALS_KEY);
      if (saved) {
        setCompletedTutorials(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load completed tutorials:', error);
    }
  }, []);

  // Save completed tutorials to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(COMPLETED_TUTORIALS_KEY, JSON.stringify(completedTutorials));
    } catch (error) {
      console.error('Failed to save completed tutorials:', error);
    }
  }, [completedTutorials]);

  const startTutorial = (tutorialId: string) => {
    const tutorial = tutorials.find(t => t.id === tutorialId);
    if (tutorial) {
      setCurrentTutorial(tutorial);
      setCurrentStepIndex(0);
      setIsTutorialActive(true);
    }
  };

  const nextStep = () => {
    if (currentTutorial && currentStepIndex < currentTutorial.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const completeTutorial = () => {
    if (currentTutorial && !completedTutorials.includes(currentTutorial.id)) {
      setCompletedTutorials([...completedTutorials, currentTutorial.id]);
    }
    setCurrentTutorial(null);
    setCurrentStepIndex(0);
    setIsTutorialActive(false);
  };

  const exitTutorial = () => {
    setCurrentTutorial(null);
    setCurrentStepIndex(0);
    setIsTutorialActive(false);
  };

  const resetTutorial = (tutorialId: string) => {
    setCompletedTutorials(completedTutorials.filter(id => id !== tutorialId));
  };

  const getTutorialsByRole = (role: string) => {
    return tutorials.filter(t => t.role === 'all' || t.role === role);
  };

  const getTutorialsByCategory = (category: string) => {
    return tutorials.filter(t => t.category === category);
  };

  return (
    <TutorialContext.Provider
      value={{
        tutorials,
        currentTutorial,
        currentStepIndex,
        isTutorialActive,
        completedTutorials,
        startTutorial,
        nextStep,
        previousStep,
        completeTutorial,
        exitTutorial,
        resetTutorial,
        getTutorialsByRole,
        getTutorialsByCategory,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
