

# Reconstrução integral do módulo de Atas, Saldos e Pedidos

## Objetivo
Transformar Administração e Finanças em um catálogo real de módulos, preservando Consulta e Detalhe e adicionando Cadastro, Saúde, Saldos/Consumo, Carrinho, Pedidos/Aprovações, Relatórios, Aditivos e FAQ, sempre usando o Supabase ativo como único backend.

## Arquitetura nova
`Home.tsx` encaminhará para `AdministrationModules`, que apresenta entradas independentes. `ProcurementOperationsModule` será o shell autenticado do domínio, carregando `loadAtasWorkspace()` uma vez e encaminhando a navegação para páginas em `client/src/components/procurement/`. O domínio reutilizará tipos/helpers de `lib/atas.ts` e uma camada de ações em `lib/atasOperations.ts`, usando exclusivamente RPCs e RLS do Supabase.

O Cadastro usará o fluxo autorizado de documento/importação/revisão/publicação existente e uma RPC transacional para criar ata e itens, sem inserts diretos no frontend. Pedidos, aprovações, entregas, estornos e saldos chamarão RPCs existentes. Relatórios serão derivados dos dados reais carregados, com exportações client-side sem persistir dados paralelos.

## Design
- **Painel administrativo editorial** (probabilidade 0,04): densidade alta, navegação lateral e tabelas operacionais.
- **Prisma municipal** (probabilidade 0,06): cartões suaves, muitos indicadores e gradientes.
- **Caderno de conformidade** (probabilidade 0,05): superfícies claras, bordas, tipografia documental e estados explícitos.

Escolha: **Caderno de conformidade**. Branco e azul-petróleo servem à leitura documental; âmbar marca risco e verde marca estados aprovados. Cada tela terá título, escopo, indicadores, filtros e ações explícitas; nenhum estado vazio será decorativo. A navegação lateral representa o catálogo e o cabeçalho mantém o contexto da Secretaria.

## Estrutura nova
- `client/src/pages/Home.tsx`: catálogo e estados de entrada.
- `client/src/components/ProcurementOperationsModule.tsx`: shell, carregamento e navegação interna.
- `client/src/components/procurement/*.tsx`: páginas independentes.
- `client/src/lib/atas.ts`: tipos/carregamento compartilhados.
- `client/src/lib/atasOperations.ts`: RPCs, CSV e operações do domínio.
- `supabase/migrations/*compras_atas_cadastro.sql`: autorização, auditoria e criação transacional de ata/itens.
