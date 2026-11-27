# TODO — Obrigações operacionais da Saúde

- [x] **Catálogo operacional completo** — A aba Catálogo permite criar, editar, inativar e reativar obrigações; o histórico automático do backend exibe snapshots anterior/novo, ator, ação e data; policies separam leitura de inserção/atualização administrativa.
- [x] **Configuração municipal completa** — A aba Configurações Municipais permite aplicável, não aplicável ou pendente de validação; responsável, unidade, adesões, identificadores, justificativa e observações; a migration valida unidade do mesmo município e audita criação, alteração e remoção.
- [x] **Competências mensais, bimestrais e anuais** — A aba Competências permite períodos mensal, bimestral e anual; início, fim, prazo, status, responsáveis, observações e registro de conclusão; triggers rejeitam período/prazo inválidos e completam o ator autenticado da conclusão.
- [x] **Evidências privadas e auditoria** — A aba Evidências e Auditoria permite anexar, abrir via URL assinada, remover comprovantes, consultar eventos e consultar a linha do tempo; o bucket é privado, limitado a 25 MB e protegido por path municipal/papel; criação, alteração e remoção de evidências são auditadas por trigger.
- [ ] **Integração e entrega** — Frontend e backend devem operar com autenticação Supabase e RLS por município/papel; TypeScript, build estático e testes existentes passaram; migrations foram aplicadas; falta apenas commitar, enviar para `main` e aguardar a conclusão bem-sucedida do workflow do GitHub Pages.


## Gestão de Atas — Etapa A: consulta e detalhe

- [ ] **Hall de atas conectado ao Supabase** — Usuário autenticado consegue consultar apenas atas autorizadas pela RLS, com busca textual e filtros por situação, vigência, fornecedor, órgão e processo; a tela informa carregamento, erro e estado vazio sem dados simulados.
- [ ] **Detalhe operacional da ata** — O detalhe exibe cabeçalho, fornecedor, vigência, valor, modalidade, situação, itens e saldos, órgãos consumidores, pedidos relacionados, documentos e histórico; quando não houver `processo_compras_id`, mostra pendência explícita de vínculo com Licitações.
- [ ] **Acesso pelo núcleo Administração e Finanças** — A área compartilhada do MatrixIA abre o módulo de atas e permite retornar ao painel sem quebrar Governança, Saúde, Cultura, Biblioteca ou Território.
- [ ] **Validação da publicação** — `pnpm check`, `pnpm test` e `pnpm build:static` passam; a alteração é commitada em `main` e o workflow do GitHub Pages conclui com sucesso.

## Próximas etapas ainda não liberadas

- [ ] Upload assistido com arquivo original preservado, extração em rascunho, revisão humana, validação e publicação confirmada.
- [ ] Saldos, órgãos, pedidos, reservas, entregas e histórico operacional com mutações exclusivamente por RPCs existentes.

## Gestão de Atas — Etapa A: consulta e detalhe

- [x] **Hall de atas conectado ao Supabase** — Usuário autenticado consulta apenas atas autorizadas pela RLS, com busca textual e filtros por situação, vigência, fornecedor, órgão e processo; a tela informa carregamento, erro e estado vazio sem dados simulados.
- [x] **Detalhe operacional da ata** — O detalhe exibe cabeçalho, fornecedor, vigência, valor, modalidade, situação, itens e saldos, órgãos consumidores, pedidos relacionados e histórico; quando não há `processo_compras_id`, mostra pendência explícita de vínculo com Licitações.
- [x] **Acesso pelo núcleo Administração e Finanças** — A área compartilhada do MatrixIA abre o módulo de atas e permite retornar ao painel.
- [x] **Validação da publicação** — `pnpm check`, `pnpm test` e `pnpm build:static` passaram; a alteração foi commitada em `main` e publicada pelo workflow do GitHub Pages.

## Gestão de Atas — Etapa B: operação transacional

- [x] **Saldos e consumos** — Itens exibem saldo atual; consumos autorizados são consultados e listados por ata; ajuste manual chama `gestao_atas_ajustar_saldo` com justificativa e depende do perfil/RLS.
- [x] **Pedidos e itens** — Criação de rascunho, inclusão inicial de item e visualização de pedidos usam RPCs existentes, sem atualização direta de status pelo cliente.
- [x] **Fluxo de aprovação** — Envio, aprovação, rejeição e cancelamento são expostos conforme o estado do pedido e delegados às RPCs do Supabase.
- [x] **Reservas e entregas** — Reservas são exibidas; entregas parciais/finais são registradas pela RPC `compras_registrar_entrega`; encerramento chama `compras_encerrar_pedido`.
- [x] **Histórico operacional** — Histórico da ata e dados de rastreabilidade dos pedidos permanecem visíveis sem criar dados durante a validação automática.
- [x] **Validação técnica** — `pnpm check`, `pnpm test`, `pnpm build:static` e `git diff --check` aprovados.

## Próxima etapa

- [ ] Upload assistido com arquivo original preservado, extração em rascunho, revisão humana, validação e publicação confirmada.
- [ ] Melhorar edição de múltiplos itens e devolução para ajuste com formulário contextual, mantendo as RPCs existentes.

## Gestão de Atas — Etapa C: upload assistido

- [x] **Arquivo original preservado** — O detalhe da ata permite anexar PDF, Word, Excel, PNG ou JPEG com limite de 25 MB; o arquivo é enviado ao bucket privado `compras-documentos`.
- [x] **Registro transacional do anexo** — O frontend chama `compras_registrar_documento` com entidade `ATA`, caminho segregado por município/ata, nome, MIME e tamanho; falha no registro remove o arquivo enviado.
- [x] **Revisão humana explícita** — Os anexos aparecem como “Revisão pendente” e não alteram automaticamente atas, itens ou saldos.
- [x] **Acesso seguro** — Documentos são abertos por URL assinada temporária; a listagem usa a tabela existente e a RLS do Supabase.
- [ ] **Ingestão estruturada** — Criar ou expor o contrato de rascunho de extração, validação campo a campo, revisão humana e publicação confirmada antes de importar dados do arquivo.

## Gestão de Atas — Etapa D: rascunho e revisão

- [x] **Contrato persistente** — Migration `compras_atas_importacoes` criada no Supabase com município, documento, ata, dados, itens, pendências, status e timestamps; RLS separa leitura municipal e gestão por perfil.
- [x] **RPCs transacionais** — Criação e salvamento de rascunhos usam RPCs `compras_criar_rascunho_ata_importacao` e `compras_salvar_rascunho_ata_importacao`, sem inserção direta pelo cliente.
- [x] **Revisão humana** — O documento anexado pode gerar rascunho, permitir ajuste do número/objeto e registrar pendências restantes.
- [x] **Validação sem publicação** — O usuário só consegue marcar como `VALIDADO` quando não há pendências; a operação não altera a ata nem os itens.
- [x] **Snapshots-base e conflitos** — Novos rascunhos preservam snapshot da ata e dos itens; a análise compara o estado atual e retorna conflitos estruturados antes da publicação.
- [x] **Publicação reconciliada** — A RPC `compras_publicar_ata_importacao` exige status `VALIDADO`, perfil autorizado e confirmação explícita; atualiza somente ata e itens existentes, preserva saldos, marca o rascunho como `PUBLICADO` e não cria nem remove itens.
- [x] **Confirmação no frontend** — A ação Publicar aparece apenas para rascunhos validados, bloqueia snapshot ausente, resume conflitos e solicita confirmação humana antes da transação.
- [ ] **Entrega da Etapa E** — Rodar validações finais, commitar em `main`, enviar ao GitHub e aguardar o workflow do GitHub Pages.

## Gestão de Atas — Etapa F: edição contextual de pedidos

- [x] **Edição de múltiplos itens em rascunho** — O cartão do pedido permite adicionar, remover e editar vários itens e quantidades em um formulário contextual; o salvamento chama `compras_substituir_itens_pedido`.
- [x] **Ajuste de pedido em aprovação** — Pedidos aguardando aprovação ou devolvidos para ajuste exibem editor de quantidades e delegam a alteração à RPC `compras_ajustar_itens_pedido`.
- [x] **Devolução contextual** — O aprovador pode sugerir quantidades por item e informar justificativa mínima de 10 caracteres; a ação chama `compras_devolver_pedido` e deixa status, reservas, notificações e auditoria no backend.
- [x] **Sem mutação direta** — O frontend não atualiza pedidos, itens, reservas ou status diretamente; após sucesso, recarrega o estado retornado pelo Supabase.
- [ ] **Entrega da Etapa F** — Rodar validações finais, commitar em `main`, enviar ao GitHub e aguardar a conclusão bem-sucedida do workflow do GitHub Pages.

## Gestão de Atas — Etapa G: entregas contextualizadas e rastreabilidade

- [x] **Editor de entregas** — Pedidos aprovados exibem formulário inline para vários itens, quantidades positivas, tipo `PARCIAL`/`FINAL`, data não futura, documento e observação.
- [x] **Contrato transacional preservado** — O frontend chama somente `compras_registrar_entrega` com `item_pedido_id` e `quantidade`; excesso, completude final, status e auditoria permanecem sob responsabilidade da RPC.
- [x] **Detalhamento operacional** — Cada pedido exibe entregas registradas, número, data, tipo, itens, quantidades, documento, observação e até seis eventos operacionais recentes.
- [x] **Sem dados reais em validação** — Testes e build são somente estáticos; nenhuma entrega, pedido, consumo, upload ou rascunho é criado automaticamente.
- [ ] **Entrega da Etapa G** — Commitar em `main`, enviar ao GitHub, aguardar o workflow do GitHub Pages e confirmar a publicação.

## Gestão de Atas — Etapa H: conciliação visual de entregas

- [x] **Progresso por pedido** — Cartões exibem quantidades solicitadas, entregues e restantes com barra de progresso derivada das entregas registradas.
- [x] **Editor orientado pelo restante** — Cada item do editor mostra a quantidade ainda pendente e limita a entrada local ao restante calculado, mantendo a RPC como validação definitiva.
- [x] **Encerramento seguro** — O botão Encerrar fica indisponível enquanto houver quantidade pendente, sem substituir a RPC `compras_encerrar_pedido` nem alterar dados diretamente.
- [x] **Sem migration ou dados de teste** — A etapa reutiliza tabelas já carregadas e não cria pedidos, entregas, consumos, uploads ou rascunhos durante validação.
- [ ] **Entrega da Etapa H** — Rodar validações finais, commitar em `main`, enviar ao GitHub e confirmar o workflow do GitHub Pages.

## Gestão de Atas — Etapa I: criação contextual de pedidos

- [x] **Formulário contextual** — Novo pedido abre editor inline com número, órgão solicitante, unidade organizacional e múltiplos itens.
- [x] **Validações antes da RPC** — O formulário rejeita campos obrigatórios ausentes, quantidade inválida e item repetido antes de chamar o Supabase.
- [x] **RPCs existentes preservadas** — Criação e itens usam somente `compras_criar_pedido_rascunho` e `compras_substituir_itens_pedido`; reservas, saldo, autorização e auditoria continuam no backend.
- [x] **Sem prompts para criação** — O fluxo contextual substitui os prompts do cadastro inicial e permite cancelar sem mutação.
- [ ] **Entrega da Etapa I** — Rodar validações finais, commitar em `main`, enviar ao GitHub e confirmar o workflow do GitHub Pages.

## Correção visual e catálogo de Administração e Finanças

- [x] **CSS completo do módulo** — Restaurar os estilos estruturais de Gestão de Atas e preservar os estilos das Etapas F–I para exibição correta no GitHub Pages.
- [x] **Catálogo da Secretaria** — Ao clicar em Administração e Finanças, abrir o catálogo de módulos em vez de abrir diretamente a gestão.
- [x] **Nome e navegação contextual** — Listar “Gestão de Pedidos, Saldos e Entregas” e retornar ao catálogo ao sair do módulo.
- [ ] **Publicação da correção** — Validar, commitar, publicar e confirmar o workflow do GitHub Pages.
