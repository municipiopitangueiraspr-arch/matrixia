import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Filter,
  Info,
  LoaderCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
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
  if (!row) return { label: "Sem competência municipal", className: "health-obligation-status--pending", icon: <SlidersHorizontal size={13} /> };
  if (row.status === "DISPENSADA") return { label: "Dispensada", className: "health-obligation-status--muted", icon: <Info size={13} /> };
  if (row.status === "PENDENTE_VALIDACAO") return { label: "Pendente de validação", className: "health-obligation-status--pending", icon: <Info size={13} /> };
  if (row.vencida) return { label: "Atrasada", className: "health-obligation-status--late", icon: <AlertTriangle size={13} /> };
  if (row.status === "CONCLUIDA") return { label: statusLabels[row.status], className: "health-obligation-status--done", icon: <CheckCircle2 size={13} /> };
  return { label: statusLabels[row.status], className: "health-obligation-status--active", icon: <CalendarClock size={13} /> };
}

export function HealthObligationsModule({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [panel, setPanel] = useState<PanelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panelError, setPanelError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("TODAS");
  const [nature, setNature] = useState<FilterNature>("TODAS");
  const [system, setSystem] = useState("TODOS");
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setPanelError("");
      const [catalogResult, panelResult] = await Promise.all([
        supabase.from("saude_obrigacoes_catalogo").select("id,codigo,nome,sistema,categoria,natureza,descricao,sujeito,frequencia,regra_prazo,consequencia,ativo").eq("ativo", true).order("codigo").limit(100),
        supabase.from("saude_painel_obrigacoes").select("id,competencia_label,prazo,status,codigo,nome,sistema,categoria,natureza,frequencia,consequencia,vencida,dias_ate_prazo").order("prazo", { ascending: true }).limit(100),
      ]);
      if (!active) return;
      if (catalogResult.error) setError("Não foi possível carregar o catálogo de obrigações. Verifique seu acesso e tente novamente.");
      else setCatalog((catalogResult.data || []) as CatalogRow[]);
      if (panelResult.error) setPanelError("Catálogo disponível; não foi possível consultar as competências municipais agora.");
      else setPanel((panelResult.data || []) as PanelRow[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [reloadKey, user.id]);

  const obligations = useMemo<Obligation[]>(() => catalog.map((item) => ({ ...item, instance: panel.find((row) => row.codigo === item.codigo) })), [catalog, panel]);
  const systems = useMemo(() => Array.from(new Set(obligations.map((item) => item.sistema).filter(Boolean) as string[])).sort(), [obligations]);
  const filtered = useMemo(() => obligations.filter((item) => {
    const text = `${item.codigo} ${item.nome} ${item.sistema || ""} ${item.categoria} ${item.sujeito || ""} ${item.descricao || ""} ${item.consequencia || ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase().trim());
    const matchesNature = nature === "TODAS" || item.natureza === nature;
    const matchesSystem = system === "TODOS" || item.sistema === system;
    const matchesStatus = status === "TODAS" || (status === "CONFIGURADAS" ? Boolean(item.instance) : !item.instance);
    return matchesSearch && matchesNature && matchesSystem && matchesStatus;
  }), [obligations, nature, search, status, system]);

  const configured = obligations.filter((item) => item.instance).length;
  const overdue = panel.filter((item) => item.vencida).length;
  const confirmed = obligations.filter((item) => item.natureza === "CONFIRMADA").length;
  const conditional = obligations.filter((item) => item.natureza === "CONDICIONAL").length;
  const hasFilters = Boolean(search.trim()) || status !== "TODAS" || nature !== "TODAS" || system !== "TODOS";
  const clearFilters = () => { setSearch(""); setStatus("TODAS"); setNature("TODAS"); setSystem("TODOS"); };
  const filteredContext = filtered.length === 0 ? "Nenhuma obrigação" : `${filtered.length} ${filtered.length === 1 ? "obrigação" : "obrigações"}`;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";

  return (
    <div className="dashboard-shell health-shell">
      <header className="app-header">
        <button className="header-back-button" type="button" onClick={onBack}><ArrowRight size={16} className="header-back-icon" /> Voltar aos módulos</button>
        <div className="user-menu">
          <div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div>
          <div className="user-avatar user-avatar--initials" aria-label={`Avatar de ${displayName}`}>{displayName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase()}</div>
          <button className="user-menu-button" type="button" aria-label="Sair da conta" onClick={onLogout}><ArrowRight size={16} /></button>
        </div>
      </header>

      <main className="health-obligations-main">
        <div className="health-obligations-heading">
          <div><p className="eyebrow">Saúde / gestão e administração</p><h1>Obrigações e prazos</h1><p>Uma leitura orientada para saber o que já está documentado, o que depende do município e qual é o próximo atendimento.</p></div>
          <span className="health-obligations-secure"><ShieldCheck size={14} /> Dados protegidos</span>
        </div>

        <section className="health-obligations-guide" aria-label="Como atender este painel">
          <div className="health-obligations-guide-head"><div className="health-obligations-guide-title"><span><Info size={16} /></span><div><strong>Como usar este painel</strong><small>O catálogo é a referência. O prazo só aparece quando uma competência municipal for configurada.</small></div></div><button type="button" onClick={() => setShowGuide((current) => !current)} aria-expanded={showGuide}>{showGuide ? "Ocultar orientação" : "Mostrar orientação"}<ChevronDown size={15} className={showGuide ? "is-open" : ""} /></button></div>
          {showGuide && <div className="health-obligations-guide-steps"><div><b>1</b><span><strong>Conheça a obrigação</strong>Use a natureza, o sistema e a regra de prazo para entender o item.</span></div><div><b>2</b><span><strong>Valide o cenário local</strong>Confirme adesões, unidades, responsáveis e calendário oficial antes de criar competências.</span></div><div><b>3</b><span><strong>Acompanhe o prazo</strong>Depois da configuração, o painel passa a mostrar status, competência e vencimento.</span></div></div>}
        </section>

        <section className="health-obligation-metrics" aria-label="Resumo das obrigações">
          <div><ClipboardList size={18} /><strong>{catalog.length}</strong><span>Itens no catálogo</span><small>referência documental</small></div>
          <div><CheckCircle2 size={18} /><strong>{confirmed}</strong><span>Confirmadas</span><small>aplicabilidade indicada</small></div>
          <div><SlidersHorizontal size={18} /><strong>{configured}</strong><span>Competências configuradas</span><small>{configured === 0 ? "próxima etapa de atendimento" : "com acompanhamento ativo"}</small></div>
          <div className={overdue > 0 ? "is-alert" : ""}><AlertTriangle size={18} /><strong>{overdue}</strong><span>Vencidas</span><small>{overdue > 0 ? "requer atenção" : "nenhuma no painel"}</small></div>
        </section>

        {catalog.length > 0 && configured === 0 && <div className="health-obligations-notice"><SlidersHorizontal size={18} /><div><strong>Próxima etapa: configurar as competências do município.</strong><span>Há {confirmed} obrigações confirmadas e {conditional} condicionais no catálogo. Os prazos dependem da validação local; nenhum vencimento foi presumido.</span></div></div>}

        <section className="health-obligations-panel">
          <div className="health-obligations-toolbar">
            <div><div className="health-obligations-section-kicker">Consulta rápida</div><h2>Catálogo de obrigações</h2><p aria-live="polite">{filteredContext} exibidas · {configured === 0 ? "todas sem competência municipal" : `${configured} com competência municipal`}</p></div>
            <div className="health-obligations-filters">
              <label className="health-obligations-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar obrigação ou sistema" aria-label="Buscar obrigação ou sistema" /></label>
              <label><Filter size={14} /><select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus)} aria-label="Filtrar por configuração"><option value="TODAS">Todos os estados</option><option value="AGUARDANDO">Aguardando configuração</option><option value="CONFIGURADAS">Com competência</option></select></label>
              <label><select value={nature} onChange={(event) => setNature(event.target.value as FilterNature)} aria-label="Filtrar por natureza"><option value="TODAS">Todas as naturezas</option><option value="CONFIRMADA">Confirmadas</option><option value="CONDICIONAL">Condicionais</option><option value="GERENCIAL">Gerenciais</option><option value="PENDENCIA_VALIDACAO">A validar</option></select></label>
              <label><select value={system} onChange={(event) => setSystem(event.target.value)} aria-label="Filtrar por sistema"><option value="TODOS">Todos os sistemas</option>{systems.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
          </div>

          {loading ? <div className="health-obligations-empty"><LoaderCircle size={22} className="health-obligations-spinner" /><span>Carregando obrigações do Supabase…</span></div> : error ? <div className="health-obligations-empty health-obligations-empty--error"><AlertTriangle size={22} /><span>{error}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Tentar novamente</button></div> : <>
            {panelError && <div className="health-obligations-partial-error" role="status"><AlertTriangle size={16} /><span>{panelError}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Tentar novamente</button></div>}
            {filtered.length === 0 ? <div className="health-obligations-empty"><Search size={22} /><span>{hasFilters ? "Nenhuma obrigação corresponde aos filtros selecionados." : "O catálogo está vazio."}</span>{hasFilters && <button type="button" onClick={clearFilters}>Limpar filtros</button>}</div> : <div className="health-obligation-list">{filtered.map((item) => {
            const current = instanceStatus(item.instance);
            return <article className="health-obligation-card" key={item.id}>
              <div className="health-obligation-card-top"><div><span className="health-obligation-code">{item.codigo}</span><h3>{item.nome}</h3></div><span className={`health-obligation-status ${current.className}`}>{current.icon}{current.label}</span></div>
              <p>{item.descricao || "Descrição ainda não informada."}</p>
              <div className="health-obligation-meta"><span><b>Sistema</b>{item.sistema || "Não informado"}</span><span><b>Natureza</b><em className={item.natureza === "CONDICIONAL" ? "is-conditional" : ""}>{natureLabel(item.natureza)}</em></span><span><b>Frequência</b>{item.frequencia || "A definir"}</span>{item.instance ? <span><b>Prazo</b>{formatDate(item.instance.prazo)}{item.instance.competencia_label ? ` · ${item.instance.competencia_label}` : ""}</span> : <span><b>Prazo</b>Não configurado</span>}</div>
              <details className="health-obligation-context"><summary><Info size={14} /> Ver contexto de atendimento <ChevronDown size={14} /></summary><div><span><ClipboardList size={14} /><b>Categoria</b>{item.categoria.replaceAll("_", " ")}</span><span><UserRound size={14} /><b>Quem atende</b>{item.sujeito || "Responsabilidade ainda não validada."}</span><span><CalendarClock size={14} /><b>Regra de prazo</b>{item.regra_prazo || "Validar calendário oficial aplicável."}</span><span><AlertTriangle size={14} /><b>Por que importa</b>{item.consequencia || "Avaliar impactos e exigências no cenário local."}</span></div></details>
            </article>;
            })}</div>}
          </>}
        </section>

        <footer className="health-footer"><span><ShieldCheck size={14} /> Leitura controlada pelo Supabase</span><span>Catálogo global · competências municipais separadas</span><button type="button" onClick={onLogout}>Sair da conta</button></footer>
      </main>
    </div>
  );
}
