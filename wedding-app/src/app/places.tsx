import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Eyebrow, GoldRule, Loading, Notice, Title } from '@/components/ui';
import { api, errorMessage, type Seating } from '@/lib/api';
import { tell } from '@/lib/dialog';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';

type Kind = 'sangeet' | 'room';

const WORDS: Record<Kind, { eyebrow: string; unit: string; mine: string; none: string; example: string }> = {
  sangeet: {
    eyebrow: 'Sangeet seating',
    unit: 'Table',
    mine: 'Your Sangeet table',
    none: "Tables haven't been shared yet. They'll appear here when they are.",
    example: '1: Asha Mehta, Rohan Shah\n2: Meera Iyer, Kabir Khan',
  },
  room: {
    eyebrow: 'Your room',
    unit: 'Room',
    mine: 'Your room',
    none: "Rooms haven't been shared yet. They'll appear here when they are.",
    example: '204: Asha Mehta, Rohan Shah\n305: Meera Iyer',
  },
};

/** "4: Asha, Rohan" per line → rows. Also accepts "Table 4 - Asha, Rohan". */
function parse(text: string): { table_no: string; name: string }[] {
  const rows: { table_no: string; name: string }[] = [];
  for (const line of text.split('\n')) {
    const m = /^\s*(?:table|room)?\s*([\w-]+)\s*[:\-–]\s*(.+)$/i.exec(line);
    if (!m) continue;
    for (const name of m[2].split(/[,;]/)) {
      if (name.trim()) rows.push({ table_no: m[1].trim(), name: name.trim() });
    }
  }
  return rows;
}

// Where am I sitting, and which room am I in?
export default function Places() {
  const { isHost, guest } = useSession();
  const tables = useLoad<Seating>(() => api.seating('sangeet'));
  const rooms = useLoad<Seating>(() => api.seating('room'));
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  useLive('updates', () => {
    void tables.reload();
    void rooms.reload();
  });

  async function refresh() {
    setRefreshing(true);
    await Promise.all([tables.reload(), rooms.reload()]);
    setRefreshing(false);
  }

  if ((tables.loading && !tables.data) || (rooms.loading && !rooms.data)) return <Loading />;
  if (!tables.data || !rooms.data)
    return (
      <Notice
        icon="cloud-off"
        title="Can't load this right now"
        body={tables.error ?? rooms.error ?? undefined}
        action={<Button label="Try again" variant="quiet" onPress={() => void refresh()} />}
      />
    );

  const q = query.trim().toLowerCase();
  const chart = q ? tables.data.tables.filter((t) => t.names.some((n) => n.toLowerCase().includes(q))) : tables.data.tables;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
        <Mine kind="room" data={rooms.data} myName={guest?.name ?? ''} />
        <Mine kind="sangeet" data={tables.data} myName={guest?.name ?? ''} />

        {tables.data.tables.length > 0 ? (
          <>
            <View style={styles.section}>
              <Eyebrow>All Sangeet tables</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search for a name"
              placeholderTextColor="#9A9C8E"
              autoCorrect={false}
              style={styles.search}
              accessibilityLabel="Search the seating chart by name"
            />
            {chart.length === 0 ? <Body muted>No one by that name on the chart.</Body> : null}
            {chart.map((t) => (
              <Card key={t.table_no} style={[styles.table, t.table_no === tables.data!.my_table && styles.tableMine]}>
                <Text style={styles.tableNo}>
                  {WORDS.sangeet.unit} {t.table_no}
                </Text>
                <Body muted style={{ flex: 1 }}>
                  {t.names.join(' · ')}
                </Body>
              </Card>
            ))}
          </>
        ) : null}

        {isHost ? (
          <>
            <Editor kind="sangeet" current={tables.data} onSaved={() => void tables.reload()} />
            <Editor kind="room" current={rooms.data} onSaved={() => void rooms.reload()} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Mine({ kind, data, myName }: { kind: Kind; data: Seating; myName: string }) {
  const w = WORDS[kind];
  const published = data.tables.length > 0 || data.my_table !== null;
  const mates = data.tables.find((t) => t.table_no === data.my_table)?.names.filter((n) => n.trim().toLowerCase() !== myName.trim().toLowerCase()) ?? [];
  return (
    <Card tone={kind === 'room' ? 'sage' : 'blush'} style={styles.mine}>
      <Eyebrow>{w.mine}</Eyebrow>
      {data.my_table ? (
        <>
          <Text style={styles.big} accessibilityLabel={`${w.unit} ${data.my_table}`}>
            {data.my_table}
          </Text>
          {mates.length > 0 ? (
            <Body muted style={{ textAlign: 'center' }}>
              With {mates.join(', ')}
            </Body>
          ) : null}
        </>
      ) : (
        <Body muted style={{ textAlign: 'center', marginTop: space.sm }}>
          {published
            ? kind === 'room'
              ? "We couldn't match your name to a room. Please ask the wedding team."
              : "We couldn't match your name. Search for it in the chart below."
            : w.none}
        </Body>
      )}
    </Card>
  );
}

/** Hosts only: paste the whole list; it replaces the last one. */
function Editor({ kind, current, onSaved }: { kind: Kind; current: Seating; onSaved: () => void }) {
  const w = WORDS[kind];
  const [text, setText] = useState(() => current.tables.map((t) => `${t.table_no}: ${t.names.join(', ')}`).join('\n'));
  const [busy, setBusy] = useState(false);
  const rows = parse(text);

  async function save() {
    setBusy(true);
    try {
      const r = await api.seatingSet(kind, rows);
      tell('Saved', `${r.saved} ${r.saved === 1 ? 'person' : 'people'} placed. Guests can see it now.`);
      onSaved();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.section}>
        <Eyebrow color={colors.rose}>{kind === 'sangeet' ? 'Set the Sangeet tables' : 'Set the rooms'}</Eyebrow>
        <GoldRule style={{ flex: 1, marginLeft: space.md }} />
      </View>
      <Card>
        <Body muted style={styles.small}>
          One {w.unit.toLowerCase()} per line: the number, a colon, then the names with commas. Use each guest's full name, the same as they type
          when they join. Saving replaces the whole list.
        </Body>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={w.example}
          placeholderTextColor="#9A9C8E"
          multiline
          autoCorrect={false}
          autoCapitalize="words"
          style={styles.editor}
          accessibilityLabel={kind === 'sangeet' ? 'Sangeet table list' : 'Room list'}
        />
        <View style={styles.editorFoot}>
          <Feather name="users" size={15} color={colors.muted} />
          <Body muted style={[styles.small, { flex: 1 }]}>
            {rows.length} {rows.length === 1 ? 'person' : 'people'} recognised
          </Body>
          <Button label="Save" onPress={() => void save()} busy={busy} style={{ minHeight: 44 }} />
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.xxl * 2 },
  mine: { alignItems: 'center', paddingVertical: space.xl, marginBottom: space.md },
  big: { fontFamily: fonts.display, fontSize: 72, lineHeight: 78, color: colors.ink, marginTop: 4 },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  search: {
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
    marginBottom: space.md,
  },
  table: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginBottom: space.sm },
  tableMine: { borderColor: colors.rose, borderWidth: 1.5 },
  tableNo: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, minWidth: 78, marginTop: 2 },
  small: { fontSize: 14.5, lineHeight: 21 },
  editor: {
    minHeight: 150,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    padding: space.md,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
    textAlignVertical: 'top',
    marginTop: space.md,
  },
  editorFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
});
