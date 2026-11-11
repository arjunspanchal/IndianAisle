import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Eyebrow, GoldRule, Loading, Notice, Title } from '@/components/ui';
import { api, errorMessage, type Wish, type Wishes } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatDayLong, istDayKey } from '@/lib/time';

const MAX_LENGTH = 1500;
/** The counter appears once the wish is this long. */
const COUNTER_FROM = 1300;
/** The server keeps up to this many wishes per guest. */
const MAX_WISHES = 5;

/** "Wednesday, 20 January" in India time, with the day and month names translated. */
function dayLong(iso: string): string {
  const english = formatDayLong(istDayKey(iso));
  const m = /^(\S+), (\d+) (\S+)$/.exec(english);
  if (!m) return english;
  return t('{weekday}, {day} {month}', { weekday: t(m[1]), day: m[2], month: t(m[3]) });
}

// Notes for the couple that stay sealed until after the wedding. A guest only
// ever gets their own wishes back; the hosts see how many are waiting and,
// once the wishes are opened, every one of them.
export default function WishesScreen() {
  const { isHost } = useSession();
  const { data, error, loading, reload } = useLoad<Wishes>(() => api.wishes());
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const boxY = useRef(0);

  useLive('updates', () => void reload());

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const header = <Stack.Screen options={{ title: t('Wishes') }} />;

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
          title={t("Can't load the wishes")}
          body={error ?? undefined}
          action={<Button label={t('Try again')} variant="quiet" onPress={() => void reload()} />}
        />
      </>
    );
  }

  const opened = data.opened;
  const all = isHost ? data.all : null;
  const mine = [...data.mine].reverse(); // newest first
  const atLimit = editingId === null && data.mine.length >= MAX_WISHES;
  const left = MAX_LENGTH - draft.length;
  const openDate = data.open_at ? dayLong(data.open_at) : null;

  async function save() {
    const text = draft.trim();
    if (!text || saving) return;
    const wasEdit = editingId !== null;
    setSaving(true);
    try {
      await api.wishSave(text, editingId);
      setDraft('');
      setEditingId(null);
      await reload();
      if (wasEdit) tell(t('Your wish is updated'));
      else if (opened) tell(t('Your wish is sent'), t('Kashika & Arjun can read it now.'));
      else tell(t('Your wish is sealed'), t('It is safely kept for Kashika & Arjun.'));
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(w: Wish) {
    const go = () => {
      setEditingId(w.id);
      setDraft(w.body);
      scroll.current?.scrollTo({ y: Math.max(0, boxY.current - space.md), animated: true });
      setTimeout(() => input.current?.focus(), 250);
    };
    // Don't silently throw away a wish that is half written.
    if (editingId === null && draft.trim()) {
      confirm(
        t('Replace what you have written?'),
        t('The wish you are writing has not been sealed yet. Editing another one will clear it.'),
        t('Replace'),
        go,
      );
    } else go();
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft('');
  }

  function remove(w: Wish) {
    confirm(t('Delete this wish?'), t('It will be removed for good.'), t('Delete'), async () => {
      setDeleting(w.id);
      try {
        await api.wishDelete(w.id);
        if (editingId === w.id) cancelEdit();
        await reload();
      } catch (e) {
        tell(errorMessage(e));
      } finally {
        setDeleting(null);
      }
    });
  }

  function openNow() {
    confirm(
      t('Open the wishes now?'),
      t('You will be able to read every wish straight away. This cannot be undone.'),
      t('Open them now'),
      async () => {
        setOpening(true);
        try {
          await api.wishesOpenNow();
          await reload();
        } catch (e) {
          tell(errorMessage(e));
        } finally {
          setOpening(false);
        }
      },
    );
  }

  const intro = opened
    ? t('The wishes have been opened, and Kashika & Arjun are reading them. You can still write one. Only they will see it.')
    : openDate
      ? t('Write a note for Kashika & Arjun. Every wish stays sealed, and no one else can read it. They will open and read them all from {date}.', {
          date: openDate,
        })
      : t('Write a note for Kashika & Arjun. Every wish stays sealed, and no one else can read it. They will open and read them all after the wedding.');

  const waiting = data.count ?? 0;

  return (
    <>
      {header}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.paper }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={96}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
          <Eyebrow>{t('Sealed with love')}</Eyebrow>
          <Title size={34} style={{ marginTop: 2 }}>
            {t('Wishes for Kashika & Arjun')}
          </Title>

          <Card tone="blush" style={styles.intro}>
            <Feather name={opened ? 'unlock' : 'lock'} size={20} color={colors.rose} style={{ marginTop: 3 }} />
            <Body style={styles.introText}>{intro}</Body>
          </Card>

          {/* Hosts, before opening: how many are waiting, and the way to open them early. */}
          {isHost && !all ? (
            <Card tone="sage" style={styles.waiting}>
              <Eyebrow>{t('Only you see this')}</Eyebrow>
              <Title size={28} style={{ marginTop: 4 }}>
                {waiting === 0 ? t('No wishes yet') : waiting === 1 ? t('1 wish is waiting') : t('{n} wishes are waiting', { n: waiting })}
              </Title>
              <Body muted style={{ marginTop: 6 }}>
                {openDate
                  ? t('They stay sealed until {date}. You can open them sooner if you like.', { date: openDate })
                  : t('They stay sealed until you open them.')}
              </Body>
              {!opened ? (
                <Button label={t('Open them now')} icon="unlock" variant="quiet" busy={opening} onPress={openNow} style={{ marginTop: space.lg }} />
              ) : null}
            </Card>
          ) : null}

          {/* Hosts, after opening: every wish, laid out for reading. */}
          {all ? (
            <>
              <View style={styles.section}>
                <Eyebrow color={colors.rose}>{t('Every wish')}</Eyebrow>
                <GoldRule style={styles.sectionRule} />
              </View>
              <Body muted>
                {all.length === 0
                  ? t('No one has written a wish yet.')
                  : all.length === 1
                    ? t('1 wish, opened for you to read.')
                    : t('{n} wishes, opened for you to read.', { n: all.length })}
              </Body>
              {all.map((w) => (
                <View key={w.id} style={styles.letter}>
                  <Text selectable style={styles.letterBody}>
                    {w.body}
                  </Text>
                  <GoldRule style={styles.letterRule} />
                  <Text style={styles.letterBy}>{w.by ?? t('A guest')}</Text>
                  <Text style={styles.meta}>{dayLong(w.created_at)}</Text>
                </View>
              ))}
            </>
          ) : null}

          {/* Everyone: write a wish. */}
          <View onLayout={(e) => (boxY.current = e.nativeEvent.layout.y)}>
            <View style={styles.section}>
              <Eyebrow>{t('Write a wish')}</Eyebrow>
              <GoldRule style={styles.sectionRule} />
            </View>
            {atLimit ? (
              <Card tone="sage">
                <Body>
                  {t('You have sealed {n} wishes, the most each guest can keep. To write another, edit or delete one below.', { n: MAX_WISHES })}
                </Body>
              </Card>
            ) : (
              <Card style={editingId ? styles.cardEditing : null}>
                {editingId ? <Text style={styles.label}>{t('Editing your wish')}</Text> : null}
                <TextInput
                  ref={input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={t('e.g. Wishing you both a lifetime of laughter, long walks and good chai.')}
                  placeholderTextColor="#9A9C8E"
                  multiline
                  maxLength={MAX_LENGTH}
                  style={styles.box}
                  accessibilityLabel={t('Your wish for Kashika & Arjun')}
                />
                {draft.length >= COUNTER_FROM ? (
                  <Text style={[styles.counter, left <= 50 && { color: colors.rose }]} accessibilityLiveRegion="polite">
                    {left === 1 ? t('1 character left') : t('{n} characters left', { n: left })}
                  </Text>
                ) : null}
                <Button
                  label={editingId ? t('Save my wish') : opened ? t('Send my wish') : t('Seal my wish')}
                  icon={editingId ? 'check' : opened ? 'send' : 'lock'}
                  busy={saving}
                  disabled={!draft.trim()}
                  onPress={() => void save()}
                  style={{ marginTop: space.md }}
                />
                {editingId ? (
                  <Button label={t('Cancel')} variant="ghost" disabled={saving} onPress={cancelEdit} style={{ marginTop: 4, minHeight: 48 }} />
                ) : null}
              </Card>
            )}
          </View>

          {/* Everyone: the wishes they have written. */}
          <View style={styles.section}>
            <Eyebrow>{t('Your wishes')}</Eyebrow>
            <GoldRule style={styles.sectionRule} />
          </View>
          <Body muted style={{ fontSize: 15 }}>
            {mine.length === 0 ? t('You have not written a wish yet.') : t('You can keep up to {n} wishes.', { n: MAX_WISHES })}
          </Body>
          {mine.map((w) => (
            <Card key={w.id} style={[styles.mine, editingId === w.id ? styles.cardEditing : null]}>
              <Text style={styles.mineBody}>{w.body}</Text>
              <Text style={styles.meta}>{t('Written on {date}', { date: dayLong(w.created_at) })}</Text>
              <View style={styles.mineActions}>
                <Button label={t('Edit')} icon="edit-2" variant="quiet" disabled={deleting !== null} onPress={() => startEdit(w)} style={styles.smallButton} />
                <Button
                  label={t('Delete')}
                  icon="trash-2"
                  variant="ghost"
                  busy={deleting === w.id}
                  disabled={deleting !== null}
                  onPress={() => remove(w)}
                  style={styles.smallButton}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
  intro: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  introText: { flex: 1, fontSize: 17, lineHeight: 25 },
  waiting: { marginTop: space.md },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  sectionRule: { flex: 1, marginLeft: space.md },
  cardEditing: { borderColor: colors.rose, borderWidth: 1.5 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.rose, marginBottom: space.sm },
  box: {
    minHeight: 160,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    padding: space.md,
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 26,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  counter: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.muted, textAlign: 'right', marginTop: 6 },
  mine: { marginTop: space.md },
  mineBody: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 14.5, color: colors.muted, marginTop: 6 },
  mineActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.md },
  smallButton: { minHeight: 46, paddingHorizontal: space.lg },
  letter: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    padding: space.xl,
    marginTop: space.md,
  },
  letterBody: { fontFamily: fonts.body, fontSize: 18, lineHeight: 28, color: colors.ink },
  letterRule: { width: 48, marginTop: space.lg, marginBottom: space.sm },
  letterBy: { fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 28, color: colors.ink },
});
