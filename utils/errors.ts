// TypeScript treats caught exceptions as unknown; narrow before reading message.
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
