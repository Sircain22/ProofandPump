export const short = (value: string) => `${value.slice(0,4)}…${value.slice(-4)}`;
export function money(value: string | null | undefined, compact = false) {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
    notation: compact ? 'compact' : 'standard', maximumFractionDigits: n > 0 && n < 0.01 ? 10 : n < 1 ? 6 : 2 }).format(n);
}
export function age(created: number | null | undefined, observed: number | undefined) {
  if (created == null || observed == null) return '—';
  const hours = Math.max(0, Math.floor((observed-created)/3600000));
  return hours >= 24 ? `${Math.floor(hours/24).toLocaleString('en-US')}d ${hours%24}h` : `${hours}h`;
}
export const utc = (timestamp: number) => new Date(timestamp).toISOString().slice(11,19);
