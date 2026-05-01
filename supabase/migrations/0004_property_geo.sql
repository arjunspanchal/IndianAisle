-- ============================================================================
-- 0004_property_geo: geo coordinates + Google Place ID for properties
-- ============================================================================
-- Adds lat/lng/place_id columns to wedding_properties so the property form
-- can pre-fill venue details from Google Places Autocomplete and link cards
-- straight back to Google Maps.
--
-- Idempotent: safe to re-run.

alter table public.wedding_properties
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists place_id text;
