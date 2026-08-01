-- Indice unico em slug para garantir idempotencia do seed.
-- ON CONFLICT presume esta garantia; adicionar pre-vencao aqui.
create unique index if not exists uniq_products_slug on public.products (slug);

-- Catalogo da esteira. Idempotente por slug.
-- ATENCAO: nenhum produto aqui nasce compravel. status='em_breve' ate que
-- alguem confirme que existe conteudo dentro.

insert into public.products (slug, title, subtitle, promise, price, status, sort_order, highlights, is_active)
values
  ('bussola-da-espiral', 'Bússola da Espiral', 'Diagnóstico gratuito',
   'Descubra em que volta da espiral você está presa.', 0, 'em_breve', 10,
   '["12 perguntas","Retrato do seu arquétipo","Áudio de devolutiva"]'::jsonb, true),

  ('sete-manhas', 'Sete Manhãs', 'Micro-jornada de 7 dias',
   'Sete dias para sair do piloto automático – dez minutos por manhã.', 47, 'em_breve', 20,
   '["7 áudios-ritual","Journaling guiado","Comunidade da turma"]'::jsonb, true),

  ('mapa-dos-sentimentos', 'Mapa dos Sentimentos que Aprisionam', 'Módulo avulso',
   'O módulo que a maioria diz ter sido o que quebrou a casca.', 27, 'em_breve', 30,
   '["Vídeo do módulo 7","Mapa de journaling","Áudio de neutralização"]'::jsonb, true),

  ('prosperidade-em-espiral', 'Prosperidade em Espiral', 'Imersão de fim de semana',
   'Um fim de semana para desbloquear sua relação com o dinheiro.', 297, 'em_breve', 40,
   '["Imersão ao vivo","Gravação vitalícia","Workbook de crenças"]'::jsonb, true),

  ('circulo-espiral', 'Círculo Espiral', 'Turma ao vivo',
   'A jornada conduzida ao vivo, em grupo pequeno.', 1497, 'em_breve', 60,
   '["Encontros ao vivo","Grupo reduzido","Acompanhamento"]'::jsonb, true),

  ('clube-guardia', 'Clube Guardião', 'Assinatura mensal',
   'A espiral não acaba no último módulo.', 47, 'em_breve', 70,
   '["Ritual semanal inédito","Carta do dia","SunyClass mensal"]'::jsonb, true),

  ('mentoria-espiral', 'Mentoria Espiral', 'Reprogramação 1:1',
   'Isto não é um formulário. É uma decisão.', 9997, 'em_breve', 80,
   '["8 sessões 1:1","Acesso vitalício ao ecossistema","Linha direta"]'::jsonb, true),

  ('guardias-formacao', 'Guardiãs', 'Formação de facilitadoras',
   'Conduza outras mulheres pela espiral – com método e selo.', 5997, 'em_breve', 90,
   '["6 meses de formação","Supervisões mensais","Selo verificável"]'::jsonb, true)
on conflict (slug) do nothing;

-- O core ja existente ganha apresentacao de vitrine.
update public.products
   set promise = 'Você não precisa de mais informação. Você precisa de transformação.',
       subtitle = 'O método completo',
       sort_order = 50,
       highlights = '["10 módulos","Acesso vitalício","Comunidade privada"]'::jsonb
 where slug = 'mulher-espiral';
