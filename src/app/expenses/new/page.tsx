'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input, Textarea } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Receipt,
  Upload,
  User,
  Building2,
  Wallet,
  Tag,
  FileText,
  CheckCircle2,
  XCircle,
  Store,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useShiftStore } from '@/lib/store';

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface ExpenseCategory {
  _id: string;
  name: string;
  description?: string;
  level: number;
  path: string;
}

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
}

export default function NewExpensePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    dateTime: new Date().toISOString().slice(0, 16),
    branch: '',
    department: '',
    expenseCategory: '',
    expenseSubcategory: '',
    description: '',
    amount: '',
    paymentSource: 'cash_drawer',
    paymentSourceDetail: '',
    bankAccountName: '',
    payeeType: 'other',
    payeeName: '',
    payeePhoneNumber: '',
    payeeReferenceNumber: '',
    payeeSupplierId: '',
    notes: '',
  });

  const searchParams = useSearchParams();
  const fromPos = searchParams.get('fromPos') === 'true';
  const posBranchId = searchParams.get('branchId') || '';
  const posShiftId = searchParams.get('shiftId') || '';
  const posCashierId = searchParams.get('cashierId') || '';

  useEffect(() => {
    if (fromPos && posBranchId && !formData.branch) {
      setFormData((prev) => ({ ...prev, branch: posBranchId }));
    }
  }, [fromPos, posBranchId, formData.branch]);

  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [branchRes, categoryRes, supplierRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/expense-categories?includeInactive=true'),
        fetch('/api/suppliers'),
      ]);

      const branchData = await branchRes.json();
      const categoryData = await categoryRes.json();
      const supplierData = await supplierRes.json();

      if (branchData.success) setBranches(branchData.branches);
      if (categoryData.success) setCategories(categoryData.categories);
      if (supplierData.success) setSuppliers(supplierData.suppliers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (status: 'pending' | 'approved') => {
    if (!formData.branch || !formData.expenseCategory || !formData.description || !formData.amount || !formData.payeeName) {
      setError('Please fill all required fields: Branch, Category, Description, Amount, Payee Name');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const uploadedAttachments = await Promise.all(
        attachments.map(async (file, index) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          return {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            filePath: data.path,
            uploadedAt: new Date(),
          };
        })
      );

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          shift: fromPos && posShiftId ? posShiftId : undefined,
          amount: parseFloat(formData.amount),
          attachments: uploadedAttachments,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create expense');
      }

      setSuccess(true);
      if (fromPos && posShiftId) {
        localStorage.setItem('shift-refresh', Date.now().toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filteredSuppliers =
    formData.payeeType === 'supplier'
      ? suppliers.filter((s) =>
          formData.payeeSupplierId ? s._id === formData.payeeSupplierId : true
        )
      : [];

  if (success) {
    return (
      <div>
        <Header title="New Payout Recorded" subtitle="Expense has been recorded successfully" />
        <div className="p-6">
          <Card className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Expense Recorded Successfully</h3>
            <p className="text-gray-500 mb-6">The payout has been recorded and is pending approval.</p>
            <div className="flex justify-center gap-3">
              {fromPos ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuccess(false);
                      setFormData({
                        dateTime: new Date().toISOString().slice(0, 16),
                        branch: posBranchId || '',
                        department: '',
                        expenseCategory: '',
                        expenseSubcategory: '',
                        description: '',
                        amount: '',
                        paymentSource: 'cash_drawer',
                        paymentSourceDetail: '',
                        bankAccountName: '',
                        payeeType: 'other',
                        payeeName: '',
                        payeePhoneNumber: '',
                        payeeReferenceNumber: '',
                        payeeSupplierId: '',
                        notes: '',
                      });
                      setAttachments([]);
                    }}
                  >
                    Record Another
                  </Button>
                  <Link href="/pos">
                    <Button>Return to POS</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/expenses/new">
                    <Button variant="outline">Record Another</Button>
                  </Link>
                  <Link href="/expenses">
                    <Button>View All Expenses</Button>
                  </Link>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

   return (
    <div>
      <Header title="Record New Payout" subtitle="Create a new business expense entry" />

      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {fromPos && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg">
              <Store className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Petty Cash Entry</p>
                <p className="text-xs text-emerald-700">This payout will be recorded against the current POS session and included in the end-of-shift summary.</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4">
            <Link href="/expenses">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Expense Entry Form</h2>
              <p className="text-sm text-gray-500">Fill in the details below to record a new payout</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">General Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date & Time"
                type="datetime-local"
                value={formData.dateTime}
                onChange={(e) => updateField('dateTime', e.target.value)}
                required
              />
              <Select
                label="Branch"
                value={formData.branch}
                onChange={(e) => updateField('branch', e.target.value)}
                options={[
                  { value: '', label: 'Select Branch' },
                  ...branches.map((b) => ({ value: b._id, label: `${b.name} (${b.code})` })),
                ]}
                required
              />
              <Input
                label="Department (Optional)"
                value={formData.department}
                onChange={(e) => updateField('department', e.target.value)}
                placeholder="e.g., Operations, Marketing"
              />
              <Select
                label="Expense Category"
                value={formData.expenseCategory}
                onChange={(e) => updateField('expenseCategory', e.target.value)}
                options={[
                  { value: '', label: 'Select Category' },
                  ...categories.map((c) => ({
                    value: c._id,
                    label: c.level > 0 ? `${c.path}` : c.name,
                  })),
                ]}
                required
              />
              <Input
                label="Subcategory (Optional)"
                value={formData.expenseSubcategory}
                onChange={(e) => updateField('expenseSubcategory', e.target.value)}
                placeholder="e.g., Office Rent, Electricity Bill"
              />
              <div className="md:col-span-2">
              <Textarea
                label="Expense Description"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Brief description of the expense..."
                required
              />
              </div>
              <Input
                label="Amount (KES)"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Payment Source</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Payment Source"
                value={formData.paymentSource}
                onChange={(e) => updateField('paymentSource', e.target.value)}
                options={[
                  { value: 'cash_drawer', label: 'Cash Drawer' },
                  { value: 'main_till', label: 'Main Till' },
                  { value: 'petty_cash', label: 'Petty Cash' },
                  { value: 'bank_account', label: 'Bank Account' },
                  { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
                  { value: 'mpesa_till', label: 'M-Pesa Till' },
                  { value: 'business_number', label: 'Business Number' },
                ]}
                required
              />
              <Input
                label="Payment Source Detail"
                value={formData.paymentSourceDetail}
                onChange={(e) => updateField('paymentSourceDetail', e.target.value)}
                placeholder="e.g., KCB Account No. 1234567890"
              />
              {formData.paymentSource === 'bank_account' && (
                <Input
                  label="Bank Account Name"
                  value={formData.bankAccountName}
                  onChange={(e) => updateField('bankAccountName', e.target.value)}
                  placeholder="e.g., Equity Bank - Main Account"
                />
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Payee Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Payee Type"
                value={formData.payeeType}
                onChange={(e) => updateField('payeeType', e.target.value)}
                options={[
                  { value: 'supplier', label: 'Supplier' },
                  { value: 'employee', label: 'Employee' },
                  { value: 'contractor', label: 'Contractor' },
                  { value: 'casual_worker', label: 'Casual Worker' },
                  { value: 'utility_provider', label: 'Utility Provider' },
                  { value: 'other', label: 'Other' },
                ]}
                required
              />
              <Input
                label="Payee Name"
                value={formData.payeeName}
                onChange={(e) => updateField('payeeName', e.target.value)}
                placeholder="Full name of the payee"
                required
              />
              <Input
                label="Phone Number (Optional)"
                type="tel"
                value={formData.payeePhoneNumber}
                onChange={(e) => updateField('payeePhoneNumber', e.target.value)}
                placeholder="+254 7XX XXX XXX"
              />
              <Input
                label="Reference Number (Optional)"
                value={formData.payeeReferenceNumber}
                onChange={(e) => updateField('payeeReferenceNumber', e.target.value)}
                placeholder="Invoice/Reference number"
              />
              {formData.payeeType === 'supplier' && (
                <Select
                  label="Select Supplier"
                  value={formData.payeeSupplierId}
                  onChange={(e) => {
                    updateField('payeeSupplierId', e.target.value);
                    const supplier = suppliers.find((s) => s._id === e.target.value);
                    if (supplier) {
                      updateField('payeeName', supplier.name);
                      if (supplier.phone) {
                        updateField('payeePhoneNumber', supplier.phone);
                      }
                    }
                  }}
                  options={[
                    { value: '', label: '-- Select Supplier --' },
                    ...suppliers.map((s) => ({ value: s._id, label: s.name })),
                  ]}
                />
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Upload supporting documents (receipts, invoices, delivery notes, utility bills, payment vouchers)
              </p>
              <p className="text-xs text-gray-400">Supported formats: PDF, JPG, PNG, DOCX (Max 10MB per file)</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Click to upload files</p>
                  <p className="text-xs text-gray-500 mt-1">or drag and drop files here</p>
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
            </div>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional notes or remarks..."
              rows={3}
            />
          </Card>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/expenses">
              <Button variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => handleSubmit('pending')}
              disabled={submitting}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              onClick={() => handleSubmit('approved')}
              disabled={submitting}
              className="gap-2"
            >
              <Receipt className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
