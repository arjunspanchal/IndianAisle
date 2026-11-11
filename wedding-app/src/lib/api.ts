import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const configured = Boolean(url && key);

// Guests have no Supabase Auth account: the anon key only reaches the ka_*
// functions, and each of those checks the guest token we pass along.
export const supabase = createClient(url || 'https://missing.supabase.co', key || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export const PHOTO_BUCKET = 'ka-photos';
export const CHAT_BUCKET = 'ka-chat';

export function photoUrl(path: string, thumb = false): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(thumb ? `t/${path}` : path).data.publicUrl;
}

export function chatMediaUrl(path: string): string {
  return supabase.storage.from(CHAT_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ───────── errors ─────────

export class KaError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const MESSAGES: Record<string, string> = {
  ka_bad_code: "That invite code doesn't match. Check the code on your invitation and try again.",
  ka_bad_name: 'Please enter your name (2 to 40 letters).',
  ka_unauthorized: 'Please join again with your invite code.',
  ka_hosts_only: 'Only Kashika & Arjun can do that.',
  ka_roll_finished: "That's the whole roll for today. Fresh film tomorrow.",
  ka_slow_down: "You're sending messages very quickly. Give it a moment.",
  ka_too_long: 'That message is too long. Try splitting it in two.',
  ka_not_allowed: "You can't remove that one.",
  ka_too_many: "That's the limit for now. Remove some, or try again tomorrow.",
  ka_bad_file: 'Only photos (JPEG or PNG) and PDFs can be added.',
  ka_not_uploaded: "The upload didn't finish. Check your signal and try again.",
  ka_server: 'The wedding server had a hiccup. Please try again.',
  ka_network: "Can't reach the wedding right now. Check your signal and try again.",
};

export function errorMessage(e: unknown): string {
  if (e instanceof KaError) return MESSAGES[e.code] ?? 'Something went wrong. Please try again.';
  return 'Something went wrong. Please try again.';
}

// ───────── session token ─────────

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(t: string | null) {
  token = t;
}
export function hasToken() {
  return token !== null;
}
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function call<T>(fn: string, args: Record<string, unknown> = {}, withToken = true): Promise<T> {
  if (withToken && !token) throw new KaError('ka_unauthorized');
  let res;
  try {
    res = await supabase.rpc(fn, withToken ? { p_token: token, ...args } : args);
  } catch {
    throw new KaError('ka_network');
  }
  if (res.error) {
    const m = /ka_[a-z_]+/.exec(res.error.message ?? '');
    // A Postgres/PostgREST error code means the server answered; none means we never reached it.
    const code = m ? m[0] : res.error.code ? 'ka_server' : 'ka_network';
    if (code === 'ka_unauthorized' && withToken) onUnauthorized?.();
    throw new KaError(code, res.error.message);
  }
  return res.data as T;
}

/**
 * Travel documents go through the ka-docs Edge Function, never straight to the
 * database or storage: it checks who is asking before handing out an upload
 * ticket or a two-minute link.
 */
async function docsCall<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!token) throw new KaError('ka_unauthorized');
  let res;
  try {
    res = await supabase.functions.invoke('ka-docs', { body: { action, token, ...body } });
  } catch {
    throw new KaError('ka_network');
  }
  if (res.error) throw new KaError('ka_network');
  const data = res.data as { error?: string } & T;
  if (data?.error) {
    if (data.error === 'ka_unauthorized') onUnauthorized?.();
    throw new KaError(data.error);
  }
  return data;
}

export const docsApi = {
  list: () => docsCall<{ docs: TravelDoc[] }>('list').then((r) => r.docs),
  reserve: (kind: TravelDoc['kind'], label: string, mime: TravelDoc['mime']) =>
    docsCall<{ id: string; path: string; upload_token: string }>('reserve', { kind, label, mime }),
  confirm: (id: string) => docsCall<{ ok: true }>('confirm', { id }),
  open: (id: string) => docsCall<{ url: string; mime: TravelDoc['mime'] }>('open', { id }),
  remove: (id: string) => docsCall<{ deleted: number }>('delete', { id }),
  removeAllMine: () => docsCall<{ deleted: number }>('delete'),
  purge: () => docsCall<{ deleted: number }>('purge'),
  /** Step 2 of an upload: send the file using the one-off ticket from reserve(). */
  upload: async (path: string, uploadToken: string, body: ArrayBuffer | Uint8Array, mime: string) => {
    const { error } = await supabase.storage.from('ka-docs').uploadToSignedUrl(path, uploadToken, body, { contentType: mime });
    if (error) throw new KaError('ka_not_uploaded');
  },
};

// ───────── types ─────────

export type Guest = { id: string; name: string; role: 'guest' | 'host' | 'vendor'; team?: string | null };

export type WeddingEvent = {
  id: string;
  day: number;
  starts_at: string;
  ends_at: string | null;
  time_label: string;
  title: string;
  note: string;
  location: string;
  /** What to wear, set by the hosts. Empty until they decide. */
  dress: string;
};

export type Update = { id: string; body: string; pinned: boolean; created_at: string; by: string };

export type CameraState = { day: string; limit: number; used: number; reveal_at: string; developing: number };

export type Home = {
  now: string;
  guest: Guest;
  events: WeddingEvent[];
  updates: Update[];
  camera: CameraState;
  quiz: { total: number; answered: number };
};

export type Channel = {
  slug: string;
  name: string;
  blurb: string;
  count: number;
  /** A vendor team's room: only that team and the hosts can see it. */
  private: boolean;
  last: { body: string; by: string; created_at: string } | null;
};

export type Reaction = { emoji: string; count: number; mine: boolean };

export type Message = {
  id: string;
  body: string;
  created_at: string;
  /** 'image' and 'voice' messages carry a file at media_path; body is then an optional caption. */
  kind: 'text' | 'image' | 'voice';
  media_path: string | null;
  media_meta: { width?: number; height?: number; seconds?: number };
  by: string;
  host: boolean;
  mine: boolean;
  /** The message this one replies to, if any. */
  reply: { by: string; body: string } | null;
  reactions: Reaction[];
};

export type Photo = {
  id: string;
  path: string;
  taken_at: string;
  width: number | null;
  height: number | null;
  by: string;
  mine: boolean;
  likes: number;
  liked: boolean;
};

export type AlbumDay = { day: string; reveal_at: string; ready: number; developing: number };

export type Album = { now: string; day: string | null; days: AlbumDay[]; photos: Photo[] };

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  choice: number | null;
  answer: number | null;
};

export type Quiz = {
  questions: QuizQuestion[];
  leaderboard: { name: string; score: number; me: boolean }[];
};

export type SosAlert = { id: string; by: string; role: string; team: string | null; note: string; created_at: string };

export type SosState = {
  contact_name: string | null;
  contact_phone: string | null;
  /** The resort's reception. Null until a host sets it. */
  reception_phone: string | null;
  open: SosAlert[];
};

export type PhotoGoal = { goal: number; prize: string | null; mine: number; reached: number; top: { name: string; count: number; me: boolean }[] };

export type Companion = { first: string; last: string };

export type Rsvp = {
  attending: boolean;
  people: number;
  other_names: string;
  first_name: string;
  last_name: string;
  /** Everyone coming with the person replying, each with a first and last name. */
  companions: Companion[];
  phone: string;
  food: string;
  message: string;
  updated_at?: string;
};

export type RsvpSummary = {
  coming: number;
  headcount: number;
  not_coming: number;
  replies: (Rsvp & { name: string })[];
  no_reply: string[];
};

export type Side = 'kashika' | 'arjun' | 'both';

export type Person = {
  name: string;
  host: boolean;
  side: Side | null;
  about: string;
  city: string;
  avatar_path: string | null;
  me: boolean;
};

/** Sangeet tables or rooms: my own place, and the list I am allowed to see. */
export type Seating = { my_table: string | null; tables: { table_no: string; names: string[] }[] };

export type ReportKind = 'message' | 'photo';

export type Report = {
  kind: ReportKind;
  target_id: string;
  count: number;
  latest: string;
  author: string | null;
  body: string | null;
  /** Reported chat photo or voice note, so a host can look or listen before deciding. */
  media_kind: 'text' | 'image' | 'voice' | null;
  media_path: string | null;
  path: string | null;
};

/** A travel document (ID or ticket) in the private vault. */
export type TravelDoc = {
  id: string;
  kind: 'id' | 'ticket';
  label: string;
  mime: 'image/jpeg' | 'image/png' | 'application/pdf';
  created_at: string;
  by: string;
  mine: boolean;
};

export async function removeChatFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(CHAT_BUCKET).remove(paths).catch(() => {});
}

/** Delete the stored files of photos that have been removed (best-effort). */
export async function removePhotoFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(PHOTO_BUCKET).remove(paths).catch(() => {});
}

export const REACTIONS = ['❤️', '😂', '🎉', '🙏', '👏'];

// ───────── calls ─────────

export const api = {
  join: (code: string, name: string) =>
    call<{ token: string; guest: Guest }>('ka_join', { p_code: code, p_name: name }, false),
  home: () => call<Home>('ka_home'),
  postUpdate: (body: string, pinned: boolean) => call<{ id: string }>('ka_post_update', { p_body: body, p_pinned: pinned }),
  deleteUpdate: (id: string) => call<null>('ka_delete_update', { p_id: id }),
  pinUpdate: (id: string, pinned: boolean) => call<null>('ka_pin_update', { p_id: id, p_pinned: pinned }),
  setDress: (eventId: string, dress: string) => call<null>('ka_event_set_dress', { p_event_id: eventId, p_dress: dress }),
  registerPush: (pushToken: string, platform: string) =>
    call<null>('ka_register_push', { p_push_token: pushToken, p_platform: platform }),

  channels: () => call<Channel[]>('ka_channels_list'),
  messages: (channel: string, before?: string) =>
    call<Message[]>('ka_messages_list', { p_channel: channel, p_before: before ?? null, p_limit: 50 }),
  sendMessage: (channel: string, body: string, replyTo?: string | null) =>
    call<{ id: string; created_at: string }>('ka_send_message', { p_channel: channel, p_body: body, p_reply_to: replyTo ?? null }),
  deleteMessage: (id: string) => call<null>('ka_delete_message', { p_id: id }),
  mediaReserve: (
    channel: string,
    kind: 'image' | 'voice',
    clientId: string,
    ext: string,
    meta: Record<string, number>,
    body: string,
    replyTo?: string | null,
  ) =>
    call<{ message_id: string; path: string; uploaded: boolean }>('ka_media_reserve', {
      p_channel: channel,
      p_kind: kind,
      p_client_id: clientId,
      p_ext: ext,
      p_meta: meta,
      p_body: body,
      p_reply_to: replyTo ?? null,
    }),
  mediaConfirm: (messageId: string) => call<null>('ka_media_confirm', { p_message_id: messageId }),
  toggleReaction: (messageId: string, emoji: string) =>
    call<null>('ka_toggle_reaction', { p_message_id: messageId, p_emoji: emoji }),

  cameraState: () => call<CameraState>('ka_camera_state'),
  reserveShot: (clientId: string, takenAt: string, width: number, height: number) =>
    call<{ photo_id: string; path: string; uploaded: boolean }>('ka_reserve_shot', {
      p_client_id: clientId,
      p_taken_at: takenAt,
      p_width: Math.round(width),
      p_height: Math.round(height),
    }),
  uploadReserve: (clientId: string, width: number, height: number) =>
    call<{ photo_id: string; path: string; uploaded: boolean }>('ka_upload_reserve', {
      p_client_id: clientId,
      p_width: Math.round(width),
      p_height: Math.round(height),
    }),
  confirmShot: (photoId: string) => call<CameraState>('ka_confirm_shot', { p_photo_id: photoId }),
  album: (day?: string | null, offset = 0) => call<Album>('ka_album', { p_day: day ?? null, p_offset: offset }),
  toggleLike: (photoId: string) => call<{ liked: boolean; likes: number }>('ka_toggle_like', { p_photo_id: photoId }),
  deletePhoto: (photoId: string) => call<null>('ka_delete_photo', { p_photo_id: photoId }),
  photoGoal: () => call<PhotoGoal>('ka_photo_goal'),
  developNow: () => call<{ developed: number }>('ka_develop_now'),

  // safety: report, block, moderate, delete account
  report: (kind: ReportKind, targetId: string) => call<null>('ka_report', { p_kind: kind, p_target_id: targetId }),
  blockAuthor: (kind: ReportKind, targetId: string) => call<null>('ka_block_author', { p_kind: kind, p_target_id: targetId }),
  reports: () => call<Report[]>('ka_reports_list'),
  resolveReport: (kind: ReportKind, targetId: string, remove: boolean) =>
    call<null>('ka_report_resolve', { p_kind: kind, p_target_id: targetId, p_remove: remove }),
  deleteMe: () => call<{ paths: string[]; chat_paths: string[] }>('ka_delete_me'),

  seating: (kind: 'sangeet' | 'room') => call<Seating>('ka_seating_get', { p_event: kind }),
  seatingSet: (kind: 'sangeet' | 'room', rows: { table_no: string; name: string }[]) =>
    call<{ saved: number }>('ka_seating_set', { p_rows: rows, p_event: kind }),

  rsvpGet: () => call<Rsvp | null>('ka_rsvp_get'),
  rsvpSet: (r: Rsvp) =>
    call<null>('ka_rsvp_set', {
      p_attending: r.attending,
      p_people: r.people,
      p_other_names: r.other_names,
      p_phone: r.phone,
      p_food: r.food,
      p_message: r.message,
      p_first_name: r.first_name,
      p_last_name: r.last_name,
      p_companions: r.companions,
    }),
  rsvpList: () => call<RsvpSummary>('ka_rsvp_list'),

  people: () => call<Person[]>('ka_people'),
  profileSet: (side: Side | null, about: string, city: string) =>
    call<null>('ka_profile_set', { p_side: side, p_about: about, p_city: city }),
  avatarReserve: () => call<{ path: string }>('ka_avatar_reserve'),
  avatarConfirm: () => call<{ path: string; old_path: string | null }>('ka_avatar_confirm'),

  // SOS: alert the admins
  sosRaise: (note: string) => call<{ id: string }>('ka_sos_raise', { p_note: note }),
  sosState: () => call<SosState>('ka_sos_state'),
  sosResolve: (id: string) => call<null>('ka_sos_resolve', { p_id: id }),
  contactsSet: (receptionPhone: string, plannerName: string, plannerPhone: string) =>
    call<null>('ka_contacts_set', { p_reception_phone: receptionPhone, p_planner_name: plannerName, p_planner_phone: plannerPhone }),

  quiz: () => call<Quiz>('ka_quiz'),
  quizAnswer: (questionId: string, choice: number) =>
    call<{ answer: number; choice: number }>('ka_quiz_answer', { p_question_id: questionId, p_choice: choice }),
  quizSave: (prompt: string, options: string[], answer: number) =>
    call<{ id: string }>('ka_quiz_save', { p_prompt: prompt, p_options: options, p_answer: answer }),
  quizDelete: (questionId: string) => call<null>('ka_quiz_delete', { p_question_id: questionId }),
};
