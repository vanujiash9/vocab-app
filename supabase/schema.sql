-- IELTS Vocabulary OS: schema + RLS
create extension if not exists pgcrypto;

create type public.user_role as enum ('teacher', 'student');
create type public.vocabulary_status as enum ('new', 'learning', 'known', 'difficult');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Người dùng',
  role public.user_role not null default 'student',
  daily_goal integer not null default 20 check (daily_goal between 1 and 500),
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null,
  description text not null default '',
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  cover_color text not null default '#1769ff',
  created_at timestamptz not null default now()
);

create table public.course_members (
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (course_id, student_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  lesson_id uuid references public.lessons(id) on delete set null,
  word text not null,
  phonetic text,
  part_of_speech text,
  english_definition text not null default '',
  vietnamese_meaning text not null default '',
  example_sentence text,
  status public.vocabulary_status not null default 'new',
  lookup_count integer not null default 1,
  created_at timestamptz not null default now(),
  unique(user_id, word)
);

create table public.dictionary_entries (
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

create table public.user_vocabulary (
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

create table public.teacher_vocabulary (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  dictionary_entry_id uuid not null references public.dictionary_entries(id) on delete cascade,
  note text,
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(teacher_id, dictionary_entry_id)
);

create table public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(teacher_id, student_id),
  check (teacher_id <> student_id)
);

create table public.vocabulary_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  dictionary_entry_id uuid not null references public.dictionary_entries(id) on delete cascade,
  status public.vocabulary_status not null default 'new',
  note text,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(teacher_id, student_id, dictionary_entry_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  message text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  due_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  lesson_id uuid references public.lessons(id) on delete set null,
  score integer not null,
  total integer not null check (total > 0 and score between 0 and total),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    case when lower(coalesce(new.email, '')) = 'thanh.van19062004@gmail.com' then 'teacher'::public.user_role else 'student'::public.user_role end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

create or replace function public.is_course_teacher(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.courses where id = p_course_id and teacher_id = auth.uid());
$$;

create or replace function public.is_course_member(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.course_members where course_id = p_course_id and student_id = auth.uid());
$$;

create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Không thể tự thay đổi vai trò tài khoản';
  end if;
  return new;
end;
$$;

create trigger prevent_profile_role_change before update on public.profiles
for each row execute procedure public.prevent_profile_role_change();

create or replace function public.join_course_by_code(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_course_id uuid;
begin
  if not exists(select 1 from public.profiles where id = auth.uid() and role = 'student') then
    raise exception 'Chỉ student mới có thể tham gia khóa học';
  end if;
  select id into v_course_id from public.courses where join_code = upper(trim(p_code));
  if v_course_id is null then raise exception 'Mã khóa học không hợp lệ'; end if;
  insert into public.course_members(course_id, student_id) values(v_course_id, auth.uid()) on conflict do nothing;
end;
$$;

grant execute on function public.join_course_by_code(text) to authenticated;

create or replace function public.add_teacher_student_by_email(p_email text)
returns public.teacher_students
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.profiles;
  v_row public.teacher_students;
begin
  if not public.is_teacher() then
    raise exception 'Chỉ teacher mới có thể thêm học sinh';
  end if;

  select * into v_student
  from public.profiles
  where lower(email) = lower(trim(p_email)) and role = 'student';

  if v_student.id is null then
    raise exception 'Không tìm thấy student với email này';
  end if;

  insert into public.teacher_students(teacher_id, student_id)
  values (auth.uid(), v_student.id)
  on conflict (teacher_id, student_id) do update set teacher_id = excluded.teacher_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.add_teacher_student_by_email(text) to authenticated;

create view public.accessible_courses with (security_invoker=true) as
select c.* from public.courses c
where public.is_course_teacher(c.id) or public.is_course_member(c.id);

create view public.accessible_lessons with (security_invoker=true) as
select l.* from public.lessons l
where public.is_course_teacher(l.course_id) or public.is_course_member(l.course_id);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_members enable row level security;
alter table public.lessons enable row level security;
alter table public.vocabulary enable row level security;
alter table public.dictionary_entries enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.teacher_vocabulary enable row level security;
alter table public.teacher_students enable row level security;
alter table public.vocabulary_assignments enable row level security;
alter table public.notifications enable row level security;
alter table public.deadlines enable row level security;
alter table public.quiz_results enable row level security;

create policy "profiles select own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles select teacher students" on public.profiles for select to authenticated using (id = auth.uid() or exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid() and ts.student_id = profiles.id));
create policy "profiles update own safe fields" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "teacher select own courses" on public.courses for select to authenticated using (teacher_id = auth.uid());
create policy "student select joined courses" on public.courses for select to authenticated using (public.is_course_member(id));
create policy "teacher insert courses" on public.courses for insert to authenticated with check (teacher_id = auth.uid() and public.is_teacher());
create policy "teacher update own courses" on public.courses for update to authenticated using (teacher_id = auth.uid() and public.is_teacher()) with check (teacher_id = auth.uid() and public.is_teacher());
create policy "teacher delete own courses" on public.courses for delete to authenticated using (teacher_id = auth.uid() and public.is_teacher());

create policy "members select related" on public.course_members for select to authenticated using (student_id = auth.uid() or public.is_course_teacher(course_id));
create policy "student delete own membership" on public.course_members for delete to authenticated using (student_id = auth.uid());

create policy "lessons select accessible" on public.lessons for select to authenticated using (public.is_course_teacher(course_id) or public.is_course_member(course_id));
create policy "teacher insert lessons" on public.lessons for insert to authenticated with check (public.is_course_teacher(course_id));
create policy "teacher update lessons" on public.lessons for update to authenticated using (public.is_course_teacher(course_id));
create policy "teacher delete lessons" on public.lessons for delete to authenticated using (public.is_course_teacher(course_id));

create policy "vocabulary own all" on public.vocabulary for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "dictionary entries select authenticated" on public.dictionary_entries for select to authenticated using (true);
create policy "dictionary entries insert authenticated" on public.dictionary_entries for insert to authenticated with check (true);
create policy "dictionary entries update teachers" on public.dictionary_entries for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "dictionary entries delete teachers" on public.dictionary_entries for delete to authenticated using (public.is_teacher());

create policy "user vocabulary own all" on public.user_vocabulary for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "teacher vocabulary own all" on public.teacher_vocabulary for all to authenticated using (teacher_id = auth.uid() and public.is_teacher()) with check (teacher_id = auth.uid() and public.is_teacher());

create policy "teacher students own select" on public.teacher_students for select to authenticated using (teacher_id = auth.uid() or student_id = auth.uid());
create policy "teacher students own insert" on public.teacher_students for insert to authenticated with check (teacher_id = auth.uid() and public.is_teacher());
create policy "teacher students own delete" on public.teacher_students for delete to authenticated using (teacher_id = auth.uid() and public.is_teacher());

create policy "assignments teacher own all" on public.vocabulary_assignments for all to authenticated using (teacher_id = auth.uid() and public.is_teacher()) with check (teacher_id = auth.uid() and public.is_teacher());
create policy "assignments student select" on public.vocabulary_assignments for select to authenticated using (student_id = auth.uid());
create policy "assignments student update status" on public.vocabulary_assignments for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "notifications own all" on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "deadlines own all" on public.deadlines for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "quiz results own all" on public.quiz_results for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.accessible_courses, public.accessible_lessons to authenticated;
