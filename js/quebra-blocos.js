/* ================================================================
   QUEBRA-BLOCOS — jogo em Canvas 2D (seção "Vamos conversar?")
   Adaptado do quebra-blocos.html: cores/fonte configuráveis, fundo
   transparente (o vídeo da seção aparece atrás) e API reset/focus.
   Controles: mouse / toque / ← → (ou A D) · espaço/enter/clique lança
   · P pausa. Pausa sozinho ao sair da tela ou trocar de aba.
   ================================================================ */
const TT = (s) => (window.I18N ? window.I18N.t(s) : s); // i18n (js/i18n.js)
function createBrickGame(canvas, opts = {}) {
  // ---------- constantes ----------
  // campo lógico configurável: paisagem (padrão) ou retrato no celular
  const W = opts.width || 1000, H = opts.height || 700, TOP_WALL = 64;
  const COLS = opts.cols || 10, ROWS = 7, GAP = 8, BH = 26, BRICK_TOP = 110;
  const BW = opts.brickW || Math.floor((W - 76 - (COLS - 1) * GAP) / COLS);
  const BRICK_LEFT = (W - (COLS * BW + (COLS - 1) * GAP)) / 2;
  const R = 9;                        // raio da bola
  const PADDLE_SPEED = 950;           // px/s no teclado
  const MAX_BOUNCE = Math.PI / 3;     // 60° de desvio máximo na raquete
  const START_LIVES = 3;
  const COMBO_FOR_POWER = 3;          // combo necessário para soltar um poder (3, 6, 9...)
  const MAX_BALLS = 8;
  const POWER_SPEED = 230;            // velocidade de queda da cápsula (px/s)
  const POWER_W = 46, POWER_H = 20;

  const C = Object.assign({
    bg: '#0b0f17', glow: '#172233', dots: 'rgba(255,255,255,0.05)',
    wall: 'rgba(255,255,255,0.10)', text: '#e9eef7', muted: '#8a94a8',
    paddle: '#e9eef7', ball: '#ffffff', accent: '#7dd3c0', power: '#fbbf6a'
  }, opts.colors);
  const HUE0 = opts.hue ?? 168, HUE_STEP = opts.hueStep ?? 22;
  const rowColor = r => `hsl(${HUE0 + r * HUE_STEP}, 62%, ${62 - r * 2}%)`;
  const FONT = opts.font || 'system-ui, sans-serif';
  const MONO = opts.mono || FONT;

  const ctx = canvas.getContext('2d');
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ---------- estado ----------
  let bricks = [], alive = 0, particles = [], powers = [];
  let score = 0, lives = START_LIVES, level = 1, combo = 0, comboT = 0, broken = 0;
  let best = +(store.get('quebra-blocos-best') || 0);
  let state = 'ready';                // ready | playing | paused | over
  const paddle = { x: W / 2, y: H - 60, w: 140, h: 14, squash: 0 };
  let balls = [];
  let speed = 520;
  const makeBall = () => ({ x: paddle.x, y: paddle.y - R - 1, vx: 0, vy: 0, trail: [] });
  const keys = { left: false, right: false };
  let pointerX = null;

  let scale = 1, offX = 0, offY = 0;
  let bg = document.createElement('canvas');
  let raf = 0, last = 0, lastInput = 0, visible = true, destroyed = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- níveis ----------
  function buildLevel() {
    bricks = [];
    const pattern = (level - 1) % 3;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let hp = 1;
        if (pattern === 1) {             // xadrez com topo reforçado
          if ((r + c) % 2 === 1 && r > 1) continue;
          if (r < 2) hp = 2;
        } else if (pattern === 2) {      // losango com núcleo reforçado
          const d = Math.abs(c - (COLS - 1) / 2) * (9 / Math.max(1, COLS - 1)) + Math.abs(r - 3);
          if (d > 5.5) continue;
          if (d < 2) hp = 2;
        }
        if (level > 3 && r === 0) hp = 2;
        bricks.push({ x: BRICK_LEFT + c * (BW + GAP), y: BRICK_TOP + r * (BH + GAP),
                      w: BW, h: BH, hp, max: hp, row: r, flash: 0 });
      }
    }
    alive = bricks.length;
    speed = Math.min(520 + (level - 1) * 45, 820);
    broken = 0;
  }

  function resetBall() {
    state = 'ready';
    combo = 0;
    powers = [];
    balls = [makeBall()];
  }

  function newGame() {
    score = 0; lives = START_LIVES; level = 1;
    paddle.x = W / 2;
    buildLevel(); resetBall();
  }

  function launchBall(b) {
    const a = (Math.random() * 2 - 1) * (Math.PI / 6);
    b.vx = speed * Math.sin(a);
    b.vy = -speed * Math.cos(a);
  }

  function launch() {
    balls.forEach(launchBall);
    state = 'playing';
  }

  // bola extra sai da raquete
  function addBall() {
    if (balls.length >= MAX_BALLS) { score += 50; return; }
    const b = makeBall();
    launchBall(b);
    balls.push(b);
  }

  function dropPower(brick) {
    powers.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, t: 0 });
  }

  function action() {
    if (state === 'ready') launch();
    else if (state === 'paused') state = 'playing';
    else if (state === 'over') newGame();
  }

  function setPaused(p) {
    if (p && state === 'playing') state = 'paused';
    else if (!p && state === 'paused') state = 'playing';
    draw();
  }

  // ---------- física ----------
  function burst(b) {
    if (reduceMotion) return;
    const col = rowColor(b.row);
    for (let i = 0; i < 14; i++) {
      particles.push({
        x: b.x + Math.random() * b.w, y: b.y + Math.random() * b.h,
        vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.8) * 260,
        life: 0.6 + Math.random() * 0.4, t: 0, size: 2 + Math.random() * 3, col
      });
    }
  }

  // move uma bola um sub-passo; retorna 'level', 'lost' ou false
  function step(ball, dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // paredes
    if (ball.x < R)         { ball.x = R;         ball.vx =  Math.abs(ball.vx); }
    if (ball.x > W - R)     { ball.x = W - R;     ball.vx = -Math.abs(ball.vx); }
    if (ball.y < TOP_WALL + R) { ball.y = TOP_WALL + R; ball.vy = Math.abs(ball.vy); }

    // raquete: o ângulo de saída depende de onde a bola bate
    const pl = paddle.x - paddle.w / 2, pr = paddle.x + paddle.w / 2;
    if (ball.vy > 0 && ball.y + R >= paddle.y && ball.y - R <= paddle.y + paddle.h &&
        ball.x + R >= pl && ball.x - R <= pr) {
      const off = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
      const a = off * MAX_BOUNCE;
      ball.vx = speed * Math.sin(a);
      ball.vy = -speed * Math.cos(a);
      ball.y = paddle.y - R;
      paddle.squash = 1;
      combo = 0;
    }

    // tijolos (no máximo um por sub-passo)
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      const cx = clamp(ball.x, b.x, b.x + b.w), cy = clamp(ball.y, b.y, b.y + b.h);
      const dx = ball.x - cx, dy = ball.y - cy;
      if (dx * dx + dy * dy > R * R) continue;

      const ox = R + b.w / 2 - Math.abs(ball.x - (b.x + b.w / 2));
      const oy = R + b.h / 2 - Math.abs(ball.y - (b.y + b.h / 2));
      if (ox < oy) { ball.vx = ball.x < b.x + b.w / 2 ? -Math.abs(ball.vx) : Math.abs(ball.vx); ball.x += Math.sign(ball.vx) * ox; }
      else         { ball.vy = ball.y < b.y + b.h / 2 ? -Math.abs(ball.vy) : Math.abs(ball.vy); ball.y += Math.sign(ball.vy) * oy; }

      b.hp--; b.flash = 1;
      combo++; comboT = 1.1;
      score += 10 * combo;
      if (combo % COMBO_FOR_POWER === 0) dropPower(b);
      if (b.hp <= 0) {
        alive--; broken++; burst(b);
        if (broken % 8 === 0) {         // acelera um pouco a cada 8 tijolos
          speed = Math.min(speed + 15, 900);
          for (const o of balls) {
            const s = Math.hypot(o.vx, o.vy) || 1;
            o.vx *= speed / s; o.vy *= speed / s;
          }
        }
      }
      break;
    }

    if (alive <= 0) {                   // nível concluído
      level++; score += 100;
      buildLevel(); resetBall();
      return 'level';
    }
    if (ball.y - R > H) return 'lost';  // esta bola caiu
    return false;
  }

  function loseLife() {
    lives--;
    if (lives <= 0) {
      state = 'over';
      powers = [];
      balls.forEach(b => b.trail = []);
      if (score > best) { best = score; store.set('quebra-blocos-best', String(best)); }
    } else resetBall();
  }

  function update(dt) {
    if (keys.left || keys.right) {
      paddle.x += ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * PADDLE_SPEED * dt;
      pointerX = null;
    } else if (pointerX !== null && state !== 'paused' && state !== 'over') {
      paddle.x += (pointerX - paddle.x) * Math.min(1, dt * 25);
    }
    paddle.x = clamp(paddle.x, paddle.w / 2 + 6, W - paddle.w / 2 - 6);
    paddle.squash = Math.max(0, paddle.squash - dt * 4);

    for (const b of bricks) if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 5);
    for (const p of particles) { p.t += dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    particles = particles.filter(p => p.t < p.life);
    if (comboT > 0) comboT -= dt;

    if (state === 'ready') { for (const b of balls) { b.x = paddle.x; b.y = paddle.y - R - 1; } return; }
    if (state !== 'playing') return;

    // poderes caindo
    const pl = paddle.x - paddle.w / 2, pr = paddle.x + paddle.w / 2;
    for (const p of powers) {
      p.t += dt; p.y += POWER_SPEED * dt;
      if (!p.caught && p.y + POWER_H / 2 >= paddle.y && p.y - POWER_H / 2 <= paddle.y + paddle.h &&
          p.x + POWER_W / 2 >= pl && p.x - POWER_W / 2 <= pr) {
        p.caught = true; paddle.squash = 1; addBall();
      }
    }
    powers = powers.filter(p => !p.caught && p.y - POWER_H < H);

    // bolas
    const steps = Math.max(1, Math.ceil((speed * dt) / (R * 0.5)));
    for (const b of balls.slice()) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 10) b.trail.shift();
      for (let i = 0; i < steps; i++) {
        const r = step(b, dt / steps);
        if (r === 'level') return;
        if (r === 'lost') { balls.splice(balls.indexOf(b), 1); break; }
      }
    }
    if (balls.length === 0) loseLife();
  }

  // ---------- desenho ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function buildBg() {
    bg.width = canvas.width; bg.height = canvas.height;
    const g = bg.getContext('2d');
    g.clearRect(0, 0, bg.width, bg.height);
    if (!opts.transparent){ g.fillStyle = C.bg; g.fillRect(0, 0, bg.width, bg.height); }
    g.setTransform(scale, 0, 0, scale, offX, offY);
    const rad = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W * 0.65);
    if (!opts.transparent){ rad.addColorStop(0, C.glow); rad.addColorStop(1, C.bg);
    g.fillStyle = rad; g.fillRect(0, 0, W, H); }
    g.fillStyle = C.dots;
    for (let y = TOP_WALL + 20; y < H; y += 28)
      for (let x = 14; x < W; x += 28) g.fillRect(x, y, 2, 2);
  }

  function centerText(txt, y, font, color) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center';
    ctx.fillText(txt, W / 2, y);
  }

  function overlay(title, lines) {
    ctx.fillStyle = 'rgba(6, 9, 14, 0.66)';
    ctx.fillRect(0, 0, W, H);
    centerText(title, H / 2 - 20, '700 52px ' + FONT, C.text);
    lines.forEach((l, i) => centerText(l, H / 2 + 28 + i * 32, '400 20px ' + FONT, C.muted));
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    ctx.textBaseline = 'alphabetic';

    // HUD
    ctx.font = '600 22px ' + MONO;
    ctx.fillStyle = C.text; ctx.textAlign = 'left';
    ctx.fillText(String(score).padStart(5, '0'), 24, 42);
    ctx.font = '400 13px ' + MONO; ctx.fillStyle = C.muted;
    ctx.fillText(TT('RECORDE ') + best, 110, 41);
    centerText(TT('NÍVEL ') + level, 42, '600 16px ' + FONT, C.muted);
    for (let i = 0; i < START_LIVES; i++) {
      ctx.beginPath(); ctx.arc(W - 30 - i * 24, 35, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < lives ? C.accent : 'rgba(255,255,255,0.12)'; ctx.fill();
    }
    ctx.fillStyle = C.wall; ctx.fillRect(0, TOP_WALL - 2, W, 2);

    // tijolos
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      const weak = b.max > 1 && b.hp < b.max;
      ctx.globalAlpha = weak ? 0.55 : 1;
      ctx.fillStyle = rowColor(b.row);
      rr(b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      rr(b.x + 3, b.y + 3, b.w - 6, 5, 2.5); ctx.fill();
      if (b.max > 1 && !weak) {
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
        rr(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 5); ctx.stroke();
      }
      if (b.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${b.flash * 0.7})`;
        rr(b.x, b.y, b.w, b.h, 6); ctx.fill();
      }
    }

    // partículas
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // raquete (achata levemente ao rebater)
    const sq = paddle.squash;
    const pw = paddle.w * (1 + 0.08 * sq), ph = paddle.h * (1 - 0.3 * sq);
    ctx.fillStyle = C.paddle;
    rr(paddle.x - pw / 2, paddle.y + (paddle.h - ph), pw, ph, ph / 2); ctx.fill();
    ctx.fillStyle = C.accent;
    rr(paddle.x - 14, paddle.y + (paddle.h - ph) + ph / 2 - 2, 28, 4, 2); ctx.fill();

    // poderes: cápsula "+1" caindo
    for (const p of powers) {
      const bob = reduceMotion ? 0 : Math.sin(p.t * 8) * 2;
      const x = p.x - POWER_W / 2, y = p.y - POWER_H / 2 + bob;
      ctx.globalAlpha = 0.25; ctx.fillStyle = C.power;
      rr(x - 5, y - 5, POWER_W + 10, POWER_H + 10, (POWER_H + 10) / 2); ctx.fill();
      ctx.globalAlpha = 1;
      rr(x, y, POWER_W, POWER_H, POWER_H / 2); ctx.fill();
      ctx.fillStyle = C.bg; ctx.font = '800 14px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+1', p.x, y + POWER_H / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }

    // rastro + bolas
    for (const b of balls) {
      b.trail.forEach((t, i) => {
        const k = (i + 1) / b.trail.length;
        ctx.globalAlpha = k * 0.25;
        ctx.beginPath(); ctx.arc(t.x, t.y, R * k, 0, Math.PI * 2);
        ctx.fillStyle = C.accent; ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (state === 'over') continue;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
      ctx.fillStyle = C.ball; ctx.fill();
    }

    // combo
    if (combo > 1 && comboT > 0) {
      ctx.globalAlpha = Math.min(1, comboT * 2);
      centerText('COMBO ×' + combo, TOP_WALL + 32, '700 18px ' + FONT, C.accent);
      ctx.globalAlpha = 1;
    }

    // telas de estado (estáticas, sem piscar)
    if (state === 'ready') {
      if (level > 1 && score > 0 && lives > 0) centerText(TT('Nível ') + level, H * 0.66, '700 30px ' + FONT, C.text);
      centerText(TT('Clique, toque ou aperte espaço para lançar'), H * 0.72, '400 18px ' + FONT, C.muted);
    } else if (state === 'paused') {
      overlay(TT('Pausado'), [TT('Clique ou aperte espaço para continuar')]);
    } else if (state === 'over') {
      overlay(TT('Fim de jogo'), [TT('Pontos: ') + score + TT('   ·   Recorde: ') + best, TT('Clique ou aperte espaço para jogar de novo')]);
    }
  }

  // ---------- loop (dorme quando não há nada acontecendo) ----------
  function frame(t) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min((t - last) / 1000, 1 / 30);
    last = t;
    update(dt);
    draw();
    const busy = state === 'playing' || powers.length > 0 || particles.length > 0 || keys.left || keys.right ||
                 bricks.some(b => b.flash > 0) || paddle.squash > 0 || t - lastInput < 1500;
    if (visible && busy) raf = requestAnimationFrame(frame);
  }

  function wake() {
    lastInput = performance.now();
    if (!raf && visible && !destroyed) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  // ---------- entrada ----------
  function toLogicalX(e) {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    return (px - offX) / scale;
  }
  const onMove = e => { pointerX = toLogicalX(e); wake(); };
  const onDown = e => {
    canvas.focus({ preventScroll: true });
    pointerX = toLogicalX(e);
    action(); wake();
  };
  const onLeave = () => { pointerX = null; };
  const onKey = down => e => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = down;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = down;
    else if (down && (k === ' ' || k === 'Enter')) action();
    else if (down && (k === 'p' || k === 'P' || k === 'Escape')) setPaused(state === 'playing');
    else return;
    e.preventDefault(); wake();
  };
  const onKeyDown = onKey(true), onKeyUp = onKey(false);
  const onBlur = () => { keys.left = keys.right = false; };
  const onVis = () => { if (document.hidden) setPaused(true); };

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVis);

  // pausa sozinho quando o jogo sai da tela (scroll)
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (!visible) setPaused(true); else wake();
  }) : null;
  if (io) io.observe(canvas);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = Math.min(canvas.width / W, canvas.height / H);
    offX = (canvas.width - W * scale) / 2;
    offY = (canvas.height - H * scale) / 2;
    buildBg();
    draw();
  }
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);

  newGame();
  resize();

  return {
    pause: () => setPaused(true),
    reset: () => { newGame(); draw(); },
    focus: () => { canvas.focus({ preventScroll: true }); wake(); },
    redraw: () => resize(),
    resume: () => { setPaused(false); wake(); },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      if (io) io.disconnect();
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
    }
  };
}
window.createBrickGame = createBrickGame;
