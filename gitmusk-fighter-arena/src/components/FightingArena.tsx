import { Fighter, GameFighterState, MatchResult, P2PInput } from '../types';
import { supabase } from '../lib/supabase';
import { calcDamage } from '../utils/statsCalculator';
import { applyUltimate } from '../utils/ultimates';
import { getProfile, getCombatModifiers } from '../utils/playerProfile';
import { HPBar } from './HPBar';
import { playPunch, playKick, playSpecial, playUltimate, playBlock, playCombo, playKO, startBgMusic, stopBgMusic } from '../utils/sounds';
import { drawArchetypeFighter } from '../utils/fighterSprites';

const W = 800;
const H = 400;
const FLOOR_Y = 310;
const FW = 50;
const FH = 90;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const WALK_SPEED = 4;
const ROUND_TIME = 90;
const SPECIAL_HITS_REQUIRED = 5;

// ─── Particle System ────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape: 'circle' | 'star' | 'spark';
  rotation: number;
  rotSpeed: number;
  gravity?: number;
}

interface SpecialEffect {
  type: 'fire' | 'lightning' | 'wind' | 'chaos' | 'gold' | 'sparkle' | 'matrix';
  x: number; y: number;
  targetX: number; targetY: number;
  timer: number;
  maxTimer: number;
  color: string;
  particles: Particle[];
  bolts?: Array<{ x: number; y: number }[]>;
}

interface HitRing {
  x: number; y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  width: number;
}

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

const ARCHETYPE_EFFECT: Record<string, SpecialEffect['type']> = {
  crypto_trader: 'fire',
  ai_builder: 'lightning',
  meme_account: 'chaos',
  founder_ceo: 'wind',
  developer: 'matrix',
  influencer: 'sparkle',
  degen: 'fire',
  og_holder: 'gold',
};

// ─── Particle Helpers ────────────────────────────────────────────────
function makeParticle(
  x: number, y: number, vx: number, vy: number,
  size: number, color: string, decay: number,
  shape: Particle['shape'] = 'circle', gravity = 0
): Particle {
  return { x, y, vx, vy, size, color, alpha: 1, decay, shape, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.3, gravity };
}

function spawnHitParticles(
  x: number, y: number, moveType: string, color: string, particles: Particle[]
) {
  const sparks = moveType === 'punch' ? 10 : moveType === 'kick' ? 14 : 8;
  const hitColor = moveType === 'punch' ? '#ffcc00' : moveType === 'kick' ? '#ffffff' : color;

  for (let i = 0; i < sparks; i++) {
    const angle = (i / sparks) * Math.PI * 2 + Math.random() * 0.8;
    const speed = 2.5 + Math.random() * 5;
    particles.push(makeParticle(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 1.5,
      2 + Math.random() * 4,
      hitColor,
      0.04 + Math.random() * 0.03,
      Math.random() > 0.6 ? 'star' : 'circle',
      0.15
    ));
  }
  // Fast sparks
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 8;
    particles.push(makeParticle(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 2,
      1.5,
      '#ffffff',
      0.07,
      'spark',
      0.1
    ));
  }
}

function spawnSpecialEffect(
  ax: number, ay: number, tx: number, ty: number,
  archetype: string, color: string
): SpecialEffect {
  const type = ARCHETYPE_EFFECT[archetype] || 'fire';
  const particles: Particle[] = [];
  const cx = tx + FW / 2;
  const cy = ty + FH / 2;

  if (type === 'fire') {
    for (let i = 0; i < 40; i++) {
      const spread = (Math.random() - 0.5) * 60;
      particles.push(makeParticle(
        cx + spread, cy + 20 + Math.random() * 20,
        (Math.random() - 0.5) * 3,
        -3 - Math.random() * 7,
        5 + Math.random() * 12,
        Math.random() > 0.5 ? '#ff4400' : Math.random() > 0.5 ? '#ff8800' : '#ffcc00',
        0.015 + Math.random() * 0.01,
        'circle',
        -0.05
      ));
    }
  } else if (type === 'lightning') {
    // Bolts are drawn dynamically, no particles needed
  } else if (type === 'wind') {
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const r = 20 + Math.random() * 30;
      particles.push(makeParticle(
        cx + Math.cos(angle) * r,
        cy + Math.sin(angle) * r,
        Math.cos(angle + Math.PI / 2) * 4,
        Math.sin(angle + Math.PI / 2) * 4 - 1,
        3 + Math.random() * 5,
        color,
        0.025,
        'circle'
      ));
    }
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push(makeParticle(
        cx, cy,
        Math.cos(angle) * (3 + Math.random() * 5),
        Math.sin(angle) * (3 + Math.random() * 5) - 2,
        2 + Math.random() * 3,
        '#aaffaa',
        0.03,
        'star'
      ));
    }
  } else if (type === 'chaos') {
    const chaos = ['#ff00ff', '#00ffff', '#ffff00', '#ff6600', '#00ff00', '#ff0040'];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      particles.push(makeParticle(
        cx + (Math.random() - 0.5) * 30,
        cy + (Math.random() - 0.5) * 30,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 1,
        3 + Math.random() * 7,
        chaos[Math.floor(Math.random() * chaos.length)],
        0.02 + Math.random() * 0.03,
        Math.random() > 0.5 ? 'star' : 'circle',
        0.08
      ));
    }
  } else if (type === 'gold') {
    for (let i = 0; i < 35; i++) {
      const angle = (i / 35) * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      particles.push(makeParticle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 2,
        4 + Math.random() * 8,
        Math.random() > 0.5 ? '#ffd700' : '#ffaa00',
        0.02,
        'star',
        0.1
      ));
    }
  } else if (type === 'sparkle') {
    const sparkColors = ['#ff69b4', '#ff00ff', '#bf00ff', '#ffaacc', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 50;
      const speed = 1 + Math.random() * 5;
      particles.push(makeParticle(
        cx + Math.cos(angle) * r,
        cy + Math.sin(angle) * r,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 3,
        2 + Math.random() * 6,
        sparkColors[Math.floor(Math.random() * sparkColors.length)],
        0.025,
        'star',
        0.05
      ));
    }
  } else if (type === 'matrix') {
    for (let i = 0; i < 30; i++) {
      particles.push(makeParticle(
        cx + (Math.random() - 0.5) * 80,
        cy - Math.random() * 60,
        (Math.random() - 0.5) * 1,
        2 + Math.random() * 4,
        3 + Math.random() * 5,
        Math.random() > 0.3 ? '#00ff41' : '#00cc33',
        0.02,
        'circle',
        0.1
      ));
    }
  }

  return {
    type,
    x: ax + FW / 2, y: ay + FH / 2,
    targetX: cx, targetY: cy,
    timer: 55,
    maxTimer: 55,
    color,
    particles,
    bolts: type === 'lightning' ? generateLightningBolts(ax + FW / 2, ay + FH / 3, cx, cy) : undefined,
  };
}

function generateLightningBolts(x1: number, y1: number, x2: number, y2: number) {
  const bolts = [];
  for (let b = 0; b < 3; b++) {
    const steps = 10;
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;
    const bolt = [{ x: x1, y: y1 }];
    for (let i = 1; i < steps; i++) {
      bolt.push({
        x: x1 + dx * i + (Math.random() - 0.5) * (b === 0 ? 25 : 40),
        y: y1 + dy * i + (Math.random() - 0.5) * (b === 0 ? 15 : 30),
      });
    }
    bolt.push({ x: x2, y: y2 });
    bolts.push(bolt);
  }
  return bolts;
}

// ─── Canvas Draw Helpers ──────────────────────────────────────────────
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rotation: number) {
  const spikes = 4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = rotation + (i * Math.PI) / spikes;
    const rad = i % 2 === 0 ? r : r * 0.4;
    if (i === 0) ctx.moveTo(x + Math.cos(angle) * rad, y + Math.sin(angle) * rad);
    else ctx.lineTo(x + Math.cos(angle) * rad, y + Math.sin(angle) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    if (p.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.shape === 'star' ? 8 : 4;

    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'star') {
      drawStar(ctx, p.x, p.y, p.size, p.rotation);
    } else if (p.shape === 'spark') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.shadowBlur = 6;
      const len = p.size * 5;
      const angle = Math.atan2(p.vy, p.vx);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(angle) * len, p.y - Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function updateParticles(particles: Particle[]) {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.gravity) p.vy += p.gravity;
    p.vx *= 0.97;
    p.rotation += p.rotSpeed;
    p.alpha -= p.decay;
  }
  return particles.filter(p => p.alpha > 0);
}

function drawSpecialEffect(ctx: CanvasRenderingContext2D, effect: SpecialEffect) {
  const progress = effect.timer / effect.maxTimer;
  ctx.save();

  if (effect.type === 'lightning' && effect.bolts) {
    const alpha = progress;
    for (let b = 0; b < effect.bolts.length; b++) {
      const bolt = effect.bolts[b];
      ctx.globalAlpha = alpha * (b === 0 ? 1 : 0.4);
      ctx.strokeStyle = b === 0 ? '#ffffff' : effect.color;
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = b === 0 ? 20 : 8;
      ctx.lineWidth = b === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(bolt[0].x, bolt[0].y);
      for (let i = 1; i < bolt.length; i++) {
        ctx.lineTo(bolt[i].x, bolt[i].y);
      }
      ctx.stroke();
    }
    // Impact flash
    if (progress > 0.6) {
      ctx.globalAlpha = (progress - 0.6) * 2;
      ctx.fillStyle = effect.color;
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 20 * progress, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (effect.type === 'fire') {
    // Fire outer glow ring
    ctx.globalAlpha = progress * 0.4;
    const grad = ctx.createRadialGradient(effect.targetX, effect.targetY, 0, effect.targetX, effect.targetY, 50);
    grad.addColorStop(0, '#ff8800');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  if (effect.type === 'chaos') {
    // Rotating chaos ring
    ctx.globalAlpha = progress * 0.5;
    ctx.strokeStyle = ['#ff00ff', '#00ffff', '#ffff00'][Math.floor(Date.now() / 100) % 3];
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 40 * (1 - progress) + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (effect.type === 'gold') {
    // Gold radial rays
    ctx.globalAlpha = progress * 0.6;
    ctx.strokeStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    const rays = 12;
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2 + (1 - progress) * 2;
      const inner = 15;
      const outer = 10 + 60 * (1 - progress);
      ctx.beginPath();
      ctx.moveTo(effect.targetX + Math.cos(angle) * inner, effect.targetY + Math.sin(angle) * inner);
      ctx.lineTo(effect.targetX + Math.cos(angle) * outer, effect.targetY + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }

  if (effect.type === 'wind') {
    // Spiral rings
    ctx.globalAlpha = progress * 0.5;
    ctx.strokeStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) {
      const radius = (15 + r * 20) * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (effect.type === 'matrix') {
    // Screen tint green
    ctx.globalAlpha = progress * 0.15;
    ctx.fillStyle = '#00ff41';
    ctx.fillRect(0, 0, W, H);
  }

  if (effect.type === 'sparkle') {
    // Sparkle burst ring
    ctx.globalAlpha = progress * 0.5;
    ctx.strokeStyle = '#ff69b4';
    ctx.shadowColor = '#ff69b4';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 50 * (1 - progress), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  drawParticles(ctx, effect.particles);
}

function drawHitRing(ctx: CanvasRenderingContext2D, ring: HitRing) {
  ctx.save();
  ctx.globalAlpha = ring.alpha;
  ctx.strokeStyle = ring.color;
  ctx.shadowColor = ring.color;
  ctx.shadowBlur = 12;
  ctx.lineWidth = ring.width;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFighter(
  ctx: CanvasRenderingContext2D,
  f: GameFighterState,
  color: string,
  side: 'left' | 'right',
  name: string,
  archetype: string,
) {
  const x = f.x;
  const y = f.y;
  ctx.save();

  // Shadow on floor
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + FW / 2, FLOOR_Y + 5, FW * 0.6, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const isHurt    = f.state === 'hurt';
  const isDead    = f.state === 'dead';
  const isSpecial = f.state === 'special';
  const isUltimate = f.state === 'ultimate';
  const isAttacking = ['punch', 'kick', 'special', 'ultimate'].includes(f.state);

  ctx.globalAlpha = isDead ? 0.5 : 1.0;

  if (isHurt) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 25;
  } else if (isUltimate) {
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 35;
  } else if (isSpecial) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
  } else {
    ctx.shadowColor = color;
    ctx.shadowBlur = isAttacking ? 15 : 6;
  }

  // Draw pixel-art archetype sprite
  drawArchetypeFighter(ctx, archetype, f.state, f.facing, x, y, Date.now(), f.isGrounded);

  // Hurt white flash overlay
  if (isHurt) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, FW, FH);
  }

  ctx.globalAlpha = 1.0;

  // Ultimate aura
  if (isUltimate) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(x + FW / 2, y + FH / 2, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Special ready indicator
  if (f.specialReady && !['special', 'ultimate', 'dead'].includes(f.state)) {
    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 150) * 0.2;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, FW + 6, FH + 6);
    ctx.restore();
  }

  // Name tag
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.font = '600 8px "Press Start 2P", monospace';
  ctx.textAlign = side === 'left' ? 'left' : 'right';
  ctx.fillText(name.slice(0, 8).toUpperCase(), side === 'left' ? x : x + FW, y - 5);

  ctx.restore();
}

function drawArena(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#080018');
  bg.addColorStop(0.6, '#0f0025');
  bg.addColorStop(1, '#1a0035');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1a0035';
  for (let i = 0; i < 30; i++) {
    const bx = i * 28 + 5;
    const bh = 20 + Math.sin(i * 2.7) * 8;
    ctx.fillRect(bx, FLOOR_Y - bh - 60, 20, bh + 60);
  }

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

  ctx.strokeStyle = '#bf00ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#bf00ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  ctx.lineTo(W, FLOOR_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;

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
    vx: 0, vy: 0,
    hp: maxHp, maxHp,
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
    specialHitCount: 0,
    specialReady: false,
    stunTimer: 0,
    invincibleTimer: 0,
    dots: [],
  };
}

interface ArenaProps {
  player1: Fighter;
  player2: Fighter;
  onMatchEnd: (result: MatchResult) => void;
  p2AI?: boolean;
  p2pMode?: 'host' | 'client' | null;
  matchId?: string | null;
}

export function FightingArena({ player1, player2, onMatchEnd, p2AI = true, p2pMode = null, matchId = null }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const p1Ref = useRef<GameFighterState>(makeInitialState('left', 100));
  const p2Ref = useRef<GameFighterState>(makeInitialState('right', 100));
  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());
  const matchStartRef = useRef(Date.now());
  const maxComboRef = useRef(0);
  const gameOverRef = useRef(false);
  const koFiredRef = useRef(false);
  const aiRef = useRef<{ think: number; intent: 'idle' | 'approach' | 'retreat' | 'block' }>({ think: 0, intent: 'idle' });
  const frameCountRef = useRef(0);
  const disconnectedRef = useRef(false);
  const p2RemoteInputRef = useRef<P2PInput>({ left: false, right: false, up: false, down: false, block: false, punch: false, kick: false, special: false, ultimate: false, ts: 0 });
  const sendInputRef = useRef<() => void>(() => {});
  const lastRemoteSignalRef = useRef(Date.now());
  const fightChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Visual effects
  const particlesRef = useRef<Particle[]>([]);
  const specialEffectsRef = useRef<SpecialEffect[]>([]);
  const hitRingsRef = useRef<HitRing[]>([]);
  const hitTextRef = useRef<Array<{ x: number; y: number; text: string; timer: number; color: string; size: number }>>([]);
  const screenFlashRef = useRef<{ alpha: number; color: string } | null>(null);
  const shakeRef = useRef({ amount: 0 });

  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [round] = useState(1);
  const [p1Hp, setP1Hp] = useState(100);
  const [p2Hp, setP2Hp] = useState(100);
  const [p1Rage, setP1Rage] = useState(0);
  const [p2Rage, setP2Rage] = useState(0);
  const [p1Hits, setP1Hits] = useState(0);
  const [p2Hits, setP2Hits] = useState(0);
  const [p1SpecialReady, setP1SpecialReady] = useState(false);
  const [p2SpecialReady, setP2SpecialReady] = useState(false);
  const [combo1, setCombo1] = useState(0);
  const [combo2, setCombo2] = useState(0);
  const [showAnnounce, setShowAnnounce] = useState(true);
  const p1ModsRef = useRef({ attackMult: 1, defenseMult: 1 });

  useEffect(() => {
    const profile = getProfile(player1.profile.username);
    const mods = getCombatModifiers(profile);
    p1ModsRef.current = { attackMult: mods.attackMult, defenseMult: mods.defenseMult };
  }, [player1.profile.username]);

  useEffect(() => {
    const t = setTimeout(() => setShowAnnounce(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // P2P channel setup
  useEffect(() => {
    if (!p2pMode || !matchId) return;

    const ch = supabase.channel(`match_fight:${matchId}`);
    fightChannelRef.current = ch;
    lastRemoteSignalRef.current = Date.now();

    if (p2pMode === 'host') {
      ch.on('broadcast', { event: 'input' }, ({ payload }: { payload: P2PInput }) => {
        Object.assign(p2RemoteInputRef.current, payload);
        lastRemoteSignalRef.current = Date.now();
      });
      ch.on('broadcast', { event: 'heartbeat' }, () => {
        lastRemoteSignalRef.current = Date.now();
      });
    } else {
      ch.on('broadcast', { event: 'state' }, ({ payload }: { payload: { p1: Partial<GameFighterState>; p2: Partial<GameFighterState> } }) => {
        if (payload.p1) Object.assign(p1Ref.current, payload.p1);
        if (payload.p2) Object.assign(p2Ref.current, payload.p2);
        lastRemoteSignalRef.current = Date.now();
      });
      ch.on('broadcast', { event: 'game_over' }, ({ payload }: { payload: { winnerSide: 'left' | 'right'; maxCombo: number; duration: number; disconnected?: boolean } }) => {
        if (gameOverRef.current || koFiredRef.current) return;
        gameOverRef.current = true;
        koFiredRef.current = true;
        disconnectedRef.current = payload.disconnected ?? false;
        const winner = payload.winnerSide === 'left' ? player1 : player2;
        const loser = payload.winnerSide === 'left' ? player2 : player1;
        playKO();
        screenFlashRef.current = { alpha: 0.7, color: '#ffffff' };
        setTimeout(() => {
          onMatchEnd({ winner, loser, rounds: 1, duration: payload.duration, maxCombo: payload.maxCombo, mode: 'free', disconnected: payload.disconnected });
        }, 2200);
      });
    }

    ch.subscribe();

    // P2 client heartbeat
    let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
    if (p2pMode === 'client') {
      heartbeatInterval = setInterval(() => {
        ch.send({ type: 'broadcast', event: 'heartbeat', payload: { ts: Date.now() } });
      }, 2000);
    }

    return () => {
      clearInterval(heartbeatInterval);
      supabase.removeChannel(ch);
      fightChannelRef.current = null;
    };
  }, [p2pMode, matchId, player1, player2, onMatchEnd]);

  const doAttack = useCallback((
    attacker: GameFighterState,
    defender: GameFighterState,
    attackerFighter: Fighter,
    defenderFighter: Fighter,
    move: 'punch' | 'kick' | 'special' | 'ultimate'
  ) => {
    if (attacker.attackCooldown > 0 || gameOverRef.current) return;
    if (move === 'ultimate' && attacker.rage < 100) return;
    if (move === 'special' && !attacker.specialReady) return;

    const cooldowns = { punch: 25, kick: 35, special: 50, ultimate: 80 };
    attacker.state = move;
    attacker.stateTimer = cooldowns[move];
    attacker.attackCooldown = cooldowns[move];

    const range = { punch: 80, kick: 100, special: 130, ultimate: 170 };
    const dist = Math.abs((attacker.x + FW / 2) - (defender.x + FW / 2));
    const hitX = defender.x + FW / 2;
    const hitY = defender.y + FH / 3;
    const inRange = dist < range[move];
    const attackerMods = attacker.side === 'left' ? p1ModsRef.current : undefined;
    const defenderMods = defender.side === 'left' ? p1ModsRef.current : undefined;

    // ── Ultimate: unique per-archetype effect ──────────────────
    if (move === 'ultimate') {
      const res = applyUltimate(
        attackerFighter.stats.archetype,
        attacker, defender,
        attackerFighter.stats, defenderFighter.stats,
        attackerMods, defenderMods,
        inRange,
      );
      attacker.rage = 0;
      if (res.selfDamage > 0) {
        attacker.hp = Math.max(0, attacker.hp - res.selfDamage);
        hitTextRef.current.push({ x: attacker.x + FW / 2, y: attacker.y + FH / 3, text: `-${res.selfDamage}`, timer: 45, color: '#ff4444', size: 14 });
      }
      if (res.damage > 0) {
        defender.hp = Math.max(0, defender.hp - res.damage);
        defender.comboCount = 0;
        if (defender.state !== 'dead') { defender.state = 'hurt'; defender.stateTimer = 25; }
        hitTextRef.current.push({ x: hitX + (Math.random() - 0.5) * 20, y: hitY - 10, text: `💥${res.damage}!`, timer: 50, color: '#ffff00', size: 16 });
      } else if (inRange && defender.invincibleTimer > 0) {
        hitTextRef.current.push({ x: hitX, y: hitY - 10, text: 'IMMUNE', timer: 45, color: '#88ddff', size: 13 });
      }

      const ucolor = ARCHETYPE_COLORS[attackerFighter.stats.archetype] || '#ffff00';
      const bannerX = attacker.side === 'left' ? W * 0.3 : W * 0.7;
      hitTextRef.current.push({ x: bannerX, y: FLOOR_Y - 150, text: res.text, timer: 90, color: ucolor, size: 14 });

      const effect = spawnSpecialEffect(attacker.x, attacker.y, defender.x, defender.y, attackerFighter.stats.archetype, '#ffff00');
      effect.particles.push(...Array.from({ length: 20 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 8;
        return makeParticle(hitX, hitY, Math.cos(angle) * speed, Math.sin(angle) * speed - 2, 5 + Math.random() * 10, ucolor, 0.02, 'star', 0.08);
      }));
      specialEffectsRef.current.push(effect);
      screenFlashRef.current = { alpha: 0.5, color: '#ffff00' };
      hitRingsRef.current.push({ x: attacker.x + FW / 2, y: attacker.y + FH / 2, radius: 5, maxRadius: 100, alpha: 1, color: ucolor, width: 3 });
      shakeRef.current.amount = Math.max(shakeRef.current.amount, 14);
      playUltimate();
      return;
    }

    // ── Normal moves vs an invincible defender: no effect ───────
    if (inRange && defender.invincibleTimer > 0) {
      hitTextRef.current.push({ x: hitX, y: hitY - 10, text: 'IMMUNE', timer: 40, color: '#88ddff', size: 12 });
      playBlock();
      if (move === 'special') { attacker.specialHitCount = 0; attacker.specialReady = false; }
      return;
    }

    if (inRange) {
      const dmg = calcDamage(
        attackerFighter.stats,
        defenderFighter.stats,
        move,
        defender.state === 'block',
        attacker.comboCount,
        attackerMods,
        defenderMods
      );

      defender.hp = Math.max(0, defender.hp - dmg);

      if (defender.state !== 'block') {
        defender.state = 'hurt';
        defender.stateTimer = 15;
        attacker.comboCount++;
        attacker.comboTimer = 60;
        maxComboRef.current = Math.max(maxComboRef.current, attacker.comboCount);

        // Combo announcements on canvas
        const comboMilestones: Record<number, string> = { 3: 'COMBO!', 5: 'SAVAGE!', 7: '⚡ ULTRA!', 10: '🔥 GODLIKE!' };
        if (comboMilestones[attacker.comboCount]) {
          const cx = attacker.side === 'left' ? W * 0.22 : W * 0.78;
          hitTextRef.current.push({
            x: cx, y: FLOOR_Y - 130,
            text: `${attacker.comboCount}x ${comboMilestones[attacker.comboCount]}`,
            timer: 80,
            color: ARCHETYPE_COLORS[attackerFighter.stats.archetype] || '#ffff00',
            size: 16,
          });
          playCombo(attacker.comboCount);
        }

        // Increment special hit counter for normal attacks
        if (move === 'punch' || move === 'kick') {
          attacker.specialHitCount = Math.min(SPECIAL_HITS_REQUIRED, attacker.specialHitCount + 1);
          if (attacker.specialHitCount >= SPECIAL_HITS_REQUIRED) {
            attacker.specialReady = true;
          }
        }
      } else {
        playBlock();
      }

      // Reset special after use
      if (move === 'special') {
        attacker.specialHitCount = 0;
        attacker.specialReady = false;
      }

      // Rage fill (ultimate is handled earlier and never reaches here)
      const rageFill: Record<string, number> = { punch: 8, kick: 12, special: 0 };
      attacker.rage = Math.min(100, attacker.rage + (rageFill[move] ?? 0));

      // ── Spawn visual effects ──────────────────────────────────
      const color = ARCHETYPE_COLORS[attackerFighter.stats.archetype] || '#00ffff';

      // Hit particles (punch/kick)
      if (move === 'punch' || move === 'kick') {
        spawnHitParticles(hitX, hitY, move, color, particlesRef.current);

        // Hit ring
        hitRingsRef.current.push({
          x: hitX, y: hitY,
          radius: 5,
          maxRadius: move === 'kick' ? 50 : 35,
          alpha: 0.9,
          color: move === 'punch' ? '#ffcc00' : color,
          width: 2,
        });
      }

      // Screen shake
      const shakePower = { punch: 2.5, kick: 4, special: 8, ultimate: 14 };
      shakeRef.current.amount = Math.max(shakeRef.current.amount, shakePower[move]);

      // Sounds
      if (move === 'punch') playPunch();
      else if (move === 'kick') playKick();
      else if (move === 'special') playSpecial();

      // Special elemental effect
      if (move === 'special') {
        const effect = spawnSpecialEffect(
          attacker.x, attacker.y,
          defender.x, defender.y,
          attackerFighter.stats.archetype,
          color
        );
        specialEffectsRef.current.push(effect);
        screenFlashRef.current = { alpha: 0.3, color };
      }

      // Damage text
      const isCrit = dmg > 15;
      hitTextRef.current.push({
        x: hitX + (Math.random() - 0.5) * 20,
        y: hitY - 10,
        text: isCrit ? `CRIT! ${dmg}` : `${dmg}`,
        timer: 45,
        color: isCrit ? '#ff4444' : color,
        size: isCrit ? 14 : 12,
      });
    } else if (move === 'special') {
      // Miss — still consume special
      attacker.specialHitCount = 0;
      attacker.specialReady = false;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // AI tuning scales with the opponent's derived combat stats
    const aiThinkBase = Math.round(13 - (player2.stats.speed / 100) * 7); // 13 (slow) → 6 (fast)
    const aiAggression = 0.45 + (player2.stats.basePower / 100) * 0.4;     // 0.45 → 0.85
    const aiBlockChance = 0.18 + (player2.stats.defense / 100) * 0.5;      // 0.18 → 0.68

    const sendP2Input = () => {
      if (p2pMode !== 'client' || !fightChannelRef.current) return;
      const k = keysRef.current;
      fightChannelRef.current.send({
        type: 'broadcast',
        event: 'input',
        payload: {
          left:    k.has('ArrowLeft')  || k.has('a') || k.has('A'),
          right:   k.has('ArrowRight') || k.has('d') || k.has('D'),
          up:      k.has('ArrowUp')    || k.has('w') || k.has('W'),
          down:    k.has('ArrowDown')  || k.has('s') || k.has('S'),
          block:   k.has('ArrowDown')  || k.has('s') || k.has('S'),
          punch:   k.has('1') || k.has('f') || k.has('F'),
          kick:    k.has('2') || k.has('g') || k.has('G'),
          special: k.has('3') || k.has('h') || k.has('H'),
          ultimate:k.has('4') || k.has('v') || k.has('V'),
          ts: Date.now(),
        } satisfies P2PInput,
      });
    };

    sendInputRef.current = sendP2Input;

    const onKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      e.preventDefault();
      if (p2pMode === 'client') sendP2Input();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
      if (p2pMode === 'client') sendP2Input();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    const firKO = (winner: Fighter, loser: Fighter, elapsed: number, disconnected = false) => {
      if (koFiredRef.current) return;
      koFiredRef.current = true;
      disconnectedRef.current = disconnected;
      playKO();
      screenFlashRef.current = { alpha: 0.7, color: '#ffffff' };
      shakeRef.current.amount = 18;
      const loserState = winner === player1 ? p2Ref.current : p1Ref.current;
      const burstX = loserState.x + FW / 2;
      const burstY = loserState.y + FH / 2;
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 9;
        const colors = ['#ff0040', '#ffff00', '#ff8800', '#ffffff', '#ff00ff'];
        particlesRef.current.push(makeParticle(
          burstX, burstY,
          Math.cos(angle) * speed, Math.sin(angle) * speed - 3,
          3 + Math.random() * 8,
          colors[Math.floor(Math.random() * colors.length)],
          0.015 + Math.random() * 0.01,
          Math.random() > 0.5 ? 'star' : 'circle',
          0.12
        ));
      }
      setTimeout(() => {
        onMatchEnd({ winner, loser, rounds: 1, duration: Math.floor(elapsed), maxCombo: maxComboRef.current, mode: 'free', disconnected });
      }, disconnected ? 1500 : 2200);
    };

    const loop = () => {
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      const keys = keysRef.current;
      frameCountRef.current++;

      if (!gameOverRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, ROUND_TIME - elapsed);
        setTimeLeft(Math.ceil(remaining));

        // HOST or single-player: run full game logic
        if (p2pMode !== 'client') {
          if (remaining <= 0 || p1.hp <= 0 || p2.hp <= 0) {
            gameOverRef.current = true;
            const winner = p1.hp > p2.hp ? player1 : player2;
            const loser = p1.hp > p2.hp ? player2 : player1;
            if (p2pMode === 'host' && fightChannelRef.current) {
              fightChannelRef.current.send({
                type: 'broadcast',
                event: 'game_over',
                payload: { winnerSide: p1.hp > p2.hp ? 'left' : 'right', maxCombo: maxComboRef.current, duration: Math.floor(elapsed), disconnected: false },
              });
            }
            firKO(winner, loser, elapsed);
          }
        }
      }

      if (!gameOverRef.current) {
      // HOST / single-player: process inputs + physics
      if (p2pMode !== 'client') {
      // P1 controls: WASD + F/G/H/V + S=block (locked out while stunned)
      if (p1.stateTimer <= 0 && p1.stunTimer <= 0) {
        if (keys.has('a') || keys.has('A')) { p1.vx = -WALK_SPEED; p1.state = 'walk_back'; p1.facing = -1; }
        else if (keys.has('d') || keys.has('D')) { p1.vx = WALK_SPEED; p1.state = 'walk_fwd'; p1.facing = 1; }
        else { p1.vx = 0; }
        if ((keys.has('w') || keys.has('W')) && p1.isGrounded) { p1.vy = JUMP_FORCE; p1.isGrounded = false; }
        if (keys.has('s') || keys.has('S')) { p1.state = 'block'; p1.vx = 0; }
        if (keys.has('f') || keys.has('F')) doAttack(p1, p2, player1, player2, 'punch');
        if (keys.has('g') || keys.has('G')) doAttack(p1, p2, player1, player2, 'kick');
        if (keys.has('h') || keys.has('H')) doAttack(p1, p2, player1, player2, 'special');
        if (keys.has('v') || keys.has('V')) doAttack(p1, p2, player1, player2, 'ultimate');
      }

      // P2: AI, local keyboard, or remote (P2P host reads remote inputs)
      if (p2.stateTimer <= 0 && p2.stunTimer <= 0) {
        if (p2pMode === 'host') {
          const ri = p2RemoteInputRef.current;
          if (ri.left) { p2.vx = -WALK_SPEED; p2.state = 'walk_back'; p2.facing = -1; }
          else if (ri.right) { p2.vx = WALK_SPEED; p2.state = 'walk_fwd'; p2.facing = 1; }
          else { p2.vx = 0; }
          if (ri.up && p2.isGrounded) { p2.vy = JUMP_FORCE; p2.isGrounded = false; }
          if (ri.block || ri.down) { p2.state = 'block'; p2.vx = 0; }
          if (ri.punch)   doAttack(p2, p1, player2, player1, 'punch');
          if (ri.kick)    doAttack(p2, p1, player2, player1, 'kick');
          if (ri.special) doAttack(p2, p1, player2, player1, 'special');
          if (ri.ultimate)doAttack(p2, p1, player2, player1, 'ultimate');
        } else if (p2AI) {
          const ai = aiRef.current;
          const pdist = Math.abs((p2.x + FW / 2) - (p1.x + FW / 2));
          const p1Attacking = p1.state === 'punch' || p1.state === 'kick' || p1.state === 'special' || p1.state === 'ultimate';

          ai.think--;
          if (ai.think <= 0) {
            ai.think = aiThinkBase + Math.floor(Math.random() * 5);
            if (p1Attacking && pdist < 115 && Math.random() < aiBlockChance) {
              ai.intent = 'block';
            } else if (p2.rage >= 100 && pdist < 150) {
              doAttack(p2, p1, player2, player1, 'ultimate'); ai.intent = 'idle';
            } else if (p2.specialReady && pdist < 120 && Math.random() < 0.6) {
              doAttack(p2, p1, player2, player1, 'special'); ai.intent = 'idle';
            } else if (pdist < 80) {
              if (Math.random() < aiAggression) {
                doAttack(p2, p1, player2, player1, Math.random() < 0.5 ? 'punch' : 'kick'); ai.intent = 'idle';
              } else {
                ai.intent = 'retreat';
              }
            } else {
              ai.intent = 'approach';
              if (pdist > 150 && Math.random() < 0.04 && p2.isGrounded) { p2.vy = JUMP_FORCE; p2.isGrounded = false; }
            }
          }

          if (p2.stateTimer <= 0) {
            if (ai.intent === 'approach') {
              const dir = p1.x > p2.x ? 1 : -1; p2.vx = WALK_SPEED * dir; p2.state = 'walk_fwd';
            } else if (ai.intent === 'retreat') {
              const dir = p1.x > p2.x ? -1 : 1; p2.vx = WALK_SPEED * 0.7 * dir; p2.state = 'walk_back';
            } else if (ai.intent === 'block') {
              p2.vx = 0; p2.state = 'block';
            } else {
              p2.vx = 0;
            }
          }
        } else {
          // Local 2-player keyboard: Arrow keys + 1/2/3/4
          if (keys.has('ArrowLeft')) { p2.vx = -WALK_SPEED; p2.state = 'walk_back'; p2.facing = -1; }
          else if (keys.has('ArrowRight')) { p2.vx = WALK_SPEED; p2.state = 'walk_fwd'; p2.facing = 1; }
          else { p2.vx = 0; }
          if (keys.has('ArrowUp') && p2.isGrounded) { p2.vy = JUMP_FORCE; p2.isGrounded = false; }
          if (keys.has('ArrowDown')) { p2.state = 'block'; p2.vx = 0; }
          if (keys.has('1')) doAttack(p2, p1, player2, player1, 'punch');
          if (keys.has('2')) doAttack(p2, p1, player2, player1, 'kick');
          if (keys.has('3')) doAttack(p2, p1, player2, player1, 'special');
          if (keys.has('4')) doAttack(p2, p1, player2, player1, 'ultimate');
        }
      }

      // Physics
      for (const f of [p1, p2]) {
        // Damage-over-time ticks (drones, burn, chip, etc.)
        if (f.dots.length > 0) {
          for (const dot of f.dots) {
            dot.counter++;
            if (dot.counter >= dot.interval) {
              dot.counter = 0; dot.ticks--;
              if (f.invincibleTimer <= 0 && f.hp > 0) {
                const d = dot.random
                  ? dot.random[0] + Math.floor(Math.random() * (dot.random[1] - dot.random[0] + 1))
                  : dot.dmgPerTick;
                f.hp = Math.max(0, f.hp - d);
                hitTextRef.current.push({ x: f.x + FW / 2 + (Math.random() - 0.5) * 16, y: f.y + FH / 3, text: `${d}`, timer: 28, color: dot.color, size: 11 });
                particlesRef.current.push(makeParticle(f.x + FW / 2, f.y + FH / 3, (Math.random() - 0.5) * 3, -1 - Math.random() * 2, 4 + Math.random() * 4, dot.color, 0.03, 'spark', 0.05));
              }
            }
          }
          f.dots = f.dots.filter(dt => dt.ticks > 0);
        }

        f.x += f.vx; f.y += f.vy; f.vy += GRAVITY;
        if (f.y >= FLOOR_Y - FH) { f.y = FLOOR_Y - FH; f.vy = 0; f.isGrounded = true; }
        f.x = Math.max(10, Math.min(W - FW - 10, f.x));
        if (f.stateTimer > 0) { f.stateTimer--; if (f.stateTimer <= 0 && f.state !== 'dead') f.state = 'idle'; }
        if (f.attackCooldown > 0) f.attackCooldown--;
        if (f.blockCooldown > 0) f.blockCooldown--;
        if (f.comboTimer > 0) { f.comboTimer--; } else { f.comboCount = 0; }
        f.rage = Math.min(100, f.rage + 0.05);
        if (f.hp <= 0) f.state = 'dead';
        // Stun: locked out, forced into hurt pose; snap back to idle when it ends
        if (f.stunTimer > 0) { f.stunTimer--; f.vx = 0; if (f.state !== 'dead') f.state = f.stunTimer > 0 ? 'hurt' : 'idle'; }
        if (f.invincibleTimer > 0) f.invincibleTimer--;
      }

      if (['idle', 'walk_fwd', 'walk_back'].includes(p1.state)) p1.facing = p2.x > p1.x ? 1 : -1;
      if (['idle', 'walk_fwd', 'walk_back'].includes(p2.state)) p2.facing = p1.x > p2.x ? 1 : -1;

      // P2P host: broadcast state every 2 frames
      if (p2pMode === 'host' && fightChannelRef.current && frameCountRef.current % 2 === 0) {
        fightChannelRef.current.send({
          type: 'broadcast',
          event: 'state',
          payload: {
            p1: { x: p1.x, y: p1.y, vx: p1.vx, vy: p1.vy, hp: p1.hp, rage: p1.rage, state: p1.state, stateTimer: p1.stateTimer, facing: p1.facing, isGrounded: p1.isGrounded, attackCooldown: p1.attackCooldown, blockCooldown: p1.blockCooldown, comboCount: p1.comboCount, comboTimer: p1.comboTimer, specialHitCount: p1.specialHitCount, specialReady: p1.specialReady, stunTimer: p1.stunTimer, invincibleTimer: p1.invincibleTimer, dots: p1.dots },
            p2: { x: p2.x, y: p2.y, vx: p2.vx, vy: p2.vy, hp: p2.hp, rage: p2.rage, state: p2.state, stateTimer: p2.stateTimer, facing: p2.facing, isGrounded: p2.isGrounded, attackCooldown: p2.attackCooldown, blockCooldown: p2.blockCooldown, comboCount: p2.comboCount, comboTimer: p2.comboTimer, specialHitCount: p2.specialHitCount, specialReady: p2.specialReady, stunTimer: p2.stunTimer, invincibleTimer: p2.invincibleTimer, dots: p2.dots },
          },
        });
      }

      // P2P host: detect P2 disconnect (10 seconds no signal)
      if (p2pMode === 'host' && Date.now() - lastRemoteSignalRef.current > 10000) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        gameOverRef.current = true;
        fightChannelRef.current?.send({
          type: 'broadcast',
          event: 'game_over',
          payload: { winnerSide: 'left', maxCombo: maxComboRef.current, duration: Math.floor(elapsed), disconnected: true },
        });
        firKO(player1, player2, elapsed, true);
      }

      } // end p2pMode !== 'client'

      // P2P client: detect host disconnect
      if (p2pMode === 'client' && Date.now() - lastRemoteSignalRef.current > 10000) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        gameOverRef.current = true;
        firKO(player2, player1, elapsed, true);
      }

      setP1Hp(p1.hp); setP2Hp(p2.hp);
      setP1Rage(p1.rage); setP2Rage(p2.rage);
      setP1Hits(p1.specialHitCount); setP2Hits(p2.specialHitCount);
      setP1SpecialReady(p1.specialReady); setP2SpecialReady(p2.specialReady);
      setCombo1(p1.comboCount); setCombo2(p2.comboCount);
      } // end !gameOverRef.current block

      // ── Screen shake ────────────────────────────────────────
      const sh = shakeRef.current;
      if (sh.amount > 0.5) {
        const dx = (Math.random() - 0.5) * sh.amount * 2;
        const dy = (Math.random() - 0.5) * sh.amount * 2;
        sh.amount *= 0.72;
        if (wrapperRef.current) wrapperRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      } else {
        sh.amount = 0;
        if (wrapperRef.current) wrapperRef.current.style.transform = '';
      }

      // ── Draw frame ──────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);
      drawArena(ctx);

      // Special effects (behind fighters)
      for (const effect of specialEffectsRef.current) {
        drawSpecialEffect(ctx, effect);
        effect.particles = updateParticles(effect.particles);
        effect.timer--;
      }
      specialEffectsRef.current = specialEffectsRef.current.filter(e => e.timer > 0 || e.particles.length > 0);

      // Fighters
      const p1Color = ARCHETYPE_COLORS[player1.stats.archetype] || '#00ffff';
      const p2Color = ARCHETYPE_COLORS[player2.stats.archetype] || '#ff00ff';
      drawFighter(ctx, p1, p1Color, 'left',  player1.profile.username, player1.stats.archetype);
      drawFighter(ctx, p2, p2Color, 'right', player2.profile.username, player2.stats.archetype);

      // Status indicators: invincibility aura + stun stars
      for (const f of [p1, p2]) {
        const cx = f.x + FW / 2;
        if (f.invincibleTimer > 0) {
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 90);
          ctx.save();
          ctx.globalAlpha = 0.4 + pulse * 0.4;
          ctx.strokeStyle = '#ffd700';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 16;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(cx, f.y + FH / 2, FW * 0.75, FH * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        if (f.stunTimer > 0 && f.state !== 'dead') {
          ctx.save();
          ctx.font = '10px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          for (let s = 0; s < 3; s++) {
            const a = Date.now() / 200 + (s * Math.PI * 2) / 3;
            ctx.fillStyle = '#ffe666';
            ctx.fillText('✦', cx + Math.cos(a) * 16, f.y - 6 + Math.sin(a) * 4);
          }
          ctx.restore();
        }
      }

      // Hit rings
      for (const ring of hitRingsRef.current) {
        drawHitRing(ctx, ring);
        ring.radius += (ring.maxRadius - ring.radius) * 0.2;
        ring.alpha -= 0.04;
        ring.width *= 0.93;
      }
      hitRingsRef.current = hitRingsRef.current.filter(r => r.alpha > 0);

      // Hit particles
      particlesRef.current = updateParticles(particlesRef.current);
      drawParticles(ctx, particlesRef.current);

      // Damage text
      for (const t of hitTextRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, t.timer / 20);
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 10;
        ctx.font = `bold ${t.size}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y - (45 - t.timer) * 0.6);
        t.timer--;
        ctx.restore();
      }
      hitTextRef.current = hitTextRef.current.filter(t => t.timer > 0);

      // Screen flash
      if (screenFlashRef.current) {
        const f = screenFlashRef.current;
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        f.alpha -= 0.05;
        if (f.alpha <= 0) screenFlashRef.current = null;
      }

      // Game over overlay
      if (gameOverRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        const winnerName = p1.hp > p2.hp ? player1.profile.username : player2.profile.username;
        const winnerColor = p1.hp > p2.hp
          ? (ARCHETYPE_COLORS[player1.stats.archetype] || '#00ffff')
          : (ARCHETYPE_COLORS[player2.stats.archetype] || '#ff00ff');

        // K.O.!
        ctx.textAlign = 'center';
        ctx.font = 'bold 52px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff0040';
        ctx.shadowColor = '#ff0040';
        ctx.shadowBlur = 40;
        ctx.fillText('K.O.!', W / 2, H / 2 - 20);

        // Winner name
        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.fillStyle = winnerColor;
        ctx.shadowColor = winnerColor;
        ctx.shadowBlur = 20;
        ctx.fillText(`${winnerName.toUpperCase()} WINS!`, W / 2, H / 2 + 28);

        if (disconnectedRef.current) {
          ctx.font = 'bold 11px "Press Start 2P", monospace';
          ctx.fillStyle = '#ff8800';
          ctx.shadowColor = '#ff8800';
          ctx.shadowBlur = 10;
          ctx.fillText('OPPONENT DISCONNECTED', W / 2, H / 2 + 60);
        }
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    // Watchdog: fires every 3s even when tab is in background (rAF pauses on hidden tabs)
    const watchdog = p2pMode ? setInterval(() => {
      if (gameOverRef.current || koFiredRef.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed < 5) return;
      const silenceMs = Date.now() - lastRemoteSignalRef.current;
      if (silenceMs > 15000) {
        if (p2pMode === 'host') {
          gameOverRef.current = true;
          fightChannelRef.current?.send({
            type: 'broadcast',
            event: 'game_over',
            payload: { winnerSide: 'left', maxCombo: maxComboRef.current, duration: Math.floor(elapsed), disconnected: true },
          });
          firKO(player1, player2, elapsed, true);
        } else if (p2pMode === 'client') {
          gameOverRef.current = true;
          firKO(player2, player1, elapsed, true);
        }
      }
    }, 3000) : null;

    frameRef.current = requestAnimationFrame(loop);
    startBgMusic();
    return () => {
      if (watchdog) clearInterval(watchdog);
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      stopBgMusic();
    };
  }, [player1, player2, doAttack, onMatchEnd, p2AI]);

  const p1Color = ARCHETYPE_COLORS[player1.stats.archetype] || '#00ffff';
  const p2Color = ARCHETYPE_COLORS[player2.stats.archetype] || '#ff00ff';

  const touchPress = useCallback((key: string) => {
    keysRef.current.add(key);
    sendInputRef.current();
  }, []);

  const touchRelease = useCallback((key: string) => {
    keysRef.current.delete(key);
    sendInputRef.current();
  }, []);

  const dpadBtnStyle = (color: string): React.CSSProperties => ({
    position: 'absolute',
    width: '46px', height: '46px',
    background: `${color}18`,
    border: `2px solid ${color}60`,
    color,
    fontFamily: 'var(--pixel)',
    fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    touchAction: 'none',
    outline: 'none',
  });

  return (
    <div className="flex flex-col items-center w-full select-none" style={{ touchAction: 'none' }}>
      {/* HUD */}
      <div className="w-full flex items-center gap-1 sm:gap-3 mb-1 sm:mb-2 px-1 sm:px-2" style={{ maxWidth: '800px' }}>
        <HPBar
          hp={p1Hp} maxHp={100} name={player1.profile.username}
          side="left" color={p1Color} rage={p1Rage}
          specialHits={p1Hits} specialReady={p1SpecialReady}
        />

        <div className="flex flex-col items-center flex-shrink-0" style={{ width: 'clamp(52px,10vw,96px)' }}>
          <div className="font-pixel text-white" style={{ fontSize: 'clamp(7px,1.5vw,11px)', marginBottom: '1px' }}>R{round}</div>
          <div className="font-pixel"
            style={{ fontSize: 'clamp(18px,5vw,28px)', color: timeLeft <= 10 ? '#ff0040' : '#ffff00', textShadow: `0 0 12px ${timeLeft <= 10 ? '#ff0040' : '#ffff00'}` }}>
            {timeLeft}
          </div>
          <div className="font-pixel" style={{ color: '#bf00ff', fontSize: 'clamp(5px,1.2vw,7px)', marginTop: '1px', textAlign: 'center' }}>
            {combo1 > 2 ? `P1 ${combo1}x` : combo2 > 2 ? `P2 ${combo2}x` : 'FIGHT!'}
          </div>
        </div>

        <HPBar
          hp={p2Hp} maxHp={100} name={player2.profile.username}
          side="right" color={p2Color} rage={p2Rage}
          specialHits={p2Hits} specialReady={p2SpecialReady}
        />
      </div>

      {/* Canvas */}
      <div className="relative w-full" ref={wrapperRef} style={{ maxWidth: '800px' }}>
        <canvas ref={canvasRef} width={W} height={H} className="block w-full"
          style={{ border: '2px solid #bf00ff', boxShadow: '0 0 30px #bf00ff50', height: 'auto' }}
        />
        {showAnnounce && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="font-pixel animate-pulse"
              style={{ fontSize: 'clamp(20px,6vw,36px)', color: '#ffff00', textShadow: '0 0 30px #ffff00, 0 0 60px #ffaa00' }}>
              ROUND 1
            </div>
          </div>
        )}
      </div>

      {/* Keyboard controls hint — hidden on mobile */}
      <div className="hidden sm:flex gap-6 mt-2 text-xs font-mono text-gray-600 flex-wrap justify-center">
        <div>
          <span style={{ color: p1Color }}>P1:</span>{' '}
          WASD=move · F=punch · G=kick · <span style={{ color: '#ffff00' }}>H=special(5hits)</span> · V=ult · S=block
        </div>
        <div>
          <span style={{ color: p2Color }}>P2:</span>{' '}
          ←→↑=move · 1=punch · 2=kick · <span style={{ color: '#ffff00' }}>3=special(5hits)</span> · 4=ult · ↓=block
        </div>
      </div>

      {/* Virtual Touch Gamepad — mobile only */}
      <div className="arena-touch-pad w-full justify-between items-center px-3 mt-2"
        style={{ maxWidth: '800px', touchAction: 'none', userSelect: 'none' }}>

        {/* D-pad */}
        <div style={{ position: 'relative', width: '138px', height: '138px', flexShrink: 0 }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '46px', height: '46px',
            background: 'rgba(255,255,255,.04)',
            border: '2px solid rgba(255,255,255,.06)',
          }} />
          {/* UP — jump */}
          <button
            onTouchStart={(e) => { e.preventDefault(); touchPress('w'); }}
            onTouchEnd={(e) => { e.preventDefault(); touchRelease('w'); }}
            onTouchCancel={(e) => { e.preventDefault(); touchRelease('w'); }}
            style={{ ...dpadBtnStyle('var(--neon-b)'), top: 0, left: '50%', transform: 'translateX(-50%)' }}>
            ▲
          </button>
          {/* LEFT */}
          <button
            onTouchStart={(e) => { e.preventDefault(); touchPress('a'); }}
            onTouchEnd={(e) => { e.preventDefault(); touchRelease('a'); }}
            onTouchCancel={(e) => { e.preventDefault(); touchRelease('a'); }}
            style={{ ...dpadBtnStyle('var(--neon-b)'), top: '50%', left: 0, transform: 'translateY(-50%)' }}>
            ◀
          </button>
          {/* RIGHT */}
          <button
            onTouchStart={(e) => { e.preventDefault(); touchPress('d'); }}
            onTouchEnd={(e) => { e.preventDefault(); touchRelease('d'); }}
            onTouchCancel={(e) => { e.preventDefault(); touchRelease('d'); }}
            style={{ ...dpadBtnStyle('var(--neon-b)'), top: '50%', right: 0, transform: 'translateY(-50%)' }}>
            ▶
          </button>
          {/* DOWN — block */}
          <button
            onTouchStart={(e) => { e.preventDefault(); touchPress('s'); }}
            onTouchEnd={(e) => { e.preventDefault(); touchRelease('s'); }}
            onTouchCancel={(e) => { e.preventDefault(); touchRelease('s'); }}
            style={{ ...dpadBtnStyle('var(--neon-pink)'), bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
            <span style={{ fontSize: '8px' }}>BLK</span>
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexShrink: 0 }}>
          {([
            { label: 'P', key: 'f', color: '#ff2d75' },
            { label: 'K', key: 'g', color: '#00e5ff' },
            { label: 'SP', key: 'h', color: '#ffd60a' },
            { label: 'ULT', key: 'v', color: '#b026ff' },
          ] as const).map(({ label, key, color }) => (
            <button
              key={label}
              onTouchStart={(e) => { e.preventDefault(); touchPress(key); }}
              onTouchEnd={(e) => { e.preventDefault(); touchRelease(key); }}
              onTouchCancel={(e) => { e.preventDefault(); touchRelease(key); }}
              style={{
                width: '62px', height: '62px',
                background: `${color}1a`,
                border: `3px solid ${color}70`,
                color,
                fontFamily: 'var(--pixel)',
                fontSize: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                touchAction: 'none',
                outline: 'none',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
