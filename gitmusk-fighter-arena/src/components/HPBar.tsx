interface HPBarProps {
  hp: number;
  maxHp: number;
  name: string;
  side: 'left' | 'right';
  color: string;
  rage?: number;
  specialHits?: number;
  specialReady?: boolean;
}

export function HPBar({ hp, maxHp, name, side, color, rage = 0, specialHits = 0, specialReady = false }: HPBarProps) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const ragePct = Math.min(100, rage);
  const barColor = pct > 50 ? color : pct > 25 ? '#ffaa00' : '#ff0040';

  return (
    <div className={`flex-1 min-w-0 ${side === 'right' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
      <span className="font-pixel truncate w-full"
        style={{ fontSize: 'clamp(6px, 1.5vw, 11px)', color, textShadow: `0 0 8px ${color}`, textAlign: side === 'right' ? 'right' : 'left' }}>
        {name.toUpperCase().slice(0, 12)}
      </span>

      {/* HP bar */}
      <div className="w-full bg-black border border-gray-700 relative overflow-hidden" style={{ height: 'clamp(10px, 2.5vw, 16px)' }}>
        <div
          className="h-full transition-all duration-100"
          style={{
            width: `${pct}%`,
            background: barColor,
            boxShadow: `0 0 8px ${barColor}`,
            float: side === 'right' ? 'right' : 'left',
          }}
        />
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0 w-px bg-black opacity-40"
            style={{ left: `${(i + 1) * 10}%` }} />
        ))}
      </div>

      {/* Rage bar */}
      <div className="w-full h-1.5 bg-black border border-gray-800 overflow-hidden">
        <div className="h-full transition-all duration-200"
          style={{
            width: `${ragePct}%`,
            background: ragePct >= 100
              ? 'linear-gradient(90deg, #ff6600, #ffff00)'
              : 'linear-gradient(90deg, #440000, #ff3300)',
            boxShadow: ragePct >= 100 ? '0 0 6px #ff6600' : 'none',
          }}
        />
      </div>

      {/* Special hit counter */}
      <div className={`flex items-center gap-0.5 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="font-pixel hidden sm:inline" style={{ fontSize: '5px', color: '#555' }}>SP</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}
            className="rounded-sm transition-all duration-150"
            style={{
              width: 'clamp(8px, 2vw, 12px)',
              height: 'clamp(8px, 2vw, 12px)',
              background: i < specialHits ? color : '#0d001a',
              border: `1px solid ${i < specialHits ? color : '#2a0050'}`,
              boxShadow: i < specialHits ? `0 0 5px ${color}` : 'none',
              transform: specialReady && i < 5 ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
        {specialReady && (
          <span className="font-pixel animate-pulse ml-0.5"
            style={{ color: '#ffff00', fontSize: '5px', textShadow: '0 0 6px #ffff00' }}>
            READY!
          </span>
        )}
      </div>

      <span className="font-mono hidden sm:block" style={{ fontSize: 'clamp(8px,1.5vw,10px)', color: ragePct >= 100 ? '#ffff00' : '#555' }}>
        {ragePct >= 100 ? '⚡ RAGE' : `RAGE ${Math.floor(ragePct)}%`}
      </span>
    </div>
  );
}
