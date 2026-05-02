-- 0005_property_airport: nearest airport (auto-derived from Google Maps).
--
-- Adds two columns to wedding_properties so each property can display the
-- nearest major airport along with its Google place_id (for a deep link to
-- Maps directions). The existing `airport_km` column continues to hold the
-- driving distance, written either by the auto-derive flow or manually.
--
-- Idempotent.

alter table public.wedding_properties
  add column if not exists nearest_airport_name text,
  add column if not exists nearest_airport_place_id text;
