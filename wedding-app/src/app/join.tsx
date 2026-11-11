import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Accent, Body, Button, Eyebrow } from '@/components/ui';
import { configured, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';

// The invitation, as a screen: olive band, gold line with a dashed line inside
// it, chintz sprays at opposite corners, names over a short gold rule.
export default function Join() {
  const insets = useSafeAreaInsets();
  const { join } = useSession();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length >= 2 && code.trim().length >= 3;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await join(code, name);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <View style={[styles.band, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.paper}>
        <View pointerEvents="none" style={styles.dashed} />
        <Image
          source={require('../../assets/florals/chintz-corner-spray.webp')}
          style={styles.cornerSpray}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <Image source={require('../../assets/florals/chintz-low-spray.webp')} style={styles.lowSpray} contentFit="contain" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Image source={require('../../assets/florals/parrot.webp')} style={styles.parrot} contentFit="contain" />
            <Eyebrow style={{ textAlign: 'center' }}>{wedding.eyebrow}</Eyebrow>
            <Text style={styles.names} accessibilityRole="header">
              {wedding.first} <Accent style={styles.amp}>&</Accent> {wedding.second}
            </Text>
            <View style={styles.rule} />
            <Text style={styles.dates}>{wedding.dates}</Text>
            <Accent style={styles.tagline}>{wedding.tagline}</Accent>

            <View style={styles.form}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor="#9A9C8E"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
                returnKeyType="next"
                style={styles.input}
                accessibilityLabel="Your name"
              />
              <Text style={[styles.label, { marginTop: space.md }]}>Invite code</Text>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="On your invitation"
                placeholderTextColor="#9A9C8E"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={24}
                returnKeyType="go"
                onSubmitEditing={submit}
                style={[styles.input, styles.code]}
                accessibilityLabel="Invite code"
              />
              {error ? (
                <Body style={styles.error}>{error}</Body>
              ) : null}
              {!configured ? <Body style={styles.error}>This build has no server address set.</Body> : null}
              <Button label="Come on in" onPress={submit} busy={busy} disabled={!canSubmit} style={{ marginTop: space.lg }} />
            </View>

            <Body muted style={styles.foot}>
              Photos, plans and chatter for our three days in the hills.
            </Body>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { flex: 1, backgroundColor: colors.olive, paddingHorizontal: 8 },
  paper: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.gold,
    overflow: 'hidden',
  },
  dashed: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    opacity: 0.7,
  },
  cornerSpray: { position: 'absolute', top: -34, right: -58, width: 210, height: 240, opacity: 0.95 },
  lowSpray: { position: 'absolute', bottom: -22, left: -40, width: 250, height: 148, opacity: 0.9 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl + 4,
    paddingTop: 120,
    paddingBottom: 130,
  },
  parrot: { width: 54, height: 54, marginBottom: space.md, alignSelf: 'flex-start', marginLeft: space.lg },
  names: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 52,
    color: colors.ink,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginTop: space.sm,
  },
  amp: { fontSize: 42 },
  rule: { width: 1, height: 34, backgroundColor: colors.gold, marginVertical: space.md },
  dates: { fontFamily: fonts.bodyMedium, fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.ink },
  tagline: { fontSize: 22, marginTop: 6 },
  form: {
    alignSelf: 'stretch',
    marginTop: space.xl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
  },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, marginBottom: 6 },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    paddingHorizontal: space.lg,
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.ink,
  },
  code: { letterSpacing: 2, fontFamily: fonts.bodyMedium },
  error: { color: colors.rose, marginTop: space.md, fontSize: 15, lineHeight: 21 },
  foot: { textAlign: 'center', marginTop: space.lg, fontSize: 14.5, maxWidth: 260 },
});
