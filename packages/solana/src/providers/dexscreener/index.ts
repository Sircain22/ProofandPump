import { z } from 'zod';
import Decimal from 'decimal.js';
import type { TokenOverview } from '@proof/shared';
import type { MarketProvider } from '../../providers';
import { fetchJson, type Fetcher } from '../../http';
import { mintSchema } from '../../address';

const token = z.object({ address: mintSchema, name: z.string(), symbol: z.string() });
const amount = z.number().nonnegative().nullable().optional();
export const pairSchema = z.object({
  chainId: z.string(), dexId: z.string(), pairAddress: mintSchema,
  baseToken: token, quoteToken: token,
  priceUsd: z.string().regex(/^\d+(\.\d+)?$/).nullable().optional(),
  marketCap: amount, liquidity: z.object({ usd: amount }).nullable().optional(),
  pairCreatedAt: z.number().int().nonnegative().nullable().optional(),
});
const value = (n: number | null | undefined) => n == null ? null : new Decimal(n).toFixed();
export function normalizePairs(data: z.infer<typeof pairSchema>[], mint: string, now = Date.now()): TokenOverview | null {
  const pairs = data.filter(p => p.chainId === 'solana' && (p.baseToken.address === mint || p.quoteToken.address === mint))
    .sort((a,b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  const pair = pairs.find(p => p.baseToken.address === mint) ?? pairs[0];
  if (!pair) return null;
  const isBase = pair.baseToken.address === mint;
  const identity = isBase ? pair.baseToken : pair.quoteToken;
  return { mint, name: identity.name, symbol: identity.symbol,
    priceUsd: isBase ? pair.priceUsd ?? null : null,
    marketCapUsd: isBase ? value(pair.marketCap) : null,
    liquidityUsd: value(pair.liquidity?.usd), pairCreatedAt: pair.pairCreatedAt ?? null,
    pairAddress: pair.pairAddress, pools: pairs.slice(0,3).map(p => ({ address: p.pairAddress, exchange: p.dexId })),
    observedAt: now, source: 'DexScreener' };
}
export class DexScreenerProvider implements MarketProvider {
  constructor(private fetcher: Fetcher = fetch) {}
  async resolve(mint: string) {
    const data = await fetchJson(this.fetcher, `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`, z.array(pairSchema), 'DexScreener');
    return normalizePairs(data, mint);
  }
}
