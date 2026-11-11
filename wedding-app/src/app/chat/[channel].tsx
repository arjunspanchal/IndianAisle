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
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentRef, type ReactNode } from 'react';
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

import { Body, IconButton, Loading, Notice } from '@/components/ui';
import { api, chatMediaUrl, errorMessage, REACTIONS, removeChatFiles, type Message } from '@/lib/api';
import { MAX_VOICE_SECONDS, sendImage, sendVoice } from '@/lib/chatMedia';
import { confirm, tell } from '@/lib/dialog';
import { useLive, useLoad } from '@/lib/live';
import { saveImageUrl, shareImageUrl } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatWhen } from '@/lib/time';

const SEEN_KEY = 'ka.chat.seen.';

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// A chat room that works the way people already know from WhatsApp:
// swipe a message right to reply, hold it to react or for more options,
// tap the photo button to send a picture, tap the mic to record a voice note.
export default function Thread() {
  const insets = useSafeAreaInsets();
  const { channel, name } = useLocalSearchParams<{ channel: string; name?: string }>();
  const { isHost } = useSession();
  const [older, setOlder] = useState<Message[]>([]);
  const [noMore, setNoMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState<string | null>(null); // what is on its way, said plainly
  const [picked, setPicked] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attach, setAttach] = useState(false);
  const [viewing, setViewing] = useState<Message | null>(null);
  const loadingOlder = useRef(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  // One shared player for every voice note in the room, so two never talk over each other.
  const player = useAudioPlayer();
  const playback = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Voice note being recorded.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  // Newest 50, kept fresh by live nudges (and a slow poll in case a nudge is missed).
  const { data: latest, error, loading, reload } = useLoad<Message[]>(() => api.messages(channel), 20000);

  useLive('chat', (p) => {
    if (!p.channel || p.channel === channel) void reload();
  });

  // Remember how far this phone has read, for the "new" dot on the room list.
  useEffect(() => {
    if (latest && latest.length > 0) void AsyncStorage.setItem(SEEN_KEY + channel, latest[0].created_at).catch(() => {});
  }, [latest, channel]);

  useEffect(() => {
    if (playback.didJustFinish) {
      setPlayingId(null);
      void player.seekTo(0).catch(() => {});
    }
  }, [playback.didJustFinish, player]);

  const fresh = latest ?? [];
  const freshIds = new Set(fresh.map((m) => m.id));
  const messages = [...fresh, ...older.filter((m) => !freshIds.has(m.id))];

  async function loadOlder() {
    if (loadingOlder.current || noMore || messages.length < 50) return;
    loadingOlder.current = true;
    try {
      const page = await api.messages(channel, messages[messages.length - 1].created_at);
      if (page.length === 0) setNoMore(true);
      else setOlder((o) => [...o, ...page.filter((m) => !o.some((x) => x.id === m.id))]);
    } catch {
      // try again on the next scroll
    } finally {
      loadingOlder.current = false;
    }
  }

  function startReply(m: Message) {
    setPicked(null);
    setReplyTo(m);
    input.current?.focus();
  }

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending('Sending…');
    try {
      await api.sendMessage(channel, body, replyTo?.id);
      setDraft('');
      setReplyTo(null);
      await reload();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setSending(null);
    }
  }

  // ───── photos ─────

  async function pickPhoto(from: 'camera' | 'library') {
    setAttach(false);
    if (sending) return;
    try {
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          tell('Camera access is off', 'Allow the camera in Settings to take a photo here.');
          return;
        }
      }
      const res =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      setSending('Sending photo…');
      // Whatever is typed in the box goes along as the caption.
      await sendImage(channel, { uri: a.uri, width: a.width, height: a.height }, draft.trim(), replyTo?.id);
      setDraft('');
      setReplyTo(null);
      await reload();
    } catch (e) {
      tell("That photo didn't send", errorMessage(e));
    } finally {
      setSending(null);
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
    if (sending || recording) return;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        tell('Microphone access is off', 'Allow the microphone in Settings to send voice notes.');
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
      tell("Couldn't start recording", 'Close other apps using the microphone and try again.');
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
        tell('That was very short', 'Tap the microphone, speak, then tap send.');
        return;
      }
      setSending('Sending voice note…');
      await sendVoice(channel, uri, seconds, replyTo?.id);
      setReplyTo(null);
      await reload();
    } catch (e) {
      if (andSend) tell("That voice note didn't send", errorMessage(e));
    } finally {
      setSending(null);
    }
  }

  function togglePlay(m: Message) {
    if (!m.media_path) return;
    if (playingId === m.id) {
      if (playback.playing) player.pause();
      else player.play();
      return;
    }
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    player.replace({ uri: chatMediaUrl(m.media_path) });
    player.play();
    setPlayingId(m.id);
  }

  // ───── message actions ─────

  async function react(m: Message, emoji: string) {
    setPicked(null);
    try {
      await api.toggleReaction(m.id, emoji);
      await reload();
    } catch (e) {
      tell(errorMessage(e));
    }
  }

  function remove(m: Message) {
    setPicked(null);
    confirm('Remove this message?', 'It will disappear for everyone.', 'Remove', async () => {
      try {
        await api.deleteMessage(m.id);
        if (m.media_path) void removeChatFiles([m.media_path]);
        if (playingId === m.id) {
          player.pause();
          setPlayingId(null);
        }
        setOlder((o) => o.filter((x) => x.id !== m.id));
        await reload();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  async function report(m: Message) {
    setPicked(null);
    try {
      await api.report('message', m.id);
      tell('Thank you', 'The couple will take a look.');
    } catch (e) {
      tell(errorMessage(e));
    }
  }

  function block(m: Message) {
    setPicked(null);
    confirm(`Block ${m.by}?`, "You won't see their messages or photos any more. They won't be told.", 'Block', async () => {
      try {
        await api.blockAuthor('message', m.id);
        setOlder([]);
        await reload();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  const preview = (m: Message) => (m.kind === 'image' ? (m.body ? `Photo: ${m.body}` : 'Photo') : m.kind === 'voice' ? 'Voice note' : m.body);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
      <Stack.Screen options={{ title: name ?? 'Chat' }} />
      {loading && !latest ? (
        <Loading />
      ) : !latest ? (
        <Notice icon="cloud-off" title="Can't load messages" body={error ?? undefined} />
      ) : (
        <FlatList
          data={messages}
          inverted={messages.length > 0}
          keyExtractor={(m) => m.id}
          contentContainerStyle={messages.length === 0 ? { flexGrow: 1 } : styles.list}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          extraData={[playingId, playback.playing, Math.floor(playback.currentTime)]}
          ListEmptyComponent={<Notice icon="message-circle" title="Quiet in here" body="Say hello. Someone has to go first." />}
          renderItem={({ item, index }) => {
            // Inverted list: the message *above* this one on screen is the next index.
            const above = messages[index + 1];
            const showName = !item.mine && (!above || above.by !== item.by || above.mine);
            const isPlaying = playingId === item.id;
            return (
              <SwipeToReply onReply={() => startReply(item)}>
                <Bubble
                  message={item}
                  showName={showName}
                  onReact={(e) => react(item, e)}
                  onLongPress={() => setPicked(item)}
                  onOpenImage={() => setViewing(item)}
                  onTogglePlay={() => togglePlay(item)}
                  playing={isPlaying && playback.playing}
                  position={isPlaying ? playback.currentTime : 0}
                />
              </SwipeToReply>
            );
          }}
        />
      )}

      {sending ? (
        <View style={styles.sendingBar}>
          <ActivityIndicator size="small" color={colors.olive} />
          <Text style={styles.sendingText}>{sending}</Text>
        </View>
      ) : null}

      {replyTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyStripe} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyName}>Replying to {replyTo.mine ? 'yourself' : replyTo.by}</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {preview(replyTo)}
            </Text>
          </View>
          <IconButton icon="x" label="Cancel reply" size={20} color={colors.muted} onPress={() => setReplyTo(null)} />
        </View>
      ) : null}

      {recording ? (
        <View style={[styles.inputBar, styles.recordBar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
          <IconButton icon="trash-2" label="Discard recording" color={colors.muted} onPress={() => void finishRecording(false)} />
          <View style={styles.recordMid} accessible accessibilityLabel={`Recording, ${Math.floor(elapsed)} seconds`}>
            <View style={styles.recordDot} />
            <Text style={styles.recordTime}>{clock(elapsed)}</Text>
            <Text style={styles.recordHint}>Recording… tap send when done</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Send voice note" onPress={() => void finishRecording(true)} style={styles.send}>
            <Feather name="arrow-up" size={22} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
          <IconButton icon="image" label="Send a photo" color={colors.olive} size={24} onPress={() => setAttach(true)} style={{ marginBottom: 1 }} />
          <TextInput
            ref={input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor="#9A9C8E"
            multiline
            maxLength={1000}
            style={styles.input}
            accessibilityLabel="Write a message"
          />
          {draft.trim() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              disabled={!!sending}
              onPress={send}
              style={({ pressed }) => [styles.send, sending && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}>
              <Feather name="arrow-up" size={22} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Record a voice note"
              disabled={!!sending}
              onPress={() => void startRecording()}
              style={({ pressed }) => [styles.send, styles.mic, sending && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}>
              <Feather name="mic" size={21} color={colors.white} />
            </Pressable>
          )}
        </View>
      )}

      {/* Photo source */}
      <Modal visible={attach} transparent animationType="fade" onRequestClose={() => setAttach(false)}>
        <Pressable style={styles.scrim} onPress={() => setAttach(false)} accessibilityLabel="Close">
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }]}>
            <SheetAction icon="camera" label="Take a photo" onPress={() => void pickPhoto('camera')} />
            <SheetAction icon="image" label="Choose from your photos" onPress={() => void pickPhoto('library')} />
            <Body muted style={{ fontSize: 14 }}>
              Anything typed in the message box is sent as the caption.
            </Body>
          </View>
        </Pressable>
      </Modal>

      {/* Hold-a-message menu */}
      <Modal visible={picked !== null} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        <Pressable style={styles.scrim} onPress={() => setPicked(null)} accessibilityLabel="Close">
          {picked ? (
            <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }]}>
              <Body numberOfLines={3} muted style={{ fontSize: 15 }}>
                {preview(picked)}
              </Body>
              <View style={styles.reactRow}>
                {REACTIONS.map((e) => (
                  <Pressable key={e} accessibilityRole="button" accessibilityLabel={`React ${e}`} onPress={() => react(picked, e)} style={styles.reactBig}>
                    <Text style={{ fontSize: 28 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <SheetAction icon="corner-up-left" label="Reply" onPress={() => startReply(picked)} />
              {picked.mine || isHost ? <SheetAction icon="trash-2" label="Remove message" danger onPress={() => remove(picked)} /> : null}
              {!picked.mine ? (
                <>
                  <SheetAction icon="flag" label="Report to the couple" onPress={() => void report(picked)} />
                  <SheetAction icon="slash" label={`Block ${picked.by}`} danger onPress={() => block(picked)} />
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

  async function save() {
    const r = await saveImageUrl(url, message.id);
    if (r === 'saved') tell('Saved to your photos');
    else if (r === 'denied') tell('Photos access is off', 'Allow access to Photos in Settings to save pictures to your phone.');
    else tell("Couldn't save that photo", 'Check your signal and try again.');
  }

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        <Image source={{ uri: url }} style={{ width, height }} contentFit="contain" transition={120} />
        <View style={[styles.viewerTop, { paddingTop: insets.top + 4 }]}>
          <IconButton icon="x" label="Close" color={colors.white} size={26} onPress={onClose} />
        </View>
        <View style={[styles.viewerBottom, { paddingBottom: insets.bottom + space.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.viewerBy}>{message.mine ? 'You' : message.by}</Text>
            {message.body ? <Text style={styles.viewerCaption}>{message.body}</Text> : null}
          </View>
          <IconButton icon="download" label="Save to your phone" color={colors.white} size={24} onPress={() => void save()} />
          <IconButton
            icon="share"
            label="Share this photo"
            color={colors.white}
            size={24}
            onPress={() => void shareImageUrl(url, message.id).then((ok) => !ok && tell("Couldn't share that photo"))}
          />
        </View>
      </View>
    </Modal>
  );
}

const REPLY_AT = 56;

/** Drag a message to the right to reply to it; it springs back when let go. */
function SwipeToReply({ children, onReply }: { children: ReactNode; onReply: () => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const armed = useRef(false);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly sideways drags, so the list still scrolls up and down freely.
        onMoveShouldSetPanResponder: (_, g) => g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderMove: (_, g) => {
          const dx = Math.max(0, Math.min(g.dx, 84));
          x.setValue(dx);
          if (dx >= REPLY_AT && !armed.current) {
            armed.current = true;
            if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
          } else if (dx < REPLY_AT) {
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

  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.replyHint, { opacity: hint }]}>
        <Feather name="corner-up-left" size={18} color={colors.olive} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function Bubble({
  message,
  showName,
  onReact,
  onLongPress,
  onOpenImage,
  onTogglePlay,
  playing,
  position,
}: {
  message: Message;
  showName: boolean;
  onReact: (emoji: string) => void;
  onLongPress: () => void;
  onOpenImage: () => void;
  onTogglePlay: () => void;
  playing: boolean;
  position: number;
}) {
  const mine = message.mine;
  const isImage = message.kind === 'image' && !!message.media_path;
  const isVoice = message.kind === 'voice' && !!message.media_path;

  // Photos keep their shape, within a comfortable bubble size.
  const w = message.media_meta?.width ?? 4;
  const h = message.media_meta?.height ?? 3;
  const imgW = 232;
  const imgH = Math.max(120, Math.min(300, Math.round((imgW * h) / w)));

  const total = message.media_meta?.seconds ?? 0;
  const progress = total > 0 ? Math.min(1, position / total) : 0;

  return (
    <View style={[styles.line, mine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
      {showName ? (
        <Text style={styles.name}>
          {message.by}
          {message.host ? <Text style={styles.hostTag}>  ·  the couple</Text> : null}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole={isImage ? 'imagebutton' : 'text'}
        accessibilityLabel={isImage ? `Photo from ${mine ? 'you' : message.by}${message.body ? `: ${message.body}` : ''}` : undefined}
        accessibilityHint="Swipe right to reply. Hold for reactions and more."
        onPress={isImage ? onOpenImage : undefined}
        onLongPress={onLongPress}
        delayLongPress={280}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, isImage && styles.bubbleImage]}>
        {message.reply ? (
          <View style={[styles.quote, mine && { backgroundColor: 'rgba(255,255,255,0.55)' }, isImage && { margin: 6 }]}>
            <Text style={styles.quoteName}>{message.reply.by}</Text>
            <Text style={styles.quoteText} numberOfLines={2}>
              {message.reply.body}
            </Text>
          </View>
        ) : null}

        {isImage ? (
          <Image
            source={{ uri: chatMediaUrl(message.media_path!) }}
            style={{ width: imgW, height: imgH, borderRadius: 16, backgroundColor: colors.moss }}
            contentFit="cover"
            transition={150}
          />
        ) : null}

        {isVoice ? (
          <View style={styles.voice}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playing ? 'Pause voice note' : `Play voice note, ${Math.round(total)} seconds`}
              hitSlop={8}
              onPress={onTogglePlay}
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
        ) : null}

        {message.body ? <Text style={[styles.text, isImage && { paddingHorizontal: 10, paddingTop: 6 }]}>{message.body}</Text> : null}
        <Text style={[styles.time, isImage && { paddingHorizontal: 10, paddingBottom: 4 }]}>{formatWhen(message.created_at)}</Text>
      </Pressable>
      {message.reactions.length > 0 ? (
        <View style={styles.reactions}>
          {message.reactions.map((r) => (
            <Pressable
              key={r.emoji}
              accessibilityRole="button"
              accessibilityLabel={`${r.emoji} ${r.count}`}
              onPress={() => onReact(r.emoji)}
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

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.lg, paddingVertical: space.md },
  line: { marginTop: 6 },
  name: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.olive, marginTop: space.sm, marginBottom: 3, marginLeft: 6 },
  hostTag: { fontFamily: fonts.body, color: colors.rose },
  bubble: { maxWidth: '84%', borderRadius: 20, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 7 },
  bubbleMine: { backgroundColor: colors.moss, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  bubbleImage: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 4 },
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
  sendingBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: 8, backgroundColor: colors.sage },
  sendingText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
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
  viewerTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: space.sm },
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
