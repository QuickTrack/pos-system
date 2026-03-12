'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatDateTime } from '@/lib/utils';
import { Search, RefreshCw, FileText } from 'lucide-react';

interface ActivityLog {
  _id: string;
  user: { name: string; email: string };
  userName: string;
  action: string;
  module: string;
  description: string;
  metadata?: Record<string, any>;
  branch?: { name: string };
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Failed Login',
  password_change: 'Password Change',
  user_create: 'User Created',
  user_update: 'User Updated',
  user_delete: 'User Deleted',
  user_lock: 'User Locked',
  sale_create: 'Sale Created',
  sale_refund: 'Refund Processed',
  sale_delete: 'Sale Deleted',
  product_create: 'Product Created',
  product_update: 'Product Updated',
  product_delete: 'Product Deleted',
  price_change: 'Price Changed',
  stock_update: 'Stock Updated',
  customer_created: 'Customer Created',
  customer_updated: 'Customer Updated',
  customer_deleted: 'Customer Deleted',
  purchase_created: 'Purchase Created',
  settings_change: 'Settings Changed',
  branch_created: 'Branch Created',
  branch_updated: 'Branch Updated',
};

const MODULE_LABELS: Record<string, string> = {
  users: 'Users',
  products: 'Products',
  sales: 'Sales',
  customers: 'Customers',
  suppliers: 'Suppliers',
  purchases: 'Purchases',
  settings: 'Settings',
  branches: 'Branches',
  categories: 'Categories',
  reports: 'Reports',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-700',
  login_failed: 'bg-red-100 text-red-700',
  password_change: 'bg-yellow-100 text-yellow-700',
  user_create: 'bg-blue-100 text-blue-700',
  user_update: 'bg-blue-100 text-blue-700',
  user_delete: 'bg-red-100 text-red-700',
  sale_create: 'bg-green-100 text-green-700',
  sale_refund: 'bg-red-100 text-red-700',
  sale_delete: 'bg-red-100 text-red-700',
  product_create: 'bg-blue-100 text-blue-700',
  product_update: 'bg-blue-100 text-blue-700',
  product_delete: 'bg-red-100 text-red-700',
  price_change: 'bg-yellow-100 text-yellow-700',
  stock_update: 'bg-yellow-100 text-yellow-700',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, moduleFilter, startDate, endDate]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (actionFilter) params.set('action', actionFilter);
      if (moduleFilter) params.set('module', moduleFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/activity-logs?${params}`);
      const data = await response.json();

      if (data.success) setLogs(data.logs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Activity Logs" subtitle="User Activity & Audit Trail" />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="">All Modules</option>
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input
            type="date"
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button variant="outline" onClick={fetchLogs} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Activities</p>
            <p className="text-2xl font-bold">{logs.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-2xl font-bold">
              {logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Logins</p>
            <p className="text-2xl font-bold">
              {logs.filter(l => l.action === 'login').length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Sales Created</p>
            <p className="text-2xl font-bold">
              {logs.filter(l => l.action === 'sale_create').length}
            </p>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader title="Activity Log" subtitle={`${logs.length} entries`} />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Description</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <div className="spinner" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No activity logs found</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <div>
                          <p className="font-medium">{log.userName}</p>
                          <p className="text-xs text-gray-500">{log.user?.email}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {MODULE_LABELS[log.module] || log.module}
                        </span>
                      </td>
                      <td className="text-sm">{log.description}</td>
                      <td className="text-sm text-gray-500">
                        {formatDateTime(log.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { Button } from '@/components/ui/Button';
