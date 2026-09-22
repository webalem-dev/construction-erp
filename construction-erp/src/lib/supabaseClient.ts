import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase' // Make sure this path points to your new supabase.ts file

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Pass the <Database> type here
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
