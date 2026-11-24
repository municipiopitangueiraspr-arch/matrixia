import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronDown, Construction, Eye, EyeOff, GraduationCap, HandHeart, HeartPulse, Landmark, LockKeyhole, LogOut, Mail, Map, Palette, School, ShieldCheck, Sparkles, Sprout, Store, TrafficCone, Trophy } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useDialog } from "@/contexts/DialogContext";

type View = "login" | "forgot" | "reset";
type Secretariat = { name: string; description: string; icon: LucideIcon; tone: string };

const secretariats: Secretariat[] = [
  { name: "Administração e Finanças", description: "Gestão administrativa, orçamentária e financeira", icon: Landmark, tone: "blue" },
  { name: "Agricultura e Meio Ambiente", description: "Desenvolvimento rural, sustentabilidade e território", icon: Sprout, tone: "green" },
  { name: "Assistência Social", description: "Proteção social, famílias e cidadania", icon: HandHeart, tone: "rose" },
  { name: "Cultura e Turismo", description: "Patrimônio, eventos, cultura e experiências", icon: Palette, tone: "purple" },
  { name: "Desenvolvimento Econômico", description: "Emprego, inovação e fortalecimento local", icon: Store, tone: "orange" },
  { name: "Educação", description: "Rede municipal, aprendizagem e comunidade escolar", icon: School, tone: "indigo" },
  { name: "Esporte e Lazer", description: "Atividade física, recreação e qualidade de vida", icon: Trophy, tone: "cyan" },
  { name: "Obras e Serviços Públicos", description: "Infraestrutura, manutenção e serviços urbanos", icon: Construction, tone: "amber" },
  { name: "Saúde e Vigilância Sanitária", description: "Atenção à saúde, cuidado e vigilância", icon: HeartPulse, tone: "teal" },
  { name: "Segurança Pública e Trânsito", description: "Prevenção, mobilidade e segurança viária", icon: TrafficCone, tone: "slate" },
  { name: "Planejamento e Urbanismo", description: "Planejamento municipal, obras e cidade", icon: Map, tone: "sky" },
  { name: "Governança", description: "Usuários, acessos, auditoria e integridade", icon: ShieldCheck, tone: "navy" },
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

function Dashboard({ user, onLogout, onOpen }: { user: User; onLogout: () => void; onOpen: (item: Secretariat) => void }) {
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  return <div className="dashboard-shell"><header className="app-header"><a className="header-brand" href="/matirixia/" aria-label="Voltar ao início"><BrandMark compact /></a><div className="user-menu"><div className="user-copy"><strong>{displayName}</strong><span>{user.email}</span></div>{avatarUrl ? <img className="user-avatar" src={avatarUrl} alt={`Foto de ${displayName}`} /> : <div className="user-avatar user-avatar--initials" aria-label={`Avatar de ${displayName}`}>{initials(user)}</div>}<button className="user-menu-button" type="button" aria-label="Opções da conta" onClick={onLogout}><ChevronDown size={17} /></button></div></header><main className="dashboard-main"><div className="dashboard-intro"><div><p className="eyebrow">MatrixIA / áreas de gestão</p><h1>Olá, {displayName.split(" ")[0]}.</h1><p>Selecione uma secretaria para acessar seus módulos e indicadores.</p></div><div className="dashboard-status"><span className="status-dot" /> Ambiente protegido</div></div><section className="secretariat-grid" aria-label="Secretarias municipais">{secretariats.map((item) => <button key={item.name} className={`secretariat-card secretariat-card--${item.tone}`} type="button" onClick={() => onOpen(item)}><div className="card-topline"><div className="secretariat-icon"><item.icon size={29} strokeWidth={1.7} /></div></div><div className="secretariat-card-copy"><h2>{item.name}</h2><p>{item.description}</p></div><span className="card-link">Acessar a área <ArrowRight size={15} /></span></button>)}</section><footer className="dashboard-footer"><span><ShieldCheck size={15} /> Dados protegidos pelo Supabase</span><button type="button" onClick={onLogout}><LogOut size={15} /> Sair da conta</button></footer></main></div>;
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
  const title = useMemo(() => ({ login: "Acesso seguro à plataforma", forgot: "Recupere seu acesso", reset: "Crie uma nova senha" }[view]), [view]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY") setView("reset"); setUser(session?.user ?? null); });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submitLogin = async (event: FormEvent) => { event.preventDefault(); setLoading(true); const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); setLoading(false); if (error) await alert("E-mail ou senha inválidos. Confira seus dados e tente novamente.", { kind: "error", title: "Não foi possível entrar" }); };
  const submitForgot = async (event: FormEvent) => { event.preventDefault(); setLoading(true); const redirectTo = `${window.location.origin}${window.location.pathname}`; const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo }); setLoading(false); if (error) await alert("Não foi possível enviar o e-mail agora. Verifique o endereço e tente novamente.", { kind: "error", title: "Falha na recuperação" }); else await alert("Se este e-mail estiver cadastrado, você receberá as instruções de redefinição em instantes.", { kind: "success", title: "E-mail enviado" }); };
  const submitReset = async (event: FormEvent) => { event.preventDefault(); if (newPassword.length < 8) { await alert("A nova senha deve ter pelo menos 8 caracteres.", { kind: "warning", title: "Senha muito curta" }); return; } setLoading(true); const { error } = await supabase.auth.updateUser({ password: newPassword }); setLoading(false); if (error) await alert("Não foi possível atualizar a senha. Solicite um novo link.", { kind: "error", title: "Falha ao atualizar senha" }); else { await alert("Senha atualizada. Você já pode acessar a plataforma.", { kind: "success", title: "Senha alterada" }); setView("login"); setPassword(""); setNewPassword(""); } };
  const logout = async () => { if (await confirm("Deseja realmente sair da sua conta?", { title: "Confirmar saída", kind: "warning", confirmLabel: "Sair" })) { await supabase.auth.signOut(); setUser(null); } };

  if (user && view === "login") return <Dashboard user={user} onLogout={logout} onOpen={(item) => alert(`O módulo de ${item.name} será disponibilizado nesta área.`, { kind: "info", title: item.name })} />;
  return <main className="app-shell"><section className="brand-panel"><div className="panel-glow" /><div className="panel-content"><BrandMark /><div className="panel-copy"><p className="eyebrow">Gestão pública orientada por evidências</p><h1>Clareza para decidir.<br /><span>Inteligência para cuidar.</span></h1><p>Uma nova forma de organizar indicadores municipais, conectar informações e transformar dados em melhores decisões.</p></div><div className="panel-footer"><span><ShieldCheck size={16} /> Ambiente protegido</span><span>Saúde · Gestão · Resultados</span></div></div></section><section className="login-panel"><div className="login-wrap"><div className="mobile-brand"><BrandMark compact /></div><div className="login-heading"><p className="eyebrow">MatrixIA / acesso restrito</p><h2>{title}</h2><p>{view === "login" ? "Entre com suas credenciais institucionais para continuar." : view === "forgot" ? "Informe seu e-mail cadastrado e enviaremos um link seguro." : "Defina uma senha nova para proteger seu acesso."}</p></div>{view === "login" && <form onSubmit={submitLogin} className="auth-form"><Field label="E-mail institucional" icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="seu.nome@municipio.pr.gov.br" autoComplete="email" disabled={loading} /><Field label="Senha" icon={LockKeyhole} type={showPassword ? "text" : "password"} value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" disabled={loading} suffix={<button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} /><div className="form-meta"><label className="remember"><input type="checkbox" /> <span>Manter conectado</span></label><button type="button" className="link-button" onClick={() => setView("forgot")}>Esqueci minha senha</button></div><button className="primary-button" disabled={loading}>{loading ? "Entrando..." : <>Entrar na plataforma <ArrowRight size={18} /></>}</button></form>}{view === "forgot" && <div className="recovery-screen"><div className="recovery-intro"><div className="recovery-icon"><Mail size={23} /></div><p>Digite o e-mail associado à sua conta. Enviaremos um link seguro para criar uma nova senha.</p></div><form onSubmit={submitForgot} className="auth-form"><Field label="E-mail cadastrado" icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="seu.nome@municipio.pr.gov.br" autoComplete="email" disabled={loading} /><button className="primary-button" disabled={loading}>{loading ? "Enviando..." : <>Enviar link de recuperação <ArrowRight size={18} /></>}</button><button type="button" className="back-button" onClick={() => setView("login")}>Voltar para o login</button></form><div className="recovery-steps"><span>1</span><p>Confira sua caixa de entrada e a pasta de spam.</p><span>2</span><p>Abra o link e defina uma nova senha.</p></div></div>}{view === "reset" && <form onSubmit={submitReset} className="auth-form"><Field label="Nova senha" icon={LockKeyhole} type={showPassword ? "text" : "password"} value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" autoComplete="new-password" disabled={loading} suffix={<button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar senha"><Eye size={18} /></button>} /><button className="primary-button" disabled={loading}>{loading ? "Salvando..." : <>Salvar nova senha <ArrowRight size={18} /></>}</button></form>}<p className="security-note"><ShieldCheck size={15} /> Seus dados de autenticação são protegidos pelo Supabase.</p><p className="login-legal">Ao entrar, você concorda com as políticas de uso e segurança da plataforma.</p></div></section></main>;
}
