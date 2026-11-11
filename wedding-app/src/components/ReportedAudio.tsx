import { Feather } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius, space } from '@/lib/theme';

/** A plain play/pause control, used where a host listens to a reported voice note. */
export function Audio({ url }: { url: string }) {
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
      onPress={() => {
        if (status.playing) player.pause();
        else {
          if (status.didJustFinish) void player.seekTo(0).catch(() => {});
          player.play();
        }
      }}
      style={styles.button}>
      <Feather name={status.playing ? 'pause' : 'play'} size={18} color={colors.white} />
      <Text style={styles.text}>{status.playing ? 'Pause' : 'Play voice note'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    marginTop: space.sm,
  },
  text: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.white },
});
