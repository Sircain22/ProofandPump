import type { TokenOverview, Trade } from '@proof/shared';
export interface MarketProvider { resolve(mint: string): Promise<TokenOverview | null>; }
export interface ActivityBatch {
  trades: Trade[];
  heads: Record<string, string>;
  skipped: number;
  truncated: boolean;
}
export interface ActivityProvider {
  recent(token: TokenOverview, heads: Record<string, string>): Promise<ActivityBatch>;
}
