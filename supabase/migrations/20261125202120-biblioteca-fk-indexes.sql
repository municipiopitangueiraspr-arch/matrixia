-- Biblioteca Municipal: índices para chaves estrangeiras sem cobertura.
-- Migration idempotente; mantém o escopo restrito às tabelas bib_*.

create index if not exists idx_bib_bloqueios_leitor_id
  on public.bib_bloqueios (leitor_id);

create index if not exists idx_bib_configuracoes_orgao_responsavel_id
  on public.bib_configuracoes (orgao_responsavel_id);

create index if not exists idx_bib_emprestimos_usuario_id
  on public.bib_emprestimos (usuario_id);

create index if not exists idx_bib_exemplares_prateleira_id
  on public.bib_exemplares (prateleira_id);

create index if not exists idx_bib_inventario_itens_exemplar_id
  on public.bib_inventario_itens (exemplar_id);

create index if not exists idx_bib_leitores_orgao_vinculo_id
  on public.bib_leitores (orgao_vinculo_id);

create index if not exists idx_bib_leitores_usuario_cadastro_id
  on public.bib_leitores (usuario_cadastro_id);

create index if not exists idx_bib_livro_autores_autor_id
  on public.bib_livro_autores (autor_id);

create index if not exists idx_bib_livro_categorias_categoria_id
  on public.bib_livro_categorias (categoria_id);

create index if not exists idx_bib_livros_editora_id
  on public.bib_livros (editora_id);

create index if not exists idx_bib_livros_orgao_id
  on public.bib_livros (orgao_id);

create index if not exists idx_bib_livros_usuario_cadastro_id
  on public.bib_livros (usuario_cadastro_id);

create index if not exists idx_bib_reservas_leitor_id
  on public.bib_reservas (leitor_id);

create index if not exists idx_bib_reservas_livro_id
  on public.bib_reservas (livro_id);
