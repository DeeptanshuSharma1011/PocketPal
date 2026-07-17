import { createClient } from '@supabase/supabase-js';

let rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';

// Dynamically sanitize the Supabase URL in case it includes PostgREST '/rest/v1' path or trailing slash
if (rawSupabaseUrl.includes('/rest/v1')) {
  rawSupabaseUrl = rawSupabaseUrl.replace('/rest/v1', '');
}
if (rawSupabaseUrl.endsWith('/')) {
  rawSupabaseUrl = rawSupabaseUrl.slice(0, -1);
}

const supabaseUrl = rawSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTcyMzg5OTk5OSwiZXhwIjoyMDM5NDU5OTk5fQ.placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
