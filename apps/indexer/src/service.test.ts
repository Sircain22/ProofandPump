import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError, snapshotSchema, type TokenOverview } from '@proof/shared';
import { TokenService } from './service';
import { buildServer } from './server';
const mint = 'So11111111111111111111111111111111111111112';
const token: TokenOverview = { mint, name: 'Wrapped SOL', symbol: 'SOL', priceUsd: '100', marketCapUsd: null,
  liquidityUsd: null, pairCreatedAt: null, pairAddress: null, pools: [], observedAt: Date.now(), source: 'test fixture' };
afterEach(() => vi.useRealTimers());
describe('local service', () => {
  it('coalesces simultaneous lookups and reports missing-key mode', async () => {
    const resolve = vi.fn(async () => token); const service = new TokenService({ resolve });
    const results = await Promise.all([service.get(mint),service.get(mint)]);
    expect(resolve).toHaveBeenCalledTimes(1); expect(results[0]?.feed).toBe('disabled');
    expect(results[0]?.issues[0]?.code).toBe('HELIUS_KEY_MISSING'); service.close();
  });
  it('shares polling between clients, recovers from errors, and stops after disconnect', async () => {
    vi.useFakeTimers();
    const recent = vi.fn().mockRejectedValueOnce(new AppError('PROVIDER_RATE_LIMIT','Throttled'))
      .mockResolvedValue({ trades: [], heads: {}, skipped: 0, truncated: false });
    const service = new TokenService({ resolve: async () => token },{ recent },undefined,undefined,undefined,100);
    const a = vi.fn(); const b = vi.fn();
    const stopA = await service.subscribe(mint,a); const stopB = await service.subscribe(mint,b);
    await vi.advanceTimersByTimeAsync(0);
    expect(recent).toHaveBeenCalledTimes(1); expect((await service.get(mint)).feed).toBe('degraded');
    await vi.advanceTimersByTimeAsync(200);
    expect(recent).toHaveBeenCalledTimes(2); expect((await service.get(mint)).feed).toBe('live');
    stopA(); stopB(); await vi.advanceTimersByTimeAsync(1000); expect(recent).toHaveBeenCalledTimes(2); service.close();
  });
  it('validates REST inputs, contracts, and allowed CORS origins', async () => {
    const service = new TokenService({ resolve: async () => token });
    const app = await buildServer({ service, logger: false });
    try {
      const invalid = await app.inject({ url: '/v1/tokens/not-a-mint' });
      expect(invalid.statusCode).toBe(400); expect(invalid.json().error.code).toBe('INVALID_MINT');
      const valid = await app.inject({ url: `/v1/tokens/${mint}`, headers: { origin: 'http://localhost:3000' } });
      expect(valid.statusCode).toBe(200); expect(snapshotSchema.safeParse(valid.json()).success).toBe(true);
      expect(valid.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      const crossOrigin = await app.inject({ url: '/health', headers: { origin: 'https://untrusted.example' } });
      expect(crossOrigin.headers['access-control-allow-origin']).toBeUndefined();
    } finally { await app.close(); }
  });
  it('delivers a real SSE snapshot and releases the subscription on disconnect', async () => {
    const service = new TokenService({ resolve: async () => token });
    const app = await buildServer({ service, logger: false });
    const url = await app.listen({ port: 0, host: '127.0.0.1' });
    const abort = new AbortController();
    try {
      const response = await fetch(`${url}/v1/tokens/${mint}/stream`,{ signal: abort.signal });
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      const reader = response.body!.getReader(); const result = await reader.read();
      expect(new TextDecoder().decode(result.value)).toContain('event: snapshot');
      abort.abort(); await reader.cancel().catch(() => {});
    } finally { abort.abort(); await app.close(); }
  });
});
