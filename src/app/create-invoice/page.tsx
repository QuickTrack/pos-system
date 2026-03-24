'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import PrintPreview from '@/components/print/PrintPreview';

import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  FileText, 
  Send,
  DollarSign,
  Printer,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  User,
  Minus,
  ShoppingCart,
} from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  creditLimit: number;
  creditBalance: number;
  customerType?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  retailPrice: number;
  wholesalePrice: number;
  stockQuantity: number;
  category: { name: string };
  units?: { name: string; price: number; }[];
  baseUnit?: string;
}

interface UnitOption {
  name: string;
  price: number;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitName: string;
  discount: number;
  discountType: 'fixed' | 'percentage';
  total: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: { _id: string; name: string; phone?: string };
  customerName?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'cancelled';
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  payments?: any[];
  invoiceType?: 'sale' | 'credit';
  includeInPrice?: boolean;
  paymentTerms?: string;
}

export default function CreateInvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Invoice creation state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState(30);
  
  // Product selection state
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const productSearchRef = useRef<HTMLInputElement>(null);
  
  // Customer modal state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Invoice number state
  const [invoiceNumberSuffix, setInvoiceNumberSuffix] = useState('0001');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-0001');
  
  // Invoice view state
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  
  // Print state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [printDocumentType, setPrintDocumentType] = useState<'invoice' | 'delivery-note'>('invoice');
  const [businessSettings, setBusinessSettings] = useState<any>(null);

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [searchQuery, statusFilter]);

  // Load settings from localStorage for immediate display
  const loadSettingsFromLocalStorage = () => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('pos-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.business) {
          return {
            businessName: parsed.business.name || '',
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

  const fetchData = async () => {
    try {
      // First load settings from localStorage for immediate display
      const cachedSettings = loadSettingsFromLocalStorage();
      if (cachedSettings) {
        setBusinessSettings(cachedSettings);
      }
      setLoading(true);
      
      const [invoicesRes, productsRes, customersRes, settingsRes] = await Promise.all([
        fetch(`/api/customer-invoices?status=${statusFilter}`),
        fetch('/api/products?limit=100'),
        fetch('/api/customers'),
        fetch('/api/settings')
      ]);
      
      const invoicesData = await invoicesRes.json();
      const productsData = await productsRes.json();
      const customersData = await customersRes.json();
      const settingsData = await settingsRes.json();
      
      if (settingsData.settings) {
        setBusinessSettings(settingsData.settings);
      }
      
      if (invoicesData.invoices) {
        let filtered = invoicesData.invoices;
        if (searchQuery) {
          filtered = filtered.filter((inv: Invoice) => 
            inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setInvoices(filtered);
      }
      
      if (productsData.products) {
        setProducts(productsData.products);
        
        // Extract unique categories from products
        const categoryNames = productsData.products
          .map((p: Product) => p.category?.name)
          .filter((name: string | undefined | null): boolean => Boolean(name)) as string[];
        const cats = [...new Set(categoryNames)];
        setCategories(cats);
        
        // Also set filtered products (show all by default when no filters)
        setFilteredProducts(productsData.products);
      }
      
      if (customersData.customers) {
        setCustomers(customersData.customers);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search and category
  useEffect(() => {
    let filtered = [...products];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category?.name === selectedCategory);
    }
    
    if (productSearchQuery && productSearchQuery.trim()) {
      const query = productSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
      );
    }
    
    setFilteredProducts(filtered);
  }, [products, selectedCategory, productSearchQuery]);

  const handleOpenInvoiceModal = async (type: 'sale' | 'credit' = 'sale') => {
    setSelectedCustomer(null);
    setInvoiceItems([]);
    setInvoiceNotes('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentTerms(30);
    
    // If products haven't been loaded yet, fetch them
    if (products.length === 0) {
      try {
        const response = await fetch('/api/products?limit=100');
        const data = await response.json();
        if (data.products) {
          setProducts(data.products);
          // Extract unique categories
          const cats = [...new Set(data.products.map((p: Product) => p.category?.name).filter(Boolean) as string[])];
          setCategories(cats);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    }
    
    // Reset search and category filters - this triggers the useEffect to filter products
    setProductSearchQuery('');
    setSelectedCategory('all');
    
    // Fetch next invoice number
    try {
      const response = await fetch('/api/customer-invoices?next=true');
      const data = await response.json();
      if (data.success && data.nextInvoiceNumber) {
        const num = data.nextInvoiceNumber;
        const parts = num.split('-');
        if (parts.length >= 2) {
          setInvoiceNumberSuffix(parts[1]);
          setInvoiceNumber(num);
        }
      }
    } catch (error) {
      console.error('Failed to fetch next invoice number:', error);
    }
    
    setShowInvoiceModal(true);
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    setCustomerSearch('');
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const calculateTax = (subtotal: number) => {
    const includeInPrice = businessSettings?.includeInPrice ?? false;
    if (includeInPrice) {
      // Prices already include tax - no additional tax to add
      return 0;
    }
    return subtotal * 0.16; // 16% VAT
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const includeInPrice = businessSettings?.includeInPrice ?? false;
    const tax = calculateTax(subtotal);
    if (includeInPrice) {
      // Prices include tax - total is the subtotal
      return subtotal;
    }
    return subtotal + tax;
  };

  const addItem = (product: Product, selectedUnit?: UnitOption) => {
    const unitToUse = selectedUnit || null;
    const existing = invoiceItems.find(item => item.productId === product._id && item.unitName === (unitToUse?.name || product.baseUnit));
    
    if (existing) {
      const updatedItems = invoiceItems.map(item => 
        item.productId === product._id && item.unitName === (unitToUse?.name || product.baseUnit)
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      );
      setInvoiceItems(updatedItems);
    } else {
      const unitPrice = unitToUse?.price || product.retailPrice;
      const unitName = unitToUse?.name || product.baseUnit || 'unit';
      
      const newItem: InvoiceItem = {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice,
        unitName,
        discount: 0,
        discountType: 'fixed',
        total: unitPrice
      };
      setInvoiceItems([...invoiceItems, newItem]);
    }
  };

  const updateItemQuantity = (productId: string, unitName: string, delta: number) => {
    const item = invoiceItems.find(i => i.productId === productId && i.unitName === unitName);
    if (item) {
      setItemQuantity(productId, unitName, item.quantity + delta);
    }
  };

  const setItemQuantity = (productId: string, unitName: string, quantity: number) => {
    const updatedItems = invoiceItems.map(item => {
      if (item.productId === productId && item.unitName === unitName) {
        const newQty = Math.max(0, quantity);
        return { ...item, quantity: newQty, total: newQty * item.unitPrice };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setInvoiceItems(updatedItems);
  };

  const removeItem = (productId: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.productId !== productId));
  };

  const handleSubmitInvoice = async () => {
    if (!selectedCustomer) {
      setAlertMessage('Please select a customer before creating the invoice.');
      setShowAlertModal(true);
      return;
    }
    if (invoiceItems.length === 0) {
      setAlertMessage('Please add at least one product to the invoice.');
      setShowAlertModal(true);
      return;
    }

    try {
      const payload = {
        customerId: selectedCustomer._id,
        invoiceNumber: invoiceNumber,
        items: invoiceItems,
        notes: invoiceNotes,
        taxRate: 16,
        subtotal: calculateSubtotal(),
        tax: calculateTax(calculateSubtotal()),
        total: calculateTotal(),
        invoiceDate: invoiceDate,
        paymentTerms: paymentTerms,
        ...(editMode && {
          editMode: true,
          editingInvoiceId: editingInvoiceId
        })
      };

      const response = editMode 
        ? await fetch(`/api/customer-invoices/${editingInvoiceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/customer-invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await response.json();
      
      if (data.success) {
        // Close the modal and reset form
        setShowInvoiceModal(false);
        resetInvoiceForm();
        
        // Reset edit mode
        setEditMode(false);
        setEditingInvoiceId(null);
        
        fetchData();
        
        if (!editMode) {
          // Open print preview with the created invoice (only for new invoices)
          const createdInvoice = {
            ...data.invoice,
            customer: {
              _id: selectedCustomer._id,
              name: selectedCustomer.name,
              phone: selectedCustomer.phone || ''
            },
            // Transform unitName to unit for PrintPreview
            items: data.invoice.items?.map((item: any) => ({
              ...item,
              unit: item.unitName || item.unit || '-'
            })) || []
          };
          setSelectedInvoiceForPrint(createdInvoice);
          setShowPrintPreview(true);
        } else {
          setAlertMessage('Invoice updated successfully!');
          setShowAlertModal(true);
        }
      } else {
        setAlertMessage(data.error || 'Failed to save invoice');
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error('Failed to save invoice:', error);
      setAlertMessage('Failed to save invoice. Please try again.');
      setShowAlertModal(true);
    }
  };

  // Action handlers for invoice row buttons
  const handleViewInvoice = (invoice: Invoice) => {
    setViewInvoice(invoice);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    if (invoice.status !== 'draft') {
      setAlertMessage('Only draft invoices can be edited.');
      setShowAlertModal(true);
      return;
    }
    
    // Set edit mode
    setEditMode(true);
    setEditingInvoiceId(invoice._id);
    
    // Load invoice data into form
    setInvoiceNumber(invoice.invoiceNumber);
    setInvoiceDate(new Date(invoice.invoiceDate).toISOString().split('T')[0]);
    setPaymentTerms(typeof invoice.paymentTerms === 'number' ? invoice.paymentTerms : 30);
    setInvoiceNotes(invoice.notes || '');
    
    // Load customer
    if (invoice.customer) {
      setSelectedCustomer(invoice.customer as unknown as Customer);
    }
    
    // Load items
    const items: InvoiceItem[] = (invoice.items || []).map((item: any) => ({
      productId: item.product?._id || item.product || '',
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitName: item.unitName,
      discount: item.discount || 0,
      discountType: item.discountType || 'fixed',
      total: item.total,
    }));
    setInvoiceItems(items);
    
    // Open the create invoice modal
    setShowInvoiceModal(true);
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/customer-invoices/${invoice._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
    }
  };

  const handleRecordPayment = (invoice: Invoice) => {
    // Navigate to customer payments or open payment modal
    window.location.href = '/customer-payments';
  };

  const handlePrintInvoice = (invoice: Invoice, docType: 'invoice' | 'delivery-note' = 'invoice') => {
    setPrintDocumentType(docType);
    // Transform unitName to unit for PrintPreview
    const transformedInvoice = {
      ...invoice,
      items: invoice.items?.map((item: any) => ({
        ...item,
        unit: item.unitName || item.unit || '-'
      })) || []
    };
    setSelectedInvoiceForPrint(transformedInvoice);
    setShowPrintPreview(true);
  };

  const resetInvoiceForm = () => {
    setSelectedCustomer(null);
    setInvoiceItems([]);
    setInvoiceNotes('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentTerms(30);
    setProductSearchQuery('');
    setSelectedCategory('all');
    setEditMode(false);
    setEditingInvoiceId(null);
    // filteredProducts will be set by useEffect
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-600',
      sent: 'bg-blue-100 text-blue-600',
      partial: 'bg-yellow-100 text-yellow-600',
      paid: 'bg-green-100 text-green-600',
      cancelled: 'bg-red-100 text-red-600'
    };
    const labels = {
      draft: 'Draft',
      sent: 'Sent',
      partial: 'Partial',
      paid: 'Paid',
      cancelled: 'Cancelled'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (item: Invoice) => (
        <span className="font-medium">{item.invoiceNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Invoice) => item.customer?.name || item.customerName || '-',
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      render: (item: Invoice) => formatDate(item.invoiceDate),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: Invoice) => formatCurrency(item.total),
    },
    {
      key: 'balanceDue',
      header: 'Balance',
      render: (item: Invoice) => {
        const paid = item.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
        return formatCurrency(item.total - paid);
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Invoice) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Invoice) => (
        <div className="flex gap-1">
          {item.status === 'draft' && (
            <Button variant="ghost" size="sm" title="Edit Invoice" onClick={() => handleEditInvoice(item)}>
              <Edit className="w-4 h-4 text-blue-600" />
            </Button>
          )}
          <Button variant="ghost" size="sm" title="View Invoice" onClick={() => handleViewInvoice(item)}>
            <Eye className="w-4 h-4" />
          </Button>
          {item.status === 'draft' && (
            <Button variant="ghost" size="sm" title="Send Invoice" onClick={() => handleSendInvoice(item)}>
              <Send className="w-4 h-4" />
            </Button>
          )}
          {item.status !== 'paid' && item.status !== 'cancelled' && (
            <Button variant="ghost" size="sm" title="Record Payment" onClick={() => handleRecordPayment(item)}>
              <DollarSign className="w-4 h-4" />
            </Button>
          )}
          <div className="relative group">
            <Button variant="ghost" size="sm" title="Print">
              <Printer className="w-4 h-4" />
            </Button>
            <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10 hidden group-hover:block">
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => handlePrintInvoice(item, 'invoice')}
              >
                Print Invoice
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => handlePrintInvoice(item, 'delivery-note')}
              >
                Print Delivery Note
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="New Invoice" subtitle="Create and manage customer invoices" />
      
      <div className="p-6">
        <Card>
          <div className="p-4 flex items-center justify-between border-b">
            <div className="flex gap-3">
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <Button onClick={() => handleOpenInvoiceModal('sale')}>
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>
          
          <DataTable
            columns={columns}
            data={invoices}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No invoices found"
          />
        </Card>
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => { setShowInvoiceModal(false); resetInvoiceForm(); }}
        size="full"
        className="bg-white"
        header={
          <div className="flex items-center justify-between w-full gap-4">
            <h2 className="text-sm font-semibold text-gray-900">Create New Invoice</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Customer..."
                  value={selectedCustomer?.name || ''}
                  readOnly
                  className="w-24 text-xs h-7"
                />
                <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(true)} className="h-7 px-2">
                  <User className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Inv#</span>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-20 text-xs h-7"
                />
              </div>
            </div>
          </div>
        }
      >
        <div className="flex flex-col h-[calc(100vh-130px)] -m-4">

          {/* Search Bar - Standalone */}
            <div className="flex gap-3 mb-0 flex-shrink-0 relative bg-white p-2 rounded-lg border border-gray-200">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={productSearchRef}
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedProductIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedProductIndex(prev => Math.max(prev - 1, 0));
                    } else if (e.key === 'Enter' && selectedProductIndex >= 0) {
                      e.preventDefault();
                      addItem(filteredProducts[selectedProductIndex]);
                      setProductSearchQuery('');
                      setFilteredProducts([]);
                      setSelectedProductIndex(-1);
                    } else if (e.key === 'Escape') {
                      setProductSearchQuery('');
                      setFilteredProducts([]);
                      setSelectedProductIndex(-1);
                    }
                  }}
                />
              </div>
              {/* Floating Product Dropdown */}
              {productSearchQuery && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-auto">
                  {filteredProducts.slice(0, 10).map((product, index) => (
                    <div
                      key={product._id}
                      onClick={() => {
                        addItem(product);
                        setProductSearchQuery('');
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
                      </div>
                    </div>
                  ))}
                  <div className="sticky bottom-0 bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-t border-gray-200">
                    ↑↓ Navigate • Enter to select • Esc to close
                  </div>
                </div>
              )}
            </div>

          {/* Invoice Items Section - Bottom - POS Cart Style */}
          <div className="bg-white border-t border-gray-200 flex flex-col overflow-hidden flex-shrink-0" style={{ minHeight: '220px', maxHeight: '280px' }}>
            {/* Invoice Items Table - Scrollable */}
            <div className="flex-1 overflow-auto p-3">
              {invoiceItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <ShoppingCart className="w-12 h-12 mr-3 text-gray-300" />
                  <div>
                    <p>No items added</p>
                    <p className="text-sm">Click products above to add items</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Product</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Unit</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Qty</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Price</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Total</th>
                      <th className="text-center py-2 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item) => (
                      <tr key={`${item.productId}-${item.unitName}`} className="border-t border-gray-100">
                        <td className="py-2 px-2">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.sku}</div>
                        </td>
                        <td className="text-center py-2 px-2 text-xs text-gray-600">
                          {item.unitName}
                        </td>
                        <td className="text-center py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => updateItemQuantity(item.productId, item.unitName, -1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setItemQuantity(item.productId, item.unitName, Math.max(1, val));
                              }}
                              className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => updateItemQuantity(item.productId, item.unitName, 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2 text-xs">
                          {formatCurrency(item.unitPrice)}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Totals - Fixed at bottom above invoice details */}
            {invoiceItems.length > 0 && (
              <div className="border-t border-gray-200 p-3 flex items-center justify-between bg-gray-50 fixed bottom-12 left-0 right-0 z-10">
                <div className="flex items-center gap-6">
                  <div className="text-sm">
                    <span className="text-gray-500">Subtotal: </span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">VAT (16%): </span>
                    <span className="font-medium">{formatCurrency(calculateTax(calculateSubtotal()))}</span>
                  </div>
                  <div className="text-lg font-bold">
                    Total: <span className="text-emerald-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {/* Create Invoice button removed from subtotal row */}
                </div>
              </div>
            )}
          </div>

          {/* Invoice Details Footer - Fixed at bottom of screen */}
          {invoiceItems.length > 0 && (
            <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0 fixed bottom-0 left-0 right-0 z-10" style={{ marginTop: 'auto' }}>
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-700">Invoice Date:</label>
                  <input
                    type="date"
                    className="px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-700">Terms:</label>
                  <select
                    className="px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(parseInt(e.target.value))}
                  >
                    <option value={0}>Due on Receipt</option>
                    <option value={7}>Net 7</option>
                    <option value={14}>Net 14</option>
                    <option value={30}>Net 30</option>
                    <option value={60}>Net 60</option>
                  </select>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Add notes..."
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                  />
                </div>
                <Button 
                  className="flex-1"
                  size="sm"
                  onClick={handleSubmitInvoice}
                >
                  {editMode ? 'Update Invoice' : 'Create Invoice'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Alert Modal */}
      <Modal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title="Validation Error"
        size="sm"
      >
        <div className="p-4">
          <div className="flex items-center gap-3 text-amber-600 mb-4">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-medium">{alertMessage}</span>
          </div>
          <Button onClick={() => setShowAlertModal(false)} className="w-full">
            OK
          </Button>
        </div>
      </Modal>

      {/* Customer Selection Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => { setShowCustomerModal(false); setCustomerSearch(''); }}
        title="Select Customer"
        size="md"
      >
        <div className="p-4">
          <Input
            placeholder="Search customers..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="mb-4"
          />
          <div className="max-h-96 overflow-auto space-y-2">
            {filteredCustomers.map((customer) => (
              <button
                key={customer._id}
                onClick={() => selectCustomer(customer)}
                className="w-full p-3 text-left bg-gray-50 hover:bg-emerald-50 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors"
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">{customer.phone}</div>
                {customer.customerType && (
                  <div className="text-xs text-gray-400 mt-1">{customer.customerType}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={`Invoice ${viewInvoice?.invoiceNumber || ''}`}
        size="lg"
      >
        {viewInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{viewInvoice.customer?.name || viewInvoice.customerName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(viewInvoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  viewInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                  viewInvoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                  viewInvoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  viewInvoice.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {viewInvoice.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-medium text-lg">{formatCurrency(viewInvoice.total)}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">Items</p>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Item</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.items?.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{item.productName}</td>
                        <td className="text-right">{item.quantity}</td>
                        <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setViewInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print Preview Modal */}
      {showPrintPreview && selectedInvoiceForPrint && (
        <PrintPreview
          documentType={printDocumentType}
          document={{
            logo: businessSettings?.logo || '',
            businessName: businessSettings?.businessName || '',
            businessTagline: businessSettings?.businessTagline || '',
            businessAddress: businessSettings?.address || '',
            businessPhone: businessSettings?.phone || '',
            businessEmail: businessSettings?.email || '',
            vatNumber: businessSettings?.vatNumber || '',
            bankName: businessSettings?.bankName || '',
            bankAccount: businessSettings?.bankAccount || '',
            bankBranch: businessSettings?.bankBranch || '',
            terms: businessSettings?.invoiceTerms || '',
            kraPin: businessSettings?.kraPin || '',
            invoiceNumber: selectedInvoiceForPrint.invoiceNumber,
            date: selectedInvoiceForPrint.invoiceDate,
            includeInPrice: selectedInvoiceForPrint.includeInPrice ?? businessSettings?.includeInPrice ?? false,
            customer: {
              name: selectedInvoiceForPrint.customer?.name || selectedInvoiceForPrint.customerName || 'N/A',
              phone: selectedInvoiceForPrint.customer?.phone || ''
            },
            items: selectedInvoiceForPrint.items?.map((item) => ({
              name: item.productName,
              quantity: item.quantity,
              unit: (item as any).unitName || (item as any).unit || '-',
              price: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
              total: item.total
            })) || [],
            subtotal: selectedInvoiceForPrint.subtotal,
            tax: selectedInvoiceForPrint.tax,
            taxRate: selectedInvoiceForPrint.taxRate || 16,
            total: selectedInvoiceForPrint.total,
            dueDate: selectedInvoiceForPrint.dueDate,
            notes: selectedInvoiceForPrint.notes,
            status: selectedInvoiceForPrint.status,
            balanceDue: selectedInvoiceForPrint.total - (selectedInvoiceForPrint.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0),
            deliveryDate: printDocumentType === 'delivery-note' ? new Date().toISOString().split('T')[0] : undefined,
            deliveryAddress: ''
          }}
          onClose={() => {
            setShowPrintPreview(false);
            setSelectedInvoiceForPrint(null);
          }}
        />
      )}

    </div>
  );
}
