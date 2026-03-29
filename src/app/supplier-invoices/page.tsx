'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, RefreshCw, Eye, Truck, Package, CheckCircle, Clock, XCircle, X, DollarSign, FileText, AlertTriangle, Edit } from 'lucide-react';


interface SupplierInvoiceItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  discount: number;
  tax: number;
  total: number;
  unitName?: string;
  unitAbbreviation?: string;
  conversionToBase?: number;
  batchNumber?: string;
  expiryDate?: string;
}

interface SupplierInvoicePayment {
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'mpesa' | 'cheque' | 'card';
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  recordedByName?: string;
}

interface SupplierInvoice {
  _id: string;
  invoiceNumber: string;
  supplier: { _id: string; name: string; phone?: string; email?: string };
  supplierName: string;
  purchaseOrder?: string;
  purchaseOrderNumber?: string;
  items: SupplierInvoiceItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'partially_paid' | 'paid' | 'overdue' | 'unpaid';
  invoiceDate: string;
  dueDate: string;
  approvedDate?: string;
  approvedBy?: string;
  approvedByName?: string;
  payments: SupplierInvoicePayment[];
  notes?: string;
  branch?: string;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  costPrice: number;
  stockQuantity: number;
  baseUnit: string;
  units?: {
    name: string;
    abbreviation: string;
    conversionToBase: number;
    price: number;
  }[];
}

export default function SupplierInvoicesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierProducts, setSelectedSupplierProducts] = useState<Product[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const supplierSelectRef = useRef<HTMLSelectElement>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceNumberSuffix, setInvoiceNumberSuffix] = useState('');
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    items: [] as any[],
    notes: '',
    invoiceDate: '',
    dueDate: '',
    purchaseOrderId: '',
    purchaseOrderNumber: '',
  });

  // Auto-set due date to 30 days after invoice date
  useEffect(() => {
    if (formData.invoiceDate) {
      const invoiceDate = new Date(formData.invoiceDate);
      const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.invoiceDate]);
  
  // Supplier search functionality
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [invoiceNumberError, setInvoiceNumberError] = useState('');
  const [productSearchDebounceTimer, setProductSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [showPoDropdown, setShowPoDropdown] = useState(false);
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState<any[]>([]);
  const [showPOModal, setShowPOModal] = useState(false);


  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'mpesa' | 'cheque' | 'card',
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    fetchInvoices();
  }, [status, supplierFilter]);



  // Auto-focus supplier select when modal opens
  useEffect(() => {
    if (showCreateModal && supplierSelectRef.current) {
      const timer = setTimeout(() => {
        supplierSelectRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showCreateModal]);

  // Real-time product search with debouncing
  useEffect(() => {
    if (productSearchDebounceTimer) {
      clearTimeout(productSearchDebounceTimer);
    }

    if (productSearchQuery.trim()) {
      const timer = setTimeout(async () => {
        setProductSearchLoading(true);
        try {
          const params = new URLSearchParams();
          params.set('search', productSearchQuery);
          params.set('limit', '20');
          const response = await fetch(`/api/products?${params}`);
          const data = await response.json();
          if (data.success) {
            setFilteredProducts(data.products);
          }
        } catch (error) {
          console.error('Failed to search products:', error);
        } finally {
          setProductSearchLoading(false);
        }
      }, 300);
      setProductSearchDebounceTimer(timer);
    } else {
      setFilteredProducts(selectedSupplierProducts.length > 0 ? selectedSupplierProducts : products);
    }
    setShowProductDropdown(true);
  }, [productSearchQuery, selectedSupplierProducts, products]);

  useEffect(() => {
    // Filter purchase orders based on search query
    if (poSearchQuery) {
      const filtered = purchaseOrders.filter(po => 
        po.orderNumber.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(poSearchQuery.toLowerCase())
      );
      setFilteredPurchaseOrders(filtered);
    } else {
      setFilteredPurchaseOrders(purchaseOrders);
    }
    setShowPoDropdown(true);
  }, [poSearchQuery, purchaseOrders]);

  // Initialize filteredProducts when supplier changes
  useEffect(() => {
    if (selectedSupplierProducts.length > 0) {
      setFilteredProducts(selectedSupplierProducts);
    }
  }, [selectedSupplierProducts]);

  // Focus search input when modal opens
  useEffect(() => {
    if (showCreateModal) {
      const timer = setTimeout(() => {
        productSearchRef.current?.focus();
        setShowSupplierDropdown(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showCreateModal]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      if (data.success) setSuppliers(data.suppliers);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  // Filter suppliers based on search query
  const filteredSuppliers = supplierSearchQuery
    ? suppliers.filter(s => 
        s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(supplierSearchQuery.toLowerCase())) ||
        (s.phone && s.phone.includes(supplierSearchQuery))
      )
    : suppliers;

  // Handle selecting a supplier from dropdown
  const handleSelectSupplier = (supplier: Supplier) => {
    setFormData({
      ...formData,
      supplierId: supplier._id,
      supplierName: supplier.name,
      items: []
    });
    setSupplierSearchQuery(supplier.name);
    setShowSupplierDropdown(false);
    // Filter products by supplier
    const supplierProducts = products.filter(p => (p as any).supplier?._id === supplier._id || (p as any).supplier === supplier._id);
    setSelectedSupplierProducts(supplierProducts);
  };

  const handleSelectPurchaseOrder = async (po: any) => {
    // Populate invoice from purchase order
    const poItems = po.items?.map((item: any) => ({
      productId: item.product?._id || item.product,
      productName: item.productName,
      sku: item.sku || '',
      quantity: item.quantity,
      unit: item.unitAbbreviation || item.unitName || 'pcs',
      unitCost: item.unitCost,
      discount: item.discount || 0,
      tax: item.tax || 0,
      total: item.total,
      productDetails: item.product,
    })) || [];

    setFormData({
      ...formData,
      supplierId: po.supplier?._id || po.supplier,
      supplierName: po.supplierName,
      items: poItems,
      purchaseOrderId: po._id,
      purchaseOrderNumber: po.orderNumber,
    });
    setSupplierSearchQuery(po.supplierName);
    setPoSearchQuery(po.orderNumber);
    setShowPoDropdown(false);
    
    // Filter products by supplier
    const supplierProducts = products.filter(p => (p as any).supplier?._id === (po.supplier?._id || po.supplier) || (p as any).supplier === (po.supplier?._id || po.supplier));
    setSelectedSupplierProducts(supplierProducts);
    
    // Fetch suppliers to ensure they are loaded before opening modal
    await fetchSuppliers();
    
    // Open the create invoice modal
    setShowCreateModal(true);
  };

  // Handle creating a new supplier
  const handleCreateSupplier = async () => {
    if (!newSupplierData.name.trim() || !newSupplierData.phone.trim()) {
      alert('Supplier name and phone are required');
      return;
    }
    
    setIsCreatingSupplier(true);
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplierData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newSupplier = data.supplier;
        setSuppliers(prev => [...prev, newSupplier]);
        handleSelectSupplier(newSupplier);
        setTimeout(() => {
          productSearchRef.current?.focus();
        }, 100);
        setShowNewSupplierModal(false);
        setNewSupplierData({
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
        });
        setTimeout(() => {
          productSearchRef.current?.focus();
        }, 100);
      } else {
        alert(data.error || 'Failed to create supplier');
      }
    } catch (error) {
      console.error('Failed to create supplier:', error);
      alert('Failed to create supplier. Please try again.');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const handleEditInvoice = async (invoice: SupplierInvoice) => {
    setEditingInvoice(invoice);
    setInvoiceNumber(invoice.invoiceNumber);
    setFormData({
      supplierId: invoice.supplier?._id || '',
      supplierName: invoice.supplier?.name || invoice.supplierName,
      items: invoice.items.map((item: any) => ({
        productId: item.product?._id || item.product,
        productName: item.productName,
        sku: item.sku || '',
        quantity: item.quantity,
        unit: item.unitAbbreviation || item.unitName || 'pcs',
        unitCost: item.unitCost,
        discount: item.discount || 0,
        tax: item.tax || 0,
        total: item.total,
        productDetails: item.product,
      })),
      notes: invoice.notes || '',
      invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      purchaseOrderId: (invoice.purchaseOrder as any)?._id || '',
      purchaseOrderNumber: invoice.purchaseOrderNumber || '',
    });
    setSupplierSearchQuery(invoice.supplier?.name || invoice.supplierName);
    await fetchSuppliers();
    await fetchProducts();
    setShowCreateModal(true);
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=100');
      const data = await response.json();
      if (data.success) setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/purchases?status=pending&limit=100');
      const data = await response.json();
      if (data.success) setPurchaseOrders(data.purchases);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    }
  };

  const addItem = (product: Product) => {
    const existingItem = formData.items.find((item: any) => item.productId === product._id);
    if (existingItem) {
      setFormData({
        ...formData,
        items: formData.items.map((item: any) => 
          item.productId === product._id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitCost }
            : item
        )
      });
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, {
          productId: product._id,
          productName: product.name,
          sku: product.sku || '',
          quantity: 1,
          unit: product.baseUnit || 'pcs',
          unitCost: product.costPrice || 0,
          discount: 0,
          tax: 0,
          total: product.costPrice || 0,
          productDetails: product,
        }]
      });
    }
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setFormData({
      ...formData,
      items: formData.items.map((item: any) => 
        item.productId === productId 
          ? { ...item, quantity, total: quantity * item.unitCost - (item.discount || 0) + (item.tax || 0) }
          : item
      )
    });
  };

  const updateItemCost = (productId: string, unitCost: number) => {
    setFormData({
      ...formData,
      items: formData.items.map((item: any) => 
        item.productId === productId 
          ? { ...item, unitCost, total: item.quantity * unitCost - (item.discount || 0) + (item.tax || 0) }
          : item
      )
    });
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    setFormData({
      ...formData,
      items: formData.items.map((item: any) => 
        item.productId === productId 
          ? { ...item, discount, total: item.quantity * item.unitCost - discount + (item.tax || 0) }
          : item
      )
    });
  };

  const updateItemTax = (productId: string, tax: number) => {
    setFormData({
      ...formData,
      items: formData.items.map((item: any) => 
        item.productId === productId 
          ? { ...item, tax, total: item.quantity * item.unitCost - (item.discount || 0) + tax }
          : item
      )
    });
  };

  const updateItemUnit = (productId: string, unit: string) => {
    setFormData({
      ...formData,
      items: formData.items.map((item: any) => 
        item.productId === productId 
          ? { ...item, unit }
          : item
      )
    });
  };

  const removeItem = (productId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item: any) => item.productId !== productId)
    });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum: number, item: any) => sum + item.total, 0);
  };

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (status) params.set('status', status);
      if (supplierFilter) params.set('supplier', supplierFilter);

      const response = await fetch(`/api/supplier-invoices?${params}`);
      const data = await response.json();

      if (data.success) setInvoices(data.invoices);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
      unpaid: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
      pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      partially_paid: { bg: 'bg-purple-100', text: 'text-purple-700', icon: DollarSign },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
    };
    return styles[status] || styles.draft;
  };

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (item: SupplierInvoice) => (
        <span className="font-medium">{item.invoiceNumber}</span>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (item: SupplierInvoice) => item.supplier?.name || item.supplierName,
    },
    {
      key: 'items',
      header: 'Items',
      render: (item: SupplierInvoice) => (
        <span className="text-gray-600">{item.items?.length || 0} items</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: SupplierInvoice) => (
        <span className="font-medium">{formatCurrency(item.total)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: SupplierInvoice) => {
        const style = getStatusBadge(item.status);
        return (
          <span className={`badge ${style.bg} ${style.text} capitalize`}>
            {item.status.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (item: SupplierInvoice) => (
        <span className="text-gray-500 text-sm">{formatDate(item.dueDate)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: SupplierInvoice) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(item)}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalValue = invoices.reduce((sum, p) => sum + p.total, 0);
  const totalPaid = invoices.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalPending = invoices.filter(p => p.status === 'pending_approval').length;
  const totalOverdue = invoices.filter(p => p.status === 'overdue').length;

  return (
    <div>
      <Header title="Supplier Invoices" subtitle="Manage Supplier Invoices" />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <Button variant="outline" onClick={fetchInvoices} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => {
            fetchPurchaseOrders();
            setShowPOModal(true);
            setShowPoDropdown(true);
          }} className="gap-2">
            <Package className="w-4 h-4" />
            From Purchase Order
          </Button>
          <Button onClick={() => {
            setEditingInvoice(null);
            setFormData({
              supplierId: '',
              supplierName: '',
              items: [],
              notes: '',
              invoiceDate: new Date().toISOString().split('T')[0],
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              purchaseOrderId: '',
              purchaseOrderNumber: '',
            });
            setSelectedSupplierProducts([]);
            fetchSuppliers();
            fetchProducts();
            // Generate new invoice number
            const lastInvoice = invoices[0];
            let newSuffix = '00001';
            if (lastInvoice?.invoiceNumber) {
              const parts = lastInvoice.invoiceNumber.split('-');
              if (parts.length >= 2) {
                const num = parseInt(parts[parts.length - 1]) || 0;
                newSuffix = String(num + 1).padStart(5, '0');
              }
            }
            setInvoiceNumberSuffix(newSuffix);
            setInvoiceNumber(newSuffix);
            setShowCreateModal(true);
          }} className="gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Invoices</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPaid)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="text-2xl font-bold text-amber-600">{totalPending}</p>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader 
            title="All Supplier Invoices" 
            subtitle={`${invoices.length} invoices`}
          />
          <DataTable
            columns={columns}
            data={invoices}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No invoices found"
          />
        </Card>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">Invoice #{selectedInvoice.invoiceNumber}</h2>
                  <p className="text-sm text-gray-500">{formatDate(selectedInvoice.invoiceDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedInvoice.supplier?.name || selectedInvoice.supplierName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusBadge(selectedInvoice.status).bg} ${getStatusBadge(selectedInvoice.status).text} capitalize`}>
                    {selectedInvoice.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Invoice Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Items</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2">Product</th>
                        <th className="text-right px-4 py-2">Unit</th>
                        <th className="text-right px-4 py-2">Qty</th>
                        <th className="text-right px-4 py-2">Cost</th>
                        <th className="text-right px-4 py-2">Discount</th>
                        <th className="text-right px-4 py-2">Tax</th>
                        <th className="text-right px-4 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-4 py-2">{item.productName}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{item.unitAbbreviation || item.unitName || '-'}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.discount)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.tax)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-500">-{formatCurrency(selectedInvoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatCurrency(selectedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-emerald-600">{formatCurrency(selectedInvoice.amountPaid)}</span>
                </div>
                {selectedInvoice.balance > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Balance</span>
                    <span className="text-red-600">{formatCurrency(selectedInvoice.balance)}</span>
                  </div>
                )}
              </div>

              {/* Payment History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500 mb-2">Payment History</p>
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-gray-500">{formatDate(payment.paymentDate)} • {payment.paymentMethod.replace('_', ' ')}</p>
                        </div>
                        {payment.referenceNumber && (
                          <p className="text-xs text-gray-500">Ref: {payment.referenceNumber}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              {selectedInvoice.status !== 'paid' && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setPaymentData({
                      amount: selectedInvoice.balance,
                      paymentMethod: 'cash',
                      referenceNumber: '',
                      notes: '',
                    });
                    setShowPaymentModal(true);
                  }}
                >
                  Record Payment
                </Button>
              )}
              <Button onClick={() => setSelectedInvoice(null)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-gray-900">
          <div className="h-full flex flex-col max-w-7xl mx-auto bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0 gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{editingInvoice ? 'Edit Supplier Invoice' : 'Create Supplier Invoice'}</h2>
                  <p className="text-sm text-gray-500">{editingInvoice ? 'Update supplier invoice' : 'Add new supplier invoice'}</p>
                </div>
                <div className="w-32">
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${invoiceNumberError ? 'border-red-500' : 'border-gray-200'}`}
                    value={invoiceNumber}
                    onChange={(e) => {
                      setInvoiceNumber(e.target.value);
                      if (invoiceNumberError) setInvoiceNumberError('');
                    }}
                    placeholder="Invoice #"
                  />
                  {invoiceNumberError && (
                    <p className="text-red-500 text-xs mt-1">{invoiceNumberError}</p>
                  )}
                </div>
              </div>
              <div className="w-64 relative">
                  <div className="relative">
                    <input
                      ref={supplierInputRef}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={formData.supplierId ? formData.supplierName : "Search or select supplier..."}
                      value={supplierSearchQuery}
                      onChange={(e) => {
                        setSupplierSearchQuery(e.target.value);
                        if (formData.supplierId && e.target.value !== formData.supplierName) {
                          setFormData({ ...formData, supplierId: '', supplierName: '' });
                        }
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setShowNewSupplierModal(true);
                        setSupplierSearchQuery('');
                      }}
                      title="Add new supplier"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    
                    {/* Supplier Dropdown */}
                    {showSupplierDropdown && filteredSuppliers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredSuppliers.slice(0, 10).map(supplier => (
                          <button
                            key={supplier._id}
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex flex-col"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectSupplier(supplier)}
                          >
                            <span className="font-medium text-gray-900">{supplier.name}</span>
                            <span className="text-xs text-gray-500">
                              {supplier.phone || 'No phone'} {supplier.email && `• ${supplier.email}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* No results - Add new option */}
                    {showSupplierDropdown && supplierSearchQuery && filteredSuppliers.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                        <button
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-2 text-emerald-600"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setNewSupplierData({
                              ...newSupplierData,
                              name: supplierSearchQuery,
                            });
                            setShowNewSupplierModal(true);
                            setShowSupplierDropdown(false);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add &quot;{supplierSearchQuery}&quot; as new supplier</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingInvoice(null);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form Content - Scrollable */}
              <div className="flex-1 overflow-auto p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                
                // Validate required fields
                if (!invoiceNumber.trim()) {
                  setInvoiceNumberError('Invoice number is required');
                  return;
                }
                setInvoiceNumberError('');
                if (!formData.supplierId) {
                  alert('Please select a supplier');
                  return;
                }
                if (formData.items.length === 0) {
                  alert('Please add at least one product');
                  return;
                }
                
                try {
                  const url = editingInvoice 
                    ? `/api/supplier-invoices/${editingInvoice._id}`
                    : '/api/supplier-invoices';
                  const method = editingInvoice ? 'PUT' : 'POST';
                  
                  const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData, invoiceNumber }),
                  });
                  if (response.ok) {
                    const invoice = await response.json();
                    fetchInvoices();

                    // Close modal after successful save
                    setShowCreateModal(false);
                    setEditingInvoice(null);
                  } else {
                    const error = await response.json();
                    alert(`Failed to ${editingInvoice ? 'update' : 'create'} invoice: ` + error.error);
                  }
                } catch (error) {
                  console.error(`Failed to ${editingInvoice ? 'update' : 'create'} invoice:`, error);
                  alert(`Failed to ${editingInvoice ? 'update' : 'create'} invoice`);
                }
              }} className="space-y-6">
                {/* Top Section: Product Search and Invoice Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Product Search Section */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">Add Products</h3>
                    <div className="mb-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          ref={productSearchRef}
                          type="text"
                          placeholder="Search products by name or SKU..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                        />
                        {productSearchLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <div className="border border-gray-200 rounded-lg max-h-64 overflow-auto">
                        {filteredProducts.map((product) => (
                          <button
                            key={product._id}
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center border-b border-gray-100 last:border-b-0"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addItem(product)}
                          >
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(product.costPrice)}</p>
                              <p className="text-xs text-gray-500">Stock: {product.stockQuantity}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Invoice Details Section */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">Invoice Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={formData.invoiceDate}
                          onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order #</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={formData.purchaseOrderNumber}
                          onChange={(e) => setFormData({ ...formData, purchaseOrderNumber: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          rows={2}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                {formData.items.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">Invoice Items</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2">Product</th>
                            <th className="text-left px-4 py-2">Unit</th>
                            <th className="text-right px-4 py-2">Qty</th>
                            <th className="text-right px-4 py-2">Cost</th>
                            <th className="text-right px-4 py-2">Discount</th>
                            <th className="text-right px-4 py-2">Tax</th>
                            <th className="text-right px-4 py-2">Total</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item: any) => (
                            <tr key={item.productId} className="border-t border-gray-200">
                              <td className="px-4 py-2">
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-xs text-gray-500">{item.sku}</p>
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                                  value={item.unit}
                                  onChange={(e) => updateItemUnit(item.productId, e.target.value)}
                                >
                                  <option value={item.productDetails?.baseUnit || 'pcs'}>{item.productDetails?.baseUnit || 'pcs'}</option>
                                  {item.productDetails?.units?.map((u: any) => (
                                    <option key={u.name} value={u.name}>{u.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-16 px-2 py-1 border border-gray-200 rounded text-right"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value) || 0)}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-24 px-2 py-1 border border-gray-200 rounded text-right"
                                  value={item.unitCost}
                                  onChange={(e) => updateItemCost(item.productId, parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-20 px-2 py-1 border border-gray-200 rounded text-right"
                                  value={item.discount}
                                  onChange={(e) => updateItemDiscount(item.productId, parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-20 px-2 py-1 border border-gray-200 rounded text-right"
                                  value={item.tax}
                                  onChange={(e) => updateItemTax(item.productId, parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.productId)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan={6} className="px-4 py-2 text-right font-medium">Total:</td>
                            <td className="px-4 py-2 text-right font-bold">{formatCurrency(calculateTotal())}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowCreateModal(false);
                    setEditingInvoice(null);
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Record Payment"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                max={selectedInvoice.balance}
              />
              <p className="text-xs text-gray-500 mt-1">Maximum: {formatCurrency(selectedInvoice.balance)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value as any })}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mpesa">M-Pesa</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={paymentData.referenceNumber}
                onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={async () => {
                if (paymentData.amount <= 0) {
                  alert('Please enter a valid amount');
                  return;
                }
                try {
                  const response = await fetch(`/api/supplier-invoices/${selectedInvoice._id}/payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paymentData),
                  });
                  if (response.ok) {
                    fetchInvoices();
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                  } else {
                    const error = await response.json();
                    alert('Failed to record payment: ' + error.error);
                  }
                } catch (error) {
                  console.error('Failed to record payment:', error);
                  alert('Failed to record payment');
                }
              }} className="flex-1">
                Record Payment
              </Button>
            </div>
          </div>
        </Modal>
      )}



      {/* New Supplier Modal */}
      {showNewSupplierModal && (
        <Modal
          isOpen={showNewSupplierModal}
          onClose={() => setShowNewSupplierModal(false)}
          title="Add New Supplier"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={newSupplierData.name}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                placeholder="Enter supplier name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={newSupplierData.contactPerson}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, contactPerson: e.target.value })}
                placeholder="Enter contact person"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={newSupplierData.phone}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={newSupplierData.email}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                value={newSupplierData.address}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewSupplierModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateSupplier} disabled={isCreatingSupplier} className="flex-1">
                {isCreatingSupplier ? 'Creating...' : 'Add Supplier'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Purchase Order Selection Modal */}
      {showPOModal && (
        <Modal
          isOpen={showPOModal}
          onClose={() => setShowPOModal(false)}
          title="Select Purchase Order"
          size="lg"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number or supplier..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={poSearchQuery}
                onChange={(e) => setPoSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setShowPoDropdown(false), 200)}
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {showPoDropdown && filteredPurchaseOrders.length > 0 ? (
                <div className="space-y-2">
                  {filteredPurchaseOrders.map((po) => (
                    <button
                      key={po._id}
                      type="button"
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        handleSelectPurchaseOrder(po);
                        setShowPOModal(false);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{po.orderNumber}</p>
                          <p className="text-sm text-gray-500">{po.supplierName}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {po.items?.length || 0} items • {formatDate(po.orderDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-emerald-600">{formatCurrency(po.total)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            po.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                            po.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {po.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No pending purchase orders found</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPOModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

