import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.warn(
    '10 Pins: Supabase is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local. Sign-in will not work until then.',
  );
}

// Same Supabase project as The Acca and Milky Bay; everything 10 Pins owns
// lives in the `tenpins` schema. Auth (GoTrue) is project-scoped, so accounts
// are shared across the three apps.
export const supabase = createClient<Database, 'tenpins'>(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  { db: { schema: 'tenpins' } },
);

// Dev-only console access for testing (never in production builds).
// The window guard keeps Node-side unit tests importable.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { supabase: typeof supabase }).supabase = supabase;
}
