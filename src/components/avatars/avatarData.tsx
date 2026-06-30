import type { CSSProperties, ReactNode } from 'react';

export type AvatarId = 'cat' | 'dog' | 'rabbit' | 'bear' | 'fox' | 'panda' | 'frog' | 'shiba' | 'penguin' | 'hamster';

export interface AvatarPalette {
  background: string;
  face: string;
  inner: string;
  accent: string;
  blush: string;
  nose: string;
  eye: string;
}

export interface AvatarDefinition {
  id: AvatarId;
  name: string;
  palette: AvatarPalette;
  renderFace: (palette: AvatarPalette) => ReactNode;
}

const SHARED_SVG_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
};

function FaceBase({ palette, children }: { palette: AvatarPalette; children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" style={SHARED_SVG_STYLE}>
      <rect x="4" y="4" width="56" height="56" rx="20" fill={palette.background} />
      {children}
      <circle cx="24" cy="34" r="2.6" fill={palette.blush} opacity="0.72" />
      <circle cx="40" cy="34" r="2.6" fill={palette.blush} opacity="0.72" />
      <circle cx="25.5" cy="30" r="2.2" fill={palette.eye} />
      <circle cx="38.5" cy="30" r="2.2" fill={palette.eye} />
      <ellipse cx="32" cy="36" rx="3.1" ry="2.2" fill={palette.nose} />
      <path d="M28 39c1.3 2.2 3 3.2 4 3.2s2.7-1 4-3.2" fill="none" stroke={palette.nose} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function CatFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <path d="M17 24l4-11 9 8" fill={palette.face} />
      <path d="M47 24l-4-11-9 8" fill={palette.face} />
      <path d="M21 18.5l1.8-4.2 4.1 4" fill={palette.inner} />
      <path d="M43 18.5l-1.8-4.2-4.1 4" fill={palette.inner} />
      <circle cx="32" cy="31" r="16" fill={palette.face} />
    </FaceBase>
  );
}

function DogFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <ellipse cx="21" cy="22" rx="6" ry="10" fill={palette.accent} transform="rotate(-18 21 22)" />
      <ellipse cx="43" cy="22" rx="6" ry="10" fill={palette.accent} transform="rotate(18 43 22)" />
      <circle cx="32" cy="31" r="16" fill={palette.face} />
      <ellipse cx="32" cy="37" rx="8.5" ry="6.8" fill={palette.inner} />
    </FaceBase>
  );
}

function RabbitFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <rect x="21" y="8" width="7" height="18" rx="3.5" fill={palette.face} />
      <rect x="36" y="8" width="7" height="18" rx="3.5" fill={palette.face} />
      <rect x="23" y="11" width="3" height="12" rx="1.5" fill={palette.inner} />
      <rect x="38" y="11" width="3" height="12" rx="1.5" fill={palette.inner} />
      <circle cx="32" cy="32" r="15.5" fill={palette.face} />
    </FaceBase>
  );
}

function BearFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <circle cx="21" cy="20" r="6.5" fill={palette.face} />
      <circle cx="43" cy="20" r="6.5" fill={palette.face} />
      <circle cx="21" cy="20" r="3.2" fill={palette.inner} />
      <circle cx="43" cy="20" r="3.2" fill={palette.inner} />
      <circle cx="32" cy="31" r="16" fill={palette.face} />
      <ellipse cx="32" cy="36.5" rx="7.8" ry="6.4" fill={palette.inner} />
    </FaceBase>
  );
}

function FoxFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <path d="M18 23l5-11 8 9" fill={palette.face} />
      <path d="M46 23l-5-11-8 9" fill={palette.face} />
      <path d="M22 18l1.6-3.8 3.6 4" fill={palette.inner} />
      <path d="M42 18l-1.6-3.8-3.6 4" fill={palette.inner} />
      <path d="M32 16c10.5 0 17 8 16 16.8-.8 6.8-7 13.2-16 13.2s-15.2-6.4-16-13.2C15 24 21.5 16 32 16z" fill={palette.face} />
      <path d="M22 38c2.8-5.8 7-8.2 10-8.2s7.2 2.4 10 8.2c-2.3 3.8-5.8 6.1-10 6.1s-7.7-2.3-10-6.1z" fill={palette.inner} />
    </FaceBase>
  );
}

function PandaFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <circle cx="21" cy="20" r="6.5" fill={palette.accent} />
      <circle cx="43" cy="20" r="6.5" fill={palette.accent} />
      <circle cx="32" cy="31" r="16" fill={palette.face} />
      <ellipse cx="25.5" cy="29.8" rx="5.1" ry="6.4" fill={palette.accent} />
      <ellipse cx="38.5" cy="29.8" rx="5.1" ry="6.4" fill={palette.accent} />
      <ellipse cx="32" cy="36.5" rx="7.5" ry="6.1" fill={palette.inner} />
    </FaceBase>
  );
}

function FrogFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <circle cx="24" cy="20" r="6.2" fill={palette.face} />
      <circle cx="40" cy="20" r="6.2" fill={palette.face} />
      <circle cx="24" cy="20" r="3.2" fill={palette.inner} />
      <circle cx="40" cy="20" r="3.2" fill={palette.inner} />
      <circle cx="32" cy="33" r="15.5" fill={palette.face} />
      <path d="M24 39c2 1.9 4.8 2.8 8 2.8s6-1 8-2.8" fill="none" stroke={palette.nose} strokeWidth="2.1" strokeLinecap="round" />
    </FaceBase>
  );
}

function ShibaFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <path d="M18 23l5-10.5 7.6 8.6" fill={palette.face} />
      <path d="M46 23l-5-10.5-7.6 8.6" fill={palette.face} />
      <circle cx="32" cy="31" r="16" fill={palette.face} />
      <path d="M21.5 37.2c2.6-5 6.3-7.1 10.5-7.1s7.9 2.1 10.5 7.1c-2.4 3.8-6.1 6.3-10.5 6.3s-8.1-2.5-10.5-6.3z" fill={palette.inner} />
      <path d="M22.8 24c1.8-2.2 4-3.3 6.4-3.3s4.6 1.1 6.4 3.3" fill="none" stroke={palette.inner} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28.5 24c1.8-2.2 4-3.3 6.4-3.3s4.6 1.1 6.4 3.3" fill="none" stroke={palette.inner} strokeWidth="2.2" strokeLinecap="round" />
    </FaceBase>
  );
}

function PenguinFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <ellipse cx="32" cy="32" rx="17" ry="18" fill={palette.face} />
      <ellipse cx="32" cy="35" rx="12" ry="14" fill={palette.inner} />
      <path d="M32 34l4 4h-8z" fill={palette.accent} />
      <path d="M22.5 21.5c2.4-2 5.7-3 9.5-3s7.1 1 9.5 3" fill="none" stroke={palette.face} strokeWidth="2.4" strokeLinecap="round" />
    </FaceBase>
  );
}

function HamsterFace(palette: AvatarPalette) {
  return (
    <FaceBase palette={palette}>
      <circle cx="21" cy="21" r="6.3" fill={palette.face} />
      <circle cx="43" cy="21" r="6.3" fill={palette.face} />
      <circle cx="21" cy="21" r="3.1" fill={palette.inner} />
      <circle cx="43" cy="21" r="3.1" fill={palette.inner} />
      <circle cx="32" cy="31" r="16" fill={palette.face} />
      <ellipse cx="26" cy="38.5" rx="5.5" ry="5.8" fill={palette.inner} />
      <ellipse cx="38" cy="38.5" rx="5.5" ry="5.8" fill={palette.inner} />
    </FaceBase>
  );
}

export const AVATAR_DEFINITIONS: AvatarDefinition[] = [
  {
    id: 'cat',
    name: 'Mèo',
    palette: { background: '#e7f0ff', face: '#f6c89f', inner: '#ffd9ba', accent: '#d48b5b', blush: '#f7b6bc', nose: '#8d5b45', eye: '#243b63' },
    renderFace: CatFace,
  },
  {
    id: 'dog',
    name: 'Chó',
    palette: { background: '#eef4ff', face: '#f2d2a9', inner: '#fff1de', accent: '#b17a4c', blush: '#f6bcc4', nose: '#7f543e', eye: '#26375a' },
    renderFace: DogFace,
  },
  {
    id: 'rabbit',
    name: 'Thỏ',
    palette: { background: '#f1ecff', face: '#ffffff', inner: '#ffd5e8', accent: '#dbcdf9', blush: '#ffc3d1', nose: '#a36a83', eye: '#2a3550' },
    renderFace: RabbitFace,
  },
  {
    id: 'bear',
    name: 'Gấu',
    palette: { background: '#f7efe5', face: '#b7835d', inner: '#efd4bc', accent: '#8f6245', blush: '#efb4b8', nose: '#5c3e31', eye: '#2c2c38' },
    renderFace: BearFace,
  },
  {
    id: 'fox',
    name: 'Cáo',
    palette: { background: '#fff1e8', face: '#f29a52', inner: '#fff5ec', accent: '#c96b2f', blush: '#f4b7bc', nose: '#73483a', eye: '#243550' },
    renderFace: FoxFace,
  },
  {
    id: 'panda',
    name: 'Gấu trúc',
    palette: { background: '#f2f6fb', face: '#fffefe', inner: '#eef1f5', accent: '#2f3441', blush: '#f2b9c1', nose: '#343948', eye: '#1f2430' },
    renderFace: PandaFace,
  },
  {
    id: 'frog',
    name: 'Ếch',
    palette: { background: '#e7f8e7', face: '#8bd37f', inner: '#f5fff0', accent: '#5ca65a', blush: '#f1b1c1', nose: '#447a49', eye: '#243f34' },
    renderFace: FrogFace,
  },
  {
    id: 'shiba',
    name: 'Shiba',
    palette: { background: '#fff4e8', face: '#d9874b', inner: '#fff6ef', accent: '#ab6538', blush: '#f3b8bc', nose: '#6d4638', eye: '#223550' },
    renderFace: ShibaFace,
  },
  {
    id: 'penguin',
    name: 'Chim cánh cụt',
    palette: { background: '#eaf3ff', face: '#2d3d59', inner: '#fbfdff', accent: '#f2b35c', blush: '#f4b9c0', nose: '#25334d', eye: '#1d2433' },
    renderFace: PenguinFace,
  },
  {
    id: 'hamster',
    name: 'Hamster',
    palette: { background: '#fff1dc', face: '#e3b178', inner: '#ffe7cf', accent: '#c78958', blush: '#f5b5bb', nose: '#81553f', eye: '#2a3656' },
    renderFace: HamsterFace,
  },
];

export const DEFAULT_AVATAR_ID: AvatarId = 'cat';

export function isAvatarId(value: string | null | undefined): value is AvatarId {
  return AVATAR_DEFINITIONS.some((avatar) => avatar.id === value);
}

export function getAvatarDefinition(avatarId: string | null | undefined): AvatarDefinition {
  return AVATAR_DEFINITIONS.find((avatar) => avatar.id === avatarId) ?? AVATAR_DEFINITIONS[0];
}
