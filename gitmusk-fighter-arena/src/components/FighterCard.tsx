import { Fighter } from '../types';

const RARITY_BORDER: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  elite: '#00ffff',
  legendary: '#ff00ff',
};

const TICK_LABEL: Record<string, string> = {
  none: '',
  blue: '✓',
  gold: '★',
};

interface FighterCardProps {
  fighter: Fighter;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function FighterCard({ fighter, selected, onClick, compact }: FighterCardProps) {
  const { profile, stats } = fighter;
  const borderColor = RARITY_BORDER[stats.rarity];

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded transition-all duration-200 ${compact ? 'p-3' : 'p-4'} ${onClick ? 'hover:scale-105 active:scale-95' : ''}`}
      style={{
        background: 'linear-gradient(135deg, #12002a 0%, #1a003a 100%)',
        border: `2px solid ${borderColor}`,
        boxShadow: selected
          ? `0 0 20px ${borderColor}, 0 0 40px ${borderColor}50`
          : `0 0 8px ${borderColor}40`,
      }}
    >
      {/* Rarity badge */}
      <div
        className="absolute top-2 right-2 font-pixel text-xs px-1 py-0.5"
        style={{ color: borderColor, fontSize: '8px' }}
      >
        {stats.rarity.toUpperCase()}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded overflow-hidden"
            style={{ border: `2px solid ${stats.color}`, boxShadow: `0 0 10px ${stats.glowColor}` }}
          >
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.username}`;
              }}
            />
          </div>
          {profile.verified !== 'none' && (
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: profile.verified === 'gold' ? '#ffd700' : '#1d9bf0',
                color: '#000',
              }}
            >
              {TICK_LABEL[profile.verified]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-pixel text-white truncate" style={{ fontSize: '9px' }}>
            {profile.displayName.slice(0, 14)}
          </div>
          <div className="font-mono text-gray-400 text-xs">@{profile.username.slice(0, 12)}</div>
          <div className="font-pixel mt-0.5" style={{ color: stats.color, fontSize: '7px' }}>
            {stats.archetypeLabel.toUpperCase()}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-1 mb-3">
            {[
              { label: 'PWR', value: stats.basePower, color: '#ff6600' },
              { label: 'DEF', value: stats.defense, color: '#0080ff' },
              { label: 'SPD', value: stats.speed, color: '#00ff41' },
              { label: 'CRIT', value: stats.critRate, color: '#ffff00' },
              { label: 'STA', value: stats.stamina, color: '#00ffff' },
              { label: 'RAGE', value: stats.rageSpeed, color: '#ff00ff' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="font-pixel text-gray-500" style={{ fontSize: '6px' }}>{stat.label}</div>
                <div className="font-pixel" style={{ color: stat.color, fontSize: '9px' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Passive */}
          <div className="bg-black bg-opacity-50 rounded p-2">
            <div className="font-pixel text-purple-400 mb-1" style={{ fontSize: '7px' }}>PASSIVE</div>
            <div className="font-mono text-gray-300" style={{ fontSize: '10px', lineHeight: '1.4' }}>
              {stats.passiveAbility}
            </div>
          </div>

          {/* Ultimate */}
          <div className="bg-black bg-opacity-50 rounded p-2 mt-1"
            style={{ border: `1px solid ${stats.glowColor}50` }}>
            <div className="font-pixel" style={{ color: stats.glowColor, fontSize: '7px' }}>⚡ ULTIMATE</div>
            <div className="font-pixel text-white mt-0.5" style={{ fontSize: '8px' }}>
              {stats.ultimateName.toUpperCase()}
            </div>
          </div>
        </>
      )}

      {selected && (
        <div className="absolute inset-0 rounded pointer-events-none"
          style={{ border: `3px solid ${borderColor}`, boxShadow: `inset 0 0 20px ${borderColor}30` }}
        />
      )}
    </div>
  );
}
