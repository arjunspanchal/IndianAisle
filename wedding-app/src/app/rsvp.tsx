import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CountryPicker } from '@/components/CountryPicker';
import { Accent, Body, Button, Card, Eyebrow, GoldRule, Loading, Title } from '@/components/ui';
import { api, errorMessage, type Companion, type Rsvp, type RsvpSummary } from '@/lib/api';
import { DEFAULT_COUNTRY, joinPhone, splitPhone, type Country } from '@/lib/countries';
import { tell } from '@/lib/dialog';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatWhen } from '@/lib/time';

// "Will you join us?" — the same questions as the website's form, answered
// here instead. One reply per person who joined; it can be changed any time.
export default function RsvpScreen() {
  const { isHost, guest } = useSession();
  const mine = useLoad<Rsvp | null>(() => api.rsvpGet());
  const [attending, setAttending] = useState<boolean | null>(null);
  // Start the name from what was typed when joining: first word, then the rest.
  const joined = (guest?.name ?? '').trim().split(/\s+/);
  const [first, setFirst] = useState(joined[0] ?? '');
  const [last, setLast] = useState(joined.slice(1).join(' '));
  // Everyone coming along, one first + last name each.
  const [companions, setCompanions] = useState<Companion[]>([]);
  const people = 1 + companions.length;
  // The number is kept as one line ('+91 98200 12345'); the form shows the country code separately.
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [food, setFood] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filled, setFilled] = useState(false);

  // Start from the reply already given, if there is one.
  useEffect(() => {
    if (filled || mine.loading) return;
    setFilled(true);
    const r = mine.data;
    if (!r) return;
    setAttending(r.attending);
    if (r.first_name || r.last_name) {
      setFirst(r.first_name);
      setLast(r.last_name);
    }
    // Replies sent before names were split have a head count but no name rows: make empty rows to fill in.
    setCompanions(r.companions?.length ? r.companions : Array.from({ length: Math.max(r.people - 1, 0) }, () => ({ first: '', last: '' })));
    const had = splitPhone(r.phone);
    setCountry(had.country);
    setPhone(had.number);
    setFood(r.food);
    setMessage(r.message);
  }, [mine.data, mine.loading, filled]);

  const namesMissing =
    !first.trim() || !last.trim() || (attending === true && companions.some((c) => !c.first.trim() || !c.last.trim()));

  function setCompanion(i: number, change: Partial<Companion>) {
    setCompanions((all) => all.map((c, j) => (j === i ? { ...c, ...change } : c)));
  }

  async function send() {
    if (attending === null || busy) return;
    if (namesMissing) {
      tell('A name is missing', 'Please give a first and last name for yourself and everyone coming with you.');
      return;
    }
    setBusy(true);
    try {
      const coming = attending ? companions.map((c) => ({ first: c.first.trim(), last: c.last.trim() })) : [];
      await api.rsvpSet({
        attending,
        people: 1 + coming.length,
        other_names: coming.map((c) => `${c.first} ${c.last}`).join(', '),
        first_name: first.trim(),
        last_name: last.trim(),
        companions: coming,
        phone: joinPhone(country, phone),
        food: attending ? food : '',
        message,
      });
      setSaved(true);
      await mine.reload();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (mine.loading && !filled) return <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Eyebrow>RSVP</Eyebrow>
        <Title size={36} style={{ marginTop: 2 }}>
          Will you <Accent style={{ fontSize: 36 }}>join us?</Accent>
        </Title>
        <Body muted style={{ marginTop: 6 }}>
          One reply per family is perfect. It takes a minute, and you can change it later.
        </Body>

        {saved ? (
          <Card tone="moss" style={styles.thanks}>
            <Feather name="check-circle" size={22} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{attending ? "Wonderful. We can't wait to see you." : "We'll miss you. Thank you for letting us know."}</Text>
              <Body muted style={styles.small}>
                Your reply is saved. Change anything below and send again if plans shift.
              </Body>
            </View>
          </Card>
        ) : null}

        <Text style={styles.label}>Your name</Text>
        <View style={styles.nameRow}>
          <TextInput
            value={first}
            onChangeText={setFirst}
            placeholder="First name"
            placeholderTextColor="#9A9C8E"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            style={[styles.input, styles.half]}
            accessibilityLabel="Your first name"
          />
          <TextInput
            value={last}
            onChangeText={setLast}
            placeholder="Last name"
            placeholderTextColor="#9A9C8E"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            style={[styles.input, styles.half]}
            accessibilityLabel="Your last name"
          />
        </View>

        <Text style={styles.label}>Will you be coming?</Text>
        <View style={styles.choices}>
          <Choice label="Yes, we'll be there" on={attending === true} onPress={() => setAttending(true)} />
          <Choice label="Sorry, we can't come" on={attending === false} onPress={() => setAttending(false)} />
        </View>

        {attending ? (
          <>
            <Text style={styles.label}>How many people, including you?</Text>
            <View style={styles.stepper}>
              <Step icon="minus" label="One fewer" onPress={() => setCompanions((all) => all.slice(0, -1))} />
              <Text style={styles.count} accessibilityLabel={`${people} people`}>
                {people}
              </Text>
              <Step
                icon="plus"
                label="One more"
                onPress={() => setCompanions((all) => (all.length >= 11 ? all : [...all, { first: '', last: '' }]))}
              />
            </View>

            {companions.map((c, i) => (
              <View key={i}>
                <Text style={styles.label}>Guest {i + 2}</Text>
                <View style={styles.nameRow}>
                  <TextInput
                    value={c.first}
                    onChangeText={(t) => setCompanion(i, { first: t })}
                    placeholder="First name"
                    placeholderTextColor="#9A9C8E"
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={40}
                    style={[styles.input, styles.half]}
                    accessibilityLabel={`Guest ${i + 2} first name`}
                  />
                  <TextInput
                    value={c.last}
                    onChangeText={(t) => setCompanion(i, { last: t })}
                    placeholder="Last name"
                    placeholderTextColor="#9A9C8E"
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={40}
                    style={[styles.input, styles.half]}
                    accessibilityLabel={`Guest ${i + 2} last name`}
                  />
                </View>
              </View>
            ))}

            <Text style={styles.label}>
              Any food needs? <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              value={food}
              onChangeText={setFood}
              placeholder="e.g. Jain, no onion-garlic, allergies"
              placeholderTextColor="#9A9C8E"
              maxLength={200}
              style={styles.input}
              accessibilityLabel="Any food needs"
            />
          </>
        ) : null}

        {attending !== null ? (
          <>
            <Text style={styles.label}>
              Mobile number <Text style={styles.optional}>(WhatsApp, if you have it)</Text>
            </Text>
            <View style={styles.phoneRow}>
              <CountryPicker value={country} onChange={setCountry} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="98200 12345"
                placeholderTextColor="#9A9C8E"
                keyboardType="phone-pad"
                maxLength={18}
                style={[styles.input, { flex: 1 }]}
                accessibilityLabel={`Mobile number, without the ${country.dial} country code`}
              />
            </View>
            <Text style={styles.label}>
              A note for Kashika & Arjun <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput value={message} onChangeText={setMessage} multiline maxLength={600} style={[styles.input, styles.multi]} accessibilityLabel="A note for Kashika and Arjun" />
            <Button label={mine.data ? 'Update my reply' : 'Send my reply'} icon="send" onPress={() => void send()} busy={busy} style={{ marginTop: space.xl }} />
          </>
        ) : null}

        {isHost ? <Summary /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.choice, on && styles.choiceOn]}>
      <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

function Step({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}>
      <Feather name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
}

/** Hosts only: who is coming, the headcount, and who hasn't replied. */
function Summary() {
  const { data, reload } = useLoad<RsvpSummary>(() => api.rsvpList(), 60000);
  useLive('updates', () => void reload());
  if (!data) return null;
  return (
    <>
      <View style={styles.section}>
        <Eyebrow color={colors.rose}>Replies so far</Eyebrow>
        <GoldRule style={{ flex: 1, marginLeft: space.md }} />
      </View>
      <View style={styles.stats}>
        <Stat n={data.headcount} label="people coming" />
        <Stat n={data.coming} label="yes replies" />
        <Stat n={data.not_coming} label="can't come" />
      </View>
      {data.replies.map((r) => (
        <Card key={r.name} style={{ marginBottom: space.sm }}>
          <View style={styles.replyHead}>
            <Text style={styles.replyName}>{r.name}</Text>
            <Text style={[styles.pill, !r.attending && styles.pillNo]}>{r.attending ? `Coming · ${r.people}` : "Can't come"}</Text>
          </View>
          {r.companions?.length ? (
            <Body muted style={styles.small}>
              With {r.companions.map((c) => `${c.first} ${c.last}`.trim()).join(', ')}
            </Body>
          ) : r.other_names ? (
            <Body muted style={styles.small}>With {r.other_names}</Body>
          ) : null}
          {r.food ? <Body style={styles.small}>Food: {r.food}</Body> : null}
          {r.phone ? <Body muted style={styles.small}>{r.phone}</Body> : null}
          {r.message ? <Body style={[styles.small, { marginTop: 4 }]}>“{r.message}”</Body> : null}
          {r.updated_at ? <Text style={styles.when}>{formatWhen(r.updated_at)}</Text> : null}
        </Card>
      ))}
      {data.no_reply.length > 0 ? (
        <Card tone="sage">
          <Text style={styles.cardTitle}>In the app, not replied yet ({data.no_reply.length})</Text>
          <Body muted style={styles.small}>
            {data.no_reply.join(' · ')}
          </Body>
        </Card>
      ) : null}
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.xxl * 2 },
  thanks: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginBottom: 2 },
  small: { fontSize: 14.5, lineHeight: 21 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15.5, color: colors.ink, marginTop: space.xl, marginBottom: space.sm },
  optional: { fontFamily: fonts.body, color: colors.muted },
  choices: { gap: space.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
  },
  choiceOn: { borderColor: colors.rose, backgroundColor: colors.blush },
  choiceText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.rose },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.rose },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  step: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, color: colors.ink, minWidth: 48, textAlign: 'center' },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  phoneRow: { flexDirection: 'row', gap: space.sm },
  nameRow: { flexDirection: 'row', gap: space.sm },
  half: { flex: 1, paddingHorizontal: space.md },
  multi: { minHeight: 88, paddingTop: space.md, textAlignVertical: 'top' },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xxl, marginBottom: space.md },
  stats: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  stat: { flex: 1, alignItems: 'center', backgroundColor: colors.sage, borderRadius: radius.md, paddingVertical: space.md },
  statN: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, color: colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textAlign: 'center' },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 2 },
  replyName: { flex: 1, fontFamily: fonts.displayMedium, fontSize: 21, color: colors.ink },
  pill: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink, backgroundColor: colors.moss, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  pillNo: { backgroundColor: colors.blush, color: colors.rose },
  when: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 6 },
});
