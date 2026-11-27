# Contratos confirmados — módulo completo de atas

Projeto Supabase ativo: `qgkjnzcqjhhqdgxmvtew` (Inteligência Municipal), status ACTIVE_HEALTHY.

## Fontes legadas preservadas
- Tela: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/gestao-atas.html#cadastro
- Consulta: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/consulta.js?v=20261016-governanca-2
- Cadastro: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/cadastro.js
- Gestão: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/gestao.js
- Carrinho: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/carrinho.js?v=20261015-no-breadcrumb-1
- Pedidos: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/pedidos.js?v=20261015-no-breadcrumb-1
- Aditivos: https://municipiopitangueiraspr-arch.github.io/intranetpref/controle-de-saldos/js/modules/aditivos.js

## Tabelas-base confirmadas
`atas`, `itens_ata`, `fornecedores`, `orgaos`, `unidades_organizacionais`, `atas_orgaos_consumidores`, `atas_historico`, `consumos`, `pedidos`, `itens_pedido`, `pedidos_reservas`, `pedidos_entregas`, `pedidos_entregas_itens`, `pedidos_eventos`, `compras_documentos_modulo`.

Campos críticos confirmados: `atas.municipio_id` é obrigatório; `atas.numero_ata` é obrigatório; itens exigem ata, número, descrição, unidade, quantidade contratada, valor unitário, valor total, saldo de quantidade, saldo de valor e município; pedidos exigem município, usuário, ata, órgão, fornecedor, data, unidade e unidade organizacional; consumos exigem órgão, unidade, unidade organizacional e município.

## RPCs públicas confirmadas
- Pedido/carrinho: `compras_criar_pedido_rascunho`, `compras_substituir_itens_pedido`.
- Aprovação: `compras_enviar_pedido_aprovacao`, `compras_aprovar_pedido`, `compras_rejeitar_pedido`, `compras_devolver_pedido`, `compras_responder_devolucao`, `compras_cancelar_pedido`.
- Operação: `compras_registrar_entrega`, `compras_encerrar_pedido`, `compras_registrar_ocorrencia`, `compras_solicitar_estorno`, `compras_aprovar_estorno`.
- Ata/importação: `compras_gerar_ata`, `compras_criar_rascunho_ata_importacao`, `compras_salvar_rascunho_ata_importacao`, `compras_analisar_publicacao_ata_importacao`, `compras_publicar_ata_importacao`, `compras_registrar_documento`.
- Saldos: `gestao_atas_ajustar_saldo`, `gestao_atas_reconciliacao`.
- Apoio: `compras_listar_notificacoes`, `compras_marcar_notificacao_lida`, `compras_obter_configuracao_municipio`.

Nenhuma mutação real foi executada durante a auditoria. A implementação deve chamar essas RPCs com autenticação/RLS e não criar backend paralelo.
