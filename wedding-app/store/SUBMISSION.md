# Getting KA Wedding onto the App Store and Play Store

Wedding: 17–19 January 2027. Work backwards from **mid-December** so guests can
install before they travel. Start the Google Play steps first: they take longest.

## Accounts only you can create

| Account | Cost | Notes |
|---|---|---|
| Expo (expo.dev) | Free | Builds the app in the cloud. This Mac has no Xcode, so builds must go through Expo. |
| Apple Developer Program | US$99 / year | See "Apple account: where things stand" below. |
| Google Play Console | US$25 once | New personal accounts must run a closed test before going public — check the current tester count and duration in the Console when you sign up, and start it immediately. |

## Apple account: where things stand (checked 12 Nov 2026)

- Arjun's Apple ID is an **Admin** on the team **Parth Panchal** (account holder: Parth), the team that holds the Aeros apps and Arcus Training. It is not enrolled in the Developer Program itself.
- An Admin can create the App Store Connect record, upload builds, run TestFlight and submit for review.
- An Admin **cannot** register a new bundle ID: developer.apple.com shows "Access Unavailable" (on an individual account only the account holder gets Certificates, Identifiers & Profiles). The New App form therefore has no `com.kashikaarjun.wedding` to pick yet.

**Done on 12 Nov 2026 (signed in as the account holder):**

- Bundle ID `com.kashikaarjun.wedding` registered on team `5PF8XCS2Q4`, with Push Notifications.
- App Store Connect record **KA Wedding** created: iOS, English (U.K.), SKU `ka-wedding-2027`, Apple ID `6833644922`. Both ids are in `eas.json`.

**No new API key is needed.** The team already has an Admin team key named "EAS Arcus" (made for the Arcus Training builds), and this Mac's Expo login (`arjun.panchal`) is the account that used it. When `eas build` asks about iOS credentials, choose to reuse that App Store Connect API key; Expo then creates the signing certificate, provisioning profile and push key itself, so nobody needs Xcode.

The app will be listed with **Parth Panchal** as the seller.

## Building (from `wedding-app/`)

Set up on 12 Nov 2026: Expo project `@arjun.panchal/ka-wedding`, the two
`EXPO_PUBLIC_…` variables stored on Expo for every environment, and an Android
signing keystore generated and kept by Expo.

Expo uploads from the top of the repository, not from this folder. The file
`.easignore` **at the repository root** is what limits the upload to
`wedding-app/` (about 1.4 MB). Do not delete it: without it, the website's
source and anything else sitting in the repository folder is uploaded too.
To see exactly what a build would send, without sending it:

```bash
npx eas-cli@latest build:inspect --platform android --stage archive --profile preview --output /tmp/ka-upload
```

```bash
npx eas-cli@latest build --platform android --profile preview
```

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

The Android `preview` build is an APK you can install straight from its link.
The iPhone build goes to TestFlight. The signing certificate and provisioning profile were created on 12 Nov 2026
(signed in as the account holder) and are stored on Expo, so iPhone builds now
need no Apple sign-in.

**iPhone push is not set up yet.** Apple refused a new push key: the team
already has the maximum number. Reuse one of the team's existing push keys:
`npx eas-cli@latest credentials` → iOS → production → Push Notifications →
"Upload an existing key", and give it the `.p8` file plus its Key ID. Until
then, notifications will not reach iPhones.

For the Play Store: `--platform android --profile production`, then
`eas submit --platform android` once the Play Console listing exists. Android
push also needs a Firebase project (FCM) connected in EAS credentials.

## What the reviewers will ask for

1. **A way in.** In "App Review notes" give the guest invite code and say the app
   is for guests of one wedding. Without it they cannot get past the first screen.
2. **Privacy policy URL.** `store/privacy-policy.md` is a draft. Host it
   (kashika-arjun.com/privacy is the natural place) and paste the link.
3. **User-generated content rules** (chat + photos). Already built: report,
   block, host moderation, and in-app account deletion (You → Delete my account).
   Mention these in the review notes.
4. **Location "Always" permission** (arrival welcome). Apple wants the purpose
   string (already set) and may ask why. Google needs a background-location
   declaration with a short video. If either store pushes back, the feature can
   be switched off without touching anything else: remove the `expo-location`
   plugin block from `app.json` and the arrival card from the Today screen.
5. **Data safety / privacy labels.** Collected: name, photos, messages, voice
   notes (audio), push token, and — if a guest chooses to add them — ID and
   ticket documents. Declare the documents as **sensitive information**, used
   only for app functionality, not shared with third parties, deletable by the
   user. Not collected: location (stays on device), contacts, payment.
6. **Microphone.** Used only while recording a voice note; the purpose string is set.

## A real risk to know about

Apple sometimes rejects apps made for one private event ("limited audience").
If that happens, the standard route is **Unlisted App Distribution**: the app is
still on the App Store but only reachable by a link you share. Ask for it in the
reply to the rejection. TestFlight (up to 10,000 testers by link) is the fallback.

## Not tested yet (needs a real phone build)

Camera capture, push delivery, arrival welcome, saving/sharing photos, voice
recording and playback, and picking a document from the phone. Everything else
was exercised against the live backend.

## After the wedding

In the app: You → Travel documents → "Delete every guest's documents". That
erases the ID vault. Do it once everyone is home.
