drop view if exists public.teacher_students;

create table if not exists public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(teacher_id, student_id),
  check (teacher_id <> student_id)
);

create table if not exists public.vocabulary_assignments (
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

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  message text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

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

alter table public.teacher_students enable row level security;
alter table public.vocabulary_assignments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "teacher students own select" on public.teacher_students;
drop policy if exists "teacher students own insert" on public.teacher_students;
drop policy if exists "teacher students own delete" on public.teacher_students;
drop policy if exists "assignments teacher own all" on public.vocabulary_assignments;
drop policy if exists "assignments student select" on public.vocabulary_assignments;
drop policy if exists "assignments student update status" on public.vocabulary_assignments;
drop policy if exists "notifications own all" on public.notifications;

create policy "teacher students own select" on public.teacher_students for select to authenticated using (teacher_id = auth.uid() or student_id = auth.uid());
create policy "teacher students own insert" on public.teacher_students for insert to authenticated with check (teacher_id = auth.uid() and public.is_teacher());
create policy "teacher students own delete" on public.teacher_students for delete to authenticated using (teacher_id = auth.uid() and public.is_teacher());

create policy "assignments teacher own all" on public.vocabulary_assignments for all to authenticated using (teacher_id = auth.uid() and public.is_teacher()) with check (teacher_id = auth.uid() and public.is_teacher());
create policy "assignments student select" on public.vocabulary_assignments for select to authenticated using (student_id = auth.uid());
create policy "assignments student update status" on public.vocabulary_assignments for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "notifications own all" on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
