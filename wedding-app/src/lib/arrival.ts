// Arrival welcomes: a notification when a guest reaches Chandigarh, and another
// when they come within 2 km of the resort.
//
// How it stays private: the phone's own operating system watches for the two
// places (geofencing) and the notification is created on the phone. The app
// never reads, stores or sends anyone's location. Each welcome fires once;
// when both have fired the watching is switched off for good.
//
// It is opt-in, and needs "Always" location permission because the phone has
// to notice the arrival while the app is closed. Not available in a browser or
// in Expo Go.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const TASK = 'ka-arrival';
const FIRED_KEY = 'ka.arrival.fired.';

type Place = { id: string; latitude: number; longitude: number; radius: number; title: string; body: string };

const PLACES: Place[] = [
  {
    // Covers the airport, the railway station and the city itself.
    id: 'chandigarh',
    latitude: 30.72,
    longitude: 76.79,
    radius: 12000,
    title: 'Welcome to Chandigarh!',
    body: 'The hills are about two hours away by road. See you very soon.',
  },
  {
    // Storii by ITC Hotels, Akanni Naina Tikkar (coordinates from wedding.json).
    id: 'venue',
    latitude: 30.7971437,
    longitude: 77.1260281,
    radius: 2000,
    title: 'You made it to the hills',
    body: 'Almost at Storii. A welcome drink will be waiting for you.',
  },
];

export type ArrivalStatus = 'on' | 'ask' | 'denied' | 'done' | 'unavailable';

function supported(): boolean {
  return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

async function pending(): Promise<Place[]> {
  const fired = await AsyncStorage.multiGet(PLACES.map((p) => FIRED_KEY + p.id)).catch(() => []);
  const done = new Set(fired.filter(([, v]) => v === '1').map(([k]) => k.slice(FIRED_KEY.length)));
  return PLACES.filter((p) => !done.has(p.id));
}

// Must be defined at module load so the system can wake the app into it.
if (supported()) {
  TaskManager.defineTask<{ eventType: Location.LocationGeofencingEventType; region: Location.LocationRegion }>(TASK, async ({ data, error }) => {
    if (error || !data || data.eventType !== Location.LocationGeofencingEventType.Enter) return;
    const place = PLACES.find((p) => p.id === data.region.identifier);
    if (!place) return;
    if ((await AsyncStorage.getItem(FIRED_KEY + place.id).catch(() => null)) === '1') return;
    await AsyncStorage.setItem(FIRED_KEY + place.id, '1').catch(() => {});
    try {
      const N = await import('expo-notifications');
      await N.scheduleNotificationAsync({
        content: { title: place.title, body: place.body, sound: 'default', data: { screen: 'today' } },
        trigger: null, // straight away
      });
    } catch {
      // no notification permission: nothing to show
    }
    const left = await pending();
    if (left.length === 0) await Location.stopGeofencingAsync(TASK).catch(() => {});
    else await watch(left).catch(() => {});
  });
}

async function watch(places: Place[]) {
  await Location.startGeofencingAsync(
    TASK,
    places.map((p) => ({
      identifier: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      radius: p.radius,
      notifyOnEnter: true,
      notifyOnExit: false,
    })),
  );
}

/** Where things stand, without prompting. Keeps the watch running if already allowed. */
export async function arrivalStatus(): Promise<ArrivalStatus> {
  if (!supported()) return 'unavailable';
  try {
    const left = await pending();
    if (left.length === 0) return 'done';
    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.granted) {
      if (!(await Location.hasStartedGeofencingAsync(TASK).catch(() => false))) await watch(left);
      return 'on';
    }
    return bg.canAskAgain ? 'ask' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Ask for permission and start watching (call from a button, never on launch). */
export async function enableArrival(): Promise<ArrivalStatus> {
  if (!supported()) return 'unavailable';
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return fg.canAskAgain ? 'ask' : 'denied';
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg.granted) return bg.canAskAgain ? 'ask' : 'denied';
    // The welcome arrives as a notification, so make sure those are allowed too.
    const N = await import('expo-notifications');
    const np = await N.getPermissionsAsync();
    if (!np.granted && np.canAskAgain) await N.requestPermissionsAsync();
    const left = await pending();
    if (left.length === 0) return 'done';
    await watch(left);
    return 'on';
  } catch {
    return 'unavailable';
  }
}
