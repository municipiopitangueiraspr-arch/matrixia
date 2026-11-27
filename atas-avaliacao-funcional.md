# Avaliação funcional — Gestão de Atas no MatrixIA

Data: 2026-11-27

## Fontes externas consultadas

- Tela legada: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/gestao-atas.html#cadastro
- JavaScript legado de consulta: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/consulta.js?v=20261016-governanca-2
- JavaScript legado de cadastro: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/cadastro.js
- JavaScript legado de gestão: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/gestao.js
- JavaScript legado de carrinho: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/carrinho.js?v=20261015-no-breadcrumb-1
- JavaScript legado de pedidos: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/pedidos.js?v=20261015-no-breadcrumb-1
- JavaScript legado de aditivos: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/aditivos.js
- CSS legado: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/css/gestao-atas-module.css?v=20261017-sidebar-parity-1

## O que existe na tela legada

A navegação legada apresenta Principal, Visão geral, Consulta, Relatórios, Gestão, Saúde das Atas, Saldos e consumo, Cadastrar Ata, Meu Carrinho, Pedidos e aprovações, Aditivos e FAQ.

A Consulta usa cards de atas. Cada card apresenta situação, alerta de vencimento, quantidade de itens, número da ata, fornecedor e CNPJ, pregão, categoria, vigência, saldo disponível, consumido, barra percentual e valor total. Há estrela de favorito e botão para ver itens.

Favoritos são por usuário e persistidos na tabela `atas_favoritas`, vinculando `usuario_id` e `ata_id`. Na carga, o legado busca as favoritas do usuário. Se houver ao menos uma favorita, a consulta começa filtrada por elas. O usuário pode alternar entre “favoritas” e “todas”; o modo “todas” é mantido ao favoritar uma nova ata. Favoritas vencidas são removidas pelo legado após validação da situação/vigência.

O detalhe da ata mostra fornecedor, CPF/CNPJ, vigência, valor global, consumido, saldo e tabela de itens com quantidade contratada, saldo, valor unitário, valor total e ações. Há busca interna de itens. A tela também possui carrinho, finalização de pedido com local de entrega, pedidos/aprovações, recebimento, timeline, estorno, ocorrências, fracionamento/cronograma, rejeição, devolução para ajuste, resposta à devolução e encerramento.

A tela Cadastrar Ata é um fluxo separado do detalhe. O módulo legado possui lista própria, novo cadastro, edição, visualização de detalhes, inclusão/remoção de itens, cálculo de totais, importação de arquivo JSON, normalização de campos, validação da estrutura, preenchimento do formulário via JSON e salvamento da ata.

O módulo Gestão trabalha saldos e consumo: filtros, auditoria/importação de auditoria JSON, seleção e confirmação de registros válidos, carregamento de itens, indicadores, filtros, exportação, alteração de situação, lançamento de consumo, ajuste de saldo, relatório de divergências, correção de divergências e alertas/itens críticos.

O módulo Aditivos permite selecionar ata, preencher aditivo, carregar resumo da ata original, alternar campos, selecionar itens, salvar, listar, filtrar, visualizar e aplicar aditivo.

Relatórios oferece índice de relatórios favoritos e relatórios analíticos sobre vencimentos, execução por ata, projeção de esgotamento, saldo consolidado, consumo por órgão/categoria/item/solicitante/período, riscos, pedidos por status, aprovações, devoluções, fornecedores, aditivos, histórico, divergências e auditoria, com exportação CSV/PDF.

## O que existe hoje no MatrixIA

O componente `ProcurementMinutesModule` carrega atas, fornecedores, órgãos, itens, pedidos, itens de pedidos, vínculos de órgãos, histórico de atas, unidades, reservas, entregas, eventos, consumos, documentos e importações pelo Supabase.

A interface atual é uma lista lateral com detalhe à direita. Já há consulta de ata, itens e saldos, órgãos consumidores, pedidos, reservas, entregas parciais/finais, progresso de entrega, bloqueio preventivo de encerramento, eventos, consumo, upload do documento original, revisão humana de importação e publicação reconciliada.

A criação de pedido já foi substituída por formulário contextual com múltiplos itens. O cadastro completo de ata, a tela de gestão de atas/saldos, os cards da consulta, favoritos, modo padrão de favoritas, carrinho, relatórios, aditivos, edição ampla da ata, importação assistida para criar ata e ações completas de consumo ainda não foram portados.

## Avaliação e decisão de escopo

O pedido exige uma nova arquitetura de navegação dentro do módulo, não somente converter a lista atual para cards. A solução deve separar quatro áreas: Consulta de Atas, Detalhe da Ata, Gestão de Atas e Saldos/Consumo. Pedidos, carrinho, relatórios e aditivos devem ser módulos internos relacionados, sem misturar operações administrativas com consulta.

A criação de ata deve ser uma tela própria com identidade visual MatrixIA e backend Supabase. Como o requisito é preservar o banco único e evitar inserts/updates diretos pelo frontend, o formulário deve usar RPCs transacionais existentes ou novas RPCs com validação, autorização, auditoria e RLS. Antes de implementar, é necessário confirmar no schema atual os campos, relações e funções de `atas`, `itens_ata`, `fornecedores`, `orgaos`, `atas_orgaos`, consumos, histórico e documentos. A tabela `atas_favoritas` aparece no legado, mas ainda não está representada nas migrations locais observadas; deve ser verificada no projeto Supabase antes de criar qualquer migration.

Nenhum cadastro, favorito, consumo, pedido, upload ou alteração de saldo foi executado durante esta avaliação.
