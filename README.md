# 🐍 PyTanuló

Magyar nyelvű, interaktív Python- és algoritmizálás-tanuló oldal 9–11. évfolyamnak (középszint, NAT2020). Mimo-szerű felépítés: leckék, magyarázatok, kódpéldák, folyamatábrák, önellenőrző és programozós gyakorlófeladatok, XP-gyűjtés, érettségi feladatsorok.

Az oldalt használni nem kell semmit telepíteni: sima HTML, CSS és JavaScript, a haladást a böngésző `localStorage`-ában tárolja. A **tananyag szerkesztéséhez** szöveges fájlokat kell átírni (`tananyag/`), majd egy Python-szkript (`tools/build.py`, csak Python 3, külső csomag nélkül) legenerálja belőlük az oldal adatfájljait.

## Kipróbálás

- **Gépen:** nyisd meg az `index.html` fájlt a böngészőben. (A Python-futtatás, az offline mód és a telepíthető alkalmazás `http(s)://` címen működik, lásd lent.)
- **GitHubon (GitHub Pages):**
  1. Tedd fel a mappa tartalmát egy repóba (az `index.html` a repó gyökerében legyen).
  2. *Settings → Pages → Build and deployment → Source: Deploy from a branch*, ág: `main`, mappa: `/ (root)`.
  3. Pár perc múlva az oldal a `https://<felhasználó>.github.io/<repó>/` címen elérhető.

## Felépítés

```
index.html            az oldal váza
manifest.webmanifest  a telepíthető (PWA) alkalmazás leírója
sw.js                 service worker: offline használat
icons/                alkalmazásikonok
css/style.css         kinézet: világos és sötét téma, kódszínezés, ábrák, mobil és akadálymentes megoldások
js/util.js            segédfüggvények: kódszínező (hl), szövegből HTML (dl), idézőjel-javítás (dq)
js/flowchart.js       SVG folyamatábrák és szemléltető ábrák (FCD objektum), fig("kulcs")
js/hibak.js           a magyar hibaüzenet-magyarázó (HB szabálylista)
js/runner.js          a böngészőben futó Python (Pyodide), a kódszerkesztő és a lépésenkénti nyomkövető
js/exam.js            az érettségi mód
js/app.js             témalista, keresés, leckék, feladattípusok, XP, sorozat, jelvények, ismétlő
js/data/*.js          GENERÁLT adatfájlok (ne szerkeszd őket, lásd lent)
tananyag/             a tananyag SZÖVEGES forrásfájljai
tools/build.py        a tananyag/ mappából generálja a js/data/*.js fájlokat
tests/                automatikus tesztek (Playwright)
.github/workflows/    GitHub Actions: a tesztek automatikus futtatása
```

## A tananyag szerkesztése

A tananyag a `tananyag/` mappában van, évfolyamonként egy mappa, témánként egy szöveges fájl. A fájlnév sorszámmal (`00-`, `01-`, …) kezdődik, ez adja a témák sorrendjét. Szerkesztés után a projekt gyökeréből:

```
python3 tools/build.py            # legenerálja a js/data/*.js fájlokat (és ellenőrzi a feladatokat)
python3 tools/build.py --check    # csak azt ellenőrzi, hogy a js/data/ egyezik-e a forrásfájlokkal
```

A generált `js/data/*.js` fájlokat is fel kell tölteni a repóba (a GitHub Pages nem futtat buildet). Ha elfelejted újragenerálni, a GitHub Actions ellenőrzése hibát jelez.

### Egy téma fájlja

```
# Számlálós ciklus

## Miért kell ciklus?
Szakaszszöveg. Használhatók a <b>félkövér</b> és a <code>kód</code> jelölők. A < és > jelet
&lt; és &gt; alakban írd. A „- ” kezdetű sorok felsorolássá, az „1. ” kezdetűek számozott listává válnak.
```python
for i in range(5):
    print("Szia!")
```
@abra for_osszeg

## Megoldás: valami
A „Megoldás” szóval kezdődő szakasz lenyitható blokk lesz.

### teszt
kerdes: Hányszor ír ki valamit a program?
kod: |
  for i in range(4):
      print("x")
valaszok:
- 3
- 4
- 5
jo: 1
magyarazat: A range(4) négy értéket ad.
```

- A fájl első sora `# A téma címe`. Utána `## Szakasz címe` sorok következnek: szöveg, opcionálisan egy kódblokk (három visszafelé aposztróf közé, a kódban kettős idézőjelet használj) és egy `@abra kulcs` sor (az ábra kulcsa a `js/flowchart.js` `FCD` objektumából).
- Az első `### típus` sortól kezdve már feladatok vannak. Egy feladat `mező: érték` sorokból áll. Többsoros érték: `mező: |` és alatta két szóközzel beljebb húzott sorok. Lista: `mező:` és alatta `- elem` sorok (többsoros elem: `- |` és négy szóközzel beljebb húzott sorok).
- A mezők nevei ékezet nélküliek. Az elhagyható mezőket nem kell kitölteni.

### Feladattípusok

| típus | mezők | megjegyzés |
| --- | --- | --- |
| `teszt` | `kerdes`, `valaszok`, `jo` (0-tól), `magyarazat`; elhagyható: `abra`, `kod` | tesztkérdés |
| `abrakod` | mint a `teszt`, kötelező az `abra` | ábra–kód párosítás: a válaszok kódrészletek (a `- \|` alak kell hozzá) |
| `beiros` | `kerdes`, `elfogad` (lista); elhagyható: `abra`, `kod`, `segitseg` | az elfogadott válaszok listája, a kis-nagybetű és a felesleges szóköz nem számít |
| `mikiir` | `kod`; elhagyható: `segitseg` | „Mit ír ki?”: a választ a build a program lefuttatásával számolja ki (egysoros kimenet kell) |
| `kod` | `kerdes`, `kezdokod`, `megoldas`, `tesztek`; elhagyható: `segitseg` | 💻 programozós feladat |
| `hiba` | mint a `kod`, a `kezdokod` a hibás program | 🐞 a build ellenőrzi, hogy a hibás kód tényleg elbukik egy teszten |
| `sorrend` | `kerdes`, `sorok` (a helyes sorrend); elhagyható: `tesztek`, `segitseg` | 🧩 Parsons-feladat; `tesztek` esetén más jó sorrendet is elfogad |
| `nyomkovetes` | `kerdes`, `kod`, `sor` (a figyelt sor száma), `valtozok` (vesszővel); elhagyható: `segitseg` | 🔍 a táblázat celláit a build számolja ki |

**Tesztek** (`kod`, `hiba`, `sorrend`): minden listaelem egy teszt, `bemenet || pre: adatsorok || seed: szám` alakban. A bemenet az `input()` értékei (`\n` az új sor), a `pre` a kód első sorait cseréli le (így a kódban megadott lista is több adattal tesztelhető), a `seed` a `random` kezdőértéke. Elég a bemenetet megadni: a **várt kimenetet a build a `megoldas` valódi lefuttatásával számolja ki**. Üres bemenet: egy sor, amelyen csak `-` áll.

```
### kod
kerdes: Olvass be egy számot, és írd ki a dupláját.
kezdokod: |
  szam = int(input())
megoldas: |
  szam = int(input())
  print(szam * 2)
tesztek:
- 3
- -1
- 0
```

Az indulókód végére a build mindig sortörést tesz. Ha hibát vétesz a forrásfájlban (hibás megoldás, hiányzó mező, rossz típus), a build hibaüzenettel megáll, és megmondja, melyik fájl hányadik feladata a hibás.

## Érettségi mód

A **🎓 Érettségi mód** a digitális kultúra érettségi gyakorlati vizsgájának 5. feladatához (algoritmizálás és programozás, 15 pont) hasonló feladatsorokat ad. A feladatok egy-egy történetre épülnek (kockajáték, titkosírás, robot, számkitaláló, versenyeredmények…), és szándékosan nem nevezik meg a programozási tételt: a leírásból kell felismerni.

- **Üres szerkesztővel indul** a diák. Ha a feladat adatokat ad meg (névsor, pontszámok…), azokat egyszerűen felsorolja (`Címke: elem, elem, …`), a diák dönti el, milyen adatszerkezetben és milyen néven tárolja őket (a feladat szövege nem árul el változónevet, függvényt vagy adatszerkezetet). Ha a program bemenetet olvas, a mintát a **Bemenet** mezőbe kell felvinnie. A Bemenet mező csak akkor látszik, ha a feladat olvas be adatot;
- a feladatok **számozott pontokba szedve** állnak a feladatlapon, a pontszám **nem látszik** (csak az összes pont). A részfeladatonkénti pontokat és a hibák magyarázatát a **beadás után** mutatja az oldal, mint az éles vizsgán az értékelés;
- asztali nézetben a **feladatlap bal oldalon, a szerkesztő jobb oldalon** áll, telefonon egymás alatt;
- a megoldásnak bármilyen adatra működnie kell: beadáskor a program **rejtett tesztekkel** (más bemenettel, más adatokkal, rögzített véletlen sorozattal) is lefut. A feladatban megadott adatokat a diák kódjában az oldal az **értékük alapján** találja meg és cseréli le (nem számít a változó neve, a tördelés és az sem, hogy külön listákban, soronként (lista vagy rekord soronként) vagy szótárban tárolja őket). Ha egy adatoszlopot nem ismer fel (például szövegből vágja szét), a rejtett adatos tesztet kihagyja, és ezt külön jelzi (a pontszám ilyenkor csak a többi teszten alapul);
- minden eredmény elé külön sorba kell írni, hogy `N. feladat`, utána az eredmény, a minta kimenete szerint (az `N. feladat: eredmény` egy sorban is elfogadott);
- a százalék alapján megmondja, melyik jegynek felel meg az eredmény (25 / 40 / 60 / 80%);
- időmérő (alapból 30 perc, választható), lejártakor automatikus beadás; a lejárt idő utáni próbálkozás már nem számít a legjobb eredménybe;
- opció: **ékezet nélküli kimenet is elfogadható**, ahogy az érettségin;
- a beírt kód a böngészőben mentődik, a legjobb eredmények és a jelvények az Eredmények oldalon látszanak.

A feladatsorok forrása a `tananyag/erettsegi/NN-nev.txt`:

```
# Mozgáskihívás
ido: 30
leiras: |
  A feladat története (HTML jelölők használhatók). Az adatokat külön mutatja az oldal.
adat: |
  nevek = ["Anna", "Bence", "Csilla"]
  percek = [185, 90, 150]
cimkek:
- Résztvevők
- Heti mozgásidő (perc)
reszek:
- 2 || Írd ki, hányan teljesítették a kihívást! (pont || a részfeladat szövege)
- 3 || Kérj be egy nevet (bekérő szöveg nélkül)! Írd ki a percét: <code>Bence: 1 óra 30 perc</code>
megoldas: |
  nevek = ["Anna", "Bence", "Csilla"]
  percek = [185, 90, 150]

  print("1. feladat")
  ...
tesztek:
- Bence
- Zoli || pre: nevek = ["Zoli", "Vera"]\npercek = [100, 149]
- 5 || seed: 3
```

- Az `adat` **nem kötelező** (ha az adatok `input()`-ból vagy véletlenből jönnek, hagyd el). Ha van, a feladatlapon oszloponként, a `cimkek` címkéivel jelenik meg (a változónevek **nem** látszanak), a `megoldas` pedig ugyanezekkel a sorokkal kezdődik. Az adat sorai `változó = [elemek]` alakúak (egész szám vagy szöveg elemekkel, minden oszlop egyforma hosszú), a `cimkek` pedig oszloponként egy címke.
- A `reszek` pontjai együtt **15-öt** tegyenek ki. Minden részfeladat eredménye elé `print("N. feladat")` kerüljön a megoldásban (N a részfeladat sorszáma, 1-től).
- A `tesztek` első eleme a **látható minta** (az oldal ezt mutatja a feladatlapon), a többi rejtett. A teszt alakja `bemenet || pre: adat-sorok || seed: szám`: a `pre` az `adat` sorait cseréli le (ugyanannyi sor, ugyanabban a sorrendben, a diák kódjában az értékek alapján), a `seed` a véletlenszám-generátort rögzíti. A `\n` sortörést jelent. Véletlen feladatban a feladat szövegének pontosan elő kell írnia, hányszor és milyen sorrendben sorsoljanak. A feladat szövegében **nem szerepelhet** konkrét Python-utasítás, függvény- vagy modulnév és adatszerkezet-név (a build ezt ellenőrzi, és hibával megáll).
- A kimenetet a build a megoldás lefuttatásával számolja ki. Ha nincs `kezdokod` mező, az indulókód csak egy megjegyzés-sor.

## Új folyamatábra

A `js/flowchart.js` fájlban vegyél fel egy új kulcsot az `FCD` objektumba. Az `fcBuild(magasság, leírás, rajzoló függvény)` segédeszközei: `term` (START/STOP), `io` (be/ki), `proc` (tevékenység), `dec` (elágazás), `arr` (nyíl), `lab` / `labv` (igen–nem felirat), `text`, valamint a szemléltető ábrákhoz `box` (négyzet), `circ` (kör), `t` (középre igazított szöveg), `ln` (vonal). A `fcCells(értékek, leírás, felirat)` kész indexes cellasort rajzol (szöveg és lista indexelésének bemutatására). A kész ábrát a szakasz `@abra kulcs` sora vagy a feladat `abra` mezője hívja elő:

```js
FCD.sajat = function () {
  return fcBuild(200, "Folyamatábra: ...", function (f) {
    var s = f.term(150, 24, "START");
    var p = f.proc(150, 90, "x = 1");
    f.arr([s.b, p.t]);          // .t felső, .b alsó, .l bal, .r jobb csatlakozási pont
  });
};
```

Az ábrák inline SVG-ként készülnek, ezért a világos/sötét témaváltást automatikusan követik, képernyőolvasónak szöveges leírást adnak (`role="img"`), és minden képernyőméreten élesek.

## Python-szerkesztő, nyomkövetés, hibamagyarázat

- A **Futtatás** a beolvasott (Bemenet mezőbe írt) értéket is kiírja a kérdés után, új sorban, mint egy valódi konzol; az ellenőrzések és az érettségi pontozás viszont a valódi Python kimenetével (echo nélkül) hasonlítanak.
- A leckék kódpéldái alatt **▶ Kipróbálom** gomb nyitja meg a szerkesztőt (színezett kód, `Tab` / `Shift+Tab` behúzás, `Ctrl+Enter` futtat). Az `input()` a **Bemenet** mezőből olvas, soronként egy érték.
- A **💻 Programozz!** feladatoknál az **✔ Ellenőrzés** gomb több tesztadattal lefuttatja a programot, és összehasonlítja a kimenetet a várttal (a sorvégi szóköz és az utolsó üres sor nem számít). Siker esetén 15 XP jár, a téma teljesítéséhez nem kötelezők.
- A **📎 .py betöltése** gombbal a tanuló a saját gépén (például Thonnyban) megírt fájlt is betöltheti. A **🧪 Játszótér** szabad kipróbálásra való.
- A **🔍 Lépésenként** gomb (Python Tutor-szerűen) soronként végigköveti a programot: kiemeli a következő sort, mutatja a változókat (a most megváltozottak kiemelve) és az addig kiírt szöveget. 400 lépés után megáll.
- Ha a futtatás hibával áll le, a `js/hibak.js` szabálylistája **magyarul elmagyarázza** a hibaüzenetet, kiemeli a hibás sort, elírt változónévnél javaslatot is tesz. Új szabály: a `HB` tömbbe vegyél fel egy `[reguláris kifejezés, függvény(találat, kód) → [jelentés, tanács]]` elemet.
- A futtatás a [Pyodide](https://pyodide.org) (a böngészőben futó CPython) segítségével történik, első használatkor tölti le (kb. 10 MB). A végtelen ciklus 5 másodperc után leáll, a túl hosszú kimenet is.

## Motiváció

- **Napi sorozat** (🔥) a fejlécben, **20 jelvény** (köztük az érettségi jelvények), **Eredmények** oldal.
- **🔁 Ismétlő**: a tanuló által elrontott feladatokat gyűjti. Hibátlan megoldásukért 5 XP jár, és kikerülnek a listából.
- **Keresés** a témalista tetején: ékezetfüggetlenül keres a témák és szakaszok szövegében.

## Offline használat és telepítés

Az oldal **PWA**: `http(s)://` címen telepíthető a telefonra vagy a gépre („Hozzáadás a kezdőképernyőhöz” / „Telepítés”), és internet nélkül is működik.

- A `sw.js` service worker a saját fájlokat hálózat-először módon tárolja (ha van net, mindig a friss változat jön, így nem kell verziószámot emelni), a Pyodide fájljait pedig gyorsítótár-először módon.
- A témalista **📥 Offline használat** gombja letölti a Pythont is (kb. 10 MB), ezután a futtatás, az ellenőrzés és az érettségi mód is internet nélkül megy. A gomb nélkül is, csak ekkor a Python az első futtatáskor töltődik le.
- Saját szerveren tárolt Pyodide: töltsd le a [Pyodide kiadást](https://github.com/pyodide/pyodide/releases) a `pyodide/` mappába, és az `index.html`-ben a `js/runner.js` elé írd be: `<script>PY_BASE = "pyodide/";</script>`.

## Billentyűzet, mobil, akadálymentesség

- **Billentyűzet:** minden gomb és mező elérhető; „Ugrás a tartalomra” hivatkozás; látható fókuszkeret; oldalváltás után a fókusz a tartalomra kerül, és az oldalcím frissül. A szerkesztőben a `Tab` behúzást ad, de az **`Esc`, majd `Tab`** kilép a szerkesztőből, így nem csapda. A sorrendbe rakós feladatban a ▲▼ gombok billentyűzettel használhatók, a hely változását felolvasható állapotüzenet jelzi.
- **Képernyőolvasó:** a visszajelzések (`aria-live`), az ábrák leírása, a nyomkövetési táblázat cellacímkéi, a gombok neve megadva.
- **Kontraszt:** a színek mindkét témában megfelelnek a WCAG AA szintnek (4,5:1), a tesztek axe-ellenőrzéssel őrzik. A `prefers-reduced-motion` beállítást az oldal követi.
- **Mobil kódbevitel:** érintőképernyőn a szerkesztő alatt gyorsbillentyű-sor jelenik meg (behúzás, visszaléptetés, `:`, `( )`, `[ ]`, `" "`, `=`, `==`, `#`, műveleti jelek, `_`, `{ }`). A zárójel- és idézőjelpár közé teszi a kurzort, kijelölt szöveget körbevesz. A beszúrások a Ctrl+Z / visszavonás gombbal visszavonhatók; a szerkesztő betűmérete telefonon 16 px, így az iOS nem nagyít rá.

## Tesztek és GitHub Actions

```
python3 tools/build.py --check          # a js/data/ a forrásfájlokból készült-e
cd tests && npm install && npx playwright install chromium && npm test
```

A `tests/run.js` egy valódi böngészőben (Playwright, a Pyodide a `tests/node_modules`-ból jön, internet nem kell) végigpróbálja az oldalt: minden téma minden feladatát megoldja a felületen át (teszt, beírós, kódolós, hibakereső, sorbarendezős, nyomkövetési táblázat), minden érettségi feladatsort kipróbál (a mintamegoldás teljes pontot kap, az üres kezdőkód és a „beégetett” kimenet nem; az adat tetszőleges tördelése működik; a feladatlapon nincs táblázat és részpontszám), ellenőrzi a szerkesztő billentyűit és a telefonos gyorsbillentyűket, a nyomkövetőt és a hibamagyarázót, a konzolhibákat, a vízszintes görgetést és az oldalsávos/kétoszlopos elrendezést 1440, 1180, 1024, 768 és 390 px szélességen, és lefuttatja az **axe** akadálymentességi ellenőrzést mindkét témában. Résztesztek: `npm test -- --only=feladat,erettsegi,axe` (további nevek: `adat`, `nyomkoveto`, `szerkeszto`, `elrendezes`).

A `.github/workflows/test.yml` minden feltöltésnél (push) és pull requestnél lefuttatja a fenti két ellenőrzést, így egy elrontott feladat vagy elfelejtett `build.py` futtatás azonnal kiderül.

## Mentett haladás

A böngésző `localStorage`-ában a `pyt` (XP, megoldott és elrontott feladatok, sorozat, jelvények, érettségi eredmények), a `pyt-th` (téma), a `pyt-off` (offline előtöltés) és a `pyt-exc-<azonosító>` (az érettségi mód mentett kódja) kulcs alatt tárolódik. Törléséhez a böngésző fejlesztői eszközeiben töröld ezeket a kulcsokat.
