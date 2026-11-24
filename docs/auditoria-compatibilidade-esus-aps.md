# Auditoria de compatibilidade territorial com e-SUS APS/SISAB

Data da verificação: 24/11/2026.

## Conclusão

O projeto **Inteligência Municipal** já possui uma base territorial bastante próxima do que precisamos para o núcleo compartilhado: importações DXF, entidades DXF, lotes, geometrias, zonas/microáreas, domicílios, famílias, cidadãos, ACS e vínculos com profissionais. Porém, os nomes internos das colunas não são os nomes de um arquivo oficial do e-SUS APS. Isso não é um problema por si só: a aplicação deve manter o modelo interno normalizado e criar uma camada de mapeamento/exportação para o layout oficial vigente.

A estrutura está **parcialmente compatível** para o Cadastro Domiciliar e Territorial. Ela já contempla endereço, número, bairro, município, CEP, tipo de imóvel, situação de ocupação, condições de moradia, família, cidadão, CNS/CPF, microárea, ACS, profissional, CNES e INE. Os principais pontos pendentes são: completar os campos obrigatórios do cadastro oficial, formalizar os códigos/domínios oficiais, separar claramente o identificador do domicílio do identificador do lote e garantir uma camada de exportação versionada para não enviar diretamente o schema interno ao Ministério da Saúde.

## O que já existe no banco

As tabelas territoriais principais são `census_map_imports`, `census_map_dxf_entities`, `census_map_lots`, `census_map_lot_snapshots`, `census_map_zones` e `census_territory_map_lots`. O lote já possui `geometry`, `source_handle`, `layer_name`, `is_valid`, `problem_reasons`, `cadastral_label`, `street_name`, `neighborhood_name` e `block_reference`. Isso atende bem à preparação do DXF e à conferência geométrica.

Para o domicílio, `census_households` possui `address_line`, `address_number`, `address_complement`, `neighborhood`, `postal_code`, `locality`, `property_type`, `occupancy_status` e campos de condições de moradia, além de `address_validation_status` e `address_source`. Para família e cidadão, existem `census_families`, `census_family_members` e `census_citizens`, com `full_name`, `preferred_name`, `birth_date`, `sex`, `cns`, `cpf`, `race_color`, `nationality`, `education_level`, `occupation`, `mother_name` e `father_name`.

Para a territorialização da Saúde, existem `census_zones`, `health_microareas`, `census_lot_acs_assignments`, `census_acs_zone_assignments`, `health_professionals`, `health_professional_assignments`, `health_teams` e `health_establishments`. Os campos `health_microareas.code`, `health_professionals.cns`, `health_professionals.cbo`, `health_teams.ine` e `health_establishments.cnes` são importantes para a identificação do profissional, equipe, microárea e estabelecimento.

A base já tem registros reais: 5 importações de mapa, 1.582 lotes, 265 domicílios e 5 zonas. No momento da consulta, `census_families`, `census_citizens` e `census_acs` estavam sem registros. Isso significa que a tela deve carregar o mapa e os domicílios existentes, sem inventar famílias, pessoas ou ACS demonstrativos.

## Comparação com os campos oficiais

O Manual e-SUS APS define que o cadastro possui duas dimensões: individual e domiciliar/territorial. A dimensão individual identifica o cidadão; a domiciliar/territorial vincula o cidadão ao domicílio e ao território. O manual também admite o registro de domicílios vazios, abandonados e outros imóveis do território, além de núcleos familiares.

### Identificação do endereço

A documentação oficial exige CEP, município, UF, microárea, bairro, nome do logradouro e número. Também prevê tipo de logradouro, complemento, ponto de referência, tipo de imóvel, telefone residencial e telefone de referência.

No banco atual, há correspondência direta para CEP (`postal_code`), município/localidade (`locality`), bairro (`neighborhood`), complemento (`address_complement`), número (`address_number`), tipo de imóvel (`property_type`) e microárea por meio das relações de zona/lote/ACS. O modelo ainda precisa de campos explícitos para `uf`, `street_type`, `reference_point`, `residential_phone` e `reference_phone`. `address_line` não deve ser usado como substituto permanente do tipo e nome do logradouro, pois a exportação precisa separar esses componentes.

### Situação e condições de moradia

O banco já possui campos para situação de ocupação e condições de moradia: `occupancy_status`, `construction_material`, `rooms_count`, `bedrooms_count`, `water_supply`, `water_treatment`, `sewage_disposal`, `toilet_available`, `electricity_access`, `garbage_disposal`, `cooking_fuel` e `housing_condition`. Esses campos são adequados como base interna, mas precisam de catálogo de valores oficiais e validação por tipo de imóvel.

O Manual diferencia domicílio, comércio, terreno baldio, ponto estratégico, escola, creche, abrigo, instituição de longa permanência, unidade prisional, delegacia, estabelecimento religioso e outros. Portanto, `property_type` deve usar códigos oficiais versionados, e não somente texto livre.

### Família

A documentação oficial prevê número de prontuário familiar, CNS/CPF do responsável, data de nascimento do responsável, renda familiar, quantidade de membros, data de residência e indicação de mudança. A tabela `census_families` hoje possui `household_id`, `family_reference`, `active`, `source` e versionamento. A relação com cidadãos existe por `census_family_members`, que também guarda `relationship_code` e `is_responsible`.

Faltam, no modelo de família, campos explícitos para `responsible_cns_or_cpf`, `responsible_birth_date`, `family_income_range`, `member_count`, `resides_since` e `moved_out_at` ou equivalente. Esses campos devem ser adicionados antes de prometer exportação completa do cadastro familiar.

### Cidadão

A tabela `census_citizens` está bem alinhada com a identificação individual: nome completo, nome social, data de nascimento, sexo, CNS, CPF, raça/cor, nacionalidade, nome da mãe, nome do pai, escolaridade e ocupação. O Manual também exige, no contexto da ficha, CNS/CPF, nome completo, nascimento, sexo, raça/cor, nome dos pais e nacionalidade.

Ainda devem ser avaliados campos como NIS/PIS/Pasep, município/UF de nascimento, país de nascimento, telefone celular, e-mail e dados condicionais de naturalização. A ausência deles impede afirmar compatibilidade integral para o Cadastro Individual.

### Profissional, equipe e estabelecimento

O Manual exige, no cabeçalho assistencial, CNS do profissional, CBO, CNES, INE e data do cadastro. O schema já separa esses dados de forma apropriada: `health_professionals.cns`, `health_professionals.cbo`, `health_establishments.cnes` e `health_teams.ine`, vinculados por `health_professional_assignments`.

O ponto que precisa de validação operacional é garantir que a atribuição do profissional à equipe, estabelecimento e microárea esteja ativa na data da coleta. O exportador deve rejeitar ou encaminhar para pendência registros sem CNS/CBO/CNES/INE quando esses campos forem obrigatórios para o tipo de ficha.

## Decisão técnica para a importação DXF

A importação não deve gravar diretamente em `census_households` ou `census_citizens`. O fluxo correto é:

1. Gravar o arquivo e a importação em `census_map_imports`.
2. Gravar todas as entidades em `census_map_dxf_entities`, preservando texto, camada, geometria, handle e pares brutos.
3. Gravar somente geometrias válidas como lotes em `census_map_lots` ou `census_territory_map_lots` conforme o fluxo vigente do projeto.
4. Manter `street_name`, `neighborhood_name`, `block_reference` e `cadastral_label` como dados extraídos sujeitos à conferência.
5. Publicar o mapa usando o RPC existente `census_map_publish_draft`, em vez de criar uma segunda estrutura paralela.
6. Criar ou atualizar domicílios apenas após a conferência do vínculo entre lote, endereço e tipo de imóvel.
7. Vincular famílias e cidadãos somente pelos cadastros próprios, sem criar pessoas a partir de texto DXF.
8. Exportar por uma camada versionada que traduza os nomes internos para os campos oficiais do e-SUS APS/SISAB.

## Resultado da auditoria

- **Compatível para preparação territorial:** importação DXF, preservação de entidades, geometria de lotes, zonas, microáreas e vínculos ACS.
- **Parcialmente compatível para Cadastro Domiciliar e Territorial:** endereço, número, bairro, CEP, município/localidade, imóvel e condições de moradia estão presentes, mas faltam UF, tipo de logradouro, ponto de referência e telefones.
- **Parcialmente compatível para famílias:** a relação família–domicílio–membro existe, mas faltam campos específicos do responsável, renda, residência e mudança.
- **Bem encaminhado para cidadão:** CNS, CPF, nome, nome social, nascimento, sexo, raça/cor, nacionalidade e filiação já existem; faltam campos complementares para afirmar compatibilidade integral.
- **Bem encaminhado para equipe/profissional:** CNS, CBO, CNES e INE estão modelados em tabelas separadas e relacionáveis.
- **Não compatível ainda com exportação direta:** os nomes internos não devem ser tratados como layout oficial. É necessária uma camada de mapeamento, validação, códigos oficiais e versão do layout.

## Fontes oficiais

[1]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/manual "Manual e-SUS APS do Ministério da Saúde, versão atualizada em 09/11/2026"
[2]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/manual/CDS/CDS_02/ "Manual do Cadastro da Atenção Primária à Saúde, Cadastro Individual e Cadastro Domiciliar e Territorial"
[3]: https://www.gov.br/saude/pt-br/composicao/saps/esf/faq-novo-modelo-de-cofinanciamento-federal-da-aps/componente-vinculo-e-acompanhamento-territorial/por-que-o-cadastro-domiciliar-e%20territorial-e-importante-e-quais-informacoes-sao-coletadas "Ministério da Saúde: informações coletadas no Cadastro Domiciliar e Territorial"
