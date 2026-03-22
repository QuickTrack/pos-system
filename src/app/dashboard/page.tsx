'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardStats {
  sales: {
    current: number;
    previous: number;
    change: number;
  };
  revenue: {
    current: number;
    previous: number;
    change: number;
  };
  profit: number;
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  pendingPurchases: number;
}

interface DailySale {
  _id: string;
  sales: number;
  revenue: number;
  profit: number;
}

interface RecentSale {
  _id: string;
  invoiceNumber: string;
  total: number;
  paymentMethod: string;
  customer: { name: string } | null;
  cashier: { name: string };
  saleDate: string;
  status: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/dashboard?period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setDailySales(data.dailySales);
        setRecentSales(data.recentSales);
        setLowStockProducts(data.lowStockProducts);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon,
    isCurrency = false 
  }: { 
    title: string; 
    value: number; 
    change: number; 
    icon: any;
    isCurrency?: boolean;
  }) => (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {isCurrency ? formatCurrency(value) : value.toLocaleString()}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              change >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(change).toFixed(1)}%</span>
              <span className="text-gray-400">vs last period</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-emerald-600" />
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Business Overview" />
        <div className="p-6">
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard" subtitle="Business Overview" />
      
      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
          <div className="flex gap-2">
            {['today', 'week', 'month'].map((p) => (
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Today's Sales" 
            value={stats?.sales.current || 0} 
            change={stats?.sales.change || 0}
            icon={ShoppingCart}
          />
          <StatCard 
            title="Revenue" 
            value={stats?.revenue.current || 0} 
            change={stats?.revenue.change || 0}
            icon={DollarSign}
            isCurrency
          />
          <StatCard 
            title="Profit" 
            value={stats?.profit || 0} 
            change={0}
            icon={TrendingUp}
            isCurrency
          />
          <StatCard 
            title="Total Customers" 
            value={stats?.totalCustomers || 0} 
            change={0}
            icon={Users}
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <Card className="lg:col-span-2">
            <CardHeader title="Sales Trend" subtitle="Last 30 days" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="_id" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader 
              title="Low Stock Alert" 
              action={
                <Link href="/inventory?lowStock=true" className="text-sm text-emerald-600 hover:underline">
                  View All
                </Link>
              }
            />
            <div className="space-y-3">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.slice(0, 5).map((product) => (
                  <div 
                    key={product._id} 
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-amber-600">
                      {product.stockQuantity} left
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No low stock items</p>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Sales */}
        <Card>
          <CardHeader 
            title="Recent Sales" 
            action={
              <Link href="/sales" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.slice(0, 10).map((sale) => (
                  <tr 
                    key={sale._id} 
                    className={sale.status === 'refunded' ? 'bg-red-50' : ''}
                  >
                    <td className="font-medium">
                      {sale.invoiceNumber}
                      {sale.status === 'refunded' && (
                        <span className="ml-2 badge badge-error">Refunded</span>
                      )}
                    </td>
                    <td>{sale.customer?.name || 'Walk-in Customer'}</td>
                    <td>{sale.cashier.name}</td>
                    <td>
                      <span className="badge badge-info capitalize">{sale.paymentMethod}</span>
                    </td>
                    <td className={`font-medium ${sale.status === 'refunded' ? 'text-red-600 line-through' : ''}`}>
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="text-gray-500">{formatDateTime(sale.saleDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalSuppliers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingPurchases || 0}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-gray-400" />
          </Card>
        </div>
      </div>
    </div>
  );
}
