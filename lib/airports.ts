// Static list of major Indian airports — used to find candidate "nearest"
// airports cheaply (great-circle), then we ask Google Distance Matrix for
// the actual driving distance on a small candidate set (top 3).
//
// Coordinates are public knowledge; no licensing concerns. The IATA code is
// included for the display label ("Chandigarh (IXC)") and so the list is
// trivially sortable when adding new entries.

export type Airport = {
  code: string;       // IATA code, e.g. "IXC"
  name: string;       // City + display name, e.g. "Chandigarh (IXC)"
  lat: number;
  lng: number;
};

export const INDIAN_AIRPORTS: Airport[] = [
  { code: "DEL", name: "Delhi (DEL)", lat: 28.5562, lng: 77.1000 },
  { code: "BOM", name: "Mumbai (BOM)", lat: 19.0896, lng: 72.8656 },
  { code: "BLR", name: "Bengaluru (BLR)", lat: 13.1989, lng: 77.7068 },
  { code: "MAA", name: "Chennai (MAA)", lat: 12.9941, lng: 80.1709 },
  { code: "HYD", name: "Hyderabad (HYD)", lat: 17.2403, lng: 78.4294 },
  { code: "CCU", name: "Kolkata (CCU)", lat: 22.6547, lng: 88.4467 },
  { code: "AMD", name: "Ahmedabad (AMD)", lat: 23.0772, lng: 72.6347 },
  { code: "PNQ", name: "Pune (PNQ)", lat: 18.5821, lng: 73.9197 },
  { code: "GOI", name: "Goa Dabolim (GOI)", lat: 15.3808, lng: 73.8314 },
  { code: "GOX", name: "North Goa Mopa (GOX)", lat: 15.7400, lng: 73.8722 },
  { code: "COK", name: "Kochi (COK)", lat: 10.1520, lng: 76.4019 },
  { code: "TRV", name: "Thiruvananthapuram (TRV)", lat: 8.4823, lng: 76.9201 },
  { code: "JAI", name: "Jaipur (JAI)", lat: 26.8242, lng: 75.8122 },
  { code: "UDR", name: "Udaipur (UDR)", lat: 24.6177, lng: 73.8961 },
  { code: "JDH", name: "Jodhpur (JDH)", lat: 26.2511, lng: 73.0489 },
  { code: "IXC", name: "Chandigarh (IXC)", lat: 30.6735, lng: 76.7885 },
  { code: "DED", name: "Dehradun (DED)", lat: 30.1897, lng: 78.1804 },
  { code: "LKO", name: "Lucknow (LKO)", lat: 26.7606, lng: 80.8893 },
  { code: "VNS", name: "Varanasi (VNS)", lat: 25.4524, lng: 82.8631 },
  { code: "GAU", name: "Guwahati (GAU)", lat: 26.1061, lng: 91.5859 },
  { code: "BHO", name: "Bhopal (BHO)", lat: 23.2875, lng: 77.3374 },
  { code: "IDR", name: "Indore (IDR)", lat: 22.7218, lng: 75.8011 },
  { code: "RPR", name: "Raipur (RPR)", lat: 21.1804, lng: 81.7388 },
  { code: "BBI", name: "Bhubaneswar (BBI)", lat: 20.2444, lng: 85.8178 },
  { code: "VTZ", name: "Visakhapatnam (VTZ)", lat: 17.7212, lng: 83.2245 },
  { code: "TIR", name: "Tirupati (TIR)", lat: 13.6325, lng: 79.5433 },
  { code: "CJB", name: "Coimbatore (CJB)", lat: 11.0297, lng: 77.0432 },
  { code: "IXM", name: "Madurai (IXM)", lat: 9.8347, lng: 78.0934 },
  { code: "TRZ", name: "Tiruchirappalli (TRZ)", lat: 10.7654, lng: 78.7097 },
  { code: "MYQ", name: "Mysuru (MYQ)", lat: 12.2300, lng: 76.6557 },
  { code: "IXJ", name: "Jammu (IXJ)", lat: 32.6890, lng: 74.8374 },
  { code: "SXR", name: "Srinagar (SXR)", lat: 33.9871, lng: 74.7742 },
  { code: "IXL", name: "Leh (IXL)", lat: 34.1359, lng: 77.5466 },
  { code: "ATQ", name: "Amritsar (ATQ)", lat: 31.7096, lng: 74.7973 },
  { code: "IXR", name: "Ranchi (IXR)", lat: 23.3144, lng: 85.3217 },
  { code: "PAT", name: "Patna (PAT)", lat: 25.5913, lng: 85.0880 },
  { code: "NAG", name: "Nagpur (NAG)", lat: 21.0922, lng: 79.0472 },
  { code: "IXB", name: "Bagdogra (IXB)", lat: 26.6812, lng: 88.3286 },
  { code: "BHJ", name: "Bhuj (BHJ)", lat: 23.2877, lng: 69.6700 },
  { code: "RAJ", name: "Rajkot (RAJ)", lat: 22.3092, lng: 70.7795 },
  { code: "BDQ", name: "Vadodara (BDQ)", lat: 22.3362, lng: 73.2263 },
  { code: "STV", name: "Surat (STV)", lat: 21.1141, lng: 72.7411 },
  { code: "IXA", name: "Agartala (IXA)", lat: 23.8870, lng: 91.2401 },
  { code: "AGR", name: "Agra (AGR)", lat: 27.1558, lng: 77.9608 },
  { code: "IXE", name: "Mangaluru (IXE)", lat: 12.9612, lng: 74.8901 },
  { code: "HBX", name: "Hubli (HBX)", lat: 15.3617, lng: 75.0849 },
  { code: "KNU", name: "Kanpur (KNU)", lat: 26.4042, lng: 80.4099 },
  { code: "GAY", name: "Gaya (GAY)", lat: 24.7444, lng: 84.9512 },
];

// Great-circle distance in km (haversine).
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Top-N candidate airports by great-circle distance.
export function nearestAirportCandidates(
  point: { lat: number; lng: number },
  n = 3,
): Airport[] {
  return [...INDIAN_AIRPORTS]
    .map((a) => ({ a, d: haversineKm(point, a) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, n)
    .map((x) => x.a);
}
