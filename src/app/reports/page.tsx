'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any>({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalTax: 0,
    salesByDay: [],
    topProducts: [],
    salesByPayment: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [reportType, period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports?type=${reportType}&period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        setSalesData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    // Export logic would go here
    console.log(`Exporting as ${format}`);
  };

  const reportTypes = [
    { value: 'sales', label: 'Sales Report', icon: ShoppingCart },
    { value: 'products', label: 'Product Performance', icon: Package },
    { value: 'customers', label: 'Customer Report', icon: Users },
    { value: 'inventory', label: 'Inventory Report', icon: TrendingUp },
    { value: 'profit', label: 'Profit & Loss', icon: DollarSign },
  ];

  return (
    <div>
      <Header title="Reports" subtitle="Business Analytics & Reporting" />
      
      <div className="p-6 space-y-6">
        {/* Report Type Selector */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
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
            <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2">
              <Download className="w-4 h-4" />
              PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2">
              <Download className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold">{salesData.totalSales}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData.totalProfit)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tax Collected</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData.totalTax)}</p>
              </div>
              <FileText className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by Day */}
          <Card>
            <CardHeader title="Sales Trend" subtitle="Daily sales overview" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData.salesByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Sales by Payment Method */}
          <Card>
            <CardHeader title="Payment Methods" subtitle="Breakdown by payment type" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesData.salesByPayment || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(salesData.salesByPayment || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader title="Top Selling Products" subtitle="Best performers by quantity sold" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {(salesData.topProducts || []).slice(0, 10).map((product: any, index: number) => (
                  <tr key={product._id}>
                    <td>{index + 1}</td>
                    <td className="font-medium">{product.name}</td>
                    <td>{product.quantity}</td>
                    <td>{formatCurrency(product.revenue)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(product.revenue / salesData.totalRevenue) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm">
                          {((product.revenue / salesData.totalRevenue) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
