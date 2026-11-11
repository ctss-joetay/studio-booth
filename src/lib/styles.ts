export type StyleId =
  | "professional"
  | "bw"
  | "magazine"
  | "kawaii"
  | "warm"
  | "film"
  | "hollywood"
  | "neon"
  | "cinematic"
  | "polaroid";
export type BackdropId = "grey" | "green" | "black" | "white";
export type Framing = "half" | "full";

export interface StyleDef {
  id: StyleId;
  name: string;
  tagline: string;
  /** False when the style brings its own backdrop (Kawaii); the booth then hides the swatches. */
  usesBackdrop: boolean;
  /** Text or a frame the app adds after the AI, in real fonts. */
  overlay: "magazine" | "polaroid" | null;
  /** CSS background for the placeholder tile until real sample photos exist. */
  swatch: string;
  prompt: string;
}

export interface BackdropDef {
  id: BackdropId;
  name: string;
  hex: string;
  prompt: string;
}

/** First in every prompt: these are real guests and must stay themselves. */
export const IDENTITY_LOCK =
  "Edit the attached photo booth picture into a professional studio photograph. The people in it are real guests, " +
  "so keep every person instantly recognisable as themselves. Preserve each face exactly, with the same facial " +
  "structure, eyes, eyebrows, nose, mouth, ears, skin tone, natural skin texture and details such as moles, freckles " +
  "and glasses, and the same hair, hairstyle, age and expression. Preserve each person's body shape and proportions. " +
  "Do not beautify, slim, smooth, de-age or swap any face.";

/** The people and their clothes are exactly as photographed. */
export const PEOPLE_RULE =
  "Keep exactly the people who are posing for the photo: the same number of people in the same positions and poses, " +
  "wearing exactly the same outfits with the same colours, patterns, fit and accessories. Do not add or remove anyone, " +
  "and add nothing that looks like a person, such as reflections, statues or mannequins.";

/** Last in every prompt. Magazine and Polaroid text is added by the app, never drawn by the AI. */
export const REALISM =
  "Make it look genuinely photographed in a professional studio with a full-frame camera: natural skin texture and " +
  "facial detail, realistic fabric and hair, and a polished but believable result that never looks artificial or " +
  "over-edited. No text, logos or watermarks.";

const SAME_FRAMING = "Keep the original camera angle and framing, and do not zoom in or out.";

const FRAMING_TEXT: Record<Framing, string> = {
  full:
    `${SAME_FRAMING} This is a full-length shot: show everyone head to toe with their feet on the studio floor and ` +
    "soft contact shadows. If the photo does not show their full bodies, keep the framing it has and do not invent " +
    "legs or shoes.",
  half:
    `${SAME_FRAMING} This is a half-length portrait from the waist up, with every face large, sharp and in focus. ` +
    "Do not show more of their bodies than the photo shows.",
};

export const BACKDROPS: BackdropDef[] = [
  { id: "grey", name: "Grey", hex: "#8a8d90", prompt: "a seamless mid-grey studio paper backdrop" },
  { id: "green", name: "Green", hex: "#4f5e4c", prompt: "a seamless muted sage-green studio paper backdrop, mid to dark in tone" },
  { id: "black", name: "Black", hex: "#0b0b0b", prompt: "a seamless matte black studio backdrop" },
  { id: "white", name: "White", hex: "#f7f7f5", prompt: "a seamless bright white studio paper backdrop" },
];

const KAWAII_BACKDROP = "a seamless pastel studio backdrop that fades from soft pink to lilac";

export const STYLES: StyleDef[] = [
  {
    id: "professional",
    name: "Professional shoot",
    tagline: "Clean, crisp studio light",
    usesBackdrop: true,
    overlay: null,
    swatch: "linear-gradient(160deg, #8b8f92, #55595c)",
    prompt:
      "Style: a polished professional studio portrait. Light them with a large softbox key light at forty-five " +
      "degrees, gentle fill and a subtle rim light that separates them from the backdrop, with crisp detail in eyes, " +
      "hair and fabric, natural true-to-life colour and clean, even exposure.",
  },
  {
    id: "bw",
    name: "Black and White",
    tagline: "Dramatic monochrome",
    usesBackdrop: true,
    overlay: null,
    swatch: "linear-gradient(90deg, #050505, #4a4a4a)",
    prompt:
      "Style: a dramatic high-contrast black-and-white studio portrait. Render the whole image in true monochrome, " +
      "including the backdrop. Light them with one hard key light from the side and a thin rim light along hair and " +
      "shoulders, giving deep rich blacks, bright clean highlights and strong sculpted shadows while both eyes stay " +
      "clearly visible.",
  },
  {
    id: "magazine",
    name: "Magazine",
    tagline: "Your own cover story",
    usesBackdrop: true,
    overlay: "magazine",
    swatch: "linear-gradient(160deg, #5f6b58, #353d31)",
    prompt:
      "Style: a glossy fashion magazine cover shoot. Use bright beauty lighting from a large overhead softbox with " +
      "fill from below, polished editorial colour and crisp detail, with a confident cover-star mood. Leave clear " +
      "space above their heads where the photo allows, for a title added later.",
  },
  {
    id: "kawaii",
    name: "Kawaii Photo Booth",
    tagline: "Pastels, sparkles, stickers",
    usesBackdrop: false,
    overlay: null,
    swatch: "linear-gradient(135deg, #ffd6e8, #d9c9ff)",
    prompt:
      "Style: a cute Japanese kawaii photo booth picture. Bright, soft, even lighting with a gentle glow, a pastel " +
      "colour palette and a light dreamy finish, while skin keeps its natural texture. Decorate the edges of the " +
      "picture with sparkles and cute stickers such as hearts, stars, bows, clouds and little flowers. Keep every " +
      "sticker away from faces and bodies, and add no characters, animals, mascots or anything with a face.",
  },
  {
    id: "warm",
    name: "Warm Natural Light",
    tagline: "Soft window glow",
    usesBackdrop: true,
    overlay: null,
    swatch: "linear-gradient(135deg, #f3c27a, #b8763c)",
    prompt:
      "Style: warm natural light, as if from a large sunny window to one side. Soft golden light wraps around them " +
      "with gentle, natural shadows, warm but true skin tones and a calm, relaxed mood.",
  },
  {
    id: "film",
    name: "Film",
    tagline: "35 mm colour and grain",
    usesBackdrop: true,
    overlay: null,
    swatch: "linear-gradient(160deg, #c9b48f, #6f7f78)",
    prompt:
      "Style: shot on 35 mm colour film. Soft contrast, gentle highlight roll-off, slightly lifted shadows, warm " +
      "natural film colours and fine, even grain, like a well-exposed analogue studio portrait.",
  },
  {
    id: "hollywood",
    name: "Old Hollywood",
    tagline: "1940s silver-screen glamour",
    usesBackdrop: true,
    overlay: null,
    swatch: "radial-gradient(circle at 50% 22%, #d9d9d9, #2b2b2b 75%)",
    prompt:
      "Style: a 1940s Old Hollywood glamour portrait in black and white. Render the whole image in monochrome, " +
      "including the backdrop. Use classic butterfly lighting from above with a soft glow, glossy highlights in the " +
      "hair and deep velvety shadows, like a vintage film studio publicity photo.",
  },
  {
    id: "neon",
    name: "Neon Lights",
    tagline: "Pink and blue gel lights",
    usesBackdrop: true,
    overlay: null,
    swatch: "linear-gradient(90deg, #ff3fa4, #3b5bff)",
    prompt:
      "Style: a bold music-video look with coloured gel lighting. Light them with a vivid pink gel light from one " +
      "side and an electric blue gel light from the other, so the colours wrap around them and spill onto the " +
      "backdrop, with deep shadows between. Keep faces clearly lit and recognisable.",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    tagline: "A still from your film",
    usesBackdrop: true,
    overlay: null,
    swatch: "linear-gradient(160deg, #28403f, #0d1414 60%, #5a3a1e)",
    prompt:
      "Style: a moody cinematic film still. Use low-key lighting from a single soft source to one side, deep " +
      "shadows, a gentle haze and a teal-and-amber colour grade with rich contrast, like a frame from a feature film.",
  },
  {
    id: "polaroid",
    name: "Polaroid",
    tagline: "Instant-camera classic",
    usesBackdrop: true,
    overlay: "polaroid",
    swatch: "linear-gradient(160deg, #e9dcc0, #a99a80)",
    prompt:
      "Style: an instant-film photo. Direct, slightly soft flash, gentle vignetting, faded cream highlights and the " +
      "soft, slightly warm colours of a classic instant camera picture. Do not draw any frame or border, because one " +
      "is added afterwards.",
  },
];

export function isStyleId(value: unknown): value is StyleId {
  return STYLES.some((s) => s.id === value);
}

export function isBackdropId(value: unknown): value is BackdropId {
  return BACKDROPS.some((b) => b.id === value);
}

export function isFraming(value: unknown): value is Framing {
  return value === "half" || value === "full";
}

export function getStyle(id: StyleId): StyleDef {
  const style = STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`Unknown style: ${id}`);
  return style;
}

/** The only way a prompt reaches the model: identity, people, studio, framing, style, realism. */
export function buildPrompt(styleId: StyleId, backdropId: BackdropId, framing: Framing): string {
  const style = getStyle(styleId);
  const backdrop = style.usesBackdrop ? BACKDROPS.find((b) => b.id === backdropId)!.prompt : KAWAII_BACKDROP;
  const studio =
    "Replace everything behind them, including the room, light stands, equipment, furniture and anyone in the " +
    `background, with ${backdrop} that curves smoothly into the studio floor. Light the people so they belong in ` +
    "this studio, with soft natural shadows where they meet the floor.";
  return [IDENTITY_LOCK, PEOPLE_RULE, studio, FRAMING_TEXT[framing], style.prompt, REALISM].join(" ");
}
