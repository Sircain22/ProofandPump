import { z } from 'zod';
import { AppError, type TokenOverview, type Trade } from '@proof/shared';
import type { MarketProvider, ActivityProvider, ActivityBatch } from '../../providers';
import { fetchJson, type Fetcher } from '../../http';
import { normalizeSwap } from './normalize';

const envelope = z.object({ signature: z.string().min(1) }).passthrough();
const assetResponse = z.object({
  error: z.object({ code: z.number(), message: z.string() }).optional(),
  result: z.object({ id: z.string(), interface: z.string(),
    content: z.object({ metadata: z.object({ name: z.string().optional(), symbol: z.string().optional() }) }).optional(),
  }).optional(),
});
export class HeliusProvider implements MarketProvider, ActivityProvider {
  constructor(private key: string, private fetcher: Fetcher = fetch) {}
  async resolve(mint: string): Promise<TokenOverview | null> {
    const url = new URL('https://mainnet.helius-rpc.com/');
    url.searchParams.set('api-key', this.key);
    const data = await fetchJson(this.fetcher, url, assetResponse, 'Helius', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'token', method: 'getAsset', params: { id: mint } }),
    });
    if (data.error?.code === -32004) return null;
    if (data.error) throw new AppError('PROVIDER_RPC', `Helius could not resolve token metadata (code ${data.error.code}).`);
    const asset = data.result;
    if (!asset) throw new AppError('PROVIDER_SCHEMA', 'Helius returned no asset result.');
    if (asset.id !== mint || !['FungibleToken', 'FungibleAsset'].includes(asset.interface)) return null;
    return { mint, name: asset.content?.metadata.name ?? 'Unknown token', symbol: asset.content?.metadata.symbol ?? 'TOKEN',
      priceUsd: null, marketCapUsd: null, liquidityUsd: null, pairCreatedAt: null, pairAddress: null,
      pools: [], observedAt: Date.now(), source: 'Helius DAS' };
  }
  async recent(token: TokenOverview, previous: Record<string, string>): Promise<ActivityBatch> {
    const addresses = token.pools.length ? token.pools.map(p => p.address).slice(0,3) : [token.mint];
    const heads: Record<string, string> = {};
    const trades = new Map<string, Trade>();
    let skipped = 0;
    let truncated = false;
    for (const address of addresses) {
      let before: string | undefined;
      const oldHead = previous[address];
      const pageLimit = oldHead ? 3 : 1;
      for (let page = 0; page < pageLimit; page++) {
        const url = new URL(`https://mainnet.helius-rpc.com/v0/addresses/${address}/transactions`);
        url.searchParams.set('api-key', this.key);
        url.searchParams.set('limit', '100');
        url.searchParams.set('commitment', 'finalized');
        url.searchParams.set('sort-order', 'desc');
        if (before) url.searchParams.set('before-signature', before);
        // Avoid runtime type filtering's search-period errors; classify locally.
        const records = await fetchJson(this.fetcher, url, z.array(envelope), 'Helius');
        if (page === 0 && records[0]) heads[address] = records[0].signature;
        let reached = false;
        for (const record of records) {
          if (record.signature === oldHead) reached = true;
          const trade = normalizeSwap(record, token.mint);
          if (trade) trades.set(trade.id, trade);
          else if (record.type === 'SWAP') skipped++;
        }
        if (reached || records.length < 100) break;
        if (oldHead && page === pageLimit - 1) truncated = true;
        before = records.at(-1)?.signature;
      }
      if (!heads[address] && oldHead) heads[address] = oldHead;
    }
    return { trades: [...trades.values()], heads, skipped, truncated };
  }
}
