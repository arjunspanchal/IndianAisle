"use client";

import { useEffect, useId, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-client";

export type PlacePick = {
  name?: string;
  address?: string;
  location?: string;
  website?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

type Props = {
  onSelect: (pick: PlacePick) => void;
  apiKey: string | undefined;
  placeholder?: string;
  country?: string; // ISO 3166-1 alpha-2; default "in"
};

type GooglePlace = {
  name?: string;
  formatted_address?: string;
  website?: string;
  international_phone_number?: string;
  place_id?: string;
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
  geometry?: { location?: { lat: () => number; lng: () => number } };
};

function pickCity(p: GooglePlace): string | undefined {
  const comps = p.address_components ?? [];
  const get = (type: string) => comps.find((c) => c.types.includes(type))?.long_name;
  const city = get("locality") ?? get("postal_town") ?? get("administrative_area_level_2");
  const region = get("administrative_area_level_1");
  if (city && region && city !== region) return `${city}, ${region}`;
  return city ?? region;
}

export default function PlacesAutocomplete({
  onSelect,
  apiKey,
  placeholder = "Search venues on Google…",
  country = "in",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const acRef = useRef<{ addListener: (e: string, cb: () => void) => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((g) => {
        if (cancelled || !inputRef.current) return;
        const ac = new g.maps.places.Autocomplete(inputRef.current, {
          fields: [
            "name",
            "formatted_address",
            "address_components",
            "website",
            "international_phone_number",
            "place_id",
            "geometry.location",
          ],
          types: ["establishment"],
          componentRestrictions: { country },
        });
        ac.addListener("place_changed", () => {
          const p = ac.getPlace() as GooglePlace;
          const lat = p.geometry?.location?.lat();
          const lng = p.geometry?.location?.lng();
          onSelect({
            name: p.name,
            address: p.formatted_address,
            location: pickCity(p),
            website: p.website,
            phone: p.international_phone_number,
            placeId: p.place_id,
            lat: typeof lat === "number" ? lat : undefined,
            lng: typeof lng === "number" ? lng : undefined,
          });
          if (inputRef.current) inputRef.current.value = "";
        });
        acRef.current = ac;
        setReady(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      if (acRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(acRef.current);
      }
      acRef.current = null;
    };
  }, [apiKey, country, onSelect]);

  if (!apiKey) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-500 dark:bg-stone-900/40 dark:border-stone-700 dark:text-stone-400">
        Set <code className="rounded bg-white px-1 py-0.5 dark:bg-stone-900">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to enable Google search for venues.
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Find venue with Google
      </label>
      <input
        id={id}
        ref={inputRef}
        type="text"
        className="text-input"
        placeholder={ready ? placeholder : "Loading Google Places…"}
        disabled={!ready && !error}
        autoComplete="off"
      />
      {error && (
        <p className="mt-1 text-xs text-rose-600">Google Maps failed to load: {error}</p>
      )}
      {ready && !error && (
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Pick a result to auto-fill name, address, city, website, and phone.
        </p>
      )}
    </div>
  );
}
