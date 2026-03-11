import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NairobiPOS - Cloud POS System for Kenyan Businesses',
  description: 'Modern cloud-based Point of Sale system designed for small shops, mini-marts, supermarkets, kiosks, and wholesale businesses in Nairobi, Kenya.',
  keywords: 'POS, Point of Sale, Kenya, Nairobi, Retail, Wholesale, M-Pesa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
