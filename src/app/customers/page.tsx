'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, User, Phone, Mail, Gift } from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  customerType: 'retail' | 'wholesale' | 'distributor';
  loyaltyPoints: number;
  creditBalance: number;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
  isActive: boolean;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customerCategory: 'individual',
    customerType: 'retail',
    businessName: '',
    kraPin: '',
    creditLimit: 0,
    creditBalance: 0,
  });

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();

      if (data.success) setCustomers(data.customers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer._id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCustomerModal(false);
        setEditingCustomer(null);
        resetForm();
        fetchCustomers();
      }
    } catch (error) {
      console.error('Failed to save customer:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      customerCategory: (customer as any).customerCategory || 'individual',
      customerType: customer.customerType,
      businessName: '',
      kraPin: '',
      creditLimit: 0,
      creditBalance: 0,
    });
    setShowCustomerModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      customerCategory: 'individual',
      customerType: 'retail',
      businessName: '',
      kraPin: '',
      creditLimit: 0,
      creditBalance: 0,
    });
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (item: Customer) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-gray-500">{item.customerType}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (item: Customer) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          {item.phone}
        </div>
      ),
    },
    {
      key: 'loyaltyPoints',
      header: 'Loyalty Points',
      render: (item: Customer) => (
        <span className="badge badge-info flex items-center gap-1 w-fit">
          <Gift className="w-3 h-3" />
          {item.loyaltyPoints}
        </span>
      ),
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      render: (item: Customer) => formatCurrency(item.totalSpent),
    },
    {
      key: 'creditBalance',
      header: 'Credit',
      render: (item: Customer) => (
        <span className={item.creditBalance > 0 ? 'text-amber-600' : ''}>
          {formatCurrency(item.creditBalance)}
        </span>
      ),
    },
    {
      key: 'lastPurchaseDate',
      header: 'Last Purchase',
      render: (item: Customer) => item.lastPurchaseDate ? formatDate(item.lastPurchaseDate) : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Customer) => (
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
      <Header title="Customers" subtitle="Manage Customer Relationships" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setEditingCustomer(null);
              setShowCustomerModal(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Customers</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Retail</p>
            <p className="text-2xl font-bold">{customers.filter(c => c.customerType === 'retail').length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Wholesale</p>
            <p className="text-2xl font-bold">{customers.filter(c => c.customerType === 'wholesale').length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">With Credit</p>
            <p className="text-2xl font-bold">{customers.filter(c => c.creditBalance > 0).length}</p>
          </Card>
        </div>

        {/* Customers Table */}
        <Card>
          <CardHeader 
            title="All Customers" 
            subtitle={`${customers.length} customers`}
          />
          <DataTable
            columns={columns}
            data={customers}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No customers found"
          />
        </Card>
      </div>

      {/* Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setEditingCustomer(null);
          resetForm();
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Customer Category
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerCategory"
                    value="individual"
                    checked={formData.customerCategory === 'individual'}
                    onChange={(e) => setFormData({ ...formData, customerCategory: 'individual' })}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-sm">Individual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerCategory"
                    value="company"
                    checked={formData.customerCategory === 'company'}
                    onChange={(e) => setFormData({ ...formData, customerCategory: 'company' })}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-sm">Company</span>
                </label>
              </div>
            </div>
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Input
              label="Initial Account Balance"
              type="number"
              value={formData.creditBalance}
              onChange={(e) => setFormData({ ...formData, creditBalance: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Customer Type"
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
              options={[
                { value: 'retail', label: 'Retail' },
                { value: 'wholesale', label: 'Wholesale' },
                { value: 'distributor', label: 'Distributor' },
              ]}
            />
            <Input
              label="Credit Limit"
              type="number"
              value={formData.creditLimit}
              onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          {(formData.customerCategory === 'company' || formData.customerType === 'wholesale' || formData.customerType === 'distributor') && (
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
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowCustomerModal(false);
                setEditingCustomer(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
