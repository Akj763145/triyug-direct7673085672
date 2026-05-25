import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase' // You can generate this later

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// We only initialize the client if the URL and key are provided.
// This prevents errors in the preview environment, allowing fallback to mock data until configured.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null
