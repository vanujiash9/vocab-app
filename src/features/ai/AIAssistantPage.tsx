import { useAuth } from '../../contexts/AuthContext';
import { LoadingState } from '../../components/PageState';
import { StudentAIStudyCard } from './StudentAIStudyCard';
import { TeacherAIWordSetCard } from './TeacherAIWordSetCard';

export function AIAssistantPage() {
  const { profile, loading } = useAuth();

  if (loading || !profile) return <LoadingState />;

  return <div className="page-wrap">
    <div className="page-heading">
      <div>
        <span>AI assistant</span>
        <h1>Trợ lý AI</h1>
        <p>Gợi ý học tập và sắp xếp bộ từ bằng dữ liệu thật từ Supabase, không tự thay đổi dữ liệu của bạn.</p>
      </div>
    </div>
    {profile.role === 'teacher' ? <TeacherAIWordSetCard /> : <StudentAIStudyCard />}
  </div>;
}
