# Studio Booth — Design

**Date:** 2026-11-11
**Status:** Agreed in conversation with the teacher; the guest screens were approved from mockups.

## 1. What it is and why

A professional-looking photo booth for the school's **open house**. Student helpers set up studio lights and a
Canon camera connected to an iPad. Guests walk up and choose a style, a backdrop colour, and half or full body.
They press one button, a 10-second timer runs, and the camera takes the photo. The AI turns it into a photo that
looks like a professional studio shoot. Guests scan a QR code with their own phone to download it. Photos are
deleted soon after download, and always within an hour.

The magic the teacher wants is that guests "stand behind some lights" and come away with a photo that looks like
a real studio session. **They are the same people, in their own clothes, with nobody added.**

**Success:** a stream of guests can use it without help. Each group gets a believable studio portrait in under a
minute, downloads it on their phone, and nothing about them is kept afterwards.

## 2. Goals, non-goals, anti-goals

**Goals**
- A slick, professional guest screen on an iPad in the "Noir studio" look (approved mockup, §4).
- 10 styles × 4 backdrops × half/full body, for one person or a small group.
- Faces, outfits, poses and the number of people stay exactly as photographed.
- QR download to the guest's phone; automatic deletion.
- Works with a Canon on USB-C; falls back to the iPad's own cameras.

**Non-goals**
- Printing, AirDrop, email, galleries, before/after GIFs, video clips (funbooth has these; this booth does not).
- Guest accounts, codes or per-person allowances.
- Changing outfits, adding props or placing people somewhere other than a studio.
- Replacing the class photo editor (`Photo Editor/`). It stays live and untouched; this is a separate app.

**Anti-goals: it fails, even if it works, if…**
- Someone's face comes out looking like a different person, or slimmed or "beautified".
- Anyone is added or removed, or outfits change.
- A guest's photo is still on the server after an hour, or is visible to anyone without its QR link.
- It looks like a cheap filter app.

## 3. The people and the setting

- **Guests** of all ages, often in groups of 1–5. They only touch the iPad's booth screen.
- **Student helpers** set up the camera, lights and iPad. They unlock setup with a PIN.
- One iPad in landscape, facing the guests (in Guided Access). A Canon on a stand is connected to the iPad by
  USB-C. If the Canon is not recognised, helpers switch to the iPad's own camera. Another iPhone or iPad can run
  the whole booth instead: the page is responsive.
- The iPad needs internet. Guests' phones download over their own mobile data or school Wi-Fi.

## 4. Guest flow (approved mockups, Noir studio look)

**Look:** near-black (#0e0e10), warm off-white text (#f3efe7), gold accent (#c8a96a), thin hairlines, small
square corners. A Didot-style serif for headings (Bodoni Moda, bundled; iPad's own Didot is acceptable) and
the system sans for everything else. Smooth, unhurried transitions. The brand line reads **THE STUDIO**.

1. **Choose** (the home screen).
   - Left: the live camera, mirrored like a mirror, with guide lines.
     - Full body: HEAD and FEET lines, with "Step back: head to toe".
     - Half body: HEAD and WAIST lines, with "Step closer: waist up".

     *(Builder's call, after review. The approved mockup only showed the full-body guides.)*
   - At the bottom of the panel, one small line: "Your photo is edited by an AI service and deleted within
     1 hour."
   - Right panel, top to bottom: "Choose your look".
   - Then the **style grid**: 10 tiles with a sample image each, scrollable, with the selected tile outlined in gold.
   - Then the **backdrop**: 4 swatches.
   - Then the **framing**: Half body | Full body.
   - At the bottom, a big gold **TAKE MY PHOTO** button, labelled "10-second timer".
2. **Countdown.**
   - The live camera goes full screen, with a gold ring counting down from 10 in large serif numerals.
   - Captions: "Hold your pose · Look into the camera".
   - A top bar shows their choices.
   - At 0: a white flash and a shutter sound, and the frame is captured.
3. **Developing.**
   - Their captured photo, dimmed and blurred, with a gold shimmer.
   - "Developing your portrait", plus a progress bar that eases towards 90% over ~40 s.
   - The style name.
4. **Your photo.** The finished image on the left. On the right: "Your portrait is ready", the QR code, and this
   note: "Scan with your phone camera to download. Your photo is deleted soon after you download it, and always
   within 1 hour." Two buttons:
   - **Retake:** back to the countdown with the same choices. The previous photo is deleted.
   - **Done:** back to Choose.
   - After 2 minutes without a touch, the screen returns to Choose on its own. The photo stays downloadable
     until it expires.
5. **Error.** "That one didn't develop", a one-line reason for helpers in small text, and Try again / Start over.
   No edit is lost or charged twice: a failed attempt has nothing to delete.

## 5. Styles, backdrops, framing

**Backdrops:**
- Grey (#8a8d90)
- Green, the teacher's "light darkish green": a muted sage, #4f5e4c
- Black
- White

Each is a seamless studio paper backdrop with a soft floor sweep, lit naturally.

**Styles.** The descriptions are the intent; the builder writes the prompts:

| Style | Look | Backdrop handling |
|---|---|---|
| Professional shoot | Clean, flattering studio light (large softbox key, fill, subtle rim), sharp, natural colour | chosen backdrop |
| Black and White | Dramatic high-contrast monochrome, hard side key, rim light, deep blacks | chosen backdrop rendered in greyscale |
| Magazine | Glossy fashion-cover lighting and colour; leave clear space above the heads for the title | chosen backdrop; the app adds the cover text (§6) |
| Kawaii Photo Booth | Bright, soft, pastel; sparkles and cute stickers (hearts, stars, bows, clouds) around the edges, never over faces; no characters, animals or anything person-like | own pastel backdrop (pink→lilac); the swatches are hidden for this style |
| Warm Natural Light | Soft warm window-like light from one side, gentle shadows | chosen backdrop |
| Film | 35 mm colour film: soft contrast, film colour, fine grain | chosen backdrop |
| Old Hollywood | 1940s glamour black and white, butterfly light from above, glossy highlights | chosen backdrop in greyscale |
| Neon Lights | Pink and blue coloured gel lights from either side; the backdrop picks up the colours | chosen backdrop, tinted by the gels |
| Cinematic | Moody low-key, single light, deep shadows, film-still colour grade | chosen backdrop |
| Polaroid | Instant-film colour, slightly faded; the app adds a white Polaroid frame (§6) | chosen backdrop |

**Framing.** The guests' distance from the camera sets the framing, not a crop or a zoom.
- **Half body:** waist up, close framing, faces large. Guests step closer, guided by the live view.
- **Full body:** head to toe, feet on the studio floor with soft contact shadows.

Neither the app nor the AI crops or zooms: the AI keeps the framing of the photo it is given. Asking the AI to
zoom in would rebuild faces from too few pixels, and that is exactly the identity risk to avoid. If the photo
doesn't show full bodies, the AI never invents legs or shoes (funbooth's finding).

**Groups:** any number of people works. About 1–5 is ideal, because faces get small beyond that. The frame
shape is a Setup choice (changed 2026-11-12: it used to follow the camera's own picture, so a Mac picking an upright
iPhone through Continuity Camera gave portrait photos unasked):
- **Landscape**, the default: a 3:2 photo, best for groups;
- **Portrait:** a 2:3 photo, best for 1–2 people.
The booth cuts the largest centred area of that shape from whatever the camera sends, and Setup warns when the
camera's picture is the other way round, because the photo is then a narrow strip from its middle.

## 6. What every AI request must say

Every prompt contains, in this order:
1. **Identity lock.** These are real guests. Keep every person instantly recognisable, with the same facial
   structure, eyes, nose, mouth, skin tone, natural skin texture and details (moles, freckles, glasses), hair and
   hairstyle, age and expression. Keep body shape and proportions. Do not beautify, slim, smooth, de-age or swap
   any face.
2. **People and clothes.** Keep exactly the people who are posing: the same number of people, in the same
   positions and poses, wearing exactly the same outfits (colours, patterns, fit, accessories). Do not add or
   remove anyone. Add no extra people, no reflections of people, and nothing person-like.
3. **Studio.** Replace everything behind them (the room, light stands, equipment, onlookers) with the chosen
   seamless backdrop and a studio floor. Light the people to match it.
4. **Framing,** as in §5.
5. **Style,** as in §5.
6. **Realism.**
   - Make it look genuinely photographed in a professional studio with a full-frame camera.
   - Polished but believable, not over-edited.
   - No text, logos or watermarks. Magazine and Polaroid text is added by the app, never by the AI.

**Added by the app after the AI** (crisp fonts, always spelled right):
- **Magazine:** a made-up masthead, picked at random from ICON, GLAM, LUXE, MUSE, ÉLAN and VERVE, large across
  the top in the Didot-style serif. Two or three headlines are placed so they avoid the centre, for example:
  - "Open House" with "The Rising Stars Issue"
  - "Exclusive" with "Behind the lens"
  - the month and year with "Special edition"

  The event name (from setup) replaces "Open House" when it is set. No real magazine names.
- **Polaroid:** a white instant-photo border, thicker at the bottom, with the event name and date in small type.

## 7. Delivery and deletion

- The QR code holds a link to a private page: `<public url>/p/<token>`. The token is random and unguessable,
  128 bits. That page is the only way to the photo from outside the booth.
- The guest page uses the Noir look and is designed for phones. It shows the photo, a **Save photo** button and
  the same one-line AI notice as the Choose screen.
  - The button opens the share sheet (Save Image) where the phone supports it, and downloads the file otherwise.
  - The page also says "or press and hold the photo".
- **Deletion:**
  - **After a download:** as soon as the photo first reaches a guest's phone (the page loads the image), it is
    deleted **5 minutes later**. The gap allows a retry or a second phone.
  - **Otherwise:** every photo is deleted **1 hour** after it was taken.
  - **Retake:** deletes the previous photo straight away.
  - After deletion, the link shows "This photo has been deleted".
- **Only the finished photo is ever stored,** never the original camera frame. The booth iPad keeps nothing after
  the result screen.
- OpenRouter is asked not to keep the photos (`provider.data_collection: "deny"`, as in Photo Editor).

## 8. Camera and setup (student helpers)

- A **PIN** (`BOOTH_PIN`) unlocks the booth on a device. It is checked on the server and remembered on that
  device for 12 hours with a signed cookie. All booth API calls require it, so nobody else can spend AI credit.
  The download pages don't need it.
- Students reach **Setup** by long-pressing the THE STUDIO brand line, then entering the PIN. Setup has:
  - **Camera:** a list of every camera the browser sees, such as "Canon EOS …", "Front Camera" and "Back Camera",
    with a live preview.
  - **Photo shape:** landscape (default) or portrait (§5).
  - **Camera mounting:** upright or on its side, as rotation 0 / 90 / 180 / 270°, for a camera that doesn't turn its
    own picture (a Canon on its side). Phones and iPads stay upright.
  - **Mirror the live view** (on by default). The captured photo is never mirrored.
  - **Countdown seconds** (default 10).
  - **Event name**, used in the Magazine headlines and on the Polaroid border.
  - **Styles shown to guests** (all on by default).
  - **Test the AI:** one real request with a test image, showing the exact error if it fails.
  - Setup choices are stored on the iPad (they belong to that device).
- **Canon cameras:** iPadOS 17+ lets Safari use a USB camera. The Canon must act as a USB webcam (UVC). Some
  recent Canon models do this themselves; others need an HDMI-to-USB-C capture adapter.
  - The app asks for the highest resolution the camera offers, up to 4K.
  - The capture is taken from the video stream at full resolution.
  - The README explains all of this, and Setup shows the actual resolution.

## 9. How it's built (builder's calls, stated for review)

- **A new app in its own repo** (`Studio Booth/`), not a fork of funbooth. It uses the same stack as Photo
  Editor, so the teacher deploys it the same way: Next.js 15 (App Router), TypeScript, Tailwind CSS 4, `sharp`
  and `iron-session`, plus Vitest and Playwright, on Node 22. It reuses Photo Editor's OpenRouter Images API
  client (`aspect_ratio: "auto"`, typed errors, fake mode).
- **No database.**
  - Each photo is stored as two files on a Railway volume (`DATA_DIR/shots`): `<token>.jpg`, plus `<token>.json`
    holding the style, created time and first download time. One random token per photo names the files, the
    guest link and the booth's own requests, which also need the PIN.
  - A cleanup timer runs every minute and also once at start-up.
  - The service runs as a single replica.
- **API (all booth calls need the PIN cookie):**
  - `POST /api/session`: PIN → cookie.
  - `POST /api/shots`: the captured JPEG plus style, backdrop, framing and event name, all checked. It prepares
    the image (upright, ≤ 2048 px), builds the prompt, calls the model, adds any overlay, stores the result and
    returns `{ token, imageUrl, downloadUrl, qrSvg }`.
  - `GET /api/shots/:token/image`: the result, for the booth screen only.
  - `DELETE /api/shots/:token`: used by Retake.
  - `GET /p/:token`: the guest page. `GET /api/p/:token/image` serves the photo and records the first download.
- **The QR code** is drawn on the server as SVG, from `PUBLIC_URL` (falling back to the request's own address).
- **Limits:**
  - One photo in progress per booth.
  - A spending guard, `MAX_SHOTS_PER_HOUR` (default 150), returns a friendly "the booth is taking a breather"
    message.
  - Uploads up to 15 MB.
  - A 120 s timeout on the AI call.
- **Fake mode** (`SEEDREAM_FAKE=1`, or no key) tints the photo instead of calling the AI, and still applies the
  overlays. It is for development, rehearsals and browser tests.
- **Fonts:** Bodoni Moda (OFL), bundled from `@expo-google-fonts/bodoni-moda`, is used both by the screens and
  by the server-side overlays (`sharp` text with `fontfile`).

## 10. Testing

- **Unit:**
  - Every style's prompt contains the identity lock, the people-and-clothes rule, the studio rule and the right
    framing.
  - Kawaii ignores the backdrop.
  - Overlays keep the image size, and Polaroid adds its border.
  - Tokens are random and long.
  - The expiry rules work: 1 hour, 5 minutes after download, and immediately on Retake.
- **API:**
  - The PIN is required.
  - A shot is stored and served to the booth and to the token page.
  - The first download sets the deletion time, and cleanup removes the files.
  - Bad input is refused.
- **Browser (Playwright, Chrome's fake camera, fake AI), the whole flow:** PIN → choose style, backdrop and
  framing → countdown (set to 1 s) → developing → result with QR → open the guest page → save → retake deletes
  the old photo.
- **Real-model probe** (`npm run probe`, needs a working key; not part of the test suite). It runs every style on
  photos placed in `probe/photos/` (one person, a group, half and full body). It writes before/after contact
  sheets so faces can be checked by eye before the event. Any style that changes faces is switched off in Setup.
  Pasting the original faces back onto the result is out of scope for this version.

## 11. Deployment

Same pattern as Photo Editor:
- A Railway service built from this repo.
- A volume at `/data`.
- Variables: `OPENROUTER_API_KEY`, `BOOTH_PIN`, `SESSION_SECRET`, `PUBLIC_URL`, `SEEDREAM_MODEL` (optional) and
  `MAX_SHOTS_PER_HOUR` (optional).
- A health check at `/api/health`.

The README covers iPad setup (Guided Access, Auto-Lock Never, Add to Home Screen) and the Canon setup.

## 12. Open items for the teacher

1. **A working OpenRouter key, well before the open house** (date still to be confirmed), so the probe can be run
   and prompts tuned on real faces. The key in Photo Editor's `.env.local` was rejected on 2026-10-23 ("User not
   found"). The app runs in fake mode until one is set.
2. **Notice or consent.** Guests' photos, children's included, go to OpenRouter and ByteDance. This version shows
   a one-line notice on the Choose screen and the download page. Whether the school wants more (a consent tap, or
   a helper-run step for minors) is school policy, and still to be confirmed.
3. **The Canon model,** to confirm it works as a USB webcam or needs a capture adapter.
4. **The event name** for headlines and Polaroid borders, which can be set in Setup.
5. **Where the GitHub repo and Railway project live** (the class editor is under `ctss-joetay`).
6. **Sample photos for the style tiles.** The build ships illustrated placeholders. Real samples can be generated
   later from a helper's photo once the key works.
