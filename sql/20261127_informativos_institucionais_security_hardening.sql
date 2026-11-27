-- MatrixIA / Supabase
-- A função de trigger não deve ser exposta como RPC.
REVOKE ALL ON FUNCTION public.municipal_internal_notices_touch_updated_at() FROM PUBLIC, anon, authenticated;
