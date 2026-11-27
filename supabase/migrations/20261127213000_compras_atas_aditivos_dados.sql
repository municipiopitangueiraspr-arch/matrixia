-- Complemento dos aditivos: preserva itens e campos estruturados em dados JSONB.
create or replace function public.compras_criar_aditivo(p_ata_id integer,p_numero text,p_tipo text,p_data_assinatura date,p_justificativa text,p_valor_aditivo numeric,p_dados jsonb)
returns bigint language plpgsql security definer set search_path = pg_catalog, public, app_private as $$
declare v_municipio uuid := app_private.current_municipio_id(); v_usuario integer := app_private.current_user_id(); v_id bigint;
begin
  if v_municipio is null or v_usuario is null or not app_private.has_municipio_role(v_municipio,array['tenant_admin'::text,'compras_manager'::text]) then raise exception 'Usuário sem permissão para aditivo' using errcode='42501'; end if;
  if length(trim(coalesce(p_numero,''))) = 0 or length(trim(coalesce(p_justificativa,''))) < 10 then raise exception 'Número e justificativa são obrigatórios' using errcode='22023'; end if;
  if not exists (select 1 from public.atas where id=p_ata_id and municipio_id=v_municipio) then raise exception 'Ata não encontrada no município autorizado' using errcode='22023'; end if;
  insert into public.compras_atas_aditivos(municipio_id,ata_id,numero,tipo,data_assinatura,justificativa,valor_aditivo,dados,criado_por)
  values(v_municipio,p_ata_id,trim(p_numero),coalesce(p_tipo,'VALOR'),coalesce(p_data_assinatura,current_date),trim(p_justificativa),coalesce(p_valor_aditivo,0),coalesce(p_dados,'{}'::jsonb),v_usuario) returning id into v_id;
  insert into public.atas_historico(municipio_id,ata_id,usuario_id,campo_alterado,valor_antigo,valor_novo,created_at)
  values(v_municipio,p_ata_id,v_usuario,'ADITIVO_CADASTRO',null,jsonb_build_object('aditivo_id',v_id,'numero',p_numero)::text,now());
  return v_id;
end; $$;
revoke all on function public.compras_criar_aditivo(integer,text,text,date,text,numeric,jsonb) from public;
grant execute on function public.compras_criar_aditivo(integer,text,text,date,text,numeric,jsonb) to authenticated;
