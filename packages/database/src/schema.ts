import { bigint, index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import type { Trade } from '@proof/shared';
export const tokens = pgTable('tokens', {
  mint: text('mint').primaryKey(), name: text('name').notNull(), symbol: text('symbol').notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
});
export const swaps = pgTable('swaps', {
  id: text('id').primaryKey(), signature: text('signature').notNull(),
  tokenMint: text('token_mint').notNull().references(() => tokens.mint),
  wallet: text('wallet').notNull(), slot: bigint('slot', { mode: 'bigint' }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  side: text('side', { enum: ['BUY', 'SELL'] }).notNull(),
  tokenAmount: numeric('token_amount').notNull(), quoteAmount: numeric('quote_amount').notNull(),
  quoteMint: text('quote_mint').notNull(), normalized: jsonb('normalized').$type<Trade>().notNull(),
}, table => [uniqueIndex('swap_signature_mint').on(table.signature, table.tokenMint),
  index('swap_mint_time').on(table.tokenMint, table.timestamp), index('swap_wallet_time').on(table.wallet, table.timestamp)]);
