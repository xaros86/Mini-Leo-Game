# Mini Leo 🦁

Un piccolo gioco 3D (three.js) per bimbi di 2–3 anni. Si gioca con **un dito**, anche con il telefono appoggiato sul tavolo, in verticale o in orizzontale. Niente testi, niente sconfitte, niente pubblicità: solo colori e suoni allegri.

## Come si gioca
- **Tocca il terreno** → nasce qualcosa (fiore, carota, castello di sabbia, corallo, pupazzo di neve, felce, funghetto, cristallo…) con una nota musicale, e Leo corre lì saltellando.
- **Tocca ciò che vola** → palloncini, bolle e meduse scoppiano, i dischi volanti fanno scintille, le lanterne diventano fuochi d'artificio.
- **Tocca gli amici** → ognuno fa la sua magia: la mucca muggisce, il maiale grugnisce, la pecora bela, i pulcini pigolano (e seguono Leo come la mamma!), i dinosauri ruggiscono, gli alieni fanno salti altissimi, i pesci fanno bolle, i granchi ballano, i pinguini scivolano.
- **Tocca un albero** → cade un frutto e Leo corre a mangiarlo.
- **Tocca il pallone** → Leo corre a calciarlo.
- **Tocca il cielo** → il sole ride e fa ballare i fiori, la luna e il pianeta fanno cadere stelle cadenti, le nuvole fanno piovere (o nevicare) e nascono cose nuove.
- **Tocca Leo** → salta e ride. Ma se lo tocchi troppe volte… gli gira la testa!
- **Scenografie a sorpresa**: il fienile si apre ed escono pulcini, il forziere si apre pieno di tesori, il vulcano erutta, il razzo decolla e torna giù.
- **Porta Leo sulle 5 cose da raccogliere**: festa con arcobaleno (o fuochi d'artificio), poi Leo parte per il mondo successivo.

### Gli 8 mondi
| # | Mondo | Da raccogliere | Amici | Sorpresa |
|---|---|---|---|---|
| 0 | 🌳 Prato | stelle | farfalle | nuvole che piovono |
| 1 | 🐄 Fattoria | uova | mucca, maiale, pecora, pulcini | il fienile |
| 2 | 🏖️ Spiaggia | stelle marine | granchi | impronte nella sabbia, occhiali da sole |
| 3 | 🐠 Fondale | perle | pesci, granchio, meduse | il forziere, maschera da sub |
| 4 | ❄️ Neve | regali | pinguini | neve che cade, berretto |
| 5 | 🦕 Dinosauri | uova di dino | dinosauri | il vulcano |
| 6 | 🌙 Notte | stelle luminose | lucciole | lanterne-fuochi d'artificio |
| 7 | 🚀 Spazio | pianetini | alieni, dischi volanti | gravità leggera, il razzo, casco da astronauta |

In ogni mondo ci sono anche il pallone e gli alberi con i frutti. Dopo lo spazio si ricomincia dal prato. Per provare un mondo: `index.html?mondo=5` (0–7).

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
