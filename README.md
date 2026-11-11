# The Studio — open house photo booth

Guests stand in front of the studio lights, choose a style, a backdrop and half or full body, and press one button.
After a 10-second countdown the camera takes the photo, and the AI (ByteDance **Seedream 5.0 Flash** through
OpenRouter) turns it into a professional studio portrait. It keeps the same people in the same outfits and adds
nobody. Guests scan a QR code to download it on their phone. Photos are deleted soon after download, and always
within 1 hour.

- **10 styles:** Professional shoot, Black and White, Magazine, Kawaii Photo Booth, Warm Natural Light, Film, Old
  Hollywood, Neon Lights, Cinematic, Polaroid.
- **4 backdrops:** grey, green, black and white. Kawaii brings its own pastel backdrop.
- **Half body or full body,** for one person or a small group. About 1–5 people works best.
- **Magazine covers** get a made-up title (ICON, GLAM, LUXE, MUSE, ÉLAN, VERVE) and headlines. **Polaroid**
  photos get a white frame. The app adds both in real fonts, so the spelling is always right.

Design: `docs/superpowers/specs/2026-11-11-studio-booth-design.md` · Build plan:
`docs/superpowers/plans/2026-11-11-studio-booth.md`

## Run it locally (practice mode, no AI key needed)

```bash
npm install
cp .env.example .env.local   # set SESSION_SECRET to 32+ random characters
npm run dev
```

Open http://localhost:3000 and unlock with the `BOOTH_PIN` (2468 in the example).

Without `OPENROUTER_API_KEY`, the booth runs in **practice mode**: the "AI" just tints the photo, and the Magazine
and Polaroid extras are still added. You can rehearse the whole flow for free.

The camera only works on `localhost` or over HTTPS.

## Tests

```bash
npm test          # unit and API tests
npm run test:e2e  # the whole booth in Chrome, with Chrome's fake camera and the fake AI
npm run typecheck
```

## Setting up at the open house

**The iPad** (landscape, facing the guests):
1. In Safari, open `https://<your-app>/` and unlock it with the PIN.
2. Choose **Share → Add to Home Screen**, and launch the booth from there so it runs full screen.
3. Go to **Settings → Display & Brightness → Auto-Lock → Never**.
4. Turn on **Guided Access** (Settings → Accessibility), so guests can't leave the booth.

**The Canon camera:**
- iPadOS 17 or later lets Safari use a USB camera. The Canon must act as a **USB webcam (UVC)**.
- Some recent Canon models do this on their own over USB-C. For others, connect the camera's **HDMI out** through
  an **HDMI-to-USB-C capture adapter** (a few dollars to tens of dollars). Turn off the camera's on-screen display
  so the feed is clean.
- In **Setup**, choose the camera from the list. Setup shows the live view and the resolution it actually
  delivers; 1920 × 1080 or more is good.
- If the Canon doesn't work, choose the iPad's own **Front Camera** in Setup. Another iPhone or iPad can also run
  the whole booth on its own: open the same address on it.

**Setup** (long-press **THE STUDIO** on the booth screen, then enter the PIN):

| Setting | What it does |
|---|---|
| Camera | Which camera the booth uses |
| Camera mounting | How the camera sits on its stand. **Standing normally:** landscape photos, best for groups. **On its side:** portrait photos, best for 1–2 people. The live view always shows the photo's real shape. |
| Mirror the live view | Guests see themselves as in a mirror. The photo itself is never mirrored. |
| Countdown seconds | 10 by default |
| Event name | Appears in the Magazine headlines and on Polaroid frames |
| Styles shown to guests | Turn off any style you don't want |
| Test the AI | One real AI request; shows the exact error if the key or credit is wrong |

**Lights and space:**
- Put soft, even lights in front of the guests, with a plain wall or backdrop behind them. The AI replaces the
  background, but good light on faces makes the biggest difference to how real the result looks.
- For **Full body**, guests step back until the HEAD and FEET guide lines frame them.
- For **Half body**, they step closer until their waists reach the WAIST line.

## Before the event: check faces with the real AI

Practice mode can't show whether the AI keeps faces accurate. With a working key:

1. Put `OPENROUTER_API_KEY=...` in `.env.local`.
2. Put a few helper photos in `probe/photos/`. Include one person and a group, and full body and half body. A file
   name containing `half` marks a half-body photo.
3. Run `npm run probe`. It runs every style and writes one before/after contact sheet per photo to `probe/out/`.
   It costs about $0.02–0.04 per image.
4. Look closely at the faces. Switch off any style that changes them, in **Setup → Styles shown to guests**.

## Deploy to Railway

1. Push this repo to GitHub.
2. In Railway, create **New Project → Deploy from GitHub repo**. `railway.json` sets the start command and the
   health check.
3. Add a **Volume** mounted at `/data`.
4. Under **Variables**:

   | Variable | Value |
   |---|---|
   | `OPENROUTER_API_KEY` | your key from https://openrouter.ai/keys |
   | `BOOTH_PIN` | the PIN helpers will use |
   | `SESSION_SECRET` | 32+ random characters (`openssl rand -base64 48`) |
   | `DATA_DIR` | `/data` |
   | `PUBLIC_URL` | the `https://…up.railway.app` address, used in QR codes |
   | `SEEDREAM_MODEL` | optional, `bytedance-seed/seedream-5-0-flash` by default |
   | `MAX_SHOTS_PER_HOUR` | optional, 150 by default: a cap on AI calls so a crowd can't run up the bill |

5. Under **Settings → Networking**, choose **Generate Domain**.
6. Keep **one replica**: the booth's busy flag and the photos live on one server.

Changing `BOOTH_PIN` locks every iPad until it is unlocked again.

## Privacy

- **The notice:** the booth screen and the download page both say "Your photo is edited by an AI service and
  deleted within 1 hour." Check whether your school needs more, such as consent from a parent for younger guests.
- **What's stored:** only the finished photo, never the original camera frame. Each photo has a random 22-character
  link that only its QR code carries.
- **When it's deleted:**
  - 5 minutes after the photo first reaches a guest's phone;
  - immediately on **Retake**;
  - always within 1 hour.

  A cleanup runs every minute.
- **The AI service:** OpenRouter is asked not to keep the photos (`provider.data_collection: "deny"`).

## Changing the styles

The styles and backdrops live in `src/lib/styles.ts`. Every prompt is built from the same parts, in this order:
1. identity lock: faces exactly as they are;
2. people and clothes: same people, same outfits, nobody added;
3. the studio backdrop;
4. the framing;
5. the style;
6. realism.

The tests in `tests/unit/styles.test.ts` check that every style keeps parts 1, 2 and 6. Run `npm test`, then try a
changed style with `npm run probe` before the event.

## Cost

Seedream 5.0 Flash was listed at about **$0.02–0.04 per photo** at 2K. **Retake** and **Try again** each make a new
photo. **Test the AI** makes one.

## Project layout

```
src/app/page.tsx          the booth: choose → countdown → developing → your photo
src/app/setup/page.tsx    helper setup (PIN)
src/app/p/[token]/        the page guests' phones open from the QR code
src/app/api/              session (PIN), shots, booth image, guest image, test-ai, health
src/components/           camera view, style tiles, countdown, result and other screens
src/lib/styles.ts         styles, backdrops and the prompt builder
src/lib/overlays.ts       Magazine cover text and Polaroid frame (Bodoni Moda, OFL, in public/fonts)
src/lib/shots.ts          photos on disk and the deletion rules
src/lib/seedream.ts       OpenRouter Images API client, with fake mode
probe/run.ts              real-AI check on your own photos
```
