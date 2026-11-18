# Mini Leo 🦁

Un piccolo gioco 3D (three.js) per bimbi di 2–3 anni. Si gioca con **un dito**, anche con il telefono appoggiato sul tavolo, in verticale o in orizzontale. Niente testi, niente sconfitte, niente pubblicità: solo colori e suoni allegri.

## Come si gioca
- **Tocca il terreno** → nasce qualcosa (fiore, castello di sabbia, pupazzo di neve, funghetto luminoso…) con una nota musicale, e Leo corre lì saltellando.
- **Tocca ciò che vola** → palloncini e bolle scoppiano, le lanterne della notte diventano fuochi d'artificio.
- **Tocca gli amici** → le farfalle e le lucciole fanno una capriola, i granchi ballano, i pinguini scivolano di pancia.
- **Tocca un albero** → cade un frutto (mela, cocco, biscotto, mela d'oro) e Leo corre a mangiarlo.
- **Tocca Leo** → salta, fa la giravolta e ride.
- **Porta Leo sulle 5 cose da raccogliere** (stelle, stelle marine, regali, stelle luminose): festa con arcobaleno e coriandoli, poi Leo parte per il mondo successivo.

### I 4 mondi
1. **Prato** – stelle, palloncini, farfalle, meli
2. **Spiaggia** – stelle marine, bolle di sapone, granchi, palme (Leo ha gli occhiali da sole)
3. **Neve** – regali, palloncini, pinguini, abeti, neve che cade (Leo ha il berretto)
4. **Notte** – stelle luminose, lanterne-fuochi d'artificio, lucciole, luna che dorme

Poi si ricomincia dal prato. Per provare un mondo: `index.html?mondo=2` (0–3).

## Installarlo su Android come APK
A ogni aggiornamento GitHub crea l'APK da solo (workflow `Crea APK Android`). Per scaricarlo dal telefono:
**https://github.com/xaros86/Mini-Leo-Game/releases/latest** → tocca **MiniLeo.apk** → aprilo e consenti "installa app sconosciute" per Chrome/File. Le nuove versioni si installano sopra la vecchia.

## Oppure come web app

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
