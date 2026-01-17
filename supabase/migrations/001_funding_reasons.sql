-- =====================================================
-- FUNDING REASONS TABLE MIGRATION
-- =====================================================
-- Run this SQL in your Supabase project's SQL Editor
-- This adds a configurable table for funding reasons
-- =====================================================

-- Create funding_reasons table
CREATE TABLE IF NOT EXISTS funding_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER update_funding_reasons_updated_at
  BEFORE UPDATE ON funding_reasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE funding_reasons ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active reasons (needed for wizard)
CREATE POLICY "Anyone can view active funding reasons"
  ON funding_reasons FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can view all reasons (including inactive)
CREATE POLICY "Admins can view all funding reasons"
  ON funding_reasons FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert new reasons
CREATE POLICY "Admins can insert funding reasons"
  ON funding_reasons FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can update reasons
CREATE POLICY "Admins can update funding reasons"
  ON funding_reasons FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete reasons
CREATE POLICY "Admins can delete funding reasons"
  ON funding_reasons FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Seed default values (matching current hardcoded options)
INSERT INTO funding_reasons (value, label, display_order) VALUES
  ('paying_off_debt', 'Paying Off Debt', 1),
  ('health_issues', 'Health Issues', 2),
  ('unemployed', 'Unemployed', 3),
  ('life_events', 'Life Events', 4),
  ('other', 'Other', 5)
ON CONFLICT (value) DO NOTHING;
