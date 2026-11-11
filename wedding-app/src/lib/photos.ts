// Saving album photos to the phone and sharing them out (WhatsApp, AirDrop, …).

import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { Linking, Platform, Share } from 'react-native';

import { photoUrl, type Photo } from './api';

async function download(photo: Photo): Promise<string> {
  const target = new File(Paths.cache, `ka-${photo.id}.jpg`);
  if (target.exists) return target.uri;
  return (await File.downloadFileAsync(photoUrl(photo.path), target)).uri;
}

export type SaveResult = 'saved' | 'denied' | 'failed';

/** Save one or many photos to the phone's own gallery. */
export async function saveToPhone(photos: Photo[], onProgress?: (done: number) => void): Promise<SaveResult> {
  if (Platform.OS === 'web') {
    for (const p of photos) void Linking.openURL(photoUrl(p.path));
    return 'saved';
  }
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return 'denied';
    let done = 0;
    for (const p of photos) {
      await MediaLibrary.saveToLibraryAsync(await download(p));
      onProgress?.(++done);
    }
    return 'saved';
  } catch {
    return 'failed';
  }
}

/**
 * Save a long list one at a time. The caller is told after each photo, so it can
 * show progress and remember what is already on the phone, and can stop early.
 */
export async function saveEach(
  photos: Photo[],
  onSaved: (photo: Photo, done: number) => void,
  shouldStop: () => boolean,
): Promise<SaveResult | 'stopped'> {
  if (Platform.OS === 'web') return 'failed';
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return 'denied';
    let done = 0;
    let missed = 0;
    for (const p of photos) {
      if (shouldStop()) return 'stopped';
      try {
        await MediaLibrary.saveToLibraryAsync(await download(p));
        onSaved(p, ++done);
      } catch {
        // one bad download should not end the whole run, but a dead connection should
        if (++missed >= 5 && done === 0) return 'failed';
      }
    }
    return done === 0 && missed > 0 ? 'failed' : 'saved';
  } catch {
    return 'failed';
  }
}

/**
 * Open the phone's share sheet. One photo is shared as the picture itself;
 * several are shared as links (the system sheet takes one file at a time).
 */
export async function sharePhotos(photos: Photo[]): Promise<boolean> {
  if (photos.length === 0) return true;
  try {
    if (photos.length === 1 && Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(await download(photos[0]), { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
      return true;
    }
    await Share.share({ message: photos.map((p) => photoUrl(p.path)).join('\n') });
    return true;
  } catch {
    return false;
  }
}

/** Save any picture by its link (used for photos sent in chat). */
export async function saveImageUrl(url: string, name: string): Promise<SaveResult> {
  if (Platform.OS === 'web') {
    void Linking.openURL(url);
    return 'saved';
  }
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return 'denied';
    const target = new File(Paths.cache, `ka-${name}.jpg`);
    const local = target.exists ? target.uri : (await File.downloadFileAsync(url, target)).uri;
    await MediaLibrary.saveToLibraryAsync(local);
    return 'saved';
  } catch {
    return 'failed';
  }
}

/** Share any picture by its link through the phone's share sheet. */
export async function shareImageUrl(url: string, name: string): Promise<boolean> {
  try {
    if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
      const target = new File(Paths.cache, `ka-${name}.jpg`);
      const local = target.exists ? target.uri : (await File.downloadFileAsync(url, target)).uri;
      await Sharing.shareAsync(local, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
      return true;
    }
    await Share.share({ message: url });
    return true;
  } catch {
    return false;
  }
}
