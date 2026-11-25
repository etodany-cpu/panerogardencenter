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
// Prenotazione degli articoli messi nel carrello (tabella "prenotazioni" nel database D1 STATS):
// per 10 minuti il pezzo è riservato a quel cliente e gli altri lo vedono non disponibile.
// Quando il cliente passa al pagamento la prenotazione dura quanto la pagina Stripe (minimo 30 minuti, regola di Stripe).
const RISERVA_MS = 10 * 60 * 1000;
const PAGAMENTO_MIN = 31;

export async function negozio(request, env, pathname) {
  try {
    if (pathname === "/api/negozio/prodotti" && request.method === "GET") return await prodottiPubblici(request, env);
    if (pathname === "/api/negozio/riserva" && request.method === "POST") return await riserva(request, env);
    if (pathname === "/api/negozio/annulla" && request.method === "POST") return await annulla(request, env);
    if (pathname === "/api/negozio/stato" && request.method === "GET") return await stato(env);
    if (pathname === "/api/negozio/prova-email" && request.method === "GET") return await provaEmail(request, env);
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
    email: env.RESEND_API_KEY ? "Resend" : "FormSubmit",
    ultimo_invio_email: ultimoInvio,
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

let ultimaProva = 0;
async function provaEmail(request, env) {
  if (Date.now() - ultimaProva < 60000) return Response.json({ ok: false, messaggio: "Aspetta un minuto tra una prova e l'altra." }, { status: 429 });
  ultimaProva = Date.now();
  const ok = await email(env, request, "✅ Prova email negozio online", { Messaggio: "Se leggi questa email, gli avvisi del negozio online funzionano." });
  return Response.json({ ok, esito: ultimoInvio }, { headers: { "Cache-Control": "no-store" } });
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
      immagine: (p.metadata.foto || "").trim() || (p.images && p.images[0]) || "",
      prezzo: p.default_price.unit_amount,
      spedizione: euroInCentesimi(p.metadata.spedizione),
      disponibili: Math.max(0, parseInt(p.metadata.scorta || "0", 10) || 0),
      priceId: p.default_price.id,
    }));
}

async function prodottiPubblici(request, env) {
  const cliente = idCliente(new URL(request.url).searchParams.get("cliente"));
  return Response.json(await lista(env, cliente), { headers: { "Cache-Control": "no-store" } });
}

/* ---------- prenotazioni del carrello ---------- */

let tabellaPronta = false;
async function tabella(env) {
  if (!env.STATS) return false;
  if (!tabellaPronta) {
    await env.STATS.prepare("CREATE TABLE IF NOT EXISTS prenotazioni (cliente TEXT NOT NULL, prodotto TEXT NOT NULL, quantita INTEGER NOT NULL, scade INTEGER NOT NULL, sessione TEXT, PRIMARY KEY (cliente, prodotto))").run();
    tabellaPronta = true;
  }
  return true;
}

async function prenotazioni(env) {
  if (!(await tabella(env))) return [];
  await env.STATS.prepare("DELETE FROM prenotazioni WHERE scade < ?1").bind(Date.now()).run();
  const r = await env.STATS.prepare("SELECT cliente, prodotto, quantita, scade, sessione FROM prenotazioni").all();
  return r.results || [];
}

function idCliente(v) {
  const s = String(v || "");
  return /^[A-Za-z0-9-]{8,64}$/.test(s) ? s : "";
}

// Prodotti con i pezzi disponibili per questo cliente (scorta meno i pezzi riservati dagli altri) e la sua prenotazione.
async function lista(env, cliente, prodotti, pren) {
  prodotti = prodotti || (await caricaProdotti(env));
  pren = pren || (await prenotazioni(env));
  const out = prodotti.map(({ priceId, ...p }) => {
    const altri = pren.filter((r) => r.prodotto === p.id && r.cliente !== cliente).reduce((t, r) => t + r.quantita, 0);
    return { ...p, disponibili: Math.max(0, p.disponibili - altri), riservati: altri };
  });
  const mie = cliente ? pren.filter((r) => r.cliente === cliente) : [];
  const mia = mie.length
    ? { scade: mie[0].scade, pagamento: !!mie[0].sessione, articoli: Object.fromEntries(mie.map((r) => [r.prodotto, r.quantita])) }
    : null;
  return { prodotti: out, mia, adesso: Date.now() };
}

async function chiudiSessione(env, mie) {
  const id = mie.find((r) => r.sessione)?.sessione;
  if (id) await stripe(env, "POST", `/checkout/sessions/${id}/expire`).catch(() => {});
}

// Il carrello del cliente diventa la sua prenotazione (sostituisce quella precedente).
async function riserva(request, env) {
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida." }, { status: 400 });
  }
  const cliente = idCliente(corpo.cliente);
  if (!cliente) return Response.json({ errore: "Richiesta non valida." }, { status: 400 });
  const richiesti = Array.isArray(corpo.articoli) ? corpo.articoli.slice(0, 20) : [];
  const prodotti = await caricaProdotti(env);
  if (!(await tabella(env))) return Response.json({ ...(await lista(env, cliente, prodotti)), mia: null }, { headers: { "Cache-Control": "no-store" } });
  const perId = new Map(prodotti.map((p) => [p.id, p]));
  const ora = Date.now();
  const prima = await prenotazioni(env);
  const mie = prima.filter((r) => r.cliente === cliente);
  // Se il cliente torna dalla pagina di pagamento senza pagare, quella pagina si chiude e riparte il tempo.
  if (mie.some((r) => r.sessione)) await chiudiSessione(env, mie);
  const scade = mie.length && !mie.some((r) => r.sessione) ? mie[0].scade : ora + RISERVA_MS;

  const righe = [];
  let errore = "";
  for (const r of richiesti) {
    const p = perId.get(String(r.id));
    const q = parseInt(r.quantita, 10);
    if (!p) { errore = "Un articolo non è più in vendita."; continue; }
    if (!Number.isInteger(q) || q < 1) continue;
    righe.push({ p, q: Math.min(q, MAX_PEZZI) });
  }
  const db = env.STATS;
  await db.prepare("DELETE FROM prenotazioni WHERE cliente = ?1").bind(cliente).run();
  for (const { p, q } of righe) {
    // Inserisce solo se, con i pezzi già riservati dagli altri, ce ne sono abbastanza.
    const res = await db.prepare(
      "INSERT INTO prenotazioni (cliente, prodotto, quantita, scade) SELECT ?1, ?2, ?3, ?4 " +
      "WHERE (SELECT COALESCE(SUM(quantita), 0) FROM prenotazioni WHERE prodotto = ?2 AND cliente <> ?1 AND scade >= ?5) + ?3 <= ?6"
    ).bind(cliente, p.id, q, scade, ora, p.disponibili).run();
    if (!res.meta || !res.meta.changes) {
      const altri = prima.filter((x) => x.prodotto === p.id && x.cliente !== cliente).reduce((t, x) => t + x.quantita, 0);
      const liberi = Math.max(0, p.disponibili - altri);
      errore = liberi
        ? `Di "${p.nome}" ne puoi prenotare al massimo ${liberi}.`
        : altri ? `"${p.nome}" è appena stato messo nel carrello da un altro cliente. Riprova tra qualche minuto.` : `"${p.nome}" è esaurito.`;
      if (liberi) {
        await db.prepare("INSERT INTO prenotazioni (cliente, prodotto, quantita, scade) VALUES (?1, ?2, ?3, ?4)").bind(cliente, p.id, Math.min(q, liberi), scade).run();
      }
    }
  }
  const out = await lista(env, cliente, prodotti);
  return Response.json(errore ? { ...out, errore } : out, { status: errore ? 409 : 200, headers: { "Cache-Control": "no-store" } });
}

// Il cliente torna dalla pagina di pagamento senza pagare: si chiude quella pagina e ha di nuovo 10 minuti.
async function annulla(request, env) {
  let corpo = {};
  try { corpo = await request.json(); } catch {}
  const cliente = idCliente(corpo.cliente);
  if (!cliente) return Response.json({ errore: "Richiesta non valida." }, { status: 400 });
  if (await tabella(env)) {
    const mie = (await prenotazioni(env)).filter((r) => r.cliente === cliente);
    if (mie.some((r) => r.sessione)) {
      await chiudiSessione(env, mie);
      await env.STATS.prepare("UPDATE prenotazioni SET scade = ?1, sessione = NULL WHERE cliente = ?2").bind(Date.now() + RISERVA_MS, cliente).run();
    }
  }
  return Response.json(await lista(env, cliente), { headers: { "Cache-Control": "no-store" } });
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

  const cliente = idCliente(corpo.cliente);
  const conPrenotazioni = await tabella(env);
  const pren = conPrenotazioni ? await prenotazioni(env) : [];
  const mie = pren.filter((r) => r.cliente === cliente);
  if (conPrenotazioni && (!cliente || !mie.length)) {
    return Response.json({ errore: "Il tempo per completare l’acquisto (10 minuti) è scaduto e gli articoli sono tornati disponibili. Rimettili nel carrello se sono ancora liberi.", codice: "SCADUTA" }, { status: 409 });
  }
  const perId = new Map((await caricaProdotti(env)).map((p) => [p.id, p]));
  const righe = [];
  let pezzi = 0;
  for (const r of richiesti) {
    const p = perId.get(String(r.id));
    const q = parseInt(r.quantita, 10);
    if (!p) return Response.json({ errore: "Un articolo del carrello non è più in vendita. Aggiorna la pagina." }, { status: 400 });
    if (!Number.isInteger(q) || q < 1 || q > MAX_PEZZI) return Response.json({ errore: `Quantità non valida per "${p.nome}".` }, { status: 400 });
    const mio = mie.find((x) => x.prodotto === p.id);
    if (conPrenotazioni && (!mio || q > mio.quantita)) {
      return Response.json({ errore: `"${p.nome}" non è più riservato per te: aggiorna il carrello.`, codice: "SCADUTA" }, { status: 409 });
    }
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
    cancel_url: `${sito}/?annullato=1#negozio`,
    expires_at: String(Math.floor(Date.now() / 1000) + PAGAMENTO_MIN * 60),
    "metadata[cliente]": cliente,
    "metadata[consegna]": consegna,
    "metadata[articoli]": righe.map((r) => `${r.p.id}:${r.q}`).join(","),
    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "eur",
  };
  righe.forEach((r, i) => {
    params[`line_items[${i}][price]`] = r.p.priceId;
    params[`line_items[${i}][quantity]`] = String(r.q);
  });
  params["custom_text[submit][message]"] = "Tutti i prezzi sono IVA inclusa.";
  if (consegna === "spedizione") {
    params["shipping_address_collection[allowed_countries][0]"] = "IT";
    params["shipping_options[0][shipping_rate_data][display_name]"] = righe[0].p.spedizione === 0
      ? "Spedizione gratuita con corriere (Italia, isole escluse)"
      : "Spedizione con corriere (Italia, isole escluse)";
    params["custom_text[shipping_address][message]"] = "Spediamo in Italia, isole escluse. Per Sicilia, Sardegna e isole minori chiedi un preventivo dal sito.";
    params["shipping_options[0][shipping_rate_data][fixed_amount][amount]"] = String(righe[0].p.spedizione);
  } else {
    params["billing_address_collection"] = "required";
    params["shipping_options[0][shipping_rate_data][display_name]"] = `Ritiro gratuito in negozio – ${NEGOZIO_INDIRIZZO}`;
    params["shipping_options[0][shipping_rate_data][fixed_amount][amount]"] = "0";
  }

  if (mie.some((r) => r.sessione)) await chiudiSessione(env, mie);
  const s = await stripe(env, "POST", "/checkout/sessions", params);
  // Mentre il cliente è sulla pagina di pagamento la prenotazione dura quanto quella pagina.
  if (conPrenotazioni) {
    await env.STATS.prepare("UPDATE prenotazioni SET scade = ?1, sessione = ?2 WHERE cliente = ?3").bind((s.expires_at || 0) * 1000 + 60000, s.id, cliente).run();
  }
  return Response.json({ url: s.url });
}

/* ---------- webhook: pagamento riuscito ---------- */

async function webhook(request, env) {
  const corpo = await request.text();
  if (!(await firmaValida(corpo, request.headers.get("Stripe-Signature") || "", env.STRIPE_WEBHOOK_SECRET))) {
    return new Response("Firma non valida", { status: 400 });
  }
  const evento = JSON.parse(corpo);
  if (evento.type === "checkout.session.expired" && (await tabella(env))) {
    await env.STATS.prepare("DELETE FROM prenotazioni WHERE sessione = ?1").bind(evento.data.object.id).run();
    return new Response("ok");
  }
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
  // La scorta è già scalata: la prenotazione del cliente non serve più.
  if (await tabella(env)) await env.STATS.prepare("DELETE FROM prenotazioni WHERE sessione = ?1 OR cliente = ?2").bind(s.id, idCliente(s.metadata.cliente) || "-").run();

  const c = s.customer_details || {};
  const sp = s.shipping_details || (s.collected_information && s.collected_information.shipping_details) || {};
  const ind = sp.address || {};
  const cap = String(ind.postal_code || "").trim();
  const isola = s.metadata.consegna === "spedizione" && /^(9[0-8]|0[789])\d{3}$/.test(cap);
  const consegna = s.metadata.consegna === "spedizione"
    ? `SPEDIZIONE a ${sp.name || c.name || ""}, ${[ind.line1, ind.line2].filter(Boolean).join(" ")}, ${ind.postal_code || ""} ${ind.city || ""} (${ind.state || ""})`
    : "RITIRO IN NEGOZIO";
  const totale = ((s.amount_total || 0) / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  const testo = (isola ? `⚠️ ATTENZIONE: indirizzo in Sicilia o Sardegna (CAP ${cap}). Le isole sono escluse dalla spedizione: contatta il cliente.\n\n` : "") + `Totale pagato: ${totale}\nConsegna: ${consegna}\n\nArticoli:\n${righe.join("\n")}` +
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

// Email al negozio: con Resend se c'è la chiave RESEND_API_KEY (Secret su Cloudflare), altrimenti FormSubmit.
// Senza un dominio proprio Resend invia da onboarding@resend.dev e consegna solo all'email dell'account Resend,
// quindi l'account Resend va creato con lo stesso indirizzo di EMAIL_NEGOZIO.
// L'esito dell'ultimo invio si vede in /api/negozio/stato.
let ultimoInvio = "nessuno";

async function email(env, request, oggetto, campi) {
  const to = String(env.EMAIL_NEGOZIO || "").trim();
  if (!to) return false;
  const testo = Object.entries(campi).map(([k, v]) => `${k}:\n${v}`).join("\n\n");
  try {
    if (env.RESEND_API_KEY) {
      const html = Object.entries(campi)
        .map(([k, v]) => `<p><b>${esc(k)}</b><br>${esc(v).replace(/\n/g, "<br>")}</p>`).join("");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Negozio Panerogarden <onboarding@resend.dev>", to: [to], subject: oggetto, html, text: testo }),
        signal: AbortSignal.timeout(8000),
      });
      const j = await res.json().catch(() => ({}));
      ultimoInvio = res.ok ? `ok (Resend) ${new Date().toISOString()}` : `errore Resend ${res.status}: ${String(j.message || "").slice(0, 120)}`;
      return res.ok;
    }
    const origin = new URL(request.url).origin;
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Origin: origin, Referer: origin + "/" },
      body: JSON.stringify({ ...campi, _subject: oggetto, _template: "box", _captcha: "false" }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await res.json().catch(() => ({}));
    const ok = res.ok && String(j.success) === "true";
    ultimoInvio = ok ? `ok (FormSubmit) ${new Date().toISOString()}` : `errore FormSubmit ${res.status}: ${String(j.message || "").slice(0, 120)}`;
    return ok;
  } catch (e) {
    ultimoInvio = `errore: ${String(e.message || e).slice(0, 120)}`;
    console.error("email negozio:", e);
    return false;
  }
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
