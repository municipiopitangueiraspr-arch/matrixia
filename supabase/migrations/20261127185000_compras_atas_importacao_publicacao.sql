-- Etapa E: publicação reconciliada de importações de atas validadas.
-- A publicação exige revisão humana, snapshot-base e confirmação explícita; não cria nem remove itens.

create or replace function public.compras_analisar_publicacao_ata_importacao(
  p_importacao_id uuid
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, app_private
as $$
declare
  v_municipio uuid := app_private.current_municipio_id();
  v_usuario integer := app_private.current_user_id();
  v_importacao public.compras_atas_importacoes;
  v_ata public.atas;
  v_base jsonb;
  v_proposta jsonb;
  v_conflitos jsonb := '[]'::jsonb;
  v_item jsonb;
  v_base_item jsonb;
  v_atual jsonb;
  v_item_id integer;
  v_index integer := 0;
  v_snapshot_ausente boolean := false;
begin
  if v_municipio is null or v_usuario is null or not app_private.has_municipio_role(v_municipio, array['tenant_admin'::text,'compras_manager'::text]) then
    raise exception 'Usuário sem permissão para analisar publicação' using errcode = '42501';
  end if;

  select * into v_importacao
    from public.compras_atas_importacoes
   where id = p_importacao_id and municipio_id = v_municipio;
  if v_importacao.id is null then raise exception 'Importação não encontrada' using errcode = 'P0002'; end if;
  if v_importacao.status <> 'VALIDADO' then raise exception 'Somente importações validadas podem ser analisadas para publicação' using errcode = '22023'; end if;
  if v_importacao.ata_id is null then raise exception 'A importação não está vinculada a uma ata' using errcode = '22023'; end if;

  select * into v_ata from public.atas where id = v_importacao.ata_id and municipio_id = v_municipio for update;
  if v_ata.id is null then raise exception 'Ata da importação não encontrada' using errcode = 'P0002'; end if;

  v_base := coalesce(v_importacao.dados -> '_base_ata', '{}'::jsonb);
  v_proposta := v_importacao.dados - '_base_ata';
  if v_base = '{}'::jsonb then
    v_snapshot_ausente := true;
    v_conflitos := v_conflitos || jsonb_build_array(jsonb_build_object('tipo','SNAPSHOT_AUSENTE','campo','ata','mensagem','O rascunho não possui snapshot-base. Crie uma nova revisão antes de publicar.'));
  else
    v_conflitos := v_conflitos || coalesce((select jsonb_agg(jsonb_build_object('tipo','ATA_ALTERADA','campo', campo, 'base', base_value, 'atual', current_value, 'proposto', proposed_value)) from (values
      ('numero_ata', v_base->>'numero_ata', v_ata.numero_ata, v_proposta->>'numero_ata'),
      ('objeto', v_base->>'objeto', v_ata.objeto, v_proposta->>'objeto'),
      ('processo_administrativo', v_base->>'processo_administrativo', v_ata.processo_administrativo, v_proposta->>'processo_administrativo'),
      ('numero_pregao', v_base->>'numero_pregao', v_ata.numero_pregao, v_proposta->>'numero_pregao'),
      ('data_assinatura', v_base->>'data_assinatura', v_ata.data_assinatura::text, v_proposta->>'data_assinatura'),
      ('data_inicio_vigencia', v_base->>'data_inicio_vigencia', v_ata.data_inicio_vigencia::text, v_proposta->>'data_inicio_vigencia'),
      ('data_fim_vigencia', v_base->>'data_fim_vigencia', v_ata.data_fim_vigencia::text, v_proposta->>'data_fim_vigencia'),
      ('valor_global', v_base->>'valor_global', v_ata.valor_global::text, v_proposta->>'valor_global')
    ) as fields(campo, base_value, current_value, proposed_value) where coalesce(base_value,'') <> coalesce(current_value,'')), '[]'::jsonb);
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(v_importacao.itens, '[]'::jsonb)) loop
    v_index := v_index + 1;
    v_item_id := nullif(v_item->>'item_ata_id','')::integer;
    if v_item_id is null then
      v_conflitos := v_conflitos || jsonb_build_array(jsonb_build_object('tipo','ITEM_INVALIDO','campo',format('itens[%s]',v_index),'mensagem','Item sem item_ata_id; a publicação não cria itens novos.'));
      continue;
    end if;
    v_atual := null;
    select to_jsonb(i) into v_atual from public.itens_ata i where i.id = v_item_id and i.ata_id = v_importacao.ata_id and i.municipio_id = v_municipio;
    if v_atual is null then
      v_conflitos := v_conflitos || jsonb_build_array(jsonb_build_object('tipo','ITEM_NAO_ENCONTRADO','campo',format('item:%s',v_item_id),'mensagem','Item não encontrado na ata atual.'));
      continue;
    end if;
    v_base_item := coalesce(v_item -> '_base', '{}'::jsonb);
    if v_base_item = '{}'::jsonb then
      v_conflitos := v_conflitos || jsonb_build_array(jsonb_build_object('tipo','SNAPSHOT_AUSENTE','campo',format('item:%s',v_item_id),'mensagem','Item sem snapshot-base; revise o rascunho antes de publicar.'));
    else
      v_conflitos := v_conflitos || coalesce((select jsonb_agg(jsonb_build_object('tipo','ITEM_ALTERADO','campo',format('item:%s.%s',v_item_id,campo), 'base',base_value, 'atual',current_value, 'proposto',proposed_value)) from (values
        ('item_numero', v_base_item->>'item_numero', v_atual->>'item_numero', v_item->>'item_numero'),
        ('descricao', v_base_item->>'descricao', v_atual->>'descricao', v_item->>'descricao'),
        ('unidade_medida', v_base_item->>'unidade_medida', v_atual->>'unidade_medida', v_item->>'unidade_medida'),
        ('quantidade_contratada', v_base_item->>'quantidade_contratada', v_atual->>'quantidade_contratada', v_item->>'quantidade_contratada'),
        ('valor_unitario', v_base_item->>'valor_unitario', v_atual->>'valor_unitario', v_item->>'valor_unitario'),
        ('valor_total', v_base_item->>'valor_total', v_atual->>'valor_total', v_item->>'valor_total')
      ) as fields(campo,base_value,current_value,proposed_value) where coalesce(base_value,'') <> coalesce(current_value,'')), '[]'::jsonb);
    end if;
  end loop;

  return jsonb_build_object('ok', not v_snapshot_ausente and jsonb_array_length(v_conflitos) = 0, 'importacao_id', v_importacao.id, 'ata_id', v_importacao.ata_id, 'status', v_importacao.status, 'conflitos', v_conflitos, 'proposta', jsonb_build_object('dados', v_proposta, 'itens', v_importacao.itens));
end;
$$;

create or replace function public.compras_publicar_ata_importacao(
  p_importacao_id uuid,
  p_confirmar boolean,
  p_conflitos_confirmados jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, app_private
as $$
declare
  v_municipio uuid := app_private.current_municipio_id();
  v_usuario integer := app_private.current_user_id();
  v_importacao public.compras_atas_importacoes;
  v_ata_id integer;
  v_analise jsonb;
  v_conflitos jsonb;
  v_item jsonb;
  v_item_id integer;
  v_dados jsonb;
  v_updated integer := 0;
  v_row_count integer := 0;
begin
  if not coalesce(p_confirmar, false) then raise exception 'Confirmação explícita obrigatória para publicar' using errcode = '22023'; end if;
  if v_municipio is null or v_usuario is null or not app_private.has_municipio_role(v_municipio, array['tenant_admin'::text,'compras_manager'::text]) then
    raise exception 'Usuário sem permissão para publicar importação' using errcode = '42501';
  end if;
  select * into v_importacao from public.compras_atas_importacoes where id = p_importacao_id and municipio_id = v_municipio for update;
  if v_importacao.id is null then raise exception 'Importação não encontrada' using errcode = 'P0002'; end if;
  if v_importacao.status <> 'VALIDADO' then raise exception 'Somente importações validadas podem ser publicadas' using errcode = '22023'; end if;
  v_analise := public.compras_analisar_publicacao_ata_importacao(p_importacao_id);
  v_conflitos := coalesce(v_analise->'conflitos', '[]'::jsonb);
  if jsonb_array_length(v_conflitos) > 0 and not (p_conflitos_confirmados @> v_conflitos) then
    raise exception 'A ata mudou ou a revisão está incompleta; confirme os conflitos retornados pela análise' using errcode = '40001', detail = v_conflitos::text;
  end if;
  if not coalesce(v_analise->>'ok','false')::boolean and jsonb_array_length(v_conflitos) = 0 then
    raise exception 'A importação não está pronta para publicação' using errcode = '22023';
  end if;

  v_ata_id := v_importacao.ata_id;
  v_dados := v_importacao.dados - '_base_ata';
  update public.atas set
    numero_ata = nullif(v_dados->>'numero_ata',''), objeto = nullif(v_dados->>'objeto',''), processo_administrativo = nullif(v_dados->>'processo_administrativo',''), numero_pregao = nullif(v_dados->>'numero_pregao',''), data_assinatura = nullif(v_dados->>'data_assinatura','')::date, data_inicio_vigencia = nullif(v_dados->>'data_inicio_vigencia','')::date, data_fim_vigencia = nullif(v_dados->>'data_fim_vigencia','')::date, valor_global = nullif(v_dados->>'valor_global','')::numeric, updated_at = now()
   where id = v_ata_id and municipio_id = v_municipio;
  if not found then raise exception 'Ata não encontrada durante a publicação' using errcode = 'P0002'; end if;

  for v_item in select value from jsonb_array_elements(coalesce(v_importacao.itens, '[]'::jsonb)) loop
    v_item_id := nullif(v_item->>'item_ata_id','')::integer;
    if v_item_id is null then continue; end if;
    update public.itens_ata set
      item_numero = coalesce(nullif(v_item->>'item_numero',''), item_numero), descricao = coalesce(nullif(v_item->>'descricao',''), descricao), unidade_medida = coalesce(nullif(v_item->>'unidade_medida',''), unidade_medida), quantidade_contratada = coalesce(nullif(v_item->>'quantidade_contratada','')::numeric, quantidade_contratada), valor_unitario = coalesce(nullif(v_item->>'valor_unitario','')::numeric, valor_unitario), valor_total = coalesce(nullif(v_item->>'valor_total','')::numeric, valor_total), updated_at = now()
     where id = v_item_id and ata_id = v_ata_id and municipio_id = v_municipio;
    get diagnostics v_row_count = row_count;
    v_updated := v_updated + v_row_count;
  end loop;

  update public.compras_atas_importacoes set status = 'PUBLICADO', revisado_por = v_usuario, revisado_em = coalesce(revisado_em, now()), updated_at = now() where id = p_importacao_id and municipio_id = v_municipio;
  return jsonb_build_object('ok', true, 'importacao_id', p_importacao_id, 'ata_id', v_ata_id, 'itens_atualizados', v_updated, 'conflitos_confirmados', jsonb_array_length(v_conflitos));
end;
$$;

revoke all on function public.compras_analisar_publicacao_ata_importacao(uuid) from public;
grant execute on function public.compras_analisar_publicacao_ata_importacao(uuid) to authenticated;
revoke all on function public.compras_publicar_ata_importacao(uuid, boolean, jsonb) from public;
grant execute on function public.compras_publicar_ata_importacao(uuid, boolean, jsonb) to authenticated;
