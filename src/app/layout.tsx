import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import SetupNoticeBanner from '@/components/shared/SetupNoticeBanner';
import { OrderProvider } from '@/context/OrderContext';
import { SidebarProvider } from '@/context/SidebarContext';
import OrderFormModal from '@/components/order/OrderFormModal';
import OrderDesignDrawer from '@/components/order/OrderDesignDrawer';
import LightboxModal from '@/components/shared/LightboxModal';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mafrend.Order',
  description:
    'Sistem Manajemen Produksi Sablon & Gantungan Kunci Custom, Kalkulasi HPP Otomatis, dan Inspeksi File Cetak',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="antialiased bg-[#ffffff] text-[#37352f] min-h-screen flex font-sans">
        <OrderProvider>
          <SidebarProvider>
            {/* Left Sidebar (Desktop Resizable Rail & Mobile Drawer) */}
            <Sidebar />

            {/* Main App Container */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden bg-[#ffffff]">
              {/* Top Setup Notice Banner when unconfigured */}
              <SetupNoticeBanner />

              {/* Sticky Global Top Header */}
              <TopHeader />

              {/* Page Content View */}
              <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>

            {/* Global Modal & Drawer Portals */}
            <OrderFormModal />
            <OrderDesignDrawer />
            <LightboxModal />
          </SidebarProvider>
        </OrderProvider>
      </body>
    </html>
  );
}
