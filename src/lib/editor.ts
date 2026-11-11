import { config } from "./config";
import { editImage, fakeEditImage, type EditImageFn } from "./seedream";

let override: EditImageFn | null = null;

/** The AI step: the real Seedream call, or the fake tint in rehearsal mode. */
export function getEditor(): EditImageFn {
  if (override) return override;
  return config.seedreamFake ? fakeEditImage : (prompt, jpeg) => editImage(prompt, jpeg);
}

/** Tests only: replace the AI step, or pass null to go back to the normal one. */
export function setEditorForTests(fn: EditImageFn | null): void {
  override = fn;
}
