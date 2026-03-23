'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useCartStore, useHeldSalesStore, CartItem, HeldSale } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { generateThermalReceiptHTML, createReceiptData, ReceiptBusiness, printReceipt } from '@/lib/receipt-generator';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  X,
  Printer,
  Save,
  ScanBarcode,
  Clock,
  ClipboardList,
  RotateCcw,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  retailPrice: number;
  wholesalePrice: number;
  stockQuantity: number;
  category: { name: string };
  baseUnit: string;
  units?: {
    name: string;
    abbreviation: string;
    conversionToBase: number;
    price: number;
    barcode?: string;
  }[];
}

interface UnitOption {
  name: string;
  abbreviation: string;
  conversionToBase: number;
  price: number;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  customerType: string;
  loyaltyPoints: number;
  creditBalance: number;
  creditLimit: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showCustomerDebtModal, setShowCustomerDebtModal] = useState(false);
  const [customerDebtData, setCustomerDebtData] = useState<any>(null);
  const [loadingDebt, setLoadingDebt] = useState(false);
  const [holdNote, setHoldNote] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedPaymentMethodIndex, setSelectedPaymentMethodIndex] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');

  const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'credit', label: 'Credit', icon: Wallet },
    { value: 'account', label: 'Account', icon: Wallet },
  ];
  const [creditApplied, setCreditApplied] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [openUnitSelector, setOpenUnitSelector] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('POS');
  const [businessSettings, setBusinessSettings] = useState<ReceiptBusiness>({
    name: 'POS',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    vatNumber: '',
    kraPin: '',
    includeInPrice: false
  });
  const [cartHeight] = useState(350);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastAddedItemRef = useRef<string | null>(null);
  
  const { 
    items, 
    addItem, 
    updateQuantity, 
    removeItem, 
    clearCart, 
    customer,
    setCustomer,
    getSubtotal,
    getTotalDiscount,
  } = useCartStore();

  const { heldSales, holdSale, recallSale, removeHeldSale } = useHeldSalesStore();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSettings();
    // Clear cart and customer on page load for a fresh sale
    clearCart();
    setCustomer(undefined);
    setSelectedCustomer(null);
  }, []);

  // Focus search input on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // When payment modal is open
      if (showPaymentModal) {
        // Tab to cycle through payment methods
        if (e.key === 'Tab' && !isInput) {
          e.preventDefault();
          const nextIndex = (selectedPaymentMethodIndex + 1) % PAYMENT_METHODS.length;
          setSelectedPaymentMethodIndex(nextIndex);
          setPaymentMethod(PAYMENT_METHODS[nextIndex].value);
          return;
        }

        // Enter to confirm payment method and complete sale
        if (e.key === 'Enter' && !isInput) {
          e.preventDefault();
          // Trigger the complete payment action
          handlePayment();
          return;
        }
      }

      // When sale is complete (saleComplete is true but lastSale still exists)
      if (saleComplete && lastSale) {
        // Enter to print receipt
        if (e.key === 'Enter' && !isInput) {
          e.preventDefault();
          handlePrintReceipt();
          return;
        }
      }

      // Tab key to trigger checkout - only when not in an input and payment modal is closed
      if (e.key === 'Tab' && !isInput && items.length > 0 && !showPaymentModal) {
        e.preventDefault();
        const { total: checkoutTotal } = calculateTotals();
        setAmountPaid(checkoutTotal.toString());
        setShowPaymentModal(true);
        setSelectedPaymentMethodIndex(0);
        setPaymentMethod(PAYMENT_METHODS[0].value);
        return;
      }

      // Enter key to print receipt - only when not in an input and there's a lastSale
      if (e.key === 'Enter' && !isInput && lastSale && !showPaymentModal && !saleComplete) {
        e.preventDefault();
        handlePrintReceipt();
        return;
      }
    };


    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, lastSale, showPaymentModal, selectedPaymentMethodIndex, saleComplete]);

  useEffect(() => {
    if (searchQuery || selectedCategory !== 'all') {
      let filtered = products;
      
      // Filter by category
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(p => p.category?.name === selectedCategory);
      }
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.barcode?.toLowerCase().includes(query)
        );
      }
      setFilteredProducts(filtered.slice(0, 20));
    } else {
      // Only show products when user searches - not by default
      setFilteredProducts(searchQuery ? products.slice(0, 20) : []);
    }
  }, [searchQuery, products, selectedCategory]);

  // Reset selected product index when filtered products change
  useEffect(() => {
    setSelectedProductIndex(-1);
  }, [filteredProducts]);

  // Keyboard navigation for product search
  const handleProductKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setFilteredProducts([]);
      setSelectedProductIndex(-1);
      return;
    }

    if (filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedProductIndex(prev => 
        prev < filteredProducts.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedProductIndex(prev => 
        prev > 0 ? prev - 1 : filteredProducts.length - 1
      );
    } else if (e.key === 'Enter' && selectedProductIndex >= 0) {
      e.preventDefault();
      handleAddToCart(filteredProducts[selectedProductIndex]);
      setSearchQuery('');
      setFilteredProducts([]);
      setSelectedProductIndex(-1);
    }
  };

  // Focus quantity input when product is added
  useEffect(() => {
    if (lastAddedItemRef.current) {
      // Use setTimeout to ensure the DOM has updated with the new cart item
      const timer = setTimeout(() => {
        const quantityInput = document.querySelector(`#qty-input-${lastAddedItemRef.current}`) as HTMLInputElement;
        if (quantityInput) {
          quantityInput.focus();
          quantityInput.select();
        }
        lastAddedItemRef.current = null;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [items]);

  // Extract unique categories from products
  useEffect(() => {
    const uniqueCats = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
    setCategories(uniqueCats as string[]);
  }, [products]);

  const DEMO_PRODUCTS: Product[] = [
    { _id: '1', name: 'Samsung Galaxy A14', sku: 'ELEC001', barcode: '1234567890123', retailPrice: 18999, wholesalePrice: 17000, stockQuantity: 50, category: { name: 'Electronics' }, baseUnit: 'Pcs', units: [{ name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 18999 }] },
    { _id: '2', name: 'Sony WH-1000XM5 Headphones', sku: 'ELEC002', barcode: '1234567890124', retailPrice: 32999, wholesalePrice: 30000, stockQuantity: 25, category: { name: 'Electronics' }, baseUnit: 'Pcs', units: [{ name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 32999 }] },
    { _id: '3', name: 'HP Laptop 15s', sku: 'ELEC003', barcode: '1234567890125', retailPrice: 74999, wholesalePrice: 70000, stockQuantity: 15, category: { name: 'Electronics' }, baseUnit: 'Pcs', units: [{ name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 74999 }] },
    { _id: '4', name: 'Nescafe Coffee 500g', sku: 'FOOD001', barcode: '2234567890123', retailPrice: 1299, wholesalePrice: 1150, stockQuantity: 200, category: { name: 'Food & Beverages' }, baseUnit: 'Pcs', units: [{ name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 1299 }, { name: 'Box (6)', abbreviation: 'box6', conversionToBase: 6, price: 7500 }] },
    { _id: '5', name: 'Milo Pack 1kg', sku: 'FOOD002', barcode: '2234567890124', retailPrice: 899, wholesalePrice: 800, stockQuantity: 150, category: { name: 'Food & Beverages' }, baseUnit: 'Pcs', units: [{ name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 899 }, { name: 'Box (24)', abbreviation: 'box24', conversionToBase: 24, price: 20000 }] },
    { _id: '6', name: 'Coca-Cola 500ml (24 pack)', sku: 'FOOD003', barcode: '2234567890125', retailPrice: 2400, wholesalePrice: 2200, stockQuantity: 100, category: { name: 'Food & Beverages' }, baseUnit: 'Pack (24)', units: [{ name: 'Pack (24)', abbreviation: 'pack24', conversionToBase: 24, price: 2400 }, { name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 120 }] },
    { _id: '7', name: 'Detergent Powder 1kg', sku: 'HOUSE001', barcode: '3234567890123', retailPrice: 450, wholesalePrice: 400, stockQuantity: 300, category: { name: 'Household' }, baseUnit: 'Pcs', units: [{ name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 450 }, { name: 'Pack (5)', abbreviation: 'pack5', conversionToBase: 5, price: 2000 }] },
    { _id: '8', name: 'Cooking Oil 5L', sku: 'FOOD004', barcode: '2234567890126', retailPrice: 1800, wholesalePrice: 1650, stockQuantity: 80, category: { name: 'Food & Beverages' }, baseUnit: '5L', units: [{ name: '5 Liters', abbreviation: '5L', conversionToBase: 5, price: 1800 }, { name: '1 Liter', abbreviation: '1L', conversionToBase: 1, price: 400 }] },
    { _id: '9', name: 'Sugar 1kg', sku: 'FOOD005', barcode: '2234567890127', retailPrice: 250, wholesalePrice: 220, stockQuantity: 500, category: { name: 'Food & Beverages' }, baseUnit: '1kg', units: [{ name: '1 Kilogram', abbreviation: '1kg', conversionToBase: 1, price: 250 }, { name: '500 Grams', abbreviation: '500g', conversionToBase: 0.5, price: 140 }, { name: '2 Kilograms', abbreviation: '2kg', conversionToBase: 2, price: 480 }] },
    { _id: '10', name: 'Rice 2kg', sku: 'FOOD006', barcode: '2234567890128', retailPrice: 600, wholesalePrice: 550, stockQuantity: 200, category: { name: 'Food & Beverages' }, baseUnit: '2kg', units: [{ name: '2 Kilograms', abbreviation: '2kg', conversionToBase: 2, price: 600 }, { name: '1 Kilogram', abbreviation: '1kg', conversionToBase: 1, price: 320 }, { name: '5 Kilograms', abbreviation: '5kg', conversionToBase: 5, price: 1400 }] },
    { _id: '11', name: 'USB Cable', sku: 'MOBILE001', barcode: '4234567890123', retailPrice: 500, wholesalePrice: 450, stockQuantity: 150, category: { name: 'Mobile Accessories' }, baseUnit: 'Pcs', units: [{ name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 500 }, { name: 'Pack (5)', abbreviation: 'pack5', conversionToBase: 5, price: 2200 }] },
    { _id: '12', name: 'Phone Charger', sku: 'MOBILE002', barcode: '4234567890124', retailPrice: 1200, wholesalePrice: 1000, stockQuantity: 75, category: { name: 'Mobile Accessories' }, baseUnit: 'Pcs', units: [{ name: 'Pieces', abbreviation: 'pcs', conversionToBase: 1, price: 1200 }] },
  ];

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=100');
      const data = await response.json();
      if (data.success && data.products?.length > 0) {
        setProducts(data.products);
        // Only show products when user searches - not by default
        setFilteredProducts(searchQuery ? data.products.slice(0, 20) : []);
      } else {
        setProducts(DEMO_PRODUCTS);
        // Only show products when user searches - not by default
        setFilteredProducts(searchQuery ? DEMO_PRODUCTS.slice(0, 20) : []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts(DEMO_PRODUCTS);
      setFilteredProducts(DEMO_PRODUCTS.slice(0, 20));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success && data.categories?.length > 0) {
        const categoryNames = data.categories.map((cat: any) => cat.name);
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Load settings from localStorage for immediate display
  const loadSettingsFromLocalStorage = () => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('pos-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Map from nested format to business settings format
        if (parsed.business) {
          return {
            businessName: parsed.business.name || 'POS',
            businessTagline: parsed.business.tagline || '',
            address: parsed.business.address || '',
            phone: parsed.business.phone || '',
            email: parsed.business.email || '',
            vatNumber: parsed.business.taxNumber || '',
            kraPin: parsed.business.taxNumber || '',
            includeInPrice: parsed.tax?.includeInPrice || false
          };
        }
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e);
    }
    return null;
  };

  const fetchSettings = async () => {
    try {
      // First load from localStorage for immediate display
      const cachedSettings = loadSettingsFromLocalStorage();
      if (cachedSettings) {
        setBusinessName(cachedSettings.businessName);
        setBusinessSettings({
          name: cachedSettings.businessName || 'POS',
          tagline: cachedSettings.businessTagline || '',
          address: cachedSettings.address || '',
          phone: cachedSettings.phone || '',
          email: cachedSettings.email || '',
          vatNumber: cachedSettings.vatNumber || '',
          kraPin: cachedSettings.kraPin || '',
          includeInPrice: cachedSettings.includeInPrice || false
        });
      }

      // Then fetch from API to get latest server data
      const response = await fetch('/api/settings');
      const data = await response.json();
      const settings = data.settings;
      if (settings?.businessName) {
        setBusinessName(settings.businessName);
        setBusinessSettings({
          name: settings.businessName || 'POS',
          tagline: settings.businessTagline || '',
          address: settings.address || '',
          phone: settings.phone || '',
          email: settings.email || '',
          vatNumber: settings.vatNumber || '',
          kraPin: settings.kraPin || '',
          includeInPrice: settings.includeInPrice ?? cachedSettings?.includeInPrice ?? false
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleAddToCart = (product: Product, selectedUnit?: UnitOption) => {
    const unitToUse = selectedUnit || null;
    const existingItem = items.find((item) => 
      item.productId === product._id && 
      item.unitName === (unitToUse?.name || product.baseUnit)
    );
    
    const price = unitToUse?.price || product.retailPrice;
    const unitName = unitToUse?.name || product.baseUnit;
    const unitAbbreviation = unitToUse?.abbreviation || '';
    const conversionToBase = unitToUse?.conversionToBase || 1;
    
    if (existingItem) {
      updateQuantity(product._id, existingItem.quantity + 1);
    } else {
      const cartItem: CartItem = {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: 1,
        unitPrice: price,
        unitName: unitName,
        unitAbbreviation: unitAbbreviation,
        conversionToBase: conversionToBase,
        discount: 0,
        total: price,
      };
      addItem(cartItem);
      lastAddedItemRef.current = product._id;
    }
    setSearchQuery('');
    // Focus will be handled by useEffect when lastAddedItemRef changes
  };

  const handleUnitChange = (productId: string, unit: UnitOption) => {
    const item = items.find(i => i.productId === productId);
    if (item) {
      // Remove the old item
      removeItem(productId);
      const product = products.find(p => p._id === productId);
      if (product) {
        const price = unit.price || product.retailPrice;
        const cartItem: CartItem = {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: item.quantity,
          unitPrice: price,
          unitName: unit.name,
          unitAbbreviation: unit.abbreviation,
          conversionToBase: unit.conversionToBase,
          discount: item.discount,
          total: price * item.quantity,
        };
        addItem(cartItem);
      }
    }
    setOpenUnitSelector(null);
  };

  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      handleAddToCart(product);
    }
  }, [products]);

  useEffect(() => {
    let barcodeBuffer = '';
    let timeout: NodeJS.Timeout;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 8) {
          handleBarcodeScan(barcodeBuffer);
        }
        barcodeBuffer = '';
      } else if (/^[0-9]$/.test(e.key)) {
        barcodeBuffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 100);
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [handleBarcodeScan]);

  const calculateTotals = () => {
    const subtotal = getSubtotal();
    const discount = getTotalDiscount();
    const taxRate = 16;
    
    // Calculate tax as 16% of the subtotal (for display purposes)
    // Product prices in database are already VAT inclusive
    // So we calculate tax to show the VAT component but don't add it to total
    const taxableAmount = subtotal - discount;
    const tax = (taxableAmount * taxRate) / 100;
    
    // Total is the sum of product prices without additional VAT
    const total = taxableAmount;
    
    return { subtotal, discount, tax, total };
  };

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
      const { total } = calculateTotals();
      
      const isAccountPayment = paymentMethod === 'account';
      const isCreditPayment = paymentMethod === 'credit';
      
      // Calculate credit to apply
      const creditApplied = isCreditPayment && selectedCustomer 
        ? Math.min(selectedCustomer.creditBalance || 0, total)
        : 0;
      
      const paidAmount = isAccountPayment ? 0 : (parseFloat(amountPaid) || total);
      
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice || 0,
            discount: item.discount,
            discountType: item.discountType,
            variant: item.variant,
          })),
          customerId: selectedCustomer?._id,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          customerEmail: selectedCustomer?.email,
          customerAddress: selectedCustomer?.address,
          paymentMethod,
          chargedToAccount: isAccountPayment,
          creditApplied: creditApplied,
          amountPaid: isCreditPayment ? creditApplied : paidAmount,
          change: isCreditPayment ? 0 : (paidAmount - total),
          mpesaPhone: paymentMethod === 'mpesa' ? customer?.phone : undefined,
          notes: isAccountPayment ? 'Charge to account' : isCreditPayment ? 'Paid with store credit' : undefined,
          includeInPrice: businessSettings.includeInPrice,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // If account payment, create credit invoice
        if (isAccountPayment && customer?.id) {
          try {
            const creditInvoiceResponse = await fetch('/api/customer-invoices/credit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId: customer.id,
                amount: total,
                referenceInvoiceId: data.sale?._id,
                referenceInvoiceNumber: data.sale?.invoiceNumber,
                description: `POS Sale - Invoice ${data.sale?.invoiceNumber}`,
              }),
            });
            
            if (!creditInvoiceResponse.ok) {
              console.error('Failed to create credit invoice');
            }
          } catch (creditError) {
            console.error('Credit invoice creation error:', creditError);
          }
        }
        
        setLastSale(data.sale);
        setSaleComplete(true);
        clearCart();
        setSelectedCustomer(null);
        setShowPaymentModal(false);
        setAmountPaid('');
        setCreditApplied(0);
      }
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Handle M-Pesa Till Number Payment
  const handleMpesaTillPayment = async () => {
    setProcessing(true);
    try {
      const { total } = calculateTotals();
      
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice || 0,
            discount: item.discount,
            discountType: item.discountType,
            variant: item.variant,
          })),
          customerId: selectedCustomer?._id,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          customerEmail: selectedCustomer?.email,
          customerAddress: selectedCustomer?.address,
          paymentMethod: 'mpesa',
          mpesaPaymentType: 'till',
          amountPaid: total,
          change: 0,
          notes: 'Payment via M-Pesa Till Number',
          includeInPrice: businessSettings.includeInPrice,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastSale(data.sale);
        setSaleComplete(true);
        clearCart();
        setSelectedCustomer(null);
        setShowPaymentModal(false);
        setAmountPaid('');
        alert('Payment recorded successfully! Please confirm payment from customer.');
      }
    } catch (error) {
      console.error('M-Pesa Till payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle M-Pesa Owner Wallet Payment
  const handleMpesaWalletPayment = async () => {
    setProcessing(true);
    try {
      const { total } = calculateTotals();
      
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice || 0,
            discount: item.discount,
            discountType: item.discountType,
            variant: item.variant,
          })),
          customerId: selectedCustomer?._id,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          customerEmail: selectedCustomer?.email,
          customerAddress: selectedCustomer?.address,
          paymentMethod: 'mpesa',
          mpesaPaymentType: 'wallet',
          amountPaid: total,
          change: 0,
          notes: 'Payment via M-Pesa Owner Wallet',
          includeInPrice: businessSettings.includeInPrice,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastSale(data.sale);
        setSaleComplete(true);
        clearCart();
        setSelectedCustomer(null);
        setShowPaymentModal(false);
        setAmountPaid('');
        alert('Payment recorded successfully! Please confirm payment from customer.');
      }
    } catch (error) {
      console.error('M-Pesa Wallet payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSearchCustomer = async (query: string) => {
    setCustomerSearch(query);
    if (query.length >= 2) {
      const response = await fetch(`/api/customers?search=${query}`);
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomer({ id: customer._id, name: customer.name, phone: customer.phone });
    setShowCustomerModal(false);
    setCustomerSearch('');
    // Reset credit applied when customer changes
    setCreditApplied(0);
  };

  const fetchCustomerDebt = async (customerId: string) => {
    setLoadingDebt(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/debt`);
      const data = await response.json();
      if (data.success) {
        setCustomerDebtData(data);
        setShowCustomerDebtModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch customer debt:', error);
    } finally {
      setLoadingDebt(false);
    }
  };

  const handleHoldSale = () => {
    holdSale(items, customer, holdNote);
    clearCart();
    setCustomer(undefined);
    setSelectedCustomer(null);
    setShowHoldModal(false);
    setHoldNote('');
  };

  const handleRecallSale = (heldSale: HeldSale) => {
    clearCart();
    heldSale.items.forEach(item => addItem(item));
    if (heldSale.customer) {
      setCustomer(heldSale.customer);
    }
    setShowHeldSalesModal(false);
  };

  const handlePrintReceipt = async () => {
    if (!lastSale) return;
    
    // Create receipt data
    const receiptData = createReceiptData(
      lastSale,
      businessSettings,
      lastSale.cashierName || 'Cashier'
    );
    
    // Generate thermal receipt HTML
    const receiptHTML = await generateThermalReceiptHTML(receiptData);
    
    // Print using the receipt generator
    printReceipt(receiptHTML);
    
    // Reset states after print
    setTimeout(() => {
      setSaleComplete(false);
      setLastSale(null);
    }, 500);
  };

  const handleNewSale = () => {
    setSaleComplete(false);
    setLastSale(null);
    fetchProducts();
  };



  // Auto-print receipt after sale completion (works for all payment methods)
  useEffect(() => {
    if (saleComplete && lastSale) {
      // Auto-print after a short delay to ensure the UI has rendered
      const timer = setTimeout(() => {
        handlePrintReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [saleComplete, lastSale]);

  const { subtotal, discount, tax, total } = calculateTotals();

  if (saleComplete && lastSale) {
    return (
      <div>
        <Header title="POS - Sale Complete" subtitle="Point of Sale System" />
        <div className="p-6">
          <Card className="max-w-md mx-auto text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Complete!</h2>
            <p className="text-gray-500 mb-6">Invoice #{lastSale.invoiceNumber}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">Amount Paid</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(lastSale.amountPaid)}
              </p>
              {lastSale.change > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Change: {formatCurrency(lastSale.change)}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handlePrintReceipt}
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button 
                className="flex-1"
                onClick={handleNewSale}
              >
                New Sale
              </Button>
            </div>

            {/* Receipt is now generated via receipt-generator - see handlePrintReceipt */}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={`${businessName} - New Sale`} subtitle="Point of Sale System" />
      
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Products Section */}
        <div className="flex-1 p-4 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleProductKeyDown}
              />
              {/* Floating Product Dropdown */}
              {searchQuery && filteredProducts.length > 0 && (
                <div className="fixed z-[9999] w-[calc(100%-24px)] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-auto" style={{ left: '12px' }}>
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product._id}
                      onClick={() => {
                        handleAddToCart(product);
                        setSearchQuery('');
                        setFilteredProducts([]);
                        setSelectedProductIndex(-1);
                      }}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        selectedProductIndex === index
                          ? 'bg-emerald-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{product.name}</div>
                        <div className="text-xs text-gray-500">
                          {product.sku} • {product.category?.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <span className="text-emerald-600 font-bold text-sm">{formatCurrency(product.retailPrice)}</span>
                        <span className={`text-xs ${product.stockQuantity < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                          {product.stockQuantity}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="sticky bottom-0 bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-t border-gray-200">
                    ↑↓ Navigate • Enter to select • Esc to close
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowCustomerModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-emerald-400 transition-colors bg-white"
            >
              <User className="w-4 h-4 text-gray-400" />
              {customer ? (
                <span className="text-gray-900">{customer.name}</span>
              ) : (
                <span className="text-gray-400">Customer</span>
              )}
            </button>
            {selectedCustomer && (
              <button
                onClick={() => fetchCustomerDebt(selectedCustomer._id)}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-amber-200 rounded-lg hover:border-amber-400 transition-colors bg-amber-50 text-amber-700"
                title="View Outstanding Debt"
              >
                <FileText className="w-4 h-4" />
                Debt
              </button>
            )}
            <Button variant="outline" className="gap-2">
              <ScanBarcode className="w-4 h-4" />
              Scan
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowHeldSalesModal(true)}
            >
              <ClipboardList className="w-4 h-4" />
              Held ({heldSales.length})
            </Button>
          </div>

          {/* Category Filter })
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products Section - Empty - Removed for cart space */}
        </div>

        {/* Cart Section - Fixed Height */}
        <div 
          className="bg-white border-t border-gray-200 flex flex-col h-[calc(100vh-150px)]"
        >

          {/* Cart Items - Table Format */}
          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <ShoppingCart className="w-12 h-12 mr-3 text-gray-300" />
                <div>
                  <p>Cart is empty</p>
                  <p className="text-sm">Add products to get started</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Product</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Unit</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Price</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Qty</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Total</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...items].reverse().map((item) => {
                    const product = products.find(p => p._id === item.productId);
                    const hasUnits = product?.units && product.units.length > 0;
                    const currentUnitName = item.unitName || product?.baseUnit || 'piece';
                    return (
                    <tr key={item.productId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <div className="font-medium text-gray-900 text-xs">{item.productName}</div>
                        <div className="text-xs text-gray-500">{item.sku}</div>
                      </td>
                      <td className="py-2 px-2">
                        {hasUnits || product?.baseUnit ? (
                          <div className="relative">
                            <button
                              onClick={() => setOpenUnitSelector(openUnitSelector === item.productId ? null : item.productId)}
                              className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
                            >
                              {item.unitAbbreviation || product?.baseUnit || 'pc'}
                            </button>
                            {openUnitSelector === item.productId && (
                              <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-[140px]">
                                {/* Base unit option */}
                                <button
                                  onClick={() => handleUnitChange(item.productId, { 
                                    name: product!.baseUnit, 
                                    abbreviation: product!.baseUnit.substring(0, 3), 
                                    conversionToBase: 1, 
                                    price: product!.retailPrice 
                                  })}
                                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                                    !item.unitName || item.unitName === product?.baseUnit ? 'bg-emerald-50 font-medium' : ''
                                  }`}
                                >
                                  {product?.baseUnit} (base) - {formatCurrency(product!.retailPrice)}
                                </button>
                                {/* Additional units */}
                                {product?.units?.map((unit, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleUnitChange(item.productId, unit)}
                                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                                      item.unitName === unit.name ? 'bg-emerald-50 font-medium' : ''
                                    }`}
                                  >
                                    {unit.name} ({unit.abbreviation}) - {formatCurrency(unit.price)}
                                    <span className="text-gray-400 ml-1">
                                      (1 {unit.abbreviation} = {unit.conversionToBase} {product?.baseUnit})
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">pc</span>
                        )}
                      </td>
                      <td className="text-right py-2 px-2 text-gray-600 text-xs">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            className="p-1 hover:bg-gray-100 rounded border"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            id={`qty-input-${item.productId}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              updateQuantity(item.productId, Math.max(1, val));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                searchInputRef.current?.focus();
                              }
                            }}
                            className="w-12 text-center font-medium text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 hover:bg-gray-100 rounded border"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="text-right py-2 px-2 font-medium text-gray-900 text-xs">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="text-center py-2 px-2">
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>);
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <span className="text-gray-500">Subtotal: </span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Discount: </span>
                  <span className="font-medium text-red-500">-{formatCurrency(discount)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">VAT (16%): </span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="text-lg font-bold">
                  Total: <span className="text-emerald-600">{formatCurrency(total)}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <div className="flex items-center gap-2 mr-2">
                  <ShoppingCart className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{items.length}</span>
                  {items.length > 0 && (
                    <button 
                      onClick={clearCart}
                      className="text-red-500 hover:text-red-600 text-sm ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Button 
                  variant="outline"
                  className="gap-1"
                  size="sm"
                  onClick={() => setShowHoldModal(true)}
                >
                  <Clock className="w-4 h-4" />
                  Hold
                </Button>
                <Button 
                  className="flex-1"
                  size="sm"
                  onClick={() => {
                    setAmountPaid(total.toString());
                    setShowPaymentModal(true);
                  }}
                >
                  Checkout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setCustomerSearch('');
        }}
        title="Select Customer"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search by name or phone..."
            value={customerSearch}
            onChange={(e) => handleSearchCustomer(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto space-y-2">
            {customers.map((customer) => (
              <button
                key={customer._id}
                onClick={() => selectCustomer(customer)}
                className="w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">
                  {customer.phone} • {customer.customerType}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Payment"
        size="sm"
        closeOnOverlayClick={false}
      >
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700"> Payment Method</label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { value: 'cash', label: 'Cash', icon: Banknote },
                { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                { value: 'card', label: 'Card', icon: CreditCard },
                { value: 'credit', label: 'Credit', icon: Wallet },
                { value: 'account', label: 'Account', icon: Wallet },
              ].map((method) => (
                <button
                  key={method.value}
                  onClick={() => {
                    setPaymentMethod(method.value);
                    // Reset credit applied when switching payment method
                    if (method.value !== 'credit') {
                      setCreditApplied(0);
                    }
                  }}
                  className={`p-2 rounded-lg border-2 flex flex-col items-center gap-0.5 transition-colors ${
                    paymentMethod === method.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <method.icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <Input
                label="Amount Tendered"
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="Enter amount tendered"
              />
              
              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-1">
                {[total, 1000, 2000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountPaid(amt.toString())}
                    className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                      parseFloat(amountPaid) === amt
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                    }`}
                  >
                    {amt >= total ? 'Exact' : formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {paymentMethod === 'mpesa' && (
            <div className="space-y-2">
              <Input
                label="Phone Number (STK Push)"
                placeholder="254712345678"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleMpesaTillPayment()}
                  disabled={processing || total <= 0}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <Smartphone className="w-4 h-4" />
                  Pay via Till
                </button>
                <button
                  type="button"
                  onClick={() => handleMpesaWalletPayment()}
                  disabled={processing || total <= 0}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <Wallet className="w-4 h-4" />
                  Pay to Wallet
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Select payment option above
              </p>
            </div>
          )}

          {/* Credit Payment Section */}
          {paymentMethod === 'credit' && (
            <div className="space-y-2">
              {!selectedCustomer ? (
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-red-600">Please select a customer to use credit</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs text-blue-600">Available Credit Balance</p>
                        <p className="text-xl font-bold text-blue-700">{formatCurrency(selectedCustomer.creditBalance || 0)}</p>
                      </div>
                      <Wallet className="w-8 h-8 text-blue-400" />
                    </div>
                    {selectedCustomer.creditBalance > 0 && (
                      <p className="text-xs text-blue-600">
                        Credit will be automatically applied up to {formatCurrency(total)}
                      </p>
                    )}
                  </div>
                  
                  {selectedCustomer.creditBalance > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Credit to Apply:</span>
                        <span className="font-semibold text-emerald-700">{formatCurrency(Math.min(selectedCustomer.creditBalance, total))}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-600">Remaining Balance:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(Math.max(0, total - selectedCustomer.creditBalance))}</span>
                      </div>
                    </div>
                  )}

                  {selectedCustomer.creditBalance <= 0 && (
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-sm text-amber-700">This customer has no credit balance available</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Change Display */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Total:</span>
              <span className="text-sm font-semibold">{formatCurrency(total)}</span>
            </div>
            {paymentMethod === 'cash' && amountPaid && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Tendered:</span>
                  <span className="text-sm font-semibold">{formatCurrency(parseFloat(amountPaid) || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-xs font-medium text-gray-900">Change:</span>
                  <span className={`text-base font-bold ${parseFloat(amountPaid) >= total ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.max(0, parseFloat(amountPaid) - total))}
                  </span>
                </div>
              </>
            )}
          </div>

          {paymentMethod === 'account' && !customer && (
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-sm text-red-600">Please select a customer to charge to their account</p>
            </div>
          )}

          {paymentMethod === 'account' && customer && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-sm text-amber-700">
                {formatCurrency(total)} will be added to {customer.name}&apos;s account
              </p>
              {selectedCustomer && selectedCustomer.creditLimit > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-300 text-xs text-amber-600">
                  <p>Credit Limit: {formatCurrency(selectedCustomer.creditLimit)}</p>
                  <p className="mt-1">Account purchases are limited by credit limit to prevent overborrowing</p>
                </div>
              )}
            </div>
          )}

          {/* Credit payment message */}
          {paymentMethod === 'credit' && selectedCustomer && selectedCustomer.creditBalance > 0 && (
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-sm text-emerald-700">
                {formatCurrency(Math.min(selectedCustomer.creditBalance, total))} credit will be used from {selectedCustomer.name}&apos;s balance
              </p>
            </div>
          )}

          <Button 
            className="w-full"
            size="lg"
            onClick={handlePayment}
            isLoading={processing}
            disabled={
              (paymentMethod === 'cash' && (!amountPaid || parseFloat(amountPaid) < total)) ||
              (paymentMethod === 'account' && !customer) ||
              (paymentMethod === 'credit' && (!customer || (selectedCustomer?.creditBalance || 0) <= 0))
            }
          >
            Complete Sale
          </Button>
        </div>
      </Modal>

      {/* Hold Sale Modal */}
      <Modal
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        title="Hold Sale"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This sale will be saved and can be recalled later.
          </p>
          <Input
            label="Note (optional)"
            value={holdNote}
            onChange={(e) => setHoldNote(e.target.value)}
            placeholder="e.g., Customer will pay later"
          />
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowHoldModal(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleHoldSale}
            >
              <Clock className="w-4 h-4" />
              Hold Sale
            </Button>
          </div>
        </div>
      </Modal>

      {/* Held Sales Modal */}
      <Modal
        isOpen={showHeldSalesModal}
        onClose={() => setShowHeldSalesModal(false)}
        title="Held Sales"
        size="lg"
      >
        <div className="space-y-3">
          {heldSales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No held sales</p>
              <p className="text-sm">Hold a sale to recall it later</p>
            </div>
          ) : (
            heldSales.map((sale) => (
              <div 
                key={sale.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sale.id}</span>
                    {sale.note && (
                      <span className="text-xs text-gray-500">- {sale.note}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {sale.items.length} items • {formatCurrency(sale.items.reduce((sum, i) => sum + i.total, 0))}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(sale.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRecallSale(sale)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Recall
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeHeldSale(sale.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Customer Debt Modal */}
      <Modal
        isOpen={showCustomerDebtModal}
        onClose={() => setShowCustomerDebtModal(false)}
        title="Customer Account Summary"
        size="lg"
      >
        {loadingDebt ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : customerDebtData ? (
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{customerDebtData.customer.name}</h3>
                  <p className="text-sm text-gray-500">{customerDebtData.customer.phone}</p>
                  {customerDebtData.customer.email && (
                    <p className="text-sm text-gray-500">{customerDebtData.customer.email}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium capitalize">{customerDebtData.customer.customerType}</p>
                </div>
              </div>
            </div>

            {/* Debt Summary */}
            <div className={`rounded-lg p-4 ${customerDebtData.debtSummary.isOverdue ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {customerDebtData.debtSummary.isOverdue ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <FileText className="w-5 h-5 text-emerald-600" />
                )}
                <h4 className={`font-semibold ${customerDebtData.debtSummary.isOverdue ? 'text-red-700' : 'text-emerald-700'}`}>
                  Outstanding Balance
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(customerDebtData.debtSummary.totalOutstanding)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overdue Amount</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(customerDebtData.debtSummary.totalOverdue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Credit Limit</p>
                  <p className="text-xl font-semibold text-gray-900">{formatCurrency(customerDebtData.customer.creditLimit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Credit</p>
                  <p className="text-xl font-semibold text-emerald-600">{formatCurrency(customerDebtData.debtSummary.availableCredit)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                <span className="text-gray-600">{customerDebtData.debtSummary.invoiceCount} outstanding invoice(s)</span>
                <span className="text-red-600">{customerDebtData.debtSummary.overdueCount} overdue</span>
              </div>
            </div>

            {/* Outstanding Invoices */}
            {customerDebtData.invoices.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Outstanding Invoices</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customerDebtData.invoices.map((invoice: any) => (
                    <div 
                      key={invoice._id}
                      className={`p-3 rounded-lg border ${invoice.isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-gray-500">
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(invoice.balanceDue)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${invoice.isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {invoice.isOverdue ? 'Overdue' : invoice.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customerDebtData.invoices.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No outstanding invoices</p>
                <p className="text-sm">This customer has no pending payments</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Unable to load customer debt information</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
