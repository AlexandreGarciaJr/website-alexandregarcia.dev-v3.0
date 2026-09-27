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
  const T = (s, v) => (window.I18N ? window.I18N.t(s, v) : s); // i18n (js/i18n.js)
  // Safari (macOS/iOS) — usado só para contornar bugs de renderização do WebKit
  const isSafari = /^((?!chrome|chromium|crios|fxios|android|edg).)*safari/i.test(navigator.userAgent);
  if (isSafari) document.documentElement.classList.add("is-safari");

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
  const root = document.documentElement;
  function reveal(){
    root.classList.remove("is-leaving");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add("is-revealed");
      document.body.classList.add("page-ready");
    }));
  }
  // espera as fontes (até 600 ms) para o texto não "pular" logo depois do fade
  if (document.fonts && document.fonts.ready){
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 600))]).then(reveal);
  } else reveal();
  // restaurada do cache do navegador (voltar/avançar): não fica presa atrás do véu
  window.addEventListener("pageshow", (e) => { if (e.persisted) reveal(); });

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
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      let url;
      try { url = new URL(href, location.href); } catch (_){ return; }
      if (url.origin !== location.origin) return;                            // externo: navega normal
      if (url.pathname === location.pathname && url.hash) return;           // âncora na mesma página: só rola
      e.preventDefault();
      AudioEngine.saveResumeState(); // guarda a posição da música pra continuar na próxima página
      root.classList.add("is-leaving");
      root.classList.remove("is-revealed");
      setTimeout(() => { window.location.href = href; }, reduceMotion ? 60 : 460);
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
    ].map((s) => T(s));

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
        { text: T("> seja bem-vindo(a)"), color: "#7dd8ff" },
        { text: "  alexandregarcia.dev", color: "#e2ecff" },
        { text: "", color: "#e2ecff" },
        { text: T("> carregando experiência..."), color: "#576079" },
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
    ScrollTrigger.config({ ignoreMobileResize: true });
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
  function initGlitchText(){
    // elementos onde o texto já está isolado — aplica o glitch direto
    document.querySelectorAll(".btn-primary, .btn-outline, .btn-send-label, .fullmenu-link-text, .hamburger-label, .track-name, .audio-toggle, .measure-flyout button, .footer-nav-links a, .contact-info-value, .hero-index a").forEach((el) => {
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
    const phrases = [T("Full Stack Developer"), "React · Java · Spring Boot"];
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
      const counterBox = counterEl ? counterEl.closest(".edu-split-counter") : null;
      function recompute(){
        let sum = 0;
        hourRows.forEach((r) => { if (r.classList.contains("is-counted")) sum += Number(r.dataset.hours); });
        gsap.to(counterObj, {
          v: sum, duration: 0.5, ease: "power1.out", overwrite: true,
          onUpdate: () => {
            if (counterEl) counterEl.textContent = String(Math.round(counterObj.v));
            if (counterBox) counterBox.style.setProperty("--p", (counterObj.v / TOTAL_HOURS).toFixed(3));
          },
        });
      }
      // celular: o contador é uma pílula fixa no topo — cada curso conta assim
      // que entra na parte de baixo da tela (antes: só no centro, tarde demais)
      allRows.forEach((row) => {
        ScrollTrigger.create({
          trigger: row, start: isNarrow ? "top 78%" : "center center",
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
    document.documentElement.classList.add("about-pinned");
    resize(); // o canvas foi medido antes do modo "compact" (100dvh)

    // primeiro frame do vídeo da Trajetória, aplicado na tela do notebook:
    // o "mergulho" termina exatamente na imagem com que a próxima seção começa
    const vidTex = new THREE.TextureLoader().load("./assets/video/frames/frame_020.jpg");
    const vidMat = new THREE.MeshBasicMaterial({ map: vidTex, transparent: true, opacity: 0, depthWrite: false });
    const vidPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 1.75), vidMat);
    vidPlane.position.set(0, 1.05, 0.047);
    laptop.screenPivot.add(vidPlane);

    const fxWords = Array.from(document.querySelectorAll("#aboutFxWords .fx-word"));
    const BG_1 = "#141a33";
    const BG_2 = "#1c1240";
    const BG_3 = "#0d2438";
    const BG_END = "#0a0e1a";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: mainEl, start: "top top", end: "+=460%",
        pin: true, scrub: 0.7, anticipatePin: 1,
      },
    });

    // 1) conteúdo (foto + texto + stack + "quem sou eu") some junto com as partículas
    tl.fromTo([photoWrap, copy, stack, giantBg],
      { opacity: 1, y: 0, scale: 1 },
      { opacity: 0, y: -26, scale: 0.96, duration: 2, ease: "power1.in", stagger: 0.1 },
    1.0);
    tl.set([photoWrap, copy, stack, giantBg], { visibility: "hidden" }, 3.3); // some de vez (evita "fantasmas" de composição)
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
        { text: T("> status: pronto"), color: "#7dd8ff" },
        { text: T("  stack carregada"), color: "#e2ecff" },
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

    // 6) MERGULHO NA TELA — o notebook para de frente, a tela fica reta e a
    // câmera entra nela até a imagem (1º frame do vídeo) cobrir a viewport.
    // A Trajetória começa exatamente nesse quadro (ver initExperiencePin).
    const CAM0 = new THREE.Vector3(0, 2.4, 11.5), LOOK0 = new THREE.Vector3(0, -0.35, 0);
    const dive = { k: 0 };
    const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
    function applyDive(){
      const S = laptop.group.scale.x;
      // centro da tela na pose final (rotação 6π, tela a 90°)
      const c = new THREE.Vector3(0, laptop.group.position.y + S * 1.13, -S * 1.035);
      const W = 3.05 * S, H = 1.75 * S;
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.min(H / (2 * t), W / (2 * t * camera.aspect)) * 0.995; // "cover"
      tmpPos.set(c.x, c.y, c.z + d);
      camera.position.copy(CAM0).lerp(tmpPos, dive.k);
      tmpLook.copy(LOOK0).lerp(c, dive.k);
      camera.lookAt(tmpLook);
    }
    if (caption) tl.to(caption, { opacity: 0, duration: 0.7 }, 15.7);
    tl.to(laptop.group.rotation, { y: Math.PI * 6, x: 0, duration: 1.9, ease: "power2.inOut" }, 15.4);
    tl.to(laptop.screenPivot.rotation, { x: 0, duration: 1.6, ease: "power2.inOut" }, 15.6);
    tl.to(vidMat, { opacity: 1, duration: 1.3, ease: "power1.inOut" }, 16.4);
    tl.to(laptop.glowMat, { opacity: 0, duration: 0.6 }, 17.6);
    tl.to(dive, { k: 1, duration: 2.6, ease: "power2.inOut", onUpdate: applyDive }, 16.5);
    tl.to(canvas, { opacity: 1, duration: 2.2, ease: "power1.inOut" }, 16.6); // canvas do Sobre fica a 55%: a tela final precisa do brilho cheio
    tl.to([laptop.lineMat, laptop.hingeLineMat], { opacity: 0, duration: 0.7 }, 18.3);
    tl.to(mainEl, { backgroundColor: "#050810", duration: 2.4, ease: "none" }, 16.6);
    tl.to({}, { duration: 0.5 }, 19.1); // respiro: o quadro final "assenta" antes da troca
    window.addEventListener("resize", () => { if (dive.k > 0) applyDive(); });
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

  /* ---------------------------------------------------------
     9.a) HERO — ajuste tipográfico: ALEXANDRE ocupa a largura exata;
     GARCIA recebe o espaçamento entre letras que fecha a mesma largura
     --------------------------------------------------------- */
  function initHeroTitleFit(){
    const hero = document.getElementById("hero");
    const a = document.getElementById("titleLine1");
    const b = document.getElementById("titleLine2");
    if (!hero || !a || !b) return;
    function fit(){
      const pad = hero.clientWidth > 900 ? a.offsetLeft : (parseFloat(getComputedStyle(hero).paddingLeft) || 0);
      const avail = hero.clientWidth - pad * 2;
      if (avail <= 0) return;
      // linha A: mede em 100px e escala (compensa o tracking negativo da última letra)
      hero.style.setProperty("--fs-a", "100px");
      const wa = a.getBoundingClientRect().width;
      const fsA = Math.min(100 * avail / Math.max(1, wa - 4.5), window.innerHeight * 0.34);
      hero.style.setProperty("--fs-a", fsA.toFixed(2) + "px");
      // linha B: altura proporcional à tela; tracking preenche o resto
      const n = (b.getAttribute("data-glitch") || b.textContent).trim().length;
      let fsB = Math.min(fsA * 1.18, window.innerHeight * (hero.clientWidth > 900 ? 0.24 : 0.2));
      hero.style.setProperty("--ls-b", "0px");
      hero.style.setProperty("--fs-b", fsB.toFixed(2) + "px");
      let wb = b.getBoundingClientRect().width;
      if (wb > avail){ fsB *= avail / wb; hero.style.setProperty("--fs-b", fsB.toFixed(2) + "px"); wb = avail; }
      const ls = Math.max(0, (avail - wb) / Math.max(1, n - 1));
      hero.style.setProperty("--ls-b", ls.toFixed(2) + "px");
    }
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fit(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    let t;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(fit, 120); });
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
    if (reduceMotion) return; // mantém o hero estático e legível

    // celular: mesma sequência (maquete → planta → código), pin mais curto;
    // só ALEXANDRE se dispersa — GARCIA e o texto de apresentação continuam
    // logo abaixo quando o pin solta
    const M = isNarrow;
    splitTitleIntoChars(M ? ["titleLine1"] : undefined);
    const chars = Array.from(heroEl.querySelectorAll(".tchar"));
    // a cena 3D (js/hero3d.js, módulo) lê este objeto a cada frame:
    // p 0 → .42: maquete desce para planta baixa (corte + vista de cima)
    // p .46 → .86: a planta se desfaz em glifos que viram código-fonte
    // p .88 → 1: sobra só o código, que sobe junto com a página
    const proxy = (window.heroScroll = window.heroScroll || { p: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroEl,
        start: "top top",
        end: M ? "+=190%" : "+=260%",
        scrub: M ? 0.5 : 0.7,
        pin: true,
        anticipatePin: 1,
      },
    });

    tl.to(proxy, { p: 1, duration: 6, ease: "none" }, 0);

    // 1) copy, índice e painel saem de cena
    if (!M) tl.to("#heroCopy > *, .hero-index", {
      opacity: 0, y: -16, duration: 1.1, ease: "power1.in", stagger: 0.03,
    }, 0);
    tl.to("#heroPanel", { opacity: 0, y: 24, duration: 1.2, ease: "power1.in" }, 0.15);

    // 2) letras do título se dispersam em 3D
    chars.forEach((ch, i) => {
      const k = M ? 0.45 : 1;
      const dx = ((Math.sin(i * 12.9) * 60) - 10) * k;
      const dy = ((Math.cos(i * 7.3) * 40) - 30) * k;
      const dz = -80 - (i % 5) * 20;
      const rot = (i % 2 === 0 ? 1 : -1) * (40 + (i % 6) * 12);
      tl.to(ch, {
        x: dx, y: dy, z: dz,
        rotationX: rot, rotationY: rot * 0.6,
        opacity: 0,
        duration: 1.8,
        ease: "power2.in",
      }, 0.3 + i * 0.03);
    });

    // 3) anotação técnica: maquete → planta baixa → código-fonte
    tl.to(".swap-a", { opacity: 0, duration: 0.4 }, 1.5);
    tl.to(".swap-b", { opacity: 1, duration: 0.4 }, 1.5);
    tl.to(".swap-b", { opacity: 0, duration: 0.4 }, 3.0);
    tl.to(".swap-c", { opacity: 1, duration: 0.4 }, 3.0);

    heroPinTl = tl;
  }
  let heroPinTl = null;

  /* ---------------------------------------------------------
     9.c) SCANLINE — transição de varredura entre seções
     --------------------------------------------------------- */
  function initScanlineTransitions(){
    const line = document.getElementById("scanline");
    if (!line || typeof gsap === "undefined" || !window.ScrollTrigger || reduceMotion) return;
    const targets = ["about", "experience", "projects", "education", "contact"]
      .filter((id) => !(id === "experience" && document.documentElement.classList.contains("about-pinned")));
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
  function initContactReveal(){
    const wrap = document.getElementById("contactPinWrap");
    const heroContent = document.getElementById("contactHeroContent");
    const formStage = document.getElementById("contactFormStage");
    const gridStand = document.getElementById("contactGridStand");
    if (!wrap || !heroContent || !formStage) return;

    // campo de pontos da página (js/contato.js)
    const field = window.ContactFX && window.ContactFX.get ? window.ContactFX.get() : null;

    const capable = !isNarrow && !reduceMotion && typeof gsap !== "undefined" && !!window.ScrollTrigger;
    if (!capable){
      // celular / reduced-motion: fluxo normal; a malha vira prancheta conforme se rola até o formulário
      if (field && typeof gsap !== "undefined" && window.ScrollTrigger && !reduceMotion){
        ScrollTrigger.create({
          trigger: formStage, start: "top 90%", end: "top 30%", scrub: 0.5,
          onUpdate: (self) => field.setTilt(self.progress),
        });
      }
      return;
    }

    wrap.classList.add("compact");
    splitTitleIntoChars(["contactTitleLine1", "contactTitleLine2"]);
    const chars = Array.from(heroContent.querySelectorAll(".tchar"));
    const infoRows = Array.from(formStage.querySelectorAll(".contact-info-title, .contact-info-lead, .contact-info-row, .contact-info-note"));
    const card = document.getElementById("terminalCard");
    const groups = card ? Array.from(card.querySelectorAll(".terminal-form > .form-row > .form-group, .terminal-form > .form-group, .form-footer")) : [];
    const tilt = { v: 0 };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap, start: "top top", end: "+=170%",
        pin: true, scrub: 0.6, anticipatePin: 1,
      },
    });

    // 1) kicker, descrição, badge e dica saem
    tl.fromTo([".contact-hero-main .section-kicker", ".contact-hero-desc", ".contact-hero-main .eyebrow-badge", ".contact-hero-hint"].join(","),
      { opacity: 1, y: 0 },
      { opacity: 0, y: -16, duration: 0.9, ease: "power1.in", stagger: 0.03 },
    0.1);

    // 2) letras do título se dispersam em 3D (mesmo gesto do Hero)
    chars.forEach((ch, i) => {
      const dx = (Math.sin(i * 12.9) * 60) - 10;
      const dy = (Math.cos(i * 7.3) * 40) - 30;
      const dz = -80 - (i % 5) * 20;
      const rot = (i % 2 === 0 ? 1 : -1) * (40 + (i % 6) * 12);
      tl.to(ch, { x: dx, y: dy, z: dz, rotationX: rot, rotationY: rot * 0.6, opacity: 0, duration: 1.4, ease: "power2.in" }, 0.1 + i * 0.02);
    });
    tl.set(heroContent, { pointerEvents: "none" }, 1.4);

    // 3) a câmera sobe: do horizonte para a vista de cima — a malha
    //    ondulada vira uma prancheta de pontos alinhados
    if (field){
      tl.to(tilt, { v: 1, duration: 1.5, ease: "power2.inOut", onUpdate: () => field.setTilt(tilt.v) }, 0.35);
    }

    // 4) o formulário "é desenhado" sobre a prancheta
    tl.fromTo(formStage, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.15);
    if (gridStand){
      tl.fromTo(gridStand, { rotationX: 38, transformPerspective: 1600, y: 60, scale: 0.94 },
        { rotationX: 0, y: 0, scale: 1, duration: 1.1, ease: "power3.out" }, 1.15);
    }
    if (card){
      // o cartão abre de uma linha central (como uma tela ligando)
      tl.fromTo(card, { clipPath: "inset(49% 0% 49% 0% round 14px)" }, { clipPath: "inset(0% 0% 0% 0% round 14px)", duration: 0.7, ease: "power3.inOut" }, 1.3);
    }
    tl.fromTo(infoRows, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.06, ease: "power2.out" }, 1.35);
    tl.fromTo(groups, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: "power2.out" }, 1.55);
    tl.to({}, { duration: 0.35 }, 2.45); // respiro: formulário parado antes de soltar o pin
  }


  function initSignatureSpotlight(){
    const section = document.getElementById("contact");
    const wrap = document.getElementById("signatureWrap");
    const fill = document.getElementById("signatureFill");
    if (!wrap || !fill || !section) return;
    const base = wrap.querySelector(".signature-watermark:not(.fill)");

    // ---- tamanho: a assinatura ocupa a largura disponível sem cortar
    // (no celular vira duas linhas, via CSS) e a seção reserva o espaço dela ----
    function fit(){
      const avail = section.clientWidth * (isNarrow ? 0.9 : 0.94);
      wrap.style.setProperty("--sig-fs", "100px");
      // mede os próprios spans (o bloco absoluto é limitado pela largura da seção
      // e esconderia o transbordo)
      const lines = Array.from(base.querySelectorAll("span"));
      const rs = lines.map((l) => l.getBoundingClientRect());
      const stacked = rs.length > 1 && Math.abs(rs[0].top - rs[1].top) > 2;
      const w = stacked ? Math.max(...rs.map((r) => r.width)) : (rs[rs.length - 1].right - rs[0].left);
      const fs = Math.min(100 * avail / Math.max(1, w), 192);
      wrap.style.setProperty("--sig-fs", fs.toFixed(1) + "px");
      section.style.setProperty("--sig-h", Math.round(base.getBoundingClientRect().height * 0.8) + "px");
      wrap.style.setProperty("--sr", Math.round(Math.max(110, fs * 1.25)) + "px");
    }
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fit(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    let ft;
    window.addEventListener("resize", () => { clearTimeout(ft); ft = setTimeout(fit, 150); });

    // ---- brilho: segue o mouse; sem mouse (ou no toque), passeia sozinho pelo nome ----
    let hover = false, t0 = performance.now(), running = false, raf = 0;
    function setAt(x, y){
      const r = fill.getBoundingClientRect();
      wrap.style.setProperty("--sx", `${x - r.left}px`);
      wrap.style.setProperty("--sy", `${y - r.top}px`);
    }
    function sweep(now){
      raf = requestAnimationFrame(sweep);
      if (hover) return;
      const r = fill.getBoundingClientRect();
      const k = ((now - t0) / 1000) * 0.22;           // ~4,5 s por travessia
      const u = 0.5 - 0.5 * Math.cos(k * Math.PI * 2); // vai e volta, suave
      wrap.style.setProperty("--sx", `${r.width * (0.04 + u * 0.92)}px`);
      wrap.style.setProperty("--sy", `${r.height * (0.45 + Math.sin(k * 5.3) * 0.2)}px`);
    }
    function start(){ if (running || reduceMotion) return; running = true; raf = requestAnimationFrame(sweep); }
    function stop(){ running = false; cancelAnimationFrame(raf); }
    if (reduceMotion){ // sem movimento: brilho parado no centro do nome
      requestAnimationFrame(() => { const r = fill.getBoundingClientRect(); wrap.style.setProperty("--sx", `${r.width / 2}px`); wrap.style.setProperty("--sy", `${r.height / 2}px`); });
    } else if ("IntersectionObserver" in window){
      new IntersectionObserver((en) => { en[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(section);
    } else start();

    if (!isTouch){
      section.addEventListener("mousemove", (e) => {
        if (section.classList.contains("is-playing")) return;
        const r = wrap.getBoundingClientRect();
        // só "pega" o brilho quando o mouse está perto do nome
        hover = e.clientY > r.bottom - (fill.getBoundingClientRect().height + 160);
        if (hover) setAt(e.clientX, e.clientY);
      });
      section.addEventListener("mouseleave", () => { hover = false; });
    }
  }

  /* ---------------------------------------------------------
     CONTATO — fundo em shader (substitui o vídeo). WebGL puro, sem
     three.js: um único triângulo em tela cheia, renderizado a ~35% da
     resolução e no máximo 30 fps. Só roda com a seção visível e com o
     jogo fechado; com reduced-motion desenha um quadro só.
     --------------------------------------------------------- */
  function initContactShader(){
    const section = document.getElementById("contact");
    const canvas = document.getElementById("contactShader");
    if (!section || !canvas) return null;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return null; // fica o gradiente do CSS

    const vs = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
    const fs = `
      precision mediump float;
      uniform vec2 uRes, uMouse;
      uniform float uTime;
      uniform vec3 uA, uB, uC;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
        return v;
      }
      void main(){
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 p = uv * vec2(uRes.x / uRes.y, 1.0);
        float t = uTime * 0.045;
        // aurora: ruído deformado por ruído (domain warping), bem devagar
        vec2 q = vec2(fbm(p * 1.3 + t), fbm(p * 1.3 - t + 3.1));
        float n = fbm(p * 1.7 + 2.3 * q + vec2(t * 0.7, -t * 0.5));
        vec3 col = vec3(0.018, 0.026, 0.055);
        col += uA * smoothstep(0.38, 0.92, n) * 0.42;
        col += uC * smoothstep(0.45, 1.0, q.x * n * 1.7) * 0.38;
        col += uB * pow(smoothstep(0.55, 0.95, n * q.y * 1.7), 2.0) * 0.4;
        // linha de varredura discreta (eco do jogo / terminal)
        float scan = smoothstep(0.012, 0.0, abs(uv.y - fract(uTime * 0.035)));
        col += uB * scan * 0.06;
        // brilho que acompanha o mouse
        float m = exp(-length((uv - uMouse) * vec2(uRes.x / uRes.y, 1.0)) * 3.2);
        col += uB * m * 0.16;
        // vinheta
        col *= smoothstep(1.3, 0.2, length((uv - 0.5) * vec2(1.25, 1.6)));
        gl_FragColor = vec4(col, 1.0);
      }`;
    function sh(type, src){ const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; }
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ["uRes", "uMouse", "uTime", "uA", "uB", "uC"].forEach((k) => { U[k] = gl.getUniformLocation(prog, k); });

    function hex(v){ const c = v.trim().replace("#", ""); const n = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
    function readColors(){
      const cs = getComputedStyle(document.documentElement);
      const a = cs.getPropertyValue("--accent") || "#3d6bff";
      const b = cs.getPropertyValue("--accent-2") || "#7dd8ff";
      try { gl.uniform3fv(U.uA, hex(a)); gl.uniform3fv(U.uB, hex(b)); } catch (e){ gl.uniform3fv(U.uA, [0.24, 0.42, 1]); gl.uniform3fv(U.uB, [0.49, 0.85, 1]); }
      gl.uniform3fv(U.uC, [0.55, 0.27, 1.0]); // violeta dos tijolos
    }
    readColors();
    document.addEventListener("themechange", () => { readColors(); if (!running) draw(); });

    const SCALE = 0.35;
    function resize(){
      const w = Math.max(2, Math.round(section.clientWidth * SCALE));
      const h = Math.max(2, Math.round(section.clientHeight * SCALE));
      if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uRes, w, h);
    }
    const mouse = { x: 0.5, y: 0.55, tx: 0.5, ty: 0.55 };
    if (!isTouch){
      section.addEventListener("mousemove", (e) => {
        const r = section.getBoundingClientRect();
        mouse.tx = (e.clientX - r.left) / r.width;
        mouse.ty = 1 - (e.clientY - r.top) / r.height;
      });
    }
    let t = 12, last = 0, raf = 0, running = false, visible = false, paused = false;
    function draw(){
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      gl.uniform1f(U.uTime, t);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now){
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return; // ~30 fps é suficiente para algo tão lento
      t += Math.min(0.1, (now - last) / 1000 || 0.033);
      last = now;
      draw();
    }
    function update(){
      const should = visible && !paused && !document.hidden && !reduceMotion;
      if (should && !running){ running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
      else if (!should && running){ running = false; cancelAnimationFrame(raf); }
    }
    new ResizeObserver(() => { resize(); draw(); }).observe(section);
    resize(); draw();
    if ("IntersectionObserver" in window){
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; update(); }, { threshold: 0 }).observe(section);
    } else { visible = true; update(); }
    document.addEventListener("visibilitychange", update);
    return { pause(v){ paused = v; update(); } };
  }

  /* ---------------------------------------------------------
     CONTATO — quebra-blocos de fundo + modo jogo
     --------------------------------------------------------- */
  function initContactGame(){
    const shader = initContactShader();
    const section = document.getElementById("contact");
    const canvas = document.getElementById("brickCanvas");
    const playBtn = document.getElementById("contactPlay");
    const closeBtn = document.getElementById("contactGameClose");
    const bar = document.getElementById("contactGameBar");
    if (!section || !canvas || !playBtn || typeof window.createBrickGame !== "function"){
      if (playBtn) playBtn.hidden = true;
      return;
    }
    const cs = getComputedStyle(document.documentElement);
    const acc2 = cs.getPropertyValue("--accent-2").trim() || "#7dd8ff";
    const portrait = isNarrow && window.innerHeight > window.innerWidth;
    const game = window.createBrickGame(canvas, {
      ...(portrait ? { width: 620, height: 900, cols: 6 } : {}),
      transparent: true,        // o vídeo da seção aparece por trás
      hue: 196, hueStep: 16,    // azul → violeta, na paleta do site
      font: "'Space Grotesk', system-ui, sans-serif",
      mono: "'IBM Plex Mono', ui-monospace, monospace",
      colors: { accent: acc2, paddle: "#e8ecf4", text: "#e8ecf4", muted: "#8b93a7", wall: "rgba(125,216,255,.18)" },
    });
    canvas.tabIndex = -1; // fora da ordem de tab enquanto é só fundo
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => game.redraw());

    function scrollToSection(){
      if (lenis) lenis.scrollTo(section, { offset: 0, duration: 0.9 });
      else section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    function open(){
      if (shader) shader.pause(true); // o jogo tem a GPU só para ele
      section.classList.add("is-playing");
      document.documentElement.classList.add("game-on");
      bar.hidden = false;
      canvas.tabIndex = 0;
      game.reset();
      requestAnimationFrame(() => { game.redraw(); game.focus(); });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      scrollToSection();
    }
    function close(){
      game.pause();
      game.reset();
      section.classList.remove("is-playing");
      document.documentElement.classList.remove("game-on");
      if (shader) shader.pause(false);
      bar.hidden = true;
      canvas.tabIndex = -1;
      requestAnimationFrame(() => game.redraw());
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      playBtn.focus({ preventScroll: true });
    }
    playBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    // Esc duas vezes: a primeira pausa (dentro do jogo); com o jogo pausado, encerra
    section.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && section.classList.contains("is-playing") && document.activeElement !== canvas) close();
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
        '<span class="exp-rv" aria-hidden="true"><i class="exp-rv-line t"></i><i class="exp-rv-line b"></i></span>' +
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
    const section = document.getElementById("experience");
    const wrap = document.getElementById("expPinWrap");
    const track = document.getElementById("expTrack");
    const fill = document.getElementById("expProgressFill");
    const staticWrap = document.getElementById("expStatic");
    const canvas = document.getElementById("expBgCanvas");
    const tint = document.getElementById("expBgTint");
    const intro = document.getElementById("expIntro");
    const introText = document.getElementById("expIntroText");
    const introSvg = document.getElementById("expIntroSvg");
    const cards = track ? Array.from(track.querySelectorAll(".exp-card")) : [];

    // clona os cards para o fallback estático (mobile / reduced motion)
    if (staticWrap && track){
      track.querySelectorAll(".exp-card").forEach((card) => {
        staticWrap.appendChild(card.cloneNode(true));
      });
    }

    if (!section || !wrap || !track || typeof gsap === "undefined" || !window.ScrollTrigger){ section && section.classList.add("exp-static-on"); return; }
    if (reduceMotion){ section.classList.add("exp-static-on"); return; }

    // celular/tablet estreito: mesma história (vídeo → título na mão → cards),
    // com frames leves em retrato, pin mais curto e cards em "baralho"
    const MOBILE = isNarrow;
    section.classList.add("exp-cine");
    if (MOBILE) section.classList.add("exp-mobile");
    // emenda com o pin do Sobre: a seção sobe uma tela por cima do final dele
    const aboutMain = document.querySelector("#about .about-main.compact");
    const overlap = !!aboutMain;
    function applyOverlap(){ section.style.marginTop = overlap ? `-${aboutMain.offsetHeight}px` : ""; }
    applyOverlap();

    // ----- fundo em sequência de frames num <canvas> (o scroll escolhe o frame) -----
    // desktop: 192 frames 1600×900 · mobile: 96 frames 600×900 recortados em retrato (~6 MB)
    const FRAME_COUNT = MOBILE ? 96 : 192;
    const SKIP_FRAMES = MOBILE ? 10 : 19; // frame_020 = o mesmo quadro que termina o "mergulho" no notebook
    const LAST = FRAME_COUNT - 1;
    const FRAME_BASE = MOBILE ? "./assets/video/frames-m/frame_" : "./assets/video/frames/frame_";
    const frames = [];
    for (let i = 1; i <= FRAME_COUNT; i++){
      const img = new Image();
      img.decoding = "async";
      frames.push(img);
    }
    let framesRequested = false;
    function requestFrames(){
      if (framesRequested) return;
      framesRequested = true;
      // primeiro o quadro de abertura, depois o resto em ordem
      // frames antes de SKIP_FRAMES nunca são desenhados (e nem existem mais na pasta)
      const order = [SKIP_FRAMES, ...frames.map((_, i) => i).filter((i) => i > SKIP_FRAMES)];
      order.forEach((i) => { frames[i].src = `${FRAME_BASE}${String(i + 1).padStart(3, "0")}.jpg`; });
    }
    if (MOBILE && "IntersectionObserver" in window){
      // no celular só baixa quando a seção se aproxima (não compete com o hero)
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting){ requestFrames(); io.disconnect(); } }, { rootMargin: "150% 0px" });
      io.observe(section);
    } else requestFrames();

    const ctx = canvas ? canvas.getContext("2d") : null;
    let currentFrameIdx = SKIP_FRAMES;
    let lastDrawnIdx = SKIP_FRAMES;
    function frameReady(i){ const im = frames[i]; return im && im.complete && im.naturalWidth; }
    function drawCover(img, alpha){
      if (!img || !img.naturalWidth) return;
      const cw = canvas.width, ch = canvas.height;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale, dh = ih * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      ctx.globalAlpha = 1;
    }
    // cross-fade entre os dois frames vizinhos do índice fracionário
    function drawFrame(idx){
      if (!ctx || !canvas.width || !canvas.height) return;
      const clamped = Math.max(0, Math.min(LAST, idx));
      let a = Math.floor(clamped);
      let b = Math.min(LAST, a + 1);
      const frac = clamped - a;
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
      const dpr = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      drawFrame(currentFrameIdx);
    }
    frames[SKIP_FRAMES].addEventListener("load", () => drawFrame(currentFrameIdx));

    /* ---------- linha do tempo (em "progresso" 0 → 1 do pin) ----------
       0.00        tela = 1º frame (continuação do mergulho)
       0.00 – .90  vídeo roda do frame 20 ao 192
       .215 – .47  a mão aparece → título desenhado em SVG, depois se desfaz
       .48  – .66  três experiências abrem, uma a uma, com o vídeo rodando
       .66  – .84  trilha desliza; a experiência atual entra por último
       .90  – 1.0  respiro final                                            */
    const VIDEO_END = 0.9;
    const pOfFrame = (f) => ((f - 20) / (192 - 20)) * VIDEO_END; // f = nº do frame no vídeo original
    const T_HAND = pOfFrame(62);               // primeiro frame em que a mão entra
    const chrome = wrap.querySelectorAll(".exp-progress, .exp-hint");
    const kicker = intro ? intro.querySelector(".exp-intro-kicker") : null;
    const kLine = intro ? intro.querySelector(".exp-intro-line") : null;
    const sub = intro ? intro.querySelector(".exp-intro-sub") : null;

    // cada card ganha um sub-timeline de abertura
    function cardReveal(card){
      const rvLines = card.querySelectorAll(".exp-rv-line");
      const yearEl = card.querySelector(".exp-card-year");
      const year = yearEl ? yearEl.textContent.trim() : "";
      const inner = card.querySelectorAll(".exp-card-range, .exp-card-role, .exp-card-company, .exp-card-desc");
      const tags = card.querySelectorAll(".exp-tag");
      const t = gsap.timeline();
      // 1) uma linha de luz risca o centro do card
      t.fromTo(card, { opacity: 1, "--o": 1, y: 36, rotationX: -10, transformPerspective: 1200 },
        { y: 0, rotationX: 0, duration: 0.07, ease: "power2.out" }, 0);
      t.fromTo(rvLines, { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.022, ease: "power2.out" }, 0);
      // 2) a "tela" se abre do centro para as bordas, as linhas acompanham
      t.to(card, { "--o": 0, duration: 0.036, ease: "power3.inOut" }, 0.018);
      t.to(rvLines, { opacity: 0, duration: 0.014, ease: "power1.in" }, 0.05);
      // 3) conteúdo sobe em cascata; o ano "decodifica"
      t.fromTo(inner, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.03, stagger: 0.008, ease: "power2.out" }, 0.036);
      t.fromTo(tags, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.018, stagger: 0.003, ease: "back.out(2)" }, 0.056);
      if (yearEl && /^\d{4}$/.test(year)){
        const o = { p: 0 };
        t.to(o, {
          p: 1, duration: 0.05, ease: "none",
          onUpdate: () => {
            const k = Math.floor(o.p * 4.999);
            let s2 = year.slice(0, k);
            for (let i = k; i < 4; i++) s2 += o.p <= 0 ? year[i] : String((Math.random() * 10) | 0);
            yearEl.textContent = o.p >= 1 ? year : s2;
          },
        }, 0.03);
      }
      return t;
    }

    let tlRef = null;
    function build(){
      if (tlRef){ tlRef.scrollTrigger && tlRef.scrollTrigger.kill(true); tlRef.kill(); tlRef = null; }
      applyOverlap();
      const cs = getComputedStyle(track);
      const padR = parseFloat(cs.paddingRight) || 0;
      const distance = MOBILE ? 0 : Math.max(0, track.scrollWidth - window.innerWidth + padR * 0.2);
      const totalLen = MOBILE ? Math.max(window.innerHeight * 4.4, 3200) : Math.max(window.innerHeight * 5.2, 4200);

      gsap.set(track, { x: 0 });
      gsap.set(cards, MOBILE ? { opacity: 0, xPercent: -50, yPercent: -50 } : { opacity: 0 });
      resizeCanvas();
      drawFrame(SKIP_FRAMES);

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "expPin",
          trigger: wrap,
          start: "top top",
          end: () => `+=${totalLen}`,
          pin: true,
          anticipatePin: 1,
          scrub: MOBILE ? 0.4 : 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => { if (fill) fill.style.width = `${self.progress * 100}%`; },
        },
      });
      tl.set({}, {}, 1); // duração total = 1 (tempo = progresso)

      // tela: invisível enquanto a seção sobe por cima do Sobre; aparece no 1º pixel do pin
      if (canvas) tl.fromTo(canvas, { opacity: overlap ? 0 : 1 }, { opacity: 1, duration: 0.002 }, 0);
      if (tint) tl.fromTo(tint, { opacity: 0 }, { opacity: 0.45, duration: 0.12 }, 0.02);
      if (tint) tl.to(tint, { opacity: 1, duration: 0.05 }, 0.46);
      tl.fromTo(chrome, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.03);

      // vídeo
      if (canvas){
        tl.to({}, {
          duration: VIDEO_END,
          onUpdate: function(){
            currentFrameIdx = SKIP_FRAMES + this.progress() * (LAST - SKIP_FRAMES);
            drawFrame(currentFrameIdx);
          },
        }, 0);
      }

      // título: traço desenhado → preenchimento → se espalha e dissolve
      if (intro && introText){
        const t0 = T_HAND - 0.005;
        tl.set(intro, { visibility: "visible" }, t0);
        if (kLine) tl.fromTo(kLine, { scaleX: 0 }, { scaleX: 1, duration: 0.03, ease: "power2.out" }, t0);
        if (kicker) tl.fromTo(kicker, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.025, ease: "power2.out" }, t0);
        tl.fromTo(introText, { strokeDashoffset: 1100, strokeOpacity: 1 },
          { strokeDashoffset: 0, duration: 0.085, ease: "power1.inOut" }, t0 + 0.004);
        tl.fromTo(introText, { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.045, ease: "power1.inOut" }, t0 + 0.06);
        tl.to(introText, { strokeOpacity: 0.3, duration: 0.03 }, t0 + 0.08);
        if (sub) tl.fromTo(sub, { opacity: 0, y: 10, letterSpacing: "0.6em" }, { opacity: 1, y: 0, letterSpacing: "0.34em", duration: 0.04, ease: "power2.out" }, t0 + 0.075);
        // saída
        const tOut = 0.4;
        tl.fromTo(introText, { letterSpacing: "-7px" }, { letterSpacing: "46px", immediateRender: false, duration: 0.06, ease: "power2.in" }, tOut);
        tl.to(introText, { fillOpacity: 0, strokeDashoffset: -1100, strokeOpacity: 1, duration: 0.06, ease: "power2.in" }, tOut);
        if (introSvg) tl.fromTo(introSvg, { filter: "blur(0px) drop-shadow(0 0 22px rgba(125,216,255,.28))" }, { filter: "blur(10px) drop-shadow(0 0 22px rgba(125,216,255,0))", duration: 0.06, ease: "power2.in" }, tOut);
        tl.to([kicker, sub].filter(Boolean), { opacity: 0, y: -12, duration: 0.04, ease: "power1.in" }, tOut);
        tl.set(intro, { visibility: "hidden" }, tOut + 0.07);
      }

      // cards: três abrem com o vídeo rodando; a trilha desliza e a atual entra por último
      if (MOBILE){
        // baralho: um card por vez no centro; o anterior sobe, encolhe e sai
        const mStarts = [0.49, 0.6, 0.71, 0.82];
        cards.forEach((card, i) => {
          const t = mStarts[Math.min(i, mStarts.length - 1)];
          if (i > 0) tl.to(cards[i - 1], { y: -70, scale: 0.9, opacity: 0, duration: 0.04, ease: "power2.in" }, t - 0.012);
          tl.add(cardReveal(card).timeScale(1.45), t); // abertura mais curta → mais tempo de leitura
        });
      } else {
        const starts = [0.48, 0.545, 0.61, 0.715];
        cards.forEach((card, i) => { tl.add(cardReveal(card), starts[Math.min(i, starts.length - 1)] + Math.max(0, i - 3) * 0.06); });
        if (distance > 0) tl.to(track, { x: -distance, duration: 0.18, ease: "power1.inOut" }, 0.665);
      }

      tlRef = tl;
      return tl;
    }
    // celular: a "tela" liga ao entrar — faixa fina que abre até cobrir tudo (mesma
    // linguagem da abertura dos cards; substitui o mergulho do notebook do desktop)
    if (MOBILE && canvas){
      gsap.fromTo(canvas,
        { clipPath: "inset(46% 6% 46% 6% round 14px)", scale: 1.08 },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", scale: 1, ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 85%", end: "top top", scrub: 0.4 } });
    }
    build();
    let rt, lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      // celular: a barra de endereço muda a altura o tempo todo — só reconstrói se a largura mudar
      if (MOBILE && window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(rt); rt = setTimeout(() => { build(); ScrollTrigger.refresh(); }, 150);
    });
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
    initTitleGlitch();
    initSmoothScroll();
    initNav();
    initMobileMenu();
    initTyping();
    initMarquee();
    initReveal();

    // pins/scrollTriggers registrados em ordem top-to-bottom do documento
    // (evita cálculo de posição incorreto entre pins aninhados no GSAP)
    initHeroTitleFit();
    initHeroPinSequence();
    initStatCounters();
    initAboutSequence();
    initAboutPhotoReveal();
    initScanlineTransitions();
    initExpCardFx();
    initSignatureSpotlight();
    initContactGame();
    initContactReveal();
    initExperiencePin();
    initProjectTilt();
    initEducationSplit();

    runLoader(() => {
      window.__heroLoaderDone = true;
      document.dispatchEvent(new CustomEvent("loader:done"));
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

})();
