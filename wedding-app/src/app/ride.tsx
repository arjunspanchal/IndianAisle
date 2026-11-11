import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Body, Button, Eyebrow, GoldRule, Loading, Notice, Title } from '@/components/ui';
import { api, errorMessage, type Leg, type MyRide, type Ride, type RideRow, type RidesBoard } from '@/lib/api';
import { rememberRide } from '@/lib/arrival';
import { confirm, tell } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatTime } from '@/lib/time';

type Stage = 'landed' | 'reached';
type FeatherName = ComponentProps<typeof Feather>['name'];

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const dialable = (phone: string) => phone.replace(/[^\d+]/g, '');

// Your ride: which van takes you from Chandigarh to the resort (and home again),
// and the two big "I've arrived" buttons. Hosts also see who has arrived and
// enter the vans here.
export default function RideScreen() {
  const { isHost, guest } = useSession();
  const mine = useLoad<MyRide>(async () => {
    const m = await api.rideMine();
    void rememberRide(m.arrive); // so the arrival notification can name the van with no signal
    return m;
  }, 120000);
  const board = useLoad<RidesBoard | null>(() => (isHost ? api.ridesBoard() : Promise.resolve(null)), isHost ? 60000 : undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<Stage | null>(null);

  async function reloadAll() {
    await Promise.all([mine.reload(), board.reload()]);
  }

  useLive('updates', () => void reloadAll());

  async function refresh() {
    setRefreshing(true);
    await reloadAll();
    setRefreshing(false);
  }

  async function mark(stage: Stage, undo = false) {
    if (busy) return;
    setBusy(stage);
    try {
      const next = await api.arrive(stage, undo);
      mine.setData(next);
      void rememberRide(next.arrive);
      if (isHost) void board.reload();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const header = <Stack.Screen options={{ title: t('Your ride') }} />;

  if (mine.loading && !mine.data)
    return (
      <>
        {header}
        <Loading />
      </>
    );
  if (!mine.data)
    return (
      <>
        {header}
        <Notice
          icon="cloud-off"
          title={t("Can't load your ride right now")}
          body={mine.error ?? undefined}
          action={<Button label={t('Try again')} variant="quiet" onPress={() => void reloadAll()} />}
        />
      </>
    );

  const my = mine.data;
  const myName = guest?.name ?? '';
  const landed = !!my.landed_at;
  const reached = !!my.reached_at;
  const van = my.arrive?.vehicle?.trim() ?? '';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      {header}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.paper }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
        <Eyebrow>{t('Chandigarh to the resort')}</Eyebrow>
        <Title size={34} style={{ marginTop: 2 }}>
          {t('Your ride')}
        </Title>
        <Body muted style={{ marginTop: 6 }}>
          {t('Kashika & Arjun have arranged Urbania 14-seater vans from the airport to the resort for everyone. The drive is about two hours.')}
        </Body>

        <RideCard
          heading={t('Your ride to the resort')}
          ride={my.arrive}
          withNames={my.arrive_with}
          myName={myName}
          empty={t('Your van will appear here once it is assigned. There is nothing you need to do for now.')}
        />

        {/* The two arrival buttons: the most important thing on this screen. */}
        <View style={styles.arrival}>
          <Text style={styles.kicker}>{t('Tell us when you arrive')}</Text>
          <Body muted style={{ fontSize: 15.5, lineHeight: 22 }}>
            {t('One tap when you get to Chandigarh, and one more when you reach the resort. Then we know you are safely in.')}
          </Body>

          {landed ? (
            <Done
              text={t('You told us you arrived at {time}', { time: formatTime(my.landed_at!) })}
              undoLabel={t('Undo: I have not arrived in Chandigarh yet')}
              busy={busy === 'landed'}
              onUndo={() => void mark('landed', true)}
              hint={reached ? undefined : van ? t('Now look for your vehicle: {vehicle}.', { vehicle: van }) : t('Now look for your vehicle to the resort.')}
            />
          ) : (
            <BigButton
              label={t("I've arrived in Chandigarh")}
              icon="map-pin"
              busy={busy === 'landed'}
              disabled={busy !== null}
              quiet={reached}
              onPress={() => void mark('landed')}
            />
          )}

          {reached ? (
            <Done
              text={t('You told us you reached the resort at {time}', { time: formatTime(my.reached_at!) })}
              undoLabel={t('Undo: I have not reached the resort yet')}
              busy={busy === 'reached'}
              onUndo={() => void mark('reached', true)}
              hint={t('Welcome! We are so happy you are here.')}
            />
          ) : (
            <BigButton
              label={t("I've reached the resort")}
              icon="home"
              busy={busy === 'reached'}
              disabled={busy !== null}
              quiet={!landed}
              onPress={() => void mark('reached')}
            />
          )}
        </View>

        {my.depart ? <RideCard heading={t('Going home')} ride={my.depart} withNames={my.depart_with} myName={myName} empty="" /> : null}

        {isHost ? (
          <View style={{ marginTop: space.xl }}>
            <GoldRule />
            {board.data ? (
              <>
                <Arrivals board={board.data} />
                <VanEditor board={board.data} onSaved={reloadAll} />
              </>
            ) : board.loading ? (
              <ActivityIndicator color={colors.olive} style={{ marginTop: space.xl }} />
            ) : (
              <View style={{ marginTop: space.lg, gap: space.sm }}>
                <Body muted>{t("Can't load the arrivals list right now.")}</Body>
                {board.error ? <Body muted>{board.error}</Body> : null}
                <Button label={t('Try again')} variant="quiet" onPress={() => void board.reload()} style={{ alignSelf: 'flex-start' }} />
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ───── the guest's own van ─────

function RideCard({ heading, ride, withNames, myName, empty }: { heading: string; ride: Ride | null; withNames: string[]; myName: string; empty: string }) {
  if (!ride) {
    return (
      <View style={styles.card}>
        <Text style={styles.kicker}>{heading}</Text>
        <View style={styles.waiting}>
          <Feather name="clock" size={20} color={colors.olive} style={{ marginTop: 3 }} />
          <Body style={{ flex: 1, fontSize: 17, lineHeight: 25 }}>{empty}</Body>
        </View>
      </View>
    );
  }

  const phone = (ride.driver_phone ?? '').trim();
  const digits = dialable(phone);
  const driver = [(ride.driver ?? '').trim(), phone].filter(Boolean).join(' · ');
  const mates = (withNames ?? []).filter((n) => n.trim() && !same(n, myName));

  function call() {
    Linking.openURL(`tel:${digits}`).catch(() => tell(t("Couldn't start the call"), t('Please dial {phone} from your phone.', { phone })));
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{heading}</Text>
      <Title size={38} style={{ marginTop: 2 }}>
        {ride.vehicle?.trim() || t('Your van')}
      </Title>

      {ride.pickup ? <Line icon="map-pin" label={t('Pickup')} value={ride.pickup} /> : null}
      {driver ? <Line icon="user" label={t('Driver')} value={driver} /> : null}
      {digits ? <Button label={t('Call the driver')} icon="phone" onPress={call} style={{ marginTop: space.md }} /> : null}
      {mates.length > 0 ? <Line icon="users" label={t('Travelling with')} value={mates.join(', ')} /> : null}
      {ride.note ? <Line icon="info" label={t('Note')} value={ride.note} /> : null}
    </View>
  );
}

function Line({ icon, label, value }: { icon: FeatherName; label: string; value: string }) {
  return (
    <View style={styles.line} accessible accessibilityLabel={`${label}: ${value}`}>
      <Feather name={icon} size={19} color={colors.olive} style={{ marginTop: 4 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.lineLabel}>{label}</Text>
        <Text style={styles.lineValue}>{value}</Text>
      </View>
    </View>
  );
}

// ───── arrival buttons ─────

function BigButton({
  label,
  icon,
  onPress,
  busy,
  disabled,
  quiet,
}: {
  label: string;
  icon: FeatherName;
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
  quiet?: boolean;
}) {
  const fg = quiet ? colors.ink : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.big, quiet && styles.bigQuiet, pressed && { opacity: 0.85 }, disabled && !busy && { opacity: 0.5 }]}>
      {busy ? <ActivityIndicator color={fg} /> : <Feather name={icon} size={24} color={fg} />}
      <Text style={[styles.bigLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

function Done({ text, hint, undoLabel, busy, onUndo }: { text: string; hint?: string; undoLabel: string; busy: boolean; onUndo: () => void }) {
  return (
    <View style={styles.done}>
      <View style={styles.doneTop}>
        <Feather name="check-circle" size={24} color={colors.olive} style={{ marginTop: 2 }} />
        <Text style={styles.doneText}>{text}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={undoLabel}
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          hitSlop={8}
          onPress={onUndo}
          style={({ pressed }) => [styles.undo, pressed && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator color={colors.rose} /> : <Text style={styles.undoText}>{t('Undo')}</Text>}
        </Pressable>
      </View>
      {hint ? <Text style={styles.doneHint}>{hint}</Text> : null}
    </View>
  );
}

// ───── hosts: who has arrived ─────

type Show = 'all' | 'coming' | 'here';

function Arrivals({ board }: { board: RidesBoard }) {
  const [show, setShow] = useState<Show>('all');
  const people = board.people ?? [];
  const atResort = people.filter((p) => p.reached_at).length;
  const inCity = people.filter((p) => p.landed_at && !p.reached_at).length;
  const notYet = people.length - atResort - inCity;
  const list = show === 'all' ? people : people.filter((p) => (show === 'here' ? !!p.reached_at : !p.reached_at));

  return (
    <>
      <View style={styles.section}>
        <Eyebrow color={colors.rose}>{t('Only hosts see this')}</Eyebrow>
      </View>
      <Title size={30}>{t('Arrivals')}</Title>

      <View style={styles.counts}>
        <Count n={inCity} label={t('Arrived in Chandigarh')} />
        <Count n={atResort} label={t('At the resort')} />
        <Count n={notYet} label={t('Not yet')} />
      </View>

      <Segments
        value={show}
        onChange={setShow}
        options={[
          { value: 'all', label: t('Everyone') },
          { value: 'coming', label: t('On the way') },
          { value: 'here', label: t('Arrived') },
        ]}
      />

      {list.length === 0 ? (
        <Body muted style={{ marginTop: space.md }}>
          {t('No one in this list yet.')}
        </Body>
      ) : null}
      {list.map((p, i) => {
        const status = p.reached_at
          ? t('At the resort · {time}', { time: formatTime(p.reached_at) })
          : p.landed_at
            ? t('In Chandigarh · {time}', { time: formatTime(p.landed_at) })
            : t('Not yet');
        const vanName = p.arrive?.vehicle?.trim() || t('No van yet');
        return (
          <View key={`${p.name}-${i}`} style={styles.person} accessible accessibilityLabel={`${p.name}. ${vanName}. ${status}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{p.name}</Text>
              <Text style={[styles.personVan, !p.arrive && { color: colors.rose }]}>{vanName}</Text>
            </View>
            <View style={styles.status}>
              <Feather
                name={p.reached_at ? 'check-circle' : p.landed_at ? 'navigation' : 'clock'}
                size={16}
                color={p.reached_at ? colors.olive : p.landed_at ? colors.gold : colors.muted}
              />
              <Text style={[styles.statusText, !p.reached_at && !p.landed_at && { color: colors.muted }]}>{status}</Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.count} accessible accessibilityLabel={`${label}: ${n}`}>
      <Text style={styles.countN}>{n}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function Segments<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <View style={styles.choices} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ checked: on }}
            onPress={() => onChange(opt.value)}
            style={[styles.choice, on && styles.choiceOn]}>
            <Text style={[styles.choiceText, on && { color: colors.white }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ───── hosts: enter the vans ─────

/** One van as the host types it: its details once, and everyone in it in one box. */
type Van = { key: string; vehicle: string; pickup: string; driver: string; driver_phone: string; note: string; names: string };

const splitNames = (text: string) =>
  text
    .split(/[,;\n]/)
    .map((n) => n.trim())
    .filter(Boolean);

/** The saved list is one row per person; hosts work per van, so group it by van name. */
function vansOf(rides: RidesBoard['rides'], leg: Leg): Van[] {
  const out: Van[] = [];
  const byName = new Map<string, Van>();
  for (const r of rides ?? []) {
    if (r.leg !== leg) continue;
    const vehicle = r.vehicle ?? '';
    let v = byName.get(vehicle);
    if (!v) {
      v = { key: `${leg}:${vehicle}`, vehicle, pickup: r.pickup ?? '', driver: r.driver ?? '', driver_phone: r.driver_phone ?? '', note: r.note ?? '', names: '' };
      byName.set(vehicle, v);
      out.push(v);
    }
    v.names = v.names ? `${v.names}, ${r.name}` : r.name;
  }
  return out;
}

let fresh = 0;
const blankVan = (): Van => ({ key: `new-${++fresh}`, vehicle: '', pickup: '', driver: '', driver_phone: '', note: '', names: '' });

function VanEditor({ board, onSaved }: { board: RidesBoard; onSaved: () => Promise<void> }) {
  const [leg, setLeg] = useState<Leg>('arrive');
  const [vans, setVans] = useState<Record<Leg, Van[]>>(() => ({ arrive: vansOf(board.rides, 'arrive'), depart: vansOf(board.rides, 'depart') }));
  const [unsaved, setUnsaved] = useState<Record<Leg, boolean>>({ arrive: false, depart: false });
  const unsavedRef = useRef(unsaved);
  unsavedRef.current = unsaved;
  const [busy, setBusy] = useState(false);

  // When the saved list changes (after a save, or another host's edit), show it,
  // but never over something this host is in the middle of typing.
  useEffect(() => {
    setVans((cur) => ({
      arrive: unsavedRef.current.arrive ? cur.arrive : vansOf(board.rides, 'arrive'),
      depart: unsavedRef.current.depart ? cur.depart : vansOf(board.rides, 'depart'),
    }));
  }, [board]);

  const list = vans[leg];
  const known = new Set((board.people ?? []).map((p) => p.name.trim().toLowerCase()));
  const peopleCount = list.reduce((n, v) => n + splitNames(v.names).length, 0);

  function touch(next: Van[]) {
    setVans((cur) => ({ ...cur, [leg]: next }));
    if (!unsaved[leg]) setUnsaved((cur) => ({ ...cur, [leg]: true }));
  }
  const patch = (key: string, p: Partial<Van>) => touch(list.map((v) => (v.key === key ? { ...v, ...p } : v)));

  function remove(v: Van) {
    const go = () => touch(list.filter((x) => x.key !== v.key));
    if (!v.names.trim() && !v.vehicle.trim()) return go();
    confirm(
      t('Remove this van?'),
      t('It goes when you tap Save. The people in it will have no van until you put them in another one.'),
      t('Remove'),
      go,
    );
  }

  async function send(rows: RideRow[]) {
    setBusy(true);
    try {
      const r = await api.ridesSet(leg, rows);
      unsavedRef.current = { ...unsavedRef.current, [leg]: false };
      setUnsaved((cur) => ({ ...cur, [leg]: false }));
      tell(
        t('Saved'),
        r.saved === 1
          ? t('1 person saved. They can see their van in the app now.')
          : t('{n} people saved. They can see their van in the app now.', { n: r.saved }),
      );
      await onSaved();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const rows: RideRow[] = [];
    const vanNames = new Set<string>();
    const placed = new Set<string>();
    for (const v of list) {
      const names = splitNames(v.names);
      if (names.length === 0) continue; // a van with nobody in it is not saved
      const vehicle = v.vehicle.trim();
      if (!vehicle) {
        tell(t('Give every van a name'), t('One van has people in it but no van name. Guests look for the van by its name.'));
        return;
      }
      if (vanNames.has(vehicle.toLowerCase())) {
        tell(t('Two vans are called {vehicle}', { vehicle }), t('Please give each van its own name, e.g. Urbania 1 and Urbania 2.'));
        return;
      }
      vanNames.add(vehicle.toLowerCase());
      for (const name of names) {
        if (placed.has(name.toLowerCase())) {
          tell(t('{name} is in the list twice', { name }), t('Please keep each person in one van only.'));
          return;
        }
        placed.add(name.toLowerCase());
        rows.push({ name, vehicle, pickup: v.pickup.trim(), driver: v.driver.trim(), driver_phone: v.driver_phone.trim(), note: v.note.trim() });
      }
    }
    if (rows.length === 0) {
      if (!board.rides.some((r) => r.leg === leg)) {
        tell(t('Nothing to save yet'), t('Add a van and type the names of the people in it.'));
        return;
      }
      confirm(
        t('Clear the whole list?'),
        leg === 'arrive'
          ? t('There are no names here, so saving will take every guest out of the vans to the resort.')
          : t('There are no names here, so saving will take every guest out of the vans going home.'),
        t('Clear the list'),
        () => void send(rows),
      );
      return;
    }
    void send(rows);
  }

  return (
    <>
      <View style={[styles.section, { marginTop: space.xxl }]}>
        <Eyebrow color={colors.rose}>{t('Set the vans')}</Eyebrow>
        <GoldRule style={{ flex: 1, marginLeft: space.md }} />
      </View>
      <Segments
        value={leg}
        onChange={setLeg}
        options={[
          { value: 'arrive', label: t('To the resort') },
          { value: 'depart', label: t('Going home') },
        ]}
      />
      <Title size={30} style={{ marginTop: space.md }}>
        {leg === 'arrive' ? t('Vans to the resort') : t('Vans going home')}
      </Title>
      <Body muted style={styles.small}>
        {t(
          'Fill in each van once and list who is in it. A guest is matched by the name they joined the app with, so type each name exactly as it shows in the arrivals list above. Saving replaces the whole list for this direction.',
        )}
      </Body>

      {list.length === 0 ? (
        <Body muted style={{ marginTop: space.md }}>
          {t('No vans here yet.')}
        </Body>
      ) : null}

      {list.map((v, i) => {
        const n = i + 1;
        const names = splitNames(v.names);
        const strangers = names.filter((x) => !known.has(x.toLowerCase()));
        return (
          <View key={v.key} style={[styles.card, styles.cardEditing]}>
            <View style={styles.vanTop}>
              <Text style={styles.kicker}>{t('Van {n}', { n })}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Remove van {n}', { n })}
                hitSlop={8}
                onPress={() => remove(v)}
                style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}>
                <Feather name="trash-2" size={16} color={colors.rose} />
                <Text style={styles.removeText}>{t('Remove')}</Text>
              </Pressable>
            </View>

            <Field label={t('Van name')} van={n} value={v.vehicle} onChangeText={(vehicle) => patch(v.key, { vehicle })} placeholder={t('e.g. Urbania 1')} first />
            <Field
              label={t('Pickup (where and when)')}
              van={n}
              value={v.pickup}
              onChangeText={(pickup) => patch(v.key, { pickup })}
              placeholder={t('e.g. Airport arrivals gate, 1:30 pm')}
            />
            <Field label={t('Driver')} van={n} value={v.driver} onChangeText={(driver) => patch(v.key, { driver })} placeholder={t('e.g. Ramesh Kumar')} />
            <Field
              label={t('Driver phone')}
              van={n}
              value={v.driver_phone}
              onChangeText={(driver_phone) => patch(v.key, { driver_phone })}
              placeholder={t('e.g. +91 98765 43210')}
              phone
            />
            <Field
              label={t('Note')}
              van={n}
              value={v.note}
              onChangeText={(note) => patch(v.key, { note })}
              placeholder={t('e.g. Look for the board with our names')}
            />
            <Field
              label={t('Who is in it')}
              van={n}
              value={v.names}
              onChangeText={(names) => patch(v.key, { names })}
              placeholder={t('e.g. Asha Mehta, Rohan Shah')}
              hint={t('Full names, with a comma or a new line between them.')}
              multiline
            />

            <Foot icon="users">{names.length === 0 ? t("No names yet. A van with no one in it isn't saved.") : t('People in this van: {n}', { n: names.length })}</Foot>
            {strangers.length > 0 ? <Foot icon="alert-circle">{t('Not in the app yet, or spelt differently: {names}', { names: strangers.join(', ') })}</Foot> : null}
          </View>
        );
      })}

      <Button label={t('Add a van')} icon="plus" variant="quiet" onPress={() => touch([...list, blankVan()])} style={{ marginTop: space.md }} />

      <View style={styles.saveRow}>
        <Body muted style={[styles.small, { flex: 1, marginTop: 0 }]}>
          {t('Vans: {vans} · People: {people}', { vans: list.length, people: peopleCount })}
          {unsaved[leg] ? `\n${t('Not saved yet')}` : ''}
        </Body>
        <Button label={t('Save')} busy={busy} onPress={save} />
      </View>
    </>
  );
}

function Field({
  label,
  van,
  value,
  onChangeText,
  placeholder,
  hint,
  multiline,
  phone,
  first,
}: {
  label: string;
  van: number;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  hint?: string;
  multiline?: boolean;
  phone?: boolean;
  first?: boolean;
}) {
  return (
    <>
      <Text style={[styles.label, first && { marginTop: space.sm }]}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9A9C8E"
        multiline={multiline}
        autoCorrect={false}
        autoCapitalize={phone ? 'none' : multiline ? 'words' : 'sentences'}
        keyboardType={phone ? 'phone-pad' : 'default'}
        maxLength={multiline ? 2000 : 200}
        style={[styles.input, multiline && styles.inputTall]}
        accessibilityLabel={`${label}, ${t('Van {n}', { n: van })}`}
      />
    </>
  );
}

function Foot({ icon, children }: { icon: FeatherName; children: ReactNode }) {
  return (
    <View style={styles.foot}>
      <Feather name={icon} size={15} color={colors.muted} style={{ marginTop: 3 }} />
      <Text style={styles.footText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    padding: space.lg,
    marginTop: space.lg,
  },
  cardEditing: { borderColor: colors.rose, borderLeftColor: colors.rose },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13.5, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.olive, marginBottom: 4 },
  waiting: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  line: { flexDirection: 'row', gap: space.md, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line },
  lineLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, letterSpacing: 0.4, color: colors.muted },
  lineValue: { fontFamily: fonts.bodyMedium, fontSize: 18, lineHeight: 26, color: colors.ink, marginTop: 1 },

  arrival: { backgroundColor: colors.sage, borderRadius: radius.md, padding: space.lg, marginTop: space.lg, gap: space.md },
  big: {
    minHeight: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.rose,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  bigQuiet: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.olive },
  bigLabel: { fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 27, flexShrink: 1, textAlign: 'center' },
  done: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md },
  doneTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  doneText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17.5, lineHeight: 25, color: colors.ink },
  doneHint: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24, color: colors.ink, marginTop: 4, marginLeft: 32 },
  undo: { minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginRight: -4, paddingHorizontal: 6 },
  undoText: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.rose, textDecorationLine: 'underline' },

  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  counts: { flexDirection: 'row', gap: space.sm, marginTop: space.md, marginBottom: space.md },
  count: { flex: 1, backgroundColor: colors.moss, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: 6, alignItems: 'center' },
  countN: { fontFamily: fonts.displayMedium, fontSize: 36, lineHeight: 40, color: colors.ink },
  countLabel: { fontFamily: fonts.bodyMedium, fontSize: 13.5, lineHeight: 18, color: colors.ink, textAlign: 'center', marginTop: 2 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.moss },
  choiceOn: { backgroundColor: colors.rose },
  choiceText: { fontFamily: fonts.bodyMedium, fontSize: 15.5, color: colors.ink },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  personName: { fontFamily: fonts.bodyBold, fontSize: 16.5, color: colors.ink },
  personVan: { fontFamily: fonts.body, fontSize: 14.5, color: colors.muted, marginTop: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '52%' },
  statusText: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.ink, flexShrink: 1, textAlign: 'right' },

  small: { fontSize: 14.5, lineHeight: 21, marginTop: 6 },
  vanTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: space.md },
  removeText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.rose },
  label: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink, marginTop: space.lg, marginBottom: 6 },
  hint: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, marginTop: -2, marginBottom: 8 },
  input: {
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
  inputTall: { minHeight: 120, paddingVertical: space.md, lineHeight: 24, textAlignVertical: 'top' },
  foot: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  footText: { flex: 1, fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.muted },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
});
