export function jsonRequest(path: string, method = "GET", body?: unknown, ip = "10.0.0.1"): Request {
  return new Request(`http://test${path}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function ctx<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

export interface ShotFields {
  photo?: Buffer | null;
  style?: string;
  backdrop?: string;
  framing?: string;
  eventName?: string;
}

/** A booth photo upload as the iPad sends it: multipart with the JPEG and the guest's choices. */
export function shotRequest(fields: ShotFields, headers: Record<string, string> = {}): Request {
  const form = new FormData();
  if (fields.photo) form.set("photo", new Blob([new Uint8Array(fields.photo)], { type: "image/jpeg" }), "shot.jpg");
  for (const key of ["style", "backdrop", "framing", "eventName"] as const) {
    const value = fields[key];
    if (value !== undefined) form.set(key, value);
  }
  return new Request("http://booth.test/api/shots", { method: "POST", body: form, headers });
}
