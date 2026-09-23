import { z } from 'zod';
import type { Trade } from '@proof/shared';
import { mintSchema } from '../../address';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
const rawAmount = z.string().max(100).regex(/^-?\d+$/);
const tokenLeg = z.object({ userAccount: mintSchema, mint: mintSchema,
  rawTokenAmount: z.object({ tokenAmount: rawAmount, decimals: z.number().int().min(0).max(255) }) });
const nativeLeg = z.object({ account: mintSchema, amount: z.union([rawAmount, z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).transform(String)]) });
export const enhancedSchema = z.object({
  signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/),
  slot: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  timestamp: z.number().int().positive().max(8640000000000),
  type: z.string(), source: z.string(), transactionError: z.unknown().optional(),
  events: z.object({ swap: z.object({
    tokenInputs: z.array(tokenLeg).nullish(), tokenOutputs: z.array(tokenLeg).nullish(),
    nativeInput: nativeLeg.nullish(), nativeOutput: nativeLeg.nullish(),
  }).nullish() }).nullish(),
});
type Leg = { wallet: string; mint: string; raw: bigint; decimals: number };
export function scaleAmount(raw: bigint, decimals: number): string {
  const text = raw.toString().padStart(decimals + 1, '0');
  if (!decimals) return text;
  return `${text.slice(0, -decimals)}.${text.slice(-decimals)}`.replace(/\.?0+$/, '');
}
function legs(tokens: z.infer<typeof tokenLeg>[] | null | undefined, native: z.infer<typeof nativeLeg> | null | undefined): Leg[] {
  const result = (tokens ?? []).map(t => ({ wallet: t.userAccount, mint: t.mint,
    raw: BigInt(t.rawTokenAmount.tokenAmount), decimals: t.rawTokenAmount.decimals }));
  if (native) result.push({ wallet: native.account, mint: SOL_MINT, raw: BigInt(native.amount), decimals: 9 });
  return result.map(l => ({ ...l, raw: l.raw < 0n ? -l.raw : l.raw })).filter(l => l.raw > 0n);
}
function aggregate(items: Leg[]): Leg | null {
  const first = items[0];
  if (!first || items.some(l => l.mint !== first.mint || l.wallet !== first.wallet || l.decimals !== first.decimals)) return null;
  return { ...first, raw: items.reduce((sum,l) => sum + l.raw, 0n) };
}
export function normalizeSwap(raw: unknown, mint: string): Trade | null {
  const parsed = enhancedSchema.safeParse(raw);
  if (!parsed.success) return null;
  const tx = parsed.data;
  if (tx.type !== 'SWAP' || tx.transactionError != null || !tx.events?.swap) return null;
  const swap = tx.events.swap;
  // Some decoders report both native and wrapped SOL for the same leg. Do not double count.
  if ((swap.nativeInput && swap.tokenInputs?.some(l => l.mint === SOL_MINT)) ||
      (swap.nativeOutput && swap.tokenOutputs?.some(l => l.mint === SOL_MINT))) return null;
  const input = aggregate(legs(swap.tokenInputs, swap.nativeInput));
  const output = aggregate(legs(swap.tokenOutputs, swap.nativeOutput));
  // Same-mint round trips, multiple recipients/assets and unknown traders are ambiguous.
  if (!input || !output || input.mint === output.mint || input.wallet !== output.wallet) return null;
  const side = output.mint === mint ? 'BUY' : input.mint === mint ? 'SELL' : null;
  if (!side) return null;
  const token = side === 'BUY' ? output : input;
  const quote = side === 'BUY' ? input : output;
  return { id: `${tx.signature}:${mint}`, signature: tx.signature, slot: tx.slot,
    timestamp: tx.timestamp * 1000, wallet: token.wallet, tokenMint: mint, side,
    tokenAmount: scaleAmount(token.raw, token.decimals), quoteMint: quote.mint,
    quoteAmount: scaleAmount(quote.raw, quote.decimals), rawTokenAmount: token.raw.toString(),
    rawQuoteAmount: quote.raw.toString(), tokenDecimals: token.decimals, quoteDecimals: quote.decimals,
    usdValue: null, tokenPriceUsd: null, marketCapAtTrade: null, source: `helius:${tx.source}` };
}
