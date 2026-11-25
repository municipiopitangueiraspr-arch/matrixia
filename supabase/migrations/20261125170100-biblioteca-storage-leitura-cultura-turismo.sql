-- Biblioteca: leitura dos anexos somente por gestores autorizados da Cultura e Turismo.
drop policy if exists biblioteca_documentos_storage_select_municipio_unico on storage.objects;
create policy biblioteca_documentos_storage_select_municipio_unico on storage.objects for select to authenticated using (
  bucket_id = 'biblioteca-documentos'
  and app_private.has_municipio_access(app_private.current_municipio_id())
  and app_private.bib_cultura_gestor()
  and name ~ '^(livro|exemplar|emprestimo|devolucao|leitor|inventario|aquisicao|doacao|baixa|evento)/[A-Za-z0-9_-]+/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[A-Za-z0-9._-]+$'
);
