import { describe, expect, it, vi } from 'vitest';
import { DexScreenerProvider, normalizePairs, pairSchema } from './index';
const mint = 'So11111111111111111111111111111111111111112';
const quote = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const pair = pairSchema.parse({ chainId: 'solana', dexId: 'raydium', pairAddress: '11111111111111111111111111111111',
  baseToken: { address: mint, name: 'Wrapped SOL', symbol: 'SOL' }, quoteToken: { address: quote, name: 'USD Coin', symbol: 'USDC' },
  priceUsd: '100', marketCap: 1000000, liquidity: { usd: 3000 }, pairCreatedAt: 1700000000000 });
describe('market normalization', () => {
  it('selects the most liquid matching base pair and preserves selected-pool liquidity', () => {
    expect(normalizePairs([pair, { ...pair, liquidity: { usd: 9000 }, priceUsd: '102' }],mint,42)).toMatchObject({ priceUsd: '102', liquidityUsd: '9000', observedAt: 42 });
  });
  it('never assigns base price or market cap to quote-token queries', () => {
    expect(normalizePairs([pair],quote)).toMatchObject({ name: 'USD Coin', priceUsd: null, marketCapUsd: null });
  });
  it('preserves missing metrics and does not substitute FDV for market cap', () => {
    const sparse = pairSchema.parse({ ...pair, marketCap: undefined, liquidity: undefined, fdv: 99999 });
    expect(normalizePairs([sparse],mint)).toMatchObject({ marketCapUsd: null, liquidityUsd: null });
    expect(normalizePairs([],mint)).toBeNull();
  });
  it('validates external data and returns safe provider errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'));
    await expect(new DexScreenerProvider(fetcher).resolve(mint)).rejects.toMatchObject({ code: 'PROVIDER_SCHEMA' });
    fetcher.mockResolvedValue(new Response('',{ status: 429 }));
    await expect(new DexScreenerProvider(fetcher).resolve(mint)).rejects.toMatchObject({ code: 'PROVIDER_RATE_LIMIT' });
  });
});
