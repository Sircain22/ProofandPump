'use client';
import { useState, type FormEvent } from 'react';
import { useToken } from '../lib/use-token';
import { age, money, short, utc } from '../lib/format';
import { TradeTape } from './trade-tape';

const example = 'So11111111111111111111111111111111111111112';
export function Terminal() {
  const [mint,setMint] = useState('');
  const { snapshot,loading,error,connection,service,analyze } = useToken();
  const token = snapshot?.token;
  function submit(event: FormEvent) { event.preventDefault(); void analyze(mint); }
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Proof and Pump home"><span className="brand-mark">P<span>↗</span></span><span>PROOF<span className="brand-and"> & </span>PUMP</span></a><div className="topbar-right"><span className="network"><i /> SOLANA MAINNET</span><span className="version">TERMINAL / 01</span></div></header>
    <div className="workspace"><aside className="sidebar"><div className="eyebrow">WORKSPACE</div><nav aria-label="Terminal sections"><a className="active" href="#overview"><span>◈</span> Token explorer <small>01</small></a><a href="#tape"><span>▥</span> Live tape</a><a href="#method"><span>⊕</span> Data coverage</a></nav><div className="sidebar-bottom"><span className="eyebrow">OBSERVE. VERIFY.</span><p>Every token has a story.<br />Start with the evidence.</p><span className="read-only">↗ READ-ONLY ANALYTICS</span></div></aside>
    <main>
      <div className="breadcrumb"><span>WORKSPACE</span><span>/</span><span>TOKEN EXPLORER</span><span className="service-status"><i className={service === 'Indexer connected' ? 'on' : ''} />{service}</span></div>
      <section className="hero" id="overview"><div className="hero-kicker"><span className="small-line" /> SOLANA TOKEN INTELLIGENCE</div><h1>Don’t trust the pump.<br /><span>Prove it.</span></h1><p className="hero-description">Follow the activity. Inspect the trades. See what’s actually on-chain.</p>
        <form onSubmit={submit} className="search-form"><label htmlFor="mint">TOKEN CONTRACT</label><div className="search-box"><span aria-hidden="true" className="search-icon">⌕</span><input id="mint" name="mint" value={mint} onChange={event => setMint(event.target.value)} placeholder="Paste a Solana token mint address" required maxLength={64} autoComplete="off" autoCapitalize="off" spellCheck={false} aria-describedby="mint-help" /><button className="analyze" type="submit" disabled={loading}>{loading ? 'RESOLVING…' : 'ANALYZE TOKEN'} <span>↗</span></button></div></form>
        <div className="search-help" id="mint-help"><span>Any indexed Solana token. No wallet connection needed.</span><button type="button" disabled={loading} onClick={() => { setMint(example); void analyze(example); }}>Try wrapped SOL <span>↗</span></button></div>
      </section>
      {error && <div className="notice error" role="alert"><strong>Lookup interrupted</strong><span>{error}</span></div>}
      {snapshot?.issues.map(issue => <div className="notice" role="status" key={issue.code}><strong>{issue.code === 'HELIUS_KEY_MISSING' ? 'Market data only' : 'Data notice'}</strong><span>{issue.message}</span></div>)}
      {connection === 'reconnecting' && <div className="notice" role="status">Live connection interrupted. Reconnecting automatically; displayed data may be stale.</div>}
      <section className={`panel overview ${loading ? 'loading' : ''}`} aria-labelledby="overview-title" aria-busy={loading}>
        <div className="panel-heading"><div><span className="eyebrow">01 / TOKEN OVERVIEW</span><div className="token-heading"><div className="token-avatar">{token ? token.symbol.slice(0,2).toUpperCase() : '◈'}</div><div><h2 id="overview-title">{token ? token.name : loading ? 'Resolving token…' : 'No token selected'} {token && <span className="symbol">{token.symbol}</span>}</h2><p>{token ? <a className="mono mint-link" href={`https://solscan.io/token/${token.mint}`} title={token.mint} target="_blank" rel="noreferrer">{token.mint} ↗</a> : 'Paste a mint address above to begin your analysis.'}</p></div></div></div><span className="outline-label">{token ? token.source : 'AWAITING INPUT'}</span></div>
        <div className="metrics">{[
          ['PRICE / USD',money(token?.priceUsd),'Selected base-token pair'],
          ['MARKET CAP',money(token?.marketCapUsd,true),'Reported market capitalization'],
          ['POOL LIQUIDITY',money(token?.liquidityUsd,true),'Selected pool · USD'],
          ['PAIR AGE',age(token?.pairCreatedAt,token?.observedAt),token?.pairCreatedAt ? new Date(token.pairCreatedAt).toISOString().slice(0,10) + ' · created UTC' : 'Creation time when available'],
        ].map(([label,value,note]) => <div className="metric" key={label}><span className="eyebrow">{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
      </section>
      <div className="lower-grid"><div className="main-column"><div className="sample-stats"><span className="eyebrow">IN THIS SAMPLE</span><span><i className="buy-dot" /> Buys <b>{snapshot?.stats.buys ?? '—'}</b></span><span><i className="sell-dot" /> Sells <b>{snapshot?.stats.sells ?? '—'}</b></span><span>Unique wallets <b>{snapshot?.stats.wallets ?? '—'}</b></span></div><TradeTape key={token?.mint ?? 'empty'} snapshot={snapshot} connection={connection} /></div>
      <aside className="panel coverage" id="method"><span className="eyebrow">03 / THE FULL CONTEXT</span><h2>Know your data.</h2><p className="coverage-intro">Evidence is only useful when you know what it covers.</p><dl><div><dt>Market source</dt><dd>{token?.source ?? 'DexScreener'}</dd></div><div><dt>Trade source</dt><dd>Helius · decoded swaps</dd></div><div><dt>Tracked pools</dt><dd>{token?.pools.length ?? '—'} <span className="muted">/ up to 3</span></dd></div><div><dt>Market observed</dt><dd>{token ? `${utc(token.observedAt)} UTC` : '—'}</dd></div><div><dt>Skipped swaps</dt><dd>{snapshot?.skipped ?? '—'} <span className="muted">/ last poll</span></dd></div></dl>
        {token?.pools.length ? <div className="pool-list">{token.pools.map(pool => <a key={pool.address} href={`https://solscan.io/account/${pool.address}`} target="_blank" rel="noreferrer"><span>{pool.exchange}</span><span className="mono">{short(pool.address)} ↗</span></a>)}</div> : null}
        <div className="coverage-note"><span>ⓘ</span><p>A recent activity sample, not complete token history. Pair age is not mint age. Historical USD values are unavailable in this milestone.</p></div>
      </aside></div>
      <footer><span>PROOF & PUMP <span className="muted">/ Independent on-chain intelligence</span></span><span>READ THE CHAIN. FIND THE PROOF.</span></footer>
    </main></div>
  </div>;
}
