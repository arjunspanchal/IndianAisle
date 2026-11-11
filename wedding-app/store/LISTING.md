# KA Wedding — App Store listing

Everything Apple asks for before "Submit for Review". The listing text lives in
`../store.config.json` and is loaded into App Store Connect with
`eas metadata:push` (run from `wedding-app/`). This file covers the parts that
have to be answered by hand in App Store Connect.

This repository is public. **Never write an invite code in any file here** —
the App Review notes below leave a gap for it; type the code straight into
App Store Connect.

## Where App Store Connect stands (12 November 2026)

Done: listing text, categories, five screenshots, build 8 attached to version
1.0, age rating (comes out as 4+), App Review notes with "Sign-in required"
unticked, App Privacy answers for the six data types below (**published**
12 November 2026), price **Free**
and availability in **all 175 countries or regions**.

The review contact (name, phone, email) is entered and saved too.

Still open: Add for Review / Submit, which the couple press themselves. The weather
credit line and Add to calendar are in the code but not in build 8; they reach
phones with the next instant update or build.

## Screenshots

`store/screenshots/ios-6.3/` — five images, 1206 × 2622. This is the size App
Store Connect asks for in its main iPhone slot (6.1" / 6.3" displays) and it
uses them for every iPhone size. **Uploaded on 12 November 2026**, in this order:

1. `01-today.png` — Everything in one place.
2. `02-programme.png` — Three days, hour by hour.
3. `03-camera.png` — 27 photos a day.
4. `04-chat.png` — Say hello before you arrive.
5. `05-info.png` — Less wondering. More celebrating.

They are captured from the app's own screens with demo chat messages, then
framed by `scripts/frame-screenshots.py`, which writes a larger master set to
`ios-6.9/` (1290 × 2796) and the uploaded set to `ios-6.3/`. The app is iPhone-only, so no iPad
screenshots are needed.

## App Review notes (paste into "App Review Information → Notes")

> KA Wedding is a private app for the invited guests of one wedding (Kashika &
> Arjun, 17–19 January 2027). There are no accounts or passwords: a guest joins
> with an invite code and their name.
>
> To get in: on the first screen enter the invite code **[type the guest code here]**
> and any name, for example "App Review".
>
> User-generated content (guest chat and a shared photo album): every message
> and photo can be reported or its author blocked (hold a message; open a photo
> and use the flag or block button). The couple moderate and can remove
> anything. A guest can delete their account and everything they posted from
> inside the app: tap the initial at the top right of the Today screen, then
> "Delete my account and everything I posted".
>
> Location: asked for only if the guest turns on the optional "arrival welcome"
> on the Today screen. It is used on the device to show a local welcome
> notification near Chandigarh and at the venue. Location is never sent to our
> servers.
>
> Camera, photos and microphone: used for the in-app wedding camera, for adding
> photos to the album or chat, and for recording voice notes in chat.
>
> Travel documents (optional): a guest may add an ID or a ticket so the wedding
> team can arrange check-in and transfers. These are stored privately, are
> visible only to that guest and the couple's team, and can be deleted by the
> guest at any time.

"Sign-in required": **No** (there is no username or password). Contact name,
phone and email for App Review: the couple's own.

## App Privacy ("nutrition label") answers

Does the app collect data? **Yes.** Is any of it used to track people? **No.**
For every type below: purpose **App Functionality** only, **linked to the
user's identity** (it sits beside their name), **not** used for tracking.

| Apple's category | Type | Why |
|---|---|---|
| Contact Info | Name | The name typed when joining; names on an RSVP |
| Contact Info | Phone Number | Only if typed into the RSVP |
| User Content | Photos or Videos | Wedding camera, album uploads, chat photos, optional profile photo |
| User Content | Audio Data | Voice notes in chat |
| User Content | Other User Content | Chat messages, reactions, quiz answers, RSVP notes and food needs, SOS notes, travel documents (ID / tickets) if added |
| Identifiers | Device ID | The notification token, if notifications are turned on |

Not collected: Location (the arrival welcome runs on the phone and nothing is
sent), Contacts, Health, Financial Info, Browsing or Search History, Purchases,
Usage Data, Diagnostics.

## Age rating

Answered in App Store Connect on 12 November 2026 (the upload tool cannot send
it: Apple added a "social media" question it does not know). Everything "None"
or "No", except **Messaging and chat: Yes** and **User-generated content: Yes**;
**Social media: No**. Apple's result: **4+** (with its usual regional variants).

## Other questions App Store Connect asks

- **Export compliance / encryption:** already answered in the app
  (`ITSAppUsesNonExemptEncryption: false`), so no question appears per build.
- **Content rights:** answered **Yes, the app has the necessary rights to its third-party
  content** (12 November 2026). The third-party content is the weather, from Open-Meteo
  (free with credit, CC BY 4.0); the credit line is on the Good to know screen.
- **Advertising identifier (IDFA):** not used.
- **Price:** Free. **Availability:** every country or region (set 12 November 2026).
- **Release:** automatic after approval (current setting).

## If Apple says the audience is too small

Apple sometimes rejects apps made for one private event. Reply asking for
**Unlisted App Distribution** (the app stays on the App Store but is reachable
only by the link you share). TestFlight by public link is the fallback.

## Before pressing Submit

- The privacy page is live at https://kashika-arjun.com/privacy (published 12 November 2026
  from `store/privacy.html`; the copy on the site is `site/privacy/index.html` in the website repository).
- iPhone notifications still need a push key uploaded to Expo (see
  `SUBMISSION.md`). Without it, "live updates" arrive in the app but do not
  buzz the phone.
