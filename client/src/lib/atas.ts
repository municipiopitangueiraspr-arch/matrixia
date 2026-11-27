import { supabase } from "@/lib/supabase";

export type Ata = {
  id: number;
  numero_ata: string;
  processo_administrativo: string | null;
  numero_pregao: string | null;
  objeto: string | null;
  data_assinatura: string | null;
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  valor_global: number | null;
  fornecedor_id: number | null;
  situacao: string | null;
  observacoes: string | null;
  modalidade: string | null;
  processo_compras_id: string | null;
  orgao_responsavel_id: number | null;
};

export type Fornecedor = { id: number; razao_social: string; nome_fantasia: string | null; cnpj: string };
export type Orgao = { id: number; nome: string; sigla: string | null };
export type ItemAta = { id: number; ata_id: number; item_numero: string; descricao: string; unidade_medida: string; quantidade_contratada: number; valor_unitario: number; valor_total: number; saldo_quantidade: number; saldo_valor: number; situacao: string | null };
export type Pedido = { id: number; numero_pedido: string | null; ata_id: number; status: string | null; status_aprovacao: string | null; valor_total: number | null; data_solicitacao: string | null; orgao_solicitante_id: number | null; created_at: string };
export type ItemPedido = { id: number; pedido_id: number; item_ata_id: number; quantidade_solicitada: number; valor_total: number };
export type AtaOrgao = { id: number; ata_id: number; orgao_id: number; ativo: boolean; observacoes: string | null };
export type AtaHistorico = { id: number; ata_id: number; campo_alterado: string; valor_antigo: string | null; valor_novo: string | null; created_at: string; usuario_id: number | null };

export type AtasWorkspaceData = {
  atas: Ata[];
  fornecedores: Fornecedor[];
  orgaos: Orgao[];
  itens: ItemAta[];
  pedidos: Pedido[];
  itensPedidos: ItemPedido[];
  atasOrgaos: AtaOrgao[];
  historico: AtaHistorico[];
};

export async function loadAtasWorkspace(): Promise<AtasWorkspaceData> {
  const queries = await Promise.all([
    supabase.from("atas").select("id,numero_ata,processo_administrativo,numero_pregao,objeto,data_assinatura,data_inicio_vigencia,data_fim_vigencia,valor_global,fornecedor_id,situacao,observacoes,modalidade,processo_compras_id,orgao_responsavel_id").order("data_fim_vigencia", { ascending: true, nullsFirst: false }).limit(500),
    supabase.from("fornecedores").select("id,razao_social,nome_fantasia,cnpj").order("razao_social", { ascending: true }).limit(500),
    supabase.from("orgaos").select("id,nome,sigla").order("nome", { ascending: true }).limit(200),
    supabase.from("itens_ata").select("id,ata_id,item_numero,descricao,unidade_medida,quantidade_contratada,valor_unitario,valor_total,saldo_quantidade,saldo_valor,situacao").order("item_numero", { ascending: true }).limit(2000),
    supabase.from("pedidos").select("id,numero_pedido,ata_id,status,status_aprovacao,valor_total,data_solicitacao,orgao_solicitante_id,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("itens_pedido").select("id,pedido_id,item_ata_id,quantidade_solicitada,valor_total").limit(1500),
    supabase.from("atas_orgaos_consumidores").select("id,ata_id,orgao_id,ativo,observacoes").limit(500),
    supabase.from("atas_historico").select("id,ata_id,campo_alterado,valor_antigo,valor_novo,created_at,usuario_id").order("created_at", { ascending: false }).limit(1500),
  ]);
  for (const query of queries) if (query.error) throw query.error;
  const [atas, fornecedores, orgaos, itens, pedidos, itensPedidos, atasOrgaos, historico] = queries;
  return {
    atas: (atas.data || []) as Ata[],
    fornecedores: (fornecedores.data || []) as Fornecedor[],
    orgaos: (orgaos.data || []) as Orgao[],
    itens: (itens.data || []) as ItemAta[],
    pedidos: (pedidos.data || []) as Pedido[],
    itensPedidos: (itensPedidos.data || []) as ItemPedido[],
    atasOrgaos: (atasOrgaos.data || []) as AtaOrgao[],
    historico: (historico.data || []) as AtaHistorico[],
  };
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Data inválida" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(date);
}

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "Não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(Number(value));
}

export function isExpiring(ata: Ata) {
  if (!ata.data_fim_vigencia) return false;
  const end = new Date(`${ata.data_fim_vigencia.slice(0, 10)}T00:00:00Z`).getTime();
  const now = Date.now();
  return end >= now && end - now <= 1000 * 60 * 60 * 24 * 90;
}
