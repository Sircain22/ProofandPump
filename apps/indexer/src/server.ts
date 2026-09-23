import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PassThrough } from 'node:stream';
import { AppError, asAppError } from '@proof/shared';
import { DexScreenerProvider, HeliusProvider, mintSchema } from '@proof/solana';
import { TokenService } from './service';

export async function buildServer(options: { key?: string; service?: TokenService; logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? true, requestTimeout: 30000, bodyLimit: 4096 });
  const helius = options.key ? new HeliusProvider(options.key) : undefined;
  const service = options.service ?? new TokenService(new DexScreenerProvider(), helius, helius, undefined,
    issue => app.log.warn({ code: issue.code, message: issue.message }, 'Provider issue'));
  const streams = new Set<PassThrough>();
  await app.register(cors, { origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], methods: ['GET'] });
  await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
  app.setErrorHandler((error, request, reply) => {
    const mapped = error instanceof AppError ? error :
      (error as { statusCode?: number }).statusCode === 429 ? new AppError('RATE_LIMIT', 'Too many requests. Retry in a minute.', 429) : asAppError(error);
    request.log.warn({ code: mapped.code }, 'Request failed');
    void reply.status(mapped.status).send({ error: mapped.toIssue() });
  });
  app.get('/health', async () => ({ status: 'ok', activityConfigured: Boolean(options.key), service: 'proof-and-pump-indexer' }));
  function mintFrom(params: unknown) {
    const result = mintSchema.safeParse((params as { mint?: string }).mint);
    if (!result.success) throw new AppError('INVALID_MINT', 'Enter a valid 32-byte Solana mint address.', 400, false);
    return result.data;
  }
  app.get('/v1/tokens/:mint', async request => service.get(mintFrom(request.params)));
  app.get('/v1/tokens/:mint/stream', async (request,reply) => {
    const mint = mintFrom(request.params);
    await service.get(mint);
    if (streams.size >= 50) throw new AppError('CAPACITY', 'Too many open streams.', 503);
    const stream = new PassThrough({ highWaterMark: 256 * 1024 });
    streams.add(stream);
    let unsubscribe: (() => void) | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const cleanup = () => { unsubscribe?.(); if (heartbeat) clearInterval(heartbeat); streams.delete(stream); stream.destroy(); };
    request.raw.once('aborted', cleanup);
    reply.raw.once('close', cleanup);
    stream.once('close', () => { unsubscribe?.(); if (heartbeat) clearInterval(heartbeat); streams.delete(stream); });
    try {
      unsubscribe = await service.subscribe(mint, snapshot => {
        if (stream.destroyed) return;
        if (stream.writableLength > 512 * 1024) { stream.destroy(); return; }
        stream.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
      });
      if (stream.destroyed) { cleanup(); return reply; }
      heartbeat = setInterval(() => { if (!stream.destroyed) stream.write(': heartbeat\n\n'); },15000);
      reply.headers({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
      return reply.send(stream);
    } catch (error) { cleanup(); throw error; }
  });
  app.addHook('preClose', async () => { service.close(); for (const stream of streams) stream.destroy(); });
  return app;
}
