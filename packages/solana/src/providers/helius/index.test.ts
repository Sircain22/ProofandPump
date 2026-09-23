import { describe, expect, it, vi } from 'vitest';
import type { TokenOverview } from '@proof/shared';
import { HeliusProvider } from './index';
const mint = 'So11111111111111111111111111111111111111112';
const token: TokenOverview = { mint, name: 'SOL', symbol: 'SOL', priceUsd: null, marketCapUsd: null,
  liquidityUsd: null, pairCreatedAt: null, pairAddress: null, pools: [], observedAt: 0, source: 'fixture' };
const records = (prefix: string) => Array.from({ length: 100 },(_,i) => ({ signature: `${prefix}-${i}`, type: 'TRANSFER' }));
describe('Helius adapter', () => {
  it('paginates pool accounts back to the old head with documented parameters', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(records('new')))
      .mockResolvedValueOnce(Response.json([{ signature: 'old-head', type: 'TRANSFER' }]));
    const provider = new HeliusProvider('test-key',fetcher);
    const pool = '11111111111111111111111111111111';
    const batch = await provider.recent({ ...token, pools: [{ address: pool, exchange: 'fixture' }] },{ [pool]: 'old-head' });
    expect(batch).toMatchObject({ heads: { [pool]: 'new-0' }, truncated: false, skipped: 0 });
    const url = new URL(String(fetcher.mock.calls[1]?.[0]));
    expect(url.pathname).toBe(`/v0/addresses/${pool}/transactions`);
    expect(url.searchParams.get('before-signature')).toBe('new-99');
    expect(url.searchParams.get('commitment')).toBe('finalized');
    expect(url.searchParams.has('type')).toBe(false);
  });
  it('bounds high-volume catchup and reports coverage gaps', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(records('new')));
    const batch = await new HeliusProvider('test-key',fetcher).recent(token,{ [mint]: 'missing-old-head' });
    expect(fetcher).toHaveBeenCalledTimes(3); expect(batch.truncated).toBe(true);
  });
  it('does not expose credential-bearing network errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('https://provider/?api-key=secret-value'));
    await expect(new HeliusProvider('secret-value',fetcher).recent(token,{})).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE', message: expect.not.stringContaining('secret-value') });
  });
  it('resolves fungible metadata and rejects NFT identities', async () => {
    const asset = { id: mint, interface: 'FungibleToken', content: { metadata: { name: 'SOL', symbol: 'SOL' } } };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ result: asset }))
      .mockResolvedValueOnce(Response.json({ result: { ...asset, interface: 'V1_NFT' } }));
    const provider = new HeliusProvider('test-key',fetcher);
    expect(await provider.resolve(mint)).toMatchObject({ mint, name: 'SOL', priceUsd: null });
    expect(await provider.resolve(mint)).toBeNull();
  });
});
