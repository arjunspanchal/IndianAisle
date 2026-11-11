# KA Wedding — the guest app for Kashika & Arjun's wedding

An Expo (React Native) app for iPhone and Android. Backend is Supabase (the
IndianAisle project), using only objects prefixed `ka_`.

## What's in it

| Area | What it does |
|---|---|
| Join | Invite code + name. The code decides the role: guest, host (admin) or vendor team. |
| Today | Countdown / happening now, the couple's live updates, SOS button. |
| Programme | Three days, day tabs, what to wear per event (hosts edit in the app). |
| Camera | Disposable camera: 27 shots a day, no preview, works offline, develops 9:00 am IST next morning. |
| Album | Everyone's developed photos. Swipe through, like, save, share, hold to multi-select. |
| Chat | Guest rooms + private vendor rooms (Decor, F&B). Text, photos and voice notes. Swipe to reply, hold to react / report / block. |
| RSVP | The website's RSVP questions, answered in the app. Hosts see every reply, the headcount and who hasn't replied. |
| People | "Get to know everyone": an optional photo, side, city and one line about how you know the couple. Lives in the Chat tab. |
| Table & room | Hosts paste the Sangeet table list and the room list; each guest sees their own table (plus the chart) and their own room only. |
| Good to know | Arrival, typical weather, the January fog note, how to get there, FAQs and the packing list, all from kashika-arjun.com. |
| Photo goal | Add 50 photos to earn a badge; a leaderboard shows who has added most. Photos can also be added from the phone's gallery. |
| Call buttons | Call reception / call the planner, once a host has entered the numbers (You → Phone numbers). |
| Travel documents | Guests add their ID and tickets to a private vault. Only they and the hosts can open them, via links that expire in two minutes. |
| Quiz | "How well do you know us?" Hosts write questions in the app. |
| Notifications | Push for every host update, photos-ready each morning, SOS to hosts, vendor-room messages. |
| Arrival welcome | Opt-in. A notification at Chandigarh and within 2 km of the resort. Location never leaves the phone. |

## Roles

- **guest** — guest chat rooms, camera, album, quiz, programme, updates, their own travel documents.
- **vendor** — only their own team's room, plus programme and updates. Never guest chat, camera, album or quiz.
- **host** — everything: post updates, see all rooms, moderate, handle SOS, set dress codes, develop photos early, open and erase guests' travel documents.

Invite codes live in the `ka_config` table (`guest_code`, `host_code`,
`vendor_code_decor`, `vendor_code_fnb`). Change a code by updating its row.
Give the wedding planner the host code so SOS alerts reach them.

## Run it

```bash
npm install
npx expo start
```

Scan the QR with Expo Go to try it on a phone. Expo Go cannot do push
notifications or the arrival welcome; those need a real build (below).
`.env.local` holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
(see `.env.example`).

Checks: `npm run typecheck` and `npx expo-doctor`.

## Instant updates

The app includes Expo's over-the-air updates. Changes to screens and logic (anything that isn't a new native module or a permission) can be sent to installed apps without a new store build:

```bash
npx eas-cli@latest update --channel production --environment production --message "what changed"
```

Phones pick it up the next time the app is opened, and apply it on the launch after that. Use `--channel preview` for the Android test APK.

## Database

`supabase/001…014` are the migrations, in order, already applied; `supabase/functions/ka-docs` is the Edge Function that guards the travel-documents vault (deployed). Guests have
no Supabase Auth account: every table has RLS on with no policies, and all
access goes through `ka_*` functions that take the guest's token.

## Shipping to the stores

See `store/SUBMISSION.md`.
