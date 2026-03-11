'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, Truck, Phone, Mail } from 'lucide-react';

interface Supplier {
  _id: string;
  name: string;
  code: string;
  phone: string;
  email?: string;
  address?: string;
  businessName?: string;
  kraPin?: string;
  balance: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    businessName: '',
    kraPin: '',
    contactPerson: '',
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery]);

  const fetchSuppliers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/suppliers?${params}`);
      const data = await response.json();

      if (data.success) setSuppliers(data.suppliers);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier._id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowSupplierModal(false);
        setEditingSupplier(null);
        resetForm();
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Failed to save supplier:', error);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      code: supplier.code,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      businessName: supplier.businessName || '',
      kraPin: supplier.kraPin || '',
      contactPerson: '',
      notes: '',
    });
    setShowSupplierModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      phone: '',
      email: '',
      address: '',
      businessName: '',
      kraPin: '',
      contactPerson: '',
      notes: '',
    });
  };

  const columns = [
    {
      key: 'name',
      header: 'Supplier',
      render: (item: Supplier) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-gray-500">Code: {item.code}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (item: Supplier) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          {item.phone}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (item: Supplier) => item.email || '-',
    },
    {
      key: 'totalPurchases',
      header: 'Total Purchases',
      render: (item: Supplier) => formatCurrency(item.totalPurchases),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (item: Supplier) => (
        <span className={item.balance > 0 ? 'text-red-600' : 'text-gray-600'}>
          {formatCurrency(item.balance)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (item: Supplier) => formatDate(item.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Supplier) => (
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
      <Header title="Suppliers" subtitle="Manage Suppliers & Purchase Orders" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setEditingSupplier(null);
              setShowSupplierModal(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Suppliers</p>
            <p className="text-2xl font-bold">{suppliers.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold">{suppliers.filter(s => s.isActive).length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Purchases</p>
            <p className="text-2xl font-bold">{formatCurrency(suppliers.reduce((sum, s) => sum + s.totalPurchases, 0))}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(suppliers.reduce((sum, s) => sum + s.balance, 0))}</p>
          </Card>
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardHeader 
            title="All Suppliers" 
            subtitle={`${suppliers.length} suppliers`}
          />
          <DataTable
            columns={columns}
            data={suppliers}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No suppliers found"
          />
        </Card>
      </div>

      {/* Supplier Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setEditingSupplier(null);
          resetForm();
        }}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Auto-generated if empty"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Business Name"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
            <Input
              label="KRA PIN"
              value={formData.kraPin}
              onChange={(e) => setFormData({ ...formData, kraPin: e.target.value })}
            />
          </div>

          <Input
            label="Contact Person"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowSupplierModal(false);
                setEditingSupplier(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
