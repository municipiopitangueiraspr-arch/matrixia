import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDialog } from "@/contexts/DialogContext";

type View = "login" | "forgot" | "reset";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "brand--compact" : ""}`} aria-label="MatrixIA"><div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div><div className="brand-wordmark"><strong>Matrix</strong><em>IA</em><small>inteligência municipal</small></div></div>;
}

function Field({ label, icon: Icon, type = "text", value, onChange, placeholder, autoComplete, disabled, suffix }: any) {
  return <label className="field"><span>{label}</span><div className="field-control"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /><input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} disabled={disabled} required />{suffix}</div></label>;
}

export default function Home() {
  const { alert, confirm } = useDialog();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY") setView("reset"); setUserEmail(session?.user.email ?? null); });
    return () => listener.subscription.unsubscribe();
  }, []);

  const title = useMemo(() => ({ login: "Acesso seguro à plataforma", forgot: "Recupere seu acesso", reset: "Crie uma nova senha" }[view]), [view]);

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) await alert("E-mail ou senha inválidos. Confira seus dados e tente novamente.", { kind: "error", title: "Não foi possível entrar" });
  };

  const submitForgot = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true);
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) await alert("Não foi possível enviar o e-mail agora. Verifique o endereço e tente novamente.", { kind: "error", title: "Falha na recuperação" });
    else await alert("Se este e-mail estiver cadastrado, você receberá as instruções de redefinição em instantes.", { kind: "success", title: "E-mail enviado" });
  };

  const submitReset = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) { await alert("A nova senha deve ter pelo menos 8 caracteres.", { kind: "warning", title: "Senha muito curta" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) await alert("Não foi possível atualizar a senha. Solicite um novo link.", { kind: "error", title: "Falha ao atualizar senha" });
    else { await alert("Senha atualizada. Você já pode acessar a plataforma.", { kind: "success", title: "Senha alterada" }); setView("login"); setPassword(""); setNewPassword(""); }
  };

  const logout = async () => { if (await confirm("Deseja realmente sair da sua conta?", { title: "Confirmar saída", kind: "warning", confirmLabel: "Sair" })) { await supabase.auth.signOut(); setUserEmail(null); } };

  if (userEmail && view === "login") return <main className="app-shell"><div className="dashboard-card"><BrandMark compact /><div className="dashboard-icon"><Sparkles size={24} /></div><p className="eyebrow">Acesso confirmado</p><h1>Olá, novamente.</h1><p className="dashboard-copy">Seu ambiente MatrixIA está pronto para receber os módulos de gestão e indicadores de saúde.</p><div className="coming-soon"><span className="status-dot" /> Módulo ACS em preparação</div><button className="text-button" onClick={logout}>Sair da conta</button></div></main>;

  return <main className="app-shell"><section className="brand-panel"><div className="panel-glow" /><div className="panel-content"><BrandMark /><div className="panel-copy"><p className="eyebrow">Gestão pública orientada por evidências</p><h1>Clareza para decidir.<br /><span>Inteligência para cuidar.</span></h1><p>Uma nova forma de organizar indicadores municipais, conectar informações e transformar dados em melhores decisões.</p></div><div className="panel-footer"><span><ShieldCheck size={16} /> Ambiente protegido</span><span>Saúde · Gestão · Resultados</span></div></div></section><section className="login-panel"><div className="login-wrap"><div className="mobile-brand"><BrandMark compact /></div><div className="login-heading"><p className="eyebrow">MatrixIA / acesso restrito</p><h2>{title}</h2><p>{view === "login" ? "Entre com suas credenciais institucionais para continuar." : view === "forgot" ? "Informe seu e-mail cadastrado e enviaremos um link seguro." : "Defina uma senha nova para proteger seu acesso."}</p></div>
    {view === "login" && <form onSubmit={submitLogin} className="auth-form"><Field label="E-mail institucional" icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="seu.nome@municipio.pr.gov.br" autoComplete="email" disabled={loading} /><Field label="Senha" icon={LockKeyhole} type={showPassword ? "text" : "password"} value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" disabled={loading} suffix={<button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} /><div className="form-meta"><label className="remember"><input type="checkbox" /> <span>Manter conectado</span></label><button type="button" className="link-button" onClick={() => setView("forgot")}>Esqueci minha senha</button></div><button className="primary-button" disabled={loading}>{loading ? "Entrando..." : <>Entrar na plataforma <ArrowRight size={18} /></>}</button></form>}
    {view === "forgot" && <form onSubmit={submitForgot} className="auth-form"><Field label="E-mail cadastrado" icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="seu.nome@municipio.pr.gov.br" autoComplete="email" disabled={loading} /><button className="primary-button" disabled={loading}>{loading ? "Enviando..." : <>Enviar link de recuperação <ArrowRight size={18} /></>}</button><button type="button" className="back-button" onClick={() => setView("login")}>Voltar para o login</button></form>}
    {view === "reset" && <form onSubmit={submitReset} className="auth-form"><Field label="Nova senha" icon={LockKeyhole} type={showPassword ? "text" : "password"} value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" autoComplete="new-password" disabled={loading} suffix={<button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar senha"><Eye size={18} /></button>} /><button className="primary-button" disabled={loading}>{loading ? "Salvando..." : <>Salvar nova senha <ArrowRight size={18} /></>}</button></form>}
    <p className="security-note"><ShieldCheck size={15} /> Seus dados de autenticação são protegidos pelo Supabase.</p><p className="login-legal">Ao entrar, você concorda com as políticas de uso e segurança da plataforma.</p></div></section></main>;
}
