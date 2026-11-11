import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WeatherLine } from '@/components/Weather';
import { Accent, Body, Button, Card, Eyebrow, GoldRule, IconButton, Loading, Notice, Title } from '@/components/ui';
import { arrivalStatus, enableArrival, type ArrivalStatus } from '@/lib/arrival';
import { api, errorMessage, type Rsvp, type Home, type SosAlert, type SosState, type Update, type WeddingEvent } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { useLive, useLoad } from '@/lib/live';
import { enablePush, pushStatus, type PushStatus } from '@/lib/push';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';
import { daysBetween, formatWhen } from '@/lib/time';

export default function Today() {
  const insets = useSafeAreaInsets();
  const { guest, isHost, isVendor } = useSession();
  const { data, error, loading, reload } = useLoad<Home>(() => api.home(), 60000);
  const [refreshing, setRefreshing] = useState(false);
  const [push, setPush] = useState<PushStatus>('unavailable');

  const [arrival, setArrival] = useState<ArrivalStatus>('unavailable');

  useEffect(() => {
    void pushStatus().then(setPush);
    void arrivalStatus().then(setArrival);
  }, []);

  // Has this person replied yet? (Vendors aren't asked.)
  const rsvp = useLoad<Rsvp | null>(() => (isVendor ? Promise.resolve(null) : api.rsvpGet()));

  // Hosts keep an eye on open SOS alerts; a new one arrives as an 'updates' nudge (and a push).
  const sos = useLoad<SosState>(() => api.sosState(), isHost ? 30000 : undefined);

  useLive('updates', () => {
    void reload();
    void sos.reload();
  });
  useLive('quiz', () => void reload());

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const firstName = guest?.name.split(' ')[0] ?? '';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingBottom: space.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
      <View style={[styles.hero, { paddingTop: insets.top + space.md }]}>
        <Image source={require('../../../assets/florals/hills-watercolour.webp')} style={styles.hills} contentFit="cover" />
        <View style={styles.heroRow}>
          <Image source={require('../../../assets/florals/parrot.webp')} style={styles.parrot} contentFit="contain" />
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="SOS. Ask the wedding team for help"
            onPress={() => router.push('/sos')}
            style={({ pressed }) => [styles.sos, pressed && { opacity: 0.75 }]}>
            <Feather name="alert-circle" size={16} color={colors.white} />
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="You and the wedding details"
            onPress={() => router.push('/me')}
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.7 }]}>
            <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </View>
        <Eyebrow>{wedding.tagline}</Eyebrow>
        <Text style={styles.names} accessibilityRole="header">
          {wedding.first} <Accent style={{ fontSize: 38 }}>&</Accent> {wedding.second}
        </Text>
        <Body muted style={{ marginTop: 4 }}>
          Hello, {firstName}. {isVendor ? 'Thank you for making this happen.' : "So glad you're here."}
        </Body>
        <WeatherLine />
      </View>

      <View style={styles.stack}>
        {loading && !data ? (
          <Loading />
        ) : !data ? (
          <Notice
            icon="cloud-off"
            title="Can't reach the wedding"
            body={error ?? undefined}
            action={<Button label="Try again" variant="quiet" onPress={() => void reload()} />}
          />
        ) : (
          <>
            {isHost ? (sos.data?.open ?? []).map((a) => <SosCard key={a.id} alert={a} onHandled={() => void sos.reload()} />) : null}

            {!isVendor && !rsvp.loading && !rsvp.error ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={rsvp.data ? 'See or change your RSVP' : 'Reply to the invitation'}
                onPress={() => router.push('/rsvp')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card tone={rsvp.data ? 'card' : 'blush'} style={[styles.row, !rsvp.data && styles.pinned]}>
                  <View style={[styles.badge, { backgroundColor: colors.rose }]}>
                    <Feather name={rsvp.data ? 'check' : 'mail'} size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {rsvp.data ? (rsvp.data.attending ? `You're coming · ${rsvp.data.people}` : "You can't make it") : 'Will you join us?'}
                    </Text>
                    <Body muted style={styles.rowBody}>
                      {rsvp.data ? (isHost ? 'Tap to see every reply and the headcount.' : 'Tap to change your reply.') : 'Please RSVP. It takes a minute.'}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            ) : null}

            <NowCard events={data.events} />

            {push === 'ask' ? (
              <Card style={styles.row}>
                <View style={[styles.badge, { backgroundColor: colors.olive }]}>
                  <Feather name="bell" size={20} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Don't miss a thing</Text>
                  <Body muted style={styles.rowBody}>
                    Get a nudge when something's starting, and when the photos develop.
                  </Body>
                  <Button
                    label="Turn on notifications"
                    variant="quiet"
                    onPress={() => void enablePush().then(setPush)}
                    style={{ alignSelf: 'flex-start', marginTop: space.sm, minHeight: 44 }}
                  />
                </View>
              </Card>
            ) : null}

            {arrival === 'ask' && !isVendor ? (
              <Card style={styles.row}>
                <View style={[styles.badge, { backgroundColor: colors.olive }]}>
                  <Feather name="map-pin" size={20} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>A welcome when you arrive</Text>
                  <Body muted style={styles.rowBody}>
                    Get a hello when you reach Chandigarh and again as you near the resort. Your location stays on your phone.
                  </Body>
                  <Button
                    label="Tell me when I arrive"
                    variant="quiet"
                    onPress={() => void enableArrival().then(setArrival)}
                    style={{ alignSelf: 'flex-start', marginTop: space.sm, minHeight: 44 }}
                  />
                </View>
              </Card>
            ) : null}

            {isVendor ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the camera"
              onPress={() => router.push('/camera')}
              style={({ pressed }) => pressed && { opacity: 0.85 }}>
              <Card tone="moss" style={styles.row}>
                <View style={styles.badge}>
                  <Feather name="camera" size={20} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{Math.max(data.camera.limit - data.camera.used, 0)} shots left on today's roll</Text>
                  <Body muted style={styles.rowBody}>
                    No peeking. Photos develop overnight.
                  </Body>
                </View>
                <Feather name="chevron-right" size={22} color={colors.muted} />
              </Card>
            </Pressable>
            )}

            {isVendor ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open the outfits guide"
                onPress={() => router.push('/outfits')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.rose }]}>
                    <Feather name="scissors" size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>What to wear</Text>
                    <Body muted style={styles.rowBody}>
                      {isHost ? 'Set the colours and dress code for each celebration.' : 'Colours and dress codes, celebration by celebration.'}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            )}

            {isVendor ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open your table and room"
                onPress={() => router.push('/places')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                    <Feather name="map" size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{isHost ? 'Tables & rooms' : 'Your table & room'}</Text>
                    <Body muted style={styles.rowBody}>
                      {isHost ? 'Set the Sangeet tables and room numbers.' : 'Your room number and your Sangeet table.'}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            )}

            {isVendor ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open travel documents"
                onPress={() => router.push('/docs')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.olive }]}>
                    <Feather name="lock" size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{isHost ? "Guests' travel documents" : 'Your ID and tickets'}</Text>
                    <Body muted style={styles.rowBody}>
                      {isHost ? 'The private vault of IDs and tickets.' : 'Share them privately with the wedding team for travel.'}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            )}

            {!isVendor && (data.quiz.total > 0 || isHost) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open the couple quiz"
                onPress={() => router.push('/quiz')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card tone="blush" style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.rose }]}>
                    <Feather name="help-circle" size={20} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>How well do you know us?</Text>
                    <Body muted style={styles.rowBody}>
                      {data.quiz.total === 0
                        ? 'No questions yet. Add the first one.'
                        : `${data.quiz.answered} of ${data.quiz.total} answered`}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            ) : null}

            <View style={styles.sectionHead}>
              <Eyebrow>From {wedding.couple}</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>

            {isHost ? <Composer onPosted={reload} /> : null}

            {data.updates.length === 0 ? (
              <Card>
                <Body muted>Nothing yet. News from the couple will appear here as the days unfold.</Body>
              </Card>
            ) : (
              data.updates.map((u) => <UpdateCard key={u.id} update={u} now={data.now} canDelete={isHost} onChanged={reload} />)
            )}

            <View style={styles.sectionHead}>
              <Eyebrow>Good to know</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>
            <Card>
              <Title size={22}>{wedding.venue}</Title>
              <Body muted style={{ marginTop: 6 }}>
                {wedding.gettingThere}
              </Body>
              <View style={styles.links}>
                <Button label="Travel, weather & FAQs" icon="info" variant="quiet" onPress={() => router.push('/info')} />
                <Button label="Open in Maps" variant="ghost" onPress={() => void Linking.openURL(wedding.mapsUrl)} />
              </View>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}

/** Hosts only: someone has asked for help. Stays until a host marks it handled. */
function SosCard({ alert, onHandled }: { alert: SosAlert; onHandled: () => void }) {
  const [busy, setBusy] = useState(false);
  async function handled() {
    setBusy(true);
    try {
      await api.sosResolve(alert.id);
      onHandled();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const who = alert.role === 'vendor' ? `${alert.by} (${alert.team ?? 'vendor'} team)` : alert.by;
  return (
    <Card style={styles.sosCard}>
      <View style={styles.liveRow}>
        <Feather name="alert-circle" size={15} color={colors.sos} />
        <Eyebrow color={colors.sos}>SOS · {formatWhen(alert.created_at)}</Eyebrow>
      </View>
      <Title size={26} style={{ marginTop: 2 }}>
        {who} needs help
      </Title>
      {alert.note ? <Body style={{ marginTop: 4, fontSize: 17 }}>{alert.note}</Body> : <Body muted style={{ marginTop: 4 }}>No details given.</Body>}
      <Button label="Mark as handled" icon="check" variant="quiet" busy={busy} onPress={() => void handled()} style={{ marginTop: space.md, alignSelf: 'flex-start', minHeight: 46 }} />
    </Card>
  );
}

/** Countdown before the wedding; "happening now" and "up next" during it. */
function NowCard({ events }: { events: WeddingEvent[] }) {
  const now = Date.now();
  const starts = (e: WeddingEvent) => new Date(e.starts_at).getTime();
  const ends = (e: WeddingEvent) => (e.ends_at ? new Date(e.ends_at).getTime() : starts(e) + 90 * 60000);

  const current = events.filter((e) => starts(e) <= now && now < ends(e));
  const next = events.find((e) => starts(e) > now);
  const last = events[events.length - 1];

  if (events.length === 0) return null;

  if (last && now >= ends(last)) {
    return (
      <Card tone="sage">
        <Eyebrow>Until next time</Eyebrow>
        <Title size={28} style={{ marginTop: 4 }}>
          Thank you for being there.
        </Title>
        <Body muted style={{ marginTop: 6 }}>
          The album stays open, so keep reliving it.
        </Body>
      </Card>
    );
  }

  if (current.length === 0 && next && next.id === events[0].id) {
    const days = daysBetween(new Date(), wedding.startsAt);
    return (
      <Card tone="sage" style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <Eyebrow>{wedding.dates}</Eyebrow>
        {days > 0 ? (
          <>
            <Text style={styles.count}>{days}</Text>
            <Title size={24}>{days === 1 ? 'day to go' : 'days to go'}</Title>
          </>
        ) : (
          <Title size={32} style={{ marginTop: space.sm }}>
            It begins today
          </Title>
        )}
        <Accent style={{ fontSize: 19, marginTop: 6, textAlign: 'center' }}>The hills are calling. And so is the dance floor.</Accent>
      </Card>
    );
  }

  return (
    <Card tone="sage">
      {current.length > 0 ? (
        <>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Eyebrow color={colors.rose}>Happening now</Eyebrow>
          </View>
          {current.map((e) => (
            <EventLine key={e.id} event={e} big />
          ))}
        </>
      ) : null}
      {next ? (
        <>
          {current.length > 0 ? <GoldRule style={{ marginVertical: space.md }} /> : null}
          <Eyebrow>Up next</Eyebrow>
          <EventLine event={next} big={current.length === 0} />
        </>
      ) : null}
      <Button label="See the full programme" variant="ghost" onPress={() => router.push('/schedule')} style={{ alignSelf: 'flex-start', marginLeft: -space.md, marginTop: 4 }} />
    </Card>
  );
}

function EventLine({ event, big }: { event: WeddingEvent; big?: boolean }) {
  return (
    <View style={{ marginTop: 6 }}>
      <Title size={big ? 30 : 24}>{event.title}</Title>
      <Body muted>
        {event.time_label}
        {event.location ? ` · ${event.location}` : ''}
      </Body>
      {event.note ? <Body style={{ marginTop: 2 }}>{event.note}</Body> : null}
      {event.dress ? (
        <Body style={{ marginTop: 2 }}>
          <Text style={{ fontFamily: fonts.bodyBold }}>Wear: </Text>
          {event.dress}
        </Body>
      ) : null}
    </View>
  );
}

function UpdateCard({ update, now, canDelete, onChanged }: { update: Update; now: string; canDelete: boolean; onChanged: () => void }) {
  function remove() {
    confirm('Remove this update?', 'Guests will no longer see it.', 'Remove', async () => {
      try {
        await api.deleteUpdate(update.id);
        onChanged();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }
  async function togglePin() {
    try {
      await api.pinUpdate(update.id, !update.pinned);
      onChanged();
    } catch (e) {
      tell(errorMessage(e));
    }
  }
  return (
    <Card style={update.pinned ? styles.pinned : undefined}>
      {update.pinned ? (
        <View style={styles.liveRow}>
          <Feather name="bookmark" size={13} color={colors.rose} />
          <Eyebrow color={colors.rose}>Pinned</Eyebrow>
        </View>
      ) : null}
      <Body style={styles.updateBody}>{update.body}</Body>
      <View style={styles.updateFoot}>
        <Body muted style={{ fontSize: 13.5, flex: 1 }}>
          {update.by} · {formatWhen(update.created_at, new Date(now))}
        </Body>
        {canDelete ? (
          <>
            <Button
              label={update.pinned ? 'Unpin' : 'Pin'}
              icon="bookmark"
              variant="ghost"
              onPress={() => void togglePin()}
              style={{ minHeight: 44, paddingHorizontal: space.sm }}
            />
            <IconButton icon="trash-2" label="Remove this update" size={18} color={colors.muted} onPress={remove} />
          </>
        ) : null}
      </View>
    </Card>
  );
}

// One-tap starters for the middle of an event. Tapping fills the box; nothing sends until Post.
const QUICK_LINES = [
  "The bride's entry is happening now",
  'Tea is being served',
  'Sangeet practice is starting now',
  'Dinner is served',
];

/** Hosts only: post a live update to every guest (shows on Today and goes out as a notification). */
function Composer({ onPosted }: { onPosted: () => void }) {
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  async function post() {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      await api.postUpdate(body, pinned);
      setBody('');
      setPinned(false);
      onPosted();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card tone="blush">
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Tell everyone what's happening…"
        placeholderTextColor="#A08E94"
        multiline
        maxLength={600}
        style={styles.composer}
        accessibilityLabel="Write an update for all guests"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} keyboardShouldPersistTaps="handled">
        {QUICK_LINES.map((line) => (
          <Pressable
            key={line}
            accessibilityRole="button"
            accessibilityLabel={`Use: ${line}`}
            onPress={() => setBody(line)}
            style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}>
            <Text style={styles.quickText}>{line}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Body muted style={{ fontSize: 13.5, marginTop: 6 }}>
        Goes to every guest's phone straight away.
      </Body>
      <View style={styles.composerFoot}>
        <Switch
          value={pinned}
          onValueChange={setPinned}
          trackColor={{ true: colors.rose, false: '#D8CFCF' }}
          thumbColor={colors.white}
          accessibilityLabel="Pin to top"
        />
        <Body style={{ fontSize: 14.5, flex: 1 }}>Pin to top</Body>
        <Button label="Post" icon="send" onPress={post} busy={busy} disabled={!body.trim()} style={{ minHeight: 44 }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // The hills sit in a band under the greeting, never behind the words.
  hero: { paddingHorizontal: space.xl, paddingBottom: 92, overflow: 'hidden' },
  hills: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, opacity: 0.5 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  parrot: { width: 46, height: 46 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.sos,
    marginRight: space.sm,
  },
  sosText: { fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 1, color: colors.white },
  sosCard: { borderColor: colors.sos, borderWidth: 1.5, backgroundColor: '#FDF1EF' },
  avatarText: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.ink },
  names: { fontFamily: fonts.display, fontSize: 42, lineHeight: 48, color: colors.ink, letterSpacing: -0.6, marginTop: 2 },
  stack: { paddingHorizontal: space.lg, gap: space.md, marginTop: -space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  rowBody: { fontSize: 14.5, lineHeight: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, marginBottom: 2, paddingHorizontal: 4 },
  count: { fontFamily: fonts.display, fontSize: 84, lineHeight: 88, color: colors.ink, marginTop: space.sm },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.rose },
  pinned: { borderColor: colors.gold, borderWidth: 1 },
  updateBody: { fontSize: 17, lineHeight: 25 },
  updateFoot: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm, minHeight: 28 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.md },
  composer: {
    minHeight: 76,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
    textAlignVertical: 'top',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: space.md,
  },
  quick: { gap: space.sm, paddingTop: space.md },
  quickChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#E3CFD3',
  },
  quickText: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.ink },
  composerFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
});
