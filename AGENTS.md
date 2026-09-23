# Engineering rules

- Keep UI, service orchestration, provider decoding, analytics, and storage separate.
- Consult current official provider documentation before changing API integrations.
- Validate untrusted inputs and provider responses; return structured, actionable errors.
- Preserve identifiers and exact raw amounts. Unknown data is null, never fabricated.
- Keep secrets server-side and out of logs, fixtures, Git, and public environment variables.
- Make data coverage and degraded states visible; never present fixtures as live data.
- Bound caches, polling, concurrency, and stream buffers. Release resources on disconnect.
- Use pnpm, strict TypeScript, ESLint, Prettier, and meaningful Vitest tests.
- Verify typecheck, lint, tests, and production build after substantive changes.
- The application is read-only analytics; do not add custody or trading.
