import { createClient } from '@supabase/supabase-js'

const getBuildTimeUrl = () => import.meta.env.VITE_SUPABASE_URL || ''
const getBuildTimeKey = () => import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export let supabase: ReturnType<typeof createClient> | null = null;

export function initializeSupabase(url: string, key: string) {
  if (url && key) {
    try {
      supabase = createClient(url, key);
      console.log("[Supabase] Successfully initialized Supabase client at runtime.");
      return supabase;
    } catch (e) {
      console.error("[Supabase] Error initializing client", e);
    }
  }
  return null;
}

// Initial build-time callback
initializeSupabase(getBuildTimeUrl(), getBuildTimeKey());

// Eagerly fetch the runtime config from the server-side endpoints
if (typeof window !== 'undefined') {
  fetch('/api/config')
    .then(res => {
      if (res.ok) {
        return res.json();
      }
      throw new Error('Server returned non-200 status');
    })
    .then(config => {
      if (config && config.supabaseUrl && config.supabaseAnonKey) {
        initializeSupabase(config.supabaseUrl, config.supabaseAnonKey);
        window.dispatchEvent(new CustomEvent('supabase-initialized'));
      }
    })
    .catch(err => {
      console.warn('[Supabase] Could not fetch runtime config from server, using build-time variables:', err.message);
    });
}
