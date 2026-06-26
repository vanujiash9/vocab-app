-- IELTS Vocabulary OS: schema + RLS
create extension if not exists pgcrypto;

create type public.user_role as enum ('teacher', 'student');
create type public.vocabulary_status as enum ('new', 'known', 'difficult');

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

create view public.accessible_courses with (security_invoker=true) as
select c.* from public.courses c
where public.is_course_teacher(c.id) or public.is_course_member(c.id);

create view public.accessible_lessons with (security_invoker=true) as
select l.* from public.lessons l
where public.is_course_teacher(l.course_id) or public.is_course_member(l.course_id);

create view public.teacher_students with (security_barrier=true) as
select c.title as course_title, p.display_name as student_name, p.email as student_email, cm.joined_at
from public.course_members cm
join public.courses c on c.id = cm.course_id
join public.profiles p on p.id = cm.student_id
where c.teacher_id = auth.uid();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_members enable row level security;
alter table public.lessons enable row level security;
alter table public.vocabulary enable row level security;
alter table public.deadlines enable row level security;
alter table public.quiz_results enable row level security;

create policy "profiles select own" on public.profiles for select to authenticated using (id = auth.uid());
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
create policy "deadlines own all" on public.deadlines for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "quiz results own all" on public.quiz_results for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.accessible_courses, public.accessible_lessons, public.teacher_students to authenticated;
