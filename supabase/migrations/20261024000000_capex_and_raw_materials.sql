-- ============================================================================
-- Migration: 20261024000000_capex_and_raw_materials.sql
-- Description: Schema for Capex (Capital Expenditure) and Recurring Raw Materials
-- Tables: capex_entries, raw_material_entries
-- Triggers: handle_updated_at on both tables
-- Indexes: entry_date, category, supplier
-- RLS: Enabled with staff full access policies for anon, authenticated
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Capex Entries Table (Capital Expenditure / Belanja Modal)
CREATE TABLE IF NOT EXISTS public.capex_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Lainnya',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Raw Material Entries Table (Recurring Workshop Materials)
CREATE TABLE IF NOT EXISTS public.raw_material_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    material_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Bahan Baku',
    supplier TEXT NOT NULL DEFAULT '',
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'pcs',
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_capex_entry_date ON public.capex_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_capex_category ON public.capex_entries(category);

CREATE INDEX IF NOT EXISTS idx_raw_materials_entry_date ON public.raw_material_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_raw_materials_supplier ON public.raw_material_entries(supplier);
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON public.raw_material_entries(category);

-- 4. Triggers for Automatic updated_at
DROP TRIGGER IF EXISTS trigger_capex_updated_at ON public.capex_entries;
CREATE TRIGGER trigger_capex_updated_at
    BEFORE UPDATE ON public.capex_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_raw_materials_updated_at ON public.raw_material_entries;
CREATE TRIGGER trigger_raw_materials_updated_at
    BEFORE UPDATE ON public.raw_material_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Row Level Security (RLS) for Internal Staff App
ALTER TABLE public.capex_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access on capex_entries" ON public.capex_entries;
CREATE POLICY "Staff full access on capex_entries"
    ON public.capex_entries
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff full access on raw_material_entries" ON public.raw_material_entries;
CREATE POLICY "Staff full access on raw_material_entries"
    ON public.raw_material_entries
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
