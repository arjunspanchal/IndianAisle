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
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/lib/arrival'; // registers the arrival-welcome background task at startup
import { flush } from '@/lib/roll';
import { loadLang, t, useLang } from '@/lib/i18n';
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

  // The saved language is read before anything is drawn, so the app never flashes in the wrong one.
  const [langReady, setLangReady] = useState(false);
  useEffect(() => {
    void loadLang().then(() => setLangReady(true));
  }, []);

  if ((!fontsLoaded && !fontError) || !langReady) return null;

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
  // Changing language redraws every screen from the top (the key below), so nothing is left in the old one.
  const lang = useLang();

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
      key={lang}
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
        <Stack.Screen name="quiz" options={{ title: t('The couple quiz') }} />
        <Stack.Screen name="rsvp" options={{ title: t('RSVP') }} />
        <Stack.Screen name="profile" options={{ title: t('Your introduction') }} />
        <Stack.Screen name="places" options={{ title: t('Your table & room') }} />
        <Stack.Screen name="info" options={{ title: t('Good to know') }} />
        <Stack.Screen name="outfits" options={{ title: t('What to wear') }} />
        {/* Every screen a guest reaches after joining must be listed inside this guard.
            A screen file that is not listed here is open to people who have not joined,
            and the app can even start on it. Each of these sets its own title. */}
        <Stack.Screen name="ride" />
        <Stack.Screen name="wishes" />
        <Stack.Screen name="polls" />
        <Stack.Screen name="challenges" />
        <Stack.Screen name="menus" />
        <Stack.Screen name="map" />
        <Stack.Screen name="docs" options={{ title: t('Travel documents') }} />
        <Stack.Screen name="sos" options={{ title: t('SOS'), presentation: 'modal' }} />
        <Stack.Screen name="me" options={{ title: t('You & the wedding'), presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!guest}>
        <Stack.Screen name="join" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
