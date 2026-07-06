import type { Metadata } from 'next';
import './globals.css';
import { TrainingProvider } from '@/lib/training-context';
import { TutorialProvider } from '@/lib/tutorial-context';
import { AuthProvider } from '@/lib/auth-context';
import { TrainingBanner } from '@/components/ui/TrainingBanner';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { RestrictedActionModal } from '@/components/training/RestrictedActionModal';
import { NotificationManager } from '@/lib/use-notifications';
import { POSAuthModal } from '@/components/pos/POSAuthModal';

export const metadata: Metadata = {
  title: 'POS System',
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
        <AuthProvider>
          <TrainingProvider>
            <TutorialProvider>
              <TrainingBanner />
              <NotificationManager />
              {children}
              <TutorialOverlay />
              <RestrictedActionModal />
              <POSAuthModal />
            </TutorialProvider>
          </TrainingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
