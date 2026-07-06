'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Store, AlertCircle, Delete, ArrowLeft } from 'lucide-react';

export default function CashierLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      handleSubmit();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setPin(['', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  const handleNumClick = (num: string) => {
    const emptyIndex = pin.findIndex(d => d === '');
    if (emptyIndex !== -1) {
      handlePinChange(emptyIndex, num);
    }
  };

  const handleSubmit = async () => {
    const fullPin = pin.join('');
    
    if (fullPin.length < 4) {
      setError('Please enter complete PIN');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/cashier-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fullPin }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.preserveToken) {
          sessionStorage.setItem('pos-preserve-token', data.preserveToken);
        }
        window.location.assign('/pos');
        return;
      }

      setError(data.error || 'Invalid PIN');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 hover:bg-emerald-700 transition-colors"
          >
            <Store className="w-8 h-8 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Cashier Quick Login</h1>
          <p className="text-gray-500 mt-1">Enter your 4-digit PIN</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className={`bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-3 mb-4 ${shake ? 'animate-shake' : ''}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-center gap-3 mb-6">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => {
                  inputRefs.current[index] = el;
                }}
                type="password"
                value={digit}
                onChange={e => handlePinChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                maxLength={1}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(String(num))}
                disabled={loading}
                className="h-14 text-xl font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="h-14 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Delete className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => handleNumClick('0')}
              disabled={loading}
              className="h-14 text-xl font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || pin.join('').length < 4}
              className="h-14 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Enter
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/login')}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Cashier Quick Login for POS
        </p>
      </div>
    </div>
  );
}