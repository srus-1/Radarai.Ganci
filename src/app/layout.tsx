import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { OrderProvider } from '@/context/OrderContext';
import { SidebarProvider } from '@/context/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';
import SetupNoticeBanner from '@/components/shared/SetupNoticeBanner';
import { ToastProvider } from '@/components/shared/ToastProvider';
import OrderFormModal from '@/components/order/OrderFormModal';
import OrderDesignDrawer from '@/components/order/OrderDesignDrawer';
import LightboxModal from '@/components/shared/LightboxModal';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Radarai.Ganci — Manajemen Produksi & Pesanan Workshop',
  description:
    'Aplikasi manajemen antrean sablon, gantungan kunci, pelunasan piutang, dan pengeluaran bahan baku.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased bg-[var(--bg)] text-[var(--text)] min-h-screen flex font-sans"
      >
        <ToastProvider>
          <OrderProvider>
            <SidebarProvider>
              <a
                href="#page-main-heading"
                className="visually-hidden fixed top-2 left-2 z-50 rounded-lg bg-[var(--surface)] border border-[var(--accent)] px-3 py-2 text-[13px] font-medium text-[var(--accent-ink)] popover-shadow"
              >
                Lewati ke konten utama
              </a>

              <Sidebar />

              <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[var(--bg)]">
                <SetupNoticeBanner />

                <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 pt-4 pb-20 sm:px-6 sm:pt-5 md:pb-8">
                  {children}
                </main>
              </div>

              <OrderFormModal />
              <OrderDesignDrawer />
              <LightboxModal />
            </SidebarProvider>
          </OrderProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
