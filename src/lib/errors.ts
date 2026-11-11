/** An error whose message is safe to show on the booth screen. `detail` is a short note for student helpers. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
