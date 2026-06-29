-- 1. Đăng ký / đăng nhập Teacher và Student trong app trước.
-- 2. Chạy query sau để lấy ID:
-- select id, email, role from public.profiles order by created_at desc;
-- 3. Thay TEACHER_ID_HERE và STUDENT_ID_HERE bằng UUID thật.
-- 4. Chạy seed này trong Supabase SQL Editor.

with seed_words (normalized_word, word, part_of_speech, english_definition, vietnamese_meaning, examples, synonyms, antonyms, collocations) as (
  values
    (
      'sustainable',
      'sustainable',
      'adjective',
      'Able to continue over a long period without causing serious harm to the environment or exhausting resources.',
      'bền vững',
      '["The city needs sustainable transport policies for future growth.", "Students discussed sustainable solutions for urban waste."]'::jsonb,
      '["eco-friendly", "viable", "durable"]'::jsonb,
      '["unsustainable", "wasteful"]'::jsonb,
      '["sustainable development", "sustainable energy", "sustainable growth"]'::jsonb
    ),
    (
      'impact',
      'impact',
      'noun',
      'A strong effect or influence on a situation or person.',
      'tác động',
      '["Technology has a major impact on modern education.", "The campaign had a positive impact on public awareness."]'::jsonb,
      '["effect", "influence", "consequence"]'::jsonb,
      '["insignificance", "irrelevance"]'::jsonb,
      '["have an impact on", "environmental impact", "long-term impact"]'::jsonb
    ),
    (
      'evidence',
      'evidence',
      'noun',
      'Facts or information that show whether a belief or idea is true.',
      'bằng chứng',
      '["Researchers collected evidence to support the new policy.", "There is little evidence that the method improves memory."]'::jsonb,
      '["proof", "data", "testimony"]'::jsonb,
      '["guesswork", "speculation"]'::jsonb,
      '["strong evidence", "provide evidence", "scientific evidence"]'::jsonb
    ),
    (
      'benefit',
      'benefit',
      'noun',
      'An advantage or helpful result that comes from something.',
      'lợi ích',
      '["One benefit of flashcards is quick review.", "Students can gain social benefits from teamwork."]'::jsonb,
      '["advantage", "gain", "value"]'::jsonb,
      '["drawback", "disadvantage"]'::jsonb,
      '["benefit from", "economic benefit", "mutual benefit"]'::jsonb
    ),
    (
      'policy',
      'policy',
      'noun',
      'An official plan or set of rules used by an organization or government.',
      'chính sách',
      '["The school introduced a policy on mobile phone use.", "A clear policy can reduce confusion in class."]'::jsonb,
      '["rule", "strategy", "guideline"]'::jsonb,
      '["disorder", "chaos"]'::jsonb,
      '["public policy", "education policy", "policy change"]'::jsonb
    ),
    (
      'significant',
      'significant',
      'adjective',
      'Important or large enough to be noticed or have an effect.',
      'đáng kể; quan trọng',
      '["Students made significant progress after daily review.", "There was a significant rise in attendance."]'::jsonb,
      '["important", "notable", "substantial"]'::jsonb,
      '["minor", "insignificant"]'::jsonb,
      '["significant change", "significant role", "statistically significant"]'::jsonb
    ),
    (
      'solution',
      'solution',
      'noun',
      'A way to solve a problem or deal with a difficult situation.',
      'giải pháp',
      '["Teachers looked for a practical solution to low motivation.", "Recycling is not the only solution to pollution."]'::jsonb,
      '["answer", "remedy", "fix"]'::jsonb,
      '["problem", "obstacle"]'::jsonb,
      '["practical solution", "effective solution", "long-term solution"]'::jsonb
    ),
    (
      'challenge',
      'challenge',
      'noun',
      'Something difficult that requires effort and skill to deal with.',
      'thách thức',
      '["Time management is a common challenge for new students.", "Climate change remains a global challenge."]'::jsonb,
      '["difficulty", "obstacle", "test"]'::jsonb,
      '["advantage", "ease"]'::jsonb,
      '["face a challenge", "major challenge", "academic challenge"]'::jsonb
    ),
    (
      'environment',
      'environment',
      'noun',
      'The natural world or the conditions in which people live, work, or learn.',
      'môi trường',
      '["A supportive learning environment improves confidence.", "The government should protect the natural environment."]'::jsonb,
      '["surroundings", "ecosystem", "setting"]'::jsonb,
      '["pollution"]'::jsonb,
      '["learning environment", "natural environment", "protect the environment"]'::jsonb
    ),
    (
      'development',
      'development',
      'noun',
      'The process of growth, change, or improvement over time.',
      'sự phát triển',
      '["Vocabulary development takes consistent practice.", "The country invested in rural development."]'::jsonb,
      '["growth", "progress", "advancement"]'::jsonb,
      '["decline", "stagnation"]'::jsonb,
      '["personal development", "economic development", "skill development"]'::jsonb
    ),
    (
      'education',
      'education',
      'noun',
      'The process of teaching, learning, and gaining knowledge.',
      'giáo dục',
      '["Technology can improve access to education.", "Quality education helps reduce inequality."]'::jsonb,
      '["schooling", "instruction", "learning"]'::jsonb,
      '["ignorance"]'::jsonb,
      '["higher education", "quality education", "education system"]'::jsonb
    ),
    (
      'technology',
      'technology',
      'noun',
      'Scientific knowledge and tools used for practical purposes.',
      'công nghệ',
      '["Technology makes self-study more flexible.", "New technology can support personalized learning."]'::jsonb,
      '["innovation", "engineering", "digital tools"]'::jsonb,
      '["tradition"]'::jsonb,
      '["digital technology", "modern technology", "technology-based learning"]'::jsonb
    ),
    (
      'improve',
      'improve',
      'verb',
      'To make something better or to become better.',
      'cải thiện',
      '["Daily revision can improve long-term memory.", "The app helps students improve pronunciation."]'::jsonb,
      '["enhance", "strengthen", "develop"]'::jsonb,
      '["worsen", "damage"]'::jsonb,
      '["improve performance", "improve skills", "improve efficiency"]'::jsonb
    ),
    (
      'reduce',
      'reduce',
      'verb',
      'To make something smaller in amount, size, or degree.',
      'giảm',
      '["Clear goals can reduce study stress.", "Public transport may reduce traffic congestion."]'::jsonb,
      '["decrease", "cut", "lower"]'::jsonb,
      '["increase", "raise"]'::jsonb,
      '["reduce costs", "reduce stress", "reduce emissions"]'::jsonb
    ),
    (
      'advantage',
      'advantage',
      'noun',
      'A condition that gives someone a better chance of success.',
      'lợi thế',
      '["Knowing collocations gives students an advantage in speaking tests.", "Online learning offers the advantage of flexibility."]'::jsonb,
      '["benefit", "strength", "edge"]'::jsonb,
      '["disadvantage", "weakness"]'::jsonb,
      '["take advantage of", "competitive advantage", "main advantage"]'::jsonb
    )
)
insert into public.dictionary_entries (
  normalized_word,
  word,
  part_of_speech,
  english_definition,
  vietnamese_meaning,
  examples,
  synonyms,
  antonyms,
  collocations,
  provider
)
select
  normalized_word,
  word,
  part_of_speech,
  english_definition,
  vietnamese_meaning,
  examples,
  synonyms,
  antonyms,
  collocations,
  'manual'
from seed_words
on conflict (normalized_word, provider) do nothing;

insert into public.teacher_vocabulary (
  teacher_id,
  dictionary_entry_id,
  difficulty,
  note
)
select
  'TEACHER_ID_HERE'::uuid,
  de.id,
  case de.normalized_word
    when 'sustainable' then 'medium'
    when 'impact' then 'easy'
    when 'evidence' then 'medium'
    when 'benefit' then null
    when 'policy' then 'medium'
    when 'significant' then 'hard'
    when 'solution' then 'easy'
    when 'challenge' then 'medium'
    when 'environment' then 'easy'
    when 'development' then 'medium'
    when 'education' then null
    when 'technology' then 'easy'
    when 'improve' then 'easy'
    when 'reduce' then 'medium'
    else 'hard'
  end,
  case de.normalized_word
    when 'sustainable' then 'IELTS Writing Task 2 · Environment topic'
    when 'impact' then 'Useful for discussion topics'
    when 'evidence' then 'General academic vocabulary · Useful for discussion topics'
    when 'benefit' then 'General academic vocabulary'
    when 'policy' then 'IELTS Writing Task 2 · Education topic'
    when 'significant' then 'General academic vocabulary · IELTS Writing Task 2'
    when 'solution' then 'Environment topic · Useful for discussion topics'
    when 'challenge' then 'Education topic · Technology topic'
    when 'environment' then 'Environment topic'
    when 'development' then 'IELTS Writing Task 2 · General academic vocabulary'
    when 'education' then 'Education topic'
    when 'technology' then 'Technology topic'
    when 'improve' then 'General academic vocabulary'
    when 'reduce' then 'Environment topic · IELTS Writing Task 2'
    else 'Useful for discussion topics · General academic vocabulary'
  end
from public.dictionary_entries de
where de.provider = 'manual'
  and de.normalized_word in (
    'sustainable', 'impact', 'evidence', 'benefit', 'policy', 'significant', 'solution',
    'challenge', 'environment', 'development', 'education', 'technology', 'improve', 'reduce', 'advantage'
  )
on conflict (teacher_id, dictionary_entry_id) do nothing;

insert into public.user_vocabulary (
  user_id,
  dictionary_entry_id,
  status,
  personal_note,
  lookup_count
)
select
  'STUDENT_ID_HERE'::uuid,
  de.id,
  case de.normalized_word
    when 'impact' then 'learning'
    when 'evidence' then 'difficult'
    when 'benefit' then 'known'
    when 'policy' then 'new'
    when 'significant' then 'difficult'
    when 'environment' then 'learning'
    when 'education' then 'known'
    when 'technology' then 'learning'
    when 'improve' then 'new'
    else 'difficult'
  end,
  case de.normalized_word
    when 'evidence' then 'Hay đi với support / provide evidence.'
    when 'policy' then 'Ôn ví dụ về school policy và public policy.'
    when 'technology' then 'Dùng cho Speaking part 3 về học online.'
    when 'advantage' then 'Phân biệt advantage và benefit.'
    else null
  end,
  case de.normalized_word
    when 'impact' then 4
    when 'evidence' then 6
    when 'benefit' then 3
    when 'policy' then 2
    when 'significant' then 5
    when 'environment' then 4
    when 'education' then 2
    when 'technology' then 5
    when 'improve' then 1
    else 4
  end
from public.dictionary_entries de
where de.provider = 'manual'
  and de.normalized_word in (
    'impact', 'evidence', 'benefit', 'policy', 'significant',
    'environment', 'education', 'technology', 'improve', 'advantage'
  )
on conflict (user_id, dictionary_entry_id) do nothing;

insert into public.teacher_students (
  teacher_id,
  student_id
)
values (
  'TEACHER_ID_HERE'::uuid,
  'STUDENT_ID_HERE'::uuid
)
on conflict (teacher_id, student_id)
do nothing;

with assignment_seed (normalized_word, start_at, due_at, priority, status, note) as (
  values
    (
      'sustainable',
      now(),
      now() + interval '7 days',
      'medium',
      'new'::text,
      'Em học từ này bằng flashcard trước, sau đó làm quiz ngắn.'
    ),
    (
      'evidence',
      now(),
      now() + interval '3 days',
      'high',
      'learning'::text,
      'Tập đặt câu với provide evidence và supporting evidence.'
    ),
    (
      'solution',
      now(),
      now() + interval '7 days',
      'medium',
      'new'::text,
      'Ôn collocation practical solution trước khi làm quiz.'
    ),
    (
      'development',
      now(),
      now() + interval '3 days',
      'high',
      'known'::text,
      'Em đã học từ này rồi, kiểm tra lại bằng 3 câu ví dụ.'
    ),
    (
      'reduce',
      now(),
      now() + interval '7 days',
      'low',
      'new'::text,
      'Chú ý các cụm reduce stress, reduce emissions.'
    ),
    (
      'advantage',
      now(),
      now() + interval '3 days',
      'medium',
      'learning'::text,
      'So sánh advantage với benefit trong bài speaking.'
    )
)
insert into public.vocabulary_assignments (
  teacher_id,
  student_id,
  dictionary_entry_id,
  start_at,
  due_at,
  priority,
  status,
  note,
  assigned_at,
  completed_at
)
select
  'TEACHER_ID_HERE'::uuid,
  'STUDENT_ID_HERE'::uuid,
  de.id,
  seed.start_at,
  seed.due_at,
  seed.priority,
  seed.status::public.vocabulary_status,
  seed.note,
  seed.start_at,
  case when seed.status = 'completed' then now() else null end
from assignment_seed seed
join public.dictionary_entries de
  on de.normalized_word = seed.normalized_word
 and de.provider = 'manual'
on conflict (teacher_id, student_id, dictionary_entry_id)
do update
set start_at = excluded.start_at,
    due_at = excluded.due_at,
    priority = excluded.priority,
    status = excluded.status,
    note = excluded.note,
    assigned_at = excluded.assigned_at,
    completed_at = excluded.completed_at;

insert into public.notifications (
  user_id,
  actor_id,
  type,
  title,
  message
)
select
  'STUDENT_ID_HERE'::uuid,
  'TEACHER_ID_HERE'::uuid,
  'vocabulary_assigned',
  'Bạn có từ vựng mới',
  format('Giáo viên đã giao cho bạn từ "%s" với mức ưu tiên %s.', de.word, va.priority)
from public.vocabulary_assignments va
join public.dictionary_entries de on de.id = va.dictionary_entry_id
where va.teacher_id = 'TEACHER_ID_HERE'::uuid
  and va.student_id = 'STUDENT_ID_HERE'::uuid
  and de.normalized_word in ('sustainable', 'evidence', 'solution', 'development', 'reduce', 'advantage')
on conflict do nothing;

insert into public.quiz_results (
  user_id,
  score,
  total,
  total_questions,
  correct_count,
  mode,
  source,
  answers
)
values
  (
    'STUDENT_ID_HERE'::uuid,
    7,
    10,
    10,
    7,
    'definition',
    'all',
    '[
      {"question": "evidence", "correctAnswer": "bằng chứng", "selectedAnswer": "bằng chứng", "isCorrect": true},
      {"question": "policy", "correctAnswer": "chính sách", "selectedAnswer": "quy tắc", "isCorrect": false}
    ]'::jsonb
  ),
  (
    'STUDENT_ID_HERE'::uuid,
    4,
    5,
    5,
    4,
    'word',
    'assigned',
    '[
      {"question": "lợi thế", "correctAnswer": "advantage", "selectedAnswer": "advantage", "isCorrect": true}
    ]'::jsonb
  );

-- Query kiểm tra
select id, email, role from public.profiles order by created_at desc;
select count(*) from public.dictionary_entries where provider = 'manual';
select count(*) from public.teacher_vocabulary where teacher_id = 'TEACHER_ID_HERE'::uuid;
select count(*) from public.user_vocabulary where user_id = 'STUDENT_ID_HERE'::uuid;
select count(*) from public.teacher_students where teacher_id = 'TEACHER_ID_HERE'::uuid and student_id = 'STUDENT_ID_HERE'::uuid;
select count(*) from public.vocabulary_assignments where teacher_id = 'TEACHER_ID_HERE'::uuid and student_id = 'STUDENT_ID_HERE'::uuid;
select count(*) from public.notifications where user_id = 'STUDENT_ID_HERE'::uuid and actor_id = 'TEACHER_ID_HERE'::uuid;

select
  uv.id,
  p.email,
  de.word,
  uv.status,
  uv.personal_note
from public.user_vocabulary uv
join public.profiles p on p.id = uv.user_id
join public.dictionary_entries de on de.id = uv.dictionary_entry_id
where uv.user_id = 'STUDENT_ID_HERE'::uuid
order by de.word;

select
  tv.id,
  p.email,
  de.word,
  tv.difficulty,
  tv.note
from public.teacher_vocabulary tv
join public.profiles p on p.id = tv.teacher_id
join public.dictionary_entries de on de.id = tv.dictionary_entry_id
where tv.teacher_id = 'TEACHER_ID_HERE'::uuid
order by de.word;

select
  va.id,
  de.word,
  va.status,
  va.priority,
  va.start_at,
  va.due_at,
  va.note
from public.vocabulary_assignments va
join public.dictionary_entries de on de.id = va.dictionary_entry_id
where va.teacher_id = 'TEACHER_ID_HERE'::uuid
  and va.student_id = 'STUDENT_ID_HERE'::uuid
order by va.due_at nulls last, de.word;

select
  n.id,
  n.title,
  n.message,
  n.created_at
from public.notifications n
where n.user_id = 'STUDENT_ID_HERE'::uuid
order by n.created_at desc;
