/* ================================================================
   ALEXANDRE GARCIA — main.js
   Loader · Cursor · Smooth scroll (Lenis+GSAP) · Nav · Reveals ·
   Hero 3D (Three.js) · Marquee · Experience horizontal pin ·
   Side index rail · Mobile menu · Typing effect
   ================================================================ */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const isNarrow = window.matchMedia("(max-width: 900px)").matches;

  /* ---------------------------------------------------------
     TEMAS — hex correspondentes usados nas cenas 3D (WebGL não
     lê variáveis CSS, então mantemos um mapa espelho aqui)
     --------------------------------------------------------- */
  const THEME_HEX = {
    blue:    { accent: 0x3d6bff, accent2: 0x7dd8ff, ink: 0x9fc7ff },
    violet:  { accent: 0x8b5cf6, accent2: 0xc4b5fd, ink: 0xcabcfa },
    emerald: { accent: 0x10b981, accent2: 0x6ee7b7, ink: 0xa8f0cf },
    amber:   { accent: 0xf59e0b, accent2: 0xfcd34d, ink: 0xfde3a0 },
  };
  function currentThemeName(){ return document.documentElement.getAttribute("data-theme") || "blue"; }
  function currentThemeHex(){ return THEME_HEX[currentThemeName()] || THEME_HEX.blue; }

  const threeThemeTargets = [];
  function registerThemeColor(material, variant){
    if (!material || !material.color) return;
    threeThemeTargets.push({ material, variant });
    material.color.setHex(currentThemeHex()[variant]);
  }
  document.addEventListener("themechange", () => {
    const hex = currentThemeHex();
    threeThemeTargets.forEach(({ material, variant }) => {
      if (material.color) material.color.setHex(hex[variant]);
    });
  });

  // entrada suave da página — roda em toda navegação, não só na primeira carga
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { document.body.classList.add("page-ready"); });
  });
  // restaurada do cache do navegador (botão voltar/avançar): garante que não fique presa invisível
  window.addEventListener("pageshow", (e) => {
    if (e.persisted){
      document.body.classList.remove("page-exit");
      document.body.classList.add("page-ready");
    }
  });

  /* ---------------------------------------------------------
     transição suave entre páginas do site: ao clicar num link
     interno, a página atual esmaece antes de navegar
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     ÁUDIO — motor sintetizado via Web Audio API. Sem arquivos
     externos: 2 trilhas ambiente geradas por osciladores +
     efeitos curtos de UI (hover/clique), 100% autorais.
     --------------------------------------------------------- */
  const AudioEngine = (() => {
    let ctx = null;
    let sfxGain = null;
    let reverbSend = null; // bus de espaço curto, só pra dar "corpo" aos sons de UI
    let started = false;

    const STORAGE_KEY = "agAudioPrefs";
    function loadPrefs(){
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { track: 1, muted: false, vol: 0.42 }; }
      catch (e) { return { track: 1, muted: false, vol: 0.42 }; }
    }
    function savePrefs(p){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e){} }
    let prefs = loadPrefs();

    function ensureCtx(){
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.42; // sons de UI: sempre ativos, independente do mute da música
      sfxGain.connect(ctx.destination);

      // reverb curta — só pra dar um toque de "espaço" nos sons de UI, tipo console moderno
      reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.5;
      const d1 = ctx.createDelay(1); d1.delayTime.value = 0.05;
      const fb1 = ctx.createGain(); fb1.gain.value = 0.22;
      const wash = ctx.createBiquadFilter(); wash.type = "lowpass"; wash.frequency.value = 3400;
      reverbSend.connect(d1); d1.connect(fb1); fb1.connect(d1); d1.connect(wash);
      wash.connect(sfxGain);
      return ctx;
    }

    /* --- trilhas: arquivos reais, tocados em loop via <audio> --- */
    const TRACKS = {
      1: "./assets/audio/scifi-ambient.mp3",
      2: "./assets/audio/synthwave.mp3",
    };
    const els = {}; // cache dos elementos <audio> por número de trilha
    let currentTrack = 0;
    function getEl(n){
      if (!els[n]){
        const a = new Audio(TRACKS[n]);
        a.loop = true;
        a.preload = "auto";
        a.volume = 0;
        els[n] = a;
      }
      return els[n];
    }

    function stopTrack(){
      Object.values(els).forEach((a) => { try { a.pause(); } catch (e){} });
    }

    function playTrack(n){
      if (!TRACKS[n]) return;
      stopTrack();
      currentTrack = n;
      const el = getEl(n);
      el.muted = false;
      el.volume = prefs.muted ? 0 : prefs.vol;
      try { el.currentTime = 0; } catch (e){}
      el.play().catch(() => {});
      prefs.track = n;
      savePrefs(prefs);
    }

    // toca MUTADO assim que a página carrega — todo navegador permite autoplay
    // mutado sem exigir nenhum gesto do usuário. Assim que o primeiro gesto
    // (qualquer um) acontecer, só precisamos "desmutar" (um passo bem mais leve
    // pros navegadores do que iniciar um play() do zero).
    /* mantém a música tocando "sem cortar" entre páginas: salva a posição
       atual antes de navegar (ver initPageTransitions) e retoma dali na
       próxima página — o autoplay ainda passa pelo mesmo fluxo de
       "mudo até o 1º gesto", só que começando na posição certa */
    const RESUME_KEY = "agAudioResume";
    function saveResumeState(){
      const el = els[currentTrack];
      if (!el || el.paused) return;
      try { sessionStorage.setItem(RESUME_KEY, JSON.stringify({ track: currentTrack, time: el.currentTime, ts: Date.now() })); } catch (e){}
    }
    function loadResumeState(){
      try {
        const raw = sessionStorage.getItem(RESUME_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.ts > 15000) return null; // muito antigo, ignora
        return data;
      } catch (e){ return null; }
    }

    let primed = false;
    function primeMutedAutoplay(){
      if (primed || prefs.muted) return;
      primed = true;
      const resume = loadResumeState();
      const trackNum = resume ? resume.track : (prefs.track || 1);
      const el = getEl(trackNum);
      currentTrack = trackNum;
      el.muted = true;
      el.volume = prefs.vol;
      if (resume){ try { el.currentTime = resume.time; } catch (e){} }
      el.play().catch(() => {}); // autoplay mutado — deve funcionar sempre, sem gesto nenhum
    }

    function start(){
      if (started) return;
      ensureCtx();
      if (ctx && ctx.state === "suspended") ctx.resume();
      if (prefs.muted){ started = true; return; }
      if (!primed) primeMutedAutoplay();
      const el = getEl(currentTrack || prefs.track || 1);
      el.muted = false;
      el.volume = prefs.vol;
      if (el.paused){
        // se por algum motivo o autoplay mutado não rodou, tenta tocar agora
        // (esse gesto conta como legítimo, então deve ser aceito)
        el.play().then(() => { started = true; }).catch(() => {});
      } else {
        started = true;
      }
    }

    function setMuted(muted){
      prefs.muted = muted;
      savePrefs(prefs);
      const el = els[currentTrack];
      if (muted){
        if (el) el.volume = 0;
      } else {
        ensureCtx();
        if (currentTrack === 0) playTrack(prefs.track || 1);
        else if (el){ el.muted = false; el.volume = prefs.vol; }
      }
    }

    /* --- efeitos curtos de UI: estilo PS5 — clean, curtos, "vítreos",
       sem transiente percussivo de clique --- */
    function noiseBuffer(dur){
      const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    }

    function hoverSound(){
      if (!ensureCtx()) return; // som de UI é sempre ativo, independente do mute da música
      if (!started) start(); // qualquer som de UI também liga a música, se ainda não tiver ligado
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      // "tick" vítreo e curto — dois tons puros levemente dissonantes, tipo menu de console
      [1760, 2350].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(i === 0 ? 0.11 : 0.065, now + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09 - i * 0.015);
        osc.connect(g); g.connect(sfxGain); g.connect(reverbSend);
        osc.start(now); osc.stop(now + 0.1);
      });
    }

    function clickSound(){
      if (!ensureCtx()) return; // som de UI é sempre ativo, independente do mute da música
      if (!started) start(); // qualquer som de UI também liga a música, se ainda não tiver ligado
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      // confirmação limpa: dois tons ascendentes tipo "chime" digital + leve ar de ruído
      [980, 1960].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const g = ctx.createGain();
        const t0 = now + i * 0.035;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(i === 0 ? 0.18 : 0.1, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        osc.connect(g); g.connect(sfxGain); g.connect(reverbSend);
        osc.start(t0); osc.stop(t0 + 0.24);
      });
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.05);
      const filt = ctx.createBiquadFilter();
      filt.type = "highpass"; filt.frequency.value = 6000;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      src.connect(filt); filt.connect(ng); ng.connect(sfxGain);
      src.start(now); src.stop(now + 0.06);
    }

    return {
      start, playTrack, setMuted, primeMutedAutoplay, saveResumeState,
      hoverSound, clickSound,
      getPrefs: () => ({ ...prefs }),
      isMuted: () => prefs.muted,
    };
  })();

  /* liga o áudio na primeira interação real do usuário (política de autoplay) */
  function initAudioUnlock(){
    AudioEngine.primeMutedAutoplay(); // toca mutado desde já, sem esperar nenhum gesto
    window.addEventListener("pagehide", () => AudioEngine.saveResumeState()); // rede de segurança pra qualquer navegação (voltar, fechar aba etc.)
    const unlock = () => { AudioEngine.start(); };
    // gestos válidos pra política de autoplay dos navegadores. "click" é o mais
    // universalmente aceito por todos os navegadores — antes só tinha pointerdown/
    // keydown/touchstart, e em alguns navegadores isso não bastava pra <audio>.play().
    // Adicionamos também mousemove: como o áudio já está tocando (mutado), desmutar
    // é uma barreira bem mais leve, e até um simples mover o mouse costuma bastar.
    ["click", "pointerdown", "keydown", "touchstart", "mousemove", "scroll"].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));
  }

  /* som de hover/clique — só em botões reais, e só ao ENTRAR neles
     (evita repetir o som ao mover o mouse entre elementos internos, tipo
     ícones dentro do próprio botão) */
  function initUiSounds(){
    const SEL = "button, .wa-float, .btn-primary, .btn-outline, .btn-send, .fullmenu-link, .settings-nav-link, .contact-info-row, .github-all, .proj-card, .proj-shot, .music-toggle-fab";
    document.addEventListener("mouseover", (e) => {
      const el = e.target.closest(SEL);
      if (!el) return;
      const from = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(SEL) : null;
      if (from === el) return; // ainda dentro do mesmo botão — não repete
      AudioEngine.hoverSound();
    });
    document.addEventListener("click", (e) => {
      const el = e.target.closest(SEL);
      if (!el) return;
      AudioEngine.clickSound();
    });
  }

  function initPageTransitions(){
    if (reduceMotion) return;
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (/^https?:\/\//i.test(href) || a.target === "_blank") return; // externo: navega normal
      e.preventDefault();
      AudioEngine.saveResumeState(); // guarda a posição da música pra continuar na próxima página
      document.body.classList.remove("page-ready");
      document.body.classList.add("page-exit");
      setTimeout(() => { window.location.href = href; }, 340);
    });
  }

  /* ---------------------------------------------------------
     1) LOADER
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     0) MODELO 3D REUTILIZÁVEL — notebook wireframe (loader + Sobre)
     --------------------------------------------------------- */
  /* campo de visão adaptado à proporção da tela — mantém o notebook em
     tamanho consistente mesmo em telas estreitas/retrato (mobile).
     Reaplicada em todo resize, então reage em tempo real. */
  function adaptiveFov(baseFov, width, height){
    const REF_ASPECT = 1.5; // referência tipo desktop
    const aspect = width / height;
    if (aspect >= REF_ASPECT) return baseFov;
    const baseFovRad = baseFov * Math.PI / 180;
    const refHalfTan = Math.tan(baseFovRad / 2) * REF_ASPECT;
    const newFovRad = 2 * Math.atan(refHalfTan / aspect);
    return Math.min(102, newFovRad * 180 / Math.PI);
  }

  function buildLaptopModel(opts){
    opts = opts || {};
    const colorMain = opts.colorMain || 0x9fc7ff;
    const colorAccent = opts.colorAccent || 0x7dd8ff;

    const group = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: colorMain, transparent: true, opacity: 0, depthWrite: false });
    const hingeLineMat = new THREE.LineBasicMaterial({ color: colorMain, transparent: true, opacity: 0, depthWrite: false });
    const glowMat = new THREE.MeshBasicMaterial({ color: colorAccent, transparent: true, opacity: 0, depthWrite: false });

    // base (deck do teclado)
    const baseGeo = new THREE.BoxGeometry(3.4, 0.16, 2.2);
    const base = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), lineMat);
    group.add(base);

    // teclas — pequenos traços sobre a base
    const keysGeo = new THREE.BufferGeometry();
    const keyVerts = [];
    for (let r = 0; r < 3; r++){
      for (let c = 0; c < 8; c++){
        const x = -1.35 + c * 0.36;
        const z = -0.55 + r * 0.32;
        keyVerts.push(x - 0.11, 0.081, z, x + 0.11, 0.081, z);
      }
    }
    keysGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(keyVerts), 3));
    const keys = new THREE.LineSegments(keysGeo, hingeLineMat);
    group.add(keys);

    // pivô da tela na dobradiça (borda de trás da base)
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.08, -1.08);
    group.add(hinge);

    const screenPivot = new THREE.Group();
    hinge.add(screenPivot);

    const screenGeo = new THREE.BoxGeometry(3.4, 2.1, 0.08);
    const screenFrame = new THREE.LineSegments(new THREE.EdgesGeometry(screenGeo), lineMat);
    screenFrame.position.y = 1.05;
    screenPivot.add(screenFrame);

    const glowGeo = new THREE.PlaneGeometry(3.05, 1.75);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 1.05, 0.045);
    screenPivot.add(glow);

    screenPivot.rotation.x = Math.PI / 2.02; // começa fechada (dobrada sobre a base)

    registerThemeColor(lineMat, "ink");
    registerThemeColor(hingeLineMat, "ink");
    registerThemeColor(glowMat, "accent2");

    return { group, screenPivot, lineMat, hingeLineMat, glowMat, base, screenFrame, glow };
  }

  function createTypingScreen(){
    const cw = 640, ch = 380;
    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    const ctx = c.getContext("2d");
    const tex = new THREE.CanvasTexture(c);

    const state = { lines: [], li: 0, ci: 0, pct: null, bootLine: "" };

    function drawAll(){
      ctx.fillStyle = "#0c1120";
      ctx.fillRect(0, 0, cw, ch);

      // mensagem principal (digitando)
      ctx.font = "22px 'IBM Plex Mono', monospace";
      ctx.textBaseline = "top";
      let y = 46;
      for (let i = 0; i < state.li; i++){
        ctx.fillStyle = state.lines[i].color || "#e2ecff";
        ctx.fillText(state.lines[i].text, 34, y);
        y += 40;
      }
      if (state.li < state.lines.length){
        const cur = state.lines[state.li];
        const shown = cur.text.slice(0, state.ci);
        ctx.fillStyle = cur.color || "#e2ecff";
        ctx.fillText(shown, 34, y);
        const w = ctx.measureText(shown).width;
        ctx.fillStyle = "#7dd8ff";
        ctx.fillRect(34 + w + 3, y + 2, 9, 20);
      }

      // rodapé — status de boot, dentro da própria tela
      if (state.pct !== null){
        ctx.strokeStyle = "rgba(226,236,255,.14)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, ch - 92);
        ctx.lineTo(cw - 30, ch - 92);
        ctx.stroke();

        ctx.font = "14px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "#576079";
        ctx.fillText("// alexandregarcia.dev", 30, ch - 72);

        const pctText = `${String(Math.round(state.pct)).padStart(2, "0")}%`;
        ctx.font = "bold 17px 'IBM Plex Mono', monospace";
        const pctW = ctx.measureText(pctText).width;
        ctx.fillStyle = "#7dd8ff";
        ctx.fillText(pctText, cw - 30 - pctW, ch - 74);

        ctx.font = "16px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "#7dd8ff";
        ctx.fillText(state.bootLine, 30, ch - 42);

        const barY = ch - 20, barW = cw - 60;
        ctx.fillStyle = "rgba(226,236,255,.16)";
        ctx.fillRect(30, barY, barW, 3);
        ctx.fillStyle = "#3d6bff";
        ctx.fillRect(30, barY, barW * (Math.max(0, Math.min(100, state.pct)) / 100), 3);
      }

      tex.needsUpdate = true;
    }
    drawAll();

    function typeLines(lines, opts){
      opts = opts || {};
      const charDelay = opts.charDelay || 26;
      state.lines = lines; state.li = 0; state.ci = 0;
      let timer = null;

      function step(){
        drawAll();
        if (state.li >= lines.length){ if (opts.onDone) opts.onDone(); return; }
        if (state.ci >= lines[state.li].text.length){ state.li++; state.ci = 0; timer = setTimeout(step, 260); return; }
        state.ci++;
        timer = setTimeout(step, charDelay);
      }
      step();
      return () => clearTimeout(timer);
    }

    function setProgress(pct){ state.pct = pct; drawAll(); }
    function setBootLine(text){ state.bootLine = text; drawAll(); }

    return { tex, typeLines, setProgress, setBootLine, dispose: () => tex.dispose() };
  }

  function runLoader(done){
    const loader = document.getElementById("loader");
    const canvas = document.getElementById("loaderCanvas");
    if (!loader){ done(); return; }

    // já rodou nesta sessão (ex: navegação entre páginas) — pula, só roda na 1ª carga do site
    if (sessionStorage.getItem("agLoaderShown")){
      loader.style.transition = "none";
      loader.style.opacity = "0";
      loader.style.visibility = "hidden";
      loader.style.pointerEvents = "none";
      done();
      return;
    }
    sessionStorage.setItem("agLoaderShown", "1");

    const steps = [
      "> booting portfolio",
      "> compilando planta base",
      "> renderizando notebook.obj",
      "> montando seções [ok]",
      "> pronto.",
    ];

    function finish(){
      loader.classList.add("is-done");
      setTimeout(done, 700);
    }

    // --------- modo reduzido: sem 3D, finaliza rápido ---------
    if (reduceMotion || typeof THREE === "undefined" || typeof gsap === "undefined"){
      setTimeout(finish, 500);
      return;
    }

    // --------- modo completo: notebook 3D abre e dá boas-vindas ---------
    let width = window.innerWidth, height = window.innerHeight;
    const BASE_FOV = 38;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(adaptiveFov(BASE_FOV, width, height), width / height, 0.1, 50);
    camera.position.set(0, 1.55, 5.3);
    camera.lookAt(0, 0.85, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    const laptop = buildLaptopModel({});
    laptop.group.scale.setScalar(0.001);
    scene.add(laptop.group);

    const screen = createTypingScreen();
    laptop.glow.material.map = screen.tex;
    laptop.glow.material.color.set(0xffffff);
    laptop.glow.material.needsUpdate = true;

    function resize(){
      width = window.innerWidth; height = window.innerHeight;
      camera.aspect = width / height;
      camera.fov = adaptiveFov(BASE_FOV, width, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", resize);

    let raf;
    function frame(){
      raf = requestAnimationFrame(frame);
      renderer.render(scene, camera); // notebook estático, sem rotação contínua
    }
    frame();

    function teardown(){
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      screen.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    // ----- linha de boot cicla texto — dentro da própria tela do notebook -----
    let stepI = 0;
    screen.setProgress(0);
    screen.setBootLine(steps[0]);
    const lineTimer = setInterval(() => {
      stepI = Math.min(stepI + 1, steps.length - 1);
      screen.setBootLine(steps[stepI]);
      if (stepI >= steps.length - 1) clearInterval(lineTimer);
    }, 780);

    // ----- timeline principal (autoplay, ~4.8s — o notebook abre rápido,
    // mas o "carregando" que vem depois demora um pouco mais) -----
    const counter = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        clearInterval(lineTimer);
        finish();
        setTimeout(teardown, 750);
      },
    });

    tl.to(laptop.group.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.5)" }, 0);
    tl.to(laptop.lineMat, { opacity: 0.85, duration: 0.5 }, 0.15);
    tl.to(laptop.hingeLineMat, { opacity: 0.5, duration: 0.5 }, 0.5);
    tl.to(laptop.screenPivot.rotation, { x: -0.12, duration: 1.3, ease: "power2.inOut" }, 0.7);
    tl.to(laptop.glowMat, { opacity: 1, duration: 0.5 }, 1.9);
    tl.call(() => {
      screen.typeLines([
        { text: "> seja bem-vindo(a)", color: "#7dd8ff" },
        { text: "  alexandregarcia.dev", color: "#e2ecff" },
        { text: "", color: "#e2ecff" },
        { text: "> carregando experiência...", color: "#576079" },
      ], { charDelay: 30 });
    }, [], 2.1);
    tl.to(counter, {
      v: 100, duration: 4.8, ease: "power1.inOut",
      onUpdate: () => { screen.setProgress(counter.v); },
    }, 0);
  }

  /* ---------------------------------------------------------
     2) CURSOR CUSTOMIZADO (apenas mouse fino)
     --------------------------------------------------------- */
  function initCursor(){
    if (isTouch || reduceMotion) return;
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    }, { passive: true });

    function loop(){
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    const hoverables = document.querySelectorAll("a, button, .proj-card, .exp-card");
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-hover"));
    });
  }

  /* ---------------------------------------------------------
     3) SMOOTH SCROLL (Lenis) + GSAP ScrollTrigger bridge
     --------------------------------------------------------- */
  let lenis = null;
  function initSmoothScroll(){
    if (typeof Lenis === "undefined" || typeof gsap === "undefined") return;
    if (reduceMotion){
      // sem smoothing artificial: apenas registra ScrollTrigger com scroll nativo
      if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.1,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------------------------------------------------
     4) NAV — solid bg on scroll, hide on scroll-down, active link
     --------------------------------------------------------- */
  function initNav(){
    const nav = document.getElementById("mainNav");
    const items = document.querySelectorAll(".nav-item");
    const sections = ["hero","about","experience","projects","education","contact"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    let lastY = 0;
    function onScroll(){
      const y = window.scrollY;
      nav.classList.toggle("nav-solid", y > 40);
      if (y > lastY && y > 160){ nav.classList.add("nav-hide"); }
      else { nav.classList.remove("nav-hide"); }
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    const railN = document.getElementById("railN");
    const railFill = document.getElementById("railFill");
    const railLabel = document.getElementById("railLabel");
    const flyoutBtns = document.querySelectorAll(".measure-flyout button");
    const total = sections.length;

    if ("IntersectionObserver" in window){
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          items.forEach((a) => a.classList.toggle("is-active", a.dataset.target === id));
          flyoutBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.target === id));
          const idx = sections.findIndex((s) => s.id === id);
          if (idx > -1 && railN && railFill && railLabel){
            railN.textContent = String(idx + 1).padStart(2, "0");
            railFill.style.top = `${(idx / Math.max(total - 1, 1)) * 100}%`;
            railLabel.textContent = id.toUpperCase();
          }
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      sections.forEach((s) => spy.observe(s));
    }

    // navegação clicável (régua e menu) — usa Lenis se disponível
    function scrollToId(id){
      const target = document.getElementById(id);
      if (!target) return;
      if (lenis) lenis.scrollTo(target, { offset: -10 });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }
    flyoutBtns.forEach((btn) => {
      btn.addEventListener("click", () => scrollToId(btn.dataset.target));
    });
  }

  /* ---------------------------------------------------------
     5) MOBILE MENU
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     CONFIGURAÇÕES — painel: tema, trilha sonora, navegação
     --------------------------------------------------------- */
  const THEME_KEY = "agTheme";
  function applyTheme(name){
    if (name && name !== "blue") document.documentElement.setAttribute("data-theme", name);
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem(THEME_KEY, name || "blue"); } catch (e){}
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: name || "blue" } }));
  }

  /* mantém o botão de música (FAB) e o toggle do painel de configurações
     sempre sincronizados, seja qual for o controle usado pra mudar o estado */
  function syncMusicUI(){
    const muted = AudioEngine.isMuted();
    const fab = document.getElementById("musicToggleFab");
    if (fab){
      fab.classList.toggle("is-off", muted);
      fab.setAttribute("aria-pressed", String(!muted));
    }
    const audioToggle = document.getElementById("audioToggle");
    if (audioToggle){
      audioToggle.textContent = muted ? "off" : "on";
      audioToggle.setAttribute("data-glitch", audioToggle.textContent);
      audioToggle.classList.toggle("is-off", muted);
    }
  }

  /* ---------------------------------------------------------
     efeito "glitch" no hover dos botões — texto pisca rapidamente com
     um desvio de cor tipo aberração cromática, estilo matrix/tech.
     Puro CSS (pseudo-elementos + attr()), só precisa isolar o texto.
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     vídeo de fundo do "Vamos conversar?" — só toca quando a seção
     está visível (economiza recursos, mesmo padrão usado nas outras
     cenas do site)
     --------------------------------------------------------- */
  function initContactBgVideo(){
    const video = document.getElementById("contactBgVideo");
    const section = document.getElementById("contact");
    if (!video || !section || reduceMotion) return;
    if ("IntersectionObserver" in window){
      new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) video.play().catch(() => {});
        else video.pause();
      }, { threshold: 0 }).observe(section);
    }
  }

  function initGlitchText(){
    // elementos onde o texto já está isolado — aplica o glitch direto
    document.querySelectorAll(".btn-primary, .btn-outline, .btn-send-label, .fullmenu-link-text, .hamburger-label, .track-name, .audio-toggle, .measure-flyout button, .footer-nav-links a, .contact-info-value").forEach((el) => {
      if (el.classList.contains("glitch-hover")) return;
      const text = el.textContent.trim();
      if (!text) return;
      el.classList.add("glitch-hover");
      el.setAttribute("data-glitch", text);
    });
    // elementos com texto "solto" misturado com outra coisa (ícone, número) —
    // isola o texto num span próprio antes de aplicar o glitch nele
    document.querySelectorAll(".settings-nav-link, .github-all").forEach((el) => {
      if (el.querySelector(".glitch-hover")) return;
      const textNode = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (!textNode) return;
      const span = document.createElement("span");
      span.className = "glitch-hover";
      const text = textNode.textContent;
      span.textContent = text;
      span.setAttribute("data-glitch", text.trim());
      textNode.replaceWith(span);
    });
  }

  /* ---------------------------------------------------------
     glitch PERIÓDICO no nome principal (ALEXANDRE GARCIA) — dispara
     sozinho de tempos em tempos, sem precisar de hover, tipo o efeito
     "bugado" de referência
     --------------------------------------------------------- */
  function initTitleGlitch(){
    const lines = ["titleLine1", "titleLine2"].map((id) => document.getElementById(id)).filter(Boolean);
    if (!lines.length || reduceMotion) return;
    lines.forEach((line) => {
      if (!line.getAttribute("data-glitch")) line.setAttribute("data-glitch", line.textContent.trim());
    });
    function playOnce(){
      // as duas linhas juntas, com uma leve defasagem entre elas
      lines.forEach((line, i) => {
        setTimeout(() => {
          line.classList.add("is-glitching");
          setTimeout(() => line.classList.remove("is-glitching"), 420);
        }, i * 90);
      });
    }
    function loop(){
      playOnce();
      const next = 4000 + Math.random() * 3500; // entre 4s e 7.5s
      setTimeout(loop, next);
    }
    setTimeout(loop, 2600); // primeira vez logo após o hero assentar
  }

  function initMusicToggleFab(){
    const fab = document.getElementById("musicToggleFab");
    if (!fab) return;
    syncMusicUI();
    fab.addEventListener("click", () => {
      AudioEngine.setMuted(!AudioEngine.isMuted());
      syncMusicUI();
    });
  }

  function initSettingsPanel(){
    const fab = document.getElementById("settingsFab");
    const panel = document.getElementById("settingsPanel");
    const overlay = document.getElementById("settingsOverlay");
    const closeBtn = document.getElementById("settingsClose");
    if (!fab || !panel) return;

    function setOpen(open){
      panel.classList.toggle("is-open", open);
      overlay.classList.toggle("is-open", open);
      fab.setAttribute("aria-expanded", String(open));
    }
    fab.addEventListener("click", () => setOpen(true));
    closeBtn.addEventListener("click", () => setOpen(false));
    overlay.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

    // --- tema ---
    const swatches = Array.from(panel.querySelectorAll(".theme-swatch"));
    let savedTheme = "blue";
    try { savedTheme = localStorage.getItem(THEME_KEY) || "blue"; } catch (e){}
    swatches.forEach((sw) => sw.classList.toggle("is-active", sw.dataset.theme === savedTheme));
    swatches.forEach((sw) => sw.addEventListener("click", () => {
      applyTheme(sw.dataset.theme);
      swatches.forEach((s) => s.classList.toggle("is-active", s === sw));
    }));

    // --- trilha sonora ---
    const trackCards = Array.from(panel.querySelectorAll(".track-card"));
    const audioToggle = document.getElementById("audioToggle");
    const prefs = AudioEngine.getPrefs();
    trackCards.forEach((c) => c.classList.toggle("is-active", Number(c.dataset.track) === (prefs.track || 1)));
    syncMusicUI();
    trackCards.forEach((c) => c.addEventListener("click", () => {
      AudioEngine.playTrack(Number(c.dataset.track));
      trackCards.forEach((x) => x.classList.toggle("is-active", x === c));
      if (AudioEngine.isMuted()) AudioEngine.setMuted(false);
      syncMusicUI();
    }));
    audioToggle.addEventListener("click", () => {
      AudioEngine.setMuted(!AudioEngine.isMuted());
      syncMusicUI();
    });
  }

  /* aplica o tema salvo assim que possível (o app já injeta um script
     inline no <head> pra evitar flash, isso aqui é só a sincronização
     posterior caso o painel precise reler o estado) */

  function initMobileMenu(){
    const btn = document.getElementById("hamburger");
    const menu = document.getElementById("fullMenu");
    if (!btn || !menu) return;
    const label = btn.querySelector(".hamburger-label");
    function setOpen(open){
      menu.classList.toggle("is-open", open);
      btn.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      if (label){ label.textContent = open ? "FECHAR" : "MENU"; label.setAttribute("data-glitch", label.textContent); }
      document.body.style.overflow = open ? "hidden" : "";
    }
    btn.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  }

  /* ---------------------------------------------------------
     6) TYPING EFFECT (hero role)
     --------------------------------------------------------- */
  function initTyping(){
    const el = document.getElementById("typingText");
    if (!el) return;
    const cursorSpan = el.querySelector(".typing-cursor");
    const phrases = ["Full Stack Developer", "React · Java · Spring Boot"];
    if (reduceMotion){
      el.textContent = phrases[0];
      return;
    }
    let p = 0, c = 0, deleting = false;

    function tick(){
      const word = phrases[p];
      el.textContent = deleting ? word.slice(0, c--) : word.slice(0, c++);
      if (cursorSpan) el.appendChild(cursorSpan);

      let delay = deleting ? 35 : 55;
      if (!deleting && c === word.length + 1){ delay = 1700; deleting = true; }
      else if (deleting && c === 0){ deleting = false; p = (p + 1) % phrases.length; delay = 400; }
      setTimeout(tick, delay);
    }
    tick();
  }

  /* ---------------------------------------------------------
     7) MARQUEE (único da página) — duplica + loop contínuo
     --------------------------------------------------------- */
  function initMarquee(){
    const track = document.getElementById("marqueeTrack");
    if (!track) return;
    track.innerHTML += track.innerHTML; // duplica para loop sem costura

    if (reduceMotion) return;
    if (typeof gsap === "undefined"){
      track.style.animation = "none";
      return;
    }
    const distance = track.scrollWidth / 2;
    gsap.to(track, {
      x: -distance,
      duration: distance / 55,
      ease: "none",
      repeat: -1,
    });
  }

  /* ---------------------------------------------------------
     7.c) STAT COUNTERS — contadores animados ao entrar em tela
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     7.c.2) FORMAÇÃO — barras de idioma animadas
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     7.c.3) FORMAÇÃO — painéis divididos: contador ao vivo
     (sticky) + revelação das linhas conforme o scroll
     --------------------------------------------------------- */
  function initEducationSplit(){
    const split = document.getElementById("eduSplit");
    const counterEl = document.getElementById("eduCounterValue");
    if (!split) return;

    const TOTAL_HOURS = 248; // soma real das horas de todos os cursos
    const allRows = Array.from(split.querySelectorAll(".edu-row"));
    const hourRows = allRows.filter((r) => r.dataset.hours);

    // ---- revelação inicial das linhas (uma vez) ----
    if (!("IntersectionObserver" in window) || reduceMotion){
      allRows.forEach((r) => r.classList.add("is-in", "is-counted"));
      if (counterEl) counterEl.textContent = String(TOTAL_HOURS);
    } else {
      const ioReveal = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          ioReveal.unobserve(entry.target);
        });
      }, { threshold: 0.3, rootMargin: "0px 0px -8% 0px" });
      allRows.forEach((r) => ioReveal.observe(r));
    }

    // ---- marcação bidirecional: cada linha "marca" ao cruzar o centro da tela,
    // e o contador soma as horas das linhas marcadas naquele instante ----
    if (!reduceMotion && typeof gsap !== "undefined" && window.ScrollTrigger){
      const counterObj = { v: 0 };
      function recompute(){
        let sum = 0;
        hourRows.forEach((r) => { if (r.classList.contains("is-counted")) sum += Number(r.dataset.hours); });
        gsap.to(counterObj, {
          v: sum, duration: 0.4, ease: "power1.out",
          onUpdate: () => { if (counterEl) counterEl.textContent = String(Math.round(counterObj.v)); },
        });
      }
      allRows.forEach((row) => {
        ScrollTrigger.create({
          trigger: row, start: "center center",
          onEnter: () => { row.classList.add("is-counted"); recompute(); },
          onEnterBack: () => { row.classList.add("is-counted"); recompute(); },
          onLeaveBack: () => { row.classList.remove("is-counted"); recompute(); },
        });
      });
    }

    // ---- tilt 3D no mouse, igual ao efeito dos projetos ----
    if (isTouch || reduceMotion) return;
    [".edu-panel-a", ".edu-panel-b"].forEach((sel) => {
      const panel = document.querySelector(sel);
      if (!panel) return;
      const glare = document.createElement("div");
      glare.className = "edu-panel-glare";
      panel.appendChild(glare);

      let raf = null, primed = false;
      panel.addEventListener("mousemove", (e) => {
        if (!primed){ panel.style.transition = "transform .12s linear"; primed = true; }
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = panel.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          const rotY = (px - 0.5) * 14;
          const rotX = (0.5 - py) * 10;
          panel.style.transform = `perspective(1400px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.01)`;
          glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,.35), transparent 55%)`;
          raf = null;
        });
      });
      panel.addEventListener("mouseleave", () => {
        panel.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1)";
      });
    });
  }

  function initStatCounters(){
    const row = document.getElementById("statsRow");
    if (!row) return;
    const nums = row.querySelectorAll(".stat-num");
    if (reduceMotion || !("IntersectionObserver" in window)){
      nums.forEach((n) => { n.querySelector(".val").textContent = n.dataset.target; });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const valEl = el.querySelector(".val");
        const target = parseInt(el.dataset.target, 10) || 0;
        const obj = { v: 0 };
        if (typeof gsap !== "undefined"){
          gsap.to(obj, {
            v: target, duration: 1.4, ease: "power2.out",
            onUpdate: () => { valEl.textContent = String(Math.round(obj.v)); },
          });
        } else {
          valEl.textContent = String(target);
        }
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  }

  /* ---------------------------------------------------------
     7.d) ABOUT — sequência única: conteúdo some, notebook nasce,
     cor do ambiente muda — tudo dentro da própria seção
     --------------------------------------------------------- */
  function initAboutSequence(){
    const mainEl = document.querySelector("#about .about-main");
    const canvas = document.getElementById("aboutCanvas");
    const img = document.getElementById("aboutPhotoImg");
    const photoWrap = document.querySelector("#about .about-photo");
    const copy = document.querySelector("#about .about-copy");
    const stack = document.querySelector("#about .about-stack");
    const giantBg = document.getElementById("aboutGiantBg");
    const caption = document.getElementById("aboutMotionCaption");
    if (!mainEl || !canvas || typeof THREE === "undefined") return;
    if (img) img.style.filter = "none"; // foto sempre em cor cheia agora

    const capable = !isNarrow && !reduceMotion && typeof gsap !== "undefined" && !!window.ScrollTrigger;

    /* ---------- cena: malha ondulada (piso) + notebook (escondido) ---------- */
    let width = mainEl.clientWidth, height = mainEl.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(adaptiveFov(62, width, height), width / height, 0.1, 120);
    camera.position.set(0, 2.4, 11.5);
    camera.lookAt(0, -0.35, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    const SEG = isNarrow ? 26 : 46;
    const waveGeo = new THREE.PlaneGeometry(52, 34, SEG, SEG);
    const waveMat = new THREE.PointsMaterial({ color: 0x3d6bff, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false });
    registerThemeColor(waveMat, "accent");
    const waveMesh = new THREE.Points(waveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI / 2.3;
    waveMesh.position.y = -2.6;
    scene.add(waveMesh);
    const posAttr = waveGeo.attributes.position;
    const basePos = Float32Array.from(posAttr.array);
    const waveState = { amp: isTouch ? 0.3 : 0.5 };

    const laptop = buildLaptopModel({});
    laptop.group.scale.setScalar(0.001);
    laptop.group.position.y = -0.5;
    scene.add(laptop.group);
    const screen = createTypingScreen();
    laptop.glow.material.map = screen.tex;
    laptop.glow.material.color.set(0xffffff);
    laptop.glow.material.needsUpdate = true;

    function resize(){
      width = mainEl.clientWidth; height = mainEl.clientHeight;
      camera.aspect = width / height;
      camera.fov = adaptiveFov(62, width, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", resize);

    let raf, t0 = performance.now();
    function animate(){
      raf = requestAnimationFrame(animate);
      if (!reduceMotion){
        const t = (performance.now() - t0) / 1000;
        for (let i = 0; i < posAttr.count; i++){
          const ix = i * 3;
          const x = basePos[ix], y = basePos[ix + 1];
          posAttr.array[ix + 2] = Math.sin(x * 0.35 + t * 0.6) * waveState.amp + Math.cos(y * 0.3 + t * 0.4) * waveState.amp * 0.6;
        }
        posAttr.needsUpdate = true;
        if (!capable) laptop.group.rotation.y += 0.0013; // giro contínuo só quando NÃO há pin/scroll controlando
      }
      renderer.render(scene, camera);
    }
    animate();
    let aboutVisible = true;
    if ("IntersectionObserver" in window){
      new IntersectionObserver((entries) => {
        aboutVisible = entries[0].isIntersecting;
        if (!aboutVisible) cancelAnimationFrame(raf);
        else if (!document.hidden) animate();
      }, { threshold: 0 }).observe(document.getElementById("about"));
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf); else if (aboutVisible) animate();
    });

    // ---------- dispositivos limitados: ambiente calmo, sem pin/notebook ----------
    if (!capable) return;

    mainEl.classList.add("compact");

    const fxWords = Array.from(document.querySelectorAll("#aboutFxWords .fx-word"));
    const BG_1 = "#141a33";
    const BG_2 = "#1c1240";
    const BG_3 = "#0d2438";
    const BG_END = "#0a0e1a";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: mainEl, start: "top top", end: "+=430%",
        pin: true, scrub: 0.7, anticipatePin: 1,
      },
    });

    // 1) conteúdo (foto + texto + stack + "quem sou eu") some junto com as partículas
    tl.fromTo([photoWrap, copy, stack, giantBg],
      { opacity: 1, y: 0, scale: 1 },
      { opacity: 0, y: -26, scale: 0.96, duration: 2, ease: "power1.in", stagger: 0.1 },
    1.0);
    tl.to(waveMat, { opacity: 0, duration: 1.6 }, 1.2);
    tl.to(waveState, { amp: 0, duration: 1.6 }, 1.2);

    // 2) o ambiente muda de cor
    tl.to(mainEl, { backgroundColor: BG_1, duration: 3.2, ease: "none" }, 1.8);

    // 3) o notebook nasce, cresce e ocupa o centro da tela
    tl.to(laptop.group.position, { x: 0, y: -3, duration: 2.6, ease: "power2.out" }, 2.6);
    tl.to(laptop.group.scale, { x: 2.8, y: 2.8, z: 2.8, duration: 2.6, ease: "back.out(1.3)" }, 2.6);
    tl.to(laptop.lineMat, { opacity: 0.85, duration: 1 }, 2.9);
    tl.to(laptop.hingeLineMat, { opacity: 0.5, duration: 1 }, 3.3);
    tl.to(laptop.screenPivot.rotation, { x: -0.12, duration: 1.9, ease: "power2.inOut" }, 3.7);
    tl.to(laptop.glowMat, { opacity: 1, duration: 0.8 }, 5.2);
    tl.call(() => {
      screen.typeLines([
        { text: "> status: pronto", color: "#7dd8ff" },
        { text: "  stack carregada", color: "#e2ecff" },
      ], { charDelay: 32 });
    }, [], 5.3);

    // 4) giro contínuo controlado pelo scroll + palavras flutuantes + cor continua mudando
    tl.to(laptop.group.rotation, { y: "+=15.7", duration: 9, ease: "none" }, 6.4);
    tl.to(mainEl, { backgroundColor: BG_2, duration: 3, ease: "none" }, 6.8);
    tl.to(mainEl, { backgroundColor: BG_3, duration: 3, ease: "none" }, 9.8);
    tl.to(mainEl, { backgroundColor: BG_END, duration: 2.6, ease: "none" }, 12.8);

    fxWords.forEach((w, i) => {
      const start = 6.6 + i * 1.55;
      gsap.set(w, { scale: 0.9 });
      tl.to(w, { opacity: 0.85, scale: 1, duration: 0.7, ease: "power1.out" }, start);
      tl.to(w, { opacity: 0, scale: 0.94, duration: 0.7, ease: "power1.in" }, start + 1.0);
    });

    // 5) legenda final
    if (caption) tl.to(caption, { opacity: 1, duration: 1 }, 14.6);

    // 6) o notebook "vira" e vai deitando — o mesmo gesto de scroll que abriu
    // a tela agora o leva a virar o primeiro frame do vídeo da Trajetória
    const unfold = document.getElementById("aboutVideoUnfold");
    tl.to(laptop.group.rotation, { x: 1.15, duration: 2.2, ease: "power2.inOut" }, 16.2);
    tl.to(laptop.group.position, { y: -1.4, duration: 2.2, ease: "power2.inOut" }, 16.2);
    tl.to([laptop.lineMat, laptop.hingeLineMat], { opacity: 0, duration: 1.3 }, 17);
    if (caption) tl.to(caption, { opacity: 0, duration: 0.8 }, 16.2);
    if (unfold){
      tl.set(unfold, { opacity: 0, width: 60, height: 34, borderRadius: 4 }, 16.2);
      tl.to(unfold, { opacity: 1, duration: 0.6, ease: "power1.out" }, 16.6);
      tl.to(unfold, {
        width: () => window.innerWidth * 1.02,
        height: () => window.innerHeight * 1.02,
        borderRadius: 0,
        duration: 2.6,
        ease: "power2.inOut",
      }, 16.9);
    }
  }

  /* ---------------------------------------------------------
     8) REVEAL ON SCROLL (IntersectionObserver)
     --------------------------------------------------------- */
  function initReveal(){
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || reduceMotion){
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const groups = new Map();
    els.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = groups.get(el.parentElement) || [el];
        const idx = siblings.indexOf(el);
        el.style.transitionDelay = `${Math.min(idx, 6) * 70}ms`;
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    els.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------
     9) HERO 3D SCENE (Three.js) — grafo de nós flutuante
     --------------------------------------------------------- */
  let heroRefs = null;

  function initHeroScene(){
    const canvas = document.getElementById("heroCanvas");
    if (!canvas || typeof THREE === "undefined") return;
    if (isTouch && isNarrow){
      // em telas de toque pequenas, poupa GPU/bateria
      canvas.style.display = "none";
      return;
    }

    const heroEl = document.getElementById("hero");
    let width = heroEl.clientWidth, height = heroEl.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 16);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    const INK = 0x9fc7ff;    // linha de planta (blueprint ink)
    const INK_DIM = 0x3d6bff;
    const NODE_C = 0x7dd8ff;
    const LINE_C = 0x3d6bff;

    /* ---------- GRUPO 1 — CASA MODERNA (composição multi-volume, wireframe) ---------- */
    const blueprintGroup = new THREE.Group();
    blueprintGroup.rotation.set(-0.3, 0.56, 0);

    function addEdges(geo, mat, x, y, z){
      const edges = new THREE.EdgesGeometry(geo);
      const seg = new THREE.LineSegments(edges, mat);
      seg.position.set(x, y, z);
      blueprintGroup.add(seg);
      return seg;
    }
    function addWire(geo, mat, x, y, z){
      const wire = new THREE.WireframeGeometry(geo);
      const seg = new THREE.LineSegments(wire, mat);
      seg.position.set(x, y, z);
      blueprintGroup.add(seg);
      return seg;
    }
    const inkMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.55, depthWrite: false });
    const inkMatDim = new THREE.LineBasicMaterial({ color: INK_DIM, transparent: true, opacity: 0.4, depthWrite: false });
    const inkMatFaint = new THREE.LineBasicMaterial({ color: INK_DIM, transparent: true, opacity: 0.2, depthWrite: false });
    registerThemeColor(inkMat, "ink");
    registerThemeColor(inkMatDim, "accent");
    registerThemeColor(inkMatFaint, "accent");

    // pódio — terraço largo e baixo, a base de tudo
    addEdges(new THREE.BoxGeometry(9, 0.4, 6.5), inkMatDim, 0, -2, 0);
    // volume térreo — corpo principal da casa, apoiado no pódio
    addEdges(new THREE.BoxGeometry(5.5, 2.6, 4.5), inkMat, -1, -0.5, 0);
    // volume em balanço — "segundo andar" flutuando acima, deslocado pra fora do térreo
    addEdges(new THREE.BoxGeometry(7, 2, 3.2), inkMat, 2, 2.4, -0.3);
    // telhado de uma água — inclinado, pousa sobre o volume em balanço,
    // é o que faz a composição se ler como "casa" e não só volumes soltos
    addEdges(new THREE.BoxGeometry(7.8, 0.12, 3.9), inkMat, 2, 3.56, -0.3).rotation.x = -0.15;
    // parede de vidro — grade subdividida na fachada frontal do volume térreo
    addWire(new THREE.PlaneGeometry(5.5, 2.6, 6, 3), inkMatFaint, -1, -0.5, 2.26);
    // pilares finos sustentando o balanço, nas bordas do vão livre
    [[1.5, 1.35], [5.3, 1.35], [1.5, -1.35], [5.3, -1.35]].forEach(([x, z]) => {
      addEdges(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), inkMatDim, x, -0.2, z);
    });

    // grade de solo (planta)
    const grid = new THREE.GridHelper(20, 20, INK_DIM, INK_DIM);
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    grid.material.depthWrite = false;
    grid.position.y = -2.25;
    blueprintGroup.add(grid);

    // pontos de brilho pulsante nos vértices-chave da massa (efeito "node ativo")
    const glowSpots = [
      [1.75, 0.8, 2.25], [-3.75, 0.8, -2.25], [2, 3.4, -1.9], [5.5, 2.4, -1.9], [3, -2, 3.25],
    ];
    const glowMat = new THREE.PointsMaterial({
      color: NODE_C, size: 0.28, transparent: true, opacity: 0.85,
      sizeAttenuation: true, depthWrite: false,
    });
    registerThemeColor(glowMat, "accent2");
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(glowSpots.flat()), 3));
    const glowPoints = new THREE.Points(glowGeo, glowMat);
    blueprintGroup.add(glowPoints);

    scene.add(blueprintGroup);

    /* ---------- GRUPO 1B — AMBIENTE: preso rigidamente à casa (mesmo
       objeto 3D, sem grupo/rotação independente) — terreno + ornamentos ---------- */
    const envGroup = new THREE.Group();

    const ENV_SEG = isNarrow ? 14 : 22;
    const terrainGeo = new THREE.PlaneGeometry(46, 30, ENV_SEG, ENV_SEG);
    const terrainMat = new THREE.PointsMaterial({ color: INK_DIM, size: 0.045, transparent: true, opacity: 0.4, depthWrite: false });
    registerThemeColor(terrainMat, "accent");
    const terrainMesh = new THREE.Points(terrainGeo, terrainMat);
    terrainMesh.rotation.x = -Math.PI / 2.25;
    terrainMesh.position.set(2, -4.6, -10);
    envGroup.add(terrainMesh);
    const terrainPos = terrainGeo.attributes.position;
    const terrainBase = Float32Array.from(terrainPos.array);

    // ornamentos wireframe flutuantes — anéis abstratos, ecoam a arquitetura
    // e ajudam a compor a cena (tudo preso ao mesmo objeto principal)
    const ringMat = new THREE.LineBasicMaterial({ color: NODE_C, transparent: true, opacity: 0.3, depthWrite: false });
    registerThemeColor(ringMat, "accent2");
    const rings = [
      { r: 0.32, x: 8.5, y: 4.2, z: -6, speed: 0.4 },
      { r: 0.22, x: -7, y: 1.6, z: -7, speed: 0.55 },
      { r: 0.4, x: 7, y: -1.8, z: -8, speed: 0.3 },
      { r: 0.18, x: -4.5, y: 5.2, z: -4, speed: 0.48 },
      { r: 0.26, x: 9.5, y: -0.6, z: -3, speed: 0.36 },
    ].map(({ r, x, y, z, speed }) => {
      const geo = new THREE.TorusGeometry(r, r * 0.12, 8, 20);
      const mesh = new THREE.LineSegments(new THREE.WireframeGeometry(geo), ringMat);
      mesh.position.set(x, y, z);
      mesh.userData.speed = speed;
      mesh.userData.baseY = y;
      envGroup.add(mesh);
      return mesh;
    });

    // pequenos cristais/diamantes flutuantes — compõem o cenário no lugar
    // das árvores, sem precisar de um "chão" próprio (ficam presos ao ar,
    // orbitando a massa principal, então nunca parecem "flutuar errado")
    const crystalMat = new THREE.LineBasicMaterial({ color: INK_DIM, transparent: true, opacity: 0.3, depthWrite: false });
    registerThemeColor(crystalMat, "accent");
    const crystals = [
      { x: -8, y: 2.6, z: -2, s: 0.55, speed: 0.32 },
      { x: 9.5, y: 3.4, z: -1, s: 0.4, speed: 0.44 },
      { x: -7, y: -0.4, z: 3.5, s: 0.32, speed: 0.5 },
      { x: 8.8, y: -1.2, z: 4, s: 0.45, speed: 0.38 },
    ].map(({ x, y, z, s, speed }) => {
      const geo = new THREE.OctahedronGeometry(s, 0);
      const mesh = new THREE.LineSegments(new THREE.EdgesGeometry(geo), crystalMat);
      mesh.position.set(x, y, z);
      mesh.userData.speed = speed;
      mesh.userData.baseY = y;
      envGroup.add(mesh);
      return mesh;
    });

    // envGroup é filho direto da casa — herda a MESMA transformação dela
    // sempre, sem precisar de nenhuma rotação/parallax própria (é fisicamente
    // impossível "flutuar" separado, porque é o mesmo objeto 3D)
    blueprintGroup.add(envGroup);

    // poeira estelar no céu — também presa à casa, pelo mesmo motivo
    const DUST_COUNT = isNarrow ? 220 : 420;
    const dustPos = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++){
      const ix = i * 3;
      dustPos[ix] = (Math.random() - 0.5) * 70;      // x — larga faixa horizontal
      dustPos[ix + 1] = Math.random() * 28 + 2;        // y — só na parte de cima (céu)
      dustPos[ix + 2] = -8 - Math.random() * 40;       // z — bem ao fundo
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.05, transparent: true, opacity: 0.55,
      sizeAttenuation: true, depthWrite: false,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    blueprintGroup.add(dustPoints);

    /* ---------- GRUPO 2 — CÓDIGO-FONTE (grafo de nós) ---------- */
    const circuitGroup = new THREE.Group();
    const NODE_COUNT = isNarrow ? 34 : 60;
    const RADIUS = 9;
    const nodePositions = [];
    for (let i = 0; i < NODE_COUNT; i++){
      nodePositions.push(new THREE.Vector3(
        (Math.random() - 0.5) * RADIUS * 2.1,
        (Math.random() - 0.5) * RADIUS * 1.3,
        (Math.random() - 0.5) * RADIUS
      ));
    }
    const posArr = new Float32Array(NODE_COUNT * 3);
    nodePositions.forEach((v, idx) => posArr.set([v.x, v.y, v.z], idx * 3));
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    const pointsMat = new THREE.PointsMaterial({ color: NODE_C, size: 0.19, transparent: true, opacity: 0, sizeAttenuation: true, depthWrite: false });
    registerThemeColor(pointsMat, "accent2");
    circuitGroup.add(new THREE.Points(pointsGeo, pointsMat));

    const lineVerts = [];
    const MAX_DIST = 3.4;
    for (let i = 0; i < nodePositions.length; i++){
      for (let j = i + 1; j < nodePositions.length; j++){
        if (nodePositions[i].distanceTo(nodePositions[j]) < MAX_DIST){
          lineVerts.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
          lineVerts.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lineVerts), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: LINE_C, transparent: true, opacity: 0, depthWrite: false });
    registerThemeColor(lineMat, "accent");
    circuitGroup.add(new THREE.LineSegments(lineGeo, lineMat));
    circuitGroup.scale.setScalar(0.001); // some antes de "nascer"
    circuitGroup.position.z = -3; // mantém o grafo enquadrado quando a câmera se aproxima
    scene.add(circuitGroup);

    // parallax de mouse
    let targetRotX = 0, targetRotY = 0;
    window.addEventListener("mousemove", (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRotY = nx * 0.22;
      targetRotX = ny * 0.12;
    }, { passive: true });

    function resize(){
      width = heroEl.clientWidth; height = heroEl.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", resize);

    let raf;
    let t0 = performance.now();
    let frameParity = 0;
    function animate(){
      raf = requestAnimationFrame(animate);
      if (!reduceMotion){
        blueprintGroup.rotation.y += 0.0016 + (targetRotY * 0.02 - blueprintGroup.rotation.y * 0.003);
        blueprintGroup.rotation.x += (targetRotX * 0.5 - blueprintGroup.rotation.x) * 0.02;
        circuitGroup.rotation.y += 0.0022;
        circuitGroup.rotation.x += (targetRotX - circuitGroup.rotation.x) * 0.04;
        const t = (performance.now() - t0) / 1000;
        glowMat.opacity = 0.5 + Math.sin(t * 1.6) * 0.35;
        glowMat.size = 0.24 + Math.sin(t * 1.6) * 0.06;

        // terreno ondulando devagar — só recalcula a cada 2 frames (metade
        // do custo de CPU) pra sobrar mais margem durante o scroll, que é
        // quando o navegador já está ocupado recalculando o pin/layout
        frameParity ^= 1;
        if (frameParity === 0){
          for (let i = 0; i < terrainPos.count; i++){
            const ix = i * 3;
            const x = terrainBase[ix], y = terrainBase[ix + 1];
            terrainPos.array[ix + 2] = Math.sin(x * 0.18 + t * 0.5) * 0.7 + Math.cos(y * 0.15 + t * 0.35) * 0.5;
          }
          terrainPos.needsUpdate = true;
        }

        // anéis flutuantes — bóiam devagar e giram em ritmos levemente diferentes
        rings.forEach((ring) => {
          ring.rotation.x += ring.userData.speed * 0.006;
          ring.rotation.y += ring.userData.speed * 0.004;
          ring.position.y = ring.userData.baseY + Math.sin(t * ring.userData.speed + ring.userData.baseY) * 0.35;
        });

        // cristais flutuantes — mesma ideia, ritmo levemente diferente
        crystals.forEach((c) => {
          c.rotation.x += c.userData.speed * 0.005;
          c.rotation.y += c.userData.speed * 0.007;
          c.position.y = c.userData.baseY + Math.sin(t * c.userData.speed + c.userData.baseY) * 0.28;
        });
      }
      renderer.render(scene, camera);
    }
    animate();

    // só renderiza quando a seção realmente está visível na tela — evita
    // gastar GPU/CPU com uma cena 3D rodando escondida, que é a causa mais
    // comum de travamento quando há várias cenas na mesma página
    let heroVisible = true;
    if ("IntersectionObserver" in window){
      new IntersectionObserver((entries) => {
        heroVisible = entries[0].isIntersecting;
        if (!heroVisible) cancelAnimationFrame(raf);
        else if (!document.hidden) animate();
      }, { threshold: 0 }).observe(heroEl);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (heroVisible) animate();
    });

    heroRefs = { camera, blueprintGroup, circuitGroup, inkMat, inkMatDim, pointsMat, lineMat, glowMat };
  }

  /* ---------------------------------------------------------
     9.b) HERO — sequência pinada de rolagem (planta → código)
     --------------------------------------------------------- */
  function splitTitleIntoChars(lineIds){
    (lineIds || ["titleLine1", "titleLine2"]).forEach((id) => {
      const line = document.getElementById(id);
      if (!line) return;
      const frag = document.createDocumentFragment();
      line.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE){
          node.textContent.split("").forEach((ch) => {
            const span = document.createElement("span");
            span.className = "tchar";
            span.textContent = ch === " " ? "\u00A0" : ch;
            frag.appendChild(span);
          });
        } else {
          const wrap = document.createElement("span");
          wrap.className = "hl-wrap";
          node.textContent.split("").forEach((ch) => {
            const inner = document.createElement("span");
            inner.className = "tchar hl";
            inner.textContent = ch === " " ? "\u00A0" : ch;
            wrap.appendChild(inner);
          });
          frag.appendChild(wrap);
        }
      });
      line.innerHTML = "";
      line.appendChild(frag);
    });
  }

  function initHeroPinSequence(){
    const heroEl = document.getElementById("hero");
    if (!heroEl || typeof gsap === "undefined" || !window.ScrollTrigger) return;
    if (reduceMotion || isNarrow) return; // mantém o hero estático e legível

    splitTitleIntoChars();
    const chars = Array.from(heroEl.querySelectorAll(".tchar"));
    const heroCode = document.getElementById("heroCode");
    const codeLines = heroCode ? Array.from(heroCode.querySelectorAll(".code-line")) : [];
    if (heroCode) heroCode.classList.add("code-armed");

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroEl,
        start: "top top",
        end: "+=140%",
        scrub: 0.7,
        pin: true,
        anticipatePin: 1,
      },
    });

    // 1) copy sai de cena para abrir espaço para a transformação
    tl.to("#heroCopy .hero-badge, #heroCopy .hero-desc, #heroCopy .hero-cta, #heroCopy .hero-role", {
      opacity: 0, y: -16, duration: 1.1, ease: "power1.in", stagger: 0.03,
    }, 0);

    // 2) letras do título se dispersam em 3D
    chars.forEach((ch, i) => {
      const dx = (Math.sin(i * 12.9) * 60) - 10;
      const dy = (Math.cos(i * 7.3) * 40) - 30;
      const dz = -80 - (i % 5) * 20;
      const rot = (i % 2 === 0 ? 1 : -1) * (40 + (i % 6) * 12);
      tl.to(ch, {
        x: dx, y: dy, z: dz,
        rotationX: rot, rotationY: rot * 0.6,
        opacity: 0,
        duration: 3,
        ease: "power2.in",
      }, 0.6 + i * 0.045);
    });

    // 3) painel de código "compila" linha a linha — e o vidro fosco vira sólido
    tl.to("#heroCode", { backgroundColor: "rgba(20,26,42,.96)", duration: 1.8, ease: "power1.out" }, 0.3);
    codeLines.forEach((line, i) => {
      tl.to(line, { opacity: 1, y: 0, duration: 1.4, ease: "power1.out" }, 0.4 + i * 0.28);
    });

    // 4) cena 3D: planta baixa esmaece, grafo de código nasce; câmera avança
    if (heroRefs){
      const { camera, blueprintGroup, inkMat, inkMatDim, pointsMat, lineMat, circuitGroup, glowMat } = heroRefs;
      tl.to(camera.position, { z: 9.5, duration: 6, ease: "power1.inOut" }, 0);
      tl.to(blueprintGroup.rotation, { y: blueprintGroup.rotation.y + 1.1, duration: 6, ease: "power1.in" }, 0);
      tl.to([inkMat, inkMatDim, glowMat], { opacity: 0, duration: 2.6, ease: "power1.in" }, 2.6);
      tl.to(circuitGroup.scale, { x: 1, y: 1, z: 1, duration: 3, ease: "power2.out" }, 2.2);
      tl.to([pointsMat, lineMat], { opacity: (i) => (i === 0 ? 1 : 0.4), duration: 2.6, ease: "power1.out" }, 2.6);
    }

    // 5) anotação técnica troca de rótulo
    tl.to(".swap-a", { opacity: 0, duration: 0.6 }, 2.6);
    tl.to(".swap-b", { opacity: 1, duration: 0.6 }, 2.6);

    // 6) fecha a cena 3D com um fade limpo antes de soltar o pin
    tl.to("#heroCanvas", { opacity: 0, duration: 1, ease: "power1.in" }, 5.4);

    heroPinTl = tl;
  }
  let heroPinTl = null;

  /* ---------------------------------------------------------
     9.c) SCANLINE — transição de varredura entre seções
     --------------------------------------------------------- */
  function initScanlineTransitions(){
    const line = document.getElementById("scanline");
    if (!line || typeof gsap === "undefined" || !window.ScrollTrigger || reduceMotion) return;
    const targets = ["about", "experience", "projects", "education", "contact"];
    targets.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: "top 70%",
        onEnter: () => {
          gsap.fromTo(line, { top: 0, opacity: 0.9 }, { top: "100%", opacity: 0, duration: 0.9, ease: "power1.in" });
        },
      });
    });
  }

  /* ---------------------------------------------------------
     10) EXPERIENCE — scroll horizontal pinado (GSAP ScrollTrigger)
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     10.b) helper — interpola cor ao longo de paradas hex
     --------------------------------------------------------- */
  function lerpColorStops(stops, t){
    const n = stops.length - 1;
    const seg = Math.min(Math.floor(t * n), n - 1);
    const localT = (t * n) - seg;
    const a = stops[seg], b = stops[seg + 1];
    const r = Math.round(a[0] + (b[0] - a[0]) * localT);
    const g = Math.round(a[1] + (b[1] - a[1]) * localT);
    const bl = Math.round(a[2] + (b[2] - a[2]) * localT);
    return `rgb(${r}, ${g}, ${bl})`;
  }
  const EXP_COLOR_STOPS = [
    [7, 11, 21],     // navy base (var(--bg-soft))
    [16, 20, 46],    // indigo
    [32, 18, 58],    // violeta profundo
    [12, 30, 58],    // azul elétrico escurecido
    [8, 34, 46],     // ciano escurecido
    [7, 11, 21],      // volta ao navy base
  ];

  /* ---------------------------------------------------------
     9.d) PROJECTS — tilt 3D + glare seguindo o cursor
     --------------------------------------------------------- */
  function initProjectTilt(){
    const cards = document.querySelectorAll(".proj-card");
    if (!cards.length || isTouch || reduceMotion) return;

    cards.forEach((card) => {
      const glare = document.createElement("div");
      glare.className = "proj-glare";
      card.appendChild(glare);

      let raf = null;
      let primed = false;
      card.addEventListener("mousemove", (e) => {
        if (!primed){ card.style.transition = "transform .12s linear"; primed = true; }
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;   // 0..1
          const py = (e.clientY - r.top) / r.height;   // 0..1
          const rotY = (px - 0.5) * 26;
          const rotX = (0.5 - py) * 20;
          card.style.transform = `perspective(750px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.04)`;
          glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(125,216,255,.28), transparent 55%)`;
          raf = null;
        });
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(750px) rotateX(0deg) rotateY(0deg) scale(1)";
      });
    });
  }

  /* ---------------------------------------------------------
     9.e) EXPERIENCE — hover tech (cantos, scanline, tilt no mouse)
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     9.f) CONTATO — assinatura gigante reativa ao mouse (spotlight)
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     7.g) SOBRE — foto reage ao mouse revelando versão "robótica"
     --------------------------------------------------------- */
  function initAboutPhotoReveal(){
    const stage = document.getElementById("aboutPhotoStage");
    const robo = document.getElementById("aboutPhotoRobo");
    if (!stage || !robo || isTouch) return;
    stage.addEventListener("mousemove", (e) => {
      const r = robo.getBoundingClientRect(); // mask-image usa a caixa do próprio elemento
      stage.style.setProperty("--rx", `${e.clientX - r.left}px`);
      stage.style.setProperty("--ry", `${e.clientY - r.top}px`);
    });
    stage.addEventListener("mouseleave", () => {
      stage.style.setProperty("--rx", "-9999px");
      stage.style.setProperty("--ry", "-9999px");
    });
  }

  /* ---------------------------------------------------------
     9.g) PÁGINA DE CONTATO — formulário (enviar.php) + char count
     --------------------------------------------------------- */
  function initContactForm(){
    const form = document.getElementById("contactForm");
    if (!form) return;
    const card = document.getElementById("terminalCard");
    const msg = document.getElementById("msgArea");
    const charCount = document.getElementById("charCount");
    const errorEl = document.getElementById("formError");
    const successEl = document.getElementById("formSuccess");
    const btn = document.getElementById("btnSend");
    const btnLabel = btn ? btn.querySelector(".btn-send-label") : null;

    if (msg && charCount){
      msg.addEventListener("input", () => { charCount.textContent = String(msg.value.length); });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorEl) errorEl.classList.remove("is-visible");
      if (btn){ btn.disabled = true; }
      if (btnLabel) btnLabel.textContent = "enviando...";

      try {
        const data = new FormData(form);
        const res = await fetch("enviar.php", { method: "POST", body: data });
        if (!res.ok) throw new Error("bad status");
        form.style.display = "none";
        if (successEl) successEl.classList.add("is-visible");
      } catch (err) {
        if (errorEl) errorEl.classList.add("is-visible");
        if (btn){ btn.disabled = false; }
        if (btnLabel) btnLabel.textContent = "enviar mensagem";
      }
    });
  }

  /* ---------------------------------------------------------
     9.h) PÁGINA DE CONTATO — a tela muda de cor conforme o scroll
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     9.i) PÁGINA DE CONTATO — hero e formulário como um só
     momento fixado: o título some, o formulário se cria
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     9.i.1) PÁGINA DE CONTATO — mesmo fundo de pontinhos flutuantes
     usado no "Quem sou eu", atrás do texto do hero
     --------------------------------------------------------- */
  function initContactParticles(){
    const canvas = document.getElementById("contactCanvas");
    const container = document.getElementById("contactHeroContent");
    if (!canvas || !container || typeof THREE === "undefined") return null;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(adaptiveFov(62, width, height), width / height, 0.1, 120);
    camera.position.set(0, 2.4, 11.5);
    camera.lookAt(0, -0.35, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    const SEG = isNarrow ? 26 : 46;
    const waveGeo = new THREE.PlaneGeometry(52, 34, SEG, SEG);
    const waveMat = new THREE.PointsMaterial({ color: 0x3d6bff, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false });
    registerThemeColor(waveMat, "accent");
    const waveMesh = new THREE.Points(waveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI / 2.3;
    waveMesh.position.y = -2.6;
    scene.add(waveMesh);
    const posAttr = waveGeo.attributes.position;
    const basePos = Float32Array.from(posAttr.array);
    const amp = isTouch ? 0.3 : 0.5;

    function resize(){
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.fov = adaptiveFov(62, width, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", resize);

    let raf, t0 = performance.now();
    function animate(){
      raf = requestAnimationFrame(animate);
      if (!reduceMotion){
        const t = (performance.now() - t0) / 1000;
        for (let i = 0; i < posAttr.count; i++){
          const ix = i * 3;
          const x = basePos[ix], y = basePos[ix + 1];
          posAttr.array[ix + 2] = Math.sin(x * 0.35 + t * 0.6) * amp + Math.cos(y * 0.3 + t * 0.4) * amp * 0.6;
        }
        posAttr.needsUpdate = true;
      }
      renderer.render(scene, camera);
    }
    animate();
    let contactVisible = true;
    if ("IntersectionObserver" in window){
      new IntersectionObserver((entries) => {
        contactVisible = entries[0].isIntersecting;
        if (!contactVisible) cancelAnimationFrame(raf);
        else if (!document.hidden) animate();
      }, { threshold: 0 }).observe(container);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf); else if (contactVisible) animate();
    });

    return waveMat; // exposto pra ser desvanecido junto do texto no scroll
  }

  function initContactReveal(){
    const wrap = document.getElementById("contactPinWrap");
    const heroContent = document.getElementById("contactHeroContent");
    const formStage = document.getElementById("contactFormStage");
    const gridStand = document.getElementById("contactGridStand");
    if (!wrap || !heroContent || !formStage) return;

    const waveMat = initContactParticles(); // pontinhos flutuantes atrás do texto, sempre visíveis de início

    const capable = !isNarrow && !reduceMotion && typeof gsap !== "undefined" && !!window.ScrollTrigger;
    if (!capable) return; // mobile/reduced-motion: fluxo normal, sem pin

    wrap.classList.add("compact");
    splitTitleIntoChars(["contactTitleLine1", "contactTitleLine2"]);
    const chars = Array.from(heroContent.querySelectorAll(".tchar"));

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap, start: "top top", end: "+=140%",
        pin: true, scrub: 0.6, anticipatePin: 1,
      },
    });

    // 1) kicker, descrição, badge e dica somem em grupo, abrindo espaço
    tl.fromTo([".contact-hero-main .section-kicker", ".contact-hero-desc", ".contact-hero-main .eyebrow-badge", ".contact-hero-hint"].join(","),
      { opacity: 1, y: 0 },
      { opacity: 0, y: -16, duration: 1.0, ease: "power1.in", stagger: 0.03 },
    0.15);

    // 2) letras do título se dispersam em 3D — mesmo efeito do Hero
    chars.forEach((ch, i) => {
      const dx = (Math.sin(i * 12.9) * 60) - 10;
      const dy = (Math.cos(i * 7.3) * 40) - 30;
      const dz = -80 - (i % 5) * 20;
      const rot = (i % 2 === 0 ? 1 : -1) * (40 + (i % 6) * 12);
      tl.to(ch, {
        x: dx, y: dy, z: dz,
        rotationX: rot, rotationY: rot * 0.6,
        opacity: 0,
        duration: 1.6,
        ease: "power2.in",
      }, 0.15 + i * 0.022);
    });

    tl.set(heroContent, { pointerEvents: "none" }, 1.5); // some visualmente, mas também para de bloquear cliques no formulário
    if (waveMat) tl.to(waveMat, { opacity: 0, duration: 1.0, ease: "power1.in" }, 0.3); // pontinhos somem junto com o texto

    // cor do ambiente — bem chamativa na transição, termina em preto puro
    // exatamente quando o formulário acaba de se levantar
    tl.to(wrap, { backgroundColor: "#4a1268", duration: 1.0, ease: "none" }, 0.2);
    tl.to(wrap, { backgroundColor: "#0d3f8f", duration: 1.0, ease: "none" }, 1.2);
    tl.to(wrap, { backgroundColor: "#000000", duration: 0.8, ease: "none" }, 1.9);

    tl.fromTo(formStage, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.75);
    if (gridStand){
      // o formulário está "deitado" e se levanta, dobradiça na base, como se ganhasse vida
      tl.fromTo(gridStand,
        { rotationX: 72, transformPerspective: 1600, y: 70 },
        { rotationX: 0, y: 0, duration: 1.7, ease: "power3.out" },
      0.8);
    }
  }

  function initSignatureSpotlight(){
    const wrap = document.getElementById("signatureWrap");
    const fill = document.getElementById("signatureFill");
    if (!wrap || !fill || isTouch) return;
    wrap.addEventListener("mousemove", (e) => {
      const r = fill.getBoundingClientRect(); // mask-image usa a caixa do próprio elemento
      wrap.style.setProperty("--sx", `${e.clientX - r.left}px`);
      wrap.style.setProperty("--sy", `${e.clientY - r.top}px`);
    });
    wrap.addEventListener("mouseleave", () => {
      wrap.style.setProperty("--sx", "-9999px");
      wrap.style.setProperty("--sy", "-9999px");
    });
  }

  function initExpCardFx(){
    const cards = document.querySelectorAll("#expTrack .exp-card");
    if (!cards.length) return;
    cards.forEach((card, i) => {
      const frag = document.createElement("div");
      frag.innerHTML =
        '<span class="exp-corner tl"></span><span class="exp-corner tr"></span>' +
        '<span class="exp-corner bl"></span><span class="exp-corner br"></span>' +
        '<span class="exp-scanline"></span>' +
        `<span class="exp-id-tag mono">NODE_${String(i + 1).padStart(2, "0")}</span>`;
      while (frag.firstChild) card.appendChild(frag.firstChild);

      if (isTouch || reduceMotion) return;
      let raf = null, primed = false;
      card.addEventListener("mousemove", (e) => {
        if (!primed){ card.style.transition = "transform .12s linear, border-color .35s, box-shadow .35s"; primed = true; }
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          const rotY = (px - 0.5) * 6;
          const rotX = (0.5 - py) * 5;
          card.style.transform = `perspective(1100px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
          raf = null;
        });
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
      });
    });
  }

  function initExperiencePin(){
    const wrap = document.getElementById("expPinWrap");
    const track = document.getElementById("expTrack");
    const fill = document.getElementById("expProgressFill");
    const staticWrap = document.getElementById("expStatic");
    const canvas = document.getElementById("expBgCanvas");
    const cards = track ? Array.from(track.querySelectorAll(".exp-card")) : [];

    // clona os cards para o fallback estático (mobile / reduced motion)
    if (staticWrap && track){
      track.querySelectorAll(".exp-card").forEach((card) => {
        staticWrap.appendChild(card.cloneNode(true));
      });
    }

    if (!wrap || !track || typeof gsap === "undefined" || !window.ScrollTrigger) return;
    if (reduceMotion || isNarrow) return; // usa o fallback estático via CSS

    // ----- fundo em sequência de frames (não é <video>!) — o scroll desenha
    // a imagem certa num <canvas>. Isso evita de vez os engasgos/travamentos
    // de "seek" de vídeo HTML5, que dependem de keyframes e do navegador. -----
    const FRAME_COUNT = 192;
    const SKIP_FRAMES = 19; // pula os primeiros frames (fade-in bem escuro do vídeo novo) —
    // combina com o frame usado na prévia do overlay de "desdobrar" (frame_015)
    const FRAME_BASE = "./assets/video/frames/frame_";
    const frames = [];
    for (let i = 1; i <= FRAME_COUNT; i++){
      const img = new Image();
      img.decoding = "async";
      img.src = `${FRAME_BASE}${String(i).padStart(3, "0")}.jpg`;
      frames.push(img);
    }

    const ctx = canvas ? canvas.getContext("2d") : null;
    let currentFrameIdx = 0;
    let lastDrawnIdx = 0;
    function frameReady(i){ const im = frames[i]; return im && im.complete && im.naturalWidth; }
    function drawCover(img, alpha){
      if (!img || !img.naturalWidth) return;
      const cw = canvas.width, ch = canvas.height;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih); // comportamento "cover"
      const dw = iw * scale, dh = ih * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      ctx.globalAlpha = 1;
    }
    // desenha com CROSS-FADE entre os dois frames mais próximos do índice
    // fracionário — isso é o que dá a suavidade "nível Awwwards" mesmo com
    // um número modesto de frames: em vez de saltar de imagem em imagem
    // (efeito "pipocado"), a transição sempre passa por uma mistura suave
    // das duas imagens vizinhas, proporcional à posição exata do scroll
    function drawFrame(idx){
      if (!ctx || !canvas.width || !canvas.height) return;
      const clamped = Math.max(0, Math.min(FRAME_COUNT - 1, idx));
      let a = Math.floor(clamped);
      let b = Math.min(FRAME_COUNT - 1, a + 1);
      const frac = clamped - a;

      // fallback: se o frame exato ainda não carregou (conexões concorrentes
      // limitadas pelo navegador), anda em direção ao último frame desenhado
      // com sucesso, em vez de "congelar" a tela
      if (!frameReady(a)){
        const dir = a > lastDrawnIdx ? 1 : -1;
        let probe = a;
        while (probe !== lastDrawnIdx && !frameReady(probe)) probe -= dir;
        a = frameReady(probe) ? probe : lastDrawnIdx;
        b = a;
      } else if (!frameReady(b)){
        b = a;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCover(frames[a], 1);
      if (b !== a && frac > 0.01) drawCover(frames[b], frac);
      lastDrawnIdx = a;
    }
    function resizeCanvas(){
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      drawFrame(currentFrameIdx);
    }
    window.addEventListener("resize", resizeCanvas);

    // ----- a "entrada" vem do desdobrar do notebook do Quem-sou-eu (ver
    // initAboutSequence) — aqui só garantimos que o canvas já esteja pronto -----
    const unfoldEl = document.getElementById("aboutVideoUnfold");
    if (canvas) gsap.set(canvas, { opacity: 1 });

    function build(){
      ScrollTrigger.getById("expPin") && ScrollTrigger.getById("expPin").kill();
      const distance = track.scrollWidth - window.innerWidth + 160;
      if (distance <= 0) return;

      // fase 1 (sequência de frames) + fase 2 (cards deslizando) — a mesma
      // rolagem é dividida entre as duas
      const videoLen = Math.max(window.innerHeight * 2.2, 900);
      const totalLen = videoLen + distance;
      const videoFrac = videoLen / totalLen;

      gsap.set(track, { x: 0 });
      gsap.set(cards, { opacity: 0, y: 70 });
      resizeCanvas();
      drawFrame(SKIP_FRAMES);

      const tl = gsap.timeline({
        scrollTrigger: {
          id: "expPin",
          trigger: wrap,
          start: "top top",
          end: () => `+=${totalLen}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (fill) fill.style.width = `${self.progress * 100}%`;
            // esconde o overlay do "virar do notebook" assim que ESTE pin
            // faz qualquer progresso — usando "visibility" (não "opacity")
            // pra nunca conflitar com a timeline do Quem-sou-eu, que já
            // anima a opacidade/tamanho desse MESMO elemento. Assim, dá pra
            // rolar de volta pra cima e ver a animação reversa funcionando
            // normalmente (a tentativa anterior "matava" o tween do GSAP
            // pra sempre, o que travava o overlay pequeno ao voltar)
            if (unfoldEl) unfoldEl.style.visibility = self.progress > 0.001 ? "hidden" : "visible";
          },
        },
      });

      tl.to(wrap, {
        onUpdate: function(){ wrap.style.backgroundColor = lerpColorStops(EXP_COLOR_STOPS, this.progress()); },
        duration: videoFrac,
      }, 0);

      // fase 1 — a rolagem escolhe qual frame desenhar (0 a 84), instantâneo,
      // sem decodificação de vídeo nem espera de "seek"
      if (canvas){
        tl.to({}, {
          duration: videoFrac,
          ease: "none",
          onUpdate: function(){
            currentFrameIdx = SKIP_FRAMES + this.progress() * (FRAME_COUNT - 1 - SKIP_FRAMES);
            drawFrame(currentFrameIdx);
          },
        }, 0);
      }

      // transição — a cena esmaece um pouco e os cards de experiência entram
      tl.to(canvas || {}, { opacity: 0.35, duration: 0.08, ease: "power1.in" }, videoFrac - 0.04);
      tl.to(cards, { opacity: 1, y: 0, stagger: 0.05, duration: 0.14, ease: "power2.out" }, videoFrac - 0.02);

      // fase 2 — trilha desliza horizontalmente, como antes
      tl.to(track, { x: -distance, ease: "none", duration: 1 - videoFrac }, videoFrac);

      return tl;
    }
    build();
    window.addEventListener("resize", () => { ScrollTrigger.refresh(); });
  }

  /* ---------------------------------------------------------
     BOOT
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initCursor();
    initPageTransitions();
    initAudioUnlock();
    initUiSounds();
    initSettingsPanel();
    initMusicToggleFab();
    initGlitchText();
    initContactBgVideo();
    initTitleGlitch();
    initSmoothScroll();
    initNav();
    initMobileMenu();
    initTyping();
    initMarquee();
    initReveal();

    // pins/scrollTriggers registrados em ordem top-to-bottom do documento
    // (evita cálculo de posição incorreto entre pins aninhados no GSAP)
    initHeroScene();
    initHeroPinSequence();
    initStatCounters();
    initAboutSequence();
    initAboutPhotoReveal();
    initScanlineTransitions();
    initExpCardFx();
    initSignatureSpotlight();
    initContactForm();
    initContactReveal();
    initExperiencePin();
    initProjectTilt();
    initEducationSplit();

    runLoader(() => {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

})();
