'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useCartStore, useHeldSalesStore, CartItem, HeldSale } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
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
  X,
  Printer,
  Save,
  ScanBarcode,
  Clock,
  ClipboardList,
  RotateCcw
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
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  customerType: string;
  loyaltyPoints: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdNote, setHoldNote] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [printMode, setPrintMode] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  
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
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.barcode?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredProducts(products.slice(0, 20));
    }
  }, [searchQuery, products]);

  const DEMO_PRODUCTS = [
    { _id: '1', name: 'Samsung Galaxy A14', sku: 'ELEC001', barcode: '1234567890123', retailPrice: 18999, wholesalePrice: 17000, stockQuantity: 50, category: { name: 'Electronics' } },
    { _id: '2', name: 'Sony WH-1000XM5 Headphones', sku: 'ELEC002', barcode: '1234567890124', retailPrice: 32999, wholesalePrice: 30000, stockQuantity: 25, category: { name: 'Electronics' } },
    { _id: '3', name: 'HP Laptop 15s', sku: 'ELEC003', barcode: '1234567890125', retailPrice: 74999, wholesalePrice: 70000, stockQuantity: 15, category: { name: 'Electronics' } },
    { _id: '4', name: 'Nescafe Coffee 500g', sku: 'FOOD001', barcode: '2234567890123', retailPrice: 1299, wholesalePrice: 1150, stockQuantity: 200, category: { name: 'Food & Beverages' } },
    { _id: '5', name: 'Milo Pack 1kg', sku: 'FOOD002', barcode: '2234567890124', retailPrice: 899, wholesalePrice: 800, stockQuantity: 150, category: { name: 'Food & Beverages' } },
    { _id: '6', name: 'Coca-Cola 500ml (24 pack)', sku: 'FOOD003', barcode: '2234567890125', retailPrice: 2400, wholesalePrice: 2200, stockQuantity: 100, category: { name: 'Food & Beverages' } },
    { _id: '7', name: 'Detergent Powder 1kg', sku: 'HOUSE001', barcode: '3234567890123', retailPrice: 450, wholesalePrice: 400, stockQuantity: 300, category: { name: 'Household' } },
    { _id: '8', name: 'Cooking Oil 5L', sku: 'FOOD004', barcode: '2234567890126', retailPrice: 1800, wholesalePrice: 1650, stockQuantity: 80, category: { name: 'Food & Beverages' } },
    { _id: '9', name: 'Sugar 1kg', sku: 'FOOD005', barcode: '2234567890127', retailPrice: 250, wholesalePrice: 220, stockQuantity: 500, category: { name: 'Food & Beverages' } },
    { _id: '10', name: 'Rice 2kg', sku: 'FOOD006', barcode: '2234567890128', retailPrice: 600, wholesalePrice: 550, stockQuantity: 200, category: { name: 'Food & Beverages' } },
    { _id: '11', name: 'USB Cable', sku: 'MOBILE001', barcode: '4234567890123', retailPrice: 500, wholesalePrice: 450, stockQuantity: 150, category: { name: 'Mobile Accessories' } },
    { _id: '12', name: 'Phone Charger', sku: 'MOBILE002', barcode: '4234567890124', retailPrice: 1200, wholesalePrice: 1000, stockQuantity: 75, category: { name: 'Mobile Accessories' } },
  ];

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=100');
      const data = await response.json();
      if (data.success && data.products?.length > 0) {
        setProducts(data.products);
        setFilteredProducts(data.products.slice(0, 20));
      } else {
        setProducts(DEMO_PRODUCTS);
        setFilteredProducts(DEMO_PRODUCTS.slice(0, 20));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts(DEMO_PRODUCTS);
      setFilteredProducts(DEMO_PRODUCTS.slice(0, 20));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const existingItem = items.find((item) => item.productId === product._id);
    
    if (existingItem) {
      updateQuantity(product._id, existingItem.quantity + 1);
    } else {
      const cartItem: CartItem = {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: 1,
        unitPrice: product.retailPrice,
        discount: 0,
        total: product.retailPrice,
      };
      addItem(cartItem);
    }
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
    const taxableAmount = subtotal - discount;
    const tax = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + tax;
    return { subtotal, discount, tax, total };
  };

  const handlePayment = async () => {
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
          customerId: customer?.id,
          customerName: customer?.name,
          customerPhone: customer?.phone,
          paymentMethod,
          amountPaid: parseFloat(amountPaid) || total,
          change: (parseFloat(amountPaid) || total) - total,
          mpesaPhone: paymentMethod === 'mpesa' ? customer?.phone : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastSale(data.sale);
        setSaleComplete(true);
        clearCart();
        setSelectedCustomer(null);
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Payment failed:', error);
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

  const handlePrintReceipt = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
      setSaleComplete(false);
    }, 100);
  };

  const handleNewSale = () => {
    setSaleComplete(false);
    setLastSale(null);
    fetchProducts();
  };

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

            {printMode && (
              <div ref={receiptRef} className="hidden print:block p-4 text-xs">
                <div className="text-center border-b pb-2 mb-2">
                  <h3 className="font-bold">NairobiPOS</h3>
                  <p>Invoice #{lastSale.invoiceNumber}</p>
                  <p>{formatDateTime(lastSale.saleDate)}</p>
                </div>
                <div className="border-b pb-2 mb-2">
                  {lastSale.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.quantity}x {item.productName}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(lastSale.total)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="POS - New Sale" subtitle="Point of Sale System" />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Products Section */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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

          {/* Customer Selector */}
          <div className="mb-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => setShowCustomerModal(true)}
            >
              <User className="w-4 h-4" />
              {customer ? customer.name : 'Select Customer (Optional)'}
              {customer && (
                <span className="ml-auto badge badge-info">{customer.phone}</span>
              )}
            </Button>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => handleAddToCart(product)}
                    className="bg-white p-3 rounded-lg border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all text-left"
                  >
                    <div className="font-medium text-gray-900 truncate">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {product.category?.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-600 font-bold">
                        {formatCurrency(product.retailPrice)}
                      </span>
                      <span className={`text-xs ${product.stockQuantity < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                        {product.stockQuantity} left
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart ({items.length})
              </h2>
              {items.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-600"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.productId} className="pos-cart-item">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.productName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                          className="p-1 hover:bg-gray-100"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-medium text-gray-900 min-w-[80px] text-right">
                        {formatCurrency(item.total)}
                      </span>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-medium text-red-500">-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">VAT (16%)</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-emerald-600">{formatCurrency(total)}</span>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => setShowHoldModal(true)}
                >
                  <Clock className="w-4 h-4" />
                  Hold
                </Button>
                <Button 
                  className="flex-1"
                  size="lg"
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
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'cash', label: 'Cash', icon: Banknote },
                { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                { value: 'card', label: 'Card', icon: CreditCard },
              ].map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${
                    paymentMethod === method.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <method.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <Input
              label="Amount Paid"
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Enter amount"
            />
          )}

          {paymentMethod === 'mpesa' && (
            <Input
              label="Phone Number (STK Push)"
              placeholder="254712345678"
            />
          )}

          {parseFloat(amountPaid) > total && (
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-sm text-emerald-600">Change: {formatCurrency(parseFloat(amountPaid) - total)}</p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handlePayment}
            isLoading={processing}
            disabled={paymentMethod === 'cash' && (!amountPaid || parseFloat(amountPaid) < total)}
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
    </div>
  );
}
