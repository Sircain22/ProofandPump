import { z } from 'zod';

export const decimalSchema = z.string().regex(/^\d+(\.\d+)?$/);
const nullableDecimal = decimalSchema.nullable();
export const tradeSchema = z.object({
  id: z.string(), signature: z.string(), slot: z.number().int().nonnegative(),
  timestamp: z.number().int().nonnegative(), wallet: z.string(), tokenMint: z.string(),
  side: z.enum(['BUY', 'SELL']), tokenAmount: decimalSchema, quoteMint: z.string(),
  quoteAmount: decimalSchema, usdValue: nullableDecimal, tokenPriceUsd: nullableDecimal,
  marketCapAtTrade: nullableDecimal, source: z.string(),
  rawTokenAmount: z.string().regex(/^\d+$/), rawQuoteAmount: z.string().regex(/^\d+$/),
  tokenDecimals: z.number().int().min(0).max(255), quoteDecimals: z.number().int().min(0).max(255),
});
export type Trade = z.infer<typeof tradeSchema>;
export const tokenSchema = z.object({
  mint: z.string(), name: z.string(), symbol: z.string(),
  priceUsd: nullableDecimal, marketCapUsd: nullableDecimal, liquidityUsd: nullableDecimal,
  pairCreatedAt: z.number().nullable(), pairAddress: z.string().nullable(),
  pools: z.array(z.object({ address: z.string(), exchange: z.string() })),
  observedAt: z.number(), source: z.string(),
});
export type TokenOverview = z.infer<typeof tokenSchema>;
export const issueSchema = z.object({ code: z.string(), message: z.string(), retryable: z.boolean() });
export type Issue = z.infer<typeof issueSchema>;
export const snapshotSchema = z.object({
  token: tokenSchema, trades: z.array(tradeSchema),
  feed: z.enum(['connecting', 'live', 'disabled', 'degraded']),
  checkedAt: z.number().nullable(), issues: z.array(issueSchema), skipped: z.number(),
  stats: z.object({ buys: z.number(), sells: z.number(), wallets: z.number() }),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 502, public retryable = true) {
    super(message); this.name = 'AppError';
  }
  toIssue(): Issue { return { code: this.code, message: this.message, retryable: this.retryable }; }
}
export function asAppError(error: unknown): AppError {
  return error instanceof AppError ? error : new AppError('INTERNAL_ERROR', 'An unexpected service error occurred.', 500);
}
