import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AlertTriangle, ArrowRight, Building2, Check, CheckCircle2, ClipboardList,
  Clock3, History, LoaderCircle, MailPlus, RefreshCw, Search, Settings2,
  ShieldCheck, Users, UserRoundCheck, UserRoundX, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tab = "resumo" | "usuarios" | "acessos" | "convites" | "unidades" | "auditoria";
type UserRow = {
  user_id: number;
  uuid?: string | null;
  name?: string | null;
  email: string;
  ativo?: boolean;
  primeiro_acesso?: boolean;
  convite_enviado_em?: string | null;
  convite_aceito_em?: string | null;
  perfil_legacy?: string | null;
  assignments?: Assignment[];
};
type Assignment = {
  id?: string;
  role_id?: string;
  role_label?: string;
  org_unit_id?: string;
  org_unit_name?: string;
  org_unit_code?: string;
  module_ids?: string[];
  active?: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
};
type ScopeRow = { assignment_id: string; scope_type?: string | null; scope_key?: string | null };
type Unit = { id: string; parent_id?: string | null; code: string; name: string; unit_type: string; description?: string; sort_order?: number; is_active: boolean };
type Role = { id: string; label: string; description?: string; is_active: boolean };
type Invite = { id: string; invitee_name: string; invitee_email: string; requested_by_name?: string; requested_by_email?: string; module_id?: string; module_label?: string; role_id?: string; role_label?: string; org_unit_id?: string; org_unit_name?: string; status?: string; requested_at: string; invitation_sent_at?: string | null };
type AuditRow = { id: number | string; action?: string; operacao?: string; created_at?: string; occurred_at?: string; actor_name?: string; actor_email?: string; target_name?: string; target_email?: string; details?: Record<string, unknown>; entidade?: string; ator_nome?: string; ocorrido_em?: string };
type ModuleRow = { id: string; label: string; description?: string; icon_name?: string; is_ready?: boolean; status_label?: string };
type AssignmentView = {
  user: UserRow;
  assignment: Assignment;
  role?: Role;
  unit?: Unit;
  modules: ModuleRow[];
  scopes: ScopeRow[];
  issues: string[];
  effective: boolean;
  status: "Vigente" | "Programada" | "Expirada" | "Inativa" | "Inconsistente";
};
type AccessRow = { user: UserRow; assignment: Assignment; role?: Role; unit?: Unit; module: ModuleRow; scopes: ScopeRow[] };

function rows<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : value ? [value as T] : []; }
function one<T>(value: unknown): T | null { return Array.isArray(value) ? (value[0] as T | undefined) || null : (value as T | null); }
function errorText(error: { message?: string } | null) { return error?.message || "Não foi possível carregar os dados de Governança."; }
function dateLabel(value?: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—"; }
function dateOnlyLabel(value?: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T00:00:00`)) : "—"; }
function moduleIds(value: unknown) { return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }
function todayStart() { const today = new Date(); return new Date(today.getFullYear(), today.getMonth(), today.getDate()); }
function dateStart(value?: string | null) { return value ? new Date(`${value}T00:00:00`) : null; }
function scopeLabel(scope: ScopeRow) { return `${scope.scope_type || "Escopo"}${scope.scope_key ? ` · ${scope.scope_key}` : ""}`; }
function validityLabel(assignment: Assignment) { return `${assignment.valid_from ? `De ${dateOnlyLabel(assignment.valid_from)}` : "Início não informado"}${assignment.valid_until ? ` até ${dateOnlyLabel(assignment.valid_until)}` : " · sem fim"}`; }
function assignmentStatus(assignment: Assignment, issues: string[]): AssignmentView["status"] {
  const from = dateStart(assignment.valid_from);
  const until = dateStart(assignment.valid_until);
  const today = todayStart();
  if (assignment.active !== true) return "Inativa";
  if (from && from > today) return "Programada";
  if (until && until < today) return "Expirada";
  return issues.length ? "Inconsistente" : "Vigente";
}
function statusClass(status: AssignmentView["status"]) {
  return status === "Vigente" ? "governance-pill--green" : status === "Inconsistente" ? "governance-pill--red" : status === "Programada" ? "governance-pill--blue" : "governance-pill--amber";
}
function actionLabel(value?: string | null) {
  const labels: Record<string, string> = {
    GRANT: "Concessão de acesso", GRANT_ACCESS: "Concessão de acesso", REVOKE: "Revogação de acesso",
    REVOKE_ACCESS: "Revogação de acesso", ASSIGN: "Atribuição criada", UPDATE_ASSIGNMENT: "Atribuição alterada",
    ROLE_CHANGE: "Alteração de papel", UNIT_CHANGE: "Alteração de unidade", SCOPE_CHANGE: "Alteração de escopo",
    VALIDITY_CHANGE: "Alteração de vigência", USER_ACTIVATED: "Usuário ativado", USER_DEACTIVATED: "Usuário desativado",
  };
  return (value && (labels[value] || labels[value.toUpperCase()])) || value || "Evento de Governança";
}
function auditDetails(details?: Record<string, unknown>) {
  if (!details) return "Detalhes não informados";
  const labels: Array<[string, string]> = [["module_label", "módulo"], ["role_label", "papel"], ["org_unit_name", "unidade"], ["scope_type", "tipo de escopo"], ["scope_key", "escopo"], ["valid_from", "início"], ["valid_until", "fim"]];
  const values = labels.map(([key, label]) => details[key] !== undefined && details[key] !== null ? `${label}: ${String(details[key])}` : "").filter(Boolean);
  return values.length ? values.join(" · ") : "Alteração registrada no contexto institucional";
}

export function GovernanceModule({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("resumo");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [scopes, setScopes] = useState<ScopeRow[]>([]);
  const [selectedModule, setSelectedModule] = useState("");
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
  const moduleMap = useMemo(() => new Map(modules.map((item) => [item.id, item])), [modules]);
  const roleMap = useMemo(() => new Map(roles.map((item) => [item.id, item])), [roles]);
  const unitMap = useMemo(() => new Map(units.map((item) => [item.id, item])), [units]);
  const scopesByAssignment = useMemo(() => {
    const map = new Map<string, ScopeRow[]>();
    scopes.forEach((scope) => map.set(scope.assignment_id, [...(map.get(scope.assignment_id) || []), scope]));
    return map;
  }, [scopes]);
  const assignmentViews = useMemo<AssignmentView[]>(() => users.flatMap((currentUser) => (currentUser.assignments || []).map((assignment) => {
    const role = assignment.role_id ? roleMap.get(assignment.role_id) : undefined;
    const unit = assignment.org_unit_id ? unitMap.get(assignment.org_unit_id) : undefined;
    const assignedModuleIds = moduleIds(assignment.module_ids);
    const assignedModules = assignedModuleIds.map((id) => moduleMap.get(id)).filter((item): item is ModuleRow => Boolean(item));
    const assignmentScopes = assignment.id ? scopesByAssignment.get(assignment.id) || [] : [];
    const issues: string[] = [];
    const from = dateStart(assignment.valid_from);
    const until = dateStart(assignment.valid_until);
    const today = todayStart();
    if (currentUser.ativo === false) issues.push("Usuário inativo");
    if (assignment.active !== true) issues.push("Atribuição inativa");
    if (from && from > today) issues.push(`Início de vigência em ${dateOnlyLabel(assignment.valid_from)}`);
    if (until && until < today) issues.push(`Vigência encerrada em ${dateOnlyLabel(assignment.valid_until)}`);
    if (!role || !role.is_active) issues.push("Papel inexistente ou inativo");
    if (!unit || !unit.is_active) issues.push("Unidade inexistente ou inativa");
    if (!assignedModuleIds.length) issues.push("Atribuição sem módulos");
    if (assignedModuleIds.some((id) => !moduleMap.has(id))) issues.push("Módulo não encontrado");
    if (assignedModules.some((item) => item.is_ready === false)) issues.push("Módulo indisponível para uso");
    return { user: currentUser, assignment, role, unit, modules: assignedModules, scopes: assignmentScopes, issues, effective: issues.length === 0, status: assignmentStatus(assignment, issues) };
  })), [users, moduleMap, roleMap, unitMap, scopesByAssignment]);
  const effectiveAccessRows = useMemo<AccessRow[]>(() => assignmentViews.flatMap((view) => view.effective ? view.modules.map((module) => ({ user: view.user, assignment: view.assignment, role: view.role, unit: view.unit, module, scopes: view.scopes })) : []), [assignmentViews]);
  const filteredAccessRows = useMemo(() => selectedModule ? effectiveAccessRows.filter((item) => item.module.id === selectedModule) : effectiveAccessRows, [effectiveAccessRows, selectedModule]);
  const unitImpacts = useMemo(() => {
    const map = new Map<string, { assignments: number; activeAssignments: number; modules: Set<string> }>();
    assignmentViews.forEach((view) => {
      if (!view.assignment.org_unit_id) return;
      const impact = map.get(view.assignment.org_unit_id) || { assignments: 0, activeAssignments: 0, modules: new Set<string>() };
      impact.assignments += 1;
      if (view.effective) impact.activeAssignments += 1;
      moduleIds(view.assignment.module_ids).forEach((moduleId) => impact.modules.add(moduleId));
      map.set(view.assignment.org_unit_id, impact);
    });
    return map;
  }, [assignmentViews]);
  const currentUnitImpact = unitForm.id ? unitImpacts.get(unitForm.id) : undefined;
  const summary = {
    users: activeUsers.length,
    units: units.filter((item) => item.is_active).length,
    invites: pendingInvites.length,
    audit: audits.length,
    usersWithoutAssignment: activeUsers.filter((item) => !assignmentViews.some((view) => view.user.user_id === item.user_id && view.effective)).length,
    assignmentsWithoutModules: assignmentViews.filter((view) => !moduleIds(view.assignment.module_ids).length).length,
    invalidAssignments: assignmentViews.filter((view) => view.issues.some((issue) => !issue.includes("Atribuição sem módulos"))).length,
    validityAlerts: assignmentViews.filter((view) => ["Programada", "Expirada", "Inativa"].includes(view.status)).length,
  };
  const currentModule = modules.find((item) => item.id === selectedModule);

  async function loadAll() {
    setLoading(true); setError("");
    const [contextResult, usersResult, unitsResult, rolesResult, invitesResult, auditResult, modulesResult, scopesResult] = await Promise.all([
      supabase.rpc("municipal_governance_get_my_context"),
      supabase.rpc("municipal_governance_list_users_v2"),
      supabase.rpc("municipal_governance_list_org_units"),
      supabase.rpc("municipal_governance_list_roles"),
      supabase.rpc("municipal_governance_list_pending_invite_requests"),
      supabase.rpc("municipal_governance_list_audit", { p_search: auditSearch.trim() || null }),
      supabase.from("municipal_modules").select("id,label,description,icon_name,is_ready,status_label").order("sort_order").limit(200),
      supabase.from("municipal_assignment_scopes").select("assignment_id,scope_type,scope_key").limit(2000),
    ]);
    const firstError = [contextResult, usersResult, unitsResult, rolesResult, invitesResult, auditResult, modulesResult, scopesResult].find((result) => result.error);
    if (firstError?.error) setError(errorText(firstError.error));
    setContext(one<Record<string, unknown>>(contextResult.data));
    setUsers(rows<UserRow>(usersResult.data)); setUnits(rows<Unit>(unitsResult.data)); setRoles(rows<Role>(rolesResult.data));
    setInvites(rows<Invite>(invitesResult.data)); setAudits(rows<AuditRow>(auditResult.data)); setModules((modulesResult.data || []) as ModuleRow[]); setScopes((scopesResult.data || []) as ScopeRow[]);
    if (!selectedModule && modulesResult.data?.[0]) setSelectedModule(modulesResult.data[0].id);
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [user.id, auditSearch]);

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
    if (!inviteForm.nome || !inviteForm.email || !inviteForm.role_id || !inviteForm.org_unit_id || !inviteForm.module_ids.length) { setError("Informe nome, e-mail, papel, unidade e ao menos um módulo para a atribuição."); return; }
    setBusy(true); setError("");
    const result = await supabase.functions.invoke("invite-municipal-user", { body: { nome: inviteForm.nome, email: inviteForm.email, perfil_municipal: inviteForm.perfil_municipal, role_id: inviteForm.role_id, org_unit_id: inviteForm.org_unit_id, assignment_module_ids: inviteForm.module_ids, secretariat_ids: [], module_ids: inviteForm.module_ids } });
    if (result.error) setError(errorText(result.error)); else { setNotice("Convite enviado com atribuição organizacional registrada."); setInviteForm({ nome: "", email: "", perfil_municipal: "ADMINISTRATIVO", role_id: "", org_unit_id: "", module_ids: [] }); await loadAll(); }
    setBusy(false);
  }

  async function submitUnit(event: FormEvent) {
    event.preventDefault();
    if (!unitForm.code || !unitForm.name) { setError("Informe código e nome da unidade."); return; }
    if (unitForm.id && !unitForm.is_active && currentUnitImpact?.activeAssignments) {
      const confirmed = window.confirm(`Esta unidade possui ${currentUnitImpact.activeAssignments} atribuição(ões) com acesso efetivo. A inativação preservará o histórico, mas interromperá esses acessos. Continuar?`);
      if (!confirmed) return;
    }
    await run(() => supabase.rpc("municipal_governance_save_org_unit", { p_id: unitForm.id || null, p_parent_id: unitForm.parent_id || null, p_code: unitForm.code, p_name: unitForm.name, p_unit_type: unitForm.unit_type, p_description: unitForm.description, p_sort_order: Number(unitForm.sort_order) || 0, p_is_active: unitForm.is_active }), unitForm.id ? "Unidade atualizada." : "Unidade criada.");
    setUnitForm({ id: "", parent_id: "", code: "", name: "", unit_type: "SECRETARIA", description: "", sort_order: "0", is_active: true });
  }

  const contextName = String(context?.municipio_nome || context?.municipality_name || "Pitangueiras, Paraná");
  const resetUnitForm = () => setUnitForm({ id: "", parent_id: "", code: "", name: "", unit_type: "SECRETARIA", description: "", sort_order: "0", is_active: true });

  return <div className="dashboard-shell governance-shell"><header className="app-header"><button className="header-back-button" type="button" onClick={onBack}><ArrowRight size={16} className="header-back-icon" /> Voltar aos módulos</button><div className="user-menu"><div className="user-copy"><strong>{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário"}</strong><span>{user.email}</span></div><div className="user-avatar user-avatar--initials">{(user.email || "U").slice(0, 2).toUpperCase()}</div><button className="user-menu-button" type="button" aria-label="Sair da conta" onClick={onLogout}><ArrowRight size={16} /></button></div></header>
    <main className="governance-main"><div className="governance-kicker"><span><ShieldCheck size={14} /> Núcleo transversal</span><span className="governance-secure"><i /> RLS e RPCs protegidas</span></div><div className="governance-heading"><div><p className="eyebrow">MatrixIA / controle institucional</p><h1>Governança</h1><p>Usuários, atribuições organizacionais, convites, unidades e auditoria em uma visão única de administração municipal.</p></div><button className="governance-refresh" type="button" onClick={() => void loadAll()} disabled={loading}><RefreshCw size={14} className={loading ? "governance-spin" : ""} /> Atualizar</button></div>
      <div className="governance-context"><span><Building2 size={15} /> <b>{contextName}</b></span><span>Identidade autenticada · autorização efetiva derivada de atribuições</span></div>
      {notice && <div className="governance-notice governance-notice--ok"><CheckCircle2 size={16} /> {notice}<button type="button" onClick={() => setNotice("")}><X size={14} /></button></div>}{error && <div className="governance-notice governance-notice--error"><AlertTriangle size={16} /> {error}<button type="button" onClick={() => setError("")}><X size={14} /></button></div>}
      <div className="governance-metrics"><Metric icon={Users} value={summary.users} label="Usuários ativos" tone="blue" /><Metric icon={Building2} value={summary.units} label="Unidades ativas" tone="green" /><Metric icon={Clock3} value={summary.invites} label="Convites pendentes" tone="amber" /><Metric icon={History} value={summary.audit} label="Eventos carregados" tone="purple" /></div>
      <nav className="governance-tabs" aria-label="Seções de Governança">{([ ["resumo", "Resumo", ClipboardList], ["usuarios", "Usuários", Users], ["acessos", "Acessos", ShieldCheck], ["convites", "Convites", MailPlus], ["unidades", "Unidades", Building2], ["auditoria", "Auditoria", History] ] as const).map(([key, label, Icon]) => <button type="button" className={tab === key ? "is-active" : ""} onClick={() => { setTab(key); setSearch(""); }} key={key}><Icon size={16} /> {label}</button>)}</nav>
      {loading ? <div className="governance-empty"><LoaderCircle size={24} className="governance-spin" /> Carregando Governança pelo Supabase…</div> : <section className="governance-panel">
        {tab === "resumo" && <SummaryPanel users={users} units={units} invites={pendingInvites} audits={audits} assignmentViews={assignmentViews} summary={summary} onTab={setTab} />}
        {tab === "usuarios" && <UserDirectoryPanel users={filteredUsers} assignmentViews={assignmentViews} search={search} setSearch={setSearch} busy={busy} onToggle={toggleUser} />}
        {tab === "acessos" && <AccessPanel modules={modules} selectedModule={selectedModule} setSelectedModule={setSelectedModule} currentModule={currentModule} accessRows={filteredAccessRows} totalRows={effectiveAccessRows.length} />}
        {tab === "convites" && <section><PanelHead title="Convites e solicitações" description="Cada convite cria uma atribuição organizacional completa. O acesso nasce do papel, da unidade, dos módulos e da vigência dessa atribuição." /><div className="governance-two-column"><form className="governance-editor" onSubmit={submitInvite}><div className="governance-editor-title"><MailPlus size={17} /> Novo convite</div><div className="governance-form-grid"><label>Nome completo<input value={inviteForm.nome} onChange={(event) => setInviteForm((current) => ({ ...current, nome: event.target.value }))} required /></label><label>E-mail institucional<input type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} required /></label><label>Perfil legado de referência<select value={inviteForm.perfil_municipal} onChange={(event) => setInviteForm((current) => ({ ...current, perfil_municipal: event.target.value }))}><option>ADMINISTRATIVO</option><option>SECRETARIO</option><option>PREFEITO</option></select></label><label>Papel organizacional<select value={inviteForm.role_id} onChange={(event) => setInviteForm((current) => ({ ...current, role_id: event.target.value }))} required><option value="">Selecione</option>{roles.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Unidade organizacional<select value={inviteForm.org_unit_id} onChange={(event) => setInviteForm((current) => ({ ...current, org_unit_id: event.target.value }))} required><option value="">Selecione</option>{units.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Módulos da atribuição<select multiple value={inviteForm.module_ids} onChange={(event) => setInviteForm((current) => ({ ...current, module_ids: Array.from(event.target.selectedOptions, (option) => option.value) }))}>{modules.filter((item) => item.is_ready !== false).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small className="governance-field-help">Use Ctrl/Cmd para selecionar mais de um módulo.</small></label></div><button className="governance-primary" type="submit" disabled={busy}><MailPlus size={15} /> Enviar convite</button></form><div><div className="governance-subheading"><h3>Solicitações pendentes</h3><span>{pendingInvites.length}</span></div><div className="governance-card-list">{pendingInvites.map((item) => <article className="governance-list-card" key={item.id}><div><strong>{item.invitee_name}</strong><small>{item.invitee_email} · {item.role_label || "Papel não informado"}</small><small>{item.org_unit_name || "Unidade não informada"} · {item.module_label || "Módulo não informado"} · solicitado em {dateLabel(item.requested_at)}</small></div><div className="governance-inline-actions"><button type="button" onClick={() => void reviewInvite(item, "approve")} disabled={busy}><Check size={14} /> Aprovar</button><button type="button" onClick={() => void reviewInvite(item, "reject")} disabled={busy}><X size={14} /> Rejeitar</button></div></article>)}{pendingInvites.length === 0 && <Empty text="Nenhuma solicitação pendente." />}</div></div></div></section>}
        {tab === "unidades" && <section><PanelHead title="Unidades organizacionais" description="A estrutura hierárquica é parte da autorização. Inativações preservam o histórico e deixam de produzir acesso efetivo." /><div className="governance-two-column"><form className="governance-editor" onSubmit={submitUnit}><div className="governance-editor-title"><Building2 size={17} /> {unitForm.id ? "Editar unidade" : "Nova unidade"}</div>{currentUnitImpact && <div className={`governance-impact-note ${!unitForm.is_active && currentUnitImpact.activeAssignments ? "governance-impact-note--warning" : ""}`}><ShieldCheck size={16} /><span><strong>{currentUnitImpact.activeAssignments} acesso(s) efetivo(s)</strong> em {currentUnitImpact.assignments} atribuição(ões), cobrindo {currentUnitImpact.modules.size} módulo(s). A alteração mantém o histórico das atribuições.</span></div>}<div className="governance-form-grid"><label>Código<input value={unitForm.code} onChange={(event) => setUnitForm((current) => ({ ...current, code: event.target.value }))} required /></label><label>Nome<input value={unitForm.name} onChange={(event) => setUnitForm((current) => ({ ...current, name: event.target.value }))} required /></label><label>Tipo<select value={unitForm.unit_type} onChange={(event) => setUnitForm((current) => ({ ...current, unit_type: event.target.value }))}><option>SECRETARIA</option><option>DEPARTAMENTO</option><option>UNIDADE</option><option>SETOR</option></select></label><label>Unidade superior<select value={unitForm.parent_id} onChange={(event) => setUnitForm((current) => ({ ...current, parent_id: event.target.value }))}><option value="">Nenhuma</option>{units.filter((item) => item.id !== unitForm.id && item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ordem<input type="number" value={unitForm.sort_order} onChange={(event) => setUnitForm((current) => ({ ...current, sort_order: event.target.value }))} /></label><label className="governance-checkbox"><input type="checkbox" checked={unitForm.is_active} onChange={(event) => setUnitForm((current) => ({ ...current, is_active: event.target.checked }))} /> Unidade ativa</label><label className="governance-form-wide">Descrição<textarea value={unitForm.description} onChange={(event) => setUnitForm((current) => ({ ...current, description: event.target.value }))} /></label></div><div className="governance-form-actions"><button type="button" onClick={resetUnitForm}>Limpar</button><button className="governance-primary" type="submit" disabled={busy}><Check size={15} /> Salvar unidade</button></div></form><div className="governance-card-list">{units.map((item) => { const impact = unitImpacts.get(item.id); return <article className="governance-list-card" key={item.id}><div><strong>{item.name}</strong><small>{item.code} · {item.unit_type} · {item.description || "Sem descrição"}</small><small>{impact?.activeAssignments || 0} acesso(s) efetivo(s) · {impact?.modules.size || 0} módulo(s) derivados de atribuições</small></div><div className="governance-inline-actions"><span className={`governance-pill ${item.is_active ? "governance-pill--green" : "governance-pill--gray"}`}>{item.is_active ? "Ativa" : "Inativa"}</span><button type="button" onClick={() => setUnitForm({ id: item.id, parent_id: item.parent_id || "", code: item.code, name: item.name, unit_type: item.unit_type, description: item.description || "", sort_order: String(item.sort_order || 0), is_active: item.is_active })}><Settings2 size={14} /> Editar</button></div></article>; })}{units.length === 0 && <Empty text="Nenhuma unidade disponível no contexto." />}</div></div></section>}
        {tab === "auditoria" && <section><PanelHead title="Trilha de auditoria" description="Eventos de concessão, revogação, papel, unidade, escopo e vigência retornados pela RPC protegida." search={auditSearch} setSearch={setAuditSearch} /><div className="governance-timeline">{audits.map((item) => <article key={String(item.id)}><span className="governance-timeline-dot" /><div><strong>{item.actor_name || item.ator_nome || "Ator não identificado"}</strong><span>{actionLabel(item.action || item.operacao || item.entidade)}</span><small>{item.target_name || item.target_email || "Registro institucional"} · {dateLabel(item.created_at || item.occurred_at || item.ocorrido_em)}</small><small className="governance-audit-details">{auditDetails(item.details)}</small></div></article>)}{audits.length === 0 && <Empty text="Nenhum evento de auditoria encontrado." />}</div></section>}
      </section>}
      <footer className="health-footer"><span><ShieldCheck size={14} /> Políticas e autorização no Supabase</span><span>Governança municipal · fonte de verdade operacional</span><button type="button" onClick={onLogout}>Sair da conta</button></footer>
    </main></div>;
}

function Metric({ icon: Icon, value, label, tone }: { icon: typeof Users; value: number; label: string; tone: string }) { return <div className={`governance-metric governance-metric--${tone}`}><span><Icon size={17} /></span><strong>{value}</strong><small>{label}</small></div>; }
function PanelHead({ title, description, search, setSearch }: { title: string; description: string; search?: string; setSearch?: (value: string) => void }) { return <div className="governance-panel-head"><div><span className="section-kicker">Gestão institucional</span><h2>{title}</h2><p>{description}</p></div>{setSearch && <label className="governance-search"><Search size={15} /><input value={search || ""} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" /></label>}</div>; }
function Empty({ text }: { text: string }) { return <div className="governance-empty governance-empty--small"><ClipboardList size={20} /> {text}</div>; }
function SummaryPanel({ users, units, invites, audits, assignmentViews, summary, onTab }: { users: UserRow[]; units: Unit[]; invites: Invite[]; audits: AuditRow[]; assignmentViews: AssignmentView[]; summary: { usersWithoutAssignment: number; assignmentsWithoutModules: number; invalidAssignments: number; validityAlerts: number }; onTab: (tab: Tab) => void }) {
  const recentAlerts = assignmentViews.filter((view) => view.issues.length).slice(0, 5);
  return <section><PanelHead title="Resumo de integridade" description="A autorização efetiva depende de usuário ativo, atribuição vigente, papel, unidade, módulo e escopo aplicáveis." /><div className="governance-summary-grid"><button type="button" onClick={() => onTab("usuarios")}><UserRoundX size={20} /><strong>{summary.usersWithoutAssignment}</strong><span>usuários ativos sem atribuição vigente</span><small>Ver diretório e consistências</small></button><button type="button" onClick={() => onTab("usuarios")}><ClipboardList size={20} /><strong>{summary.assignmentsWithoutModules}</strong><span>atribuições sem módulos</span><small>Corrigir na origem da atribuição</small></button><button type="button" onClick={() => onTab("usuarios")}><AlertTriangle size={20} /><strong>{summary.invalidAssignments}</strong><span>atribuições com inconsistência</span><small>Papel, unidade, módulo ou usuário</small></button><button type="button" onClick={() => onTab("convites")}><MailPlus size={20} /><strong>{invites.length}</strong><span>solicitações pendentes</span><small>Revisar convites</small></button></div><div className="governance-integrity-grid"><div><div className="governance-subheading"><h3>Alertas de vigência e domínio</h3><span>{summary.validityAlerts}</span></div><div className="governance-alert-list">{recentAlerts.map((view) => <article key={view.assignment.id || `${view.user.user_id}-${view.assignment.role_id}`}><div><strong>{view.user.name || view.user.email}</strong><small>{view.role?.label || view.assignment.role_label || "Papel não encontrado"} · {view.unit?.name || view.assignment.org_unit_name || "Unidade não encontrada"}</small></div><span className={`governance-pill ${statusClass(view.status)}`}>{view.status}</span><small>{view.issues.slice(0, 2).join(" · ")}</small></article>)}{recentAlerts.length === 0 && <Empty text="Nenhum alerta de consistência encontrado." />}</div></div><div className="governance-integrity-side"><div><span>Usuários monitorados</span><strong>{users.filter((item) => item.ativo !== false).length}</strong></div><div><span>Unidades ativas</span><strong>{units.filter((item) => item.is_active).length}</strong></div><div><span>Eventos recentes</span><strong>{audits.length}</strong></div></div></div><div className="governance-summary-note"><ShieldCheck size={18} /><div><strong>Fonte de verdade protegida</strong><p>Esta tela exibe a autorização derivada das atribuições organizacionais. O navegador não concede permissões: as políticas e RPCs do Supabase continuam sendo a camada de segurança.</p></div></div></section>;
}
function UserDirectoryPanel({ users, assignmentViews, search, setSearch, busy, onToggle }: { users: UserRow[]; assignmentViews: AssignmentView[]; search: string; setSearch: (value: string) => void; busy: boolean; onToggle: (item: UserRow) => Promise<void> }) {
  return <section><PanelHead title="Diretório de usuários" description="A identidade e o perfil legado são referências. O acesso efetivo aparece somente quando existe uma atribuição organizacional vigente." search={search} setSearch={setSearch} /><div className="governance-table-wrap"><table className="governance-table governance-users-table"><thead><tr><th>Identidade</th><th>Perfil legado</th><th>Atribuições organizacionais</th><th>Vigência e escopo</th><th>Estado</th><th>Ação</th></tr></thead><tbody>{users.map((item) => { const views = assignmentViews.filter((view) => view.user.user_id === item.user_id); return <tr key={item.user_id}><td><strong>{item.name || "Nome não informado"}</strong><small>{item.email}</small><small>{item.convite_aceito_em ? `Convite aceito em ${dateLabel(item.convite_aceito_em)}` : item.convite_enviado_em ? `Convite enviado em ${dateLabel(item.convite_enviado_em)}` : "Sem convite registrado"}</small></td><td><span className="governance-pill governance-pill--gray">{item.perfil_legacy || "Apenas referência"}</span></td><td><div className="governance-assignment-list">{views.map((view) => <div className="governance-assignment-item" key={view.assignment.id || `${view.assignment.role_id}-${view.assignment.org_unit_id}`}><strong>{view.role?.label || view.assignment.role_label || "Papel não encontrado"}</strong><small>{view.unit?.name || view.assignment.org_unit_name || "Unidade não encontrada"}</small><small>{view.modules.map((module) => module.label).join(", ") || "Nenhum módulo vinculado"}</small><span className="governance-pill governance-pill--blue">Origem: atribuição organizacional</span></div>)}{views.length === 0 && <small className="governance-muted">Sem atribuições cadastradas.</small>}</div></td><td><div className="governance-assignment-list">{views.map((view) => <div key={view.assignment.id || `${view.assignment.role_id}-validity`}><span className={`governance-pill ${statusClass(view.status)}`}>{view.status}</span><small>{view.assignment.valid_from ? `De ${dateOnlyLabel(view.assignment.valid_from)}` : "Início não informado"}{view.assignment.valid_until ? ` até ${dateOnlyLabel(view.assignment.valid_until)}` : " · sem fim"}</small><small>{view.scopes.length ? view.scopes.map(scopeLabel).join(", ") : "Escopo não definido"}</small>{view.issues.length > 0 && <small className="governance-consistency-warning">{view.issues.join(" · ")}</small>}</div>)}{views.length === 0 && <small className="governance-muted">Sem acesso efetivo.</small>}</div></td><td><span className={`governance-pill ${item.ativo === false ? "governance-pill--red" : "governance-pill--green"}`}>{item.ativo === false ? "Inativo" : "Ativo"}</span></td><td><button className="governance-icon-button" type="button" onClick={() => void onToggle(item)} disabled={busy} title={item.ativo === false ? "Reativar usuário" : "Desativar usuário"}>{item.ativo === false ? <UserRoundCheck size={15} /> : <UserRoundX size={15} />}</button></td></tr>; })}</tbody></table>{users.length === 0 && <Empty text="Nenhum usuário encontrado." />}</div></section>;
}
function AccessPanel({ modules, selectedModule, setSelectedModule, currentModule, accessRows, totalRows }: { modules: ModuleRow[]; selectedModule: string; setSelectedModule: (value: string) => void; currentModule?: ModuleRow; accessRows: AccessRow[]; totalRows: number }) {
  return <section><PanelHead title="Acessos efetivos por atribuição" description="Somente combinações vigentes de usuário, atribuição, papel, unidade e módulo são exibidas. Cada linha informa a origem organizacional e o escopo aplicado." /><div className="governance-access-toolbar"><label>Módulo<select value={selectedModule} onChange={(event) => setSelectedModule(event.target.value)}><option value="">Todos os módulos</option>{modules.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{currentModule && <span className="governance-module-context"><strong>{currentModule.label}</strong><small>{currentModule.description || currentModule.status_label || "Módulo municipal"}</small></span>}<span className="governance-access-count"><strong>{accessRows.length}</strong><small>de {totalRows} acesso(s) efetivo(s)</small></span></div><div className="governance-access-grid">{accessRows.map((item, index) => <article className="governance-access-card" key={`${item.assignment.id || "assignment"}-${item.module.id}-${index}`}><div><strong>{item.user.name || item.user.email}</strong><small>{item.user.email}</small></div><dl><div><dt>Módulo</dt><dd>{item.module.label}</dd></div><div><dt>Papel</dt><dd>{item.role?.label || item.assignment.role_label || "—"}</dd></div><div><dt>Unidade</dt><dd>{item.unit?.name || item.assignment.org_unit_name || "—"}</dd></div><div><dt>Vigência</dt><dd>{validityLabel(item.assignment)}</dd></div><div><dt>Escopo</dt><dd>{item.scopes.length ? item.scopes.map(scopeLabel).join(", ") : "Não definido"}</dd></div></dl><span className="governance-pill governance-pill--green">Origem: atribuição organizacional</span></article>)}{accessRows.length === 0 && <Empty text={selectedModule ? "Nenhum acesso efetivo para este módulo." : "Nenhum acesso efetivo derivado de atribuições vigentes."} />}</div></section>;
}
