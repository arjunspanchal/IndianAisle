import { useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

const CLOSE_AFTER = 110; // how far down, in points, counts as "I'm done with this photo"

/**
 * Wraps a full-screen viewer so that dragging it downwards closes it, the way
 * photo viewers work in WhatsApp and Photos. The picture follows the finger and
 * the dark backdrop fades; let go early and it springs back.
 * Use inside a transparent Modal so the screen underneath shows through.
 */
export function SwipeDown({ onClose, children, enabled = true }: { onClose: () => void; children: ReactNode; enabled?: boolean }) {
  const y = useRef(new Animated.Value(0)).current;
  // Switched off while a photo is zoomed in, so dragging moves the photo instead.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pan = useMemo(() => {
    // Only a clearly downward drag, so sideways swipes between photos still work.
    // One finger only: two fingers are a pinch.
    const wants = (_: unknown, g: { dx: number; dy: number; numberActiveTouches: number }) =>
      enabledRef.current && g.numberActiveTouches === 1 && g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
    const back = () => Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: wants,
      onMoveShouldSetPanResponderCapture: wants,
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_AFTER || g.vy > 1.1) {
          Animated.timing(y, { toValue: 900, duration: 170, useNativeDriver: true }).start(() => onCloseRef.current());
        } else {
          back();
        }
      },
      onPanResponderTerminate: back,
    });
  }, [y]);

  const backdrop = y.interpolate({ inputRange: [0, 320], outputRange: [1, 0.15], extrapolate: 'clamp' });

  return (
    <View style={styles.fill}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]} />
      <Animated.View style={[styles.fill, { transform: [{ translateY: y }] }]} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { backgroundColor: '#12150F' },
});
