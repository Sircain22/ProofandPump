import { describe, expect, it } from 'vitest';
import { normalizeSwap, scaleAmount, SOL_MINT } from './normalize';
const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const wallet = '11111111111111111111111111111111';
const leg = (amount = '1000000') => ({ userAccount: wallet, mint, rawTokenAmount: { tokenAmount: amount, decimals: 6 } });
function fixture() { return { signature: '3'.repeat(88), slot: 100, timestamp: 1700000000, type: 'SWAP', source: 'JUPITER', feePayer: SOL_MINT,
  transactionError: null, events: { swap: { tokenInputs: [] as ReturnType<typeof leg>[], tokenOutputs: [leg()],
    nativeInput: { account: wallet, amount: '1000000000' }, nativeOutput: null as { account: string; amount: string } | null,
    innerSwaps: [{ arbitrary: 'route data must not become duplicate trades' }] } } }; }
describe('swap normalization', () => {
  it('classifies a buy from aggregate legs and preserves the trader instead of fee payer', () => {
    const trade = normalizeSwap(fixture(),mint);
    expect(trade).toMatchObject({ side: 'BUY', tokenAmount: '1', quoteAmount: '1', quoteMint: SOL_MINT, wallet,
      slot: 100, timestamp: 1700000000000, usdValue: null, marketCapAtTrade: null });
  });
  it('classifies a sell relative to the requested mint', () => {
    expect(normalizeSwap(fixture(),SOL_MINT)).toMatchObject({ side: 'SELL', tokenAmount: '1', quoteMint: mint });
  });
  it('preserves amounts larger than Number.MAX_SAFE_INTEGER', () => {
    const tx = fixture(); tx.events.swap.tokenOutputs = [leg('900719925474099312345')];
    expect(normalizeSwap(tx,mint)).toMatchObject({ tokenAmount: '900719925474099.312345', rawTokenAmount: '900719925474099312345' });
    expect(scaleAmount(1n,9)).toBe('0.000000001'); expect(scaleAmount(100n,0)).toBe('100');
  });
  it('combines split outputs for the same wallet/mint', () => {
    const tx = fixture(); tx.events.swap.tokenOutputs.push(leg('2000000'));
    expect(normalizeSwap(tx,mint)?.tokenAmount).toBe('3');
  });
  it('rejects failed transactions, transfers, and undecoded records', () => {
    expect(normalizeSwap({ ...fixture(), transactionError: { error: 'failed' } },mint)).toBeNull();
    expect(normalizeSwap({ ...fixture(), type: 'TRANSFER' },mint)).toBeNull();
    expect(normalizeSwap({ ...fixture(), events: {} },mint)).toBeNull();
  });
  it('rejects different recipients, round trips, and multiple input assets', () => {
    const tx = fixture(); tx.events.swap.tokenOutputs[0]!.userAccount = SOL_MINT;
    expect(normalizeSwap(tx,mint)).toBeNull();
    const roundTrip = fixture(); roundTrip.events.swap.tokenOutputs[0]!.mint = SOL_MINT;
    expect(normalizeSwap(roundTrip,SOL_MINT)).toBeNull();
    const multi = fixture(); multi.events.swap.tokenInputs.push(leg());
    expect(normalizeSwap(multi,mint)).toBeNull();
  });
  it('rejects malformed amounts and zero-value swaps', () => {
    const tx = fixture(); tx.events.swap.tokenOutputs = [leg('1e10')]; expect(normalizeSwap(tx,mint)).toBeNull();
    tx.events.swap.tokenOutputs = [leg('0')]; expect(normalizeSwap(tx,mint)).toBeNull();
  });
});
