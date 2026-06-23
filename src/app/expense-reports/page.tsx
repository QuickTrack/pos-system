'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Download,
  PieChart,
  BarChart3,
  Filter,
  ArrowUpDown,
  DollarSign,
  FileText,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ExpenseReportsPage() {
  const [reportType, setReportType] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/expense-dashboard?period=${period}`);
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.error || 'Failed to fetch expense dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  const fetchExpenseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('limit', '1000');
      const response = await fetch(`/api/expenses?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setExpenseData(result.expenses);
      } else {
        setError(result.error || 'Failed to fetch expense data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, period, fetchExpenseData]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!dashboardData || !expenseData) return;
    try {
      const fileName = `expense_report_${period}_${new Date().toISOString().split('T')[0]}`;

      if (format === 'excel' || format === 'csv') {
        const worksheetData = [
          ['Expense Report'],
          [`Period: ${period}`],
          [`Generated: ${new Date().toLocaleDateString()}`],
          [''],
          ['Summary'],
          ['Total Expenses', dashboardData.summary?.totalExpenses || 0],
          ['Today\'s Expenses', dashboardData.summary?.todayTotal || 0],
          ['Week\'s Expenses', dashboardData.summary?.weekTotal || 0],
          ['Pending Approvals', dashboardData.summary?.pendingCount || 0],
          ['Approved', dashboardData.summary?.approvedCount || 0],
          ['Rejected', dashboardData.summary?.rejectedCount || 0],
          [''],
          ['Expenses by Category'],
          ['Category', 'Total', 'Count'],
          ...(dashboardData.categoriesBreakdown?.map((c: any) => [c.name, c.total, c.count]) || []),
          [''],
          ['Expenses by Payment Method'],
          ['Payment Method', 'Total', 'Count'],
          ...(dashboardData.paymentMethodsBreakdown?.map((p: any) => [
            p.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            p.total,
            p.count,
          ]) || []),
          [''],
          ['Expenses by Branch'],
          ['Branch', 'Total', 'Count'],
          ...(dashboardData.branchesBreakdown?.map((b: any) => [b.name, b.total, b.count]) || []),
          [''],
          ['Detail Transactions'],
          ['Transaction No', 'Date', 'Branch', 'Category', 'Description', 'Amount', 'Payment Source', 'Payee', 'Status'],
          ...(expenseData || []).map((e: any) => [
            e.transactionNumber,
            e.dateTime ? new Date(e.dateTime).toLocaleDateString() : '-',
            e.branch?.name || '-',
            e.expenseCategory?.name || '-',
            e.description,
            e.amount,
            e.paymentSource.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            e.payeeName,
            e.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          ]),
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        ws['!cols'] = worksheetData[0].map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
        XLSX.writeFile(wb, `${fileName}.${format === 'csv' ? 'csv' : 'xlsx'}`);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export report');
    }
  };

  const reportTypes = [
    { value: 'overview', label: 'Overview', icon: BarChart3 },
    { value: 'categories', label: 'By Category', icon: PieChart },
    { value: 'payments', label: 'By Payment Method', icon: DollarSign },
    { value: 'branches', label: 'By Branch', icon: Filter },
  ];

  if (loading && !dashboardData) {
    return (
      <div>
        <Header title="Expense Reports" subtitle="Detailed expense analysis and reporting" />
        <div className="p-6">
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div>
        <Header title="Expense Reports" subtitle="Detailed expense analysis and reporting" />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading expense reports</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-2 text-sm underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Expense Reports" subtitle="Detailed expense analysis and reporting" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {reportTypes.map((type) => (
              <Button
                key={type.value}
                variant={reportType === type.value ? 'primary' : 'outline'}
                onClick={() => setReportType(type.value)}
                className="gap-2"
              >
                <type.icon className="w-4 h-4" />
                {type.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'quarter', label: 'This Quarter' },
                { value: 'year', label: 'This Year' },
              ]}
            />
            <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2" disabled={loading}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.summary?.totalExpenses || 0)}</p>
              </div>
              <FileText className="w-8 h-8 text-red-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approvals</p>
                <p className="text-2xl font-bold">{dashboardData.summary?.pendingCount || 0}</p>
              </div>
              <Filter className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved Payouts</p>
                <p className="text-2xl font-bold">{dashboardData.summary?.approvedCount || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold">{dashboardData.summary?.rejectedCount || 0}</p>
              </div>
              <Filter className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {reportType === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="Expenses by Category" subtitle="Spending breakdown" />
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={dashboardData.categoriesBreakdown || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="total"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(dashboardData.categoriesBreakdown || []).map((entry: any, index: number) => (
                          <Cell key={`cat-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <CardHeader title="Expenses by Payment Method" subtitle="Payment source breakdown" />
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={dashboardData.paymentMethodsBreakdown || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="total"
                        nameKey="name"
                        label={({ name, percent }) => `${name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(dashboardData.paymentMethodsBreakdown || []).map((entry: any, index: number) => (
                          <Cell key={`pay-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card>
              <CardHeader title="Monthly Expense Trends" subtitle="Last 12 months expense overview" />
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.monthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-KE', {
                          month: 'short',
                          year: 'numeric',
                        });
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}

        {reportType === 'categories' && (
          <Card>
            <CardHeader title="Expenses by Category" subtitle="Detailed category breakdown" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.categoriesBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Total Amount</th>
                    <th>Transactions</th>
                    <th>Avg per Transaction</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboardData.categoriesBreakdown || []).map((cat: any, index: number) => (
                    <tr key={index}>
                      <td className="font-medium">{cat.name}</td>
                      <td>{formatCurrency(cat.total || 0)}</td>
                      <td>{cat.count || 0}</td>
                      <td>{formatCurrency(cat.count > 0 ? cat.total / cat.count : 0)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${((cat.total || 0) / (dashboardData.summary?.totalExpenses || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm">
                            {((cat.total || 0) / (dashboardData.summary?.totalExpenses || 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {reportType === 'payments' && (
          <Card>
            <CardHeader title="Expenses by Payment Method" subtitle="Payment source distribution" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={dashboardData.paymentMethodsBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="total"
                    nameKey="name"
                    label={({ name, percent }) => `${name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(dashboardData.paymentMethodsBreakdown || []).map((entry: any, index: number) => (
                      <Cell key={`pay-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th>Total Amount</th>
                    <th>Transactions</th>
                    <th>Avg per Transaction</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboardData.paymentMethodsBreakdown || []).map((payment: any, index: number) => (
                    <tr key={index}>
                      <td className="font-medium">
                        {payment.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </td>
                      <td>{formatCurrency(payment.total || 0)}</td>
                      <td>{payment.count || 0}</td>
                      <td>{formatCurrency(payment.count > 0 ? payment.total / payment.count : 0)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${((payment.total || 0) / (dashboardData.summary?.totalExpenses || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm">
                            {((payment.total || 0) / (dashboardData.summary?.totalExpenses || 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {reportType === 'branches' && (
          <Card>
            <CardHeader title="Expenses by Branch" subtitle="Branch-wise expense distribution" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.branchesBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Total Amount</th>
                    <th>Transactions</th>
                    <th>Avg per Transaction</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboardData.branchesBreakdown || []).map((branch: any, index: number) => (
                    <tr key={index}>
                      <td className="font-medium">{branch.name || 'Unknown'}</td>
                      <td>{formatCurrency(branch.total || 0)}</td>
                      <td>{branch.count || 0}</td>
                      <td>{formatCurrency(branch.count > 0 ? branch.total / branch.count : 0)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${((branch.total || 0) / (dashboardData.summary?.totalExpenses || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm">
                            {((branch.total || 0) / (dashboardData.summary?.totalExpenses || 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {reportType === 'overview' && dashboardData.monthlyTrends && (
          <Card>
            <CardHeader
              title="Monthly Trend"
              subtitle="Expenses over the last 12 months"
            />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-KE', {
                        month: 'short',
                        year: 'numeric',
                      });
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
