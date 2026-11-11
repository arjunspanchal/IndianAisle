import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WeatherLine } from '@/components/Weather';
import { Accent, Body, Button, Card, Eyebrow, GoldRule, IconButton, Loading, Notice, Title } from '@/components/ui';
import { arrivalStatus, enableArrival, rememberRide, type ArrivalStatus } from '@/lib/arrival';
import { api, errorMessage, type MyRide, type Rsvp, type Home, type SosAlert, type SosState, type Update, type WeddingEvent } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { enablePush, pushStatus, type PushStatus } from '@/lib/push';
import { syncReminders } from '@/lib/reminders';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';
import { daysBetween, formatTime, formatWhen } from '@/lib/time';

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

  // This guest's own van to the resort, and whether they've said they have arrived.
  const ride = useLoad<MyRide | null>(() => (isVendor ? Promise.resolve(null) : api.rideMine()));
  useEffect(() => {
    // Kept on the phone so the Chandigarh welcome can name the vehicle with no signal.
    if (ride.data) void rememberRide(ride.data.arrive);
  }, [ride.data]);

  // Reminders 30 minutes before each event, set on the phone from the programme it has just loaded.
  const programme = (data?.events ?? []).map((e) => `${e.id}|${e.starts_at}|${e.title}|${e.dress}|${e.setting ?? ''}`).join(';');
  useEffect(() => {
    if (data && push === 'on') void syncReminders(data.events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programme, push]);

  useLive('updates', () => {
    void reload();
    void sos.reload();
    void ride.reload();
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
            accessibilityLabel={t('SOS. Ask the wedding team for help')}
            onPress={() => router.push('/sos')}
            style={({ pressed }) => [styles.sos, pressed && { opacity: 0.75 }]}>
            <Feather name="alert-circle" size={16} color={colors.white} />
            <Text style={styles.sosText}>{t('SOS')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('You and the wedding details')}
            onPress={() => router.push('/me')}
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.7 }]}>
            <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </View>
        <Eyebrow>{t(wedding.tagline)}</Eyebrow>
        <Text style={styles.names} accessibilityRole="header">
          {t(wedding.first)} <Accent style={{ fontSize: 38 }}>{t('&')}</Accent> {t(wedding.second)}
        </Text>
        <Body muted style={{ marginTop: 4 }}>
          {t('Hello, {name}.', { name: firstName })} {isVendor ? t('Thank you for making this happen.') : t("So glad you're here.")}
        </Body>
        <WeatherLine />
      </View>

      <View style={styles.stack}>
        {loading && !data ? (
          <Loading />
        ) : !data ? (
          <Notice
            icon="cloud-off"
            title={t("Can't reach the wedding")}
            body={error ?? undefined}
            action={<Button label={t('Try again')} variant="quiet" onPress={() => void reload()} />}
          />
        ) : (
          <>
            {isHost ? (sos.data?.open ?? []).map((a) => <SosCard key={a.id} alert={a} onHandled={() => void sos.reload()} />) : null}

            {!isVendor && !rsvp.loading && !rsvp.error ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={rsvp.data ? t('See or change your RSVP') : t('Reply to the invitation')}
                onPress={() => router.push('/rsvp')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card tone={rsvp.data ? 'card' : 'blush'} style={[styles.row, !rsvp.data && styles.pinned]}>
                  <View style={[styles.badge, { backgroundColor: colors.rose }]}>
                    <Feather name={rsvp.data ? 'check' : 'mail'} size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {rsvp.data ? (rsvp.data.attending ? t("You're coming · {n}", { n: rsvp.data.people }) : t("You can't make it")) : t('Will you join us?')}
                    </Text>
                    <Body muted style={styles.rowBody}>
                      {rsvp.data ? (isHost ? t('Tap to see every reply and the headcount.') : t('Tap to change your reply.')) : t('Please RSVP. It takes a minute.')}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            ) : null}

            {!isVendor && ride.data ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Open your ride to the resort')}
                onPress={() => router.push('/ride')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card tone={ride.data.arrive && !ride.data.reached_at ? 'moss' : 'card'} style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.ink }]}>
                    <Feather name="truck" size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{ride.data.arrive?.vehicle ? t('Your ride: {vehicle}', { vehicle: ride.data.arrive.vehicle }) : t('Your ride to the resort')}</Text>
                    <Body muted style={styles.rowBody}>
                      {ride.data.reached_at
                        ? t('You reached the resort at {time}.', { time: formatTime(ride.data.reached_at) })
                        : ride.data.landed_at
                          ? t('You arrived at {time}. Tap when you reach the resort.', { time: formatTime(ride.data.landed_at) })
                          : ride.data.arrive
                            ? [ride.data.arrive.pickup, t("Tap here when you arrive in Chandigarh.")].filter(Boolean).join(' ')
                            : t("Your van will appear here once it's assigned. Tap here when you arrive in Chandigarh.")}
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
                  <Text style={styles.rowTitle}>{t("Don't miss a thing")}</Text>
                  <Body muted style={styles.rowBody}>
                    {t("Get a nudge when something's starting, and when the photos develop.")}
                  </Body>
                  <Button
                    label={t('Turn on notifications')}
                    variant="quiet"
                    onPress={() => void enablePush().then(setPush)} // reminders are set by the effect above once this is on
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
                  <Text style={styles.rowTitle}>{t('A welcome when you arrive')}</Text>
                  <Body muted style={styles.rowBody}>
                    {t('Get a hello when you reach Chandigarh and again as you near the resort. Your location stays on your phone.')}
                  </Body>
                  <Button
                    label={t('Tell me when I arrive')}
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
              accessibilityLabel={t('Open the camera')}
              onPress={() => router.push('/camera')}
              style={({ pressed }) => pressed && { opacity: 0.85 }}>
              <Card tone="moss" style={styles.row}>
                <View style={styles.badge}>
                  <Feather name="camera" size={20} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{t("{n} shots left on today's roll", { n: Math.max(data.camera.limit - data.camera.used, 0) })}</Text>
                  <Body muted style={styles.rowBody}>
                    {t('No peeking. Photos develop overnight.')}
                  </Body>
                </View>
                <Feather name="chevron-right" size={22} color={colors.muted} />
              </Card>
            </Pressable>
            )}

            {isVendor ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Open the outfits guide')}
                onPress={() => router.push('/outfits')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.rose }]}>
                    <Feather name="scissors" size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{t('What to wear')}</Text>
                    <Body muted style={styles.rowBody}>
                      {isHost ? t('Set the colours and dress code for each celebration.') : t('Colours and dress codes, celebration by celebration.')}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            )}

            {isVendor ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Open your table and room')}
                onPress={() => router.push('/places')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                    <Feather name="map" size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{isHost ? t('Tables & rooms') : t('Your table & room')}</Text>
                    <Body muted style={styles.rowBody}>
                      {isHost ? t('Set the Sangeet tables and room numbers.') : t('Your room number and your Sangeet table.')}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            )}

            {isVendor ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Open travel documents')}
                onPress={() => router.push('/docs')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.olive }]}>
                    <Feather name="lock" size={19} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{isHost ? t("Guests' travel documents") : t('Your ID and tickets')}</Text>
                    <Body muted style={styles.rowBody}>
                      {isHost ? t('The private vault of IDs and tickets.') : t('Share them privately with the wedding team for travel.')}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            )}

            {isVendor ? null : (
              <View style={styles.tiles}>
                <Tile icon="coffee" label={t('Menus')} onPress={() => router.push('/menus')} />
                <Tile icon="award" label={t('Photo challenges')} onPress={() => router.push('/challenges')} />
                <Tile icon="bar-chart-2" label={t('Polls')} onPress={() => router.push('/polls')} />
                <Tile icon="heart" label={t('Wishes for the couple')} onPress={() => router.push('/wishes')} />
              </View>
            )}

            {!isVendor && (data.quiz.total > 0 || isHost) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Open the couple quiz')}
                onPress={() => router.push('/quiz')}
                style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <Card tone="blush" style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colors.rose }]}>
                    <Feather name="help-circle" size={20} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{t('How well do you know us?')}</Text>
                    <Body muted style={styles.rowBody}>
                      {data.quiz.total === 0
                        ? t('No questions yet. Add the first one.')
                        : t('{n} of {total} answered', { n: data.quiz.answered, total: data.quiz.total })}
                    </Body>
                  </View>
                  <Feather name="chevron-right" size={22} color={colors.muted} />
                </Card>
              </Pressable>
            ) : null}

            <View style={styles.sectionHead}>
              <Eyebrow>{t('From {couple}', { couple: t(wedding.couple) })}</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>

            {isHost ? <Composer onPosted={reload} /> : null}

            {data.updates.length === 0 ? (
              <Card>
                <Body muted>{t('Nothing yet. News from the couple will appear here as the days unfold.')}</Body>
              </Card>
            ) : (
              data.updates.map((u) => <UpdateCard key={u.id} update={u} now={data.now} canDelete={isHost} onChanged={reload} />)
            )}

            <View style={styles.sectionHead}>
              <Eyebrow>{t('Good to know')}</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>
            <Card>
              <Title size={22}>{wedding.venue}</Title>
              <Body muted style={{ marginTop: 6 }}>
                {t(wedding.gettingThere)}
              </Body>
              <View style={styles.links}>
                <Button label={t('Travel, weather & FAQs')} icon="info" variant="quiet" onPress={() => router.push('/info')} />
                <Button label={t('Open in Maps')} variant="ghost" onPress={() => void Linking.openURL(wedding.mapsUrl)} />
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
        <Eyebrow>{t('Until next time')}</Eyebrow>
        <Title size={28} style={{ marginTop: 4 }}>
          {t('Thank you for being there.')}
        </Title>
        <Body muted style={{ marginTop: 6 }}>
          {t('The album stays open, so keep reliving it.')}
        </Body>
      </Card>
    );
  }

  if (current.length === 0 && next && next.id === events[0].id) {
    const days = daysBetween(new Date(), wedding.startsAt);
    return (
      <Card tone="sage" style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <Eyebrow>{t(wedding.dates)}</Eyebrow>
        {days > 0 ? (
          <>
            <Text style={styles.count}>{days}</Text>
            <Title size={24}>{days === 1 ? t('day to go') : t('days to go')}</Title>
          </>
        ) : (
          <Title size={32} style={{ marginTop: space.sm }}>
            {t('It begins today')}
          </Title>
        )}
        <Accent style={{ fontSize: 19, marginTop: 6, textAlign: 'center' }}>{t('The hills are calling. And so is the dance floor.')}</Accent>
      </Card>
    );
  }

  return (
    <Card tone="sage">
      {current.length > 0 ? (
        <>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Eyebrow color={colors.rose}>{t('Happening now')}</Eyebrow>
          </View>
          {current.map((e) => (
            <EventLine key={e.id} event={e} big />
          ))}
        </>
      ) : null}
      {next ? (
        <>
          {current.length > 0 ? <GoldRule style={{ marginVertical: space.md }} /> : null}
          <Eyebrow>{t('Up next')}</Eyebrow>
          <EventLine event={next} big={current.length === 0} />
        </>
      ) : null}
      <Button label={t('See the full programme')} variant="ghost" onPress={() => router.push('/schedule')} style={{ alignSelf: 'flex-start', marginLeft: -space.md, marginTop: 4 }} />
    </Card>
  );
}

/** A half-width shortcut on Today: an icon and a couple of words. */
function Tile({ icon, label, onPress }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
      <View style={[styles.badge, styles.tileBadge]}>
        <Feather name={icon} size={18} color={colors.white} />
      </View>
      <Text style={styles.tileText}>{label}</Text>
    </Pressable>
  );
}

function EventLine({ event, big }: { event: WeddingEvent; big?: boolean }) {
  return (
    <View style={{ marginTop: 6 }}>
      <Title size={big ? 30 : 24}>{t(event.title)}</Title>
      <Body muted>
        {event.time_label}
        {event.location ? ` · ${t(event.location)}` : ''}
      </Body>
      {event.note ? <Body style={{ marginTop: 2 }}>{t(event.note)}</Body> : null}
      {event.dress ? (
        <Body style={{ marginTop: 2 }}>
          <Text style={{ fontFamily: fonts.bodyBold }}>{t('Wear:')} </Text>
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
          <Eyebrow color={colors.rose}>{t('Pinned')}</Eyebrow>
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
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  tileBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.olive },
  tileText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 19, color: colors.ink },
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
