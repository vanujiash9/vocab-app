alter table public.dictionary_entries
  add column if not exists collocations jsonb not null default '[]'::jsonb;

alter table public.vocabulary_assignments
  add column if not exists start_at timestamptz not null default now(),
  add column if not exists due_at timestamptz,
  add column if not exists priority text;

update public.vocabulary_assignments
set start_at = coalesce(start_at, assigned_at),
    priority = coalesce(nullif(priority, ''), 'medium');

alter table public.vocabulary_assignments
  alter column priority set default 'medium',
  alter column priority set not null;

alter table public.vocabulary_assignments
  drop constraint if exists vocabulary_assignments_priority_check,
  add constraint vocabulary_assignments_priority_check check (priority in ('low', 'medium', 'high'));
