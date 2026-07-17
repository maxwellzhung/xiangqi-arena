export class PublicError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "PublicError";
  }
}

export function publicMessage(error: unknown): string {
  return error instanceof PublicError
    ? error.message
    : "The request could not be completed.";
}
