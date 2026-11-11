// Pagine di approfondimento per Google (una per ricerca: robot Kress, Honda Miimo, assistenza, attrezzi).
// Sono generate dal Worker partendo dal catalogo del sito (blocco <script id="cfg"> di public/index.html),
// così quando il titolare modifica prodotti o foto le pagine si aggiornano da sole, senza duplicare i dati.

const SITO = "https://panerogardencenter.panerogarden.workers.dev";

const GRUPPI_HONDA = [
  ["hras", "Rasaerba Honda"],
  ["htra", "Trattorini Honda"],
  ["hdec", "Decespugliatori Honda"],
  ["htos", "Tosasiepi Honda"],
  ["hsof", "Soffiatori Honda"],
  ["hmul", "Multifunzione Versatool"],
  ["hbat", "Attrezzi Honda a batteria"],
  ["hzap", "Motozappe Honda"],
  ["hneve", "Spazzaneve Honda"],
  ["hgen", "Generatori Honda"],
  ["hpom", "Motopompe Honda"],
];

const robot = (marca) => (x) => !x.g && String(x.n || "").split(" ")[0] === marca;
const gruppo = (g) => (x) => x.g === g;

export const PAGINE = {
  "/robot-rasaerba-kress": {
    titolo: "Robot rasaerba Kress a Ciriè (TO) – vendita e installazione",
    h1: "Robot rasaerba Kress a Ciriè",
    breve: "Robot Kress",
    desc: "Robot tagliaerba Kress RTK, EyePilot e Mission Mega senza filo perimetrale: vendita, installazione e assistenza a Ciriè (TO) da Panero Francesco S.N.C. Prezzi e schede tecniche.",
    intro: (c) => [
      marchio(c, "Kress"),
      "Da noi trovi tutta la gamma: i Kress RTK per i giardini di casa, gli EyePilot 4×4 con la visione AI per i prati con ostacoli e pendenze, e i Mission Mega per le grandi superfici fino a 24.000 m². Ti aiutiamo a scegliere in base a metri quadri, pendenze e ostacoli, poi installiamo e configuriamo il robot nel tuo giardino.",
    ],
    sezioni: [
      ["Per giardini fino a 1.000 m²", (x) => robot("Kress")(x) && x.s === "s"],
      ["Per giardini fino a 1.500 m²", (x) => robot("Kress")(x) && x.s === "m"],
      ["Per prati oltre 2.000 m²", (x) => robot("Kress")(x) && x.s === "l"],
    ],
    faq: [
      ["Serve il filo perimetrale?", "No. I robot Kress usano la navigazione satellitare RTK: i confini del prato si disegnano dall'app, senza interrare nessun filo."],
      ["Fate voi l'installazione?", "Sì. Veniamo in giardino, posizioniamo l'antenna e la stazione di ricarica, mappiamo il prato e ti spieghiamo come usare l'app."],
      ["Quale modello scelgo?", "Dipende dalla superficie, dalle pendenze e dagli ostacoli. Chiamaci o passa in negozio: la consulenza è gratuita."],
      ["E se si guasta?", "Ripariamo i robot Kress nella nostra officina, con ricambi originali, e facciamo anche la manutenzione e lo svernamento."],
    ],
  },
  "/robot-rasaerba-honda-miimo": {
    titolo: "Robot rasaerba Honda Miimo a Ciriè (TO) – vendita e assistenza",
    h1: "Robot rasaerba Honda Miimo a Ciriè",
    breve: "Robot Honda Miimo",
    desc: "Robot tagliaerba Honda Miimo HRM 1000, 1500, 2500, 3000 e 4000 Live: vendita, installazione con filo perimetrale e riparazione a Ciriè (TO) da Panero Francesco S.N.C.",
    intro: (c) => [
      marchio(c, "Honda"),
      "Vendiamo e ripariamo i robot Honda: scegliamo con te il Miimo adatto al tuo prato, posiamo il filo perimetrale, programmiamo il robot e lo seguiamo negli anni con tagliandi, cambio lame e ricovero invernale.",
    ],
    sezioni: [
      ["Per giardini fino a 1.000 m²", (x) => robot("Honda")(x) && x.s === "s"],
      ["Per giardini fino a 1.500 m²", (x) => robot("Honda")(x) && x.s === "m"],
      ["Per prati fino a 4.000 m²", (x) => robot("Honda")(x) && x.s === "l"],
    ],
    faq: [
      ["Il Miimo ha bisogno del filo perimetrale?", "Sì, i Miimo lavorano all'interno di un filo perimetrale. Lo posiamo noi durante l'installazione, insieme alla stazione di ricarica."],
      ["Cosa vuol dire Live?", "I modelli Live si collegano allo smartphone: puoi controllare e programmare il robot dall'app."],
      ["Riparate anche Miimo comprati altrove?", "Sì, ripariamo e manuteniamo i robot Honda Miimo anche se non li hai acquistati da noi."],
    ],
  },
  "/assistenza-robot-rasaerba": {
    titolo: "Assistenza e riparazione robot rasaerba a Ciriè (TO)",
    h1: "Assistenza e riparazione robot rasaerba",
    breve: "Assistenza robot",
    desc: "Riparazione, manutenzione e svernamento di robot rasaerba di tutte le marche a Ciriè (TO): diagnosi, preventivo prima dell'intervento, ricambi originali. Panero Francesco S.N.C.",
    intro: () => [
      "Il tuo robot tagliaerba non parte, non torna alla base o taglia male? Nella nostra officina di Ciriè ripariamo i robot rasaerba di tutte le principali marche: motori, lame, batterie, sensori e schede elettroniche.",
      "Prima di intervenire ti diciamo costi e tempi. A fine stagione ci occupiamo anche di pulizia, cambio lame e ricovero invernale, con ritiro e riconsegna.",
    ],
    servizi: true,
    faq: [
      ["Riparate robot di qualsiasi marca?", "Sì, ripariamo i robot rasaerba delle principali marche, non solo quelli che vendiamo."],
      ["Quanto costa la riparazione?", "Dipende dal guasto: facciamo prima la diagnosi e ti comunichiamo il preventivo. Interveniamo solo dopo il tuo via libera."],
      ["Venite a ritirare il robot?", "Sì, puoi portarlo in negozio oppure prenotare il ritiro a domicilio."],
      ["Fate lo svernamento?", "Sì: controllo, pulizia, cambio lame e ricovero invernale, così in primavera il robot riparte senza problemi."],
    ],
  },
  "/attrezzi-giardino-honda": {
    titolo: "Rasaerba, trattorini e attrezzi Honda a Ciriè (TO)",
    h1: "Rasaerba e attrezzi da giardino Honda",
    breve: "Attrezzi Honda",
    desc: "Rasaerba, trattorini, decespugliatori, tosasiepi, motozappe, spazzaneve, generatori e motopompe Honda a Ciriè (TO): vendita, assistenza e ricambi da Panero Francesco S.N.C.",
    intro: () => [
      "A Ciriè vendiamo e ripariamo prodotti Honda. Trovi qui tutta la gamma per il giardino e il lavoro: rasaerba, trattorini, decespugliatori, tosasiepi, soffiatori, motozappe, spazzaneve, generatori e motopompe.",
      "Ogni macchina la consegniamo pronta all'uso e la seguiamo nel tempo con tagliandi, riparazioni e ricambi originali.",
    ],
    sezioni: GRUPPI_HONDA.map(([g, t]) => [t, gruppo(g)]),
    faq: [
      ["Fate assistenza sui prodotti Honda?", "Sì, ripariamo e facciamo il tagliando a rasaerba, trattorini e attrezzi Honda nella nostra officina, con ricambi originali."],
      ["I prezzi sono indicati?", "Per molti prodotti il prezzo è su richiesta: chiamaci o scrivici e ti facciamo subito un preventivo."],
    ],
  },
  "/rasaerba-grin": {
    titolo: "Rasaerba Grin mulching a Ciriè (TO) – vendita e assistenza",
    h1: "Rasaerba Grin a Ciriè",
    breve: "Rasaerba Grin",
    desc: "Rasaerba Grin con mulching brevettato senza sacco: modelli a spinta, semoventi e a batteria 82V. Vendita e assistenza a Ciriè (TO) da Panero Francesco S.N.C.",
    intro: (c) => [
      marchio(c, "Grin"),
      "Con un Grin non raccogli l'erba: la lama brevettata la sminuzza finissima e la lascia sul prato, che resta concimato e più verde. Da noi trovi i modelli a spinta per il giardino di casa, i semoventi e i professionali per i prati grandi e in pendenza e le versioni a batteria 82V.",
    ],
    sezioni: [
      ["Rasaerba a spinta", gruppo("gsp")],
      ["Rasaerba semoventi e professionali", gruppo("gse")],
    ],
    faq: [
      ["Non serve il sacco di raccolta?", "No: i Grin sono rasaerba mulching. L'erba tagliata viene sminuzzata e resta sul prato come concime naturale, quindi non c'è niente da svuotare."],
      ["Bisogna tagliare più spesso?", "Con il mulching conviene tagliare con regolarità, togliendo poca erba alla volta: il prato viene più bello e il lavoro è più veloce."],
      ["Fate assistenza sui Grin?", "Sì, vendiamo i rasaerba Grin e ci occupiamo di tagliandi, affilatura e riparazioni."],
    ],
  },
  "/attrezzi-batteria-kress": {
    titolo: "Attrezzi a batteria Kress 40V e 60V a Ciriè (TO)",
    h1: "Attrezzi da giardino a batteria Kress",
    breve: "Attrezzi Kress a batteria",
    desc: "Rasaerba, decespugliatori, tosasiepi, soffiatori e motoseghe a batteria Kress 40V e 60V Professional a Ciriè (TO): vendita e assistenza da Panero Francesco S.N.C.",
    intro: () => [
      "Gli attrezzi a batteria Kress sono silenziosi, non fanno fumo e non hanno bisogno di miscela. La linea 40V è pensata per il giardino di casa, la 60V Professional per chi lavora tutti i giorni e cerca la potenza di un motore a scoppio.",
      "Ti consigliamo la batteria e il caricabatterie giusti e ti seguiamo con assistenza e ricambi.",
    ],
    sezioni: [
      ["Kress 40V", gruppo("k40")],
      ["Kress 60V Professional", gruppo("k60")],
    ],
    faq: [
      ["Le batterie sono compatibili tra gli attrezzi?", "Sì, all'interno della stessa linea (40V oppure 60V) la batteria si usa su tutti gli attrezzi."],
      ["Fate assistenza sugli attrezzi Kress?", "Sì, vendiamo gli attrezzi Kress e ci occupiamo anche di assistenza e ricambi."],
    ],
  },
};

let cache = null;

async function datiSito(env, request) {
  if (cache) return cache;
  const res = await env.ASSETS.fetch(new Request(new URL("/", request.url)));
  const html = await res.text();
  const m = html.match(/<script id="cfg" type="application\/json">([\s\S]*?)<\/script>/);
  const cfg = JSON.parse(m[1]);
  const prato = (html.match(/url\((data:image\/webp;base64,[^)]+)\) center\/cover,#3d7d2e/) || [])[1] || "";
  cache = { cfg, prato };
  return cache;
}

export const slug = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

function marchio(c, nome) {
  const m = (c.marchi || []).find((x) => x.n === nome);
  return m ? m.d : "";
}

function dataUri(uri) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(uri || "");
  if (!m) return null;
  const bin = atob(m[2]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new Response(out, {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=86400" },
  });
}

// /img/logo.webp, /img/prato.webp e /img/p/<nome-prodotto>.webp
export async function immagine(request, env) {
  const { cfg, prato } = await datiSito(env, request);
  const p = new URL(request.url).pathname;
  let res = null;
  if (p === "/img/logo.webp") res = dataUri(cfg.logo);
  else if (p === "/img/prato.webp") res = dataUri(prato);
  else if (p.startsWith("/img/p/")) {
    const s = p.slice(7).replace(/\.webp$/, "");
    const x = (cfg.prodotti || []).find((it) => slug(it.n) === s && it.f);
    if (x) res = dataUri(x.f);
  }
  return res || new Response("Immagine non trovata", { status: 404 });
}

function tel(n) {
  const t = String(n || "").replace(/\s+/g, "");
  return /^0\d{9}$/.test(t) ? t.slice(0, 3) + " " + t.slice(3, 6) + " " + t.slice(6) : t;
}

function scheda(x) {
  const righe = String(x.t || "")
    .split("\n")
    .map((r) => r.split(/:\s(.*)/s))
    .filter((r) => r[0] && r[1]);
  const img = x.f
    ? `<img src="/img/p/${slug(x.n)}.webp" alt="${esc(x.n)}" width="600" height="600" loading="lazy" decoding="async">`
    : `<span class="emo" aria-hidden="true">${esc(x.i && x.i !== "1" ? x.i : "🌿")}</span>`;
  return `<article class="card"><div class="pic">${img}</div><div class="bd">
<h3>${esc(x.n)}</h3>${x.m ? `<p class="m">${esc(x.m)}</p>` : ""}
<p class="pr">${esc(x.p)}</p>${x.d ? `<p>${esc(x.d)}</p>` : ""}
${righe.length ? `<details><summary>Scheda tecnica</summary><table>${righe.map((r) => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("")}</table><p class="nota">Dati indicativi del costruttore.</p></details>` : ""}
<a class="btn o" href="${SITO}/#contatti">Chiedi informazioni</a></div></article>`;
}

const CSS = `
:root{--base:#2e7d32;--bg:#f6f8f3;--fg:#17261c;--muted:#52635a;--card:#fff;--border:#d5e0cd;--accent:#2e7d32;--soft:#e6f0e1;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0f1812;--fg:#e8f1e9;--muted:#a3b5a8;--card:#17241c;--border:#27392d;--accent:#8fd18a;--soft:#18281d;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.6 Figtree,system-ui,sans-serif}
a{color:var(--accent)}
img{max-width:100%;height:auto}
.wrap{max-width:1100px;margin:0 auto;padding-left:max(18px,env(safe-area-inset-left,0px));padding-right:max(18px,env(safe-area-inset-right,0px))}
header{position:relative;background:linear-gradient(90deg,rgba(4,24,10,.72),rgba(4,24,10,.4) 50%,rgba(4,24,10,.2)),url(/img/prato.webp) center/cover,#2e6b26;color:#fff;border-top:4px solid #b3123f}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-block:16px}
.logo{display:flex;align-items:center;gap:14px;color:#fff;text-decoration:none}
.logo img{height:64px;width:auto;filter:drop-shadow(0 3px 8px rgba(0,0,0,.45))}
.logo b{display:block;font-family:"Bricolage Grotesque",Figtree,sans-serif;font-size:clamp(1.25rem,3vw,1.9rem);line-height:1.1;text-shadow:0 2px 10px rgba(0,0,0,.35)}
.logo small{color:#dff2cf;font-weight:600}
.call{display:inline-flex;flex-direction:column;padding:8px 18px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);color:#fff;text-decoration:none;line-height:1.2}
.call small{color:#dff2cf;font-size:.75rem;font-weight:600}.call b{font-size:1.1rem}
nav.top{background:var(--card);border-bottom:1px solid var(--border)}
nav.top .wrap{display:flex;gap:6px;overflow-x:auto;padding-block:8px}
nav.top a{flex:none;padding:7px 14px;border-radius:999px;text-decoration:none;color:var(--fg);font-weight:600;font-size:.92rem}
nav.top a[aria-current]{background:var(--base);color:#fff}
.bc{font-size:.88rem;color:var(--muted);margin:18px 0 0}.bc a{color:var(--muted)}
h1,h2{font-family:"Bricolage Grotesque",Figtree,sans-serif;line-height:1.15;text-wrap:balance}
h1{font-size:clamp(1.8rem,4.5vw,2.8rem);margin:10px 0 14px}
h2{font-size:clamp(1.35rem,3vw,1.8rem);margin:42px 0 16px}
.intro{max-width:70ch;font-size:1.08rem}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}
.btn{display:inline-block;padding:11px 20px;border-radius:999px;background:var(--base);color:#fff;text-decoration:none;font-weight:700;border:2px solid var(--base)}
.btn.o{background:transparent;color:var(--accent);border-color:color-mix(in srgb,var(--accent) 50%,transparent);padding:8px 16px;font-size:.92rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}
.card{background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;min-width:0}
.pic{aspect-ratio:1;background:#000;display:grid;place-items:center}
.pic img{width:100%;height:100%;object-fit:cover}
.emo{font-size:4rem}
.bd{padding:14px 16px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
.bd h3{margin:0;font-size:1.08rem;line-height:1.25}
.bd p{margin:0;font-size:.95rem}
.m{color:var(--muted);font-weight:600}
.pr{font-weight:700;color:var(--accent)}
.bd .btn{margin-top:auto;align-self:flex-start}
details{font-size:.9rem;margin:4px 0 8px}summary{cursor:pointer;font-weight:600;color:var(--accent)}
table{width:100%;border-collapse:collapse;margin-top:6px}th,td{text-align:left;padding:4px 0;border-bottom:1px solid var(--border);vertical-align:top}th{font-weight:600;padding-right:10px;width:45%}
.nota{color:var(--muted);font-size:.8rem;margin-top:6px}
.serv{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
.serv div{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px}
.serv h3{margin:0 0 4px;font-size:1.05rem}.serv p{margin:0;font-size:.95rem}
ol.passi{padding-left:1.3em}ol.passi li{margin-bottom:8px}
.faq details{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px 16px;margin:0 0 10px;font-size:1rem}
.faq summary{color:var(--fg)}.faq p{margin:8px 0 0}
.box{background:var(--soft);border-radius:20px;padding:22px;margin:42px 0}
.box h2{margin-top:0}
footer{margin-top:50px;border-top:1px solid var(--border);padding-block:24px 40px;color:var(--muted);font-size:.92rem}
footer .wrap{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
footer ul{list-style:none;padding:0;margin:0}footer li{margin-bottom:4px}
@media(max-width:600px){.logo img{height:48px}.call{display:none}}
`;

export async function pagina(request, env) {
  const url = new URL(request.url);
  const P = PAGINE[url.pathname];
  const { cfg: c } = await datiSito(env, request);
  const prodotti = c.prodotti || [];
  const t = tel(c.telefono);
  const wa = "39" + String(c.whatsapp || c.telefono || "").replace(/\D/g, "").replace(/^0039|^39/, "");

  let corpo = "";
  if (P.sezioni) {
    for (const [titolo, f] of P.sezioni) {
      const L = prodotti.filter(f);
      if (!L.length) continue;
      corpo += `<section><h2>${esc(titolo)}</h2><div class="grid">${L.map(scheda).join("")}</div></section>`;
    }
  }
  if (P.servizi) {
    corpo += `<section><h2>Cosa facciamo</h2><div class="serv">${(c.servizi || [])
      .map((s) => `<div><h3>${esc(s.i)} ${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`)
      .join("")}</div></section>`;
    corpo += `<section><h2>${esc(c.tRip || "Come funziona la riparazione")}</h2><ol class="passi">${(c.passi || [])
      .map((s) => `<li><b>${esc(s.t)}.</b> ${esc(s.d)}</li>`)
      .join("")}</ol></section>`;
    corpo += `<section><h2>Perché sceglierci</h2><div class="serv">${(c.perche || [])
      .map((s) => `<div><h3>${esc(s.i)} ${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`)
      .join("")}</div></section>`;
  }
  corpo += `<section class="faq"><h2>Domande frequenti</h2>${P.faq
    .map(([d, r]) => `<details><summary>${esc(d)}</summary><p>${esc(r)}</p></details>`)
    .join("")}</section>`;

  const contatti = `<div class="box"><h2>Vieni a trovarci a Ciriè</h2>
<p>${esc(c.indirizzo)} · Tel. <a href="tel:${esc(c.telefono)}">${esc(t)}</a> · <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
<p>Orari: ${esc(c.orari).replace(/\n/g, " · ")}</p>
<div class="cta"><a class="btn" href="tel:${esc(c.telefono)}">Chiama ${esc(t)}</a><a class="btn o" href="https://wa.me/${esc(wa)}">WhatsApp</a><a class="btn o" href="${SITO}/#contatti">Richiedi un preventivo</a><a class="btn o" href="${esc(c.gUrl || "")}">Indicazioni stradali</a></div></div>`;

  const nav = Object.entries(PAGINE)
    .map(([p, x]) => `<a href="${p}"${p === url.pathname ? ' aria-current="page"' : ""}>${esc(x.breve)}</a>`)
    .join("");
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITO + "/" },
        { "@type": "ListItem", position: 2, name: P.breve, item: SITO + url.pathname },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: P.faq.map(([d, r]) => ({ "@type": "Question", name: d, acceptedAnswer: { "@type": "Answer", text: r } })),
    },
  ];

  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(P.titolo)} | Panero Francesco S.N.C</title>
<meta name="description" content="${esc(P.desc)}"><link rel="canonical" href="${SITO}${url.pathname}">
<meta name="theme-color" content="#1f4716"><meta property="og:type" content="website"><meta property="og:locale" content="it_IT">
<meta property="og:title" content="${esc(P.titolo)}"><meta property="og:description" content="${esc(P.desc)}">
<meta property="og:url" content="${SITO}${url.pathname}"><meta property="og:image" content="${SITO}/og.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;600;700&display=swap">
<style>${CSS}</style><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script></head><body>
<header><div class="wrap"><a class="logo" href="/"><img src="/img/logo.webp" alt="Logo Panerogarden" width="98" height="64"><span><b>${esc(c.ditta)}</b><small>${esc(c.footer)} · Ciriè (TO)</small></span></a>
<a class="call" href="tel:${esc(c.telefono)}"><small>Chiamaci</small><b>${esc(t)}</b></a></div></header>
<nav class="top" aria-label="Pagine"><div class="wrap"><a href="/">Home</a>${nav}</div></nav>
<main class="wrap"><p class="bc"><a href="/">Home</a> › ${esc(P.breve)}</p>
<h1>${esc(P.h1)}</h1><div class="intro">${P.intro(c).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
<div class="cta"><a class="btn" href="tel:${esc(c.telefono)}">Chiama ${esc(t)}</a><a class="btn o" href="${SITO}/#contatti">Richiedi un preventivo</a><a class="btn o" href="/#catalogo">Tutto il catalogo</a></div>
${corpo}${contatti}</main>
<footer><div class="wrap"><div><b>${esc(c.ditta)}</b><br>${esc(c.indirizzo)}<br>Tel. ${esc(t)} · P.IVA ${esc(c.piva)}</div>
<ul><li><a href="/">Home</a></li>${Object.entries(PAGINE).map(([p, x]) => `<li><a href="${p}">${esc(x.titolo.split(" – ")[0].split(" a Ciriè")[0])}</a></li>`).join("")}</ul></div></footer>
</body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600" },
  });
}
