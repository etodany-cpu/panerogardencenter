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
async function contatto(request) {
  if (request.method !== "POST") return Response.json({ success: "false", message: "Metodo non consentito" }, { status: 405 });
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ success: "false", message: "Richiesta non valida" }, { status: 400 });
  }
  const to = String(data.to || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return Response.json({ success: "false", message: "Email del negozio non valida" }, { status: 400 });
  }
  delete data.to;
  const origin = new URL(request.url).origin;
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Origin: origin, Referer: origin + "/" },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    out = { success: "false", message: `Il servizio email ha risposto ${res.status}` };
  }
  return Response.json(out, { status: res.ok ? 200 : 502 });
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
    if (pathname === "/api/contatto") return contatto(request);
    if (pathname === "/api/hit") return hit(request, env);
    if (pathname === "/api/stats") return stats(request, env);
    return env.ASSETS.fetch(request);
  },
};
