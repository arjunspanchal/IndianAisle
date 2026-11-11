import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { People } from '@/components/People';
import { Body, Button, Loading, Notice, ScreenHeader, Title } from '@/components/ui';
import { useSession } from '@/lib/session';
import { api, type Channel } from '@/lib/api';
import { useLive, useLoad } from '@/lib/live';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatWhen } from '@/lib/time';

const SEEN_KEY = 'ka.chat.seen.';

export default function Chat() {
  const { data, error, loading, reload } = useLoad<Channel[]>(() => api.channels(), 30000);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const { isVendor } = useSession();
  // Vendors have their team room only; guests also get the People list.
  const [tab, setTab] = useState<'rooms' | 'people'>('rooms');

  useLive('chat', () => void reload());

  // Which rooms have something new since this phone last opened them.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const keys = (data ?? []).map((c) => SEEN_KEY + c.slug);
        if (keys.length === 0) return;
        const pairs = await AsyncStorage.multiGet(keys).catch(() => []);
        if (!alive) return;
        setSeen(Object.fromEntries(pairs.map(([k, v]) => [k.slice(SEEN_KEY.length), v ?? ''])));
      })();
      return () => {
        alive = false;
      };
    }, [data]),
  );

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader eyebrow="Our favourite people" title={tab === 'people' ? 'People' : 'Chat'} />
      {isVendor ? null : (
        <View style={styles.segments} accessibilityRole="tablist">
          {(['rooms', 'people'] as const).map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => setTab(t)}
              style={[styles.segment, tab === t && styles.segmentOn]}>
              <Feather name={t === 'rooms' ? 'message-circle' : 'users'} size={16} color={tab === t ? colors.white : colors.ink} />
              <Text style={[styles.segmentText, tab === t && { color: colors.white }]}>{t === 'rooms' ? 'Chat rooms' : 'Get to know everyone'}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {tab === 'people' && !isVendor ? (
        <People />
      ) : loading && !data ? (
        <Loading />
      ) : !data ? (
        <Notice
          icon="cloud-off"
          title="Can't load the chat"
          body={error ?? undefined}
          action={<Button label="Try again" variant="quiet" onPress={() => void reload()} />}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
          {data.map((c) => {
            const unread = !!c.last && c.last.created_at > (seen[c.slug] ?? '');
            return (
              <Pressable
                key={c.slug}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}${c.private ? ', private team room' : ''}${unread ? ', new messages' : ''}`}
                onPress={() => router.push({ pathname: '/chat/[channel]', params: { channel: c.slug, name: c.name } })}
                style={({ pressed }) => [styles.room, pressed && { opacity: 0.8 }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.roomHead}>
                    <Title size={24} style={{ flexShrink: 1 }} numberOfLines={1}>
                      {c.name}
                    </Title>
                    {c.private ? <Feather name="lock" size={15} color={colors.olive} /> : null}
                    {unread ? <View style={styles.dot} /> : null}
                  </View>
                  {c.last ? (
                    <Body numberOfLines={2} style={[styles.preview, unread && { color: colors.ink }]}>
                      <Text style={{ fontFamily: fonts.bodyMedium }}>{c.last.by.split(' ')[0]}: </Text>
                      {c.last.body}
                    </Body>
                  ) : (
                    <Body muted numberOfLines={2} style={styles.preview}>
                      {c.blurb}
                    </Body>
                  )}
                  {c.last ? <Text style={styles.when}>{formatWhen(c.last.created_at)}</Text> : null}
                </View>
                <Feather name="chevron-right" size={22} color={colors.muted} />
              </Pressable>
            );
          })}
          <Body muted style={styles.foot}>
            Be kind. Everyone at the wedding can read these.
          </Body>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.moss,
    paddingHorizontal: space.sm,
  },
  segmentOn: { backgroundColor: colors.rose },
  segmentText: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.ink },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md, paddingTop: space.sm },
  room: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
  },
  roomHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.rose },
  preview: { fontSize: 15, lineHeight: 21, color: colors.muted, marginTop: 2 },
  when: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 6 },
  foot: { textAlign: 'center', fontSize: 14, marginTop: space.sm },
});
