begin;

alter table public.saude_questionario_perguntas
  add column if not exists secao text not null default 'Seção 1',
  add column if not exists ajuda text,
  add column if not exists validacao jsonb not null default '{}'::jsonb;

create table if not exists public.saude_questionario_versoes (
  id uuid primary key default gen_random_uuid(),
  questionario_id uuid not null references public.saude_questionarios(id) on delete cascade,
  numero integer not null check (numero > 0),
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','PUBLICADO','ARQUIVADO')),
  titulo text not null,
  descricao text,
  estrutura jsonb not null default '{}'::jsonb,
  criado_por integer references public.usuarios(id),
  publicada_em timestamptz,
  criada_em timestamptz not null default now(),
  unique (questionario_id, numero)
);

create index if not exists idx_saude_questionario_versoes_questionario
  on public.saude_questionario_versoes (questionario_id, numero desc);

create table if not exists public.saude_questionario_respostas (
  id uuid primary key default gen_random_uuid(),
  questionario_id uuid not null references public.saude_questionarios(id) on delete cascade,
  versao_id uuid not null references public.saude_questionario_versoes(id) on delete restrict,
  municipio_id uuid not null references public.municipios(id) on delete cascade,
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','ENVIADA','CANCELADA')),
  respondente_nome text,
  respondente_identificador text,
  respostas jsonb not null default '{}'::jsonb,
  observacoes text,
  respondida_por integer references public.usuarios(id),
  enviada_em timestamptz,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create index if not exists idx_saude_questionario_respostas_questionario
  on public.saude_questionario_respostas (questionario_id, criada_em desc);
create index if not exists idx_saude_questionario_respostas_municipio
  on public.saude_questionario_respostas (municipio_id, status, criada_em desc);

create or replace function public.saude_questionarios_atualizar_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizada_em = now();
  return new;
end;
$$;

drop trigger if exists trg_saude_questionario_respostas_atualizada_em on public.saude_questionario_respostas;
create trigger trg_saude_questionario_respostas_atualizada_em
before update on public.saude_questionario_respostas
for each row execute function public.saude_questionarios_atualizar_em();

create or replace function public.saude_questionarios_tem_acesso(_municipio_id uuid)
returns boolean language sql security definer stable set search_path = public, app_private as $$
  select exists (
    select 1
    from public.usuarios u
    left join public.municipal_user_secretariats mus on mus.user_id = u.id
    where u.uuid = auth.uid()
      and u.ativo = true
      and app_private.current_municipio_id() = _municipio_id
      and (app_private.current_user_is_admin() or mus.secretariat_id = 'health')
  );
$$;

revoke all on function public.saude_questionarios_tem_acesso(uuid) from public;
grant execute on function public.saude_questionarios_tem_acesso(uuid) to authenticated;

create or replace function public.saude_questionarios_contexto()
returns table(municipio_id uuid, municipio_nome text, usuario_id integer, pode_acessar boolean, pode_gerir boolean)
language sql security definer set search_path = public, app_private as $$
  select m.id, m.nome, u.id,
    public.saude_questionarios_tem_acesso(m.id),
    public.saude_questionarios_tem_acesso(m.id)
      and (app_private.has_municipio_role(m.id, array['tenant_admin'::text, 'secretario'::text]) or app_private.current_user_is_admin())
  from public.municipios m
  left join public.usuarios u on u.uuid = auth.uid()
  where m.id = app_private.current_municipio_id()
  limit 1;
$$;

drop policy if exists saude_questionarios_read on public.saude_questionarios;
create policy saude_questionarios_read on public.saude_questionarios for select to authenticated
using (public.saude_questionarios_tem_acesso(municipio_id));
drop policy if exists saude_questionarios_insert on public.saude_questionarios;
create policy saude_questionarios_insert on public.saude_questionarios for insert to authenticated
with check (public.saude_questionarios_tem_acesso(municipio_id) and app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));
drop policy if exists saude_questionarios_update on public.saude_questionarios;
create policy saude_questionarios_update on public.saude_questionarios for update to authenticated
using (public.saude_questionarios_tem_acesso(municipio_id) and app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]))
with check (public.saude_questionarios_tem_acesso(municipio_id) and app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));
drop policy if exists saude_questionarios_delete on public.saude_questionarios;
create policy saude_questionarios_delete on public.saude_questionarios for delete to authenticated
using (public.saude_questionarios_tem_acesso(municipio_id) and app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));

drop policy if exists saude_questionario_perguntas_read on public.saude_questionario_perguntas;
create policy saude_questionario_perguntas_read on public.saude_questionario_perguntas for select to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id)));
drop policy if exists saude_questionario_perguntas_insert on public.saude_questionario_perguntas;
create policy saude_questionario_perguntas_insert on public.saude_questionario_perguntas for insert to authenticated
with check (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id) and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])));
drop policy if exists saude_questionario_perguntas_update on public.saude_questionario_perguntas;
create policy saude_questionario_perguntas_update on public.saude_questionario_perguntas for update to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id) and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])))
with check (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id) and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])));
drop policy if exists saude_questionario_perguntas_delete on public.saude_questionario_perguntas;
create policy saude_questionario_perguntas_delete on public.saude_questionario_perguntas for delete to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id) and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])));

alter table public.saude_questionario_versoes enable row level security;
create policy saude_questionario_versoes_read on public.saude_questionario_versoes for select to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id)));
create policy saude_questionario_versoes_insert on public.saude_questionario_versoes for insert to authenticated
with check (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id) and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])));
create policy saude_questionario_versoes_update on public.saude_questionario_versoes for update to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id) and app_private.has_municipio_role(q.municipio_id, array['tenant_admin'::text, 'secretario'::text])));

alter table public.saude_questionario_respostas enable row level security;
create policy saude_questionario_respostas_read on public.saude_questionario_respostas for select to authenticated
using (public.saude_questionarios_tem_acesso(municipio_id));
create policy saude_questionario_respostas_insert on public.saude_questionario_respostas for insert to authenticated
with check (public.saude_questionarios_tem_acesso(municipio_id));
create policy saude_questionario_respostas_update on public.saude_questionario_respostas for update to authenticated
using (public.saude_questionarios_tem_acesso(municipio_id));

create policy saude_questionarios_historico_read_health on public.saude_questionarios_historico for select to authenticated
using (exists (select 1 from public.saude_questionarios q where q.id = questionario_id and public.saude_questionarios_tem_acesso(q.municipio_id)));

grant select, insert, update, delete on public.saude_questionario_versoes to authenticated;
grant select, insert, update on public.saude_questionario_respostas to authenticated;
grant execute on function public.saude_questionarios_contexto() to authenticated;

commit;
