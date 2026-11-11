import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COUNTRIES, flag, type Country } from '@/lib/countries';
import { t } from '@/lib/i18n';
import { colors, fonts, radius, space } from '@/lib/theme';

/**
 * The country code button beside a phone number field: shows the flag and code,
 * and opens a searchable list to change it.
 */
export function CountryPicker({ value, onChange }: { value: Country; onChange: (c: Country) => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dial.slice(1).startsWith(q));
  }, [query]);

  function pick(c: Country) {
    onChange(c);
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Country code, {country}, {code}. Tap to change.', { country: value.name, code: value.dial })}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
        <Text style={styles.flag}>{flag(value.iso)}</Text>
        <Text style={styles.dial}>{value.dial}</Text>
        <Feather name="chevron-down" size={16} color={colors.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.sheet, { paddingTop: insets.top + space.md }]}>
          <View style={styles.head}>
            <Text style={styles.title}>{t('Country code')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Close')} hitSlop={10} onPress={() => setOpen(false)} style={styles.close}>
              <Feather name="x" size={24} color={colors.ink} />
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('Search a country or code')}
            placeholderTextColor="#9A9C8E"
            autoCorrect={false}
            style={styles.search}
            accessibilityLabel={t('Search a country or code')}
          />
          <FlatList
            data={shown}
            keyExtractor={(c) => c.iso}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
            ListEmptyComponent={<Text style={styles.empty}>{t('No country matches that. You can also type the number in full, starting with +.')}</Text>}
            renderItem={({ item }) => {
              const on = item.iso === value.iso;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${item.name}, ${item.dial}`}
                  onPress={() => pick(item)}
                  style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.flag}>{flag(item.iso)}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowDial}>{item.dial}</Text>
                  {on ? <Feather name="check" size={18} color={colors.rose} /> : <View style={{ width: 18 }} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
  },
  flag: { fontSize: 22 },
  dial: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.ink },
  sheet: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.displayMedium, fontSize: 28, color: colors.ink },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: {
    minHeight: 50,
    marginTop: space.sm,
    marginBottom: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 54, paddingHorizontal: space.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowOn: { backgroundColor: colors.blush },
  name: { flex: 1, fontFamily: fonts.body, fontSize: 17, color: colors.ink },
  rowDial: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.muted },
  empty: { fontFamily: fonts.body, fontSize: 15.5, color: colors.muted, padding: space.lg, textAlign: 'center' },
});
