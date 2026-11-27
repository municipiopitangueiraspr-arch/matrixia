-- MatrixIA / Supabase
-- Corrige a expressão de extensão de arquivo para aceitar PNG, JPG, JPEG e WEBP.
BEGIN;
ALTER TABLE public.municipal_internal_notices DROP CONSTRAINT IF EXISTS municipal_internal_notices_image_path_check;
ALTER TABLE public.municipal_internal_notices ADD CONSTRAINT municipal_internal_notices_image_path_check CHECK (image_path ~ '^notices/[A-Za-z0-9][A-Za-z0-9_./-]*\.(png|jpe?g|webp)$');
-- A função de gravação foi recriada no Supabase com a mesma validação corrigida.
COMMIT;
