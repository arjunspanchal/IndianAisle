import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Accent, Body, Button, Card, Eyebrow, GoldRule, Loading, Notice, Title } from '@/components/ui';
import { api, errorMessage, type Home, type WeddingEvent } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatDayShort, istDayKey } from '@/lib/time';

const MAX_MENU = 4000;

// ───── reading a menu ─────
// Plain text, one dish per line. A line ending in ":" is a heading. A dish may
// end with tags in brackets: (V) (NV) (J) (VG) (GF) (N).

type Tag = 'V' | 'NV' | 'J' | 'VG' | 'GF' | 'N';
const TAGS: Tag[] = ['V', 'NV', 'J', 'VG', 'GF', 'N'];
const isTag = (s: string): s is Tag => (TAGS as string[]).includes(s);

type Line = { kind: 'heading'; text: string } | { kind: 'dish'; text: string; tags: Tag[] };

function parseMenu(menu: string): Line[] {
  const out: Line[] = [];
  for (const raw of menu.split(/\r?\n/)) {
    const whole = raw.trim().replace(/^[-•*]\s+/, '');
    if (!whole) continue;
    if (/[:：]$/.test(whole)) {
      const text = whole.slice(0, -1).trim();
      if (text) out.push({ kind: 'heading', text });
      continue;
    }
    // Take tags off the end, one bracket at a time. "(V) (GF)" and "(V, GF)" both work;
    // a bracket that is not a tag, like "(mild)", stays part of the dish's name.
    let name = whole;
    const tags: Tag[] = [];
    for (;;) {
      const m = /\s*[([]([^()[\]]*)[)\]]\s*$/.exec(name);
      if (!m) break;
      const found = m[1]
        .split(/[\s,\/&+]+/)
        .filter(Boolean)
        .map((s) => s.toUpperCase());
      if (found.length === 0 || !found.every(isTag)) break;
      for (const f of found.filter(isTag).reverse()) if (!tags.includes(f)) tags.unshift(f);
      name = name.slice(0, m.index).trim();
    }
    out.push(name ? { kind: 'dish', text: name, tags } : { kind: 'dish', text: whole, tags: [] });
  }
  return out;
}

function tagWords(tag: Tag): string {
  switch (tag) {
    case 'V':
      return t('Vegetarian');
    case 'NV':
      return t('Non-vegetarian');
    case 'J':
      return t('Jain');
    case 'VG':
      return t('Vegan');
    case 'GF':
      return t('Gluten-free');
    case 'N':
      return t('Contains nuts');
  }
}

const TAG_LOOK: Record<Tag, { bg: string; dot: string; border?: string }> = {
  V: { bg: colors.moss, dot: colors.olive },
  VG: { bg: colors.moss, dot: colors.olive },
  J: { bg: colors.sage, dot: colors.gold },
  GF: { bg: colors.sage, dot: colors.muted },
  NV: { bg: colors.blush, dot: colors.rose },
  N: { bg: colors.card, dot: colors.gold, border: colors.gold },
};

const hasMenu = (e: WeddingEvent) => (e.menu ?? '').trim() !== '';
const dayOf = (e: WeddingEvent) => formatDayShort(istDayKey(e.starts_at));

// Menus: what is being served at each event, as the hosts typed it.
export default function Menus() {
  const { isHost } = useSession();
  const { data, error, loading, reload } = useLoad<Home>(() => api.home(), 120000);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useLive('updates', () => void reload());

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const header = <Stack.Screen options={{ title: t('Menus') }} />;

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
          title={t("Can't load the menus")}
          body={error ? t(error) : undefined}
          action={<Button label={t('Try again')} variant="quiet" onPress={() => void reload()} />}
        />
      </>
    );
  }

  const events = [...data.events].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const days: { day: string; events: WeddingEvent[] }[] = [];
  for (const e of events.filter(hasMenu)) {
    const day = dayOf(e);
    const last = days[days.length - 1];
    if (last && last.day === day) last.events.push(e);
    else days.push({ day, events: [e] });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
        <Eyebrow>{t('Come hungry')}</Eyebrow>
        <Title size={34} style={{ marginTop: 2 }}>
          {t('Menus')}
        </Title>
        <Accent style={{ fontSize: 20, marginTop: 4 }}>{t('What is being served, meal by meal.')}</Accent>

        {days.length === 0 ? (
          <Card tone="blush" style={styles.empty}>
            <Feather name="coffee" size={20} color={colors.rose} style={{ marginTop: 2 }} />
            <Body style={{ flex: 1 }}>{t('Menus will appear here once they are shared.')}</Body>
          </Card>
        ) : null}

        {days.map((d) => (
          <View key={d.day}>
            <View style={styles.section}>
              <Eyebrow>{d.day}</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>
            {d.events.map((e) => (
              <View key={e.id} style={styles.card}>
                <Text style={styles.when}>{e.time_label}</Text>
                <Title size={28}>{e.title}</Title>
                <MenuLines lines={parseMenu(e.menu ?? '')} />
              </View>
            ))}
          </View>
        ))}

        {isHost ? (
          <View style={{ marginTop: space.lg }}>
            <View style={styles.section}>
              <Eyebrow color={colors.rose}>{t('Add or change a menu')}</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>
            <Body muted style={styles.small}>
              {t('Only you see this list. Guests see a menu as soon as you save it.')}
            </Body>
            {events.length === 0 ? (
              <Body muted style={{ marginTop: space.md }}>
                {t('There are no events in the programme yet.')}
              </Body>
            ) : null}
            {events.map((e) =>
              editingId === e.id ? (
                <MenuEditor key={e.id} event={e} onDone={() => setEditingId(null)} onChanged={reload} />
              ) : (
                <View key={e.id} style={styles.hostRow}>
                  <Text style={styles.hostTitle}>{e.title}</Text>
                  <Text style={styles.hostWhen}>
                    {dayOf(e)} · {e.time_label}
                  </Text>
                  <WideButton
                    label={hasMenu(e) ? t('Change the menu') : t('Add a menu')}
                    hint={e.title}
                    icon={hasMenu(e) ? 'edit-2' : 'plus'}
                    variant="quiet"
                    onPress={() => setEditingId(e.id)}
                    style={{ alignSelf: 'flex-start', marginTop: space.sm, minHeight: 48 }}
                  />
                </View>
              ),
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ───── a menu, laid out ─────

function MenuLines({ lines }: { lines: Line[] }) {
  return (
    <View style={{ marginTop: space.sm }}>
      {lines.map((l, i) =>
        l.kind === 'heading' ? (
          <Text key={i} accessibilityRole="header" style={[styles.heading, i === 0 && { marginTop: space.sm }]}>
            {l.text}
          </Text>
        ) : (
          <View
            key={i}
            accessible
            accessibilityLabel={[l.text, ...l.tags.map(tagWords)].join(', ')}
            style={styles.dish}>
            <Text style={styles.dishName}>{l.text}</Text>
            {l.tags.length > 0 ? (
              <View style={styles.tags}>
                {l.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </View>
            ) : null}
          </View>
        ),
      )}
    </View>
  );
}

function TagChip({ tag }: { tag: Tag }) {
  const look = TAG_LOOK[tag];
  return (
    <View style={[styles.tag, { backgroundColor: look.bg, borderColor: look.border ?? look.bg }]}>
      <View style={[styles.tagDot, { backgroundColor: look.dot }]} />
      <Text style={styles.tagText}>{tagWords(tag)}</Text>
    </View>
  );
}

// ───── editing (hosts) ─────

function MenuEditor({ event, onDone, onChanged }: { event: WeddingEvent; onDone: () => void; onChanged: () => Promise<void> }) {
  const [text, setText] = useState(event.menu ?? '');
  const [busy, setBusy] = useState<'save' | 'clear' | null>(null);
  const preview = parseMenu(text);
  // Placeholder wording only: no real dish appears in the example.
  const example = [
    `${t('Starters')}:`,
    `${t('Name of a dish')} (V)`,
    `${t('Name of another dish')} (NV)`,
    `${t('Main course')}:`,
    `${t('Name of a dish')} (J) (GF)`,
    `${t('Name of another dish')} (VG) (N)`,
  ];

  async function send(menu: string, which: 'save' | 'clear') {
    setBusy(which);
    try {
      await api.setMenu(event.id, menu);
      await onChanged();
      onDone();
    } catch (e) {
      tell(t(errorMessage(e)));
    } finally {
      setBusy(null);
    }
  }

  function clear() {
    confirm(t('Clear this menu?'), t('Guests will no longer see a menu for {title}.', { title: event.title }), t('Clear the menu'), () => void send('', 'clear'));
  }

  function save() {
    const menu = text.trim();
    if (menu) void send(menu, 'save');
    else if (hasMenu(event)) clear();
    else tell(t('Please write the menu first.'));
  }

  return (
    <View style={[styles.card, styles.cardEditing]}>
      <Text style={styles.when}>
        {dayOf(event)} · {event.time_label}
      </Text>
      <Title size={28}>{event.title}</Title>

      <Body muted style={[styles.small, { marginTop: space.sm }]}>
        {t('Write one dish on each line. To make a heading, end the line with a colon (:). To mark a dish, put one or more of these tags in brackets after it:')}
      </Body>
      <View style={styles.legend}>
        {TAGS.map((tag) => (
          <Text key={tag} style={styles.legendItem}>
            <Text style={styles.legendCode}>({tag})</Text> {tagWords(tag)}
          </Text>
        ))}
      </View>

      <View style={styles.example} accessible accessibilityLabel={`${t('Example only. This is not the real menu.')} ${example.join('. ')}`}>
        <Text style={styles.exampleFlag}>{t('Example only. This is not the real menu.')}</Text>
        {example.map((line, i) => (
          <Text key={i} style={styles.exampleLine}>
            {line}
          </Text>
        ))}
      </View>

      <Text style={styles.label}>{t('The menu')}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('Type or paste the menu here')}
        placeholderTextColor="#9A9C8E"
        multiline
        maxLength={MAX_MENU}
        autoCapitalize="sentences"
        style={styles.editor}
        accessibilityLabel={t('The menu for {title}', { title: event.title })}
      />

      {preview.length > 0 ? (
        <View style={styles.preview}>
          <Eyebrow>{t('How guests will see it')}</Eyebrow>
          <MenuLines lines={preview} />
        </View>
      ) : null}

      <GoldRule style={{ marginVertical: space.lg }} />
      <View style={styles.actions}>
        <Button label={t('Save')} busy={busy === 'save'} disabled={busy !== null} onPress={save} style={{ flex: 1 }} />
        <Button label={t('Cancel')} variant="quiet" disabled={busy !== null} onPress={onDone} />
      </View>
      {hasMenu(event) ? (
        <WideButton
          label={t('Clear the menu')}
          icon="trash-2"
          variant="ghost"
          busy={busy === 'clear'}
          disabled={busy !== null}
          onPress={clear}
          style={{ alignSelf: 'flex-start', marginTop: space.sm, paddingHorizontal: 0 }}
        />
      ) : null}
    </View>
  );
}

// A button whose label may run to two lines (long wording, large text, Gujarati).
function WideButton({
  label,
  hint,
  onPress,
  variant = 'primary',
  icon,
  busy,
  disabled,
  style,
}: {
  label: string;
  /** Read out after the label, to say which event the button is for. */
  hint?: string;
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
      accessibilityLabel={hint ? `${label}: ${hint}` : label}
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
  empty: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: 2 },
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
  cardEditing: { borderColor: colors.rose, borderLeftColor: colors.rose },
  when: { fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.olive, marginBottom: 2 },

  heading: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.olive,
    marginTop: space.lg,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dish: { paddingVertical: 7 },
  dishName: { fontFamily: fonts.body, fontSize: 17.5, color: colors.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.ink },

  hostRow: { paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.line, marginTop: space.md },
  hostTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  hostWhen: { fontFamily: fonts.body, fontSize: 14.5, color: colors.muted, marginTop: 2 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: 4, marginTop: space.sm },
  legendItem: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  legendCode: { fontFamily: fonts.bodyBold, color: colors.rose },
  example: {
    marginTop: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    backgroundColor: colors.sage,
    padding: space.md,
  },
  exampleFlag: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.rose, marginBottom: 6 },
  exampleLine: { fontFamily: fonts.body, fontSize: 15.5, color: colors.muted },
  label: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink, marginTop: space.lg, marginBottom: 6 },
  editor: {
    minHeight: 190,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    padding: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  preview: { marginTop: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },

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
});
