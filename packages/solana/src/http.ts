import { AppError } from '@proof/shared';
import type { z } from 'zod';
export type Fetcher = typeof fetch;
export async function fetchJson<T>(fetcher: Fetcher, url: string | URL, schema: z.ZodType<T>, provider: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      const auth = response.status === 401 || response.status === 403;
      throw new AppError(auth ? 'PROVIDER_AUTH' : response.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_HTTP',
        `${provider} returned HTTP ${response.status}.${auth ? ' Check the server API key and plan access.' : ' The service will retry.'}`, 502, !auth);
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) throw new AppError('PROVIDER_SCHEMA', `${provider} returned an unsupported response format.`);
    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Native fetch errors can include URLs containing API keys. Never propagate them.
    throw new AppError('PROVIDER_UNAVAILABLE', `${provider} could not be reached or returned invalid JSON. Try again shortly.`);
  }
}
