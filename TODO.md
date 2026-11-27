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
