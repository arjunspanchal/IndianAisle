import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoGoal } from '@/components/PhotoGoal';
import { SwipeDown } from '@/components/SwipeDown';
import { ZoomImage } from '@/components/ZoomImage';
import { WeatherChip } from '@/components/Weather';
import { Body, Button, Card, IconButton, Loading, Notice, ScreenHeader } from '@/components/ui';
import { api, errorMessage, photoUrl, removePhotoFiles, type Album, type AlbumDay, type Photo, type PhotoGoal as Goal } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { addToAlbum, pickFromPhone } from '@/lib/galleryUpload';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { saveEach, saveToPhone, sharePhotos } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatDayShort, formatReveal, formatTime } from '@/lib/time';

const COLUMNS = 3;
const GAP = 3;
const PAGE = 90;
// Which album photos this phone has already saved, so "save the whole album" never saves one twice.
const SAVED_KEY = 'ka.album.saved';

export default function AlbumScreen() {
  const { width } = useWindowDimensions();
  const { isHost } = useSession();
  const [day, setDay] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  // Hold a photo to start selecting; then tap others to add them.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<string | null>(null);
  const selecting = selected.size > 0;
  // Whose photos to show: the whole shared album, everyone else's, or just this guest's.
  const [who, setWho] = useState<'all' | 'others' | 'mine'>('all');
  const [adding, setAdding] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState<string | null>(null);
  const stopSaving = useRef(false);
  const dayRef = useRef(day);
  dayRef.current = day;

  const { data, error, loading, reload } = useLoad<Album>(async () => {
    const a = await api.album(dayRef.current);
    setPhotos(a.photos);
    setMore(a.photos.length === PAGE);
    return a;
  }, 120000);

  const goal = useLoad<Goal>(() => api.photoGoal(), 120000);

  useLive('album', () => {
    void reload();
    void goal.reload();
  });

  useEffect(() => {
    void reload();
  }, [day, reload]);

  async function loadMore() {
    if (!more || loadingMore || !data?.day) return;
    setLoadingMore(true);
    try {
      const a = await api.album(data.day, photos.length);
      setPhotos((p) => [...p, ...a.photos.filter((n) => !p.some((x) => x.id === n.id))]);
      setMore(a.photos.length === PAGE);
    } catch {
      // try again on the next scroll
    } finally {
      setLoadingMore(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const patch = useCallback((id: string, change: Partial<Photo> | null) => {
    setPhotos((list) => (change === null ? list.filter((p) => p.id !== id) : list.map((p) => (p.id === id ? { ...p, ...change } : p))));
  }, []);

  function developNow() {
    confirm('Develop everything now?', 'All photos taken so far will appear in the album for every guest straight away.', 'Develop', async () => {
      try {
        await api.developNow();
        await reload();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  // Add photos from the phone's own gallery. They join the shared pool straight away.
  async function addFromPhone() {
    if (adding) return;
    try {
      const assets = await pickFromPhone();
      if (assets.length === 0) return;
      setAdding(t('Adding {n} of {total}…', { n: 0, total: assets.length }));
      const { added, error: failed } = await addToAlbum(assets, (n, total) => setAdding(t('Adding {n} of {total}…', { n, total })));
      setDay(null);
      await reload();
      void goal.reload();
      if (failed) tell(added > 0 ? t('{n} added, then it stopped', { n: added }) : t("Those photos didn't upload"), errorMessage(failed));
    } catch (e) {
      tell(t("Those photos didn't upload"), errorMessage(e));
    } finally {
      setAdding(null);
    }
  }

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const shown = who === 'mine' ? photos.filter((p) => p.mine) : who === 'others' ? photos.filter((p) => !p.mine) : photos;
  const chosen = shown.filter((p) => selected.has(p.id));

  async function saveChosen() {
    if (working) return;
    setWorking(t('Saving {done} of {n}…', { done: 0, n: chosen.length }));
    const result = await saveToPhone(chosen, (n) => setWorking(t('Saving {done} of {n}…', { done: n, n: chosen.length })));
    setWorking(null);
    if (result === 'saved') {
      tell(chosen.length === 1 ? t('Saved to your photos') : t('{n} photos saved to your phone', { n: chosen.length }));
      setSelected(new Set());
    } else if (result === 'denied') tell(t('Photos access is off'), t('Allow access to Photos in Settings to save pictures to your phone.'));
    else tell(t("Couldn't save those photos"), t('Check your signal and try again.'));
  }

  async function shareChosen() {
    if (working) return;
    setWorking(t('Getting ready to share…'));
    const ok = await sharePhotos(chosen);
    setWorking(null);
    if (ok) setSelected(new Set());
    else tell(t("Couldn't share those photos"), t('Check your signal and try again.'));
  }

  // Save every photo in the album to this phone: all days, everyone's, skipping any saved before.
  async function saveWholeAlbum() {
    if (savingAll || working) return;
    if (Platform.OS === 'web') {
      tell(t('Open the app on your phone'), t('Saving the whole album works in the phone app.'));
      return;
    }
    setSavingAll(t('Counting the photos…'));
    try {
      const all: Photo[] = [];
      for (const d of (data?.days ?? []).filter((x) => x.ready > 0)) {
        for (let offset = 0; ; offset += PAGE) {
          const page = await api.album(d.day, offset);
          all.push(...page.photos);
          if (page.photos.length < PAGE) break;
        }
      }
      const saved = new Set<string>(JSON.parse((await AsyncStorage.getItem(SAVED_KEY).catch(() => null)) ?? '[]') as string[]);
      const todo = all.filter((p) => !saved.has(p.id));
      setSavingAll(null);
      if (all.length === 0) {
        tell(t('No photos to save yet'));
        return;
      }
      if (todo.length === 0) {
        tell(t('You already have them all'), t('Every photo in the album has been saved to this phone.'));
        return;
      }
      const remember = () => AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...saved])).catch(() => {});
      confirm(
        todo.length === 1 ? t('Save 1 photo to your phone?') : t('Save {n} photos to your phone?', { n: todo.length }),
        t('Every photo in the album you have not saved yet, at full size. Keep the app open while it works. Wi-Fi is best.'),
        t('Save'),
        async () => {
          stopSaving.current = false;
          setSavingAll(t('Saving {done} of {n}…', { done: 0, n: todo.length }));
          const result = await saveEach(
            todo,
            (p, done) => {
              saved.add(p.id);
              setSavingAll(t('Saving {done} of {n}…', { done, n: todo.length }));
              if (done % 10 === 0) void remember();
            },
            () => stopSaving.current,
          );
          await remember();
          setSavingAll(null);
          const got = todo.filter((p) => saved.has(p.id)).length;
          if (result === 'denied') tell(t('Photos access is off'), t('Allow access to Photos in Settings to save pictures to your phone.'));
          else if (result === 'failed') tell(t("Couldn't save the photos"), t('Check your signal and try again. Photos already saved are kept.'));
          else if (result === 'stopped') tell(t('Stopped'), t('{got} of {n} saved. Tap again any time to save the rest.', { got, n: todo.length }));
          else tell(got === todo.length ? t('The whole album is on your phone') : t('{got} of {n} saved', { got, n: todo.length }), got === todo.length ? undefined : t('Tap again to try the rest.'));
        },
      );
    } catch (e) {
      setSavingAll(null);
      tell(errorMessage(e));
    }
  }

  // Remove several at once. Guests can remove their own; the couple can remove any.
  function removeChosen() {
    if (working) return;
    const mine = chosen.filter((p) => p.mine || isHost);
    const skipped = chosen.length - mine.length;
    if (mine.length === 0) {
      tell(t('Those are not yours to remove'), t("You can remove photos you took or added. To flag someone else's, open it and tap the flag."));
      return;
    }
    const title = mine.length === 1 ? t('Remove this photo?') : t('Remove these {n} photos?', { n: mine.length });
    const note =
      (mine.length === 1 ? t('It will disappear from the album for everyone.') : t('They will disappear from the album for everyone.')) +
      (skipped > 0
        ? ' ' +
          (skipped === 1
            ? t("{n} of the ones you picked isn't yours and will stay.", { n: skipped })
            : t("{n} of the ones you picked aren't yours and will stay.", { n: skipped }))
        : '');
    confirm(title, note, t('Remove'), async () => {
      let done = 0;
      let failed = 0;
      for (const p of mine) {
        setWorking(t('Removing {n} of {total}…', { n: done + failed + 1, total: mine.length }));
        try {
          await api.deletePhoto(p.id);
          void removePhotoFiles([p.path, `t/${p.path}`]);
          patch(p.id, null);
          done++;
        } catch {
          failed++;
        }
      }
      setWorking(null);
      setSelected(new Set());
      void goal.reload();
      void reload();
      if (failed > 0) tell(done > 0 ? t('{done} removed, {failed} could not be', { done, failed }) : t("Couldn't remove those photos"), t('Check your signal and try again.'));
    });
  }

  const size = (width - GAP * (COLUMNS - 1)) / COLUMNS;
  const days = data?.days ?? [];
  const developing = days.filter((d) => d.developing > 0);
  const shownDay = data?.day ?? null;

  const header = (
    <View>
      {developing.map((d) => (
        <DevelopingBanner key={d.day} day={d} now={data ? new Date(data.now) : new Date()} />
      ))}
      {isHost && developing.length > 0 ? (
        <Button label="Develop everything now" icon="sunrise" variant="ghost" onPress={developNow} style={{ alignSelf: 'center' }} />
      ) : null}
      {goal.data ? <PhotoGoal goal={goal.data} /> : null}
      <View style={styles.filterRow} accessibilityRole="radiogroup" accessibilityLabel={t('Whose photos to show')}>
        {(
          [
            { key: 'all', label: 'Everyone', icon: 'users' },
            { key: 'others', label: 'Others', icon: 'user-plus' },
            { key: 'mine', label: 'Mine', icon: 'user' },
          ] as const
        ).map((f) => {
          const on = who === f.key;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={f.key === 'all' ? t("Everyone's photos") : f.key === 'others' ? t("Everyone else's photos, without mine") : t('Only my photos')}
              onPress={() => {
                setWho(f.key);
                setSelected(new Set());
              }}
              style={[styles.chip, styles.filterChip, on && styles.chipOn]}>
              <Feather name={f.icon} size={15} color={on ? colors.white : colors.ink} />
              <Text style={[styles.chipText, on && { color: colors.white }]}>{t(f.label)}</Text>
            </Pressable>
          );
        })}
      </View>
      {days.some((d) => d.ready > 0) ? (
        <Button
          label={t('Save the whole album to my phone')}
          icon="download"
          variant="ghost"
          disabled={!!savingAll}
          onPress={() => void saveWholeAlbum()}
          style={{ alignSelf: 'flex-start', marginLeft: space.sm }}
        />
      ) : null}
      {days.some((d) => d.ready > 0) ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {days
            .filter((d) => d.ready > 0)
            .map((d) => {
              const on = d.day === shownDay;
              return (
                <Pressable
                  key={d.day}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setDay(d.day)}
                  style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && { color: colors.white }]}>{formatDayShort(d.day)}</Text>
                  <Text style={[styles.chipCount, on && { color: '#F3DDE4' }]}>{d.ready}</Text>
                </Pressable>
              );
            })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        eyebrow={t("Everyone's photos")}
        title={t('The album')}
        right={
          <View style={{ alignItems: 'flex-end' }}>
          <WeatherChip />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Add photos from your phone')}
            disabled={!!adding}
            onPress={() => void addFromPhone()}
            style={({ pressed }) => [styles.addButton, (pressed || !!adding) && { opacity: 0.6 }]}>
            <Feather name="plus" size={18} color={colors.white} />
            <Text style={styles.addText}>{t('Add')}</Text>
          </Pressable>
          </View>
        }
      />
      {adding ? (
        <View style={styles.selectBar}>
          <Text style={[styles.selectText, { marginLeft: space.md }]}>{adding}</Text>
        </View>
      ) : null}
      {savingAll ? (
        <View style={styles.selectBar}>
          <Text style={[styles.selectText, { marginLeft: space.md }]}>{savingAll}</Text>
          <Button label={t('Stop')} variant="ghost" onPress={() => (stopSaving.current = true)} />
        </View>
      ) : null}
      {selecting ? (
        <View style={styles.selectBar}>
          <IconButton icon="x" label={t('Cancel selection')} onPress={() => setSelected(new Set())} />
          <Text style={styles.selectText}>{working ?? t('{n} selected', { n: selected.size })}</Text>
          <IconButton icon="download" label={t('Save selected to your phone')} onPress={() => void saveChosen()} />
          <IconButton icon="share" label={t('Share selected')} onPress={() => void shareChosen()} />
          <IconButton icon="trash-2" label={t('Remove selected photos')} color={colors.rose} onPress={removeChosen} />
        </View>
      ) : null}
      {loading && !data ? (
        <Loading />
      ) : !data ? (
        <Notice
          icon="cloud-off"
          title={t("Can't open the album")}
          body={error ?? undefined}
          action={<Button label={t('Try again')} variant="quiet" onPress={() => void reload()} />}
        />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(p) => p.id}
          numColumns={COLUMNS}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP, paddingBottom: space.xxl, flexGrow: 1 }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Notice
              icon="image"
              title={developing.length > 0 ? t('In the darkroom') : t('No photos yet')}
              body={
                who === 'mine'
                  ? t("You haven't added any to this day yet.")
                  : who === 'others'
                    ? t('Nobody else has added any to this day yet.')
                    : developing.length > 0
                    ? t('Camera photos stay hidden until they develop. Come back in the morning, or add some from your phone now.')
                    : t('Take the first one with the Camera tab, or tap Add to bring some in from your phone.')
              }
            />
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={t('Photo by {name}, {time}', { name: item.by, time: formatTime(item.taken_at) })}
              accessibilityHint={t('Hold to select several')}
              accessibilityState={{ selected: selected.has(item.id) }}
              delayLongPress={250}
              onLongPress={() => toggle(item.id)}
              onPress={() => (selecting ? toggle(item.id) : setOpen(index))}>
              <Image
                source={{ uri: photoUrl(item.path, true) }}
                style={{ width: size, height: size, backgroundColor: colors.moss }}
                contentFit="cover"
                transition={150}
                recyclingKey={item.id}
              />
              {selecting ? (
                <View style={[StyleSheet.absoluteFill, selected.has(item.id) && styles.picked]}>
                  <View style={[styles.tick, selected.has(item.id) && styles.tickOn]}>
                    {selected.has(item.id) ? <Feather name="check" size={14} color={colors.white} /> : null}
                  </View>
                </View>
              ) : null}
              {item.likes > 0 ? (
                <View style={styles.likePip}>
                  <Feather name="heart" size={10} color={colors.white} />
                  <Text style={styles.likePipText}>{item.likes}</Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}
      {open !== null && shown.length > 0 ? (
        <Viewer photos={shown} start={Math.min(open, shown.length - 1)} isHost={isHost} onClose={() => setOpen(null)} onPatch={patch} onBlocked={() => void reload()} />
      ) : null}
    </View>
  );
}

function DevelopingBanner({ day, now }: { day: AlbumDay; now: Date }) {
  return (
    <Card tone="blush" style={styles.banner}>
      <Feather name="moon" size={20} color={colors.rose} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>
          {day.developing === 1 ? t('{n} photo is developing', { n: day.developing }) : t('{n} photos are developing', { n: day.developing })}
        </Text>
        <Body muted style={{ fontSize: 14.5, lineHeight: 20 }}>
          {t('From {day}. Ready at {time}.', { day: formatDayShort(day.day), time: formatReveal(day.reveal_at, now) })}
        </Body>
      </View>
    </Card>
  );
}

/** Full-screen, swipeable photo viewer with like, save and remove. */
function Viewer({
  photos,
  start,
  isHost,
  onClose,
  onPatch,
  onBlocked,
}: {
  photos: Photo[];
  start: number;
  isHost: boolean;
  onClose: () => void;
  onPatch: (id: string, change: Partial<Photo> | null) => void;
  onBlocked: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [zoomed, setZoomed] = useState(false);
  const [index, setIndex] = useState(start);
  const [saving, setSaving] = useState(false);
  const photo = photos[Math.min(index, photos.length - 1)];

  async function like() {
    const was = { liked: photo.liked, likes: photo.likes };
    onPatch(photo.id, { liked: !was.liked, likes: was.likes + (was.liked ? -1 : 1) });
    try {
      onPatch(photo.id, await api.toggleLike(photo.id));
    } catch {
      onPatch(photo.id, was);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    const result = await saveToPhone([photo]);
    setSaving(false);
    if (result === 'saved') tell(t('Saved to your photos'));
    else if (result === 'denied') tell(t('Photos access is off'), t('Allow access to Photos in Settings to save pictures to your phone.'));
    else tell(t("Couldn't save that photo"), t('Check your signal and try again.'));
  }

  async function share() {
    if (!(await sharePhotos([photo]))) tell(t("Couldn't share that photo"), t('Check your signal and try again.'));
  }

  function remove() {
    confirm(t('Remove this photo?'), t('It will disappear from the album for everyone.'), t('Remove'), async () => {
      try {
        await api.deletePhoto(photo.id);
        void removePhotoFiles([photo.path, `t/${photo.path}`]);
        onPatch(photo.id, null);
        if (photos.length <= 1) onClose();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  function report() {
    confirm(t('Report this photo?'), t('The couple will take a look and can remove it.'), t('Report'), async () => {
      try {
        await api.report('photo', photo.id);
        tell(t('Thank you'), t('The couple will take a look.'));
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  function block() {
    confirm(t('Block {name}?', { name: photo.by }), t("You won't see their photos or messages any more. They won't be told."), t('Block'), async () => {
      try {
        await api.blockAuthor('photo', photo.id);
        onClose();
        onBlocked();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  if (!photo) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SwipeDown onClose={onClose} enabled={!zoomed}>
        <FlatList
          data={photos}
          scrollEnabled={!zoomed}
          keyExtractor={(p) => p.id}
          horizontal
          pagingEnabled
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <ZoomImage
              uri={photoUrl(item.path)}
              placeholder={{ uri: photoUrl(item.path, true) }}
              placeholderContentFit="contain"
              width={width}
              height={height}
              transition={120}
              onZoom={setZoomed}
            />
          )}
        />
        <View style={[styles.viewerTop, { paddingTop: insets.top + 4 }]}>
          <IconButton icon="x" label={t('Close')} color={colors.white} size={26} onPress={onClose} style={styles.viewerChip} />
          <View style={{ flex: 1 }} />
          {!photo.mine ? (
            <>
              <IconButton icon="flag" label={t('Report this photo')} color={colors.white} size={20} onPress={report} style={styles.viewerChip} />
              <IconButton icon="slash" label={t('Block {name}', { name: photo.by })} color={colors.white} size={20} onPress={block} style={styles.viewerChip} />
            </>
          ) : null}
          {photo.mine || isHost ? <IconButton icon="trash-2" label={t('Remove photo')} color={colors.white} onPress={remove} style={styles.viewerChip} /> : null}
        </View>
        <View style={[styles.viewerBottom, { paddingBottom: insets.bottom + space.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.viewerBy}>{photo.mine ? t('You') : photo.by}</Text>
            <Text style={styles.viewerWhen}>{formatTime(photo.taken_at)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photo.liked ? t('Unlike') : t('Like')}
            accessibilityState={{ selected: photo.liked }}
            onPress={like}
            hitSlop={8}
            style={styles.viewerAction}>
            <Feather name="heart" size={24} color={photo.liked ? '#F08AA8' : colors.white} />
            <Text style={styles.viewerCount}>{photo.likes > 0 ? photo.likes : ''}</Text>
          </Pressable>
          <IconButton icon={saving ? 'loader' : 'download'} label={t('Save to your phone')} color={colors.white} size={24} onPress={() => void save()} />
          <IconButton icon="share" label={t('Share this photo')} color={colors.white} size={24} onPress={() => void share()} />
        </View>
      </SwipeDown>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: space.lg, gap: space.sm, paddingVertical: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.moss,
  },
  chipOn: { backgroundColor: colors.rose },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  chipCount: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginBottom: space.sm },
  bannerTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.rose,
    marginBottom: 4,
  },
  addText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  filterChip: { minHeight: 44, paddingHorizontal: space.md, gap: 6 },
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: space.sm,
    backgroundColor: colors.moss,
    minHeight: 52,
  },
  selectText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginLeft: 4 },
  picked: { backgroundColor: 'rgba(170,78,109,0.28)' },
  tick: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: 'rgba(30,34,24,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { backgroundColor: colors.rose },
  likePip: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(30,34,24,0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  likePipText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.white },
  viewer: { flex: 1, backgroundColor: '#12150F' },
  // Dark strip behind the top controls so they stay visible over any photo.
  viewerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    backgroundColor: 'rgba(18,21,15,0.62)',
  },
  // Each control also gets its own dark disc.
  viewerChip: { backgroundColor: 'rgba(18,21,15,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  viewerBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: 'rgba(18,21,15,0.55)',
  },
  viewerBy: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.white },
  viewerWhen: { fontFamily: fonts.body, fontSize: 13.5, color: '#C9CDBD' },
  viewerAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, minWidth: 44, justifyContent: 'center' },
  viewerCount: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.white, minWidth: 10 },
});
