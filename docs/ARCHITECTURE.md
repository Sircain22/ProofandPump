# Architecture

## Boundaries

```text
External JSON → provider validation/decoder → normalized trade
             → bounded in-memory repository → analytics → Fastify REST/SSE → Next.js
```

- `apps/web`: Next.js App Router, React, Tailwind; consumes only internal schemas.
- `apps/indexer`: Fastify API and on-demand shared polling sessions, bound to loopback.
- `packages/shared`: Zod contracts, structured errors, decimal string types.
- `packages/solana`: base58 address validation, provider interfaces, provider adapters.
- `packages/analytics`: pure calculations over normalized trades.
- `packages/database`: repository contract, bounded memory implementation, Drizzle schema.

TypeScript is strict. Blockchain amounts use integer strings, BigInt scaling, and
decimal arithmetic; raw amounts never pass through JavaScript floating point.
Provider-specific response shapes stay inside adapters. Unknown USD valuation and
market cap at trade are null, never calculated from today's token price.

## Persistence decision

Choose Drizzle: explicit PostgreSQL types and indexes, small runtime, transparent SQL.
Milestone 1 needs no durable storage. Its recent tape is a bounded, process-local
cache that is rebuilt from the provider after restart. Ship the repository interface
and minimum token/swap schema, not an unused database connection or migration flow.
Durable ingestion, migrations, cursor storage, and distributed workers are later work.

## Provider strategy

DexScreener resolves pools and market snapshots. Choose the most liquid base-token
pair for pricing; never assign a base token's USD price to the quote token. Preserve
pool identifiers and track up to three pools. If no pair exists, Helius DAS can
resolve fungible metadata. A base58 public key is syntactically valid, not proof
that an account is a token mint; market/DAS evidence establishes token identity.

Helius Enhanced Transactions supplies decoded SWAP events. Poll tracked pool
addresses every 10 seconds while subscribed. Read recent pages with overlap,
deduplicate by signature/mint, and report when bounded pagination cannot reach the
previous head. Use finalized commitment. Inspect aggregate swap legs, not inner
route hops. Never assume the fee payer is the trader. Only unambiguous same-wallet,
single-asset input/output swaps are normalized. Count skipped records.

Enhanced Transactions is currently documented as legacy. It is deliberately isolated
behind `ActivityProvider`, allowing replacement with Parsed Events/LaserStream later.
Do not claim complete DEX coverage. Empty responses and unsupported decodes are visible.

## Live delivery and operational limits

One poller per active mint; SSE sends bounded snapshots for simple reconnection.
No database, key, or browser wallet is required to start. Structured errors cross
the API boundary; logs omit provider URLs and credentials. Native fetch has timeouts.
Market refreshes are cached; polling is sequential with backoff after errors.
Bound active mints, clients, cached trades, and page depth. Release sessions on
disconnect. The local API restricts origins and applies request rate limits.
Production deployment needs authentication/quotas, distributed ingestion, monitoring,
durable replay, and a reverse proxy with SSE buffering disabled.

## Official contracts consulted (2026-09-23)

- [DexScreener API](https://docs.dexscreener.com/api/reference): token-pairs endpoint.
- [Helius address history](https://www.helius.dev/docs/api-reference/enhanced-transactions/gettransactionsbyaddress): paging and swap events.
- [Helius DAS getAsset](https://www.helius.dev/docs/api-reference/das/getasset): fungible metadata.
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).

Package versions are pinned by the pnpm lockfile. Provider fixtures test documented
contracts; a credentialed smoke test is separately required to verify account access.
