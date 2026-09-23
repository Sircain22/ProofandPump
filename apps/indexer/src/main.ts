import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { buildServer } from './server';

const env = resolve(import.meta.dirname, '../../../.env');
if (existsSync(env)) loadEnvFile(env);
const app = await buildServer({ key: process.env.HELIUS_API_KEY?.trim() || undefined });
try { await app.listen({ port: 4000, host: '127.0.0.1' }); }
catch { app.log.error('Indexer failed to start. Check whether port 4000 is in use.'); process.exitCode = 1; }
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void app.close().catch(() => { process.exitCode = 1; }); });
}
