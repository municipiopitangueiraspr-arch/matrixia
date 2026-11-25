-- Biblioteca: autorização por Secretaria de Cultura e Turismo.
-- ADMIN é global. OPERADOR e SECRETARIO precisam estar vinculados ao órgão 13
-- ou ao vínculo institucional textual "culture".

create or replace function app_private.bib_cultura_gestor()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = app_private.current_user_id()
      and u.ativo is true
      and (
        upper(coalesce(u.perfil, '')) = 'ADMIN'
        or (
          upper(coalesce(u.perfil, '')) in ('OPERADOR', 'SECRETARIO')
          and (
            u.orgao_id = 13
            or exists (
              select 1
              from public.municipal_user_secretariats mus
              where mus.user_id = u.id
                and lower(mus.secretariat_id) = 'culture'
            )
          )
        )
      )
  );
$$;

grant execute on function app_private.bib_cultura_gestor() to authenticated;

create or replace function public.bib_pode_acessar()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, app_private
as $$ select app_private.bib_cultura_gestor(); $$;

revoke execute on function public.bib_pode_acessar() from public, anon;
grant execute on function public.bib_pode_acessar() to authenticated;

-- As políticas municipais antigas eram permissivas para qualquer usuário autenticado.
-- A leitura e a escrita passam a exigir o gestor autorizado da Biblioteca.
do $$
declare
  t text;
  policy_name text;
begin
  foreach t in array array[
    'bib_livros','bib_leitores','bib_autores','bib_editoras','bib_categorias',
    'bib_exemplares','bib_estantes','bib_prateleiras','bib_emprestimos',
    'bib_emprestimo_itens','bib_reservas','bib_livro_autores','bib_livro_categorias'
  ] loop
    policy_name := 'bib_' || replace(t, 'bib_', '') || '_municipio_scope';
    execute format('drop policy if exists %I on public.%I', policy_name, t);
    execute format('create policy %I on public.%I for select to authenticated using (app_private.has_municipio_access(municipio_id) and app_private.bib_cultura_gestor())', policy_name, t);

    execute format('drop policy if exists %I on public.%I', 'read_auth_' || t, t);
    execute format('drop policy if exists %I on public.%I', 'write_admin_' || t, t);
    execute format('create policy %I on public.%I for all to authenticated using (app_private.has_municipio_access(municipio_id) and app_private.bib_cultura_gestor()) with check (app_private.has_municipio_access(municipio_id) and app_private.bib_cultura_gestor())', 'write_biblioteca_' || t, t);
  end loop;
end $$;

-- Não manter uma política ALL concorrente: a política de leitura acima e a de escrita
-- abaixo ficam deliberadamente separadas para que o escopo seja explícito.
do $$
declare
  t text;
begin
  foreach t in array array[
    'bib_livros','bib_leitores','bib_autores','bib_editoras','bib_categorias',
    'bib_exemplares','bib_estantes','bib_prateleiras','bib_emprestimos',
    'bib_emprestimo_itens','bib_reservas','bib_livro_autores','bib_livro_categorias'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'write_biblioteca_' || t, t);
    execute format('create policy %I on public.%I for all to authenticated using (app_private.has_municipio_access(municipio_id) and app_private.bib_cultura_gestor()) with check (app_private.has_municipio_access(municipio_id) and app_private.bib_cultura_gestor())', 'write_biblioteca_' || t, t);
  end loop;
end $$;

-- Tabelas operacionais governadas por RPC: restringir a consulta direta ao mesmo gestor.
do $$
declare
  t text;
  old_policy text;
  new_policy text;
begin
  foreach t in array array['bib_bloqueios','bib_auditoria','bib_inventarios','bib_inventario_itens','bib_documentos','bib_notificacoes'] loop
    old_policy := case when t in ('bib_bloqueios','bib_auditoria','bib_documentos') then 'bib_' || replace(t, 'bib_', '') || '_municipio' else 'bib_' || replace(t, 'bib_', '') || '_municipio' end;
    new_policy := old_policy;
    execute format('drop policy if exists %I on public.%I', new_policy, t);
    execute format('create policy %I on public.%I for select to authenticated using (municipio_id = app_private.current_municipio_id() and app_private.bib_cultura_gestor())', new_policy, t);
  end loop;
end $$;

-- Configuração ativa.
drop policy if exists bib_config_read_auth on public.bib_configuracoes;
drop policy if exists bib_config_write_admin on public.bib_configuracoes;
drop policy if exists bib_configuracoes_municipio_scope on public.bib_configuracoes;
create policy bib_config_read_auth on public.bib_configuracoes for select to authenticated using (municipio_id = app_private.current_municipio_id() and app_private.bib_cultura_gestor());
create policy bib_config_write_admin on public.bib_configuracoes for all to authenticated using (municipio_id = app_private.current_municipio_id() and app_private.bib_cultura_gestor()) with check (municipio_id = app_private.current_municipio_id() and app_private.bib_cultura_gestor());

-- Storage privado: somente gestores autorizados podem inserir ou remover documentos.
drop policy if exists biblioteca_documentos_storage_insert_municipio_unico on storage.objects;
drop policy if exists biblioteca_documentos_storage_delete_municipio_unico on storage.objects;
create policy biblioteca_documentos_storage_insert_municipio_unico on storage.objects for insert to authenticated with check (
  bucket_id = 'biblioteca-documentos'
  and app_private.has_municipio_access(app_private.current_municipio_id())
  and app_private.bib_cultura_gestor()
  and name ~ '^(livro|exemplar|emprestimo|devolucao|leitor|inventario|aquisicao|doacao|baixa|evento)/[A-Za-z0-9_-]+/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[A-Za-z0-9._-]+$'
);
create policy biblioteca_documentos_storage_delete_municipio_unico on storage.objects for delete to authenticated using (
  bucket_id = 'biblioteca-documentos'
  and app_private.has_municipio_access(app_private.current_municipio_id())
  and app_private.bib_cultura_gestor()
  and name ~ '^(livro|exemplar|emprestimo|devolucao|leitor|inventario|aquisicao|doacao|baixa|evento)/[A-Za-z0-9_-]+/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[A-Za-z0-9._-]+$'
);

-- RPCs security-definer também recebem uma barreira de autorização. Renomear as
-- implementações legadas preserva seu comportamento operacional e coloca a guarda
-- antes de qualquer mutação.
do $$
declare
  item record;
begin
  for item in select * from (values
    ('bib_registrar_documento', 'text,text,text,text,text,bigint'),
    ('bib_registrar_bloqueio', 'integer,text,timestamptz'),
    ('bib_resolver_bloqueio', 'bigint,text'),
    ('bib_registrar_reserva', 'integer,integer,text'),
    ('bib_renovar_emprestimo', 'integer,integer'),
    ('bib_iniciar_inventario', 'text,jsonb'),
    ('bib_registrar_leitura_inventario', 'bigint,text,text'),
    ('bib_cancelar_reserva', 'integer,text'),
    ('bib_concluir_inventario', 'bigint,text'),
    ('bib_cancelar_inventario', 'bigint,text')
  ) as v(name,args) loop
    if to_regprocedure('public.' || item.name || '(' || item.args || ')') is not null
       and to_regprocedure('public.' || item.name || '_legacy(' || item.args || ')') is null then
      execute format('alter function public.%I(%s) rename to %I', item.name, item.args, item.name || '_legacy');
    end if;
  end loop;
end $$;

create or replace function public.bib_registrar_documento(p_entidade text,p_entidade_id text,p_nome_arquivo text,p_storage_path text,p_mime_type text,p_tamanho_bytes bigint) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_registrar_documento_legacy(p_entidade,p_entidade_id,p_nome_arquivo,p_storage_path,p_mime_type,p_tamanho_bytes); end; $$;
create or replace function public.bib_registrar_bloqueio(p_leitor_id integer,p_motivo text,p_fim timestamptz default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_registrar_bloqueio_legacy(p_leitor_id,p_motivo,p_fim); end; $$;
create or replace function public.bib_resolver_bloqueio(p_bloqueio_id bigint,p_motivo text default null) returns boolean language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_resolver_bloqueio_legacy(p_bloqueio_id,p_motivo); end; $$;
create or replace function public.bib_registrar_reserva(p_livro_id integer,p_leitor_id integer,p_observacoes text default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_registrar_reserva_legacy(p_livro_id,p_leitor_id,p_observacoes); end; $$;
create or replace function public.bib_renovar_emprestimo(p_emprestimo_id integer,p_dias integer default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_renovar_emprestimo_legacy(p_emprestimo_id,p_dias); end; $$;
create or replace function public.bib_iniciar_inventario(p_nome text,p_escopo jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_iniciar_inventario_legacy(p_nome,p_escopo); end; $$;
create or replace function public.bib_registrar_leitura_inventario(p_inventario_id bigint,p_codigo text,p_observacao text default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_registrar_leitura_inventario_legacy(p_inventario_id,p_codigo,p_observacao); end; $$;
create or replace function public.bib_cancelar_reserva(p_reserva_id integer,p_motivo text default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_cancelar_reserva_legacy(p_reserva_id,p_motivo); end; $$;
create or replace function public.bib_concluir_inventario(p_inventario_id bigint,p_observacao text default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_concluir_inventario_legacy(p_inventario_id,p_observacao); end; $$;
create or replace function public.bib_cancelar_inventario(p_inventario_id bigint,p_motivo text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para a Biblioteca' using errcode='42501'; end if; return public.bib_cancelar_inventario_legacy(p_inventario_id,p_motivo); end; $$;

create or replace function public.bib_salvar_configuracao(p_nome_biblioteca text,p_prazo_padrao integer,p_prazo_maximo integer,p_renovacoes integer,p_limite integer,p_dias_alerta integer,p_permite_reserva boolean) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ declare x public.bib_configuracoes; tid uuid:=app_private.current_municipio_id(); begin if not app_private.bib_cultura_gestor() then raise exception 'Sem permissão para configurar a Biblioteca' using errcode='42501'; end if; update public.bib_configuracoes set nome_biblioteca=coalesce(nullif(btrim(p_nome_biblioteca),''),'Biblioteca Municipal'),prazo_padrao_dias=greatest(1,p_prazo_padrao),prazo_maximo_dias=greatest(greatest(1,p_prazo_padrao),p_prazo_maximo),renovacoes_maximas=greatest(0,p_renovacoes),limite_livros_por_leitor=greatest(1,p_limite),dias_alerta_atraso=greatest(0,p_dias_alerta),permite_reserva=coalesce(p_permite_reserva,false),updated_at=now() where id=1 and municipio_id=tid returning * into x; if not found then raise exception 'Configuração municipal da Biblioteca não encontrada.' using errcode='P0002'; end if; perform public.bib_registrar_auditoria('CONFIGURACAO_ATUALIZADA','CONFIGURACAO',tid::text,to_jsonb(x)); return to_jsonb(x); end; $$;

grant execute on function public.bib_registrar_documento(text,text,text,text,text,bigint),public.bib_registrar_bloqueio(integer,text,timestamptz),public.bib_resolver_bloqueio(bigint,text),public.bib_registrar_reserva(integer,integer,text),public.bib_renovar_emprestimo(integer,integer),public.bib_iniciar_inventario(text,jsonb),public.bib_registrar_leitura_inventario(bigint,text,text),public.bib_cancelar_reserva(integer,text),public.bib_concluir_inventario(bigint,text),public.bib_cancelar_inventario(bigint,text),public.bib_salvar_configuracao(text,integer,integer,integer,integer,integer,boolean) to authenticated;
