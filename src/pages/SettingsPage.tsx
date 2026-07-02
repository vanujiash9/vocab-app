import { useEffect, useMemo, useState } from 'react';
import { MASCOT_OPTIONS, MASCOT_STORAGE_KEY, MascotPicker, StudyMascot } from '../components/study-mascot/StudyMascot';
import type { MascotVariant } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../services/profile';

const DEFAULT_MASCOT: MascotVariant = 'dog';

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [goal, setGoal] = useState(profile?.daily_goal ?? 20);
  const [reminder, setReminder] = useState(profile?.reminder_enabled ?? true);
  const [mascotVariant, setMascotVariant] = useState<MascotVariant>(profile?.mascot_variant ?? DEFAULT_MASCOT);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setGoal(profile?.daily_goal ?? 20);
    setReminder(profile?.reminder_enabled ?? true);
    setMascotVariant(profile?.mascot_variant ?? DEFAULT_MASCOT);
  }, [profile?.daily_goal, profile?.mascot_variant, profile?.reminder_enabled]);

  const mascotMessage = useMemo(() => {
    if (mascotVariant === 'cat_knight') return 'Hiệp sĩ mèo sẽ đồng hành cùng bạn!';
    if (mascotVariant === 'korok') return 'Korok mưa cũng sẵn sàng học rồi đó.';
    if (mascotVariant === 'kitsune') return 'Hồ ly ba đuôi sẽ tiếp sức cho bạn hôm nay.';
    if (mascotVariant === 'cute_fox') return 'Cáo nhỏ lanh lợi đã sẵn sàng học cùng bạn rồi!';
    if (mascotVariant === 'hirono') return 'Hirono cute sẽ ngồi cạnh bạn và học thật chill nhé.';
    if (mascotVariant === 'molly') return 'Molly Cottontail sẽ nhẹ nhàng nhắc bạn ôn từng chút một.';
    if (mascotVariant === 'vanellope') return 'Vanellope tới rồi, mình tăng tốc học vui vui nào!';
    return 'Cún con sẽ cùng bạn chinh phục từ mới!';
  }, [mascotVariant]);

  const save = async () => {
    if (!user) return;
    try {
      await updateProfile(user.id, {
        daily_goal: goal,
        reminder_enabled: reminder,
        mascot_variant: mascotVariant,
      });
      localStorage.setItem(MASCOT_STORAGE_KEY, mascotVariant);
      await refreshProfile();
      setMessage('Đã lưu cài đặt.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không lưu được cài đặt.');
    }
  };

  return <div className="page-wrap preferences-page">
    <div className="page-heading preferences-hero">
      <div>
        <span className="preferences-kicker">Preferences</span>
        <h1>Cài đặt học tập</h1>
        <p>Điều chỉnh mục tiêu, nhắc học và chọn nhân vật đồng hành cho trang chính của bạn.</p>
      </div>
      <div className="preferences-hero-mascot">
        <StudyMascot variant={mascotVariant} message={mascotMessage} />
      </div>
    </div>

    <section className="preferences-grid settings-grid">
      <article className="settings-card panel goal-card">
        <div className="settings-card-header">
          <div>
            <h2>Mục tiêu mỗi ngày</h2>
            <p>Số từ bạn muốn học hoặc ôn trong một ngày.</p>
          </div>
          <strong>{goal} từ/ngày</strong>
        </div>
        <input className="goal-slider" type="range" min="5" max="100" step="5" value={goal} onChange={(e) => setGoal(Number(e.target.value))} />
      </article>

      <article className="settings-card panel reminder-card">
        <div>
          <h2>Daily reminder</h2>
          <p>Nhắc bạn quay lại học mỗi ngày.</p>
        </div>
        <button type="button" className={`switch ${reminder ? 'is-on' : ''}`} onClick={() => setReminder((current) => !current)} aria-pressed={reminder}>
          <span />
        </button>
      </article>

      <article className="settings-card panel mascot-card">
        <div className="settings-card-header settings-card-title">
          <div>
            <h2>Chọn nhân vật</h2>
            <p>Chọn mascot 3D hiển thị ở trang chính. Thẻ full-width nhưng vẫn giữ bố cục gọn và nhẹ mắt.</p>
          </div>
          <strong>{MASCOT_OPTIONS.length} mẫu</strong>
        </div>
        <MascotPicker value={mascotVariant} onChange={setMascotVariant} />
      </article>
    </section>

    {message && <div className="form-message standalone">{message}</div>}
    <button className="button primary" onClick={() => void save()}>Lưu cài đặt</button>
  </div>;
}
