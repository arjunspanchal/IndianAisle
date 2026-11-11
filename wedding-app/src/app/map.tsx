import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeDown } from '@/components/SwipeDown';
import { ZoomImage } from '@/components/ZoomImage';
import { Accent, Body, Button, Card, Eyebrow, GoldRule, IconButton, Loading, Notice, Title } from '@/components/ui';
import { api, errorMessage, PHOTO_BUCKET, photoUrl, removePhotoFiles, supabase, type Home } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { readBytes } from '@/lib/files';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';

const LONG_EDGE = 2400; // sharp enough to zoom into, small enough for hill signal

type MapInfo = { path: string | null; width: number | null; height: number | null };

// The resort map: a picture the hosts upload, which anyone can open and zoom,
// and a short "where is it" for each event.
export default function ResortMap() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isHost } = useSession();
  const map = useLoad<MapInfo>(() => api.map());
  const home = useLoad<Home>(() => api.home());
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [uploading, setUploading] = useState(false);

  useLive('updates', () => {
    void map.reload();
    void home.reload();
  });

  async function refresh() {
    setRefreshing(true);
    await Promise.all([map.reload(), home.reload()]);
    setRefreshing(false);
  }

  async function upload() {
    if (uploading) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (res.canceled || !res.assets?.[0]) return;
      setUploading(true);
      const a = res.assets[0];
      const landscape = a.width >= a.height;
      const img = await manipulateAsync(
        a.uri,
        [{ resize: landscape ? { width: Math.min(LONG_EDGE, a.width) } : { height: Math.min(LONG_EDGE, a.height) } }],
        { compress: 0.82, format: SaveFormat.JPEG },
      );
      const { path } = await api.mapReserve();
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, await readBytes(img.uri), { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (error) throw error;
      const done = await api.mapConfirm(img.width, img.height);
      if (done.old_path) void removePhotoFiles([done.old_path]);
      await map.reload();
    } catch (e) {
      tell(t("The map didn't upload"), errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    confirm(t('Remove the map?'), t('Guests will no longer see it.'), t('Remove'), async () => {
      try {
        const done = await api.mapClear();
        if (done.old_path) void removePhotoFiles([done.old_path]);
        await map.reload();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  if ((map.loading && !map.data) || (home.loading && !home.data)) return <Loading />;
  if (!map.data || !home.data) {
    return (
      <Notice
        icon="cloud-off"
        title={t("Can't load the map")}
        body={map.error ?? home.error ?? undefined}
        action={<Button label={t('Try again')} variant="quiet" onPress={() => void refresh()} />}
      />
    );
  }

  const path = map.data.path;
  const boxW = width - space.lg * 2;
  const ratio = map.data.width && map.data.height ? map.data.height / map.data.width : 0.75;
  const places = home.data.events.filter((e) => e.location);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <Stack.Screen options={{ title: t('Resort map') }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
        <Eyebrow>{t('Finding your way')}</Eyebrow>
        <Title size={34} style={{ marginTop: 2 }}>
          {t('Where everything is')}
        </Title>
        <Accent style={{ fontSize: 19, marginTop: 4 }}>{wedding.venue}</Accent>

        {path ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={t('Resort map. Tap to open it full screen and zoom.')}
            onPress={() => setOpen(true)}
            style={styles.mapBox}>
            <Image source={{ uri: photoUrl(path) }} style={{ width: boxW, height: Math.round(boxW * ratio) }} contentFit="cover" transition={150} />
            <View style={styles.zoomHint}>
              <Feather name="maximize-2" size={14} color={colors.white} />
              <Text style={styles.zoomHintText}>{t('Tap to zoom')}</Text>
            </View>
          </Pressable>
        ) : (
          <Card tone="sage" style={{ marginTop: space.lg }}>
            <Body muted>{t('The resort map will appear here once it is shared.')}</Body>
          </Card>
        )}

        {isHost ? (
          <View style={styles.hostRow}>
            <Button label={path ? t('Replace the map') : t('Upload the map')} icon="upload" variant="quiet" busy={uploading} onPress={() => void upload()} />
            {path ? <Button label={t('Remove')} variant="ghost" onPress={remove} /> : null}
          </View>
        ) : null}

        {places.length > 0 ? (
          <>
            <View style={styles.section}>
              <Eyebrow>{t('Where each event is')}</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>
            {places.map((e) => (
              <View key={e.id} style={styles.place}>
                <Text style={styles.placeEvent}>{t(e.title)}</Text>
                <Text style={styles.placeWhere}>{e.location}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Button
          label={t('Open the resort in Maps')}
          icon="map-pin"
          variant="quiet"
          onPress={() => void Linking.openURL(wedding.mapsUrl)}
          style={{ alignSelf: 'flex-start', marginTop: space.xl }}
        />

        {isHost ? <PlacesEditor events={home.data.events} onSaved={() => void home.reload()} /> : null}
      </ScrollView>

      {open && path ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
          <SwipeDown onClose={() => setOpen(false)} enabled={!zoomed}>
            <ZoomImage uri={photoUrl(path)} width={width} height={height} transition={120} onZoom={setZoomed} />
            <View style={[styles.viewerTop, { paddingTop: insets.top + 4 }]}>
              <IconButton icon="x" label={t('Close')} color={colors.white} size={26} onPress={() => setOpen(false)} style={styles.viewerChip} />
              <Text style={styles.viewerHint}>{t('Pinch or double-tap to zoom')}</Text>
            </View>
          </SwipeDown>
        </Modal>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Hosts: a few words for where each event is held. */
function PlacesEditor({ events, onSaved }: { events: Home['events']; onSaved: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(Object.fromEntries(events.map((e) => [e.id, e.location ?? ''])));
  }, [events]);

  const changed = events.filter((e) => (draft[e.id] ?? '').trim() !== (e.location ?? ''));

  async function save() {
    setBusy(true);
    try {
      for (const e of changed) await api.setLocation(e.id, draft[e.id] ?? '');
      onSaved();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginTop: space.xl }}>
      <Eyebrow>{t('Set where each event is held')}</Eyebrow>
      <Body muted style={{ fontSize: 14.5, marginTop: 4, marginBottom: space.sm }}>
        {t('Only you see this. A few words is enough. Leave a box empty to show nothing.')}
      </Body>
      {events.map((e) => (
        <View key={e.id} style={styles.editRow}>
          <Text style={styles.editEvent} numberOfLines={2}>
            {e.title}
            <Text style={styles.editWhen}>{`  ${e.time_label}`}</Text>
          </Text>
          <TextInput
            value={draft[e.id] ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, [e.id]: v }))}
            placeholder={t('e.g. Garden lawn')}
            placeholderTextColor="#9A9C8E"
            maxLength={80}
            style={styles.input}
            accessibilityLabel={t('Where {event} is held', { event: e.title })}
          />
        </View>
      ))}
      <Button
        label={changed.length > 0 ? t('Save {n} changes', { n: changed.length }) : t('Nothing to save')}
        busy={busy}
        disabled={changed.length === 0}
        onPress={() => void save()}
        style={{ marginTop: space.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl },
  mapBox: { marginTop: space.lg, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.moss },
  zoomHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(18,21,15,0.72)',
  },
  zoomHintText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.white },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  place: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  placeEvent: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.ink },
  placeWhere: { fontFamily: fonts.body, fontSize: 16, color: colors.muted, marginTop: 2 },
  editRow: { marginTop: space.sm },
  editEvent: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, marginBottom: 4 },
  editWhen: { fontFamily: fonts.body, color: colors.muted },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 16.5,
    color: colors.ink,
  },
  viewerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    backgroundColor: 'rgba(18,21,15,0.62)',
  },
  viewerChip: { backgroundColor: 'rgba(18,21,15,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  viewerHint: { fontFamily: fonts.body, fontSize: 14, color: '#E3E6D8' },
});
