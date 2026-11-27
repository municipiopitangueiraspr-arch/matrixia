import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Baby, BookOpen, BriefcaseBusiness, ChartNoAxesCombined, Check, ChevronDown, ClipboardCheck, ClipboardList, Construction, Dna, Dumbbell, Edit3, Eye, EyeOff, FileText, GraduationCap, HandHeart, HeartPulse, Landmark, Library, LockKeyhole, LogOut, Map, MapPin, Mail, Navigation, Pencil, Pill, Plus, Search, Share2, ShieldCheck, Sprout, Syringe, UserRound, UsersRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { IntegratedTerritoryModule } from "@/components/IntegratedTerritoryModule";
import { HealthObligationsModule } from "@/components/HealthObligationsModule";
import { HealthQuestionnairesModule } from "@/components/HealthQuestionnairesModule";
import { LibraryManagementModule } from "@/components/LibraryManagementModule";
import { GovernanceModule } from "@/components/GovernanceModule";
import { ProcurementMinutesModule } from "@/components/ProcurementMinutesModule";
import { useDialog } from "@/contexts/DialogContext";

type View = "login" | "forgot" | "reset";
type SecretariatArt = "administracao" | "agricultura" | "assistencia" | "cultura" | "economico" | "educacao" | "esporte" | "obras" | "saude" | "seguranca" | "planejamento" | "governanca" | "territorio";
type Secretariat = { name: string; description: string; art: SecretariatArt; tone: string; category: "secretariat" | "shared" };

const secretariats: Secretariat[] = [
  { name: "Administração e Finanças", description: "Gestão administrativa, orçamentária e financeira", art: "administracao", tone: "blue", category: "secretariat" },
  { name: "Agricultura e Meio Ambiente", description: "Desenvolvimento rural, sustentabilidade e território", art: "agricultura", tone: "green", category: "secretariat" },
  { name: "Assistência Social", description: "Proteção social, famílias e cidadania", art: "assistencia", tone: "rose", category: "secretariat" },
  { name: "Cultura e Turismo", description: "Patrimônio, eventos, cultura e experiências", art: "cultura", tone: "purple", category: "secretariat" },
  { name: "Desenvolvimento Econômico", description: "Emprego, inovação e fortalecimento local", art: "economico", tone: "orange", category: "secretariat" },
  { name: "Educação", description: "Rede municipal, aprendizagem e comunidade escolar", art: "educacao", tone: "indigo", category: "secretariat" },
  { name: "Esporte e Lazer", description: "Atividade física, recreação e qualidade de vida", art: "esporte", tone: "cyan", category: "secretariat" },
  { name: "Obras e Serviços Públicos", description: "Infraestrutura, manutenção e serviços urbanos", art: "obras", tone: "amber", category: "secretariat" },
  { name: "Saúde e Vigilância Sanitária", description: "Atenção à saúde, cuidado e vigilância", art: "saude", tone: "teal", category: "secretariat" },
  { name: "Segurança Pública e Trânsito", description: "Prevenção, mobilidade e segurança viária", art: "seguranca", tone: "slate", category: "secretariat" },
  { name: "Planejamento e Urbanismo", description: "Planejamento municipal, obras e cidade", art: "planejamento", tone: "sky", category: "secretariat" },
  { name: "Governança", description: "Usuários, acessos, auditoria e integridade", art: "governanca", tone: "navy", category: "shared" },
  { name: "Território Integrado", description: "Lotes, endereços, pessoas e camadas compartilhadas", art: "territorio", tone: "sky", category: "shared" },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "brand--compact" : ""}`} aria-label="MatrixIA"><div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div><div className="brand-wordmark"><strong>Matrix</strong><em>IA</em><small>inteligência municipal</small></div></div>;
}

function Field({ label, icon: Icon, type = "text", value, onChange, placeholder, autoComplete, disabled, suffix }: any) {
  return <label className="field"><span>{label}</span><div className="field-control"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /><input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} disabled={disabled} required />{suffix}</div></label>;
}

function initials(user: User) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "U";
  return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part: string) => part[0].toUpperCase()).join("");
}

type HealthModule = { name: string; description: string; icon: LucideIcon };
type HealthGroup = { name: string; count: number; icon: LucideIcon; tone: "blue" | "green" | "purple" | "orange"; modules: HealthModule[] };

const healthGroups: HealthGroup[] = [
  { name: "Gestão e Administração", count: 6, icon: BarChart3, tone: "blue", modules: [
    { name: "Obrigações e Prazos", description: "Catálogo, competências, status e prazos da Saúde.", icon: ClipboardCheck },
    { name: "Questionários", description: "Criação, versões, respostas e histórico local.", icon: ClipboardList },
    { name: "Território, Unidades e Equipes", description: "Rede municipal, áreas de atuação e equipes.", icon: Map },
    { name: "Resumo e Prioridades", description: "Indicadores, prioridades e próximos passos.", icon: ChartNoAxesCombined },
    { name: "Solicitações Administrativas", description: "Demandas, encaminhamentos e prazos.", icon: FileText },
    { name: "Ações e Registros", description: "Atualizações locais da secretaria.", icon: BookOpen },
  ] },
  { name: "Atenção à Saúde", count: 6, icon: Activity, tone: "green", modules: [
    { name: "Pessoas, Famílias e Domicílios", description: "Cadastro compartilhado e relações territoriais.", icon: UsersRound },
    { name: "Visitas e Ações no Território", description: "Roteiros, visitas ACS/ACE, domicílios e pendências.", icon: Navigation },
    { name: "Atendimentos e Produção Assistencial", description: "Atendimentos, procedimentos, atividades coletivas e produção.", icon: HeartPulse },
    { name: "Encaminhamentos e Regulação", description: "Fila, ofertas, retornos e desfechos.", icon: Share2 },
    { name: "Exames e Medicamentos", description: "Pedidos, procedimentos e resultados.", icon: ClipboardCheck },
    { name: "Assistência Farmacêutica", description: "Estoques, lotes e movimentações por unidade.", icon: Pill },
  ] },
  { name: "Vigilância em Saúde", count: 3, icon: ShieldCheck, tone: "purple", modules: [
    { name: "Vigilância Sanitária", description: "Estabelecimentos, licenças e inspeções.", icon: ShieldCheck },
    { name: "Vigilância Epidemiológica", description: "Acompanhamento administrativo de agravos.", icon: Dna },
    { name: "Imunização e Vacinação", description: "Esquemas e doses demonstrativas.", icon: Syringe },
  ] },
  { name: "Saúde Especializada", count: 2, icon: UserRound, tone: "orange", modules: [
    { name: "Saúde da Mulher", description: "Pré-natal, puerpério e acompanhamentos.", icon: UserRound },
    { name: "Acompanhamento da Criança", description: "Transição administrativa para a APS.", icon: Baby },
  ] },
];

function HealthModules({ user, onBack, onLogout, onTerritory, onObligations, onQuestionnaires }: { user: User; onBack: () => void; onLogout: () => void; onTerritory: () => void; onObligations: () => void; onQuestionnaires: () => void }) {
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  return <div className="dashboard-shell health-shell"><header className="app-header"><button className="header-back-button" type="button" onClick={onBack}><ArrowRight size={16} className="header-back-icon" /> Voltar às secretarias</button><div className="user-menu"><div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div>{avatarUrl ? <img className="user-avatar" src={avatarUrl} alt={`Foto de ${displayName}`} /> : <div className="user-avatar user-avatar--initials" aria-label={`Avatar de ${displayName}`}>{initials(user)}</div>}<button className="user-menu-button" type="button" aria-label="Sair da conta" onClick={onLogout}><ChevronDown size={17} /></button></div></header><main className="health-main"><div className="health-heading"><div><p className="eyebrow">Catálogo operacional</p><h1>Módulos e serviços da Secretaria de Saúde</h1></div><span className="health-access-count">17 acessos</span></div><section className="health-groups" aria-label="Módulos da Secretaria de Saúde">{healthGroups.map((group) => <article className={`health-group health-group--${group.tone}`} key={group.name}><header className="health-group-header"><div className="health-group-title"><span className="health-group-icon"><group.icon size={21} /></span><div><h2>{group.name}</h2><span>{group.count} {group.count === 1 ? "módulo" : "módulos"}</span></div></div><button type="button" onClick={() => {}}>Ver todos <ArrowRight size={15} /></button></header><div className="health-module-grid">{group.modules.map((module) => <button className="health-module-card" type="button" key={module.name} onClick={module.name === "Território, Unidades e Equipes" ? onTerritory : module.name === "Obrigações e Prazos" ? onObligations : module.name === "Questionários" ? onQuestionnaires : () => {}}><span className="health-module-icon"><module.icon size={24} /></span><strong>{module.name}</strong><small>{module.description}</small><span className="health-module-action">Abrir <ArrowRight size={14} /></span></button>)}</div></article>)}</section><footer className="health-footer"><span><MapPin size={14} /> Pitangueiras, Paraná</span><span>Visão de secretário · cenário simulado</span><button type="button" onClick={onLogout}>Sair da conta</button></footer></main></div>;
}

function CultureModules({ user, onBack, onLibrary, onLogout }: { user: User; onBack: () => void; onLibrary: () => void; onLogout: () => void }) {
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  return <div className="dashboard-shell health-shell culture-shell"><header className="app-header"><button className="header-back-button" type="button" onClick={onBack}><ArrowRight size={16} className="header-back-icon" /> Voltar às secretarias</button><div className="user-menu"><div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div>{avatarUrl ? <img className="user-avatar" src={avatarUrl} alt={`Foto de ${displayName}`} /> : <div className="user-avatar user-avatar--initials" aria-label={`Avatar de ${displayName}`}>{initials(user)}</div>}<button className="user-menu-button" type="button" aria-label="Sair da conta" onClick={onLogout}><ChevronDown size={17} /></button></div></header><main className="health-main"><div className="health-heading"><div><p className="eyebrow">Catálogo operacional</p><h1>Módulos e serviços da Secretaria de Cultura e Turismo</h1><p>Escolha um módulo para iniciar a gestão da área.</p></div><span className="health-access-count">1 módulo</span></div><section className="health-groups" aria-label="Módulos da Secretaria de Cultura e Turismo"><article className="health-group health-group--purple"><header className="health-group-header"><div className="health-group-title"><span className="health-group-icon"><Library size={21} /></span><div><h2>Gestão cultural</h2><span>1 módulo disponível</span></div></div></header><div className="health-module-grid"><button className="health-module-card" type="button" onClick={onLibrary}><span className="health-module-icon"><Library size={24} /></span><strong>Biblioteca Municipal</strong><small>Acervo, leitores, circulação, reservas, inventário e documentos.</small><span className="health-module-action">Abrir gestão <ArrowRight size={14} /></span></button></div></article></section><footer className="health-footer"><span><MapPin size={14} /> Pitangueiras, Paraná</span><span>Secretaria de Cultura e Turismo</span><button type="button" onClick={onLogout}>Sair da conta</button></footer></main></div>;
}

type TerritoryTab = "map" | "units" | "teams" | "professionals" | "areas" | "catalogs";
type TerritoryRecord = { id: string; name: string; code?: string; status: "Ativa" | "Inativa"; detail: string };

const territorySeed: Record<Exclude<TerritoryTab, "map">, TerritoryRecord[]> = {
  units: [
    { id: "SIM-UBS-001", name: "UBS Vila Nova", code: "UBS-01", status: "Ativa", detail: "Rua Paraná, 120 · Centro" },
    { id: "SIM-UBS-002", name: "UBS Jardim União", code: "UBS-02", status: "Ativa", detail: "Av. das Palmeiras, 480 · Jardim União" },
    { id: "SIM-UBS-003", name: "UBS Rural do Cedro", code: "UBS-03", status: "Ativa", detail: "Estrada do Cedro, s/n · Zona rural" },
  ],
  teams: [
    { id: "SIM-EQ-001", name: "Equipe Saúde da Família Centro", code: "ESF-01", status: "Ativa", detail: "UBS Vila Nova · Microárea Centro" },
    { id: "SIM-EQ-002", name: "Equipe Saúde da Família União", code: "ESF-02", status: "Ativa", detail: "UBS Jardim União · Microárea União" },
    { id: "SIM-EQ-003", name: "Equipe Multiprofissional Rural", code: "EMP-01", status: "Ativa", detail: "UBS Rural do Cedro · Área Cedro" },
  ],
  professionals: [
    { id: "SIM-PRO-001", name: "Ana Paula Ribeiro", code: "ACS · CBO 5151-05", status: "Ativa", detail: "ESF-01 · UBS Vila Nova" },
    { id: "SIM-PRO-002", name: "Carlos Eduardo Lima", code: "Enfermeiro · COREN demo", status: "Ativa", detail: "ESF-01 · UBS Vila Nova" },
    { id: "SIM-PRO-003", name: "Mariana Souza", code: "Médica de Família · CRM demo", status: "Ativa", detail: "ESF-02 · UBS Jardim União" },
  ],
  areas: [
    { id: "SIM-AREA-001", name: "Microárea Vila Nova", code: "MA-01", status: "Ativa", detail: "1.240 moradores · ESF-01" },
    { id: "SIM-AREA-002", name: "Microárea Jardim União", code: "MA-02", status: "Ativa", detail: "980 moradores · ESF-02" },
    { id: "SIM-AREA-003", name: "Área Rural do Cedro", code: "AR-01", status: "Ativa", detail: "460 moradores · EMP-01" },
  ],
  catalogs: [
    { id: "SIM-CAT-001", name: "Unidade Básica de Saúde", code: "UBS", status: "Ativa", detail: "Tipo de unidade · versão 1" },
    { id: "SIM-CAT-002", name: "Saúde da Família", code: "ESF", status: "Ativa", detail: "Modelo de equipe · versão 1" },
    { id: "SIM-CAT-003", name: "Agente Comunitário de Saúde", code: "ACS", status: "Ativa", detail: "Categoria profissional · versão 1" },
  ],
};

const territoryLabels: Record<TerritoryTab, string> = { map: "Mapa territorial", units: "Unidades", teams: "Equipes", professionals: "Profissionais", areas: "Áreas de atuação", catalogs: "Catálogos" };

function TerritoryModule({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  const [tab, setTab] = useState<TerritoryTab>("map");
  const [records, setRecords] = useState(territorySeed);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<"areas" | "units" | "teams">("areas");
  const [mapSearch, setMapSearch] = useState("");
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const list = tab === "map" ? [] : records[tab as Exclude<TerritoryTab, "map">];
  const filtered = list.filter((record) => `${record.name} ${record.code} ${record.detail}`.toLowerCase().includes(search.toLowerCase()));
  const addRecord = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (tab === "map") return; const recordTab = tab as Exclude<TerritoryTab, "map">; const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim(); const code = String(data.get("code") || "").trim().toUpperCase(); if (!name) return; const detail = tab === "areas" ? `${data.get("estimatedResidents") || 0} moradores · cadastro demonstrativo` : tab === "catalogs" ? `${data.get("domain") || "Catálogo municipal"} · versão 1` : "Cadastro demonstrativo"; setRecords((current) => ({ ...current, [recordTab]: editingId ? current[recordTab].map((record) => record.id === editingId ? { ...record, name, code, detail } : record) : [{ id: `SIM-${recordTab.toUpperCase()}-${Date.now()}`, name, code, status: "Ativa", detail }, ...current[recordTab]] })); setShowForm(false); setEditingId(null); event.currentTarget.reset(); };
  return <div className="dashboard-shell territory-shell"><header className="app-header"><button className="header-back-button" type="button" onClick={onBack}><ArrowRight size={16} className="header-back-icon" /> Voltar aos módulos</button><div className="user-menu"><div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div>{avatarUrl ? <img className="user-avatar" src={avatarUrl} alt={`Foto de ${displayName}`} /> : <div className="user-avatar user-avatar--initials">{initials(user)}</div>}<button className="user-menu-button" type="button" aria-label="Sair da conta" onClick={onLogout}><ChevronDown size={17} /></button></div></header><main className="territory-main"><div className="territory-kicker"><span><Map size={14} /> Saúde e Vigilância Sanitária</span><span className="territory-demo"><i /> Cenário fictício · sem persistência</span></div><div className="territory-heading"><div><h1>Território, Unidades e Equipes</h1><p>Organize a rede de atenção, relacione equipes e profissionais e acompanhe as áreas de atuação no mapa demonstrativo.</p></div><button className="territory-help" type="button" title="Dados demonstrativos, sem persistência no banco de dados.">Sobre este módulo</button></div><div className="territory-metrics"><div><strong>{records.units.filter((r) => r.status === "Ativa").length}</strong><span>Unidades ativas</span><small>{records.units.length} cadastradas</small></div><div><strong>{records.teams.filter((r) => r.status === "Ativa").length}</strong><span>Equipes ativas</span><small>{records.teams.length} cadastradas</small></div><div><strong>{records.professionals.filter((r) => r.status === "Ativa").length}</strong><span>Profissionais ativos</span><small>{records.professionals.length} cadastrados</small></div><div><strong>{records.areas.filter((r) => r.status === "Ativa").length}</strong><span>Áreas de atuação</span><small>com cobertura esquemática</small></div></div><nav className="territory-tabs" aria-label="Seções do módulo territorial">{(Object.keys(territoryLabels) as TerritoryTab[]).map((key) => <button type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); setSearch(""); setShowForm(false); setEditingId(null); }} key={key}>{territoryLabels[key]}{key !== "map" && <b>{records[key as Exclude<TerritoryTab, "map">].length}</b>}</button>)}</nav>{tab === "map" ? <div className="territory-map-layout"><div className="territory-map-card"><div className="territory-map-card-head"><div><span>Mapa principal · dados simulados</span><strong>Como a rede de saúde se distribui no território</strong></div><span className="territory-map-zoom">100%</span></div><svg className="territory-map-svg" viewBox="0 0 1000 500" role="img" aria-label="Mapa esquemático territorial"><rect width="1000" height="500" fill="#edf4f1" /><path d="M-30 330 C180 240 250 360 430 250 S710 210 1030 80" fill="none" stroke="#c6d9d0" strokeWidth="26" /><path d="M-30 330 C180 240 250 360 430 250 S710 210 1030 80" fill="none" stroke="#fff" strokeWidth="3" /><path d="M150 -20 C180 100 230 190 280 520 M650 -20 C610 130 680 270 790 520" fill="none" stroke="#d6e4dc" strokeWidth="18" /><path d="M150 -20 C180 100 230 190 280 520 M650 -20 C610 130 680 270 790 520" fill="none" stroke="#fff" strokeWidth="2" /><path d="M140 150 L420 70 L550 205 L370 390 L90 320 Z" fill="#b8dfca" fillOpacity=".6" stroke="#5ba97f" strokeWidth="3" /><path d="M450 90 L780 80 L900 260 L680 370 L500 260 Z" fill="#c8d7f0" fillOpacity=".55" stroke="#7395ca" strokeWidth="3" /><path d="M360 300 L610 240 L820 400 L520 490 L240 420 Z" fill="#f1d9ad" fillOpacity=".55" stroke="#d49b44" strokeWidth="3" /><circle cx="300" cy="225" r="13" fill="#fff" stroke="#166d98" strokeWidth="5" /><circle cx="635" cy="188" r="13" fill="#fff" stroke="#166d98" strokeWidth="5" /><circle cx="520" cy="365" r="13" fill="#fff" stroke="#166d98" strokeWidth="5" /><text x="120" y="180" fill="#3b7258" fontSize="20" fontWeight="700">Vila Nova</text><text x="600" y="145" fill="#52729e" fontSize="20" fontWeight="700">Jardim União</text><text x="380" y="430" fill="#9a6e29" fontSize="20" fontWeight="700">Zona rural</text></svg><p className="territory-map-note"><strong>Como interpretar este mapa</strong><span>As áreas demonstram uma possível divisão de trabalho territorial. Unidades são pontos de referência e equipes aparecem vinculadas à sua unidade e área.</span></p></div><aside className="territory-map-side"><h3>Camadas do mapa</h3><button className={mapLayer === "areas" ? "active" : ""} type="button" onClick={() => setMapLayer("areas")}><Map size={15} /> Áreas</button><button className={mapLayer === "units" ? "active" : ""} type="button" onClick={() => setMapLayer("units")}><MapPin size={15} /> Unidades</button><button className={mapLayer === "teams" ? "active" : ""} type="button" onClick={() => setMapLayer("teams")}><UsersRound size={15} /> Equipes</button><label><Search size={14} /><input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="Buscar unidade, equipe ou área" /></label><small className="territory-map-layer-note">Camada ativa: {mapLayer === "areas" ? "áreas de atuação" : mapLayer === "units" ? "unidades de saúde" : "equipes"}{mapSearch && ` · filtro: ${mapSearch}`}</small></aside></div> : <div className="territory-list-panel"><div className="territory-list-toolbar"><div><h2>{territoryLabels[tab]}</h2><p>Cadastros demonstrativos do território municipal.</p></div><div className="territory-list-actions"><label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${territoryLabels[tab].toLowerCase()}`} /></label><button type="button" onClick={() => setShowForm(!showForm)}><Plus size={15} /> Novo cadastro</button></div></div>{showForm && <form className="territory-form" onSubmit={addRecord}><h3>{editingId ? "Editar" : "Novo cadastro de"} {territoryLabels[tab].toLowerCase()}</h3><div><label>Nome *<input name="name" required placeholder={tab === "areas" ? "Ex.: Microárea Vila Nova" : "Nome do cadastro"} defaultValue={editingId ? records[tab as Exclude<TerritoryTab, "map">].find((record) => record.id === editingId)?.name : ""} /></label><label>Código<input name="code" placeholder="SIM-001" defaultValue={editingId ? records[tab as Exclude<TerritoryTab, "map">].find((record) => record.id === editingId)?.code : ""} /></label>{tab === "units" && <><label>Tipo de unidade<select name="kind"><option>Unidade Básica de Saúde</option><option>Centro de Especialidades</option><option>Unidade rural</option></select></label><label>Endereço<input name="address" placeholder="Rua, número e complemento" /></label><label>Bairro ou localidade<input name="neighborhood" placeholder="Centro" /></label><label>Telefone demonstrativo<input name="phone" placeholder="(43) 3554-0000" /></label><label>Posição no mapa<select name="region"><option>Centro</option><option>Norte</option><option>Sul</option><option>Zona rural</option></select></label></>}{tab === "teams" && <><label>Modelo de equipe<select name="model"><option>Saúde da Família</option><option>Atenção Primária Rural</option><option>Saúde Bucal</option><option>Equipe Multiprofissional</option></select></label><label>Unidade de referência<select name="unitId"><option>UBS Vila Nova</option><option>UBS Jardim União</option><option>UBS Rural do Cedro</option></select></label><label>Área de atuação<select name="areaId"><option>Microárea Vila Nova</option><option>Microárea Jardim União</option><option>Área Rural do Cedro</option></select></label></>}{tab === "professionals" && <><label>Categoria profissional<select name="category"><option>Agente Comunitário de Saúde</option><option>Agente de Combate às Endemias</option><option>Médico de Família</option><option>Enfermeiro</option></select></label><label>Registro profissional<input name="registration" placeholder="CBO, COREN ou CRM demonstrativo" /></label><label>Equipe vinculada<select name="teamId"><option>ESF-01 · Centro</option><option>ESF-02 · Jardim União</option><option>EMP-01 · Rural</option></select></label><label>Telefone demonstrativo<input name="phone" placeholder="(43) 9 9000-0000" /></label></>}{tab === "areas" && <><label>Moradores estimados<input type="number" name="estimatedResidents" min="1" defaultValue="500" /></label><label>Equipe responsável<select name="teamId"><option>ESF-01 · Centro</option><option>ESF-02 · Jardim União</option><option>EMP-01 · Rural</option></select></label><label>Região<select name="region"><option>Centro</option><option>Norte</option><option>Sul</option><option>Zona rural</option></select></label><label>Cor da área<input type="color" name="color" defaultValue="#b8dfca" /></label></>}{tab === "catalogs" && <><label>Domínio<select name="domain"><option>Tipo de unidade</option><option>Modelo de equipe</option><option>Categoria profissional</option><option>Tipo de área</option></select></label><label>Nome ou descrição curta *<input name="label" required placeholder="Descrição do item" /></label><label>Descrição operacional<textarea name="description" placeholder="Como este item será utilizado no território" /></label><label>Vigência inicial<input type="date" name="validFrom" defaultValue="2026-11-24" /></label></>}</div><div><button type="button" className="territory-cancel" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="territory-save"><Check size={15} /> Salvar cadastro</button></div></form>}<div className="territory-table-wrap"><table className="territory-table"><thead><tr><th>{tab === "units" ? "Unidade" : tab === "teams" ? "Equipe" : tab === "professionals" ? "Profissional" : tab === "areas" ? "Área de atuação" : "Item de catálogo"}</th><th>{tab === "professionals" ? "Categoria/registro" : tab === "teams" ? "Unidade e área" : tab === "units" ? "Localização" : tab === "areas" ? "Cobertura" : "Domínio"}</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td><strong>{record.name}</strong><small>{record.code || record.id}</small></td><td>{record.detail}</td><td><span className="territory-status"><i /> {record.status}</span></td><td><button type="button" aria-label={`Editar ${record.name}`} onClick={() => { setEditingId(record.id); setShowForm(true); }}><Edit3 size={15} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="territory-empty">Nenhum cadastro encontrado.</p>}</div></div>}<footer className="territory-footer"><span>Pitangueiras, Paraná</span><span>Visão de secretário · cenário simulado</span></footer></main></div>;
}

function SecretariatIllustration({ art }: { art: SecretariatArt }) {
  const palette: Record<SecretariatArt, { sky: string; ground: string; accent: string; accent2: string }> = {
    administracao: { sky: "#dff3f8", ground: "#8fc6b5", accent: "#2b78a0", accent2: "#f2b45b" },
    agricultura: { sky: "#dff4ee", ground: "#8cbd68", accent: "#4d8b54", accent2: "#f4bf52" },
    assistencia: { sky: "#fde5e9", ground: "#efaaac", accent: "#b75a70", accent2: "#f17679" },
    cultura: { sky: "#eee5f6", ground: "#baa3cc", accent: "#73599a", accent2: "#e4a353" },
    economico: { sky: "#fff0d9", ground: "#e0b875", accent: "#c47737", accent2: "#4d91a1" },
    educacao: { sky: "#fff0d9", ground: "#e4c879", accent: "#5974a5", accent2: "#d47758" },
    esporte: { sky: "#e2f3db", ground: "#8dbb6e", accent: "#4b8a55", accent2: "#ef9e52" },
    obras: { sky: "#e8eef1", ground: "#c4a274", accent: "#ba793f", accent2: "#e4a841" },
    saude: { sky: "#def4f4", ground: "#9ed5ca", accent: "#268b8a", accent2: "#df7f7d" },
    seguranca: { sky: "#e4edf6", ground: "#91a8bf", accent: "#416c93", accent2: "#e6b254" },
    planejamento: { sky: "#e1eff8", ground: "#93b8c8", accent: "#39789e", accent2: "#dd9b59" },
    governanca: { sky: "#e8edfa", ground: "#a3b4d5", accent: "#4d6299", accent2: "#edaa68" },
    territorio: { sky: "#e2f2f6", ground: "#99c1c6", accent: "#347d8e", accent2: "#dfaa5e" },
  };
  const c = palette[art];
  const person = (x: number, y: number, shirt: string, skin = "#c98666") => <g transform={`translate(${x} ${y})`}><circle cx="0" cy="-14" r="7" fill={skin} /><path d="M-11 17c1-17 5-24 11-24s10 7 11 24Z" fill={shirt} /><path d="M-7 17v9M7 17v9" stroke="#344b59" strokeWidth="3" strokeLinecap="round" /></g>;
  return <div className="secretariat-visual" aria-hidden="true" style={{ "--scene-sky": c.sky, "--scene-ground": c.ground, "--scene-accent": c.accent, "--scene-accent-2": c.accent2 } as React.CSSProperties}><svg viewBox="0 0 360 142" role="presentation">
    <rect width="360" height="142" fill="var(--scene-sky)" />
    <circle cx="303" cy="29" r="16" fill="#f6c960" className="scene-sun" />
    <path d="M0 97c45-28 76-19 112-2 41 19 66 11 101-5 53-24 92-10 147 9v43H0Z" fill="var(--scene-ground)" opacity=".72" />
    <path d="M0 120c65-14 102-5 153 5 58 12 112-14 207-7v24H0Z" fill="var(--scene-ground)" opacity=".52" />
    <g className="scene-float">
      {art === "administracao" && <><rect x="30" y="54" width="74" height="49" rx="3" fill="#f6faf8" stroke={c.accent} strokeWidth="3" /><path d="M24 55 67 30l43 25M39 55v48m18-48v48m20-48v48m18-48v48" stroke={c.accent} strokeWidth="4" fill="none" /><rect x="159" y="70" width="34" height="25" rx="3" fill="#f2b45b" /><path d="M167 76h18M167 83h12" stroke="#fff" strokeWidth="3" />{person(239,101,"#4f9ca9")}</>}
      {art === "agricultura" && <><path d="M25 101c35-26 69-28 101-7s70 25 104 4 69-25 105-3v47H25Z" fill="#6ea95d" /><path d="M53 101c28-17 56-14 81 0m28 1c27-20 57-19 84-2" stroke="#397a4b" strokeWidth="3" fill="none" /><path d="M93 92V52c12 9 22 19 24 36M93 73C78 59 65 59 55 67c11 13 23 17 38 13M99 63c11-17 25-20 37-15-5 15-17 24-38 27" fill="#5d9f58" stroke="#397a4b" strokeWidth="3" />{person(231,102,"#df9550", "#9b674c")}<path d="M216 78h31l-7-12h-17Z" fill="#e0a64e" /></>}
      {art === "assistencia" && <><path d="M24 98c8-26 25-37 45-37s35 11 42 37M247 98c8-26 25-37 45-37s35 11 42 37" fill="#f3a4a9" /><circle cx="76" cy="55" r="14" fill="#b97a5d" /><circle cx="284" cy="55" r="14" fill="#5a3d35" />{person(143,101,"#77a9b4")} {person(184,101,"#8e6bb0", "#6b463c")}<path d="M179 39c-11-13-31 3 0 28 31-25 11-41 0-28Z" fill="#ef6f83" /></>}
      {art === "cultura" && <><path d="M26 102V73h31v29m7 0V55h36v47m8 0V68h31v34" fill="#d7b17d" stroke={c.accent} strokeWidth="3" /><path d="M20 73h43L42 50 20 73m40-18h50L85 31 60 55m47 13h39l-20-22-19 22" fill="#f8d29a" stroke={c.accent} strokeWidth="3" /><path d="M227 43h53v59h-53Z" fill="#e9c487" stroke="#925c75" strokeWidth="3" /><path d="M233 51h41v25h-41Z" fill="#a7d0d2" />{person(315,105,"#bf6a50")}</>}
      {art === "economico" && <><path d="M25 102h103V64H25Z" fill="#f2d09a" stroke={c.accent} strokeWidth="3" /><path d="M19 64h115l-12-16H31Z" fill="#e88958" stroke={c.accent} strokeWidth="3" /><path d="M42 73v29m25-29v29m25-29v29" stroke="#fff" strokeWidth="5" />{person(176,102,"#4d91a1")}<path d="m228 98 16-29 14 14 31-37" stroke={c.accent} strokeWidth="5" fill="none" /><path d="m283 45 12 1-4 11" fill="none" stroke={c.accent} strokeWidth="4" /></>}
      {art === "educacao" && <><path d="M23 97h132M34 97V58h112v39" fill="#e4b76e" stroke={c.accent} strokeWidth="3" /><path d="M25 58h130L90 33Z" fill="#f6ce7f" stroke={c.accent} strokeWidth="3" /><path d="M55 68v29m39-29v29m38-29v29" stroke="#fff" strokeWidth="5" />{person(219,101,"#db7b61")}<path d="M242 65h66v39h-66Z" fill="#8ebabe" stroke="#416c78" strokeWidth="3" /><circle cx="262" cy="79" r="8" fill="#f2d07c" /></>}
      {art === "esporte" && <><path d="M25 111c29-32 54-32 81 0s54 32 82 0 57-31 91 0" fill="none" stroke="#438658" strokeWidth="7" />{person(81,97,"#d46d60")} {person(166,101,"#edb14e", "#8a5b43")}<circle cx="255" cy="69" r="15" fill="#fff" stroke="#df8951" strokeWidth="4" /><path d="m246 61 10 4 8-5m-19 10 10 1 6 8" stroke="#6d8390" strokeWidth="2" fill="none" /></>}
      {art === "obras" && <><path d="M19 107h322" stroke="#b48252" strokeWidth="9" /><path d="M42 89h85V53H42Z" fill="#f2cb86" stroke={c.accent} strokeWidth="3" /><path d="M34 53h101l-14-17H48Z" fill="#d98e59" stroke={c.accent} strokeWidth="3" /><path d="M166 100V52h45v48m-22-48V31h67v69" fill="#e1b56e" stroke="#b97943" strokeWidth="4" />{person(282,106,"#e4a841", "#9b684c")}</>}
      {art === "saude" && <><rect x="34" y="48" width="92" height="57" rx="5" fill="#fff" stroke={c.accent} strokeWidth="3" /><path d="M58 48v-13h44v13M27 105h108" stroke={c.accent} strokeWidth="4" fill="none" /><path d="M70 68h20v13h13v20H90v13H70v-13H57V81h13Z" fill="#ef7e7e" />{person(202,102,"#77b8bd")}<path d="M192 84h20l5-13 7 23 9-15 7 9h22" stroke="#e07878" strokeWidth="3" fill="none" /></>}
      {art === "seguranca" && <><path d="M30 102h109V67H30Z" fill="#e8c682" stroke={c.accent} strokeWidth="3" /><path d="M22 67h125l-16-18H39Z" fill="#6f9bb2" stroke={c.accent} strokeWidth="3" /><path d="M196 101 229 42l33 59Z" fill="#f1c45f" stroke="#59738b" strokeWidth="3" /><path d="M229 53v38m-20-17h40" stroke="#59738b" strokeWidth="3" />{person(302,103,"#4c78a3", "#8f624c")}</>}
      {art === "planejamento" && <><path d="M24 104h110V62H24Z" fill="#d7ebef" stroke={c.accent} strokeWidth="3" /><path d="M16 62h126l-18-19H35Z" fill="#80b6c3" stroke={c.accent} strokeWidth="3" /><path d="M175 101 209 49l37 52m-57-22h39m-26-21 14 43" stroke="#df9d5f" strokeWidth="5" fill="none" /><path d="M278 51c-11 0-18 8-18 18 0 15 18 31 18 31s18-16 18-31c0-10-7-18-18-18Z" fill="#df7f7f" /><circle cx="278" cy="69" r="6" fill="#fff" /></>}
      {art === "governanca" && <><path d="M43 101V58h95v43M31 58h119L90 30Z" fill="#d8e2f4" stroke={c.accent} strokeWidth="3" /><path d="M60 66v35m30-35v35m30-35v35" stroke="#7187b4" strokeWidth="5" />{person(209,102,"#e29c63")}<path d="M259 67h54v39h-54Z" fill="#fff" stroke={c.accent} strokeWidth="3" /><circle cx="276" cy="82" r="7" fill="#edaf71" /><circle cx="298" cy="82" r="7" fill="#77a7bb" /><path d="M277 96h21" stroke={c.accent} strokeWidth="3" /></>}
      {art === "territorio" && <><path d="M24 103 75 56l51 24 59-32 69 28v29H24Z" fill="#c7e1dc" stroke={c.accent} strokeWidth="3" /><path d="M34 93h214M62 73l34 30m44-41 44 41m-21-52 40 50" stroke="#75a9aa" strokeWidth="3" fill="none" />{person(291,102,"#3e8c9a")}<path d="M288 67c-10 0-17 8-17 17 0 13 17 28 17 28s17-15 17-28c0-9-7-17-17-17Z" fill="#e1a55d" /><circle cx="288" cy="84" r="5" fill="#fff" /></>}
    </g>
    <g className="scene-sparkles"><circle cx="15" cy="27" r="3" fill="#fff" /><circle cx="345" cy="48" r="3" fill="#fff" /><path d="m174 18 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#fff" opacity=".78" /></g>
  </svg></div>;
}

const secretariatIcons: Record<SecretariatArt, LucideIcon> = {
  administracao: Landmark,
  agricultura: Sprout,
  assistencia: HandHeart,
  cultura: Library,
  economico: BriefcaseBusiness,
  educacao: BookOpen,
  esporte: Dumbbell,
  obras: Construction,
  saude: HeartPulse,
  seguranca: LockKeyhole,
  planejamento: Map,
  governanca: ShieldCheck,
  territorio: Map,
};

type ActiveNotice = { id: string; title: string; body: string; image_path: string; image_alt: string; sort_order: number; valid_from: string; valid_until?: string | null };

function InstitutionalCarousel() {
  const [items, setItems] = useState<ActiveNotice[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const loadNotices = () => {
    setLoading(true); setLoadError("");
    void supabase.rpc("municipal_governance_list_active_internal_notices").then(({ data, error }) => {
      if (error) { setLoadError("Não foi possível carregar os informativos institucionais."); setItems([]); }
      else setItems(Array.isArray(data) ? data as ActiveNotice[] : data ? [data as ActiveNotice] : []);
      setLoading(false);
    });
  };
  useEffect(() => { let mounted = true; supabase.rpc("municipal_governance_list_active_internal_notices").then(({ data, error }) => { if (!mounted) return; if (error) setLoadError("Não foi possível carregar os informativos institucionais."); else setItems(Array.isArray(data) ? data as ActiveNotice[] : data ? [data as ActiveNotice] : []); setLoading(false); }); return () => { mounted = false; }; }, []);
  useEffect(() => { if (items.length < 2 || paused) return; const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 5000); return () => window.clearInterval(timer); }, [items.length, paused]);
  useEffect(() => { if (index >= items.length) setIndex(0); }, [index, items.length]);
  if (loading) return <section className="institutional-carousel institutional-carousel--empty" aria-label="Informativos institucionais"><span>Carregando informativos institucionais…</span></section>;
  if (loadError) return <section className="institutional-carousel institutional-carousel--empty" aria-label="Informativos institucionais"><AlertTriangle size={22} /><div><strong>Informativos indisponíveis</strong><span>{loadError}</span><button type="button" className="institutional-carousel-retry" onClick={loadNotices}>Tentar novamente</button></div></section>;
  if (!items.length) return <section className="institutional-carousel institutional-carousel--empty" aria-label="Informativos institucionais"><ShieldCheck size={22} /><div><strong>Apresentação institucional</strong><span>Nenhum informativo está vigente neste momento.</span></div></section>;
  const current = items[index]; const imageUrl = supabase.storage.from("municipal-informativos").getPublicUrl(current.image_path).data.publicUrl;
  return <section className="institutional-carousel" aria-live="polite" aria-label="Informativos institucionais" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false); }}><img src={imageUrl} alt={current.image_alt} /><div className="institutional-carousel-content"><span className="section-kicker">Informativo institucional</span><h1>{current.title}</h1>{current.body && <p>{current.body}</p>}<span className="institutional-carousel-count">{index + 1} de {items.length}</span></div>{items.length > 1 && <><button type="button" className="institutional-carousel-arrow institutional-carousel-arrow--prev" onClick={() => setIndex((index - 1 + items.length) % items.length)} aria-label="Informativo anterior"><ArrowLeft size={17} /></button><button type="button" className="institutional-carousel-arrow institutional-carousel-arrow--next" onClick={() => setIndex((index + 1) % items.length)} aria-label="Próximo informativo"><ArrowRight size={17} /></button><div className="institutional-carousel-dots" role="tablist" aria-label="Selecionar informativo">{items.map((item, itemIndex) => <button key={item.id} type="button" role="tab" aria-selected={itemIndex === index} className={itemIndex === index ? "is-active" : ""} onClick={() => setIndex(itemIndex)} aria-label={`Exibir informativo ${itemIndex + 1}`} />)}</div></>}</section>;
}


function Dashboard({ user, onLogout, onOpen }: { user: User; onLogout: () => void; onOpen: (item: Secretariat) => void }) {
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const renderCards = (category: Secretariat["category"]) => secretariats.filter((item) => item.category === category).map((item) => { const Icon = secretariatIcons[item.art]; return <button key={item.name} className="secretariat-card" type="button" onClick={() => onOpen(item)}><div className="secretariat-card-main"><span className="secretariat-icon" aria-hidden="true"><Icon size={30} strokeWidth={1.8} /></span><div className="secretariat-card-copy"><span className="secretariat-card-type">{category === "shared" ? "Núcleo compartilhado" : "Secretaria municipal"}</span><h2>{item.name}</h2><p><strong>Status:</strong> Disponível <span aria-hidden="true">·</span> Acesso institucional</p></div></div><span className="card-link">Acessar a área <ArrowRight size={15} /></span></button>; });
  return <div className="dashboard-shell"><header className="app-header"><a className="header-brand" href="/matrixia/" aria-label="Voltar ao início"><BrandMark compact /></a><div className="user-menu"><div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div>{avatarUrl ? <img className="user-avatar" src={avatarUrl} alt={`Foto de ${displayName}`} /> : <div className="user-avatar user-avatar--initials" aria-label={`Avatar de ${displayName}`}>{initials(user)}</div>}<button className="user-menu-button" type="button" aria-label="Opções da conta" onClick={onLogout}><ChevronDown size={17} /></button></div></header><main className="dashboard-main"><InstitutionalCarousel /><section className="dashboard-section" aria-labelledby="secretarias-heading"><div className="dashboard-section-heading"><div><span className="section-kicker">Áreas finalísticas</span><h2 id="secretarias-heading">Secretarias municipais</h2></div><span>Selecione para ver os módulos</span></div><div className="secretariat-grid">{renderCards("secretariat")}</div></section><section className="dashboard-section dashboard-section--shared" aria-labelledby="shared-heading"><div className="dashboard-section-heading"><div><span className="section-kicker">Estrutura transversal</span><h2 id="shared-heading">Núcleos compartilhados</h2></div><span>Dados que apoiam várias áreas</span></div><div className="secretariat-grid">{renderCards("shared")}</div></section><footer className="dashboard-footer"><span><ShieldCheck size={15} /> Ambiente protegido pelo Supabase</span><button type="button" onClick={onLogout}><LogOut size={15} /> Sair da conta</button></footer></main></div>;
}

export default function Home() {
  const { alert, confirm } = useDialog();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [healthScreen, setHealthScreen] = useState(false);
  const [healthObligationsScreen, setHealthObligationsScreen] = useState(false);
  const [healthQuestionnairesScreen, setHealthQuestionnairesScreen] = useState(false);
  const [territoryScreen, setTerritoryScreen] = useState(false);
  const [integratedTerritoryScreen, setIntegratedTerritoryScreen] = useState(false);
  const [cultureScreen, setCultureScreen] = useState(false);
  const [libraryScreen, setLibraryScreen] = useState(false);
  const [minutesScreen, setMinutesScreen] = useState(false);
  const [governanceScreen, setGovernanceScreen] = useState(() => window.location.pathname.endsWith("/governanca"));
  const title = useMemo(() => ({ login: "Acesso seguro à plataforma", forgot: "Recupere seu acesso", reset: "Crie uma nova senha" }[view]), [view]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY") setView("reset"); setUser(session?.user ?? null); });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submitLogin = async (event: FormEvent) => { event.preventDefault(); setLoading(true); const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); setLoading(false); if (error) await alert("E-mail ou senha inválidos. Confira seus dados e tente novamente.", { kind: "error", title: "Não foi possível entrar" }); };
  const submitForgot = async (event: FormEvent) => { event.preventDefault(); setLoading(true); const redirectTo = `${window.location.origin}${window.location.pathname}`; const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo }); setLoading(false); if (error) await alert("Não foi possível enviar o e-mail agora. Verifique o endereço e tente novamente.", { kind: "error", title: "Falha na recuperação" }); else await alert("Se este e-mail estiver cadastrado, você receberá as instruções de redefinição em instantes.", { kind: "success", title: "E-mail enviado" }); };
  const submitReset = async (event: FormEvent) => { event.preventDefault(); if (newPassword.length < 8) { await alert("A nova senha deve ter pelo menos 8 caracteres.", { kind: "warning", title: "Senha muito curta" }); return; } setLoading(true); const { error } = await supabase.auth.updateUser({ password: newPassword }); setLoading(false); if (error) await alert("Não foi possível atualizar a senha. Solicite um novo link.", { kind: "error", title: "Falha ao atualizar senha" }); else { await alert("Senha atualizada. Você já pode acessar a plataforma.", { kind: "success", title: "Senha alterada" }); setView("login"); setPassword(""); setNewPassword(""); } };
  const logout = async () => { if (await confirm("Deseja realmente sair da sua conta?", { title: "Confirmar saída", kind: "warning", confirmLabel: "Sair" })) { await supabase.auth.signOut(); setUser(null); setHealthScreen(false); setHealthObligationsScreen(false); setHealthQuestionnairesScreen(false); setTerritoryScreen(false); setIntegratedTerritoryScreen(false); setCultureScreen(false); setLibraryScreen(false); setMinutesScreen(false); setGovernanceScreen(false); } };

  if (user && view === "login") return governanceScreen ? <GovernanceModule user={user} onBack={() => { setGovernanceScreen(false); window.history.pushState({}, "", "/matrixia/"); }} onLogout={logout} /> : minutesScreen ? <ProcurementMinutesModule onBack={() => setMinutesScreen(false)} onLogout={logout} /> : libraryScreen ? <LibraryManagementModule user={user} onBack={() => { setLibraryScreen(false); setCultureScreen(true); }} onLogout={logout} /> : cultureScreen ? <CultureModules user={user} onBack={() => setCultureScreen(false)} onLibrary={() => { setCultureScreen(false); setLibraryScreen(true); }} onLogout={logout} /> : integratedTerritoryScreen ? <IntegratedTerritoryModule user={user} onBack={() => setIntegratedTerritoryScreen(false)} onLogout={logout} /> : territoryScreen ? <TerritoryModule user={user} onBack={() => setTerritoryScreen(false)} onLogout={logout} /> : healthQuestionnairesScreen ? <HealthQuestionnairesModule user={user} onBack={() => setHealthQuestionnairesScreen(false)} onLogout={logout} /> : healthObligationsScreen ? <HealthObligationsModule user={user} onBack={() => setHealthObligationsScreen(false)} onLogout={logout} /> : healthScreen ? <HealthModules user={user} onBack={() => setHealthScreen(false)} onTerritory={() => setTerritoryScreen(true)} onObligations={() => setHealthObligationsScreen(true)} onQuestionnaires={() => setHealthQuestionnairesScreen(true)} onLogout={logout} /> : <Dashboard user={user} onLogout={logout} onOpen={(item) => item.name === "Governança" ? (() => { setGovernanceScreen(true); window.history.pushState({}, "", "/matrixia/governanca"); })() : item.name === "Território Integrado" ? setIntegratedTerritoryScreen(true) : item.name === "Saúde e Vigilância Sanitária" ? setHealthScreen(true) : item.name === "Cultura e Turismo" ? setCultureScreen(true) : item.name === "Administração e Finanças" ? setMinutesScreen(true) : alert(`O módulo de ${item.name} será disponibilizado nesta área.`, { kind: "info", title: item.name })} />;
  return <main className="app-shell"><section className="brand-panel"><div className="panel-glow" /><div className="panel-content"><BrandMark /><div className="panel-copy"><p className="eyebrow">Gestão pública orientada por evidências</p><h1>Clareza para decidir.<br /><span>Inteligência para cuidar.</span></h1><p>Uma nova forma de organizar indicadores municipais, conectar informações e transformar dados em melhores decisões.</p></div><div className="panel-footer"><span><ShieldCheck size={16} /> Ambiente protegido</span><span>Saúde · Gestão · Resultados</span></div></div></section><section className="login-panel"><div className="login-wrap"><div className="mobile-brand"><BrandMark compact /></div><div className="login-heading"><p className="eyebrow">MatrixIA / acesso restrito</p><h2>{title}</h2><p>{view === "login" ? "Entre com suas credenciais institucionais para continuar." : view === "forgot" ? "Informe seu e-mail cadastrado e enviaremos um link seguro." : "Defina uma senha nova para proteger seu acesso."}</p></div>{view === "login" && <form onSubmit={submitLogin} className="auth-form"><Field label="E-mail institucional" icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="seu.nome@municipio.pr.gov.br" autoComplete="email" disabled={loading} /><Field label="Senha" icon={LockKeyhole} type={showPassword ? "text" : "password"} value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" disabled={loading} suffix={<button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} /><div className="form-meta"><label className="remember"><input type="checkbox" /> <span>Manter conectado</span></label><button type="button" className="link-button" onClick={() => setView("forgot")}>Esqueci minha senha</button></div><button className="primary-button" disabled={loading}>{loading ? "Entrando..." : <>Entrar na plataforma <ArrowRight size={18} /></>}</button></form>}{view === "forgot" && <div className="recovery-screen"><div className="recovery-intro"><div className="recovery-icon"><Mail size={23} /></div><p>Digite o e-mail associado à sua conta. Enviaremos um link seguro para criar uma nova senha.</p></div><form onSubmit={submitForgot} className="auth-form"><Field label="E-mail cadastrado" icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="seu.nome@municipio.pr.gov.br" autoComplete="email" disabled={loading} /><button className="primary-button" disabled={loading}>{loading ? "Enviando..." : <>Enviar link de recuperação <ArrowRight size={18} /></>}</button><button type="button" className="back-button" onClick={() => setView("login")}>Voltar para o login</button></form><div className="recovery-steps"><span>1</span><p>Confira sua caixa de entrada e a pasta de spam.</p><span>2</span><p>Abra o link e defina uma nova senha.</p></div></div>}{view === "reset" && <form onSubmit={submitReset} className="auth-form"><Field label="Nova senha" icon={LockKeyhole} type={showPassword ? "text" : "password"} value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" autoComplete="new-password" disabled={loading} suffix={<button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar senha"><Eye size={18} /></button>} /><button className="primary-button" disabled={loading}>{loading ? "Salvando..." : <>Salvar nova senha <ArrowRight size={18} /></>}</button></form>}<p className="security-note"><ShieldCheck size={15} /> Seus dados de autenticação são protegidos pelo Supabase.</p><p className="login-legal">Ao entrar, você concorda com as políticas de uso e segurança da plataforma.</p></div></section></main>;
}
