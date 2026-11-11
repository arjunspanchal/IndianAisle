import { Image, type ImageProps } from 'expo-image';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, type GestureResponderEvent } from 'react-native';

const MAX = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 280;

const fingers = (e: GestureResponderEvent) => e.nativeEvent.touches.length;
function spread(e: GestureResponderEvent): number {
  const [a, b] = e.nativeEvent.touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/**
 * A full-screen photo you can pinch to zoom, drag around while zoomed, and
 * double-tap to zoom in or back out. `onZoom` says when it is zoomed, so the
 * screen around it can stop paging and swipe-to-close from fighting the drag.
 */
export function ZoomImage({
  uri,
  width,
  height,
  onZoom,
  ...image
}: Omit<ImageProps, 'source' | 'style'> & { uri: string; width: number; height: number; onZoom?: (zoomed: boolean) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  const now = useRef({ scale: 1, x: 0, y: 0 }); // where the picture is
  const from = useRef({ fingers: 0, scale: 1, x: 0, y: 0, spread: 0, dx: 0, dy: 0 }); // where this stretch of the gesture began
  const lastTap = useRef(0);
  const zoomed = useRef(false);
  const size = useRef({ width, height });
  size.current = { width, height };
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;

  const api = useMemo(() => {
    const report = (z: boolean) => {
      if (z === zoomed.current) return;
      zoomed.current = z;
      onZoomRef.current?.(z);
    };
    // Keep the picture's edges from wandering off the screen.
    const held = (s: number, x: number, y: number) => {
      const mx = Math.max(0, (size.current.width * (s - 1)) / 2);
      const my = Math.max(0, (size.current.height * (s - 1)) / 2);
      return { scale: s, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
    };
    const place = (s: number, x: number, y: number) => {
      now.current = held(s, x, y);
      scale.setValue(now.current.scale);
      tx.setValue(now.current.x);
      ty.setValue(now.current.y);
    };
    const settle = (s: number, x: number, y: number) => {
      const to = s <= 1.05 ? { scale: 1, x: 0, y: 0 } : held(Math.min(MAX, s), x, y);
      now.current = to;
      report(to.scale > 1);
      Animated.parallel([
        Animated.spring(scale, { toValue: to.scale, useNativeDriver: true, bounciness: 2 }),
        Animated.spring(tx, { toValue: to.x, useNativeDriver: true, bounciness: 2 }),
        Animated.spring(ty, { toValue: to.y, useNativeDriver: true, bounciness: 2 }),
      ]).start();
    };
    return { report, place, settle };
  }, [scale, tx, ty]);

  // A different photo in the same slot starts unzoomed.
  useEffect(() => {
    api.place(1, 0, 0);
    api.report(false);
  }, [uri, api]);

  const pan = useMemo(() => {
    const wants = (e: GestureResponderEvent, g: { dx: number; dy: number }) =>
      fingers(e) === 2 || (now.current.scale > 1 && Math.abs(g.dx) + Math.abs(g.dy) > 4);
    const done = () => api.settle(now.current.scale, now.current.x, now.current.y);
    return PanResponder.create({
      onStartShouldSetPanResponder: (e) => fingers(e) === 2,
      onStartShouldSetPanResponderCapture: (e) => fingers(e) === 2,
      onMoveShouldSetPanResponder: wants,
      onMoveShouldSetPanResponderCapture: wants,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        from.current.fingers = 0;
      },
      onPanResponderMove: (e, g) => {
        const n = fingers(e);
        if (n !== from.current.fingers) {
          // A finger went down or came up: measure afresh from here.
          from.current = { fingers: n, ...now.current, spread: n >= 2 ? spread(e) : 0, dx: g.dx, dy: g.dy };
          if (n >= 2) api.report(true);
          return;
        }
        if (n >= 2) {
          const s = from.current.scale * (spread(e) / (from.current.spread || 1));
          api.place(Math.max(0.7, Math.min(MAX * 1.25, s)), now.current.x, now.current.y);
        } else if (now.current.scale > 1) {
          api.place(now.current.scale, from.current.x + g.dx - from.current.dx, from.current.y + g.dy - from.current.dy);
        }
      },
      onPanResponderRelease: done,
      onPanResponderTerminate: done,
    });
  }, [api]);

  function tap() {
    const t = Date.now();
    if (t - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      api.settle(now.current.scale > 1 ? 1 : DOUBLE_TAP_ZOOM, 0, 0);
    } else {
      lastTap.current = t;
    }
  }

  return (
    <Animated.View
      style={{ width, height, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}
      {...pan.panHandlers}>
      <Pressable onPress={tap} accessible={false}>
        <Image source={{ uri }} style={{ width, height }} contentFit="contain" {...image} />
      </Pressable>
    </Animated.View>
  );
}
