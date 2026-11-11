import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Eyebrow } from '@/components/ui';
import { api, errorMessage, type SosState } from '@/lib/api';
import { tell } from '@/lib/dialog';
import { useLive, useLoad } from '@/lib/live';
import { colors, fonts, radius, space } from '@/lib/theme';

function dial(phone: string) {
  void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
}

/** "Call reception" and "Call the planner" buttons. Each shows only once its number is set. */
export function CallButtons() {
  const { data, reload } = useLoad<SosState>(() => api.sosState());
  useLive('updates', () => void reload());
  if (!data?.reception_phone && !data?.contact_phone) return null;
  return (
    <View style={styles.row}>
      {data.reception_phone ? <Button label="Call reception" icon="phone" variant="quiet" onPress={() => dial(data.reception_phone!)} /> : null}
      {data.contact_phone ? (
        <Button label={`Call ${data.contact_name ?? 'the planner'}`} icon="phone" variant="quiet" onPress={() => dial(data.contact_phone!)} />
      ) : null}
    </View>
  );
}

/** Hosts only: the numbers behind those buttons. */
export function ContactsEditor() {
  const { data, reload } = useLoad<SosState>(() => api.sosState());
  const [reception, setReception] = useState('');
  const [plannerName, setPlannerName] = useState('');
  const [plannerPhone, setPlannerPhone] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data || loaded) return;
    setLoaded(true);
    setReception(data.reception_phone ?? '');
    setPlannerName(data.contact_name ?? '');
    setPlannerPhone(data.contact_phone ?? '');
  }, [data, loaded]);

  async function save() {
    setBusy(true);
    try {
      await api.contactsSet(reception, plannerName, plannerPhone);
      await reload();
      tell('Saved', 'Guests will see a call button for each number you entered.');
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginTop: space.md }}>
      <Eyebrow color={colors.rose}>Phone numbers guests can call</Eyebrow>
      <Body muted style={styles.hint}>
        Leave one empty to hide its button.
      </Body>
      <Text style={styles.label}>Resort reception</Text>
      <TextInput value={reception} onChangeText={setReception} keyboardType="phone-pad" placeholder="+91 …" placeholderTextColor="#9A9C8E" maxLength={24} style={styles.input} accessibilityLabel="Resort reception phone number" />
      <Text style={styles.label}>Wedding planner's name</Text>
      <TextInput value={plannerName} onChangeText={setPlannerName} maxLength={40} style={styles.input} accessibilityLabel="Wedding planner's name" />
      <Text style={styles.label}>Wedding planner's number</Text>
      <TextInput value={plannerPhone} onChangeText={setPlannerPhone} keyboardType="phone-pad" placeholder="+91 …" placeholderTextColor="#9A9C8E" maxLength={24} style={styles.input} accessibilityLabel="Wedding planner's phone number" />
      <Button label="Save numbers" onPress={() => void save()} busy={busy} style={{ marginTop: space.md, alignSelf: 'flex-start' }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  hint: { fontSize: 14, marginTop: 4 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, marginTop: space.md, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
});
