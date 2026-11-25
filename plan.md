# Evolução operacional do módulo de Obrigações da Saúde

## Abordagem

A evolução preserva o React/Vite existente e transforma `HealthObligationsModule` em um workspace operacional com quatro abas: Catálogo, Configurações Municipais, Competências e Evidências e Auditoria. O frontend continua usando o cliente Supabase autenticado e a RLS existente; não serão pré-criados calendários, adesões, responsáveis ou prazos.

O backend será complementado por uma migration Supabase idempotente. Ela adicionará campos estruturados para adesões e identificadores, histórico versionado do catálogo, auditoria transversal, periodicidade das competências, validações de status/conclusão, triggers de atualização de `updated_at` e eventos de instância, além do bucket privado `saude-obrigacoes` e policies de Storage por município e papel. O catálogo continuará global; configurações, competências, evidências e auditoria operacional continuarão segregadas por `municipio_id`.

As operações do frontend serão mutações explícitas com confirmação: criar/editar/inativar/reativar catálogo, upsert de configuração, criar/editar competências, alterar status/conclusão, upload e remoção de evidências, consulta de histórico. Após cada mutação, os dados serão recarregados e erros serão mostrados sem apagar o estado útil da tela.

## Estrutura do projeto

- `client/src/components/HealthObligationsModule.tsx`: workspace, abas, formulários, filtros, mutações, upload e histórico.
- `client/src/index.css`: estilos do workspace, abas, formulários, tabelas, estados vazios e responsividade, reutilizando a linguagem visual atual.
- `client/src/lib/supabase.ts`: cliente autenticado existente; nenhuma credencial nova será embutida.
- `supabase/migrations/`: cópia versionada da migration complementar aplicada ao projeto Supabase.
- `plan.md` e `TODO.md`: decisões e critérios de entrega desta evolução.

## Design

### Estilos considerados

- **Console administrativo editorial** (0,06): densidade controlada, bordas suaves, tipografia de trabalho e foco em rastreabilidade.
- **Painel clínico calmo** (0,07): verde-azulado, estados semânticos discretos e leitura por prioridade.
- **Mesa de controle cívica** (0,04): blocos compactos, contrastes institucionais e ações claramente confirmáveis.

Escolha: **Console administrativo editorial**.

### Direção escolhida

- **Design Movement:** software administrativo editorial, com leitura em camadas e ações laterais em vez de um dashboard genérico de cartões.
- **Core Principles:** evidência antes de inferência; edição contextual; estado sempre visível; histórico como parte da tarefa.
- **Color Philosophy:** base azul-petróleo e marfim para transmitir controle e continuidade; âmbar e vermelho aparecem apenas para pendências e riscos reais.
- **Layout Paradigm:** cabeçalho operacional, navegação por abas e listas/tabelas com painel de edição contextual; evitar centralização excessiva e manter o fluxo de atendimento no eixo principal.
- **Signature Elements:** etiquetas de estado com ícones; faixa de contexto municipal; trilha de auditoria com linha temporal compacta.
- **Interaction Philosophy:** nenhuma mutação destrutiva ocorre sem confirmação; salvamento informa sucesso/erro e recarrega a fonte de verdade.
- **Animation:** transições curtas apenas em abertura de formulário, expansão de detalhes e carregamento; sem movimento decorativo.
- **Typography System:** manter a tipografia já usada no projeto; títulos com contraste forte, rótulos curtos em caixa alta e corpo com line-height confortável.
- **Brand Essence:** uma mesa confiável para transformar obrigações documentais em atendimento municipal rastreável. Personalidade: cuidadosa, objetiva, auditável.
- **Brand Voice:** “Registre o que foi validado; não antecipe o que ainda depende do município.” / “Cada alteração deixa uma trilha consultável.”
- **Wordmark & Logo:** preservar a marca MatrixIA existente; não criar identidade paralela para o módulo.
- **Signature Brand Color:** azul-petróleo já presente no painel atual, aplicado nos controles ativos e no cabeçalho das abas.

## Backend e frontend

A migration complementar será aplicada antes das mutações do frontend. O frontend não assumirá um município fixo: as linhas devolvidas pela RLS são a fonte de contexto; unidades e usuários serão consultados pelo contexto municipal do Supabase. Evidências usam paths `municipio_id/instancia_id/arquivo` e URLs assinadas, sem bucket público.
