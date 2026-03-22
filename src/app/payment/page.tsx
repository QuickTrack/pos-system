'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ArrowLeft, Phone, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') || 'annual';
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const planPrices: Record<string, { name: string; price: number }> = {
    annual: { name: 'Annual Plan', price: 199 },
    lifetime: { name: 'Lifetime Plan', price: 499 },
    trial: { name: 'Trial Plan', price: 0 },
  };

  const currentPlan = planPrices[planId] || planPrices.annual;

  const handleConfirmPayment = async () => {
    if (currentPlan.price === 0) {
      // Free trial - go directly to activation
      router.push('/license/activate?plan=trial');
      return;
    }

    setLoading(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLoading(false);
    setSubmitted(true);
    
    // After 2 seconds, redirect to activation
    setTimeout(() => {
      router.push(`/license/activate?plan=${planId}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <h1 className="text-xl font-semibold text-slate-900">Payment Details</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {!submitted ? (
          <Card className="border-2 border-emerald-500 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Complete Your Payment</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Plan Summary */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Selected Plan:</span>
                  <span className="font-semibold text-slate-900">{currentPlan.name}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-slate-600">Amount:</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    KSH {currentPlan.price.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* M-Pesa Details */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Phone className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Pay with M-Pesa</h3>
                    <p className="text-sm text-slate-500">Instant mobile money payment</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Till Number:</span>
                    <span className="font-mono font-bold text-slate-900 text-lg">649469</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Phone Contact:</span>
                    <span className="font-mono font-bold text-slate-900">0720086614</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600">Amount:</span>
                    <span className="font-bold text-emerald-600 text-xl">
                      KSH {currentPlan.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">How to Pay:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Go to your M-Pesa menu on your phone</li>
                  <li>2. Select "Pay Bill"</li>
                  <li>3. Enter Business Number: <strong>649469</strong></li>
                  <li>4. Enter Account Number: <strong>0720086614</strong></li>
                  <li>5. Enter Amount: <strong>KSH {currentPlan.price.toLocaleString()}</strong></li>
                  <li>6. Confirm payment and enter your PIN</li>
                </ol>
              </div>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 py-3 text-lg"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : currentPlan.price === 0 ? (
                  'Start Free Trial'
                ) : (
                  'I Have Made Payment'
                )}
              </Button>

              <p className="text-center text-sm text-slate-500 mt-4">
                After payment, click the button above to activate your license
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Success State */
          <Card className="border-2 border-emerald-500 shadow-lg">
            <CardContent className="text-center py-12">
              <div className="bg-emerald-100 p-4 rounded-full inline-flex mb-4">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Confirmed!</h2>
              <p className="text-slate-600">
                Your payment has been processed. Redirecting to activation...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}