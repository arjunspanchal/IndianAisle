import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WeatherChip } from '@/components/Weather';
import { Body, Button, Eyebrow, Title } from '@/components/ui';
import { api, type CameraState } from '@/lib/api';
import { useLoad } from '@/lib/live';
import { addShot, flush, shotsTakenToday, subscribeWaiting } from '@/lib/roll';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatReveal } from '@/lib/time';

const ROLL = 27;
const LONG_EDGE = 1600; // enough for a phone screen and a 6x4 print, small enough for hill signal
const THUMB_EDGE = 420;

// iPhone back lenses. Naming the lens outright keeps the camera from opening on
// the ultra-wide, and gives guests the same 0.5× / 1× switch as the phone's own camera.
const LENS_WIDE = 'AVCaptureDeviceTypeBuiltInWideAngleCamera';
const LENS_ULTRA = 'AVCaptureDeviceTypeBuiltInUltraWideCamera';

// A disposable camera: a small viewfinder, a frame counter, a flash switch and
// a shutter. No preview after the click and no retakes — the roll develops
// overnight and shows up in the album the next morning.
export default function Camera() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [ultra, setUltra] = useState(false); // false = the normal 1× lens
  const [hasUltra, setHasUltra] = useState(false);
  const [ready, setReady] = useState(false);
  const [winding, setWinding] = useState(false);
  const [localTaken, setLocalTaken] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const blink = useRef(new Animated.Value(0)).current;

  const { data: server } = useLoad<CameraState>(() => api.cameraState(), 60000);

  const refreshLocal = useCallback(() => {
    void shotsTakenToday().then(setLocalTaken);
  }, []);

  useEffect(() => subscribeWaiting(setWaiting), []);
  useEffect(() => {
    if (focused) {
      refreshLocal();
      void flush();
    } else {
      setReady(false);
    }
  }, [focused, refreshLocal]);

  // The phone's own count covers shots taken with no signal; the server's covers a reinstall.
  const used = Math.max(server?.used ?? 0, localTaken);
  const left = Math.max(ROLL - used, 0);

  async function shoot() {
    if (!camera.current || !ready || winding || left === 0) return;
    setWinding(true);
    setProblem(null);
    blink.setValue(1);
    Animated.timing(blink, { toValue: 0, duration: 380, useNativeDriver: true }).start();
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.9 });
      if (!shot?.uri) throw new Error('no picture');
      const landscape = shot.width >= shot.height;
      const full = await manipulateAsync(
        shot.uri,
        [{ resize: landscape ? { width: Math.min(LONG_EDGE, shot.width) } : { height: Math.min(LONG_EDGE, shot.height) } }],
        { compress: 0.74, format: SaveFormat.JPEG },
      );
      const thumb = await manipulateAsync(full.uri, [{ resize: landscape ? { height: THUMB_EDGE } : { width: THUMB_EDGE } }], {
        compress: 0.6,
        format: SaveFormat.JPEG,
      });
      setLocalTaken(await addShot({ uri: full.uri, thumbUri: thumb.uri, width: full.width, height: full.height }));
    } catch {
      setProblem("That one didn't take. Try again.");
    } finally {
      // The pause is the film winding on. It also stops accidental double shots.
      setTimeout(() => setWinding(false), 900);
    }
  }

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={styles.headRow}>
        <Eyebrow>Today's roll</Eyebrow>
        <WeatherChip />
      </View>
      <View style={styles.counterRow}>
        <Text style={styles.counter} accessibilityLabel={`${left} of ${ROLL} shots left`}>
          {left}
        </Text>
        <Title size={22} style={{ marginBottom: 9 }}>
          {left === 1 ? 'shot left' : 'shots left'} <Text style={styles.of}>of {ROLL}</Text>
        </Title>
      </View>
    </View>
  );

  if (!permission) return <View style={styles.screen}>{header}</View>;

  if (!permission.granted) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Feather name="camera" size={34} color={colors.olive} />
          <Title size={26} style={{ textAlign: 'center' }}>
            Your wedding camera
          </Title>
          <Body muted style={{ textAlign: 'center' }}>
            You get {ROLL} photos a day. They stay a secret until the next morning, when everyone's develop together in the album.
          </Body>
          {permission.canAskAgain ? (
            <Button label="Turn on the camera" icon="camera" onPress={() => void requestPermission()} />
          ) : (
            <Button label="Open Settings to allow the camera" variant="quiet" onPress={() => void Linking.openSettings()} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}

      <View style={styles.body}>
        <View style={styles.viewfinder}>
          {focused ? (
            <CameraView
              ref={camera}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              mirror={facing === 'front'}
              selectedLens={Platform.OS === 'ios' && facing === 'back' ? (ultra ? LENS_ULTRA : LENS_WIDE) : undefined}
              onAvailableLensesChanged={({ lenses }) => {
                if (facing === 'back') setHasUltra(lenses.some((l) => l.deviceType === LENS_ULTRA));
              }}
              animateShutter={false}
              onCameraReady={() => setReady(true)}
              onMountError={() => setProblem("The camera couldn't start. Close other camera apps and try again.")}
            />
          ) : null}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.blink, { opacity: blink }]} />
          {facing === 'back' && hasUltra && left > 0 ? (
            <View style={styles.lenses} accessibilityRole="radiogroup" accessibilityLabel="Lens">
              {[true, false].map((wide) => {
                const on = ultra === wide;
                return (
                  <Pressable
                    key={wide ? 'ultra' : 'normal'}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={wide ? 'Wide angle, 0.5 times' : 'Normal, 1 times'}
                    hitSlop={6}
                    onPress={() => setUltra(wide)}
                    style={[styles.lens, on && styles.lensOn]}>
                    <Text style={[styles.lensText, on && styles.lensTextOn]}>{wide ? '0.5×' : '1×'}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {left === 0 ? (
            <View style={[StyleSheet.absoluteFill, styles.finished]}>
              <Title size={28} style={{ color: colors.white, textAlign: 'center' }}>
                That's the whole roll.
              </Title>
              <Body style={{ color: '#E8E9DF', textAlign: 'center' }}>Fresh film tomorrow morning.</Body>
            </View>
          ) : null}
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: flash === 'on' }}
            accessibilityLabel="Flash"
            hitSlop={8}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
              setFlash((f) => (f === 'on' ? 'off' : 'on'));
            }}
            style={({ pressed }) => [styles.side, pressed && { opacity: 0.7 }]}>
            <View style={[styles.flashDisc, flash === 'on' && styles.flashDiscOn]}>
              <Feather name={flash === 'on' ? 'zap' : 'zap-off'} size={20} color={flash === 'on' ? colors.camera : '#C9CDBD'} />
            </View>
            <Text style={[styles.sideLabel, flash === 'on' && { color: colors.gold }]}>{flash === 'on' ? 'Flash on' : 'Flash off'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={left === 0 ? 'Roll finished' : 'Take photo'}
            accessibilityState={{ disabled: !ready || winding || left === 0 }}
            disabled={!ready || winding || left === 0}
            onPress={shoot}
            style={({ pressed }) => [styles.shutter, (pressed || winding) && { transform: [{ scale: 0.94 }] }, (!ready || left === 0) && { opacity: 0.4 }]}>
            <View style={styles.shutterInner} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch between front and back camera"
            onPress={() => {
              setReady(false);
              setFacing((f) => (f === 'back' ? 'front' : 'back'));
            }}
            style={({ pressed }) => [styles.side, pressed && { opacity: 0.7 }]}>
            <Feather name="refresh-cw" size={22} color="#C9CDBD" />
            <Text style={styles.sideLabel}>Flip</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.foot, { paddingBottom: space.md }]}>
        {problem ? (
          <Body style={{ color: colors.rose, textAlign: 'center' }}>{problem}</Body>
        ) : winding ? (
          <Body muted style={{ textAlign: 'center' }}>
            Winding on…
          </Body>
        ) : (
          <Body muted style={{ textAlign: 'center' }}>
            No peeking. Today's photos develop at {server ? formatReveal(server.reveal_at) : '9:00 am tomorrow'}.
          </Body>
        )}
        {waiting > 0 ? (
          <View style={styles.waiting}>
            <Feather name="upload-cloud" size={14} color={colors.muted} />
            <Text style={styles.waitingText}>
              {waiting} {waiting === 1 ? 'photo' : 'photos'} safe on your phone, sending when there's signal
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: space.xl, paddingBottom: space.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  counter: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68, color: colors.ink },
  of: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  body: {
    flex: 1,
    marginHorizontal: space.lg,
    backgroundColor: colors.camera,
    borderRadius: radius.lg + 6,
    padding: space.md,
  },
  viewfinder: { flex: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#1B2016' },
  blink: { backgroundColor: colors.white },
  lenses: {
    position: 'absolute',
    bottom: space.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(18,21,15,0.55)',
  },
  lens: { minWidth: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  lensOn: { backgroundColor: 'rgba(252,250,245,0.94)' },
  lensText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#E8E9DF' },
  lensTextOn: { color: colors.ink },
  finished: { backgroundColor: 'rgba(27,32,22,0.86)', alignItems: 'center', justifyContent: 'center', gap: 6, padding: space.xl },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.md, paddingHorizontal: space.sm },
  side: { width: 84, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4 },
  flashDisc: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#6F745F' },
  flashDiscOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  sideLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#C9CDBD' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.rose },
  foot: { paddingHorizontal: space.xl, paddingTop: space.md, gap: 6, minHeight: 78 },
  waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  waitingText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
