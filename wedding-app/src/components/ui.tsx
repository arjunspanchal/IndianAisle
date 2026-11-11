import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WeatherChip } from '@/components/Weather';
import { getLang } from '@/lib/i18n';
import { colors, fonts, radius, space } from '@/lib/theme';

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };

/** UPPERCASE wide-tracked label. */
export function Eyebrow({ children, style, color }: TextProps & { color?: string }) {
  return <Text style={[styles.eyebrow, color ? { color } : null, style]}>{children}</Text>;
}

/** Cormorant headline. */
export function Title({ children, style, numberOfLines, size = 30 }: TextProps & { size?: number }) {
  return (
    // Gujarati letters carry marks above and below the line, so they need more room than Latin capitals.
    <Text numberOfLines={numberOfLines} style={[styles.title, { fontSize: size, lineHeight: Math.round(size * (getLang() === 'gu' ? 1.34 : 1.12)) }, style]}>
      {children}
    </Text>
  );
}

/** Rose italic accent, used for the "&" and small flourishes. */
export function Accent({ children, style }: TextProps) {
  return <Text style={[styles.accent, style]}>{children}</Text>;
}

export function Body({ children, style, numberOfLines, muted }: TextProps & { muted?: boolean }) {
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, muted ? { color: colors.muted } : null, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, tone = 'card' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'card' | 'blush' | 'moss' | 'sage' }) {
  return <View style={[styles.card, { backgroundColor: colors[tone] }, tone !== 'card' ? styles.cardFlat : null, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet' | 'ghost';
  icon?: ComponentProps<typeof Feather>['name'];
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, busy, disabled, style }: ButtonProps) {
  const off = disabled || busy;
  const fg = variant === 'primary' ? colors.white : variant === 'quiet' ? colors.ink : colors.rose;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'quiet' && styles.buttonQuiet,
        variant === 'ghost' && styles.buttonGhost,
        pressed && { opacity: 0.8 },
        off && { opacity: 0.5 },
        style,
      ]}>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Feather name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.ink,
  size = 22,
  style,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }, style]}>
      <Feather name={icon} size={size} color={color} />
    </Pressable>
  );
}

/** Thin gold rule, the system's divider. */
export function GoldRule({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.rule, style]} />;
}

/** A tab screen's top area: eyebrow + big Cormorant title. The resort's weather sits on the right unless something else is passed. */
export function ScreenHeader({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={{ flex: 1 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Title size={34} style={{ marginTop: 2 }}>
          {title}
        </Title>
      </View>
      {right ?? <WeatherChip />}
    </View>
  );
}

/** Shown while loading, when empty, or when something failed. */
export function Notice({
  icon,
  title,
  body,
  action,
}: {
  icon?: ComponentProps<typeof Feather>['name'];
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.notice}>
      {icon ? <Feather name={icon} size={28} color={colors.olive} /> : null}
      <Title size={24} style={{ textAlign: 'center' }}>
        {title}
      </Title>
      {body ? (
        <Body muted style={{ textAlign: 'center' }}>
          {body}
        </Body>
      ) : null}
      {action}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.notice}>
      <ActivityIndicator color={colors.olive} />
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.olive,
  },
  title: { fontFamily: fonts.displayMedium, color: colors.ink, letterSpacing: -0.3 },
  accent: { fontFamily: fonts.displayItalic, color: colors.rose },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
    padding: space.lg,
  },
  cardFlat: { borderColor: 'transparent' },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonPrimary: { backgroundColor: colors.rose },
  buttonQuiet: { backgroundColor: colors.moss },
  buttonGhost: { backgroundColor: 'transparent', minHeight: 44, paddingHorizontal: space.md },
  buttonLabel: { fontFamily: fonts.bodyBold, fontSize: 16 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  rule: { height: 1, backgroundColor: colors.gold, opacity: 0.55 },
  header: {
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.paper,
  },
  notice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
});
