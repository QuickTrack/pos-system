'use client';

import { useState, useEffect } from 'react';
import { Clock, Calculator } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useShiftStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function ShiftStatusIndicator() {
  const { activeShift, fetchActiveShift, openShift, closeShift, loading } = useShiftStore();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [registers, setRegisters] = useState<any[]>([]);
  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingFloat, setOpeningFloat] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  const fetchRegisters = async () => {
    try {
      const res = await fetch('/api/registers?isOpen=false');
      const json = await res.json();
      if (json.success) setRegisters(json.registers);
    } catch (err) {
      console.error('Failed to fetch registers:', err);
    }
  };

  const handleOpenShift = async () => {
    if (!selectedRegister || !openingFloat) return;

    setSubmitting(true);
    const success = await openShift(selectedRegister, parseFloat(openingFloat));
    if (success) {
      setShowOpenModal(false);
      setSelectedRegister('');
      setOpeningFloat('');
    }
    setSubmitting(false);
  };

  const handleCloseShift = async () => {
    if (!activeShift || !closingCash) return;

    setSubmitting(true);
    const success = await closeShift(parseFloat(closingCash), closingNotes);
    if (success) {
      setShowCloseModal(false);
      setClosingCash('');
      setClosingNotes('');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs">
        <Clock className="w-3 h-3 animate-spin" />
        <span>Checking shift...</span>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <button
        onClick={() => {
          fetchRegisters();
          setShowOpenModal(true);
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors"
      >
        <Clock className="w-3 h-3" />
        <span>No Active Shift</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowCloseModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors"
      >
        <Calculator className="w-3 h-3" />
        <span>{activeShift.shiftId}</span>
        <span className="text-gray-400">|</span>
        <span>Opened: {formatDateTime(activeShift.startTime)}</span>
      </button>

      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Close Shift"
        size="sm"
        closeOnOverlayClick={false}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Opening Float:</span>
                <span className="font-medium ml-1">{formatCurrency(activeShift.openingFloat)}</span>
              </div>
              <div>
                <span className="text-gray-500">Expected Cash:</span>
                <span className="font-medium ml-1">{formatCurrency(activeShift.expectedCash)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Cash Count (KES)
            </label>
            <input
              type="number"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter counted cash amount"
            />
          </div>

          {closingCash && !isNaN(parseFloat(closingCash)) && (
            <div className={`p-3 rounded-lg border ${parseFloat(closingCash) >= activeShift.expectedCash ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <p className="text-sm font-medium">
                {parseFloat(closingCash) >= activeShift.expectedCash ? 'Over' : 'Short'} by{' '}
                <span className="font-bold">{formatCurrency(Math.abs(parseFloat(closingCash) - activeShift.expectedCash))}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Closing notes..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCloseModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCloseShift}
              disabled={!closingCash || submitting}
              isLoading={submitting}
            >
              Close Shift
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        title="Open New Shift"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Register</label>
            <select
              value={selectedRegister}
              onChange={(e) => setSelectedRegister(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select register...</option>
              {registers.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.registerNumber} - {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Float (KES)</label>
            <input
              type="number"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="10000"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowOpenModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleOpenShift}
              disabled={!selectedRegister || !openingFloat || submitting}
              isLoading={submitting}
            >
              Open Shift
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}