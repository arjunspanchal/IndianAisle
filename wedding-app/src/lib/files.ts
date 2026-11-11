import { File } from 'expo-file-system';
import { Platform } from 'react-native';

/** A random id made on the phone, so a retried send is recognised as the same one. */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class FileGone extends Error {}

/** The bytes of a local file (camera shot, picked photo, recording, PDF). */
export async function readBytes(uri: string): Promise<ArrayBuffer | Uint8Array> {
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  const f = new File(uri);
  if (!f.exists) throw new FileGone();
  return f.bytes();
}
