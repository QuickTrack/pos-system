'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface Quotation {
  _id: string;
  quotationNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  quoteDate: string;
  validUntil: string;
  salespersonName: string;
  branchName: string;
}

const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
  draft: { label: 'Draft', variant: 'gray', icon: FileText },
  pending_approval: { label: 'Pending Approval', variant: 'yellow', icon: Clock },
  sent: { label: 'Sent', variant: 'blue', icon: Send },
  viewed: { label: 'Viewed', variant: 'purple', icon: Eye },
  accepted: { label: 'Accepted', variant: 'emerald', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'red', icon: XCircle },
  expired: { label: 'Expired', variant: 'gray', icon: AlertTriangle },
  converted: { label: 'Converted', variant: 'emerald', icon: TrendingUp },
  cancelled: { label: 'Cancelled', variant: 'gray', icon: XCircle },
};

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchQuotations = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);

      const res = await fetch(`/api/quotations?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.success) setQuotations(data.quotations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const stats = {
    total: quotations.length,
    draft: quotations.filter((q) => q.status === 'draft').length,
    sent: quotations.filter((q) => ['sent', 'viewed'].includes(q.status)).length,
    accepted: quotations.filter((q) => q.status === 'accepted').length,
    converted: quotations.filter((q) => q.status === 'converted').length,
    expired: quotations.filter((q) => q.status === 'expired').length,
    pendingValue: quotations
      .filter((q) => ['draft', 'sent', 'viewed'].includes(q.status))
      .reduce((sum, q) => sum + (q.grandTotal || 0), 0),
    convertedValue: quotations
      .filter((q) => q.status === 'converted')
      .reduce((sum, q) => sum + (q.grandTotal || 0), 0),
  };

  return (
    <div>
      <Header title="Quotations" subtitle="Manage quotations and estimates" />

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={() => router.push('/quotations/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              New Quotation
            </Button>
            <Button variant="outline" onClick={fetchQuotations} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader title="Total Quotations" subtitle={`${stats.total} total`} />
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </Card>
          <Card>
            <CardHeader title="Pending" subtitle="Draft, Sent, Viewed" />
            <p className="text-3xl font-bold text-blue-600">
              {stats.sent}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Pending: {formatCurrency(stats.pendingValue)}
            </p>
          </Card>
          <Card>
            <CardHeader title="Accepted" subtitle="Won" />
            <p className="text-3xl font-bold text-emerald-600">{stats.accepted}</p>
          </Card>
          <Card>
            <CardHeader title="Converted" subtitle="To sales" />
            <p className="text-3xl font-bold text-purple-600">{stats.converted}</p>
            <p className="text-sm text-gray-500 mt-1">
              Value: {formatCurrency(stats.convertedValue)}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by quote #, customer name, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="converted">Converted</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Button variant="outline" onClick={fetchQuotations} className="gap-2">
              <Filter className="w-4 h-4" />
              Apply
            </Button>
          </div>
        </Card>

        {/* Quotations Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner" />
            </div>
          ) : quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No quotations found</p>
              <Button className="mt-4" onClick={() => router.push('/quotations/new')}>
                Create your first quotation
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quote #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Salesperson</th>
                    <th>Branch</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Valid Until</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => {
                    const status = statusConfig[q.status] || statusConfig.draft;
                    return (
                      <tr
                        key={q._id}
                        onClick={() => router.push(`/quotations/${q._id}`)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td>
                          <span className="font-mono font-medium text-emerald-600">
                            {q.quotationNumber}
                          </span>
                        </td>
                        <td>{formatDate(q.quoteDate)}</td>
                        <td>
                          <div>
                            <p className="font-medium">{q.customerName}</p>
                            <p className="text-xs text-gray-500">{q.customerPhone}</p>
                          </div>
                        </td>
                        <td>{q.salespersonName}</td>
                        <td>{q.branchName}</td>
                        <td className="font-medium">{formatCurrency(q.grandTotal)}</td>
                        <td>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </td>
                        <td>{formatDate(q.validUntil)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
