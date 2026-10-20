/* ================================================================
   i18n — Português (original) · English · Español
   ----------------------------------------------------------------
   Como funciona:
   • O HTML continua escrito em português (é o "idioma-fonte").
   • Este script roda ANTES do main.js e troca, de forma síncrona,
     todo texto/atributo que tiver tradução no dicionário abaixo —
     assim os efeitos (glitch, títulos quebrados em letras, etc.) já
     nascem no idioma certo.
   • Trechos com negrito/links usam data-i18n-html="chave".
   • Textos criados por JS usam window.I18N.t("texto em português").
   • Trocar idioma (menu de configurações) salva a escolha e recarrega
     a página por trás do véu de transição.
   • Primeira visita: segue o idioma do navegador (en → inglês,
     es → espanhol, qualquer outro → português).
   ================================================================ */
(function(){
  "use strict";
  const LANGS = ["pt", "en", "es"];
  const HTML_LANG = { pt: "pt-BR", en: "en", es: "es" };

  function detect(){
    try {
      const saved = localStorage.getItem("agLang");
      if (LANGS.includes(saved)) return saved;
    } catch (e){}
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "pt";
    const base = nav.slice(0, 2).toLowerCase();
    return base === "en" ? "en" : base === "es" ? "es" : "pt";
  }
  const lang = detect();

  /* ---------- dicionário: "texto em português": [inglês, espanhol] ---------- */
  const D = {
    // <title> / meta
    "Alexandre Garcia | Desenvolvedor Full-Stack": ["Alexandre Garcia | Full-Stack Developer", "Alexandre Garcia | Desarrollador Full-Stack"],
    "Contato — Alexandre Garcia | Desenvolvedor Full-Stack": ["Contact — Alexandre Garcia | Full-Stack Developer", "Contacto — Alexandre Garcia | Desarrollador Full-Stack"],
    "Contato — Alexandre Garcia": ["Contact — Alexandre Garcia", "Contacto — Alexandre Garcia"],
    "Olá, sou Alexandre Garcia, desenvolvedor fullstack especializado em criar sites e aplicações modernas. Veja meus projetos e entre em contato.": ["Hi, I'm Alexandre Garcia, a full-stack developer who builds modern websites and applications. See my projects and get in touch.", "Hola, soy Alexandre Garcia, desarrollador full-stack especializado en crear sitios y aplicaciones modernas. Mira mis proyectos y ponte en contacto."],
    "Vamos trabalhar juntos? Entre em contato com Alexandre Garcia para o seu próximo projeto de desenvolvimento web.": ["Shall we work together? Get in touch with Alexandre Garcia for your next web development project.", "¿Trabajamos juntos? Contacta a Alexandre Garcia para tu próximo proyecto de desarrollo web."],
    "Vamos trabalhar juntos? Entre em contato para o seu próximo projeto.": ["Shall we work together? Get in touch for your next project.", "¿Trabajamos juntos? Ponte en contacto para tu próximo proyecto."],

    // navegação / menu / rodapé
    "Sobre": ["About", "Sobre mí"],
    "Experiência": ["Experience", "Experiencia"],
    "Projetos": ["Projects", "Proyectos"],
    "Formação": ["Education", "Formación"],
    "Contato": ["Contact", "Contacto"],
    "Trajetória": ["Career", "Trayectoria"],
    "Menu": ["Menu", "Menú"],
    "MENU": ["MENU", "MENÚ"],
    "FECHAR": ["CLOSE", "CERRAR"],
    "não foi possível enviar agora": ["couldn't send it right now", "no fue posible enviarlo ahora"],
    "são paulo, brasil": ["são paulo, brazil", "são paulo, brasil"],
    "disponível para novos projetos": ["available for new projects", "disponible para nuevos proyectos"],
    "Disponível para novos projetos": ["Available for new projects", "Disponible para nuevos proyectos"],
    "Estou disponível para novos projetos, entre em contato e será um prazer atendê-lo(a).": ["I'm available for new projects — get in touch and I'll be glad to help.", "Estoy disponible para nuevos proyectos: escríbeme y será un placer atenderte."],
    "© 2025 Alexandre Garcia. Todos os direitos reservados.": ["© 2025 Alexandre Garcia. All rights reserved.", "© 2025 Alexandre Garcia. Todos los derechos reservados."],
    "Feito com ☕ e JavaScript": ["Made with ☕ and JavaScript", "Hecho con ☕ y JavaScript"],
    "Navegação por seção": ["Section navigation", "Navegación por sección"],
    "Falar no WhatsApp": ["Chat on WhatsApp", "Hablar por WhatsApp"],
    "Abrir menu": ["Open menu", "Abrir menú"],
    "Logo Alexandre Garcia": ["Alexandre Garcia logo", "Logo de Alexandre Garcia"],
    "Seções": ["Sections", "Secciones"],

    // configurações
    "Ligar/desligar música": ["Music on/off", "Activar/desactivar música"],
    "Abrir configurações": ["Open settings", "Abrir configuración"],
    "Configurações": ["Settings", "Configuración"],
    "Fechar": ["Close", "Cerrar"],
    "Tema azul": ["Blue theme", "Tema azul"],
    "Tema violeta": ["Violet theme", "Tema violeta"],
    "Tema esmeralda": ["Emerald theme", "Tema esmeralda"],
    "Tema âmbar": ["Amber theme", "Tema ámbar"],
    "tema": ["theme", "tema"],
    "trilha sonora": ["soundtrack", "banda sonora"],
    "atmosférico · espaço": ["atmospheric · space", "atmosférico · espacio"],
    "retro · sintetizador": ["retro · synthesizer", "retro · sintetizador"],
    "navegar": ["navigate", "navegar"],
    "idioma": ["language", "idioma"],
    "Home": ["Home", "Inicio"],

    // hero
    "Apresentação": ["Introduction", "Presentación"],
    "maquete 3D": ["3D model", "maqueta 3D"],
    "planta baixa": ["floor plan", "planta"],
    "código-fonte": ["source code", "código fuente"],
    "sincronizado com a maquete": ["synced with the model", "sincronizado con la maqueta"],
    "Construo produtos digitais escaláveis, com foco em performance, código limpo e experiência do usuário.": ["I build scalable digital products, focused on performance, clean code and user experience.", "Construyo productos digitales escalables, con foco en rendimiento, código limpio y experiencia de usuario."],
    "Ver Projetos": ["View Projects", "Ver Proyectos"],
    "Fale Comigo": ["Talk to Me", "Hablemos"],
    "Maquete 3D interativa de uma casa. Arraste para girar.": ["Interactive 3D model of a house. Drag to rotate.", "Maqueta 3D interactiva de una casa. Arrastra para girar."],
    "Parâmetros da maquete 3D": ["3D model parameters", "Parámetros de la maqueta 3D"],
    "Parâmetros da maquete": ["Model parameters", "Parámetros de la maqueta"],
    "ARRASTE PARA CONSTRUIR • CASA_01 • MAQUETE VIVA •": ["DRAG TO BUILD • CASA_01 • LIVE MODEL • ", "ARRASTRA Y CONSTRUYE • CASA_01 • MAQUETA •"],
    "carregando modelo…": ["loading model…", "cargando modelo…"],
    "carregando modelo": ["loading model", "cargando modelo"],
    "maquete pronta": ["model ready", "maqueta lista"],
    "arraste para girar": ["drag to rotate", "arrastra para girar"],
    "3D indisponível neste dispositivo": ["3D unavailable on this device", "3D no disponible en este dispositivo"],
    "não foi possível carregar a maquete": ["couldn't load the model", "no se pudo cargar la maqueta"],
    "Recentralizar câmera": ["Recenter camera", "Recentrar cámara"],
    "Construção": ["Build", "Construcción"],
    "Horário": ["Time of day", "Horario"],
    "Corte de seção": ["Section cut", "Corte de sección"],
    "sem corte": ["no cut", "sin corte"],
    "Linguagem": ["Language", "Lenguaje"],
    "arquitetura": ["architecture", "arquitectura"],
    "Holograma": ["Hologram", "Holograma"],
    "Natural": ["Natural", "Natural"],
    "Código": ["Code", "Código"],
    "Rotação automática": ["Auto-rotate", "Rotación automática"],
    "Obra": ["Build", "Obra"],
    "Corte": ["Cut", "Corte"],
    "Terreno": ["Site", "Terreno"],
    "Estrutura": ["Structure", "Estructura"],
    "Superfícies": ["Surfaces", "Superficies"],
    "Interior": ["Interior", "Interior"],
    "Vegetação": ["Landscape", "Vegetación"],
    "Luz": ["Light", "Luz"],
    "Full Stack Developer": ["Full Stack Developer", "Desarrollador Full Stack"],

    // loader / notebook
    "> compilando planta base": ["> compiling base plan", "> compilando plano base"],
    "> renderizando notebook.obj": ["> rendering notebook.obj", "> renderizando notebook.obj"],
    "> montando seções [ok]": ["> mounting sections [ok]", "> montando secciones [ok]"],
    "> pronto.": ["> ready.", "> listo."],
    "> seja bem-vindo(a)": ["> welcome", "> bienvenido(a)"],
    "> carregando experiência...": ["> loading experience...", "> cargando experiencia..."],
    "> status: pronto": ["> status: ready", "> estado: listo"],
    "  stack carregada": ["  stack loaded", "  stack cargado"],

    // sobre
    "QUEM": ["WHO", "QUIÉN"],
    "SOU EU": ["AM I", "SOY"],
    "sobre": ["about", "sobre mí"],
    "Olá, sou Alexandre Garcia, estudante de Análise e Desenvolvimento de Sistemas pela instituição SENAC.": ["Hi, I'm Alexandre Garcia, a Systems Analysis and Development student at SENAC.", "Hola, soy Alexandre Garcia, estudiante de Análisis y Desarrollo de Sistemas en SENAC."],
    "Formado em Arquitetura e Urbanismo, com 12 anos de experiência na área de construção civil — hoje unindo essa senioridade à tecnologia e ao desenvolvimento de sistemas e softwares.": ["A graduate in Architecture and Urbanism with 12 years of experience in civil construction — now bringing that seniority to technology and to building systems and software.", "Graduado en Arquitectura y Urbanismo, con 12 años de experiencia en construcción civil — hoy uniendo esa experiencia a la tecnología y al desarrollo de sistemas y software."],
    "anos em dev": ["years in dev", "años en desarrollo"],
    "projetos entregues": ["projects delivered", "proyectos entregados"],
    "anos em construção civil": ["years in construction", "años en construcción civil"],
    "idiomas": ["languages", "idiomas"],
    "CÓDIGO LIMPO": ["CLEAN CODE", "CÓDIGO LIMPIO"],
    "ARQUITETURA": ["ARCHITECTURE", "ARQUITECTURA"],
    "ambiente pronto para o próximo desafio": ["environment ready for the next challenge", "entorno listo para el próximo desafío"],

    // trajetória
    "experiência": ["experience", "experiencia"],
    "experiência · 2017 → hoje": ["experience · 2017 → today", "experiencia · 2017 → hoy"],
    "da prancheta ao código": ["from drawing board to code", "del tablero al código"],
    "2017 — até o momento": ["2017 — present", "2017 — actualidad"],
    "2024 — até o momento": ["2024 — present", "2024 — actualidad"],
    "2026 — até o momento": ["2026 — present", "2026 — actualidad"],
    "atual": ["current", "actual"],
    "Site institucional e de captação da New Arrays, agência de Experiência Digital de Embu das Artes (SP), com atendimento remoto.": ["Corporate and lead-generation website for New Arrays, a Digital Experience agency from Embu das Artes (SP), serving clients remotely.", "Sitio institucional y de captación de New Arrays, agencia de Experiencia Digital de Embu das Artes (SP), con atención remota."],
    "Clique em qualquer lugar para ouvir": ["Click anywhere to listen", "Haz clic en cualquier lugar para escuchar"],
    "Toque em qualquer lugar para ouvir": ["Tap anywhere to listen", "Toca en cualquier lugar para escuchar"],
    "Volume da música": ["Music volume", "Volumen de la música"],
    "volume": ["volume", "volumen"],
    "Desenvolvedor de Sites e Aplicativos Web": ["Website & Web App Developer", "Desarrollador de Sitios y Aplicaciones Web"],
    "New Arrays · Freelance": ["New Arrays · Freelance", "New Arrays · Freelance"],
    "Sites e aplicativos web sob medida para a New Arrays e seus clientes, do planejamento à publicação: site institucional com GSAP, Lenis e fumaça em WebGL, formulário de leads com PHPMailer e Google Sheets, métricas com consentimento LGPD e testes com Playwright.": ["Custom websites and web apps for New Arrays and its clients, from planning to launch: the agency site with GSAP, Lenis and a WebGL smoke effect, a lead form with PHPMailer and Google Sheets, LGPD-compliant analytics and Playwright tests.", "Sitios y aplicaciones web a medida para New Arrays y sus clientes, de la planificación a la publicación: sitio institucional con GSAP, Lenis y humo en WebGL, formulario de leads con PHPMailer y Google Sheets, métricas con consentimiento LGPD y pruebas con Playwright."],
    "Arquiteto": ["Architect", "Arquitecto"],
    "Realização de diversos projetos de arquitetura de diferentes tipologias e tamanhos, realização de todas as etapas dos projetos, estudos de materiais e gerenciamento de obras, organização e gestão de equipes e execução de planilhas e cronogramas.": ["Delivered architecture projects of many types and sizes, covering every project stage, material studies and construction management, team organization and leadership, and budgets and schedules.", "Realización de diversos proyectos de arquitectura de distintas tipologías y tamaños, todas las etapas del proyecto, estudios de materiales y dirección de obras, organización y gestión de equipos y elaboración de presupuestos y cronogramas."],
    "Execução de diversos projetos residenciais e comerciais como arquiteto autônomo em Alexandre Garcia Arquitetura. Projetos de casas unifamiliares, apartamentos, estúdios, lojas comerciais, restaurantes e obras de diversos tipos.": ["Designed many residential and commercial projects as an independent architect at Alexandre Garcia Arquitetura: single-family houses, apartments, studios, retail stores, restaurants and construction works of all kinds.", "Ejecución de diversos proyectos residenciales y comerciales como arquitecto independiente en Alexandre Garcia Arquitetura: viviendas unifamiliares, departamentos, estudios, tiendas, restaurantes y obras de todo tipo."],
    "Desenvolvedor Frontend": ["Frontend Developer", "Desarrollador Frontend"],
    "Desenvolvimento de pequenos projetos, páginas Web, programas e APIs como desenvolvedor Frontend e Backend.": ["Building small projects, web pages, programs and APIs as a frontend and backend developer.", "Desarrollo de pequeños proyectos, páginas web, programas y APIs como desarrollador frontend y backend."],
    "Analista de Tecnologia e Inovação": ["Technology & Innovation Analyst", "Analista de Tecnología e Innovación"],
    "Desenvolvedor focado na criação, manutenção e evolução de soluções SaaS voltadas à gestão de relacionamento com clientes (CRM), atuando com JavaScript e Node.js para construir sistemas mais eficientes, escaláveis e alinhados às necessidades do negócio.": ["Developer focused on building, maintaining and evolving SaaS solutions for customer relationship management (CRM), working with JavaScript and Node.js to deliver more efficient, scalable systems aligned with business needs.", "Desarrollador enfocado en crear, mantener y evolucionar soluciones SaaS de gestión de relaciones con clientes (CRM), trabajando con JavaScript y Node.js para construir sistemas más eficientes, escalables y alineados con las necesidades del negocio."],
    "← role para navegar →": ["← scroll to navigate →", "← desplázate para navegar →"],

    // projetos
    "projetos": ["projects", "proyectos"],
    "Ver todos no GitHub": ["See all on GitHub", "Ver todos en GitHub"],
    // projeto em destaque — Love Quest
    "01 — novo projeto · jogo": ["01 — new project · game", "01 — nuevo proyecto · juego"],
    "role para ligar ↓": ["scroll to power on ↓", "desplázate para encender ↓"],
    "projeto em destaque · jogo · 2026": ["featured project · game · 2026", "proyecto destacado · juego · 2026"],
    "Uma declaração de amor que virou jogo. Você manda o link, a pessoa joga quatro fases para resgatar o par e, no final, recebe a sua mensagem.": ["A love letter turned into a game. You send the link, they play four levels to rescue their partner and, at the end, get your message.", "Una declaración de amor convertida en juego. Envías el enlace, la persona juega cuatro fases para rescatar a su pareja y, al final, recibe tu mensaje."],
    "Céu Estrelado": ["Starry Sky", "Cielo Estrellado"],
    "Jardim Florido": ["Flower Garden", "Jardín Florido"],
    "Cidade à Noite": ["City at Night", "Ciudad de Noche"],
    "Castelo nas Nuvens": ["Castle in the Clouds", "Castillo en las Nubes"],
    "▶ Jogar agora": ["▶ Play now", "▶ Jugar ahora"],
    "ligar som": ["sound on", "activar sonido"],
    "toque para ouvir": ["tap to listen", "toca para escuchar"],
    "mais projetos": ["more projects", "más proyectos"],
    "Uma declaração de amor que virou jogo: 4 fases em pixel art para jogar no celular e, no final, a sua mensagem.": ["A love letter turned into a game: 4 pixel-art levels to play on your phone and, at the end, your message.", "Una declaración de amor convertida en juego: 4 fases en pixel art para jugar en el celular y, al final, tu mensaje."],
    "▶ Clique para conhecer Love Quest": ["▶ Click to explore Love Quest", "▶ Haz clic para conocer Love Quest"],
    "▶ trailer": ["▶ trailer", "▶ tráiler"],
    "Abrir a apresentação do Love Quest": ["Open the Love Quest presentation", "Abrir la presentación de Love Quest"],
    "Fechar Love Quest": ["Close Love Quest", "Cerrar Love Quest"],
    "fechar": ["close", "cerrar"],
    // aviso de cookies / privacidade
    "Este site usa cookies da Meta e da Microsoft para medir os anúncios e entender como as pessoas navegam por aqui. Você aceita?": ["This site uses cookies from Meta and Microsoft to measure ads and understand how people browse it. Do you accept?", "Este sitio usa cookies de Meta y Microsoft para medir los anuncios y entender cómo navegan las personas. ¿Aceptas?"],
    "Política de privacidade": ["Privacy policy", "Política de privacidad"],
    "Preferências de cookies": ["Cookie preferences", "Preferencias de cookies"],
    "Aceitar": ["Accept", "Aceptar"],
    "aceitar": ["accept", "aceptar"],
    "recusar": ["decline", "rechazar"],
    "privacidade": ["privacy", "privacidad"],
    "Recusar": ["Decline", "Rechazar"],
    "Privacidade": ["Privacy", "Privacidad"],
    "✕ Fechar": ["✕ Close", "✕ Cerrar"],
    "Sites, aplicativos e APIs feitos para clientes, estudos e projetos acadêmicos.": ["Websites, apps and APIs built for clients, studies and academic projects.", "Sitios, aplicaciones y APIs hechos para clientes, estudios y proyectos académicos."],
    "Pausar": ["Pause", "Pausar"],
    "Reproduzir": ["Play", "Reproducir"],
    "Recomeçar": ["Restart", "Reiniciar"],
    "Posição do vídeo": ["Video position", "Posición del video"],
    "Ligar som": ["Sound on", "Activar sonido"],
    "Desligar som": ["Sound off", "Desactivar sonido"],
    "desligar som": ["sound off", "desactivar sonido"],
    "o jogo abre em paisagem": ["the game opens in landscape", "el juego se abre en horizontal"],
    "Tecnologias": ["Technologies", "Tecnologías"],
    "Trailer do Love Quest (vertical)": ["Love Quest trailer (vertical)", "Tráiler de Love Quest (vertical)"],
    "Trailer do Love Quest (horizontal)": ["Love Quest trailer (horizontal)", "Tráiler de Love Quest (horizontal)"],
    "→ Ver Projeto": ["→ View Project", "→ Ver Proyecto"],
    "Reformulação de todo o UX Design e funcionalidades do Website de apresentação do app Teon.": ["Complete UX redesign and new features for the Teon app's showcase website.", "Rediseño completo de la UX y de las funcionalidades del sitio de presentación de la app Teon."],
    "Site vitrine de uma loja de móveis com preço de outlet: catálogo gerado em PHP a partir de JSON, busca instantânea, SEO técnico e animações com GSAP.": ["Showcase site for a furniture store with outlet prices: catalog generated in PHP from JSON, instant search, technical SEO and GSAP animations.", "Sitio vitrina de una tienda de muebles con precios de outlet: catálogo generado en PHP a partir de JSON, búsqueda instantánea, SEO técnico y animaciones con GSAP."],
    "Website para empresa de assessoria de Geologia, Hidrogeologia, Geofísica e Meio Ambiente.": ["Website for a consultancy in Geology, Hydrogeology, Geophysics and Environment.", "Sitio web para una consultora de Geología, Hidrogeología, Geofísica y Medio Ambiente."],
    "Website de portfólio pessoal do artista, pintor e escritor Augusto Tomba. Tema ultra minimalista japonês.": ["Personal portfolio website for artist, painter and writer Augusto Tomba. Ultra-minimal Japanese theme.", "Sitio de portafolio del artista, pintor y escritor Augusto Tomba. Estética japonesa ultraminimalista."],
    "Plataforma para conectar clientes a prestadores de serviços como eletricistas, encanadores, diaristas e mais.": ["Platform connecting clients with service providers such as electricians, plumbers, cleaners and more.", "Plataforma que conecta clientes con prestadores de servicios como electricistas, plomeros, limpieza y más."],
    "Site pensado para ciclistas apaixonados, lojistas e curiosos que desejam explorar o universo das bikes.": ["A site for passionate cyclists, retailers and anyone curious about the world of bikes.", "Sitio pensado para ciclistas apasionados, comerciantes y curiosos que quieren explorar el universo de las bicis."],
    "Página de profissional autônomo no ramo de Personal Trainer.": ["Landing page for an independent personal trainer.", "Página para un entrenador personal independiente."],
    "Aplicativo mobile de delivery de comida desenvolvido em React Native com Expo Router, criado como projeto acadêmico (PTI).": ["Food delivery mobile app built with React Native and Expo Router as an academic project (PTI).", "App móvil de delivery de comida desarrollada con React Native y Expo Router como proyecto académico (PTI)."],
    "API para demonstrar o funcionamento de um sistema de banco de um cliente e sua interação com Swagger.": ["API demonstrating how a customer banking system works and its interaction with Swagger.", "API que demuestra el funcionamiento de un sistema bancario de un cliente y su interacción con Swagger."],
    "Sistema de Loja de Eletrônicos": ["Electronics Store System", "Sistema de Tienda de Electrónica"],
    "API para controlar o caixa de uma loja de eletrônicos.": ["API to manage the cash register of an electronics store.", "API para controlar la caja de una tienda de electrónica."],
    "Maonamassa — Aplicativo de Serviços": ["Maonamassa — Services App", "Maonamassa — App de Servicios"],
    "Landing Page Alexandre Personal": ["Alexandre Personal landing page", "Landing page Alexandre Personal"],

    // formação
    "formação": ["education", "formación"],
    "FORMAÇÃO ACADÊMICA": ["ACADEMIC BACKGROUND", "FORMACIÓN ACADÉMICA"],
    "Análise e Desenvolvimento de Sistemas": ["Systems Analysis and Development", "Análisis y Desarrollo de Sistemas"],
    "Tecnólogo · SENAC": ["Associate degree · SENAC", "Tecnólogo · SENAC"],
    "Arquitetura e Urbanismo": ["Architecture and Urbanism", "Arquitectura y Urbanismo"],
    "Bacharel · UNINOVE": ["Bachelor's · UNINOVE", "Licenciatura · UNINOVE"],
    "IDIOMAS": ["LANGUAGES", "IDIOMAS"],
    "Português": ["Portuguese", "Portugués"],
    "Nativo": ["Native", "Nativo"],
    "Inglês": ["English", "Inglés"],
    "Avançado": ["Advanced", "Avanzado"],
    "Espanhol": ["Spanish", "Español"],
    "Intermediário": ["Intermediate", "Intermedio"],
    "HORAS DE": ["STUDY", "HORAS DE"],
    "ESTUDO": ["HOURS", "ESTUDIO"],
    "CURSOS INTENSIVOS": ["INTENSIVE COURSES", "CURSOS INTENSIVOS"],
    "Bootcamp Java, Springboot e MySQL": ["Java, Spring Boot & MySQL Bootcamp", "Bootcamp Java, Spring Boot y MySQL"],
    "Fundamentos de Python": ["Python Fundamentals", "Fundamentos de Python"],

    // contato (home) + jogo
    "contato": ["contact", "contacto"],
    "Vamos conversar?": ["Shall we talk?", "¿Hablamos?"],
    "Estou aberto a novos projetos, colaborações e oportunidades de trabalho. Entre em contato e vamos construir algo incrível juntos.": ["I'm open to new projects, collaborations and job opportunities. Get in touch and let's build something amazing together.", "Estoy abierto a nuevos proyectos, colaboraciones y oportunidades laborales. Escríbeme y construyamos algo increíble juntos."],
    "Entre em contato": ["Get in touch", "Contáctame"],
    "Encerrar jogo": ["End game", "Terminar juego"],
    "Jogo Quebra-Blocos. Use o mouse, o toque ou as setas para mover a raquete.": ["Brick Breaker game. Use the mouse, touch or arrow keys to move the paddle.", "Juego Rompeladrillos. Usa el ratón, el toque o las flechas para mover la paleta."],
    "Clique, toque ou aperte espaço para lançar": ["Click, tap or press space to launch", "Haz clic, toca o pulsa espacio para lanzar"],
    "Nível ": ["Level ", "Nivel "],
    "NÍVEL ": ["LEVEL ", "NIVEL "],
    "RECORDE ": ["BEST ", "RÉCORD "],
    "Pausado": ["Paused", "Pausa"],
    "Clique ou aperte espaço para continuar": ["Click or press space to continue", "Haz clic o pulsa espacio para continuar"],
    "Fim de jogo": ["Game over", "Fin del juego"],
    "Pontos: ": ["Score: ", "Puntos: "],
    "   ·   Recorde: ": ["   ·   Best: ", "   ·   Récord: "],
    "Clique ou aperte espaço para jogar de novo": ["Click or press space to play again", "Haz clic o pulsa espacio para jugar de nuevo"],

    // página de contato
    "// contato": ["// contact", "// contacto"],
    "Vamos trabalhar": ["Let's work", "Trabajemos"],
    "juntos?": ["together?", "juntos?"],
    "Estou disponível para novos projetos, freelas e oportunidades. Role para abrir o formulário ou fale direto pelos canais.": ["I'm available for new projects, freelance work and opportunities. Scroll to open the form or reach me directly through the channels.", "Estoy disponible para nuevos proyectos, freelances y oportunidades. Desplázate para abrir el formulario o escríbeme directo por los canales."],
    "Deslize para preencher": ["Scroll down to fill in", "Desliza para completar"],
    "o formulário.": ["the form.", "el formulario."],
    "// canais diretos": ["// direct channels", "// canales directos"],
    "Prefere algo mais rápido? Escolha um canal — ou preencha o formulário e eu retorno com uma proposta.": ["Prefer something faster? Pick a channel — or fill in the form and I'll get back to you with a proposal.", "¿Prefieres algo más rápido? Elige un canal — o completa el formulario y te respondo con una propuesta."],
    "respondo em até 24h úteis": ["I reply within 1 business day", "respondo en hasta 24 h hábiles"],
    "~/contato/": ["~/contact/", "~/contacto/"],
    "novo-projeto.ts": ["new-project.ts", "nuevo-proyecto.ts"],
    "0 / 4 campos": ["0 / 4 fields", "0 / 4 campos"],
    "nome": ["name", "nombre"],
    "e-mail": ["email", "e-mail"],
    "telefone / whatsapp": ["phone / whatsapp", "teléfono / whatsapp"],
    "opcional": ["optional", "opcional"],
    "tipo de projeto": ["project type", "tipo de proyecto"],
    "Site / Landing": ["Website / Landing", "Sitio / Landing"],
    "Aplicação web": ["Web app", "Aplicación web"],
    "Consultoria": ["Consulting", "Consultoría"],
    "Outro": ["Other", "Otro"],
    "mensagem": ["message", "mensaje"],
    "como me encontrou?": ["how did you find me?", "¿cómo me encontraste?"],
    "Indicação": ["Referral", "Recomendación"],
    "envia": ["sends", "envía"],
    "enviar mensagem": ["send message", "enviar mensaje"],
    "mensagem enviada.": ["message sent.", "mensaje enviado."],
    "enviar outra mensagem": ["send another message", "enviar otro mensaje"],
    "Seu nome completo": ["Your full name", "Tu nombre completo"],
    "voce@empresa.com": ["you@company.com", "tu@empresa.com"],
    "Conte o objetivo do projeto, prazo e qualquer detalhe relevante…": ["Tell me the project's goal, deadline and any relevant details…", "Cuéntame el objetivo del proyecto, el plazo y cualquier detalle relevante…"],
    "Não preencha este campo": ["Do not fill in this field", "No completes este campo"],
    "tudo certo": ["all set", "todo listo"],

    // validação (js/contato.js) e respostas do servidor (enviar.php)
    "pronto para enviar": ["ready to send", "listo para enviar"],
    "campos": ["fields", "campos"],
    "// informe seu nome": ["// enter your name", "// escribe tu nombre"],
    "// nome muito curto": ["// name too short", "// nombre muy corto"],
    "// use apenas letras": ["// letters only, please", "// usa solo letras"],
    "// informe seu e-mail": ["// enter your email", "// escribe tu e-mail"],
    "// formato inválido — ex.: voce@empresa.com": ["// invalid format — e.g. you@company.com", "// formato inválido — ej.: tu@empresa.com"],
    "// incompleto — (DDD) + número": ["// incomplete — (area code) + number", "// incompleto — (DDD) + número"],
    "// celular começa com 9 depois do DDD": ["// mobile numbers start with 9 after the area code", "// el celular empieza con 9 después del DDD"],
    "// fixo começa com 2, 3, 4 ou 5": ["// landlines start with 2, 3, 4 or 5", "// el fijo empieza con 2, 3, 4 o 5"],
    "// número inválido": ["// invalid number", "// número inválido"],
    "// escolha uma opção": ["// pick an option", "// elige una opción"],
    "// escreva sua mensagem": ["// write your message", "// escribe tu mensaje"],
    "// mais {n} caracteres, por favor": ["// {n} more characters, please", "// {n} caracteres más, por favor"],
    "// DDD {d} não existe": ["// area code {d} doesn't exist", "// el DDD {d} no existe"],
    "// verificando domínio…": ["// checking domain…", "// verificando dominio…"],
    "// domínio verificado": ["// domain verified", "// dominio verificado"],
    "// quis dizer": ["// did you mean", "// ¿quisiste decir"],
    "// o domínio {d} não recebe e-mails.": ["// the domain {d} doesn't receive email.", "// el dominio {d} no recibe e-mails."],
    "usar {d}?": ["use {d}?", "¿usar {d}?"],
    "// confira os campos destacados.": ["// check the highlighted fields.", "// revisa los campos destacados."],
    "validando…": ["validating…", "validando…"],
    "enviando…": ["sending…", "enviando…"],
    "algo deu errado": ["something went wrong", "algo salió mal"],
    "Se preferir, peça o seu pelo WhatsApp": ["Prefer WhatsApp? Ask for yours there", "Si prefieres, pide el tuyo por WhatsApp"],
    "Se preferir, escreva direto para": ["If you prefer, write directly to", "Si prefieres, escribe directo a"],
    "Informe seu nome.": ["Please enter your name.", "Escribe tu nombre."],
    "E-mail inválido.": ["Invalid email.", "E-mail inválido."],
    "Telefone inválido — use (DDD) + número.": ["Invalid phone — use (area code) + number.", "Teléfono inválido — usa (DDD) + número."],
    "Escolha o tipo de projeto.": ["Choose the project type.", "Elige el tipo de proyecto."],
    "A mensagem precisa ter pelo menos 20 caracteres.": ["The message needs at least 20 characters.", "El mensaje necesita al menos 20 caracteres."],
    "Envio rápido demais. Tente novamente.": ["Sent too fast. Please try again.", "Envío demasiado rápido. Inténtalo de nuevo."],
    "Aguarde alguns segundos antes de enviar outra mensagem.": ["Please wait a few seconds before sending another message.", "Espera unos segundos antes de enviar otro mensaje."],
    "Não foi possível enviar agora. Tente novamente em instantes.": ["Couldn't send right now. Please try again shortly.", "No se pudo enviar ahora. Inténtalo de nuevo en unos instantes."],
    "Servidor sem configuração de e-mail (config.php).": ["Server email is not configured (config.php).", "Servidor sin configuración de e-mail (config.php)."],
    "Método não permitido.": ["Method not allowed.", "Método no permitido."],
    "> validando campos ........ ok": ["> validating fields ....... ok", "> validando campos ........ ok"],
    "> verificando e-mail ...... ok": ["> checking email .......... ok", "> verificando e-mail ...... ok"],
    "> mensagem entregue ✓": ["> message delivered ✓", "> mensaje entregado ✓"],
    "$ npm run enviar -- --para alexandre": ["$ npm run send -- --to alexandre", "$ npm run enviar -- --para alexandre"],
    /* ---- COSMOS (cosmos.html, card nos Projetos, menu) ---- */
    "pronto": ["ready", "listo"],
    "Um mordomo que": ["A butler that", "Un mayordomo que"],
    "faz": ["does", "hace"],
    ", não só responde.": [", not just answers.", ", no solo responde."],
    "A arquitetura de um assistente de IA por voz e texto que manda WhatsApp, responde e-mails e marca reuniões. Com o seu nome, no seu servidor.": ["The architecture of a voice-and-text AI assistant that sends WhatsApp messages, answers emails and books meetings. With your name, on your server.", "La arquitectura de un asistente de IA por voz y texto que envía WhatsApp, responde correos y agenda reuniones. Con tu nombre, en tu servidor."],
    "Quero o meu →": ["I want mine →", "Quiero el mío →"],
    "▶ Apresentação · 49 s": ["▶ Presentation · 49 s", "▶ Presentación · 49 s"],
    "arraste para girar · clique para um pulso · segure para trocar a cor": ["drag to spin · click for a pulse · hold to change the color", "arrastra para girar · haz clic para un pulso · mantén pulsado para cambiar el color"],
    "a maioria dos assistentes": ["most assistants", "la mayoría de los asistentes"],
    "Conversa, sugere, escreve um rascunho…": ["Chat, suggest, write a draft…", "Conversan, sugieren, escriben un borrador…"],
    "e deixa o resto com você.": ["and leave the rest to you.", "y te dejan el resto a ti."],
    "O COSMOS executa: envia, agenda, responde e lembra. E só conta como feito quando a ferramenta confirma.": ["COSMOS executes: it sends, schedules, replies and reminds. And it only counts as done when the tool confirms.", "COSMOS ejecuta: envía, agenda, responde y recuerda. Y solo cuenta como hecho cuando la herramienta lo confirma."],
    "três regras que não se negociam": ["three non-negotiable rules", "tres reglas innegociables"],
    "Ele age. Com cuidado.": ["It acts. Carefully.", "Actúa. Con cuidado."],
    "Pergunta antes do irreversível.": ["Asks before anything irreversible.", "Pregunta antes de lo irreversible."],
    "Mensagem a outra pessoa, e-mail, convite ou apagar: tudo passa por um cartão com o texto exato. Responda por voz (\"sim, pode enviar\") ou no botão. O código de confirmação é de uso único e vale por cerca de 2 minutos.": ["A message to someone else, an email, an invite or a deletion: it all goes through a card with the exact text. Answer by voice (\"yes, send it\") or with the button. The confirmation code is single-use and lasts about 2 minutes.", "Un mensaje a otra persona, un correo, una invitación o un borrado: todo pasa por una tarjeta con el texto exacto. Responde por voz (\"sí, envíalo\") o con el botón. El código de confirmación es de un solo uso y vale unos 2 minutos."],
    "Nunca finge que fez.": ["Never pretends it's done.", "Nunca finge que lo hizo."],
    "Uma ação só conta como feita quando a ferramenta confirma. Contato ambíguo vira pergunta, não chute.": ["An action only counts as done when the tool confirms it. An ambiguous contact becomes a question, not a guess.", "Una acción solo cuenta como hecha cuando la herramienta lo confirma. Un contacto ambiguo se convierte en pregunta, no en suposición."],
    "Nada decorativo.": ["Nothing decorative.", "Nada decorativo."],
    "Todo número e todo estado da tela vêm de um evento real. Fonte fora do ar mostra \"—\", nunca um número inventado.": ["Every number and every state on screen comes from a real event. A source that's down shows \"—\", never a made-up number.", "Cada número y cada estado en pantalla vienen de un evento real. Una fuente caída muestra \"—\", nunca un número inventado."],
    "Demonstração do cartão de confirmação": ["Confirmation card demo", "Demostración de la tarjeta de confirmación"],
    "Perfeitamente, senhor.": ["Certainly, sir.", "Perfectamente, señor."],
    "Para": ["To", "Para"],
    "Pai": ["Dad", "Papá"],
    ", pelo WhatsApp:": [", via WhatsApp:", ", por WhatsApp:"],
    "\"Pai, vamos jantar às 20h hoje.\"": ["\"Dad, we're having dinner at 8 pm tonight.\"", "\"Papá, cenamos hoy a las 20 h.\""],
    "Posso enviar?": ["May I send it?", "¿Puedo enviarlo?"],
    "→ whatsapp.send · aguardando a ferramenta…": ["→ whatsapp.send · waiting for the tool…", "→ whatsapp.send · esperando la herramienta…"],
    "✓ ferramenta confirmou o envio": ["✓ tool confirmed delivery", "✓ la herramienta confirmó el envío"],
    "Enviado, senhor.": ["Sent, sir.", "Enviado, señor."],
    "Só agora": ["Only now", "Solo ahora"],
    "ele diz que fez.": ["does it say it's done.", "dice que lo hizo."],
    "e-mails importantes": ["important emails", "correos importantes"],
    "eventos hoje": ["events today", "eventos hoy"],
    "ações hoje": ["actions today", "acciones hoy"],
    "gasto no mês": ["spent this month", "gasto del mes"],
    "exemplo: a Agenda e o custo estão fora do ar, então aparece \"—\"": ["example: Calendar and cost are down, so \"—\" is shown", "ejemplo: la Agenda y el costo están caídos, así que aparece \"—\""],
    "peça assim": ["ask like this", "pídelo así"],
    "Ele faz assim.": ["It does it like this.", "Lo hace así."],
    "WhatsApp · Gmail · Agenda · Reuniões · Lembretes · Memória · Voz": ["WhatsApp · Gmail · Calendar · Meetings · Reminders · Memory · Voice", "WhatsApp · Gmail · Agenda · Reuniones · Recordatorios · Memoria · Voz"],
    "Cartão de confirmação de WhatsApp com o texto exato e os botões Cancelar e Enviar": ["WhatsApp confirmation card with the exact text and the Cancel and Send buttons", "Tarjeta de confirmación de WhatsApp con el texto exacto y los botones Cancelar y Enviar"],
    "\"Envia para o Pai que vamos jantar às 20h\"": ["\"Tell Dad we're having dinner at 8 pm\"", "\"Dile a papá que cenamos a las 20 h\""],
    "Acha o contato pelo apelido, lê o texto exato e pergunta \"Posso enviar?\". Só envia depois do sim.": ["Finds the contact by nickname, reads back the exact text and asks \"May I send it?\". It only sends after a yes.", "Encuentra el contacto por el apodo, lee el texto exacto y pregunta \"¿Puedo enviarlo?\". Solo envía después del sí."],
    "Tela principal do COSMOS com os painéis Sistema e Atividade": ["COSMOS main screen with the System and Activity panels", "Pantalla principal de COSMOS con los paneles Sistema y Actividad"],
    "\"Tenho e-mail importante?\"": ["\"Do I have any important email?\"", "\"¿Tengo algún correo importante?\""],
    "Lista os não lidos importantes das últimas 24 h, em uma frase cada. Para responder, mostra destinatário, assunto e texto e espera a confirmação.": ["Lists the important unread emails from the last 24 h, one sentence each. To reply, it shows recipient, subject and text and waits for confirmation.", "Lista los no leídos importantes de las últimas 24 h, una frase cada uno. Para responder, muestra destinatario, asunto y texto y espera la confirmación."],
    "Diário de bordo do COSMOS com a linha do tempo do dia": ["COSMOS logbook with the day's timeline", "Bitácora de COSMOS con la línea de tiempo del día"],
    "Agenda": ["Calendar", "Agenda"],
    "\"Marca dentista quinta às 10h\"": ["\"Book the dentist Thursday at 10 am\"", "\"Agenda dentista el jueves a las 10 h\""],
    "Cria o evento direto no Google Agenda, no fuso de São Paulo.": ["Creates the event straight in Google Calendar, in São Paulo time.", "Crea el evento directo en Google Calendar, en la hora de São Paulo."],
    "Cartão de confirmação no celular": ["Confirmation card on the phone", "Tarjeta de confirmación en el móvil"],
    "Reuniões": ["Meetings", "Reuniones"],
    "\"Marca reunião com o João amanhã às 15h\"": ["\"Set up a meeting with João tomorrow at 3 pm\"", "\"Agenda una reunión con João mañana a las 15 h\""],
    "30 minutos, convite por e-mail e link do Google Meet, com confirmação antes de o convite sair.": ["30 minutes, email invite and Google Meet link, with confirmation before the invite goes out.", "30 minutos, invitación por correo y enlace de Google Meet, con confirmación antes de que salga la invitación."],
    "Pessoa na rua com o COSMOS aberto no celular": ["Person on the street with COSMOS open on the phone", "Persona en la calle con COSMOS abierto en el móvil"],
    "Lembretes": ["Reminders", "Recordatorios"],
    "\"Me lembra às 18h de ligar para o banco\"": ["\"Remind me at 6 pm to call the bank\"", "\"Recuérdame a las 18 h llamar al banco\""],
    "Agenda o lembrete, que chega no seu WhatsApp na hora certa.": ["Schedules the reminder, which arrives on your WhatsApp right on time.", "Programa el recordatorio, que llega a tu WhatsApp a la hora justa."],
    "Gaveta Sistema do COSMOS no celular": ["COSMOS System drawer on the phone", "Panel Sistema de COSMOS en el móvil"],
    "Memória": ["Memory", "Memoria"],
    "\"Guarda que eu prefiro reuniões de manhã\"": ["\"Remember that I prefer morning meetings\"", "\"Recuerda que prefiero reuniones por la mañana\""],
    "Memoriza preferências e pessoas frequentes. Senhas, códigos e dados bancários, nunca.": ["Remembers preferences and frequent people. Passwords, codes and bank details, never.", "Memoriza preferencias y personas frecuentes. Contraseñas, códigos y datos bancarios, nunca."],
    "Pessoa cozinhando enquanto fala com o COSMOS no celular": ["Person cooking while talking to COSMOS on the phone", "Persona cocinando mientras habla con COSMOS en el móvil"],
    "Voz": ["Voice", "Voz"],
    "Fale ou digite.": ["Speak or type.", "Habla o escribe."],
    "O microfone para sozinho no silêncio, a transcrição é feita pelo Groq Whisper e a resposta sai em voz (Cartesia, com reserva do Google). Uma frase ambígua como \"sim, mas…\" não dispara nada.": ["The mic stops on its own when you go silent, transcription runs on Groq Whisper and the answer comes back in voice (Cartesia, with Google as backup). An ambiguous phrase like \"yes, but…\" triggers nothing.", "El micrófono se detiene solo en el silencio, la transcripción la hace Groq Whisper y la respuesta sale en voz (Cartesia, con Google de respaldo). Una frase ambigua como \"sí, pero…\" no dispara nada."],
    "a interface": ["the interface", "la interfaz"],
    "Uma galáxia que mostra o que está acontecendo.": ["A galaxy that shows what's happening.", "Una galaxia que muestra lo que está pasando."],
    "No app, ela é feita em Three.js com shaders próprios e cada estado vem de um evento real: o volume do microfone, a voz do COSMOS, a confirmação pendente. Aqui, quem mexe é você.": ["In the app it's built with Three.js and custom shaders, and every state comes from a real event: the mic volume, COSMOS's voice, a pending confirmation. Here, you're in control.", "En la app está hecha en Three.js con shaders propios y cada estado viene de un evento real: el volumen del micrófono, la voz de COSMOS, la confirmación pendiente. Aquí, el que la mueve eres tú."],
    "arraste · clique · segure": ["drag · click · hold", "arrastra · haz clic · mantén"],
    "Controles da galáxia": ["Galaxy controls", "Controles de la galaxia"],
    "estado": ["state", "estado"],
    "ouvindo": ["listening", "escuchando"],
    "pensando": ["thinking", "pensando"],
    "falando": ["speaking", "hablando"],
    "confirmação": ["confirmation", "confirmación"],
    "erro": ["error", "error"],
    "cores": ["colors", "colores"],
    "Observatório": ["Observatory", "Observatorio"],
    "Nebulosa": ["Nebula", "Nebulosa"],
    "Gelo": ["Ice", "Hielo"],
    "braços": ["arms", "brazos"],
    "espiral": ["spiral", "espiral"],
    "velocidade": ["speed", "velocidad"],
    "a arquitetura": ["the architecture", "la arquitectura"],
    "Um servidor seu. Uma só entrada.": ["Your own server. A single way in.", "Un servidor tuyo. Una sola entrada."],
    "Tudo roda em Docker Compose numa VPS. Só o Caddy fala com a internet; o agente e o WhatsApp ficam na rede interna, invisíveis de fora.": ["Everything runs on Docker Compose on a VPS. Only Caddy talks to the internet; the agent and WhatsApp stay on the internal network, invisible from outside.", "Todo corre en Docker Compose en una VPS. Solo Caddy habla con internet; el agente y WhatsApp quedan en la red interna, invisibles desde fuera."],
    "A interface conversa com o agente por eventos tipados em tempo real (SSE).": ["The interface talks to the agent through typed real-time events (SSE).", "La interfaz habla con el agente mediante eventos tipados en tiempo real (SSE)."],
    "O runtime do agente é o Hermes Agent, de código aberto (MIT), da Nous Research. Ele cuida de memória, skills e agendador.": ["The agent runtime is Hermes Agent, open source (MIT), by Nous Research. It handles memory, skills and the scheduler.", "El runtime del agente es Hermes Agent, de código abierto (MIT), de Nous Research. Se encarga de la memoria, las skills y el programador."],
    "O que é meu: a interface, o BFF, as skills do Google e do WhatsApp, as regras de confirmação, a integração e o design.": ["What's mine: the interface, the BFF, the Google and WhatsApp skills, the confirmation rules, the integration and the design.", "Lo que es mío: la interfaz, el BFF, las skills de Google y WhatsApp, las reglas de confirmación, la integración y el diseño."],
    "Claude Sonnet é o cérebro; o Haiku cuida das tarefas internas.": ["Claude Sonnet is the brain; Haiku handles internal tasks.", "Claude Sonnet es el cerebro; Haiku se encarga de las tareas internas."],
    "Diagrama: celular ou PC, Caddy, Next.js com SQLite, Hermes Agent e, abaixo, Claude, skills e agendador": ["Diagram: phone or PC, Caddy, Next.js with SQLite, Hermes Agent and, below, Claude, skills and scheduler", "Diagrama: móvil o PC, Caddy, Next.js con SQLite, Hermes Agent y, debajo, Claude, skills y programador"],
    "rede interna": ["internal network", "red interna"],
    "Celular / PC": ["Phone / PC", "Móvil / PC"],
    "navegador ou PWA": ["browser or PWA", "navegador o PWA"],
    "única porta aberta": ["only open port", "único puerto abierto"],
    "runtime do agente": ["agent runtime", "runtime del agente"],
    "agendador": ["scheduler", "programador"],
    "memória nativa": ["native memory", "memoria nativa"],
    "o mesmo produto, com a sua cara": ["the same product, made yours", "el mismo producto, con tu sello"],
    "Às suas ordens.": ["At your service.", "A sus órdenes."],
    "nome do seu assistente": ["your assistant's name", "nombre de tu asistente"],
    "Paleta da galáxia": ["Galaxy palette", "Paleta de la galaxia"],
    "Nome, marca e ícones": ["Name, brand and icons", "Nombre, marca e iconos"],
    "Personalidade e regras de operação": ["Personality and operating rules", "Personalidad y reglas de operación"],
    "Cores e paletas": ["Colors and palettes", "Colores y paletas"],
    "Modelo de IA": ["AI model", "Modelo de IA"],
    "Novas skills e integrações": ["New skills and integrations", "Nuevas skills e integraciones"],
    "feito com cuidado": ["built with care", "hecho con cuidado"],
    "Números que contam.": ["Numbers that matter.", "Números que cuentan."],
    "testes automatizados": ["automated tests", "pruebas automatizadas"],
    "violações de acessibilidade no axe": ["accessibility violations in axe", "infracciones de accesibilidad en axe"],
    "serviço exposto à internet (o Caddy)": ["service exposed to the internet (Caddy)", "servicio expuesto a internet (Caddy)"],
    "tentativas de login erradas e o acesso bloqueia": ["wrong login attempts and access locks", "intentos de acceso fallidos y se bloquea"],
    "de validade do código de confirmação": ["confirmation code lifetime", "de validez del código de confirmación"],
    "segredos no navegador": ["secrets in the browser", "secretos en el navegador"],
    "senha com argon2id": ["argon2id password hashing", "contraseña con argon2id"],
    "cookie httpOnly assinado": ["signed httpOnly cookie", "cookie httpOnly firmada"],
    "limite de pedidos": ["rate limiting", "límite de peticiones"],
    "cabeçalhos de segurança": ["security headers", "cabeceras de seguridad"],
    "versão sem WebGL": ["no-WebGL version", "versión sin WebGL"],
    "respeita \"reduzir movimento\"": ["respects \"reduce motion\"", "respeta \"reducir movimiento\""],
    "backup diário criptografado": ["encrypted daily backup", "copia de seguridad diaria cifrada"],
    "limite de gasto configurado": ["spending cap configured", "límite de gasto configurado"],
    "49 segundos": ["49 seconds", "49 segundos"],
    "Veja a apresentação.": ["Watch the presentation.", "Mira la presentación."],
    "Com legendas no vídeo.": ["Subtitles in Portuguese, built into the video.", "Subtítulos en portugués, dentro del video."],
    "Vídeo de apresentação do COSMOS": ["COSMOS presentation video", "Video de presentación de COSMOS"],
    "Assistir à apresentação do COSMOS": ["Watch the COSMOS presentation", "Ver la presentación de COSMOS"],
    "▶ apresentação · 0:49": ["▶ presentation · 0:49", "▶ presentación · 0:49"],
    "agora, na prática": ["now, in practice", "ahora, en la práctica"],
    "Veja o COSMOS funcionando no meu dia a dia.": ["See COSMOS working in my day-to-day.", "Mira COSMOS funcionando en mi día a día."],
    "Em breve": ["Coming soon", "Próximamente"],
    "O vídeo de uso real está sendo gravado.": ["The real-use video is being recorded.", "El video de uso real se está grabando."],
    "arquitetura + implantação": ["architecture + deployment", "arquitectura + implementación"],
    "Do primeiro papo ao seu assistente funcionando.": ["From the first chat to your assistant up and running.", "De la primera charla a tu asistente funcionando."],
    "Conversa": ["Conversation", "Conversación"],
    "O que o seu assistente precisa fazer, com quais contas e com qual personalidade.": ["What your assistant needs to do, with which accounts and with what personality.", "Qué necesita hacer tu asistente, con qué cuentas y con qué personalidad."],
    "Implantação com a sua marca": ["Deployment with your brand", "Implementación con tu marca"],
    "Eu instalo na sua VPS, com o nome, a voz, as cores e as integrações que você escolher.": ["I install it on your VPS, with the name, voice, colors and integrations you choose.", "Lo instalo en tu VPS, con el nombre, la voz, los colores y las integraciones que elijas."],
    "Você usando": ["You, using it", "Tú usándolo"],
    "No navegador ou instalado no iPhone pela tela inicial. As contas e os dados continuam seus.": ["In the browser or installed on your iPhone home screen. The accounts and the data stay yours.", "En el navegador o instalado en el iPhone desde la pantalla de inicio. Las cuentas y los datos siguen siendo tuyos."],
    "Quanto custa para manter funcionando?": ["How much does it cost to keep running?", "¿Cuánto cuesta mantenerlo funcionando?"],
    "A estimativa de operação é de R$ 120 a 250 por mês, somando VPS, Claude e voz, com limite de gasto configurado. Você paga direto aos serviços, nas suas próprias contas.": ["Estimated running cost is R$ 120 to 250 per month (VPS, Claude and voice), with a spending cap configured. You pay the services directly, on your own accounts.", "El costo de operación estimado es de R$ 120 a 250 al mes (VPS, Claude y voz), con límite de gasto configurado. Pagas directamente a los servicios, en tus propias cuentas."],
    "Os dados ficam com quem?": ["Who keeps the data?", "¿Quién se queda con los datos?"],
    "Com você. O COSMOS roda no seu servidor e usa as suas contas e chaves (Anthropic, Google Cloud, Cartesia ou Groq e a VPS).": ["You do. COSMOS runs on your server and uses your accounts and keys (Anthropic, Google Cloud, Cartesia or Groq, and the VPS).", "Tú. COSMOS corre en tu servidor y usa tus cuentas y claves (Anthropic, Google Cloud, Cartesia o Groq y la VPS)."],
    "É um app de loja ou um serviço por assinatura?": ["Is it an app-store app or a subscription service?", "¿Es una app de tienda o un servicio por suscripción?"],
    "Não. É um assistente de um único usuário, hospedado no seu servidor. Você acessa pelo navegador e pode instalar no iPhone como app pela tela inicial.": ["No. It's a single-user assistant, hosted on your server. You use it in the browser and can install it on your iPhone home screen as an app.", "No. Es un asistente de un solo usuario, alojado en tu servidor. Lo usas en el navegador y puedes instalarlo en el iPhone como app desde la pantalla de inicio."],
    "E o WhatsApp?": ["What about WhatsApp?", "¿Y WhatsApp?"],
    "Pode ser o oficial (Cloud API) ou o pessoal (via WAHA, não oficial), a combinar. O pessoal não é isento de risco de bloqueio pelo WhatsApp.": ["It can be the official one (Cloud API) or a personal number (via WAHA, unofficial), to be agreed. The personal option is not free from the risk of being blocked by WhatsApp.", "Puede ser el oficial (Cloud API) o el personal (vía WAHA, no oficial), a convenir. El personal no está libre del riesgo de bloqueo por parte de WhatsApp."],
    "Dá para trocar a IA ou a voz?": ["Can I change the AI or the voice?", "¿Se puede cambiar la IA o la voz?"],
    "Sim. O modelo de IA é trocável no Hermes, e a voz pode ser da Cartesia, com a voz que você quiser, ou do Google.": ["Yes. The AI model can be swapped in Hermes, and the voice can be Cartesia, with any voice you like, or Google.", "Sí. El modelo de IA se cambia en Hermes, y la voz puede ser de Cartesia, con la voz que quieras, o de Google."],
    "Quanto custa a implantação?": ["How much does deployment cost?", "¿Cuánto cuesta la implementación?"],
    "Sob consulta: depende das integrações, da personalização e do servidor. Vamos conversar.": ["On request: it depends on the integrations, the customization and the server. Let's talk.", "A consultar: depende de las integraciones, la personalización y el servidor. Hablemos."],
    "Seu assistente.": ["Your assistant.", "Tu asistente."],
    "Seu nome. Seu servidor.": ["Your name. Your server.", "Tu nombre. Tu servidor."],
    "valor da implantação sob consulta": ["deployment price on request", "precio de implementación a consultar"],
    "COSMOS na prática": ["COSMOS in practice", "COSMOS en la práctica"],
    "✕ fechar": ["✕ close", "✕ cerrar"],
    "pensando…": ["thinking…", "pensando…"],
    "usando ferramentas": ["using tools", "usando herramientas"],
    "aguardando sua confirmação": ["waiting for your confirmation", "esperando tu confirmación"],
    "erro: fonte fora do ar": ["error: source down", "error: fuente caída"],
    "ouvindo…": ["listening…", "escuchando…"],
    "arraste para girar a galáxia": ["drag to spin the galaxy", "arrastra para girar la galaxia"],
    "WhatsApp, Gmail, Agenda": ["WhatsApp, Gmail, Calendar", "WhatsApp, Gmail, Agenda"],
    "às suas ordens": ["at your service", "a sus órdenes"],
    "esperando o seu sim": ["waiting for your yes", "esperando tu sí"],
    "enviado, senhor": ["sent, sir", "enviado, señor"],
    "Envia para o Pai que vamos jantar às 20h": ["Tell Dad we're having dinner at 8 pm", "Dile a papá que cenamos a las 20 h"],
    "Assistir": ["Watch", "Ver"],
    "Uso real, sem roteiro.": ["Real use, no script.", "Uso real, sin guion."],
    "projeto em destaque · agente de IA · 2026 ·": ["featured project · AI agent · 2026 ·", "proyecto destacado · agente de IA · 2026 ·"],
    "novo": ["new", "nuevo"],
    "Um mordomo que faz, não só responde.": ["A butler that does, not just answers.", "Un mayordomo que hace, no solo responde."],
    "Assistente pessoal de IA por voz e texto que manda WhatsApp, responde e-mails e marca reuniões. Arquitetura auto-hospedada, com o nome e a cara de quem usa.": ["A voice-and-text personal AI assistant that sends WhatsApp messages, answers emails and books meetings. Self-hosted architecture, with its owner's name and look.", "Asistente personal de IA por voz y texto que envía WhatsApp, responde correos y agenda reuniones. Arquitectura autoalojada, con el nombre y el estilo de quien lo usa."],
    "Conheça o COSMOS →": ["Meet COSMOS →", "Conoce COSMOS →"],
    "▶ apresentação · 49 s": ["▶ presentation · 49 s", "▶ presentación · 49 s"],
    "Conheça o COSMOS: abrir a página do projeto": ["Meet COSMOS: open the project page", "Conoce COSMOS: abrir la página del proyecto"],
    "Conheça o COSMOS": ["Meet COSMOS", "Conoce COSMOS"],
    "Assistente de IA": ["AI assistant", "Asistente de IA"],
    "Olá! Quero um assistente como o COSMOS, com o meu nome.": ["Hi! I want an assistant like COSMOS, with my own name.", "¡Hola! Quiero un asistente como COSMOS, con mi nombre."],
    "COSMOS: assistente de IA com o seu nome, no seu servidor | Alexandre Garcia": ["COSMOS: an AI assistant with your name, on your server | Alexandre Garcia", "COSMOS: un asistente de IA con tu nombre, en tu servidor | Alexandre Garcia"],
    "Arquitetura e implantação de um assistente pessoal de IA por voz e texto que manda WhatsApp, responde e-mails e marca reuniões. Auto-hospedado, com a sua marca.": ["Architecture and deployment of a voice-and-text personal AI assistant that sends WhatsApp messages, answers emails and books meetings. Self-hosted, with your brand.", "Arquitectura e implementación de un asistente personal de IA por voz y texto que envía WhatsApp, responde correos y agenda reuniones. Autoalojado, con tu marca."],
    "COSMOS: seu assistente de IA. Seu nome. Seu servidor.": ["COSMOS: your AI assistant. Your name. Your server.", "COSMOS: tu asistente de IA. Tu nombre. Tu servidor."],
  };

  /* blocos com negrito/links/spans: data-i18n-html="chave" */
  const H = {
    "proj.lead": ["Bringing together <strong>Backend</strong>, <strong>Frontend</strong> and the analytical mindset of <strong>Software Architecture</strong>.", "Uniendo <strong>Backend</strong>, <strong>Frontend</strong> y la visión analítica de la <strong>Arquitectura de Software</strong>."],
    "edu.intro": ["<strong>Systems Analysis and Development</strong> student at <strong>SENAC</strong>, focused on <strong>Backend</strong> and <strong>Frontend</strong>. Graduated in <strong>Architecture and Urbanism</strong> from Universidade Nove de Julho, with 12 years of experience in civil construction.", "Estudiante de <strong>Análisis y Desarrollo de Sistemas</strong> en <strong>SENAC</strong>, con foco en <strong>Backend</strong> y <strong>Frontend</strong>. Graduado en <strong>Arquitectura y Urbanismo</strong> por la Universidade Nove de Julho, con 12 años de experiencia en construcción civil."],
    "signal.1": ["Every <b>plan</b> starts with a line on paper.", "Todo <b>plano</b> empieza con un trazo en el papel."],
    "signal.2": ["Every <b>function</b> ends in delivery.", "Toda <b>función</b> termina en una entrega."],
    "game.desk": ["<b>mouse</b> or <b>← →</b> move the paddle · <b>click</b> or <b>space</b> launches · <b>P</b> pauses", "<b>ratón</b> o <b>← →</b> mueven la paleta · <b>clic</b> o <b>espacio</b> lanza · <b>P</b> pausa"],
    "game.touch": ["<b>drag</b> to move · <b>tap</b> to launch", "<b>arrastra</b> para mover · <b>toca</b> para lanzar"],
    "game.tip": ["catch the <b>+1</b> capsules for extra balls", "atrapa las cápsulas <b>+1</b> para ganar bolas extra"],
    "game.play": ["While we're not talking yet, <b>click to play brick breaker</b>", "Mientras no hablamos, <b>haz clic para jugar al rompeladrillos</b>"],
    "form.success": ["Thanks for reaching out, <span id=\"successName\">all set</span>. I'll reply within 1 business day to the email you provided.", "Gracias por escribir, <span id=\"successName\">todo listo</span>. Te respondo en hasta 24 h hábiles al e-mail indicado."],
  };

  const idx = lang === "en" ? 0 : lang === "es" ? 1 : -1;
  const norm = (s) => s.replace(/\s+/g, " ").trim();

  /** traduz um texto em português; {chave} é substituída por vars.chave */
  function t(pt, vars){
    let out = pt;
    if (idx >= 0){
      const row = D[pt] || D[norm(pt)];
      if (row) out = row[idx];
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ""));
    return out;
  }

  function translateDOM(root){
    if (idx < 0) return;
    // texto: percorre os nós de texto, mantendo os espaços de borda originais
    const skip = (el) => el.closest && el.closest("script, style, [translate='no'], .notranslate, #heroCodeText, [data-i18n-html]");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && !skip(n.parentElement)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const raw = n.nodeValue, key = norm(raw);
      const row = D[key];
      if (!row) return;
      const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      n.nodeValue = lead + row[idx] + trail;
    });
    // atributos
    root.querySelectorAll("[placeholder], [aria-label], [title], [alt]").forEach((el) => {
      ["placeholder", "aria-label", "title", "alt"].forEach((a) => {
        const v = el.getAttribute(a);
        if (v && D[norm(v)]) el.setAttribute(a, D[norm(v)][idx]);
      });
    });
    // blocos HTML
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const row = H[el.getAttribute("data-i18n-html")];
      if (row) el.innerHTML = row[idx];
    });
  }

  function translateHead(){
    if (idx < 0) return;
    if (D[norm(document.title)]) document.title = D[norm(document.title)][idx];
    document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]').forEach((m) => {
      const v = m.getAttribute("content");
      if (v && D[norm(v)]) m.setAttribute("content", D[norm(v)][idx]);
    });
  }

  /* ---------- seletor de idioma (menu de configurações) ---------- */
  function initSwitch(){
    document.querySelectorAll(".lang-btn[data-lang]").forEach((btn) => { // só os botões (o <html> também tem data-lang)
      const on = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-lang");
        if (next === lang) return;
        try { localStorage.setItem("agLang", next); } catch (e){}
        // recarrega por trás do véu de transição (mesmo fade da troca de página)
        const root = document.documentElement;
        root.classList.add("is-leaving");
        root.classList.remove("is-revealed");
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setTimeout(() => location.reload(), reduce ? 60 : 460);
      });
    });
  }

  document.documentElement.lang = HTML_LANG[lang];
  document.documentElement.setAttribute("data-lang", lang);
  window.I18N = { lang, t, translateDOM };
  translateHead();
  translateDOM(document.body);
  initSwitch();
})();
