# Escopo obrigatório — Gestão de Atas, Saldos e Pedidos

Este arquivo é um controle interno de implementação. Nenhuma etapa abaixo pode ser declarada concluída apenas por existir no código; cada item precisa funcionar com dados do Supabase, autenticação, RLS/RPC e publicação validada.

## Navegação do módulo
- [ ] Catálogo de Administração e Finanças com um único módulo Gestão de Saldos, Pedidos e Entregas, contendo internamente Consulta, Cadastro, Saúde, Saldos/Consumo, Carrinho, Pedidos/Aprovações, Entregas, Relatórios, Aditivos e FAQ.
- [ ] Retorno entre catálogo, cada tela e detalhe sem abrir o módulo errado.

## Consulta e detalhe
- [x] Cards, favoritos por usuário, favoritas padrão, alternância favoritas/todas, busca, filtros e alertas de vencimento.
- [x] Página dedicada completa com itens/saldos, consumo, consumidores, pedidos, documentos e histórico.
- [x] Consulta sem painel lateral legado.

## Cadastrar Ata
- [ ] Listagem própria, novo cadastro e edição.
- [ ] Dados da ata, fornecedor, órgão, processo, modalidade, vigência, situação e observações.
- [ ] Itens com inclusão/remoção, quantidades, valores e cálculo de totais/saldos.
- [ ] Importação de arquivo com documento original preservado, normalização, validação, revisão humana e publicação confirmada.
- [ ] Persistência autorizada no Supabase e histórico/auditoria.

## Saúde das Atas
- [ ] Indicadores de vigência, atas vencidas/próximas, saldos críticos, consumo e divergências.
- [ ] Filtros, drill-down para ata/item, alertas e auditoria.
- [ ] Importação/revisão de auditoria sem mutação automática.
- [ ] Correções somente por RPC/autorização.

## Meu Carrinho
- [ ] Itens de várias atas, quantidade, saldo disponível, órgão/unidade e local de entrega.
- [ ] Revisão, alteração, remoção, cálculo e finalização em pedido.
- [ ] Reservas e validações transacionais no Supabase.

## Pedidos e Aprovações
- [ ] Lista de pedidos próprios e pendentes de aprovação.
- [ ] Filtros por status, órgão, período e ata.
- [ ] Itens, reservas, envio, aprovação, rejeição, devolução, ajustes, entrega, estorno e encerramento.
- [ ] Timeline, justificativas e auditoria.

## Relatórios
- [ ] Índice e favoritos de relatórios.
- [ ] Vencimentos, execução, projeção de esgotamento, saldo consolidado, consumo por órgão/categoria/item/solicitante/período.
- [ ] Riscos, pedidos por status, aprovações, devoluções, fornecedores, aditivos, histórico, divergências e auditoria.
- [ ] Exportação CSV/PDF e filtros persistentes.

## Gestão complementar
- [ ] Aditivos: seleção, formulário, itens, resumo, salvar, listar, filtrar, visualizar e aplicar.
- [ ] FAQ/manual operacional.

## Entrega
- [ ] `pnpm check`.
- [ ] `pnpm build` e `pnpm build:static`.
- [ ] `pnpm test -- --runInBand`.
- [ ] Validação publicada de cada tela e fluxo.
- [ ] Commit e workflow Pages aprovados somente quando todos os itens acima estiverem concluídos.
