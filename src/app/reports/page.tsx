'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { 
  Download, 
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  FileText
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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const getInventoryStatusClass = (status: string) => {
  if (status === 'Out of Stock') return 'bg-red-100 text-red-700';
  if (status === 'Low Stock') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
};

const getCustomerRevenue = (reportData: ReportData) =>
  (reportData.topCustomers || []).reduce((sum: number, customer: any) => sum + (customer.revenue || 0), 0);

const getCustomerPurchases = (reportData: ReportData) =>
  (reportData.topCustomers || []).reduce((sum: number, customer: any) => sum + (customer.purchases || 0), 0);

type ReportData = {
  totalSales?: number;
  totalRevenue?: number;
  totalProfit?: number;
  totalTax?: number;
  totalCost?: number;
  grossProfit?: number;
  netProfit?: number;
  salesByDay?: any[];
  salesByPayment?: any[];
  topProducts?: any[];
  topCustomers?: any[];
  totalCustomers?: number;
  totalProducts?: number;
  lowStockItems?: number;
  outOfStock?: number;
  totalValue?: number;
  inventoryItems?: any[];
  profitByDay?: any[];
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData>({});

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports?type=${reportType}&period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        setReportData(data.data || {});
      } else {
        console.error('API returned error:', data.error);
        setError(data.error || 'Failed to fetch report data');
        setReportData({});
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      setError(error instanceof Error ? error.message : 'Network error');
      setReportData({});
    } finally {
      setLoading(false);
    }
  }, [reportType, period]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await fetch(`/api/reports?type=${reportType}&period=${period}&limit=1000`);
      const result = await response.json();
      
      if (!result.success) {
        alert('Failed to fetch data for export');
        return;
      }
      
      const data = result.data;
      const fileName = `${reportType}_report_${period}_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'excel' || format === 'csv') {
        let worksheetData: any[] = [];
        
        if (reportType === 'sales') {
          worksheetData = [
            ['Sales Report'],
            [`Period: ${period}`],
            [''],
            ['Summary'],
            ['Total Sales', data.totalSales || 0],
            ['Total Revenue', data.totalRevenue || 0],
            ['Total Profit', data.totalProfit || 0],
            ['Total Tax', data.totalTax || 0],
            [''],
            ['Sales by Day'],
            ['Date', 'Sales', 'Revenue', 'Profit'],
            ...(data.salesByDay?.map((row: any) => [row.date || row._id, row.sales, row.revenue, row.profit]) || []),
            [''],
            ['Top Products'],
            ['Product', 'Quantity', 'Revenue', 'Profit'],
            ...(data.topProducts?.map((p: any) => [p.name, p.quantity, p.revenue, p.profit]) || []),
          ];
        } else if (reportType === 'products') {
          worksheetData = [
            ['Product Performance Report'],
            [`Period: ${period}`],
            [''],
            ['Top Products'],
            ['Product', 'SKU', 'Quantity Sold', 'Revenue', 'Profit'],
            ...(data.topProducts?.map((p: any) => [p.name, p.sku, p.quantity, p.revenue, p.profit]) || []),
          ];
        } else if (reportType === 'customers') {
          worksheetData = [
            ['Customer Report'],
            [`Period: ${period}`],
            [''],
            ['Top Customers'],
            ['Customer', 'Total Purchases', 'Revenue'],
            ...(data.topCustomers?.map((c: any) => [c.name, c.purchases, c.revenue]) || []),
          ];
        } else if (reportType === 'inventory') {
          worksheetData = [
            ['Inventory Report'],
            [`Period: ${period}`],
            [''],
            ['Summary'],
            ['Total Products', data.totalProducts || 0],
            ['Low Stock Items', data.lowStockItems || 0],
            ['Out of Stock', data.outOfStock || 0],
            [''],
            ['Inventory Items'],
            ['Product', 'Stock', 'Value', 'Status'],
            ...(data.inventoryItems?.map((item: any) => [item.name, item.stock, item.value, item.status]) || []),
          ];
        } else if (reportType === 'profit') {
          worksheetData = [
            ['Profit & Loss Report'],
            [`Period: ${period}`],
            [''],
            ['Summary'],
            ['Total Revenue', data.totalRevenue || 0],
            ['Total Cost', data.totalCost || 0],
            ['Gross Profit', data.grossProfit || 0],
            ['Net Profit', data.netProfit || 0],
            [''],
            ['Profit by Day'],
            ['Date', 'Revenue', 'Cost', 'Profit'],
            ...(data.profitByDay?.map((row: any) => [row.date || row._id, row.revenue, row.cost, row.profit]) || []),
          ];
        }
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Set column widths
        ws['!cols'] = worksheetData[0].map(() => ({ wch: 20 }));
        
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        
        // Download file
        XLSX.writeFile(wb, `${fileName}.${format === 'csv' ? 'csv' : 'xlsx'}`);
        
      } else if (format === 'pdf') {
        // Create PDF
        const doc = new jsPDF();
        
        // Add title
        const title = reportType.charAt(0).toUpperCase() + reportType.slice(1) + ' Report';
        doc.setFontSize(20);
        doc.text(title, 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Period: ${period}`, 14, 32);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);
        
        let yPos = 50;
        
        if (reportType === 'sales') {
          // Summary table
          doc.setFontSize(14);
          doc.text('Summary', 14, yPos);
          yPos += 10;
          
          (doc as any).autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
              ['Total Sales', data.totalSales?.toString() || '0'],
              ['Total Revenue', formatCurrency(data.totalRevenue || 0)],
              ['Total Profit', formatCurrency(data.totalProfit || 0)],
              ['Total Tax', formatCurrency(data.totalTax || 0)],
            ],
            theme: 'striped',
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 15;
          
          // Sales by day
          if (data.salesByDay?.length > 0) {
            doc.setFontSize(14);
            doc.text('Sales by Day', 14, yPos);
            yPos += 10;
            
            (doc as any).autoTable({
              startY: yPos,
              head: [['Date', 'Sales', 'Revenue', 'Profit']],
              body: data.salesByDay.map((row: any) => [
                row.date,
                row.sales?.toString() || '0',
                formatCurrency(row.revenue || 0),
                formatCurrency(row.profit || 0),
              ]),
              theme: 'striped',
            });
            
            yPos = (doc as any).lastAutoTable.finalY + 15;
          }
          
          // Top products
          if (data.topProducts?.length > 0) {
            doc.setFontSize(14);
            doc.text('Top Products', 14, yPos);
            yPos += 10;
            
            (doc as any).autoTable({
              startY: yPos,
              head: [['Product', 'Qty', 'Revenue', 'Profit']],
              body: data.topProducts.slice(0, 10).map((p: any) => [
                p.name,
                p.quantity?.toString() || '0',
                formatCurrency(p.revenue || 0),
                formatCurrency(p.profit || 0),
              ]),
              theme: 'striped',
            });
          }
        } else if (reportType === 'products') {
          if (data.topProducts?.length > 0) {
            (doc as any).autoTable({
              startY: yPos,
              head: [['Product', 'SKU', 'Quantity Sold', 'Revenue', 'Profit']],
              body: data.topProducts.map((p: any) => [
                p.name,
                p.sku || '-',
                p.quantity?.toString() || '0',
                formatCurrency(p.revenue || 0),
                formatCurrency(p.profit || 0),
              ]),
              theme: 'striped',
            });
          }
        } else if (reportType === 'customers') {
          if (data.topCustomers?.length > 0) {
            (doc as any).autoTable({
              startY: yPos,
              head: [['Customer', 'Purchases', 'Revenue']],
              body: data.topCustomers.map((c: any) => [
                c.name,
                c.purchases?.toString() || '0',
                formatCurrency(c.revenue || 0),
              ]),
              theme: 'striped',
            });
          }
        } else if (reportType === 'inventory') {
          doc.setFontSize(14);
          doc.text('Summary', 14, yPos);
          yPos += 10;
          
          (doc as any).autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
              ['Total Products', data.totalProducts?.toString() || '0'],
              ['Low Stock Items', data.lowStockItems?.toString() || '0'],
              ['Out of Stock', data.outOfStock?.toString() || '0'],
            ],
            theme: 'striped',
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 15;
          
          if (data.inventoryItems?.length > 0) {
            doc.setFontSize(14);
            doc.text('Inventory Items', 14, yPos);
            yPos += 10;
            
            (doc as any).autoTable({
              startY: yPos,
              head: [['Product', 'Stock', 'Value', 'Status']],
              body: data.inventoryItems.map((item: any) => [
                item.name,
                item.stock?.toString() || '0',
                formatCurrency(item.value || 0),
                item.status || 'N/A',
              ]),
              theme: 'striped',
            });
          }
        } else if (reportType === 'profit') {
          doc.setFontSize(14);
          doc.text('Summary', 14, yPos);
          yPos += 10;
          
          (doc as any).autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
              ['Total Revenue', formatCurrency(data.totalRevenue || 0)],
              ['Total Cost', formatCurrency(data.totalCost || 0)],
              ['Gross Profit', formatCurrency(data.grossProfit || 0)],
              ['Net Profit', formatCurrency(data.netProfit || 0)],
            ],
            theme: 'striped',
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 15;
          
          if (data.profitByDay?.length > 0) {
            doc.setFontSize(14);
            doc.text('Profit by Day', 14, yPos);
            yPos += 10;
            
            (doc as any).autoTable({
              startY: yPos,
              head: [['Date', 'Revenue', 'Cost', 'Profit']],
              body: data.profitByDay.map((row: any) => [
                row.date,
                formatCurrency(row.revenue || 0),
                formatCurrency(row.cost || 0),
                formatCurrency(row.profit || 0),
              ]),
              theme: 'striped',
            });
          }
        }
        
        // Save PDF
        doc.save(`${fileName}.pdf`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    }
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
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading report data</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={fetchReportData}
              className="mt-2 text-sm underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}
        
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
            <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2" disabled={loading}>
              <Download className="w-4 h-4" />
              PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2" disabled={loading}>
              <Download className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2" disabled={loading}>
              <Download className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading report data...</p>
          </div>
        )}
        
        {reportType === 'sales' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold">{reportData.totalSales || 0}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalRevenue || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalProfit || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tax Collected</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalTax || 0)}</p>
              </div>
              <FileText className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
        </div>
        )}

        {reportType === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Products Sold</p>
                <p className="text-2xl font-bold">
                  {(reportData.topProducts || []).reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)}
                </p>
              </div>
              <Package className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency((reportData.topProducts || []).reduce((sum: number, p: any) => sum + (p.revenue || 0), 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Profit</p>
                <p className="text-2xl font-bold">
                  {formatCurrency((reportData.topProducts || []).reduce((sum: number, p: any) => sum + (p.profit || 0), 0))}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
        </div>
        )}

        {reportType === 'customers' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold">{formatNumber(reportData.totalCustomers || 0)}</p>
              </div>
              <Users className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Customer Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(getCustomerRevenue(reportData))}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Purchases</p>
                <p className="text-2xl font-bold">{formatNumber(getCustomerPurchases(reportData))}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Top Customer</p>
                <p className="text-lg font-bold truncate" title={reportData.topCustomers?.[0]?.name || 'No customers'}>
                  {reportData.topCustomers?.[0]?.name || '-'}
                </p>
              </div>
              <Users className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
        </div>
        )}

        {reportType === 'inventory' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold">{formatNumber(reportData.totalProducts || 0)}</p>
              </div>
              <Package className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Inventory Value</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalValue || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Stock Items</p>
                <p className="text-2xl font-bold">{formatNumber(reportData.lowStockItems || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold">{formatNumber(reportData.outOfStock || 0)}</p>
              </div>
              <Package className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>
        )}

        {reportType === 'sales' && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Sales Trend" subtitle="Daily sales overview" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.salesByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment Methods" subtitle="Breakdown by payment type" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.salesByPayment || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(reportData.salesByPayment || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        )}

        {reportType === 'products' && (
        <Card>
          <CardHeader title="Product Performance" subtitle="Best selling products by revenue" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.topProducts && reportData.topProducts.length > 0) ? (
                  reportData.topProducts.map((product: any, index: number) => (
                    <tr key={product._id?.toString?.() || index}>
                      <td>{index + 1}</td>
                      <td className="font-medium">{product.name}</td>
                      <td>{product.sku || '-'}</td>
                      <td>{product.quantity}</td>
                      <td>{formatCurrency(product.revenue)}</td>
                      <td>{formatCurrency(product.profit)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No product sales data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}

        {reportType === 'customers' && (
        <Card>
          <CardHeader title="Customer Purchases" subtitle="Top customers by revenue for the selected period" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Purchases</th>
                  <th>Revenue</th>
                  <th>Balance Due</th>
                  <th>Last Purchase</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.topCustomers && reportData.topCustomers.length > 0) ? (
                  reportData.topCustomers.map((customer: any, index: number) => (
                    <tr key={customer._id?.toString?.() || index}>
                      <td>{index + 1}</td>
                      <td className="font-medium">{customer.name || customer.customerName || '-'}</td>
                      <td>{customer.phone || '-'}</td>
                      <td>{customer.email || '-'}</td>
                      <td>{formatNumber(customer.purchases || 0)}</td>
                      <td>{formatCurrency(customer.revenue || 0)}</td>
                      <td>{formatCurrency(customer.balanceDue || 0)}</td>
                      <td>{formatDate(customer.lastPurchaseDate)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No customer sales data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}

        {reportType === 'inventory' && (
        <Card>
          <CardHeader title="Inventory Items" subtitle="Current stock levels and inventory value" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.inventoryItems && reportData.inventoryItems.length > 0) ? (
                  reportData.inventoryItems.map((item: any, index: number) => (
                    <tr key={item._id?.toString?.() || index}>
                      <td>{index + 1}</td>
                      <td className="font-medium">{item.name}</td>
                      <td>{item.sku || '-'}</td>
                      <td>{item.category || 'Uncategorized'}</td>
                      <td>{formatNumber(item.stock || 0)}</td>
                      <td>{formatCurrency(item.value || 0)}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInventoryStatusClass(item.status)}`}>
                          {item.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No inventory data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}

        {reportType === 'profit' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalRevenue || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.totalCost || 0)}</p>
              </div>
              <Package className="w-8 h-8 text-red-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Gross Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.grossProfit || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.netProfit || 0)}</p>
              </div>
              <FileText className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
        </div>
        )}

        {reportType === 'profit' && !loading && (
        <Card>
          <CardHeader title="Profit & Loss Trend" subtitle="Daily breakdown of revenue, cost, and profit" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.profitByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        )}

        {reportType === 'profit' && (
        <Card>
          <CardHeader title="Profit & Loss Details" subtitle="Daily breakdown of profit and loss" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.profitByDay && reportData.profitByDay.length > 0) ? (
                  reportData.profitByDay.map((row: any, index: number) => (
                    <tr key={`${row.date}-${index}`}>
                      <td className="font-medium">{row.date}</td>
                      <td>{formatCurrency(row.revenue)}</td>
                      <td>{formatCurrency(row.cost)}</td>
                      <td>{formatCurrency(row.profit)}</td>
                      <td>
                        {row.revenue > 0 
                          ? `${((row.profit / row.revenue) * 100).toFixed(1)}%` 
                          : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No profit data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}

        {reportType === 'sales' && (
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
                {(reportData.topProducts && reportData.topProducts.length > 0) ? (
                  reportData.topProducts.slice(0, 10).map((product: any, index: number) => (
                    <tr key={product._id?.toString?.() || index}>
                      <td>{index + 1}</td>
                      <td className="font-medium">{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>{formatCurrency(product.revenue)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${(product.revenue / (reportData.totalRevenue || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm">
                            {((product.revenue / (reportData.totalRevenue || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No sales data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>
    </div>
  );
}
