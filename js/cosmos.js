/* =========================================================================
   COSMOS — página do projeto (cosmos.html)
   ----------------------------------------------------------------
   • Galáxia WebGL fixa atrás da página (Three.js + shaders próprios, porta
     da galáxia do app COSMOS). Ela muda de ESTADO conforme a cena — a
     rolagem "conversa" com o agente (movimento-assinatura da página).
   • Cenas com GSAP + ScrollTrigger: virada (palavras acendem), pico das
     três regras (cartão de confirmação montado no scroll), trilho
     horizontal, diagrama que se desenha, números, vídeos.
   • Respeita "reduzir movimento" e funciona sem WebGL.
   Depende de: three (r128, global), gsap, ScrollTrigger, main.js, i18n.js.
   ========================================================================= */
(function(){
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const T = (s, v) => (window.I18N && window.I18N.t ? window.I18N.t(s, v) : s);
  const lang = (document.documentElement.lang || "pt").slice(0, 2);
  const fmt = (n, d) => Number(n).toLocaleString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const track = (name, params) => { if (window.agTrack) window.agTrack(name, params || {}); };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mobile = () => window.innerWidth < 760;

  /* =======================================================================
     1) GALÁXIA
     ======================================================================= */
  // comportamento de cada estado do agente (mesmos valores do app)
  const LOOKS = {
    idle:         { rpm: 0.67, core: 0.85, pulse: 0,    pulseHz: 0.5, breath: 0, saturation: 1,    brightness: 1 },
    thinking:     { rpm: 1.6,  core: 1.25, pulse: 0.12, pulseHz: 0.9, breath: 0, saturation: 1,    brightness: 1.08 },
    tool:         { rpm: 1.9,  core: 1.15, pulse: 0.28, pulseHz: 1.6, breath: 0, saturation: 1,    brightness: 1.1 },
    speaking:     { rpm: 1.2,  core: 1.05, pulse: 0.2,  pulseHz: 2.2, breath: 0, saturation: 1,    brightness: 1.05 },
    confirmation: { rpm: 0.5,  core: 1.0,  pulse: 0,    pulseHz: 0.5, breath: 1, saturation: 1,    brightness: 1 },
    error:        { rpm: 0.35, core: 0.55, pulse: 0,    pulseHz: 0.5, breath: 0, saturation: 0.25, brightness: 0.7 },
    listening:    { rpm: 1.0,  core: 1.0,  pulse: 0.35, pulseHz: 3,   breath: 0, saturation: 1,    brightness: 1.05 },
  };
  const PALETTES = [
    { id: "observatorio", hue: 0,     haze: "#7B6CF0" },
    { id: "aurora",       hue: -1.36, haze: "#2FB9A6" },
    { id: "nebulosa",     hue: 1.26,  haze: "#C04FB8" },
    { id: "gelo",         hue: -0.75, haze: "#3F8EE8" },
    { id: "solar",        hue: 2.55,  haze: "#C9862E" }, // só pelo tema âmbar das Configurações
  ];
  // tema do site (Configurações › cor) → paleta da galáxia
  const THEME_PALETTE = { blue: "observatorio", violet: "nebulosa", emerald: "aurora", amber: "solar" };
  const siteTheme = () => document.documentElement.getAttribute("data-theme") || "blue";
  const STATUS = {
    idle: "pronto", thinking: "pensando…", tool: "usando ferramentas", speaking: "falando",
    confirmation: "aguardando sua confirmação", error: "erro: fonte fora do ar", listening: "ouvindo…",
  };

  function mulberry32(seed){
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const GAL = { radius: 5, randomness: 0.78, randomnessPower: 2.1, coreShare: 0.16, coreRadius: 0.9, thickness: 0.18 };
  const CORE_COLORS = [[1.0, 0.965, 0.875], [0.953, 0.78, 0.478]];
  const ARM_COLORS = [[0.949, 0.933, 0.89], [0.788, 0.761, 1.0], [0.663, 0.608, 1.0], [0.561, 0.659, 1.0]];

  function buildGalaxy(count, arms, spin, seed){
    const rnd = mulberry32(seed || 7);
    const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count), seeds = new Float32Array(count), radii = new Float32Array(count);
    const signedPow = () => Math.pow(rnd(), GAL.randomnessPower) * (rnd() < 0.5 ? 1 : -1);
    for (let i = 0; i < count; i++){
      const isCore = rnd() < GAL.coreShare;
      let x, y, z, r, color;
      if (isCore){
        r = Math.pow(rnd(), 1.8) * GAL.coreRadius;
        const th = rnd() * Math.PI * 2;
        x = Math.cos(th) * r; z = Math.sin(th) * r; y = signedPow() * GAL.thickness * 1.6;
        color = CORE_COLORS[rnd() < 0.55 ? 0 : 1];
      } else {
        r = 0.35 + Math.pow(rnd(), 1.35) * (GAL.radius - 0.35);
        const branch = ((i % arms) / arms) * Math.PI * 2;
        const angle = branch + r * spin;
        const spread = GAL.randomness * (0.4 + r / GAL.radius);
        x = Math.cos(angle) * r + signedPow() * spread * r * 0.35;
        z = Math.sin(angle) * r + signedPow() * spread * r * 0.35;
        y = signedPow() * GAL.thickness * (1 - r / GAL.radius) + signedPow() * 0.05;
        const t = r / GAL.radius;
        color = t < 0.22 && rnd() < 0.6 ? CORE_COLORS[1] : ARM_COLORS[Math.floor(rnd() * ARM_COLORS.length)];
      }
      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      colors[i * 3] = color[0]; colors[i * 3 + 1] = color[1]; colors[i * 3 + 2] = color[2];
      const bright = rnd();
      sizes[i] = isCore ? 0.9 + bright * 1.4 : bright > 0.97 ? 2.4 : 0.55 + bright * 0.9;
      seeds[i] = rnd();
      radii[i] = Math.min(1, Math.hypot(x, z) / GAL.radius);
    }
    return { positions, colors, sizes, seeds, radii };
  }
  function buildStars(count){
    const rnd = mulberry32(21);
    const positions = new Float32Array(count * 3), seeds = new Float32Array(count);
    for (let i = 0; i < count; i++){
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rad = 18 + rnd() * 14, s = Math.sqrt(1 - u * u);
      positions[i * 3] = Math.cos(th) * s * rad; positions[i * 3 + 1] = u * rad; positions[i * 3 + 2] = Math.sin(th) * s * rad;
      seeds[i] = rnd();
    }
    return { positions, seeds };
  }

  const VERT = `
    uniform float uTime; uniform float uPixelRatio; uniform float uSize; uniform float uReveal;
    uniform float uPulse; uniform float uPulseHz; uniform float uCore; uniform float uBreath; uniform float uBrightness;
    uniform vec2 uMouse; uniform float uMouseOn; uniform float uShock; uniform float uHue;
    attribute vec3 aColor; attribute float aSize; attribute float aSeed; attribute float aRadius;
    varying vec3 vColor; varying float vAlpha;
    vec3 hueShift(vec3 color, float angle){
      const vec3 k = vec3(0.57735);
      float c = cos(angle);
      return color * c + cross(k, color) * sin(angle) + k * dot(k, color) * (1.0 - c);
    }
    void main(){
      float reveal = smoothstep(aRadius - 0.18, aRadius + 0.04, uReveal * 1.25);
      vec3 p = position * mix(0.25, 1.0, reveal);
      float wave = sin(uTime * 6.2831 * uPulseHz - aRadius * 10.0 + aSeed * 0.5);
      p.y += wave * uPulse * 0.08 * aRadius;
      float swell = 1.0 + uPulse * 0.45 * max(wave, 0.0);
      float shockRing = uShock * 1.15;
      float shock = exp(-pow((aRadius - shockRing) * 7.0, 2.0)) * (1.0 - uShock) * step(uShock, 0.999);
      p.y += shock * 0.25;
      swell += shock * 2.2;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      vec2 ndc = gl_Position.xy / gl_Position.w;
      vec2 away = ndc - uMouse;
      float near = exp(-dot(away, away) * 90.0) * uMouseOn;
      gl_Position.xy += normalize(away + 1e-5) * near * 0.035 * gl_Position.w;
      swell += near * 1.4;
      float twinkle = 0.72 + 0.28 * sin(uTime * (0.8 + aSeed * 2.4) + aSeed * 37.0);
      float nearCore = 1.0 - smoothstep(0.0, 0.28, aRadius);
      float breath = 1.0 + uBreath * 0.45 * (0.5 + 0.5 * sin(uTime * 1.7)) * nearCore;
      float core = mix(1.0, uCore, nearCore);
      gl_PointSize = uSize * aSize * swell * breath * uPixelRatio / -mv.z;
      float armWeight = smoothstep(0.12, 0.3, aRadius);
      vec3 color = mix(aColor, hueShift(aColor, uHue), armWeight);
      vColor = color * core * breath * (1.0 + shock * 1.5 + near * 0.8);
      vAlpha = reveal * twinkle * uBrightness;
    }`;
  const FRAG = `
    uniform float uSaturation;
    varying vec3 vColor; varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float strength = pow(1.0 - smoothstep(0.0, 0.5, d), 2.4);
      if (strength < 0.01) discard;
      float luma = dot(vColor, vec3(0.299, 0.587, 0.114));
      vec3 color = mix(vec3(luma), vColor, uSaturation);
      gl_FragColor = vec4(color, strength * vAlpha);
    }`;
  const STARS_VERT = `
    uniform float uTime; uniform float uPixelRatio; uniform float uReveal;
    attribute float aSeed; varying float vAlpha;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (0.8 + aSeed * 1.6) * uPixelRatio;
      float twinkle = 0.45 + 0.55 * sin(uTime * (0.4 + aSeed * 1.3) + aSeed * 90.0);
      vAlpha = uReveal * (0.25 + 0.55 * twinkle) * (0.4 + aSeed * 0.6);
    }`;
  const STARS_FRAG = `
    varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float strength = 1.0 - smoothstep(0.1, 0.5, d);
      gl_FragColor = vec4(vec3(0.949, 0.933, 0.89), strength * vAlpha);
    }`;

  function radialTexture(stops, size){
    size = size || 256;
    const c = document.createElement("canvas"); c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function webglOK(){
    try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); }
    catch (e){ return false; }
  }

  function createGalaxy(canvas){
    if (typeof THREE === "undefined" || !webglOK()){ document.documentElement.classList.add("no-webgl"); return null; }
    const FOV = 40, CAM_Z = 12, TILT_X = (60 * Math.PI) / 180, ROLL_Z = (-18 * Math.PI) / 180;
    const weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 3);
    const small = window.innerWidth < 768;
    const Q = small ? (weak ? { particles: 3500, stars: 500, maxDpr: 1.25 } : { particles: 6000, stars: 800, maxDpr: 1.5 })
                    : (weak ? { particles: 7000, stars: 900, maxDpr: 1.5 } : { particles: 14000, stars: 1400, maxDpr: 2 });

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" }); }
    catch (e){ document.documentElement.classList.add("no-webgl"); return null; }
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    const pr = Math.min(window.devicePixelRatio || 1, Q.maxDpr);
    renderer.setPixelRatio(pr);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    camera.position.set(0, 0, CAM_Z);
    const root = new THREE.Group(), roll = new THREE.Group(), tilt = new THREE.Group(), spin = new THREE.Group();

    // estrelas
    const st = buildStars(Q.stars);
    const stGeo = new THREE.BufferGeometry();
    stGeo.setAttribute("position", new THREE.BufferAttribute(st.positions, 3));
    stGeo.setAttribute("aSeed", new THREE.BufferAttribute(st.seeds, 1));
    const stMat = new THREE.ShaderMaterial({ vertexShader: STARS_VERT, fragmentShader: STARS_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pr }, uReveal: { value: 0 } } });
    scene.add(new THREE.Points(stGeo, stMat));

    // névoa
    const hazeColor = new THREE.Color(PALETTES[0].haze);
    const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, "rgba(255,255,255,0.55)"], [0.45, "rgba(255,255,255,0.18)"], [1, "rgba(255,255,255,0)"]]),
      color: hazeColor, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    haze.scale.set(GAL.radius * 3.2, GAL.radius * 2.0, 1);
    haze.material.rotation = ROLL_Z;

    // braços
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pr }, uSize: { value: 34 }, uReveal: { value: 0 }, uPulse: { value: 0 }, uPulseHz: { value: 0.5 },
        uCore: { value: 1 }, uBreath: { value: 0 }, uBrightness: { value: 1 }, uSaturation: { value: 1 }, uMouse: { value: new THREE.Vector2(9, 9) },
        uMouseOn: { value: 0 }, uShock: { value: 1 }, uHue: { value: 0 } } });
    let geo = null, points = null;
    const shape = { arms: 3, spin: 0.92 };
    function rebuild(){
      const g = buildGalaxy(Q.particles, shape.arms, shape.spin, 7);
      const ng = new THREE.BufferGeometry();
      ng.setAttribute("position", new THREE.BufferAttribute(g.positions, 3));
      ng.setAttribute("aColor", new THREE.BufferAttribute(g.colors, 3));
      ng.setAttribute("aSize", new THREE.BufferAttribute(g.sizes, 1));
      ng.setAttribute("aSeed", new THREE.BufferAttribute(g.seeds, 1));
      ng.setAttribute("aRadius", new THREE.BufferAttribute(g.radii, 1));
      if (points){ points.geometry = ng; geo.dispose(); }
      else { points = new THREE.Points(ng, mat); spin.add(points); }
      geo = ng;
    }
    rebuild();
    tilt.rotation.x = TILT_X;
    tilt.add(spin);

    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, "rgba(255,246,223,1)"], [0.18, "rgba(243,199,122,0.85)"], [0.5, "rgba(243,199,122,0.18)"], [1, "rgba(243,199,122,0)"]]),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    roll.rotation.z = ROLL_Z;
    roll.add(haze, tilt, coreGlow);
    root.add(roll);
    scene.add(root);

    // estado animável
    const look = Object.assign({}, LOOKS.idle);
    const reveal = { value: 0 };
    const focus = { x: 0.66, y: 0.5, w: 0.6 };       // centro (fração da tela) e largura relativa
    const view = { dim: 1, dive: 0, extraTilt: 0, speed: 1 };
    const shock = { value: 1 };
    const hue = { value: 0 };
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let state = "idle", level = 0, levelTarget = 0, mouseOn = 0, mouseTarget = 0;
    let spinVel = 0, dragTilt = 0, elapsed = 0, last = 0, raf = 0, running = false;

    function applyFocus(){
      const W = window.innerWidth, H = window.innerHeight;
      const worldPerPx = (2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / H;
      root.position.set((focus.x * W - W / 2) * worldPerPx, -(focus.y * H - H / 2) * worldPerPx, 0);
      root.scale.setScalar((focus.w * Math.min(W, 1600) * 0.5 * worldPerPx) / GAL.radius);
    }
    function resize(){
      const W = window.innerWidth, H = window.innerHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      applyFocus();
      if (!running) render();
    }

    function render(){
      const u = mat.uniforms, t = elapsed;
      u.uTime.value = t;
      u.uReveal.value = reveal.value;
      u.uPulse.value = look.pulse + level * 0.5;
      u.uPulseHz.value = look.pulseHz;
      u.uCore.value = look.core + level * 0.35;
      u.uBreath.value = look.breath;
      u.uSaturation.value = look.saturation;
      u.uShock.value = shock.value;
      u.uHue.value = hue.value;
      u.uMouseOn.value = mouseOn;
      stMat.uniforms.uTime.value = t;
      stMat.uniforms.uReveal.value = Math.min(1, reveal.value * 1.6);
      const breath = 1 + look.breath * 0.18 * (0.5 + 0.5 * Math.sin(t * 1.7));
      const coreSize = GAL.coreRadius * 2.6 * (0.75 + look.core * 0.35) * breath * (1 + Math.max(0, 1 - shock.value * 3) * 0.7);
      coreGlow.scale.set(coreSize, coreSize, 1);
      const dim = view.dim;
      u.uBrightness.value = look.brightness * dim;
      coreGlow.material.opacity = reveal.value * Math.min(1, 0.55 + look.core * 0.4) * look.brightness * dim;
      haze.material.opacity = reveal.value * 0.55 * look.brightness * (0.4 + 0.6 * look.saturation) * dim;
      camera.position.z = CAM_Z * (1 - view.dive * 0.42);
      tilt.rotation.x = TILT_X - view.extraTilt + dragTilt;
      root.rotation.x = pointer.y * 0.12;
      root.rotation.y = pointer.x * 0.16;
      renderer.render(scene, camera);
    }
    function frame(now){
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      elapsed += dt;
      // rotação: rpm do estado × velocidade escolhida + inércia do arraste
      spin.rotation.y -= (look.rpm * view.speed * Math.PI * 2 / 60) * dt;
      if (Math.abs(spinVel) > 0.001){ spin.rotation.y += spinVel * dt; spinVel *= Math.pow(0.04, dt); }
      dragTilt *= Math.pow(0.25, dt);
      mouseOn += (mouseTarget - mouseOn) * Math.min(1, dt * 4);
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
      // "voz": no app vem do microfone/da fala; aqui é um sinal simulado
      if (state === "listening") levelTarget = clamp(0.35 + 0.35 * Math.sin(elapsed * 7.3) * Math.sin(elapsed * 2.1) + 0.2 * Math.sin(elapsed * 13.7), 0, 1);
      else if (state === "speaking") levelTarget = clamp(0.25 + 0.3 * Math.abs(Math.sin(elapsed * 5.1)) * (0.6 + 0.4 * Math.sin(elapsed * 1.3)), 0, 1);
      else levelTarget = 0;
      level += (levelTarget - level) * Math.min(1, dt * 8);
      render();
    }
    function start(){ if (running || reduce) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop(){ running = false; cancelAnimationFrame(raf); }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      mat.uniforms.uMouse.value.set(pointer.tx, -pointer.ty);
    }, { passive: true });
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else start(); });
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); document.documentElement.classList.add("no-webgl"); });
    resize();

    const redraw = () => { if (!running) render(); };
    const api = {
      intro(){
        if (reduce){ reveal.value = 1; render(); return; }
        gsap.fromTo(reveal, { value: 0 }, { value: 1, duration: 2.8, ease: "expo.out" });
        start();
      },
      setState(name){
        state = LOOKS[name] ? name : "idle";
        gsap.to(look, Object.assign({}, LOOKS[state], { duration: reduce ? 0 : 1.2, ease: "power2.inOut", overwrite: true, onUpdate: redraw }));
      },
      getState: () => state,
      setPalette(id){
        const p = PALETTES.find((x) => x.id === id) || PALETTES[0];
        const c = new THREE.Color(p.haze), d = reduce ? 0 : 1.4;
        gsap.to(hue, { value: p.hue, duration: d, ease: "power2.inOut", overwrite: true, onUpdate: redraw });
        gsap.to(hazeColor, { r: c.r, g: c.g, b: c.b, duration: d, ease: "power2.inOut", overwrite: true, onUpdate: () => { haze.material.color.copy(hazeColor); redraw(); } });
      },
      setFocus(f, immediate){
        const target = { x: f.x, y: f.y, w: f.w };
        if (immediate || reduce){ Object.assign(focus, target); applyFocus(); redraw(); return; }
        gsap.to(focus, Object.assign(target, { duration: 1.6, ease: "power3.inOut", overwrite: true, onUpdate: () => { applyFocus(); redraw(); } }));
      },
      setView(v, immediate){
        if (immediate || reduce){ Object.assign(view, v); redraw(); return; }
        gsap.to(view, Object.assign({}, v, { duration: 1.4, ease: "power2.inOut", overwrite: "auto", onUpdate: redraw }));
      },
      view, shape,
      setShape(arms, sp){ shape.arms = arms; shape.spin = sp; rebuild(); redraw(); },
      pulse(){ if (reduce) return; gsap.fromTo(shock, { value: 0 }, { value: 1, duration: 1.8, ease: "power2.out", overwrite: true }); },
      // clicar = pulso · arrastar = girar e inclinar · segurar = próxima paleta
      attach(el, onHold){
        const d = { active: false, id: -1, x0: 0, y0: 0, x: 0, y: 0, t0: 0, t: 0, moved: 0, held: false };
        let holdTimer = 0;
        el.addEventListener("pointerdown", (e) => {
          if (e.button !== 0 || e.target.closest("a, button, input, label")) return;
          Object.assign(d, { active: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: 0, held: false });
          d.t0 = d.t = performance.now(); spinVel = 0;
          clearTimeout(holdTimer);
          holdTimer = setTimeout(() => { if (d.active && d.moved <= 8){ d.held = true; api.pulse(); if (onHold) onHold(); } }, 620);
        });
        el.addEventListener("pointermove", (e) => {
          if (!d.active || e.pointerId !== d.id) return;
          const now = performance.now(), dx = e.clientX - d.x, dy = e.clientY - d.y;
          d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x0, e.clientY - d.y0));
          if (d.moved > 8){
            if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
            spin.rotation.y += dx * 0.009;
            dragTilt = clamp(dragTilt + dy * 0.004, -0.55, 0.4);
            spinVel = clamp((dx * 0.009) / (Math.max(1, now - d.t) / 1000), -6, 6);
            redraw();
          }
          d.x = e.clientX; d.y = e.clientY; d.t = now;
        });
        const end = (e) => {
          if (!d.active || e.pointerId !== d.id) return;
          d.active = false; clearTimeout(holdTimer);
          if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
          const dur = performance.now() - d.t0;
          if (d.moved <= 8 && dur <= 350 && !d.held) api.pulse();
          if (performance.now() - d.t > 80) spinVel = 0;
        };
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", () => { d.active = false; clearTimeout(holdTimer); });
        el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") mouseTarget = 1; });
        el.addEventListener("pointerleave", () => { mouseTarget = 0; });
      },
      render,
    };
    return api;
  }

  /* =======================================================================
     2) LINHA DE ESTADO (o "status" do agente, igual ao app)
     ======================================================================= */
  const statusEl = $("#cosStatus"), statusText = $("#cosStatusText");
  let statusKey = "";
  function setStatus(state, extra){
    const txt = T(STATUS[state] || STATUS.idle) + (extra ? " · " + T(extra) : "");
    if (!statusEl || txt === statusKey) return;
    statusKey = txt;
    statusEl.setAttribute("data-state", state);
    statusText.textContent = txt;
  }

  /* =======================================================================
     3) DIRETOR DE CENAS: onde a galáxia fica e em que estado, por seção
     ======================================================================= */
  // x, y = centro na tela (0..1) · w = largura relativa · dim = brilho · tilt = mais "de frente"
  const SCENES = {
    hero:   { d: { x: 0.68, y: 0.5,  w: 0.66 }, m: { x: 0.55, y: 0.15, w: 1.1 }, dim: 1,    tilt: 0,    state: "idle",     note: "arraste para girar a galáxia" },
    turn:   { d: { x: 0.5,  y: 0.55, w: 0.5 },  m: { x: 0.5, y: 0.5,  w: 1.1 },  dim: 0.38, tilt: 0.2,  state: "thinking" },
    rules:  { d: { x: 0.76, y: 0.5,  w: 0.55 }, m: { x: 0.5, y: 0.82, w: 1.2 },  dim: 0.8,  tilt: 0,    state: "tool" },
    does:   { d: { x: 0.5,  y: 0.08, w: 1.3 },  m: { x: 0.5, y: 0.1,  w: 2 },    dim: 0.35, tilt: 0.35, state: "tool",     note: "WhatsApp, Gmail, Agenda" },
    play:   { d: { x: 0.5,  y: 0.52, w: 0.44 }, m: { x: 0.5, y: 0.5,  w: 1.15 }, dim: 1,    tilt: 0,    state: null },
    arch:   { d: { x: 0.18, y: 0.55, w: 0.55 }, m: { x: 0.5, y: 0.2,  w: 1.4 },  dim: 0.3,  tilt: 0.25, state: "thinking" },
    custom: { d: { x: 0.5,  y: 0.3,  w: 0.5 },  m: { x: 0.5, y: 0.28, w: 1.15 }, dim: 1,    tilt: 0.1,  state: "speaking", note: "às suas ordens" },
    trust:  { d: { x: 0.86, y: 0.62, w: 0.42 }, m: { x: 0.85, y: 0.15, w: 1.2 }, dim: 0.28, tilt: 0.3,  state: "idle" },
    video:  { d: { x: 0.5,  y: 0.5,  w: 0.95 }, m: { x: 0.5, y: 0.5,  w: 1.8 },  dim: 0.18, tilt: 0.45, state: "idle" },
    hire:   { d: { x: 0.12, y: 0.82, w: 0.6 },  m: { x: 0.5, y: 0.9,  w: 1.6 },  dim: 0.3,  tilt: 0.2,  state: "idle" },
    cta:    { d: { x: 0.5,  y: 0.84, w: 1.05 }, m: { x: 0.5, y: 0.82, w: 2 },    dim: 1,    tilt: 0.55, state: "confirmation", note: "esperando o seu sim" },
  };
  let G = null, currentScene = "", playState = "idle";

  function goScene(key, immediate){
    const s = SCENES[key];
    if (!s) return;
    currentScene = key;
    if (G){
      G.setFocus(mobile() ? s.m : s.d, immediate);
      G.setView({ dim: s.dim, extraTilt: s.tilt }, immediate);
      const st = key === "play" ? playState : (key === "rules" ? rulesState() : s.state);
      G.setState(st);
    }
    const st = key === "play" ? playState : (key === "rules" ? rulesState() : s.state);
    setStatus(st, key === "rules" ? rulesNote() : s.note);
  }

  /* =======================================================================
     4) CENAS
     ======================================================================= */
  // 2 · palavras que acendem
  function initTurn(){
    const lines = [$("#cosTurnA"), $("#cosTurnB")].filter(Boolean);
    const words = [];
    lines.forEach((el, li) => {
      const parts = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      parts.forEach((w, i) => {
        const span = document.createElement("span");
        span.className = "w" + (li === 1 && i >= parts.length - 2 ? " hl" : "");
        span.textContent = w;
        el.appendChild(span);
        if (i < parts.length - 1) el.appendChild(document.createTextNode(" "));
        words.push(span);
      });
    });
    if (reduce || !window.ScrollTrigger){ words.forEach((w) => w.classList.add("on")); return words; }
    if (staged) return words; // quem acende as palavras é a cena de abertura (initIntro)
    ScrollTrigger.create({
      trigger: "#cos-turn", start: "top 70%", end: "center 45%", scrub: true,
      onUpdate: (self) => { const n = Math.round(self.progress * words.length); words.forEach((w, i) => w.classList.toggle("on", i < n)); },
    });
    return words;
  }


  /* -----------------------------------------------------------------------
     1–3 · ABERTURA → VÍDEOS → VIRADA, sem a tela descer
     As três cenas ficam empilhadas numa tela fixa (pin). A rolagem:
       A) suga as letras do título para o núcleo da galáxia; uma onda sai do
          núcleo e o vídeo nasce dali, abrindo em círculo a partir do núcleo;
       B) o vídeo "desliga" como uma tela antiga (fecha numa linha de luz) e
          essa linha se abre na frase da virada, que acende palavra a palavra.
     ----------------------------------------------------------------------- */
  let staged = false, introST = null;
  const INTRO = { aEnd: 0.42, bStart: 0.6, bEnd: 0.8 };
  function canStage(){ return !reduce && !!window.ScrollTrigger && !!window.gsap && window.innerHeight >= 540; }

  function splitChars(el){
    const chars = [];
    const walk = (node, into) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3){
          n.nodeValue.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)){ into.appendChild(document.createTextNode(" ")); return; }
            const wd = document.createElement("span"); wd.className = "cos-wd";
            Array.from(part).forEach((c) => { const ch = document.createElement("span"); ch.className = "cos-ch"; ch.textContent = c; wd.appendChild(ch); chars.push(ch); });
            into.appendChild(wd);
          });
          n.remove();
        } else if (n.nodeType === 1){
          const clone = n.cloneNode(false); // ex.: o <em> de "faz" continua em volta das letras dele
          into.appendChild(clone);
          walk(n, clone);
        }
      });
    };
    const frag = el.cloneNode(true);
    el.innerHTML = ""; walk(frag, el);
    el.setAttribute("aria-label", frag.textContent.replace(/\s+/g, " ").trim());
    return chars;
  }

  function initIntro(words, chars){
    const wrap = $("#cosIntro");
    if (!wrap || !staged) return false;
    const hero = $("#cos-hero"), vid = $("#cos-video"), turn = $("#cos-turn");
    wrap.classList.add("is-staged");
    const others = $$(".cos-hero-logo, .cos-hero-sub, .cos-hero-ctas, .cos-wa, .cos-hero-hint", hero);
    const core = () => mobile() ? SCENES.hero.m : SCENES.hero.d;
    const coreAt = () => ({ x: core().x * window.innerWidth, y: core().y * window.innerHeight });

    // máscaras de borda suave (em vez de recortes secos): círculo que se abre a partir
    // do núcleo, e uma faixa horizontal que fecha/abre como uma tela antiga
    const vm = { r: 0, h: 60 }, tm = { h: 0 };
    const radial = (r) => { const c = core(); return `radial-gradient(circle at ${(c.x * 100).toFixed(1)}% ${(c.y * 100).toFixed(1)}%, #000 ${r.toFixed(2)}%, transparent ${(r + 24).toFixed(2)}%)`; };
    const band = (h) => `linear-gradient(to bottom, transparent ${(50 - h - 8).toFixed(2)}%, #000 ${(50 - h).toFixed(2)}%, #000 ${(50 + h).toFixed(2)}%, transparent ${(50 + h + 8).toFixed(2)}%)`;
    const setMask = (el, m) => { el.style.webkitMaskImage = m; el.style.maskImage = m; };
    const paintVid = () => setMask(vid, vm.h < 59.9 ? band(vm.h) : radial(vm.r));
    const paintTurn = () => setMask(turn, tm.h > 59.9 ? "none" : band(tm.h));

    const tl = gsap.timeline({ defaults: { ease: "none" } });

    // A) as letras escorrem para o núcleo, em ondas (do fim para o começo), sem pressa
    tl.fromTo(chars, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }, {
      x: (i, el) => { const r = el.getBoundingClientRect(); return coreAt().x - (r.left + r.width / 2); },
      y: (i, el) => { const r = el.getBoundingClientRect(); return coreAt().y - (r.top + r.height / 2); },
      rotation: (i) => (i % 2 ? 1 : -1) * (14 + (i * 13) % 36),
      scale: 0.18, opacity: 0, ease: "sine.in", duration: 0.26, immediateRender: false,
      stagger: { each: 0.0045, from: "end" },
    }, 0.03);
    tl.fromTo(others, { y: 0, opacity: 1, filter: "blur(0px)" }, { y: -18, opacity: 0, filter: "blur(8px)", duration: 0.2, stagger: 0.02, ease: "sine.inOut", immediateRender: false }, 0.02);
    // o bloco do vídeo se aproxima ao nascer e recua um pouco ao "desligar"
    tl.fromTo(".cos-intro .cos-video .cos-wrap", { scale: 0.9, y: 30, rotationX: 8, transformPerspective: 1400 },
      { scale: 1, y: 0, rotationX: 0, duration: INTRO.aEnd - 0.12, ease: "power2.out", immediateRender: false }, 0.18);
    tl.to(".cos-intro .cos-video .cos-wrap", { scale: 0.97, duration: INTRO.bEnd - INTRO.bStart, ease: "sine.inOut" }, INTRO.bStart);
    tl.to({}, { duration: 0.01 }, 0.99); // a linha do tempo vai de 0 a 1 (mesma escala do progresso do pin)

    // visibilidade, opacidade e máscaras das camadas: calculadas direto do progresso
    // (função pura), para a ida e a volta darem sempre o mesmo resultado
    const sIO = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
    const sOut = (t) => Math.sin((Math.PI / 2) * clamp(t, 0, 1));
    const layers = (p) => {
      // vídeo
      const vOn = p >= 0.16 && p <= INTRO.bEnd + 0.02;
      const vOp = sIO((p - 0.16) / 0.1) * (1 - sIO((p - (INTRO.bEnd - 0.05)) / 0.07));
      vm.r = 150 * sIO((p - 0.16) / (INTRO.aEnd - 0.16));
      vm.h = 60 * (1 - sIO((p - INTRO.bStart) / (INTRO.bEnd - INTRO.bStart)));
      vid.style.visibility = vOn ? "visible" : "hidden";
      vid.style.opacity = vOn ? vOp.toFixed(3) : "0";
      vid.style.filter = p > INTRO.bEnd - 0.1 ? `brightness(${(1 + 0.6 * sIO((p - (INTRO.bEnd - 0.1)) / 0.08)).toFixed(3)})` : "";
      if (vm.h >= 59.9 && vm.r >= 149.9) setMask(vid, "none"); else paintVid();
      // virada
      const tOn = p >= INTRO.bEnd - 0.07;
      tm.h = 60 * sOut((p - (INTRO.bEnd - 0.06)) / 0.13);
      turn.style.visibility = tOn ? "visible" : "hidden";
      turn.style.opacity = tOn ? sIO((p - (INTRO.bEnd - 0.07)) / 0.07).toFixed(3) : "0";
      paintTurn();
      // abertura
      hero.style.visibility = p > INTRO.aEnd - 0.02 ? "hidden" : "visible";
    };

    let last = { scene: "", pulsed: false };
    const v = $("#cosVideo");
    const update = (p) => {
      layers(p);
      const scene = p < 0.22 ? "hero" : p < INTRO.bEnd - 0.04 ? "video" : "turn";
      if (scene !== last.scene){ last.scene = scene; goScene(scene); }
      if (G){
        const inA = clamp(p / 0.34, 0, 1), outB = clamp((p - INTRO.bStart) / 0.25, 0, 1);
        const ease = (t) => t * t * (3 - 2 * t);
        G.view.dive = 0.85 * ease(inA) * (1 - ease(outB));
      }
      if (G && p > 0.17 && !last.pulsed){ last.pulsed = true; G.pulse(); } else if (p < 0.1) last.pulsed = false;
      const n = Math.round(clamp((p - (INTRO.bEnd + 0.03)) / 0.14, 0, 1) * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
      hero.inert = p > 0.2; vid.inert = p < 0.3 || p > INTRO.bStart + 0.05; turn.inert = p < INTRO.bEnd;
      if (v && !v.paused && (p < 0.3 || p > INTRO.bStart + 0.03)) v.pause();
    };
    introST = ScrollTrigger.create({
      trigger: wrap, start: "top top", end: () => "+=" + Math.round(window.innerHeight * (mobile() ? 4.2 : 5.2)),
      pin: true, scrub: 1.2, anticipatePin: 1, animation: tl, invalidateOnRefresh: true,
    });
    // tudo segue o progresso suavizado da linha do tempo (o mesmo das letras)
    tl.eventCallback("onUpdate", () => update(tl.progress()));
    update(0);
    return true;
  }

  /* entrada da abertura: tudo aparece devagar, em sequência, depois do véu da página */
  function heroEntrance(chars){
    const hero = $("#cos-hero");
    const root = document.documentElement;
    const done = () => root.classList.remove("cos-pending");
    if (!hero || reduce || !window.gsap){ done(); return; }
    const words = $$(".cos-h1 .cos-wd", hero);
    const logo = $(".cos-hero-logo", hero), sub = $(".cos-hero-sub", hero);
    const btns = $$(".cos-hero-ctas > *", hero), wa = $(".cos-wa", hero), hint = $(".cos-hero-hint", hero);
    const tl = gsap.timeline({ paused: true, delay: 0.25, onComplete: () => gsap.set([...words, logo, sub, ...btns, wa, hint].filter(Boolean), { clearProps: "transform,filter" }) });
    gsap.set(words, { opacity: 0, yPercent: 60, rotationX: -55, transformOrigin: "50% 100%", transformPerspective: 900, filter: "blur(10px)" });
    gsap.set([logo, sub, wa, hint].filter(Boolean), { opacity: 0, y: 18, filter: "blur(8px)" });
    gsap.set(btns, { opacity: 0, y: 22 });
    if (statusEl) gsap.set(statusEl, { opacity: 0 });
    done();
    tl.to(logo, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "power2.out" }, 0)
      .to(words, { opacity: 1, yPercent: 0, rotationX: 0, filter: "blur(0px)", duration: 1.7, ease: "power3.out", stagger: 0.11 }, 0.3)
      .to(sub, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "power2.out" }, 0.95)
      .to(btns, { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.12 }, 1.25)
      .to(wa, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, ease: "power2.out" }, 1.5)
      .to(hint, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, ease: "power2.out" }, 1.7);
    if (statusEl) tl.to(statusEl, { opacity: 1, duration: 1, ease: "sine.out" }, 1.9);
    // só começa com a página já visível (depois do véu) e com o trabalho pesado do
    // carregamento terminado — senão o GSAP "pula" a animação durante os quadros travados
    let started = false;
    const go = () => { if (started) return; started = true; requestAnimationFrame(() => requestAnimationFrame(() => tl.play())); };
    const ready = () => root.classList.contains("is-revealed") && document.readyState === "complete";
    if (ready()) go();
    else {
      const check = () => { if (ready()) go(); };
      window.addEventListener("load", () => setTimeout(check, 120), { once: true });
      new MutationObserver(check).observe(root, { attributes: true, attributeFilter: ["class"] });
      setTimeout(go, 3500); // segurança
    }
  }

  // posição de rolagem em que o vídeo está inteiro na tela (para o botão "Apresentação")
  function introVideoY(){
    if (!introST) return null;
    return introST.start + (introST.end - introST.start) * ((INTRO.aEnd + INTRO.bStart) / 2);
  }

  // 3 · PICO: o cartão de confirmação se monta com a rolagem
  const typed = "Envia para o Pai que vamos jantar às 20h";
  let rulesP = 0;
  function rulesState(){
    if (rulesP < 0.18) return "listening";
    if (rulesP < 0.62) return "confirmation";
    if (rulesP < 0.74) return "tool";
    if (rulesP < 0.84) return "speaking";
    return "idle";
  }
  function rulesNote(){
    if (rulesP < 0.18) return "";
    if (rulesP < 0.62) return "";
    if (rulesP < 0.74) return "whatsapp.send";
    if (rulesP < 0.84) return "enviado, senhor";
    return "";
  }
  function initRules(){
    const typedEl = $("#cosTyped"), timer = $("#cosTimer"), send = $("#cosSend");
    const steps = { card: $('[data-step="card"]'), log: $('[data-step="log"]'), reply: $('[data-step="reply"]'), meters: $('[data-step="meters"]') };
    const rules = $$(".cos-rule");
    const text = T(typed);
    let lastState = "";
    function paint(p){
      rulesP = p;
      typedEl.textContent = text.slice(0, Math.round(clamp(p / 0.16, 0, 1) * text.length));
      const show = (el, on) => el && el.classList.toggle("is-in", on);
      show(steps.card, p >= 0.18);
      const secs = Math.round(120 - clamp((p - 0.22) / 0.38, 0, 1) * 18);
      timer.textContent = `(${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")})`;
      send.classList.toggle("is-pressed", p >= 0.6 && p < 0.7);
      show(steps.log, p >= 0.64);
      if (steps.log){ const ok = steps.log.querySelector(".ok"); if (ok) ok.style.visibility = p >= 0.7 ? "visible" : "hidden"; }
      show(steps.reply, p >= 0.74);
      show(steps.meters, p >= 0.84);
      rules[0] && rules[0].classList.toggle("is-on", p >= 0.18);
      rules[1] && rules[1].classList.toggle("is-on", p >= 0.66);
      rules[2] && rules[2].classList.toggle("is-on", p >= 0.84);
      const st = rulesState();
      if (st !== lastState && currentScene === "rules"){ lastState = st; if (G) G.setState(st); }
      if (currentScene === "rules") setStatus(st, rulesNote());
    }
    if (reduce || !window.ScrollTrigger){ paint(1); return; }
    paint(0);
    ScrollTrigger.create({
      trigger: "#cosRulesPin", start: "top top", end: () => "+=" + Math.round(window.innerHeight * (mobile() ? 2.6 : 3.4)),
      pin: true, scrub: true, anticipatePin: 1,
      onUpdate: (self) => paint(self.progress),
    });
  }

  // 4 · trilho horizontal
  function initRail(){
    const rail = $("#cosRail"), pin = $("#cosDoesPin");
    if (!rail) return;
    const native = reduce || touch || window.innerWidth < 961 || !window.ScrollTrigger;
    if (native){ rail.classList.add("is-native"); return; }
    const dist = () => Math.max(0, rail.scrollWidth - window.innerWidth);
    gsap.to(rail, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: pin, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
    });
  }

  // 5 · controles da galáxia
  function syncPaletteChips(id){
    $$("[data-palettes] .cos-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.palette === id)));
  }
  let paletteIdx = 0;
  function choosePalette(id, fromTheme){
    paletteIdx = Math.max(0, PALETTES.findIndex((p) => p.id === id));
    if (G) G.setPalette(id);
    syncPaletteChips(id);
    if (!fromTheme){ try { localStorage.setItem("cosPalette2", JSON.stringify({ id, theme: siteTheme() })); } catch (e){} }
  }
  // segurar na galáxia: passa pelas 4 paletas do app (a "solar" fica só no tema âmbar)
  const nextPalette = () => choosePalette(PALETTES[(Math.min(paletteIdx, 3) + 1) % 4].id);

  function initPlay(){
    $$("#cosStates .cos-chip").forEach((b) => b.addEventListener("click", () => {
      playState = b.dataset.state;
      $$("#cosStates .cos-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      if (G) G.setState(playState);
      if (currentScene === "play") setStatus(playState);
    }));
    $$("[data-palettes] .cos-chip").forEach((b) => b.addEventListener("click", () => choosePalette(b.dataset.palette)));
    const arms = $("#cosArms"), sp = $("#cosSpin"), speed = $("#cosSpeed");
    const paint = (r) => r.style.setProperty("--v", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
    let pending = 0;
    const reshape = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => { if (G) G.setShape(Number(arms.value), Number(sp.value)); }); };
    arms.addEventListener("input", () => { $("#cosArmsOut").textContent = arms.value; paint(arms); reshape(); });
    sp.addEventListener("input", () => { $("#cosSpinOut").textContent = fmt(sp.value, 2); paint(sp); reshape(); });
    speed.addEventListener("input", () => { $("#cosSpeedOut").textContent = fmt(speed.value, 1) + "×"; paint(speed); if (G) G.view.speed = Number(speed.value); });
    [arms, sp, speed].forEach(paint);
    $("#cosSpinOut").textContent = fmt(sp.value, 2);
    $("#cosSpeedOut").textContent = fmt(speed.value, 1) + "×";
    if (!G) $$(".cos-ctrl input, #cosStates .cos-chip").forEach((el) => { el.disabled = true; });
  }

  // 6 · diagrama que se desenha
  function initDiagram(){
    const svg = $("#cosDiagram");
    if (!svg) return;
    const lines = $$(".ln", svg), nodes = $$(".node", svg), pks = $$(".pk", svg);
    lines.forEach((l) => { const len = l.getTotalLength(); l.style.strokeDasharray = len; l.style.strokeDashoffset = len; l.dataset.len = len; });
    const paint = (p) => {
      lines.forEach((l, i) => { const a = clamp((p - i * 0.18) / 0.22, 0, 1); l.style.strokeDashoffset = (1 - a) * Number(l.dataset.len); });
      nodes.forEach((n) => { const i = Number(n.dataset.node); n.classList.toggle("lit", p >= i * 0.18 - 0.02); });
    };
    if (reduce || !window.ScrollTrigger){ paint(1); pks.forEach((c) => c.style.display = "none"); return; }
    paint(0);
    ScrollTrigger.create({ trigger: svg, start: "top 80%", end: "bottom 55%", scrub: true, onUpdate: (s) => paint(s.progress) });
    // pacotes de dados descendo pelas camadas (só com a seção visível)
    const loops = pks.map((c, i) => {
      const y0 = Number(c.getAttribute("cy"));
      const y1 = [176, 346, 444][i] || y0 + 60;
      return gsap.fromTo(c, { attr: { cy: y0 }, opacity: 0 }, { attr: { cy: y1 }, opacity: 1, duration: 1.1, ease: "power1.inOut", repeat: -1, repeatDelay: 0.5 + i * 0.25, delay: i * 0.4, paused: true });
    });
    ScrollTrigger.create({ trigger: svg, start: "top bottom", end: "bottom top", onToggle: (s) => loops.forEach((t) => (s.isActive ? t.play() : t.pause())) });
  }

  // 7 · nome ao vivo
  function initCustom(){
    const input = $("#cosName"), mark = $("#cosWordmark");
    if (!input || !mark) return;
    input.addEventListener("input", () => {
      const v = input.value.replace(/[^\p{L}\p{N} .-]/gu, "").slice(0, 12).toUpperCase();
      mark.textContent = v.trim() || "COSMOS";
    });
    input.addEventListener("focus", () => { if (G) G.pulse(); });
  }

  // 8 · números contando
  function initCounters(){
    $$("[data-count]").forEach((el) => {
      const to = Number(el.dataset.count);
      if (reduce || !window.ScrollTrigger || to < 2){ el.textContent = String(to); return; }
      const o = { v: 0 };
      el.textContent = "0";
      ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = String(Math.round(o.v)); } }) });
    });
  }

  // 9 · vídeos
  function initVideos(){
    const v = $("#cosVideo"), btn = $("#cosPlayBtn"), box = $("#cosPlayer");
    if (v && btn){
      const vertical = () => window.matchMedia("(max-width: 600px) and (orientation: portrait)").matches;
      if (vertical()) v.poster = v.dataset.vPoster;
      let loaded = false;
      function load(){
        if (loaded) return; loaded = true;
        const big = window.innerWidth > 1280 && !(navigator.connection && navigator.connection.saveData);
        const list = vertical() ? [[v.dataset.vMp4, "video/mp4"]]
                                : [[v.dataset.hWebm, "video/webm"], [big ? v.dataset.hMp4 : v.dataset.hMp4Sm, "video/mp4"]];
        // Safari toca WebM mal em alguns aparelhos: MP4 primeiro nele
        const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (safari) list.reverse();
        list.forEach(([src, type]) => { const s = document.createElement("source"); s.src = src; s.type = type; v.appendChild(s); });
        v.load();
      }
      btn.addEventListener("click", () => {
        load();
        box.classList.add("is-playing");
        v.play().catch(() => {});
        v.focus({ preventScroll: true });
        track("cosmos_video_play", { video: vertical() ? "vertical" : "horizontal" });
      });
      v.addEventListener("play", () => { box.classList.add("is-playing"); if (window.AGAudio) window.AGAudio.duck(true); });
      v.addEventListener("pause", () => { if (window.AGAudio) window.AGAudio.duck(false); });
      v.addEventListener("ended", () => { if (window.AGAudio) window.AGAudio.duck(false); });
      // fora da tela: pausa
      if ("IntersectionObserver" in window){
        new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting && !v.paused) v.pause(); }), { threshold: 0.15 }).observe(v);
      }
    }

    // "agora, na prática": só libera quando o arquivo existir no servidor
    const card = $("#cosPractice"), pbtn = $("#cosPracticeBtn"), note = $("#cosPracticeNote");
    const modal = $("#cosModal"), mv = $("#cosPracticeVideo"), close = $("#cosModalClose");
    if (!card || !pbtn) return;
    const src = card.dataset.src;
    fetch(src, { method: "HEAD", cache: "no-store" }).then((r) => {
      const type = r.headers.get("content-type") || "";
      if (!r.ok || type.indexOf("video") < 0) return;
      card.classList.add("is-ready");
      pbtn.disabled = false;
      pbtn.textContent = "▶ " + T("Assistir");
      if (note) note.textContent = T("Uso real, sem roteiro.");
    }).catch(() => {});
    let lastFocus = null;
    function open(){
      lastFocus = document.activeElement;
      if (!mv.getAttribute("src")) mv.src = src;
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add("is-open"));
      if (window.__lenis) window.__lenis.stop();
      mv.play().catch(() => {});
      close.focus();
      track("cosmos_practice_play", {});
    }
    function shut(){
      modal.classList.remove("is-open");
      mv.pause();
      if (window.__lenis) window.__lenis.start();
      setTimeout(() => { modal.hidden = true; }, 350);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    pbtn.addEventListener("click", open);
    close.addEventListener("click", shut);
    modal.addEventListener("click", (e) => { if (e.target === modal) shut(); });
    document.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key === "Escape") shut();
      if (e.key === "Tab"){ // foco preso entre o botão e o vídeo
        const f = [close, mv];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
    mv.addEventListener("play", () => { if (window.AGAudio) window.AGAudio.duck(true); });
    mv.addEventListener("pause", () => { if (window.AGAudio) window.AGAudio.duck(false); });
  }

  // CTAs e atalhos
  function initLinks(){
    $$("[data-cos-cta]").forEach((a) => a.addEventListener("click", () => track("cosmos_cta", { link_location: a.dataset.cosCta })));
    $$("[data-cos-jump]").forEach((a) => a.addEventListener("click", (e) => {
      const target = $(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      e.stopPropagation(); // não é troca de página
      const y = a.getAttribute("href") === "#cos-video" ? introVideoY() : null;
      if (y !== null){ if (window.__lenis) window.__lenis.scrollTo(y, { duration: 2.2 }); else window.scrollTo({ top: y, behavior: "smooth" }); return; }
      if (window.__lenis) window.__lenis.scrollTo(target, { offset: -40, duration: 1.6 });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }, true));
  }

  /* =======================================================================
     5) BOOT
     ======================================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    const canvas = $("#cosGalaxy");
    G = canvas ? createGalaxy(canvas) : null;

    // a cor vem do tema do site; a escolha feita na própria galáxia vale até o tema mudar
    let saved = "";
    try { const raw = JSON.parse(localStorage.getItem("cosPalette2") || "null"); if (raw && raw.theme === siteTheme()) saved = raw.id; } catch (e){}
    choosePalette(saved || THEME_PALETTE[siteTheme()] || "observatorio", true);
    document.addEventListener("themechange", (e) => {
      const t = (e.detail && e.detail.theme) || siteTheme();
      choosePalette(THEME_PALETTE[t] || "observatorio", true);
      try { localStorage.removeItem("cosPalette2"); } catch (err){}
    });

    staged = canStage() && !!$("#cosIntro");
    const turnWords = initTurn();
    const h1 = $("#cos-hero .cos-h1");
    const heroChars = h1 && !reduce ? splitChars(h1) : [];
    initIntro(turnWords, heroChars);     // pin da abertura antes do pin das regras (ordem do documento)
    initRules();
    initRail();
    initPlay();
    initDiagram();
    initCustom();
    initCounters();
    initVideos();
    initLinks();

    if (G){
      const hero = $("#cosHeroStage"), stage = $("#cosPlayStage");
      if (hero) G.attach(hero, nextPalette);
      if (stage) G.attach(stage, nextPalette);
      G.setFocus(mobile() ? SCENES.hero.m : SCENES.hero.d, true);
      G.intro();
    }
    goScene("hero", true);
    heroEntrance(heroChars);

    if (window.ScrollTrigger){
      $$("[data-galaxy]").forEach((sec) => {
        if (staged && sec.closest("#cosIntro")) return; // a cena fixa da abertura cuida dessas três
        const key = sec.dataset.galaxy;
        ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onToggle: (s) => { if (s.isActive) goScene(key); } });
      });
      // abertura: rolar = a câmera mergulha na galáxia
      if (G && !reduce && !staged){
        ScrollTrigger.create({ trigger: "#cos-hero", start: "top top", end: "bottom top", scrub: true,
          onUpdate: (s) => { G.view.dive = s.progress; if (currentScene === "hero") G.view.extraTilt = s.progress * 0.5; } });
      }
      window.addEventListener("load", () => ScrollTrigger.refresh());
    }
    // a linha de estado some no rodapé
    const footer = $("#footer");
    if (footer && statusEl && "IntersectionObserver" in window){
      new IntersectionObserver((es) => es.forEach((e) => statusEl.classList.toggle("is-hidden", e.isIntersecting)), { threshold: 0.05 }).observe(footer);
    }
  });
})();
