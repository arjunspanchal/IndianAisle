import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeDown } from '@/components/SwipeDown';
import { ZoomImage } from '@/components/ZoomImage';
import { Body, IconButton, Loading, Notice } from '@/components/ui';
import { api, chatMediaUrl, errorMessage, REACTIONS, removeChatFiles, type Message, type Reaction } from '@/lib/api';
import { cachedRoom, localMedia, rememberRoom, restoreRoom } from '@/lib/chatCache';
import { MAX_VOICE_SECONDS } from '@/lib/chatMedia';
import { confirm, tell } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { compose, discard, onDelivered, outboxFor, queue, retry, rowKey, subscribeOutbox, type Shown } from '@/lib/outbox';
import { saveImageUrl, shareImageUrl } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatWhen } from '@/lib/time';

const SEEN_KEY = 'ka.chat.seen.';

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

const preview = (m: Message) =>
  m.kind === 'image' ? (m.body ? t('Photo: {caption}', { caption: m.body }) : t('Photo')) : m.kind === 'voice' ? t('Voice note') : m.body;

/** Where a message's photo or voice note is: on this phone if it was just sent from here, otherwise on the server. */
function mediaUri(m: Shown): string | null {
  if (m.local?.uri) return m.local.uri;
  if (!m.media_path) return null;
  return localMedia.get(m.media_path) ?? chatMediaUrl(m.media_path);
}

/** What the reaction chips look like the moment one is tapped, before the server answers. */
function toggled(reactions: Reaction[], emoji: string): Reaction[] {
  const had = reactions.find((r) => r.emoji === emoji);
  if (!had) return [...reactions, { emoji, count: 1, mine: true }];
  if (had.mine) return had.count <= 1 ? reactions.filter((r) => r !== had) : reactions.map((r) => (r === had ? { ...r, count: r.count - 1, mine: false } : r));
  return reactions.map((r) => (r === had ? { ...r, count: r.count + 1, mine: true } : r));
}

// What every row can do. Held in a ref so rows never redraw just because the screen did.
type Actions = {
  reply: (m: Shown) => void;
  react: (m: Shown, emoji: string) => void;
  pick: (m: Shown) => void;
  open: (m: Shown) => void;
  play: (m: Shown) => void;
  retry: (key: string) => void;
  discard: (key: string) => void;
};

// The voice note that is playing. Only voice bubbles listen, so playback ticks do not redraw the room.
const Playback = createContext<{ id: string | null; playing: boolean; position: number }>({ id: null, playing: false, position: 0 });

function EmptyRoom() {
  return <Notice icon="message-circle" title={t('Quiet in here')} body={t('Say hello. Someone has to go first.')} />;
}
// One element, made once, so the list's props stay the same between redraws.
const EMPTY_ROOM = <EmptyRoom />;
// Keep your place when reading older messages; follow along when you are at the bottom.
const KEEP_PLACE = { minIndexForVisible: 1, autoscrollToTopThreshold: 120 };

// A chat room that works the way people already know from WhatsApp:
// swipe a message right to reply, hold it to react or for more options,
// tap the photo button to send a picture, tap the mic to record a voice note.
// Anything sent shows up at once and goes to the server behind the scenes.
export default function Thread() {
  const insets = useSafeAreaInsets();
  const { channel, name } = useLocalSearchParams<{ channel: string; name?: string }>();
  const { isHost, guest } = useSession();
  const [older, setOlder] = useState<Message[]>([]);
  const [noMore, setNoMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [picked, setPicked] = useState<Shown | null>(null);
  const [replyTo, setReplyTo] = useState<Shown | null>(null);
  const [attach, setAttach] = useState(false);
  const [viewing, setViewing] = useState<Shown | null>(null);
  const [minute, setMinute] = useState(0); // ticks so "5 min ago" stays true
  const loadingOlder = useRef(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const list = useRef<FlatList<Shown>>(null);

  // One shared player for every voice note in the room, so two never talk over each other.
  const player = useAudioPlayer();
  const playback = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Voice note being recorded.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  // Newest 50. Opens with what this phone last saw, then kept fresh by live
  // nudges (and a slow poll in case a nudge is missed).
  const { data: latest, setData, error, loading, reload } = useLoad<Message[]>(() => api.messages(channel), 20000, cachedRoom(channel));

  useLive('chat', (p) => {
    if (!p.channel || p.channel === channel) void reload();
  });

  // After the app was closed: show the room as it was while the fresh copy loads.
  useEffect(() => {
    if (cachedRoom(channel)) return;
    let gone = false;
    void restoreRoom(channel).then((saved) => {
      if (saved && !gone) setData((d) => d ?? saved);
    });
    return () => {
      gone = true;
    };
  }, [channel, setData]);

  useEffect(() => {
    if (!latest) return;
    rememberRoom(channel, latest);
    // Remember how far this phone has read, for the "new" dot on the room list.
    if (latest.length > 0) void AsyncStorage.setItem(SEEN_KEY + channel, latest[0].created_at).catch(() => {});
  }, [latest, channel]);

  useEffect(() => {
    const t = setInterval(() => setMinute((m) => m + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // Messages still on their way out.
  const [outbox, setOutbox] = useState(() => outboxFor(channel));
  useEffect(() => {
    setOutbox(outboxFor(channel));
    return subscribeOutbox(() => setOutbox(outboxFor(channel)));
  }, [channel]);

  // The moment one is delivered, swap in the server's copy without waiting for a reload.
  useEffect(
    () =>
      onDelivered((ch, real) => {
        if (ch !== channel) return;
        setData((d) => (d ? (d.some((m) => m.id === real.id) ? d : [real, ...d]) : [real]));
        void reload();
      }),
    [channel, setData, reload],
  );

  useEffect(() => {
    if (playback.didJustFinish) {
      setPlayingId(null);
      void player.seekTo(0).catch(() => {});
    }
  }, [playback.didJustFinish, player]);

  // A refresh brings 50 new objects even when nothing changed. Hand back the ones
  // already on screen so their rows are left alone.
  const seen = useRef(new Map<string, { sig: string; m: Message }>());
  const fresh = useMemo(
    () =>
      (latest ?? []).map((m) => {
        const sig = JSON.stringify(m);
        const had = seen.current.get(m.id);
        if (had && had.sig === sig) return had.m;
        seen.current.set(m.id, { sig, m });
        return m;
      }),
    [latest],
  );

  const messages = useMemo<Shown[]>(() => {
    const ids = new Set(fresh.map((m) => m.id));
    return [...outbox.map((o) => o.shown), ...fresh, ...older.filter((m) => !ids.has(m.id))];
  }, [outbox, fresh, older]);

  const paging = useRef({ fresh, older, noMore });
  paging.current = { fresh, older, noMore };

  const loadOlder = useCallback(async () => {
    const now = paging.current;
    const known = now.fresh.length + now.older.length;
    if (loadingOlder.current || now.noMore || known < 50) return;
    const oldest = now.older.length > 0 ? now.older[now.older.length - 1] : now.fresh[now.fresh.length - 1];
    loadingOlder.current = true;
    try {
      const page = await api.messages(channel, oldest.created_at);
      if (page.length === 0) setNoMore(true);
      else setOlder((o) => [...o, ...page.filter((m) => !o.some((x) => x.id === m.id))]);
    } catch {
      // try again on the next scroll
    } finally {
      loadingOlder.current = false;
    }
  }, [channel]);

  function startReply(m: Shown) {
    setPicked(null);
    if (m.local) return;
    setReplyTo(m);
    input.current?.focus();
  }

  // ───── sending ─────

  const me = { name: guest?.name ?? t('You'), host: isHost };
  const quoted = () => (replyTo ? { id: replyTo.id, by: replyTo.by, preview: preview(replyTo) } : null);

  function toBottom() {
    requestAnimationFrame(() => list.current?.scrollToOffset({ offset: 0, animated: true }));
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    queue(compose(channel, me, { kind: 'text', body }, quoted()));
    setDraft('');
    setReplyTo(null);
    toBottom();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  async function pickPhoto(from: 'camera' | 'library') {
    setAttach(false);
    try {
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          tell(t('Camera access is off'), t('Allow the camera in Settings to take a photo here.'));
          return;
        }
      }
      const res =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      // Whatever is typed in the box goes along as the caption.
      queue(compose(channel, me, { kind: 'image', body: draft.trim(), uri: a.uri, width: a.width, height: a.height }, quoted()));
      setDraft('');
      setReplyTo(null);
      toBottom();
    } catch (e) {
      tell(t("Couldn't open your photos"), errorMessage(e));
    }
  }

  // ───── voice notes ─────

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000;
      setElapsed(s);
      if (s >= MAX_VOICE_SECONDS) void finishRecording(true);
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  async function startRecording() {
    if (recording) return;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        tell(t('Microphone access is off'), t('Allow the microphone in Settings to send voice notes.'));
        return;
      }
      if (playingId) {
        player.pause();
        setPlayingId(null);
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      tell(t("Couldn't start recording"), t('Close other apps using the microphone and try again.'));
    }
  }

  async function finishRecording(andSend: boolean) {
    if (!recording) return;
    setRecording(false);
    const seconds = (Date.now() - startedAt.current) / 1000;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      const uri = recorder.uri;
      if (!andSend || !uri) return;
      if (seconds < 1) {
        tell(t('That was very short'), t('Tap the microphone, speak, then tap send.'));
        return;
      }
      queue(compose(channel, me, { kind: 'voice', uri, seconds }, quoted()));
      setReplyTo(null);
      toBottom();
    } catch (e) {
      if (andSend) tell(t("That voice note didn't record"), errorMessage(e));
    }
  }

  function togglePlay(m: Shown) {
    const uri = mediaUri(m);
    if (!uri) return;
    if (playingId === m.id) {
      if (playback.playing) player.pause();
      else player.play();
      return;
    }
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    player.replace({ uri });
    player.play();
    setPlayingId(m.id);
  }

  // ───── message actions ─────

  function react(m: Shown, emoji: string) {
    setPicked(null);
    if (m.local) return;
    // Show it at once; the server catches up.
    const apply = (all: Message[]) => all.map((x) => (x.id === m.id ? { ...x, reactions: toggled(x.reactions, emoji) } : x));
    setData((d) => (d ? apply(d) : d));
    setOlder(apply);
    if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
    api.toggleReaction(m.id, emoji).then(
      () => void reload(),
      (e) => {
        tell(errorMessage(e));
        void reload();
      },
    );
  }

  function remove(m: Shown) {
    setPicked(null);
    confirm(t('Remove this message?'), t('It will disappear for everyone.'), t('Remove'), async () => {
      // Gone from the screen first; put back if the server says no.
      const before = { latest, older };
      setData((d) => (d ? d.filter((x) => x.id !== m.id) : d));
      setOlder((o) => o.filter((x) => x.id !== m.id));
      if (playingId === m.id) {
        player.pause();
        setPlayingId(null);
      }
      try {
        await api.deleteMessage(m.id);
        if (m.media_path) void removeChatFiles([m.media_path]);
        void reload();
      } catch (e) {
        setData(before.latest);
        setOlder(before.older);
        tell(errorMessage(e));
      }
    });
  }

  async function report(m: Shown) {
    setPicked(null);
    try {
      await api.report('message', m.id);
      tell(t('Thank you'), t('The couple will take a look.'));
    } catch (e) {
      tell(errorMessage(e));
    }
  }

  function block(m: Shown) {
    setPicked(null);
    confirm(t('Block {name}?', { name: m.by }), t("You won't see their messages or photos any more. They won't be told."), t('Block'), async () => {
      try {
        await api.blockAuthor('message', m.id);
        setOlder([]);
        await reload();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  const actions = useRef<Actions>(null as unknown as Actions);
  actions.current = {
    reply: startReply,
    react,
    pick: (m) => {
      if (!m.local) setPicked(m);
    },
    open: setViewing,
    play: togglePlay,
    retry: (key) => retry(channel, key),
    discard: (key) => discard(channel, key),
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Shown; index: number }) => {
      // Inverted list: the message *above* this one on screen is the next index.
      const above = messages[index + 1];
      const showName = !item.mine && (!above || above.by !== item.by || above.mine);
      return <Row message={item} showName={showName} minute={minute} actions={actions} />;
    },
    [messages, minute],
  );

  const playbackNow = useMemo(
    () => ({ id: playingId, playing: playback.playing, position: playback.currentTime }),
    [playingId, playback.playing, playback.currentTime],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
      <Stack.Screen options={{ title: t(name ?? 'Chat') }} />
      {loading && !latest ? (
        <Loading />
      ) : !latest ? (
        <Notice icon="cloud-off" title={t("Can't load messages")} body={error ?? undefined} />
      ) : (
        <Playback.Provider value={playbackNow}>
          <FlatList
            ref={list}
            data={messages}
            inverted={messages.length > 0}
            keyExtractor={rowKey}
            renderItem={renderItem}
            contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.list}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.4}
            keyboardShouldPersistTaps="handled"
            maintainVisibleContentPosition={KEEP_PLACE}
            initialNumToRender={14}
            maxToRenderPerBatch={8}
            windowSize={9}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={EMPTY_ROOM}
          />
        </Playback.Provider>
      )}

      {replyTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyStripe} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyName}>{replyTo.mine ? t('Replying to yourself') : t('Replying to {name}', { name: replyTo.by })}</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {preview(replyTo)}
            </Text>
          </View>
          <IconButton icon="x" label={t('Cancel reply')} size={20} color={colors.muted} onPress={() => setReplyTo(null)} />
        </View>
      ) : null}

      {recording ? (
        <View style={[styles.inputBar, styles.recordBar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
          <IconButton icon="trash-2" label={t('Discard recording')} color={colors.muted} onPress={() => void finishRecording(false)} />
          <View style={styles.recordMid} accessible accessibilityLabel={t('Recording, {n} seconds', { n: Math.floor(elapsed) })}>
            <View style={styles.recordDot} />
            <Text style={styles.recordTime}>{clock(elapsed)}</Text>
            <Text style={styles.recordHint}>{t('Recording… tap send when done')}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Send voice note')} onPress={() => void finishRecording(true)} style={styles.send}>
            <Feather name="arrow-up" size={22} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
          <IconButton icon="image" label={t('Send a photo')} color={colors.olive} size={24} onPress={() => setAttach(true)} style={{ marginBottom: 1 }} />
          <TextInput
            ref={input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('Message')}
            placeholderTextColor="#9A9C8E"
            multiline
            maxLength={1000}
            style={styles.input}
            accessibilityLabel={t('Write a message')}
          />
          {draft.trim() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Send')}
              onPress={send}
              style={({ pressed }) => [styles.send, pressed && { opacity: 0.8 }]}>
              <Feather name="arrow-up" size={22} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Record a voice note')}
              onPress={() => void startRecording()}
              style={({ pressed }) => [styles.send, styles.mic, pressed && { opacity: 0.8 }]}>
              <Feather name="mic" size={21} color={colors.white} />
            </Pressable>
          )}
        </View>
      )}

      {/* Photo source */}
      <Modal visible={attach} transparent animationType="fade" onRequestClose={() => setAttach(false)}>
        <Pressable style={styles.scrim} onPress={() => setAttach(false)} accessibilityLabel={t('Close')}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }]}>
            <SheetAction icon="camera" label={t('Take a photo')} onPress={() => void pickPhoto('camera')} />
            <SheetAction icon="image" label={t('Choose from your photos')} onPress={() => void pickPhoto('library')} />
            <Body muted style={{ fontSize: 14 }}>
              {t('Anything typed in the message box is sent as the caption.')}
            </Body>
          </View>
        </Pressable>
      </Modal>

      {/* Hold-a-message menu */}
      <Modal visible={picked !== null} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        <Pressable style={styles.scrim} onPress={() => setPicked(null)} accessibilityLabel={t('Close')}>
          {picked ? (
            <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }]}>
              <Body numberOfLines={3} muted style={{ fontSize: 15 }}>
                {preview(picked)}
              </Body>
              <View style={styles.reactRow}>
                {REACTIONS.map((e) => (
                  <Pressable key={e} accessibilityRole="button" accessibilityLabel={t('React {emoji}', { emoji: e })} onPress={() => react(picked, e)} style={styles.reactBig}>
                    <Text style={{ fontSize: 28 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <SheetAction icon="corner-up-left" label={t('Reply')} onPress={() => startReply(picked)} />
              {picked.mine || isHost ? <SheetAction icon="trash-2" label={t('Remove message')} danger onPress={() => remove(picked)} /> : null}
              {!picked.mine ? (
                <>
                  <SheetAction icon="flag" label={t('Report to the couple')} onPress={() => void report(picked)} />
                  <SheetAction icon="slash" label={t('Block {name}', { name: picked.by })} danger onPress={() => block(picked)} />
                </>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {viewing?.media_path ? <PhotoViewer message={viewing} onClose={() => setViewing(null)} /> : null}
    </KeyboardAvoidingView>
  );
}

/** One message. Redraws only when the message itself changes, not when the screen does. */
const Row = memo(function Row({
  message,
  showName,
  minute,
  actions,
}: {
  message: Shown;
  showName: boolean;
  minute: number;
  actions: RefObject<Actions>;
}) {
  void minute; // only here so the "5 min ago" label refreshes once a minute
  return (
    <SwipeToReply disabled={!!message.local} leftToo={message.mine} onReply={() => actions.current.reply(message)}>
      <Bubble message={message} showName={showName} actions={actions} />
    </SwipeToReply>
  );
});

function SheetAction({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const tint = danger ? colors.rose : colors.ink;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.sheetAction, pressed && { opacity: 0.6 }]}>
      <Feather name={icon} size={19} color={tint} />
      <Text style={[styles.sheetActionText, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

/** A chat photo, full screen, with save and share. */
function PhotoViewer({ message, onClose }: { message: Message; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const url = chatMediaUrl(message.media_path!);
  const [zoomed, setZoomed] = useState(false);

  async function save() {
    const r = await saveImageUrl(url, message.id);
    if (r === 'saved') tell(t('Saved to your photos'));
    else if (r === 'denied') tell(t('Photos access is off'), t('Allow access to Photos in Settings to save pictures to your phone.'));
    else tell(t("Couldn't save that photo"), t('Check your signal and try again.'));
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SwipeDown onClose={onClose} enabled={!zoomed}>
        <ZoomImage uri={url} width={width} height={height} transition={120} onZoom={setZoomed} />
        <View style={[styles.viewerTop, { paddingTop: insets.top + 4 }]}>
          <IconButton icon="x" label={t('Close')} color={colors.white} size={26} onPress={onClose} style={styles.viewerChip} />
        </View>
        <View style={[styles.viewerBottom, { paddingBottom: insets.bottom + space.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.viewerBy}>{message.mine ? t('You') : message.by}</Text>
            {message.body ? <Text style={styles.viewerCaption}>{message.body}</Text> : null}
          </View>
          <IconButton icon="download" label={t('Save to your phone')} color={colors.white} size={24} onPress={() => void save()} />
          <IconButton
            icon="share"
            label={t('Share this photo')}
            color={colors.white}
            size={24}
            onPress={() => void shareImageUrl(url, message.id).then((ok) => !ok && tell(t("Couldn't share that photo")))}
          />
        </View>
      </SwipeDown>
    </Modal>
  );
}

const REPLY_AT = 48;

// Claim a drag as soon as it is clearly sideways, ahead of the bubble's own press
// handling, while leaving up-and-down scrolling to the list.
function wantsSwipe(g: { dx: number; dy: number }, leftToo: boolean): boolean {
  const sideways = Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
  return sideways && (g.dx > 0 || leftToo);
}

/**
 * Drag a message sideways to reply to it; it springs back when let go.
 * Any message can be dragged to the right. Your own messages, which sit on the
 * right of the screen, can also be dragged to the left (`leftToo`).
 */
function SwipeToReply({
  children,
  onReply,
  disabled,
  leftToo,
}: {
  children: ReactNode;
  onReply: () => void;
  disabled?: boolean;
  leftToo?: boolean;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const armed = useRef(false);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;
  const leftRef = useRef(!!leftToo);
  leftRef.current = !!leftToo;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => wantsSwipe(g, leftRef.current),
        onMoveShouldSetPanResponderCapture: (_, g) => wantsSwipe(g, leftRef.current),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          const dx = Math.max(leftRef.current ? -84 : 0, Math.min(g.dx, 84));
          x.setValue(dx);
          const far = Math.abs(dx) >= REPLY_AT;
          if (far && !armed.current) {
            armed.current = true;
            if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
          } else if (!far) {
            armed.current = false;
          }
        },
        onPanResponderRelease: () => {
          if (armed.current) onReplyRef.current();
          armed.current = false;
          Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        },
        onPanResponderTerminate: () => {
          armed.current = false;
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [x],
  );

  const hint = x.interpolate({ inputRange: [0, 24, REPLY_AT], outputRange: [0, 0.3, 1], extrapolate: 'clamp' });
  const hintLeft = x.interpolate({ inputRange: [-REPLY_AT, -24, 0], outputRange: [1, 0.3, 0], extrapolate: 'clamp' });

  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.replyHint, { opacity: hint }]}>
        <Feather name="corner-up-left" size={18} color={colors.olive} />
      </Animated.View>
      {leftToo ? (
        <Animated.View pointerEvents="none" style={[styles.replyHint, styles.replyHintRight, { opacity: hintLeft }]}>
          <Feather name="corner-up-left" size={18} color={colors.olive} />
        </Animated.View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX: x }] }} {...(disabled ? null : pan.panHandlers)}>
        {children}
      </Animated.View>
    </View>
  );
}

function Bubble({ message, showName, actions }: { message: Shown; showName: boolean; actions: RefObject<Actions> }) {
  const mine = message.mine;
  const local = message.local;
  const uri = mediaUri(message);
  const isImage = message.kind === 'image' && !!uri;
  const isVoice = message.kind === 'voice' && !!uri;

  // Photos keep their shape, within a comfortable bubble size.
  const w = message.media_meta?.width ?? 4;
  const h = message.media_meta?.height ?? 3;
  const imgW = 232;
  const imgH = Math.max(120, Math.min(300, Math.round((imgW * h) / w)));

  return (
    <View style={[styles.line, mine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
      {showName ? (
        <Text style={styles.name}>
          {message.by}
          {message.host ? <Text style={styles.hostTag}>{`  ·  ${t('the couple')}`}</Text> : null}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole={isImage ? 'imagebutton' : 'text'}
        accessibilityLabel={isImage ? `${mine ? t('Photo from you') : t('Photo from {name}', { name: message.by })}${message.body ? `: ${message.body}` : ''}` : undefined}
        accessibilityHint={local ? undefined : mine ? t('Swipe left or right to reply. Hold for reactions and more.') : t('Swipe right to reply. Hold for reactions and more.')}
        onPress={isImage && !local ? () => actions.current.open(message) : undefined}
        onLongPress={() => actions.current.pick(message)}
        delayLongPress={280}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, isImage && styles.bubbleImage, local?.state === 'failed' && styles.bubbleFailed]}>
        {message.reply ? (
          <View style={[styles.quote, mine && { backgroundColor: 'rgba(255,255,255,0.55)' }, isImage && { margin: 6 }]}>
            <Text style={styles.quoteName}>{message.reply.by}</Text>
            <Text style={styles.quoteText} numberOfLines={2}>
              {message.reply.body}
            </Text>
          </View>
        ) : null}

        {isImage ? (
          <View>
            <Image
              source={{ uri: uri! }}
              style={{ width: imgW, height: imgH, borderRadius: 16, backgroundColor: colors.moss }}
              contentFit="cover"
              recyclingKey={message.id}
              transition={local || localMedia.has(message.media_path ?? '') ? 0 : 150}
            />
            {local?.state === 'sending' ? (
              <View style={styles.imageBusy}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}
          </View>
        ) : null}

        {isVoice ? <VoiceBody message={message} actions={actions} /> : null}

        {message.body ? <Text style={[styles.text, isImage && { paddingHorizontal: 10, paddingTop: 6 }]}>{message.body}</Text> : null}
        <Text style={[styles.time, isImage && { paddingHorizontal: 10, paddingBottom: 4 }, local?.state === 'failed' && { color: colors.rose }]}>
          {local ? (local.state === 'sending' ? t('Sending…') : t("Didn't send")) : formatWhen(message.created_at)}
        </Text>
      </Pressable>

      {local?.state === 'failed' ? (
        <View style={styles.failed} accessibilityLiveRegion="polite">
          {local.error ? <Text style={styles.failedWhy}>{local.error}</Text> : null}
          <View style={styles.failedActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Try sending again')} hitSlop={8} onPress={() => actions.current.retry(local.key)} style={styles.failedButton}>
              <Feather name="rotate-cw" size={15} color={colors.rose} />
              <Text style={styles.failedText}>{t('Try again')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Discard this message')} hitSlop={8} onPress={() => actions.current.discard(local.key)} style={styles.failedButton}>
              <Text style={[styles.failedText, { color: colors.muted }]}>{t('Discard')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {message.reactions.length > 0 ? (
        <View style={styles.reactions}>
          {message.reactions.map((r) => (
            <Pressable
              key={r.emoji}
              accessibilityRole="button"
              accessibilityLabel={`${r.emoji} ${r.count}`}
              onPress={() => actions.current.react(message, r.emoji)}
              style={[styles.reaction, r.mine && styles.reactionMine]}>
              <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
              <Text style={styles.reactionCount}>{r.count}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The play button and progress line of a voice note. The only part that follows playback. */
function VoiceBody({ message, actions }: { message: Shown; actions: RefObject<Actions> }) {
  const now = useContext(Playback);
  const current = now.id === message.id;
  const playing = current && now.playing;
  const position = current ? now.position : 0;
  const total = message.media_meta?.seconds ?? 0;
  const progress = total > 0 ? Math.min(1, position / total) : 0;
  return (
    <View style={styles.voice}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? t('Pause voice note') : t('Play voice note, {n} seconds', { n: Math.round(total) })}
        hitSlop={8}
        onPress={() => actions.current.play(message)}
        style={styles.play}>
        <Feather name={playing ? 'pause' : 'play'} size={20} color={colors.white} style={playing ? undefined : { marginLeft: 2 }} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.voiceTime}>{position > 0 ? `${clock(position)} / ${clock(total)}` : clock(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.lg, paddingVertical: space.md },
  emptyList: { flexGrow: 1 },
  line: { marginTop: 6 },
  name: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.olive, marginTop: space.sm, marginBottom: 3, marginLeft: 6 },
  hostTag: { fontFamily: fonts.body, color: colors.rose },
  bubble: { maxWidth: '84%', borderRadius: 20, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 7 },
  bubbleMine: { backgroundColor: colors.moss, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  bubbleImage: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 4 },
  bubbleFailed: { borderWidth: 1, borderColor: colors.rose },
  imageBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: 'rgba(18,21,15,0.35)', alignItems: 'center', justifyContent: 'center' },
  failed: { alignItems: 'flex-end', marginTop: 2, marginRight: 4, maxWidth: '84%' },
  failedWhy: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'right' },
  failedActions: { flexDirection: 'row', gap: space.md },
  failedButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 },
  failedText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.rose },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.rose,
    backgroundColor: colors.sage,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 6,
  },
  quoteName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.rose },
  quoteText: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20, color: colors.muted },
  text: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24, color: colors.ink },
  time: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted, marginTop: 2, alignSelf: 'flex-end' },
  voice: { flexDirection: 'row', alignItems: 'center', gap: space.md, width: 216, paddingVertical: 2 },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: '#CFD3C2', overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: colors.rose },
  voiceTime: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 5 },
  reactions: { flexDirection: 'row', gap: 6, marginTop: 4, marginHorizontal: 6 },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reactionMine: { backgroundColor: colors.blush, borderColor: colors.rose },
  reactionCount: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink },
  replyHint: { position: 'absolute', left: 4, top: 0, bottom: 0, justifyContent: 'center' },
  replyHintRight: { left: undefined, right: 4 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.md,
    paddingRight: 4,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  replyStripe: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.rose },
  replyName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.rose },
  replyText: { fontFamily: fonts.body, fontSize: 14.5, color: colors.muted },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  recordBar: { alignItems: 'center' },
  recordMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 46 },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sos },
  recordTime: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink, minWidth: 42 },
  recordHint: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, flexShrink: 1 },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 130,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    paddingHorizontal: space.lg,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  mic: { backgroundColor: colors.ink },
  scrim: { flex: 1, backgroundColor: 'rgba(30,34,24,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.sm,
  },
  reactRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: space.sm },
  reactBig: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  sheetAction: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  sheetActionText: { fontFamily: fonts.bodyMedium, fontSize: 16.5 },
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
  viewerCaption: { fontFamily: fonts.body, fontSize: 15, color: '#E3E6D8', marginTop: 2 },
});
