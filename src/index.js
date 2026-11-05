// Worker del sito Panero Garden Center.
// Serve i file statici di public/ e fa da tramite per le previsioni meteo di MET Norway,
// così il browser non deve chiamare direttamente api.met.no e i dati restano in cache.

const MET_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const USER_AGENT = "panerogardencenter.etodany.workers.dev github.com/etodany-cpu/panerogardencenter";
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

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/meteo") return meteo(request, ctx);
    return env.ASSETS.fetch(request);
  },
};
