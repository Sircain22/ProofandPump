# Data model

`Trade`: id, signature, slot, timestamp (Unix milliseconds), wallet, tokenMint,
side (BUY/SELL), tokenAmount, quoteMint, quoteAmount, usdValue, tokenPriceUsd,
marketCapAtTrade, source. Amounts and prices are decimal strings. Unknown valuations
are null. Additional rawTokenAmount/rawQuoteAmount integer strings and decimals
preserve exact base units. Source identifies the decoder and exchange.

`TokenOverview`: mint, name, symbol, nullable priceUsd/marketCapUsd/liquidityUsd,
nullable pairCreatedAt (Unix milliseconds), selected pair, observed timestamp,
and pools (address, exchange). Liquidity is for the selected pool, not an aggregate.

`TokenSnapshot`: overview, recent trades, feed state, checked time, coverage warnings,
and skipped-record count. Delivery is a full bounded snapshot; trade IDs are stable.

Minimum PostgreSQL design: tokens keyed by mint; swaps keyed by signature + mint
(aggregate trader-level swaps), indexed by mint/time and wallet/time. Store exact
amounts as PostgreSQL numeric and preserve raw strings/decimals in normalized JSON.
Keep slot as bigint and all external identifiers as text.

Later tables: pools, wallets, transactions, wallet-token positions, token snapshots,
funding edges, creator relationships, holder snapshots, reward distributions.
These need provenance, observation time and chain identifiers; they are not implemented
until a feature requires persistence. Do not infer creator identity from fee payer.
