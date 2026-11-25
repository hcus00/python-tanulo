/*
 * Magyar hibaüzenet-magyarázó.
 * A Python hibaüzenetének utolsó sorából megmondja, mit jelent a hiba és mit érdemes tenni.
 * Új szabály: vegyél fel egy [reguláris kifejezés, függvény] párt a HB tömbbe.
 * A függvény [mit jelent, mit tegyél] párt ad vissza.
 */
var HB = [
  /* ---- szintaktikai hibák ---- */
  [/^SyntaxError: '(.)' was never closed/, function (m) { return ["Nincs lezárva a(z) <code>" + m[1] + "</code> jel: a nyitó zárójelnek kell egy záró párja is.", "Nézd meg a megjelölt sort (és az előtte lévőt): minden <code>(</code>-hez, <code>[</code>-hez tartozik egy záró jel."]; }],
  [/^SyntaxError: unterminated string literal/, function () { return ["A szöveg elején van idézőjel, de a végéről hiányzik.", "A szövegeket mindkét oldalon <code>\"</code> idézőjel zárja: <code>\"alma\"</code>."]; }],
  [/^SyntaxError: unterminated triple-quoted/, function () { return ["Háromszoros idézőjellel kezdődő szöveg nincs lezárva.", "Zárd le ugyanúgy, háromszoros idézőjellel."]; }],
  [/^SyntaxError: expected ':'/, function () { return ["Hiányzik a kettőspont a sor végéről.", "Az <code>if</code>, <code>elif</code>, <code>else</code>, <code>for</code> és <code>while</code> sort kettőspont zárja."]; }],
  [/^SyntaxError: invalid syntax\. Maybe you meant '==' or ':=' instead of '='\?/, function () { return ["Feltételben <code>=</code> áll, ami értékadást jelent.", "Összehasonlításhoz két egyenlőségjel kell: <code>==</code>."]; }],
  [/^SyntaxError: invalid syntax\. Perhaps you forgot a comma\?/, function () { return ["Valószínűleg hiányzik egy vessző két érték között.", "A <code>print</code> argumentumait, a lista elemeit vessző választja el."]; }],
  [/^SyntaxError: cannot assign to (.+?)( here| \(|$)/, function (m) { return ["Az értékadás bal oldalán csak változónév állhat" + (m[1] === "literal" ? ", egy konkrét értéknek (például számnak) nem adhatsz értéket." : ", itt ez áll: " + m[1] + "."), "Fordítva is nézd meg: a változó van a <code>=</code> bal oldalán, az érték a jobb oldalán."]; }],
  [/^SyntaxError: unmatched '(.)'/, function (m) { return ["Felesleges záró jel: <code>" + m[1] + "</code> nem tartozik nyitó párhoz.", "Számold meg a nyitó és a záró zárójeleket a sorban."]; }],
  [/^SyntaxError: invalid decimal literal|^SyntaxError: invalid character/, function () { return ["Érvénytelen karakter vagy szám–betű keverék áll a kódban.", "A változónév nem kezdődhet számmal. Ellenőrizd, hogy nem ferde („ ”) idézőjelet írtál-e a sima <code>\"</code> helyett."]; }],
  [/^SyntaxError: invalid syntax/, function () { return ["A Python nem érti ezt a sort: nyelvtani hiba van benne.", "Nézd meg a megjelölt sort és az előtte lévőt. Gyakori okok: hiányzó vagy felesleges zárójel, idézőjel, vessző, kettőspont, elírt kulcsszó."]; }],
  [/^SyntaxError: (unexpected EOF|incomplete input)/, function () { return ["A program váratlanul véget ér: valami nincs befejezve.", "Valószínűleg hiányzik egy záró zárójel vagy idézőjel."]; }],
  [/^SyntaxError/, function () { return ["Nyelvtani hiba van a programban.", "Nézd meg a megjelölt sort, és hasonlítsd össze a leckék példáival."]; }],
  [/^IndentationError: expected an indented block/, function () { return ["A kettőspont után be kell húzni a következő sort.", "Húzd beljebb a ciklus, az elágazás belsejét ugyanannyi szóközzel (általában 4)."]; }],
  [/^IndentationError: unexpected indent/, function () { return ["Ezt a sort feleslegesen húztad be.", "Csak a kettőspontra végződő sor utáni részt kell behúzni."]; }],
  [/^IndentationError: unindent does not match/, function () { return ["A behúzás nem egyezik a fölötte lévő sorokéval.", "Egy blokk sorai pontosan ugyanannyi szóközzel kezdődjenek."]; }],
  [/^(Indentation|Tab)Error/, function () { return ["Hiba van a behúzásban.", "Használj mindenhol ugyanannyi szóközt (4-et), és ne keverd a tabulátort a szóközzel."]; }],

  /* ---- futás közbeni hibák ---- */
  [/^NameError: name '(\w+)' is not defined/, function (m, code) { return nameHelp(m[1], code); }],
  [/^TypeError: unsupported operand type\(s\) for ([^:]+): '(\w+)' and '(\w+)'/, function (m) {
    var s = m[2] === "str" || m[3] === "str";
    return ["A(z) <code>" + m[1] + "</code> művelet nem végezhető el egy <b>" + m[2] + "</b> és egy <b>" + m[3] + "</b> típusú érték között.",
      s ? "Valószínűleg szöveg és szám keveredik. Az <code>input()</code> mindig szöveget ad: használd az <code>int(input())</code>-ot. Szám szöveggé alakításához ott van a <code>str()</code>." : "Ellenőrizd, hogy a két érték típusa illik-e egymáshoz (<code>type(x)</code> megmutatja)."];
  }],
  [/^TypeError: can only concatenate str \(not "(\w+)"\) to str/, function (m) { return ["Szöveghez nem fűzhető hozzá <b>" + m[1] + "</b> típusú érték a <code>+</code> jellel.", "Alakítsd szöveggé: <code>str(szam)</code>, vagy használj vesszőt a <code>print</code>-ben: <code>print(\"Kor:\", kor)</code>."]; }],
  [/^TypeError: can't multiply sequence by non-int of type '(\w+)'/, function () { return ["Szöveget csak egész számmal lehet szorozni.", "Ha az <code>input()</code> értékét használod, előbb alakítsd <code>int()</code>-té."]; }],
  [/^TypeError: '([<>]=?)' not supported between instances of '(\w+)' and '(\w+)'/, function (m) { return ["A(z) <code>" + m[1] + "</code> összehasonlítás nem működik <b>" + m[2] + "</b> és <b>" + m[3] + "</b> között.", "Gyakori ok: az <code>input()</code> szöveget ad, a másik oldalon szám áll. Használd az <code>int(input())</code>-ot."]; }],
  [/^TypeError: '(int|float)' object is not iterable/, function () { return ["A <code>for</code> ciklus nem tud egy számon végigmenni.", "Számokon a <code>range</code>-dzsel kell bejárni: <code>for i in range(n):</code>."]; }],
  [/^TypeError: '(float|str)' object cannot be interpreted as an integer/, function (m) { return ["A <code>range</code>-nek (és az indexnek) egész számra van szüksége, de " + (m[1] === "float" ? "tizedes törtet" : "szöveget") + " kapott.", m[1] === "float" ? "Használj egész osztást (<code>//</code>) vagy <code>int()</code>-et." : "Az <code>input()</code> szöveget ad: használd az <code>int(input())</code>-ot."]; }],
  [/^TypeError: (list|string) indices must be integers or slices, not (\w+)/, function (m) { return ["Az index csak egész szám lehet, itt " + m[2] + " típusú.", m[2] === "str" ? "Valószínűleg beolvasott szöveget használsz indexnek: <code>int(input())</code>." : "Egész osztással (<code>//</code>) vagy <code>int()</code>-tel kapsz egész számot."]; }],
  [/^TypeError: '(int|float|bool)' object is not subscriptable/, function (m) { return ["A(z) <b>" + m[1] + "</b> típusú értéknek nincs indexe, nem lehet <code>[...]</code>-lel elérni.", "Az indexelés listán és szövegen működik. Biztos, hogy listát tartasz a változóban?"]; }],
  [/^TypeError: '(\w+)' object is not callable/, function (m) { return ["Egy <b>" + m[1] + "</b> típusú értéket próbálsz függvényként meghívni (zárójellel).", "Gyakori ok: egy beépített függvény nevét (<code>sum</code>, <code>max</code>, <code>min</code>, <code>len</code>…) változónévnek használtad. Nevezd át a változót!"]; }],
  [/^TypeError: 'str' object does not support item assignment/, function () { return ["A szöveg nem módosítható: egy karakterét nem írhatod át.", "Építs új szöveget (például összefűzéssel), vagy használj listát."]; }],
  [/^TypeError: object of type '(\w+)' has no len\(\)/, function (m) { return ["A <code>len</code> csak listán és szövegen működik, a(z) <b>" + m[1] + "</b> típusnak nincs hossza.", "A szám jegyeinek számához előbb alakítsd szöveggé: <code>len(str(n))</code>."]; }],
  [/^TypeError: \w+\(\) takes .* argument/, function () { return ["Rossz számú értéket adtál át egy függvénynek.", "Nézd meg, hány adatot vár a függvény."]; }],
  [/^TypeError/, function () { return ["Rossz típusú értékekkel dolgozol.", "Ellenőrizd a változók típusát (<code>type(x)</code>), különösen az <code>input()</code> után."]; }],
  [/^ValueError: invalid literal for int\(\) with base 10: (.*)/, function (m) {
    var v = m[1];
    return ["A " + v + " szöveget nem lehet egész számmá alakítani.", /^'-?\d+\.\d+'$/.test(v) ? "Tizedes törtet tartalmaz. Előbb <code>float()</code>, ha egész kell, utána <code>int()</code>." : v === "''" ? "A szöveg üres. Lehet, hogy a Bemenet mezőben hiányzik egy sor." : "Az <code>int()</code>-nek csak számjegyekből álló szöveg adható (esetleg előjellel), betű vagy szóköz nem lehet benne."];
  }],
  [/^ValueError: could not convert string to float/, function () { return ["Ezt a szöveget nem lehet tizedes törtté alakítani.", "Csak számjegyet és tizedespontot tartalmazhat (<code>3.5</code>, nem <code>3,5</code>)."]; }],
  [/^ValueError: (.+) is not in list|^ValueError: list\.remove/, function () { return ["Ez az elem nincs a listában.", "Az <code>index</code> és a <code>remove</code> hibát ad, ha nincs találat. Előbb ellenőrizd: <code>if x in lista:</code>."]; }],
  [/^ValueError: (not enough|too many) values to unpack/, function () { return ["Nem annyi érték van, ahány változónak szánod.", "Nézd meg, hogy a <code>split()</code> valóban annyi részt ad-e."]; }],
  [/^ValueError/, function () { return ["Az érték típusa jó, de a tartalma nem megfelelő a művelethez.", "Nézd meg, milyen érték érkezik a hibás sorba."]; }],
  [/^ZeroDivisionError/, function () { return ["Nullával osztottál.", "Az osztás előtt ellenőrizd, hogy az osztó nem nulla (<code>if b != 0:</code>)."]; }],
  [/^IndexError: list index out of range/, function () { return ["Nem létező indexű listaelemet kérsz: az index túl nagy.", "Egy <code>n</code> elemű lista utolsó indexe <code>n - 1</code>. Ellenőrizd a ciklus határát (<code>range(len(lista))</code>), és azt, hogy a lista nem üres-e."]; }],
  [/^IndexError: string index out of range/, function () { return ["A szövegnek nincs ennyiedik karaktere.", "Az utolsó karakter indexe <code>len(szoveg) - 1</code>. Üres szövegnek egyáltalán nincs első karaktere."]; }],
  [/^IndexError: pop/, function () { return ["Üres listából próbálsz elemet kivenni.", "Előbb nézd meg, hogy a lista nem üres-e."]; }],
  [/^IndexError/, function () { return ["Nem létező indexet használtál.", "Ellenőrizd, hogy az index 0 és <code>len - 1</code> között van-e."]; }],
  [/^AttributeError: '(\w+)' object has no attribute '(\w+)'/, function (m) {
    var tip = { push: "Pythonban a lista végére az <code>append</code> tesz elemet.", add: "Listához az <code>append</code> adhat elemet.", length: "A hossz a <code>len(x)</code> függvénnyel kérhető le.", size: "A hossz a <code>len(x)</code> függvénnyel kérhető le." }[m[2]];
    return ["A(z) <b>" + m[1] + "</b> típusnak nincs <code>" + m[2] + "</code> nevű művelete.", tip || "Ellenőrizd a metódus nevét (kis- és nagybetű is számít), és azt, hogy a megfelelő típuson hívod-e."];
  }],
  [/^EOFError/, function () { return ["Az <code>input()</code> több adatot kért, mint amennyit megadtál.", "Írd a <b>Bemenet</b> mezőbe az értékeket, soronként egyet, annyit, ahány <code>input()</code> lefut."]; }],
  [/^KeyError/, function () { return ["Ilyen kulcs nincs a szótárban.", "Ellenőrizd a kulcs írásmódját."]; }],
  [/^RecursionError/, function () { return ["A függvény önmagát hívja végtelenül.", "Hiányzik a leállási feltétel."]; }],
  [/^UnboundLocalError/, function () { return ["A változónak a függvényben még nincs értéke, amikor használod.", "Add meg az értékét a használat előtt."]; }],

  /* ---- a futtató saját üzenetei ---- */
  [/^A program túl sokáig fut/, function () { return ["Valószínűleg végtelen ciklus van a programban.", "A <code>while</code> feltételének egyszer hamissá kell válnia: biztosan változtatod a feltételben szereplő változót a cikluson belül? A 🔍 Lépésenként gomb megmutatja, mi történik."]; }],
  [/^Túl sok kimenet/, function () { return ["A program túl sok szöveget ír ki, valószínűleg végtelen ciklusban.", "Nézd meg a ciklusfeltételt, és hogy a ciklusváltozó változik-e."]; }]
];

/* Elírt változónév keresése: Levenshtein-távolság a kódban értéket kapó nevekhez. */
function lev(a, b) {
  var d = [], i, j;
  for (i = 0; i <= a.length; i++) { d[i] = [i]; }
  for (j = 1; j <= b.length; j++) d[0][j] = j;
  for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function nameHelp(name, code) {
  var defs = {}, m, re = /^\s*([A-Za-z_]\w*)\s*(?:[+\-*\/%]?=(?!=)|,)/gm;
  while ((m = re.exec(code || ""))) defs[m[1]] = 1;
  var fr = /\bfor\s+(\w+)\s+in\b/g;
  while ((m = fr.exec(code || ""))) defs[m[1]] = 1;
  var best = null;
  Object.keys(defs).forEach(function (n) {
    var d = lev(n.toLowerCase(), name.toLowerCase());
    if (n !== name && d <= 2 && (!best || d < best.d)) best = { n: n, d: d };
  });
  var base = "A(z) <code>" + name + "</code> nevű változót még nem hoztad létre, amikor használod.";
  if (name === "Print" || name === "Input") return [base, "A <code>print</code> és az <code>input</code> csupa kisbetű."];
  if (best) return [base, "Elírtad? Ilyen nevű változód van: <code>" + best.n + "</code>. A Python a kis- és nagybetűt is megkülönbözteti."];
  return [base, "Három gyakori ok: elírtad a nevet; az értékadás a használat <b>után</b> van; vagy szöveget akartál írni, és kimaradt az idézőjel (<code>\"" + name + "\"</code>)."];
}

/* A hibaüzenet magyarázata kész HTML-ként. A hiba sorát is megmutatja. */
function hibaMagyaraz(err, code) {
  var last = err.trim().split("\n").pop(), r = null, i, m;
  for (i = 0; i < HB.length; i++) {
    m = HB[i][0].exec(last);
    if (m) { r = HB[i][1](m, code); break; }
  }
  if (!r) return "";
  var ln = null, re = /File "program\.py", line (\d+)/g, mm;
  while ((mm = re.exec(err))) ln = +mm[1];
  var src = ln && code ? code.split("\n")[ln - 1] : null;
  return '<div class="hint"><b>💡 Mit jelent a hibaüzenet?</b><p>' + r[0] + "</p><p><b>Mit tegyél?</b> " + r[1] + "</p>" +
    (src !== null && src !== undefined ? '<p class="mut"><small>A hiba a(z) ' + ln + ". sorban van: <code>" + esc(src.trim()) + "</code></small></p>" : "") +
    '<button class="btn gh" onclick="openL(9,1)">📖 Hibaüzenetek típusai (9. évf.)</button></div>';
}
