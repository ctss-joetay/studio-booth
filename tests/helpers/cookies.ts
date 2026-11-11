/** An in-memory stand-in for Next's cookies() so route handlers can run in Vitest. */
const jar = new Map<string, string>();

type CookieArg = string | { name: string; value: string; maxAge?: number };

export const cookieStore = {
  get(name: string) {
    const value = jar.get(name);
    return value === undefined ? undefined : { name, value };
  },
  getAll() {
    return [...jar].map(([name, value]) => ({ name, value }));
  },
  has(name: string) {
    return jar.has(name);
  },
  set(first: CookieArg, value?: string, options?: { maxAge?: number }) {
    const name = typeof first === "string" ? first : first.name;
    const v = typeof first === "string" ? (value ?? "") : first.value;
    const maxAge = typeof first === "string" ? options?.maxAge : first.maxAge;
    if (maxAge === 0 || v === "") jar.delete(name);
    else jar.set(name, v);
    return cookieStore;
  },
  delete(name: string) {
    jar.delete(name);
    return cookieStore;
  },
};

export function clearCookies(): void {
  jar.clear();
}

export const nextHeadersMock = {
  cookies: async () => cookieStore,
  headers: async () => new Headers(),
};
