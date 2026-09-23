# Proof & Pump — Milestone 1

Paste a Solana mint, resolve its market, and inspect a near-real-time trade tape.
The application is read-only. No wallets, trading, accounts, scoring, or payments.

The terminal shows token identity, mint, price, market cap, selected-pool liquidity,
and pair creation time. Missing values remain unavailable, never synthetic zeroes.
BUY and SELL describe the trader's direction relative to the requested mint.

DexScreener market lookup works without credentials. Helius enables decoded swaps.
Without its key, the terminal explicitly reports that the trade feed is disabled.
No simulated trades appear in the application. Test fixtures exist only in tests.

Coverage is a recent sample from up to three most liquid discovered pools, with
mint-address history as a fallback when no pool is known. This is not exhaustive
token history. Unsupported or ambiguous swaps are excluded and counted. Pair age
is not token age. Historical USD values remain null without historical valuation.

Acceptance: valid input → real market data → normalized recent swaps → SSE updates;
helpful invalid-input, missing-key, no-market, reconnecting, and provider-error states;
responsive desktop/mobile UI; typecheck, lint, tests, and production build pass.
