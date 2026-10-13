import { ClientError } from '../../core/client-error.ts';

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new ClientError(
      'unavailable',
      'Studio could not be reached. Check that the dev server is running.',
      undefined,
      cause,
    );
  }
  let reply: unknown;
  try {
    reply = await response.json();
  } catch (cause) {
    throw new ClientError(
      'invalid_response',
      `Studio returned an unreadable reply (HTTP ${response.status}).`,
      response.status,
      cause,
    );
  }
  if (!response.ok) {
    const error = reply && typeof reply === 'object' ? (reply as { error?: unknown; code?: unknown }) : undefined;
    throw new ClientError(
      typeof error?.code === 'string' && error.code ? error.code : 'http_error',
      typeof error?.error === 'string' && error.error
        ? error.error
        : `Studio request failed (HTTP ${response.status}).`,
      response.status,
    );
  }
  return reply as T;
}
