import { BookOpen, ChevronDown, Eye, FilePlus2, Plus, Search } from "lucide-react";
import { useState } from "react";
import type { AtasWorkspaceData } from "@/lib/atas";
import { formatDate, formatMoney } from "@/lib/atas";
import { callAtaRpc } from "@/lib/atasOperations";

type Props = { data: AtasWorkspaceData; busy: boolean; onRefresh: () => void; onFeedback: (message: string, error?: boolean) => void };

export function ProcurementAdditivesPage({ data, busy, onRefresh, onFeedback }: Props) {
  const [ataId, setAtaId] = useState("");
  const [numero, setNumero] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [valor, setValor] = useState("0");
  const [itensJson, setItensJson] = useState("[]");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const list = data.aditivos.filter((item) => {
    const ata = data.atas.find((candidate) => candidate.id === item.ata_id);
    const text = `${item.numero} ${item.justificativa} ${ata?.numero_ata || ""}`.toLocaleLowerCase("pt-BR");
    return (!query || text.includes(query.toLocaleLowerCase("pt-BR"))) && (status === "TODOS" || item.status === status);
  });
  const selected = selectedId ? data.aditivos.find((item) => item.id === selectedId) : null;
  const save = async () => {
    if (!ataId || !numero.trim() || justificativa.trim().length < 10) return onFeedback("Selecione a ata, informe o número e justificativa com pelo menos 10 caracteres.", true);
    let dados: Record<string, unknown>;
    try { const parsed = JSON.parse(itensJson || "[]"); if (!Array.isArray(parsed)) throw new Error("Itens devem ser uma lista JSON."); dados = { itens: parsed }; } catch (error) { return onFeedback(error instanceof Error ? error.message : "JSON de itens inválido.", true); }
    try {
      await callAtaRpc("compras_criar_aditivo", { p_ata_id: Number(ataId), p_numero: numero.trim(), p_tipo: "VALOR", p_data_assinatura: new Date().toISOString().slice(0, 10), p_justificativa: justificativa.trim(), p_valor_aditivo: Number(valor), p_dados: dados });
      onFeedback("Aditivo salvo para aplicação autorizada."); setNumero(""); setJustificativa(""); setValor("0"); setItensJson("[]"); onRefresh();
    } catch (error) { onFeedback(error instanceof Error ? error.message : "Aditivo recusado.", true); }
  };
  const apply = async (id: number) => {
    if (!window.confirm("Aplicar este aditivo na ata? A operação será auditada.")) return;
    try { await callAtaRpc("compras_aplicar_aditivo", { p_aditivo_id: id }); onFeedback("Aditivo aplicado pela transação do Supabase."); onRefresh(); } catch (error) { onFeedback(error instanceof Error ? error.message : "Aplicação recusada.", true); }
  };
  return <div className="proc-page"><div className="proc-page-heading"><div><span className="section-kicker">Alterações contratuais</span><h1>Aditivos</h1><p>Registre justificativa, valor, itens e aplicação com trilha de auditoria.</p></div><div className="proc-heading-stat"><FilePlus2 size={18}/><strong>{data.aditivos.length}</strong><span>aditivos registrados</span></div></div>
    <div className="proc-form-section"><div className="proc-form-grid"><label>Ata<select value={ataId} onChange={(e) => setAtaId(e.target.value)}><option value="">Selecione</option>{data.atas.map((ata) => <option key={ata.id} value={ata.id}>{ata.numero_ata} · {ata.objeto || "sem objeto"}</option>)}</select></label><label>Número do aditivo<input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="1º Termo Aditivo" /></label><label>Valor do aditivo<input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></label><label className="proc-field-wide">Justificativa *<textarea rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Fundamente a alteração contratual" /></label><label className="proc-field-wide">Itens do aditivo (JSON, quando aplicável)<textarea rows={4} value={itensJson} onChange={(e) => setItensJson(e.target.value)} placeholder='[{"item_numero":"1","quantidade":10,"valor_unitario":12.5}]' /></label></div><button className="proc-primary" onClick={() => void save()} disabled={busy}><Plus size={16}/> Salvar aditivo</button></div>
    <div className="proc-toolbar"><label className="proc-search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aditivo, ata ou justificativa" /></label><label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option>TODOS</option><option>RASCUNHO</option><option>APLICADO</option><option>CANCELADO</option></select></label><span className="proc-count">{list.length} registro(s)</span></div>
    <div className="proc-table-wrap"><table className="proc-table"><thead><tr><th>Aditivo</th><th>Ata</th><th>Data</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td><strong>{item.numero}</strong><small>{item.justificativa}</small></td><td>{data.atas.find((ata) => ata.id === item.ata_id)?.numero_ata || item.ata_id}</td><td>{formatDate(item.data_assinatura)}</td><td>{formatMoney(item.valor_aditivo)}</td><td><span className="proc-tag proc-tag--neutral">{item.status}</span></td><td><button className="proc-button proc-button--small" onClick={() => setSelectedId(item.id)}><Eye size={14}/> Ver</button>{item.status === "RASCUNHO" && <button className="proc-button proc-button--small" onClick={() => void apply(item.id)} disabled={busy}>Aplicar</button>}</td></tr>)}</tbody></table>{!list.length && <div className="proc-empty">Nenhum aditivo encontrado no município autorizado.</div>}</div>
    {selected && <div className="proc-form-section"><div className="proc-form-section-head"><div><span>Visualização detalhada</span><strong>{selected.numero}</strong></div><button className="proc-button proc-button--small" onClick={() => setSelectedId(null)}>Fechar</button></div><p><strong>Ata:</strong> {data.atas.find((ata) => ata.id === selected.ata_id)?.numero_ata || selected.ata_id} · <strong>Tipo:</strong> {selected.tipo} · <strong>Status:</strong> {selected.status}</p><p>{selected.justificativa}</p><pre className="proc-json-preview">{JSON.stringify(selected.dados || {}, null, 2)}</pre></div>}
  </div>;
}

const faq = [{ q: "Como cadastrar uma ata?", a: "Use Cadastrar Ata, preencha os campos obrigatórios e inclua os itens. O Supabase valida município, papel, totais e auditoria em uma única RPC." }, { q: "Como importar uma ata existente?", a: "Abra o detalhe, preserve o arquivo original no bucket privado e crie uma revisão. Valide pendências antes de publicar; a publicação compara snapshots e exige confirmação." }, { q: "Como corrigir um saldo?", a: "Use Gestão de Saldos e Consumo. O ajuste exige justificativa e chama gestao_atas_ajustar_saldo; não há alteração local ou update direto." }, { q: "Como um pedido vira consumo?", a: "O pedido é criado em rascunho, seus itens geram reserva e, após aprovação, a RPC transacional registra consumo conforme as regras do município." }, { q: "Quem pode aprovar ou aplicar aditivos?", a: "A tela apresenta a ação, mas a autorização definitiva é feita por RLS e pela RPC com o papel municipal compatível." }];
export function ProcurementFaqPage() { const [open, setOpen] = useState(0); const [query, setQuery] = useState(""); const list = faq.filter((item) => !query || `${item.q} ${item.a}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))); return <div className="proc-page"><div className="proc-page-heading"><div><span className="section-kicker">Manual operacional</span><h1>FAQ e orientações</h1><p>Respostas curtas para os fluxos de cadastro, saldos, pedidos, aprovação e auditoria.</p></div><BookOpen size={28} color="#2d7c7a"/></div><label className="proc-search proc-faq-search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar orientação" /></label><div className="proc-faq-list">{list.map((item, index) => <article key={item.q} className={open === index ? "is-open" : ""}><button onClick={() => setOpen(open === index ? -1 : index)}><strong>{item.q}</strong><ChevronDown size={17}/></button>{open === index && <p>{item.a}</p>}</article>)}</div></div>; }
