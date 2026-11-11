// Push notifications: the couple's live updates, and "the photos are ready".
//
// Only real installed builds can receive push. In a browser, in Expo Go, or in
// a build with no EAS project id, everything here quietly reports "unavailable".

import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { api } from './api';

export type PushStatus = 'on' | 'ask' | 'denied' | 'unavailable';

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

function supported(): boolean {
  return (
    Platform.OS !== 'web' &&
    Device.isDevice &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    projectId() !== null
  );
}

let prepared = false;

async function notifications() {
  const N = await import('expo-notifications');
  if (!prepared) {
    prepared = true;
    // Show the banner even when the app is open: an update is worth interrupting for.
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'Wedding updates',
        importance: N.AndroidImportance.HIGH,
      });
    }
    // Tapping a notification opens the screen it is about.
    N.addNotificationResponseReceivedListener((res) => {
      const screen = (res.notification.request.content.data as { screen?: string } | null)?.screen;
      if (screen === 'album') router.navigate('/album');
      else router.navigate('/');
    });
  }
  return N;
}

async function register(N: Awaited<ReturnType<typeof notifications>>) {
  const token = (await N.getExpoPushTokenAsync({ projectId: projectId()! })).data;
  await api.registerPush(token, Platform.OS);
}

/** Where things stand, without prompting. Re-registers this phone if already allowed. */
export async function pushStatus(): Promise<PushStatus> {
  if (!supported()) return 'unavailable';
  try {
    const N = await notifications();
    const perm = await N.getPermissionsAsync();
    if (perm.granted) {
      await register(N).catch(() => {});
      return 'on';
    }
    return perm.canAskAgain ? 'ask' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Show the system prompt (call from a button, never on launch). */
export async function enablePush(): Promise<PushStatus> {
  if (!supported()) return 'unavailable';
  try {
    const N = await notifications();
    const perm = await N.requestPermissionsAsync();
    if (!perm.granted) return perm.canAskAgain ? 'ask' : 'denied';
    await register(N);
    return 'on';
  } catch {
    return 'unavailable';
  }
}
