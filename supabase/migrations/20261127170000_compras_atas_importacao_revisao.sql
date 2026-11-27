-- Etapa D: rascunho persistente para revisão humana de importações de atas.
-- Não publica automaticamente atas ou itens; a publicação exige uma etapa posterior explícita.

create table if not exists public.compras_atas_importacoes (
  id uuid primary key default gen_random_uuid(),
  municipio_id uuid not null references public.municipios(id) on delete restrict,
  documento_id uuid not null,
  ata_id integer null references public.atas(id) on delete restrict,
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','EM_REVISAO','VALIDADO','PUBLICADO','CANCELADO')),
  dados jsonb not null default '{}'::jsonb,
  itens jsonb not null default '[]'::jsonb,
  pendencias jsonb not null default '[]'::jsonb,
  criado_por integer not null references public.usuarios(id) on delete restrict,
  revisado_por integer null references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revisado_em timestamptz null
);

create index if not exists compras_atas_importacoes_tenant_status_idx on public.compras_atas_importacoes (municipio_id, status, updated_at desc);
create index if not exists compras_atas_importacoes_ata_idx on public.compras_atas_importacoes (municipio_id, ata_id, updated_at desc);

alter table public.compras_atas_importacoes enable row level security;

drop policy if exists compras_atas_importacoes_read on public.compras_atas_importacoes;
create policy compras_atas_importacoes_read on public.compras_atas_importacoes for select using (app_private.has_municipio_access(municipio_id));

drop policy if exists compras_atas_importacoes_manage on public.compras_atas_importacoes;
create policy compras_atas_importacoes_manage on public.compras_atas_importacoes for all using (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text,'compras_manager'::text])) with check (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text,'compras_manager'::text]));

create or replace function public.compras_criar_rascunho_ata_importacao(
  p_documento_id uuid,
  p_ata_id integer,
  p_dados jsonb,
  p_itens jsonb,
  p_pendencias jsonb
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public, app_private
as $$
declare
  v_municipio uuid := app_private.current_municipio_id();
  v_usuario integer := app_private.current_user_id();
  v_id uuid;
begin
  if v_municipio is null or v_usuario is null or not app_private.has_municipio_role(v_municipio, array['tenant_admin'::text,'compras_manager'::text]) then
    raise exception 'Usuário sem permissão para criar revisão de importação' using errcode = '42501';
  end if;
  if not exists (select 1 from public.compras_documentos_modulo d where d.id = p_documento_id and d.municipio_id = v_municipio and d.entidade = 'ATA' and (p_ata_id is null or d.entidade_id = p_ata_id::text)) then
    raise exception 'Documento não pertence à ata ou ao município corrente' using errcode = '22023';
  end if;
  if p_ata_id is not null and not exists (select 1 from public.atas a where a.id = p_ata_id and a.municipio_id = v_municipio) then
    raise exception 'Ata não encontrada no município corrente' using errcode = '22023';
  end if;
  if exists (select 1 from public.compras_atas_importacoes i where i.municipio_id = v_municipio and i.documento_id = p_documento_id and i.status in ('RASCUNHO','EM_REVISAO','VALIDADO')) then
    raise exception 'Já existe uma revisão ativa para este documento' using errcode = '23505';
  end if;
  insert into public.compras_atas_importacoes (municipio_id, documento_id, ata_id, dados, itens, pendencias, criado_por)
  values (v_municipio, p_documento_id, p_ata_id, coalesce(p_dados, '{}'::jsonb), coalesce(p_itens, '[]'::jsonb), coalesce(p_pendencias, '[]'::jsonb), v_usuario)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.compras_salvar_rascunho_ata_importacao(
  p_importacao_id uuid,
  p_dados jsonb,
  p_itens jsonb,
  p_pendencias jsonb,
  p_status text
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, app_private
as $$
declare
  v_municipio uuid := app_private.current_municipio_id();
  v_usuario integer := app_private.current_user_id();
  v_row public.compras_atas_importacoes;
begin
  if v_municipio is null or v_usuario is null or not app_private.has_municipio_role(v_municipio, array['tenant_admin'::text,'compras_manager'::text]) then
    raise exception 'Usuário sem permissão para revisar importação' using errcode = '42501';
  end if;
  if p_status not in ('RASCUNHO','EM_REVISAO','VALIDADO','CANCELADO') then
    raise exception 'Status de revisão inválido' using errcode = '22023';
  end if;
  update public.compras_atas_importacoes
     set dados = coalesce(p_dados, '{}'::jsonb), itens = coalesce(p_itens, '[]'::jsonb), pendencias = coalesce(p_pendencias, '[]'::jsonb), status = p_status, revisado_por = case when p_status in ('VALIDADO','CANCELADO') then v_usuario else revisado_por end, revisado_em = case when p_status in ('VALIDADO','CANCELADO') then now() else revisado_em end, updated_at = now()
   where id = p_importacao_id and municipio_id = v_municipio and status not in ('PUBLICADO','CANCELADO')
   returning * into v_row;
  if v_row.id is null then raise exception 'Rascunho não encontrado ou já encerrado' using errcode = 'P0002'; end if;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.compras_criar_rascunho_ata_importacao(uuid, integer, jsonb, jsonb, jsonb) from public;
grant execute on function public.compras_criar_rascunho_ata_importacao(uuid, integer, jsonb, jsonb, jsonb) to authenticated;
revoke all on function public.compras_salvar_rascunho_ata_importacao(uuid, jsonb, jsonb, jsonb, text) from public;
grant execute on function public.compras_salvar_rascunho_ata_importacao(uuid, jsonb, jsonb, jsonb, text) to authenticated;

create or replace function public.compras_atas_importacoes_touch_updated_at() returns trigger language plpgsql set search_path = pg_catalog, public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists compras_atas_importacoes_touch_updated_at on public.compras_atas_importacoes;
create trigger compras_atas_importacoes_touch_updated_at before update on public.compras_atas_importacoes for each row execute function public.compras_atas_importacoes_touch_updated_at();
