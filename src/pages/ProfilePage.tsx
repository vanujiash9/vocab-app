import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../services/data';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!user) return;
    await updateProfile(user.id, { display_name: name.trim() });
    await refreshProfile(); setMessage('Đã cập nhật hồ sơ.');
  };
  return <div className="page-wrap"><div className="page-heading"><div><span>User profile</span><h1>Hồ sơ cá nhân</h1><p>Thông tin tài khoản và vai trò trong hệ thống.</p></div></div><section className="profile-grid"><article className="panel profile-summary"><div className="profile-big-avatar">{profile?.display_name?.slice(0,2).toUpperCase()}</div><h2>{profile?.display_name}</h2><p>{profile?.email}</p><span className="role-pill">{profile?.role}</span></article><form className="panel settings-form" onSubmit={submit}><label>Họ tên<input value={name} onChange={(e) => setName(e.target.value)} required /></label><label>Email<input value={profile?.email ?? ''} disabled /></label><label>Vai trò<input value={profile?.role ?? ''} disabled /></label>{message && <div className="form-message">{message}</div>}<button className="button primary">Lưu thay đổi</button></form></section></div>;
}
