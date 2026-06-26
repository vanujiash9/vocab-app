import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../services/data';

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [goal, setGoal] = useState(profile?.daily_goal ?? 20);
  const [reminder, setReminder] = useState(profile?.reminder_enabled ?? true);
  const [message, setMessage] = useState('');
  const save = async () => {
    if (!user) return;
    await updateProfile(user.id, { daily_goal: goal, reminder_enabled: reminder });
    await refreshProfile(); setMessage('Đã lưu cài đặt.');
  };
  return <div className="page-wrap"><div className="page-heading"><div><span>Preferences</span><h1>Cài đặt học tập</h1><p>Điều chỉnh mục tiêu và nhắc học. Giao diện sử dụng cố định tone xanh dương–trắng.</p></div></div><section className="settings-grid"><article className="panel"><div className="panel-heading"><div><h3>Mục tiêu mỗi ngày</h3><p>Số từ bạn muốn học hoặc ôn trong một ngày.</p></div></div><label className="range-label"><input type="range" min="5" max="100" step="5" value={goal} onChange={(e) => setGoal(Number(e.target.value))} /><strong>{goal} từ/ngày</strong></label></article><article className="panel"><div className="setting-row"><div><strong>Daily reminder</strong><span>Nhắc bạn quay lại học mỗi ngày.</span></div><label className="switch"><input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} /><i /></label></div></article></section>{message && <div className="form-message standalone">{message}</div>}<button className="button primary" onClick={() => void save()}>Lưu cài đặt</button></div>;
}
