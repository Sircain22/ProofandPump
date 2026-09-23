import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Proof & Pump | Solana intelligence', description: 'Don’t trust the pump. Prove it. Read-only Solana token intelligence and live activity.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
