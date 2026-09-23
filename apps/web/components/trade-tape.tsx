import { useState } from 'react';
import type { Snapshot } from '@proof/shared';
import { money, short, utc } from '../lib/format';

export function TradeTape({ snapshot, connection }: { snapshot: Snapshot | null; connection: string }) {
  const [filter,setFilter] = useState('ALL');
  const trades = snapshot?.trades.filter(t => filter === 'ALL' || t.side === filter) ?? [];
  const state = connection === 'reconnecting' ? 'Reconnecting' : snapshot?.feed === 'live' ? 'Polling · 10s' : snapshot?.feed === 'disabled' ? 'Key required' : snapshot?.feed === 'degraded' ? 'Degraded' : snapshot ? 'Connecting' : 'Awaiting token';
  return <section className="panel tape" id="tape" aria-labelledby="tape-title">
    <div className="panel-heading"><div><span className="eyebrow">02 / TRANSACTION FLOW</span><h2 id="tape-title">Live tape <span className="count">{snapshot?.trades.length ?? 0}</span></h2></div><span className={`feed-state ${snapshot?.feed === 'live' && connection === 'connected' ? 'positive' : ''}`}><i />{state}</span></div>
    <div className="tape-toolbar"><div className="filters" aria-label="Filter trades">{['ALL','BUY','SELL'].map(item => <button key={item} aria-pressed={filter === item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'ALL' ? 'All activity' : item === 'BUY' ? 'Buys' : 'Sells'}</button>)}</div><span className="mono muted">FINALIZED / UTC</span></div>
    <div className="table-scroll"><table><thead><tr><th>TIME</th><th>SIDE</th><th>USD VALUE</th><th>TOKEN AMOUNT</th><th>QUOTE AMOUNT</th><th>WALLET</th><th>TX ↗</th></tr></thead><tbody>{trades.map(t => <tr key={t.id}>
      <td className="mono">{utc(t.timestamp)}</td><td><span className={`side ${t.side.toLowerCase()}`}>{t.side === 'BUY' ? '↗' : '↘'} {t.side}</span></td>
      <td title="Historical USD valuation is unavailable">{money(t.usdValue)}</td><td className="mono amount" title={t.tokenAmount}>{t.tokenAmount}</td>
      <td className="mono amount" title={`${t.quoteAmount} ${t.quoteMint}`}>{t.quoteAmount} <a href={`https://solscan.io/token/${t.quoteMint}`} target="_blank" rel="noreferrer">{short(t.quoteMint)}</a></td>
      <td className="mono"><a href={`https://solscan.io/account/${t.wallet}`} target="_blank" rel="noreferrer">{short(t.wallet)} ↗</a></td>
      <td><a href={`https://solscan.io/tx/${t.signature}`} target="_blank" rel="noreferrer" aria-label={`View transaction ${t.signature}`}>↗</a></td>
    </tr>)}</tbody></table></div>
    {!trades.length && <div className="tape-empty"><div className="empty-symbol" aria-hidden="true">▥</div><h3>{!snapshot ? 'The evidence starts here.' : snapshot.feed === 'disabled' ? 'Connect your trade data.' : snapshot.feed === 'connecting' ? 'Reading recent activity…' : 'No matching swaps in this sample.'}</h3><p>{!snapshot ? 'Analyze a token to inspect its recent on-chain activity.' : snapshot.feed === 'disabled' ? 'Market data is available. Add a Helius key to enable the live tape.' : 'Only successfully decoded, unambiguous swaps appear here.'}</p></div>}
    <div className="panel-foot"><span>Latest {snapshot?.trades.length ?? 0} normalized trades · maximum 200</span><span>{snapshot?.checkedAt ? `Checked ${utc(snapshot.checkedAt)} UTC` : 'No activity checked yet'}</span></div>
  </section>;
}
