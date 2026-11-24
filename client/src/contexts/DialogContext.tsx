import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";

type DialogKind = "error" | "warning" | "success" | "info";
type DialogState = { open: boolean; kind: DialogKind; title: string; message: string; confirmLabel: string; cancelLabel?: string; resolve?: (value: boolean) => void };

type DialogApi = { alert: (message: string, options?: { title?: string; kind?: DialogKind; confirmLabel?: string }) => Promise<void>; confirm: (message: string, options?: { title?: string; kind?: DialogKind; confirmLabel?: string; cancelLabel?: string }) => Promise<boolean> };

const DialogContext = createContext<DialogApi | null>(null);
const defaultState: DialogState = { open: false, kind: "info", title: "Atenção", message: "", confirmLabel: "Entendi" };

const meta: Record<DialogKind, { icon: typeof Info; label: string }> = { error: { icon: ShieldAlert, label: "Não foi possível concluir" }, warning: { icon: AlertTriangle, label: "Atenção" }, success: { icon: CheckCircle2, label: "Tudo certo" }, info: { icon: Info, label: "Informação" } };

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(defaultState);

  const close = useCallback((answer: boolean) => {
    const resolve = dialog.resolve;
    setDialog(defaultState);
    resolve?.(answer);
  }, [dialog.resolve]);

  const alert = useCallback((message: string, options: { title?: string; kind?: DialogKind; confirmLabel?: string } = {}) => new Promise<void>((resolve) => {
    setDialog({ open: true, kind: options.kind ?? "info", title: options.title ?? meta[options.kind ?? "info"].label, message, confirmLabel: options.confirmLabel ?? "Entendi", resolve: () => resolve() });
  }), []);

  const confirm = useCallback((message: string, options: { title?: string; kind?: DialogKind; confirmLabel?: string; cancelLabel?: string } = {}) => new Promise<boolean>((resolve) => {
    setDialog({ open: true, kind: options.kind ?? "warning", title: options.title ?? "Confirme esta ação", message, confirmLabel: options.confirmLabel ?? "Confirmar", cancelLabel: options.cancelLabel ?? "Cancelar", resolve });
  }), []);

  const api = useMemo(() => ({ alert, confirm }), [alert, confirm]);
  const Icon = meta[dialog.kind].icon;

  return <DialogContext.Provider value={api}>{children}<div className={`global-dialog-backdrop ${dialog.open ? "is-open" : ""}`} aria-hidden={!dialog.open} onMouseDown={(event) => { if (event.target === event.currentTarget && dialog.cancelLabel) close(false); }}><section className={`global-dialog global-dialog--${dialog.kind}`} role="dialog" aria-modal="true" aria-labelledby="global-dialog-title" aria-describedby="global-dialog-message"><button className="global-dialog-close" onClick={() => close(Boolean(dialog.cancelLabel))} aria-label="Fechar" type="button"><X size={18} /></button><div className="global-dialog-icon"><Icon size={23} /></div><h2 id="global-dialog-title">{dialog.title}</h2><p id="global-dialog-message">{dialog.message}</p><div className="global-dialog-actions">{dialog.cancelLabel && <button type="button" className="dialog-secondary" onClick={() => close(false)}>{dialog.cancelLabel}</button>}<button type="button" className="dialog-primary" onClick={() => close(true)}>{dialog.confirmLabel}</button></div></section></div></DialogContext.Provider>;
}

export function useDialog() { const value = useContext(DialogContext); if (!value) throw new Error("useDialog deve ser usado dentro de DialogProvider"); return value; }
