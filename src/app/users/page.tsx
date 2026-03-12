'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { formatDateTime } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, RefreshCw, Lock, Unlock, Eye, Shield, UserCheck, UserX } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch?: { _id: string; name: string };
  profilePhoto?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  permissions?: Record<string, boolean>;
}

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'stock_manager', label: 'Stock Manager' },
];

const PERMISSIONS = [
  { key: 'sales', label: 'Sales / POS' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'reports', label: 'Reports' },
  { key: 'customers', label: 'Customers' },
  { key: 'discounts', label: 'Discounts' },
  { key: 'settings', label: 'Settings' },
  { key: 'users', label: 'User Management' },
  { key: 'branches', label: 'Branches' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cashier',
    branchId: '',
    password: '',
    pin: '',
    isActive: true,
    permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {}),
  });

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('isActive', statusFilter);

      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();

      if (data.success) setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        branch: formData.branchId || undefined,
        isActive: formData.isActive,
        permissions: formData.permissions,
      };

      if (!editingUser) {
        payload.password = formData.password || 'changeme123';
      }
      if (formData.pin) {
        payload.pin = formData.pin;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingUser(null);
        resetForm();
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branchId: user.branch?._id || '',
      password: '',
      pin: '',
      isActive: user.isActive,
      permissions: user.permissions || PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {}),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'cashier',
      branchId: '',
      password: '',
      pin: '',
      isActive: true,
      permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {}),
    });
  };

  const handleRoleChange = (role: string) => {
    setFormData({ ...formData, role });
  };

  const handlePermissionChange = (key: string, value: boolean) => {
    setFormData({
      ...formData,
      permissions: { ...formData.permissions, [key]: value },
    });
  };

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (item: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            {item.profilePhoto ? (
              <img src={item.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-emerald-600 font-medium">{item.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-gray-500">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (item: User) => item.phone,
    },
    {
      key: 'role',
      header: 'Role',
      render: (item: User) => (
        <span className="badge badge-info capitalize">{item.role.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (item: User) => item.branch?.name || '-',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: User) => (
        <span className={`badge ${item.isActive ? 'badge-success' : 'badge-error'}`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (item: User) => (
        <span className="text-sm text-gray-500">
          {item.lastLogin ? formatDateTime(item.lastLogin) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: User) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedUserPermissions(item); setShowPermissionsModal(true); }}>
            <Shield className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(item)}>
            {item.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)} className="text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeUsers = users.filter(u => u.isActive).length;

  return (
    <div>
      <Header title="User Management" subtitle="Manage Staff Accounts & Permissions" />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <Button variant="outline" onClick={fetchUsers} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => { resetForm(); setEditingUser(null); setShowModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-2xl font-bold text-emerald-600">{activeUsers}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Admins</p>
            <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Cashiers</p>
            <p className="text-2xl font-bold">{users.filter(u => u.role === 'cashier').length}</p>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader title="All Users" subtitle={`${users.length} staff members`} />
          <DataTable
            columns={columns}
            data={users}
            keyExtractor={(item) => item._id}
            loading={loading}
            emptyMessage="No users found"
          />
        </Card>
      </div>

      {/* User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingUser(null); resetForm(); }}
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
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
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              options={ROLE_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={editingUser ? 'New Password (optional)' : 'Password'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingUser ? 'Leave blank to keep current' : 'Default: changeme123'}
            />
            <Input
              label="PIN (optional)"
              type="password"
              maxLength={4}
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              placeholder="4-digit PIN"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Account Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingUser(null); }}>
              Cancel
            </Button>
            <Button type="submit">
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => { setShowPermissionsModal(false); setSelectedUserPermissions(null); }}
        title={`Permissions - ${selectedUserPermissions?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {PERMISSIONS.map((perm) => (
              <label key={perm.key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUserPermissions?.permissions?.[perm.key] || false}
                  onChange={(e) => {
                    if (selectedUserPermissions) {
                      const updated = { ...selectedUserPermissions, permissions: { ...selectedUserPermissions.permissions, [perm.key]: e.target.checked } };
                      setSelectedUserPermissions(updated);
                    }
                  }}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-sm">{perm.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setShowPermissionsModal(false); setSelectedUserPermissions(null); }}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!selectedUserPermissions) return;
              await fetch(`/api/users/${selectedUserPermissions._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions: selectedUserPermissions.permissions }),
              });
              setShowPermissionsModal(false);
              fetchUsers();
            }}>
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
