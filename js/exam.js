/* Érettségi mód: az érettségi 5. feladatához (algoritmizálás és programozás) hasonló feladatsorok
   időmérővel, beadás utáni, szempontonkénti részpontozással és opcionálisan ékezetmentes kimenet-elfogadással.
   Két csoport van: az érettségi típusú (g = "e": 15 pont, 3-4 rövid részfeladat) és a hosszabb gyakorló feladatsorok (g = "h").
   A diák üres szerkesztővel indul: a bemenetet (input) és a feladat szövegében megadott adatokat is neki kell beírnia.
   Az adatok: EX (js/data/erettsegi.js, a tananyag/erettsegi/*.txt fájlokból generálva). */
var EXS = null;   /* az éppen futó feladatsor állapota */

function exInfo(id) { return (S.ex && S.ex[id]) || null; }
function exTotal(e) { return e.parts.reduce(function (a, p) { return a + p.p; }, e.gen ? e.gen.p : 0); }
function exCount() { return Object.keys(S.ex || {}).length; }
function exBest(frac) {
  return EX.some(function (e) { var r = exInfo(e.id); return r && r.b >= frac * exTotal(e); });
}
/* az érettségi százalékhatárai (középszint): 25 / 40 / 60 / 80 */
function exJegy(pc) { return pc >= 80 ? 5 : pc >= 60 ? 4 : pc >= 40 ? 3 : pc >= 25 ? 2 : 1; }

/* A kimenet „N. feladat” fejlécek szerinti blokkokra bontása. A fejléc után ugyanabban a sorban álló szöveg is elfogadott. */
function exBlocks(out) {
  var B = {}, cur = null;
  out.replace(/\r/g, "").split("\n").forEach(function (ln) {
    var m = /^\s*(\d+)\.\s*feladat\s*:?\s*(.*)$/i.exec(ln);
    if (m) { cur = +m[1]; B[cur] = B[cur] || []; if (m[2].trim()) B[cur].push(m[2]); }
    else if (cur !== null && ln.trim() !== "") B[cur].push(ln);
  });
  return B;
}
/* A rejtett tesztekben a feladatban megadott adatokat (oszlopokat) a diák kódjában az értékük alapján találjuk meg és cseréljük le,
   akárhogyan tárolta őket: külön listákban, sorokként (lista/rekord soronként), szótárban. A változók neve nem számít.
   Ha valamelyik oszlopot nem ismerjük fel, a tesztet kihagyjuk ("ok": false), és ezt a diáknak is megmondjuk. */
var EXSUB = [
  "import ast, json",
  "def _exsub(code, samp, hid):",
  "    samp = json.loads(samp); hid = json.loads(hid); k = len(samp)",
  "    try:",
  "        tree = ast.parse(code)",
  "    except SyntaxError:",
  "        return json.dumps({'code': code, 'ok': True})",
  "    def seq(v): return isinstance(v, (list, tuple))",
  "    def rows(L):",
  "        if not L or not all(seq(r) and len(r) == len(L[0]) and len(r) > 0 for r in L): return None",
  "        mp = []",
  "        for c in range(len(L[0])):",
  "            col = [r[c] for r in L]",
  "            j = next((j for j in range(k) if j not in mp and samp[j] == col), None)",
  "            if j is None: return None",
  "            mp.append(j)",
  "        return mp",
  "    def mkrows(L, mp, h):",
  "        return [type(L[0])(h[j][i] for j in mp) for i in range(len(h[mp[0]]))]",
  "    def conv(v):",
  "        if seq(v):",
  "            L = list(v)",
  "            for j in range(k):",
  "                if L == samp[j]: return type(v)(hid[j]), {j}",
  "            mp = rows(L)",
  "            if mp: return type(v)(mkrows(L, mp, hid)), set(mp)",
  "        elif isinstance(v, dict) and v:",
  "            ks, vs = list(v.keys()), list(v.values())",
  "            for ja in range(k):",
  "                if ks != samp[ja]: continue",
  "                for jb in range(k):",
  "                    if jb != ja and vs == samp[jb]: return dict(zip(hid[ja], hid[jb])), {ja, jb}",
  "                mp = rows(vs)",
  "                if mp and ja not in mp: return dict(zip(hid[ja], mkrows(vs, mp, hid))), set(mp) | {ja}",
  "        return None",
  "    got = set()",
  "    for n in tree.body:",
  "        if not isinstance(n, ast.Assign): continue",
  "        try: v = ast.literal_eval(n.value)",
  "        except Exception: continue",
  "        r = conv(v)",
  "        if r:",
  "            n.value = ast.parse(repr(r[0]), mode='eval').body",
  "            got |= r[1]",
  "    ok = got == set(range(k))",
  "    return json.dumps({'code': ast.unparse(ast.fix_missing_locations(tree)) if ok else code, 'ok': ok})"
].join("\n");
function exSub(code, samp, hid) {
  if (!hid) return Promise.resolve({ code: code, ok: true });
  return pyLoad().then(function () {
    var P = PY.py;
    if (!P.globals.get("_exsub")) P.runPython(EXSUB);
    return JSON.parse(P.globals.get("_exsub")(code, JSON.stringify(samp), JSON.stringify(hid)));
  });
}
/* A feladatban megadott adatok megjelenítése: "Címke: elem, elem, ..." (változónév és adatszerkezet említése nélkül). */
function exData(e, cols) {
  return cols.map(function (c, j) { return '<div class="exd"><b>' + esc(e.cl[j]) + "</b><div>" + c.map(function (x) { return esc(String(x)); }).join(", ") + "</div></div>"; }).join("");
}

/* ---- a feladatsorok listája ---- */
function exItem(e, i, n) {
  var r = exInfo(e.id);
  return '<button class="tp' + (r && r.b >= exTotal(e) ? " d" : "") + '" onclick="exSetup(' + i + ')"><b>' + (r && r.b >= exTotal(e) ? "✓" : n) + "</b><span>" + esc(e.n) +
    '<br><small class="mut">' + exTotal(e) + " pont · " + e.parts.length + " részfeladat · " + e.t + " perc" + (r ? " · legjobb eredményed: " + r.b + "/" + r.tot : "") + "</small></span></button>";
}
function exams() {
  REV = false; scrollTo(0, 0);
  if (!S.ex) S.ex = {};
  var h = '<div class="card"><h2 style="margin-top:0">🎓 Érettségi mód</h2><div class="tx">' +
    "<p>A digitális kultúra érettségi gyakorlati vizsgáján az <b>5. feladat</b> algoritmizálás és programozás: 15 pontot ér a 100-ból, és a 180 perces vizsgából nagyjából fél óra jut rá. Az érettségin ez általában egy rövid történet 3–4 részfeladattal, a megoldás 20–30 sor. Itt ugyanilyen feladatsorokat oldhatsz meg.</p>" +
    "<ul><li>Üres szerkesztővel indulsz. Ha a feladat adatokat ad meg, neked kell a programban eltárolnod őket (úgy, ahogy jónak látod). Ha a program bemenetet olvas, a minta bemenetét a <b>Bemenet</b> mezőbe kell felvinned, a bekéréskor pedig a minta szerinti szöveget kell megjelenítened.</li>" +
    "<li>A programodnak <b>bármilyen adatra</b> működnie kell: beadáskor más adatokkal és más bemenettel is lefuttatjuk.</li>" +
    "<li>Minden eredmény elé külön sorba írd ki a részfeladat sorszámát, például <code>3. feladat</code>, utána jön az eredmény.</li>" +
    "<li>A javítási útmutatókhoz hasonlóan a pontokat <b>logikai egységenként</b> kapod, ezért részpontokat is szerezhetsz: a program működéséért és a képernyőre írásért (az „N. feladat” fejléc a minta szerint), az adatok eltárolásáért, a bekérés szövegéért, a mintára helyes eredményért, a más adatokra is helyes eredményért és a feliratok helyességéért. A pontokat a beadás után látod, ahogy az éles vizsgán is az értékelésnél derül ki.</li>" +
    "<li>A kiírás szövegében a kis- és nagybetű, valamint az írásjelek eltérését elfogadjuk. Az ékezet nélküli kimenet is elfogadott, ezt itt ki is kapcsolhatod.</li>" +
    "<li>Az időmérő lejártakor a program automatikusan beadásra kerül.</li></ul></div>";
  var n = 0;
  h += "<h3>Érettségi típusú feladatsorok</h3>" + EX.map(function (e, i) { return e.g === "e" ? exItem(e, i, ++n) : ""; }).join("");
  n = 0;
  var longs = EX.map(function (e, i) { return e.g === "h" ? exItem(e, i, ++n) : ""; }).join("");
  if (longs) h += "<h3>Hosszabb gyakorló feladatsorok</h3><p class=\"mut\">Ezek terjedelmesebbek az érettségi feladatnál (6 részfeladat, hosszabb megoldás), ha többet vagy nehezebbet szeretnél gyakorolni. Ugyanúgy működnek.</p>" + longs;
  $("v").innerHTML = h + '<button class="btn gh" onclick="home()">← Vissza a témákhoz</button></div>';
}

/* ---- beállítások a kezdés előtt ---- */
function exSetup(i) {
  var e = EX[i], r = exInfo(e.id), opts = [20, 30, 45, 60].filter(function (m) { return m !== e.t; }).concat([e.t]).sort(function (a, b) { return a - b; });
  scrollTo(0, 0);
  $("v").innerHTML = '<div class="card"><h2 style="margin-top:0">🎓 ' + esc(e.n) + '</h2><div class="tx"><p>' + exTotal(e) + " pontos feladatsor, " + e.parts.length + " részfeladat. A feladat szövege az indítás után jelenik meg.</p></div>" +
    '<p><label for="exmin"><b>Időkorlát</b></label><br><select id="exmin" class="o" style="width:auto">' +
    opts.map(function (m) { return '<option value="' + m + '"' + (m === e.t ? " selected" : "") + ">" + m + " perc" + (m === e.t ? " (ajánlott)" : "") + "</option>"; }).join("") +
    '<option value="0">időkorlát nélkül (gyakorlás)</option></select></p>' +
    '<p><label class="chk"><input type="checkbox" id="exacc" checked> Az ékezet nélküli kimenet is elfogadható (az érettségin is az)</label></p>' +
    (r ? '<p class="mut">Eddigi legjobb eredményed: <b>' + r.b + "/" + r.tot + "</b> pont.</p>" : "") +
    '<button class="btn" onclick="exRun(' + i + ')">▶ Indítás</button> <button class="btn gh" onclick="exams()">← Vissza</button></div>';
}

/* ---- a feladatsor megoldása ---- */
function exRun(i) {
  var e = EX[i], min = +$("exmin").value, acc = $("exacc").checked;
  var key = "pyt-exc-" + e.id, saved = null;
  try { saved = localStorage.getItem(key); } catch (x) {}
  var code = saved && saved !== e.st ? saved : e.st;
  var t0 = e.ts[0], hasIn = e.ts.some(function (t) { return t[0] !== ""; });
  var rnd = t0[3] != null;
  setV('<div class="exbar"><span id="extimer" role="timer" aria-live="off"></span><span class="mut" id="exinfo">Összesen ' + exTotal(e) + ' pont</span><button class="btn" onclick="exSubmit()">📤 Beadás és értékelés</button></div>' +
    '<div class="exsplit"><section class="card exleft" tabindex="0" role="region" aria-label="A feladat leírása"><h2>🎓 ' + esc(e.n) + '</h2><div class="tx">' + dl(e.d) + "</div>" +
    (e.c.length ? "<p><b>Az adatok</b> (ezeket neked kell a programban eltárolnod; az azonos sorszámú elemek összetartoznak):</p>" + exData(e, e.c) : "") +
    "<h3>Feladatok</h3><ol class=\"exl2\">" + e.parts.map(function (p) { return "<li>" + p.t + "</li>"; }).join("") + "</ol>" +
    '<p class="mut"><small>Minden részfeladat eredménye elé külön sorba írd ki a részfeladat sorszámát (például <code>' + Math.min(2, e.parts.length) + '. feladat</code>). ' +
    (hasIn ? "A bekéréskor a minta szerinti szöveg jelenjen meg. " : "") + "A pontokat a beadás után látod.</small></p>" +
    "<h3>Minta</h3>" + (t0[0] ? "<p><b>Bemenet</b> (a Bemenet mezőbe soronként ezt kell beírnod)</p><pre class=\"exmin\">" + esc(t0[0]) + "</pre>" : "") +
    "<p><b>" + (hasIn ? "Kimenet (a bekérések és a beírt értékek is látszanak)" : "Kimenet") + "</b></p><pre class=\"exmin\">" + esc(e.sm || t0[1] || "(nincs kimenet)") + "</pre>" +
    (rnd ? '<p class="mut"><small>A minta véletlen értékeket tartalmaz, a te programod más számokat is adhat. Beadáskor a véletlenszám-generátort rögzítjük, ezért pontosan annyiszor és olyan sorrendben sorsolj, ahogy a feladat leírja.</small></p>' : "") +
    '</section><section class="card exright" aria-label="Szerkesztő és értékelés"><h3 style="margin-top:0">Program</h3>' +
    (hasIn ? '<p class="mut"><small>A bemenetet (amit a program beolvas) a szerkesztő alatti <b>Bemenet</b> mezőbe írd, soronként egyet.</small></p>' : "") +
    rnHtml(code, { input: hasIn, sin: "", ph: "" }) +
    '<div id="exres" aria-live="polite"></div></section></div>');
  var r = document.querySelector(".rn"), ta = r.querySelector("textarea");
  ta.rows = 22;
  ta.setAttribute("aria-label", "A program kódja");
  ta.addEventListener("input", function () { try { localStorage.setItem(key, ta.value); } catch (x) {} });
  rnInit();
  scrollTo(0, 0);
  EXS = { i: i, acc: acc, end: min ? Date.now() + min * 60000 : 0, rn: r.id, over: false, busy: false, key: key, warned: false };
  clearInterval(exTick.h);
  exTick(); exTick.h = setInterval(exTick, 1000);
}

function exTick() {
  var el = $("extimer");
  if (!el || !EXS) { clearInterval(exTick.h); return; }
  if (!EXS.end) { el.textContent = "⏱ időkorlát nélkül"; return; }
  var left = Math.max(0, Math.round((EXS.end - Date.now()) / 1000));
  el.textContent = "⏱ " + String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");
  el.classList.toggle("warn", left <= 300);
  if (left <= 300 && left > 0 && !EXS.warned) { EXS.warned = true; toast("⏱ Még 5 perced van."); }
  if (left <= 0 && !EXS.over) {
    EXS.over = true; el.textContent = "⏱ Lejárt az idő"; clearInterval(exTick.h);
    toast("⏱ Lejárt az idő, a program beadásra került.");
    exSubmit(true);
  }
}

/* ---- beadás és értékelés ---- */
function exSubmit(auto) {
  var st = EXS;
  if (!st || st.busy) return;
  var e = EX[st.i], r = $(st.rn), code = r.querySelector("textarea").value, box = $("exres"), res = [], k = 0, dataOk = true;
  st.busy = true;
  box.innerHTML = '<p class="mut">Értékelés… (a program lefut a minta- és a rejtett adatokkal is)</p>';
  (function next() {
    if (k >= e.ts.length) { st.busy = false; return exScore(e, res, code, !!auto, dataOk); }
    var t = e.ts[k];
    (k === 0 && e.c.length ? exSub(code, e.c, e.c).then(function (d) { dataOk = d.ok; }) : Promise.resolve()).then(function () {
      return exSub(code, e.c, t[2]);
    }).then(function (sb) {
      if (!sb.ok) return { out: "", err: "", skip: true, code: code };
      return pyRun(sb.code, t[0], t[3], false, true).then(function (x) { x.code = sb.code; return x; });
    }).then(function (x) { res.push(x); k++; next(); }).catch(function () {
      st.busy = false;
      if ($("exres")) $("exres").innerHTML = '<p class="bd">Nem sikerült betölteni a Python-futtatót. Internetkapcsolat kell hozzá.</p>';
    });
  })();
}

/* A kimenetek összehasonlításához: kis- és nagybetű, írásjelek és a számok írásmódja (3.50 = 3.5) nem számít, az ékezet kérésre sem. */
function exNz(acc) {
  return function (s) {
    s = s.toLowerCase().replace(/[:;,!?()"'„”–]/g, " ").replace(/\.(?!\d)/g, " ").replace(/\d+\.\d+/g, function (m) { return String(parseFloat(m)); });
    if (acc) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s.replace(/\s+/g, " ").trim();
  };
}

/* Számok a kimenet soraiban (a feliratok és az írásmód nem számít). */
function exNums(lines) {
  return (lines.join(" ").match(/-?\d+(?:[.,]\d+)?/g) || []).map(function (t) { return parseFloat(t.replace(",", ".")); });
}
/* A diák kimenetének egy részfeladat-blokkja. Ha a részfeladatnál bekérés-szöveg is van, a print-tel kiírt kérdést kiszűrjük. */
function exGot(x, p, nz) {
  var b = exBlocks(x.out)[p.n];
  if (b && p.q) { var q = nz(p.q); b = b.filter(function (l) { return nz(l).indexOf(q) < 0; }); }
  return b || null;
}

/* Egy pontozási szempont kiértékelése. Kulcsok:
   adat – az adatok felismerhetően el vannak tárolva; kerdes – a bekérésnél megjelenik a minta szerinti szöveg;
   fut, fejlec – általános szempontok (hiba nélkül lefut; legalább egy részfeladat a minta szerint, „N. feladat” fejléc alatt);
   blokk | sorK | szamK | felirat : minta | rejtett | mind – a részfeladat kimenete (egésze / K. sora / K. száma / a számoktól független felirata)
   egyezik a mintatesztben / a rejtett tesztekben / mindben. */
function exCrit(e, res, p, c, nz, dataOk) {
  var x0 = res[0], k, x, want, got;
  if (c.k === "adat") return { ok: dataOk, kind: "adat" };
  if (c.k === "fut") return { ok: !x0.err && !x0.skip && /^\s*[^#\s]/m.test(x0.code || ""), kind: "fut", test: 0 };
  if (c.k === "fejlec") {
    var any = e.parts.some(function (q) {
      if (!q.h) return false;
      var w = exBlocks(e.ts[0][1])[q.n] || [], g = exGot(x0, q, nz);
      return g && w.map(nz).join("\n") === g.map(nz).join("\n");
    });
    return { ok: any, kind: "fejlec" };
  }
  if (c.k === "kerdes") {
    var q = nz(p.q);
    return { ok: !x0.skip && (nz(x0.prompts || "").indexOf(q) >= 0 || x0.out.split("\n").some(function (l) { return nz(l).indexOf(q) >= 0; })), kind: "kerdes" };
  }
  var m = /^(blokk|sor|szam|felirat)(\d?):(minta|rejtett|mind)$/.exec(c.k), L = m[2] ? +m[2] : 0;
  var mask = function (l) { return nz(l).replace(/-?\d+(?:\.\d+)?/g, "#"); };
  for (k = 0; k < e.ts.length; k++) {
    if (m[3] === "minta" ? k !== 0 : m[3] === "rejtett" ? k === 0 : false) continue;
    if (res[k].skip) return { ok: false, skip: true };
    x = res[k];
    want = exBlocks(e.ts[k][1])[p.n] || [];
    got = exGot(x, p, nz);
    var same = !got ? false :
      m[1] === "sor" ? nz(want[L - 1] || "") === nz(got[L - 1] || "") :
      m[1] === "szam" ? (function () { var a = exNums(want)[L - 1], b = exNums(got)[L - 1]; return b !== undefined && Math.abs(a - b) < 1e-9; })() :
      m[1] === "felirat" ? want.map(mask).join("\n") === got.map(mask).join("\n") :
      want.map(nz).join("\n") === got.map(nz).join("\n");
    if (!same) return { ok: false, test: k, none: !got, kind: m[1] };
  }
  return { ok: true };
}

/* Egy részfeladat (vagy az általános rész) eredménysora a szempontokkal. Visszaadja: [pont, html, az első elbukott szempont]. */
function exPartRows(e, res, p, nz, dataOk) {
  var got = 0, rows = "", first = null;
  p.k.forEach(function (c) {
    var r = exCrit(e, res, p, c, nz, dataOk);
    if (r.ok) got += c.p;
    else if (!first && !r.skip) first = { c: c, r: r };
    rows += '<li class="' + (r.ok ? "ok" : "no") + '"><span aria-hidden="true">' + (r.ok ? "✔" : "✘") + "</span> " + c.t + " <b>(" + (r.ok ? c.p : 0) + "/" + c.p + " pont)</b>" +
      (r.skip ? ' <span class="mut">– nem ellenőrizhető: nem ismertem fel az adatok tárolását</span>' : "") + "</li>";
  });
  return [got, rows, first];
}

function exScore(e, res, code, auto, dataOk) {
  var st = EXS, box = $("exres");
  if (!st || !box) return;
  var nz = exNz(st.acc);
  var pts = 0, total = exTotal(e), li = "", errShown = false, nskip = res.filter(function (x) { return x.skip; }).length;
  function head(got, max, title, sub, rows) {
    var cls = got === max ? "ok" : got === 0 ? "no" : "mid";
    return '<li class="' + cls + '"><b>' + (cls === "ok" ? "✔" : cls === "no" ? "✘" : "◐") + " " + title + ": " + got + "/" + max + ' pont</b>' + (sub ? '<br><span class="mut">' + sub + "</span>" : "") + '<ul class="cr">' + rows + "</ul>";
  }
  function err(x, hidden) {
    var h = "<p>A program " + (errShown ? "ugyanezzel a hibával" : "hibával") + " állt le" + (hidden ? " a rejtett adatoknál" : "") + ".</p>";
    if (!errShown) { errShown = true; h += '<pre class="rout er">' + esc(x.err) + "</pre>" + hibaMagyaraz(x.err, x.code); }
    return h;
  }
  if (e.gen) {
    var g = exPartRows(e, res, e.gen, nz, dataOk), more = "";
    pts += g[0];
    if (g[2] && g[2].r.kind === "fut" && res[0].err) more = err(res[0], false);
    else if (g[2] && g[2].r.kind === "fejlec") more = "<p>Egyik részfeladatnál sem találtam a minta szerinti kimenetet a megfelelő <code>N. feladat</code> fejléc alatt. Minden eredmény elé külön sorba írd ki a részfeladat sorszámát, utána jöjjön az eredmény a mintának megfelelően.</p>";
    li += head(g[0], e.gen.p, "Általános", "A program működése és a képernyőre írás", g[1]) + more + "</li>";
  }
  e.parts.forEach(function (p) {
    var r0 = exPartRows(e, res, p, nz, dataOk), first = r0[2];
    pts += r0[0];
    li += head(r0[0], p.p, p.n + ". részfeladat", p.t, r0[1]);
    if (first) {
      var c = first.c, r = first.r;
      if (r.kind === "adat") {
        li += "<p>Nem ismertem fel, hogy a feladatban megadott adatokat eltároltad a programban. Az adatok elemeit pontosan és ugyanabban a sorrendben kell beírnod (például külön sorozatokban, soronként vagy párokban); a változók neve tetszőleges.</p>";
      } else if (r.kind === "kerdes") {
        li += "<p>A bekérésnél nem találtam a minta szerinti szöveget (<code>" + esc(p.q) + "</code>). A mintában látszik, mit kell kiírni a beírandó érték előtt.</p>";
      } else {
        var t = e.ts[r.test], x = res[r.test], hidden = r.test > 0 || !!t[2];
        if (x.err) li += err(x, hidden);
        if (r.none && !x.err) li += "<p>Nem találom a kimenetben a <code>" + p.n + ". feladat</code> fejlécet: minden eredmény elé külön sorba írd ki.</p>";
        else if (r.kind === "felirat" && !x.err) li += "<p>A számok lehetnek jók, de a felirat vagy a kiírás formátuma eltér a mintától.</p>";
        else if (hidden && !x.err && /rejtett|mind/.test(c.k)) li += "<p>A mintaadatokra jó lehet, de <b>ezekre az adatokra nem működik</b>. Valószínűleg beleírtál valamit az adatokból, vagy egy különleges eset nem működik (üres találat, egyenlő értékek, határérték).</p>";
        if (hidden) li += "<p><b>Az adatok</b></p>" + (t[2] ? exData(e, t[2]) : "") + (t[0] ? '<pre class="exmin">bemenet: ' + esc(t[0].replace(/\n/g, " ")) + "</pre>" : "");
        var wb = exBlocks(t[1])[p.n], gb = exGot(x, p, nz);
        li += "<p><b>Várt kimenet</b></p><pre>" + esc(p.n + ". feladat\n" + (wb || []).join("\n")) + "</pre>";
        li += "<p><b>A te kimeneted</b></p><pre>" + esc(gb ? p.n + ". feladat\n" + gb.join("\n") : "(nincs)") + "</pre>";
      }
    }
    li += "</li>";
  });
  var pc = Math.round(pts / total * 100), jegy = exJegy(pc), cnts = !st.over || auto;
  var msg = "";
  if (cnts) {
    var r = (S.ex = S.ex || {})[e.id] || { b: 0, tot: total, n: 0 }, old = r.b;
    r.n++; r.tot = total;
    if (pts > r.b) { S.xp += (pts - r.b) * 2; r.b = pts; msg = "Új legjobb eredmény! +" + (pts - old) * 2 + " XP"; }
    S.ex[e.id] = r;
    touch(); checkBadges(); save(); hdr();
  } else msg = "Ez már időn túli próba, ezért nem számít bele a legjobb eredményedbe.";
  box.innerHTML = '<h3>' + (auto ? "Lejárt az idő – " : "") + "Eredményed: " + pts + "/" + total + " pont (" + pc + "%)</h3>" +
    '<p class="exj">Ha ez a teljes gyakorlati vizsga eredménye lenne, ' + jegy + "-" + (jegy === 5 ? "ös" : jegy === 3 ? "as" : "es") + " jegynek felelne meg (a határok: 25, 40, 60, 80%). " + esc(msg) + "</p>" +
    (nskip ? '<p class="mut">⚠ A rejtett adatokkal futtatott tesztek közül ' + nskip + " db-ot nem tudtam elvégezni, mert nem ismertem fel, hogyan tárolod el a feladatban megadott adatokat (a program az adatokat ugyanazokkal az elemekkel, ugyanabban a sorrendben várja, például külön sorozatokban, soronként vagy szótárban). Az ezektől függő szempontokra nem járt pont.</p>" : "") +
    '<ul class="exl">' + li + "</ul>" +
    "<details><summary>Mintamegoldás (előbb próbálkozz magad!)</summary><pre>" + hl(dq(e.m)) + "</pre></details>" +
    '<div class="rb"><button class="btn gh" onclick="exSetup(' + st.i + ')">Új próba</button><button class="btn gh" onclick="exams()">Másik feladatsor</button></div>';
  box.scrollIntoView({ block: "start" });
}

/* Az Eredmények oldal érettségi része. */
function exSummary() {
  if (!EX.length) return "";
  function row(e) {
    var r = exInfo(e.id);
    return '<p class="exs"><b>' + esc(e.n) + ":</b> " + (r ? r.b + "/" + r.tot + " pont (" + r.n + " próba)" : '<span class="mut">még nem próbáltad</span>') + "</p>";
  }
  var h = "<h3>Érettségi típusú feladatsorok</h3>" + EX.filter(function (e) { return e.g === "e"; }).map(row).join("");
  var l = EX.filter(function (e) { return e.g === "h"; });
  return h + (l.length ? "<h3>Hosszabb gyakorló feladatsorok</h3>" + l.map(row).join("") : "");
}
