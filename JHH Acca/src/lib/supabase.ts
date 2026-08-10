import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

if (import.meta.env.DEV) {
  // console access for local smoke-testing only
  ;(window as unknown as Record<string, unknown>).supabase = supabase
}
