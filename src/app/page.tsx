'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  TrendingUp, 
  Users, 
  Receipt, 
  Package, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function WelcomePage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animations after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    {
      icon: <Receipt className="w-6 h-6" />,
      title: 'Smart Invoicing',
      description: 'Generate professional invoices and receipts instantly with customizable templates'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Sales Tracking',
      description: 'Monitor your sales performance in real-time with detailed analytics'
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: 'Inventory Management',
      description: 'Track stock levels across multiple branches effortlessly'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Customer Management',
      description: 'Manage customer relationships and track payment history'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Financial Reports',
      description: 'Access comprehensive financial reports and aged receivables'
    },
    {
      icon: <Store className="w-6 h-6" />,
      title: 'Multi-Branch Support',
      description: 'Operate multiple branches from a single dashboard'
    }
  ];

  const benefits = [
    'Cloud-based POS system accessible anywhere',
    'Thermal printer support for receipts',
    'Barcode and QR code scanning',
    'Multiple payment methods',
    'Secure user authentication',
    'Real-time data synchronization'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">NairobiPOS</span>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-emerald-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full opacity-20"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Logo Badge */}
            <div className={`inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100 mb-8 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Cloud POS System</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-emerald-600 font-medium">For Kenyan Businesses</span>
            </div>

            {/* Main Heading */}
            <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Smart Point of Sale
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                Made Simple
              </span>
            </h1>

            {/* Tagline */}
            <p className={`text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Streamline your business operations with a powerful, cloud-based POS system designed for Kenyan retailers. Track sales, manage inventory, and grow your business.
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link href="/register" className="group">
                <Button size="lg" className="text-lg px-8 py-4">
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 bg-white">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className={`flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 transition-all duration-700 delay-900 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Free to Start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Setup in Minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-20 bg-white transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A complete solution for modern retail management, built specifically for the Kenyan market
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-8 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 hover:-translate-y-1"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className={`py-20 bg-gradient-to-br from-emerald-600 to-teal-700 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Choose NairobiPOS?
              </h2>
              <p className="text-xl text-emerald-100 mb-8">
                Built with Kenyan businesses in mind, offering features that matter most to local retailers.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3 text-white text-lg">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              {/* Card Preview */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Store className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Dashboard</div>
                    <div className="text-sm text-gray-500">Sales Overview</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-emerald-600">KSh 125,000</div>
                    <div className="text-sm text-gray-600">Today's Sales</div>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-teal-600">48</div>
                    <div className="text-sm text-gray-600">Transactions</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-amber-600">12</div>
                    <div className="text-sm text-gray-600">Pending Invoices</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-600">156</div>
                    <div className="text-sm text-gray-600">Products</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 bg-gray-50 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join hundreds of Kenyan businesses already using NairobiPOS to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-10 py-4">
                Start Free Today
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-10 py-4 bg-white">
                Sign In to Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">NairobiPOS</span>
            </div>
            <div className="text-sm text-gray-500">
              © 2024 NairobiPOS. Cloud POS for Kenyan Businesses.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
