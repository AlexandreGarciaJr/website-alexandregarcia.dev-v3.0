/* ================================================================
   MEDIÇÃO — Google Analytics 4 · Meta Pixel · Microsoft Clarity
   ----------------------------------------------------------------
   1) Cole os SEUS IDs abaixo (nunca os da New Arrays).
      Campo vazio = aquela ferramenta não carrega.
   2) GA4 roda sempre (medição agregada, sem anúncios). Meta Pixel e
      Clarity só carregam se a pessoa clicar em Aceitar no aviso (LGPD).
      O Google recebe o Consent Mode v2: publicidade negada até o aceite.
   3) Eventos: window.agTrack("nome", { ... }) envia para GA4 e Meta.
      - generate_lead     → formulário de contato enviado com sucesso
      - contact_whatsapp  → clique em qualquer link de WhatsApp
      - lovequest_open    → abriu a apresentação do Love Quest
      - lovequest_play    → clicou em "Jogar agora"
   ================================================================ */
(function(){
  "use strict";

  var CONFIG = {
    GA4_ID: "G-PXPDMZ993N", // ex.: "G-XXXXXXXXXX"   (GA4 › Admin › Fluxos de dados › Web)
    META_PIXEL_ID: "1373209681550362", // ex.: "123456789012345" (Gerenciador de Eventos › Conjunto de dados)
    CLARITY_ID: "yxwzoqtpoq", // ex.: "abcd1234ef"      (Clarity › Settings › Overview)
    DEBUG: false         // true = mostra no console cada evento enviado (útil nos testes)
  };

  var KEY = "agConsent";       // { marketing: bool, v: 2, ts }
  var VERSION = 2;             // mude se a política mudar: o aviso aparece de novo
  var T = function(s){ return (window.I18N && window.I18N.t) ? window.I18N.t(s) : s; };
  var log = function(){ if (CONFIG.DEBUG && window.console) console.log.apply(console, ["[agTrack]"].concat([].slice.call(arguments))); };

  /* ---------- Consent Mode v2 ----------
     Análise (GA4) sempre ativa: medição agregada, sem anúncios nem perfis.
     Publicidade (Meta Pixel, Google Ads) e gravações (Clarity) só com aceite. */
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  window.gtag("consent", "default", {
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    analytics_storage: "granted", functionality_storage: "granted", security_storage: "granted",
    wait_for_update: 500
  });

  function read(){
    try { var c = JSON.parse(localStorage.getItem(KEY)); return c && c.v === VERSION ? c : null; } catch (e){ return null; }
  }
  function save(c){
    c.v = VERSION; c.ts = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e){}
  }

  /* ---------- carregadores ---------- */
  var loaded = { ga: false, meta: false, clarity: false };
  function addScript(src){ var s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); }

  function loadGA(){
    if (loaded.ga || !CONFIG.GA4_ID) return;
    loaded.ga = true;
    addScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CONFIG.GA4_ID));
    window.gtag("js", new Date());
    window.gtag("config", CONFIG.GA4_ID, { debug_mode: CONFIG.DEBUG || undefined });
    log("GA4 carregado", CONFIG.GA4_ID);
  }
  function loadMeta(){
    if (loaded.meta || !CONFIG.META_PIXEL_ID) return;
    loaded.meta = true;
    /* código-base oficial do Meta Pixel */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,"script","https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CONFIG.META_PIXEL_ID);
    window.fbq("track", "PageView");
    log("Meta Pixel carregado", CONFIG.META_PIXEL_ID);
  }
  function loadClarity(){
    if (loaded.clarity || !CONFIG.CLARITY_ID) return;
    loaded.clarity = true;
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", CONFIG.CLARITY_ID);
    window.clarity("consentv2", { ad_Storage: "granted", analytics_Storage: "granted" });
    log("Clarity carregado", CONFIG.CLARITY_ID);
  }

  function apply(c){
    var g = c.marketing ? "granted" : "denied";
    window.gtag("consent", "update", { ad_storage: g, ad_user_data: g, ad_personalization: g });
    if (c.marketing){ loadMeta(); loadClarity(); if (window.fbq) window.fbq("consent", "grant"); }
    else if (window.fbq){ window.fbq("consent", "revoke"); }
  }

  /* ---------- API de eventos ---------- */
  var META_MAP = { generate_lead: "Lead", contact_whatsapp: "Contact" };
  window.agTrack = function(name, params){
    params = params || {};
    var c = read() || {};
    if (loaded.ga) window.gtag("event", name, params);
    if (c.marketing && loaded.meta && window.fbq){
      if (META_MAP[name]) window.fbq("track", META_MAP[name], params);
      else window.fbq("trackCustom", name, params);
    }
    log(name, params);
  };

  // clique em WhatsApp (botão flutuante, contato, rodapé…): delegação, pega qualquer link novo
  document.addEventListener("click", function(e){
    var a = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (!a) return;
    var where = a.classList.contains("wa-float") ? "botao_flutuante" : ((a.closest("section, footer, [id]") || {}).id || "pagina");
    window.agTrack("contact_whatsapp", { link_location: where, page_path: location.pathname });
  }, true);

  /* ---------- aviso de cookies: aceitar ou recusar ---------- */
  function banner(){
    if (document.getElementById("agConsent")) return document.getElementById("agConsent");
    var el = document.createElement("div");
    el.id = "agConsent";
    el.className = "agc";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", T("Preferências de cookies"));
    el.setAttribute("aria-describedby", "agcDesc");
    el.innerHTML =
      '<span class="agc-q" id="agcDesc"><span class="agc-p" aria-hidden="true">&gt;</span>' +
        T("Este site usa cookies da Meta e da Microsoft para medir os anúncios e entender como as pessoas navegam por aqui. Você aceita?") +
        '<span class="agc-cur" aria-hidden="true"></span></span>' +
      '<span class="agc-btns">' +
        '<button type="button" class="agc-b agc-ok">[ ' + T("aceitar") + ' ]</button>' +
        '<button type="button" class="agc-b agc-no">[ ' + T("recusar") + ' ]</button>' +
      '</span>' +
      '<a class="agc-lk" href="privacidade.html">' + T("privacidade") + '</a>';
    document.body.appendChild(el);
    function done(on){
      var prev = read();
      save({ marketing: on }); apply({ marketing: on });
      el.classList.remove("is-on"); document.documentElement.classList.remove("agc-open");
      setTimeout(function(){ el.hidden = true; }, 400);
      if (!on && prev && prev.marketing) location.reload(); // retirou o consentimento: limpa o que já rodou
    }
    el.querySelector(".agc-ok").addEventListener("click", function(){ done(true); });
    el.querySelector(".agc-no").addEventListener("click", function(){ done(false); });
    return el;
  }
  function open(){
    var el = banner();
    el.hidden = false;
    // no celular, os botões flutuantes (som, ajustes, WhatsApp) sobem para não ficar atrás do aviso
    document.documentElement.style.setProperty("--agc-h", (el.offsetHeight + 12) + "px");
    document.documentElement.classList.add("agc-open");
    requestAnimationFrame(function(){ el.classList.add("is-on"); });
  }
  window.AGConsent = { open: open, get: read };

  /* o aviso só entra depois que o loader terminou e o hero 3D carregou
     (ou, em páginas sem loader/hero, depois do carregamento da página) */
  function whenSiteReady(cb){
    var fired = false;
    var needLoader = !!document.getElementById("loader");
    var needHero = !!document.getElementById("heroCanvas");
    function ok(){ return (!needLoader || window.__heroLoaderDone) && (!needHero || window.__heroReady); }
    function check(){ if (!fired && ok()){ fired = true; cb(); } }
    if (!needLoader && !needHero){
      if (document.readyState === "complete") cb(); else window.addEventListener("load", cb, { once: true });
      return;
    }
    document.addEventListener("loader:done", check);
    document.addEventListener("hero:ready", check);
    check();
    setTimeout(function(){ if (!fired){ fired = true; cb(); } }, 15000); // segurança: se o 3D falhar, o aviso aparece mesmo assim
  }

  function boot(){
    loadGA(); // análise agregada: sempre ativa
    var c = read();
    if (c) apply(c);
    else if (CONFIG.META_PIXEL_ID || CONFIG.CLARITY_ID) whenSiteReady(function(){ setTimeout(open, 2000); }); // sem Pixel/Clarity = sem aviso
    document.querySelectorAll("[data-cookie-prefs]").forEach(function(b){
      b.addEventListener("click", function(e){ e.preventDefault(); open(); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
