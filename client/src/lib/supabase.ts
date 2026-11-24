import { createClient } from "@supabase/supabase-js";

// Valores publicáveis do navegador. Variáveis de build podem substituí-los;
// o fallback garante que o Pages continue funcional mesmo sem Actions Variables.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || "https://ccxtruvqrmnhfmefubnd.supabase.co";
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || "sb_publishable_LZrcUzst-zoSbG-iLQQJeQ_Sw14xFlp";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
