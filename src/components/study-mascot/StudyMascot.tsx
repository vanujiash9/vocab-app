import { useMemo, useState } from 'react';
import type { MascotVariant } from '../../types';
import './study-mascot.css';

export const MASCOT_STORAGE_KEY = 'selected_mascot_variant';

interface MascotOption {
  value: MascotVariant;
  title: string;
  label: string;
  desc: string;
  embedUrl: string;
  pageUrl: string;
  authorName: string;
  authorUrl: string;
}

interface StudyMascotProps {
  message?: string;
  variant?: MascotVariant;
  compact?: boolean;
  expression?: string;
}

interface MascotPickerProps {
  value: MascotVariant;
  onChange: (value: MascotVariant) => void;
}

/**
 * Every mascot is a real 3D model embedded via Sketchfab's official iframe
 * embed. Keep author + Sketchfab credit visible next to the hero stage
 * (required by Sketchfab's embed attribution).
 */
export const MASCOT_OPTIONS: MascotOption[] = [
  {
    value: 'dog',
    title: 'Cute Dog',
    label: 'Cún con',
    desc: 'Vui vẻ, thân thiện',
    embedUrl: 'https://sketchfab.com/models/fb6d36ebd49a47f0b2631ba843a9f2f2/embed',
    pageUrl: 'https://sketchfab.com/3d-models/cute-dog-fb6d36ebd49a47f0b2631ba843a9f2f2',
    authorName: 'CG_Anim_Hub',
    authorUrl: 'https://sketchfab.com/CG_Anim_Hub',
  },
  {
    value: 'cat_knight',
    title: 'Cat Knight',
    label: 'Hiệp sĩ mèo',
    desc: 'Dũng cảm, oai phong',
    embedUrl: 'https://sketchfab.com/models/4a1abd78862d472d9328d39688f206cc/embed',
    pageUrl: 'https://sketchfab.com/3d-models/cat-knight-4a1abd78862d472d9328d39688f206cc',
    authorName: 'Slo-mo Witch',
    authorUrl: 'https://sketchfab.com/SloMoWitch',
  },
  {
    value: 'korok',
    title: 'Rainy Korok :(',
    label: 'Korok mưa',
    desc: 'Nhút nhát, dễ thương',
    embedUrl: 'https://sketchfab.com/models/1969a8dcb90e49a28bc5eedc24df653b/embed',
    pageUrl: 'https://sketchfab.com/3d-models/rainy-korok-1969a8dcb90e49a28bc5eedc24df653b',
    authorName: 'libblekibble',
    authorUrl: 'https://sketchfab.com/libblekibble',
  },
  {
    value: 'kitsune',
    title: 'Three-Tailed Kitsune',
    label: 'Hồ ly ba đuôi',
    desc: 'Huyền bí, tinh nghịch',
    embedUrl: 'https://sketchfab.com/models/42a72cb2439f4aed8ff278524d03d3d2/embed',
    pageUrl: 'https://sketchfab.com/3d-models/three-tailed-kitsune-42a72cb2439f4aed8ff278524d03d3d2',
    authorName: 'Pedro Braz',
    authorUrl: 'https://sketchfab.com/pedrobrz13',
  },
  {
    value: 'cute_fox',
    title: 'Cute Fox',
    label: 'Cáo nhỏ',
    desc: 'Lanht lợi, đáng yêu',
    embedUrl: 'https://sketchfab.com/models/d39618c316db4b3fa80c795c9b87b0db/embed',
    pageUrl: 'https://sketchfab.com/3d-models/cute-fox-d39618c316db4b3fa80c795c9b87b0db?utm_medium=embed&utm_campaign=share-popup&utm_content=d39618c316db4b3fa80c795c9b87b0db',
    authorName: 'art_foxy',
    authorUrl: 'https://sketchfab.com/art_foxy?utm_medium=embed&utm_campaign=share-popup&utm_content=d39618c316db4b3fa80c795c9b87b0db',
  },
  {
    value: 'hirono',
    title: 'HIRONO CUTE',
    label: 'Hirono cute',
    desc: 'Nhẹ nhàng, mơ màng',
    embedUrl: 'https://sketchfab.com/models/2644e441c0a643ebbdd7c127d459381f/embed',
    pageUrl: 'https://sketchfab.com/3d-models/hirono-cute-2644e441c0a643ebbdd7c127d459381f?utm_medium=embed&utm_campaign=share-popup&utm_content=2644e441c0a643ebbdd7c127d459381f',
    authorName: 'milkydariana',
    authorUrl: 'https://sketchfab.com/milkydariana?utm_medium=embed&utm_campaign=share-popup&utm_content=2644e441c0a643ebbdd7c127d459381f',
  },
  {
    value: 'molly',
    title: 'Molly Cottontail',
    label: 'Thỏ Molly',
    desc: 'Êm ái, dịu dàng',
    embedUrl: 'https://sketchfab.com/models/01b8410e65cf4b62b5f1e89386bf1b1f/embed',
    pageUrl: 'https://sketchfab.com/3d-models/molly-cottontail-01b8410e65cf4b62b5f1e89386bf1b1f?utm_medium=embed&utm_campaign=share-popup&utm_content=01b8410e65cf4b62b5f1e89386bf1b1f',
    authorName: 'Gilimaster28',
    authorUrl: 'https://sketchfab.com/giladjacob10?utm_medium=embed&utm_campaign=share-popup&utm_content=01b8410e65cf4b62b5f1e89386bf1b1f',
  },
  {
    value: 'vanellope',
    title: 'Disney Infinity Vanellope Von Schweetz',
    label: 'Vanellope',
    desc: 'Tinh nghịch, rực rỡ',
    embedUrl: 'https://sketchfab.com/models/7d25358699074ee5b99d2ee38f3a401d/embed',
    pageUrl: 'https://sketchfab.com/3d-models/disney-infinity-vanellope-von-schweetz-7d25358699074ee5b99d2ee38f3a401d?utm_medium=embed&utm_campaign=share-popup&utm_content=7d25358699074ee5b99d2ee38f3a401d',
    authorName: 'Neut2000',
    authorUrl: 'https://sketchfab.com/Neut2000?utm_medium=embed&utm_campaign=share-popup&utm_content=7d25358699074ee5b99d2ee38f3a401d',
  },
];

const DEFAULT_MASCOT: MascotVariant = 'dog';
const AUTOPLAY_PARAMS = new URLSearchParams({
  autostart: '1',
  ui_infos: '0',
  ui_inspector: '0',
  ui_hint: '0',
  ui_stop: '0',
  ui_watermark_link: '0',
});

function getMascotOption(variant?: MascotVariant) {
  return MASCOT_OPTIONS.find((item) => item.value === variant) ?? MASCOT_OPTIONS[0];
}

function buildEmbedUrl(url: string): string {
  const embedUrl = new URL(url);
  AUTOPLAY_PARAMS.forEach((value, key) => embedUrl.searchParams.set(key, value));
  return embedUrl.toString();
}

export function isMascotVariant(value: string): value is MascotVariant {
  return MASCOT_OPTIONS.some((item) => item.value === value);
}

export function StudyMascot({
  message = 'Cùng học từ mới nhé!',
  variant = DEFAULT_MASCOT,
  compact = false,
  expression: _expression,
}: StudyMascotProps) {
  const mascot = getMascotOption(variant);

  return (
    <div
      className={`study-mascot-stage ${compact ? 'is-compact' : ''}`}
      aria-label={`Mascot học tập: ${mascot.label}`}
    >
      {!compact ? <div className="study-mascot-message">{message}</div> : null}

      <div className="mascot-ground" />

      <div className="study-mascot-dog-frame">
        <iframe
          key={mascot.value}
          title={mascot.title}
          src={buildEmbedUrl(mascot.embedUrl)}
          frameBorder={0}
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
        />
      </div>

      {!compact ? (
        <p className="study-mascot-dog-credit">
          <a href={mascot.pageUrl} target="_blank" rel="noreferrer nofollow">
            {mascot.title}
          </a>{' '}
          by{' '}
          <a href={mascot.authorUrl} target="_blank" rel="noreferrer nofollow">
            {mascot.authorName}
          </a>{' '}
          on Sketchfab
        </p>
      ) : null}
    </div>
  );
}

export function MascotPicker({ value, onChange }: MascotPickerProps) {
  return (
    <div className="mascot-picker">
      {MASCOT_OPTIONS.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            className={`mascot-option ${active ? 'is-active' : ''}`}
            onClick={() => onChange(item.value)}
          >
            <div className="mascot-option-preview">
              <iframe
                title={item.title}
                src={buildEmbedUrl(item.embedUrl)}
                frameBorder={0}
                loading="lazy"
                tabIndex={-1}
              />
            </div>

            <div className="mascot-option-info">
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </div>

            {active ? <div className="mascot-selected-chip">Đang chọn</div> : null}
          </button>
        );
      })}
    </div>
  );
}

export function LearningPreferencesPage() {
  const [dailyGoal, setDailyGoal] = useState(20);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [selectedMascot, setSelectedMascot] = useState<MascotVariant>('dog');

  const selectedLabel = useMemo(() => getMascotOption(selectedMascot).label, [selectedMascot]);

  return (
    <main className="preferences-page">
      <section className="preferences-hero">
        <div>
          <p className="preferences-kicker">Preferences</p>
          <h1>Cài đặt học tập</h1>
          <p>Điều chỉnh mục tiêu, nhắc học và chọn nhân vật đồng hành.</p>
        </div>

        <div className="preferences-hero-mascot">
          <StudyMascot variant={selectedMascot} message={`Mình là ${selectedLabel}, cùng học hôm nay nha!`} />
        </div>
      </section>

      <section className="preferences-grid">
        <div className="settings-card goal-card">
          <div className="settings-card-header">
            <div>
              <h2>Mục tiêu mỗi ngày</h2>
              <p>Số từ bạn muốn học hoặc ôn trong một ngày.</p>
            </div>
            <strong>{dailyGoal} từ/ngày</strong>
          </div>

          <input
            className="goal-slider"
            type="range"
            min={5}
            max={80}
            step={5}
            value={dailyGoal}
            onChange={(event) => setDailyGoal(Number(event.target.value))}
          />
        </div>

        <div className="settings-card reminder-card">
          <div>
            <h2>Daily reminder</h2>
            <p>Nhắc bạn quay lại học mỗi ngày.</p>
          </div>

          <button
            type="button"
            className={`switch ${dailyReminder ? 'is-on' : ''}`}
            onClick={() => setDailyReminder((current) => !current)}
            aria-pressed={dailyReminder}
          >
            <span />
          </button>
        </div>

        <div className="settings-card mascot-card">
          <div className="settings-card-title">
            <h2>Chọn nhân vật</h2>
            <p>Mỗi nhân vật là một model 3D thật, chọn bé bạn thích nhất.</p>
          </div>

          <MascotPicker value={selectedMascot} onChange={setSelectedMascot} />
        </div>
      </section>
    </main>
  );
}
