import { useEffect, useState, type FormEvent } from 'react';
import { BookOpen, Copy, Plus, Trash2, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createCourse, createLesson, deleteCourse, joinCourse, listCourses, listLessons } from '../services/courses';
import type { Course, Lesson } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

export function CoursesPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [lessonTitle, setLessonTitle] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true); setError('');
    try {
      const courseData = await listCourses();
      setCourses(courseData);
      const lessonPairs = await Promise.all(courseData.map(async (course) => [course.id, await listLessons(course.id)] as const));
      setLessons(Object.fromEntries(lessonPairs));
    } catch (err) { setError(err instanceof Error ? err.message : 'Không tải được khóa học.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submitCourse = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await createCourse({ title: title.trim(), description: description.trim(), cover_color: '#1769ff' });
    setTitle(''); setDescription(''); await load();
  };
  const submitJoin = async (event: FormEvent) => {
    event.preventDefault();
    await joinCourse(joinCode); setJoinCode(''); await load();
  };
  const addLesson = async (courseId: string) => {
    const value = lessonTitle[courseId]?.trim(); if (!value) return;
    await createLesson(courseId, value, 'Bài học mới');
    setLessonTitle((current) => ({ ...current, [courseId]: '' })); await load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Course workspace</span><h1>Khóa học</h1><p>{profile?.role === 'teacher' ? 'Tạo khóa học và bài học cho học viên.' : 'Tham gia khóa học bằng mã do giáo viên cung cấp.'}</p></div></div>
    {profile?.role === 'teacher' ? <form className="inline-form panel" onSubmit={submitCourse}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên khóa học" required /><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn" /><button className="button primary"><Plus size={18} /> Tạo khóa học</button></form> : <form className="inline-form panel" onSubmit={submitJoin}><input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Nhập mã khóa học" required /><button className="button primary"><Users size={18} /> Tham gia</button></form>}
    {courses.length ? <section className="course-grid">{courses.map((course) => <article className="course-card" key={course.id}><div className="course-cover"><BookOpen size={36} /></div><h3>{course.title}</h3><p>{course.description || 'Chưa có mô tả.'}</p><div className="course-code"><span>Mã: {course.join_code}</span><button className="icon-button" onClick={() => navigator.clipboard.writeText(course.join_code)} aria-label="Sao chép mã"><Copy size={16} /></button></div><div className="lesson-list">{(lessons[course.id] ?? []).map((lesson) => <div key={lesson.id}><span>{lesson.position}. {lesson.title}</span></div>)}</div>{profile?.role === 'teacher' && <><div className="mini-form"><input value={lessonTitle[course.id] ?? ''} onChange={(e) => setLessonTitle((current) => ({ ...current, [course.id]: e.target.value }))} placeholder="Tên bài học mới" /><button className="button secondary" onClick={() => void addLesson(course.id)}>Thêm bài</button></div><button className="danger-link" onClick={async () => { if (confirm('Xóa khóa học này?')) { await deleteCourse(course.id); await load(); } }}><Trash2 size={15} /> Xóa khóa học</button></>}</article>)}</section> : <EmptyState title="Chưa có khóa học" description={profile?.role === 'teacher' ? 'Tạo khóa học đầu tiên để bắt đầu.' : 'Nhập mã để tham gia khóa học.'} />}
  </div>;
}
