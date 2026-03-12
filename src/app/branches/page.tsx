'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { Plus, Edit, Trash2, Store, MapPin, Phone, Mail, Search, RefreshCw } from 'lucide-react';

interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  isActive: boolean;
  isMain: boolean;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    isMain: false,
  });

  useEffect(() => {
    fetchBranches();
  }, [searchQuery]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      const data = await response.json();

      if (data.success) setBranches(data.branches);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBranch ? `/api/branches/${editingBranch._id}` : '/api/branches';
      const method = editingBranch ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isActive: true }),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingBranch(null);
        resetForm();
        fetchBranches();
      }
    } catch (error) {
      console.error('Failed to save branch:', error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email || '',
      isMain: branch.isMain,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    try {
      await fetch(`/api/branches/${id}`, { method: 'DELETE' });
      fetchBranches();
    } catch (error) {
      console.error('Failed to delete branch:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      isMain: false,
    });
  };

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Branch',
      render: (item: Branch) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">Code: {item.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (item: Branch) => (
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-3 h-3 text-gray-400" />
            {item.phone}
          </div>
          {item.email && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Mail className="w-3 h-3" />
              {item.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (item: Branch) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          {item.address}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Branch) => (
        <div className="flex gap-2">
          {item.isMain && (
            <span className="badge badge-info">Main Branch</span>
          )}
          <span className={`badge ${item.isActive ? 'badge-success' : 'badge-neutral'}`}>
            {item.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Branch) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          {!item.isMain && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)} className="text-red-500">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const activeBranches = branches.filter(b => b.isActive).length;

  return (
    <div>
      <Header title="Branches" subtitle="Manage Business Locations" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search branches..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchBranches} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button 
              onClick={() => {
                resetForm();
                setEditingBranch(null);
                setShowModal(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Branches</p>
            <p className="text-2xl font-bold">{branches.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Active Branches</p>
            <p className="text-2xl font-bold text-emerald-600">{activeBranches}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Main Branch</p>
            <p className="text-2xl font-bold">{branches.find(b => b.isMain)?.name || '-'}</p>
          </Card>
        </div>

        {/* Branches Table */}
        <Card>
          <CardHeader 
            title="All Branches" 
            subtitle={`${filteredBranches.length} locations`}
          />
          <DataTable
            columns={columns}
            data={filteredBranches}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No branches found"
          />
        </Card>
      </div>

      {/* Branch Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingBranch(null);
          resetForm();
        }}
        title={editingBranch ? 'Edit Branch' : 'Add Branch'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Branch Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Nairobi CBD"
            required
          />
          
          <Input
            label="Branch Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., NBO-001"
            required
            disabled={!!editingBranch}
          />
          
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Physical address"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="2547..."
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="branch@company.com"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isMain"
              checked={formData.isMain}
              onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="isMain" className="text-sm text-gray-700">
              Set as main branch
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowModal(false);
                setEditingBranch(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingBranch ? 'Update Branch' : 'Add Branch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
