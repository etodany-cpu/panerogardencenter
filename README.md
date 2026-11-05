# Panero Garden Center

Sito del negozio. I file pubblicati sono nella cartella `public`; ogni modifica su `main` viene pubblicata in automatico da Cloudflare.

## Modifiche da claude.ai

I testi, le foto e gli altri contenuti si modificano con "Modifica sito" nella pagina su claude.ai
(https://claude.ai/artifact/NS8TGdVpQjd6ndoMuGsFsS). Un'attività pianificata copia ogni ora il blocco
di configurazione da quella pagina in `public/index.html` con `scripts/sync_cfg.py` e lo pubblica qui.
Quando si cambia la grafica o il codice del sito, va aggiornata anche la pagina su claude.ai.
