/**
 * Pixel-art fighter sprites. Grid: P=5 canvas px per sprite pixel.
 * 10 cols × 18 rows = 50×90 canvas px (matches FW×FH).
 *
 * Layout:
 *   Rows  0– 5  head (row 0 = overhead feature, rows 1–4 = face, row 5 = neck)
 *   Rows  6–12  torso (row 6 = shoulders, rows 7–11 = body, row 12 = belt)
 *   Rows 13–17  legs (cols 2–4 left leg, col 5 gap, cols 6–8 right leg)
 *   Arms        cols 0–1 (left) and cols 8–9 (right) at rows 7–10
 *
 * All sprites drawn facing RIGHT. facing=-1 mirrors via ctx.scale(-1,1).
 */

const P = 8;

function d(
  ctx: CanvasRenderingContext2D,
  c: string,
  ox: number, oy: number,
  col: number, row: number,
  w = 1, h = 1,
) {
  if (!c) return;
  ctx.fillStyle = c;
  ctx.fillRect(ox + col * P, oy + row * P, w * P, h * P);
}

interface Pal {
  hat:  string;
  face: string;
  eyes: string;
  body: string;
  bdet: string;
  limb: string;
  boot: string;
  belt: string;
}

const PALS: Record<string, Pal> = {
  degen: {
    hat:  '#cc2200', face: '#440000', eyes: '#ff8800',
    body: '#dd2200', bdet: '#ff5500', limb: '#cc2200', boot: '#221100', belt: '#eeeeee',
  },
  crypto_trader: {
    hat:  '#553300', face: '#ffddbb', eyes: '#ffcc00',
    body: '#886600', bdet: '#ccaa00', limb: '#886600', boot: '#222211', belt: '#ffdd55',
  },
  ai_builder: {
    hat:  '#002233', face: '#004466', eyes: '#00ffff',
    body: '#003355', bdet: '#006688', limb: '#002244', boot: '#001122', belt: '#00cccc',
  },
  meme_account: {
    hat:  '#1a6b1a', face: '#551177', eyes: '#ff00ff',
    body: '#881199', bdet: '#bb44cc', limb: '#771188', boot: '#110011', belt: '#ee44ff',
  },
  founder_ceo: {
    hat:  '#334466', face: '#ffd0a0', eyes: '#00ff44',
    body: '#223399', bdet: '#4466bb', limb: '#222255', boot: '#111133', belt: '#ffffff',
  },
  og_holder: {
    hat:  '#443300', face: '#ddbb88', eyes: '#ffdd00',
    body: '#776633', bdet: '#aa9944', limb: '#554422', boot: '#221100', belt: '#ffcc00',
  },
  influencer: {
    hat:  '#cc0055', face: '#ffddcc', eyes: '#ff44aa',
    body: '#dd1177', bdet: '#ff55bb', limb: '#aa0044', boot: '#220011', belt: '#ffaacc',
  },
  developer: {
    hat:  '#111122', face: '#222233', eyes: '#0088ff',
    body: '#111133', bdet: '#223355', limb: '#111122', boot: '#000011', belt: '#003388',
  },
};

// ── Head shapes ─────────────────────────────────────────────────────────────

function headDegen(ctx: CanvasRenderingContext2D, p: Pal, ox: number, oy: number) {
  d(ctx, p.hat,  ox, oy, 3, 0, 4);           // mohawk base
  d(ctx, p.eyes, ox, oy, 4, 0, 2);           // spike tips glow
  d(ctx, p.hat,  ox, oy, 2, 1, 6);           // helmet forehead
  d(ctx, p.hat,  ox, oy, 1, 2, 8);           // helmet full width
  d(ctx, p.eyes, ox, oy, 2, 2, 6);           // visor glow
  d(ctx, p.hat,  ox, oy, 1, 3, 8);           // helmet lower
  d(ctx, p.face, ox, oy, 3, 3, 4);           // dark inner visor
  d(ctx, p.hat,  ox, oy, 2, 4, 6);           // chin guard
  d(ctx, p.hat,  ox, oy, 3, 5, 4);           // neck
}

function headAI(ctx: CanvasRenderingContext2D, p: Pal, ox: number, oy: number) {
  d(ctx, p.eyes, ox, oy, 5, 0);              // antenna tip glow
  d(ctx, p.hat,  ox, oy, 4, 1, 2);           // antenna base
  d(ctx, p.hat,  ox, oy, 1, 2, 8, 3);        // square robot head
  d(ctx, p.eyes, ox, oy, 2, 3, 2);           // left LED eye
  d(ctx, p.eyes, ox, oy, 6, 3, 2);           // right LED eye
  d(ctx, p.face, ox, oy, 3, 4, 4);           // speaker grille
  d(ctx, p.hat,  ox, oy, 3, 5, 4);           // neck collar
  d(ctx, p.eyes, ox, oy, 4, 5, 2);           // neck connector
}

function headFounder(ctx: CanvasRenderingContext2D, p: Pal, ox: number, oy: number) {
  d(ctx, p.hat,  ox, oy, 2, 0, 6, 2);        // hair
  d(ctx, p.hat,  ox, oy, 1, 1, 2);           // left temple
  d(ctx, p.hat,  ox, oy, 7, 1, 2);           // right temple
  d(ctx, p.face, ox, oy, 2, 1, 5);           // forehead
  d(ctx, p.face, ox, oy, 1, 2, 8, 3);        // face
  d(ctx, '#334455', ox, oy, 2, 3, 2);        // left eye
  d(ctx, '#334455', ox, oy, 6, 3, 2);        // right eye
  d(ctx, '#ffffff', ox, oy, 3, 5, 4);        // white collar
  d(ctx, '#1155aa', ox, oy, 4, 5, 2);        // tie
}

function headMeme(ctx: CanvasRenderingContext2D, p: Pal, ox: number, oy: number) {
  d(ctx, p.hat,  ox, oy, 2, 0, 6);           // cap top
  d(ctx, p.hat,  ox, oy, 1, 1, 9);           // brim (wide = sideways cap)
  d(ctx, p.face, ox, oy, 1, 2, 8, 2);        // masked face
  d(ctx, '#000', ox, oy, 2, 2, 6);           // shades frame
  d(ctx, p.eyes, ox, oy, 2, 2, 2);           // left lens
  d(ctx, p.eyes, ox, oy, 6, 2, 2);           // right lens
  d(ctx, '#ffffff', ox, oy, 3, 4, 4);        // wide grin
  d(ctx, p.face, ox, oy, 2, 5, 6);           // chin
}

function headOG(ctx: CanvasRenderingContext2D, p: Pal, ox: number, oy: number) {
  d(ctx, p.hat,  ox, oy, 3, 0, 4, 2);        // top hat body
  d(ctx, p.hat,  ox, oy, 1, 2, 8);           // hat brim
  d(ctx, p.face, ox, oy, 2, 3, 6, 2);        // face
  d(ctx, p.eyes, ox, oy, 2, 3, 2);           // monocle
  d(ctx, '#111', ox, oy, 6, 3, 2);           // right eye
  d(ctx, '#ddccaa', ox, oy, 1, 4, 8);        // beard row 1
  d(ctx, '#ddccaa', ox, oy, 2, 5, 6);        // beard row 2
}

function headInfluencer(ctx: CanvasRenderingContext2D, p: Pal, ox: number, oy: number) {
  d(ctx, p.hat,  ox, oy, 3, 0, 4);           // hair updo
  d(ctx, p.hat,  ox, oy, 2, 1, 6);           // hair sides
  d(ctx, p.hat,  ox, oy, 1, 2, 3);           // left lash shadow
  d(ctx, p.hat,  ox, oy, 7, 2, 3);           // right lash shadow
  d(ctx, p.face, ox, oy, 1, 2, 8, 3);        // face
  d(ctx, p.eyes, ox, oy, 2, 3, 2);           // left eye
  d(ctx, p.eyes, ox, oy, 6, 3, 2);           // right eye
  d(ctx, '#ff2255', ox, oy, 3, 4, 4);        // lips
  d(ctx, p.hat,  ox, oy, 3, 5, 4);           // choker
}

function headDeveloper(ctx: CanvasRenderingContext2D, p: Pal, ox: number, oy: number) {
  d(ctx, p.hat,  ox, oy, 2, 0, 6);           // hood top
  d(ctx, p.hat,  ox, oy, 1, 1, 8, 4);        // hood coverage
  d(ctx, p.face, ox, oy, 2, 2, 6, 2);        // mask face
  d(ctx, p.eyes, ox, oy, 2, 3, 2);           // left glowing eye
  d(ctx, p.eyes, ox, oy, 6, 3, 2);           // right glowing eye
  d(ctx, p.hat,  ox, oy, 3, 5, 4);           // neck
}

function headCryptoTrader(ctx: CanvasRenderingContext2D, p: Pal, ox: number, oy: number) {
  d(ctx, p.hat,  ox, oy, 2, 0, 6);           // slick hair
  d(ctx, p.hat,  ox, oy, 1, 1, 3);           // left side hair
  d(ctx, p.face, ox, oy, 2, 1, 6);           // forehead
  d(ctx, p.face, ox, oy, 1, 2, 8, 3);        // face
  d(ctx, '#111', ox, oy, 2, 2, 6);           // shades frame
  d(ctx, p.eyes, ox, oy, 2, 2, 2);           // left gold lens
  d(ctx, p.eyes, ox, oy, 6, 2, 2);           // right gold lens
  d(ctx, '#ffffff', ox, oy, 3, 5, 4);        // collar
  d(ctx, '#cc8800', ox, oy, 4, 5, 2);        // gold tie
}

function drawHead(ctx: CanvasRenderingContext2D, archetype: string, p: Pal, ox: number, oy: number) {
  switch (archetype) {
    case 'degen':         headDegen(ctx, p, ox, oy);        break;
    case 'ai_builder':    headAI(ctx, p, ox, oy);           break;
    case 'founder_ceo':   headFounder(ctx, p, ox, oy);      break;
    case 'meme_account':  headMeme(ctx, p, ox, oy);         break;
    case 'og_holder':     headOG(ctx, p, ox, oy);           break;
    case 'influencer':    headInfluencer(ctx, p, ox, oy);   break;
    case 'developer':     headDeveloper(ctx, p, ox, oy);    break;
    case 'crypto_trader': headCryptoTrader(ctx, p, ox, oy); break;
    default:              headDegen(ctx, p, ox, oy);
  }
}

// ── Body + limbs ─────────────────────────────────────────────────────────────

function drawBodyAndLimbs(
  ctx: CanvasRenderingContext2D,
  archetype: string,
  p: Pal,
  ox: number, oy: number,
  state: string,
  walkPhase: number,
  isGrounded: boolean,
) {
  const isPunch = state === 'punch';
  const isKick  = state === 'kick' || state === 'special';
  const isBlock = state === 'block';
  const isUlt   = state === 'ultimate';
  const isWalk  = state === 'walk_fwd' || state === 'walk_back';
  const isDead  = state === 'dead';
  const isJump  = !isGrounded && !isDead;

  // ── Dead pose ──
  if (isDead) {
    d(ctx, p.hat,  ox, oy, 6, 12, 4, 3);   // head on right side
    d(ctx, p.face, ox, oy, 7, 13, 2, 2);   // face
    d(ctx, p.eyes, ox, oy, 7, 14, 1);      // X left eye
    d(ctx, p.eyes, ox, oy, 8, 13, 1);      // X right eye
    d(ctx, p.body, ox, oy, 0, 14, 8, 3);   // body horizontal
    d(ctx, p.belt, ox, oy, 1, 15, 6);      // belt stripe
    d(ctx, p.limb, ox, oy, 0, 15, 3, 2);   // left leg
    d(ctx, p.limb, ox, oy, 4, 15, 3, 2);   // right leg
    d(ctx, p.boot, ox, oy, 0, 16, 2, 2);
    d(ctx, p.boot, ox, oy, 4, 16, 2, 2);
    return;
  }

  // ── Torso ──
  d(ctx, p.body, ox, oy, 2, 6, 6);         // shoulders
  d(ctx, p.body, ox, oy, 1, 7, 8, 5);      // chest

  switch (archetype) {
    case 'ai_builder':
      d(ctx, p.eyes, ox, oy, 3, 8, 4);     // chest circuit line
      d(ctx, p.bdet, ox, oy, 4, 10, 2);
      break;
    case 'founder_ceo':
      d(ctx, '#ffffff', ox, oy, 3, 7, 4, 4);
      d(ctx, '#1155aa', ox, oy, 4, 7, 2, 5);
      break;
    case 'meme_account':
      d(ctx, p.eyes, ox, oy, 3, 9, 4, 2);  // hoodie logo
      break;
    case 'og_holder':
      d(ctx, p.belt, ox, oy, 5, 8);        // vest button
      d(ctx, p.belt, ox, oy, 5, 10);
      break;
    case 'crypto_trader':
      d(ctx, p.bdet, ox, oy, 2, 7, 2, 4);  // left lapel
      d(ctx, p.bdet, ox, oy, 6, 7, 2, 4);  // right lapel
      d(ctx, '#fff',  ox, oy, 4, 7, 2, 4); // shirt
      d(ctx, '#cc8800', ox, oy, 4, 8, 2, 3);
      break;
    case 'developer':
      d(ctx, p.belt, ox, oy, 2, 9, 6);     // gi band
      break;
    case 'influencer':
      d(ctx, '#fff', ox, oy, 4, 9, 2);
      break;
  }

  d(ctx, p.belt, ox, oy, 2, 12, 6);        // belt

  // ── Arms ──
  if (isBlock) {
    d(ctx, p.limb, ox, oy, 2, 7, 6, 4);    // arms crossed in front
  } else if (isPunch) {
    d(ctx, p.limb, ox, oy, 0, 7, 2, 4);    // back arm normal
    d(ctx, p.limb, ox, oy, 8, 7, 4, 2);    // front arm extended (past right edge)
    d(ctx, '#ffee00', ox, oy, 10, 9, 2, 2); // fist impact flash
  } else if (isUlt) {
    d(ctx, p.limb, ox, oy, 0, 4, 2, 5);    // left arm raised
    d(ctx, p.limb, ox, oy, 8, 4, 2, 5);    // right arm raised
  } else if (isWalk) {
    const af = walkPhase;
    d(ctx, p.limb, ox, oy, 0, 7 + af,     2, 4);  // left arm swings
    d(ctx, p.limb, ox, oy, 8, 7 + (1-af), 2, 4);  // right arm opposite
  } else {
    d(ctx, p.limb, ox, oy, 0, 7, 2, 4);
    d(ctx, p.limb, ox, oy, 8, 7, 2, 4);
  }

  // ── Legs ──
  if (isKick) {
    // Standing (back) leg
    d(ctx, p.limb, ox, oy, 2, 13, 3, 4);
    d(ctx, p.boot, ox, oy, 2, 16, 3, 2);
    // Kicking leg extended forward-up
    d(ctx, p.limb, ox, oy, 6, 10, 3, 2);   // thigh raised
    d(ctx, p.limb, ox, oy, 8,  8, 3, 2);   // shin forward
    d(ctx, '#ff6600', ox, oy, 10, 7, 2, 2); // boot impact flash
  } else if (isWalk) {
    const lp = walkPhase;
    const lRow = lp === 0 ? 12 : 13;
    const rRow = lp === 0 ? 13 : 12;
    d(ctx, p.limb, ox, oy, 2, lRow, 3, 4);
    d(ctx, p.boot, ox, oy, 2, lRow + 3, 3, 2);
    d(ctx, p.limb, ox, oy, 6, rRow, 3, 4);
    d(ctx, p.boot, ox, oy, 6, rRow + 3, 3, 2);
  } else if (isJump) {
    d(ctx, p.limb, ox, oy, 2, 13, 3, 3);
    d(ctx, p.limb, ox, oy, 6, 13, 3, 3);
    d(ctx, p.boot, ox, oy, 2, 15, 3, 2);
    d(ctx, p.boot, ox, oy, 6, 15, 3, 2);
  } else {
    d(ctx, p.limb, ox, oy, 2, 13, 3, 4);
    d(ctx, p.limb, ox, oy, 6, 13, 3, 4);
    d(ctx, p.boot, ox, oy, 2, 16, 3, 2);
    d(ctx, p.boot, ox, oy, 6, 16, 3, 2);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Draw a pixel-art archetype fighter on the canvas.
 *
 * @param ctx  Canvas 2D context
 * @param archetype  Archetype key (e.g. 'degen', 'ai_builder')
 * @param state  FighterState string
 * @param facing  1 = faces right, -1 = faces left (mirrors sprite)
 * @param ox  Fighter bounding-box left x (FW = 50 wide)
 * @param oy  Fighter bounding-box top y  (FH = 90 tall)
 * @param now  Date.now() for animation timing
 * @param isGrounded  Whether fighter is on the ground
 */
export function drawArchetypeFighter(
  ctx: CanvasRenderingContext2D,
  archetype: string,
  state: string,
  facing: 1 | -1,
  ox: number,
  oy: number,
  now: number,
  isGrounded: boolean,
): void {
  const pal = PALS[archetype] ?? PALS.degen;
  const walkPhase = Math.floor(now / 150) % 2;

  const isWalking = state === 'walk_fwd' || state === 'walk_back';
  const bob = state === 'idle' ? Math.round(Math.sin(now / 400) * 3) : 0;
  const walkBob = isWalking ? (walkPhase === 0 ? -3 : 0) : 0;
  const drawOy = oy + bob + walkBob;

  ctx.save();

  // Mirror sprite for left-facing characters
  if (facing === -1) {
    const cx = ox + P * 5; // FW / 2
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-cx, 0);
  }

  // Shadow/outline pass — cast dark halo around full silhouette
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 10;
  drawHead(ctx, archetype, pal, ox, drawOy);
  drawBodyAndLimbs(ctx, archetype, pal, ox, drawOy, state, walkPhase, isGrounded);

  // Color pass — draw again on top to hide internal shadow artifacts
  ctx.shadowBlur = 0;
  drawHead(ctx, archetype, pal, ox, drawOy);
  drawBodyAndLimbs(ctx, archetype, pal, ox, drawOy, state, walkPhase, isGrounded);

  ctx.restore();
}
