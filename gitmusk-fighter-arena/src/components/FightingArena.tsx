import { useEffect, useRef, useState, useCallback } from 'react';
import { Fighter, GameFighterState, FighterState, MatchResult } from '../types';
import { calcDamage } from '../utils/statsCalculator';
import { HPBar } from './HPBar';

const W = 800;
const H = 400;
const FLOOR_Y = 310;
const FW = 50;
const FH = 90;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const WALK_SPEED = 4;
const ROUND_TIME = 90;

const ARCHETYPE_COLORS: Record<string, string> = {
  crypto_trader: '#ffaa00',
  ai_builder: '#00ffff',
  meme_account: '#ff00ff',
  founder_ceo: '#00ff41',
  developer: '#00ccff',
  influencer: '#ff6699',
  degen: '#ff3300',
  og_holder: '#ffd700',
};

function drawFighter(
  ctx: CanvasRenderingContext2D,
  f: GameFighterState,
  color: string,
  side: 'left' | 'right',
  name: string
) {
  const x = f.x;
  const y = f.y;
  const dir = f.facing;

  ctx.save();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.ellipse(x + FW / 2, FLOOR_Y + 5, FW * 0.6, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const isHurt = f.state === 'hurt';
  const isDead = f.state === 'dead';
  const isBlocking = f.state === 'block';
  const isAttacking = ['punch', 'kick', 'special', 'ultimate'].includes(f.state);
  const isJumping = !f.isGrounded;

  const alpha = isDead ? 0.4 : 1.0;
  ctx.globalAlpha = alpha;

  // Glow on hit
  if (isHurt) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
  } else {
    ctx.shadowColor = color;
    ctx.shadowBlur = isAttacking ? 15 : 6;
  }

  // Body
  const bodyColor = isBlocking ? '#446688' : isHurt ? '#ffffff' : color;
  ctx.fillStyle = bodyColor;
  const bodyY = y + 28;
  ctx.fillRect(x + 8, bodyY, FW - 16, 40);

  // Head
  const headRadius = 18;
  const headX = x + FW / 2;
  const headY = y + headRadius + 2;
  ctx.beginPath();
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  const eyeOffsetX = dir === 1 ? 5 : -5;
  ctx.beginPath();
  ctx.arc(headX + eyeOffsetX - 3, headY - 3, 3, 0, Math.PI * 2);
  ctx.arc(headX + eyeOffsetX + 3, headY - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  // Glowing eyes
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(headX + eyeOffsetX - 3, headY - 3, 1.5, 0, Math.PI * 2);
  ctx.arc(headX + eyeOffsetX + 3, headY - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = isAttacking ? 15 : 6;
  ctx.shadowColor = color;
  ctx.fillStyle = bodyColor;

  // Arms
  const armY = bodyY + 10;
  if (isAttacking && f.state === 'punch') {
    const armExtend = dir === 1 ? FW + 20 : -20;
    ctx.fillRect(x + FW / 2, armY, armExtend, 10);
    ctx.fillRect(x + 2, armY + 5, 10, 25);
  } else if (isAttacking && f.state === 'kick') {
    ctx.fillRect(x + 2, armY, 10, 25);
    ctx.fillRect(x + FW - 12, armY, 10, 25);
    const legExtend = dir === 1 ? FW + 25 : -25;
    ctx.fillRect(x + FW / 2, bodyY + 35, legExtend, 10);
  } else if (isBlocking) {
    ctx.fillRect(x + FW / 2 - 5, armY - 5, 12, 35);
    ctx.fillRect(x + 2, armY, 10, 25);
  } else {
    ctx.fillRect(x + 2, armY, 10, isJumping ? 20 : 30);
    ctx.fillRect(x + FW - 12, armY, 10, isJumping ? 20 : 30);
  }

  // Legs
  const legY = bodyY + 40;
  if (isJumping) {
    ctx.fillRect(x + 10, legY, 12, 20);
    ctx.fillRect(x + FW - 22, legY, 12, 20);
  } else if (f.state === 'walk_fwd' || f.state === 'walk_back') {
    const t = Date.now() / 200;
    const legSwing = Math.sin(t) * 12;
    ctx.fillRect(x + 10, legY + legSwing, 12, 28);
    ctx.fillRect(x + FW - 22, legY - legSwing, 12, 28);
  } else {
    ctx.fillRect(x + 10, legY, 12, 30);
    ctx.fillRect(x + FW - 22, legY, 12, 30);
  }

  // Ultimate flash
  if (f.state === 'ultimate') {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 10, y - 10, FW + 20, FH + 20);
    ctx.globalAlpha = alpha;
  }

  // Name tag
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = '600 8px "Press Start 2P", monospace';
  ctx.textAlign = side === 'left' ? 'left' : 'right';
  ctx.fillText(name.slice(0, 8).toUpperCase(), side === 'left' ? x : x + FW, y - 5);

  ctx.restore();
}

function drawArena(ctx: CanvasRenderingContext2D) {
  // Sky gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#080018');
  bg.addColorStop(0.6, '#0f0025');
  bg.addColorStop(1, '#1a0035');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Crowd silhouettes (background)
  ctx.fillStyle = '#1a0035';
  for (let i = 0; i < 30; i++) {
    const bx = i * 28 + 5;
    const bh = 20 + Math.sin(i * 2.7) * 8;
    ctx.fillRect(bx, FLOOR_Y - bh - 60, 20, bh + 60);
  }

  // Neon grid floor
  ctx.strokeStyle = '#2a0050';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_Y);
    ctx.lineTo(W / 2 + (x - W / 2) * 0.3, H);
    ctx.stroke();
  }
  for (let y = FLOOR_Y; y < H; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Floor line
  ctx.strokeStyle = '#bf00ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#bf00ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  ctx.lineTo(W, FLOOR_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Center marker
  ctx.strokeStyle = '#ffffff20';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(W / 2, FLOOR_Y - 30);
  ctx.lineTo(W / 2, FLOOR_Y + 5);
  ctx.stroke();
  ctx.setLineDash([]);
}

function makeInitialState(side: 'left' | 'right', maxHp: number): GameFighterState {
  return {
    x: side === 'left' ? 120 : W - 120 - FW,
    y: FLOOR_Y - FH,
    vx: 0,
    vy: 0,
    hp: maxHp,
    maxHp,
    rage: 0,
    state: 'idle',
    stateTimer: 0,
    facing: side === 'left' ? 1 : -1,
    isGrounded: true,
    attackCooldown: 0,
    blockCooldown: 0,
    comboCount: 0,
    comboTimer: 0,
    side,
  };
}

interface ArenaProps {
  player1: Fighter;
  player2: Fighter;
  onMatchEnd: (result: MatchResult) => void;
}

export function FightingArena({ player1, player2, onMatchEnd }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const p1Ref = useRef<GameFighterState>(makeInitialState('left', 100));
  const p2Ref = useRef<GameFighterState>(makeInitialState('right', 100));
  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());
  const roundRef = useRef(1);
  const matchStartRef = useRef(Date.now());
  const maxComboRef = useRef(0);
  const hitEffectsRef = useRef<Array<{ x: number; y: number; text: string; timer: number; color: string }>>([]);
  const gameOverRef = useRef(false);

  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [round, setRound] = useState(1);
  const [p1Hp, setP1Hp] = useState(100);
  const [p2Hp, setP2Hp] = useState(100);
  const [p1Rage, setP1Rage] = useState(0);
  const [p2Rage, setP2Rage] = useState(0);
  const [combo1, setCombo1] = useState(0);
  const [combo2, setCombo2] = useState(0);
  const [announceText, setAnnounceText] = useState('ROUND 1');
  const [showAnnounce, setShowAnnounce] = useState(true);

  useEffect(() => {
    setShowAnnounce(true);
    const t = setTimeout(() => setShowAnnounce(false), 2000);
    return () => clearTimeout(t);
  }, [round]);

  const doAttack = useCallback((
    attacker: GameFighterState,
    defender: GameFighterState,
    attackerFighter: Fighter,
    defenderFighter: Fighter,
    move: 'punch' | 'kick' | 'special' | 'ultimate'
  ) => {
    if (attacker.attackCooldown > 0 || gameOverRef.current) return;
    if (move === 'ultimate' && attacker.rage < 100) return;

    const cooldowns = { punch: 25, kick: 35, special: 45, ultimate: 80 };
    attacker.state = move;
    attacker.stateTimer = cooldowns[move];
    attacker.attackCooldown = cooldowns[move];

    const range = { punch: 80, kick: 100, special: 120, ultimate: 160 };
    const dist = Math.abs((attacker.x + FW / 2) - (defender.x + FW / 2));

    if (dist < range[move]) {
      const dmg = calcDamage(
        attackerFighter.stats,
        defenderFighter.stats,
        move,
        defender.state === 'block',
        attacker.comboCount
      );

      defender.hp = Math.max(0, defender.hp - dmg);

      if (defender.state !== 'block') {
        defender.state = 'hurt';
        defender.stateTimer = 15;
        attacker.comboCount++;
        attacker.comboTimer = 60;
        maxComboRef.current = Math.max(maxComboRef.current, attacker.comboCount);
      }

      // Rage fill
      const rageFill = { punch: 8, kick: 12, special: 16, ultimate: 0 };
      attacker.rage = Math.min(100, attacker.rage + rageFill[move]);
      if (move === 'ultimate') attacker.rage = 0;

      // Hit effect
      const effectColor = move === 'ultimate' ? '#ffff00' : attackerFighter.stats.color;
      hitEffectsRef.current.push({
        x: defender.x + FW / 2,
        y: defender.y + FH / 2,
        text: move === 'ultimate' ? `💥 ${dmg}!` : dmg > 15 ? `CRIT! ${dmg}` : `${dmg}`,
        timer: 40,
        color: effectColor,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const onKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    const loop = () => {
      if (gameOverRef.current) return;

      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      const keys = keysRef.current;

      // Timer
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, ROUND_TIME - elapsed);
      setTimeLeft(Math.ceil(remaining));

      // Check round/game over
      if (remaining <= 0 || p1.hp <= 0 || p2.hp <= 0) {
        if (!gameOverRef.current) {
          gameOverRef.current = true;
          const winner = p1.hp > p2.hp ? player1 : player2;
          const loser = p1.hp > p2.hp ? player2 : player1;
          setTimeout(() => {
            onMatchEnd({
              winner,
              loser,
              rounds: roundRef.current,
              duration: Math.floor((Date.now() - matchStartRef.current) / 1000),
              maxCombo: maxComboRef.current,
              mode: 'free',
            });
          }, 1500);
        }
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // P1 controls: WASD + F(punch) G(kick) H(special) V(ultimate) S(block)
      if (p1.stateTimer <= 0) {
        if (keys.has('a') || keys.has('A')) {
          p1.vx = -WALK_SPEED;
          p1.state = 'walk_back';
          p1.facing = -1;
        } else if (keys.has('d') || keys.has('D')) {
          p1.vx = WALK_SPEED;
          p1.state = 'walk_fwd';
          p1.facing = 1;
        } else {
          p1.vx = 0;
        }
        if ((keys.has('w') || keys.has('W')) && p1.isGrounded) {
          p1.vy = JUMP_FORCE;
          p1.isGrounded = false;
          p1.state = 'jump';
        }
        if (keys.has('s') || keys.has('S')) {
          p1.state = 'block';
          p1.vx = 0;
        }
        if (keys.has('f') || keys.has('F')) doAttack(p1, p2, player1, player2, 'punch');
        if (keys.has('g') || keys.has('G')) doAttack(p1, p2, player1, player2, 'kick');
        if (keys.has('h') || keys.has('H')) doAttack(p1, p2, player1, player2, 'special');
        if (keys.has('v') || keys.has('V')) doAttack(p1, p2, player1, player2, 'ultimate');
      }

      // P2 controls: Arrow keys + 1(punch) 2(kick) 3(special) 4(ultimate) ↓(block)
      if (p2.stateTimer <= 0) {
        if (keys.has('ArrowLeft')) {
          p2.vx = -WALK_SPEED;
          p2.state = 'walk_back';
          p2.facing = -1;
        } else if (keys.has('ArrowRight')) {
          p2.vx = WALK_SPEED;
          p2.state = 'walk_fwd';
          p2.facing = 1;
        } else {
          p2.vx = 0;
        }
        if (keys.has('ArrowUp') && p2.isGrounded) {
          p2.vy = JUMP_FORCE;
          p2.isGrounded = false;
          p2.state = 'jump';
        }
        if (keys.has('ArrowDown')) {
          p2.state = 'block';
          p2.vx = 0;
        }
        if (keys.has('1')) doAttack(p2, p1, player2, player1, 'punch');
        if (keys.has('2')) doAttack(p2, p1, player2, player1, 'kick');
        if (keys.has('3')) doAttack(p2, p1, player2, player1, 'special');
        if (keys.has('4')) doAttack(p2, p1, player2, player1, 'ultimate');
      }

      // Physics
      for (const f of [p1, p2]) {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += GRAVITY;

        if (f.y >= FLOOR_Y - FH) {
          f.y = FLOOR_Y - FH;
          f.vy = 0;
          f.isGrounded = true;
        }

        f.x = Math.max(10, Math.min(W - FW - 10, f.x));

        if (f.stateTimer > 0) {
          f.stateTimer--;
          if (f.stateTimer <= 0 && f.state !== 'dead') {
            f.state = 'idle';
          }
        }

        if (f.attackCooldown > 0) f.attackCooldown--;
        if (f.blockCooldown > 0) f.blockCooldown--;

        if (f.comboTimer > 0) {
          f.comboTimer--;
        } else {
          f.comboCount = 0;
        }

        // Rage regen over time
        f.rage = Math.min(100, f.rage + 0.05);

        if (f.hp <= 0) f.state = 'dead';
      }

      // Auto-face opponent
      if (p1.state === 'idle' || p1.state === 'walk_fwd' || p1.state === 'walk_back') {
        p1.facing = p2.x > p1.x ? 1 : -1;
      }
      if (p2.state === 'idle' || p2.state === 'walk_fwd' || p2.state === 'walk_back') {
        p2.facing = p1.x > p2.x ? 1 : -1;
      }

      // Update React state
      setP1Hp(p1.hp);
      setP2Hp(p2.hp);
      setP1Rage(p1.rage);
      setP2Rage(p2.rage);
      setCombo1(p1.comboCount);
      setCombo2(p2.comboCount);

      // Draw
      ctx.clearRect(0, 0, W, H);
      drawArena(ctx);

      const p1Color = ARCHETYPE_COLORS[player1.stats.archetype] || '#00ffff';
      const p2Color = ARCHETYPE_COLORS[player2.stats.archetype] || '#ff00ff';
      drawFighter(ctx, p1, p1Color, 'left', player1.profile.username);
      drawFighter(ctx, p2, p2Color, 'right', player2.profile.username);

      // Hit effects
      hitEffectsRef.current = hitEffectsRef.current.filter(e => e.timer > 0);
      for (const effect of hitEffectsRef.current) {
        ctx.save();
        ctx.globalAlpha = effect.timer / 40;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = effect.color;
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(effect.text, effect.x, effect.y - (40 - effect.timer) * 0.5);
        effect.timer--;
        ctx.restore();
      }

      // Game over overlay
      if (gameOverRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 32px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const winner = p1.hp > p2.hp ? player1.profile.username : player2.profile.username;
        ctx.fillText(`${winner.toUpperCase()} WINS!`, W / 2, H / 2);
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [player1, player2, doAttack, onMatchEnd]);

  const p1Color = ARCHETYPE_COLORS[player1.stats.archetype] || '#00ffff';
  const p2Color = ARCHETYPE_COLORS[player2.stats.archetype] || '#ff00ff';

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* HUD */}
      <div className="w-full max-w-4xl flex items-center gap-3 mb-2 px-2">
        <HPBar hp={p1Hp} maxHp={100} name={player1.profile.username} side="left" color={p1Color} rage={p1Rage} />

        <div className="flex flex-col items-center flex-shrink-0 w-24">
          <div className="font-pixel text-white text-xs mb-1" style={{ textShadow: '0 0 8px #fff' }}>
            R{round}
          </div>
          <div
            className="font-pixel text-2xl"
            style={{
              color: timeLeft <= 10 ? '#ff0040' : '#ffff00',
              textShadow: `0 0 12px ${timeLeft <= 10 ? '#ff0040' : '#ffff00'}`,
            }}
          >
            {timeLeft}
          </div>
          <div className="font-pixel text-xs mt-1" style={{ color: '#bf00ff', fontSize: '7px' }}>
            {combo1 > 2 ? `P1 ${combo1}x COMBO!` : combo2 > 2 ? `P2 ${combo2}x COMBO!` : 'FIGHT!'}
          </div>
        </div>

        <HPBar hp={p2Hp} maxHp={100} name={player2.profile.username} side="right" color={p2Color} rage={p2Rage} />
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block"
          style={{
            border: '2px solid #bf00ff',
            boxShadow: '0 0 30px #bf00ff50, inset 0 0 20px rgba(0,0,0,0.5)',
            maxWidth: '100%',
          }}
        />
        {showAnnounce && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="font-pixel text-4xl animate-pulse"
              style={{ color: '#ffff00', textShadow: '0 0 30px #ffff00, 0 0 60px #ffaa00' }}
            >
              {announceText}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-8 mt-3 text-xs font-mono text-gray-500">
        <div>
          <span style={{ color: p1Color }}>P1:</span> WASD=move · F=punch · G=kick · H=special · V=ult · S=block
        </div>
        <div>
          <span style={{ color: p2Color }}>P2:</span> ←→↑=move · 1=punch · 2=kick · 3=special · 4=ult · ↓=block
        </div>
      </div>
    </div>
  );
}
