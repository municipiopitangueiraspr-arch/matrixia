import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Building2, Check, CheckCircle2, ChevronDown, Download, FileUp, GitBranch, History, Layers3, Map, MapPinned, Plus, Search, Upload, UsersRound, XCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import { useDialog } from "@/contexts/DialogContext";
import { supabase } from "@/lib/supabase";
import { MapPreparationWorkspace } from "./MapPreparationWorkspace";

type Lot = { id: string; sourceHandle: string; label: string; block: string; number: string; street: string; neighborhood: string; status: "Conferido" | "Pendente"; geometry: Point[]; displayGeometry: Point[]; x: number; y: number; household?: Household };
type Point = { x: number; y: number };
type Household = { label: string; addressLine: string; addressNumber: string; addressComplement: string; neighborhood: string; locality: string; postalCode: string; propertyType: string; occupancyStatus: string };
type ImportEntry = { id: string; file: string; lots: number; features: number; problematic: number; date: string; status: string; current: boolean };
type Zone = { id: string; name: string; color: string; microareaId: string | null };
type Tab = "map" | "import" | "lots" | "blocks" | "streets" | "neighborhoods" | "addresses" | "families" | "people" | "pending" | "history" | "versions";

const tabGroups: { title: string; items: [Tab, string, LucideIcon][] }[] = [
  { title: "Preparação", items: [["map", "Mapa territorial", Map], ["import", "Importar e preparar DXF", Upload], ["pending", "Pendências de conferência", AlertTriangle]] },
  { title: "Base cadastral", items: [["lots", "Lotes", Layers3], ["blocks", "Quadras", Building2], ["streets", "Ruas e logradouros", GitBranch], ["neighborhoods", "Bairros", MapPinned], ["addresses", "Endereços", Map]] },
  { title: "Cadastros posteriores", items: [["families", "Famílias", UsersRound], ["people", "Pessoas", UsersRound]] },
  { title: "Controle", items: [["history", "Histórico de importações", History], ["versions", "Versões do mapa", History]] },
] as const;

function csvDownload(rows: string[][], filename: string) {
  const content = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

function geometryPoints(value: unknown): Point[] {
  if (!Array.isArray(value)) return [];
  return value.map((point) => {
    if (Array.isArray(point)) return { x: Number(point[0]), y: Number(point[1]) };
    return { x: Number((point as { x?: number }).x), y: Number((point as { y?: number }).y) };
  }).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function geometryStats(points: Point[], bounds?: { minX: number; maxX: number; minY: number; maxY: number }) {
  if (!points.length) return { x: 50, y: 50, area: null as number | null };
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let area = 0;
  points.forEach((point, index) => { const next = points[(index + 1) % points.length]; area += point.x * next.y - next.x * point.y; });
  const width = Math.max((bounds?.maxX ?? centerX + 1) - (bounds?.minX ?? centerX - 1), 1);
  const height = Math.max((bounds?.maxY ?? centerY + 1) - (bounds?.minY ?? centerY - 1), 1);
  return { x: 7 + ((centerX - (bounds?.minX ?? centerX - 1)) / width) * 86, y: 9 + (1 - ((centerY - (bounds?.minY ?? centerY - 1)) / height)) * 78, area: Math.abs(area / 2) };
}

function parseDxf(text: string) {
  const entityBlocks = text.split(/\n0\s*\n/).map((block) => block.trim()).filter(Boolean);
  const entities = entityBlocks.map((block, index) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim());
    const entityType = lines[0]?.split(/\s+/)[0] || "UNKNOWN";
    const pairs: { code: string; value: string }[] = [];
    for (let cursor = 0; cursor < lines.length - 1; cursor += 2) pairs.push({ code: lines[cursor], value: lines[cursor + 1] || "" });
    const get = (code: string) => pairs.find((pair) => pair.code === code)?.value || "";
    const points: Point[] = [];
    for (let cursor = 0; cursor < lines.length - 3; cursor += 1) if (lines[cursor] === "10" && lines[cursor + 2] === "20") points.push({ x: Number(lines[cursor + 1]), y: Number(lines[cursor + 3]) });
    return { index, entityType, layer: get("8") || null, handle: get("5") || null, textContent: entityType === "TEXT" || entityType === "MTEXT" ? get("1") || get("3") || null : null, insertionPoint: Number.isFinite(Number(get("10"))) ? { x: Number(get("10")), y: Number(get("20")) } : null, geometry: points.length >= 3 ? points : null, rawPairs: pairs };
  });
  const lots = entities.filter((entity) => (entity.entityType === "LWPOLYLINE" || entity.entityType === "POLYLINE") && entity.geometry && entity.geometry.length >= 3);
  const texts = entities.filter((entity) => entity.textContent && entity.insertionPoint);
  return { entities, lots, texts };
}

function guessText(texts: ReturnType<typeof parseDxf>["texts"], center: Point) {
  const nearest = texts.map((item) => ({ item, distance: Math.hypot((item.insertionPoint?.x || 0) - center.x, (item.insertionPoint?.y || 0) - center.y) })).sort((a, b) => a.distance - b.distance).slice(0, 8).map(({ item }) => item.textContent?.trim() || "");
  const number = nearest.find((text) => /^\d{1,5}[A-Za-z]?$/.test(text)) || "";
  const street = nearest.find((text) => /^(rua|avenida|av\.|travessa|tv\.|alameda|estrada|rodovia|praça|praca)\b/i.test(text)) || "";
  const block = nearest.find((text) => /^(q|quadra|qd)[\s-]*[A-Za-z0-9]+$/i.test(text)) || "";
  const neighborhood = nearest.find((text) => /bairro|jardim|vila|conjunto|parque|centro/i.test(text) && text !== street) || "";
  return { number, street, block, neighborhood };
}

export function IntegratedTerritoryModule({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  const { alert, confirm } = useDialog();
  const [tab, setTab] = useState<Tab>("map");
  const [lots, setLots] = useState<Lot[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [imports, setImports] = useState<ImportEntry[]>([]);
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fileName, setFileName] = useState("");
  const [draftImportId, setDraftImportId] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [areaColor, setAreaColor] = useState("#91cdb0");
  const [areaTeam, setAreaTeam] = useState("");
  const [areaAcs, setAreaAcs] = useState("");

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  const filteredLots = useMemo(() => lots.filter((lot) => `${lot.id} ${lot.label} ${lot.block} ${lot.number} ${lot.street} ${lot.neighborhood}`.toLowerCase().includes(search.toLowerCase())), [lots, search]);
  const pendingLots = lots.filter((lot) => lot.status === "Pendente");
  const selectedLot = lots.find((lot) => lot.id === selectedLotId) || null;
  const tabTitle = tabGroups.flatMap((group) => group.items).find(([key]) => key === tab)?.[1] || "Território Integrado";

  const loadData = async (preferredImportId?: string) => {
    setLoading(true);
    const [importsResult, zonesResult] = await Promise.all([
      supabase.from("census_map_imports").select("id,file_name,status,total_features,valid_features,problematic_features,created_at,is_current,published_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("census_zones").select("id,name,color,microarea_id").eq("active", true).limit(200),
    ]);
    if (importsResult.error || zonesResult.error) { await alert(importsResult.error?.message || zonesResult.error?.message || "Não foi possível ler o mapa do Supabase.", { title: "Erro ao carregar território", kind: "error" }); setLoading(false); return; }
    const importRows = importsResult.data || [];
    const current = importRows.find((item) => item.id === preferredImportId) || importRows.find((item) => item.is_current) || importRows.find((item) => item.status === "PUBLISHED");
    let lotRows: Array<Record<string, unknown>> = [];
    let householdRows: Array<Record<string, unknown>> = [];
    if (current) {
      const [lotsResult, householdsResult] = await Promise.all([
        supabase.from("census_map_lots").select("id,source_handle,label,geometry,is_valid,cadastral_label,street_name,neighborhood_name,block_reference,zone_id").eq("import_id", current.id).limit(5000),
        supabase.from("census_households").select("lot_id,label,address_line,address_number,address_complement,neighborhood,locality,postal_code,property_type,occupancy_status").eq("active", true).limit(5000),
      ]);
      if (lotsResult.error || householdsResult.error) { await alert(lotsResult.error?.message || householdsResult.error?.message || "Não foi possível carregar os lotes e domicílios.", { title: "Erro ao carregar mapa", kind: "error" }); }
      lotRows = lotsResult.data || []; householdRows = householdsResult.data || [];
    }
    const allGeometry = lotRows.flatMap((row) => geometryPoints(row.geometry));
    const bounds = allGeometry.length ? { minX: Math.min(...allGeometry.map((point) => point.x)), maxX: Math.max(...allGeometry.map((point) => point.x)), minY: Math.min(...allGeometry.map((point) => point.y)), maxY: Math.max(...allGeometry.map((point) => point.y)) } : undefined;
    const householdByLot = new globalThis.Map(householdRows.map((row) => [String(row.lot_id), { label: String(row.label || "Domicílio"), addressLine: String(row.address_line || ""), addressNumber: String(row.address_number || ""), addressComplement: String(row.address_complement || ""), neighborhood: String(row.neighborhood || ""), locality: String(row.locality || ""), postalCode: String(row.postal_code || ""), propertyType: String(row.property_type || ""), occupancyStatus: String(row.occupancy_status || "") }]));
    setLots(lotRows.map((row) => { const geometry = geometryPoints(row.geometry); const stats = geometryStats(geometry, bounds); const household = householdByLot.get(String(row.id)); const displayGeometry = geometry.map((point) => ({ x: 7 + ((point.x - (bounds?.minX || point.x - 1)) / Math.max((bounds?.maxX || point.x + 1) - (bounds?.minX || point.x - 1), 1)) * 86, y: 9 + (1 - ((point.y - (bounds?.minY || point.y - 1)) / Math.max((bounds?.maxY || point.y + 1) - (bounds?.minY || point.y - 1), 1))) * 78 })); return { id: String(row.id), sourceHandle: String(row.source_handle || ""), label: String(row.cadastral_label || row.label || "Lote sem identificação"), block: String(row.block_reference || "Não identificado"), number: household?.addressNumber || String(row.label || "—"), street: household?.addressLine || String(row.street_name || "Não identificado"), neighborhood: household?.neighborhood || String(row.neighborhood_name || "Não identificado"), status: row.is_valid ? "Conferido" : "Pendente", geometry, displayGeometry, x: stats.x, y: stats.y, household }; }));
    setZones((zonesResult.data || []).map((row) => ({ id: row.id, name: row.name, color: row.color, microareaId: row.microarea_id })));
    setImports(importRows.map((row) => ({ id: row.id, file: row.file_name, lots: row.valid_features, features: row.total_features, problematic: row.problematic_features, date: new Date(row.created_at).toLocaleString("pt-BR"), status: row.status, current: row.is_current }))); setFileName(current?.file_name || ""); setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const importDxf = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.name.toLowerCase().endsWith(".dxf")) { await alert("Selecione um arquivo com extensão .dxf.", { title: "Arquivo incompatível", kind: "error" }); return; }
    setSaving(true);
    try {
      const text = await file.text(); const parsed = parseDxf(text);
      if (!/SECTION/i.test(text) || parsed.lots.length === 0) { await alert("O DXF não possui polilinhas com pelo menos três vértices reconhecíveis como lotes.", { title: "DXF sem lotes válidos", kind: "error" }); return; }
      const points = parsed.lots.flatMap((entity) => entity.geometry || []); const bounds = { minX: Math.min(...points.map((point) => point.x)), maxX: Math.max(...points.map((point) => point.x)), minY: Math.min(...points.map((point) => point.y)), maxY: Math.max(...points.map((point) => point.y)) };
      const storagePath = `${user.id}/${Date.now()}-${file.name}`;
      const upload = await supabase.storage.from("census-maps").upload(storagePath, file, { contentType: "application/dxf", upsert: false });
      if (upload.error) throw upload.error;
      const importInsert = await supabase.from("census_map_imports").insert({ file_name: file.name, mime_type: "application/dxf", file_size: file.size, storage_path: storagePath, status: "DRAFT", total_features: parsed.entities.length, valid_features: parsed.lots.length, problematic_features: parsed.entities.length - parsed.lots.length, bbox: bounds, raw_metadata: { source: "IntegratedTerritoryModule", text_entities: parsed.texts.length }, created_by: user.id }).select("id").single();
      if (importInsert.error) throw importInsert.error;
      const importId = importInsert.data.id;
      const entityRows = parsed.entities.map((entity) => ({ import_id: importId, entity_index: entity.index, entity_type: entity.entityType, layer_name: entity.layer, handle: entity.handle, text_content: entity.textContent, insertion_point: entity.insertionPoint, geometry: entity.geometry, raw_pairs: entity.rawPairs, metadata: { source: "dxf_browser_import" } }));
      const entityInsert = await supabase.from("census_map_dxf_entities").insert(entityRows); if (entityInsert.error) throw entityInsert.error;
      const lotRows = parsed.lots.map((entity, index) => { const geometry = entity.geometry || []; const stats = geometryStats(geometry, bounds); const center = { x: geometry.reduce((sum, point) => sum + point.x, 0) / geometry.length, y: geometry.reduce((sum, point) => sum + point.y, 0) / geometry.length }; const guessed = guessText(parsed.texts, center); return { import_id: importId, source_handle: entity.handle || `DXF-${index + 1}`, label: guessed.number || null, layer_name: entity.layer || "Lotes Urbanos", geometry, area: stats.area, is_valid: true, problem_reasons: [], cadastral_label: guessed.number || null, street_name: guessed.street || null, neighborhood_name: guessed.neighborhood || null, block_reference: guessed.block || null }; });
      const lotInsert = await supabase.from("census_map_lots").insert(lotRows); if (lotInsert.error) throw lotInsert.error;
      setDraftImportId(importId); setFileName(file.name); setTab("import"); await loadData(importId); await alert(`${parsed.lots.length} lotes foram gravados como preparação no Supabase. Nenhuma família, pessoa ou ACS foi criada. ${parsed.texts.length} textos foram preservados para conferência.`, { title: "Preparação salva", kind: "success" });
    } catch (error) { await alert(error instanceof Error ? error.message : "Não foi possível gravar a preparação do DXF.", { title: "Falha ao salvar DXF", kind: "error" }); } finally { setSaving(false); event.target.value = ""; }
  };

  const publishDraft = async () => {
    if (!draftImportId) return;
    setSaving(true); const result = await supabase.rpc("census_map_publish_draft", { p_draft_import_id: draftImportId }); setSaving(false);
    if (result.error) { await alert(result.error.message, { title: "Não foi possível publicar o mapa", kind: "error" }); return; }
    setDraftImportId(null); await loadData(); setTab("map"); await alert("O mapa foi publicado no território cadastrado. Famílias, cidadãos e ACS permanecem fora desta etapa.", { title: "Mapa publicado", kind: "success" });
  };

  const markConfirmed = async (lot: Lot) => { const result = await supabase.from("census_map_lots").update({ is_valid: true, problem_reasons: [] }).eq("id", lot.id); if (result.error) { await alert(result.error.message, { title: "Não foi possível atualizar o lote", kind: "error" }); return; } await loadData(); };
  const createArea = async (event: FormEvent) => { event.preventDefault(); await alert("A microárea deve ser criada no módulo de Saúde após a conferência dos lotes. Esta etapa não grava ACS automaticamente.", { title: "Etapa de Saúde", kind: "info" }); setShowAreaForm(false); };
  const rowsForExport = [["id_lote", "quadra", "logradouro", "bairro", "numero", "situacao"], ...lots.map((lot) => [lot.id, lot.block, lot.street, lot.neighborhood, lot.number, lot.status])];
  const visibleRows = tab === "blocks" ? [...new Set(lots.map((lot) => lot.block))].map((block) => ({ ...lots.find((lot) => lot.block === block)!, id: block, label: block, number: `${lots.filter((lot) => lot.block === block).length} lotes` })) : filteredLots;
  return <div className="dashboard-shell integrated-shell"><header className="app-header"><button className="header-back-button" type="button" onClick={onBack}><span className="integrated-back-arrow">←</span> Voltar ao dashboard</button><div className="user-menu"><div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div><div className="user-avatar user-avatar--initials">{(displayName[0] || "U").toUpperCase()}</div><button className="user-menu-button" type="button" aria-label="Sair" onClick={onLogout}><ChevronDown size={17} /></button></div></header><main className="integrated-main"><div className="integrated-breadcrumb"><span>MatrixIA</span><ArrowRight size={13} /><strong>Território Integrado</strong><span className="integrated-mode"><i /> Supabase · Inteligência Municipal</span></div><div className="integrated-heading"><div><p className="eyebrow">Núcleo municipal de dados territoriais</p><h1>Território Integrado</h1><p>Mapa cadastral real, com lotes e referências territoriais importadas do DXF.</p></div><button className="integrated-export" type="button" onClick={() => csvDownload(rowsForExport, "territorio-lotes-enderecos.csv")}><Download size={15} /> Exportar lotes</button></div><section className="integrated-metrics"><div><strong>{loading ? "—" : lots.length}</strong><span>Lotes do mapa</span><small>{pendingLots.length} pendências</small></div><div><strong>{loading ? "—" : new Set(lots.map((lot) => lot.block).filter((value) => value !== "Não identificado")).size}</strong><span>Quadras</span><small>da geometria DXF</small></div><div><strong>{zones.length}</strong><span>Zonas cadastradas</span><small>sem ACS automático</small></div><div><strong>{imports.find((item) => item.current)?.status || "—"}</strong><span>Mapa atual</span><small>{fileName || "Nenhuma importação"}</small></div></section><div className="integrated-layout"><aside className="integrated-sidebar"><div className="integrated-sidebar-label">Módulo municipal</div>{tabGroups.map((group) => <div className="integrated-nav-group" key={group.title}><span>{group.title}</span>{group.items.map(([key, label, Icon]) => <button key={key} className={tab === key ? "active" : ""} type="button" onClick={() => setTab(key)}><Icon size={15} /> {label}{key === "pending" && pendingLots.length > 0 && <b>{pendingLots.length}</b>}</button>)}</div>)}</aside><section className="integrated-content"><div className="integrated-content-head"><div><h2>{tabTitle}</h2><p>{tab === "map" ? "Visualização espacial dos polígonos reais dos lotes publicados." : "Dados reais do Supabase, sem registros demonstrativos."}</p></div>{tab === "import" && <label className="integrated-upload"><FileUp size={15} /> {saving ? "Gravando..." : "Selecionar DXF"}<input type="file" accept=".dxf" disabled={saving} onChange={importDxf} /></label>}</div>{tab === "map" && <><div className="integrated-map-toolbar"><span><MapPinned size={14} /> {selectedLot ? `Lote: ${selectedLot.label || selectedLot.id}` : "Clique em um polígono do mapa"}</span><label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lote, rua ou bairro" /></label><button type="button" onClick={() => setSelectedLots(filteredLots.map((lot) => lot.id))}>Selecionar resultados</button><button type="button" onClick={() => setSelectedLots([])}>Limpar seleção</button><button type="button" onClick={() => setMapZoom((value) => Math.min(1.8, value + .1))}>+</button><strong>{Math.round(mapZoom * 100)}%</strong><button type="button" onClick={() => setMapZoom((value) => Math.max(.7, value - .1))}>−</button><button type="button" onClick={() => setMapZoom(1)}>⟳</button></div><div className="integrated-map" style={{ transform: `scale(${mapZoom})` }}><svg className="integrated-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Mapa cadastral com os lotes do DXF">{filteredLots.map((lot) => { const points = lot.displayGeometry.map((point) => `${point.x},${point.y}`).join(" "); const selected = selectedLots.includes(lot.id); const activate = () => { setSelectedLotId(lot.id); setSelectedLots((current) => current.includes(lot.id) ? current.filter((id) => id !== lot.id) : [...current, lot.id]); }; return <g key={lot.id} className={`integrated-lot-shape ${selected ? "selected" : ""} ${lot.status === "Pendente" ? "pending" : ""}`} onClick={activate} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } }} tabIndex={0} role="button" aria-label={`${lot.street}, ${lot.number}`}><title>{`${lot.street} · ${lot.number} · ${lot.block}`}</title><polygon points={points} /><text x={lot.x} y={lot.y}>{selected ? lot.number : ""}</text></g>; })}</svg>{!filteredLots.length && <div className="integrated-empty"><XCircle size={24} /> Nenhum lote publicado no mapa atual.</div>}<div className="integrated-map-legend"><span><i className="lot-ok" /> Lote cadastral</span><span><i className="lot-selected" /> Selecionado</span><span><i className="lot-pending" /> Pendente territorial</span></div></div>{selectedLot && <aside className="integrated-dossier"><div><span className="integrated-dossier-kicker">Dossiê territorial do lote</span><h3>{selectedLot.street || "Logradouro não identificado"}, {selectedLot.number || "Número não identificado"}</h3><p>{selectedLot.neighborhood || "Bairro não identificado"} · {selectedLot.block || "Quadra não identificada"} · {selectedLot.id}</p></div><div className="integrated-dossier-grid"><span><b>Bairro</b>{selectedLot.neighborhood || "Pendente"}</span><span><b>Quadra</b>{selectedLot.block || "Pendente"}</span><span><b>Número</b>{selectedLot.number || "Pendente"}</span><span><b>Família</b>Não cadastrada nesta etapa</span><span><b>Pessoas</b>Não cadastradas nesta etapa</span></div></aside>}</>}{tab === "import" && <MapPreparationWorkspace />}{tab === "pending" && <div className="integrated-pending-list">{pendingLots.map((lot) => <div className="integrated-pending-row" key={lot.id}><AlertTriangle size={17} /><div><strong>{lot.label || lot.id} · {lot.block}</strong><span>Conferir rua, bairro e número extraídos do DXF.</span></div><button type="button" onClick={() => markConfirmed(lot)}><Check size={14} /> Confirmar</button></div>)}{!pendingLots.length && <div className="integrated-empty"><CheckCircle2 size={24} /> Nenhuma pendência territorial.</div>}</div>}{["families", "people"].includes(tab) && <div className="integrated-empty"><UsersRound size={24} /><strong>Cadastro posterior</strong><span>Famílias e cidadãos não são criados pela importação do DXF.</span></div>}{!["map", "import", "pending", "families", "people"].includes(tab) && <div className="integrated-table-wrap"><table className="integrated-table"><thead><tr><th>Registro</th><th>Logradouro / referência</th><th>Situação</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><strong>{row.label}</strong><small>{row.id}</small></td><td>{row.street || "—"} · {row.number || "—"}</td><td><span className="integrated-status"><i /> {row.status}</span></td></tr>)}</tbody></table></div>}</section></div><footer className="integrated-footer"><span>Dados territoriais reais · Supabase Inteligência Municipal</span><span>Famílias, cidadãos e ACS não são criados pelo DXF</span><button type="button" onClick={async () => { if (await confirm("Deseja recarregar os dados reais do Supabase? Nenhum registro será apagado.", { title: "Recarregar território", kind: "info", confirmLabel: "Recarregar" })) await loadData(); }}><History size={13} /> Recarregar dados</button></footer></main></div>;
}
