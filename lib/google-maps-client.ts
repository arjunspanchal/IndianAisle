// Browser-side Google Maps loader + helpers used by the property form.
//
// Loads the Maps JS API once per page (idempotent) and exposes typed wrappers
// around the bits we use: Places Autocomplete (in PlacesAutocomplete.tsx) and
// Distance Matrix (here, for nearest-airport driving distance).

import { INDIAN_AIRPORTS, nearestAirportCandidates, type Airport } from "./airports";

type LatLng = { lat: number; lng: number };

type DistanceMatrixElement = {
  status: string;
  distance?: { value: number; text: string };
  duration?: { value: number; text: string };
};

type DistanceMatrixRow = { elements: DistanceMatrixElement[] };

type DistanceMatrixResponse = {
  rows: DistanceMatrixRow[];
  destinationAddresses?: string[];
  originAddresses?: string[];
};

type GoogleMapsNS = {
  maps: {
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        opts: AutocompleteOptions,
      ) => AutocompleteInstance;
    };
    DistanceMatrixService: new () => DistanceMatrixService;
    DistanceMatrixStatus: { OK: string };
    TravelMode: { DRIVING: string };
    UnitSystem: { METRIC: number };
    event: {
      clearInstanceListeners: (instance: unknown) => void;
    };
  };
};

type AutocompleteOptions = {
  fields: string[];
  types?: string[];
  componentRestrictions?: { country: string | string[] };
};

type AutocompleteInstance = {
  addListener: (event: string, cb: () => void) => void;
  getPlace: () => unknown;
};

type DistanceMatrixRequest = {
  origins: Array<LatLng | string>;
  destinations: Array<LatLng | string>;
  travelMode: string;
  unitSystem: number;
};

type DistanceMatrixService = {
  getDistanceMatrix: (
    request: DistanceMatrixRequest,
    cb: (result: DistanceMatrixResponse | null, status: string) => void,
  ) => void;
};

declare global {
  interface Window {
    __gmaps_loader__?: Promise<GoogleMapsNS>;
    google?: GoogleMapsNS;
  }
}

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsNS> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("not in browser"));
  }
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (window.__gmaps_loader__) return window.__gmaps_loader__;

  const promise = new Promise<GoogleMapsNS>((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      libraries: "places",
      v: "weekly",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps?.places) resolve(window.google);
      else reject(new Error("Google Maps loaded but Places library missing"));
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
  window.__gmaps_loader__ = promise;
  return promise;
}

export type NearestAirportResult = {
  airport: Airport;
  distanceKm: number;
  durationMinutes: number;
};

/**
 * Find the nearest Indian airport to a property by:
 *   1. Picking 3 closest airports by great-circle distance (cheap, offline).
 *   2. Asking Google Distance Matrix for driving distance to each.
 *   3. Returning the one with the shortest driving distance.
 *
 * Costs ~$0.005 per call (one Distance Matrix request, 3 elements).
 */
export async function findNearestAirport(
  point: LatLng,
  apiKey: string,
): Promise<NearestAirportResult | null> {
  const candidates = nearestAirportCandidates(point, 3);
  if (candidates.length === 0) return null;

  const g = await loadGoogleMaps(apiKey);
  const service = new g.maps.DistanceMatrixService();

  const response = await new Promise<DistanceMatrixResponse | null>((resolve, reject) => {
    service.getDistanceMatrix(
      {
        origins: [{ lat: point.lat, lng: point.lng }],
        destinations: candidates.map((a) => ({ lat: a.lat, lng: a.lng })),
        travelMode: g.maps.TravelMode.DRIVING,
        unitSystem: g.maps.UnitSystem.METRIC,
      },
      (result, status) => {
        if (status !== g.maps.DistanceMatrixStatus.OK || !result) {
          reject(new Error(`Distance Matrix failed: ${status}`));
        } else {
          resolve(result);
        }
      },
    );
  });

  const elements = response?.rows?.[0]?.elements ?? [];
  let best: NearestAirportResult | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const el = elements[i];
    if (!el || el.status !== "OK" || !el.distance || !el.duration) continue;
    const distanceKm = el.distance.value / 1000;
    const durationMinutes = Math.round(el.duration.value / 60);
    if (!best || distanceKm < best.distanceKm) {
      best = { airport: candidates[i], distanceKm, durationMinutes };
    }
  }

  return best;
}

// Re-exports so callers don't need to dig into airports.ts directly.
export { INDIAN_AIRPORTS };
export type { Airport };
