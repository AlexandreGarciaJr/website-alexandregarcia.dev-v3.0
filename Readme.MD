<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/logo-dark.png">
  <source media="(prefers-color-scheme: light)" srcset=".github/logo-light.png">
  <img src=".github/logo-dark.png" alt="Alexandre Garcia · Full Stack Dev" width="560">
</picture>

# Da planta ao código

Portfólio de um arquiteto que virou desenvolvedor.

**[alexandregarcia.dev →](https://alexandregarcia.dev/)**

![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=flat-square&logo=greensock&logoColor=black)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=flat-square&logo=webgl&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat-square&logo=php&logoColor=white)

</div>

![Topo do site com a maquete 3D da casa e o painel de parâmetros](.github/preview-hero.png)

## Sobre

Este é o meu portfólio pessoal. Sou formado em **Arquitetura e Urbanismo**, trabalhei 12 anos com projetos e obras e hoje sou desenvolvedor, estudando **Análise e Desenvolvimento de Sistemas no SENAC**.

O site conta essa história sem precisar de muito texto. Logo no topo há uma **maquete 3D de uma casa** e, quando você rola a página, ela se desfaz e vira **código-fonte**. É a minha transição de carreira acontecendo na tela.

Daí em diante, o site apresenta:

- quem eu sou;
- minha trajetória, de arquiteto a desenvolvedor na **New Arrays**;
- os projetos que entreguei;
- minha formação;
- um jeito direto de falar comigo.

O site está em três idiomas e funciona bem do celular ao monitor grande.

## Destaques

**Uma casa que vira código.** O topo tem uma maquete 3D de verdade, feita em Three.js, com um painel de parâmetros ao vivo:

- etapa da obra;
- horário do dia (a luz muda junto);
- corte de seção;
- visual Holograma ou Natural;
- rotação.

Ao rolar a página, ou ao clicar em "Código" no painel, a casa se desmancha em caracteres que voam e pousam formando um arquivo de código. Esse código usa os valores que estão no painel naquele momento.

![A casa se desfazendo em caracteres até formar o código](.github/preview-casa-codigo.webp)

**"Quem sou eu" com brilho próprio.** Um campo de partículas feito com shader, um brilho que acompanha o título em cada idioma e números que contam a minha história: anos de código, de obra, projetos e idiomas.

![Seção Sobre com foto, números e stack](.github/preview-sobre.webp)

**Do notebook para a Trajetória, sem corte.** O notebook 3D que fecha o "Sobre" gira e a câmera mergulha na tela dele. O que aparece lá dentro é o primeiro quadro do vídeo da Trajetória, então as duas seções emendam sem salto. O título "Trajetória" é desenhado traço a traço e os cartões de experiência entram em sequência, até chegar ao cargo atual na New Arrays.

![Título da Trajetória e cartões de experiência](.github/preview-trajetoria.webp)

**Projetos em prancheta.** Os projetos ficam num grid editorial de 12 colunas. Os cartões inclinam de leve sob o mouse, com reflexo de luz, e o fundo da seção acende na cor do projeto em que você está.

![Grid de projetos](.github/preview-projetos.webp)

**Contato que também é jogo.**

- **Formulário:** a página de contato tem um formulário completo, com validação em tempo real.
- **Quebra-Blocos:** no fim da página inicial, um clique transforma o fundo da seção num jogo feito em Canvas 2D. Dá para jogar com mouse, toque ou setas.

![Página de contato](.github/preview-contato.webp)

**Detalhes de interface.**

- **Áudio:** duas trilhas ambientes (Sci-Fi e Synthwave), com mute e controle de volume. Um aviso discreto chama para o primeiro clique.
- **Temas:** quatro cores de destaque (azul, esmeralda, âmbar e violeta).
- **Configurações:** um painel que reúne tema, idioma e trilha.
- **Loader:** desenhado com o logo do site.

## Feito com cuidado

| | |
|---|---|
| **Sem build** | HTML, CSS e JavaScript puro, sem framework e sem `npm install` para rodar |
| **Três idiomas** | Português, English e Español. Na primeira visita o idioma vem do navegador, e a escolha fica salva |
| **Mobile de verdade** | Versão própria para celular, com hero em coluna, mergulho no notebook em retrato e quadros mais leves. Ajustes específicos para Safari/iOS e para notebooks de tela baixa |
| **Acessibilidade** | `<main>` e títulos semânticos, menus que respeitam a tecla Esc e o foco do teclado, contraste revisado e respeito ao "reduzir movimento" do sistema |
| **Testado** | QA automatizado com Playwright em desktop, notebook e celular, incluindo auditoria de acessibilidade com axe-core |
| **Desempenho** | Maquete GLB otimizada para poucas chamadas de desenho, imagens comprimidas e carregamento sob demanda |
| **Compartilhamento** | Open Graph completo, para o link aparecer com imagem e ícone no WhatsApp e no LinkedIn |
| **SEO e medição** | URL canônica, dados estruturados, sitemap, GA4, Meta Pixel e Clarity com consentimento (LGPD), conversões prontas para Google Ads |
| **Formulário seguro** | Validação no navegador e no servidor, checagem do domínio do e-mail, proteção contra robôs e envios repetidos. As credenciais nunca vão para o repositório |

**Tecnologias:**

- [Three.js](https://threejs.org) r186, com GLTFLoader, EffectComposer e UnrealBloom;
- shaders GLSL próprios;
- [GSAP](https://gsap.com) + ScrollTrigger;
- [Lenis](https://lenis.darkroom.engineering);
- Canvas 2D e Web Audio;
- [PHPMailer](https://github.com/PHPMailer/PHPMailer).

![Versão para celular](.github/preview-mobile.webp)

## Medição, anúncios e SEO

O site está pronto para receber tráfego pago e ser encontrado no Google.

- **Google Analytics 4:** sempre ativo, para medir visitas, origem do tráfego e contatos de forma agregada, sem uso em anúncios.
- **Meta Pixel e Microsoft Clarity:** só carregam depois que a pessoa aceita no aviso de cookies (LGPD). O Pixel mede campanhas do Instagram e do Facebook; o Clarity mostra mapas de calor e gravações anônimas, com os campos do formulário mascarados.
- **Consent Mode v2 do Google:** os sinais de publicidade começam negados e só são liberados com o aceite.
- **Conversões separadas:** envio bem-sucedido do formulário (`generate_lead` / `Lead`) e clique no WhatsApp (`contact_whatsapp` / `Contact`), prontos para importar no Google Ads e usar nas campanhas da Meta.
- **Aviso de cookies próprio:** no visual do site, em três idiomas, só com Aceitar e Recusar, e reaberto pelo link "Cookies" no rodapé. Aparece depois que o loader e a maquete 3D terminam de carregar, para não atrapalhar a primeira impressão.
- **Página de privacidade** com as ferramentas usadas, a finalidade de cada uma e os direitos do titular.
- **SEO técnico:** título e descrição por página, URL canônica, dados estruturados (Schema.org `Person` e `WebSite`), Open Graph, `sitemap.xml` e `robots.txt`.

Toda a configuração fica em um arquivo, `js/tracking.js`: os IDs das ferramentas ficam no topo, e nenhum script de terceiros é colado direto no HTML.

## Rodar localmente

Clone o repositório (ou baixe o .zip), entre na pasta e suba um servidor PHP:

```bash
cd alexandregarcia-site
php -S localhost:8000
```

Abra **http://localhost:8000**. O Live Server do VS Code também funciona, mas sem o envio do formulário.

Para o formulário enviar de verdade (o GitHub Pages não executa PHP):

1. Coloque o PHPMailer (`src/`) na raiz.
2. Copie `config.example.php` para `config.php`.
3. Preencha o `config.php` com o seu SMTP. No Gmail, use uma senha de app.

Os arquivos `.php` com dados sensíveis ficam fora do Git.

## Estrutura

```text
├── index.html              página principal
├── contato.html            página de contato
├── privacidade.html        política de privacidade e cookies
├── config.example.php      modelo das credenciais SMTP
├── LICENSE                 licença MIT (só o código)
├── site.webmanifest        ícone e cores do site
├── css/style.css           estilos
├── js/
│   ├── hero3d.js           maquete 3D e transformação em código
│   ├── main.js             animações, seções, áudio, menus e painel
│   ├── i18n.js             traduções PT / EN / ES
│   ├── contato.js          formulário e campo de pontos
│   ├── tracking.js         GA4, Meta Pixel, Clarity e aviso de cookies
│   └── quebra-blocos.js    mini-jogo da seção de contato
└── assets/
    ├── models/             maquete GLB da casa
    ├── video/              quadros da Trajetória (desktop e celular)
    ├── img/                fotos, projetos, logo e imagem de compartilhamento
    ├── audio/              trilhas ambientes
    ├── fonts/              Archivo variável
    ├── svg/                logos e favicon
    └── vendor/             GSAP, ScrollTrigger, Lenis e Three.js locais
```

Para adicionar um projeto, copie um cartão em `index.html` e ajuste as classes `c-3` a `c-7` para que cada linha do grid some 12. Para adicionar uma tradução, inclua o texto em português e as versões em inglês e espanhol no objeto `D` de `js/i18n.js`.

## Projetos no site

| Projeto | O que é | Stack |
|---|---|---|
| **BHD Móveis** | Site vitrine de loja de móveis outlet, gerado em PHP a partir de JSON | PHP, JSON, JS, GSAP |
| **New Arrays** | Site da agência de experiência digital | HTML, CSS, JS, PHP |
| **Teon App** | Reformulação de UX e funcionalidades do site do app | React, Next, TypeScript |
| **NRA Assessoria** | Site para empresa de geologia e meio ambiente | HTML, CSS, JS, PHP |
| **Augusto Tomba** | Portfólio de artista com estética minimalista japonesa | HTML, CSS, JS, PHP |
| **Maonamassa** | Plataforma que conecta clientes a prestadores de serviço | HTML, CSS, JS, PHP, SQL |
| **Bikecraft** | Site para o universo das bicicletas | HTML, CSS, JS, PHP |
| **Alexandre Personal** | Página de personal trainer autônomo | HTML, CSS, JS, PHP |
| **Foodi App** | App de delivery em React Native (projeto acadêmico) | React Native, TypeScript |
| **Banco DIO** | API bancária com documentação Swagger | Java, Spring Boot, MySQL |
| **Loja de Eletrônicos** | API de controle de caixa | C#, MySQL |

## Licença

O código-fonte (HTML, CSS, JavaScript e PHP) está sob a [licença MIT](LICENSE): pode ser estudado, copiado e adaptado, mantendo o aviso de copyright.

Ficam de fora da licença: textos, fotos, nome, logo, identidade visual, vídeos, imagens, trilhas de áudio e o modelo 3D. O conteúdo pessoal tem todos os direitos reservados. Bibliotecas, fontes e mídias de terceiros (GSAP, Lenis, Three.js, PHPMailer, Archivo) mantêm as suas próprias licenças.

---

<div align="center">

**[alexandregarcia.dev](https://alexandregarcia.dev/)**

[LinkedIn](https://www.linkedin.com/in/alexandregarcia-junior/) · [GitHub](https://github.com/AlexandreGarciaJr) · [E-mail](mailto:alexandregojunior@gmail.com)

</div>
