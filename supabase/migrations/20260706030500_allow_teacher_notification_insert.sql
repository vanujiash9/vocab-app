drop policy if exists "notifications teacher insert for assigned students" on public.notifications;

create policy "notifications teacher insert for assigned students"
on public.notifications
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and public.is_teacher()
  and exists (
    select 1
    from public.teacher_students ts
    where ts.teacher_id = auth.uid()
      and ts.student_id = notifications.user_id
  )
);
