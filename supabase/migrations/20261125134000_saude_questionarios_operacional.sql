begin;

create table if not exists public.saude_questionarios (
  id uuid primary key default gen_random_uuid(),
  municipio_id uuid not null references public.municipios(id) on delete cascade,
  codigo text not null,
  titulo text not null,
  descricao text,
  categoria text not null default 'APS',
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','PUBLICADO','ARQUIVADO')),
  versao integer not null default 1 check (versao > 0),
  ativo boolean not null default true,
  created_by integer references public.usuarios(id),
  updated_by integer references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipio_id, codigo)
);

create table if not exists public.saude_questionario_perguntas (
  id uuid primary key default gen_random_uuid(),
  questionario_id uuid not null references public.saude_questionarios(id) on delete cascade,
  ordem integer not null check (ordem > 0),
  tipo text not null check (tipo in ('TEXTO','NUMERO','DATA','SIM_NAO','ESCOLHA_UNICA','ESCOLHA_MULTIPLA')),
  enunciado text not null,
  obrigatoria boolean not null default false,
  opcoes jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (questionario_id, ordem)
);

create table if not exists public.saude_questionarios_historico (
  id uuid primary key default gen_random_uuid(),
  questionario_id uuid not null references public.saude_questionarios(id) on delete cascade,
  acao text not null check (acao in ('CRIADO','ATUALIZADO','PUBLICADO','ARQUIVADO','REATIVADO')),
  versao integer not null,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ator_id integer references public.usuarios(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_saude_questionarios_municipio on public.saude_questionarios (municipio_id, ativo, updated_at desc);
create index if not exists idx_saude_questionario_perguntas_questionario on public.saude_questionario_perguntas (questionario_id, ordem);
create index if not exists idx_saude_questionarios_historico_questionario on public.saude_questionarios_historico (questionario_id, created_at desc);

create or replace function public.saude_questionarios_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_saude_questionarios_updated_at on public.saude_questionarios;
create trigger trg_saude_questionarios_updated_at before update on public.saude_questionarios
for each row execute function public.saude_questionarios_updated_at();

drop trigger if exists trg_saude_questionario_perguntas_updated_at on public.saude_questionario_perguntas;
create trigger trg_saude_questionario_perguntas_updated_at before update on public.saude_questionario_perguntas
for each row execute function public.saude_questionarios_updated_at();

create or replace function public.saude_questionarios_auditar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ator integer;
  acao text;
begin
  select u.id into ator from public.usuarios u where u.uuid = auth.uid() limit 1;
  if tg_op = 'INSERT' then
    acao := 'CRIADO';
  elsif old.status <> new.status and new.status = 'PUBLICADO' then
    acao := 'PUBLICADO';
  elsif old.status <> new.status and new.status = 'ARQUIVADO' then
    acao := 'ARQUIVADO';
  elsif old.ativo = false and new.ativo = true then
    acao := 'REATIVADO';
  else
    acao := 'ATUALIZADO';
  end if;
  insert into public.saude_questionarios_historico (questionario_id, acao, versao, dados_anteriores, dados_novos, ator_id)
  values (new.id, acao, new.versao, case when tg_op = 'INSERT' then null else to_jsonb(old) end, to_jsonb(new), ator);
  return new;
end;
$$;

drop trigger if exists trg_saude_questionarios_auditoria on public.saude_questionarios;
create trigger trg_saude_questionarios_auditoria after insert or update on public.saude_questionarios
for each row execute function public.saude_questionarios_auditar();

alter table public.saude_questionarios enable row level security;
alter table public.saude_questionario_perguntas enable row level security;
alter table public.saude_questionarios_historico enable row level security;

drop policy if exists saude_questionarios_read on public.saude_questionarios;
create policy saude_questionarios_read on public.saude_questionarios for select to authenticated
using (app_private.has_municipio_access(municipio_id));
drop policy if exists saude_questionarios_insert on public.saude_questionarios;
create policy saude_questionarios_insert on public.saude_questionarios for insert to authenticated
with check (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));
drop policy if exists saude_questionarios_update on public.saude_questionarios;
create policy saude_questionarios_update on public.saude_questionarios for update to authenticated
using (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]))
with check (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));
drop policy if exists saude_questionarios_delete on public.saude_questionarios;
create policy saude_questionarios_delete on public.saude_questionarios for delete to authenticated
using (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));

drop policy if exists saude_questionario_perguntas_read on public.saude_questionario_perguntas;
create policy saude_questionario_perguntas_read on public.saude_questionario_perguntas for select to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and app_private.has_municipio_access(q.municipio_id)));
drop policy if exists saude_questionario_perguntas_insert on public.saude_questionario_perguntas;
create policy saude_questionario_perguntas_insert on public.saude_questionario_perguntas for insert to authenticated
with check (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])));
drop policy if exists saude_questionario_perguntas_update on public.saude_questionario_perguntas;
create policy saude_questionario_perguntas_update on public.saude_questionario_perguntas for update to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])))
with check (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])));
drop policy if exists saude_questionario_perguntas_delete on public.saude_questionario_perguntas;
create policy saude_questionario_perguntas_delete on public.saude_questionario_perguntas for delete to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])));

drop policy if exists saude_questionarios_historico_read on public.saude_questionarios_historico;
create policy saude_questionarios_historico_read on public.saude_questionarios_historico for select to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and app_private.has_municipio_access(q.municipio_id)));

grant select, insert, update, delete on public.saude_questionarios to authenticated;
grant select, insert, update, delete on public.saude_questionario_perguntas to authenticated;
grant select on public.saude_questionarios_historico to authenticated;

grant select on public.municipios to authenticated;
grant select on public.usuarios to authenticated;

commit;
