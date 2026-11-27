-- Cadastro transacional de atas e aditivos do MatrixIA.
-- Toda escrita passa por funções security definer e pelo contexto municipal autenticado.
create or replace function public.compras_criar_ata_com_itens(p_ata jsonb, p_itens jsonb)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, app_private
as $$
declare v_municipio uuid := app_private.current_municipio_id(); v_usuario integer := app_private.current_user_id(); v_ata public.atas; v_item jsonb; v_count integer := 0; v_total numeric := 0;
begin
  if v_municipio is null or v_usuario is null or not app_private.has_municipio_role(v_municipio, array['tenant_admin'::text,'compras_manager'::text]) then raise exception 'Usuário sem permissão para cadastrar ata' using errcode = '42501'; end if;
  if nullif(trim(p_ata->>'numero_ata'),'') is null then raise exception 'Número da ata é obrigatório' using errcode = '22023'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'A ata deve possuir ao menos um item' using errcode = '22023'; end if;
  insert into public.atas (municipio_id, numero_ata, processo_administrativo, numero_pregao, objeto, data_assinatura, data_inicio_vigencia, data_fim_vigencia, valor_global, fornecedor_id, situacao, observacoes, modalidade, orgao_responsavel_id, usuario_cadastro_id, created_at, updated_at)
  values (v_municipio, trim(p_ata->>'numero_ata'), nullif(trim(p_ata->>'processo_administrativo'),''), nullif(trim(p_ata->>'numero_pregao'),''), nullif(trim(p_ata->>'objeto'),''), nullif(p_ata->>'data_assinatura','')::date, nullif(p_ata->>'data_inicio_vigencia','')::date, nullif(p_ata->>'data_fim_vigencia','')::date, nullif(p_ata->>'valor_global','')::numeric, nullif(p_ata->>'fornecedor_id','')::integer, nullif(trim(p_ata->>'situacao'),''), nullif(trim(p_ata->>'observacoes'),''), nullif(trim(p_ata->>'modalidade'),''), nullif(p_ata->>'orgao_responsavel_id','')::integer, v_usuario, now(), now()) returning * into v_ata;
  for v_item in select value from jsonb_array_elements(p_itens) loop
    if nullif(trim(v_item->>'item_numero'),'') is null or nullif(trim(v_item->>'descricao'),'') is null or nullif(trim(v_item->>'unidade_medida'),'') is null then raise exception 'Item inválido: número, descrição e unidade são obrigatórios' using errcode = '22023'; end if;
    if coalesce((v_item->>'quantidade_contratada')::numeric,0) <= 0 or coalesce((v_item->>'valor_unitario')::numeric,0) < 0 then raise exception 'Item inválido: quantidade e valor devem ser válidos' using errcode = '22023'; end if;
    v_total := coalesce((v_item->>'valor_total')::numeric, (v_item->>'quantidade_contratada')::numeric * (v_item->>'valor_unitario')::numeric);
    insert into public.itens_ata (municipio_id, ata_id, item_numero, descricao, unidade_medida, quantidade_contratada, valor_unitario, valor_total, saldo_quantidade, saldo_valor, lote_numero, situacao, created_at, updated_at)
    values (v_municipio, v_ata.id, trim(v_item->>'item_numero'), trim(v_item->>'descricao'), trim(v_item->>'unidade_medida'), (v_item->>'quantidade_contratada')::numeric, (v_item->>'valor_unitario')::numeric, v_total, (v_item->>'quantidade_contratada')::numeric, v_total, nullif(trim(v_item->>'lote_numero'),''), 'ATIVO', now(), now());
    v_count := v_count + 1;
  end loop;
  insert into public.atas_historico (municipio_id, ata_id, usuario_id, campo_alterado, valor_antigo, valor_novo, created_at) values (v_municipio, v_ata.id, v_usuario, 'CADASTRO', null, jsonb_build_object('numero_ata',v_ata.numero_ata,'itens',v_count)::text, now());
  return jsonb_build_object('id', v_ata.id, 'itens', v_count, 'valor_total', coalesce(v_ata.valor_global,0));
end; $$;
revoke all on function public.compras_criar_ata_com_itens(jsonb,jsonb) from public;
grant execute on function public.compras_criar_ata_com_itens(jsonb,jsonb) to authenticated;

create table if not exists public.compras_atas_aditivos (
  id bigserial primary key, municipio_id uuid not null references public.municipios(id) on delete restrict, ata_id integer not null references public.atas(id) on delete restrict,
  numero text not null, tipo text not null default 'VALOR', data_assinatura date not null, justificativa text not null, valor_aditivo numeric not null default 0,
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','APLICADO','CANCELADO')), dados jsonb not null default '{}'::jsonb,
  criado_por integer not null references public.usuarios(id) on delete restrict, created_at timestamptz not null default now(), applied_at timestamptz null
);
create index if not exists compras_atas_aditivos_tenant_idx on public.compras_atas_aditivos(municipio_id,ata_id,created_at desc);
alter table public.compras_atas_aditivos enable row level security;
drop policy if exists compras_atas_aditivos_read on public.compras_atas_aditivos;
create policy compras_atas_aditivos_read on public.compras_atas_aditivos for select using (app_private.has_municipio_access(municipio_id));
drop policy if exists compras_atas_aditivos_manage on public.compras_atas_aditivos;
create policy compras_atas_aditivos_manage on public.compras_atas_aditivos for all using (app_private.has_municipio_role(municipio_id,array['tenant_admin'::text,'compras_manager'::text])) with check (app_private.has_municipio_role(municipio_id,array['tenant_admin'::text,'compras_manager'::text]));
create or replace function public.compras_criar_aditivo(p_ata_id integer,p_numero text,p_tipo text,p_data_assinatura date,p_justificativa text,p_valor_aditivo numeric)
returns bigint language plpgsql security definer set search_path = pg_catalog,public,app_private as $$ declare v_municipio uuid:=app_private.current_municipio_id(); v_usuario integer:=app_private.current_user_id(); v_id bigint; begin if not app_private.has_municipio_role(v_municipio,array['tenant_admin'::text,'compras_manager'::text]) then raise exception 'Usuário sem permissão para aditivo' using errcode='42501'; end if; if length(trim(coalesce(p_justificativa,'')))<10 then raise exception 'Justificativa insuficiente' using errcode='22023'; end if; insert into public.compras_atas_aditivos(municipio_id,ata_id,numero,tipo,data_assinatura,justificativa,valor_aditivo,criado_por) values(v_municipio,p_ata_id,trim(p_numero),coalesce(p_tipo,'VALOR'),coalesce(p_data_assinatura,current_date),trim(p_justificativa),coalesce(p_valor_aditivo,0),v_usuario) returning id into v_id; return v_id; end; $$;
revoke all on function public.compras_criar_aditivo(integer,text,text,date,text,numeric) from public; grant execute on function public.compras_criar_aditivo(integer,text,text,date,text,numeric) to authenticated;
create or replace function public.compras_aplicar_aditivo(p_aditivo_id bigint) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private as $$ declare v_municipio uuid:=app_private.current_municipio_id(); v_row public.compras_atas_aditivos; begin if not app_private.has_municipio_role(v_municipio,array['tenant_admin'::text,'compras_manager'::text]) then raise exception 'Usuário sem permissão para aplicar aditivo' using errcode='42501'; end if; select * into v_row from public.compras_atas_aditivos where id=p_aditivo_id and municipio_id=v_municipio for update; if v_row.id is null or v_row.status<>'RASCUNHO' then raise exception 'Aditivo não está disponível para aplicação' using errcode='22023'; end if; update public.atas set valor_global=coalesce(valor_global,0)+coalesce(v_row.valor_aditivo,0), updated_at=now() where id=v_row.ata_id and municipio_id=v_municipio; update public.compras_atas_aditivos set status='APLICADO',applied_at=now() where id=v_row.id; insert into public.atas_historico(municipio_id,ata_id,usuario_id,campo_alterado,valor_antigo,valor_novo,created_at) values(v_municipio,v_row.ata_id,app_private.current_user_id(),'ADITIVO',null,jsonb_build_object('aditivo_id',v_row.id,'valor',v_row.valor_aditivo)::text,now()); return jsonb_build_object('ok',true,'aditivo_id',v_row.id); end; $$;
revoke all on function public.compras_aplicar_aditivo(bigint) from public; grant execute on function public.compras_aplicar_aditivo(bigint) to authenticated;
