'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Check, X, Loader2, ArrowLeft } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  unavailableFeatures?: string[];
  popular?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'trial',
    name: 'Trial',
    price: 0,
    period: '14 days',
    description: 'Try all features before committing',
    features: [
      'Full access to all features',
      '14 days of use',
      'Unlimited users',
      'All integrations',
      'Customer support',
    ],
    unavailableFeatures: [
      'No persistent storage',
      'Trial ends after 14 days',
    ],
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 199,
    period: 'per year',
    description: 'Best value for growing businesses',
    features: [
      'Full access to all features',
      '1 year of updates',
      'Unlimited users',
      'All integrations',
      'Priority customer support',
      'Data backup & restore',
      'Advanced reporting',
    ],
    popular: true,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: 499,
    period: 'one-time',
    description: 'Own it forever, no recurring fees',
    features: [
      'Full access to all features',
      'Lifetime updates',
      'Unlimited users',
      'All integrations',
      'Premium customer support',
      'Data backup & restore',
      'Advanced reporting',
      'White-label options',
      'Custom integrations',
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [purchasedPlan, setPurchasedPlan] = useState<string | null>(null);

  // Check if user already has a license
  useEffect(() => {
    const storedLicense = localStorage.getItem('pos-license');
    if (storedLicense) {
      try {
        const license = JSON.parse(storedLicense);
        if (license.licenseKey) {
          setPurchasedPlan(license.licenseType || 'annual');
        }
      } catch (e) {
        // Continue
      }
    }
  }, []);

  const handlePurchase = async (planId: string) => {
    if (planId === 'trial') {
      // For trial, redirect to license activation page
      router.push('/license/activate?plan=trial');
    } else {
      // For annual/lifetime, redirect to registration page
      router.push(`/register?plan=${planId}`);
    }
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
            <h1 className="text-xl font-semibold text-slate-900">Pricing Plans</h1>
            <div className="w-20" /> {/* Spacer for alignment */}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-600 rounded-2xl mb-6 overflow-hidden mx-auto">
            <img src="/Gemini_Generated_Image_iikvdoiikvdoiikv.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your Perfect Plan
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Unlock the full potential of your business with our flexible licensing options.
            Start with a free trial or choose a plan that fits your needs.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular
                  ? 'border-2 border-emerald-500 shadow-lg scale-105 z-10'
                  : 'border border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    ${plan.price}
                  </span>
                  <span className="text-slate-500">/{plan.period}</span>
                </div>
                <p className="text-slate-600 mt-2">{plan.description}</p>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                  {plan.unavailableFeatures?.map((feature, index) => (
                    <li key={`unavailable-${index}`} className="flex items-start gap-3">
                      <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-400">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={loading === plan.id || purchasedPlan === plan.id}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {loading === plan.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : purchasedPlan === plan.id ? (
                    'Current Plan'
                  ) : plan.price === 0 ? (
                    'Start Free Trial'
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Frequently Asked Questions
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Can I switch plans later?
              </h4>
              <p className="text-slate-600">
                Yes, you can upgrade or downgrade your plan at any time. 
                Changes will be applied at the start of your next billing cycle.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                What payment methods do you accept?
              </h4>
              <p className="text-slate-600">
                We accept all major credit cards, debit cards, and mobile money 
                for local payments.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Is my data secure?
              </h4>
              <p className="text-slate-600">
                Absolutely. We use industry-standard encryption and security 
                practices to protect your business data.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Can I get a refund?
              </h4>
              <p className="text-slate-600">
                We offer a 30-day money-back guarantee for all paid plans. 
                Contact our support team for assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <p className="text-slate-600">
            Need a custom solution for your organization?{' '}
            <a href="mailto:sales@possystem.com" className="text-emerald-600 hover:underline">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
