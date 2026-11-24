import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Filter, LoaderCircle, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CatalogRow = {
  id: string;
  codigo: string;
  nome: string;
  sistema: string | null;
  categoria: string;
  natureza: "CONFIRMADA" | "CONDICIONAL" | "GERENCIAL" | "PENDENCIA_VALIDACAO";
  descricao: string | null;
  sujeito: string | null;
  frequencia: string | null;
  regra_prazo: string | null;
  consequencia: string | null;
  ativo: boolean;
};

type PanelRow = {
  id: string;
  competencia_label: string | null;
  prazo: string;
  status: "NAO_INICIADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ATRASADA" | "DISPENSADA" | "PENDENTE_VALIDACAO";
  codigo: string;
  nome: string;
  sistema: string | null;
  categoria: string;
  natureza: CatalogRow["natureza"];
  frequencia: string | null;
  consequencia: string | null;
  vencida: boolean;
  dias_ate_prazo: number;
};

type Obligation = CatalogRow & { instance?: PanelRow };
type FilterStatus = "TODAS" | "CONFIGURADAS" | "AGUARDANDO";
type FilterNature = "TODAS" | CatalogRow["natureza"];

const statusLabels: Record<PanelRow["status"], string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  ATRASADA: "Atrasada",
  DISPENSADA: "Dispensada",
  PENDENTE_VALIDACAO: "Pendente de validação",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`));
}

function natureLabel(value: CatalogRow["natureza"]) {
  return value === "CONDICIONAL" ? "Condicional" : value === "CONFIRMADA" ? "Confirmada" : value === "PENDENCIA_VALIDACAO" ? "Validar" : "Gerencial";
}

function instanceStatus(row?: PanelRow) {
  if (!row) return { label: "Aguardando competência", className: "health-obligation-status--pending", icon: <SlidersHorizontal size={13} /> };
  if (row.vencida) return { label: "Atrasada", className: "health-obligation-status--late", icon: <AlertTriangle size={13} /> };
  if (row.status === "CONCLUIDA") return { label: statusLabels[row.status], className: "health-obligation-status--done", icon: <CheckCircle2 size={13} /> };
  return { label: statusLabels[row.status], className: "health-obligation-status--active", icon: <CalendarClock size={13} /> };
}

export function HealthObligationsModule({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [panel, setPanel] = useState<PanelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("TODAS");
  const [nature, setNature] = useState<FilterNature>("TODAS");
  const [system, setSystem] = useState("TODOS");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const [catalogResult, panelResult] = await Promise.all([
        supabase.from("saude_obrigacoes_catalogo").select("id,codigo,nome,sistema,categoria,natureza,descricao,sujeito,frequencia,regra_prazo,consequencia,ativo").eq("ativo", true).order("codigo").limit(100),
        supabase.from("saude_painel_obrigacoes").select("id,competencia_label,prazo,status,codigo,nome,sistema,categoria,natureza,frequencia,consequencia,vencida,dias_ate_prazo").order("prazo", { ascending: true }).limit(100),
      ]);
      if (!active) return;
      if (catalogResult.error) setError("Não foi possível carregar o catálogo de obrigações. Verifique seu acesso e tente novamente.");
      else setCatalog((catalogResult.data || []) as CatalogRow[]);
      if (!panelResult.error) setPanel((panelResult.data || []) as PanelRow[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user.id]);

  const obligations = useMemo<Obligation[]>(() => catalog.map((item) => ({ ...item, instance: panel.find((row) => row.codigo === item.codigo) })), [catalog, panel]);
  const systems = useMemo(() => Array.from(new Set(obligations.map((item) => item.sistema).filter(Boolean) as string[])).sort(), [obligations]);
  const filtered = useMemo(() => obligations.filter((item) => {
    const text = `${item.codigo} ${item.nome} ${item.sistema || ""} ${item.descricao || ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase().trim());
    const matchesNature = nature === "TODAS" || item.natureza === nature;
    const matchesSystem = system === "TODOS" || item.sistema === system;
    const matchesStatus = status === "TODAS" || (status === "CONFIGURADAS" ? Boolean(item.instance) : !item.instance);
    return matchesSearch && matchesNature && matchesSystem && matchesStatus;
  }), [obligations, nature, search, status, system]);

  const configured = obligations.filter((item) => item.instance).length;
  const overdue = panel.filter((item) => item.vencida).length;
  const confirmed = obligations.filter((item) => item.natureza === "CONFIRMADA").length;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";

  return <div className="dashboard-shell health-shell"><header className="app-header"><button className="header-back-button" type="button" onClick={onBack}><ArrowRight size={16} className="header-back-icon" /> Voltar aos módulos</button><div className="user-menu"><div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div><div className="user-avatar user-avatar--initials" aria-label={`Avatar de ${displayName}`}>{displayName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase()}</div><button className="user-menu-button" type="button" aria-label="Sair da conta" onClick={onLogout}><ArrowRight size={16} /></button></div></header><main className="health-obligations-main"><div className="health-obligations-heading"><div><p className="eyebrow">Saúde / gestão e administração</p><h1>Obrigações e prazos</h1><p>Acompanhe o catálogo de responsabilidades da Secretaria Municipal de Saúde e as competências já configuradas.</p></div><span className="health-obligations-secure"><ShieldCheck size={14} /> Dados protegidos</span></div><section className="health-obligation-metrics" aria-label="Resumo das obrigações"><div><ClipboardList size={18} /><strong>{catalog.length}</strong><span>Obrigações no catálogo</span></div><div><CheckCircle2 size={18} /><strong>{confirmed}</strong><span>Confirmadas na documentação</span></div><div><SlidersHorizontal size={18} /><strong>{configured}</strong><span>Com competência configurada</span></div><div className={overdue > 0 ? "is-alert" : ""}><AlertTriangle size={18} /><strong>{overdue}</strong><span>Vencidas no painel</span></div></section>{catalog.length > 0 && configured === 0 && <div className="health-obligations-notice"><SlidersHorizontal size={18} /><div><strong>O catálogo está pronto, mas ainda não há competências municipais.</strong><span>Os prazos dependem da configuração local, adesões e calendários oficiais. Nenhum vencimento foi presumido nesta tela.</span></div></div>}<section className="health-obligations-panel"><div className="health-obligations-toolbar"><div><h2>Catálogo de obrigações</h2><p>{filtered.length} de {obligations.length} itens exibidos</p></div><div className="health-obligations-filters"><label className="health-obligations-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar obrigação, sistema ou código" /></label><label><Filter size={14} /><select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus)}><option value="TODAS">Todos os estados</option><option value="AGUARDANDO">Aguardando competência</option><option value="CONFIGURADAS">Com competência</option></select></label><label><select value={nature} onChange={(event) => setNature(event.target.value as FilterNature)}><option value="TODAS">Todas as naturezas</option><option value="CONFIRMADA">Confirmadas</option><option value="CONDICIONAL">Condicionais</option><option value="PENDENCIA_VALIDACAO">A validar</option></select></label><label><select value={system} onChange={(event) => setSystem(event.target.value)}><option value="TODOS">Todos os sistemas</option>{systems.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div></div>{loading ? <div className="health-obligations-empty"><LoaderCircle size={22} className="health-obligations-spinner" /><span>Carregando obrigações do Supabase…</span></div> : error ? <div className="health-obligations-empty health-obligations-empty--error"><AlertTriangle size={22} /><span>{error}</span></div> : filtered.length === 0 ? <div className="health-obligations-empty"><Search size={22} /><span>Nenhuma obrigação corresponde aos filtros selecionados.</span></div> : <div className="health-obligation-list">{filtered.map((item) => { const current = instanceStatus(item.instance); return <article className="health-obligation-card" key={item.id}><div className="health-obligation-card-top"><div><span className="health-obligation-code">{item.codigo}</span><h3>{item.nome}</h3></div><span className={`health-obligation-status ${current.className}`}>{current.icon}{current.label}</span></div><p>{item.descricao || "Descrição ainda não informada."}</p><div className="health-obligation-meta"><span><b>Sistema</b>{item.sistema || "Não informado"}</span><span><b>Natureza</b><em className={item.natureza === "CONDICIONAL" ? "is-conditional" : ""}>{natureLabel(item.natureza)}</em></span><span><b>Frequência</b>{item.frequencia || "A definir"}</span>{item.instance ? <span><b>Prazo</b>{formatDate(item.instance.prazo)}{item.instance.competencia_label ? ` · ${item.instance.competencia_label}` : ""}</span> : <span><b>Prazo</b>Não configurado</span>}</div><div className="health-obligation-rule"><b>Regra de prazo</b><span>{item.regra_prazo || "Validar calendário oficial aplicável."}</span></div></article>; })}</div>}</section><footer className="health-footer"><span><ShieldCheck size={14} /> Leitura controlada pelo Supabase</span><span>Catálogo global · competências municipais separadas</span><button type="button" onClick={onLogout}>Sair da conta</button></footer></main></div>;
}
