import type { Trade } from '@proof/shared';
export interface TradeRepository {
  merge(mint: string, trades: Trade[]): Trade[];
  clear(mint: string): void;
}
export class MemoryTradeRepository implements TradeRepository {
  private entries = new Map<string, Trade[]>();
  constructor(private limit = 200) {}
  merge(mint: string, trades: Trade[]): Trade[] {
    const deduped = new Map((this.entries.get(mint) ?? []).map(t => [t.id, t]));
    for (const trade of trades) if (trade.tokenMint === mint) deduped.set(trade.id, trade);
    const result = [...deduped.values()].sort((a,b) => b.timestamp - a.timestamp || b.slot - a.slot || a.id.localeCompare(b.id)).slice(0,this.limit);
    this.entries.set(mint, result);
    return result;
  }
  clear(mint: string) { this.entries.delete(mint); }
}
