import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';
import { getSession, clearSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TargetMark from '@/components/TargetMark';
import './globals.css';

const display = Archivo({ subsets: ['latin'], variable: '--font-display', weight: ['700', '800'] });
const body = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600'] });
const num = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-num', weight: ['500'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://spot-on-liart.vercel.app'),
  title: 'Spot On — call the table',
  description:
    'Predict the final league table with your mates. One point for every position you are off. Lowest score wins.',
  icons: {
    icon: '/spot-on-favicon.svg',
    apple: '/spot-on-app-icon.svg',
  },
  openGraph: {
    siteName: 'Spot On',
    title: 'Spot On — call the table',
    description:
      'Predict the final league table with your mates. One point for every position you are off. Lowest score wins.',
    images: [{ url: '/api/og/default', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};

async function logout() {
  'use server';
  await clearSessionCookie();
  redirect('/');
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${num.variable}`}>
      <body>
        <header className="border-b border-border bg-surface/70 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <TargetMark className="text-primary" size={20} />
              {/* brand kit: Archivo 800, uppercase, -0.04em, hairspace between the words */}
              <span className="font-display text-lg font-extrabold uppercase tracking-[-0.04em]">
                Spot{' '}On
              </span>
            </Link>
            {session ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted">{session.displayName}</span>
                <form action={logout}>
                  <button className="rounded-md border border-border px-3 py-1.5 text-muted hover:text-ink hover:border-muted transition-colors">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Link href="/login" className="rounded-md px-3 py-1.5 text-muted hover:text-ink transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-ink hover:brightness-110 transition"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 pb-8 pt-4 text-xs text-muted">
          Spot On — predict the table, live with the consequences. Football data via football-data.org.
        </footer>
      </body>
    </html>
  );
}
