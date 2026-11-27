# Plano específico — Gestão de Atas, Saldos e Pedidos no MatrixIA

**Data:** 27/11/2026  
**Status:** avaliação técnica concluída; implementação ainda não iniciada.

## 1. Decisão de produto

A Gestão de Atas pode ser liberada antes de Licitações, desde que seja apresentada como um módulo operacional de **atas, itens, saldos e pedidos**, com a origem dos dados e as pendências de processo visíveis. A existência de uma ata importada não deve ser interpretada como prova de que todo o processo licitatório está cadastrado ou validado.

A primeira liberação não deve copiar as páginas HTML do repositório `gestao-atas`. O frontend será reescrito como React/TypeScript dentro do MatrixIA, preservando somente regras de negócio e o contrato de dados que já estão coerentes com o Supabase. O banco ativo continuará sendo exclusivamente o projeto `qgkjnzcqjhhqdgxmvtew`.

## 2. Evidências do backend existente

A consulta somente leitura do projeto Supabase confirmou que o núcleo necessário já está persistido:

| Área | Estruturas observadas | Situação para o frontend |
|---|---|---|
| Ata | `atas` | 159 registros; possui município, fornecedor, vigência, modalidade, responsáveis, processo opcional e situação |
| Itens | `itens_ata` | 928 registros; possui quantidade, valores, unidade, saldo e situação |
| Fornecedores | `fornecedores`, `representantes` | 137 fornecedores; escopo municipal e RLS existentes |
| Órgãos consumidores | `orgaos`, `atas_orgaos_consumidores` | estrutura pronta para relação ata–órgãos |
| Pedidos | `pedidos`, `itens_pedido` | 2 registros; pedidos possuem rascunho, unidade e escopo organizacional |
| Reservas | `pedidos_reservas` | reserva por item de pedido; leitura protegida por pedido |
| Consumo | `consumos` | consumo por ata/item/órgão/unidade |
| Entregas | `pedidos_entregas`, `pedidos_entregas_itens`, `entregas_fracionadas` | estrutura para entregas parciais/finais |
| Histórico | `atas_historico`, `pedidos_eventos`, `auditoria_eventos` | trilha de alterações e eventos |
| Documentos | `compras_documentos`, `compras_documento_versoes`, `compras_documentos_modulo` | estruturas existentes; bucket privado `compras-documentos` disponível |

RPCs já disponíveis e que devem ser usados em vez de reproduzir regra no cliente incluem `compras_criar_pedido_rascunho`, `compras_enviar_pedido_aprovacao`, `compras_aprovar_pedido`, `compras_rejeitar_pedido`, `compras_cancelar_pedido`, `compras_registrar_entrega`, `compras_encerrar_pedido`, `compras_devolver_pedido`, `compras_ajustar_itens_pedido`, `compras_substituir_itens_pedido`, `registrar_consumo_unidade`, `gestao_atas_ajustar_saldo` e `gestao_atas_reconciliacao`.

As políticas atuais exigem sessão autenticada, acesso municipal e ações granulares do módulo `atas`; pedidos dependem ainda de unidade organizacional e de estado permitido. Portanto, o componente deve tratar erros de autorização como estados normais da interface e nunca assumir que possuir uma sessão equivale a poder editar qualquer ata.

## 3. Escopo da primeira liberação

### 3.1 Hall e consulta operacional

Criar um módulo `Atas, saldos e pedidos` acessível a partir da área compartilhada de Administração e Finanças. O hall deve mostrar somente dados retornados pelo Supabase, com filtros por situação, vigência, fornecedor, órgão, processo e busca textual. Cada ata deve exibir origem, estado de validação, vigência, valor global, fornecedor e quantidade de itens.

A tela de detalhe deve separar claramente: cabeçalho da ata; itens e saldos; órgãos consumidores; pedidos relacionados; documentos/evidências; histórico. A relação com Licitações/Compras deve aparecer como vínculo opcional ou pendência, nunca como registro criado automaticamente.

### 3.2 Importação assistida por upload

O upload deve aceitar pelo menos CSV/XLS/XLSX e PDF quando houver extrator disponível. O arquivo original será enviado ao bucket privado `compras-documentos`, com metadados de nome, MIME, tamanho, hash quando possível, usuário e data. O fluxo será:

1. selecionar o arquivo e validar tamanho/formato no navegador;
2. preservar o original;
3. extrair ou ler uma prévia para um lote de importação em estado de rascunho;
4. mostrar o mapeamento dos campos, linhas incompletas, duplicidades e cálculos derivados;
5. permitir revisão humana por ata, fornecedor e item;
6. publicar somente os registros confirmados, usando as tabelas existentes;
7. registrar a origem do lote e a confirmação na auditoria.

O script legado `controle-de-saldos/extracao-de-dados/extrai-dados-ata.py` e suas regras podem servir como referência de normalização, especialmente para fornecedor, número de contratação, datas, quantidades e valores. Ele não deve ser executado diretamente no browser nem ser tratado como fonte normativa: as regras fixas de vigência e filtro de saldo do arquivo legado precisam ser parametrizadas ou removidas da primeira versão, porque podem estar desatualizadas para o município.

Na primeira implementação, se a infraestrutura de importação ainda não existir no schema, o produto deve oferecer pelo menos uma prévia local e um cadastro manual seguro; não criar tabelas de staging sem uma migration revisada. Para importação persistente, será necessário adicionar uma migration pequena e específica de lotes/linhas de importação, com RLS, status, erro, revisão e vínculo ao documento original. Essa migration só deve ser aplicada após a revisão do contrato e dos testes.

### 3.3 Saldos e órgãos

Exibir saldo contratado, saldo consumido, saldo reservado e saldo utilizável, distinguindo valores calculados no banco de valores importados que ainda aguardam conferência. Alterações manuais de saldo devem chamar `gestao_atas_ajustar_saldo`, exigir justificativa e ficar na trilha de auditoria.

A relação entre ata e órgão consumidor deve ser apresentada e, quando permitida pela policy, cadastrada sem duplicar órgãos mestres. O frontend deve respeitar unidades organizacionais e perfil do usuário.

### 3.4 Pedidos e consumo

O fluxo mínimo será: criar rascunho, inserir/editar itens permitidos, enviar para aprovação, aprovar/reprovar/devolver, reservar saldo, registrar entrega parcial/final, consumir, cancelar ou encerrar. O cliente deve chamar RPCs transacionais para aprovação, rejeição, cancelamento, entrega e encerramento; não deve atualizar status diretamente para contornar validações.

A tela deve mostrar a reserva correspondente, o saldo disponível e os motivos de falha, inclusive saldo insuficiente, unidade sem acesso, pedido fora do estado permitido e tentativa de entrega acima do solicitado.

## 4. O que será reaproveitado e o que será reescrito

| Reaproveitar do legado | Reescrever no MatrixIA |
|---|---|
| Vocabulário de ata, item, fornecedor, saldo, reserva, pedido e entrega | Layout, navegação, componentes, formulários e estados de carregamento |
| Regras de normalização CSV e leitura de números | Integração Supabase tipada e tratamento de permissões |
| Sequência operacional do carrinho/pedido | Cadastro assistido, revisão, publicação e mensagens de pendência |
| Conceitos de entregas, estornos e eventos | Upload privado, evidências, histórico e UX responsiva |
| Exemplos de relatório e filtros | Qualquer acesso direto ao banco que duplique RPCs |

Não serão copiadas migrations do legado: o histórico do Supabase mostra que as migrations de atas, pedidos, reservas, entregas, RBAC e escopo organizacional já foram aplicadas, inclusive em versões posteriores às migrations originais do repositório.

## 5. Arquivos previstos no MatrixIA

- `client/src/components/ProcurementMinutesModule.tsx`: workspace principal de atas, saldos e pedidos.
- `client/src/components/ProcurementMinutesModule.css` ou estilos equivalentes em `client/src/index.css`.
- `client/src/lib/atas.ts`: consultas, tipos, chamadas RPC e helpers de origem/estado.
- `client/src/pages/Home.tsx`: card e navegação de Administração e Finanças.
- `client/src/App.tsx`: rota compatível com GitHub Pages, se o módulo for exposto como rota dedicada.
- `supabase/migrations/<timestamp>_atas_importacao_assistida.sql`: somente se staging de importação persistente for indispensável; ainda não criar.
- `plan.md` e `TODO.md`: atualizar depois da aprovação do escopo e do início da implementação.

## 6. Segurança e governança

O frontend usará apenas o cliente Supabase já configurado e a chave publicável. Não haverá service role, token privado ou credencial de integração no GitHub Pages. Arquivos de origem ficarão em bucket privado, com caminhos municipais e URLs assinadas quando a policy permitir.

A publicação da importação será uma ação explícita. Dados não confirmados devem permanecer como rascunho ou pendência. O sistema precisa mostrar `origem`, `arquivo`, `data da extração`, `usuário que confirmou` e `observações de inconsistência` para que uma ata importada possa ser auditada.

A Licitação permanece como pendência quando `processo_compras_id` ou outro vínculo oficial não estiver disponível. O módulo não deverá criar automaticamente processo, homologação, publicação, fornecedor novo ou órgão novo sem confirmação e policy correspondente.

## 7. Critérios de aceite da primeira etapa

1. Usuário autenticado sem ação de criação consegue consultar apenas atas autorizadas pela RLS.
2. Usuário autorizado consegue abrir detalhe de ata, itens, saldos, pedidos e histórico sem chamadas administrativas ocultas.
3. Upload inválido é rejeitado antes do envio; upload válido preserva o arquivo original no bucket privado.
4. A prévia identifica ao menos campos ausentes, números inválidos, duplicidades potenciais e totais inconsistentes.
5. Nenhum registro oficial é criado antes da confirmação humana.
6. A confirmação não cria fornecedor duplicado nem ata duplicada sem alerta explícito.
7. Ajuste de saldo exige justificativa e utiliza a RPC existente.
8. Pedido segue somente pelos RPCs existentes e respeita saldo, unidade, perfil e estados.
9. Entrega acima do solicitado, aprovação sem saldo e acesso cross-tenant são bloqueados.
10. O build estático do MatrixIA passa e a URL do GitHub Pages abre a navegação sem depender de Express, tRPC ou OAuth Manus.
11. A documentação diferencia claramente implementado, validado em homologação, publicado e pendente.

## 8. Ordem de execução proposta

**Etapa A — fundação de leitura:** tipos, consultas, card de acesso, hall, detalhe, filtros e estados vazios.  
**Etapa B — operação existente:** saldos, órgãos consumidores, pedidos, reservas, aprovações, entregas e histórico usando tabelas/RPCs já presentes.  
**Etapa C — upload assistido:** bucket privado, prévia, validação, revisão e, se necessário, migration de staging.  
**Etapa D — validação:** testes TypeScript/build, revisão das policies, testes autenticados em homologação, cenários de saldo/concor­rência e publicação no GitHub Pages.  
**Etapa E — evolução posterior:** vínculo formal com Licitações, documentos completos, estornos segregados, relatórios e integrações oficiais.

## 9. Pendências que precisam permanecer visíveis

O módulo não deve ser anunciado como SaaS contratável completo enquanto não houver TR específico de Atas, ETP, testes E2E autenticados, prova de isolamento cross-tenant, backup/restauração, critérios formais de aceite, portabilidade, SLA e validação municipal. Essas pendências não impedem uma liberação operacional controlada, mas precisam aparecer na documentação e no status do módulo.
