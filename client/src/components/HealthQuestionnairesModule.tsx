import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ClipboardList, Edit3, History, LoaderCircle, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Context = { municipio_id: string; municipio_nome: string; usuario_id: number | null; pode_gerir: boolean };
type QuestionnaireStatus = "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";
type QuestionType = "TEXTO" | "NUMERO" | "DATA" | "SIM_NAO" | "ESCOLHA_UNICA" | "ESCOLHA_MULTIPLA";
type Questionnaire = { id: string; municipio_id: string; codigo: string; titulo: string; descricao: string | null; categoria: string; status: QuestionnaireStatus; versao: number; ativo: boolean; created_at: string; updated_at: string };
type Question = { id: string; questionario_id: string; ordem: number; tipo: QuestionType; enunciado: string; obrigatoria: boolean; opcoes: string[]; ativo: boolean };
type HistoryItem = { id: string; questionario_id: string; acao: string; versao: number; created_at: string; ator_id: number | null };
type QuestionDraft = { id?: string; ordem: number; tipo: QuestionType; enunciado: string; obrigatoria: boolean; opcoes: string };
type Form = { codigo: string; titulo: string; descricao: string; categoria: string; status: QuestionnaireStatus };

const emptyForm: Form = { codigo: "", titulo: "", descricao: "", categoria: "APS", status: "RASCUNHO" };
const emptyQuestion = (): QuestionDraft => ({ ordem: 1, tipo: "TEXTO", enunciado: "", obrigatoria: false, opcoes: "" });
const statusLabels: Record<QuestionnaireStatus, string> = { RASCUNHO: "Rascunho", PUBLICADO: "Publicado", ARQUIVADO: "Arquivado" };
const typeLabels: Record<QuestionType, string> = { TEXTO: "Texto", NUMERO: "Número", DATA: "Data", SIM_NAO: "Sim ou não", ESCOLHA_UNICA: "Escolha única", ESCOLHA_MULTIPLA: "Múltipla escolha" };

function dateLabel(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function errorMessage(error: { message?: string } | null) { return error?.message || "Não foi possível concluir a operação. Verifique seu acesso e tente novamente."; }

export function HealthQuestionnairesModule({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  const [context, setContext] = useState<Context | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [draftQuestions, setDraftQuestions] = useState<QuestionDraft[]>([]);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canManage = Boolean(context?.pode_gerir);
  const selected = useMemo(() => questionnaires.find((item) => item.id === selectedId) || null, [questionnaires, selectedId]);
  const selectedQuestions = useMemo(() => questions.filter((item) => item.questionario_id === selectedId && item.ativo).sort((a, b) => a.ordem - b.ordem), [questions, selectedId]);
  const filtered = useMemo(() => questionnaires.filter((item) => `${item.codigo} ${item.titulo} ${item.categoria} ${statusLabels[item.status]}`.toLowerCase().includes(search.toLowerCase().trim())), [questionnaires, search]);
  const selectedHistory = useMemo(() => history.filter((item) => item.questionario_id === selectedId), [history, selectedId]);
  const summary = useMemo(() => ({ total: questionnaires.length, published: questionnaires.filter((item) => item.status === "PUBLICADO").length, drafts: questionnaires.filter((item) => item.status === "RASCUNHO").length, archived: questionnaires.filter((item) => item.status === "ARQUIVADO").length }), [questionnaires]);

  async function loadAll(preferredId?: string | null) {
    setLoading(true); setError("");
    const contextResult = await supabase.rpc("saude_obrigacoes_contexto");
    if (contextResult.error || !contextResult.data?.[0]) { setError("Não foi possível identificar o município do usuário autenticado."); setLoading(false); return; }
    const nextContext = contextResult.data[0] as Context; setContext(nextContext);
    const [questionnaireResult, questionResult, historyResult] = await Promise.all([
      supabase.from("saude_questionarios").select("id,municipio_id,codigo,titulo,descricao,categoria,status,versao,ativo,created_at,updated_at").eq("municipio_id", nextContext.municipio_id).order("updated_at", { ascending: false }).limit(300),
      supabase.from("saude_questionario_perguntas").select("id,questionario_id,ordem,tipo,enunciado,obrigatoria,opcoes,ativo").eq("ativo", true).order("ordem").limit(3000),
      supabase.from("saude_questionarios_historico").select("id,questionario_id,acao,versao,created_at,ator_id").order("created_at", { ascending: false }).limit(1000),
    ]);
    const firstError = [questionnaireResult, questionResult, historyResult].find((result) => result.error);
    if (firstError?.error) setError(errorMessage(firstError.error));
    const nextQuestionnaires = (questionnaireResult.data || []) as Questionnaire[];
    setQuestionnaires(nextQuestionnaires); setQuestions((questionResult.data || []) as Question[]); setHistory((historyResult.data || []) as HistoryItem[]);
    const nextId = preferredId ?? selectedId ?? nextQuestionnaires[0]?.id ?? null;
    setSelectedId(nextQuestionnaires.some((item) => item.id === nextId) ? nextId : nextQuestionnaires[0]?.id || null);
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [user.id]);
  useEffect(() => { if (selected && !editing) { setForm({ codigo: selected.codigo, titulo: selected.titulo, descricao: selected.descricao || "", categoria: selected.categoria, status: selected.status }); setDraftQuestions(selectedQuestions.map((item) => ({ id: item.id, ordem: item.ordem, tipo: item.tipo, enunciado: item.enunciado, obrigatoria: item.obrigatoria, opcoes: item.opcoes.join("\n") }))); } }, [selectedId, selected?.updated_at, questions.length, editing]);

  const showResult = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 4500); };
  function beginCreate() { setSelectedId(null); setForm({ ...emptyForm }); setDraftQuestions([emptyQuestion()]); setEditing(true); }
  function beginEdit(item = selected) { if (!item) return; setSelectedId(item.id); setForm({ codigo: item.codigo, titulo: item.titulo, descricao: item.descricao || "", categoria: item.categoria, status: item.status }); setDraftQuestions(selectedQuestions.map((question) => ({ id: question.id, ordem: question.ordem, tipo: question.tipo, enunciado: question.enunciado, obrigatoria: question.obrigatoria, opcoes: question.opcoes.join("\n") }))); setEditing(true); }
  function cancelEdit() { setEditing(false); if (!selected && questionnaires[0]) setSelectedId(questionnaires[0].id); }
  function updateQuestion(index: number, patch: Partial<QuestionDraft>) { setDraftQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  function addQuestion() { setDraftQuestions((current) => [...current, { ...emptyQuestion(), ordem: current.length + 1 }]); }
  function removeQuestion(index: number) { setDraftQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, ordem: itemIndex + 1 }))); }

  async function saveQuestionnaire(event: React.FormEvent) {
    event.preventDefault(); if (!context || !canManage) return;
    if (!form.codigo.trim() || !form.titulo.trim()) { setError("Informe o código e o título do questionário."); return; }
    if (draftQuestions.some((item) => !item.enunciado.trim())) { setError("Todas as perguntas precisam ter um enunciado."); return; }
    if (draftQuestions.some((item) => ["ESCOLHA_UNICA", "ESCOLHA_MULTIPLA"].includes(item.tipo) && !item.opcoes.split("\n").map((value) => value.trim()).filter(Boolean).length)) { setError("Perguntas de escolha precisam ter pelo menos uma opção."); return; }
    setBusy(true); setError("");
    const existing = selected;
    const questionnairePayload = { municipio_id: context.municipio_id, codigo: form.codigo.trim().toUpperCase(), titulo: form.titulo.trim(), descricao: form.descricao.trim() || null, categoria: form.categoria.trim() || "APS", status: form.status, versao: existing ? existing.versao + 1 : 1, ativo: form.status !== "ARQUIVADO", updated_by: context.usuario_id, created_by: context.usuario_id };
    const questionnaireResult = existing ? await supabase.from("saude_questionarios").update(questionnairePayload).eq("id", existing.id).select("id").single() : await supabase.from("saude_questionarios").insert(questionnairePayload).select("id").single();
    if (questionnaireResult.error || !questionnaireResult.data) { setError(errorMessage(questionnaireResult.error)); setBusy(false); return; }
    const questionarioId = questionnaireResult.data.id as string;
    const deleteResult = await supabase.from("saude_questionario_perguntas").delete().eq("questionario_id", questionarioId);
    if (deleteResult.error) { setError(errorMessage(deleteResult.error)); setBusy(false); return; }
    const rows = draftQuestions.map((item, index) => ({ questionario_id: questionarioId, ordem: index + 1, tipo: item.tipo, enunciado: item.enunciado.trim(), obrigatoria: item.obrigatoria, opcoes: item.opcoes.split("\n").map((value) => value.trim()).filter(Boolean), ativo: true }));
    const insertResult = rows.length ? await supabase.from("saude_questionario_perguntas").insert(rows) : { error: null };
    if (insertResult.error) { setError(errorMessage(insertResult.error)); setBusy(false); return; }
    setEditing(false); setBusy(false); showResult(existing ? "Questionário atualizado com sucesso." : "Questionário criado com sucesso."); await loadAll(questionarioId);
  }

  async function toggleArchived(item: Questionnaire) { if (!canManage) return; const nextStatus = item.status === "ARQUIVADO" ? "RASCUNHO" : "ARQUIVADO"; if (!window.confirm(`${nextStatus === "ARQUIVADO" ? "Arquivar" : "Reativar"} o questionário ${item.codigo}?`)) return; setBusy(true); const result = await supabase.from("saude_questionarios").update({ status: nextStatus, ativo: nextStatus !== "ARQUIVADO", versao: item.versao + 1, updated_by: context?.usuario_id }).eq("id", item.id); setBusy(false); if (result.error) setError(errorMessage(result.error)); else { showResult(nextStatus === "ARQUIVADO" ? "Questionário arquivado." : "Questionário reativado."); await loadAll(item.id); } }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  return <div className="dashboard-shell health-shell"><header className="app-header"><button className="header-back-button" type="button" onClick={onBack}><ArrowRight size={16} className="header-back-icon" /> Voltar aos módulos</button><div className="user-menu"><div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div><div className="user-avatar user-avatar--initials">{displayName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase()}</div><button className="user-menu-button" type="button" aria-label="Sair da conta" onClick={onLogout}><ArrowRight size={16} /></button></div></header>
    <main className="health-questionnaires-main"><div className="health-questionnaires-heading"><div><p className="eyebrow">Saúde / gestão operacional</p><h1>Questionários</h1><p>Crie instrumentos estruturados, organize perguntas e publique versões para uso da equipe.</p></div><span className="health-obligations-secure"><ShieldCheck size={14} /> RLS por município</span></div>
      <div className="health-obligations-context-bar"><span><ShieldCheck size={14} /><b>{context?.municipio_nome || "Contexto municipal"}</b></span><span>{canManage ? "Perfil com permissão de gestão" : "Perfil somente leitura"}</span><button type="button" onClick={() => void loadAll()}><RefreshCw size={14} /> Atualizar</button></div>
      <div className="health-questionnaire-summary"><div><ClipboardList size={18} /><strong>{summary.total}</strong><small>questionários</small></div><div><CheckCircle2 size={18} /><strong>{summary.published}</strong><small>publicados</small></div><div><Edit3 size={18} /><strong>{summary.drafts}</strong><small>em rascunho</small></div><div><History size={18} /><strong>{summary.archived}</strong><small>arquivados</small></div></div>
      {notice && <div className="health-obligations-success" role="status"><CheckCircle2 size={16} />{notice}</div>}{error && <div className="health-obligations-error" role="alert"><AlertTriangle size={16} />{error}<button type="button" onClick={() => setError("")}>Fechar</button></div>}
      {loading ? <div className="health-obligations-empty"><LoaderCircle size={24} className="health-obligations-spinner" />Carregando questionários do Supabase…</div> : <div className="health-questionnaire-layout"><aside className="health-questionnaire-list"><div className="health-questionnaire-list-head"><div><span className="section-kicker">Biblioteca municipal</span><h2>Questionários cadastrados</h2></div>{canManage && <button type="button" className="health-action-button" onClick={beginCreate}><Plus size={15} /> Novo</button>}</div><label className="health-obligations-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código ou título" /></label><div className="health-questionnaire-items">{filtered.map((item) => <button type="button" className={`health-questionnaire-item ${selectedId === item.id && !editing ? "is-selected" : ""}`} key={item.id} onClick={() => { setEditing(false); setSelectedId(item.id); }}><span><b>{item.codigo}</b><strong>{item.titulo}</strong><small>{item.categoria} · v{item.versao}</small></span><em className={`health-questionnaire-status health-questionnaire-status--${item.status.toLowerCase()}`}>{statusLabels[item.status]}</em></button>)}{filtered.length === 0 && <p className="health-questionnaire-empty">Nenhum questionário encontrado.</p>}</div></aside>
        <section className="health-questionnaire-editor">{editing ? <form onSubmit={saveQuestionnaire}><div className="health-questionnaire-editor-head"><div><span className="section-kicker">Editor operacional</span><h2>{selected ? "Editar questionário" : "Novo questionário"}</h2><p>Defina os dados gerais e monte as perguntas na ordem de aplicação.</p></div><div className="health-admin-actions"><button type="button" onClick={cancelEdit}><X size={15} /> Cancelar</button><button className="health-action-button" type="submit" disabled={busy}><Save size={15} /> {busy ? "Salvando..." : "Salvar questionário"}</button></div></div><div className="health-questionnaire-form-grid"><label>Código<input required value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} placeholder="APS-001" /></label><label>Categoria<input value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })} placeholder="APS" /></label><label className="health-questionnaire-field-wide">Título<input required value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} placeholder="Nome do instrumento" /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as QuestionnaireStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="health-questionnaire-field-wide">Descrição<textarea rows={3} value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Objetivo e orientação de preenchimento" /></label></div><div className="health-questionnaire-questions-head"><div><h3>Perguntas <span>{draftQuestions.length}</span></h3><p>Use uma pergunta por bloco. Opções devem ser informadas uma por linha.</p></div><button type="button" className="health-action-button health-action-button--quiet" onClick={addQuestion}><Plus size={15} /> Adicionar pergunta</button></div><div className="health-questionnaire-question-list">{draftQuestions.map((question, index) => <article className="health-question-card" key={question.id || `new-${index}`}><header><strong>{String(index + 1).padStart(2, "0")}</strong><button type="button" title="Remover pergunta" onClick={() => removeQuestion(index)} disabled={draftQuestions.length === 1}><Trash2 size={15} /></button></header><label>Enunciado<textarea required rows={2} value={question.enunciado} onChange={(event) => updateQuestion(index, { enunciado: event.target.value })} placeholder="Escreva a pergunta para o respondente" /></label><div className="health-question-fields"><label>Tipo<select value={question.tipo} onChange={(event) => updateQuestion(index, { tipo: event.target.value as QuestionType })}>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="health-question-check"><input type="checkbox" checked={question.obrigatoria} onChange={(event) => updateQuestion(index, { obrigatoria: event.target.checked })} /> Resposta obrigatória</label></div>{["ESCOLHA_UNICA", "ESCOLHA_MULTIPLA"].includes(question.tipo) && <label>Opções<textarea rows={3} value={question.opcoes} onChange={(event) => updateQuestion(index, { opcoes: event.target.value })} placeholder="Uma opção por linha" /></label>}</article>)}</div></form> : selected ? <><div className="health-questionnaire-editor-head"><div><span className="section-kicker">Instrumento municipal · {selected.categoria}</span><h2>{selected.titulo}</h2><p>{selected.descricao || "Este questionário ainda não possui uma descrição operacional."}</p></div><div className="health-admin-actions">{canManage && <button className="health-action-button" type="button" onClick={() => beginEdit()}><Edit3 size={15} /> Editar</button>}<button type="button" title={selected.status === "ARQUIVADO" ? "Reativar" : "Arquivar"} onClick={() => void toggleArchived(selected)} disabled={!canManage || busy}>{selected.status === "ARQUIVADO" ? <RefreshCw size={15} /> : <Trash2 size={15} />} {selected.status === "ARQUIVADO" ? "Reativar" : "Arquivar"}</button></div></div><div className="health-questionnaire-detail-meta"><span className={`health-questionnaire-status health-questionnaire-status--${selected.status.toLowerCase()}`}>{statusLabels[selected.status]}</span><span>Versão {selected.versao}</span><span>Atualizado em {dateLabel(selected.updated_at)}</span></div><div className="health-questionnaire-preview"><div className="health-questionnaire-preview-head"><div><span className="section-kicker">Pré-visualização</span><h3>Perguntas do instrumento</h3></div><span>{selectedQuestions.length} perguntas</span></div>{selectedQuestions.map((question) => <div className="health-question-preview" key={question.id}><b>{question.ordem}</b><div><strong>{question.enunciado}</strong><small>{typeLabels[question.tipo]} {question.obrigatoria ? "· obrigatória" : "· opcional"}</small>{question.opcoes.length > 0 && <span>{question.opcoes.join(" · ")}</span>}</div></div>)}{selectedQuestions.length === 0 && <p className="health-questionnaire-empty">Este questionário ainda não possui perguntas.</p>}</div><div className="health-questionnaire-history"><h3><History size={16} /> Histórico de versões</h3>{selectedHistory.slice(0, 8).map((item) => <div key={item.id}><span>{item.acao}</span><small>v{item.versao} · {dateLabel(item.created_at)}</small></div>)}{selectedHistory.length === 0 && <p>Nenhum evento registrado.</p>}</div></> : <div className="health-questionnaire-empty-state"><ClipboardList size={36} /><h2>Nenhum questionário selecionado</h2><p>Crie o primeiro instrumento municipal para começar a organizar a coleta de informações.</p>{canManage && <button className="health-action-button" type="button" onClick={beginCreate}><Plus size={15} /> Criar questionário</button>}</div>}</section></div>}
      <footer className="health-footer"><span><ShieldCheck size={14} /> Dados separados por município</span><span>Questionários · versões · perguntas</span><button type="button" onClick={onLogout}>Sair da conta</button></footer>
    </main></div>;
}
