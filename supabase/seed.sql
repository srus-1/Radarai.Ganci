-- ============================================================================
-- Seed: supabase/seed.sql
-- Description: Authentic Workshop Demonstration Orders for eganci Production Manager
-- Features: 7 Rich Workshop Orders (ord-101 to ord-107) & Associated Print Files
-- Target Tables: public.orders, public.order_design_files
-- ============================================================================

-- Clean existing data if reseeding
TRUNCATE TABLE public.order_design_files, public.orders RESTART IDENTITY CASCADE;

-- 1. Insert 7 Rich Workshop Orders
INSERT INTO public.orders (
    id, order_number, order_date, deadline, buyer_name, buyer_phone,
    product_name, specs, qty, price_per_pcs, omzet,
    hpp_bahan_baku, hpp_tinta_sablon, hpp_tenaga_kerja, hpp_kemasan, hpp_overhead,
    total_hpp_per_pcs, total_hpp, profit, margin_pct,
    payment_status, dp_amount, remaining_payment,
    process_status, queue_order, notes, created_at, updated_at
) VALUES
(
    'ord-101', 'EG-2026-081', '2026-10-21', '2026-10-24',
    'Komunitas Motor CB Klasik', '081234567890',
    'Ganci Akrilik 2 Sisi 5x5 cm', 'Akrilik Bening 3mm, Sablon 3 Warna + Gantungan Ring Putar Tebal',
    500, 6500.00, 3250000.00,
    1800.00, 600.00, 900.00, 250.00, 250.00,
    3800.00, 1900000.00, 1350000.00, 41.5,
    'DP', 1500000.00, 1750000.00,
    'PROSES_CETAK', 1, 'Prioritas festival weekend ini. Sablon warna emas glitter tajam.',
    '2026-10-21T08:15:00Z', '2026-10-22T14:20:00Z'
),
(
    'ord-102', 'EG-2026-082', '2026-10-21', '2026-10-25',
    'SMA Negeri 1 Prestasi', '085712348899',
    'Pin Peniti & Ganci Buka Tutup', 'Diameter 44mm, Doff Laminasi, Sablon Full Color + Kemasan OPP Seal',
    1200, 3800.00, 4560000.00,
    1100.00, 450.00, 550.00, 150.00, 150.00,
    2400.00, 2880000.00, 1680000.00, 36.8,
    'LUNAS', 4560000.00, 0.00,
    'FINISHING', 2, 'Kirim pakai Gosend instant sebelum jam 12 siang ke sekolah.',
    '2026-10-21T10:30:00Z', '2026-10-22T16:00:00Z'
),
(
    'ord-103', 'EG-2026-083', '2026-10-22', '2026-10-26',
    'Kedai Kopi Senja Abadi', '081399887766',
    'Gantungan Kunci Kayu Grafir & Sablon', 'Kayu Mahoni 4x6 cm, Sablon Hitam Pekat + Gantungan Kulit Sintetis',
    300, 8500.00, 2550000.00,
    2800.00, 700.00, 1100.00, 300.00, 300.00,
    5200.00, 1560000.00, 990000.00, 38.8,
    'BELUM_LUNAS', 0.00, 2550000.00,
    'SETTING_DESAIN', 3, 'Tunggu konfirmasi font di tulisan tagline bawah.',
    '2026-10-22T08:00:00Z', '2026-10-22T08:30:00Z'
),
(
    'ord-104', 'EG-2026-084', '2026-10-22', '2026-10-27',
    'Startup Digital Nusantara', '081122334455',
    'Lanyard Full Printing & ID Card Case', 'Tissue 2cm Printing Sublimasi Bolak Balik + Stopper & Hook Tebal',
    250, 14000.00, 3500000.00,
    4500.00, 1800.00, 1400.00, 400.00, 400.00,
    8500.00, 2125000.00, 1375000.00, 39.3,
    'DP', 2000000.00, 1500000.00,
    'ANTREAN', 4, 'Warna corporate cyan & electric blue harus sesuai kode hex.',
    '2026-10-22T09:00:00Z', '2026-10-22T09:15:00Z'
),
(
    'ord-105', 'EG-2026-085', '2026-10-20', '2026-10-23',
    'Panitia Reuni Akbar Alumni 2012', '081987654321',
    'Kaos Panitia Reuni Akbar Sablon Plastisol', 'Cotton Combed 24s Hitam, Sablon Plastisol 4 Warna Raster Depan Belakang + Hangtag',
    150, 65000.00, 9750000.00,
    32000.00, 6500.00, 5000.00, 1200.00, 1300.00,
    46000.00, 6900000.00, 2850000.00, 29.2,
    'LUNAS', 9750000.00, 0.00,
    'SIAP_KIRIM', 5, 'Packing per lusin polybag dengan silica gel. Pengambilan di workshop hari Kamis.',
    '2026-10-20T09:00:00Z', '2026-10-22T17:30:00Z'
),
(
    'ord-106', 'EG-2026-078', '2026-10-15', '2026-10-19',
    'Event Organizer Gemilang', '087811223344',
    'Ganci Karet / Rubber Custom 3D', 'Karet PVC Lentur 3 Warna Timbul, Ring Gepeng Stainless',
    2000, 4500.00, 9000000.00,
    1500.00, 500.00, 650.00, 200.00, 150.00,
    3000.00, 6000000.00, 3000000.00, 33.3,
    'LUNAS', 9000000.00, 0.00,
    'SELESAI', 6, 'Pesanan telah selesai dan diarsip. Pelanggan puas.',
    '2026-10-15T09:00:00Z', '2026-10-19T14:00:00Z'
),
(
    'ord-107', 'EG-2026-075', '2026-10-10', '2026-10-14',
    'Komunitas Motor CB Klasik', '081234567890',
    'Stiker Cutting Vinyl Sablon', 'Vinyl Maxdecal + Sablon Cat Minyak Tahan Cuaca & Bensin',
    1000, 2500.00, 2500000.00,
    700.00, 350.00, 350.00, 100.00, 100.00,
    1600.00, 1600000.00, 900000.00, 36.0,
    'LUNAS', 2500000.00, 0.00,
    'SELESAI', 7, 'Batch stiker touring tahunan.',
    '2026-10-10T11:00:00Z', '2026-10-14T16:00:00Z'
);

-- 2. Insert Associated Order Design Files (Artwork & Print Layouts)
INSERT INTO public.order_design_files (
    id, order_id, file_name, file_size, file_type, file_url, thumbnail_url, is_ready_to_print, uploaded_at
) VALUES
(
    'df-101-1', 'ord-101', 'Logo_CB_Klasik_Final_Cetak.cdr', 4520000, 'CDR',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    true, '2026-10-21T09:30:00Z'
),
(
    'df-101-2', 'ord-101', 'Mockup_Ganci_Preview.png', 1820000, 'PNG',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    false, '2026-10-21T10:00:00Z'
),
(
    'df-102-1', 'ord-102', 'Pin_Angkatan_2026_HighRes.ai', 8400000, 'AI',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80',
    true, '2026-10-21T11:20:00Z'
),
(
    'df-103-1', 'ord-103', 'Vector_Kedai_Senja_Logo.pdf', 3100000, 'PDF',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80',
    false, '2026-10-22T08:30:00Z'
),
(
    'df-104-1', 'ord-104', 'Layout_Lanyard_DigitalNusantara.psd', 12500000, 'PSD',
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=400&q=80',
    true, '2026-10-22T09:15:00Z'
),
(
    'df-105-1', 'ord-105', 'Separasi_Plastisol_Reuni_Akbar.cdr', 9200000, 'CDR',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80',
    true, '2026-10-20T10:00:00Z'
),
(
    'df-106-1', 'ord-106', 'Cetakan_Moulding_Rubber.ai', 5800000, 'AI',
    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80',
    true, '2026-10-15T10:00:00Z'
),
(
    'df-107-1', 'ord-107', 'Cutting_Stiker_CB_Touring.cdr', 3200000, 'CDR',
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80',
    true, '2026-10-10T12:00:00Z'
);
