import { useState, type FormEvent } from 'react';
import { Avatar } from '../components/avatars/Avatar';
import { AVATAR_DEFINITIONS, type AvatarId } from '../components/avatars/avatarData';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../services/data';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId>((profile?.avatar_id as AvatarId | undefined) ?? 'cat');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    await updateProfile(user.id, { display_name: name.trim(), avatar_id: selectedAvatarId });
    await refreshProfile();
    setMessage('Đã cập nhật hồ sơ.');
  };

  return <div className="page-wrap">
    <div className="page-heading">
      <div>
        <span>User profile</span>
        <h1>Hồ sơ cá nhân</h1>
        <p>Thông tin tài khoản, vai trò và avatar trong hệ thống.</p>
      </div>
    </div>
    <section className="profile-grid profile-avatar-layout">
      <article className="panel profile-summary profile-summary-sticky">
        <div className="profile-big-avatar"><Avatar avatarId={selectedAvatarId} name={name || profile?.display_name} size="lg" /></div>
        <h2>{name || profile?.display_name}</h2>
        <p>{profile?.email}</p>
        <span className="role-pill">{profile?.role}</span>
      </article>
      <form className="panel settings-form profile-settings-form" onSubmit={submit}>
        <label>Họ tên<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>Email<input value={profile?.email ?? ''} disabled /></label>
        <label>Vai trò<input value={profile?.role ?? ''} disabled /></label>
        <div className="avatar-picker">
          <div className="avatar-picker-header">
            <strong>Chọn avatar con vật</strong>
            <span>Bộ sưu tập SVG đồng bộ cho hồ sơ của bạn.</span>
          </div>
          <div className="avatar-picker-body">
            <div className="avatar-picker-grid">
              {AVATAR_DEFINITIONS.map((avatar) => <button key={avatar.id} type="button" className={`avatar-picker-card ${selectedAvatarId === avatar.id ? 'selected' : ''}`} onClick={() => setSelectedAvatarId(avatar.id)}>
                <Avatar avatarId={avatar.id} name={avatar.name} size="lg" className="avatar-picker-preview" />
                <strong>{avatar.name}</strong>
              </button>)}
            </div>
          </div>
        </div>
        {message && <div className="form-message">{message}</div>}
        <button className="button primary">Lưu thay đổi</button>
      </form>
    </section>
  </div>;
}

// ponytail: keep the profile split in one page; extract a dedicated avatar settings component only if the page grows further.
