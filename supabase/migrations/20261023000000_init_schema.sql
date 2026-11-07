-- ============================================================================
-- Migration: 20261023000000_init_schema.sql
-- Description: Core Schema for eganci Screen Printing & Keychain Production Manager
-- Tables: orders, order_design_files
-- Triggers: handle_updated_at
-- Indexes: queue_order, process_status, payment_status, buyer_name, FKs
-- RLS: Enabled for public.orders and public.order_design_files
-- Storage: design-files bucket creation and access policies
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number TEXT NOT NULL UNIQUE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline DATE NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    product_name TEXT NOT NULL,
    specs TEXT NOT NULL DEFAULT '',
    qty INTEGER NOT NULL CHECK (qty > 0),
    price_per_pcs NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (price_per_pcs >= 0),
    omzet NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    -- HPP Breakdown fields (5 core workshop cost components)
    hpp_bahan_baku NUMERIC(15, 2) NOT NULL DEFAULT 0,
    hpp_tinta_sablon NUMERIC(15, 2) NOT NULL DEFAULT 0,
    hpp_tenaga_kerja NUMERIC(15, 2) NOT NULL DEFAULT 0,
    hpp_kemasan NUMERIC(15, 2) NOT NULL DEFAULT 0,
    hpp_overhead NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_hpp_per_pcs NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_hpp NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    -- Financial profit & margin
    profit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    margin_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    
    -- Payment settlement fields
    payment_status TEXT NOT NULL CHECK (payment_status IN ('LUNAS', 'DP', 'BELUM_LUNAS')),
    dp_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (dp_amount >= 0),
    remaining_payment NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    -- Production workflow stage & priority queue
    process_status TEXT NOT NULL CHECK (process_status IN (
        'ANTREAN',
        'SETTING_DESAIN',
        'PROSES_CETAK',
        'FINISHING',
        'SIAP_KIRIM',
        'SELESAI'
    )),
    queue_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    
    -- Audit Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Order Design Files Table (Normalized 1-to-many relationship)
CREATE TABLE IF NOT EXISTS public.order_design_files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_ready_to_print BOOLEAN NOT NULL DEFAULT false,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_queue_order ON public.orders(queue_order ASC);
CREATE INDEX IF NOT EXISTS idx_orders_process_status ON public.orders(process_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_name ON public.orders(buyer_name);
CREATE INDEX IF NOT EXISTS idx_order_design_files_order_id ON public.order_design_files(order_id);

-- 4. Trigger for Automatic updated_at on orders
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Row Level Security (RLS) for Internal Staff App
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_design_files ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated keys full CRUD for internal workshop staff
DROP POLICY IF EXISTS "Staff full access on orders" ON public.orders;
CREATE POLICY "Staff full access on orders"
    ON public.orders
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff full access on order_design_files" ON public.order_design_files;
CREATE POLICY "Staff full access on order_design_files"
    ON public.order_design_files
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Storage Bucket Configuration for Workshop Artwork
-- Create public design-files bucket if storage schema exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'buckets'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'design-files',
            'design-files',
            true,
            52428800, -- 50 MB
            ARRAY[
                'image/png',
                'image/jpeg',
                'image/webp',
                'image/svg+xml',
                'application/pdf',
                'application/postscript',
                'image/vnd.adobe.photoshop',
                'application/octet-stream'
            ]
        )
        ON CONFLICT (id) DO UPDATE SET
            public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types;
    END IF;
END $$;

-- Storage Objects Policies for internal staff
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'objects'
    ) THEN
        DROP POLICY IF EXISTS "Public Read Design Files" ON storage.objects;
        CREATE POLICY "Public Read Design Files"
            ON storage.objects FOR SELECT
            TO anon, authenticated
            USING (bucket_id = 'design-files');

        DROP POLICY IF EXISTS "Staff Insert Design Files" ON storage.objects;
        CREATE POLICY "Staff Insert Design Files"
            ON storage.objects FOR INSERT
            TO anon, authenticated
            WITH CHECK (bucket_id = 'design-files');

        DROP POLICY IF EXISTS "Staff Delete Design Files" ON storage.objects;
        CREATE POLICY "Staff Delete Design Files"
            ON storage.objects FOR DELETE
            TO anon, authenticated
            USING (bucket_id = 'design-files');
    END IF;
END $$;
