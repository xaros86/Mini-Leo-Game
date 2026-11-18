# Mini Leo 🦁

Un piccolo gioco 3D (three.js) per bimbi di 2–3 anni. Si gioca con **un dito**, anche con il telefono appoggiato sul tavolo, in verticale o in orizzontale. Niente testi, niente sconfitte, niente pubblicità: solo colori e suoni allegri.

## Come si gioca
- **Tocca il prato** → nasce un fiorellino (con una nota musicale) e Leo il leoncino corre lì saltellando.
- **Tocca un palloncino** → scoppia in una pioggia di coriandoli.
- **Tocca Leo** → salta, fa la giravolta e ride.
- **Tocca una farfalla** → fa una capriola in volo.
- **Porta Leo sulle stelline** (tocca la stella o il prato vicino): ogni stella vola nella barra in alto. Con **5 stelle** arriva la festa con l'arcobaleno e i fuochi di coriandoli, poi si ricomincia.
- Se nessuno gioca per un po', Leo saluta con la manina.

## Provarlo sul telefono Android
Il gioco è una pagina web installabile (PWA): non serve nessun negozio di app.

1. Pubblicalo con GitHub Pages: su GitHub apri **Settings → Pages**, in *Source* scegli **Deploy from a branch**, poi il branch del gioco e la cartella **/ (root)**, e premi **Save**. Dopo un paio di minuti l'indirizzo sarà `https://<utente>.github.io/Mini-Leo-Game/`.
2. Apri l'indirizzo con Chrome su Android, menu ⋮ → **Aggiungi a schermata Home / Installa app**.
3. Si apre a schermo intero con l'icona di Leo e funziona anche **senza internet** dopo la prima apertura.

In locale: `python3 -m http.server` nella cartella e apri `http://localhost:8000`.

### Consiglio per i genitori 🔒
Per evitare che il bimbo esca dal gioco, usa il **Blocco app sullo schermo** (Impostazioni → Sicurezza → Blocco app / "App pinning"): l'app resta fissa finché non la sblocchi tu. Lo schermo resta acceso durante il gioco.

## Struttura
- `index.html` – pagina, barra delle stelle, bottone di avvio
- `js/main.js` – tutto il gioco (scena, Leo, palloncini, stelle, farfalle, fiori, suoni sintetizzati con Web Audio)
- `js/vendor/three.module.min.js` – three.js r170 (incluso, così funziona offline)
- `manifest.webmanifest`, `sw.js`, `icons/` – installazione e funzionamento offline
