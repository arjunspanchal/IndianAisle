import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
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
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeDown } from '@/components/SwipeDown';
import { Accent, Body, Button, Card, Eyebrow, GoldRule, IconButton, Loading, Notice, Title } from '@/components/ui';
import { ZoomImage } from '@/components/ZoomImage';
import { api, errorMessage, photoUrl, type Challenge, type ChallengePhoto, type Challenges, type MyPhoto } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { addToAlbum, pickFromPhone } from '@/lib/galleryUpload';
import { closeUp, t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatDayShort, formatTime, istDayKey } from '@/lib/time';

const COLUMNS = 3;
const GAP = 4;
const MAX_TITLE = 120;
// Gold, silver, bronze for 1st, 2nd and 3rd, as on the album's photo board.
const MEDALS = ['#B89451', '#9BA0A6', '#B0815A'];

function answered(n: number): string {
  if (n <= 0) return t('No one has answered yet.');
  if (n === 1) return t('1 guest has answered');
  return t('{n} guests have answered', { n });
}

// Photo challenges: the hosts set prompts, and each guest answers a prompt with
// one of their own photos from the shared album.
export default function ChallengesScreen() {
  const { isHost } = useSession();
  const { data, error, loading, reload } = useLoad<Challenges>(() => api.challenges(), 120000);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useLive('album', () => void reload());

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const header = <Stack.Screen options={{ title: t('Photo challenges') }} />;

  if (loading && !data) {
    return (
      <>
        {header}
        <Loading />
      </>
    );
  }
  if (!data) {
    return (
      <>
        {header}
        <Notice
          icon="cloud-off"
          title={t("Can't load the photo challenges")}
          body={error ? t(error) : undefined}
          action={<Button label={t('Try again')} variant="quiet" onPress={() => void reload()} />}
        />
      </>
    );
  }

  const total = data.challenges.length;
  const done = Math.min(data.done, total);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const open = openId ? data.challenges.find((c) => c.id === openId) : undefined;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
        <Eyebrow>{t('A little game')}</Eyebrow>
        <Title size={34} style={{ marginTop: 2 }}>
          {t('Photo challenges')}
        </Title>

        {total > 0 ? (
          <View
            accessible
            accessibilityLabel={t('You have done {done} of {total} challenges', { done, total })}
            style={{ marginTop: 4 }}>
            <Accent style={{ fontSize: 21 }}>
              {done >= total ? t('You have done all {total}. Lovely!', { total }) : t('You have done {done} of {total}.', { done, total })}
            </Accent>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }, done >= total && { backgroundColor: colors.gold }]} />
            </View>
            <Body muted style={{ marginTop: space.md }}>
              {t('Answer each challenge with one of your own photos from the shared album.')}
            </Body>
          </View>
        ) : (
          <Card tone="blush" style={styles.empty}>
            <Feather name="camera" size={20} color={colors.rose} style={{ marginTop: 2 }} />
            <Body style={{ flex: 1 }}>
              {isHost
                ? t('No challenges yet. Add the first one below.')
                : t('No photo challenges yet. They will appear here when Kashika & Arjun add them.')}
            </Body>
          </Card>
        )}

        {data.board.length > 0 ? <Board board={data.board} /> : null}

        {data.challenges.map((c) => (
          <ChallengeCard key={c.id} challenge={c} isHost={isHost} onOpen={() => setOpenId(c.id)} onChanged={reload} />
        ))}

        {isHost ? <AddChallenge onAdded={reload} /> : null}
      </ScrollView>

      {open ? <Detail challenge={open} onClose={() => setOpenId(null)} onChanged={reload} /> : null}
    </KeyboardAvoidingView>
  );
}

// ───── the board ─────

function Board({ board }: { board: Challenges['board'] }) {
  const places = [t('1st place'), t('2nd place'), t('3rd place')];
  return (
    <View style={styles.board}>
      <Text style={[styles.boardTitle, closeUp()]}>{t('Most challenges done')}</Text>
      {board.map((b, i) => (
        <View key={`${b.name}-${i}`} style={styles.boardRow}>
          {i < 3 ? (
            <View style={[styles.medal, { backgroundColor: MEDALS[i] }]} accessible accessibilityLabel={places[i]}>
              <Text style={styles.medalText}>{i + 1}</Text>
            </View>
          ) : (
            <Text style={styles.rank}>{i + 1}</Text>
          )}
          <Text style={[styles.boardName, b.me && { fontFamily: fonts.bodyBold }]} numberOfLines={1}>
            {b.name}
            {b.me ? ` ${t('(you)')}` : ''}
            {i < 3 ? <Text style={styles.lead}>{`  ·  ${places[i]}`}</Text> : null}
          </Text>
          <Text style={styles.boardCount}>{b.done}</Text>
        </View>
      ))}
    </View>
  );
}

// ───── one challenge in the list ─────

function ChallengeCard({
  challenge: c,
  isHost,
  onOpen,
  onChanged,
}: {
  challenge: Challenge;
  isHost: boolean;
  onOpen: () => void;
  onChanged: () => Promise<void>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(c.title);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);

  async function rename() {
    const title = name.trim();
    if (!title) {
      tell(t('Please write the challenge first.'));
      return;
    }
    setBusy('save');
    try {
      await api.challengeSave(title, c.id);
      await onChanged();
      setRenaming(false);
    } catch (e) {
      tell(t(errorMessage(e)));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('delete');
    try {
      await api.challengeDelete(c.id);
      await onChanged();
    } catch (e) {
      tell(t(errorMessage(e)));
    } finally {
      setBusy(null);
    }
  }

  if (renaming) {
    return (
      <View style={[styles.card, styles.cardEditing]}>
        <Text style={styles.label}>{t('Rename this challenge')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={MAX_TITLE}
          multiline
          autoFocus
          placeholder={t('Write a challenge')}
          placeholderTextColor="#9A9C8E"
          style={styles.input}
          accessibilityLabel={t('The new wording for this challenge')}
        />
        <View style={styles.actions}>
          <Button label={t('Save')} busy={busy === 'save'} disabled={busy !== null} onPress={() => void rename()} style={{ flex: 1 }} />
          <Button
            label={t('Cancel')}
            variant="quiet"
            disabled={busy !== null}
            onPress={() => {
              setName(c.title);
              setRenaming(false);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, c.mine ? styles.cardDone : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Open the challenge: {title}', { title: c.title })}
        accessibilityHint={answered(c.entries)}
        onPress={onOpen}
        style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.7 }]}>
        <View style={styles.cardTop}>
          <Title size={26} style={{ flex: 1 }}>
            {c.title}
          </Title>
          <Feather name="chevron-right" size={24} color={colors.muted} style={{ marginTop: 4 }} />
        </View>
        {c.peek.length > 0 ? (
          <View style={styles.peek}>
            {c.peek.slice(0, 4).map((path) => (
              <Image key={path} source={{ uri: photoUrl(path, true) }} style={styles.peekPhoto} contentFit="cover" transition={150} />
            ))}
          </View>
        ) : null}
        <Body muted style={{ marginTop: space.sm }}>
          {answered(c.entries)}
        </Body>
      </Pressable>

      <View style={styles.mine}>
        {c.mine ? (
          c.mine.developing ? (
            <View style={styles.mineRow}>
              <View style={[styles.minePhoto, styles.developing]}>
                <Feather name="clock" size={20} color={colors.olive} />
              </View>
              <Body style={{ flex: 1 }}>{t('Your photo is developing. It will show tomorrow morning.')}</Body>
            </View>
          ) : (
            <View style={styles.mineRow}>
              <Image source={{ uri: photoUrl(c.mine.path, true) }} style={styles.minePhoto} contentFit="cover" transition={150} />
              <Feather name="check-circle" size={20} color={colors.olive} />
              <Text style={styles.mineText}>{t('You have done this one.')}</Text>
            </View>
          )
        ) : (
          <WideButton label={t('Add your photo')} icon="plus" onPress={onOpen} style={{ alignSelf: 'flex-start' }} />
        )}
      </View>

      {isHost ? (
        <View style={styles.hostRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Rename the challenge: {title}', { title: c.title })}
            disabled={busy !== null}
            onPress={() => {
              setName(c.title);
              setRenaming(true);
            }}
            style={({ pressed }) => [styles.hostAction, pressed && { opacity: 0.6 }]}>
            <Feather name="edit-2" size={16} color={colors.rose} />
            <Text style={styles.hostActionText}>{t('Rename')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Delete the challenge: {title}', { title: c.title })}
            disabled={busy !== null}
            onPress={() =>
              confirm(
                t('Delete this challenge?'),
                t('“{title}” and the answers to it will go. The photos themselves stay in the album.', { title: c.title }),
                t('Delete'),
                () => void remove(),
              )
            }
            style={({ pressed }) => [styles.hostAction, pressed && { opacity: 0.6 }]}>
            {busy === 'delete' ? <ActivityIndicator color={colors.rose} /> : <Feather name="trash-2" size={16} color={colors.rose} />}
            <Text style={styles.hostActionText}>{t('Delete')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// ───── adding a challenge (hosts) ─────

function AddChallenge({ onAdded }: { onAdded: () => Promise<void> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  // Starters only fill the box. Nothing is sent until the host presses Add.
  const starters = [
    t('A photo with someone you met today'),
    t('The best outfit of the evening'),
    t('The view from your room'),
    t('Caught on the dance floor'),
  ];

  async function add() {
    const title = text.trim();
    if (!title) {
      tell(t('Please write the challenge first.'));
      return;
    }
    setBusy(true);
    try {
      await api.challengeSave(title);
      setText('');
      await onAdded();
    } catch (e) {
      tell(t(errorMessage(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.section}>
        <Eyebrow color={colors.rose}>{t('Add a challenge')}</Eyebrow>
        <GoldRule style={{ flex: 1, marginLeft: space.md }} />
      </View>
      <Card>
        <Body muted style={styles.small}>
          {t('Only you see this box. Guests see a challenge as soon as you add it.')}
        </Body>
        <TextInput
          value={text}
          onChangeText={setText}
          maxLength={MAX_TITLE}
          multiline
          placeholder={t('Write a challenge')}
          placeholderTextColor="#9A9C8E"
          style={[styles.input, { marginTop: space.md }]}
          accessibilityLabel={t('A new photo challenge')}
        />
        <Button label={t('Add')} icon="plus" busy={busy} onPress={() => void add()} style={{ marginTop: space.md }} />

        <Text style={styles.label}>{t('Or start from one of these')}</Text>
        <Body muted style={styles.small}>
          {t('Tapping one only fills the box above. Nothing is sent until you press Add.')}
        </Body>
        <View style={styles.starters}>
          {starters.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={t('Fill the box with: {text}', { text: s })}
              onPress={() => setText(s)}
              style={({ pressed }) => [styles.starter, pressed && { opacity: 0.7 }]}>
              <Text style={styles.starterText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </>
  );
}

// ───── one challenge, opened ─────

function Detail({ challenge: c, onClose, onChanged }: { challenge: Challenge; onClose: () => void; onChanged: () => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.floor((width - space.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const [photos, setPhotos] = useState<ChallengePhoto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<'entries' | 'pick'>('entries');
  const [mine, setMine] = useState<MyPhoto[] | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  /** A photo id while it is being entered, or which button is working. */
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ChallengePhoto | null>(null);

  const load = useCallback(async () => {
    try {
      setPhotos(await api.challengePhotos(c.id));
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, [c.id]);

  useEffect(() => {
    void load();
  }, [load]);
  useLive('album', () => void load());

  async function refresh() {
    setRefreshing(true);
    await Promise.all([load(), onChanged()]);
    setRefreshing(false);
  }

  async function openPicker() {
    setMode('pick');
    setMine(null);
    setPickError(null);
    try {
      setMine(await api.myPhotos());
    } catch (e) {
      setPickError(errorMessage(e));
    }
  }

  async function enter(photoId: string) {
    if (busy) return;
    setBusy(photoId);
    try {
      await api.challengeEnter(c.id, photoId);
      await Promise.all([onChanged(), load()]);
      setMode('entries');
    } catch (e) {
      tell(t("That photo couldn't be added to the challenge"), t(errorMessage(e)));
    } finally {
      setBusy(null);
    }
  }

  // A photo from the phone joins the shared album first, then answers the challenge.
  async function fromPhone() {
    if (busy) return;
    let inAlbum = false;
    try {
      const assets = await pickFromPhone();
      if (assets.length === 0) return;
      setBusy('phone');
      const before = new Set((await api.myPhotos()).map((p) => p.id));
      const { added, error: failed } = await addToAlbum([assets[0]], () => {});
      if (added === 0) {
        tell(t("That photo didn't upload"), t(errorMessage(failed)));
        return;
      }
      inAlbum = true;
      const fresh = (await api.myPhotos()).find((p) => !before.has(p.id));
      if (!fresh) {
        tell(t('Your photo is in the album'), t('To finish, choose it from your album photos.'));
        return;
      }
      await api.challengeEnter(c.id, fresh.id);
      await Promise.all([onChanged(), load()]);
      setMode('entries');
      if (assets.length > 1) tell(t('One photo for each challenge'), t('Only the first photo you chose was used.'));
    } catch (e) {
      if (inAlbum) tell(t('Your photo is in the album'), t('To finish, choose it from your album photos.'));
      else tell(t("That photo didn't upload"), t(errorMessage(e)));
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    if (busy) return;
    setBusy('leave');
    try {
      await api.challengeLeave(c.id);
      await Promise.all([onChanged(), load()]);
    } catch (e) {
      tell(t(errorMessage(e)));
    } finally {
      setBusy(null);
    }
  }

  const back = () => setMode('entries');

  const entriesHead = (
    <View style={styles.sheetHead}>
      <Title size={30}>{c.title}</Title>

      <Card tone={c.mine ? 'sage' : 'blush'} style={{ marginTop: space.md, gap: space.md }}>
        {c.mine ? (
          <>
            <View style={styles.mineRow}>
              {c.mine.developing ? (
                <View style={[styles.myBig, styles.developing]}>
                  <Feather name="clock" size={24} color={colors.olive} />
                </View>
              ) : (
                <Image source={{ uri: photoUrl(c.mine.path, true) }} style={styles.myBig} contentFit="cover" transition={150} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.mineTitle}>{t('You have done this one.')}</Text>
                <Body muted style={styles.small}>
                  {c.mine.developing
                    ? t('Your photo is developing. It will show tomorrow morning.')
                    : t('This is your photo for this challenge.')}
                </Body>
              </View>
            </View>
            <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>{t('Want to use a different photo?')}</Text>
          </>
        ) : (
          <Body>{t('Answer with one of your own photos. One photo for each challenge.')}</Body>
        )}

        <WideButton label={t('Choose from my album photos')} icon="image" disabled={busy !== null} onPress={() => void openPicker()} />
        <WideButton
          label={t('Add from my phone')}
          icon="upload"
          variant="quiet"
          busy={busy === 'phone'}
          disabled={busy !== null}
          onPress={() => void fromPhone()}
        />
        <View style={styles.noteRow}>
          <Feather name="info" size={16} color={colors.muted} style={{ marginTop: 3 }} />
          <Body muted style={[styles.small, { flex: 1 }]}>
            {t('A photo you add from your phone also goes into the shared album, where every guest can see it.')}
          </Body>
        </View>

        {c.mine ? (
          <>
            <WideButton
              label={t('Remove my photo from this challenge')}
              icon="x-circle"
              variant="ghost"
              busy={busy === 'leave'}
              disabled={busy !== null}
              onPress={() => void leave()}
            />
            <Body muted style={[styles.small, { marginTop: -space.sm }]}>
              {t('This only takes it out of the challenge. The photo stays in the album.')}
            </Body>
          </>
        ) : null}
      </Card>

      <View style={styles.section}>
        <Eyebrow>{t("Everyone's photos")}</Eyebrow>
        <GoldRule style={{ flex: 1, marginLeft: space.md }} />
      </View>
      {photos && photos.length > 0 ? (
        <Body muted style={styles.small}>
          {t('Tap a photo to see it bigger.')}
        </Body>
      ) : null}
    </View>
  );

  const entriesEmpty =
    photos === null ? (
      loadError ? (
        <View style={styles.listNote}>
          <Body muted style={{ textAlign: 'center' }}>
            {t(loadError)}
          </Body>
          <Button label={t('Try again')} variant="quiet" onPress={() => void load()} />
        </View>
      ) : (
        <View style={styles.listNote}>
          <ActivityIndicator color={colors.olive} />
        </View>
      )
    ) : (
      <View style={styles.listNote}>
        <Body muted style={{ textAlign: 'center' }}>
          {t('No photos to show here yet.')}
        </Body>
      </View>
    );

  const pickHead = (
    <View style={styles.sheetHead}>
      <Title size={28}>{t('Choose one of your photos')}</Title>
      <Body style={{ marginTop: space.sm }}>{t('Tap the photo you want to use for “{title}”.', { title: c.title })}</Body>
      <Body muted style={[styles.small, { marginTop: space.sm, marginBottom: space.sm }]}>
        {t('Photos taken with the app camera appear here the morning after you take them.')}
      </Body>
    </View>
  );

  const pickEmpty =
    mine === null ? (
      pickError ? (
        <View style={styles.listNote}>
          <Body muted style={{ textAlign: 'center' }}>
            {t(pickError)}
          </Body>
          <Button label={t('Try again')} variant="quiet" onPress={() => void openPicker()} />
        </View>
      ) : (
        <View style={styles.listNote}>
          <ActivityIndicator color={colors.olive} />
        </View>
      )
    ) : (
      <View style={styles.listNote}>
        <Body muted style={{ textAlign: 'center' }}>
          {t('You have no photos in the album yet. You can add one from your phone.')}
        </Body>
        <WideButton label={t('Add from my phone')} icon="upload" variant="quiet" busy={busy === 'phone'} disabled={busy !== null} onPress={() => void fromPhone()} />
      </View>
    );

  return (
    <Modal visible animationType="slide" onRequestClose={mode === 'pick' ? back : onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={[styles.sheet, { paddingTop: insets.top }]}>
        <View style={styles.sheetBar}>
          {mode === 'pick' ? (
            <IconButton icon="arrow-left" label={t('Back to the challenge')} onPress={back} />
          ) : (
            <IconButton icon="x" label={t('Close')} onPress={onClose} />
          )}
          <Text style={styles.sheetBarTitle} numberOfLines={1}>
            {t('Photo challenge')}
          </Text>
        </View>

        {mode === 'pick' ? (
          <FlatList
            key="pick"
            data={mine ?? []}
            keyExtractor={(p) => p.id}
            numColumns={COLUMNS}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={{ gap: GAP, paddingBottom: insets.bottom + space.xxl }}
            ListHeaderComponent={pickHead}
            ListEmptyComponent={pickEmpty}
            renderItem={({ item }) => {
              const current = item.id === c.mine?.photo_id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: current, busy: busy === item.id }}
                  accessibilityLabel={t('Use this photo from {when}', { when: `${formatDayShort(istDayKey(item.taken_at))}, ${formatTime(item.taken_at)}` })}
                  disabled={busy !== null}
                  onPress={() => void enter(item.id)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                  <Image
                    source={{ uri: photoUrl(item.path, true) }}
                    style={{ width: size, height: size, backgroundColor: colors.moss, borderRadius: 4 }}
                    contentFit="cover"
                    transition={150}
                    recyclingKey={item.id}
                  />
                  {current ? (
                    <View style={[StyleSheet.absoluteFill, styles.current]}>
                      <View style={styles.currentTick}>
                        <Feather name="check" size={16} color={colors.white} />
                      </View>
                    </View>
                  ) : null}
                  {busy === item.id ? (
                    <View style={[StyleSheet.absoluteFill, styles.working]}>
                      <ActivityIndicator color={colors.white} />
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />
        ) : (
          <FlatList
            key="entries"
            data={photos ?? []}
            keyExtractor={(p) => p.id}
            numColumns={COLUMNS}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={{ gap: GAP, paddingBottom: insets.bottom + space.xxl }}
            ListHeaderComponent={entriesHead}
            ListEmptyComponent={entriesEmpty}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={item.mine ? t('Your photo. Tap to see it bigger.') : t('Photo by {name}. Tap to see it bigger.', { name: item.by })}
                onPress={() => setViewing(item)}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Image
                  source={{ uri: photoUrl(item.path, true) }}
                  style={{ width: size, height: size, backgroundColor: colors.moss, borderRadius: 4 }}
                  contentFit="cover"
                  transition={150}
                  recyclingKey={item.id}
                />
              </Pressable>
            )}
          />
        )}
      </View>

      {viewing ? <Viewer photo={viewing} title={c.title} onClose={() => setViewing(null)} /> : null}
    </Modal>
  );
}

// One entry, full screen: pinch to zoom, drag down to close.
function Viewer({ photo, title, onClose }: { photo: ChallengePhoto; title: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [zoomed, setZoomed] = useState(false);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SwipeDown onClose={onClose} enabled={!zoomed}>
        <ZoomImage
          uri={photoUrl(photo.path)}
          width={width}
          height={height}
          transition={120}
          onZoom={setZoomed}
          accessibilityLabel={photo.mine ? t('Your photo') : t('Photo by {name}', { name: photo.by })}
        />
        <View style={[styles.viewerTop, { paddingTop: insets.top + 4 }]}>
          <IconButton icon="x" label={t('Close')} color={colors.white} size={26} onPress={onClose} style={styles.viewerChip} />
        </View>
        <View style={[styles.viewerBottom, { paddingBottom: insets.bottom + space.md }]}>
          <Text style={styles.viewerBy}>{photo.mine ? t('You') : photo.by}</Text>
          <Text style={styles.viewerCaption}>{title}</Text>
        </View>
      </SwipeDown>
    </Modal>
  );
}

// A button whose label may run to two lines (long wording, large text, Gujarati).
function WideButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  busy,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet' | 'ghost';
  icon?: ComponentProps<typeof Feather>['name'];
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || busy;
  const fg = variant === 'primary' ? colors.white : variant === 'quiet' ? colors.ink : colors.rose;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wide,
        variant === 'primary' && { backgroundColor: colors.rose },
        variant === 'quiet' && { backgroundColor: colors.moss },
        pressed && { opacity: 0.8 },
        off && { opacity: 0.5 },
        style,
      ]}>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Feather name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.wideLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
  small: { fontSize: 14.5, lineHeight: 21 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.moss, overflow: 'hidden', marginTop: space.md },
  fill: { height: 6, backgroundColor: colors.rose },
  empty: { flexDirection: 'row', gap: space.md, marginTop: space.lg },

  board: {
    marginTop: space.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  boardTitle: { fontFamily: fonts.bodyMedium, fontSize: 11.5, letterSpacing: 2, textTransform: 'uppercase', color: colors.olive, marginBottom: 4 },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 },
  medal: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  medalText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
  rank: { fontFamily: fonts.displayMedium, fontSize: 20, color: colors.olive, width: 22, textAlign: 'center' },
  boardName: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  lead: { fontFamily: fonts.body, fontSize: 13, color: colors.rose },
  boardCount: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, minWidth: 28, textAlign: 'right' },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    padding: space.lg,
    marginTop: space.md,
  },
  cardDone: { borderLeftColor: colors.olive },
  cardEditing: { borderColor: colors.rose, borderLeftColor: colors.rose },
  cardMain: { minHeight: 44 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  peek: { flexDirection: 'row', gap: 6, marginTop: space.md },
  peekPhoto: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.moss },
  mine: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line },
  mineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  minePhoto: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.moss },
  myBig: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.moss, marginRight: 4 },
  developing: { alignItems: 'center', justifyContent: 'center' },
  mineText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16.5, color: colors.ink },
  mineTitle: { fontFamily: fonts.bodyBold, fontSize: 16.5, color: colors.ink },
  hostRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xl, marginTop: space.sm },
  hostAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingRight: space.sm },
  hostActionText: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.rose },

  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  label: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink, marginTop: space.lg, marginBottom: 6 },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  starters: { gap: space.sm, marginTop: space.md },
  starter: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  starterText: { fontFamily: fonts.bodyMedium, fontSize: 15.5, color: colors.ink },

  sheet: { flex: 1, backgroundColor: colors.paper },
  sheetBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, minHeight: 52 },
  sheetBarTitle: { flex: 1, fontFamily: fonts.displayMedium, fontSize: 22, color: colors.ink },
  sheetHead: { paddingHorizontal: space.lg, paddingTop: space.sm },
  noteRow: { flexDirection: 'row', gap: space.sm },
  gridRow: { gap: GAP, paddingHorizontal: space.lg },
  listNote: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.xl },
  current: { borderWidth: 3, borderColor: colors.rose, borderRadius: 4, alignItems: 'flex-end', padding: 4 },
  currentTick: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  working: { backgroundColor: 'rgba(18,21,15,0.55)', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },

  wide: {
    minHeight: 52,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  wideLabel: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 16, textAlign: 'center' },

  // Dark strips behind the viewer's controls so they stay visible over any photo.
  viewerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    backgroundColor: 'rgba(18,21,15,0.62)',
  },
  viewerChip: { backgroundColor: 'rgba(18,21,15,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  viewerBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: 'rgba(18,21,15,0.55)',
  },
  viewerBy: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.white },
  viewerCaption: { fontFamily: fonts.body, fontSize: 15, color: '#E3E6D8', marginTop: 2 },
});
