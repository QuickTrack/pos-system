'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, Download, Upload, FolderTree, ChevronRight, ChevronDown, CheckSquare, Square, Settings2, Minus, Plus as PlusIcon } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: { _id: string; name: string };
  retailPrice: number;
  wholesalePrice: number;
  costPrice: number;
  stockQuantity: number;
  shopStock: number;
  remoteStock: number;
  lowStockThreshold: number;
  lowStockThresholdShop: number;
  lowStockThresholdRemote: number;
  isActive: boolean;
  baseUnit?: string;
  units?: {
    name: string;
    abbreviation: string;
    conversionToBase: number;
    price: number;
    barcode?: string;
  }[];
}

interface Category {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  parentCategory?: { _id: string; name: string } | string | null;
  parentName?: string;
  level?: number;
  isActive?: boolean;
  children?: Category[];
}

interface UnitOfMeasure {
  _id: string;
  name: string;
  abbreviation: string;
}

interface Supplier {
  _id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ProductUnit {
  name: string;
  abbreviation: string;
  conversionToBase: number;
  price: number;
  barcode?: string;
}

const DEFAULT_UNITS = [
  { _id: 'piece', name: 'Piece', abbreviation: 'pc' },
  { _id: 'kg', name: 'Kilogram', abbreviation: 'kg' },
  { _id: 'g', name: 'Gram', abbreviation: 'g' },
  { _id: 'liter', name: 'Liter', abbreviation: 'L' },
  { _id: 'ml', name: 'Milliliter', abbreviation: 'mL' },
  { _id: 'box', name: 'Box', abbreviation: 'box' },
  { _id: 'pack', name: 'Pack', abbreviation: 'pack' },
  { _id: 'meter', name: 'Meter', abbreviation: 'm' },
  { _id: 'cm', name: 'Centimeter', abbreviation: 'cm' },
  { _id: 'roll', name: 'Roll', abbreviation: 'roll' },
  { _id: 'pair', name: 'Pair', abbreviation: 'pair' },
  { _id: 'dozen', name: 'Dozen', abbreviation: 'doz' },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>(DEFAULT_UNITS);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    code: '',
    description: '',
    parentCategory: '',
  });
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', abbreviation: '' });
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    retailPrice: 0,
    wholesalePrice: 0,
    costPrice: 0,
    stockQuantity: 0,
    lowStockThreshold: 10,
    description: '',
    unit: 'piece',
    baseUnit: 'piece',
  });
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const productUnitsRef = useRef<ProductUnit[]>([]);
  
  // Bulk adjustment state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkAdjustModal, setShowBulkAdjustModal] = useState(false);
  const [bulkAdjustLocation, setBulkAdjustLocation] = useState<'shop' | 'remote'>('shop');
  const [bulkAdjustType, setBulkAdjustType] = useState<'add' | 'remove' | 'set'>('add');
  const [bulkAdjustQuantity, setBulkAdjustQuantity] = useState<number>(0);
  const [bulkAdjustReason, setBulkAdjustReason] = useState<string>('');
  const [bulkAdjustLoading, setBulkAdjustLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Helper to get effective shop stock (fallback to stockQuantity for legacy data)
  const getEffectiveShopStock = (product: Product) => {
    return product.shopStock !== undefined ? product.shopStock : (product.stockQuantity || 0);
  };

  const getEffectiveRemoteStock = (product: Product) => {
    return product.remoteStock || 0;
  };

  // Bulk adjustment handlers
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p._id));
    }
  };

  const getSelectedProductsData = () => {
    return products.filter(p => selectedProducts.includes(p._id));
  };

  const getAdjustmentPreview = () => {
    const selected = getSelectedProductsData();
    return selected.map(product => {
      const currentStock = bulkAdjustLocation === 'shop' 
        ? getEffectiveShopStock(product) 
        : getEffectiveRemoteStock(product);
      
      let newStock: number;
      if (bulkAdjustType === 'add') {
        newStock = currentStock + bulkAdjustQuantity;
      } else if (bulkAdjustType === 'remove') {
        newStock = Math.max(0, currentStock - bulkAdjustQuantity);
      } else {
        newStock = bulkAdjustQuantity;
      }
      
      return {
        productId: product._id,
        productName: product.name,
        currentStock,
        newStock,
        change: newStock - currentStock,
      };
    });
  };

  const handleBulkAdjust = async () => {
    setBulkAdjustLoading(true);
    try {
      const items = getSelectedProductsData().map(product => ({
        productId: product._id,
        location: bulkAdjustLocation,
        adjustmentType: bulkAdjustType,
        quantity: bulkAdjustQuantity,
      }));

      const response = await fetch('/api/stock-audit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, reason: bulkAdjustReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to adjust stock');
        return;
      }

      alert(`Successfully adjusted ${data.success} products. ${data.failed > 0 ? `${data.failed} failed.` : ''}`);
      setShowBulkAdjustModal(false);
      setShowConfirmDialog(false);
      setSelectedProducts([]);
      setBulkAdjustQuantity(0);
      setBulkAdjustReason('');
      fetchData();
    } catch (error) {
      console.error('Bulk adjustment error:', error);
      alert('Failed to adjust stock');
    } finally {
      setBulkAdjustLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [searchQuery, showLowStock, selectedCategoryFilter]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (showLowStock) params.set('lowStock', 'true');
      if (selectedCategoryFilter && selectedCategoryFilter !== 'all') params.set('category', selectedCategoryFilter);

      const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
        fetch(`/api/products?${params}`),
        fetch('/api/categories'),
        fetch('/api/suppliers'),
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      const suppliersData = await suppliersRes.json();

      if (productsData.success) setProducts(productsData.products);
      if (categoriesData.success) setCategories(categoriesData.categories);
      if (suppliersData.success) setSuppliers(suppliersData.suppliers);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Category CRUD functions
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...categoryFormData,
        parentCategory: categoryFormData.parentCategory || null,
      };
      
      if (editingCategory) {
        await fetch(`/api/categories/${editingCategory._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      
      // Refresh categories
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
        // If we just created a new category (not editing), find and select the newest one
        if (!editingCategory && data.categories && data.categories.length > 0) {
          // Find the most recently created category
          const sorted = [...data.categories].sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          if (sorted[0]) {
            setFormData({ ...formData, category: sorted[0]._id });
          }
        }
      }
      
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', code: '', description: '', parentCategory: '' });
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  // Supplier CRUD functions
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierFormData),
      });
      
      // Refresh suppliers
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.suppliers);
        // Auto-select the newly created supplier
        if (data.suppliers && data.suppliers.length > 0) {
          const sorted = [...data.suppliers].sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          if (sorted[0]) {
            setSelectedSuppliers([...selectedSuppliers, sorted[0]._id]);
          }
        }
      }
      
      setShowSupplierModal(false);
      setSupplierFormData({ name: '', email: '', phone: '', address: '' });
    } catch (error) {
      console.error('Failed to save supplier:', error);
    }
  };

  const handleEditCategory = (category: Category) => {
    const parentId = category.parentCategory 
      ? (typeof category.parentCategory === 'object' ? category.parentCategory._id : category.parentCategory) 
      : '';
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      code: category.code || '',
      description: category.description || '',
      parentCategory: parentId,
    });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        alert(data.error);
        return;
      }
      // Refresh categories
      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      if (catData.success) setCategories(catData.categories);
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct ? `/api/products?id=${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      // Use ref for units (more reliable than state)
      const unitsToSave = productUnitsRef.current;
      const validUnits = unitsToSave.filter(u => u.name && u.abbreviation);
      
      const payload = {
        ...formData,
        units: validUnits,
        // Ensure backward compatibility
        unit: formData.baseUnit,
        // Include selected suppliers
        suppliers: selectedSuppliers,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const message = editingProduct ? 'Product updated successfully!' : 'Product added successfully!';
        alert(message);
        setShowProductModal(false);
        setEditingProduct(null);
        resetForm();
        fetchData();
      } else {
        const data = await response.json();
        console.error('Product save error response:', data);
        alert(data.error || data.details || 'Failed to save product');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const handleAddUnit = () => {
    if (newUnit.name && newUnit.abbreviation) {
      const unitId = newUnit.name.toLowerCase().replace(/\s+/g, '-');
      const unit: UnitOfMeasure = {
        _id: unitId,
        name: newUnit.name,
        abbreviation: newUnit.abbreviation,
      };
      setUnits([...units, unit]);
      setNewUnit({ name: '', abbreviation: '' });
      setShowUnitModal(false);
    }
  };

  const handleDeleteUnit = (unitId: string) => {
    const defaultUnitIds = DEFAULT_UNITS.map(u => u._id);
    if (defaultUnitIds.includes(unitId)) {
      alert('Cannot delete default units');
      return;
    }
    setUnits(units.filter(u => u._id !== unitId));
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Check if product has new unit structure
    const productAny = product as any;
    const existingUnits = productAny.units || [];
    productUnitsRef.current = existingUnits;
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category: typeof product.category === 'object' ? product.category._id : product.category,
      retailPrice: product.retailPrice,
      wholesalePrice: product.wholesalePrice,
      costPrice: product.costPrice,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      description: '',
      unit: 'piece',
      baseUnit: productAny.baseUnit || 'piece',
    });
    // Load existing units if any
    setProductUnits(productAny.units || []);
    // Load existing suppliers if any
    const supplierIds = productAny.suppliers?.map((s: any) => 
      typeof s === 'string' ? s : s._id
    ) || [];
    setSelectedSuppliers(supplierIds);
    setShowProductModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      category: '',
      retailPrice: 0,
      wholesalePrice: 0,
      costPrice: 0,
      stockQuantity: 0,
      lowStockThreshold: 10,
      description: '',
      unit: 'piece',
      baseUnit: 'piece',
    });
    productUnitsRef.current = [];
    setProductUnits([]);
    setSelectedSuppliers([]);
    setSupplierSearch('');
  };

  const addProductUnit = () => {
    const newUnits = [
      ...productUnitsRef.current,
      { name: '', abbreviation: '', conversionToBase: 1, price: 0 }
    ];
    productUnitsRef.current = newUnits;
    setProductUnits(newUnits);
  };

  const removeProductUnit = (index: number) => {
    const newUnits = productUnitsRef.current.filter((_, i) => i !== index);
    productUnitsRef.current = newUnits;
    setProductUnits(newUnits);
  };

  const updateProductUnit = (index: number, field: keyof ProductUnit, value: any) => {
    const updated = [...productUnitsRef.current];
    updated[index] = { ...updated[index], [field]: value };
    productUnitsRef.current = updated;
    setProductUnits(updated);
  };

  const columns = [
    {
      key: 'select',
      header: (
        <button
          onClick={toggleSelectAll}
          className="p-1"
          title={selectedProducts.length === products.length ? 'Deselect all' : 'Select all'}
        >
          {selectedProducts.length === products.length ? (
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
        </button>
      ),
      className: 'w-10',
      render: (item: Product) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleProductSelection(item._id);
          }}
          className="p-1"
        >
          {selectedProducts.includes(item._id) ? (
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
        </button>
      ),
    },
    {
      key: 'name',
      header: 'Product',
      render: (item: Product) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: Product) => item.category?.name || '-',
    },
    {
      key: 'retailPrice',
      header: 'Retail Price',
      render: (item: Product) => formatCurrency(item.retailPrice),
    },
    {
      key: 'costPrice',
      header: 'Cost',
      render: (item: Product) => formatCurrency(item.costPrice),
    },
    {
      key: 'stockQuantity',
      header: 'Stock',
      render: (item: Product) => {
        // Use shopStock only if it has been explicitly set (> 0), otherwise fall back to stockQuantity (legacy data)
        const effectiveShopStock = (item.shopStock && item.shopStock > 0) ? item.shopStock : (item.stockQuantity || 0);
        const effectiveRemoteStock = item.remoteStock || 0;
        const effectiveThreshold = item.lowStockThresholdShop || item.lowStockThreshold || 10;
        const totalStock = effectiveShopStock + effectiveRemoteStock;
        
        return (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Shop:</span>
              <span className={effectiveShopStock <= effectiveThreshold ? 'text-red-500 font-medium' : ''}>
                {effectiveShopStock}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Remote:</span>
              <span className={effectiveRemoteStock <= (item.lowStockThresholdRemote || 10) ? 'text-red-500 font-medium' : ''}>
                {effectiveRemoteStock}
              </span>
            </div>
            {totalStock <= item.lowStockThreshold && (
              <AlertTriangle className="w-3 h-3 text-amber-500" />
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Product) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)} className="text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Inventory" subtitle="Manage Products & Stock" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {selectedProducts.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => setShowBulkAdjustModal(true)}
                className="gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Adjust Stock ({selectedProducts.length})
              </Button>
            )}
            <Button
              variant={showLowStock ? 'primary' : 'outline'}
              onClick={() => setShowLowStock(!showLowStock)}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Low Stock
            </Button>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowCategoryModal(true)}
              className="gap-2"
            >
              <FolderTree className="w-4 h-4" />
              Categories
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button 
              onClick={() => {
                resetForm();
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader 
            title="Products" 
            subtitle={`${products.length} products`}
          />
          <DataTable
            columns={columns}
            data={products}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No products found"
          />
        </Card>
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
          resetForm();
        }}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Product Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="Auto-generated if empty"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  options={[
                    { value: '', label: 'Select Category' },
                    ...categories.map((c) => ({ value: c._id, label: c.name })),
                  ]}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCategoryModal(true);
                }}
                className="mb-0"
                title="Add New Category"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Retail Price"
              type="number"
              value={formData.retailPrice}
              onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) })}
              required
            />
            <Input
              label="Wholesale Price"
              type="number"
              value={formData.wholesalePrice}
              onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) })}
            />
            <Input
              label="Cost Price"
              type="number"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Initial Stock"
              type="number"
              value={formData.stockQuantity}
              onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })}
            />
            <Input
              label="Low Stock Alert"
              type="number"
              value={formData.lowStockThreshold}
              onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Unit
              </label>
              {/* Collapsible Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  className="w-full px-3 py-2 text-left bg-white border border-gray-200 rounded-lg hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex justify-between items-center"
                >
                  <span className={formData.baseUnit ? 'text-gray-900' : 'text-gray-400'}>
                    {formData.baseUnit 
                      ? units.find(u => u._id === formData.baseUnit)?.name 
                        ? `${units.find(u => u._id === formData.baseUnit)?.name} (${units.find(u => u._id === formData.baseUnit)?.abbreviation})`
                        : 'Select Unit'
                      : 'Select Base Unit'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUnitDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Content */}
                {showUnitDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {units.map((unit) => (
                      <button
                        key={unit._id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, baseUnit: unit._id });
                          setShowUnitDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-emerald-50 flex justify-between items-center ${
                          formData.baseUnit === unit._id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-700'
                        }`}
                      >
                        <span>{unit.name}</span>
                        <span className="text-xs text-gray-400">({unit.abbreviation})</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUnitDropdown(false);
                        setShowUnitModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-emerald-600 hover:bg-emerald-50 flex items-center gap-1 border-t"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Unit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Suppliers Section */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Suppliers
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSupplierModal(true)}
                className="text-emerald-600 hover:text-emerald-700 gap-1"
              >
                <Plus className="w-3 h-3" />
                New Supplier
              </Button>
            </div>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-2">
              {/* Search */}
              <Input
                placeholder="Search suppliers..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="mb-2"
              />
              {/* Supplier list */}
              {suppliers
                .filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                .map((supplier) => (
                  <label
                    key={supplier._id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.includes(supplier._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSuppliers([...selectedSuppliers, supplier._id]);
                        } else {
                          setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplier._id));
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{supplier.name}</p>
                      {supplier.email && <p className="text-xs text-gray-500">{supplier.email}</p>}
                    </div>
                  </label>
                ))}
              {suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No suppliers found</p>
              )}
            </div>
            {selectedSuppliers.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedSuppliers.length} supplier(s) selected
              </p>
            )}
          </div>

          {/* Base Unit with Price Section */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-700">Base Unit</h4>
            </div>
            <div className="flex gap-4 items-end p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Unit</label>
                <div className="px-2 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg h-8 flex items-center">
                  {units.find(u => u._id === formData.baseUnit)?.name || 'Not set'} 
                  <span className="text-gray-400 ml-1">
                    ({units.find(u => u._id === formData.baseUnit)?.abbreviation || 'N/A'})
                  </span>
                </div>
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-500">Price</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.retailPrice}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value) || value < 0) {
                      setFormData({ ...formData, retailPrice: 0 });
                    } else {
                      setFormData({ ...formData, retailPrice: value });
                    }
                  }}
                  placeholder="0.00"
                  className="h-8 border-emerald-300 focus:ring-emerald-500"
                />
              </div>
              <div className="text-xs text-gray-500 w-24">
                Price for 1 {units.find(u => u._id === formData.baseUnit)?.abbreviation || 'unit'}
              </div>
            </div>
          </div>

          {/* Additional Units Section */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-700">Additional Units</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProductUnit}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Unit
              </Button>
            </div>
            
            {productUnits.length > 0 && (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {productUnits.map((unit, index) => (
                  <div key={index} className="flex gap-2 items-end p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Unit Name</label>
                      <select
                        value={unit.name}
                        onChange={(e) => {
                          const selectedUnit = units.find(u => u.name === e.target.value);
                          updateProductUnit(index, 'name', e.target.value);
                          if (selectedUnit) {
                            updateProductUnit(index, 'abbreviation', selectedUnit.abbreviation);
                          }
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 h-8"
                      >
                        <option value="">Select Unit</option>
                        {units.filter(u => !productUnits.some((pu, pi) => pi !== index && pu.name === u.name)).map((u) => (
                          <option key={u._id} value={u.name}>
                            {u.name} ({u.abbreviation})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="text-xs text-gray-500">Abbrev.</label>
                      <Input
                        value={unit.abbreviation}
                        onChange={(e) => updateProductUnit(index, 'abbreviation', e.target.value)}
                        placeholder="pk"
                        className="h-8"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-500">Conversion</label>
                      <Input
                        type="number"
                        value={unit.conversionToBase}
                        onChange={(e) => updateProductUnit(index, 'conversionToBase', parseFloat(e.target.value) || 1)}
                        placeholder="1"
                        className="h-8"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-500">Price</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={unit.price}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (isNaN(value) || value < 0) {
                            updateProductUnit(index, 'price', 0);
                          } else {
                            updateProductUnit(index, 'price', value);
                          }
                        }}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductUnit(index)}
                      className="text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {productUnits.length === 0 && (
              <p className="text-sm text-gray-500 italic">No additional units configured. Click "Add Unit" to sell this product in different units (e.g., pack, box).</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowProductModal(false);
                setEditingProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unit of Measure Modal */}
      <Modal
        isOpen={showUnitModal}
        onClose={() => {
          setShowUnitModal(false);
          setNewUnit({ name: '', abbreviation: '' });
        }}
        title="Add Unit of Measure"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Unit Name"
            value={newUnit.name}
            onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
            placeholder="e.g., Bottle, Sack, Bundle"
            required
          />
          <Input
            label="Abbreviation"
            value={newUnit.abbreviation}
            onChange={(e) => setNewUnit({ ...newUnit, abbreviation: e.target.value })}
            placeholder="e.g., bt, sk, bd"
            required
          />
          
          {/* Existing Units List */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Available Units:</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {units.map((unit) => (
                <span
                  key={unit._id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  {unit.name} ({unit.abbreviation})
                  {!DEFAULT_UNITS.find(d => d._id === unit._id) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUnit(unit._id)}
                      className="ml-1 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowUnitModal(false);
                setNewUnit({ name: '', abbreviation: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddUnit}>
              Add Unit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Supplier Management Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setSupplierFormData({ name: '', email: '', phone: '', address: '' });
        }}
        title="Add New Supplier"
        size="sm"
      >
        <form onSubmit={handleSupplierSubmit} className="space-y-4">
          <Input
            label="Supplier Name"
            value={supplierFormData.name}
            onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
            placeholder="e.g., Kenya Electronics Ltd"
            required
          />
          <Input
            label="Email"
            type="email"
            value={supplierFormData.email}
            onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
            placeholder="e.g., info@supplier.com"
          />
          <Input
            label="Phone"
            value={supplierFormData.phone}
            onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
            placeholder="e.g., 0722123456"
          />
          <Input
            label="Address"
            value={supplierFormData.address}
            onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
            placeholder="e.g., Nairobi, Kenya"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSupplierModal(false);
                setSupplierFormData({ name: '', email: '', phone: '', address: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              Add Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Stock Adjustment Modal */}
      <Modal
        isOpen={showBulkAdjustModal}
        onClose={() => {
          setShowBulkAdjustModal(false);
          setBulkAdjustQuantity(0);
          setBulkAdjustReason('');
        }}
        title={`Bulk Adjust Stock (${selectedProducts.length} products)`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="location"
                  value="shop"
                  checked={bulkAdjustLocation === 'shop'}
                  onChange={() => setBulkAdjustLocation('shop')}
                  className="w-4 h-4 text-emerald-600"
                />
                <span>Shop</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="location"
                  value="remote"
                  checked={bulkAdjustLocation === 'remote'}
                  onChange={() => setBulkAdjustLocation('remote')}
                  className="w-4 h-4 text-emerald-600"
                />
                <span>Remote</span>
              </label>
            </div>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adjustType"
                  value="add"
                  checked={bulkAdjustType === 'add'}
                  onChange={() => setBulkAdjustType('add')}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-green-600">Add Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adjustType"
                  value="remove"
                  checked={bulkAdjustType === 'remove'}
                  onChange={() => setBulkAdjustType('remove')}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-red-600">Remove Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adjustType"
                  value="set"
                  checked={bulkAdjustType === 'set'}
                  onChange={() => setBulkAdjustType('set')}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-blue-600">Set Quantity</span>
              </label>
            </div>
          </div>

          {/* Quantity */}
          <Input
            label={bulkAdjustType === 'set' ? 'New Quantity' : bulkAdjustType === 'add' ? 'Quantity to Add' : 'Quantity to Remove'}
            type="number"
            min="0"
            value={bulkAdjustQuantity}
            onChange={(e) => setBulkAdjustQuantity(parseInt(e.target.value) || 0)}
            required
          />

          {/* Reason */}
          <Input
            label="Reason for Adjustment"
            value={bulkAdjustReason}
            onChange={(e) => setBulkAdjustReason(e.target.value)}
            placeholder="e.g., Stock count, Damaged goods, New delivery"
            required
          />

          {/* Preview */}
          {bulkAdjustQuantity > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-700 mb-2">Preview:</p>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2">Product</th>
                      <th className="pb-2">Current</th>
                      <th className="pb-2">Change</th>
                      <th className="pb-2">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAdjustmentPreview().slice(0, 10).map((preview) => (
                      <tr key={preview.productId} className="border-t border-gray-200">
                        <td className="py-1 pr-2 truncate max-w-[150px]">{preview.productName}</td>
                        <td className="py-1 pr-2">{preview.currentStock}</td>
                        <td className={`py-1 pr-2 ${preview.newStock > preview.currentStock ? 'text-green-600' : preview.newStock < preview.currentStock ? 'text-red-600' : ''}`}>
                          {preview.newStock > preview.currentStock ? '+' : ''}{preview.newStock - preview.currentStock}
                        </td>
                        <td className="py-1">{preview.newStock}</td>
                      </tr>
                    ))}
                    {getAdjustmentPreview().length > 10 && (
                      <tr className="border-t border-gray-200">
                        <td colSpan={4} className="py-1 text-gray-500 text-center">
                          ... and {getAdjustmentPreview().length - 10} more products
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowBulkAdjustModal(false);
                setBulkAdjustQuantity(0);
                setBulkAdjustReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (bulkAdjustQuantity <= 0) {
                  alert('Please enter a valid quantity');
                  return;
                }
                if (!bulkAdjustReason.trim()) {
                  alert('Please provide a reason for the adjustment');
                  return;
                }
                setShowConfirmDialog(true);
              }}
              disabled={selectedProducts.length === 0 || bulkAdjustQuantity <= 0}
            >
              Continue
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="Confirm Stock Adjustment"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 font-medium">Warning</p>
            <p className="text-amber-700 text-sm mt-1">
              You are about to adjust stock for {selectedProducts.length} products. This action cannot be undone.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Adjustment Summary:</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Location: <strong>{bulkAdjustLocation === 'shop' ? 'Shop' : 'Remote'}</strong></li>
              <li>Type: <strong>{bulkAdjustType === 'add' ? 'Add' : bulkAdjustType === 'remove' ? 'Remove' : 'Set'}</strong></li>
              <li>Quantity: <strong>{bulkAdjustQuantity}</strong></li>
              <li>Reason: <strong>{bulkAdjustReason}</strong></li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkAdjust}
              disabled={bulkAdjustLoading}
            >
              {bulkAdjustLoading ? 'Processing...' : 'Confirm Adjustment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
          setCategoryFormData({ name: '', code: '', description: '', parentCategory: '' });
        }}
        title="Manage Categories"
        size="lg"
      >
        <div className="space-y-4">
          {/* Add/Edit Category Form */}
          <form onSubmit={handleCategorySubmit} className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-gray-700">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Category Name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="e.g., Groceries"
                required
              />
              <Input
                label="Code"
                value={categoryFormData.code}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
                placeholder="e.g., GRO"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Description"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Optional description"
              />
              <Select
                label="Parent Category"
                value={categoryFormData.parentCategory}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, parentCategory: e.target.value })}
                options={[
                  { value: '', label: 'None (Top Level)' },
                  ...categories.filter(c => !editingCategory || c._id !== editingCategory._id).map(c => ({ value: c._id, label: c.name })),
                ]}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingCategory ? 'Update' : 'Add'} Category
              </Button>
              {editingCategory && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryFormData({ name: '', code: '', description: '', parentCategory: '' });
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>

          {/* Category List */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Existing Categories</h4>
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {categories.length === 0 ? (
                <p className="p-4 text-gray-500 text-center">No categories yet</p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category._id}
                    className="flex items-center justify-between p-3 border-b hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      {category.parentCategory && (
                        <span className="text-xs text-gray-500">
                          → {typeof category.parentCategory === 'object' ? category.parentCategory.name : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category._id)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
