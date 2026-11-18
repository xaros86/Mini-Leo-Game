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
- **Porta Leo sulla cosa da raccogliere**: ne compare **una alla volta** (luccica per farsi notare). Se non la prende entro 15 secondi sparisce e ricompare poco dopo da un'altra parte. Dopo **5** arriva la festa con arcobaleno (o fuochi d'artificio) e Leo parte per il mondo successivo.

### Musica e suoni
- Sottofondo a **carillon**, dolce e a basso volume: allegro di giorno, "acquatico" su spiaggia, fondale e neve, una ninna nanna di notte e nello spazio.
- Pochi effetti sonori, morbidi e intonati con la musica: solo per palloncini/bolle, amici, Leo, raccolta, festa e sorprese. **Toccare il terreno non fa rumore.**
- **Musica on/off**: tieni premuto per un secondo il bottoncino ♫ in alto a destra (una pressione breve non fa nulla, così il bimbo non la spegne per sbaglio).

### I 10 mondi
| # | Mondo | Da raccogliere | Amici | Sorpresa |
|---|---|---|---|---|
| 0 | 🌳 Prato | coccinelle | farfalle | nuvole che piovono |
| 1 | 🐄 Fattoria | uova | mucca, maiale, pecora, pulcini | il fienile (si apre ed escono pulcini) |
| 2 | 🏙️ Città | gelati | macchinine sulla strada | il semaforo che cambia colore |
| 3 | 🏖️ Spiaggia | stelle marine | granchi | impronte nella sabbia, occhiali da sole |
| 4 | 🐠 Fondale | perle | pesci, meduse | il forziere, maschera da sub |
| 5 | ❄️ Neve | regali | pinguini | abeti con le palline e omini di pan di zenzero, berretto |
| 6 | 🦕 Dinosauri | ossa | dinosauri | il vulcano |
| 7 | 🍭 Paese dei dolci | cupcake | orsetti gommosi | alberi lecca-lecca con le caramelle |
| 8 | 🌙 Notte | stelle luminose | lucciole | lanterne-fuochi d'artificio |
| 9 | 🚀 Spazio | pianetini | alieni, dischi volanti | gravità leggera, il razzo, casco da astronauta |

In ogni mondo ci sono anche il pallone e gli alberi con i frutti. Dopo lo spazio si ricomincia dal prato. Per provare un mondo: `index.html?mondo=5` (0–9).

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
