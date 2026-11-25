begin;

alter table public.saude_obrigacoes_configuracoes
  add column if not exists adesoes jsonb not null default '[]'::jsonb,
  add column if not exists identificadores_externos jsonb not null default '[]'::jsonb;

alter table public.saude_obrigacoes_instancias
  add column if not exists periodicidade text,
  add column if not exists concluida_observacao text;

alter table public.saude_obrigacoes_instancias
  drop constraint if exists saude_obrigacoes_instancias_periodicidade_check;
alter table public.saude_obrigacoes_instancias
  add constraint saude_obrigacoes_instancias_periodicidade_check
  check (periodicidade is null or periodicidade in ('MENSAL','BIMESTRAL','ANUAL','OUTRA'));

create table if not exists public.saude_obrigacoes_catalogo_historico (
  id uuid primary key default gen_random_uuid(),
  obrigacao_id uuid not null references public.saude_obrigacoes_catalogo(id) on delete cascade,
  acao text not null check (acao in ('CRIADA','ATUALIZADA','INATIVADA','REATIVADA')),
  dados_anteriores jsonb,
  dados_novos jsonb,
  ator_id integer references public.usuarios(id),
  created_at timestamptz not null default now()
);

create table if not exists public.saude_obrigacoes_auditoria (
  id uuid primary key default gen_random_uuid(),
  municipio_id uuid not null references public.municipios(id) on delete cascade,
  entidade_tipo text not null check (entidade_tipo in ('CONFIGURACAO','COMPETENCIA','EVIDENCIA')),
  entidade_id uuid not null,
  obrigacao_id uuid references public.saude_obrigacoes_catalogo(id),
  instancia_id uuid references public.saude_obrigacoes_instancias(id) on delete cascade,
  acao text not null,
  resumo text not null,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ator_id integer references public.usuarios(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_saude_catalogo_historico_obrigacao
  on public.saude_obrigacoes_catalogo_historico (obrigacao_id, created_at desc);
create index if not exists idx_saude_auditoria_municipio
  on public.saude_obrigacoes_auditoria (municipio_id, created_at desc);

create or replace function public.saude_obrigacoes_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_saude_config_updated_at on public.saude_obrigacoes_configuracoes;
create trigger trg_saude_config_updated_at before update on public.saude_obrigacoes_configuracoes
for each row execute function public.saude_obrigacoes_updated_at();
drop trigger if exists trg_saude_instancia_updated_at on public.saude_obrigacoes_instancias;
create trigger trg_saude_instancia_updated_at before update on public.saude_obrigacoes_instancias
for each row execute function public.saude_obrigacoes_updated_at();
drop trigger if exists trg_saude_catalogo_updated_at on public.saude_obrigacoes_catalogo;
create trigger trg_saude_catalogo_updated_at before update on public.saude_obrigacoes_catalogo
for each row execute function public.saude_obrigacoes_updated_at();

create or replace function public.saude_obrigacoes_catalogo_auditar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ator integer;
  acao text;
begin
  select u.id into ator from public.usuarios u where u.uuid = auth.uid() limit 1;
  if tg_op = 'INSERT' then
    acao := 'CRIADA';
    insert into public.saude_obrigacoes_catalogo_historico (obrigacao_id, acao, dados_novos, ator_id)
    values (new.id, acao, to_jsonb(new), ator);
    return new;
  end if;
  acao := case when old.ativo and not new.ativo then 'INATIVADA' when not old.ativo and new.ativo then 'REATIVADA' else 'ATUALIZADA' end;
  insert into public.saude_obrigacoes_catalogo_historico (obrigacao_id, acao, dados_anteriores, dados_novos, ator_id)
  values (new.id, acao, to_jsonb(old), to_jsonb(new), ator);
  return new;
end;
$$;

drop trigger if exists trg_saude_catalogo_auditoria on public.saude_obrigacoes_catalogo;
create trigger trg_saude_catalogo_auditoria after insert or update on public.saude_obrigacoes_catalogo
for each row execute function public.saude_obrigacoes_catalogo_auditar();

create or replace function public.saude_obrigacoes_validar_instancia()
returns trigger language plpgsql set search_path = public, app_private as $$
declare
  ator integer;
begin
  if new.competencia_fim is not null and new.competencia_fim < new.competencia_inicio then
    raise exception 'O fim da competência não pode anteceder o início.' using errcode = '22023';
  end if;
  if new.prazo < new.competencia_inicio then
    raise exception 'O prazo não pode anteceder o início da competência.' using errcode = '22023';
  end if;
  if new.status = 'CONCLUIDA' and (new.concluida_em is null or new.concluida_por is null) then
    select u.id into ator from public.usuarios u where u.uuid = auth.uid() limit 1;
    new.concluida_em := coalesce(new.concluida_em, now());
    new.concluida_por := coalesce(new.concluida_por, ator);
    if new.concluida_por is null then
      raise exception 'Uma competência concluída precisa de um usuário autenticado.' using errcode = '23514';
    end if;
  elsif new.status <> 'CONCLUIDA' then
    new.concluida_em := null;
    new.concluida_por := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_saude_instancia_validacao on public.saude_obrigacoes_instancias;
create trigger trg_saude_instancia_validacao before insert or update on public.saude_obrigacoes_instancias
for each row execute function public.saude_obrigacoes_validar_instancia();

create or replace function public.saude_obrigacoes_evento_instancia()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ator integer;
  tipo_evento text;
  anterior text;
  novo text;
begin
  select u.id into ator from public.usuarios u where u.uuid = auth.uid() limit 1;
  if tg_op = 'INSERT' then
    tipo_evento := 'CRIADA';
  elsif old.status is distinct from new.status then
    tipo_evento := 'STATUS_ALTERADO'; anterior := old.status; novo := new.status;
  elsif old.prazo is distinct from new.prazo then
    tipo_evento := 'PRAZO_ALTERADO';
  elsif old.responsavel_id is distinct from new.responsavel_id or old.unidade_responsavel_id is distinct from new.unidade_responsavel_id then
    tipo_evento := 'ATRIBUIDA';
  elsif old.observacoes is distinct from new.observacoes or old.concluida_em is distinct from new.concluida_em then
    tipo_evento := 'OBSERVACAO_ATUALIZADA';
  else
    return new;
  end if;
  insert into public.saude_obrigacoes_eventos (municipio_id, instancia_id, tipo, status_anterior, status_novo, payload, ator_id)
  values (new.municipio_id, new.id, tipo_evento, anterior, novo, jsonb_build_object('competencia_label', new.competencia_label, 'periodicidade', new.periodicidade), ator);
  return new;
end;
$$;

drop trigger if exists trg_saude_instancia_evento on public.saude_obrigacoes_instancias;
create trigger trg_saude_instancia_evento after insert or update on public.saude_obrigacoes_instancias
for each row execute function public.saude_obrigacoes_evento_instancia();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('saude-obrigacoes', 'saude-obrigacoes', false, 26214400, array['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.oasis.opendocument.text'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.saude_obrigacoes_catalogo_historico enable row level security;
alter table public.saude_obrigacoes_auditoria enable row level security;
drop policy if exists saude_catalogo_historico_read on public.saude_obrigacoes_catalogo_historico;
create policy saude_catalogo_historico_read on public.saude_obrigacoes_catalogo_historico for select to authenticated using (true);
drop policy if exists saude_auditoria_read on public.saude_obrigacoes_auditoria;
create policy saude_auditoria_read on public.saude_obrigacoes_auditoria for select to authenticated using (app_private.has_municipio_access(municipio_id));
drop policy if exists saude_auditoria_insert on public.saude_obrigacoes_auditoria;
create policy saude_auditoria_insert on public.saude_obrigacoes_auditoria for insert to authenticated with check (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));

grant select on public.saude_obrigacoes_catalogo_historico to authenticated;
grant select, insert on public.saude_obrigacoes_auditoria to authenticated;
grant select on public.municipios to authenticated;
grant select on public.usuarios to authenticated;
grant select on public.unidades_organizacionais to authenticated;

drop policy if exists saude_obrigacoes_storage_read on storage.objects;
create policy saude_obrigacoes_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'saude-obrigacoes' and (storage.foldername(name))[1] = app_private.current_municipio_id()::text and app_private.has_municipio_access(app_private.current_municipio_id())
);
drop policy if exists saude_obrigacoes_storage_insert on storage.objects;
create policy saude_obrigacoes_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'saude-obrigacoes' and (storage.foldername(name))[1] = app_private.current_municipio_id()::text and app_private.has_municipio_role(app_private.current_municipio_id(), array['tenant_admin'::text, 'secretario'::text])
);
drop policy if exists saude_obrigacoes_storage_update on storage.objects;
create policy saude_obrigacoes_storage_update on storage.objects for update to authenticated using (
  bucket_id = 'saude-obrigacoes' and (storage.foldername(name))[1] = app_private.current_municipio_id()::text and app_private.has_municipio_role(app_private.current_municipio_id(), array['tenant_admin'::text, 'secretario'::text])
) with check (
  bucket_id = 'saude-obrigacoes' and (storage.foldername(name))[1] = app_private.current_municipio_id()::text and app_private.has_municipio_role(app_private.current_municipio_id(), array['tenant_admin'::text, 'secretario'::text])
);
drop policy if exists saude_obrigacoes_storage_delete on storage.objects;
create policy saude_obrigacoes_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'saude-obrigacoes' and (storage.foldername(name))[1] = app_private.current_municipio_id()::text and app_private.has_municipio_role(app_private.current_municipio_id(), array['tenant_admin'::text, 'secretario'::text])
);

commit;
