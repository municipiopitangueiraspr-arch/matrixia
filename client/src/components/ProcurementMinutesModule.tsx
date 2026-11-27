import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardList, FileSearch, History, PackageSearch, RefreshCw, Search, ShieldCheck, Store, UsersRound } from "lucide-react";
import { Ata, AtaHistorico, AtasWorkspaceData, formatDate, formatMoney, formatNumber, isExpiring, loadAtasWorkspace } from "@/lib/atas";
import "./ProcurementMinutesModule.css";

type Props = { onBack: () => void; onLogout: () => void };
type StatusFilter = "TODAS" | "ATIVA" | "PROXIMA" | "SUSPENSA" | "ENCERRADA" | "VENCIDA" | "CANCELADA";

function statusLabel(value: string | null | undefined) {
  return (value || "SEM SITUAÇÃO").replaceAll("_", " ");
}

function statusClass(value: string | null | undefined) {
  return `minutes-status minutes-status--${(value || "sem").toLowerCase()}`;
}

function SectionTitle({ icon: Icon, eyebrow, title, count }: { icon: typeof Search; eyebrow: string; title: string; count?: number }) {
  return <div className="minutes-section-title"><div className="minutes-section-icon"><Icon size={17} /></div><div><span>{eyebrow}</span><h3>{title}</h3></div>{count !== undefined && <b>{count}</b>}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="minutes-empty"><PackageSearch size={22} /><span>{text}</span></div>;
}

export function ProcurementMinutesModule({ onBack, onLogout }: Props) {
  const [data, setData] = useState<AtasWorkspaceData | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("TODAS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (keepSelection = true) => {
    setLoading(true); setError("");
    try {
      const next = await loadAtasWorkspace();
      setData(next);
      if (!keepSelection || (selectedId && !next.atas.some((ata) => ata.id === selectedId))) setSelectedId(next.atas[0]?.id ?? null);
      else if (!selectedId) setSelectedId(next.atas[0]?.id ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as atas autorizadas.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(false); }, []);

  const fornecedores = data?.fornecedores || [];
  const orgaos = data?.orgaos || [];
  const atas = data?.atas || [];
  const supplierName = (id: number | null) => fornecedores.find((item) => item.id === id)?.nome_fantasia || fornecedores.find((item) => item.id === id)?.razao_social || "Fornecedor não informado";
  const orgaoName = (id: number | null) => orgaos.find((item) => item.id === id)?.nome || "Órgão não informado";
  const filtered = useMemo(() => atas.filter((ata) => {
    const needle = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !needle || [ata.numero_ata, ata.processo_administrativo, ata.numero_pregao, ata.objeto, supplierName(ata.fornecedor_id)].join(" ").toLocaleLowerCase("pt-BR").includes(needle);
    return matchesSearch && (status === "TODAS" || ata.situacao === status);
  }), [atas, search, status, fornecedores]);
  const selected = data?.atas.find((ata) => ata.id === selectedId) || filtered[0] || null;
  const selectedItems = data?.itens.filter((item) => item.ata_id === selected?.id) || [];
  const selectedPedidos = data?.pedidos.filter((item) => item.ata_id === selected?.id) || [];
  const selectedOrgaos = data?.atasOrgaos.filter((item) => item.ata_id === selected?.id && item.ativo) || [];
  const selectedHistory = data?.historico.filter((item) => item.ata_id === selected?.id).slice(0, 12) || [];
  const counts = { total: atas.length, ativas: atas.filter((ata) => ata.situacao === "ATIVA").length, proximas: atas.filter((ata) => ata.situacao === "PROXIMA").length, expirando: atas.filter(isExpiring).length };

  return <div className="minutes-shell">
    <header className="minutes-header"><button type="button" className="minutes-back" onClick={onBack}><ArrowLeft size={16} /> Voltar ao painel</button><div className="minutes-header-title"><span>Administração e Finanças</span><strong>Gestão de Atas</strong></div><div className="minutes-user"><span>Consulta protegida pelo Supabase</span><button type="button" onClick={onLogout} aria-label="Sair da conta"><ShieldCheck size={17} /></button></div></header>
    <main className="minutes-main">
      <div className="minutes-heading"><div><span className="section-kicker">Etapa A · consulta operacional</span><h1>Atas, saldos e pedidos</h1><p>Consulte as atas autorizadas, seus itens, vínculos e histórico. Esta etapa não cria nem altera registros.</p></div><button className="minutes-refresh" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "minutes-spin" : ""} /> Atualizar</button></div>
      <section className="minutes-metrics" aria-label="Resumo de atas"><div><span><ClipboardList size={16} /> Total de atas</span><strong>{counts.total}</strong><small>retornadas pela RLS</small></div><div><span><CheckCircle2 size={16} /> Ativas</span><strong>{counts.ativas}</strong><small>em operação</small></div><div><span><CalendarDays size={16} /> Próximas</span><strong>{counts.proximas}</strong><small>vigência futura</small></div><div className={counts.expirando ? "minutes-metric-warning" : ""}><span><AlertTriangle size={16} /> Vencendo</span><strong>{counts.expirando}</strong><small>até 90 dias</small></div></section>
      {error && <div className="minutes-alert" role="alert"><AlertTriangle size={18} /><div><strong>Não foi possível carregar as atas</strong><span>{error}</span></div><button type="button" onClick={() => void load()}>Tentar novamente</button></div>}
      <section className="minutes-workspace"><div className="minutes-list-panel"><div className="minutes-toolbar"><div><span className="section-kicker">Registros autorizados</span><h2>Atas cadastradas</h2></div><span className="minutes-result-count">{filtered.length} resultado(s)</span></div><div className="minutes-filters"><label className="minutes-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ata, objeto ou fornecedor" /></label><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} aria-label="Filtrar por situação"><option value="TODAS">Todas as situações</option>{["ATIVA", "PROXIMA", "SUSPENSA", "ENCERRADA", "VENCIDA", "CANCELADA"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></div>{loading && !data ? <EmptyState text="Carregando atas do Supabase…" /> : filtered.length === 0 ? <EmptyState text={atas.length ? "Nenhuma ata corresponde aos filtros." : "Nenhuma ata autorizada para este usuário."} /> : <div className="minutes-list">{filtered.map((ata) => <button type="button" key={ata.id} className={`minutes-list-row ${selected?.id === ata.id ? "is-selected" : ""}`} onClick={() => setSelectedId(ata.id)}><div className="minutes-list-row-main"><div className="minutes-ata-mark"><FileSearch size={17} /></div><div><strong>Ata {ata.numero_ata || "sem número"}</strong><span>{supplierName(ata.fornecedor_id)}</span><small>{ata.objeto || "Objeto não informado"}</small></div></div><div className="minutes-list-row-side"><span className={statusClass(ata.situacao)}>{statusLabel(ata.situacao)}</span><small>Vigência até {formatDate(ata.data_fim_vigencia)}</small><ChevronRight size={16} /></div></button>)}</div>}</div>
        <aside className="minutes-detail-panel">{selected ? <><div className="minutes-detail-head"><div><span className="section-kicker">Registro #{selected.id}</span><h2>Ata {selected.numero_ata || "sem número"}</h2><span className={statusClass(selected.situacao)}>{statusLabel(selected.situacao)}</span></div><span className="minutes-detail-source">Fonte: cadastro municipal</span></div><p className="minutes-object">{selected.objeto || "Objeto não informado."}</p><div className="minutes-detail-grid"><div><span>Fornecedor</span><strong>{supplierName(selected.fornecedor_id)}</strong></div><div><span>Processo administrativo</span><strong>{selected.processo_administrativo || "Não informado"}</strong></div><div><span>Modalidade / pregão</span><strong>{selected.modalidade || "Não informada"}{selected.numero_pregao ? ` · ${selected.numero_pregao}` : ""}</strong></div><div><span>Vigência</span><strong>{formatDate(selected.data_inicio_vigencia)} → {formatDate(selected.data_fim_vigencia)}</strong></div><div><span>Valor global</span><strong>{formatMoney(selected.valor_global)}</strong></div><div><span>Órgão responsável</span><strong>{orgaoName(selected.orgao_responsavel_id)}</strong></div></div>{!selected.processo_compras_id && <div className="minutes-pending"><AlertTriangle size={17} /><div><strong>Vínculo com Licitações pendente</strong><span>Esta ata não possui um processo de compras vinculado no cadastro atual. Ela permanece disponível para consulta operacional.</span></div></div>}{selected.observacoes && <div className="minutes-note"><span>Observações</span><p>{selected.observacoes}</p></div>}<div className="minutes-detail-sections"><section><SectionTitle icon={PackageSearch} eyebrow="Composição" title="Itens e saldos" count={selectedItems.length} />{selectedItems.length ? <div className="minutes-item-list">{selectedItems.slice(0, 80).map((item) => <div className="minutes-item-row" key={item.id}><div><strong>{item.item_numero || "Item"} · {item.descricao}</strong><span>{formatNumber(item.quantidade_contratada)} {item.unidade_medida || "UN"} · {formatMoney(item.valor_unitario)} por unidade</span></div><div><b>{formatNumber(item.saldo_quantidade)}</b><small>saldo · {formatMoney(item.saldo_valor)}</small></div></div>)}</div> : <EmptyState text="Nenhum item vinculado a esta ata." />}</section><section><SectionTitle icon={UsersRound} eyebrow="Abrangência" title="Órgãos consumidores" count={selectedOrgaos.length} />{selectedOrgaos.length ? <div className="minutes-chip-list">{selectedOrgaos.map((item) => <span key={item.id}><Store size={14} />{orgaoName(item.orgao_id)}</span>)}</div> : <EmptyState text="Nenhum órgão consumidor informado." />}</section><section><SectionTitle icon={CircleDollarSign} eyebrow="Operação" title="Pedidos relacionados" count={selectedPedidos.length} />{selectedPedidos.length ? <div className="minutes-item-list">{selectedPedidos.map((pedido) => <div className="minutes-item-row" key={pedido.id}><div><strong>{pedido.numero_pedido || `Pedido #${pedido.id}`}</strong><span>{formatDate(pedido.data_solicitacao)} · {pedido.status_aprovacao || pedido.status || "Sem situação"}</span></div><div><b>{formatMoney(pedido.valor_total)}</b><small>{data?.itensPedidos.filter((item) => item.pedido_id === pedido.id).length || 0} item(ns)</small></div></div>)}</div> : <EmptyState text="Nenhum pedido relacionado encontrado." />}</section><section><SectionTitle icon={History} eyebrow="Rastreabilidade" title="Histórico recente" count={selectedHistory.length} />{selectedHistory.length ? <div className="minutes-history">{selectedHistory.map((event: AtaHistorico) => <div key={event.id}><span>{formatDate(event.created_at)}</span><strong>{event.campo_alterado}</strong><small>{event.valor_antigo || "vazio"} → {event.valor_novo || "vazio"}</small></div>)}</div> : <EmptyState text="Nenhum evento de histórico disponível." />}</section></div></> : <EmptyState text="Selecione uma ata para ver o detalhe." />}</aside>
      </section>
    </main>
  </div>;
}
