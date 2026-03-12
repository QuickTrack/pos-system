'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    avgOrderValue: number;
  };
  revenueData: { _id: number; revenue: number; profit: number }[];
  topProducts: { _id: string; productName: string; totalQuantity: number; totalRevenue: number }[];
  topCustomers: { _id: string; customerName: string; totalSpent: number; orderCount: number }[];
  categoryBreakdown: { _id: string; category: { name: string }; totalRevenue: number; totalQuantity: number }[];
  paymentBreakdown: { _id: string; count: number; total: number }[];
  dailySales: { _id: string; sales: number; revenue: number; profit: number }[];
  purchases: { totalPurchases: number; totalSpent: number };
  totals: { products: number; customers: number };
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?period=${period}`);
      const result = await response.json();
      
      if (result.success) setData(result);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Analytics" subtitle="Business Insights" />
        <div className="p-6">
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  const paymentData = data?.paymentBreakdown.map((p) => ({
    name: p._id,
    value: p.total,
    count: p.count,
  })) || [];

  const categoryData = data?.categoryBreakdown.map((c) => ({
    name: c.category?.name || 'Uncategorized',
    value: c.totalRevenue,
  })) || [];

  const StatCard = ({ 
    title, 
    value, 
    subtitle,
    icon: Icon,
    trend,
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: any;
    trend?: number;
  }) => (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-emerald-600" />
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      <Header title="Analytics" subtitle="Business Insights & Reports" />
      
      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
          <div className="flex gap-2">
            {['today', 'week', 'month', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Sales" 
            value={data?.summary.totalSales || 0}
            subtitle="Transactions"
            icon={ShoppingCart}
          />
          <StatCard 
            title="Total Revenue" 
            value={formatCurrency(data?.summary.totalRevenue || 0)}
            icon={DollarSign}
          />
          <StatCard 
            title="Total Profit" 
            value={formatCurrency(data?.summary.totalProfit || 0)}
            icon={TrendingUp}
          />
          <StatCard 
            title="Avg. Order Value" 
            value={formatCurrency(data?.summary.avgOrderValue || 0)}
            icon={Package}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Sales Trend */}
          <Card>
            <CardHeader title="Sales Trend" subtitle="Last 30 days" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.dailySales || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="_id" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Revenue"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Profit"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader title="Payment Methods" subtitle="By revenue" />
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {paymentData.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-sm capitalize">{p.name} ({p.count})</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader title="Top Selling Products" subtitle="By quantity sold" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topProducts.slice(0, 5) || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="productName" 
                    width={100}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(value: number) => `${value} units`} />
                  <Bar dataKey="totalQuantity" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader title="Sales by Category" subtitle="Revenue distribution" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Top Customers */}
        <Card>
          <CardHeader title="Top Customers" subtitle="By total spent" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {data?.topCustomers.slice(0, 10).map((customer) => (
                  <tr key={customer._id?.toString()}>
                    <td className="font-medium">{customer.customerName || 'Unknown'}</td>
                    <td>{customer.orderCount}</td>
                    <td className="font-medium">{formatCurrency(customer.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold">{data?.totals.products || 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Customers</p>
            <p className="text-2xl font-bold">{data?.totals.customers || 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Purchases</p>
            <p className="text-2xl font-bold">{data?.purchases.totalPurchases || 0}</p>
            <p className="text-sm text-gray-500 mt-1">{formatCurrency(data?.purchases.totalSpent || 0)} spent</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
