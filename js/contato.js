/* ================================================================
   CONTATO — campo de pontos interativo + formulário com validação
   ----------------------------------------------------------------
   1) CAMPO (#contactField): malha de pontos em perspectiva que cobre
      a página inteira. Tudo roda no vertex shader (nenhum loop por
      ponto no JS). O mouse/toque levanta e afasta os pontos; clique
      solta uma onda; cada tecla digitada no formulário manda um
      pulso pequeno. No scroll (main.js → initContactReveal) a câmera
      vai de "horizonte" para "vista de cima" e a malha se alinha
      como uma prancheta — o formulário nasce em cima dela.
   2) FORMULÁRIO: validação em tempo real (nome, e-mail com checagem
      de domínio via DNS, telefone BR com máscara, tipo, mensagem),
      barra de progresso, anti-spam (honeypot + tempo) e envio para
      enviar.php com respostas em JSON.
   ================================================================ */
(function(){
  "use strict";
  const mq = (q) => window.matchMedia(q).matches;
  const reduceMotion = mq("(prefers-reduced-motion: reduce)");
  const isTouch = mq("(pointer: coarse)");
  const isNarrow = mq("(max-width: 900px)");
  const T = (str, v) => (window.I18N ? window.I18N.t(str, v) : str); // i18n (js/i18n.js)

  /* ==============================================================
     1) CAMPO DE PONTOS
     ============================================================== */
  function createField(){
    const canvas = document.getElementById("contactField");
    if (!canvas || typeof THREE === "undefined") return null;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" }); }
    catch (e){ return null; }
    const DPR = Math.min(window.devicePixelRatio || 1, isNarrow ? 1.5 : 1.75);
    renderer.setPixelRatio(DPR);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220);

    // malha: mais densa perto da câmera, cobrindo até o horizonte
    const STEP = isNarrow ? 1.05 : 0.62;
    const SX = isNarrow ? 90 : 150, SZ = isNarrow ? 110 : 130;
    const pos = [], rnd = [];
    for (let z = -SZ * 0.72; z <= SZ * 0.28; z += STEP){
      for (let x = -SX / 2; x <= SX / 2; x += STEP){
        pos.push(x, 0, z);
        rnd.push(Math.random());
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aRand", new THREE.Float32BufferAttribute(rnd, 1));

    const MAX_PULSES = 6;
    const U = {
      uTime: { value: 0 },
      uAmp: { value: 1 },
      uPR: { value: DPR },
      uSize: { value: isNarrow ? 3.2 : 2.9 },
      uMouse: { value: new THREE.Vector3(0, 0, -9999) },
      uMouseOn: { value: 0 },
      uPulses: { value: Array.from({ length: MAX_PULSES }, () => new THREE.Vector4(0, 0, -99, 0)) },
      uColA: { value: new THREE.Color("#3d6bff") },
      uColB: { value: new THREE.Color("#7dd8ff") },
      uGrid: { value: 0 },
      uAlpha: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime, uAmp, uPR, uSize, uMouseOn, uGrid, uAlpha;
        uniform vec3 uMouse, uColA, uColB;
        uniform vec4 uPulses[${MAX_PULSES}];
        attribute float aRand;
        varying float vA;
        varying vec3 vCol;
        void main(){
          vec3 p = position;
          // ondas longas e lentas; somem quando a malha vira "prancheta"
          float w = sin(p.x * 0.16 + uTime * 0.55) * 0.55
                  + cos(p.z * 0.21 + uTime * 0.42) * 0.4
                  + sin((p.x + p.z) * 0.07 + uTime * 0.27) * 0.5;
          p.y += w * uAmp;

          // mouse: levanta e empurra os pontos num raio suave
          vec2 d = p.xz - uMouse.xz;
          float dist = length(d);
          float infl = exp(-(dist * dist) / 14.0) * uMouseOn;
          p.y += infl * 2.2;
          p.xz += (d / max(dist, 0.001)) * infl * 1.1;
          float glow = infl;

          // ondas de clique / digitação
          for (int i = 0; i < ${MAX_PULSES}; i++){
            vec4 P = uPulses[i];
            float age = uTime - P.z;
            if (age < 0.0 || age > 4.5) continue;
            float r = age * (7.0 + P.w * 3.0);
            float band = length(p.xz - P.xy) - r;
            float ring = exp(-(band * band) / (0.9 + age * 0.6)) * (1.0 - age / 4.5) * P.w;
            p.y += ring * 1.4;
            glow += ring;
          }

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float depth = -mv.z;
          float sz = uSize * (0.55 + aRand * 0.7) * (1.0 + glow * 1.6);
          gl_PointSize = clamp(sz * uPR * (34.0 / depth), 1.0 * uPR, 10.0 * uPR);

          float fog = smoothstep(160.0, 30.0, depth) * smoothstep(1.5, 6.0, depth);
          float crest = clamp(w * 0.6 + 0.5, 0.0, 1.0) * uAmp;
          vA = (0.4 + aRand * 0.4 + crest * 0.35 + glow * 1.1) * fog * uAlpha;
          // na "prancheta" a cada 5 pontos um fica mais aceso (marcação de grade)
          float major = step(0.5, uGrid) * step(fract(position.x / 3.1 + 0.02), 0.2) * step(fract(position.z / 3.1 + 0.02), 0.2);
          vA += major * 0.25 * uGrid * fog;
          vCol = mix(uColA, uColB, clamp(glow * 1.2 + crest * 0.35 + aRand * 0.15, 0.0, 1.0));
        }`,
      fragmentShader: `
        varying float vA;
        varying vec3 vCol;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.05, d) * vA;
          gl_FragColor = vec4(vCol, a);
        }`,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    // câmera: "horizonte" (0) → "vista de cima" (1)
    const state = { tilt: 0 };
    const CAM_A = { pos: new THREE.Vector3(0, 7.5, 24), look: new THREE.Vector3(0, -1.5, -8) };
    const CAM_B = { pos: new THREE.Vector3(0, 46, 6), look: new THREE.Vector3(0, 0, -2) };
    const tmpLook = new THREE.Vector3();
    function placeCamera(){
      const k = state.tilt;
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(CAM_A.pos, CAM_B.pos, e);
      tmpLook.lerpVectors(CAM_A.look, CAM_B.look, e);
      camera.lookAt(tmpLook);
      U.uAmp.value = 1 - e * 0.9;
      U.uGrid.value = e;
    }

    function readTheme(){
      const cs = getComputedStyle(document.documentElement);
      U.uColA.value.set((cs.getPropertyValue("--accent") || "#3d6bff").trim());
      U.uColB.value.set((cs.getPropertyValue("--accent-2") || "#7dd8ff").trim());
      if (!running) render();
    }
    document.addEventListener("themechange", () => requestAnimationFrame(readTheme));

    function resize(){
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 72 : 55;
      camera.updateProjectionMatrix();
      if (!running) render();
    }

    // mouse → ponto no plano y=0 (raio da câmera)
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const mouseT = new THREE.Vector3(0, 0, -9999);
    let mouseOnT = 0;
    function toPlane(cx, cy, out){
      ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(plane, out);
    }
    function onMove(e){
      if (toPlane(e.clientX, e.clientY, hit)){ mouseT.copy(hit); mouseOnT = 1; }
      wake();
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", (e) => {
      if (e.target.closest && e.target.closest("input, textarea, button, a, label, select")) return;
      pulseAt(e.clientX, e.clientY, 1);
    }, { passive: true });
    document.addEventListener("pointerleave", () => { mouseOnT = 0; });
    if (isTouch) window.addEventListener("touchend", () => { mouseOnT = 0; }, { passive: true });

    let pi = 0;
    function pulseAt(cx, cy, strength){
      if (!toPlane(cx, cy, hit)) return;
      U.uPulses.value[pi].set(hit.x, hit.z, U.uTime.value, strength);
      pi = (pi + 1) % MAX_PULSES;
      wake();
    }

    function render(){ placeCamera(); renderer.render(scene, camera); }

    let raf = 0, running = false, last = 0, idleT = 0;
    function frame(now){
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      if (!reduceMotion) U.uTime.value += dt;
      else U.uTime.value += dt; // pulsos precisam do tempo; as ondas ficam paradas via uAmp
      // suaviza o mouse
      if (U.uMouse.value.z < -9000) U.uMouse.value.copy(mouseT);
      // suavização independente do fps
      U.uMouse.value.lerp(mouseT, 1 - Math.exp(-dt * 9));
      U.uMouseOn.value += (mouseOnT - U.uMouseOn.value) * (1 - Math.exp(-dt * 5));
      render();
      // reduced-motion: dorme quando nada está acontecendo
      if (reduceMotion){ idleT += dt; if (idleT > 5) stop(); }
    }
    function start(){ if (running || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop(){ running = false; cancelAnimationFrame(raf); }
    function wake(){ idleT = 0; start(); }
    document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });
    window.addEventListener("resize", resize);

    if (reduceMotion) U.uAmp.value = 0.35;
    readTheme();
    resize();
    render();
    start();
    canvas.classList.add("is-ready");

    return {
      state,
      setTilt(v){ state.tilt = Math.max(0, Math.min(1, v)); document.documentElement.style.setProperty("--field-tilt", state.tilt.toFixed(3)); if (!running) render(); },
      setAlpha(v){ U.uAlpha.value = v; },
      pulseAt,
      pulseEl(el, strength){
        const r = el.getBoundingClientRect();
        pulseAt(r.left + r.width / 2, r.top + r.height / 2, strength);
      },
    };
  }

  /* ==============================================================
     2) FORMULÁRIO
     ============================================================== */
  const DDD = new Set([11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99]);
  const COMMON_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.com.br", "icloud.com", "live.com", "uol.com.br", "bol.com.br", "terra.com.br", "protonmail.com", "outlook.com.br", "hotmail.com.br"];
  const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;

  function levenshtein(a, b){
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 9;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++){
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[m][n];
  }
  function suggestDomain(domain){
    domain = domain.toLowerCase();
    if (COMMON_DOMAINS.includes(domain)) return null;
    let best = null, bestD = 3;
    COMMON_DOMAINS.forEach((c) => { const dd = levenshtein(domain, c); if (dd < bestD){ bestD = dd; best = c; } });
    return bestD <= 2 ? best : null;
  }

  // o domínio do e-mail existe e recebe e-mail? (registro MX via DNS-over-HTTPS)
  const mxCache = new Map();
  function checkDomain(domain){
    domain = domain.toLowerCase();
    if (mxCache.has(domain)) return mxCache.get(domain);
    const ask = (url, headers) => fetch(url, { headers, cache: "force-cache" }).then((r) => { if (!r.ok) throw 0; return r.json(); });
    const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
    const q = (type) => withTimeout(
      ask(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, {})
        .catch(() => ask(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, { accept: "application/dns-json" })),
      4000);
    const p = q("MX").then((j) => {
      if (j.Status === 3) return "invalid";                            // NXDOMAIN: domínio não existe
      if (Array.isArray(j.Answer) && j.Answer.some((a) => a.type === 15)) return "valid";
      return q("A").then((ja) => (Array.isArray(ja.Answer) && ja.Answer.length ? "valid" : "invalid"));
    }).catch(() => "unknown");                                          // sem rede/DNS: o servidor confere de novo
    mxCache.set(domain, p);
    return p;
  }

  function maskPhone(v){
    let d = v.replace(/\D/g, "");
    if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function initForm(field){
    const form = document.getElementById("contactForm");
    if (!form) return;
    const card = document.getElementById("terminalCard");
    const btn = document.getElementById("btnSend");
    const btnLabel = btn.querySelector(".btn-send-label");
    const errorEl = document.getElementById("formError");
    const successEl = document.getElementById("formSuccess");
    const successLog = document.getElementById("successLog");
    const successName = document.getElementById("successName");
    const againBtn = document.getElementById("formAgain");
    const statusEl = document.getElementById("formStatus");
    const progressEl = document.getElementById("formProgress");
    const charCount = document.getElementById("charCount");
    const charRing = document.getElementById("charRing");
    const tInput = document.getElementById("formT");
    const f = {
      nome: form.elements.nome, email: form.elements.email, telefone: form.elements.telefone,
      mensagem: form.elements.mensagem,
    };
    const REQUIRED = ["nome", "email", "tipo", "mensagem"];
    const touched = new Set();
    const status = {};              // campo → "ok" | "err" | "pending" | ""
    let startedAt = 0;

    function group(name){ return form.querySelector(`[data-field="${name}"]`); }
    function setState(name, st, msg, extraHTML){
      status[name] = st;
      const g = group(name);
      if (!g) return;
      g.classList.toggle("is-ok", st === "ok");
      g.classList.toggle("is-err", st === "err");
      g.classList.toggle("is-pending", st === "pending");
      const m = g.querySelector(".field-msg");
      if (m){ m.innerHTML = extraHTML || (msg ? escapeHTML(msg) : ""); }
      const input = g.querySelector("input:not([type=radio]), textarea");
      if (input) input.setAttribute("aria-invalid", String(st === "err"));
      updateProgress();
    }
    function escapeHTML(t){ return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

    function updateProgress(){
      const done = REQUIRED.filter((k) => status[k] === "ok").length;
      if (progressEl) progressEl.style.transform = `scaleX(${done / REQUIRED.length})`;
      if (statusEl){
        statusEl.querySelector("span").textContent = done === REQUIRED.length ? T("pronto para enviar") : `${done} / ${REQUIRED.length} ${T("campos")}`;
        statusEl.classList.toggle("is-ready", done === REQUIRED.length);
      }
    }

    // ---- regras ----
    const V = {
      nome(){
        const v = f.nome.value.trim().replace(/\s+/g, " ");
        if (!v) return ["err", T("// informe seu nome")];
        if (v.replace(/[^\p{L}]/gu, "").length < 3) return ["err", T("// nome muito curto")];
        if (/[<>{}[\]\\/@#$%^*=_|~`0-9]/.test(v)) return ["err", T("// use apenas letras")];
        return ["ok", ""];
      },
      email(){
        const v = f.email.value.trim();
        if (!v) return ["err", T("// informe seu e-mail")];
        if (!EMAIL_RE.test(v)) return ["err", T("// formato inválido — ex.: voce@empresa.com")];
        return ["check", ""];
      },
      telefone(){
        const d = f.telefone.value.replace(/\D/g, "");
        if (!d) return ["", ""];                                          // opcional
        if (d.length < 10) return ["err", T("// incompleto — (DDD) + número")];
        const ddd = +d.slice(0, 2);
        if (!DDD.has(ddd)) return ["err", T("// DDD {d} não existe", { d: d.slice(0, 2) })];
        if (d.length === 11 && d[2] !== "9") return ["err", T("// celular começa com 9 depois do DDD")];
        if (d.length === 10 && !/[2-5]/.test(d[2])) return ["err", T("// fixo começa com 2, 3, 4 ou 5")];
        if (/^(\d)\1+$/.test(d.slice(2))) return ["err", T("// número inválido")];
        return ["ok", ""];
      },
      tipo(){
        return form.querySelector('input[name="tipo"]:checked') ? ["ok", ""] : ["err", T("// escolha uma opção")];
      },
      mensagem(){
        const n = f.mensagem.value.trim().length;
        if (!n) return ["err", T("// escreva sua mensagem")];
        if (n < 20) return ["err", T("// mais {n} caracteres, por favor", { n: 20 - n })];
        return ["ok", ""];
      },
    };

    let emailSeq = 0;
    async function validate(name, { show = true } = {}){
      const [st, msg] = V[name]();
      if (name === "email" && st === "check"){
        const v = f.email.value.trim();
        const domain = v.split("@")[1];
        const sug = suggestDomain(domain);
        const seq = ++emailSeq;
        if (show) setState("email", "pending", "", `<span class="dim">${T("// verificando domínio…")}</span>`);
        const res = await checkDomain(domain);
        if (seq !== emailSeq) return status.email;                         // chegou outra digitação
        if (res === "invalid"){
          const fix = sug ? ` <button type="button" class="email-fix" data-fix="${escapeHTML(v.split("@")[0] + "@" + sug)}>${T("usar {d}?", { d: "@" + sug })}</button>` : "";
          setState("email", "err", "", T("// o domínio {d} não recebe e-mails.", { d: `<b>@${escapeHTML(domain)}</b>` }) + fix);
          return "err";
        }
        if (sug){
          // domínio existe, mas parece erro de digitação: avisa sem bloquear
          setState("email", "ok", "", `<span class="dim">${T("// quis dizer")}</span> <button type="button" class="email-fix" data-fix="${escapeHTML(v.split("@")[0] + "@" + sug)}">@${sug}</button><span class="dim">?</span>`);
          return "ok";
        }
        setState("email", "ok", "", res === "valid" ? `<span class="ok">${T("// domínio verificado")}</span>` : "");
        return "ok";
      }
      if (show || st === "ok") setState(name, st, st === "err" ? msg : "");
      else status[name] = st;
      if (!show) updateProgress();
      return st;
    }

    form.addEventListener("click", (e) => {
      const b = e.target.closest(".email-fix");
      if (!b) return;
      f.email.value = b.dataset.fix;
      validate("email");
      f.email.focus();
    });

    // ---- eventos por campo ----
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    const emailLive = debounce(() => validate("email", { show: touched.has("email") }), 550);
    ["nome", "email", "telefone", "mensagem"].forEach((name) => {
      const el = f[name];
      el.addEventListener("focus", () => { if (!startedAt) startedAt = Date.now(); group(name).classList.add("is-focus"); });
      el.addEventListener("blur", () => {
        group(name).classList.remove("is-focus");
        if (el.value.trim() || touched.has(name)) { touched.add(name); validate(name); }
      });
      el.addEventListener("input", () => {
        if (name === "telefone"){
          const pos = el.selectionStart, before = el.value.length;
          el.value = maskPhone(el.value);
          const diff = el.value.length - before;
          try { el.setSelectionRange(pos + diff, pos + diff); } catch (e){}
        }
        if (name === "email") emailLive();
        else validate(name, { show: touched.has(name) });
        if (field && !reduceMotion) keyPulse(el);
      });
    });
    form.querySelectorAll('input[name="tipo"]').forEach((r) => r.addEventListener("change", () => { touched.add("tipo"); validate("tipo"); if (field) field.pulseEl(r.closest(".chip"), 0.8); }));
    form.querySelectorAll('input[name="como"]').forEach((r) => r.addEventListener("change", () => { if (field) field.pulseEl(r.closest(".chip"), 0.5); }));

    // cada tecla manda um pulso discreto para a malha, saindo do campo
    let lastPulse = 0;
    function keyPulse(el){
      const now = performance.now();
      if (now - lastPulse < 260) return;
      lastPulse = now;
      field.pulseEl(el, 0.35);
    }

    // contador em anel
    const RING = 2 * Math.PI * 8;
    if (charRing){ charRing.style.strokeDasharray = RING; charRing.style.strokeDashoffset = RING; }
    f.mensagem.addEventListener("input", () => {
      const n = f.mensagem.value.length;
      charCount.textContent = String(n);
      if (charRing) charRing.style.strokeDashoffset = RING * (1 - n / 600);
      charCount.parentElement.classList.toggle("is-near", n > 540);
    });

    // Ctrl/Cmd + Enter envia
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); form.requestSubmit ? form.requestSubmit() : btn.click(); }
    });

    function shake(){
      if (reduceMotion) return;
      card.classList.remove("is-shake"); void card.offsetWidth; card.classList.add("is-shake");
    }
    function setBusy(on, label){
      btn.disabled = on;
      btn.classList.toggle("is-busy", on);
      btnLabel.textContent = label || T("enviar mensagem");
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.remove("is-visible");
      REQUIRED.concat("telefone").forEach((n) => touched.add(n));
      setBusy(true, T("validando…"));
      const results = await Promise.all(["nome", "email", "telefone", "tipo", "mensagem"].map((n) => validate(n)));
      const firstBad = ["nome", "email", "telefone", "tipo", "mensagem"].find((n, i) => results[i] === "err");
      if (firstBad){
        setBusy(false);
        shake();
        const g = group(firstBad);
        const target = g.querySelector("input:not([type=hidden]), textarea");
        if (target) target.focus({ preventScroll: false });
        errorEl.textContent = T("// confira os campos destacados.");
        errorEl.classList.add("is-visible");
        return;
      }
      setBusy(true, T("enviando…"));
      tInput.value = String(Math.round((Date.now() - (startedAt || Date.now())) / 1000));
      try {
        const res = await fetch(form.getAttribute("action") || "enviar.php", {
          method: "POST", body: new FormData(form), headers: { Accept: "application/json" },
        });
        let data = null;
        try { data = await res.json(); } catch (_){ /* resposta não-JSON */ }
        if (!res.ok || !data || !data.ok){
          const err = new Error((data && data.erro) || `falha no envio (HTTP ${res.status})`);
          err.campo = data && data.campo;
          throw err;
        }
        success();
      } catch (err){
        setBusy(false);
        shake();
        const dm = /O domínio (@\S+) não recebe e-mails\./.exec(err.message || "");
        const msg = dm ? T("// o domínio {d} não recebe e-mails.", { d: dm[1] }).replace(/^\/\/ /, "") : T(err.message || "algo deu errado");
        if (err.campo && group(err.campo)){ touched.add(err.campo); setState(err.campo, "err", "// " + msg); }
        errorEl.innerHTML = `// ${escapeHTML(msg.replace(/\.$/, ""))}. ${T("Se preferir, escreva direto para")} <a href="mailto:alexandregojunior@gmail.com">alexandregojunior@gmail.com</a>.`;
        errorEl.classList.add("is-visible");
      }
    });

    function success(){
      const first = f.nome.value.trim().split(" ")[0] || "";
      if (successName) successName.textContent = first || T("tudo certo");
      card.classList.add("is-sent");
      form.hidden = true;
      successEl.classList.add("is-visible");
      successEl.focus({ preventScroll: true });
      if (field) field.pulseEl(btn, 2.2);
      // log de "terminal" digitado linha a linha
      const lines = [
        T("$ npm run enviar -- --para alexandre"),
        T("> validando campos ........ ok"),
        T("> verificando e-mail ...... ok"),
        "> POST /enviar.php ........ 200",
        T("> mensagem entregue ✓"),
      ];
      successLog.textContent = "";
      if (reduceMotion){ successLog.textContent = lines.join("\n"); return; }
      let li = 0, ci = 0;
      (function type(){
        if (li >= lines.length) return;
        const line = lines[li];
        successLog.textContent += line[ci++] || "";
        if (ci > line.length){ successLog.textContent += "\n"; li++; ci = 0; setTimeout(type, 140); }
        else setTimeout(type, 12);
      })();
    }
    againBtn && againBtn.addEventListener("click", () => {
      form.reset();
      Object.keys(status).forEach((k) => setState(k, "", ""));
      touched.clear();
      charCount.textContent = "0";
      if (charRing) charRing.style.strokeDashoffset = RING;
      successEl.classList.remove("is-visible");
      card.classList.remove("is-sent");
      form.hidden = false;
      setBusy(false);
      f.nome.focus();
    });

    updateProgress();
  }

  /* ---------- boot ---------- */
  const fx = { field: null };
  window.ContactFX = fx; // main.js (initContactReveal) usa o campo na transição
  document.addEventListener("DOMContentLoaded", () => {
    if (!fx.field) fx.field = createField();
    initForm(fx.field);
  });
  // o boot do main.js também roda em DOMContentLoaded (registrado antes deste) —
  // por isso ele pede o campo de forma preguiçosa via ContactFX.get()
  fx.get = () => fx.field || (fx.field = createField());
})();
