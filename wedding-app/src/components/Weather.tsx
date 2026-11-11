import { Feather } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/lib/theme';

// Live weather at the resort (Storii, Naina Tikkar), from Open-Meteo: free, no
// key, and the request carries only the venue's coordinates, nothing about the guest.
const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=30.7971&longitude=77.126' +
  '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min' +
  '&timezone=Asia%2FKolkata&forecast_days=1';
const FRESH_MS = 20 * 60 * 1000;

type Weather = { temp: number; code: number; high: number; low: number; at: number };
type Icon = ComponentProps<typeof Feather>['name'];

let cache: Weather | null = null;
let inflight: Promise<Weather | null> | null = null;
const listeners = new Set<(w: Weather | null) => void>();

async function load(): Promise<Weather | null> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch(URL);
        if (!res.ok) return cache;
        const j = await res.json();
        cache = {
          temp: Math.round(j.current.temperature_2m),
          code: j.current.weather_code,
          high: Math.round(j.daily.temperature_2m_max[0]),
          low: Math.round(j.daily.temperature_2m_min[0]),
          at: Date.now(),
        };
        listeners.forEach((l) => l(cache));
        return cache;
      } catch {
        return cache; // keep showing the last reading when there is no signal
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** WMO weather codes, said plainly. */
function describe(code: number): { label: string; icon: Icon } {
  if (code === 0) return { label: 'Clear', icon: 'sun' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'cloud' };
  if (code === 3) return { label: 'Cloudy', icon: 'cloud' };
  if (code <= 48) return { label: 'Fog', icon: 'cloud' };
  if (code <= 57) return { label: 'Drizzle', icon: 'cloud-drizzle' };
  if (code <= 67) return { label: 'Rain', icon: 'cloud-rain' };
  if (code <= 77) return { label: 'Snow', icon: 'cloud-snow' };
  if (code <= 82) return { label: 'Showers', icon: 'cloud-rain' };
  if (code <= 86) return { label: 'Snow showers', icon: 'cloud-snow' };
  return { label: 'Thunderstorm', icon: 'cloud-lightning' };
}

export function useWeather(): Weather | null {
  const [w, setW] = useState<Weather | null>(cache);
  useEffect(() => {
    listeners.add(setW);
    void load().then(setW);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void load();
    });
    const timer = setInterval(() => void load(), FRESH_MS);
    return () => {
      listeners.delete(setW);
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return w;
}

/** Small "9° Clear" pill for screen headers. Renders nothing until the first reading arrives. */
export function WeatherChip() {
  const w = useWeather();
  if (!w) return null;
  const d = describe(w.code);
  return (
    <View
      style={styles.chip}
      accessible
      accessibilityLabel={`Weather at the resort: ${w.temp} degrees, ${d.label}. High ${w.high}, low ${w.low}.`}>
      <Feather name={d.icon} size={15} color={colors.olive} />
      <Text style={styles.temp}>{w.temp}°</Text>
      <Text style={styles.range}>
        {w.high}° / {w.low}°
      </Text>
    </View>
  );
}

/** Wider line for the Today screen: "At the resort now · 9° Clear · High 14° Low 2°". */
export function WeatherLine() {
  const w = useWeather();
  if (!w) return null;
  const d = describe(w.code);
  return (
    <View style={styles.line} accessible accessibilityLabel={`At the resort now: ${w.temp} degrees, ${d.label}. High ${w.high}, low ${w.low}.`}>
      <Feather name={d.icon} size={17} color={colors.olive} />
      <Text style={styles.lineText}>
        <Text style={styles.lineStrong}>
          {w.temp}° {d.label}
        </Text>{' '}
        at the resort · high {w.high}°, low {w.low}°
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 6,
  },
  temp: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink },
  range: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  line: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  lineText: { fontFamily: fonts.body, fontSize: 14.5, color: colors.muted, flexShrink: 1 },
  lineStrong: { fontFamily: fonts.bodyBold, color: colors.ink },
});
