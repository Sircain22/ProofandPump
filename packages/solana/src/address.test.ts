import { describe, expect, it } from 'vitest';
import { isSolanaAddress, mintSchema } from './address';
describe('Solana addresses', () => {
  it('accepts 32-byte keys including keys with leading zero bytes', () => {
    expect(isSolanaAddress('So11111111111111111111111111111111111111112')).toBe(true);
    expect(isSolanaAddress('11111111111111111111111111111111')).toBe(true);
  });
  it('rejects invalid base58, wrong decoded length, and URLs', () => {
    for (const address of ['', '0'.repeat(44), '1'.repeat(33), 'z'.repeat(44), 'https://solscan.io/token/abc']) expect(isSolanaAddress(address)).toBe(false);
  });
  it('trims clipboard whitespace at the input boundary', () => {
    expect(mintSchema.parse('  So11111111111111111111111111111111111111112\n')).toBe('So11111111111111111111111111111111111111112');
  });
});
