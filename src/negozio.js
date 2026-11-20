// --- Negozio online ---
// Catalogo, prezzi e scorte stanno su Stripe (pannello Stripe → Catalogo prodotti), il pagamento
// avviene sulla pagina sicura di Stripe Checkout. Ogni vendita scala la scorta, viene salvata tra le
// richieste in D1 (pagina riservata /statistiche) e arriva per email al negozio con FormSubmit,
// insieme agli avvisi di scorte basse e prodotto esaurito.
//
// Secret da impostare su Cloudflare (Worker → Settings → Variables and Secrets, tipo "Secret"):
//   STRIPE_SECRET_KEY      sk_test_... in prova, poi sk_live_...
//   STRIPE_WEBHOOK_SECRET  whsec_...  (dal webhook Stripe che punta a /api/negozio/webhook)
// Variabile in wrangler.jsonc: EMAIL_NEGOZIO.
//
// Metadati di ogni prodotto in Stripe:
//   online = si | spedizione = 12,50 (vuoto = solo ritiro) | scorta = 5 | scorta_minima = 2

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_VERSION = "2024-06-20";
const MAX_PEZZI = 10;
const NEGOZIO_INDIRIZZO = "Via San Maurizio 157, Ciriè (TO)";

export async function negozio(request, env, pathname) {
  try {
    if (pathname === "/api/negozio/prodotti" && request.method === "GET") return await prodottiPubblici(env);
    if (pathname === "/api/negozio/stato" && request.method === "GET") return await stato(env);
    if (pathname === "/api/negozio/checkout" && request.method === "POST") return await checkout(request, env);
    if (pathname === "/api/negozio/webhook" && request.method === "POST") return await webhook(request, env);
    return Response.json({ errore: "Non trovato" }, { status: 404 });
  } catch (err) {
    console.error("negozio:", err);
    return Response.json({ errore: "Il negozio online non risponde, riprova tra poco." }, { status: 503 });
  }
}

/* ---------- controllo del collegamento (non mostra le chiavi) ---------- */

async function stato(env) {
  const k = String(env.STRIPE_SECRET_KEY || "");
  const out = {
    chiave: !k ? "mancante" : k.startsWith("sk_test_") ? "test" : k.startsWith("sk_live_") ? "live" : k.startsWith("rk_") ? "limitata" : "formato non riconosciuto",
    webhook: env.STRIPE_WEBHOOK_SECRET ? (String(env.STRIPE_WEBHOOK_SECRET).startsWith("whsec_") ? "presente" : "formato non riconosciuto") : "mancante",
  };
  if (k) {
    try {
      const a = await stripe(env, "GET", "/account");
      out.account = a.id;
      const p = await stripe(env, "GET", "/products", { active: "true", limit: "100" });
      out.prodotti_attivi = p.data.length;
      out.prodotti_online = p.data.filter((x) => (x.metadata.online || "").toLowerCase().trim() === "si").length;
    } catch (e) {
      out.errore = String(e.message || e).slice(0, 160);
    }
  }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}

/* ---------- catalogo ---------- */

async function caricaProdotti(env) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY mancante");
  const res = await stripe(env, "GET", "/products", { active: "true", limit: "100", "expand[]": "data.default_price" });
  return res.data
    .filter((p) => (p.metadata.online || "").toLowerCase().trim() === "si")
    .filter((p) => p.default_price && p.default_price.unit_amount != null && p.default_price.currency === "eur")
    .map((p) => ({
      id: p.id,
      nome: p.name,
      descrizione: p.description || "",
      immagine: (p.images && p.images[0]) || "",
      prezzo: p.default_price.unit_amount,
      spedizione: euroInCentesimi(p.metadata.spedizione),
      disponibili: Math.max(0, parseInt(p.metadata.scorta || "0", 10) || 0),
      priceId: p.default_price.id,
    }));
}

async function prodottiPubblici(env) {
  const prodotti = (await caricaProdotti(env)).map(({ priceId, ...p }) => p);
  return Response.json({ prodotti }, { headers: { "Cache-Control": "no-store" } });
}

function euroInCentesimi(v) {
  if (v == null) return null;
  const s = String(v).replace("€", "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/* ---------- pagamento ---------- */

async function checkout(request, env) {
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida." }, { status: 400 });
  }
  const consegna = corpo.consegna === "spedizione" ? "spedizione" : "ritiro";
  const richiesti = Array.isArray(corpo.articoli) ? corpo.articoli.slice(0, 20) : [];
  if (!richiesti.length) return Response.json({ errore: "Il carrello è vuoto." }, { status: 400 });

  const perId = new Map((await caricaProdotti(env)).map((p) => [p.id, p]));
  const righe = [];
  let pezzi = 0;
  for (const r of richiesti) {
    const p = perId.get(String(r.id));
    const q = parseInt(r.quantita, 10);
    if (!p) return Response.json({ errore: "Un articolo del carrello non è più in vendita. Aggiorna la pagina." }, { status: 400 });
    if (!Number.isInteger(q) || q < 1 || q > MAX_PEZZI) return Response.json({ errore: `Quantità non valida per "${p.nome}".` }, { status: 400 });
    if (q > p.disponibili) {
      return Response.json({ errore: p.disponibili ? `Di "${p.nome}" ne restano solo ${p.disponibili}.` : `"${p.nome}" è esaurito.` }, { status: 409 });
    }
    righe.push({ p, q });
    pezzi += q;
  }

  if (consegna === "spedizione") {
    if (pezzi > 1) return Response.json({ errore: "Per più articoli il costo di spedizione lo calcoliamo noi: usa il modulo di richiesta.", codice: "PREVENTIVO" }, { status: 409 });
    if (righe[0].p.spedizione == null) return Response.json({ errore: `"${righe[0].p.nome}" si può solo ritirare in negozio.`, codice: "SOLO_RITIRO" }, { status: 409 });
  }

  const sito = new URL(request.url).origin;
  const params = {
    mode: "payment",
    locale: "it",
    "payment_method_types[0]": "card",
    "phone_number_collection[enabled]": "true",
    success_url: `${sito}/?ordine=ok#negozio`,
    cancel_url: `${sito}/#negozio`,
    expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60),
    "metadata[consegna]": consegna,
    "metadata[articoli]": righe.map((r) => `${r.p.id}:${r.q}`).join(","),
    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "eur",
  };
  righe.forEach((r, i) => {
    params[`line_items[${i}][price]`] = r.p.priceId;
    params[`line_items[${i}][quantity]`] = String(r.q);
  });
  if (consegna === "spedizione") {
    params["shipping_address_collection[allowed_countries][0]"] = "IT";
    params["shipping_options[0][shipping_rate_data][display_name]"] = "Spedizione con corriere (Italia)";
    params["shipping_options[0][shipping_rate_data][fixed_amount][amount]"] = String(righe[0].p.spedizione);
  } else {
    params["billing_address_collection"] = "required";
    params["shipping_options[0][shipping_rate_data][display_name]"] = `Ritiro gratuito in negozio – ${NEGOZIO_INDIRIZZO}`;
    params["shipping_options[0][shipping_rate_data][fixed_amount][amount]"] = "0";
  }

  const s = await stripe(env, "POST", "/checkout/sessions", params);
  return Response.json({ url: s.url });
}

/* ---------- webhook: pagamento riuscito ---------- */

async function webhook(request, env) {
  const corpo = await request.text();
  if (!(await firmaValida(corpo, request.headers.get("Stripe-Signature") || "", env.STRIPE_WEBHOOK_SECRET))) {
    return new Response("Firma non valida", { status: 400 });
  }
  const evento = JSON.parse(corpo);
  if (evento.type !== "checkout.session.completed") return new Response("ok");
  // Si rilegge la sessione con la versione API del Worker: il formato non dipende da quella del webhook.
  const s = await stripe(env, "GET", `/checkout/sessions/${evento.data.object.id}`);
  if (s.payment_status !== "paid") return new Response("ok");

  // Stripe può rimandare lo stesso evento: si gestisce una volta sola.
  if (s.payment_intent) {
    const pi = await stripe(env, "GET", `/payment_intents/${s.payment_intent}`);
    if (pi.metadata && pi.metadata.scorte_aggiornate === "si") return new Response("già gestito");
  }

  const articoli = String(s.metadata.articoli || "").split(",").filter(Boolean).map((x) => {
    const [id, q] = x.split(":");
    return { id, q: parseInt(q, 10) || 0 };
  });
  const righe = [];
  const avvisi = [];
  for (const a of articoli) {
    const p = await stripe(env, "GET", `/products/${a.id}`);
    const prima = parseInt(p.metadata.scorta || "0", 10) || 0;
    const dopo = Math.max(0, prima - a.q);
    const soglia = parseInt(p.metadata.scorta_minima || "1", 10) || 1;
    await stripe(env, "POST", `/products/${a.id}`, { "metadata[scorta]": String(dopo) });
    righe.push(`${a.q} × ${p.name} (restano ${dopo})`);
    if (dopo === 0) avvisi.push(`ESAURITO: "${p.name}" ora risulta esaurito sul sito.`);
    else if (dopo <= soglia) avvisi.push(`Scorte basse: "${p.name}", ne restano ${dopo}.`);
  }
  if (s.payment_intent) await stripe(env, "POST", `/payment_intents/${s.payment_intent}`, { "metadata[scorte_aggiornate]": "si" });

  const c = s.customer_details || {};
  const sp = s.shipping_details || (s.collected_information && s.collected_information.shipping_details) || {};
  const ind = sp.address || {};
  const consegna = s.metadata.consegna === "spedizione"
    ? `SPEDIZIONE a ${sp.name || c.name || ""}, ${[ind.line1, ind.line2].filter(Boolean).join(" ")}, ${ind.postal_code || ""} ${ind.city || ""} (${ind.state || ""})`
    : "RITIRO IN NEGOZIO";
  const totale = ((s.amount_total || 0) / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  const testo = `Totale pagato: ${totale}\nConsegna: ${consegna}\n\nArticoli:\n${righe.join("\n")}` +
    (avvisi.length ? `\n\nMagazzino:\n${avvisi.join("\n")}` : "") + `\n\nRif. Stripe: ${s.id}`;
  const contatto = [c.name, c.email, c.phone].filter(Boolean).join(" · ");

  // Salva l'ordine tra le richieste (pagina riservata /statistiche).
  if (env.STATS) {
    const quando = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 16);
    await env.STATS.prepare("INSERT INTO richieste (quando, nome, contatto, tipo, messaggio) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(quando, c.name || "Cliente negozio online", contatto, `Ordine online ${totale}`, testo).run().catch(() => {});
  }
  await email(env, request, `🛒 Nuovo ordine online – ${totale}`, { Cliente: c.name || "", Email: c.email || "", Telefono: c.phone || "", Ordine: testo });
  if (avvisi.length) {
    await email(env, request, `⚠️ Magazzino negozio online: ${avvisi.length} avviso/i`, {
      Avvisi: avvisi.join("\n"),
      "Come ricaricare": "Stripe → Catalogo prodotti → apri il prodotto → Metadati → modifica \"scorta\".",
    });
  }
  return new Response("ok");
}

async function firmaValida(corpo, intestazione, segreto) {
  if (!segreto || !intestazione) return false;
  const parti = intestazione.split(",").map((x) => x.trim());
  const t = (parti.find((x) => x.startsWith("t=")) || "").slice(2);
  const firme = parti.filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
  if (!t || !firme.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(segreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${corpo}`));
  const atteso = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return firme.some((f) => {
    if (f.length !== atteso.length) return false;
    let d = 0;
    for (let i = 0; i < f.length; i++) d |= f.charCodeAt(i) ^ atteso.charCodeAt(i);
    return d === 0;
  });
}

/* ---------- utilità ---------- */

async function stripe(env, metodo, percorso, params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = metodo === "GET" && q ? `${STRIPE_API}${percorso}?${q}` : `${STRIPE_API}${percorso}`;
  const res = await fetch(url, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(metodo !== "GET" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: metodo !== "GET" ? q : undefined,
  });
  const dati = await res.json();
  if (!res.ok) throw new Error(`Stripe ${percorso}: ${dati.error && dati.error.message}`);
  return dati;
}

// Email al negozio con FormSubmit, come per il modulo contatti.
async function email(env, request, oggetto, campi) {
  const to = String(env.EMAIL_NEGOZIO || "").trim();
  if (!to) return;
  try {
    const origin = new URL(request.url).origin;
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Origin: origin, Referer: origin + "/" },
      body: JSON.stringify({ ...campi, _subject: oggetto, _template: "box", _captcha: "false" }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error("email negozio:", e);
  }
}
