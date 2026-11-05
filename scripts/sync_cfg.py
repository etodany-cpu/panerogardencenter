"""Copia i contenuti modificati su claude.ai (il blocco di configurazione) nel sito.

Uso: python3 scripts/sync_cfg.py <pagina-scaricata-da-claude.ai.html> [public/index.html]

Prende solo il JSON <script id="cfg"> dalla pagina di claude.ai e lo inserisce in
public/index.html, lasciando intatti grafica e codice del sito. Stampa "invariato",
"aggiornato" oppure un errore (codice di uscita 1) senza toccare nulla.
"""
import json
import re
import sys

CFG_RE = re.compile(r'(<script id="cfg" type="application/json">)(.*?)(</script>)', re.S)
REQUIRED = ("ditta", "telefono", "email", "indirizzo", "prodotti", "servizi")


def load_cfg(html):
    m = CFG_RE.search(html)
    if not m:
        raise ValueError("blocco cfg non trovato")
    cfg = json.loads(m.group(2))
    missing = [k for k in REQUIRED if k not in cfg]
    if missing:
        raise ValueError("campi mancanti: " + ", ".join(missing))
    return cfg


def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else "public/index.html"
    try:
        new_cfg = load_cfg(open(src, encoding="utf-8").read())
        site = open(dst, encoding="utf-8").read()
        old_cfg = load_cfg(site)
    except Exception as e:  # pagina rotta o incompleta: non pubblicare
        print("errore:", e)
        sys.exit(1)
    # Le chiavi aggiunte dal codice del sito ma assenti nella pagina restano com'erano.
    merged = dict(old_cfg)
    merged.update(new_cfg)
    if merged == old_cfg:
        print("invariato")
        return
    payload = json.dumps(merged, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    m = CFG_RE.search(site)
    site = site[: m.start(2)] + payload + site[m.end(2):]
    open(dst, "w", encoding="utf-8").write(site)
    print("aggiornato")


if __name__ == "__main__":
    main()
