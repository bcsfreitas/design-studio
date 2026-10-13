// One browser-client failure shape. Callers classify by code/status, never by message text.
export class ClientError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(code: string, message: string, status?: number, cause?: unknown) {
    super(message, { cause });
    this.name = 'ClientError';
    this.code = code;
    this.status = status;
  }
}
