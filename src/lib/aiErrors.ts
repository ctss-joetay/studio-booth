import { AppError } from "./errors";
import { SeedreamError, type SeedreamErrorKind } from "./seedream";

const MESSAGES: Record<SeedreamErrorKind, [number, string]> = {
  timeout: [503, "The AI took too long. Try again."],
  busy: [503, "The AI is busy. Try again in a moment."],
  refused: [422, "The AI couldn't develop this one. Try again or pick another style."],
  no_image: [422, "The AI couldn't develop this one. Try again or pick another style."],
  auth: [502, "The AI service isn't available. Fetch a student helper."],
  budget: [502, "The AI service isn't available. Fetch a student helper."],
  upstream: [502, "The AI service had a problem. Try again."],
};

/** A message for guests plus a short detail line for student helpers. Other errors pass through unchanged. */
export function aiError(error: unknown): unknown {
  if (!(error instanceof SeedreamError)) return error;
  const [status, message] = MESSAGES[error.kind];
  const detail = `${error.kind}${error.status ? ` (${error.status})` : ""}: ${error.message}`.slice(0, 200);
  return new AppError(status, message, detail);
}
