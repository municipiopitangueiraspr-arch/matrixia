begin;

drop trigger if exists trg_saude_questionario_perguntas_updated_at on public.saude_questionarios;
drop trigger if exists trg_saude_questionario_perguntas_updated_at on public.saude_questionario_perguntas;
create trigger trg_saude_questionario_perguntas_updated_at before update on public.saude_questionario_perguntas
for each row execute function public.saude_questionarios_updated_at();

commit;
