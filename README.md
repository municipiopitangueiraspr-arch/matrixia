# MatrixIA

Tela de acesso da plataforma MatrixIA, construída em React + TypeScript e publicada como SPA estática no GitHub Pages. A autenticação e a recuperação de senha usam o Supabase Auth do projeto Inteligência Municipal (`qgkjnzcqjhhqdgxmvtew`).

## O que foi entregue

- Identidade visual azul institucional, marca MatrixIA e tela responsiva.
- Login por e-mail e senha com sessão persistida pelo Supabase.
- Fluxo “Esqueci minha senha”: o Supabase envia o link para o e-mail cadastrado.
- Tela de redefinição de senha acionada pelo link enviado por e-mail.
- Área autenticada inicial, pronta para receber o módulo ACS.
- Workflow `.github/workflows/deploy-pages.yml` para build e deploy automático no GitHub Pages.
- Configuração `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` sem segredos no código-fonte.

## Configuração única no GitHub

Em **Settings → Secrets and variables → Actions → Variables**, crie:

- `VITE_SUPABASE_URL` = `https://qgkjnzcqjhhqdgxmvtew.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = chave publicável do projeto MatrixIA

Em **Settings → Pages**, selecione **GitHub Actions** como fonte de publicação. O workflow publica a aplicação em:

`https://municipiopitangueiraspr-arch.github.io/matirixia/`

## Configuração única no Supabase

Em **Authentication → URL Configuration**, defina:

- Site URL: `https://municipiopitangueiraspr-arch.github.io/matirixia/`
- Redirect URL adicional: `https://municipiopitangueiraspr-arch.github.io/matirixia/`

O projeto começa sem usuários cadastrados; o administrador deve criar/invitar os usuários pelo painel do Supabase em **Authentication → Users**.

## Contexto documental considerado

A leitura dos arquivos de apoio indicou que a plataforma deve manter segregação por domínio, rastreabilidade e acesso restrito para registros de saúde. Para o próximo módulo, o foco ACS deve respeitar o fluxo municipal de Atenção Primária, com referências a Siaps/e-SUS APS, cadastro individual e domiciliar/territorial, vínculo e acompanhamento, equipe/profissional e unidade. Os documentos também alertam que a existência de um sistema federal não comprova adesão local; por isso, o módulo ACS deve nascer com permissões, responsáveis, unidade/equipe ativas e regras municipais confirmadas, sem replicar prontuários ou dados sensíveis além da finalidade aprovada.

## Desenvolvimento local

```bash
cp .env.example .env
# preencha as duas variáveis VITE_SUPABASE_*
pnpm install
pnpm dev:static
```

A checagem TypeScript é feita com `pnpm check` e o build de produção com `pnpm build:static`.


## Mensagens e confirmações

O projeto possui um `DialogProvider` global. Use `useDialog()` em qualquer tela ou módulo para exibir `alert(...)` confirmável ou `confirm(...)` com Cancelar/Confirmar. Erros, alertas, sucessos e informações não devem ser exibidos por `window.alert`, banners inline ou mensagens silenciosas.


## Recuperação de senha

A tela **Esqueci minha senha** usa `supabase.auth.resetPasswordForEmail()` com retorno para a aplicação. O link recebido abre a tela de nova senha, que usa `supabase.auth.updateUser({ password })`. O endereço do GitHub Pages precisa estar cadastrado em **Authentication → URL Configuration → Redirect URLs** no projeto Supabase Inteligência Municipal.
