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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    // Fetch complete data for export
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
        // Prepare data for Excel
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
            ...(data.salesByDay?.map((row: any) => [row.date, row.sales, row.revenue, row.profit]) || []),
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
            ['Product', 'Quantity Sold', 'Revenue', 'Profit'],
            ...(data.topProducts?.map((p: any) => [p.name, p.quantity, p.revenue, p.profit]) || []),
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
            ...(data.profitByDay?.map((row: any) => [row.date, row.revenue, row.cost, row.profit]) || []),
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
              head: [['Product', 'Quantity Sold', 'Revenue', 'Profit']],
              body: data.topProducts.map((p: any) => [
                p.name,
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
