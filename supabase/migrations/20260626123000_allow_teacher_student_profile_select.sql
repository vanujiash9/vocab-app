drop policy if exists "profiles select teacher students" on public.profiles;

create policy "profiles select teacher students" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.teacher_students ts
    where ts.teacher_id = auth.uid()
      and ts.student_id = profiles.id
  )
);
