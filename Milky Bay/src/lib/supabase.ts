import { createClient } from '@supabase/supabase-js'

// Same Supabase project as The Acca; everything lives in the milkybay schema.
// Auth (GoTrue) is project-scoped, so one login works in both apps.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: 'milkybay' } },
)

if (import.meta.env.DEV) {
  // console access for local smoke-testing only
  ;(window as unknown as Record<string, unknown>).supabase = supabase
}
