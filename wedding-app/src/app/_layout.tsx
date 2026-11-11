import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/lib/arrival'; // registers the arrival-welcome background task at startup
import { flush } from '@/lib/roll';
import { SessionProvider, useSession } from '@/lib/session';
import { colors, fonts } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Screens />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const { ready, guest } = useSession();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Send any photos still on the phone whenever the app opens or comes back to the front.
  useEffect(() => {
    if (!guest) return;
    void flush();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void flush();
    });
    const timer = setInterval(() => void flush(), 45000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [guest]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.displayMedium, fontSize: 22 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.paper },
      }}>
      <Stack.Protected guard={!!guest}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* No swipe-back here: on iPhone it would swallow the left-to-right swipe that replies to a message. */}
        <Stack.Screen name="chat/[channel]" options={{ title: '', gestureEnabled: false }} />
        <Stack.Screen name="quiz" options={{ title: 'The couple quiz' }} />
        <Stack.Screen name="rsvp" options={{ title: 'RSVP' }} />
        <Stack.Screen name="profile" options={{ title: 'Your introduction' }} />
        <Stack.Screen name="places" options={{ title: 'Your table & room' }} />
        <Stack.Screen name="info" options={{ title: 'Good to know' }} />
        <Stack.Screen name="outfits" options={{ title: 'What to wear' }} />
        <Stack.Screen name="docs" options={{ title: 'Travel documents' }} />
        <Stack.Screen name="sos" options={{ title: 'SOS', presentation: 'modal' }} />
        <Stack.Screen name="me" options={{ title: 'You & the wedding', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!guest}>
        <Stack.Screen name="join" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
