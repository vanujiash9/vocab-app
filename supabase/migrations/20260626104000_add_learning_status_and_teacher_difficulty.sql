alter type public.vocabulary_status add value if not exists 'learning';

alter table public.teacher_vocabulary
  drop constraint if exists teacher_vocabulary_difficulty_check;

alter table public.teacher_vocabulary
  add constraint teacher_vocabulary_difficulty_check
  check (difficulty is null or difficulty in ('easy', 'medium', 'hard'));
