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
    "→ Ver Projeto": ["→ View Project", "→ Ver Proyecto"],
    "Reformulação de todo o UX Design e funcionalidades do Website de apresentação do app Teon.": ["Complete UX redesign and new features for the Teon app's showcase website.", "Rediseño completo de la UX y de las funcionalidades del sitio de presentación de la app Teon."],
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
