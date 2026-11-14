-- ============================================================================
-- Migration: 20261114000000_make_deadline_nullable.sql
-- Description: Make public.orders.deadline nullable now that production uses
--              order_date (tanggal pesanan masuk) instead of deadline.
-- ============================================================================

ALTER TABLE public.orders
  ALTER COLUMN deadline DROP NOT NULL;
