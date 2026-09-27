/* ================================================================
   HERO 3D — maquete viva (Three.js r186 via import map / ES modules)
   Modelo: assets/models/casa.glb (gerado a partir do Hero-Site.glb:
   geometria assada por categoria, meshopt + quantização → 14 draws)

   Etapas da "construção" (slider do painel):
   terreno → estrutura → superfícies → interior → vegetação → luz

   Casa → código-fonte (scroll pinado ou modo "Código" do painel):
   as arestas da planta se desfazem em glifos que voam e pousam, letra
   por letra, sobre o bloco #heroCode — que então assume como texto real.
   ================================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const GLSL_HASH = /* glsl */`
  float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
`;

const T = (s, v) => (window.I18N ? window.I18N.t(s, v) : s); // i18n (js/i18n.js)
const LANG = (window.I18N && window.I18N.lang) || "pt";
const canvas = document.getElementById("heroCanvas");
const heroEl = document.getElementById("hero");
const panel = document.getElementById("heroPanel");

if (canvas && heroEl) main();

function main(){
  const mq = (q) => window.matchMedia(q).matches;
  const reduceMotion = mq("(prefers-reduced-motion: reduce)");
  const isTouch = mq("(pointer: coarse)");
  const isNarrow = mq("(max-width: 900px)");
  const LOW = isTouch || isNarrow;

  const $ = (id) => document.getElementById(id);
  const ui = {
    status: $("hpStatus"), reset: $("hpReset"),
    build: $("hpBuild"), buildOut: $("hpBuildOut"),
    time: $("hpTime"), timeOut: $("hpTimeOut"),
    cut: $("hpCut"), cutOut: $("hpCutOut"),
    rotate: $("hpRotate"), seg: panel ? panel.querySelectorAll(".hp-seg button") : [],
    modeOut: $("hpModeOut"),
    fps: $("hpFps"), calls: $("hpCalls"), tris: $("hpTris"), pts: $("hpPts"),
    ticks: panel ? panel.querySelectorAll(".hp-ticks i") : [],
  };
  panel?.classList.add("is-loading");

  /* ---------- celular: painel vira dock com abas sobre o palco da casa ---------- */
  const dock = { fields: [], tabs: [], rot: null };
  function initDock(){
    if (!isNarrow || !panel) return;
    dock.fields = Array.from(panel.querySelectorAll(".hp-field[data-tab]"));
    if (!dock.fields.length) return;
    const bar = document.createElement("div");
    bar.className = "hp-tabs";
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", T("Parâmetros da maquete"));
    dock.fields.forEach((f, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hp-tab";
      b.textContent = T(f.dataset.tab);
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => selectTab(i));
      bar.appendChild(b);
      dock.tabs.push(b);
    });
    // girar sozinha + recentralizar viram ícones na própria barra
    const rot = document.createElement("button");
    rot.type = "button";
    rot.className = "hp-tab-ico";
    rot.setAttribute("aria-label", T("Rotação automática"));
    rot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>';
    rot.addEventListener("click", () => { ui.rotate?.click(); syncDockRot(); });
    bar.appendChild(rot);
    dock.rot = rot;
    panel.insertBefore(bar, dock.fields[0]);
    selectTab(0);
    syncDockRot();
  }
  function selectTab(i){
    dock.fields.forEach((f, j) => f.classList.toggle("is-tab", i === j));
    dock.tabs.forEach((t, j) => t.setAttribute("aria-selected", String(i === j)));
  }
  function syncDockRot(){ if (dock.rot && ui.rotate) dock.rot.setAttribute("aria-pressed", ui.rotate.getAttribute("aria-checked")); }
  // posiciona o dock na base do palco (entre a casa e GARCIA)
  function placeDock(){
    if (!isNarrow || !panel) return;
    const st = heroEl.querySelector(".hero-stage");
    if (!st) return;
    const hr = heroEl.getBoundingClientRect(), sr = st.getBoundingClientRect();
    panel.style.top = Math.round(sr.bottom - hr.top - panel.offsetHeight - 6) + "px";
  }
  initDock();

  /* ---------------- renderer ---------------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, alpha: true, powerPreference: "high-performance" });
  } catch (err){
    fail(T("3D indisponível neste dispositivo"));
    return;
  }
  let dpr = Math.min(window.devicePixelRatio || 1, LOW ? 1.25 : 1.6);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // só recalcula quando algo muda (luz/corte/construção)
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(LOW ? 40 : 30, 1, 0.5, 900);
  const TARGET = new THREE.Vector3(0, isNarrow ? -3.5 : 4.2, 0);
  const HOME = { radius: LOW ? 100 : 84, polar: THREE.MathUtils.degToRad(64), azimuth: THREE.MathUtils.degToRad(38) };
  setCameraSpherical(HOME.radius, HOME.polar, HOME.azimuth);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.55;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.45;
  const POLAR = { min: THREE.MathUtils.degToRad(44), max: THREE.MathUtils.degToRad(80) };
  controls.minPolarAngle = POLAR.min;
  controls.maxPolarAngle = POLAR.max;
  controls.minDistance = controls.maxDistance = HOME.radius;
  if (isTouch){
    // no toque o gesto vertical precisa rolar a página — sem arrasto na cena
    controls.disconnect();
    canvas.style.touchAction = "pan-y";
  }
  controls.update();

  function setCameraSpherical(r, phi, theta){
    const s = new THREE.Spherical(r, phi, theta);
    camera.position.setFromSpherical(s).add(TARGET);
    camera.lookAt(TARGET);
  }

  /* ---------------- pós-processamento ---------------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 1.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------------- estado / uniforms compartilhados ---------------- */
  const state = {
    build: 0, time: 0.82, cut: 1, natural: 0, mode: 0, codeManual: 0,
    autoRotate: !reduceMotion,
    pointer: new THREE.Vector2(), pointerSmooth: new THREE.Vector2(),
    ready: false, visible: true, fade: 0,
  };
  const U = {
    uTime: { value: 0 },
    uAccent: { value: new THREE.Color("#3d6bff") },
    uAccent2: { value: new THREE.Color("#7dd8ff") },
    uTerrain: { value: 0 }, uEdges: { value: 0 }, uSolid: { value: 0 },
    uInterior: { value: 0 }, uLand: { value: 0 }, uLight: { value: 0 },
    uNight: { value: 0.9 }, uNatural: { value: 0 }, uCode: { value: 0 },
    uCutY: { value: 999 }, uCutOn: { value: 0 },
    uYMin: { value: -1 }, uYMax: { value: 9 },
    uPR: { value: dpr }, uScale: { value: 400 },
  };
  function readTheme(){
    const cs = getComputedStyle(document.documentElement);
    const a = cs.getPropertyValue("--accent").trim() || "#3d6bff";
    const b = cs.getPropertyValue("--accent-2").trim() || "#7dd8ff";
    U.uAccent.value.setStyle(a);
    U.uAccent2.value.setStyle(b);
    if (edgeMats) edgeMats.forEach((m) => m.uniforms.uColor.value.copy(m.userData.useAccent2 ? U.uAccent2.value : U.uAccent.value));
  }
  let edgeMats = null;
  readTheme();
  document.addEventListener("themechange", () => requestAnimationFrame(readTheme));

  /* ---------------- mundo ---------------- */
  const world = new THREE.Group();     // tudo que gira junto (inclusive o sol → sombras estáveis)
  scene.add(world);

  const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x1a1408, 0.6);
  world.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.5);
  sun.castShadow = !LOW;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 160 });
  world.add(sun, sun.target);
  const moon = new THREE.DirectionalLight(0x7f9bff, 0);
  moon.position.set(-30, 40, -20);
  world.add(moon, moon.target);

  /* ---------- céu de partículas (mantido do hero anterior) ---------- */
  const stars = makeStars(LOW ? 380 : 700);
  scene.add(stars);

  /* ---------------- materiais ---------------- */

  // injeta revelação por altura ("impressão 3D"), corte de seção e poché
  function patchHouse(mat, stageKey, { glow = 1, poche = true } = {}){
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, {
        uStage: U[stageKey], uCutY: U.uCutY, uCutOn: U.uCutOn, uYMin: U.uYMin, uYMax: U.uYMax,
        uGlow: U.uAccent2, uGlowK: { value: glow }, uCode: U.uCode,
      });
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec3 vObj;
          uniform float uStage, uCutY, uCutOn, uYMin, uYMax, uGlowK, uCode;
          uniform vec3 uGlow;
          ${GLSL_HASH}`)
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
          float rY = mix(uYMin - 0.3, uYMax + 0.8, uStage);
          float dRev = rY - vObj.y;
          if (dRev < 0.0 || vObj.y > uCutY) discard;
          // frente de impressão dissolvida
          if (uStage < 0.999 && dRev < 0.45 && h13(floor(vObj * 18.0)) > dRev / 0.45) discard;
          float band = smoothstep(0.6, 0.0, dRev) * step(uStage, 0.999);
          float cutBand = smoothstep(0.1, 0.0, uCutY - vObj.y) * uCutOn;
          // casa → código: a massa se desfaz em blocos, com borda acesa
          float dCode = h13(floor(vObj * 2.5) + 3.1) * 0.8 + 0.1 - uCode * 1.6;
          if (uCode > 0.001 && dCode < 0.0) discard;
          float codeBand = smoothstep(0.06, 0.0, dCode) * step(0.001, uCode);`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          ${poche ? "if (!gl_FrontFacing && uCutOn > 0.5) diffuseColor.rgb = mix(uGlow * 0.08, vec3(0.02), 0.5);" : ""}`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          totalEmissiveRadiance += uGlow * (band * 3.2 + cutBand * 2.4 + codeBand * 0.7) * uGlowK;`);
    };
    mat.customProgramCacheKey = () => "house-" + stageKey + (poche ? "p" : "");
    return mat;
  }
  function houseDepthMaterial(stageKey){
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uStage: U[stageKey], uCutY: U.uCutY, uYMin: U.uYMin, uYMax: U.uYMax, uCode: U.uCode });
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObj;\nuniform float uStage, uCutY, uYMin, uYMax, uCode;\n" + GLSL_HASH)
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
          if (vObj.y > mix(uYMin - 0.3, uYMax + 0.8, uStage) || vObj.y > uCutY) discard;
          if (uCode > 0.001 && h13(floor(vObj * 2.5) + 3.1) * 0.8 + 0.1 < uCode * 1.6) discard;`);
    };
    m.customProgramCacheKey = () => "depth-" + stageKey;
    return m;
  }

  const matStructure = patchHouse(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.82, metalness: 0.0, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }), "uSolid");
  const matInterior = patchHouse(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }), "uInterior", { glow: 0.6 });
  const matGlass = patchHouse(new THREE.MeshStandardMaterial({
    color: 0x0c1422, roughness: 0.06, metalness: 0.85, transparent: true, opacity: 0.38,
    depthWrite: false, side: THREE.DoubleSide, emissive: 0xffa35c, emissiveIntensity: 0,
  }), "uSolid", { glow: 0.5, poche: false });
  const matLamps = patchHouse(new THREE.MeshStandardMaterial({
    color: 0xfff1de, roughness: 0.4, emissive: 0xffc27a, emissiveIntensity: 0,
  }), "uInterior", { glow: 0, poche: false });

  // terreno + rochas: superfície quase invisível no holograma, curvas de nível acesas
  const matLand = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0, transparent: true, depthWrite: true,
  });
  matLand.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uStage: U.uTerrain, uNatural: U.uNatural, uAccent: U.uAccent, uAccent2: U.uAccent2, uNight: U.uNight, uCode: U.uCode });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vObj;
        uniform float uStage, uNatural, uNight, uCode;
        uniform vec3 uAccent, uAccent2;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        float dC = length(vObj.xz * vec2(1.0, 1.25));
        float front = uStage * 95.0;
        if (dC > front) discard;
        float edgeFade = 1.0 - smoothstep(34.0, 58.0, dC);
        vec3 holo = mix(vec3(0.004, 0.006, 0.012), uAccent * 0.05, 0.5);
        // encosta atrás da casa se dissolve no alto (o título mora ali)
        float hFade = 1.0 - smoothstep(5.0, 17.0, vObj.y) * 0.75;
        diffuseColor.rgb = mix(holo, diffuseColor.rgb * 0.42, uNatural);
        diffuseColor.a = mix(0.55, 0.88, uNatural) * edgeFade * hFade * (1.0 - uCode * 0.85);
        // curvas de nível a cada 0.6 m
        float k = vObj.y / 0.6;
        float fw = fwidth(k);
        float iso = 1.0 - smoothstep(0.0, fw * 1.4, abs(fract(k - 0.5) - 0.5));
        float major = 1.0 - smoothstep(0.0, fw * 1.6, abs(fract(k / 5.0 - 0.5) - 0.5) * 5.0);
        float ring = smoothstep(7.0, 0.0, front - dC) * step(uStage, 0.999);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float isoK = mix(0.55, 0.12, uNatural) * edgeFade * (1.0 - uCode * 0.7);
        totalEmissiveRadiance += uAccent * (iso * 0.55 + major * 0.9) * isoK + uAccent2 * ring * 1.6 * edgeFade;`);
  };
  matLand.customProgramCacheKey = () => "land";

  function edgeMaterial(stageKey, { opacity = 1, accent2 = false } = {}){
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uStage: U[stageKey], uSolid: U.uSolid, uCutY: U.uCutY, uYMin: U.uYMin, uYMax: U.uYMax,
        uColor: { value: (accent2 ? U.uAccent2.value : U.uAccent.value).clone() }, uGlow: U.uAccent2,
        uOpacity: { value: opacity }, uNight: U.uNight, uCode: U.uCode,
      },
      vertexShader: /* glsl */`
        varying vec3 vObj;
        void main(){ vObj = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        varying vec3 vObj;
        uniform float uStage, uSolid, uCutY, uYMin, uYMax, uOpacity, uNight, uCode;
        uniform vec3 uColor, uGlow;
        void main(){
          float rY = mix(uYMin - 0.3, uYMax + 0.8, uStage);
          float d = rY - vObj.y;
          if (d < 0.0 || vObj.y > uCutY + 0.02) discard;
          float band = smoothstep(0.9, 0.0, d) * step(uStage, 0.999);
          float a = uOpacity * mix(0.95, 0.26 + 0.2 * uNight, uSolid);
          a *= 1.0 - smoothstep(0.0, 0.6, uCode) * 0.86; // vira fantasma: os glifos saem daqui
          vec3 c = mix(uColor, uGlow, band) * (1.0 + band * 3.0);
          gl_FragColor = vec4(c * a, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    m.userData.useAccent2 = accent2;
    return m;
  }

  function pointsMaterial(kind, { size = 1, alpha = 1 } = {}){
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: U.uTime, uPR: U.uPR, uScale: U.uScale,
        uStage: kind === 0 ? U.uTerrain : U.uLand,
        uNatural: U.uNatural, uNight: U.uNight, uCode: U.uCode,
        uAccent: U.uAccent, uAccent2: U.uAccent2,
        uSize: { value: size }, uAlpha: { value: alpha }, uKind: { value: kind },
        uMotion: { value: reduceMotion ? 0 : 1 },
      },
      vertexColors: true,
      vertexShader: /* glsl */`
        uniform float uTime, uPR, uScale, uStage, uNatural, uNight, uSize, uAlpha, uKind, uMotion, uCode;
        uniform vec3 uAccent, uAccent2;
        varying vec3 vCol; varying float vA;
        ${GLSL_HASH}
        void main(){
          vec3 p = position;
          float r = h13(p * 7.13);
          float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
          float vis, ring = 0.0;
          float dC = length(p.xz * vec2(1.0, 1.25));
          if (uKind < 0.5){
            float front = uStage * 95.0;
            vis = step(dC, front);
            ring = smoothstep(6.0, 0.0, front - dC) * vis * step(uStage, 0.999);
            p.y += (1.0 - vis) * -2.0;
          } else {
            float h = mix(-6.0, 30.0, uStage);
            vis = step(p.y, h) * step(r, uStage * 1.35);
            ring = smoothstep(2.5, 0.0, h - p.y) * vis * step(uStage, 0.999);
            // vento: balança mais na copa
            float sway = sin(uTime * 0.9 + p.y * 0.35 + p.x * 0.07) * 0.045 * max(p.y, 0.0) * uMotion;
            p.x += sway; p.z += sway * 0.6;
          }
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float s = uSize * (0.55 + r * 0.9) * (1.0 + ring * 1.4);
          gl_PointSize = vis * min(s * uScale / -mv.z, 4.2) * uPR;

          vec3 holo;
          if (uKind < 0.5)      holo = mix(uAccent, uAccent2, smoothstep(2.0, 16.0, p.y) * 0.6 + r * 0.25);
          else if (uKind < 1.5) holo = mix(uAccent, uAccent2, clamp(lum * 2.2 + r * 0.35, 0.0, 1.0));
          else if (uKind < 2.5) holo = uAccent * 0.7;
          else                  holo = uAccent2;
          vec3 nat = color * mix(1.25, 0.55, uNight);
          vCol = mix(holo, nat, uNatural) + uAccent2 * ring * 1.5;

          float edgeFade = 1.0 - smoothstep(36.0, 62.0, dC);
          float tw = 0.78 + 0.22 * sin(uTime * (1.2 + r * 2.0) + r * 40.0) * uMotion;
          float nearFade = uKind < 0.5 ? smoothstep(40.0, 72.0, -mv.z) : smoothstep(18.0, 40.0, -mv.z);
          vA = uAlpha * edgeFade * nearFade * tw * mix(1.0, 0.85, uNatural) * (1.0 - uCode * 0.92);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vCol; varying float vA;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.08, d) * vA;
          gl_FragColor = vec4(vCol, a);
        }`,
      transparent: true, depthWrite: false,
    });
  }

  function makeStars(n){
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++){
      const u = Math.random() * Math.PI * 2, v = Math.random() * 0.9 + 0.05; // só hemisfério superior
      const r = 180 + Math.random() * 160;
      pos[i*3] = Math.cos(u) * Math.cos(v) * r;
      pos[i*3+1] = Math.sin(v) * r * 0.8 - 10;
      pos[i*3+2] = Math.sin(u) * Math.cos(v) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uPR: U.uPR, uColor: U.uAccent2, uNight: U.uNight, uMotion: { value: reduceMotion ? 0 : 1 } },
      vertexShader: /* glsl */`
        uniform float uTime, uPR, uNight, uMotion; varying float vA;
        ${GLSL_HASH}
        void main(){
          float r = h13(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.0 + r * 2.2) * uPR;
          vA = (0.25 + 0.75 * uNight) * (0.35 + 0.65 * r) * (0.6 + 0.4 * sin(uTime * (0.6 + r) + r * 60.0) * uMotion + 0.4 * (1.0 - uMotion));
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(mix(vec3(1.0), uColor, 0.35), smoothstep(0.5, 0.0, d) * vA); }`,
      transparent: true, depthWrite: false,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }

  /* ---------------- luzes internas ---------------- */
  const interiorLights = [];

  /* ---------------- carregamento ---------------- */
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const modelUrl = new URL("../assets/models/casa.glb", import.meta.url).href;
  let totalPoints = 0;
  const pointClouds = [];

  loader.load(modelUrl, (gltf) => {
    const byName = {};
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLineSegments) byName[o.name] = o; });
    // o GLB vem quantizado (int16 + escala no nó). Os shaders trabalham no espaço
    // do objeto, então "assa" a transformação do nó em float32 uma única vez.
    const v = new THREE.Vector3();
    Object.values(byName).forEach((o) => {
      const src = o.geometry.attributes.position;
      const arr = new Float32Array(src.count * 3);
      for (let i = 0; i < src.count; i++){ v.fromBufferAttribute(src, i).applyMatrix4(o.matrixWorld); arr[i*3] = v.x; arr[i*3+1] = v.y; arr[i*3+2] = v.z; }
      o.geometry.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      o.geometry.computeBoundingBox();
      o.geometry.computeBoundingSphere();
      o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1);
    });

    const box = new THREE.Box3().setFromBufferAttribute(byName.house_structure.geometry.attributes.position);
    U.uYMin.value = box.min.y;
    U.uYMax.value = box.max.y;
    houseBox.copy(box);

    const assign = (name, material, opts = {}) => {
      const o = byName[name]; if (!o) return null;
      o.material = material;
      o.frustumCulled = opts.cull ?? true;
      if (opts.castShadow){ o.castShadow = true; o.customDepthMaterial = opts.depth; }
      if (opts.receiveShadow) o.receiveShadow = true;
      if (opts.order !== undefined) o.renderOrder = opts.order;
      world.add(o);
      return o;
    };

    assign("terrain", matLand, { receiveShadow: true, order: 0 });
    assign("rocks", matLand, { receiveShadow: true, order: 0 });
    assign("house_structure", matStructure, { castShadow: !LOW, depth: houseDepthMaterial("uSolid"), receiveShadow: true, order: 1 });
    assign("house_interior", matInterior, { receiveShadow: !LOW, order: 1 });
    assign("house_lamps", matLamps, { order: 1 });
    assign("house_glass", matGlass, { order: 3 });

    edgeMats = [
      edgeMaterial("uEdges", { opacity: 1.0 }),
      edgeMaterial("uEdges", { opacity: 0.32, accent2: true }),
      edgeMaterial("uEdges", { opacity: 0.55, accent2: true }),
    ];
    assign("edges_structure", edgeMats[0], { order: 4 });
    assign("edges_interior", edgeMats[1], { order: 4 });
    assign("edges_glass", edgeMats[2], { order: 4 });

    const clouds = [
      ["pts_terrain", 0, 1.0, 0.34],
      ["pts_trees", 1, 1.45, 0.85],
      ["pts_bark", 2, 1.0, 0.6],
      ["pts_plants", 3, 0.9, 0.8],
    ];
    clouds.forEach(([name, kind, size, alpha]) => {
      const o = assign(name, pointsMaterial(kind, { size, alpha }), { order: 5, cull: false });
      if (!o) return;
      const n = o.geometry.attributes.position.count;
      o.userData.full = n;
      if (LOW) o.geometry.setDrawRange(0, Math.floor(n * 0.55)); // amostra uniforme (pontos pré-embaralhados)
      totalPoints += o.geometry.drawRange.count === Infinity ? n : o.geometry.drawRange.count;
      pointClouds.push(o);
    });

    // luzes quentes internas — posições das luminárias do próprio modelo + térreo
    const lampPos = (byName.house_lamps?.userData?.lamps || []).map((a) => new THREE.Vector3().fromArray(a));
    const c = box.getCenter(new THREE.Vector3());
    const picks = [
      lampPos[0] ? lampPos[0].clone().setY(lampPos[0].y - 0.9) : new THREE.Vector3(3, 5.4, 5),
      lampPos[3] ? lampPos[3].clone().setY(lampPos[3].y - 0.9) : new THREE.Vector3(-3, 5.4, 5),
      new THREE.Vector3(c.x + 2.5, 1.9, c.z - 4),
      new THREE.Vector3(c.x - 2.5, 1.9, c.z + 3),
    ];
    picks.length = LOW ? 1 : 2; // poucas luzes: o brilho interno vem dos emissivos + bloom
    picks.forEach((p) => {
      const l = new THREE.PointLight(0xffb36b, 0, 9, 2);
      l.position.copy(p);
      world.add(l);
      interiorLights.push(l);
    });

    initCode(byName);
    applyTime(state.time);
    applyCut(state.cut);
    applyBuild(state.build);
    state.ready = true;
    panel?.classList.remove("is-loading");
    placeDock();
    setStatus(T(isTouch ? "maquete pronta" : "arraste para girar"));
    canvas.classList.add("is-ready");
    renderer.shadowMap.needsUpdate = true;
    maybeIntro();
  }, (xhr) => {
    if (xhr.lengthComputable) setStatus(`${T("carregando modelo")} ${Math.round(xhr.loaded / xhr.total * 100)}%`);
  }, (err) => {
    console.error("[hero3d] falha ao carregar o modelo", err);
    fail(T("não foi possível carregar a maquete"));
  });
  const houseBox = new THREE.Box3(new THREE.Vector3(-7, -1, -12), new THREE.Vector3(7, 9, 12));


  /* ================================================================
     CASA → CÓDIGO-FONTE
     Um único THREE.Points com ~4k glifos. Cada glifo nasce num ponto das
     arestas da maquete (espaço do mundo) e termina numa célula do bloco
     #heroCode (espaço da tela, medido no DOM). O shader mistura as duas
     posições em NDC, então a chegada é exata qualquer que seja a câmera.
     ================================================================ */
  const codeUI = { fig: $("heroCode"), text: $("heroCodeText"), gutter: $("heroCodeGutter") };
  const CODE_MAX = 640;                 // glifos "de verdade" (caracteres do código)
  const DUST = LOW ? 1300 : 3200;       // poeira de glifos que escoa junto e se apaga
  const SCRAMBLE = 94;                  // células 0..93 = ASCII imprimível (embaralhamento)
  const TK = ["", "tk-k", "tk-s", "tk-c", "tk-n", "tk-p", "tk-f"];
  let glyphs = null, glyphU = null, atlas = null;
  let codeSrc = "", codeRectKey = "", codeRectCheck = 0, codeVis = -1;

  function codeString(){
    const idx = Math.min(STAGES.length - 1, Math.floor(state.build * STAGES.length * 0.9999));
    const cut = state.cut >= 0.995 ? "null" : lerp(1.2, U.uYMax.value + 0.4, state.cut).toFixed(2);
    // o código "fala" o idioma do site (chaves, valores e comentários)
    const KS = {
      pt: { c1: "// casa_01.js · da planta ao código", mod: "arquitetura", cls: "Projeto", v: "casa", autor: "autor", de: "de", para: "para", deV: "arquitetura", etapa: "etapa", hora: "horario", corte: "corte", rot: "rotacao", c2: "// arquiteto -> desenvolvedor" },
      en: { c1: "// house_01.js · from floor plan to code", mod: "architecture", cls: "Project", v: "house", autor: "author", de: "from", para: "to", deV: "architecture", etapa: "stage", hora: "time", corte: "cut", rot: "rotation", c2: "// architect -> developer" },
      es: { c1: "// casa_01.js · del plano al código", mod: "arquitectura", cls: "Proyecto", v: "casa", autor: "autor", de: "de", para: "a", deV: "arquitectura", etapa: "etapa", hora: "horario", corte: "corte", rot: "rotacion", c2: "// arquitecto -> desarrollador" },
    };
    const k = KS[LANG] || KS.pt;
    return [
      k.c1,
      `import { ${k.cls} } from "@ag/${k.mod}";`,
      "",
      `export const ${k.v} = new ${k.cls}({`,
      `  ${k.autor}: "Alexandre Garcia",`,
      `  ${k.de}: "${k.deV}",`,
      `  ${k.para}: "software",`,
      `  ${k.etapa}: "${T(STAGES[idx])}",`,
      `  ${k.hora}: "${fmtHour(state.time)}",`,
      `  ${k.corte}: ${cut},`,
      `  ${k.rot}: ${state.autoRotate},`,
      "});",
      "",
      `${k.v}.render({ engine: "three@0.186" });`,
      k.c2,
    ].join("\n");
  }

  // realce de sintaxe mínimo: um "tipo" por caractere (mesmo mapa no DOM e no shader)
  function tokenize(src){
    const kinds = new Uint8Array(src.length);
    const re = /(\/\/[^\n]*)|("[^"\n]*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()[\];:,.=<>@-])/g;
    let m;
    while ((m = re.exec(src))){
      let k = 5;
      if (m[1]) k = 3;
      else if (m[2]) k = 2;
      else if (m[3]) k = 4;
      else if (m[4]){
        const w = m[4];
        if (/^(true|false|null)$/.test(w)) k = 4;
        else if (/^(import|from|export|const|new)$/.test(w)) k = 1;
        else k = (src[m.index + w.length] === "(" || /^[A-Z]/.test(w)) ? 6 : 0;
      }
      kinds.fill(k, m.index, m.index + m[0].length);
    }
    return kinds;
  }
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function renderCodeDom(src, kinds){
    let html = "", run = "", runK = -1;
    const flush = () => { if (run) html += runK > 0 ? `<span class="${TK[runK]}">${esc(run)}</span>` : esc(run); run = ""; };
    for (let i = 0; i < src.length; i++){
      const ch = src[i], k = ch === "\n" || ch === " " ? runK : kinds[i];
      if (k !== runK){ flush(); runK = k; }
      run += ch;
    }
    flush();
    codeUI.text.innerHTML = html;
    const n = src.split("\n").length;
    if (codeUI.gutter && codeUI.gutter.children.length !== n){
      codeUI.gutter.innerHTML = Array.from({ length: n }, (_, i) => `<li>${String(i + 1).padStart(2, "0")}</li>`).join("");
    }
  }

  // cor de cada tipo lida do CSS → o glifo pousa com a mesma cor do texto real
  function kindColors(){
    const out = [];
    const probe = document.createElement("span");
    codeUI.text.appendChild(probe);
    for (let k = 0; k < TK.length; k++){
      probe.className = TK[k];
      out.push(parseCssColor(getComputedStyle(probe).color));
    }
    probe.remove();
    return out;
  }
  function parseCssColor(str){
    const n = (str.match(/[\d.]+/g) || ["1", "1", "1"]).map(Number);
    const unit = /^color\(/.test(str);
    const [r, g, b] = unit ? n.slice(0, 3) : n.slice(0, 3).map((v) => v / 255);
    return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
  }

  // atlas de glifos desenhado com a mesma fonte do bloco (IBM Plex Mono)
  function buildAtlas(extraChars, ratio){
    const set = [];
    for (let c = 33; c < 127; c++) set.push(String.fromCharCode(c));
    for (const ch of extraChars) if (ch.trim() && !set.includes(ch)) set.push(ch);
    const cols = 16, rows = Math.ceil(set.length / cols), cell = 64;
    const cv = document.createElement("canvas");
    cv.width = cols * cell; cv.height = rows * cell;
    const ctx = cv.getContext("2d");
    const fpx = cell * ratio;
    ctx.font = `400 ${fpx}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const mt = ctx.measureText("Hg");
    const asc = mt.fontBoundingBoxAscent ?? fpx * 0.78, desc = mt.fontBoundingBoxDescent ?? fpx * 0.22;
    const base = cell / 2 + (asc - desc) / 2; // igual ao CSS: meia-entrelinha dos dois lados
    const map = new Map();
    set.forEach((ch, i) => {
      ctx.fillText(ch, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + base);
      map.set(ch, i);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    if (atlas) atlas.tex.dispose();
    atlas = { tex, map, cols, rows, ratio, cw: ctx.measureText("0").width / fpx };
    if (glyphU){ glyphU.uAtlas.value = tex; glyphU.uGrid.value.set(cols, rows); }
  }

  function initCode(byName){
    if (!codeUI.fig || !codeUI.text) return;
    // pontos de partida: sobre os segmentos das arestas (estrutura pesa mais)
    const segs = [];
    [["edges_structure", 0.72], ["edges_interior", 0.28]].forEach(([name, w]) => {
      const o = byName[name]; if (!o) return;
      const pos = o.geometry.attributes.position, idx = o.geometry.index;
      const nSeg = Math.floor((idx ? idx.count : pos.count) / 2);
      if (nSeg > 0) segs.push({ pos, idx, nSeg, w });
    });
    if (!segs.length) return;
    const N = CODE_MAX + DUST;
    const start = new Float32Array(N * 3), seed = new Float32Array(N);
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < N; i++){
      const sg = segs.length === 1 || Math.random() < segs[0].w ? segs[0] : segs[1];
      const k = Math.floor(Math.random() * sg.nSeg) * 2;
      const i0 = sg.idx ? sg.idx.getX(k) : k, i1 = sg.idx ? sg.idx.getX(k + 1) : k + 1;
      a.fromBufferAttribute(sg.pos, i0); b.fromBufferAttribute(sg.pos, i1);
      a.lerp(b, Math.random());
      start[i*3] = a.x; start[i*3+1] = a.y; start[i*3+2] = a.z;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(start, 3)); // ponto de partida
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aTarget", new THREE.BufferAttribute(new Float32Array(N * 2), 2));
    g.setAttribute("aChar", new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(N).fill(-1), 1));
    g.setAttribute("aDelay", new THREE.BufferAttribute(new Float32Array(N), 1));

    glyphU = {
      uCode: U.uCode, uTime: U.uTime, uPR: U.uPR, uGlow: U.uAccent2,
      uHand: { value: 0 }, uCell: { value: 20 }, uRes: { value: new THREE.Vector2(1, 1) },
      uAtlas: { value: null }, uGrid: { value: new THREE.Vector2(16, 7) },
      uKindCol: { value: Array.from({ length: TK.length }, () => new THREE.Color(1, 1, 1)) },
      uMotion: { value: reduceMotion ? 0 : 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: glyphU,
      vertexShader: /* glsl */`
        attribute float aSeed, aChar, aKind, aDelay;
        attribute vec2 aTarget;
        uniform float uCode, uTime, uPR, uCell, uHand, uMotion;
        uniform vec2 uRes;
        uniform vec3 uGlow;
        uniform vec3 uKindCol[${TK.length}];
        varying vec3 vCol; varying float vA, vChar;
        float hash(float n){ return fract(sin(n) * 43758.5453); }
        void main(){
          const float SPAN = 0.32;
          float raw = (uCode - aDelay * (1.0 - SPAN)) / SPAN;
          float t = clamp(raw, 0.0, 1.0);
          float e = t * t * (3.0 - 2.0 * t);
          float dust = step(aKind, -0.5);

          // partida: ponto da aresta projetado; chegada: célula do bloco de código
          vec4 cs = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec2 s = cs.xy / max(cs.w, 1e-3);
          vec2 g = vec2(aTarget.x / uRes.x * 2.0 - 1.0, 1.0 - aTarget.y / uRes.y * 2.0);
          vec2 c = mix(s, g, 0.4) + vec2((aSeed - 0.5) * 0.7, 0.28 + aSeed * 0.34);
          vec2 p = mix(mix(s, c, e), mix(c, g, e), e);
          gl_Position = vec4(p, 0.0, 1.0);

          float size = dust > 0.5 ? 0.5 : mix(0.62, 1.0, e);
          gl_PointSize = uCell * size * uPR;

          // no voo o caractere embaralha; ao pousar assenta no definitivo
          float settle = step(0.93, t) * (1.0 - dust);
          float tick = floor(uTime * 13.0 * uMotion + aSeed * 57.0);
          float scr = floor(hash(aSeed * 91.7 + tick * 1.37) * ${SCRAMBLE}.0);
          vChar = mix(scr, aChar, settle);

          vec3 kc = uKindCol[int(max(aKind, 0.0))];
          vCol = mix(uGlow * 1.05, kc, smoothstep(0.5, 1.0, t) * (1.0 - dust));
          float appear = smoothstep(-0.4, 0.0, raw);
          float dustOut = dust * smoothstep(0.45, 1.0, t);
          vA = appear * (1.0 - dustOut) * (1.0 - uHand) * (dust > 0.5 ? 0.75 : 1.0);
          if (vA < 0.004) gl_PointSize = 0.0;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uAtlas;
        uniform vec2 uGrid;
        varying vec3 vCol; varying float vA, vChar;
        void main(){
          float id = floor(vChar + 0.5);
          float col = mod(id, uGrid.x), row = floor(id / uGrid.x);
          vec2 uv = vec2((col + gl_PointCoord.x) / uGrid.x, 1.0 - (row + gl_PointCoord.y) / uGrid.y);
          float a = texture2D(uAtlas, uv).a * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vCol, a);
        }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    glyphs = new THREE.Points(g, mat);
    glyphs.frustumCulled = false;
    glyphs.renderOrder = 20;
    glyphs.visible = false;
    world.add(glyphs); // herda a rotação do mundo (cursor) no ponto de partida

    const fontReady = document.fonts?.load ? document.fonts.load('400 16px "IBM Plex Mono"') : Promise.resolve();
    fontReady.catch(() => {}).then(() => layoutCode(true));
    layoutCode(true);
  }

  function refreshCode(){ if (glyphs) layoutCode(false); }

  // (re)mede o bloco no DOM e distribui os destinos dos glifos
  function layoutCode(force){
    if (!glyphs || !codeUI.fig) return;
    const src = codeString();
    const textChanged = src !== codeSrc;
    if (!textChanged && !force) return;
    const kinds = tokenize(src);
    if (textChanged){ codeSrc = src; renderCodeDom(src, kinds); }

    if (isNarrow){ // celular: centraliza no "palco" entre as linhas do título
      const st = heroEl.querySelector(".hero-stage");
      if (st){
        const hr = heroEl.getBoundingClientRect(), sr = st.getBoundingClientRect();
        codeUI.fig.style.top = Math.max(0, sr.top - hr.top + sr.height / 2 - codeUI.fig.offsetHeight / 2) + "px";
      }
    }
    const cr = canvas.getBoundingClientRect();
    const tr = codeUI.text.getBoundingClientRect();
    const cst = getComputedStyle(codeUI.text);
    const fs = parseFloat(cst.fontSize), lh = parseFloat(cst.lineHeight) || fs * 1.7;
    codeRectKey = rectKey(tr, cr);

    const ratio = fs / lh;
    const missing = [...src].some((ch) => ch.trim() && !(atlas && atlas.map.has(ch)));
    if (!atlas || missing || Math.abs(atlas.ratio - ratio) > 0.01){
      buildAtlas(src, ratio);
      glyphU.uKindCol.value = kindColors();
    }
    const cw = atlas.cw * fs;
    glyphU.uCell.value = lh;
    glyphU.uRes.value.set(cr.width, cr.height);

    const g = glyphs.geometry;
    const T = g.attributes.aTarget.array, C = g.attributes.aChar.array, K = g.attributes.aKind.array;
    const D = g.attributes.aDelay.array, S = g.attributes.aSeed.array;
    const ox = tr.left - cr.left, oy = tr.top - cr.top;
    const lines = src.split("\n"), nl = lines.length;
    const slots = [];
    let i = 0, n = 0;
    lines.forEach((line, li) => {
      for (let col = 0; col < line.length; col++, i++){
        const ch = line[col];
        if (!ch.trim() || n >= CODE_MAX) continue;
        T[n*2] = ox + (col + 0.5) * cw; T[n*2+1] = oy + (li + 0.5) * lh;
        C[n] = atlas.map.get(ch) ?? 0;
        K[n] = kinds[i];
        // de cima para baixo, como se o código fosse sendo escrito
        D[n] = (li / nl) * 0.62 + (col / 48) * 0.1 + S[n] * 0.16;
        slots.push(n);
        n++;
      }
      i++; // "\n"
    });
    const N = C.length;
    for (let j = n; j < N; j++){
      const t = slots.length ? slots[Math.floor(S[j] * 997) % slots.length] : 0;
      T[j*2] = T[t*2] + Math.sin(j * 12.9898) * cw * 3;
      T[j*2+1] = T[t*2+1] + Math.cos(j * 78.233) * lh;
      K[j] = -1; C[j] = 0;
      D[j] = S[j] * 0.85;
    }
    ["aTarget", "aChar", "aKind", "aDelay"].forEach((k) => { g.attributes[k].needsUpdate = true; });
  }
  function rectKey(tr, cr){
    return `${Math.round(tr.left - cr.left)},${Math.round(tr.top - cr.top)},${Math.round(tr.width)},${Math.round(cr.width)},${Math.round(cr.height)}`;
  }

  // a cada frame: mistura scroll + modo do painel e faz a passagem de bastão
  function updateCode(){
    const scrollCode = ss(scrollP, 0.46, 0.86);
    const code = Math.max(scrollCode, state.codeManual);
    if (code !== U.uCode.value){
      if (U.uCode.value === 0 && code > 0) layoutCode(true);
      U.uCode.value = code;
      renderer.shadowMap.needsUpdate = true;
    }
    if (!glyphs && code > 0 && !codeSrc && codeUI.text){ codeSrc = codeString(); renderCodeDom(codeSrc, tokenize(codeSrc)); }
    const hand = glyphs ? ss(code, 0.9, 1.0) : ss(code, 0.3, 0.6);
    if (glyphU) glyphU.uHand.value = hand;
    if (glyphs) glyphs.visible = code > 0.001 && hand < 0.999;
    // o bloco pode ter se mexido (fontes, título reajustado): confere de vez em quando
    if (glyphs && code > 0 && ++codeRectCheck % 20 === 0){
      if (rectKey(codeUI.text.getBoundingClientRect(), canvas.getBoundingClientRect()) !== codeRectKey) layoutCode(true);
    }
    if (codeUI.fig && hand !== codeVis){
      codeVis = hand;
      codeUI.fig.style.opacity = hand.toFixed(3);
      codeUI.fig.style.visibility = hand > 0.001 ? "visible" : "hidden";
      codeUI.fig.classList.toggle("is-on", hand > 0.5);
      codeUI.fig.setAttribute("aria-hidden", String(hand < 0.5));
    }
  }

  /* ---------------- parâmetros → cena ---------------- */
  const STAGES = ["Terreno", "Estrutura", "Superfícies", "Interior", "Vegetação", "Luz"];
  const ss = THREE.MathUtils.smoothstep;
  const lerp = THREE.MathUtils.lerp;

  function applyBuild(b){
    state.build = b;
    U.uTerrain.value = ss(b, 0.0, 0.16);
    U.uEdges.value = ss(b, 0.12, 0.40);
    U.uSolid.value = ss(b, 0.36, 0.62);
    U.uInterior.value = ss(b, 0.56, 0.78);
    U.uLand.value = ss(b, 0.70, 0.90);
    U.uLight.value = ss(b, 0.86, 1.0);
    const idx = Math.min(STAGES.length - 1, Math.floor(b * STAGES.length * 0.9999));
    if (ui.buildOut) ui.buildOut.textContent = T(STAGES[idx]);
    ui.ticks.forEach((t, i) => t.classList.toggle("on", i <= idx));
    syncRange(ui.build, b);
    updateLights();
    refreshCode();
    renderer.shadowMap.needsUpdate = true;
  }

  function hourOf(t){ return 11 + t * 12.5; } // 11:00 → 23:30
  function fmtHour(t){
    const hour = hourOf(t);
    const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60 / 5) * 5;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  function applyTime(t){
    state.time = t;
    const hour = hourOf(t);
    if (ui.timeOut) ui.timeOut.textContent = fmtHour(t);
    syncRange(ui.time, t);

    const night = ss(hour, 18.6, 21.5);
    const dusk = ss(hour, 16.5, 19.2) * (1 - ss(hour, 20.5, 22.5));
    U.uNight.value = night;

    // sol percorre o céu (elevação cai até abaixo do horizonte)
    const el = THREE.MathUtils.degToRad(62 * Math.cos(THREE.MathUtils.clamp((hour - 12.5) / 7.2, -1, 1.25) * Math.PI / 2));
    const az = THREE.MathUtils.degToRad(-40 + (hour - 11) * 9);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    sun.position.copy(dir).multiplyScalar(70);
    sun.target.position.set(0, 0, 0);
    const up = ss(el, THREE.MathUtils.degToRad(-3), THREE.MathUtils.degToRad(14));
    sun.intensity = 3.1 * up;
    sun.color.set(0xfff3e2).lerp(new THREE.Color(0xff8a45), dusk);
    moon.intensity = 0.55 * night;

    const dark = ss(hour, 17.2, 20.6);
    hemi.intensity = lerp(0.85, 0.08, dark);
    hemi.color.set(0xcfe0ff).lerp(new THREE.Color(0xff9a6a), dusk * 0.45).lerp(new THREE.Color(0x24306a), night);
    scene.environmentIntensity = lerp(0.6, 0.05, dark);
    renderer.toneMappingExposure = lerp(1.0, 1.15, night);
    // bloom só "pega" o que emite luz: limiar alto de dia, mais baixo à noite
    bloom.threshold = lerp(1.7, 0.72, dark);
    bloom.strength = lerp(0.35, 0.75, dark);

    // fundo do hero acompanha o céu
    const bg = heroEl.querySelector(".hero-bg");
    if (bg){
      bg.style.setProperty("--sky-day", (1 - night) * 0.16);
      bg.style.setProperty("--sky-dusk", dusk * 0.14);
    }
    updateLights();
    renderer.shadowMap.needsUpdate = true;
    refreshCode();
  }

  function updateLights(){
    const hour = hourOf(state.time);
    const lampsOn = lerp(0.18, 1, ss(hour, 16.5, 20));
    const L = U.uLight.value * lampsOn;
    interiorLights.forEach((l) => { l.intensity = L * 16; });
    matLamps.emissiveIntensity = L * 6;
    matGlass.emissiveIntensity = L * (0.15 + U.uNight.value * 1.1);
  }

  function applyCut(v){
    state.cut = v;
    syncRange(ui.cut, v);
    updateCut();
    refreshCode();
  }
  function updateCut(){
    const scrollCut = 1 - ss(scrollP, 0.06, 0.34) * 0.95;
    const v = Math.min(state.cut, scrollCut);
    const y = lerp(1.2, U.uYMax.value + 0.4, v);
    const on = v < 0.995;
    U.uCutY.value = on ? y : 999;
    U.uCutOn.value = on ? 1 : 0;
    if (ui.cutOut) ui.cutOut.textContent = state.cut >= 0.995 ? T("sem corte") : `+${lerp(1.2, U.uYMax.value + 0.4, state.cut).toFixed(2)} m`;
    renderer.shadowMap.needsUpdate = true;
  }

  function setNatural(on){
    state.natural = on ? 1 : 0;
    if (window.gsap && !reduceMotion) window.gsap.to(U.uNatural, { value: state.natural, duration: 1.1, ease: "power2.inOut" });
    else U.uNatural.value = state.natural;
  }
  // 0 holograma · 1 natural · 2 código-fonte
  function setMode(m){
    const prev = state.mode;
    state.mode = m;
    ui.seg.forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.mat === m)));
    if (ui.modeOut) ui.modeOut.textContent = T(m === 2 ? "código-fonte" : "arquitetura");
    if (m !== 2) setNatural(m === 1);
    const to = m === 2 ? 1 : 0;
    if (to === 1 && prev !== 2) layoutCode(true);
    if (window.gsap && !reduceMotion){
      window.gsap.to(state, { codeManual: to, duration: to ? 3.8 : 2.6, ease: to ? "power1.inOut" : "power2.inOut", overwrite: true });
    } else state.codeManual = to;
  }

  function syncRange(input, v){
    if (!input) return;
    if (document.activeElement !== input || input.dataset.fromCode) input.value = Math.round(v * 1000);
    input.parentElement.style.setProperty("--v", v.toFixed(4));
  }

  /* ---------------- UI ---------------- */
  let introTween = null;
  ui.build?.addEventListener("input", () => { introTween?.kill(); introTween = null; applyBuild(ui.build.value / 1000); });
  ui.time?.addEventListener("input", () => applyTime(ui.time.value / 1000));
  ui.cut?.addEventListener("input", () => applyCut(ui.cut.value / 1000));
  ui.seg.forEach((b) => b.addEventListener("click", () => setMode(+b.dataset.mat)));
  ui.rotate?.setAttribute("aria-checked", String(state.autoRotate));
  ui.rotate?.addEventListener("click", () => {
    state.autoRotate = !state.autoRotate;
    controls.autoRotate = state.autoRotate;
    ui.rotate.setAttribute("aria-checked", String(state.autoRotate));
    refreshCode();
  });
  ui.reset?.addEventListener("click", () => {
    const from = { r: camera.position.distanceTo(controls.target), t: controls.getAzimuthalAngle(), p: controls.getPolarAngle() };
    const to = { r: HOME.radius, t: HOME.azimuth, p: HOME.polar };
    let dt = to.t - from.t; dt = Math.atan2(Math.sin(dt), Math.cos(dt));
    const o = { k: 0 };
    const run = (k) => { setCameraSpherical(lerp(from.r, to.r, k), lerp(from.p, to.p, k), from.t + dt * k); };
    if (window.gsap && !reduceMotion) window.gsap.to(o, { k: 1, duration: 1.2, ease: "power3.inOut", onUpdate: () => run(o.k) });
    else run(1);
  });

  // mouse: a maquete "olha" levemente para o cursor
  if (!isTouch && !reduceMotion){
    window.addEventListener("pointermove", (e) => {
      state.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
  }

  function setStatus(t){ if (ui.status) ui.status.textContent = t; }
  function fail(msg){
    setStatus(msg);
    panel?.classList.add("is-loading");
    canvas.style.display = "none";
  }

  /* ---------------- intro (depois do loader) ---------------- */
  function maybeIntro(){
    const go = () => {
      if (reduceMotion || !window.gsap){ applyBuild(1); return; }
      const o = { b: state.build };
      introTween = window.gsap.to(o, {
        b: 1, duration: 6.2, ease: "power1.inOut", delay: 0.2,
        onUpdate: () => applyBuild(o.b),
        onComplete: () => { introTween = null; },
      });
      // câmera entra de mais longe, girando até a posição de repouso
      const cam = { k: 0 };
      const r0 = HOME.radius * 1.45, p0 = THREE.MathUtils.degToRad(52), t0 = HOME.azimuth + 0.9;
      window.gsap.to(cam, {
        k: 1, duration: 5.2, ease: "power3.out",
        onUpdate: () => { camIntro = cam.k; setCameraSpherical(lerp(r0, HOME.radius, cam.k), lerp(p0, HOME.polar, cam.k), lerp(t0, HOME.azimuth, cam.k)); },
        onComplete: () => { camIntro = 1; },
      });
    };
    if (window.__heroLoaderDone) go();
    else document.addEventListener("loader:done", go, { once: true });
  }
  let camIntro = reduceMotion ? 1 : 0;

  /* ---------------- scroll (timeline pinada em main.js escreve heroScroll.p) ---------------- */
  const scrollProxy = (window.heroScroll = window.heroScroll || { p: 0 });
  let scrollP = 0;

  /* ---------------- resize ---------------- */
  function resize(){
    const w = canvas.clientWidth || heroEl.clientWidth;
    const h = canvas.clientHeight || heroEl.clientHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.resolution.set(w * (LOW ? 0.35 : 0.5), h * (LOW ? 0.35 : 0.5));
    camera.aspect = w / h;
    // telas estreitas: abre o campo de visão pra casa caber
    camera.fov = (LOW ? 40 : 30) * (w / h < 1 ? 1.35 : w / h < 1.3 ? 1.12 : 1);
    camera.updateProjectionMatrix();
    U.uPR.value = dpr;
    U.uScale.value = h * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.06;
    if (glyphs) layoutCode(true);
    placeDock();
  }
  new ResizeObserver(resize).observe(canvas);
  document.fonts?.ready.then(() => requestAnimationFrame(placeDock));
  window.addEventListener("load", placeDock);
  resize();

  /* ---------------- loop ---------------- */
  let lastTs = 0;
  let raf = 0, running = false;
  let frames = 0, acc = 0, statT = 0, perfFrames = 0, perfAcc = 0, qualityStep = 0;

  function frame(ts){
    raf = requestAnimationFrame(frame);
    const dt = lastTs ? THREE.MathUtils.clamp((ts - lastTs) / 1000, 0, 0.1) : 0.016;
    lastTs = ts;
    if (!reduceMotion) U.uTime.value += dt;

    // scroll → câmera desce para vista de planta + corte
    if (scrollProxy.p !== scrollP){ scrollP = scrollProxy.p; updateCut(); }
    const e = ss(scrollP, 0.0, 0.42);
    if (camIntro >= 1){
      const r = HOME.radius * (1 - 0.3 * e);
      controls.minDistance = controls.maxDistance = r;
      controls.minPolarAngle = lerp(POLAR.min, 0.08, e);
      controls.maxPolarAngle = lerp(POLAR.max, 0.1, e);
      controls.update(dt);
    }

    // cursor
    state.pointerSmooth.lerp(state.pointer, 0.045);
    world.rotation.y = state.pointerSmooth.x * 0.14;
    world.rotation.x = state.pointerSmooth.y * 0.035;
    stars.rotation.y += dt * 0.004;

    // opacidade do canvas: entra quando pronto, some no fim do scroll
    updateCode();
    // o canvas some no fim; o bloco de código (DOM) continua e sobe com a página
    const targetFade = state.ready ? 1 - ss(scrollP, 0.9, 1.0) : 0;
    state.fade += (targetFade - state.fade) * (reduceMotion ? 1 : 0.08);
    canvas.style.opacity = state.fade.toFixed(3);

    renderer.info.reset();
    composer.render(dt);

    // estatísticas reais + qualidade adaptativa
    frames++; acc += dt; statT += dt;
    if (statT > 0.5){
      if (ui.fps) ui.fps.textContent = Math.round(frames / acc);
      if (ui.calls) ui.calls.textContent = renderer.info.render.calls;
      if (ui.tris) ui.tris.textContent = fmtK(renderer.info.render.triangles);
      if (ui.pts) ui.pts.textContent = fmtK(renderer.info.render.points);
      frames = 0; acc = 0; statT = 0;
    }
    if (state.ready && qualityStep < 2 && !/[?&]hq/.test(location.search)){
      perfFrames++; perfAcc += dt;
      if (perfFrames === 90){
        const avg = perfAcc / perfFrames;
        if (avg > 1 / 40) degrade();
        perfFrames = 0; perfAcc = 0;
      }
    }
  }
  function fmtK(n){ return n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "k" : String(n); }
  function degrade(){
    qualityStep++;
    if (qualityStep === 1){ dpr = Math.min(dpr, 1); resize(); }
    else {
      pointClouds.forEach((o) => o.geometry.setDrawRange(0, Math.floor(o.userData.full * 0.5)));
      bloom.resolution.multiplyScalar(0.6);
    }
  }

  function start(){ if (running) return; running = true; lastTs = 0; raf = requestAnimationFrame(frame); }
  function stop(){ running = false; cancelAnimationFrame(raf); }

  const io = new IntersectionObserver((entries) => {
    state.visible = entries[0].isIntersecting;
    if (state.visible && !document.hidden) start(); else stop();
  }, { threshold: 0 });
  io.observe(heroEl);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else if (state.visible) start();
  });
  start();

  // debug/QA
  window.__hero3d = { bloom, scene, sun, hemi, world, composer, state, U, applyBuild, applyTime, applyCut, setNatural, setMode, layoutCode, camera, controls, renderer };
}
