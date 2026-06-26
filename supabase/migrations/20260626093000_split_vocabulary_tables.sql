create table if not exists public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  normalized_word text not null unique,
  word text not null,
  phonetic text,
  audio_url text,
  part_of_speech text,
  english_definition text not null default '',
  vietnamese_meaning text not null default '',
  examples jsonb not null default '[]'::jsonb,
  synonyms jsonb not null default '[]'::jsonb,
  antonyms jsonb not null default '[]'::jsonb,
  provider text not null default 'manual',
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  dictionary_entry_id uuid not null references public.dictionary_entries(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  status public.vocabulary_status not null default 'new',
  personal_note text,
  lookup_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, dictionary_entry_id)
);

create table if not exists public.teacher_vocabulary (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  dictionary_entry_id uuid not null references public.dictionary_entries(id) on delete cascade,
  note text,
  difficulty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(teacher_id, dictionary_entry_id)
);

insert into public.dictionary_entries (
  normalized_word,
  word,
  phonetic,
  part_of_speech,
  english_definition,
  vietnamese_meaning,
  examples,
  provider,
  created_at
)
select distinct on (lower(trim(word)))
  lower(trim(word)) as normalized_word,
  lower(trim(word)) as word,
  phonetic,
  part_of_speech,
  english_definition,
  vietnamese_meaning,
  case when example_sentence is null or trim(example_sentence) = '' then '[]'::jsonb else jsonb_build_array(example_sentence) end as examples,
  'legacy-vocabulary' as provider,
  created_at
from public.vocabulary
where trim(word) <> ''
order by lower(trim(word)), created_at asc
on conflict (normalized_word) do nothing;

insert into public.user_vocabulary (
  user_id,
  dictionary_entry_id,
  lesson_id,
  status,
  lookup_count,
  created_at
)
select
  v.user_id,
  d.id,
  v.lesson_id,
  v.status,
  v.lookup_count,
  v.created_at
from public.vocabulary v
join public.dictionary_entries d on d.normalized_word = lower(trim(v.word))
where trim(v.word) <> ''
on conflict (user_id, dictionary_entry_id) do nothing;

alter table public.dictionary_entries enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.teacher_vocabulary enable row level security;

drop policy if exists "dictionary entries select authenticated" on public.dictionary_entries;
drop policy if exists "dictionary entries insert authenticated" on public.dictionary_entries;
drop policy if exists "dictionary entries update teachers" on public.dictionary_entries;
drop policy if exists "dictionary entries delete teachers" on public.dictionary_entries;
drop policy if exists "user vocabulary own all" on public.user_vocabulary;
drop policy if exists "teacher vocabulary own all" on public.teacher_vocabulary;

create policy "dictionary entries select authenticated" on public.dictionary_entries for select to authenticated using (true);
create policy "dictionary entries insert authenticated" on public.dictionary_entries for insert to authenticated with check (true);
create policy "dictionary entries update teachers" on public.dictionary_entries for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "dictionary entries delete teachers" on public.dictionary_entries for delete to authenticated using (public.is_teacher());

create policy "user vocabulary own all" on public.user_vocabulary for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "teacher vocabulary own all" on public.teacher_vocabulary for all to authenticated using (teacher_id = auth.uid() and public.is_teacher()) with check (teacher_id = auth.uid() and public.is_teacher());
