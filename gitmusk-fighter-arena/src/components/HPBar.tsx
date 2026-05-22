interface HPBarProps {
  hp: number;
  maxHp: number;
  name: string;
  side: 'left' | 'right';
  color: string;
  rage?: number;
}

export function HPBar({ hp, maxHp, name, side, color, rage = 0 }: HPBarProps) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const ragePct = Math.min(100, rage);

  const barColor = pct > 50 ? color : pct > 25 ? '#ffaa00' : '#ff0040';

  return (
    <div className={`flex-1 ${side === 'right' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
      <span
        className="font-pixel text-xs truncate max-w-[140px]"
        style={{ color, textShadow: `0 0 8px ${color}` }}
      >
        {name.toUpperCase().slice(0, 12)}
      </span>

      {/* HP bar */}
      <div className="w-full h-4 bg-black border border-gray-700 relative overflow-hidden"
        style={{ boxShadow: `inset 0 0 4px rgba(0,0,0,0.8)` }}>
        <div
          className="h-full transition-all duration-100"
          style={{
            width: `${pct}%`,
            background: barColor,
            boxShadow: `0 0 8px ${barColor}`,
            float: side === 'right' ? 'right' : 'left',
          }}
        />
        {/* HP segments */}
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-black opacity-40"
            style={{ left: `${(i + 1) * 10}%` }}
          />
        ))}
      </div>

      {/* Rage bar */}
      <div className="w-full h-2 bg-black border border-gray-800 overflow-hidden">
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${ragePct}%`,
            background: ragePct >= 100
              ? 'linear-gradient(90deg, #ff6600, #ffff00)'
              : 'linear-gradient(90deg, #440000, #ff3300)',
            boxShadow: ragePct >= 100 ? '0 0 6px #ff6600' : 'none',
          }}
        />
      </div>
      <span className="font-mono text-xs" style={{ color: ragePct >= 100 ? '#ffff00' : '#666' }}>
        {ragePct >= 100 ? '⚡ RAGE FULL' : `RAGE ${Math.floor(ragePct)}%`}
      </span>
    </div>
  );
}
