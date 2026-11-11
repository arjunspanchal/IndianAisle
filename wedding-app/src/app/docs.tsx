import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
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

import { Body, Button, Card, Eyebrow, GoldRule, IconButton, Loading, Notice, Title } from '@/components/ui';
import { docsApi, errorMessage, KaError, type TravelDoc } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { readBytes } from '@/lib/files';
import { useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatWhen } from '@/lib/time';

const MAX_BYTES = 10 * 1024 * 1024;
const LONG_EDGE = 2000; // keeps the small print on an ID or ticket readable

type Kind = TravelDoc['kind'];
const WORDS: Record<Kind, { title: string; add: string; hint: string; fallback: string }> = {
  id: { title: 'Your ID', add: 'Add an ID', hint: 'e.g. Aadhaar, passport', fallback: 'ID' },
  ticket: { title: 'Your tickets', add: 'Add a ticket', hint: 'e.g. Mumbai to Chandigarh, 16 Jan', fallback: 'Ticket' },
};

// Travel documents: a guest's ID and tickets, shared with the couple's team so
// they can sort out travel and check-in. Kept in a private vault: only the
// guest and the hosts can open them, through links that expire in two minutes.
export default function Docs() {
  const { isHost } = useSession();
  const { data, error, loading, reload } = useLoad<TravelDoc[]>(() => docsApi.list());
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState<Kind | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ url: string; doc: TravelDoc } | null>(null);

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  async function upload(kind: Kind, file: { uri: string; mime: TravelDoc['mime'] }) {
    setBusy('Uploading securely…');
    try {
      const bytes = await readBytes(file.uri);
      if (bytes.byteLength > MAX_BYTES) {
        tell('That file is too big', 'Please choose one under 10 MB.');
        return;
      }
      const r = await docsApi.reserve(kind, label.trim() || WORDS[kind].fallback, file.mime);
      await docsApi.upload(r.path, r.upload_token, bytes, file.mime);
      await docsApi.confirm(r.id);
      setLabel('');
      await reload();
    } catch (e) {
      tell("That didn't upload", errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function pick(kind: Kind, from: 'camera' | 'library' | 'pdf') {
    setAdding(null);
    try {
      if (from === 'pdf') {
        const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
        if (res.canceled || !res.assets?.[0]) return;
        await upload(kind, { uri: res.assets[0].uri, mime: 'application/pdf' });
        return;
      }
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          tell('Camera access is off', 'Allow the camera in Settings to photograph a document.');
          return;
        }
      }
      const res =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const landscape = a.width >= a.height;
      const img = await manipulateAsync(
        a.uri,
        [{ resize: landscape ? { width: Math.min(LONG_EDGE, a.width) } : { height: Math.min(LONG_EDGE, a.height) } }],
        { compress: 0.82, format: SaveFormat.JPEG },
      );
      await upload(kind, { uri: img.uri, mime: 'image/jpeg' });
    } catch (e) {
      tell("That didn't upload", e instanceof KaError ? errorMessage(e) : 'Please try again.');
    }
  }

  async function open(doc: TravelDoc) {
    setBusy('Opening…');
    try {
      const r = await docsApi.open(doc.id);
      if (doc.mime === 'application/pdf') await Linking.openURL(r.url);
      else setViewing({ url: r.url, doc });
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function remove(doc: TravelDoc) {
    confirm(`Delete ${doc.label || 'this document'}?`, 'It is erased from the vault straight away and cannot be brought back.', 'Delete', async () => {
      try {
        await docsApi.remove(doc.id);
        await reload();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  function purge() {
    confirm(
      "Delete every guest's documents?",
      'All IDs and tickets in the vault are erased for good. Do this once travel and check-in are done.',
      'Delete all',
      async () => {
        setBusy('Deleting…');
        try {
          const r = await docsApi.purge();
          await reload();
          tell('The vault is empty', `${r.deleted} ${r.deleted === 1 ? 'file' : 'files'} erased.`);
        } catch (e) {
          tell(errorMessage(e));
        } finally {
          setBusy(null);
        }
      },
    );
  }

  if (loading && !data) return <Loading />;
  if (!data)
    return (
      <Notice
        icon="cloud-off"
        title="Can't open your documents"
        body={error ?? undefined}
        action={<Button label="Try again" variant="quiet" onPress={() => void reload()} />}
      />
    );

  const mine = data.filter((d) => d.mine);
  const others = data.filter((d) => !d.mine);
  const people = [...new Set(others.map((d) => d.by))];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
        <Eyebrow>For your journey</Eyebrow>
        <Title size={34} style={{ marginTop: 2 }}>
          Travel documents
        </Title>
        <Body muted style={{ marginTop: 6 }}>
          Add your ID and tickets so the wedding team can sort out travel and check-in for you.
        </Body>

        <Card tone="sage" style={styles.lock}>
          <Feather name="lock" size={18} color={colors.olive} style={{ marginTop: 3 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.lockTitle}>Kept private</Text>
            <Body muted style={styles.small}>
              Only you and the couple's team can open these. Other guests can't see them, and you can delete them whenever you like.
            </Body>
            <Body muted style={[styles.small, { marginTop: 6 }]}>
              Sharing Aadhaar? UIDAI lets you download a masked Aadhaar that hides the first eight digits. Use that if you can.
            </Body>
          </View>
        </Card>

        {(['id', 'ticket'] as Kind[]).map((kind) => {
          const list = mine.filter((d) => d.kind === kind);
          return (
            <View key={kind}>
              <View style={styles.sectionHead}>
                <Eyebrow>{WORDS[kind].title}</Eyebrow>
                <GoldRule style={{ flex: 1, marginLeft: space.md }} />
              </View>
              {list.length === 0 ? (
                <Body muted style={{ marginBottom: space.sm }}>
                  Nothing added yet.
                </Body>
              ) : (
                list.map((d) => <DocRow key={d.id} doc={d} onOpen={() => void open(d)} onDelete={() => remove(d)} />)
              )}
              <Button label={WORDS[kind].add} icon="plus" variant="quiet" onPress={() => setAdding(kind)} disabled={!!busy} style={{ alignSelf: 'flex-start' }} />
            </View>
          );
        })}

        {isHost ? (
          <>
            <View style={styles.sectionHead}>
              <Eyebrow color={colors.rose}>Guests' documents</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>
            {people.length === 0 ? <Body muted>No guest has added anything yet.</Body> : null}
            {people.map((name) => (
              <View key={name} style={{ marginBottom: space.md }}>
                <Text style={styles.person}>{name}</Text>
                {others
                  .filter((d) => d.by === name)
                  .map((d) => (
                    <DocRow key={d.id} doc={d} showKind onOpen={() => void open(d)} onDelete={() => remove(d)} />
                  ))}
              </View>
            ))}
            {data.length > 0 ? (
              <Button label="Delete every guest's documents" variant="ghost" onPress={purge} style={{ alignSelf: 'flex-start', marginLeft: -space.md }} />
            ) : null}
            <Body muted style={styles.small}>
              Each time a document is opened, it is logged. Erase the vault once everyone is home.
            </Body>
          </>
        ) : null}
      </ScrollView>

      {busy ? (
        <View style={styles.busy} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.white} />
          <Text style={styles.busyText}>{busy}</Text>
        </View>
      ) : null}

      {/* Where is the document coming from? */}
      <Modal visible={adding !== null} transparent animationType="fade" onRequestClose={() => setAdding(null)}>
        <Pressable style={styles.scrim} onPress={() => setAdding(null)} accessibilityLabel="Close">
          {adding ? (
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Title size={24}>{WORDS[adding].add}</Title>
              <Text style={styles.fieldLabel}>What is it? (optional)</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder={WORDS[adding].hint}
                placeholderTextColor="#9A9C8E"
                maxLength={80}
                style={styles.field}
                accessibilityLabel="What is this document"
              />
              <SourceRow icon="camera" label="Take a photo of it" onPress={() => void pick(adding, 'camera')} />
              <SourceRow icon="image" label="Choose a photo" onPress={() => void pick(adding, 'library')} />
              <SourceRow icon="file-text" label="Choose a PDF" onPress={() => void pick(adding, 'pdf')} />
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>

      {viewing ? <DocViewer url={viewing.url} doc={viewing.doc} onClose={() => setViewing(null)} /> : null}
    </View>
  );
}

function DocRow({ doc, showKind, onOpen, onDelete }: { doc: TravelDoc; showKind?: boolean; onOpen: () => void; onDelete: () => void }) {
  const pdf = doc.mime === 'application/pdf';
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${doc.label || (doc.kind === 'id' ? 'ID' : 'ticket')}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.7 }]}>
        <View style={styles.rowIcon}>
          <Feather name={pdf ? 'file-text' : doc.kind === 'id' ? 'credit-card' : 'navigation'} size={18} color={colors.olive} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {doc.label || (doc.kind === 'id' ? 'ID' : 'Ticket')}
          </Text>
          <Text style={styles.rowMeta}>
            {showKind ? `${doc.kind === 'id' ? 'ID' : 'Ticket'} · ` : ''}
            {pdf ? 'PDF' : 'Photo'} · added {formatWhen(doc.created_at)}
          </Text>
        </View>
      </Pressable>
      <IconButton icon="trash-2" label={`Delete ${doc.label || 'document'}`} size={18} color={colors.muted} onPress={onDelete} />
    </View>
  );
}

function SourceRow({ icon, label, onPress }: { icon: 'camera' | 'image' | 'file-text'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.source, pressed && { opacity: 0.6 }]}>
      <Feather name={icon} size={19} color={colors.ink} />
      <Text style={styles.sourceText}>{label}</Text>
    </Pressable>
  );
}

/** A photographed document, full screen. The link behind it stops working after two minutes. */
function DocViewer({ url, doc, onClose }: { url: string; doc: TravelDoc; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        <Image source={{ uri: url }} style={{ width, height }} contentFit="contain" cachePolicy="none" />
        <View style={[styles.viewerTop, { paddingTop: insets.top + 4 }]}>
          <IconButton icon="x" label="Close" color={colors.white} size={26} onPress={onClose} />
          <Text style={styles.viewerTitle} numberOfLines={1}>
            {doc.mine ? doc.label : `${doc.by} · ${doc.label}`}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.xxl * 3 },
  lock: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  lockTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginBottom: 2 },
  small: { fontSize: 14.5, lineHeight: 21 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  person: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.ink, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingLeft: space.md,
    paddingRight: 4,
    marginBottom: space.sm,
    minHeight: 64,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  rowMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  busy: {
    position: 'absolute',
    left: space.xl,
    right: space.xl,
    bottom: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    minHeight: 50,
  },
  busyText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.white },
  scrim: { flex: 1, backgroundColor: 'rgba(30,34,24,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    paddingBottom: space.xxl + 8,
    gap: space.sm,
  },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, marginTop: space.sm },
  field: {
    minHeight: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
    marginBottom: space.sm,
  },
  source: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 50 },
  sourceText: { fontFamily: fonts.bodyMedium, fontSize: 16.5, color: colors.ink },
  viewer: { flex: 1, backgroundColor: '#12150F' },
  viewerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    backgroundColor: 'rgba(18,21,15,0.55)',
  },
  viewerTitle: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.white },
});
