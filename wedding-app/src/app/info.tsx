import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CallButtons } from '@/components/Contacts';
import { WeatherLine } from '@/components/Weather';
import { Accent, Body, Button, Card, Eyebrow, GoldRule, Title } from '@/components/ui';
import { arriving, faqs, fogNote, gettingHere, packing, travelCaveat, typicalWeather } from '@/lib/info';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';

const PACKED_KEY = 'ka.packed';

// Everything a guest would otherwise open the website for: arriving and
// leaving, the weather, how to get there, the little questions, what to pack.
export default function Info() {
  const [open, setOpen] = useState<number | null>(null);
  const [packed, setPacked] = useState<Set<number>>(new Set());

  // Ticks stay on this phone only.
  useEffect(() => {
    void AsyncStorage.getItem(PACKED_KEY)
      .then((raw) => raw && setPacked(new Set(JSON.parse(raw) as number[])))
      .catch(() => {});
  }, []);

  function togglePacked(i: number) {
    setPacked((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      void AsyncStorage.setItem(PACKED_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Eyebrow>The useful little things</Eyebrow>
      <Title size={34} style={{ marginTop: 2 }}>
        Less wondering.
      </Title>
      <Accent style={{ fontSize: 26 }}>More celebrating.</Accent>

      <Section title="Hello, hills" />
      {arriving.map((a) => (
        <Card key={a.when} style={styles.gap}>
          <Text style={styles.kicker}>{a.when}</Text>
          <Body style={{ marginTop: 4 }}>{a.what}</Body>
        </Card>
      ))}
      <Card style={styles.gap}>
        <Title size={22}>{wedding.venue}</Title>
        <Body muted style={{ marginTop: 4 }}>
          {wedding.address}
        </Body>
        <Button label="Open in Maps" icon="map-pin" variant="quiet" onPress={() => void Linking.openURL(wedding.mapsUrl)} style={styles.inlineButton} />
        <CallButtons />
      </Card>

      <Section title="Winter in the north" />
      <Card tone="sage" style={styles.gap}>
        <Text style={styles.kicker}>Right now</Text>
        <WeatherLine />
        <Text
          style={styles.credit}
          accessibilityRole="link"
          onPress={() => void Linking.openURL('https://open-meteo.com/')}>
          Weather data by Open-Meteo.com
        </Text>
        <GoldRule style={{ marginVertical: space.md }} />
        <Text style={styles.kicker}>Typical mid-January</Text>
        {typicalWeather.map((w) => (
          <View key={w.place} style={styles.weatherRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.place}>{w.place}</Text>
              <Body muted style={styles.small}>
                {w.note}
              </Body>
            </View>
            <View style={styles.temps} accessible accessibilityLabel={`${w.place}: ${w.day} by day, ${w.night} at night`}>
              <Text style={styles.temp}>{w.day}</Text>
              <Text style={styles.tempLabel}>day</Text>
              <Text style={[styles.temp, { marginTop: 4 }]}>{w.night}</Text>
              <Text style={styles.tempLabel}>night</Text>
            </View>
          </View>
        ))}
        <Body muted style={[styles.small, { marginTop: space.sm }]}>
          Typical weather, not a forecast.
        </Body>
      </Card>
      <Card tone="blush" style={[styles.gap, styles.fog]}>
        <Feather name="cloud" size={18} color={colors.rose} style={{ marginTop: 3 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>A note on January fog</Text>
          <Body muted style={styles.small}>
            {fogNote}
          </Body>
        </View>
      </Card>

      <Section title="The journey here" />
      {gettingHere.map((g) => (
        <Card key={g.from} style={styles.gap}>
          <Text style={styles.kicker}>{g.from}</Text>
          <Title size={22} style={{ marginTop: 2 }}>
            {g.how}
          </Title>
          <Body muted style={{ marginTop: 4 }}>
            {g.note}
          </Body>
        </Card>
      ))}
      <Body muted style={[styles.small, { marginTop: space.sm }]}>
        {travelCaveat}
      </Body>

      <Section title="Questions" />
      {faqs.map((f, i) => {
        const on = open === i;
        return (
          <Pressable
            key={f.q}
            accessibilityRole="button"
            accessibilityState={{ expanded: on }}
            onPress={() => setOpen(on ? null : i)}
            style={[styles.faq, on && styles.faqOn]}>
            <View style={styles.faqHead}>
              <Text style={styles.faqQ}>{f.q}</Text>
              <Feather name={on ? 'minus' : 'plus'} size={20} color={colors.rose} />
            </View>
            {on ? <Body style={{ marginTop: space.sm }}>{f.a}</Body> : null}
          </Pressable>
        );
      })}

      <Section title="A little packing list" />
      <Card style={styles.gap}>
        <Accent style={{ fontSize: 20, marginBottom: space.sm }}>Bring the essentials. We’ll bring the happy tears.</Accent>
        {packing.map((item, i) => {
          const done = packed.has(i);
          return (
            <Pressable
              key={item}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              onPress={() => togglePacked(i)}
              style={styles.packRow}>
              <View style={[styles.box, done && styles.boxOn]}>{done ? <Feather name="check" size={16} color={colors.white} /> : null}</View>
              <Text style={[styles.packText, done && styles.packDone]}>{item}</Text>
            </Pressable>
          );
        })}
        <Body muted style={[styles.small, { marginTop: space.sm }]}>
          {packed.size} of {packing.length} packed. A friendly packing suggestion, not a dress code. Your ticks stay on this phone.
        </Body>
      </Card>

      <Button label="Open the wedding website" variant="ghost" onPress={() => void Linking.openURL(wedding.siteUrl)} style={{ alignSelf: 'center', marginTop: space.lg }} />
    </ScrollView>
  );
}

function Section({ title }: { title: string }) {
  return (
    <View style={styles.section}>
      <Eyebrow>{title}</Eyebrow>
      <GoldRule style={{ flex: 1, marginLeft: space.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.xxl * 2 },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  gap: { marginBottom: space.sm },
  credit: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 4, textDecorationLine: 'underline' },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13.5, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.olive },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginBottom: 2 },
  small: { fontSize: 14.5, lineHeight: 21 },
  inlineButton: { alignSelf: 'flex-start', marginTop: space.md },
  weatherRow: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  place: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.ink },
  temps: { alignItems: 'flex-end', minWidth: 64 },
  temp: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  tempLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  fog: { flexDirection: 'row', gap: space.md },
  faq: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.sm,
    minHeight: 56,
    justifyContent: 'center',
  },
  faqOn: { borderColor: colors.gold },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  faqQ: { flex: 1, fontFamily: fonts.displayMedium, fontSize: 21, lineHeight: 25, color: colors.ink },
  packRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.olive },
  packText: { flex: 1, fontFamily: fonts.body, fontSize: 17, color: colors.ink },
  packDone: { color: colors.muted, textDecorationLine: 'line-through' },
});
