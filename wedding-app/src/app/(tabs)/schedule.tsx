import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Accent, Body, Button, Card, Eyebrow, Loading, Notice, ScreenHeader, Title } from '@/components/ui';
import { api, errorMessage, type Home, type WeddingEvent } from '@/lib/api';
import { tell } from '@/lib/dialog';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';
import { formatDayLong, istDayKey } from '@/lib/time';

const DAY_WORDS = ['One', 'Two', 'Three'];

// The programme, one day at a time: pick a day at the top, then read down.
// Each event is a card with its time, where it is and what to wear.
export default function Schedule() {
  const { isHost } = useSession();
  const { data, error, loading, reload } = useLoad<Home>(() => api.home(), 120000);
  const [refreshing, setRefreshing] = useState(false);
  const [day, setDay] = useState<number | null>(null);

  useLive('updates', () => void reload());

  const events = data?.events ?? [];
  const days = [1, 2, 3].filter((d) => events.some((e) => e.day === d));

  // Open on today's day during the wedding, otherwise on Day One.
  useEffect(() => {
    if (day !== null || events.length === 0) return;
    const today = istDayKey();
    const current = events.find((e) => istDayKey(e.starts_at) === today);
    setDay(current?.day ?? days[0] ?? 1);
  }, [day, events, days]);

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const now = Date.now();
  const shown = events.filter((e) => e.day === day);
  const anyDress = events.some((e) => e.dress);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader eyebrow={wedding.dates} title="The programme" />
      {loading && !data ? (
        <Loading />
      ) : !data ? (
        <Notice
          icon="cloud-off"
          title="Can't load the programme"
          body={error ?? undefined}
          action={<Button label="Try again" variant="quiet" onPress={() => void reload()} />}
        />
      ) : (
        <>
          <View style={styles.tabs} accessibilityRole="tablist">
            {days.map((d) => {
              const on = d === day;
              const first = events.find((e) => e.day === d)!;
              const [weekday, rest] = formatDayLong(istDayKey(first.starts_at)).split(', ');
              return (
                <Pressable
                  key={d}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Day ${DAY_WORDS[d - 1]}, ${weekday} ${rest}`}
                  onPress={() => setDay(d)}
                  style={[styles.tab, on && styles.tabOn]}>
                  <Text style={[styles.tabDay, on && { color: colors.white }]}>{weekday.slice(0, 3)}</Text>
                  <Text style={[styles.tabDate, on && { color: colors.white }]}>{rest.split(' ')[0]}</Text>
                  <Text style={[styles.tabMonth, on && { color: '#F3DDE4' }]}>{rest.split(' ')[1].slice(0, 3)}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
            {day !== null ? (
              <View style={styles.dayHead}>
                <Eyebrow>Day {DAY_WORDS[day - 1]}</Eyebrow>
                <Title size={32} style={{ marginTop: 2 }}>
                  {wedding.dayNames[day - 1]}
                </Title>
                <Accent style={{ fontSize: 19, marginTop: 4 }}>{wedding.dayLines[day - 1]}</Accent>
              </View>
            ) : null}

            {!anyDress ? (
              <Card tone="blush" style={styles.wear}>
                <Feather name="scissors" size={18} color={colors.rose} style={{ marginTop: 3 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.wearTitle}>What to wear</Text>
                  <Body muted style={{ fontSize: 15, lineHeight: 21 }}>
                    {wedding.dressInterim}
                  </Body>
                </View>
              </Card>
            ) : null}

            {shown.map((e) => (
              <EventCard key={e.id} event={e} now={now} isHost={isHost} onChanged={reload} />
            ))}

            <Body muted style={styles.foot}>
              All times are India time. If plans shift, you'll see it on the Today tab first.
            </Body>
          </ScrollView>
        </>
      )}
    </View>
  );
}

function EventCard({ event, now, isHost, onChanged }: { event: WeddingEvent; now: number; isHost: boolean; onChanged: () => void }) {
  const start = new Date(event.starts_at).getTime();
  const end = event.ends_at ? new Date(event.ends_at).getTime() : start + 90 * 60000;
  const live = start <= now && now < end;
  const done = now >= end;

  const [editing, setEditing] = useState(false);
  const [dress, setDress] = useState(event.dress);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.setDress(event.id, dress);
      setEditing(false);
      onChanged();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // "3:00 pm onwards" → big "3:00 pm", small "onwards"; ranges stay whole.
  const [timeMain, timeRest] = event.time_label.includes('–')
    ? [event.time_label, '']
    : [event.time_label.replace(/ onwards$/, ''), event.time_label.endsWith('onwards') ? 'onwards' : ''];

  return (
    <View style={[styles.card, live && styles.cardLive, done && { opacity: 0.55 }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.time, live && { color: colors.rose }]}>
          {timeMain}
          {timeRest ? <Text style={styles.timeRest}> {timeRest}</Text> : null}
        </Text>
        {live ? (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Now</Text>
          </View>
        ) : null}
      </View>
      <Title size={26}>{event.title}</Title>
      {event.note ? <Body muted style={{ marginTop: 2 }}>{event.note}</Body> : null}

      {editing ? (
        <View style={{ marginTop: space.sm }}>
          <TextInput
            value={dress}
            onChangeText={setDress}
            placeholder="e.g. Yellows and florals"
            placeholderTextColor="#9A9C8E"
            maxLength={200}
            autoFocus
            style={styles.dressInput}
            accessibilityLabel={`What to wear for ${event.title}`}
          />
          <View style={styles.dressActions}>
            <Button label="Save" onPress={() => void save()} busy={busy} style={{ minHeight: 44 }} />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => {
                setDress(event.dress);
                setEditing(false);
              }}
            />
          </View>
        </View>
      ) : event.dress ? (
        <View style={styles.dressRow}>
          <Feather name="scissors" size={15} color={colors.rose} style={{ marginTop: 4 }} />
          <Body style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold }}>Wear: </Text>
            {event.dress}
          </Body>
          {isHost ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Change what to wear for ${event.title}`} hitSlop={10} onPress={() => setEditing(true)}>
              <Feather name="edit-2" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : isHost ? (
        <Button
          label="Add what to wear"
          icon="plus"
          variant="ghost"
          onPress={() => setEditing(true)}
          style={{ alignSelf: 'flex-start', marginLeft: -space.md, marginTop: 2 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.moss,
  },
  tabOn: { backgroundColor: colors.rose },
  tabDay: { fontFamily: fonts.bodyMedium, fontSize: 12.5, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.muted },
  tabDate: { fontFamily: fonts.displayMedium, fontSize: 30, lineHeight: 34, color: colors.ink },
  tabMonth: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md },
  dayHead: { paddingHorizontal: 4, paddingTop: space.sm, paddingBottom: space.xs },
  wear: { flexDirection: 'row', gap: space.md },
  wearTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginBottom: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    padding: space.lg,
  },
  cardLive: { backgroundColor: colors.blush, borderColor: colors.rose, borderLeftColor: colors.rose },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  time: { fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.olive },
  timeRest: { fontFamily: fonts.body, textTransform: 'none', letterSpacing: 0, color: colors.muted },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.rose,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.white },
  dressRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.line },
  dressInput: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  dressActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  foot: { textAlign: 'center', fontSize: 14.5, marginTop: space.sm },
});
