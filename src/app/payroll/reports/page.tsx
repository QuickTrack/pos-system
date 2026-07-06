'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileBarChart, Download, RefreshCw, BarChart3, Wallet, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface BranchOption {
  _id: string;
  name: string;
}

interface ReportTotals {
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalPAYE: number;
  totalNSSF: number;
  totalSHIF: number;
  totalHousingLevy: number;
  totalAdvancesRecovered: number;
  totalLoanRecovered: number;
}

interface ReportData {
  type: string;
  periodStart?: string;
  periodEnd?: string;
  branch?: string;
  department?: string;
  totals: ReportTotals;
  departments: { department: string; count: number; gross: number; net: number; deductions: number }[];
  branches: { branch: string; count: number; gross: number; net: number; deductions: number }[];
  items: any[];
}

interface RecentReport {
  id: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  branch: string;
  generatedAt: string;
}

const REPORT_TYPE_OPTIONS = [
  { value: 'summary', label: 'Payroll Summary' },
  { value: 'register', label: 'Payroll Register' },
  { value: 'department', label: 'Department Payroll' },
  { value: 'branch', label: 'Branch Payroll' },
  { value: 'overtime', label: 'Overtime Report' },
  { value: 'statutory', label: 'Statutory Report' },
  { value: 'cost', label: 'Cost Analysis' },
];

const COLORS = ['#5B21B6', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function PayrollReportsPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [reportType, setReportType] = useState('summary');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [report, setReport] = useState<ReportData | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches?limit=1000');
      const result = await response.json();
      if (result.success) {
        setBranches(result.branches || []);
      }
    } catch {
      setBranches([]);
    }
  };

  const fetchRecentReports = async () => {
    try {
      const stored = localStorage.getItem('payrollReports');
      if (stored) setRecentReports(JSON.parse(stored));
    } catch {
      setRecentReports([]);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('type', reportType);
      params.set('reportType', reportType);
      if (periodStart) params.set('periodStart', periodStart);
      if (periodEnd) params.set('periodEnd', periodEnd);
      if (branchFilter !== 'all') params.set('branch', branchFilter);

      const response = await fetch(`/api/payroll/reports?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setReport(result.report);
        const newReport: RecentReport = {
          id: `${Date.now()}`,
          type: REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.label || reportType,
          periodStart,
          periodEnd,
          branch: branchFilter,
          generatedAt: new Date().toISOString(),
        };
        const updated = [newReport, ...recentReports].slice(0, 10);
        setRecentReports(updated);
        localStorage.setItem('payrollReports', JSON.stringify(updated));
      } else {
        setError(result.error || 'Failed to generate report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchRecentReports();
    setLoading(false);
  }, []);

  const totals: ReportTotals = report?.totals || {
    totalEmployees: 0, totalGross: 0, totalDeductions: 0, totalNet: 0,
    totalPAYE: 0, totalNSSF: 0, totalSHIF: 0, totalHousingLevy: 0,
    totalAdvancesRecovered: 0, totalLoanRecovered: 0,
  };

  const chartData = report
    ? (reportType === 'department' || reportType === 'summary'
        ? report.departments.map((d) => ({ name: d.department, gross: d.gross, net: d.net, deductions: d.deductions }))
        : report.branches.map((b) => ({ name: b.branch, gross: b.gross, net: b.net, deductions: b.deductions })))
    : [];

  const pieData = [
    { name: 'PAYE', value: totals.totalPAYE, color: '#EF4444' },
    { name: 'NSSF', value: totals.totalNSSF, color: '#5B21B6' },
    { name: 'SHIF', value: totals.totalSHIF, color: '#10B981' },
    { name: 'Housing Levy', value: totals.totalHousingLevy, color: '#3B82F6' },
    { name: 'Advances', value: totals.totalAdvancesRecovered, color: '#F59E0B' },
    { name: 'Loans', value: totals.totalLoanRecovered, color: '#8B5CF6' },
  ].filter((d) => d.value > 0);

  const handleDownloadReport = (rep: RecentReport) => {
    const content = `Payroll Report: ${rep.type}\nPeriod: ${formatDate(rep.periodStart)} - ${formatDate(rep.periodEnd)}\nBranch: ${rep.branch}\nGenerated: ${formatDate(rep.generatedAt)}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${rep.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Header title="Payroll Reports" subtitle="Generate and view payroll reports" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={generateReport}>Retry</Button>
          </div>
        )}

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <Select label="Report Type" value={reportType} onChange={(e) => setReportType(e.target.value)} options={REPORT_TYPE_OPTIONS} className="w-full" />
            <Input label="Start Date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} type="date" className="w-full" />
            <Input label="End Date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} type="date" className="w-full" />
            <Select label="Branch" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} options={[{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b._id, label: b.name }))]} className="w-full" />
            <Button onClick={generateReport} isLoading={generating} className="gap-2 h-[42px]"><FileBarChart className="w-4 h-4" /> Generate Report</Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><BarChart3 className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Total Employees</p><p className="text-lg font-bold text-gray-900">{totals.totalEmployees}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Wallet className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Total Gross</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalGross)}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Net</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalNet)}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><Wallet className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Total Deductions</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalDeductions)}</p></div>
          </Card>
        </div>

        {loading ? (
          <Card><div className="flex items-center justify-center py-12"><div className="spinner" /></div></Card>
        ) : report ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Payroll Summary" subtitle={`${REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.label}`} />
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="gross" fill="#5B21B6" name="Gross" />
                    <Bar dataKey="net" fill="#10B981" name="Net" />
                    <Bar dataKey="deductions" fill="#EF4444" name="Deductions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Deductions Breakdown" subtitle="Statutory & Recoveries" />
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Statutory Contributions" subtitle="PAYE, NSSF, SHIF, Housing Levy" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><p className="text-sm text-gray-500">PAYE</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalPAYE)}</p></div>
                <div><p className="text-sm text-gray-500">NSSF</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalNSSF)}</p></div>
                <div><p className="text-sm text-gray-500">SHIF</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalSHIF)}</p></div>
                <div><p className="text-sm text-gray-500">Housing Levy</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalHousingLevy)}</p></div>
                <div><p className="text-sm text-gray-500">Advances Recovered</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalAdvancesRecovered)}</p></div>
                <div><p className="text-sm text-gray-500">Loans Recovered</p><p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalLoanRecovered)}</p></div>
              </div>
            </Card>
          </div>
        ) : (
          <Card><div className="flex flex-col items-center justify-center py-12 text-gray-500"><FileBarChart className="w-8 h-8 mb-2" /><p>Select report parameters and click Generate Report</p></div></Card>
        )}

        <Card>
          <CardHeader title="Recent Reports" subtitle="Generated payroll reports" />
          <DataTable
            columns={[
              { key: 'type', header: 'Report Type', className: 'font-medium' },
              { key: 'period', header: 'Period', render: (item: RecentReport) => `${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}` },
              { key: 'branch', header: 'Branch', render: (item: RecentReport) => item.branch || 'All Branches' },
              { key: 'generatedAt', header: 'Generated', render: (item: RecentReport) => formatDate(item.generatedAt) },
              {
                key: 'actions', header: 'Actions',
                render: (item: RecentReport) => (
                  <button onClick={() => handleDownloadReport(item)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Download"><Download className="w-4 h-4" /></button>
                ),
              },
            ]}
            data={recentReports}
            keyExtractor={(item) => item.id}
            loading={false}
            emptyMessage="No reports generated yet"
          />
        </Card>
      </div>
    </div>
  );
}
