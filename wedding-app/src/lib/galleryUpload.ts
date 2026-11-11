// Adding photos from the phone's own gallery to the shared album.
// Unlike camera shots these don't use the roll and appear straight away.

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { api, KaError, PHOTO_BUCKET, supabase } from './api';
import { readBytes, uuid } from './files';

const LONG_EDGE = 1600;
const THUMB_EDGE = 420;
export const MAX_AT_ONCE = 20;

async function put(path: string, uri: string) {
  const body = await readBytes(uri);
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error && !/exist|duplicate/i.test(error.message)) throw new KaError('ka_network');
}

/** Let the guest choose photos. Returns [] if they back out. */
export async function pickFromPhone(): Promise<ImagePicker.ImagePickerAsset[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_AT_ONCE,
    quality: 0.9,
  });
  return res.canceled ? [] : (res.assets ?? []);
}

/**
 * Upload the chosen photos one by one. Returns how many made it; stops at the
 * first failure so the guest can try the rest again with better signal.
 */
export async function addToAlbum(
  assets: ImagePicker.ImagePickerAsset[],
  onProgress: (done: number, total: number) => void,
): Promise<{ added: number; error: unknown | null }> {
  let added = 0;
  for (const a of assets) {
    try {
      const landscape = a.width >= a.height;
      const full = await manipulateAsync(
        a.uri,
        [{ resize: landscape ? { width: Math.min(LONG_EDGE, a.width) } : { height: Math.min(LONG_EDGE, a.height) } }],
        { compress: 0.74, format: SaveFormat.JPEG },
      );
      const thumb = await manipulateAsync(full.uri, [{ resize: landscape ? { height: THUMB_EDGE } : { width: THUMB_EDGE } }], {
        compress: 0.6,
        format: SaveFormat.JPEG,
      });
      const r = await api.uploadReserve(uuid(), full.width, full.height);
      if (!r.uploaded) {
        await put(`t/${r.path}`, thumb.uri);
        await put(r.path, full.uri);
        await api.confirmShot(r.photo_id);
      }
      added += 1;
      onProgress(added, assets.length);
    } catch (e) {
      return { added, error: e };
    }
  }
  return { added, error: null };
}
