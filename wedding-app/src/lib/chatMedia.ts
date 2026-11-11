// Sending a photo or a voice note in chat: reserve the message, upload the
// file to the reserved path, confirm. The message appears for everyone only
// once the file is really there.

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { api, CHAT_BUCKET, KaError, supabase } from './api';
import { readBytes, uuid } from './files';

const IMAGE_EDGE = 1280;
export const MAX_VOICE_SECONDS = 120;

async function upload(path: string, uri: string, contentType: string) {
  const body = await readBytes(uri);
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, body, { contentType, cacheControl: '31536000' });
  if (error && !/exist|duplicate/i.test(error.message)) throw new KaError('ka_network');
}

export async function sendImage(
  channel: string,
  picked: { uri: string; width: number; height: number },
  caption: string,
  replyTo?: string | null,
) {
  const landscape = picked.width >= picked.height;
  const img = await manipulateAsync(
    picked.uri,
    [{ resize: landscape ? { width: Math.min(IMAGE_EDGE, picked.width) } : { height: Math.min(IMAGE_EDGE, picked.height) } }],
    { compress: 0.72, format: SaveFormat.JPEG },
  );
  const r = await api.mediaReserve(channel, 'image', uuid(), 'jpg', { width: img.width, height: img.height }, caption, replyTo);
  if (!r.uploaded) {
    await upload(r.path, img.uri, 'image/jpeg');
    await api.mediaConfirm(r.message_id);
  }
}

export async function sendVoice(channel: string, uri: string, seconds: number, replyTo?: string | null) {
  // Phones record AAC in an .m4a file; browsers record WebM.
  const web = Platform.OS === 'web';
  const r = await api.mediaReserve(channel, 'voice', uuid(), web ? 'webm' : 'm4a', { seconds: Math.max(1, Math.round(seconds)) }, '', replyTo);
  if (!r.uploaded) {
    await upload(r.path, uri, web ? 'audio/webm' : 'audio/mp4');
    await api.mediaConfirm(r.message_id);
  }
}
