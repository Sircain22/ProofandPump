'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { issueSchema, snapshotSchema, type Snapshot } from '@proof/shared';

const base = (process.env.NEXT_PUBLIC_INDEXER_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export function useToken() {
  const [snapshot,setSnapshot] = useState<Snapshot | null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [connection,setConnection] = useState('idle');
  const [service,setService] = useState('Checking indexer');
  const stream = useRef<EventSource | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${base}/health`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) })
      .then(r => { setService(r.ok ? 'Indexer connected' : 'Indexer unavailable'); })
      .catch(() => { if (!controller.signal.aborted) setService('Indexer offline'); });
    return () => { controller.abort(); request.current?.abort(); stream.current?.close(); };
  }, []);
  const analyze = useCallback(async (value: string) => {
    const current = ++generation.current;
    request.current?.abort(); stream.current?.close(); stream.current = null;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(null); setSnapshot(null); setConnection('connecting');
    try {
      const response = await fetch(`${base}/v1/tokens/${encodeURIComponent(value.trim())}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const parsed = issueSchema.safeParse((data as { error?: unknown })?.error);
        throw new Error(parsed.success ? parsed.data.message : 'The indexer could not complete this lookup.');
      }
      const next = snapshotSchema.parse(data);
      if (current !== generation.current) return;
      setSnapshot(next); setService('Indexer connected');
      const source = new EventSource(`${base}/v1/tokens/${next.token.mint}/stream`);
      stream.current = source;
      source.onopen = () => { if (current === generation.current) setConnection('connected'); };
      source.addEventListener('snapshot', (event: MessageEvent<string>) => {
        if (current !== generation.current) return;
        try {
          const update = snapshotSchema.parse(JSON.parse(event.data));
          if (update.token.mint !== next.token.mint) throw new Error('Unexpected token');
          setSnapshot(update); setConnection('connected'); setError(null);
        } catch { source.close(); setConnection('error'); setError('An invalid live update was received. Analyze again to reconnect.'); }
      });
      source.onerror = () => { if (current === generation.current) setConnection('reconnecting'); };
    } catch (failure) {
      if (current !== generation.current || controller.signal.aborted) return;
      setError(failure instanceof Error && failure.name === 'Error' ? failure.message : 'Cannot reach the indexer or provider. Check that both services are running and try again.');
      setConnection('error');
    } finally { if (current === generation.current) setLoading(false); }
  }, []);
  return { snapshot,loading,error,connection,service,analyze };
}
