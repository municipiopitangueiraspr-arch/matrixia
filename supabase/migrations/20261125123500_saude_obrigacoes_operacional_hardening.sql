begin;

drop policy if exists saude_catalogo_admin_manage on public.saude_obrigacoes_catalogo;
create policy saude_catalogo_admin_insert_update on public.saude_obrigacoes_catalogo for insert to authenticated with check (app_private.current_user_is_admin());
create policy saude_catalogo_admin_update on public.saude_obrigacoes_catalogo for update to authenticated using (app_private.current_user_is_admin()) with check (app_private.current_user_is_admin());

drop policy if exists saude_config_manage on public.saude_obrigacoes_configuracoes;
create policy saude_config_manage on public.saude_obrigacoes_configuracoes for insert to authenticated with check (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));
create policy saude_config_update on public.saude_obrigacoes_configuracoes for update to authenticated using (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text])) with check (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));
create policy saude_config_delete on public.saude_obrigacoes_configuracoes for delete to authenticated using (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));

drop policy if exists saude_instancias_manage on public.saude_obrigacoes_instancias;
create policy saude_instancias_manage on public.saude_obrigacoes_instancias for insert to authenticated with check (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));
create policy saude_instancias_update on public.saude_obrigacoes_instancias for update to authenticated using (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text])) with check (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));
create policy saude_instancias_delete on public.saude_obrigacoes_instancias for delete to authenticated using (app_private.has_municipio_role(municipio_id, array['tenant_admin'::text, 'secretario'::text]));

create or replace function public.saude_obrigacoes_auditar_operacao() returns trigger language plpgsql security definer set search_path = public as $$
declare ator integer; registro record; acao text; oid uuid; iid uuid; mid uuid; resumo text; begin select u.id into ator from public.usuarios u where u.uuid = auth.uid() limit 1;
if tg_table_name = 'saude_obrigacoes_configuracoes' then if tg_op='DELETE' then registro := old; else registro := new; end if; oid := registro.obrigacao_id; mid := registro.municipio_id; acao := case when tg_op='INSERT' then 'CRIADA' when tg_op='UPDATE' then 'ATUALIZADA' else 'REMOVIDA' end; resumo := 'Configuração municipal ' || lower(acao);
insert into public.saude_obrigacoes_auditoria (municipio_id, entidade_tipo, entidade_id, obrigacao_id, acao, resumo, dados_anteriores, dados_novos, ator_id) values (mid, 'CONFIGURACAO', registro.id, oid, acao, resumo, case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end, case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end, ator);
else if tg_op='DELETE' then registro := old; else registro := new; end if; iid := registro.instancia_id; mid := registro.municipio_id; select i.obrigacao_id into oid from public.saude_obrigacoes_instancias i where i.id=iid; acao := case when tg_op='INSERT' then 'ADICIONADA' when tg_op='UPDATE' then 'ATUALIZADA' else 'REMOVIDA' end; resumo := 'Evidência ' || lower(acao) || ': ' || registro.nome_arquivo;
insert into public.saude_obrigacoes_auditoria (municipio_id, entidade_tipo, entidade_id, obrigacao_id, instancia_id, acao, resumo, dados_anteriores, dados_novos, ator_id) values (mid, 'EVIDENCIA', registro.id, oid, iid, acao, resumo, case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end, case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end, ator); end if; return coalesce(new, old); end; $$;

drop trigger if exists trg_saude_config_auditoria on public.saude_obrigacoes_configuracoes;
create trigger trg_saude_config_auditoria after insert or update or delete on public.saude_obrigacoes_configuracoes for each row execute function public.saude_obrigacoes_auditar_operacao();
drop trigger if exists trg_saude_evidencia_auditoria on public.saude_obrigacoes_evidencias;
create trigger trg_saude_evidencia_auditoria after insert or update or delete on public.saude_obrigacoes_evidencias for each row execute function public.saude_obrigacoes_auditar_operacao();

create or replace function public.saude_obrigacoes_validar_unidade() returns trigger language plpgsql set search_path = public as $$ begin if new.unidade_responsavel_id is not null and not exists (select 1 from public.unidades_organizacionais u where u.id=new.unidade_responsavel_id and u.municipio_id=new.municipio_id and u.ativo) then raise exception 'A unidade responsável não pertence ao município ou está inativa.' using errcode='23514'; end if; return new; end; $$;
drop trigger if exists trg_saude_config_unidade on public.saude_obrigacoes_configuracoes;
create trigger trg_saude_config_unidade before insert or update on public.saude_obrigacoes_configuracoes for each row execute function public.saude_obrigacoes_validar_unidade();
drop trigger if exists trg_saude_instancia_unidade on public.saude_obrigacoes_instancias;
create trigger trg_saude_instancia_unidade before insert or update on public.saude_obrigacoes_instancias for each row execute function public.saude_obrigacoes_validar_unidade();

commit;
