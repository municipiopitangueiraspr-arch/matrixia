import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AlertTriangle, ArrowRight, Building2, Check, CheckCircle2, ClipboardList,
  Clock3, History, LoaderCircle, MailPlus, RefreshCw, Search, Settings2,
  ShieldCheck, Users, UserRoundCheck, UserRoundX, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tab = "resumo" | "usuarios" | "acessos" | "convites" | "unidades" | "auditoria";
type UserRow = { user_id: number; uuid?: string | null; name?: string | null; email: string; ativo?: boolean; primeiro_acesso?: boolean; convite_enviado_em?: string | null; convite_aceito_em?: string | null; perfil_legacy?: string | null; assignments?: Assignment[] };
type Assignment = { id?: string; role_id?: string; role_label?: string; org_unit_id?: string; org_unit_name?: string; module_ids?: string[]; active?: boolean; valid_until?: string | null };
type Unit = { id: string; parent_id?: string | null; code: string; name: string; unit_type: string; description?: string; sort_order?: number; is_active: boolean };
type Role = { id: string; label: string; description?: string; is_active: boolean };
type Invite = { id: string; invitee_name: string; invitee_email: string; requested_by_name?: string; requested_by_email?: string; module_id?: string; module_label?: string; role_id?: string; role_label?: string; org_unit_id?: string; org_unit_name?: string; status?: string; requested_at: string; invitation_sent_at?: string | null };
type AuditRow = { id: number | string; action?: string; operacao?: string; created_at?: string; occurred_at?: string; actor_name?: string; actor_email?: string; target_name?: string; target_email?: string; details?: Record<string, unknown>; entidade?: string; ator_nome?: string; ocorrido_em?: string };
type ModuleRow = { id: string; label: string; description?: string; icon_name?: string; is_ready?: boolean; status_label?: string };

function rows<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : value ? [value as T] : []; }
function one<T>(value: unknown): T | null { return Array.isArray(value) ? (value[0] as T | undefined) || null : (value as T | null); }
function errorText(error: { message?: string } | null) { return error?.message || "Não foi possível carregar os dados de Governança."; }
function dateLabel(value?: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—"; }
function statusLabel(value?: string | null) { return value === "PENDING" || value === "PENDENTE" ? "Pendente" : value === "APPROVED" || value === "APROVADO" ? "Aprovado" : value === "REJECTED" || value === "REJEITADO" ? "Rejeitado" : value || "—"; }

export function GovernanceModule({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("resumo");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [selectedModule, setSelectedModule] = useState("");
  const [moduleAccess, setModuleAccess] = useState<unknown>(null);
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [inviteForm, setInviteForm] = useState({ nome: "", email: "", perfil_municipal: "ADMINISTRATIVO", role_id: "", org_unit_id: "", module_ids: [] as string[] });
  const [unitForm, setUnitForm] = useState({ id: "", parent_id: "", code: "", name: "", unit_type: "SECRETARIA", description: "", sort_order: "0", is_active: true });

  const activeUsers = useMemo(() => users.filter((item) => item.ativo !== false), [users]);
  const filteredUsers = useMemo(() => users.filter((item) => `${item.name || ""} ${item.email} ${item.perfil_legacy || ""}`.toLowerCase().includes(search.toLowerCase().trim())), [users, search]);
  const pendingInvites = useMemo(() => invites.filter((item) => !item.status || ["PENDING", "PENDENTE"].includes(item.status)), [invites]);
  const currentModule = modules.find((item) => item.id === selectedModule);

  async function loadAll() {
    setLoading(true); setError("");
    const [contextResult, usersResult, unitsResult, rolesResult, invitesResult, auditResult, modulesResult] = await Promise.all([
      supabase.rpc("municipal_governance_get_my_context"),
      supabase.rpc("municipal_governance_list_users_v2"),
      supabase.rpc("municipal_governance_list_org_units"),
      supabase.rpc("municipal_governance_list_roles"),
      supabase.rpc("municipal_governance_list_pending_invite_requests"),
      supabase.rpc("municipal_governance_list_audit", { p_search: auditSearch.trim() || null }),
      supabase.from("municipal_modules").select("id,label,description,icon_name,is_ready,status_label").order("sort_order").limit(200),
    ]);
    const firstError = [contextResult, usersResult, unitsResult, rolesResult, invitesResult, auditResult, modulesResult].find((result) => result.error);
    if (firstError?.error) setError(errorText(firstError.error));
    setContext(one<Record<string, unknown>>(contextResult.data));
    setUsers(rows<UserRow>(usersResult.data)); setUnits(rows<Unit>(unitsResult.data)); setRoles(rows<Role>(rolesResult.data));
    setInvites(rows<Invite>(invitesResult.data)); setAudits(rows<AuditRow>(auditResult.data)); setModules((modulesResult.data || []) as ModuleRow[]);
    if (!selectedModule && modulesResult.data?.[0]) setSelectedModule(modulesResult.data[0].id);
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [user.id, auditSearch]);
  useEffect(() => {
    if (!selectedModule) return;
    supabase.rpc("municipal_module_access_list", { p_module_id: selectedModule }).then(({ data, error: resultError }) => {
      if (resultError) setError(errorText(resultError)); else setModuleAccess(data);
    });
  }, [selectedModule]);

  async function run(operation: () => PromiseLike<{ error: { message?: string } | null }>, success: string) {
    setBusy(true); setError(""); const result = await operation();
    if (result.error) setError(errorText(result.error)); else { setNotice(success); await loadAll(); }
    setBusy(false);
  }

  async function toggleUser(item: UserRow) {
    await run(() => supabase.rpc("municipal_governance_set_user_active", { p_user_id: item.user_id, p_active: item.ativo === false }), item.ativo === false ? "Usuário reativado." : "Usuário desativado.");
  }

  async function reviewInvite(item: Invite, decision: "approve" | "reject") {
    if (!window.confirm(`${decision === "approve" ? "Aprovar" : "Rejeitar"} o convite de ${item.invitee_name}?`)) return;
    await run(() => supabase.rpc("municipal_governance_review_invite_request", { p_request_id: item.id, p_decision: decision }), decision === "approve" ? "Convite aprovado." : "Convite rejeitado.");
  }

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    if (!inviteForm.nome || !inviteForm.email || !inviteForm.role_id || !inviteForm.org_unit_id) { setError("Informe nome, e-mail, papel e unidade organizacional."); return; }
    setBusy(true); setError("");
    const result = await supabase.functions.invoke("invite-municipal-user", { body: { nome: inviteForm.nome, email: inviteForm.email, perfil_municipal: inviteForm.perfil_municipal, role_id: inviteForm.role_id, org_unit_id: inviteForm.org_unit_id, module_ids: inviteForm.module_ids, assignment_module_ids: inviteForm.module_ids } });
    if (result.error) setError(errorText(result.error)); else { setNotice("Convite enviado e atribuição registrada."); setInviteForm({ nome: "", email: "", perfil_municipal: "ADMINISTRATIVO", role_id: "", org_unit_id: "", module_ids: [] }); await loadAll(); }
    setBusy(false);
  }

  async function submitUnit(event: FormEvent) {
    event.preventDefault();
    if (!unitForm.code || !unitForm.name) { setError("Informe código e nome da unidade."); return; }
    await run(() => supabase.rpc("municipal_governance_save_org_unit", { p_id: unitForm.id || null, p_parent_id: unitForm.parent_id || null, p_code: unitForm.code, p_name: unitForm.name, p_unit_type: unitForm.unit_type, p_description: unitForm.description, p_sort_order: Number(unitForm.sort_order) || 0, p_is_active: unitForm.is_active }), unitForm.id ? "Unidade atualizada." : "Unidade criada.");
    setUnitForm({ id: "", parent_id: "", code: "", name: "", unit_type: "SECRETARIA", description: "", sort_order: "0", is_active: true });
  }

  const contextName = String(context?.municipio_nome || context?.municipality_name || "Pitangueiras, Paraná");
  const accessRows = Array.isArray(moduleAccess) ? moduleAccess : moduleAccess && typeof moduleAccess === "object" ? Object.entries(moduleAccess as Record<string, unknown>).map(([key, value]) => ({ key, value })) : [];
  const summary = { users: activeUsers.length, units: units.filter((item) => item.is_active).length, invites: pendingInvites.length, audit: audits.length };

  return <div className="dashboard-shell governance-shell"><header className="app-header"><button className="header-back-button" type="button" onClick={onBack}><ArrowRight size={16} className="header-back-icon" /> Voltar aos módulos</button><div className="user-menu"><div className="user-copy"><strong>{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário"}</strong><span>{user.email}</span></div><div className="user-avatar user-avatar--initials">{(user.email || "U").slice(0, 2).toUpperCase()}</div><button className="user-menu-button" type="button" aria-label="Sair da conta" onClick={onLogout}><ArrowRight size={16} /></button></div></header>
    <main className="governance-main"><div className="governance-kicker"><span><ShieldCheck size={14} /> Núcleo transversal</span><span className="governance-secure"><i /> RLS e RPCs protegidas</span></div><div className="governance-heading"><div><p className="eyebrow">MatrixIA / controle institucional</p><h1>Governança</h1><p>Usuários, acessos, convites, unidades e auditoria em uma visão única de administração municipal.</p></div><button className="governance-refresh" type="button" onClick={() => void loadAll()} disabled={loading}><RefreshCw size={14} className={loading ? "governance-spin" : ""} /> Atualizar</button></div>
      <div className="governance-context"><span><Building2 size={15} /> <b>{contextName}</b></span><span>Identidade autenticada · políticas do banco aplicadas</span></div>
      {notice && <div className="governance-notice governance-notice--ok"><CheckCircle2 size={16} /> {notice}<button type="button" onClick={() => setNotice("")}><X size={14} /></button></div>}{error && <div className="governance-notice governance-notice--error"><AlertTriangle size={16} /> {error}<button type="button" onClick={() => setError("")}><X size={14} /></button></div>}
      <div className="governance-metrics"><Metric icon={Users} value={summary.users} label="Usuários ativos" tone="blue" /><Metric icon={Building2} value={summary.units} label="Unidades ativas" tone="green" /><Metric icon={Clock3} value={summary.invites} label="Convites pendentes" tone="amber" /><Metric icon={History} value={summary.audit} label="Eventos carregados" tone="purple" /></div>
      <nav className="governance-tabs" aria-label="Seções de Governança">{([ ["resumo", "Resumo", ClipboardList], ["usuarios", "Usuários", Users], ["acessos", "Acessos", ShieldCheck], ["convites", "Convites", MailPlus], ["unidades", "Unidades", Building2], ["auditoria", "Auditoria", History] ] as const).map(([key, label, Icon]) => <button type="button" className={tab === key ? "is-active" : ""} onClick={() => { setTab(key); setSearch(""); }} key={key}><Icon size={16} /> {label}</button>)}</nav>
      {loading ? <div className="governance-empty"><LoaderCircle size={24} className="governance-spin" /> Carregando Governança pelo Supabase…</div> : <section className="governance-panel">
        {tab === "resumo" && <SummaryPanel users={users} units={units} invites={pendingInvites} audits={audits} onTab={setTab} />}
        {tab === "usuarios" && <section><PanelHead title="Diretório de usuários" description={`${users.length} identidades no contexto municipal. O estado é alterado pela RPC protegida.`} search={search} setSearch={setSearch} /><div className="governance-table-wrap"><table className="governance-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Acesso</th><th>Convite</th><th>Ação</th></tr></thead><tbody>{filteredUsers.map((item) => <tr key={item.user_id}><td><strong>{item.name || "Nome não informado"}</strong><small>{item.email}</small></td><td><span className="governance-pill governance-pill--blue">{item.perfil_legacy || "Municipal"}</span></td><td><span className={`governance-pill ${item.ativo === false ? "governance-pill--red" : "governance-pill--green"}`}>{item.ativo === false ? "Inativo" : "Ativo"}</span></td><td><small>{item.convite_aceito_em ? `Aceito em ${dateLabel(item.convite_aceito_em)}` : item.convite_enviado_em ? `Enviado em ${dateLabel(item.convite_enviado_em)}` : "Sem convite registrado"}</small></td><td><button className="governance-icon-button" type="button" onClick={() => void toggleUser(item)} disabled={busy} title={item.ativo === false ? "Reativar usuário" : "Desativar usuário"}>{item.ativo === false ? <UserRoundCheck size={15} /> : <UserRoundX size={15} />}</button></td></tr>)}</tbody></table>{filteredUsers.length === 0 && <Empty text="Nenhum usuário encontrado." />}</div></section>}
        {tab === "acessos" && <AccessPanel modules={modules} selectedModule={selectedModule} setSelectedModule={setSelectedModule} currentModule={currentModule} accessRows={accessRows} />}
        {tab === "convites" && <section><PanelHead title="Convites e solicitações" description="Envie convites individuais e revise solicitações encaminhadas por gestores." /><div className="governance-two-column"><form className="governance-editor" onSubmit={submitInvite}><div className="governance-editor-title"><MailPlus size={17} /> Novo convite</div><div className="governance-form-grid"><label>Nome completo<input value={inviteForm.nome} onChange={(event) => setInviteForm((current) => ({ ...current, nome: event.target.value }))} required /></label><label>E-mail institucional<input type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} required /></label><label>Perfil<select value={inviteForm.perfil_municipal} onChange={(event) => setInviteForm((current) => ({ ...current, perfil_municipal: event.target.value }))}><option>ADMINISTRATIVO</option><option>SECRETARIO</option><option>PREFEITO</option></select></label><label>Papel organizacional<select value={inviteForm.role_id} onChange={(event) => setInviteForm((current) => ({ ...current, role_id: event.target.value }))} required><option value="">Selecione</option>{roles.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Unidade<select value={inviteForm.org_unit_id} onChange={(event) => setInviteForm((current) => ({ ...current, org_unit_id: event.target.value }))} required><option value="">Selecione</option>{units.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Módulos<select multiple value={inviteForm.module_ids} onChange={(event) => setInviteForm((current) => ({ ...current, module_ids: Array.from(event.target.selectedOptions, (option) => option.value) }))}>{modules.filter((item) => item.is_ready !== false).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div><button className="governance-primary" type="submit" disabled={busy}><MailPlus size={15} /> Enviar convite</button></form><div><div className="governance-subheading"><h3>Solicitações pendentes</h3><span>{pendingInvites.length}</span></div><div className="governance-card-list">{pendingInvites.map((item) => <article className="governance-list-card" key={item.id}><div><strong>{item.invitee_name}</strong><small>{item.invitee_email} · {item.role_label || "Papel não informado"}</small><small>{item.org_unit_name || "Unidade não informada"} · solicitado em {dateLabel(item.requested_at)}</small></div><div className="governance-inline-actions"><button type="button" onClick={() => void reviewInvite(item, "approve")} disabled={busy}><Check size={14} /> Aprovar</button><button type="button" onClick={() => void reviewInvite(item, "reject")} disabled={busy}><X size={14} /> Rejeitar</button></div></article>)}{pendingInvites.length === 0 && <Empty text="Nenhuma solicitação pendente." />}</div></div></div></section>}
        {tab === "unidades" && <section><PanelHead title="Unidades organizacionais" description="Estrutura hierárquica usada pelos escopos de acesso e pelas atribuições municipais." /><div className="governance-two-column"><form className="governance-editor" onSubmit={submitUnit}><div className="governance-editor-title"><Building2 size={17} /> {unitForm.id ? "Editar unidade" : "Nova unidade"}</div><div className="governance-form-grid"><label>Código<input value={unitForm.code} onChange={(event) => setUnitForm((current) => ({ ...current, code: event.target.value }))} required /></label><label>Nome<input value={unitForm.name} onChange={(event) => setUnitForm((current) => ({ ...current, name: event.target.value }))} required /></label><label>Tipo<select value={unitForm.unit_type} onChange={(event) => setUnitForm((current) => ({ ...current, unit_type: event.target.value }))}><option>SECRETARIA</option><option>DEPARTAMENTO</option><option>UNIDADE</option><option>SETOR</option></select></label><label>Unidade superior<select value={unitForm.parent_id} onChange={(event) => setUnitForm((current) => ({ ...current, parent_id: event.target.value }))}><option value="">Nenhuma</option>{units.filter((item) => item.id !== unitForm.id && item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ordem<input type="number" value={unitForm.sort_order} onChange={(event) => setUnitForm((current) => ({ ...current, sort_order: event.target.value }))} /></label><label className="governance-checkbox"><input type="checkbox" checked={unitForm.is_active} onChange={(event) => setUnitForm((current) => ({ ...current, is_active: event.target.checked }))} /> Unidade ativa</label><label className="governance-form-wide">Descrição<textarea value={unitForm.description} onChange={(event) => setUnitForm((current) => ({ ...current, description: event.target.value }))} /></label></div><div className="governance-form-actions"><button type="button" onClick={() => setUnitForm({ id: "", parent_id: "", code: "", name: "", unit_type: "SECRETARIA", description: "", sort_order: "0", is_active: true })}>Limpar</button><button className="governance-primary" type="submit" disabled={busy}><Check size={15} /> Salvar unidade</button></div></form><div className="governance-card-list">{units.map((item) => <article className="governance-list-card" key={item.id}><div><strong>{item.name}</strong><small>{item.code} · {item.unit_type} · {item.description || "Sem descrição"}</small></div><div className="governance-inline-actions"><span className={`governance-pill ${item.is_active ? "governance-pill--green" : "governance-pill--gray"}`}>{item.is_active ? "Ativa" : "Inativa"}</span><button type="button" onClick={() => setUnitForm({ id: item.id, parent_id: item.parent_id || "", code: item.code, name: item.name, unit_type: item.unit_type, description: item.description || "", sort_order: String(item.sort_order || 0), is_active: item.is_active })}><Settings2 size={14} /> Editar</button></div></article>)}{units.length === 0 && <Empty text="Nenhuma unidade disponível no contexto." />}</div></div></section>}
        {tab === "auditoria" && <section><PanelHead title="Trilha de auditoria" description="Eventos retornados pela RPC de auditoria, com ator, operação e contexto da alteração." search={auditSearch} setSearch={setAuditSearch} /><div className="governance-timeline">{audits.map((item) => <article key={String(item.id)}><span className="governance-timeline-dot" /><div><strong>{item.actor_name || item.ator_nome || "Ator não identificado"}</strong><span>{item.action || item.operacao || item.entidade || "Evento"}</span><small>{item.target_name || item.target_email || "Registro institucional"} · {dateLabel(item.created_at || item.occurred_at || item.ocorrido_em)}</small></div></article>)}{audits.length === 0 && <Empty text="Nenhum evento de auditoria encontrado." />}</div></section>}
      </section>}
      <footer className="health-footer"><span><ShieldCheck size={14} /> Políticas e autorização no Supabase</span><span>Governança municipal · fonte de verdade operacional</span><button type="button" onClick={onLogout}>Sair da conta</button></footer>
    </main></div>;
}

function Metric({ icon: Icon, value, label, tone }: { icon: typeof Users; value: number; label: string; tone: string }) { return <div className={`governance-metric governance-metric--${tone}`}><span><Icon size={17} /></span><strong>{value}</strong><small>{label}</small></div>; }
function PanelHead({ title, description, search, setSearch }: { title: string; description: string; search?: string; setSearch?: (value: string) => void }) { return <div className="governance-panel-head"><div><span className="section-kicker">Gestão institucional</span><h2>{title}</h2><p>{description}</p></div>{setSearch && <label className="governance-search"><Search size={15} /><input value={search || ""} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" /></label>}</div>; }
function Empty({ text }: { text: string }) { return <div className="governance-empty governance-empty--small"><ClipboardList size={20} /> {text}</div>; }
function SummaryPanel({ users, units, invites, audits, onTab }: { users: UserRow[]; units: Unit[]; invites: Invite[]; audits: AuditRow[]; onTab: (tab: Tab) => void }) { return <section><PanelHead title="Resumo de integridade" description="Uma leitura rápida do estado cadastral e dos pontos que exigem acompanhamento." /><div className="governance-summary-grid"><button type="button" onClick={() => onTab("usuarios")}><Users size={20} /><strong>{users.filter((item) => item.ativo !== false).length}</strong><span>usuários ativos</span><small>Ver diretório</small></button><button type="button" onClick={() => onTab("unidades")}><Building2 size={20} /><strong>{units.filter((item) => item.is_active).length}</strong><span>unidades ativas</span><small>Ver estrutura</small></button><button type="button" onClick={() => onTab("convites")}><MailPlus size={20} /><strong>{invites.length}</strong><span>solicitações pendentes</span><small>Revisar convites</small></button><button type="button" onClick={() => onTab("auditoria")}><History size={20} /><strong>{audits.length}</strong><span>eventos recentes</span><small>Consultar trilha</small></button></div><div className="governance-summary-note"><ShieldCheck size={18} /><div><strong>Fonte de verdade protegida</strong><p>As leituras e mutações desta tela passam pelo contexto autenticado e pelas RPCs de Governança. Nenhuma permissão é calculada apenas no navegador.</p></div></div></section>; }
function AccessPanel({ modules, selectedModule, setSelectedModule, currentModule, accessRows }: { modules: ModuleRow[]; selectedModule: string; setSelectedModule: (value: string) => void; currentModule?: ModuleRow; accessRows: Array<{ key?: string; value?: unknown }> }) { return <section><PanelHead title="Acessos por módulo" description="Consulte os usuários e atribuições expostos pela superfície de acesso do módulo." /><div className="governance-access-toolbar"><label>Módulo<select value={selectedModule} onChange={(event) => setSelectedModule(event.target.value)}><option value="">Selecione um módulo</option>{modules.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{currentModule && <span className="governance-module-context"><strong>{currentModule.label}</strong><small>{currentModule.description || currentModule.status_label || "Módulo municipal"}</small></span>}</div><div className="governance-card-list">{accessRows.map((item, index) => <article className="governance-list-card" key={`${item.key || "access"}-${index}`}><div><strong>{item.key || `Acesso ${index + 1}`}</strong><small>{typeof item.value === "string" ? item.value : JSON.stringify(item.value)}</small></div><span className="governance-pill governance-pill--blue">Retornado pela RPC</span></article>)}{accessRows.length === 0 && <Empty text={selectedModule ? "Nenhum acesso retornado para este módulo." : "Selecione um módulo para consultar os acessos."} />}</div></section>; }
