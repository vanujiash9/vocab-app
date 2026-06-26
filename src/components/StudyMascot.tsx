import { useEffect, useState } from 'react';

type Expression = 'happy' | 'thinking' | 'surprised';

export function StudyMascot({ message = 'Cùng học từ mới nhé!', expression = 'happy' }: { message?: string; expression?: Expression }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mascot-stage" aria-label="Trợ lý học tập 3D">
      <div className="mascot-glow" />
      <div className="mascot-speech">{message}</div>
      <div className={`mascot mascot-${expression}`}>
        <div className="mascot-ear left" />
        <div className="mascot-ear right" />
        <div className="mascot-head">
          <div className={`mascot-eye left ${blink ? 'blink' : ''}`}><i /></div>
          <div className={`mascot-eye right ${blink ? 'blink' : ''}`}><i /></div>
          <div className="mascot-cheek left" />
          <div className="mascot-cheek right" />
          <div className="mascot-mouth" />
        </div>
        <div className="mascot-body"><span>A+</span></div>
        <div className="mascot-arm left" />
        <div className="mascot-arm right" />
        <div className="mascot-foot left" />
        <div className="mascot-foot right" />
      </div>
    </div>
  );
}
