import { useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { getLevelTier, xpNeededForNextLevel, LEVEL_TIERS } from '../utils/playerProfile';
import { Fighter } from '../types';
import { drawArchetypeFighter } from '../utils/fighterSprites';

export function Landing() {
  const { setScreen, setPlayer1 } = useGameStore();
  const goLogin = () => setScreen('login');

  const elonProfile = DEMO_PROFILES.find(p => p.username === 'elonmusk')!;
  const elonStats = calculateFighterStats(elonProfile);
  const elonLevel = 1;
  const elonTier = getLevelTier(elonLevel);
  const elonXpMax = xpNeededForNextLevel(elonLevel);
  const elonNextTier = LEVEL_TIERS.find(t => t.minLevel > elonLevel);

  const vitalikProfile = DEMO_PROFILES.find(p => p.username === 'VitalikButerin')!;
  const vitalikStats = calculateFighterStats(vitalikProfile);
  const gpCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = gpCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = 800, H = 500;
    canvas.width = W;
    canvas.height = H;

    // Capture archetype data once — DEMO_PROFILES is static
    const eArch = elonStats.archetype;
    const eColor = elonStats.color;
    const eLabel = elonStats.archetypeLabel;
    const vArch = vitalikStats.archetype;
    const vColor = vitalikStats.color;
    const vLabel = vitalikStats.archetypeLabel;

    let p1Hp = 100, p2Hp = 62;
    let combo = 0, ultPct = 0, timer = 42;
    let p1State = 'idle', p2State = 'idle';
    let phase = 0;
    let lastPhase = performance.now();
    let lastTimerTick = performance.now();
    let raf: number;

    function drawHPBar(x: number, y: number, w: number, h: number, pct: number, color: string, reversed = false) {
      ctx.fillStyle = '#0a0118';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      const bw = Math.max(0, (w - 4) * Math.min(pct, 100) / 100);
      ctx.fillStyle = color;
      if (reversed) {
        ctx.fillRect(x + w - 2 - bw, y + 2, bw, h - 4);
      } else {
        ctx.fillRect(x + 2, y + 2, bw, h - 4);
      }
    }

    function frame(now: number) {
      // Phase cycle: idle → p1atk → p2hurt → p2atk → p1hurt → idle → …
      if (now - lastPhase > 720) {
        phase = (phase + 1) % 6;
        lastPhase = now;
        switch (phase) {
          case 1: p1State = 'punch'; p2State = 'idle'; break;
          case 2: p1State = 'idle'; p2State = 'hurt'; p2Hp = Math.max(0, p2Hp - 9); combo++; ultPct = Math.min(100, ultPct + 16); break;
          case 3: p1State = 'idle'; p2State = 'kick'; break;
          case 4: p1State = 'hurt'; p2State = 'idle'; p1Hp = Math.max(38, p1Hp - 5); ultPct = Math.min(100, ultPct + 8); break;
          case 5: p1State = 'idle'; p2State = 'idle'; combo = 0; break;
          default: p1State = 'idle'; p2State = 'idle';
        }
        if (p2Hp <= 0) { p2Hp = 80; p1Hp = 100; combo = 0; ultPct = 0; timer = 42; }
      }
      if (now - lastTimerTick > 1000) {
        timer = Math.max(0, timer - 1);
        lastTimerTick = now;
        if (timer === 0) { timer = 42; p1Hp = 100; p2Hp = 62; combo = 0; ultPct = 0; }
      }

      // Background
      ctx.clearRect(0, 0, W, H);
      const bgLin = ctx.createLinearGradient(0, 0, 0, H);
      bgLin.addColorStop(0, '#1a0834');
      bgLin.addColorStop(1, '#0c0220');
      ctx.fillStyle = bgLin;
      ctx.fillRect(0, 0, W, H);
      const bgRad = ctx.createRadialGradient(W / 2, H * 0.85, 0, W / 2, H * 0.85, W * 0.55);
      bgRad.addColorStop(0, 'rgba(255,45,117,.2)');
      bgRad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgRad;
      ctx.fillRect(0, 0, W, H);

      // Ground
      const groundY = Math.round(H * 0.72);
      const grdFill = ctx.createLinearGradient(0, groundY, 0, H);
      grdFill.addColorStop(0, 'transparent');
      grdFill.addColorStop(0.4, 'rgba(176,38,255,.35)');
      grdFill.addColorStop(1, 'rgba(176,38,255,.5)');
      ctx.fillStyle = grdFill;
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.strokeStyle = '#b026ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.22)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 32) {
        ctx.beginPath(); ctx.moveTo(gx, groundY); ctx.lineTo(gx, H); ctx.stroke();
      }

      // HUD — P1
      ctx.textAlign = 'left';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffd60a';
      ctx.fillText('@elonmusk', 16, 18);
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = eColor;
      ctx.fillText(eLabel.toUpperCase() + ' · LV1', 16, 31);
      drawHPBar(16, 36, 200, 15, p1Hp, eColor);

      // HUD — P2
      ctx.textAlign = 'right';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#ff2d75';
      ctx.fillText('@VitalikButerin', W - 16, 18);
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = vColor;
      ctx.fillText('LV1 · ' + vLabel.toUpperCase(), W - 16, 31);
      drawHPBar(W - 216, 36, 200, 15, p2Hp, vColor, true);

      // Timer
      ctx.textAlign = 'center';
      ctx.font = '26px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffd60a';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(String(timer).padStart(2, '0'), W / 2, 44);
      ctx.shadowBlur = 0;

      // Fighter shadows
      const FLOOR = groundY - 1;
      const FH = 90, FW = 50;
      const p1ox = Math.round(W * 0.22) - FW / 2;
      const p1oy = FLOOR - FH;
      const p2ox = Math.round(W * 0.78) - FW / 2;
      const p2oy = FLOOR - FH;
      ctx.fillStyle = 'rgba(0,0,0,.38)';
      ctx.beginPath(); ctx.ellipse(p1ox + FW / 2, FLOOR + 4, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p2ox + FW / 2, FLOOR + 4, 22, 6, 0, 0, Math.PI * 2); ctx.fill();

      // Fighters
      drawArchetypeFighter(ctx, eArch, p1State, 1, p1ox, p1oy, now, true);
      drawArchetypeFighter(ctx, vArch, p2State, -1, p2ox, p2oy, now, true);

      // Combo counter
      if (combo > 0) {
        const pulse = Math.floor(now / 200) % 2 === 0 ? 1.05 : 1.0;
        ctx.save();
        ctx.translate(Math.round(W * 0.15), Math.round(H * 0.48));
        ctx.scale(pulse, pulse);
        ctx.textAlign = 'center';
        ctx.font = '11px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd60a';
        ctx.shadowColor = '#ff2d75'; ctx.shadowBlur = 8;
        ctx.fillText('x' + combo, 0, -18);
        ctx.font = '30px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff2d75';
        ctx.fillText(combo + '!', 0, 12);
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd60a'; ctx.shadowBlur = 0;
        ctx.fillText('HIT COMBO', 0, 28);
        ctx.restore();
      }

      // ULT meter
      const ultX = Math.round(W / 2 - 180);
      const ultY = H - 26;
      const ultW = 360;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#00e5ff';
      ctx.fillText('ULT', ultX - 34, ultY + 10);
      ctx.fillStyle = '#0a0118';
      ctx.fillRect(ultX, ultY, ultW, 13);
      ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2;
      ctx.strokeRect(ultX, ultY, ultW, 13);
      const uw = (ultW - 4) * ultPct / 100;
      for (let ux = 0; ux < uw; ux += 12) {
        ctx.fillStyle = (Math.floor(ux / 6) % 2 === 0) ? '#00e5ff' : '#57f1ff';
        ctx.fillRect(ultX + 2 + ux, ultY + 2, Math.min(6, uw - ux), 9);
      }
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = ultPct >= 100 ? '#ff2d75' : '#00e5ff';
      ctx.fillText(ultPct >= 100 ? 'MAX' : Math.round(ultPct) + '%', ultX + ultW + 40, ultY + 10);

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []); // DEMO_PROFILES is static — safe to omit deps

  const tryDemo = () => {
    const profile = DEMO_PROFILES[Math.floor(Math.random() * DEMO_PROFILES.length)];
    const fighter: Fighter = { profile, stats: calculateFighterStats(profile) };
    setPlayer1(fighter);
    setScreen('mode_select');
  };

  return (
    <div className="lp">
      <style>{`
        .lp {
          --void:#0a0118;--void-2:#140827;--void-3:#1d0b3a;--panel:#22103f;--panel-line:#3a1c5e;
          --neon-p:#b026ff;--neon-b:#00e5ff;--neon-pink:#ff2d75;--neon-yel:#ffd60a;--neon-grn:#00ff9d;
          --txt:#e8e3ff;--txt-dim:#a695d4;
          --pixel:'Press Start 2P',monospace;--body:'VT323',monospace;--mono:'JetBrains Mono',monospace;
          background:
            radial-gradient(ellipse at top,rgba(176,38,255,.18),transparent 60%),
            radial-gradient(ellipse at 80% 30%,rgba(0,229,255,.12),transparent 55%),
            var(--void);
          color:var(--txt);
          font-family:var(--body);
          font-size:22px;
          line-height:1.35;
          -webkit-font-smoothing:none;
          font-smooth:never;
          image-rendering:pixelated;
          overflow-x:hidden;
          min-height:100vh;
        }
        .lp h1,.lp h2,.lp h3,.lp h4{font-family:var(--pixel);font-weight:400;line-height:1.4;letter-spacing:.02em}
        .lp h1{font-size:28px}.lp h2{font-size:22px}.lp h3{font-size:14px}.lp h4{font-size:11px}
        .lp p{font-size:22px;color:var(--txt);max-width:60ch}
        .lp .mono{font-family:var(--mono);font-size:13px;letter-spacing:.06em;text-transform:uppercase}
        .lp .tag{font-family:var(--pixel);font-size:9px;color:var(--neon-b);letter-spacing:.15em;text-transform:uppercase}

        /* Pixel button */
        .pxbtn{display:inline-flex;align-items:center;gap:10px;font-family:var(--pixel);font-size:11px;color:var(--void);background:var(--neon-yel);padding:16px 22px;border:0;cursor:pointer;position:relative;box-shadow:0 4px 0 0 #b38800,0 4px 0 4px var(--void),0 8px 0 4px #5a1a99;text-decoration:none;text-transform:uppercase;letter-spacing:.05em;transition:transform .08s ease,box-shadow .08s ease}
        .pxbtn:hover{transform:translate(0,2px);box-shadow:0 2px 0 0 #b38800,0 2px 0 4px var(--void),0 4px 0 4px #5a1a99}
        .pxbtn.ghost{background:var(--void);color:var(--neon-b);box-shadow:0 4px 0 0 #003a4d,0 4px 0 4px var(--neon-b),0 8px 0 4px #5a1a99}
        .pxbtn.ghost:hover{box-shadow:0 2px 0 0 #003a4d,0 2px 0 4px var(--neon-b),0 4px 0 4px #5a1a99}
        .pxbtn.pink{background:var(--neon-pink);color:#fff;box-shadow:0 4px 0 0 #800030,0 4px 0 4px var(--void),0 8px 0 4px #5a1a99}

        /* Pixel panel */
        .panel{position:relative;background:var(--panel);border:4px solid var(--neon-p);box-shadow:inset 0 0 0 4px var(--void),0 0 0 4px var(--void),0 0 24px rgba(176,38,255,.4);padding:24px}
        .panel.blue{border-color:var(--neon-b);box-shadow:inset 0 0 0 4px var(--void),0 0 0 4px var(--void),0 0 24px rgba(0,229,255,.35)}
        .panel.pink{border-color:var(--neon-pink);box-shadow:inset 0 0 0 4px var(--void),0 0 0 4px var(--void),0 0 24px rgba(255,45,117,.35)}
        .panel.yel{border-color:var(--neon-yel);box-shadow:inset 0 0 0 4px var(--void),0 0 0 4px var(--void),0 0 24px rgba(255,214,10,.3)}
        .panel .corners i{position:absolute;width:10px;height:10px;background:var(--neon-yel)}
        .panel .corners i:nth-child(1){top:-2px;left:-2px}
        .panel .corners i:nth-child(2){top:-2px;right:-2px}
        .panel .corners i:nth-child(3){bottom:-2px;left:-2px}
        .panel .corners i:nth-child(4){bottom:-2px;right:-2px}

        /* Nav */
        .lp nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:14px 32px;background:rgba(10,1,24,.85);border-bottom:4px solid var(--neon-p);backdrop-filter:blur(2px)}
        .logo{display:flex;align-items:center;gap:12px;font-family:var(--pixel);font-size:14px;color:var(--neon-yel);text-shadow:2px 2px 0 var(--neon-pink)}
        .logo .badge{width:32px;height:32px;background:var(--neon-p);position:relative;display:grid;place-items:center;color:#fff;font-family:var(--pixel);font-size:14px;box-shadow:4px 4px 0 var(--void),4px 4px 0 4px var(--neon-b)}
        .nav-links{display:flex;gap:28px;font-family:var(--pixel);font-size:10px;color:var(--txt-dim)}
        .nav-links a{color:var(--txt-dim);text-decoration:none;letter-spacing:.1em}
        .nav-links a:hover{color:var(--neon-b);text-shadow:0 0 8px var(--neon-b)}
        .status{display:flex;align-items:center;gap:8px;font-family:var(--pixel);font-size:9px;color:var(--neon-grn)}
        .dot{width:10px;height:10px;background:var(--neon-grn);animation:blink 1s steps(2) infinite}
        @keyframes blink{50%{opacity:.2}}

        /* Section scaffolding */
        .lp section{padding:96px 32px;position:relative}
        .wrap{max-width:1280px;margin:0 auto}
        .eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:var(--pixel);font-size:10px;color:var(--neon-b);letter-spacing:.2em;margin-bottom:24px}
        .eyebrow::before{content:"";width:24px;height:4px;background:var(--neon-b)}
        .sec-head{margin-bottom:56px;display:flex;align-items:end;justify-content:space-between;gap:32px;flex-wrap:wrap}
        .sec-head h2{max-width:18ch;text-shadow:3px 3px 0 var(--neon-pink)}

        /* Hero */
        .hero{padding:48px 32px 96px;min-height:90vh;display:flex;align-items:center;position:relative;overflow:hidden}
        .hero-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:start;width:100%;max-width:1280px;margin:0 auto;position:relative;z-index:2}
        .hero h1{font-size:36px;line-height:1.5;text-shadow:4px 4px 0 var(--neon-pink),8px 8px 0 var(--void-3)}
        .hero h1 .lit{color:var(--neon-yel)}
        .hero .sub{font-size:24px;color:var(--txt-dim);margin:32px 0;max-width:38ch}
        .hero .sub b{color:var(--neon-b);font-weight:normal}
        .hero .cta{display:flex;gap:32px;margin-top:40px;flex-wrap:wrap}
        .hero .meta{display:flex;gap:32px;margin-top:56px;font-family:var(--pixel);font-size:9px;color:var(--txt-dim);letter-spacing:.15em}
        .hero .meta span b{color:var(--neon-yel);font-weight:normal;font-size:14px;display:block;margin-bottom:6px}
        .arena-bg{position:absolute;inset:0;z-index:1;opacity:.7}
        .arena-bg .grid{position:absolute;inset:0;background:linear-gradient(0deg,transparent 95%,rgba(176,38,255,.4) 95%),linear-gradient(90deg,transparent 95%,rgba(0,229,255,.25) 95%);background-size:48px 48px;transform:perspective(600px) rotateX(60deg);transform-origin:center 80%;mask:linear-gradient(180deg,transparent 0%,#000 40%,#000 80%,transparent 100%)}
        .arena-bg .floor{position:absolute;bottom:0;left:0;right:0;height:35%;background:linear-gradient(180deg,transparent,rgba(176,38,255,.25))}
        .silhouette{position:absolute;bottom:14%;font-family:var(--pixel);font-size:12px;letter-spacing:.2em;color:rgba(255,255,255,.08)}
        .silhouette.l{left:8%}.silhouette.r{right:8%}
        .pixel-spark{position:absolute;width:8px;height:8px;background:var(--neon-yel);box-shadow:0 0 12px var(--neon-yel);animation:rise 4s linear infinite}
        @keyframes rise{0%{transform:translateY(0);opacity:0}10%{opacity:1}100%{transform:translateY(-300px);opacity:0}}
        .fighter-card{position:relative}
        .fighter-frame{aspect-ratio:4/5;background:repeating-linear-gradient(45deg,rgba(176,38,255,.12) 0 6px,transparent 6px 12px),linear-gradient(180deg,#1a0834,#0c0220);border:6px solid var(--neon-b);box-shadow:inset 0 0 0 4px var(--void),0 0 0 4px var(--void),0 0 40px rgba(0,229,255,.5);position:relative;display:grid;place-items:center;overflow:hidden}
        .pixel-fighter{position:relative;width:140px;height:200px;background:linear-gradient(180deg,transparent 0%,transparent 16%,var(--neon-pink) 16%,var(--neon-pink) 28%,transparent 28%,transparent 32%,var(--neon-p) 32%,var(--neon-p) 70%,transparent 70%,transparent 72%,var(--neon-b) 72%,var(--neon-b) 96%,transparent 96%);image-rendering:pixelated;filter:drop-shadow(4px 4px 0 var(--void));animation:bob 1.2s steps(2) infinite}
        @keyframes bob{50%{transform:translateY(-6px)}}
        .scan{position:absolute;left:0;right:0;height:2px;background:var(--neon-b);box-shadow:0 0 12px var(--neon-b);animation:scan 3s linear infinite;opacity:.7}
        @keyframes scan{0%{top:0}100%{top:100%}}
        .stat-strip{position:absolute;left:-16px;top:32px;background:var(--void);border:3px solid var(--neon-yel);padding:10px 14px;font-family:var(--pixel);font-size:9px;color:var(--neon-yel);box-shadow:4px 4px 0 var(--neon-p)}
        .stat-strip.r{left:auto;right:-16px;top:auto;bottom:32px;border-color:var(--neon-pink);color:var(--neon-pink);box-shadow:4px 4px 0 var(--neon-b)}
        .hud{position:absolute;top:14px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:center;font-family:var(--pixel);font-size:9px;color:var(--neon-yel)}
        .hud .hp{display:flex;align-items:center;gap:8px}
        .hp-bar{width:120px;height:10px;background:var(--void);border:2px solid #fff;position:relative}
        .hp-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--neon-grn),var(--neon-yel) 70%,var(--neon-pink));width:84%;animation:hppulse 2s steps(8) infinite}
        @keyframes hppulse{50%{width:78%}}

        /* How It Works */
        .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
        .step .num{font-family:var(--pixel);font-size:48px;color:var(--neon-p);text-shadow:4px 4px 0 var(--void),4px 4px 0 6px var(--neon-yel);line-height:1;margin-bottom:24px;display:block}
        .step h3{margin-bottom:16px;color:var(--neon-yel)}
        .step p{font-size:20px;color:var(--txt-dim)}
        .step .ico{width:64px;height:64px;background:var(--void);border:4px solid var(--neon-b);display:grid;place-items:center;font-family:var(--pixel);font-size:18px;color:var(--neon-b);margin-bottom:24px;box-shadow:4px 4px 0 var(--neon-pink)}
        .flow-strip{margin-top:48px;padding:28px;background:var(--void-2);border:4px dashed var(--panel-line);display:flex;align-items:center;justify-content:center;gap:18px;font-family:var(--pixel);font-size:11px;color:var(--txt-dim);flex-wrap:wrap}
        .flow-strip b{color:var(--neon-yel);font-weight:normal;background:var(--void);padding:8px 14px;border:3px solid var(--neon-yel);box-shadow:3px 3px 0 var(--neon-p)}
        .flow-strip .arr{color:var(--neon-b);font-size:18px;animation:dash 1.2s steps(3) infinite}
        @keyframes dash{50%{transform:translateX(6px)}}

        /* Character System */
        .char-wrap{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
        .stat-list{display:flex;flex-direction:column;gap:16px}
        .stat-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:18px 22px;background:var(--void-2);border-left:6px solid var(--neon-p);border-right:6px solid var(--neon-b);position:relative}
        .stat-row .from{font-family:var(--pixel);font-size:11px;color:var(--neon-b)}
        .stat-row .to{font-family:var(--pixel);font-size:11px;color:var(--neon-yel);text-align:right}
        .stat-row .arr{font-family:var(--pixel);font-size:14px;color:var(--neon-pink)}
        .stat-row:hover{background:var(--void-3)}
        .rpg{padding:24px;font-family:var(--mono);font-size:13px;color:var(--neon-b)}
        .rpg .title{font-family:var(--pixel);font-size:12px;color:var(--neon-yel);margin-bottom:6px;letter-spacing:.1em}
        .rpg .sub{font-family:var(--pixel);font-size:9px;color:var(--txt-dim);margin-bottom:24px;letter-spacing:.2em}
        .rpg .row{display:flex;align-items:center;gap:14px;margin-bottom:14px;font-family:var(--pixel);font-size:10px}
        .rpg .row .lbl{width:80px;color:var(--txt);letter-spacing:.1em}
        .rpg .bar{flex:1;height:14px;background:var(--void);border:2px solid var(--panel-line);position:relative;overflow:hidden}
        .rpg .bar i{display:block;height:100%;background:repeating-linear-gradient(90deg,var(--neon-pink) 0 6px,#ff5494 6px 8px)}
        .rpg .val{width:54px;text-align:right;color:var(--neon-yel);font-size:10px}
        .rpg .divide{border-top:2px dashed var(--panel-line);margin:18px 0}
        .rpg .traits{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .rpg .traits span{font-family:var(--pixel);font-size:9px;color:var(--neon-grn);border:2px solid var(--neon-grn);padding:5px 8px;letter-spacing:.1em}
        .rpg .footer{margin-top:24px;display:flex;justify-content:space-between;font-family:var(--pixel);font-size:9px;color:var(--txt-dim);letter-spacing:.15em}

        /* Archetypes */
        .archetype-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
        .arch{padding:0;background:var(--panel);border:4px solid var(--neon-p);box-shadow:6px 6px 0 var(--void),6px 6px 0 8px var(--neon-pink);position:relative;cursor:pointer;transition:transform .15s steps(3)}
        .arch:hover{transform:translate(-3px,-3px);box-shadow:9px 9px 0 var(--void),9px 9px 0 12px var(--neon-yel)}
        .arch .portrait{aspect-ratio:1;background:repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0 6px,transparent 6px 12px),linear-gradient(180deg,#1a0834,#0c0220);position:relative;display:grid;place-items:center;border-bottom:4px solid var(--neon-p)}
        .arch .portrait .glyph{font-family:var(--pixel);font-size:42px;color:var(--neon-yel);text-shadow:3px 3px 0 var(--neon-pink),6px 6px 0 var(--void)}
        .arch .body{padding:20px}
        .arch h3{font-size:13px;color:var(--neon-b);margin-bottom:10px}
        .arch p{font-size:18px;color:var(--txt-dim)}
        .arch .ult{margin-top:14px;font-family:var(--pixel);font-size:9px;color:var(--neon-yel);letter-spacing:.15em;border-top:2px dashed var(--panel-line);padding-top:12px}
        .arch .ult b{color:var(--neon-pink);font-weight:normal}
        .arch .rarity{position:absolute;top:10px;right:10px;font-family:var(--pixel);font-size:8px;padding:5px 8px;background:var(--void);color:var(--neon-yel);letter-spacing:.2em;border:2px solid var(--neon-yel);z-index:2}
        .arch:nth-child(2) .rarity{color:var(--neon-pink);border-color:var(--neon-pink)}
        .arch:nth-child(3) .rarity{color:var(--neon-b);border-color:var(--neon-b)}
        .arch:nth-child(4) .rarity{color:var(--neon-grn);border-color:var(--neon-grn)}

        /* Gameplay */
        .gameplay{background:linear-gradient(180deg,transparent,rgba(0,229,255,.06))}
        .gp-wrap{display:grid;grid-template-columns:1fr 1.4fr;gap:56px;align-items:center}
        .gp-screen{position:relative;aspect-ratio:16/10;background:radial-gradient(ellipse at center bottom,rgba(255,45,117,.35),transparent 60%),linear-gradient(180deg,#1a0834 0%,#0c0220 100%);border:6px solid var(--neon-yel);box-shadow:inset 0 0 0 4px var(--void),0 0 0 4px var(--void),0 0 50px rgba(255,214,10,.3);overflow:hidden}
        .gp-screen .ground{position:absolute;bottom:0;left:0;right:0;height:30%;background:linear-gradient(180deg,transparent,rgba(176,38,255,.35) 50%,rgba(176,38,255,.5));border-top:4px solid var(--neon-p)}
        .gp-screen .ground::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 32px,rgba(0,0,0,.3) 32px 34px)}
        .gp-hud{position:absolute;top:18px;left:18px;right:18px;display:flex;justify-content:space-between;align-items:flex-start}
        .gp-player{flex:1;max-width:42%}
        .gp-player .name{font-family:var(--pixel);font-size:11px;color:var(--neon-yel);margin-bottom:6px;letter-spacing:.1em}
        .gp-player.r .name{color:var(--neon-pink);text-align:right}
        .gp-hpbar{height:18px;background:var(--void);border:3px solid #fff;position:relative}
        .gp-hpbar i{display:block;height:100%;background:linear-gradient(90deg,var(--neon-grn),var(--neon-yel),var(--neon-pink))}
        .gp-hpbar.r i{background:linear-gradient(270deg,var(--neon-grn),var(--neon-yel),var(--neon-pink))}
        .gp-timer{font-family:var(--pixel);font-size:32px;color:var(--neon-yel);text-shadow:3px 3px 0 var(--void);padding:0 18px}
        .combo{position:absolute;top:38%;left:8%;font-family:var(--pixel);font-size:16px;color:var(--neon-yel);text-shadow:3px 3px 0 var(--neon-pink),6px 6px 0 var(--void);animation:pop 1.2s steps(4) infinite}
        .combo b{font-size:42px;display:block;color:var(--neon-pink);text-shadow:4px 4px 0 var(--void)}
        @keyframes pop{0%,40%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)}}
        .ult-meter{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);width:60%;display:flex;align-items:center;gap:10px}
        .ult-meter .ult-label{font-family:var(--pixel);font-size:9px;color:var(--neon-b);letter-spacing:.2em}
        .ult-meter .ult-bar{flex:1;height:14px;background:var(--void);border:3px solid var(--neon-b);position:relative}
        .ult-meter .ult-bar i{display:block;height:100%;width:72%;background:repeating-linear-gradient(45deg,var(--neon-b) 0 6px,#57f1ff 6px 12px);animation:ultfill 3s steps(20) infinite}
        @keyframes ultfill{50%{width:90%}}
        .gp-fighter{position:absolute;bottom:22%}
        .gp-fighter.l{left:18%;width:80px;height:120px;background:linear-gradient(180deg,var(--neon-yel) 0 22%,transparent 22% 26%,var(--neon-pink) 26% 56%,transparent 56% 60%,var(--neon-p) 60% 100%);filter:drop-shadow(3px 3px 0 var(--void))}
        .gp-fighter.r{right:18%;width:80px;height:120px;background:linear-gradient(180deg,var(--neon-grn) 0 22%,transparent 22% 26%,var(--neon-b) 26% 56%,transparent 56% 60%,var(--neon-p) 60% 100%);filter:drop-shadow(3px 3px 0 var(--void));transform:scaleX(-1)}
        .gp-features{list-style:none;margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .gp-features li{font-family:var(--pixel);font-size:11px;color:var(--txt);padding:18px;background:var(--void-2);border-left:6px solid var(--neon-b);letter-spacing:.05em}
        .gp-features li:nth-child(2){border-color:var(--neon-pink)}
        .gp-features li:nth-child(3){border-color:var(--neon-yel)}
        .gp-features li:nth-child(4){border-color:var(--neon-grn)}

        /* P2E */
        .p2e{background:linear-gradient(180deg,var(--void-2),var(--void))}
        .p2e-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
        .flow{display:grid;grid-template-columns:1fr;gap:14px;margin-top:32px}
        .flow-step{display:flex;align-items:center;gap:18px;padding:18px;background:var(--void-2);border:3px solid var(--panel-line)}
        .flow-step .n{width:42px;height:42px;background:var(--neon-yel);color:var(--void);display:grid;place-items:center;font-family:var(--pixel);font-size:14px;flex-shrink:0;box-shadow:3px 3px 0 var(--void),3px 3px 0 6px var(--neon-p)}
        .flow-step .l{font-family:var(--pixel);font-size:12px;color:var(--txt);letter-spacing:.05em;flex:1}
        .flow-step .x{font-family:var(--mono);font-size:11px;color:var(--neon-b);letter-spacing:.15em}
        .wallet{padding:0;border:6px solid var(--neon-grn);background:var(--void-2);box-shadow:inset 0 0 0 4px var(--void),0 0 0 4px var(--void),0 0 40px rgba(0,255,157,.25)}
        .wallet header{padding:16px 20px;background:var(--void);border-bottom:4px solid var(--neon-grn);display:flex;justify-content:space-between;align-items:center;font-family:var(--pixel);font-size:10px;color:var(--neon-grn)}
        .wallet header .net{display:flex;align-items:center;gap:8px;color:var(--txt-dim);font-size:9px}
        .wallet header .net::before{content:"";width:8px;height:8px;background:var(--neon-grn);box-shadow:0 0 8px var(--neon-grn)}
        .wallet .balance{padding:32px 24px;text-align:center;border-bottom:3px dashed var(--panel-line)}
        .wallet .balance .l{font-family:var(--pixel);font-size:9px;color:var(--txt-dim);letter-spacing:.2em;margin-bottom:12px}
        .wallet .balance .amt{font-family:var(--pixel);font-size:42px;color:var(--neon-yel);text-shadow:3px 3px 0 var(--neon-pink),6px 6px 0 var(--void)}
        .wallet .balance .delta{margin-top:10px;font-family:var(--mono);font-size:13px;color:var(--neon-grn)}
        .wallet .feed{padding:20px 24px}
        .wallet .feed .li{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:2px dotted var(--panel-line);font-family:var(--pixel);font-size:10px;color:var(--txt)}
        .wallet .feed .li:last-child{border:0}
        .wallet .feed .li b{color:var(--neon-yel);font-weight:normal}
        .wallet .feed .li.loss b{color:var(--neon-pink)}
        .coin{position:absolute;width:18px;height:18px;background:var(--neon-yel);border:3px solid var(--void);border-radius:2px;animation:float 3s steps(8) infinite}
        .coin::before{content:"$";position:absolute;inset:0;display:grid;place-items:center;font-family:var(--pixel);font-size:8px;color:var(--void)}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}

        /* Tournaments */
        .tour{background:repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0 2px,transparent 2px 4px),var(--void)}
        .bracket{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;align-items:center;margin-bottom:40px}
        .match{padding:14px;background:var(--void-2);border:3px solid var(--panel-line);font-family:var(--pixel);font-size:9px}
        .match .vs{display:flex;align-items:center;justify-content:space-between;padding:6px 0}
        .match .vs span:first-child{color:var(--txt)}
        .match .vs b{color:var(--neon-yel);font-weight:normal}
        .match .vs.winner span:first-child{color:var(--neon-grn)}
        .match.final{border-color:var(--neon-yel);box-shadow:0 0 20px rgba(255,214,10,.3)}
        .bracket-col{display:flex;flex-direction:column;gap:24px}
        .bracket-col.col2{gap:64px;padding-top:24px}
        .bracket-col.col3{gap:0;justify-content:center;height:100%;display:grid;place-items:center}
        .tour-tags{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:32px}
        .tour-tag{padding:24px;background:var(--void-2);border-top:6px solid var(--neon-pink);font-family:var(--pixel);font-size:11px;color:var(--txt);letter-spacing:.05em}
        .tour-tag:nth-child(2){border-color:var(--neon-b)}
        .tour-tag:nth-child(3){border-color:var(--neon-yel)}
        .tour-tag:nth-child(4){border-color:var(--neon-grn)}
        .tour-tag .pz{margin-top:14px;font-family:var(--mono);font-size:12px;color:var(--txt-dim);letter-spacing:.1em}
        .crowd{height:80px;margin-bottom:48px;background:repeating-linear-gradient(90deg,transparent 0 6px,rgba(176,38,255,.4) 6px 8px,transparent 8px 14px,rgba(0,229,255,.4) 14px 16px);mask:linear-gradient(180deg,transparent 0%,#000 60%);position:relative}
        .crowd::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 4px,rgba(255,214,10,.06) 4px 6px);animation:bob2 .8s steps(2) infinite}
        @keyframes bob2{50%{transform:translateY(-3px)}}

        /* Final CTA */
        .final{text-align:center;padding:128px 32px;position:relative}
        .final h2{font-size:34px;line-height:1.5;max-width:22ch;margin:0 auto 32px;text-shadow:4px 4px 0 var(--neon-pink),8px 8px 0 var(--void-3)}
        .final p{font-size:24px;margin:0 auto 12px;max-width:38ch;color:var(--txt-dim)}
        .final p b{color:var(--neon-yel);font-weight:normal}
        .final .cta{display:flex;justify-content:center;gap:32px;margin-top:48px;flex-wrap:wrap}
        .final::before,.final::after{content:"";position:absolute;left:0;right:0;height:8px;background:repeating-linear-gradient(90deg,var(--neon-p) 0 16px,var(--neon-b) 16px 32px,var(--neon-pink) 32px 48px,var(--neon-yel) 48px 64px)}
        .final::before{top:0}.final::after{bottom:0}

        /* Footer */
        .lp footer{padding:48px 32px;background:var(--void-2);border-top:4px solid var(--neon-p);font-family:var(--pixel);font-size:10px;color:var(--txt-dim);text-align:center;letter-spacing:.15em}
        .lp footer .row{display:flex;justify-content:space-between;align-items:center;max-width:1280px;margin:0 auto;flex-wrap:wrap;gap:18px}
        .lp footer a{color:var(--txt-dim);text-decoration:none;margin:0 14px}
        .lp footer a:hover{color:var(--neon-yel)}

        /* Marquee */
        .marquee{padding:14px 0;background:var(--neon-yel);color:var(--void);border-top:4px solid var(--void);border-bottom:4px solid var(--void);overflow:hidden;position:relative}
        .marquee .track{display:flex;gap:48px;white-space:nowrap;animation:scroll 30s linear infinite;font-family:var(--pixel);font-size:12px;letter-spacing:.2em}
        .marquee .track span{display:flex;align-items:center;gap:48px}
        .marquee .track span::after{content:"✦"}
        @keyframes scroll{to{transform:translateX(-50%)}}

        @media(max-width:980px){
          .hero-grid,.char-wrap,.gp-wrap,.p2e-grid{grid-template-columns:1fr}
          .how-grid,.archetype-grid{grid-template-columns:1fr 1fr}
          .nav-links{display:none}
          .hero h1{font-size:24px}
          .lp h2{font-size:18px}
          .bracket,.tour-tags,.gp-features{grid-template-columns:1fr 1fr}
        }
      `}</style>

      {/* NAV */}
      <nav>
        <div className="logo"><div className="badge">X</div>FIGHTER ARENA</div>
        <div className="nav-links">
          <a href="#how">HOW IT WORKS</a>
          <a href="#chars">CHARACTERS</a>
          <a href="#gameplay">GAMEPLAY</a>
          <a href="#p2e">P2E</a>
          <a href="#tour">TOURNAMENTS</a>
        </div>
        <div className="status"><span className="dot"></span>SERVERS · ONLINE · 24,810 PLAYERS</div>
      </nav>

      {/* 1. HERO */}
      <section className="hero">
        <div className="arena-bg">
          <div className="grid"></div>
          <div className="floor"></div>
          <div className="silhouette l">[ FIGHTER_01 ]</div>
          <div className="silhouette r">[ FIGHTER_02 ]</div>
          <div className="pixel-spark" style={{ left:'10%', top:'60%', animationDelay:'0s' }}></div>
          <div className="pixel-spark" style={{ left:'24%', top:'80%', animationDelay:'1.2s', background:'var(--neon-pink)', boxShadow:'0 0 12px var(--neon-pink)' }}></div>
          <div className="pixel-spark" style={{ left:'70%', top:'70%', animationDelay:'.6s', background:'var(--neon-b)', boxShadow:'0 0 12px var(--neon-b)' }}></div>
          <div className="pixel-spark" style={{ left:'88%', top:'55%', animationDelay:'2.1s' }}></div>
          <div className="pixel-spark" style={{ left:'48%', top:'90%', animationDelay:'.3s', background:'var(--neon-grn)', boxShadow:'0 0 12px var(--neon-grn)' }}></div>
        </div>

        <div className="hero-grid">
          <div>
            <span className="eyebrow">INSERT COIN · BETA · SEASON 0</span>
            <h1>YOUR TIMELINE<br />BECOMES YOUR<br /><span className="lit">WEAPON.</span></h1>
            <p className="sub">A retro PvP fighting game where your <b>X account</b> becomes your fighter. Your reputation, engagement, and social identity determine your combat power.</p>
            <div className="cta">
              <button className="pxbtn" onClick={goLogin}>▶ CONNECT X</button>
              <button className="pxbtn ghost" onClick={tryDemo}>▷ TRY DEMO</button>
            </div>
            <div className="meta">
              <span><b>24,810</b>FIGHTERS MINTED</span>
              <span><b>1.2M</b>MATCHES PLAYED</span>
              <span><b>$847K</b>POT THIS WEEK</span>
            </div>
          </div>

          {/* ── FIGHTER DETAIL CARD ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

            {/* Identity */}
            <div style={{ background:'var(--panel)', border:`4px solid ${elonTier.color}`, boxShadow:`inset 0 0 0 4px var(--void),0 0 0 4px var(--void),0 0 20px ${elonTier.color}50`, padding:'14px', position:'relative' }}>
              <i style={{ position:'absolute', width:'10px', height:'10px', background:elonTier.color, top:'-2px', left:'-2px' }}></i>
              <i style={{ position:'absolute', width:'10px', height:'10px', background:elonTier.color, top:'-2px', right:'-2px' }}></i>
              <i style={{ position:'absolute', width:'10px', height:'10px', background:elonTier.color, bottom:'-2px', left:'-2px' }}></i>
              <i style={{ position:'absolute', width:'10px', height:'10px', background:elonTier.color, bottom:'-2px', right:'-2px' }}></i>
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:'60px', height:'60px', overflow:'hidden', border:`3px solid ${elonTier.color}`, boxShadow:`0 0 10px ${elonTier.color}` }}>
                    <img src={elonProfile.avatarUrl} alt="@elonmusk" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                      onError={e => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=elonmusk'; }} />
                  </div>
                  <div style={{ position:'absolute', bottom:'-3px', right:'-3px', background:elonTier.color, color:'#000', fontFamily:'var(--pixel)', fontSize:'6px', padding:'2px 4px', lineHeight:1 }}>LV{elonLevel}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--pixel)', fontSize:'11px', color:'#fff', marginBottom:'3px' }}>@elonmusk</div>
                  <div style={{ fontFamily:'var(--pixel)', fontSize:'7px', color:elonStats.color, marginBottom:'7px', letterSpacing:'.08em' }}>
                    {elonStats.archetypeLabel.toUpperCase()} · {elonStats.rarity.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                      <span style={{ fontFamily:'var(--pixel)', fontSize:'6px', color:'var(--txt-dim)' }}>XP</span>
                      <span style={{ fontFamily:'var(--pixel)', fontSize:'6px', color:elonTier.color }}>0 / {elonXpMax}</span>
                    </div>
                    <div style={{ height:'8px', background:'var(--void)', border:'2px solid var(--panel-line)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:'0%', background:elonTier.color }} />
                    </div>
                  </div>
                  {elonNextTier && (
                    <div style={{ fontFamily:'var(--pixel)', fontSize:'6px', color:'var(--txt-dim)', marginTop:'3px' }}>
                      Next: {elonNextTier.name} @ LV{elonNextTier.minLevel}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Win/Loss row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
              {([
                { label:'WINS',   value:0,    color:'var(--neon-grn)' },
                { label:'LOSSES', value:0,    color:'var(--neon-pink)' },
                { label:'WIN %',  value:'0%', color:'var(--neon-pink)' },
                { label:'COMBO',  value:'0x', color:'var(--neon-yel)' },
              ] as const).map(s => (
                <div key={s.label} style={{ background:'var(--void-2)', border:'3px solid var(--panel-line)', padding:'8px 4px', textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--pixel)', fontSize:'6px', color:'var(--txt-dim)', marginBottom:'5px' }}>{s.label}</div>
                  <div style={{ fontFamily:'var(--pixel)', fontSize:'12px', color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Base stats */}
            <div style={{ background:'var(--panel)', border:'4px solid var(--neon-p)', boxShadow:'inset 0 0 0 4px var(--void),0 0 0 4px var(--void)', padding:'14px' }}>
              <div style={{ fontFamily:'var(--pixel)', fontSize:'10px', color:'var(--neon-p)', marginBottom:'10px', display:'flex', alignItems:'center', gap:'8px', letterSpacing:'.1em' }}>
                <span style={{ width:'18px', height:'3px', background:'var(--neon-p)', display:'inline-block', flexShrink:0 }}></span>
                BASE STATS
              </div>
              {([
                { label:'POWER',   value:elonStats.basePower, color:'var(--neon-pink)',  fill:'repeating-linear-gradient(90deg,var(--neon-pink) 0 6px,#ff5494 6px 8px)', max:100 },
                { label:'DEFENSE', value:elonStats.defense,   color:'var(--neon-b)',    fill:'repeating-linear-gradient(90deg,var(--neon-b) 0 6px,#57f1ff 6px 8px)',   max:100 },
                { label:'SPEED',   value:elonStats.speed,     color:'var(--neon-grn)',  fill:'repeating-linear-gradient(90deg,var(--neon-grn) 0 6px,#66ffc2 6px 8px)', max:100 },
                { label:'CRIT %',  value:elonStats.critRate,  color:'var(--neon-yel)',  fill:'repeating-linear-gradient(90deg,var(--neon-yel) 0 6px,#ffe666 6px 8px)', max:80 },
                { label:'STAMINA', value:elonStats.stamina,   color:'var(--neon-pink)', fill:'repeating-linear-gradient(90deg,var(--neon-pink) 0 6px,#ff5494 6px 8px)', max:100 },
              ] as const).map(({ label, value, color, fill, max }) => (
                <div key={label} style={{ marginBottom:'8px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                    <span style={{ fontFamily:'var(--pixel)', fontSize:'7px', color:'var(--txt)' }}>{label}</span>
                    <span style={{ fontFamily:'var(--pixel)', fontSize:'7px', color }}>{value}</span>
                  </div>
                  <div style={{ height:'10px', background:'var(--void)', border:'2px solid var(--panel-line)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(1, value / max) * 100}%`, background:fill }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Combat modifiers */}
            <div style={{ background:'var(--panel)', border:'4px solid var(--neon-p)', boxShadow:'inset 0 0 0 4px var(--void),0 0 0 4px var(--void)', padding:'14px' }}>
              <div style={{ fontFamily:'var(--pixel)', fontSize:'10px', color:'var(--neon-p)', marginBottom:'10px', display:'flex', alignItems:'center', gap:'8px', letterSpacing:'.1em' }}>
                <span style={{ width:'18px', height:'3px', background:'var(--neon-p)', display:'inline-block', flexShrink:0 }}></span>
                COMBAT MODIFIERS
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'8px' }}>
                {([
                  { label:'ATK BOOST',  value:'+0%', positive:true  },
                  { label:'DMG SHIELD', value:'-0%', positive:true  },
                  { label:'WIN STK',    value:'0x',  positive:false },
                  { label:'XP BOOST',   value:'0%',  positive:false },
                ] as const).map(({ label, value, positive }) => (
                  <div key={label} style={{ background:'var(--void)', border:`2px solid ${positive ? 'rgba(0,255,157,.3)' : 'rgba(255,45,117,.3)'}`, padding:'8px 4px', textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--pixel)', fontSize:'6px', color:'var(--txt-dim)', marginBottom:'4px' }}>{label}</div>
                    <div style={{ fontFamily:'var(--pixel)', fontSize:'9px', color:positive ? 'var(--neon-grn)' : 'var(--neon-pink)' }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:'11px', color:'var(--txt-dim)', textAlign:'center' }}>
                Win streaks boost your ATK. Loss streaks reduce it.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden={true}>
        <div className="track">
          <span>READY · FIGHT · WIN · CLAIM · REPEAT</span>
          <span>POWERED BY X · SETTLED ON BASE</span>
          <span>SEASON 0 LIVE NOW</span>
          <span>READY · FIGHT · WIN · CLAIM · REPEAT</span>
          <span>POWERED BY X · SETTLED ON BASE</span>
          <span>SEASON 0 LIVE NOW</span>
        </div>
      </div>

      {/* 2. HOW IT WORKS */}
      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">// HOW IT WORKS</span>
              <h2>FROM PROFILE<br />TO PIXEL FIGHTER<br />IN 60 SECONDS.</h2>
            </div>
            <p style={{ fontFamily:'var(--body)', fontSize:'20px', color:'var(--txt-dim)' }}>Three buttons separate you from the arena. No downloads. No grinding. Your fighter already exists — it's been training on your timeline.</p>
          </div>
          <div className="how-grid">
            <div className="panel step">
              <div className="corners"><i></i><i></i><i></i><i></i></div>
              <div className="ico">X</div>
              <span className="num">01</span>
              <h3>CONNECT YOUR X</h3>
              <p>OAuth sign-in — no password, no email. Verify your handle in one tap; we never post for you.</p>
            </div>
            <div className="panel blue step">
              <div className="corners"><i></i><i></i><i></i><i></i></div>
              <div className="ico">AI</div>
              <span className="num">02</span>
              <h3>AI GENERATES YOUR FIGHTER</h3>
              <p>Our model parses profile, engagement, and niche to produce stats, archetype, and an original pixel sprite.</p>
            </div>
            <div className="panel pink step">
              <div className="corners"><i></i><i></i><i></i><i></i></div>
              <div className="ico">▶</div>
              <span className="num">03</span>
              <h3>ENTER THE ARENA</h3>
              <p>Queue ranked PvP, casual rooms, or tournaments. First match starts in under a minute.</p>
            </div>
          </div>
          <div className="flow-strip">
            <b>X PROFILE</b><span className="arr">▶▶▶</span>
            <b>AI ENGINE</b><span className="arr">▶▶▶</span>
            <b>FIGHTER SPRITE</b><span className="arr">▶▶▶</span>
            <b>READY · FIGHT</b>
          </div>
        </div>
      </section>

      {/* 3. CHARACTER SYSTEM */}
      <section id="chars" style={{ background:'linear-gradient(180deg,transparent,rgba(176,38,255,.06),transparent)' }}>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">// STAT TRANSLATION</span>
              <h2>YOUR SOCIAL<br />REPUTATION =<br />YOUR COMBAT STATS.</h2>
            </div>
            <p style={{ fontFamily:'var(--body)', fontSize:'20px', color:'var(--txt-dim)' }}>Every metric on your profile maps to a number in the arena. No way to game it without actually being on X.</p>
          </div>
          <div className="char-wrap">
            <div className="stat-list">
              {[
                ['TWITTER SCORE','ATTACK POWER'],
                ['VERIFIED FOLLOWERS','CRITICAL DAMAGE'],
                ['ACCOUNT AGE','DEFENSE'],
                ['POSTING ACTIVITY','STAMINA REGEN'],
                ['ACCOUNT TYPE','PASSIVE BUFFS'],
              ].map(([from, to]) => (
                <div className="stat-row" key={from}>
                  <div className="from">{from}</div>
                  <div className="arr">▶▶</div>
                  <div className="to">{to}</div>
                </div>
              ))}
            </div>
            <div className="panel blue rpg">
              <div className="corners"><i></i><i></i><i></i><i></i></div>
              <div className="title">@FIGHTER_NAME · LVL 47</div>
              <div className="sub">CLASS · CRYPTO TRADER · S-TIER</div>
              <div className="row"><span className="lbl">ATK</span><div className="bar"><i style={{ width:'88%' }}></i></div><span className="val">880</span></div>
              <div className="row"><span className="lbl">CRIT</span><div className="bar"><i style={{ width:'72%', background:'repeating-linear-gradient(90deg,var(--neon-yel) 0 6px,#ffe666 6px 8px)' }}></i></div><span className="val">72</span></div>
              <div className="row"><span className="lbl">DEF</span><div className="bar"><i style={{ width:'54%', background:'repeating-linear-gradient(90deg,var(--neon-b) 0 6px,#57f1ff 6px 8px)' }}></i></div><span className="val">540</span></div>
              <div className="row"><span className="lbl">STA</span><div className="bar"><i style={{ width:'64%', background:'repeating-linear-gradient(90deg,var(--neon-grn) 0 6px,#66ffc2 6px 8px)' }}></i></div><span className="val">640</span></div>
              <div className="row"><span className="lbl">SPD</span><div className="bar"><i style={{ width:'78%' }}></i></div><span className="val">780</span></div>
              <div className="divide"></div>
              <div style={{ fontFamily:'var(--pixel)', fontSize:'10px', color:'var(--neon-yel)', letterSpacing:'.15em' }}>PASSIVE BUFFS</div>
              <div className="traits">
                <span>VERIFIED +12% CRIT</span>
                <span>4Y ACCOUNT +8% DEF</span>
                <span>DAILY POSTER +REGEN</span>
              </div>
              <div className="footer"><span>◀ PREV</span><span>SELECT ▶</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ARCHETYPES */}
      <section id="archetypes">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">// AI ARCHETYPES</span>
              <h2>FOUR CLASSES.<br />INFINITE BUILDS.</h2>
            </div>
            <p style={{ fontFamily:'var(--body)', fontSize:'20px', color:'var(--txt-dim)' }}>The AI picks one of four base archetypes from your posting pattern. Hover any card to peek at the ultimate skill.</p>
          </div>
          <div className="archetype-grid">
            <div className="arch">
              <div className="rarity">★ S</div>
              <div className="portrait"><div className="glyph">$</div></div>
              <div className="body"><h3>CRYPTO TRADER</h3><p>Glass cannon — massive burst damage, fragile guard. High risk, highest reward.</p><div className="ult"><b>ULT ›</b> LIQUIDATION CASCADE</div></div>
            </div>
            <div className="arch">
              <div className="rarity">★ A</div>
              <div className="portrait"><div className="glyph">??</div></div>
              <div className="body"><h3>MEME ACCOUNT</h3><p>Chaos fighter — random critical attacks, unpredictable combos. Opponents hate it.</p><div className="ult"><b>ULT ›</b> COPY · PASTE · DELETE</div></div>
            </div>
            <div className="arch">
              <div className="rarity">★ B</div>
              <div className="portrait"><div className="glyph">{'</>'}</div></div>
              <div className="body"><h3>BUILDER</h3><p>Strategic support — stacks tactical abilities and zone control. Calculated, patient, lethal.</p><div className="ult"><b>ULT ›</b> SHIP IT</div></div>
            </div>
            <div className="arch">
              <div className="rarity">★ S+</div>
              <div className="portrait"><div className="glyph">♚</div></div>
              <div className="body"><h3>FOUNDER</h3><p>Leadership aura — buffs allies in team modes, intimidates 1v1. The boss-fight class.</p><div className="ult"><b>ULT ›</b> SERIES A STRIKE</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. GAMEPLAY */}
      <section id="gameplay" className="gameplay">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">// GAMEPLAY</span>
              <h2>RETRO ARCADE COMBAT<br />MEETS SOCIALFI.</h2>
            </div>
          </div>
          <div className="gp-wrap">
            <div>
              <p style={{ fontSize:'22px', color:'var(--txt-dim)', marginBottom:'18px' }}>Sixty-frame combo windows. Three-button input. Skill ceiling for the FGC, pick-up-and-play for everyone else.</p>
              <ul className="gp-features">
                <li>FAST-PACED<br />PVP COMBAT</li>
                <li>AI-GENERATED<br />ABILITY KITS</li>
                <li>IDENTITY-BASED<br />PROGRESSION</li>
                <li>ONCHAIN<br />COMPETITION</li>
              </ul>
              <div style={{ display:'flex', gap:'24px', marginTop:'36px' }}>
                <button className="pxbtn" onClick={goLogin}>▶ TRY DEMO</button>
                <a href="#how" className="pxbtn ghost">▷ MOVELIST</a>
              </div>
            </div>
            <div className="gp-screen">
              <canvas
                ref={gpCanvasRef}
                style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6. P2E */}
      <section id="p2e" className="p2e">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">// PLAY-TO-EARN</span>
              <h2>PLAY. FIGHT. EARN.</h2>
            </div>
            <p style={{ fontFamily:'var(--body)', fontSize:'20px', color:'var(--txt-dim)', maxWidth:'36ch' }}>Both fighters deposit to the Vault — it holds funds in escrow until the match resolves. Winner takes the pot, released instantly via Bankr.</p>
          </div>
          <div className="p2e-grid">
            <div>
              <div className="flow">
                <div className="flow-step"><div className="n">1</div><div className="l">LINK X + BANKR</div><div className="x">X · BANKR</div></div>
                <div className="flow-step"><div className="n">2</div><div className="l">DEPOSIT TO VAULT</div><div className="x">BANKR → VAULT</div></div>
                <div className="flow-step"><div className="n">3</div><div className="l">WIN BATTLE</div><div className="x">VERIFIED · INSTANT</div></div>
                <div className="flow-step"><div className="n">4</div><div className="l">VAULT RELEASES POT</div><div className="x">ESCROW → WINNER</div></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginTop:'32px' }}>
                <div style={{ padding:'18px', background:'var(--void-2)', borderLeft:'6px solid var(--neon-yel)' }}><div className="tag" style={{ color:'var(--neon-yel)', marginBottom:'8px' }}>VAULT ESCROW</div><div style={{ fontFamily:'var(--body)', fontSize:'18px', color:'var(--txt-dim)' }}>Both fighters send their wager from Bankr to the Vault. Funds are locked in escrow — released only when the match resolves.</div></div>
                <div style={{ padding:'18px', background:'var(--void-2)', borderLeft:'6px solid var(--neon-b)' }}><div className="tag" style={{ marginBottom:'8px' }}>INSTANT PAYOUT</div><div style={{ fontFamily:'var(--body)', fontSize:'18px', color:'var(--txt-dim)' }}>Vault releases the full pot to the winner's Bankr account the moment the match ends. No wallet, no wait.</div></div>
                <div style={{ padding:'18px', background:'var(--void-2)', borderLeft:'6px solid var(--neon-pink)' }}><div className="tag" style={{ color:'var(--neon-pink)', marginBottom:'8px' }}>ANTI-SYBIL</div><div style={{ fontFamily:'var(--body)', fontSize:'18px', color:'var(--txt-dim)' }}>X verification + behavioral signals prevent multi-account abuse.</div></div>
                <div style={{ padding:'18px', background:'var(--void-2)', borderLeft:'6px solid var(--neon-grn)' }}><div className="tag" style={{ color:'var(--neon-grn)', marginBottom:'8px' }}>TOURNAMENT REWARDS</div><div style={{ fontFamily:'var(--body)', fontSize:'18px', color:'var(--txt-dim)' }}>Weekly cash prizes, NFT trophies, leaderboard payouts.</div></div>
              </div>
            </div>
            <div style={{ position:'relative' }}>
              <div className="coin" style={{ top:'-12px', left:'-12px', animationDelay:'0s' }}></div>
              <div className="coin" style={{ top:'18%', right:'-16px', animationDelay:'.4s' }}></div>
              <div className="coin" style={{ bottom:'24%', left:'-20px', animationDelay:'.8s' }}></div>
              <div className="coin" style={{ bottom:'-12px', right:'24%', animationDelay:'1.2s' }}></div>
              <div className="wallet">
                <header>
                  <span>VAULT · @elonmusk</span>
                  <span className="net">ESCROW ACTIVE</span>
                </header>
                <div className="balance">
                  <div className="l">SEASON 0 VAULT RELEASES</div>
                  <div className="amt">$2,847.20</div>
                  <div className="delta">↑ +$184.40 LAST 24H</div>
                </div>
                <div className="feed">
                  <div className="li"><span>VAULT RELEASE · vs @memelord</span><b>+$24.80</b></div>
                  <div className="li"><span>TOURNAMENT POT · BRACKET A</span><b>+$120.00</b></div>
                  <div className="li loss"><span>VAULT FORFEIT · vs @builder</span><b>−$12.00</b></div>
                  <div className="li"><span>DAILY STREAK BONUS · DAY 7</span><b>+$8.50</b></div>
                  <div className="li"><span>GUILD WAR VAULT · WEEK 12</span><b>+$58.20</b></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TOURNAMENTS */}
      <section id="tour" className="tour">
        <div className="wrap">
          <div className="crowd"></div>
          <div className="sec-head">
            <div>
              <span className="eyebrow">// LIVE TOURNAMENTS</span>
              <h2>COMMUNITY &amp;<br />PROJECT BATTLES.</h2>
            </div>
            <p style={{ fontFamily:'var(--body)', fontSize:'20px', color:'var(--txt-dim)', maxWidth:'36ch' }}>Sponsor a bracket. Run a guild war. Crown a meme champion. Tools for organizers ship in beta.</p>
          </div>
          <div className="bracket">
            <div className="bracket-col">
              <div className="match"><div className="vs winner"><span>@trader_01</span><b>2</b></div><div className="vs"><span>@noob.eth</span><b>0</b></div></div>
              <div className="match"><div className="vs"><span>@meme_god</span><b>1</b></div><div className="vs winner"><span>@dev_jane</span><b>2</b></div></div>
              <div className="match"><div className="vs winner"><span>@founder_x</span><b>2</b></div><div className="vs"><span>@bagholder</span><b>0</b></div></div>
              <div className="match"><div className="vs"><span>@anon</span><b>1</b></div><div className="vs winner"><span>@shitposter</span><b>2</b></div></div>
            </div>
            <div className="bracket-col col2">
              <div className="match"><div className="vs winner"><span>@trader_01</span><b>3</b></div><div className="vs"><span>@dev_jane</span><b>2</b></div></div>
              <div className="match"><div className="vs"><span>@founder_x</span><b>2</b></div><div className="vs winner"><span>@shitposter</span><b>3</b></div></div>
            </div>
            <div className="bracket-col col3">
              <div className="match final" style={{ width:'100%' }}><div style={{ fontFamily:'var(--pixel)', fontSize:'9px', color:'var(--neon-yel)', marginBottom:'8px', letterSpacing:'.2em' }}>FINALS · LIVE</div><div className="vs winner"><span>@trader_01</span><b>3</b></div><div className="vs"><span>@shitposter</span><b>2</b></div></div>
            </div>
            <div className="bracket-col col3">
              <div className="panel yel" style={{ width:'100%', textAlign:'center', padding:'24px' }}>
                <div className="corners"><i></i><i></i><i></i><i></i></div>
                <div className="tag" style={{ color:'var(--neon-yel)', marginBottom:'10px' }}>CHAMPION</div>
                <div style={{ fontFamily:'var(--pixel)', fontSize:'14px', color:'var(--neon-yel)', marginBottom:'8px' }}>@TRADER_01</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:'14px', color:'var(--neon-pink)' }}>$12,400 POT</div>
              </div>
            </div>
          </div>
          <div className="tour-tags">
            <div className="tour-tag">CREATOR BATTLES<div className="pz">Top 1% influencers · weekly</div></div>
            <div className="tour-tag">GUILD WARS<div className="pz">Team-vs-team · 5v5 brackets</div></div>
            <div className="tour-tag">SPONSORED ARENAS<div className="pz">Brand-funded · open entry</div></div>
            <div className="tour-tag">MEME COIN CHAMPIONSHIPS<div className="pz">Token communities · monthly</div></div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="final">
        <span className="eyebrow" style={{ marginBottom:'24px' }}>// PRESS START</span>
        <h2>READY TO ENTER<br />THE ARENA?</h2>
        <p>Your online identity is no longer just a profile.</p>
        <p><b>IT'S YOUR FIGHTER.</b></p>
        <div className="cta">
          <button className="pxbtn" onClick={goLogin}>▶ CONNECT X</button>
          <button className="pxbtn pink" onClick={goLogin}>★ JOIN BETA WAITLIST</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="row">
          <div className="logo" style={{ fontSize:'11px' }}>
            <div className="badge" style={{ width:'24px', height:'24px', fontSize:'10px', boxShadow:'3px 3px 0 var(--void),3px 3px 0 3px var(--neon-b)' }}>X</div>
            X FIGHTER ARENA
          </div>
          <div>
            <a href="#">DOCS</a>
            <a href="#">DISCORD</a>
            <a href="#">X / TWITTER</a>
            <a href="#">SUPPORT</a>
            <a href="#">PRESS KIT</a>
          </div>
          <div style={{ color:'var(--txt-dim)', fontSize:'9px' }}>© 2026 · ALL RIGHTS RESERVED · INSERT COIN</div>
        </div>
      </footer>
    </div>
  );
}
