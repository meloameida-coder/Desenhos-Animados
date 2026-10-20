import { createClient } from '@supabase/supabase-js'

// Publishable key is designed to be exposed in browser applications.
// Row-level security remains responsible for protecting each user's data.
const defaultSupabaseUrl = 'https://mkbvoltdkhmxsuztbjcd.supabase.co'
const defaultPublishableKey = 'sb_publishable_JpA8LMlm4ge0vHjUBo2V2w_Y4Hi-bCh'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || defaultSupabaseUrl
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || defaultPublishableKey

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
