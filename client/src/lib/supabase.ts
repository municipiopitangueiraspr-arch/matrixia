import { createClient } from "@supabase/supabase-js";

// These are public browser values. GitHub Actions variables can override them,
// while the fallback keeps the static GitHub Pages build functional out of the box.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://ccxtruvqrmnhfmefubnd.supabase.co";
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? "sb_publishable_LZrcUzst-zoSbG-iLQQJeQ_Sw14xFlp";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
