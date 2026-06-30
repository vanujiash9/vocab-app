import { getAvatarDefinition } from './avatarData';

interface AvatarProps {
  avatarId: string | null | undefined;
  name: string | null | undefined;
  size?: 'sm' | 'lg';
  className?: string;
}

function buildInitials(name: string | null | undefined): string {
  const value = name?.trim();
  if (!value) return 'UV';

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function Avatar({ avatarId, name, size = 'sm', className = '' }: AvatarProps) {
  const avatar = getAvatarDefinition(avatarId);
  const classes = ['app-avatar', `app-avatar-${size}`, className].filter(Boolean).join(' ');
  const initials = buildInitials(name);

  return (
    <div className={classes} aria-label={`Avatar của ${name ?? 'người dùng'}`} title={avatar.name}>
      <div className="app-avatar-art">{avatar.renderFace(avatar.palette)}</div>
      <span className="app-avatar-fallback">{initials}</span>
    </div>
  );
}
