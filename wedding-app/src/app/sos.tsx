import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, Card, Eyebrow, Title } from '@/components/ui';
import { api, errorMessage, type SosState } from '@/lib/api';
import { useLoad } from '@/lib/live';
import { colors, fonts, radius, space } from '@/lib/theme';

// One screen, one job: tell the people running the wedding that you need help.
// Sending it pushes to every admin's phone (the couple and the wedding planner).
export default function Sos() {
  const { data } = useLoad<SosState>(() => api.sosState());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.sosRaise(note);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {sent ? (
          <View style={styles.center}>
            <View style={styles.okBadge}>
              <Feather name="check" size={34} color={colors.white} />
            </View>
            <Title size={32} style={{ textAlign: 'center' }}>
              Help is on the way
            </Title>
            <Body muted style={{ textAlign: 'center' }}>
              The wedding team has been alerted and can see it's you. Stay where you are if you can.
            </Body>
            <Button label="Done" variant="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ marginTop: space.md }} />
          </View>
        ) : (
          <>
            <Eyebrow color={colors.sos}>SOS</Eyebrow>
            <Title size={34} style={{ marginTop: 2 }}>
              Need help?
            </Title>
            <Body muted style={{ marginTop: 6 }}>
              This sends an alert to the wedding team's phones straight away, with your name. Use it if you're unwell, lost, stuck or worried
              about someone.
            </Body>

            <Card style={{ marginTop: space.xl }}>
              <Body style={styles.label}>What's happening and where are you? (optional)</Body>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Feeling faint, near the pool"
                placeholderTextColor="#9A9C8E"
                multiline
                maxLength={300}
                style={styles.input}
                accessibilityLabel="What's happening and where are you"
              />
              {error ? <Body style={{ color: colors.sos, marginTop: space.sm }}>{error}</Body> : null}
              <Button label="Send SOS to the wedding team" icon="alert-circle" onPress={send} busy={busy} style={styles.sosButton} />
            </Card>

            {data?.reception_phone ? (
              <Button
                label="Call reception"
                icon="phone"
                variant="quiet"
                onPress={() => void Linking.openURL(`tel:${data.reception_phone!.replace(/[^\d+]/g, '')}`)}
                style={{ marginTop: space.md }}
              />
            ) : null}

            {data?.contact_phone ? (
              <Button
                label={`Call ${data.contact_name ?? 'the wedding planner'}`}
                icon="phone"
                variant="quiet"
                onPress={() => void Linking.openURL(`tel:${data.contact_phone}`)}
                style={{ marginTop: space.md }}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: space.xl, paddingBottom: space.xxl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space.xxl },
  okBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.olive, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15, marginBottom: space.sm },
  input: {
    minHeight: 96,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    padding: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  sosButton: { marginTop: space.lg, backgroundColor: colors.sos, minHeight: 58 },
});
