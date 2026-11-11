# Studio Booth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** an iPad photo booth web app. Guests choose a style, backdrop and framing, a 10-second countdown runs, a
Canon or the iPad camera takes the photo, and Seedream turns it into a studio portrait. Guests download it by QR
code, and it is deleted within an hour.

**Architecture:** one Next.js 15 service with no database. The iPad runs a client-side state machine
(choose → countdown → developing → result). The server checks the booth PIN, builds the prompt, calls
OpenRouter's Images API, adds Magazine and Polaroid overlays with `sharp`, and stores each result as
`<token>.jpg` + `<token>.json` in `DATA_DIR/shots`. A one-minute timer deletes expired photos.

**Tech Stack:**
- Node 22, Next.js ^15.5 (App Router), React 19, TypeScript (strict), Tailwind CSS 4
- `sharp` ^0.35, `iron-session` ^9, `qrcode` ^1.5
- `@expo-google-fonts/bodoni-moda` (TTF source, OFL)
- Vitest 5, Playwright 1.64

**Spec:** `docs/superpowers/specs/2026-11-11-studio-booth-design.md`

## Global Constraints

- Repo: `/Users/joetay/Developer/Studio Booth`, branch `master`. The class editor in `/Users/joetay/Developer/Photo Editor` is read-only reference; never modify it.
- The Noir tokens:
  - background `#0e0e10`, text `#f3efe7`, muted `#9a958c`, lines `#2a2a2e`, gold `#c8a96a`
  - headings in Bodoni Moda (fallback `Didot, "Bodoni 72", Georgia, serif`), everything else in the system sans
  - corners 3 px
  - brand line "THE STUDIO"
- Backdrops: grey `#8a8d90`, green `#4f5e4c` (muted sage), black `#0b0b0b`, white `#f7f7f5`.
- Style names, in this order: Professional shoot, Black and White, Magazine, Kawaii Photo Booth, Warm Natural Light, Film, Old Hollywood, Neon Lights, Cinematic, Polaroid.
- Magazine mastheads: ICON, GLAM, LUXE, MUSE, ÉLAN, VERVE. No real magazine names anywhere.
- Retention:
  - every photo is deleted 1 hour after it is taken;
  - the first image request from the guest page schedules deletion 5 minutes later;
  - Retake deletes the previous photo immediately;
  - the original camera frame is never written to disk.
- OpenRouter request:
  - `aspect_ratio: "auto"`, `resolution: "2K"`, `provider.data_collection: "deny"`
  - model `bytedance-seed/seedream-5-0-flash` unless `SEEDREAM_MODEL` is set
  - 120 s timeout
- Limits:
  - uploads ≤ 15 MB;
  - the photo sent to the model is ≤ 2048 px on its longest side;
  - one shot in progress at a time;
  - `MAX_SHOTS_PER_HOUR` (default 150) AI calls per rolling hour;
  - the event name is at most 40 characters.
- Fake mode when `SEEDREAM_FAKE=1` or `OPENROUTER_API_KEY` is empty. Fake mode tints the photo, and overlays still apply.
- Copy:
  - notice: "Your photo is edited by an AI service and deleted within 1 hour."
  - deleted page: "This photo has been deleted"
  - button: "TAKE MY PHOTO", sub-label "10-second timer"
- Shot keys: one random token per shot, `randomBytes(16).toString("base64url")` (22 chars, `^[A-Za-z0-9_-]{22}$`). It names the files and the guest link. The booth endpoints use the same token, behind the PIN.

## Review Focus

1. **Camera permission denied, or the Canon unplugged:** the live view shows "Camera unavailable — tap to retry" and TAKE MY PHOTO is disabled. Pinned by `e2e/booth.spec.ts › camera failure`.
2. **Double tap on TAKE MY PHOTO, or two iPads on one server:** only one AI call runs; the second request gets 409 "Still developing the last photo.". Pinned by `tests/api/shots.test.ts › second shot while one is developing`.
3. **A guest opens the QR link after expiry or after Retake:** a calm "This photo has been deleted" page, not an error. Pinned by `tests/api/download.test.ts › expired token` and the Retake step in `e2e/booth.spec.ts`.
4. **An event name with `&`, `<`, an emoji, or 200 characters:** the overlay still renders, the text is escaped, and it is cut to 40 characters. Pinned by `tests/unit/overlays.test.ts › awkward event names`.
5. **AI failure (timeout, refusal, bad key):** an error screen with Try again; nothing stored; the in-progress guard released. Pinned by `tests/api/shots.test.ts › AI failure`.

---

### Task 1: Project skeleton, config and health check

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.mts`, `.nvmrc` (`22`), `.gitignore`, `.env.example`, `railway.json`, `next-env.d.ts` (gitignored)
- Create: `src/lib/config.ts`, `src/lib/errors.ts`, `src/lib/http.ts`, `src/app/api/health/route.ts`, `src/app/layout.tsx`, `src/app/globals.css`
- Create: `public/fonts/BodoniModa_400Regular.ttf`, `public/fonts/BodoniModa_600SemiBold.ttf`, `public/fonts/OFL.txt` (copied from `node_modules/@expo-google-fonts/bodoni-moda`)
- Create: `tests/setup-env.ts`, `tests/unit/config.test.ts`

**Interfaces:**
- Produces:
  - `config.{openrouterApiKey, seedreamFake, boothPin, sessionSecret, seedreamModel, dataDir, shotsDir, publicUrl, maxShotsPerHour, secureCookies}`, all getters as in Photo Editor's `config.ts`;
  - `AppError(status, message)`;
  - `handle(fn)`, `readJson(req)` and `clientIp(req)`, copied from Photo Editor's `http.ts`;
  - `FONT_REGULAR` and `FONT_SEMIBOLD`, absolute paths to the TTFs, exported from `config.ts`.

- [ ] **Step 1: Scaffold.** Copy the dependency and devDependency versions from Photo Editor's `package.json`, add `qrcode`, `@types/qrcode` and `@expo-google-fonts/bodoni-moda` (devDependency), then run `npm install`. Scripts: `dev`, `build`, `start`, `typecheck`, `test` (`vitest run`), `test:e2e` (`rm -rf .e2e-data && playwright test`), `probe` (`tsx probe/run.ts`). `next.config.ts`, `postcss.config.mjs`, `railway.json` (healthcheck `/api/health`) and `tsconfig.json` match Photo Editor's. Vitest has no global setup; `setupFiles: ["tests/setup-env.ts"]` sets `BOOTH_PIN=2468`, a 40-character `SESSION_SECRET`, `SEEDREAM_FAKE=1`, and `DATA_DIR` set to a fresh `mkdtemp`. Copy the two TTFs and `OFL.txt` into `public/fonts/`.

- [ ] **Step 2: Write the failing test** `tests/unit/config.test.ts`

```ts
it("is in fake mode without a key or with SEEDREAM_FAKE=1", () => {
  process.env.SEEDREAM_FAKE = ""; process.env.OPENROUTER_API_KEY = "";
  expect(config.seedreamFake).toBe(true);
  process.env.OPENROUTER_API_KEY = "sk-or-x";
  expect(config.seedreamFake).toBe(false);
});
it("needs BOOTH_PIN and a 32+ character SESSION_SECRET", () => {
  delete process.env.BOOTH_PIN; expect(() => config.boothPin).toThrow("BOOTH_PIN");
  process.env.SESSION_SECRET = "short"; expect(() => config.sessionSecret).toThrow("32");
});
it("defaults: model, 150 shots an hour, shots under DATA_DIR", () => {
  expect(config.seedreamModel).toBe("bytedance-seed/seedream-5-0-flash");
  expect(config.maxShotsPerHour).toBe(150);
  expect(config.shotsDir).toBe(path.join(process.env.DATA_DIR!, "shots"));
});
it("bundles the Bodoni Moda fonts", () => { expect(existsSync(FONT_REGULAR)).toBe(true); expect(existsSync(FONT_SEMIBOLD)).toBe(true); });
```
Restore `process.env` in `afterEach`.

- [ ] **Step 3: Run** `npx vitest run tests/unit/config.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 4: Implement** `config.ts`, `errors.ts` and `http.ts`. Implement `GET /api/health`: it creates `shotsDir` if missing and returns `{ ok, storage }`, with status 503 when storage is not writable. Implement `layout.tsx`: `<html lang="en">`, `viewport` with `viewportFit: "cover"` and `themeColor: "#0e0e10"`, title "The Studio". In `globals.css`: `@import "tailwindcss"`, `@font-face` for both TTFs, and a `@theme` block with the Noir tokens as `--color-noir`, `--color-ivory`, `--color-muted`, `--color-line`, `--color-gold` and `--font-display`. The body is `bg-noir text-ivory`, `overscroll-behavior: none` and `user-select: none`.
- [ ] **Step 5: Run** `npx vitest run` and `npm run typecheck`. Expected: PASS, no type errors.
- [ ] **Step 6: Commit** `feat: project skeleton, config, health check and Noir theme`.

### Task 2: Styles, backdrops and prompts

**Files:** Create `src/lib/styles.ts`; Test `tests/unit/styles.test.ts`

**Interfaces:**
- Produces:
  - `type StyleId = "professional"|"bw"|"magazine"|"kawaii"|"warm"|"film"|"hollywood"|"neon"|"cinematic"|"polaroid"`
  - `type BackdropId = "grey"|"green"|"black"|"white"`
  - `type Framing = "half"|"full"`
  - `interface StyleDef { id: StyleId; name: string; tagline: string; usesBackdrop: boolean; overlay: "magazine"|"polaroid"|null; swatch: string /* CSS background for the placeholder tile */; prompt: string }`
  - `STYLES: StyleDef[]`, `BACKDROPS: { id: BackdropId; name: string; hex: string; prompt: string }[]`
  - `IDENTITY_LOCK`, `PEOPLE_RULE`, `REALISM` (strings)
  - `getStyle(id)`, `isStyleId(v)`, `isBackdropId(v)`, `isFraming(v)`
  - `buildPrompt(style: StyleId, backdrop: BackdropId, framing: Framing): string`

- [ ] **Step 1: Write the failing tests**

```ts
it("has the ten styles in order", () => {
  expect(STYLES.map((s) => s.name)).toEqual(["Professional shoot","Black and White","Magazine","Kawaii Photo Booth",
    "Warm Natural Light","Film","Old Hollywood","Neon Lights","Cinematic","Polaroid"]);
});
it("has the four backdrops", () => {
  expect(BACKDROPS.map((b) => [b.id, b.hex])).toEqual([["grey","#8a8d90"],["green","#4f5e4c"],["black","#0b0b0b"],["white","#f7f7f5"]]);
});
it("every prompt keeps faces, people and outfits, and stays realistic", () => {
  for (const s of STYLES) for (const b of BACKDROPS) for (const f of ["half","full"] as const) {
    const p = buildPrompt(s.id, b.id, f);
    expect(p.startsWith(IDENTITY_LOCK)).toBe(true);
    expect(p).toContain(PEOPLE_RULE);
    expect(p.endsWith(REALISM)).toBe(true);
    expect(p).toContain("Keep the original camera angle and framing");
    expect(p).toMatch(/do not zoom/i);
  }
  expect(PEOPLE_RULE).toContain("Do not add or remove anyone");
  expect(PEOPLE_RULE).toContain("exactly the same outfits");
  expect(REALISM).toContain("No text, logos or watermarks");
});
it("puts the chosen backdrop in, except for Kawaii's own pastel one", () => {
  expect(buildPrompt("professional","green","full")).toContain(BACKDROPS[1].prompt);
  const k = buildPrompt("kawaii","black","half");
  for (const b of BACKDROPS) expect(k).not.toContain(b.prompt);
  expect(k).toMatch(/pastel/);
  expect(getStyle("kawaii").usesBackdrop).toBe(false);
});
it("frames half body waist up and full body head to toe", () => {
  expect(buildPrompt("film","grey","half")).toContain("waist up");
  expect(buildPrompt("film","grey","full")).toContain("head to toe");
});
it("only Magazine and Polaroid get overlays", () => {
  expect(STYLES.filter((s) => s.overlay).map((s) => [s.id, s.overlay])).toEqual([["magazine","magazine"],["polaroid","polaroid"]]);
});
it("leaves no blanks, first person or run-together sentences", () => {
  for (const s of STYLES) for (const t of [s.prompt, IDENTITY_LOCK, PEOPLE_RULE, REALISM]) {
    expect(t).not.toMatch(/[[\]]|\bmy\b/i); expect(t).not.toMatch(/[.;:][A-Za-z]/);
  }
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/styles.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `buildPrompt` returns `IDENTITY_LOCK + " " + PEOPLE_RULE + " " + studio + " " + framing + " " + style.prompt + " " + REALISM`. The studio sentence uses the backdrop's `prompt`, or for Kawaii a pastel pink-to-lilac seamless backdrop. It replaces the room, light stands, equipment and onlookers. Write each part from spec §6 and each style's `prompt` from the §5 table. The Magazine prompt asks for clear space above the heads. Each style's `tagline` is ≤ 32 characters. Each `swatch` is a CSS gradient that evokes the style (as in the approved mockup).
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat: ten studio styles, four backdrops and the face-keeping prompt`.

### Task 3: Image preparation and the Seedream client

**Files:** Create `src/lib/images.ts`, `src/lib/seedream.ts`, `src/lib/editor.ts`; Test `tests/unit/images.test.ts`, `tests/unit/seedream.test.ts`, `tests/helpers/images.ts` (copy `solidImage`, `noisyJpeg`, `pixelAt` from Photo Editor)

**Interfaces:**
- Produces:
  - `MAX_UPLOAD_BYTES = 15 * 1024 * 1024`, `MODEL_MAX_SIDE = 2048`
  - `inspectPhoto(data: Buffer): Promise<{ width: number; height: number }>`, which throws `AppError(413|415, "That photo couldn't be read. Try again.")`
  - `prepareForModel(data: Buffer): Promise<Buffer>`: upright, ≤ 2048 px, JPEG q90
  - `toJpeg(data: Buffer, quality = 92): Promise<Buffer>`
  - `seedream.ts`: Photo Editor's file, unchanged, apart from the `X-Title: "Studio Booth"` header
  - `editor.ts`: `getEditor(): EditImageFn` (fake when `config.seedreamFake`) and `setEditorForTests(fn: EditImageFn | null): void`

- [ ] **Step 1: Copy the tests.** Copy Photo Editor's `tests/unit/seedream.test.ts`, adjusting the expected `X-Title`. Add `tests/unit/images.test.ts`:
  - a 4000×3000 JPEG comes out 2048×1536;
  - an EXIF-rotated portrait comes out upright, so width < height;
  - a PNG with alpha becomes a JPEG;
  - 16 MB → 413;
  - text bytes → 415;
  - `getEditor()` is the fake when `SEEDREAM_FAKE=1`, and `setEditorForTests(fn)` overrides it.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** (copy and trim from Photo Editor's `images.ts` and `seedream.ts`).
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: photo preparation and the OpenRouter Seedream client with fake mode`.

### Task 4: Magazine and Polaroid overlays

**Files:** Create `src/lib/overlays.ts`; Test `tests/unit/overlays.test.ts`

**Interfaces:**
- Consumes: `FONT_REGULAR`, `FONT_SEMIBOLD` (Task 1); `StyleDef["overlay"]` (Task 2)
- Produces:
  - `MASTHEADS = ["ICON","GLAM","LUXE","MUSE","ÉLAN","VERVE"] as const`
  - `interface OverlayContext { eventName: string; date: Date; random?: () => number }`
  - `cleanEventName(raw: unknown): string`: trimmed, control characters removed, ≤ 40 characters, `""` if empty
  - `applyOverlay(kind: "magazine"|"polaroid"|null, jpeg: Buffer, ctx: OverlayContext): Promise<Buffer>`: returns JPEG q92 and passes `null` through unchanged
  - `polaroidBorder(width: number): { side: number; top: number; bottom: number }`: `side = top = round(0.06 * width)`, `bottom = round(0.22 * width)`

- [ ] **Step 1: Write the failing tests**

```ts
it("Magazine keeps the size and writes a masthead across the top", async () => {
  const src = await solidImage(1200, 1800, "jpeg", { r: 60, g: 70, b: 60 });
  const out = await applyOverlay("magazine", src, { eventName: "Open House", date: new Date(2026, 10, 14), random: () => 0 });
  const m = await sharp(out).metadata(); expect([m.width, m.height]).toEqual([1200, 1800]);
  // masthead "ICON" (random 0) is bright: some pixel in the top band is near white
  expect(await brightestInBand(out, 0, 0.18)).toBeGreaterThan(220);
});
it("Polaroid adds a white border, thicker at the bottom", async () => {
  const src = await solidImage(1000, 1500);
  const out = await applyOverlay("polaroid", src, { eventName: "", date: new Date() });
  const b = polaroidBorder(1000);
  const m = await sharp(out).metadata();
  expect([m.width, m.height]).toEqual([1000 + 2 * b.side, 1500 + b.top + b.bottom]);
  expect((await pixelAt(out, 5, 5)).r).toBeGreaterThan(240);
});
it("awkward event names", async () => {
  expect(cleanEventName("x".repeat(200))).toHaveLength(40);
  expect(cleanEventName("  ")).toBe("");
  for (const name of ["R&D <Lab>", "Open House 🎓", "x".repeat(200)]) {
    await expect(applyOverlay("magazine", await solidImage(800, 1200), { eventName: cleanEventName(name), date: new Date() })).resolves.toBeInstanceOf(Buffer);
    await expect(applyOverlay("polaroid", await solidImage(800, 1200), { eventName: cleanEventName(name), date: new Date() })).resolves.toBeInstanceOf(Buffer);
  }
});
it("passes other styles through untouched", async () => { const src = await solidImage(10, 10); expect(await applyOverlay(null, src, { eventName: "", date: new Date() })).toBe(src); });
```
`brightestInBand(img, fromFrac, toFrac)` is a helper in `tests/helpers/images.ts`: it takes the max of R in the rows between the two fractions of the height.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Render text with `sharp({ text: { text: <Pango markup>, fontfile, font: "Bodoni Moda", rgba: true, width, dpi } })` and composite it. Escape `& < > " '` in any markup. Scale sizes from the image width:
  - masthead ≈ 0.26 W, letter-spaced, centred near the top;
  - two headlines at ≈ 0.035 W, left-middle and right-lower-third, each a small caps label over a serif line: (event name or "Open House", "The Rising Stars Issue") and ("Exclusive", "Behind the lens");
  - a footer of month-and-year + " · Special edition";
  - a soft dark gradient behind the top band so white text reads on white backdrops.

  For the Polaroid, extend the image with `#fbfbf8` and write the event name and date (`14 Nov 2026`), centred in the bottom border, in `#2a2a2e`.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: Magazine cover text and Polaroid frame added after the AI`.

### Task 5: Shot store, expiry and cleanup

**Files:** Create `src/lib/shots.ts`, `src/lib/startup.ts`, `src/instrumentation.ts`; Test `tests/unit/shots.test.ts`

**Interfaces:**
- Consumes: `config.shotsDir`; `StyleId`
- Produces:
  - `SHOT_TTL_MS = 3_600_000`, `AFTER_DOWNLOAD_MS = 300_000`
  - `interface ShotMeta { token: string; style: StyleId; createdAt: number; downloadedAt: number | null; width: number; height: number }`
  - `isToken(v: unknown): v is string`
  - `deleteAt(meta: ShotMeta): number`
  - `saveShot(jpeg: Buffer, style: StyleId, now?: number): Promise<ShotMeta>`
  - `getShot(token: string, now?: number): Promise<ShotMeta | null>`: `null` for a bad format, a missing shot, or one past `deleteAt`
  - `readShotImage(token: string): Promise<Buffer>`
  - `markDownloaded(token: string, now?: number): Promise<ShotMeta | null>`: only the first call sets `downloadedAt`
  - `deleteShot(token: string): Promise<void>`: no error if it's already gone
  - `runCleanup(now?: number): Promise<number>`: deletes expired shots and orphan files, and returns the number deleted
  - `startup()` creates `shotsDir`, runs cleanup and then repeats it every 60 s (`unref`)

- [ ] **Step 1: Write the failing tests**

```ts
it("deletes after an hour, or five minutes after the first download, whichever is sooner", () => {
  const m = { createdAt: 0, downloadedAt: null } as ShotMeta;
  expect(deleteAt(m)).toBe(3_600_000);
  expect(deleteAt({ ...m, downloadedAt: 600_000 })).toBe(900_000);
  expect(deleteAt({ ...m, downloadedAt: 3_500_000 })).toBe(3_600_000);
});
it("saves a shot as two files with a 22-character token", async () => {
  const meta = await saveShot(await solidImage(30, 20), "film", 1000);
  expect(meta.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  expect(meta).toMatchObject({ style: "film", createdAt: 1000, downloadedAt: null, width: 30, height: 20 });
  expect((await readdir(config.shotsDir)).sort()).toEqual([`${meta.token}.jpg`, `${meta.token}.json`]);
});
it("hides expired shots and refuses bad tokens without touching the disk", async () => {
  const meta = await saveShot(await solidImage(10, 10), "bw", 0);
  expect(await getShot(meta.token, 3_599_999)).not.toBeNull();
  expect(await getShot(meta.token, 3_600_000)).toBeNull();
  expect(await getShot("../../etc/passwd")).toBeNull();
});
it("only the first download starts the five-minute clock", async () => {
  const meta = await saveShot(await solidImage(10, 10), "bw", 0);
  expect((await markDownloaded(meta.token, 100_000))!.downloadedAt).toBe(100_000);
  expect((await markDownloaded(meta.token, 200_000))!.downloadedAt).toBe(100_000);
});
it("cleanup removes expired shots and orphan files, and keeps the rest", async () => {
  const old = await saveShot(await solidImage(10, 10), "bw", 0);
  const fresh = await saveShot(await solidImage(10, 10), "bw", 3_000_000);
  await writeFile(path.join(config.shotsDir, "AAAAAAAAAAAAAAAAAAAAAA.jpg"), "x");
  expect(await runCleanup(3_700_000)).toBe(2);
  expect(await getShot(old.token, 3_700_000)).toBeNull();
  expect(await getShot(fresh.token, 3_700_000)).not.toBeNull();
});
```
Empty `shotsDir` in `beforeEach`.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Write the files with `writeFile` to `<token>.tmp` and then `rename`, so a crash never leaves a half file. Orphan cleanup covers files of any age with no partner, and leftover `.tmp` files older than 5 minutes. `instrumentation.ts` is as in Photo Editor and calls `startup()`.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: shot store with one-hour and after-download deletion`.

### Task 6: Booth PIN, guards and the shot API

**Files:**
- Create: `src/lib/session.ts`, `src/lib/guards.ts`, `src/lib/qr.ts`, `src/lib/publicUrl.ts`
- Create: `src/app/api/session/route.ts`, `src/app/api/shots/route.ts`, `src/app/api/shots/[token]/route.ts` (DELETE), `src/app/api/shots/[token]/image/route.ts`, `src/app/api/p/[token]/image/route.ts`, `src/app/api/test-ai/route.ts`
- Test: `tests/helpers/cookies.ts`, `tests/helpers/api.ts` (copied from Photo Editor), `tests/api/session.test.ts`, `tests/api/shots.test.ts`, `tests/api/download.test.ts`

**Interfaces:**
- Consumes:
  - `buildPrompt`, `getStyle`, `isStyleId`, `isBackdropId`, `isFraming` (Task 2)
  - `inspectPhoto`, `prepareForModel`, `toJpeg`, `getEditor` (Task 3)
  - `applyOverlay`, `cleanEventName` (Task 4)
  - the shot store (Task 5)
- Produces:
  - `boothSession()`, an iron-session cookie `sb_booth` lasting 12 h with data `{ pin?: string }`
  - `pinFingerprint()`: `sha256("booth:" + BOOTH_PIN)`, first 16 hex characters
  - `requireBooth(): Promise<void>`, which throws `AppError(401, "Enter the booth PIN.")`
  - `guards.ts`:
    - `startShot(now?: number): { release(): void } | "busy" | "hourly"`
    - `pinBlocked(ip, now?)` and `recordPinFailure(ip, now?)`: 10 failures in 10 minutes block that IP for the rest of the window
    - `resetGuards()`
  - `qrSvg(url: string): Promise<string>`: `qrcode` `toString` with `type "svg"`, `margin 1`, dark `#111111`, light `#ffffff`
  - `publicBase(req: Request): string`: `config.publicUrl`, else `x-forwarded-proto` (default `https`) + `x-forwarded-host` or `host`
  - `POST /api/shots` returns `200 { token, imageUrl: "/api/shots/<t>/image", downloadUrl: "<base>/p/<t>", qrSvg, deleteAt }`
  - errors are `{ error, detail? }`

- [ ] **Step 1: Write the failing tests.** Mock `next/headers` exactly as Photo Editor's `tests/api/session.test.ts` does. Use `setEditorForTests` to inject the AI.

`tests/api/session.test.ts`:
- the right PIN → 200 and `GET` → `{ unlocked: true }`;
- a wrong PIN → 401 "That PIN isn't right.";
- the 11th wrong PIN within 10 minutes from one IP → 429 "Too many tries. Wait a few minutes.";
- `DELETE` → `{ unlocked: false }`.

`tests/api/shots.test.ts`, using a multipart helper `shotRequest({ photo, style, backdrop, framing, eventName })`:
- **without the PIN** → 401, and the editor is never called;
- **unlocked, a valid shot** → 200:
  - the token matches the token pattern;
  - `downloadUrl` is `"http://booth.test/p/" + token` when `PUBLIC_URL=http://booth.test`;
  - `qrSvg` starts with `"<svg"`;
  - the editor received `buildPrompt("magazine","black","full")` and a JPEG ≤ 2048 px;
  - one shot file pair exists.
- **bad input:**
  - `style: "vogue"` → 400 "Choose a style.";
  - `backdrop: "red"` → 400 "Choose a backdrop.";
  - `framing: "knees"` → 400 "Choose half or full body.";
  - no photo → 400 "No photo arrived. Try again.".
- **second shot while one is developing:** the editor is held on a promise, two requests fire, and one gets 409 "Still developing the last photo.". After it resolves, a third request → 200.
- **AI failure:**
  - editor throws `SeedreamError("timeout")` → 503 "The AI took too long. Try again." with `detail` containing `timeout`;
  - `SeedreamError("refused")` → 422 "The AI couldn't develop this one. Try again or pick another style.";
  - `SeedreamError("auth")` and `SeedreamError("budget")` → 502 "The AI service isn't available. Fetch a student helper.";
  - no shot files remain, and the next request isn't 409.
- **hourly cap:** `MAX_SHOTS_PER_HOUR=2`, the third call → 429 "The booth is taking a short breather. Try again in a few minutes.". Failed AI calls count towards the cap.
- **Retake:** `DELETE /api/shots/<t>` → 204, and the files are gone. Deleting an unknown token → 204.

`tests/api/download.test.ts`:
- the guest image route needs no PIN → 200 `image/jpeg` with `Cache-Control: private, no-store`, and sets `downloadedAt`;
- `?download=1` adds `Content-Disposition: attachment; filename="studio-portrait-YYYY-MM-DD.jpg"`;
- **expired token** → 404 `{ error: "This photo has been deleted" }`;
- a bad token → 404;
- the booth image route needs the PIN and does not set `downloadedAt`.

- [ ] **Step 2: Run** `npx vitest run tests/api`. Expected: FAIL.
- [ ] **Step 3: Implement** the routes, using `handle()`. In `POST /api/shots`:
  1. `requireBooth`
  2. parse `formData`
  3. validate
  4. `inspectPhoto`
  5. `startShot()`; `"busy"` → 409 and `"hourly"` → 429
  6. `try { prepareForModel → editor(buildPrompt) → toJpeg → applyOverlay(style.overlay, …, { eventName: cleanEventName(form.eventName), date: new Date() }) → saveShot } finally { release() }`

  Map `SeedreamError` kinds to the messages above:
  - `busy` → 503 "The AI is busy. Try again in a moment."
  - `no_image` → the same message as `refused`
  - `upstream` → 502 "The AI service had a problem. Try again."

  `POST /api/test-ai` (needs the PIN) runs the editor once on a 512×640 grey test image with `buildPrompt("professional","grey","half")`. It returns `{ ok, mode: "fake"|"real", seconds, error? }` and stores nothing. All routes set `export const dynamic = "force-dynamic"`.
- [ ] **Step 4: Run** `npx vitest run` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: booth PIN, shot API with guards, QR codes and guest image route`.

### Task 7: The booth screen

**Files:**
- Create: `src/lib/client/settings.ts`, `src/lib/client/capture.ts`
- Create: `src/components/PinGate.tsx`, `src/components/CameraView.tsx`, `src/components/ChooseScreen.tsx`, `src/components/Countdown.tsx`, `src/components/Developing.tsx`, `src/components/ResultScreen.tsx`, `src/components/ErrorScreen.tsx`, `src/components/StyleTile.tsx`
- Create: `src/app/page.tsx`
- Test: `tests/unit/capture.test.ts`

**Interfaces:**
- Consumes: `STYLES`, `BACKDROPS`, `Framing` (Task 2); the session and shot routes (Task 6)
- Produces:
  - `type Rotation = 0|90|180|270`
  - `interface BoothSettings { cameraId: string | null; rotation: Rotation; mirror: boolean; countdown: number; eventName: string; enabledStyles: StyleId[] }`
  - `DEFAULT_SETTINGS`, with `countdown: 10`, `mirror: true`, `rotation: 0` and all styles enabled
  - `loadSettings(): BoothSettings`: localStorage key `"studio-booth-settings"`, wrapped in try/catch, with each field validated and clamped (countdown 1–30)
  - `saveSettings(s: BoothSettings): void`
  - `cropRect(w: number, h: number): { sx: number; sy: number; sw: number; sh: number }`: the largest centred 2:3 (portrait, `h > w`) or 3:2 (landscape) region
  - `rotatedSize(w: number, h: number, r: Rotation): { w: number; h: number }`
  - `captureFrame(video: HTMLVideoElement, rotation: Rotation, quality?: number): Promise<Blob>`: rotate the full frame, crop with `cropRect`, then `toBlob("image/jpeg", 0.92)`, never mirrored
  - `CameraView` props `{ deviceId: string | null; rotation: Rotation; mirror: boolean; framing: Framing | null; onReady(video: HTMLVideoElement | null): void }`

- [ ] **Step 1: Write the failing test** `tests/unit/capture.test.ts`

```ts
expect(cropRect(1920, 1080)).toEqual({ sx: 150, sy: 0, sw: 1620, sh: 1080 });
expect(cropRect(1080, 1920)).toEqual({ sx: 0, sy: 150, sw: 1080, sh: 1620 });
expect(cropRect(1500, 1000)).toEqual({ sx: 0, sy: 0, sw: 1500, sh: 1000 });
expect(rotatedSize(1920, 1080, 90)).toEqual({ w: 1080, h: 1920 });
expect(rotatedSize(1920, 1080, 180)).toEqual({ w: 1920, h: 1080 });
```
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement the screens as in spec §4 and the approved mockup.** `page.tsx` is a client state machine: `"locked" | "choose" | "countdown" | "developing" | "result" | "error"`. On load it calls `GET /api/session`; while locked it shows `PinGate`.
  - **`CameraView`:**
    - asks `getUserMedia` for `{ deviceId: exact if set, width: { ideal: 3840 }, height: { ideal: 2160 } }` with no audio;
    - the `<video>` is `playsInline muted autoPlay`;
    - rotation and mirroring are applied to the preview with CSS;
    - the preview is masked to the same 2:3 or 3:2 area as `cropRect`, so guests see exactly what is captured;
    - guides: Full shows HEAD and FEET lines and "Step back: head to toe"; Half shows HEAD and WAIST lines and "Step closer: waist up";
    - on failure it shows "Camera unavailable — tap to retry", and `onReady(null)` disables TAKE MY PHOTO.
  - **Choose:**
    - the right panel holds, in order:
      - "THE STUDIO" (a 700 ms long-press goes to `/setup`)
      - "Choose your look"
      - the scrollable style grid of enabled styles (`StyleTile`: the `swatch`, a silhouette and a mini Magazine, Kawaii or Polaroid ornament as in the mockup)
      - backdrop swatches, hidden with "Pastel backdrop" for Kawaii
      - Half body | Full body
      - the notice line
      - TAKE MY PHOTO with "10-second timer" (or "N-second timer")
    - defaults: Professional shoot, grey, Full body.
  - **Countdown:**
    - the full-screen camera, a gold conic ring, Bodoni numerals and "Hold your pose · Look into the camera";
    - a top bar like "NEON · BLACK BACKDROP · FULL BODY";
    - at 0: a 150 ms white flash, a WebAudio shutter click and `captureFrame`, then POST as multipart with `eventName` from settings.
  - **Developing:** the captured blob, blurred, with the gold shimmer and a progress bar easing to 90% over 40 s, "Developing your portrait" and the style name.
  - **Result:**
    - the image from `imageUrl`, the `qrSvg` (server-made SVG) and the "Scan with your phone camera…" note;
    - **Retake** sends `DELETE`, then runs the countdown again;
    - **Done** returns to Choose;
    - after 120 s without a touch, it returns to Choose;
    - the root element carries `data-download-url` for tests.
  - **Error:** "That one didn't develop", the `error` text, `detail` in small muted text, then Try again (same capture, re-POST) and Start over. A 401 returns to `PinGate`.
  - **Transitions:** 300 ms opacity/translate.
- [ ] **Step 4: Run** `npx vitest run tests/unit/capture.test.ts` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Look at it.** Run `SEEDREAM_FAKE=1 BOOTH_PIN=2468 npm run dev` and open `http://localhost:3000` in the browser pane at 1180×820. Unlock, take a photo with the laptop camera, and compare against the approved mockup (`.superpowers` Noir screens).
- [ ] **Step 6: Commit** `feat: Noir booth screen — choose, countdown, developing, result`.

### Task 8: Setup page and guest download page

**Files:**
- Create: `src/app/setup/page.tsx`
- Create: `src/app/p/[token]/page.tsx`, `src/components/SaveButton.tsx`
- Modify: `src/lib/client/settings.ts` if needed

**Interfaces:**
- Consumes: `loadSettings` and `saveSettings`, `CameraView`, `PinGate` (Task 7); `getShot` (Task 5); `POST /api/test-ai` (Task 6)

- [ ] **Step 1: Setup page** (behind `PinGate`). It contains:
  - a camera `<select>` from `enumerateDevices()` (after one `getUserMedia` call, so the labels are filled), with the live `CameraView` and the actual track resolution (`track.getSettings()`) shown as "1920 × 1080";
  - rotation: Upright 0° / Sideways 90° / Sideways 270° / Upside down 180°;
  - Mirror the live view (checkbox);
  - Countdown seconds (1–30);
  - Event name (maxlength 40);
  - Styles shown to guests (checkboxes; at least one must stay on);
  - Test the AI (shows mode, seconds, or the error);
  - Back to booth.

  Every change saves immediately.
- [ ] **Step 2: Guest page** `/p/[token]`. It is a server component (`dynamic = "force-dynamic"`) built for phone width in the Noir look.
  - If `getShot` returns null: "This photo has been deleted", plus "Photos are removed soon after download and always within 1 hour."
  - Otherwise:
    - "THE STUDIO", "Your portrait";
    - `<img src="/api/p/<token>/image">`;
    - `SaveButton`, which fetches the blob and uses `navigator.share({ files: [File] })` when `navigator.canShare` allows it, or otherwise links to `?download=1`;
    - "or press and hold the photo to save it";
    - the notice line.

  `<meta name="robots" content="noindex">`.
- [ ] **Step 3: Run** `npm run typecheck` and `npm run build`. Expected: both succeed.
- [ ] **Step 4: Commit** `feat: helper setup page and guest download page`.

### Task 9: End-to-end tests with a fake camera

**Files:** Create `playwright.config.ts`, `e2e/booth.spec.ts`

- [ ] **Step 1: Config.** Base URL `http://localhost:3200`, Chromium with `launchOptions.args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]` and `permissions: ["camera"]`. The `webServer` runs `npm run build && npx next start -p 3200`, waits on `/api/health`, and sets this env:
  - `BOOTH_PIN=2468`
  - a 40-character `SESSION_SECRET`
  - `SEEDREAM_FAKE=1`
  - `DATA_DIR=.e2e-data`
  - `PUBLIC_URL=http://localhost:3200`
- [ ] **Step 2: Write the tests.** `addInitScript` stores settings with `countdown: 1`.
  - **"a guest takes a Magazine photo and downloads it":**
    1. Unlock with 2468.
    2. Choose Magazine, Black and Full body.
    3. TAKE MY PHOTO; "Developing your portrait" is visible, then "Your portrait is ready".
    4. The QR `svg` is visible; read `data-download-url`.
    5. In a new page, open the download URL; the `img` loads and the "Save photo" button is visible.
    6. Back on the booth, Retake; a new result appears; the old URL now shows "This photo has been deleted".
  - **"Kawaii hides the backdrop swatches":** with Kawaii chosen, "Pastel backdrop" is visible and the swatch buttons are hidden.
  - **"camera failure":** `addInitScript` makes `navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"))`. After unlocking, "Camera unavailable — tap to retry" is visible and TAKE MY PHOTO is disabled.
  - **"setup lists the fake camera":** unlock, `goto("/setup")`; the camera select has ≥ 1 option and the resolution text matches `/\d+ × \d+/`.
- [ ] **Step 3: Run** `npm run test:e2e`. Expected: 4 passed.
- [ ] **Step 4: Commit** `test: end-to-end booth flow with Chrome's fake camera`.

### Task 10: Probe script, README and deploy notes

**Files:** Create `probe/run.ts`, `README.md`, `.env.example` (final)

- [ ] **Step 1: `probe/run.ts`.**
  - Inputs:
    - it loads `.env.local` and stops with a clear message if `OPENROUTER_API_KEY` is missing;
    - for every `probe/photos/*.{jpg,jpeg,png}`, framing is `full` unless the filename contains `half`;
    - it runs each style (`PROBE_STYLES=bw,film` narrows the list) with `PROBE_BACKDROP` (default `grey`).
  - Output:
    - it uses the real `prepareForModel → editImage → applyOverlay` and runs 3 at a time;
    - it writes `probe/out/<photo>__<style>.jpg` and one contact sheet per photo, `probe/out/sheet-<photo>.jpg`, with labelled tiles;
    - it prints the time and cost per image.

  `probe/photos` and `probe/out` are gitignored.
- [ ] **Step 2: README.** Sections:
  - What it is
  - Run it locally (fake mode)
  - Tests
  - **Setting up at the open house:** the iPad on Safari with Add to Home Screen, Guided Access, Auto-Lock Never; the Canon as a USB webcam on iPadOS 17+, or an HDMI-to-USB-C capture adapter; the Setup page; lights; camera upright for 1–2 people and sideways for groups
  - **Before the event:** run `npm run probe` with a real key and check the faces
  - Deploy to Railway (volume at `/data`, the variables, one replica)
  - Privacy (the notice, the deletion rules, `data_collection: deny`)
  - Changing styles (`src/lib/styles.ts`)
  - Cost (≈ $0.02–0.04 per photo)
- [ ] **Step 3: Run** `npm test`, `npm run typecheck`, `npm run build` and `npm run test:e2e`. Expected: all pass.
- [ ] **Step 4: Commit** `docs: README, open-house setup guide and the real-model probe`.
