import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { colors, fonts } from '@/lib/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { isVendor } = useSession();
  // Vendors get the programme, updates and their team forum: no guest camera or album.
  const guestOnly = isVendor ? { href: null } : {};
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11.5 },
        sceneStyle: { backgroundColor: colors.paper },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('Today'), tabBarIcon: ({ color, size }) => <Feather name="sun" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: t('Programme'), tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          ...guestOnly,
          title: t('Camera'),
          tabBarIcon: ({ focused }) => (
            <View style={[styles.cameraTab, focused && { backgroundColor: colors.rose }]}>
              <Feather name="camera" color={colors.white} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="album"
        options={{ ...guestOnly, title: t('Album'), tabBarIcon: ({ color, size }) => <Feather name="image" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: t('Chat'), tabBarIcon: ({ color, size }) => <Feather name="message-circle" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  cameraTab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginTop: -14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.card,
  },
});
