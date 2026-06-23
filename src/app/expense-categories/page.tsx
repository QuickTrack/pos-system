'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import {
  Archive,
  CheckCircle2,
  Edit2,
  FileText,
  FolderTree,
  Layers3,
  LayoutList,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react';

interface ExpenseCategory {
  _id: string;
  name: string;
  description?: string;
  parentCategory?: { _id?: string; name: string } | null;
  parentName?: string;
  level: number;
  path: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type ActiveFilter = 'all' | 'true' | 'false';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800'
          : 'inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'
      }
    >
      {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function PathBreadcrumbs({ path }: { path: string }) {
  const parts = (path || '').split(' / ').filter(Boolean);

  if (parts.length === 0) {
    return <span className="text-xs text-gray-400">Top level</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((part, index) => (
        <div key={`${part}-${index}`} className="flex items-center gap-1">
          <span className={index === parts.length - 1 ? 'text-sm font-medium text-gray-900 dark:text-white' : 'text-xs text-gray-500'}>
            {part}
          </span>
          {index < parts.length - 1 && <span className="text-gray-300">/</span>}
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  tone = 'emerald',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  description: string;
  tone?: 'emerald' | 'blue' | 'amber' | 'gray';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-900',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    gray: 'bg-gray-50 text-gray-600 ring-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ring-1 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<ActiveFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentCategory: '',
    isActive: true,
    sortOrder: 0,
  });

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((category) => category.isActive).length;
    const inactive = total - active;
    const topLevel = categories.filter((category) => !category.parentCategory && !category.parentName).length;

    return { total, active, inactive, topLevel };
  }, [categories]);

  const parentOptions = useMemo(() => {
    return [
      { value: '', label: 'Top-level category' },
      ...categories
        .filter((category) => !showEditModal || category._id !== selectedCategory?._id)
        .map((category) => ({
          value: category._id,
          label: category.path || category.name,
        })),
    ];
  }, [categories, selectedCategory?._id, showEditModal]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('includeInactive', 'true');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (isActiveFilter !== 'all') params.set('isActive', isActiveFilter);

      const response = await fetch(`/api/expense-categories?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setCategories(result.categories || []);
      } else {
        setError(result.error || 'Failed to fetch expense categories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [searchQuery, isActiveFilter]);

  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      parentCategory: '',
      isActive: true,
      sortOrder: 0,
    });
    setShowCreateModal(true);
  };

  const openEditModal = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parentCategory: (category.parentCategory as any)?._id || '',
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    setShowEditModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedCategory(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const isEdit = showEditModal && selectedCategory;
      const response = await fetch('/api/expense-categories', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: selectedCategory._id, ...formData } : formData),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || result.message || `Failed to ${isEdit ? 'update' : 'create'} category`);
      }

      closeModal();
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: ExpenseCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/expense-categories?id=${category._id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to delete category');
      }
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (category: ExpenseCategory) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/expense-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: category._id,
          isActive: !category.isActive,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to update category');
      }
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Header title="Expense Categories" />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4 lg:p-5">
        {error && (
          <div className="flex-none rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Unable to complete this action</p>
                <p className="mt-0.5 truncate text-xs">{error}</p>
              </div>
              <button type="button" onClick={fetchCategories} className="flex-none text-xs font-medium underline hover:text-red-900 dark:hover:text-red-100">
                Retry
              </button>
            </div>
          </div>
        )}

        <section className="grid flex-none grid-cols-2 gap-2 xl:grid-cols-4">
          <StatCard
            icon={Tag}
            label="Total categories"
            value={stats.total}
            description="Configured records"
            tone="emerald"
          />
          <StatCard
            icon={CheckCircle2}
            label="Active"
            value={stats.active}
            description="Available for payouts"
            tone="blue"
          />
          <StatCard
            icon={Archive}
            label="Inactive"
            value={stats.inactive}
            description="Hidden from forms"
            tone="gray"
          />
          <StatCard
            icon={Layers3}
            label="Top-level groups"
            value={stats.topLevel}
            description="Parent categories"
            tone="amber"
          />
        </section>

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="flex min-h-0 overflow-hidden">
            <div className="border-b border-gray-100 bg-gradient-to-br from-emerald-50 to-white p-3 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-600 p-2 text-white">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-gray-950 dark:text-white">Category structure</h2>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">Parent and subcategory overview</p>
                </div>
              </div>
            </div>
            <div className="min-h-0 space-y-2 overflow-y-auto p-3">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-11 rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : categories.length > 0 ? (
                categories
                  .slice()
                  .sort((a, b) => a.path.localeCompare(b.path))
                  .map((category) => (
                    <button
                      key={category._id}
                      type="button"
                      onClick={() => openEditModal(category)}
                      className="group flex w-full items-center gap-2 rounded-xl border border-gray-100 bg-white p-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                    >
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900">
                        {category.name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-gray-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
                          {category.name}
                        </span>
                        <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">
                          {category.path || 'Top-level category'}
                        </span>
                      </span>
                      <StatusBadge active={category.isActive} />
                    </button>
                  ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center dark:border-gray-700">
                  <Tag className="mx-auto h-7 w-7 text-gray-400" />
                  <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">No categories yet</p>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Create your first category.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="flex min-h-0 flex-col overflow-hidden">
            <div className="border-b border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-gray-950 dark:text-white">Categories</h2>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {categories.length} configured {categories.length === 1 ? 'category' : 'categories'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchCategories} className="gap-1 px-3 py-2 text-xs" disabled={loading}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={openCreateModal} className="gap-1 px-3 py-2 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-100 bg-gray-50/70 p-2 dark:border-gray-800 dark:bg-gray-900/70">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search categories..."
                    className="form-input h-9 pl-8 text-xs"
                  />
                </div>
                <Select
                  value={isActiveFilter}
                  onChange={(e) => setIsActiveFilter(e.target.value as ActiveFilter)}
                  options={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' },
                  ]}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="data-table table-fixed min-w-full">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="w-[24%]">Category</th>
                    <th className="w-[24%]">Path</th>
                    <th className="w-[22%]">Description</th>
                    <th className="w-[8%]">Sort</th>
                    <th className="w-[10%]">Status</th>
                    <th className="w-[10%]">Created</th>
                    <th className="w-[12%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index}>
                        <td colSpan={7}>
                          <div className="h-11 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        </td>
                      </tr>
                    ))
                  ) : categories.length > 0 ? (
                    categories.map((category) => (
                      <tr key={category._id} className="group">
                        <td className="max-w-0 truncate">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gray-100 text-[11px] font-bold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                              {category.name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-gray-950 dark:text-white">{category.name}</p>
                              <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">Level {category.level + 1}</p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-0 truncate">
                          <PathBreadcrumbs path={category.path} />
                        </td>
                        <td className="max-w-0 truncate text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 flex-none text-gray-400" />
                            <span className="truncate">{category.description || 'No description'}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="inline-flex rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                            {category.sortOrder}
                          </span>
                        </td>
                        <td>
                          <StatusBadge active={category.isActive} />
                        </td>
                        <td className="truncate text-xs text-gray-500 dark:text-gray-400">{formatDate(category.createdAt)}</td>
                        <td>
                          <div className="flex justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(category)}
                              disabled={submitting}
                              className="rounded-md p-1.5 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                              aria-label={`Edit ${category.name}`}
                              title="Edit category"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(category)}
                              disabled={submitting}
                              className={`rounded-md p-1.5 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                category.isActive
                                  ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950'
                              }`}
                              aria-label={category.isActive ? `Deactivate ${category.name}` : `Activate ${category.name}`}
                              title={category.isActive ? 'Deactivate category' : 'Activate category'}
                            >
                              {category.isActive ? <Archive className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(category)}
                              disabled={submitting}
                              className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                              aria-label={`Delete ${category.name}`}
                              title="Delete category"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900">
                            <LayoutList className="h-5 w-5" />
                          </div>
                          <h3 className="mt-3 text-sm font-semibold text-gray-950 dark:text-white">No matching categories</h3>
                          <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">Try a different search term or create a new category.</p>
                          <Button onClick={openCreateModal} className="mt-3 gap-1 px-3 py-2 text-xs">
                            <Plus className="h-3.5 w-3.5" />
                            Create category
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>

      {(showCreateModal || showEditModal) && (
        <Modal
          isOpen={showCreateModal || showEditModal}
          onClose={closeModal}
          title={showEditModal ? 'Edit expense category' : 'Create expense category'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-600 p-2 text-white">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-950 dark:text-white">
                    {showEditModal ? 'Update category details' : 'Add a new category'}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    Use parent categories to keep payout types organized and easy to report.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Category Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Office Rent"
                required
              />
              <Input
                label="Sort Order"
                type="number"
                value={formData.sortOrder.toString()}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                }
              />
            </div>

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Briefly describe what belongs in this category..."
            />

            <Select
              label="Parent Category"
              value={formData.parentCategory}
              onChange={(e) => setFormData((prev) => ({ ...prev, parentCategory: e.target.value }))}
              options={parentOptions}
            />

            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
              <label htmlFor="categoryActive" className="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-gray-950 dark:text-white">Category status</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Inactive categories are hidden from expense forms.
                  </span>
                </span>
                <input
                  id="categoryActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : showEditModal ? 'Update category' : 'Create category'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
