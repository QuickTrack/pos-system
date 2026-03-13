'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, Download, Upload } from 'lucide-react';

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
  lowStockThreshold: number;
  isActive: boolean;
}

interface Category {
  _id: string;
  name: string;
}

interface UnitOfMeasure {
  _id: string;
  name: string;
  abbreviation: string;
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
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
  });

  useEffect(() => {
    fetchData();
  }, [searchQuery, showLowStock]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (showLowStock) params.set('lowStock', 'true');

      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/products?${params}`),
        fetch('/api/categories'),
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();

      if (productsData.success) setProducts(productsData.products);
      if (categoriesData.success) setCategories(categoriesData.categories);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowProductModal(false);
        setEditingProduct(null);
        resetForm();
        fetchData();
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
    });
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
    });
  };

  const columns = [
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
      render: (item: Product) => (
        <span className={item.stockQuantity <= item.lowStockThreshold ? 'text-red-500 font-medium' : ''}>
          {item.stockQuantity}
          {item.stockQuantity <= item.lowStockThreshold && (
            <AlertTriangle className="w-4 h-4 inline ml-1 text-amber-500" />
          )}
        </span>
      ),
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
            <Button
              variant={showLowStock ? 'primary' : 'outline'}
              onClick={() => setShowLowStock(!showLowStock)}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Low Stock
            </Button>
          </div>
          <div className="flex gap-2">
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
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  label="Unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  options={[
                    { value: '', label: 'Select Unit' },
                    ...units.map((u) => ({ value: u._id, label: `${u.name} (${u.abbreviation})` })),
                  ]}
                />
              </div>
              <div className="pt-7">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnitModal(true)}
                  title="Add New Unit"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
    </div>
  );
}
