'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/utils';

interface Variance {
  _id: string;
  varianceId: string;
  type: string;
  amount: number;
  explanation: string;
  status: string;
  approvedByName: string;
  createdAt: string;
  shift: { shiftId: string };
}

export default function VariancePage() {
  const [variances, setVariances] = useState<Variance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/variance')
      .then((res) => res.json())
      .then((json) => { if (json.success) setVariances(json.variances); })
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string, status: string) => {
    await fetch('/api/variance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, notes: '' }) });
    window.location.reload();
  };

  const filtered = variances.filter((v) => !filter || v.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Variances</h1>
        <p className="text-gray-600 mt-1">Monitor and approve cash discrepancies</p>
      </div>

      <div className="flex items-center gap-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Explanation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">No variances found</td></tr>
              ) : filtered.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{v.varianceId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${v.type === 'shortage' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      <AlertTriangle className="w-3 h-3" /> {v.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(v.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.shift?.shiftId || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{v.explanation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.approvedByName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {v.status === 'approved' ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Approved</span> : v.status === 'rejected' ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Rejected</span> : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {v.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleApprove(v._id, 'approved')} className="text-green-600 hover:text-green-900 font-medium">Approve</button>
                        <button onClick={() => handleApprove(v._id, 'rejected')} className="text-red-600 hover:text-red-900 font-medium">Reject</button>
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
