import { PAGINE, pagina, immagine } from "./pagine.js";
// Worker del sito Panero Garden Center.
// Serve i file statici di public/ e fa da tramite per le previsioni meteo di MET Norway,
// così il browser non deve chiamare direttamente api.met.no e i dati restano in cache.

const MET_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const USER_AGENT = "panerogardencenter.panerogarden.workers.dev github.com/etodany-cpu/panerogardencenter";
const CACHE_SECONDS = 1800;

async function meteo(request, ctx) {
  const url = new URL(request.url);
  const lat = Number.parseFloat(url.searchParams.get("lat") ?? "");
  const lon = Number.parseFloat(url.searchParams.get("lon") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: "Coordinate non valide" }, { status: 400 });
  }

  // MET Norway chiede al massimo 4 decimali: arrotondare aiuta anche la cache.
  const upstream = `${MET_URL}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const cache = caches.default;
  const cacheKey = new Request(upstream);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const res = await fetch(upstream, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) {
    return Response.json({ error: "Previsioni non disponibili" }, { status: 502 });
  }

  const out = new Response(res.body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    },
  });
  ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}

// Inoltra le richieste del modulo contatti a FormSubmit, che le manda via email al negozio.
// Passare dal Worker evita i blocchi del browser verso siti esterni.
// Richieste dal modulo contatti: si salvano sempre in D1 (così non se ne perde nessuna e il titolare
// le legge nella pagina riservata /statistiche) e, se possibile, si inoltrano anche per email con FormSubmit.
// Quando nel sito è impostata una chiave Web3Forms, l'email parte direttamente dal browser e qui si salva soltanto.
const pulisci = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function contatto(request, env) {
  if (request.method !== "POST") return Response.json({ success: "false", message: "Metodo non consentito" }, { status: 405 });
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ success: "false", message: "Richiesta non valida" }, { status: 400 });
  }
  const r = {
    nome: pulisci(data.Nome, 120),
    contatto: pulisci(data.Contatto, 160),
    tipo: pulisci(data.Richiesta, 120),
    messaggio: String(data.Messaggio ?? "").trim().slice(0, 4000),
  };
  if (!r.nome || !r.contatto) {
    return Response.json({ success: "false", message: "Inserisci almeno il nome e un recapito." }, { status: 400 });
  }
  let id = null;
  if (env.STATS) {
    try {
      const quando = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 16);
      const out = await env.STATS.prepare(
        "INSERT INTO richieste (quando, nome, contatto, tipo, messaggio) VALUES (?1, ?2, ?3, ?4, ?5)"
      )
        .bind(quando, r.nome, r.contatto, r.tipo, r.messaggio)
        .run();
      id = out.meta && out.meta.last_row_id;
    } catch {
      id = null;
    }
  }
  let email = false;
  const to = String(data.to || "").trim();
  if (data.inoltra !== false && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    try {
      const origin = new URL(request.url).origin;
      const body = { Nome: r.nome, Contatto: r.contatto, Richiesta: r.tipo, Messaggio: r.messaggio, _subject: pulisci(data._subject, 160), _template: "table", _captcha: "false" };
      if (/@/.test(r.contatto)) body._replyto = r.contatto;
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Origin: origin, Referer: origin + "/" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      const j = await res.json().catch(() => ({}));
      email = res.ok && String(j.success) === "true";
    } catch {
      email = false;
    }
    if (email && id && env.STATS) await env.STATS.prepare("UPDATE richieste SET email_inviata = 1 WHERE id = ?1").bind(id).run().catch(() => {});
  }
  if (!id && !email) {
    return Response.json({ success: "false", message: "Invio non riuscito: chiamaci o scrivici su WhatsApp." }, { status: 502 });
  }
  return Response.json({ success: "true", salvata: Boolean(id), email });
}

// --- Statistiche visite (senza cookie e senza salvare indirizzi IP) ---
// Il sito invia a /api/hit eventi anonimi (pagina vista, clic, visita); qui si sommano per giorno in D1.
// Solo il titolare legge i totali da /statistiche.html, con la password il cui hash SHA-256 è in STATS_HASH.
const KINDS = new Set(["visit", "view", "click"]);
const BOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|curl|wget|python/i;

function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

function device(ua) {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|android|iphone/i.test(ua)) return "Telefono";
  return "Computer";
}

async function hit(request, env) {
  if (request.method !== "POST" || !env.STATS) return new Response(null, { status: 204 });
  const ua = request.headers.get("User-Agent") || "";
  if (BOT.test(ua)) return new Response(null, { status: 204 });
  let data;
  try {
    data = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const kind = String(data.t || "");
  const key = String(data.k || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!KINDS.has(kind) || !key) return new Response(null, { status: 400 });
  const day = today();
  const rows = [[kind, key]];
  if (kind === "visit") {
    rows.push(["country", (request.cf && request.cf.country) || "??"]);
    rows.push(["device", device(ua)]);
  }
  const stmt = env.STATS.prepare(
    "INSERT INTO ev (day, kind, k, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, kind, k) DO UPDATE SET n = n + 1"
  );
  await env.STATS.batch(rows.map(([t, k]) => stmt.bind(day, t, k)));
  return new Response(null, { status: 204 });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function autorizzato(request, env) {
  const auth = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(env.STATS_HASH && auth && (await sha256(auth)) === env.STATS_HASH);
}

async function richieste(request, env) {
  if (!(await autorizzato(request, env))) return Response.json({ error: "Password errata" }, { status: 401 });
  if (request.method === "POST") {
    const { id, azione = "letta" } = await request.json().catch(() => ({}));
    const sql = {
      letta: "UPDATE richieste SET letta = 1 WHERE id = ?1",
      archivia: "UPDATE richieste SET archiviata = 1, letta = 1 WHERE id = ?1",
      ripristina: "UPDATE richieste SET archiviata = 0 WHERE id = ?1",
      elimina: "DELETE FROM richieste WHERE id = ?1",
    }[azione];
    if (!id || !sql) return Response.json({ error: "Azione non valida" }, { status: 400 });
    await env.STATS.prepare(sql).bind(Number(id)).run();
    return Response.json({ ok: true });
  }
  const { results } = await env.STATS.prepare("SELECT * FROM richieste ORDER BY id DESC LIMIT 200").all();
  return Response.json({ richieste: results }, { headers: { "Cache-Control": "no-store" } });
}

async function stats(request, env) {
  const auth = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.STATS_HASH || !auth || (await sha256(auth)) !== env.STATS_HASH) {
    return Response.json({ error: "Password errata" }, { status: 401 });
  }
  const url = new URL(request.url);
  const days = Math.min(Math.max(Number.parseInt(url.searchParams.get("giorni") || "30", 10) || 30, 1), 365);
  const from = new Date(Date.now() - (days - 1) * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const { results } = await env.STATS.prepare("SELECT day, kind, k, n FROM ev WHERE day >= ?1 ORDER BY day").bind(from).all();
  return Response.json({ da: from, a: today(), righe: results }, { headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    // Verifica della proprietà per Google Search Console (servita senza redirect).
    if (pathname === "/google96a36c1ad8593c7b.html") {
      return new Response("google-site-verification: google96a36c1ad8593c7b.html", {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    if (PAGINE[pathname]) return pagina(request, env);
    if (pathname.startsWith("/img/")) return immagine(request, env);
    if (pathname === "/api/meteo") return meteo(request, ctx);
    if (pathname === "/api/contatto") return contatto(request, env);
    if (pathname === "/api/richieste") return richieste(request, env);
    if (pathname === "/api/hit") return hit(request, env);
    if (pathname === "/api/stats") return stats(request, env);
    return env.ASSETS.fetch(request);
  },
};
