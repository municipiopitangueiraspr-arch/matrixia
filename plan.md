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


## Etapa A — Gestão de Atas no MatrixIA

A primeira entrega de Gestão de Atas será somente de consulta e detalhe operacional, sem migrations e sem mutações no banco. O frontend React usará o Supabase autenticado para consultar `atas`, `itens_ata`, `fornecedores`, `orgaos`, `atas_orgaos_consumidores`, `pedidos`, `itens_pedido`, `consumos`, `pedidos_reservas`, `pedidos_entregas`, `pedidos_entregas_itens`, `pedidos_eventos`, `atas_historico` e `auditoria_eventos`, sempre com filtros client-side sobre os registros já protegidos pela RLS.

A interface seguirá a linguagem visual existente do MatrixIA: cabeçalho operacional, cartões de métricas, filtros, tabela principal e painel de detalhe contextual. O módulo será acessível pelo núcleo compartilhado Administração e Finanças e exibirá a pendência de vínculo com Licitações quando `processo_compras_id` não estiver preenchido. Upload, cadastro, alteração de saldo e pedidos transacionais ficam para as etapas seguintes; a Etapa A não cria registros nem arquivos.

Arquivos principais da Etapa A: `client/src/components/ProcurementMinutesModule.tsx`, `client/src/components/ProcurementMinutesModule.css`, `client/src/lib/atas.ts`, `client/src/pages/Home.tsx` e, se necessário, `client/src/App.tsx`/`public/manus-routes.json`. A entrega deve passar em `pnpm check`, `pnpm test` e `pnpm build:static`, ser commitada em `main` e publicada pelo workflow do GitHub Pages.

## Etapa A — Gestão de Atas no MatrixIA

A primeira entrega de Gestão de Atas foi somente de consulta e detalhe operacional, sem migrations e sem mutações no banco. O frontend React usa o Supabase autenticado para consultar `atas`, `itens_ata`, `fornecedores`, `orgaos`, `atas_orgaos_consumidores`, `pedidos`, `itens_pedido`, `consumos`, `pedidos_reservas`, `pedidos_entregas`, `pedidos_entregas_itens`, `pedidos_eventos`, `atas_historico` e `auditoria_eventos`, sempre com filtros client-side sobre os registros protegidos pela RLS.

A interface segue a linguagem visual existente do MatrixIA: cabeçalho operacional, cartões de métricas, filtros, lista principal e painel de detalhe contextual. O módulo é acessível pelo núcleo compartilhado Administração e Finanças e exibe a pendência de vínculo com Licitações quando `processo_compras_id` não está preenchido. A Etapa A foi validada e publicada no GitHub Pages.

## Etapa B — Operação de saldos e pedidos

A Etapa B foi implementada no mesmo workspace de Gestão de Atas, sem migration e sem banco paralelo. O cliente carrega unidades organizacionais, pedidos, itens, reservas, entregas, eventos e consumos com `select` explícito, limites e a RLS do Supabase como fonte de autorização. As mutações usam exclusivamente as RPCs existentes: criação de rascunho, substituição de itens, envio, aprovação, rejeição, cancelamento, entrega, encerramento e ajuste administrativo de saldo.

A interface permite criar um pedido em rascunho a partir da ata selecionada, incluir o primeiro item com quantidade, enviar para aprovação e executar as ações compatíveis com o status. Também exibe reservas, entregas, consumos e trilhas de histórico. A validação automática não cria pedidos ou consumos reais; as ações só ocorrem quando um usuário autorizado as aciona na tela. Upload assistido, revisão humana e cadastro/importação continuam como próxima etapa.

## Etapa C — Upload assistido e preservação do original

A Etapa C adiciona o primeiro passo do fluxo de importação assistida: o usuário autorizado pode anexar o arquivo original da ata diretamente no detalhe do registro. O arquivo é validado no cliente (tipo e limite de 25 MB), enviado ao bucket privado `compras-documentos` em um caminho segregado por município e ata e registrado pela RPC `compras_registrar_documento`. Se o registro falhar, o arquivo é removido do Storage como rollback.

Os documentos ficam listados como “Revisão pendente” e são abertos somente por URL assinada temporária. Esta etapa não extrai nem publica dados automaticamente, pois o schema atual não possui uma entidade de rascunho de ingestão/revisão para atas; a próxima evolução deverá criar esse contrato de revisão ou expor uma RPC existente antes de automatizar a leitura do arquivo.

## Etapa D — Rascunho persistente e revisão humana

A Etapa D cria no Supabase a tabela `compras_atas_importacoes`, segregada por município e protegida por RLS, com JSON de dados, itens, pendências e status de revisão. As RPCs `compras_criar_rascunho_ata_importacao` e `compras_salvar_rascunho_ata_importacao` controlam a criação e o avanço para `EM_REVISAO` ou `VALIDADO` sem permitir que o cliente publique alterações diretamente.

No frontend, um documento original pode gerar um rascunho pré-preenchido com o cadastro atual da ata; o usuário revisa número e objeto, registra pendências e valida somente quando não houver pendências. A validação não altera a ata nem seus itens. A publicação dos dados revisados fica deliberadamente separada para uma etapa posterior, com regras de reconciliação e confirmação próprias.
