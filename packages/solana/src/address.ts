import bs58 from 'bs58';
import { z } from 'zod';
export function isSolanaAddress(value: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  try { return bs58.decode(value).length === 32; } catch { return false; }
}
export const mintSchema = z.string().trim().refine(isSolanaAddress, 'Enter a valid 32-byte Solana mint address.');
