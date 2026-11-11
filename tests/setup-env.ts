import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.BOOTH_PIN ??= "2468";
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters";
process.env.SEEDREAM_FAKE = "1";
process.env.DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "sb-test-"));
