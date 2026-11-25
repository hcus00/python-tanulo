/* Érettségi mód: az érettségi 5. feladatához (algoritmizálás és programozás) hasonló feladatsorok
   időmérővel, beadás utáni részpontozással és opcionálisan ékezetmentes kimenet-elfogadással.
   A diák üres szerkesztővel indul: a bemenetet (input) és a feladat szövegében megadott adatokat is neki kell beírnia.
   Az adatok: EX (js/data/erettsegi.js, a tananyag/erettsegi/*.txt fájlokból generálva). */
var EXS = null;   /* az éppen futó feladatsor állapota */

function exInfo(id) { return (S.ex && S.ex[id]) || null; }
function exTotal(e) { return e.parts.reduce(function (a, p) { return a + p.p; }, 0); }
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
function exams() {
  REV = false; scrollTo(0, 0);
  if (!S.ex) S.ex = {};
  var h = '<div class="card"><h2 style="margin-top:0">🎓 Érettségi mód</h2><div class="tx">' +
    "<p>A digitális kultúra érettségi gyakorlati vizsgáján az <b>5. feladat</b> algoritmizálás és programozás: 15 pontot ér a 100-ból, és a 180 perces vizsgából nagyjából fél óra jut rá. Itt ugyanilyen feladatsorokat oldhatsz meg.</p>" +
    "<ul><li>Üres szerkesztővel indulsz. Ha a feladat szövege adatokat ad meg, neked kell a programban eltárolnod őket (úgy, ahogy jónak látod), a bemenetet pedig a <b>Bemenet</b> mezőbe kell felvinned.</li>" +
    "<li>A programodnak <b>bármilyen adatra</b> működnie kell: beadáskor más adatokkal és más bemenettel is lefuttatjuk.</li>" +
    "<li>Minden eredmény elé külön sorba írd ki a részfeladat sorszámát, például <code>3. feladat</code>, utána jön az eredmény.</li>" +
    "<li>A pontokat részfeladatonként a beadás után látod, ahogy az éles vizsgán is az értékelésnél derül ki.</li>" +
    "<li>Az érettségin az ékezet nélküli kimenet is elfogadott. Ezt itt is bekapcsolhatod.</li>" +
    "<li>Az időmérő lejártakor a program automatikusan beadásra kerül.</li></ul></div>";
  h += EX.map(function (e, i) {
    var r = exInfo(e.id);
    return '<button class="tp' + (r && r.b >= exTotal(e) ? " d" : "") + '" onclick="exSetup(' + i + ')"><b>' + (r && r.b >= exTotal(e) ? "✓" : i + 1) + "</b><span>" + esc(e.n) +
      '<br><small class="mut">' + exTotal(e) + " pont · " + e.t + " perc" + (r ? " · legjobb eredményed: " + r.b + "/" + r.tot : "") + "</small></span></button>";
  }).join("");
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
    (hasIn ? "Ha a feladat nem ír elő bekérő szöveget, bekéréskor ne írj ki semmit. " : "") + "A pontokat a beadás után látod.</small></p>" +
    "<h3>Minta</h3>" + (t0[0] ? "<p><b>Bemenet</b></p><pre class=\"exmin\">" + esc(t0[0]) + "</pre>" : "") +
    "<p><b>Kimenet</b></p><pre class=\"exmin\">" + esc(t0[1] || "(nincs kimenet)") + "</pre>" +
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
  var e = EX[st.i], r = $(st.rn), code = r.querySelector("textarea").value, box = $("exres"), res = [], k = 0;
  st.busy = true;
  box.innerHTML = '<p class="mut">Értékelés… (a program lefut a minta- és a rejtett adatokkal is)</p>';
  (function next() {
    if (k >= e.ts.length) { st.busy = false; return exScore(e, res, code, !!auto); }
    var t = e.ts[k];
    exSub(code, e.c, t[2]).then(function (sb) {
      if (!sb.ok) return { out: "", err: "", skip: true, code: code };
      return pyRun(sb.code, t[0], t[3]).then(function (x) { x.code = sb.code; return x; });
    }).then(function (x) { res.push(x); k++; next(); }).catch(function () {
      st.busy = false;
      if ($("exres")) $("exres").innerHTML = '<p class="bd">Nem sikerült betölteni a Python-futtatót. Internetkapcsolat kell hozzá.</p>';
    });
  })();
}

function exScore(e, res, code, auto) {
  var st = EXS, box = $("exres");
  if (!st || !box) return;
  var nz = function (s) { s = s.replace(/\s+/g, " ").trim(); return st.acc ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s; };
  var blk = function (out, n) { var B = exBlocks(out); return B[n] ? B[n].map(nz).join("\n") : null; };
  var pts = 0, total = exTotal(e), li = "", errShown = false, nskip = res.filter(function (x) { return x.skip; }).length;
  e.parts.forEach(function (p) {
    var bad = -1, why = "";
    e.ts.forEach(function (t, k) {
      if (bad >= 0 || res[k].skip) return;
      if (p.h) {
        var want = blk(t[1], p.n), got = blk(res[k].out, p.n);
        if (got !== want) { bad = k; why = got === null ? "nincs" : "eltér"; }
      } else if (res[k].err) { bad = k; why = "hiba"; }
    });
    var ok = bad < 0;
    if (ok) pts += p.p;
    li += '<li class="' + (ok ? "ok" : "no") + '"><b>' + (ok ? "✔" : "✘") + " " + p.n + ". részfeladat: " + (ok ? p.p : 0) + "/" + p.p + ' pont</b><br><span class="mut">' + p.t + "</span>";
    if (!ok) {
      var t = e.ts[bad], x = res[bad], hidden = bad > 0 || !!t[2];
      if (why === "hiba" || x.err) {
        li += "<br>A program hibával állt le" + (hidden ? " a rejtett adatoknál" : "") + ".";
        if (!errShown) { errShown = true; li += '<pre class="rout er">' + esc(x.err) + "</pre>" + hibaMagyaraz(x.err, x.code); }
      }
      if (p.h) {
        var wb = exBlocks(t[1])[p.n], gb = exBlocks(x.out)[p.n];
        if (why === "nincs") li += "<br>Nem találom a kimenetben a <code>" + p.n + ". feladat</code> fejlécet: minden eredmény elé külön sorba írd ki.";
        else if (hidden && !x.err) li += "<br>A mintaadatokra jó lehet, de <b>más adatokra nem működik</b>. Valószínűleg beleírtál valamit az adatokból, vagy egy különleges eset nem működik (üres találat, egyenlő értékek, hosszabb vagy rövidebb lista).";
        if (hidden) li += "<br><b>Az adatok</b>" + (t[2] ? exData(e, t[2]) : "") + (t[0] ? '<pre class="exmin">bemenet: ' + esc(t[0].replace(/\n/g, " ")) + "</pre>" : "");
        li += "<br><b>Várt kimenet</b><pre>" + esc(p.n + ". feladat\n" + (wb || []).join("\n")) + "</pre>";
        li += "<b>A te kimeneted</b><pre>" + esc(gb ? p.n + ". feladat\n" + gb.join("\n") : "(nincs)") + "</pre>";
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
    '<p class="exj">Ha ez a teljes gyakorlati vizsga eredménye lenne, ' + jegy + "-" + (jegy === 5 ? "ös" : jegy === 4 ? "es" : jegy === 3 ? "as" : jegy === 2 ? "es" : "es") + " jegynek felelne meg (a határok: 25, 40, 60, 80%). " + esc(msg) + "</p>" +
    (nskip ? '<p class="mut">⚠ A rejtett adatokkal futtatott tesztek közül ' + nskip + " db-ot nem tudtam elvégezni, mert nem ismertem fel, hogyan tárolod el a feladatban megadott adatokat (a program az adatokat ugyanazokkal az elemekkel, ugyanabban a sorrendben várja, például külön listákban, soronként vagy szótárban). Ezeket nem vettem figyelembe, így a pontszám csak a többi teszten alapul.</p>" : "") +
    '<ul class="exl">' + li + "</ul>" +
    "<details><summary>Mintamegoldás (előbb próbálkozz magad!)</summary><pre>" + hl(dq(e.m)) + "</pre></details>" +
    '<div class="rb"><button class="btn gh" onclick="exSetup(' + st.i + ')">Új próba</button><button class="btn gh" onclick="exams()">Másik feladatsor</button></div>';
  box.scrollIntoView({ block: "start" });
}

/* Az Eredmények oldal érettségi része. */
function exSummary() {
  if (!EX.length) return "";
  return "<h3>Érettségi feladatsorok</h3>" + EX.map(function (e) {
    var r = exInfo(e.id);
    return '<p class="exs"><b>' + esc(e.n) + ":</b> " + (r ? r.b + "/" + r.tot + " pont (" + r.n + " próba)" : '<span class="mut">még nem próbáltad</span>') + "</p>";
  }).join("");
}
