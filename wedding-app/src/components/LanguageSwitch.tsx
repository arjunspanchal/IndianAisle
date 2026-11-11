import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LANGUAGES, setLang, useLang } from '@/lib/i18n';
import { colors, fonts, radius } from '@/lib/theme';

/** English | ગુજરાતી. Each language is written in its own script so it can be found by someone who reads only that one. */
export function LanguageSwitch() {
  const lang = useLang();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Language">
      {LANGUAGES.map((l) => {
        const on = l.code === lang;
        return (
          <Pressable
            key={l.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={l.name}
            onPress={() => setLang(l.code)}
            style={[styles.pill, on && styles.pillOn]}>
            <Text style={[styles.text, on && { color: colors.white }]}>{l.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: { minHeight: 44, minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.moss },
  pillOn: { backgroundColor: colors.rose },
  text: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
});
