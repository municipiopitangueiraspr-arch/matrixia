import { supabase } from "@/lib/supabase";
import type { Ata, AtasWorkspaceData, ItemAta } from "@/lib/atas";

export async function callAtaRpc<T = unknown>(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

export async function createAtaWithItems(ata: Record<string, unknown>, itens: Array<Record<string, unknown>>) {
  return callAtaRpc<{ id: number }>("compras_criar_ata_com_itens", { p_ata: ata, p_itens: itens });
}

export async function createPedidoDraft(input: { numero: string; ata: Ata; orgaoId: number; unidadeId: string; unidadeLegado?: string | null; localEntrega?: string | null; itens: Array<{ itemAtaId: number; quantidade: number; lote?: string }> }) {
  const created = await callAtaRpc<{ id: number }>("compras_criar_pedido_rascunho", {
    p_numero_pedido: input.numero,
    p_ata_id: input.ata.id,
    p_orgao_solicitante_id: input.orgaoId,
    p_fornecedor_id: input.ata.fornecedor_id,
    p_data_solicitacao: new Date().toISOString().slice(0, 10),
    p_unidade_id: input.unidadeLegado || input.unidadeId,
    p_unidade_organizacional_id: input.unidadeId,
    p_numero_requisicao: null,
    p_observacoes: "Criado pelo MatrixIA.",
    p_justificativa: null,
    p_local_entrega: input.localEntrega?.trim() || null,
  });
  await callAtaRpc("compras_substituir_itens_pedido", { p_pedido_id: created.id, p_itens: input.itens.map((item) => ({ item_ata_id: item.itemAtaId, quantidade: item.quantidade, lote_numero: item.lote || null })) });
  return created;
}

export function itemExecution(item: ItemAta, data: AtasWorkspaceData) {
  const consumed = data.consumos.filter((row) => row.item_ata_id === item.id).reduce((sum, row) => sum + Number(row.quantidade || 0), 0);
  const reserved = data.reservas.filter((row) => row.item_ata_id === item.id && ["ATIVA", "RESERVADA"].includes(row.status)).reduce((sum, row) => sum + Number(row.quantidade || 0), 0);
  const total = Number(item.quantidade_contratada || 0);
  return { consumed, reserved, total, available: Math.max(Number(item.saldo_quantidade || total), 0), percentage: total ? Math.min(100, ((total - Number(item.saldo_quantidade || 0)) / total) * 100) : 0 };
}

export function csvDownload(filename: string, rows: Array<Record<string, unknown>>) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const content = [keys.map(escape).join(","), ...rows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
