import type { Trade } from '@proof/shared';
export function summarizeTrades(trades: Trade[]) {
  return { buys: trades.filter(t => t.side === 'BUY').length,
    sells: trades.filter(t => t.side === 'SELL').length,
    wallets: new Set(trades.map(t => t.wallet)).size };
}
