import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Eyebrow, Loading, Title } from '@/components/ui';
import { api, errorMessage, PHOTO_BUCKET, photoUrl, removePhotoFiles, supabase, type Person, type Side } from '@/lib/api';
import { tell } from '@/lib/dialog';
import { readBytes } from '@/lib/files';
import { t } from '@/lib/i18n';
import { useLoad } from '@/lib/live';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';

const SIDES: { value: Side; label: string }[] = [
  { value: 'kashika', label: `${wedding.first}'s side` },
  { value: 'arjun', label: `${wedding.second}'s side` },
  { value: 'both', label: 'Both of them' },
];

// A guest's own introduction, shown to other guests under People.
export default function Profile() {
  const { data, loading, reload } = useLoad<Person[]>(() => api.people());
  const me = data?.find((p) => p.me) ?? null;
  const [side, setSide] = useState<Side | null>(null);
  const [about, setAbout] = useState('');
  const [city, setCity] = useState('');
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!me || filled) return;
    setFilled(true);
    setSide(me.side);
    setAbout(me.about);
    setCity(me.city);
  }, [me, filled]);

  async function choosePhoto() {
    if (photoBusy) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      if (res.canceled || !res.assets?.[0]) return;
      setPhotoBusy(true);
      const img = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 480 } }], { compress: 0.75, format: SaveFormat.JPEG });
      const { path } = await api.avatarReserve();
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, await readBytes(img.uri), { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (error) throw error;
      const done = await api.avatarConfirm();
      if (done.old_path) void removePhotoFiles([done.old_path]);
      await reload();
    } catch (e) {
      tell(t("That photo didn't upload"), errorMessage(e));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await api.profileSet(side, about, city);
      if (router.canGoBack()) router.back();
      else router.replace('/chat');
    } catch (e) {
      tell(errorMessage(e));
      setBusy(false);
    }
  }

  if (loading && !data) return <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Eyebrow>{t('Say hello')}</Eyebrow>
        <Title size={34} style={{ marginTop: 2 }}>
          {t('Introduce yourself')}
        </Title>
        <Body muted style={{ marginTop: 6 }}>
          {t("Other guests see this under People, so everyone knows who's who before the first dance. All of it is optional.")}
        </Body>

        <Pressable accessibilityRole="button" accessibilityLabel={t('Choose your photo')} onPress={() => void choosePhoto()} style={styles.photoRow}>
          {me?.avatar_path ? (
            <Image source={{ uri: photoUrl(me.avatar_path) }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Feather name="user" size={34} color={colors.olive} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{me?.name}</Text>
            <Text style={styles.link}>{photoBusy ? t('Uploading…') : me?.avatar_path ? t('Change photo') : t('Add a photo')}</Text>
          </View>
        </Pressable>

        <Text style={styles.label}>{t('Whose side are you on?')}</Text>
        <View style={styles.sides}>
          {SIDES.map((s) => {
            const on = side === s.value;
            return (
              <Pressable
                key={s.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setSide(on ? null : s.value)}
                style={[styles.side, on && styles.sideOn]}>
                <Text style={[styles.sideText, on && { color: colors.white }]}>{t(s.label)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>{t('How do you know them?')}</Text>
        <TextInput
          value={about}
          onChangeText={setAbout}
          placeholder={t("e.g. {name}'s cousin, college friend", { name: t(wedding.first) })}
          placeholderTextColor="#9A9C8E"
          multiline
          maxLength={160}
          style={[styles.input, styles.multi]}
          accessibilityLabel={t('How do you know the couple')}
        />

        <Text style={styles.label}>{t('Where are you coming from?')}</Text>
        <TextInput value={city} onChangeText={setCity} placeholder={t('City')} placeholderTextColor="#9A9C8E" maxLength={40} style={styles.input} accessibilityLabel={t('Where are you coming from')} />

        <Button label={t('Save')} onPress={() => void save()} busy={busy} style={{ marginTop: space.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.xxl * 2 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.xl },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.moss },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold },
  name: { fontFamily: fonts.displayMedium, fontSize: 26, color: colors.ink },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.rose, marginTop: 2 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15.5, color: colors.ink, marginTop: space.xl, marginBottom: space.sm },
  sides: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  side: { minHeight: 46, justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.moss },
  sideOn: { backgroundColor: colors.rose },
  sideText: { fontFamily: fonts.bodyMedium, fontSize: 15.5, color: colors.ink },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  multi: { minHeight: 80, paddingTop: space.md, textAlignVertical: 'top' },
});
