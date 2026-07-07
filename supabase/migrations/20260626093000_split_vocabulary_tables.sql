do $$
begin
  create type public.vocabulary_status as enum ('new', 'learning', 'known', 'difficult');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key,
  email text not null default '',
  display_name text not null default 'Người dùng',
  role text not null default 'student',
  daily_goal integer not null default 20,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid,
  title text not null default '',
  description text not null default '',
  position integer not null default 1,
  created_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
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
