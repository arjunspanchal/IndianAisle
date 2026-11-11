import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Accent, Body, Button, Card, Eyebrow, GoldRule, Loading, Title } from '@/components/ui';
import { api, errorMessage, type Rsvp, type RsvpSummary } from '@/lib/api';
import { tell } from '@/lib/dialog';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatWhen } from '@/lib/time';

// "Will you join us?" — the same questions as the website's form, answered
// here instead. One reply per person who joined; it can be changed any time.
export default function RsvpScreen() {
  const { isHost } = useSession();
  const mine = useLoad<Rsvp | null>(() => api.rsvpGet());
  const [attending, setAttending] = useState<boolean | null>(null);
  const [people, setPeople] = useState(1);
  const [others, setOthers] = useState('');
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
    setPeople(r.people);
    setOthers(r.other_names);
    setPhone(r.phone);
    setFood(r.food);
    setMessage(r.message);
  }, [mine.data, mine.loading, filled]);

  async function send() {
    if (attending === null || busy) return;
    setBusy(true);
    try {
      await api.rsvpSet({ attending, people: attending ? people : 1, other_names: attending ? others : '', phone, food: attending ? food : '', message });
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

        <Text style={styles.label}>Will you be coming?</Text>
        <View style={styles.choices}>
          <Choice label="Yes, we'll be there" on={attending === true} onPress={() => setAttending(true)} />
          <Choice label="Sorry, we can't come" on={attending === false} onPress={() => setAttending(false)} />
        </View>

        {attending ? (
          <>
            <Text style={styles.label}>How many people, including you?</Text>
            <View style={styles.stepper}>
              <Step icon="minus" label="One fewer" onPress={() => setPeople((n) => Math.max(1, n - 1))} />
              <Text style={styles.count} accessibilityLabel={`${people} people`}>
                {people}
              </Text>
              <Step icon="plus" label="One more" onPress={() => setPeople((n) => Math.min(12, n + 1))} />
            </View>

            {people > 1 ? (
              <>
                <Text style={styles.label}>Full names of everyone coming with you</Text>
                <TextInput value={others} onChangeText={setOthers} multiline maxLength={400} style={[styles.input, styles.multi]} accessibilityLabel="Full names of everyone coming with you" />
              </>
            ) : null}

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
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +91 98200 12345"
              placeholderTextColor="#9A9C8E"
              keyboardType="phone-pad"
              maxLength={24}
              style={styles.input}
              accessibilityLabel="Mobile number"
            />
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
          {r.other_names ? <Body muted style={styles.small}>With {r.other_names}</Body> : null}
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
