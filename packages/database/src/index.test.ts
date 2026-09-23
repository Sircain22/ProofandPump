import { expect, it } from 'vitest';
import type { Trade } from '@proof/shared';
import { MemoryTradeRepository } from './index';
it('deduplicates overlapping pages and bounds the tape by newest time', () => {
  const repository = new MemoryTradeRepository(2);
  const trade: Trade = { id: 'a', signature: 'a', slot: 1, timestamp: 10, wallet: 'wallet', tokenMint: 'mint', side: 'BUY',
    tokenAmount: '1', quoteAmount: '2', quoteMint: 'quote', usdValue: null, tokenPriceUsd: null, marketCapAtTrade: null,
    rawTokenAmount: '1', rawQuoteAmount: '2', tokenDecimals: 0, quoteDecimals: 0, source: 'fixture' };
  repository.merge('mint',[trade]);
  expect(repository.merge('mint',[trade,{ ...trade, id: 'b', timestamp: 12 },{ ...trade, id: 'c', timestamp: 11 },
    { ...trade, id: 'foreign', tokenMint: 'other', timestamp: 20 }]).map(t=>t.id)).toEqual(['b','c']);
  repository.clear('mint'); expect(repository.merge('mint',[])).toEqual([]);
});
