import { supabase } from "@/lib/supabase";

export type Ata = { id: number; municipio_id: string; numero_ata: string; processo_administrativo: string | null; numero_pregao: string | null; objeto: string | null; data_assinatura: string | null; data_inicio_vigencia: string | null; data_fim_vigencia: string | null; valor_global: number | null; fornecedor_id: number | null; situacao: string | null; observacoes: string | null; modalidade: string | null; processo_compras_id: string | null; orgao_responsavel_id: number | null };
export type Fornecedor = { id: number; razao_social: string; nome_fantasia: string | null; cnpj: string };
export type Orgao = { id: number; nome: string; sigla: string | null };
export type ItemAta = { id: number; ata_id: number; item_numero: string; descricao: string; unidade_medida: string; quantidade_contratada: number; valor_unitario: number; valor_total: number; saldo_quantidade: number; saldo_valor: number; situacao: string | null };
export type Pedido = { id: number; numero_pedido: string | null; ata_id: number; status: string | null; status_aprovacao: string | null; valor_total: number | null; data_solicitacao: string | null; orgao_solicitante_id: number | null; unidade_organizacional_id: string | null; unidade_id: string | null; created_at: string };
export type ItemPedido = { id: number; pedido_id: number; item_ata_id: number; quantidade_solicitada: number; valor_total: number; valor_unitario: number };
export type AtaOrgao = { id: number; ata_id: number; orgao_id: number; ativo: boolean; observacoes: string | null };
export type AtaHistorico = { id: number; ata_id: number; campo_alterado: string; valor_antigo: string | null; valor_novo: string | null; created_at: string; usuario_id: number | null };
export type Unidade = { id: string; nome: string; sigla: string | null; legacy_unidade_id: string | null; legacy_orgao_id: number | null; ativo: boolean };
export type Reserva = { id: string; pedido_id: number; item_pedido_id: number; item_ata_id: number; quantidade: number; valor: number; status: string; criada_em: string };
export type Entrega = { id: string; pedido_id: number; numero: number; data_entrega: string; tipo: string; documento_referencia: string | null; observacao: string | null };
export type EntregaItem = { id: string; entrega_id: string; pedido_id: number; item_pedido_id: number; quantidade: number; observacao: string | null };
export type PedidoEvento = { id: number; pedido_id: number; evento: string; status_anterior: string | null; status_novo: string | null; justificativa: string | null; ocorrido_em: string; metadados: Record<string, unknown> | null };
export type Consumo = { id: number; ata_id: number; item_ata_id: number; quantidade: number; valor_total: number; data_consumo: string; observacao: string | null };
export type DocumentoModulo = { id: string; municipio_id: string; entidade: string; entidade_id: string; nome_arquivo: string; storage_path: string; mime_type: string; tamanho_bytes: number; enviado_por: number; created_at: string };
export type ImportacaoAta = { id: string; municipio_id: string; documento_id: string; ata_id: number | null; status: string; dados: Record<string, unknown>; itens: Array<Record<string, unknown>>; pendencias: Array<string | Record<string, unknown>>; criado_por: number; revisado_por: number | null; created_at: string; updated_at: string; revisado_em: string | null };
export type Estorno = { id: number; pedido_id: number; status: string; justificativa: string; solicitado_em: string; decidido_em: string | null; observacao_decisao: string | null };
export type Aditivo = { id: number; ata_id: number; numero: string; tipo: string; data_assinatura: string; justificativa: string; valor_aditivo: number; status: string; dados: Record<string, unknown>; created_at: string; applied_at: string | null };

export type AtasWorkspaceData = { atas: Ata[]; fornecedores: Fornecedor[]; orgaos: Orgao[]; itens: ItemAta[]; pedidos: Pedido[]; itensPedidos: ItemPedido[]; atasOrgaos: AtaOrgao[]; historico: AtaHistorico[]; unidades: Unidade[]; reservas: Reserva[]; entregas: Entrega[]; entregasItens: EntregaItem[]; eventos: PedidoEvento[]; consumos: Consumo[]; documentos: DocumentoModulo[]; importacoes: ImportacaoAta[]; estornos: Estorno[]; aditivos: Aditivo[] };

export async function loadAtasWorkspace(): Promise<AtasWorkspaceData> {
  const queries = await Promise.all([
    supabase.from("atas").select("id,municipio_id,numero_ata,processo_administrativo,numero_pregao,objeto,data_assinatura,data_inicio_vigencia,data_fim_vigencia,valor_global,fornecedor_id,situacao,observacoes,modalidade,processo_compras_id,orgao_responsavel_id").order("data_fim_vigencia", { ascending: true, nullsFirst: false }).limit(500),
    supabase.from("fornecedores").select("id,razao_social,nome_fantasia,cnpj").order("razao_social", { ascending: true }).limit(500),
    supabase.from("orgaos").select("id,nome,sigla").order("nome", { ascending: true }).limit(200),
    supabase.from("itens_ata").select("id,ata_id,item_numero,descricao,unidade_medida,quantidade_contratada,valor_unitario,valor_total,saldo_quantidade,saldo_valor,situacao").order("item_numero", { ascending: true }).limit(2000),
    supabase.from("pedidos").select("id,numero_pedido,ata_id,status,status_aprovacao,valor_total,data_solicitacao,orgao_solicitante_id,unidade_organizacional_id,unidade_id,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("itens_pedido").select("id,pedido_id,item_ata_id,quantidade_solicitada,valor_unitario,valor_total").limit(1500),
    supabase.from("atas_orgaos_consumidores").select("id,ata_id,orgao_id,ativo,observacoes").limit(500),
    supabase.from("atas_historico").select("id,ata_id,campo_alterado,valor_antigo,valor_novo,created_at,usuario_id").order("created_at", { ascending: false }).limit(1500),
    supabase.from("unidades_organizacionais").select("id,nome,sigla,legacy_unidade_id,legacy_orgao_id,ativo").eq("ativo", true).order("nome").limit(300),
    supabase.from("pedidos_reservas").select("id,pedido_id,item_pedido_id,item_ata_id,quantidade,valor,status,criada_em").order("criada_em", { ascending: false }).limit(1500),
    supabase.from("pedidos_entregas").select("id,pedido_id,numero,data_entrega,tipo,documento_referencia,observacao").order("created_at", { ascending: false }).limit(1000),
    supabase.from("pedidos_entregas_itens").select("id,entrega_id,pedido_id,item_pedido_id,quantidade,observacao").limit(2000),
    supabase.from("pedidos_eventos").select("id,pedido_id,evento,status_anterior,status_novo,justificativa,ocorrido_em,metadados").order("ocorrido_em", { ascending: false }).limit(2000),
    supabase.from("consumos").select("id,ata_id,item_ata_id,quantidade,valor_total,data_consumo,observacao").order("data_consumo", { ascending: false }).limit(2000),
    supabase.from("compras_documentos_modulo").select("id,municipio_id,entidade,entidade_id,nome_arquivo,storage_path,mime_type,tamanho_bytes,enviado_por,created_at").eq("entidade", "ATA").order("created_at", { ascending: false }).limit(1000),
    supabase.from("compras_atas_importacoes").select("id,municipio_id,documento_id,ata_id,status,dados,itens,pendencias,criado_por,revisado_por,created_at,updated_at,revisado_em").order("updated_at", { ascending: false }).limit(500),
    supabase.from("pedidos_estornos").select("id,pedido_id,status,justificativa,solicitado_em,decidido_em,observacao_decisao").order("solicitado_em", { ascending: false }).limit(500),
    supabase.from("compras_atas_aditivos").select("id,ata_id,numero,tipo,data_assinatura,justificativa,valor_aditivo,status,dados,created_at,applied_at").order("created_at", { ascending: false }).limit(500),
  ]);
  for (const query of queries) if (query.error) throw query.error;
  const [atas, fornecedores, orgaos, itens, pedidos, itensPedidos, atasOrgaos, historico, unidades, reservas, entregas, entregasItens, eventos, consumos, documentos, importacoes, estornos, aditivos] = queries;
  return { atas: (atas.data || []) as Ata[], fornecedores: (fornecedores.data || []) as Fornecedor[], orgaos: (orgaos.data || []) as Orgao[], itens: (itens.data || []) as ItemAta[], pedidos: (pedidos.data || []) as Pedido[], itensPedidos: (itensPedidos.data || []) as ItemPedido[], atasOrgaos: (atasOrgaos.data || []) as AtaOrgao[], historico: (historico.data || []) as AtaHistorico[], unidades: (unidades.data || []) as Unidade[], reservas: (reservas.data || []) as Reserva[], entregas: (entregas.data || []) as Entrega[], entregasItens: (entregasItens.data || []) as EntregaItem[], eventos: (eventos.data || []) as PedidoEvento[], consumos: (consumos.data || []) as Consumo[], documentos: (documentos.data || []) as DocumentoModulo[], importacoes: (importacoes.data || []) as ImportacaoAta[], estornos: (estornos.data || []) as Estorno[], aditivos: (aditivos.data || []) as Aditivo[] };
}

export function formatDate(value: string | null | undefined) { if (!value) return "Não informado"; const date = new Date(`${value.slice(0, 10)}T00:00:00Z`); return Number.isNaN(date.getTime()) ? "Data inválida" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(date); }
export function formatMoney(value: number | null | undefined) { if (value === null || value === undefined) return "Não informado"; return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value)); }
export function formatNumber(value: number | null | undefined) { if (value === null || value === undefined) return "—"; return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(Number(value)); }
export function isExpiring(ata: Ata) { if (!ata.data_fim_vigencia) return false; const end = new Date(`${ata.data_fim_vigencia.slice(0, 10)}T00:00:00Z`).getTime(); return end >= Date.now() && end - Date.now() <= 1000 * 60 * 60 * 24 * 90; }
