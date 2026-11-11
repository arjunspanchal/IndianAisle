import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Loading, Notice } from '@/components/ui';
import { api, photoUrl, type Person } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useLoad } from '@/lib/live';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';

const SIDE_LABEL = { kashika: `${wedding.first}'s side`, arjun: `${wedding.second}'s side`, both: 'Both sides' } as const;

/** Everyone who has joined, with the short introduction each has written. */
export function People() {
  const { data, error, loading, reload } = useLoad<Person[]>(() => api.people(), 60000);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  if (loading && !data) return <Loading />;
  if (!data) return <Notice icon="cloud-off" title={t("Can't load the guest list")} body={error ?? undefined} action={<Button label={t('Try again')} variant="quiet" onPress={() => void reload()} />} />;

  const q = query.trim().toLowerCase();
  const shown = q ? data.filter((p) => `${p.name} ${p.about} ${p.city}`.toLowerCase().includes(q)) : data;
  const me = data.find((p) => p.me);
  const introduced = !!me && (me.about !== '' || me.side !== null || me.avatar_path !== null);

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
      {!introduced ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={styles.nudge}>
          <Feather name="smile" size={20} color={colors.rose} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nudgeTitle}>{t('Introduce yourself')}</Text>
            <Body muted style={styles.small}>
              {t('Add a photo and how you know the couple, so people can put a face to your name.')}
            </Body>
          </View>
          <Feather name="chevron-right" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('Search by name or city')}
        placeholderTextColor="#9A9C8E"
        autoCorrect={false}
        style={styles.search}
        accessibilityLabel={t('Search people')}
      />

      {shown.map((p, i) => (
        <Pressable
          key={`${p.name}-${i}`}
          accessibilityRole={p.me ? 'button' : 'text'}
          accessibilityLabel={`${p.name}${p.me ? t(', you. Edit your introduction') : ''}`}
          disabled={!p.me}
          onPress={() => router.push('/profile')}
          style={styles.person}>
          {p.avatar_path ? (
            <Image source={{ uri: photoUrl(p.avatar_path) }} style={styles.avatar} contentFit="cover" transition={120} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.initial}>{p.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {p.name}
              {p.me ? <Text style={styles.you}>{`  ${t('(you)')}`}</Text> : null}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[p.host ? t('The couple') : p.side ? t(SIDE_LABEL[p.side]) : null, p.city || null].filter(Boolean).join(' · ') || t('Guest')}
            </Text>
            {p.about ? <Body style={styles.about}>{p.about}</Body> : null}
          </View>
          {p.me ? <Feather name="edit-2" size={16} color={colors.muted} /> : null}
        </Pressable>
      ))}
      {shown.length === 0 ? <Body muted>{t('No one by that name yet.')}</Body> : null}
      <Body muted style={styles.foot}>
        {data.length === 1 ? t('{n} person has joined so far.', { n: data.length }) : t('{n} people have joined so far.', { n: data.length })}
      </Body>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, paddingTop: space.sm, gap: space.sm },
  small: { fontSize: 14.5, lineHeight: 20 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.blush, borderRadius: radius.md, padding: space.lg },
  nudgeTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  search: {
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    fontFamily: fonts.body,
    fontSize: 16.5,
    color: colors.ink,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.moss },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.displayMedium, fontSize: 26, color: colors.ink },
  name: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.ink },
  you: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  meta: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.olive, marginTop: 1 },
  about: { fontSize: 15, lineHeight: 21, marginTop: 3 },
  foot: { textAlign: 'center', fontSize: 14, marginTop: space.sm },
});
