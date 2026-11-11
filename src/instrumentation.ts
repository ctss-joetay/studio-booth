export async function register(): Promise<void> {
  // Next.js also compiles this file for the edge runtime; this exact check lets it drop the Node-only import there.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startup } = await import("./lib/startup");
    await startup();
  }
}
