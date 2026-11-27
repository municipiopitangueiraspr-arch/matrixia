-- MatrixIA / Supabase
-- Informativos institucionais para o carrossel da apresentação das secretarias.
-- Escrita administrativa por RPC; municipal_user_modules não participa deste fluxo.

BEGIN;

CREATE TABLE IF NOT EXISTS public.municipal_internal_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_path text NOT NULL,
  image_alt text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT municipal_internal_notices_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  CONSTRAINT municipal_internal_notices_body_length CHECK (char_length(body) <= 500),
  CONSTRAINT municipal_internal_notices_alt_length CHECK (char_length(image_alt) BETWEEN 1 AND 180),
  CONSTRAINT municipal_internal_notices_sort_order_check CHECK (sort_order BETWEEN 1 AND 5),
  CONSTRAINT municipal_internal_notices_validity_check CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT municipal_internal_notices_image_path_check CHECK (image_path ~ '^notices/[A-Za-z0-9][A-Za-z0-9_./-]*\.(png|jpe?g|webp)$')
);

COMMENT ON TABLE public.municipal_internal_notices IS 'Informativos institucionais exibidos no carrossel autenticado da apresentação das secretarias.';
COMMENT ON COLUMN public.municipal_internal_notices.image_path IS 'Caminho relativo no bucket público municipal-informativos.';
COMMENT ON COLUMN public.municipal_internal_notices.active IS 'Controle administrativo; a vigência também precisa estar atual para exibição operacional.';

CREATE INDEX IF NOT EXISTS municipal_internal_notices_display_idx
  ON public.municipal_internal_notices (active, valid_from, valid_until, sort_order, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS municipal_internal_notices_active_order_uidx
  ON public.municipal_internal_notices (sort_order)
  WHERE active IS TRUE;

CREATE OR REPLACE FUNCTION public.municipal_internal_notices_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS municipal_internal_notices_touch_updated_at ON public.municipal_internal_notices;
CREATE TRIGGER municipal_internal_notices_touch_updated_at
BEFORE UPDATE ON public.municipal_internal_notices
FOR EACH ROW EXECUTE FUNCTION public.municipal_internal_notices_touch_updated_at();

REVOKE ALL ON FUNCTION public.municipal_internal_notices_touch_updated_at() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.municipal_internal_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS municipal_internal_notices_active_read ON public.municipal_internal_notices;
CREATE POLICY municipal_internal_notices_active_read
ON public.municipal_internal_notices
FOR SELECT TO authenticated
USING (
  active IS TRUE
  AND valid_from <= now()
  AND (valid_until IS NULL OR valid_until > now())
);

REVOKE ALL ON TABLE public.municipal_internal_notices FROM anon, authenticated;
GRANT SELECT ON TABLE public.municipal_internal_notices TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'municipal-informativos',
  'municipal-informativos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS municipal_informativos_authenticated_read ON storage.objects;
CREATE POLICY municipal_informativos_authenticated_read
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'municipal-informativos');

DROP POLICY IF EXISTS municipal_informativos_admin_insert ON storage.objects;
CREATE POLICY municipal_informativos_admin_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'municipal-informativos'
  AND name LIKE 'notices/%'
  AND public.municipal_governance_is_admin()
);

DROP POLICY IF EXISTS municipal_informativos_admin_update ON storage.objects;
CREATE POLICY municipal_informativos_admin_update
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'municipal-informativos'
  AND name LIKE 'notices/%'
  AND public.municipal_governance_is_admin()
)
WITH CHECK (
  bucket_id = 'municipal-informativos'
  AND name LIKE 'notices/%'
  AND public.municipal_governance_is_admin()
);

DROP POLICY IF EXISTS municipal_informativos_admin_delete ON storage.objects;
CREATE POLICY municipal_informativos_admin_delete
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'municipal-informativos'
  AND name LIKE 'notices/%'
  AND public.municipal_governance_is_admin()
);

CREATE OR REPLACE FUNCTION public.municipal_governance_list_internal_notices()
RETURNS TABLE (
  id uuid,
  title text,
  body text,
  image_path text,
  image_alt text,
  sort_order integer,
  active boolean,
  valid_from timestamptz,
  valid_until timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  availability_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'app_private'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.municipal_governance_is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem consultar os informativos institucionais.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT n.id, n.title, n.body, n.image_path, n.image_alt, n.sort_order, n.active,
         n.valid_from, n.valid_until, n.created_by, n.updated_by, n.created_at, n.updated_at,
         CASE
           WHEN n.active IS FALSE THEN 'inativo'
           WHEN n.valid_from > now() THEN 'agendado'
           WHEN n.valid_until IS NOT NULL AND n.valid_until <= now() THEN 'expirado'
           ELSE 'vigente'
         END::text
  FROM public.municipal_internal_notices n
  ORDER BY n.sort_order, n.created_at, n.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.municipal_governance_list_active_internal_notices()
RETURNS TABLE (
  id uuid,
  title text,
  body text,
  image_path text,
  image_alt text,
  sort_order integer,
  valid_from timestamptz,
  valid_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
  SELECT n.id, n.title, n.body, n.image_path, n.image_alt, n.sort_order, n.valid_from, n.valid_until
  FROM public.municipal_internal_notices n
  WHERE auth.uid() IS NOT NULL
    AND n.active IS TRUE
    AND n.valid_from <= now()
    AND (n.valid_until IS NULL OR n.valid_until > now())
  ORDER BY n.sort_order, n.created_at, n.id
  LIMIT 5;
$function$;

CREATE OR REPLACE FUNCTION public.municipal_governance_save_internal_notice(
  p_title text,
  p_body text,
  p_image_path text,
  p_image_alt text,
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_sort_order integer,
  p_active boolean,
  p_id uuid DEFAULT NULL
)
RETURNS public.municipal_internal_notices
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'app_private'
AS $function$
DECLARE
  v_row public.municipal_internal_notices;
  v_action text;
  v_old public.municipal_internal_notices;
BEGIN
  IF auth.uid() IS NULL OR NOT public.municipal_governance_is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem gravar informativos institucionais.' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 140 THEN
    RAISE EXCEPTION 'O título deve ter entre 1 e 140 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF p_body IS NULL OR char_length(p_body) > 500 THEN
    RAISE EXCEPTION 'O texto do informativo deve ter no máximo 500 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF p_image_alt IS NULL OR char_length(btrim(p_image_alt)) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'O texto alternativo da imagem é obrigatório e deve ter até 180 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF p_image_path IS NULL OR p_image_path !~ '^notices/[A-Za-z0-9][A-Za-z0-9_./-]*\.(png|jpe?g|webp)$' THEN
    RAISE EXCEPTION 'A imagem deve estar no caminho notices/ e ter extensão PNG, JPG, JPEG ou WEBP.' USING ERRCODE = '22023';
  END IF;
  IF p_valid_until IS NOT NULL AND p_valid_until <= p_valid_from THEN
    RAISE EXCEPTION 'A validade final deve ser posterior à validade inicial.' USING ERRCODE = '22023';
  END IF;
  IF p_sort_order NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'A ordem do informativo deve estar entre 1 e 5.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('matrixia:municipal_internal_notices'));

  IF p_active IS TRUE AND EXISTS (
    SELECT 1 FROM public.municipal_internal_notices n
    WHERE n.active IS TRUE AND n.sort_order = p_sort_order AND (p_id IS NULL OR n.id <> p_id)
  ) THEN
    RAISE EXCEPTION 'A posição % já está ocupada por um informativo ativo.', p_sort_order USING ERRCODE = '23505';
  END IF;
  IF p_active IS TRUE AND (
    SELECT count(*) FROM public.municipal_internal_notices n
    WHERE n.active IS TRUE AND (p_id IS NULL OR n.id <> p_id)
  ) >= 5 THEN
    RAISE EXCEPTION 'Já existem cinco informativos ativos. Inative um item antes de ativar outro.' USING ERRCODE = '23514';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.municipal_internal_notices (
      title, body, image_path, image_alt, sort_order, active, valid_from, valid_until, created_by, updated_by
    ) VALUES (
      btrim(p_title), p_body, p_image_path, btrim(p_image_alt), p_sort_order, p_active,
      coalesce(p_valid_from, now()), p_valid_until, auth.uid(), auth.uid()
    ) RETURNING * INTO v_row;
    v_action := 'internal_notice_created';
  ELSE
    SELECT * INTO v_old FROM public.municipal_internal_notices WHERE id = p_id FOR UPDATE;
    IF v_old.id IS NULL THEN
      RAISE EXCEPTION 'Informativo não encontrado.' USING ERRCODE = 'P0002';
    END IF;
    UPDATE public.municipal_internal_notices
    SET title = btrim(p_title), body = p_body, image_path = p_image_path, image_alt = btrim(p_image_alt),
        sort_order = p_sort_order, active = p_active, valid_from = coalesce(p_valid_from, now()),
        valid_until = p_valid_until, updated_by = auth.uid()
    WHERE id = p_id
    RETURNING * INTO v_row;
    v_action := CASE WHEN v_old.active IS DISTINCT FROM p_active
      THEN CASE WHEN p_active THEN 'internal_notice_activated' ELSE 'internal_notice_deactivated' END
      ELSE 'internal_notice_updated' END;
  END IF;

  INSERT INTO public.municipal_access_audit (actor_user_id, action, details)
  VALUES (
    auth.uid(), v_action,
    jsonb_build_object(
      'notice_id', v_row.id, 'title', v_row.title, 'image_path', v_row.image_path,
      'active', v_row.active, 'sort_order', v_row.sort_order,
      'valid_from', v_row.valid_from, 'valid_until', v_row.valid_until
    )
  );

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.municipal_governance_list_internal_notices() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.municipal_governance_list_active_internal_notices() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.municipal_governance_save_internal_notice(text,text,text,text,timestamptz,timestamptz,integer,boolean,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.municipal_governance_list_internal_notices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.municipal_governance_list_active_internal_notices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.municipal_governance_save_internal_notice(text,text,text,text,timestamptz,timestamptz,integer,boolean,uuid) TO authenticated;

COMMIT;
