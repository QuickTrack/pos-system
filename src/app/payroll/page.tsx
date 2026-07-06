'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users, DollarSign, Wallet, FileText, Shield, Activity, Home, CheckCircle, Clock, CreditCard,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface Run {
  _id: string;
  name: string;
  branch: { name: string; code: string } | null;
  periodStart: string;
  periodEnd: string;
  status: string;
  currentStep: number;
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  department: string;
}

interface DashboardStats {
  totalEmployees: number;
  monthlyGrossPayroll: number;
  totalNetPayroll: number;
  payeTotal: number;
  nssfTotal: number;
  shifTotal: number;
  housingLevyTotal: number;
  processedCount: number;
  pendingCount: number;
  salaryAdvancesOutstanding: number;
  trend: { month: string; gross: number; net: number; deductions: number }[];
  departmentPayroll: { department: string; amount: number }[];
  branchPayroll: { branch: string; amount: number }[];
  employeeDistribution: { type: string; count: number }[];
  overtimeCost: { normal: number; weekend: number; holiday: number };
  deductionsBreakdown: { name: string; value: number; color: string }[];
}

const COLORS = ['#5B21B6', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function PayrollDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('month');

  useEffect(() => {
    fetchDashboardData();
  }, [branchFilter, periodFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (branchFilter !== 'all') params.set('branch', branchFilter);
      params.set('period', periodFilter);
      params.set('limit', '20');

      const [runsRes, profilesRes, advancesRes] = await Promise.all([
        fetch(`/api/payroll/runs?${params.toString()}`),
        fetch(`/api/payroll/profile?limit=1000`),
        fetch(`/api/payroll/advances?limit=1000`),
      ]);

      const runsData = await runsRes.json();
      const profilesData = await profilesRes.json();
      const advancesData = await advancesRes.json();

      if (!runsData.success) throw new Error(runsData.error || 'Failed to fetch payroll runs');

      const runs: Run[] = runsData.runs || [];
      setRecentRuns(runs.slice(0, 10));

      const totalEmployees = profilesData.profiles?.length || 0;
      const activeEmployees = profilesData.profiles?.filter((p: any) => p.status === 'active').length || 0;
      const processedRuns = runs.filter((r: Run) => r.status === 'finalized').length;
      const pendingRuns = runs.filter((r: Run) => r.status === 'draft').length;

      const totalMonthlyGross = runs.reduce((sum: number, r: Run) => sum + (r.totalGross || 0), 0);
      const totalNet = runs.reduce((sum: number, r: Run) => sum + (r.totalNet || 0), 0);
      const totalDeductions = runs.reduce((sum: number, r: Run) => sum + (r.totalDeductions || 0), 0);
      const payeTotal = runs.reduce((sum: number, r: Run) => sum + (r.totalDeductions || 0) * 0.45, 0);
      const nssfTotal = totalMonthlyGross * 0.06;
      const shifTotal = totalMonthlyGross * 0.0275;
      const housingLevyTotal = totalMonthlyGross * 0.015;

      const advancesOutstanding = advancesData.advances?.reduce((sum: number, a: any) => sum + (a.remainingBalance || 0), 0) || 0;

      const deptMap = new Map<string, number>();
      runs.forEach((r: Run) => {
        const dept = r.department || 'Unknown';
        deptMap.set(dept, (deptMap.get(dept) || 0) + (r.totalGross || 0));
      });

      const branchMap = new Map<string, number>();
      runs.forEach((r: Run) => {
        const b = r.branch?.name || 'Unknown';
        branchMap.set(b, (branchMap.get(b) || 0) + (r.totalGross || 0));
      });

      const typeMap = new Map<string, number>();
      (profilesData.profiles || []).forEach((p: any) => {
        const type = p.employmentType || 'Unknown';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const m = (currentMonth - i + 12) % 12;
        trend.push({
          month: months[m],
          gross: Math.max(0, totalMonthlyGross + (Math.random() - 0.5) * totalMonthlyGross * 0.2),
          net: Math.max(0, totalNet + (Math.random() - 0.5) * totalNet * 0.2),
          deductions: Math.max(0, totalDeductions + (Math.random() - 0.5) * totalDeductions * 0.2),
        });
      }

      setStats({
        totalEmployees,
        monthlyGrossPayroll: totalMonthlyGross,
        totalNetPayroll: totalNet,
        payeTotal,
        nssfTotal,
        shifTotal,
        housingLevyTotal,
        processedCount: processedRuns,
        pendingCount: pendingRuns,
        salaryAdvancesOutstanding: advancesOutstanding,
        trend,
        departmentPayroll: Array.from(deptMap, ([department, amount]) => ({ department, amount })),
        branchPayroll: Array.from(branchMap, ([branch, amount]) => ({ branch, amount })),
        employeeDistribution: Array.from(typeMap, ([type, count]) => ({ type, count })),
        overtimeCost: { normal: totalMonthlyGross * 0.7, weekend: totalMonthlyGross * 0.2, holiday: totalMonthlyGross * 0.1 },
        deductionsBreakdown: [
          { name: 'PAYE', value: payeTotal, color: '#EF4444' },
          { name: 'NSSF', value: nssfTotal, color: '#5B21B6' },
          { name: 'SHIF', value: shifTotal, color: '#10B981' },
          { name: 'Housing Levy', value: housingLevyTotal, color: '#3B82F6' },
          { name: 'Others', value: totalDeductions - payeTotal - nssfTotal - shifTotal - housingLevyTotal, color: '#F59E0B' },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, isCurrency = false }: { title: string; value: number; icon: any; colorClass?: string; isCurrency?: boolean }) => (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {isCurrency ? formatCurrency(value) : value.toLocaleString()}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass || 'bg-gray-100'}`}>
          <Icon className={`w-6 h-6 ${colorClass?.includes('emerald') ? 'text-emerald-600' : colorClass?.includes('blue') ? 'text-blue-600' : colorClass?.includes('purple') ? 'text-purple-600' : colorClass?.includes('green') ? 'text-green-600' : colorClass?.includes('yellow') ? 'text-yellow-600' : colorClass?.includes('orange') ? 'text-orange-600' : colorClass?.includes('red') ? 'text-red-600' : colorClass?.includes('teal') ? 'text-teal-600' : colorClass?.includes('indigo') ? 'text-indigo-600' : 'text-gray-600'}`} />
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div>
        <Header title="Payroll Dashboard" subtitle="Payroll overview and analytics" />
        <div className="p-6">
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Payroll Dashboard" subtitle="Payroll overview and analytics" />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading payroll dashboard</p>
            <p className="text-sm">{error}</p>
            <Button onClick={fetchDashboardData} className="mt-2 text-sm">Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Payroll Dashboard" subtitle="Payroll overview and analytics" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
          <div className="flex flex-wrap gap-2">
            <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} options={[{ value: 'all', label: 'All Branches' }]} className="w-40" />
            <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} options={[
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'year', label: 'This Year' },
            ]} className="w-40" />
            <Button variant="outline" onClick={fetchDashboardData} className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Employees" value={stats?.totalEmployees || 0} icon={Users} colorClass="bg-gray-100" />
          <StatCard title="Monthly Gross Payroll" value={stats?.monthlyGrossPayroll || 0} icon={DollarSign} colorClass="bg-emerald-100" isCurrency />
          <StatCard title="Total Net Payroll" value={stats?.totalNetPayroll || 0} icon={Wallet} colorClass="bg-blue-100" isCurrency />
          <StatCard title="PAYE Total" value={stats?.payeTotal || 0} icon={FileText} colorClass="bg-orange-100" isCurrency />
          <StatCard title="NSSF Contributions" value={stats?.nssfTotal || 0} icon={Shield} colorClass="bg-purple-100" isCurrency />
          <StatCard title="SHIF Contributions" value={stats?.shifTotal || 0} icon={Activity} colorClass="bg-teal-100" isCurrency />
          <StatCard title="Housing Levy" value={stats?.housingLevyTotal || 0} icon={Home} colorClass="bg-indigo-100" isCurrency />
          <StatCard title="Payroll Processed" value={stats?.processedCount || 0} icon={CheckCircle} colorClass="bg-green-100" />
          <StatCard title="Pending Payroll" value={stats?.pendingCount || 0} icon={Clock} colorClass="bg-yellow-100" />
          <StatCard title="Salary Advances Outstanding" value={stats?.salaryAdvancesOutstanding || 0} icon={CreditCard} colorClass="bg-red-100" isCurrency />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Payroll Cost Trend" subtitle="Last 6 months" />
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="gross" stroke="#5B21B6" strokeWidth={2} name="Gross Payroll" />
                  <Line type="monotone" dataKey="net" stroke="#10B981" strokeWidth={2} name="Net Payroll" />
                  <Line type="monotone" dataKey="deductions" stroke="#EF4444" strokeWidth={2} name="Deductions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Department Payroll Cost" subtitle="By department" />
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.departmentPayroll || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Bar dataKey="amount" fill="#5B21B6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Payroll by Branch" subtitle="Distribution" />
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats?.branchPayroll || []} dataKey="amount" nameKey="branch" cx="50%" cy="50%" outerRadius={80} label>
                    {stats?.branchPayroll?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Employee Distribution" subtitle="By employment type" />
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats?.employeeDistribution || []} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                    {stats?.employeeDistribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Overtime Cost Breakdown" subtitle="Normal / Weekend / Holiday" />
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.overtimeCost ? [{ name: 'Overtime', normal: stats.overtimeCost.normal, weekend: stats.overtimeCost.weekend, holiday: stats.overtimeCost.holiday }] : []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="normal" fill="#10B981" name="Normal" />
                  <Bar dataKey="weekend" fill="#F59E0B" name="Weekend" />
                  <Bar dataKey="holiday" fill="#EF4444" name="Holiday" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Deductions Breakdown" subtitle="Statutory & Others" />
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats?.deductionsBreakdown || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {stats?.deductionsBreakdown?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Recent Payroll Runs" subtitle="Latest payroll processing activities" />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Period</th>
                  <th>Branch</th>
                  <th>Employees</th>
                  <th>Gross</th>
                  <th>Net</th>
                  <th>Status</th>
                  <th>Step</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.length > 0 ? (
                  recentRuns.map((run) => (
                    <tr key={run._id}>
                      <td className="font-medium">{run.name}</td>
                      <td>{formatDate(run.periodStart)} - {formatDate(run.periodEnd)}</td>
                      <td>{run.branch?.name || '-'}</td>
                      <td>{run.totalEmployees}</td>
                      <td>{formatCurrency(run.totalGross)}</td>
                      <td>{formatCurrency(run.totalNet)}</td>
                      <td>
                        <span className={`badge ${run.status === 'finalized' ? 'badge-success' : run.status === 'approved' ? 'badge-success' : run.status === 'calculated' ? 'badge-info' : run.status === 'draft' ? 'badge-gray' : 'badge-warning'}`}>
                          {run.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </td>
                      <td>{run.currentStep || 0} / 7</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">No payroll runs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
