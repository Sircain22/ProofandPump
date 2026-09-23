import { AppError, asAppError, type Issue, type Snapshot } from '@proof/shared';
import { summarizeTrades } from '@proof/analytics';
import { MemoryTradeRepository, type TradeRepository } from '@proof/database';
import type { ActivityProvider, MarketProvider } from '@proof/solana';

type Listener = (snapshot: Snapshot) => void;
type Entry = { snapshot: Snapshot; heads: Record<string,string>; listeners: Set<Listener>;
  timer?: ReturnType<typeof setTimeout>; running: boolean; touched: number; failures: number };
const keyIssue: Issue = { code: 'HELIUS_KEY_MISSING', message: 'Live trades need a Helius API key. Add HELIUS_API_KEY to the root .env file and restart the indexer.', retryable: false };
export class TokenService {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<Entry>>();
  private closed = false;
  constructor(private market: MarketProvider, private activity?: ActivityProvider,
    private metadata?: MarketProvider, private repository: TradeRepository = new MemoryTradeRepository(),
    private report: (issue: Issue) => void = () => {}, private interval = 10000) {}

  async get(mint: string): Promise<Snapshot> { return (await this.entry(mint)).snapshot; }
  private async entry(mint: string): Promise<Entry> {
    if (this.closed) throw new AppError('SERVICE_STOPPING', 'The indexer is restarting.', 503);
    const existing = this.entries.get(mint);
    if (existing) { existing.touched = Date.now(); return existing; }
    const pending = this.pending.get(mint);
    if (pending) return pending;
    if (this.entries.size + this.pending.size >= 10) {
      const idle = [...this.entries].filter(([,e]) => !e.listeners.size && !e.running).sort((a,b) => a[1].touched - b[1].touched)[0];
      if (!idle) throw new AppError('CAPACITY', 'All local token sessions are busy. Close another feed and retry.', 503);
      this.entries.delete(idle[0]); this.repository.clear(idle[0]);
    }
    const work = this.create(mint);
    this.pending.set(mint, work);
    try { return await work; } finally { this.pending.delete(mint); }
  }
  private async create(mint: string): Promise<Entry> {
    const issues: Issue[] = [];
    let token;
    try { token = await this.market.resolve(mint); }
    catch (error) {
      if (!this.metadata) throw error;
      const issue = asAppError(error).toIssue(); issues.push(issue); this.report(issue);
    }
    if (!token && this.metadata) token = await this.metadata.resolve(mint);
    if (!token) throw new AppError('TOKEN_NOT_RESOLVED', 'No indexed token was found for this address. Check that it is a token mint. New or unlisted tokens may not be indexed yet.', 404, false);
    if (!this.activity) issues.push(keyIssue);
    const entry: Entry = { snapshot: { token, trades: [], feed: this.activity ? 'connecting' : 'disabled', checkedAt: null,
      issues, skipped: 0, stats: summarizeTrades([]) }, heads: {}, listeners: new Set(), running: false, touched: Date.now(), failures: 0 };
    if (!this.closed) this.entries.set(mint, entry);
    return entry;
  }
  async subscribe(mint: string, listener: Listener): Promise<() => void> {
    const entry = await this.entry(mint);
    if (entry.listeners.size >= 20) throw new AppError('CAPACITY', 'Too many viewers for this token.', 503);
    entry.listeners.add(listener);
    listener(entry.snapshot);
    if (!entry.timer && !entry.running) void this.poll(entry);
    return () => {
      entry.listeners.delete(listener); entry.touched = Date.now();
      if (!entry.listeners.size && entry.timer) { clearTimeout(entry.timer); entry.timer = undefined; }
    };
  }
  private async poll(entry: Entry) {
    if (this.closed || entry.running || !entry.listeners.size) return;
    entry.running = true; entry.timer = undefined;
    const issues: Issue[] = this.activity ? entry.snapshot.issues.filter(i => i.code === 'COVERAGE_GAP') : [keyIssue];
    try {
      if (Date.now() - entry.snapshot.token.observedAt > 60000) {
        try {
          const refreshed = await this.market.resolve(entry.snapshot.token.mint);
          if (refreshed) entry.snapshot.token = refreshed;
          else issues.push({ code: 'MARKET_UNAVAILABLE', message: 'No current market snapshot is available; previously observed values are retained.', retryable: true });
        } catch (error) { const issue = asAppError(error).toIssue(); issues.push(issue); this.report(issue); }
      }
      if (this.activity) {
        const batch = await this.activity.recent(entry.snapshot.token, entry.heads);
        if (this.closed) return;
        entry.heads = batch.heads;
        const trades = this.repository.merge(entry.snapshot.token.mint, batch.trades);
        if (batch.truncated && !issues.some(i => i.code === 'COVERAGE_GAP')) issues.push({ code: 'COVERAGE_GAP', message: 'Activity exceeded the polling window. Some trades may be missing from this session.', retryable: false });
        entry.snapshot = { ...entry.snapshot, trades, stats: summarizeTrades(trades), skipped: batch.skipped,
          checkedAt: Date.now(), feed: issues.length ? 'degraded' : 'live', issues };
      } else entry.snapshot = { ...entry.snapshot, feed: 'disabled', issues };
      entry.failures = issues.some(i => i.retryable) ? entry.failures + 1 : 0;
    } catch (error) {
      const issue = asAppError(error).toIssue(); this.report(issue); issues.push(issue);
      entry.snapshot = { ...entry.snapshot, feed: 'degraded', issues }; entry.failures++;
    } finally {
      entry.running = false;
      if (!this.closed) for (const listener of entry.listeners) listener(entry.snapshot);
      if (!this.closed && entry.listeners.size) entry.timer = setTimeout(() => void this.poll(entry),
        Math.min(60000, this.interval * 2 ** Math.min(entry.failures,3)));
    }
  }
  close() {
    this.closed = true;
    for (const [mint,entry] of this.entries) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.listeners.clear(); this.repository.clear(mint);
    }
    this.entries.clear();
  }
}
