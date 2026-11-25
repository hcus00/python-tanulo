/* Az alkalmazás működése: állapot, téma, témalista, leckék, feladatok, jelvények, ismétlés, keresés. */
var S = { xp: 0, done: {}, t: {}, w: {}, b: {}, st: 0, sd: "", best: 0, rc: 0, pl: 0, ex: {} };
/* S.t: megoldott feladatok ("évf-téma-feladat"), S.w: elrontott feladatok (ismétlőhöz), S.b: jelvények,
   S.st / S.sd / S.best: napi sorozat, S.rc: sikeresen ismételt feladatok, S.pl: járt a játszótéren,
   S.ex: érettségi feladatsorok eredményei {id: {b: legjobb pont, tot: összpont, n: próbák}} */
var Y = 9;      /* a kiválasztott évfolyam */
var REV = false; /* igaz, ha az Ismétlő oldal van nyitva */

try { var saved = JSON.parse(localStorage.getItem("pyt")); if (saved) for (var sk in saved) S[sk] = saved[sk]; } catch (e) {}
try { var th = localStorage.getItem("pyt-th"); if (th) document.documentElement.dataset.theme = th; } catch (e) {}
var save = function () { try { localStorage.setItem("pyt", JSON.stringify(S)); } catch (e) {} };

/* A témák címei és sorrendje a R kulcsaiból jön: R["<évfolyam>-<sorszám>"]. */
function topics(y) {
  var L = [];
  for (var i = 0; R[y + "-" + i]; i++) L.push(R[y + "-" + i]);
  return L;
}

function tgl() {
  var r = document.documentElement;
  var cur = r.dataset.theme || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
  var d = cur === "dark" ? "light" : "dark";
  r.dataset.theme = d;
  try { localStorage.setItem("pyt-th", d); } catch (e) {}
}

/* A tartalom kirakása: cls = "nar" (keskeny, egyoszlopos oldal) vagy üres (széles, oldalsávos elrendezés). */
function setV(html, cls) { var v = $("v"); v.className = cls || ""; v.innerHTML = html; }

/* ---- napi sorozat ---- */
function today(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function yday() { var d = new Date(); d.setDate(d.getDate() - 1); return today(d); }
function streak() { return (S.sd === today() || S.sd === yday()) ? S.st : 0; }
function touch() {
  var t = today();
  if (S.sd === t) return;
  S.st = S.sd === yday() ? S.st + 1 : 1;
  S.sd = t;
  if (S.st > S.best) S.best = S.st;
}

function hdr() {
  $("xp").textContent = "⭐ " + S.xp + " XP";
  $("lv").textContent = "Szint " + (Math.floor(S.xp / 50) + 1);
  var k = streak();
  $("sk").textContent = k ? "🔥 " + k : "";
  $("sk").style.display = k ? "" : "none";
}

/* ---- jelvények ---- */
function cnt(fn) {
  var n = 0;
  for (var k in S.t) {
    var m = /^(\d+-\d+)-(\d+)$/.exec(k);
    if (m && R[m[1]] && R[m[1]].t[m[2]] && fn(R[m[1]].t[m[2]])) n++;
  }
  return n;
}
function gradeDone(y) { var L = topics(y); return L.length > 0 && L.every(function (_, i) { return S.done[y + "-" + i]; }); }
var BADGES = [
  { id: "elso", i: "🌱", n: "Első lépés", d: "Oldd meg az első feladatot.", f: function () { return cnt(function () { return 1; }) >= 1; } },
  { id: "tiz", i: "🔟", n: "Tízes", d: "10 megoldott feladat.", f: function () { return cnt(function () { return 1; }) >= 10; } },
  { id: "szaz", i: "💯", n: "Százas", d: "100 megoldott feladat.", f: function () { return cnt(function () { return 1; }) >= 100; } },
  { id: "tema", i: "✅", n: "Első téma kész", d: "Teljesíts egy témát.", f: function () { return Object.keys(S.done).length >= 1; } },
  { id: "prog", i: "💻", n: "Programozó", d: "Oldj meg egy Programozz! feladatot.", f: function () { return cnt(function (q) { return q.k; }) >= 1; } },
  { id: "kodolo", i: "⌨️", n: "Kódoló", d: "10 megoldott Programozz! feladat.", f: function () { return cnt(function (q) { return q.k; }) >= 10; } },
  { id: "bug", i: "🐞", n: "Hibavadász", d: "Javíts ki 3 hibás programot.", f: function () { return cnt(function (q) { return q.bug; }) >= 3; } },
  { id: "abra", i: "🔀", n: "Ábraolvasó", d: "5 folyamatábrás vagy ábrás feladat.", f: function () { return cnt(function (q) { return q.g; }) >= 5; } },
  { id: "nyom", i: "🔍", n: "Nyomkövető", d: "3 nyomkövetési táblázat kitöltése.", f: function () { return cnt(function (q) { return q.tr; }) >= 3; } },
  { id: "sor", i: "🧩", n: "Sorrendmester", d: "3 sorbarendezős feladat.", f: function () { return cnt(function (q) { return q.pz; }) >= 3; } },
  { id: "ism", i: "🔁", n: "Kitartó", d: "Javíts ki 5 korábban elrontott feladatot az Ismétlőben.", f: function () { return S.rc >= 5; } },
  { id: "pl", i: "🧪", n: "Kísérletező", d: "Próbáld ki a Játszóteret.", f: function () { return S.pl >= 1; } },
  { id: "s3", i: "🔥", n: "3 napos sorozat", d: "Három egymást követő napon tanulj.", f: function () { return S.best >= 3; } },
  { id: "s7", i: "🏔️", n: "Heti sorozat", d: "Hét egymást követő napon tanulj.", f: function () { return S.best >= 7; } },
  { id: "g9", i: "🎓", n: "9. évfolyam kész", d: "Teljesítsd az összes 9. évfolyamos témát.", f: function () { return gradeDone(9); } },
  { id: "g10", i: "🎓", n: "10. évfolyam kész", d: "Teljesítsd az összes 10. évfolyamos témát.", f: function () { return gradeDone(10); } },
  { id: "g11", i: "🏆", n: "11. évfolyam kész", d: "Teljesítsd az összes 11. évfolyamos témát.", f: function () { return gradeDone(11); } },
  { id: "ex1", i: "🎓", n: "Érettségiző", d: "Adj be egy érettségi feladatsort.", f: function () { return exCount() >= 1; } },
  { id: "ex80", i: "📈", n: "Jeles érettségi", d: "Érj el legalább 80%-ot egy érettségi feladatsoron.", f: function () { return exBest(0.8); } },
  { id: "ex100", i: "💎", n: "Hibátlan érettségi", d: "Szerezd meg a teljes pontszámot egy érettségi feladatsoron.", f: function () { return exBest(1); } }
];
/* Az új jelvények megkeresése és kiírása. */
function checkBadges() {
  var nw = BADGES.filter(function (b) { if (S.b[b.id] || !b.f()) return false; S.b[b.id] = today(); return true; });
  if (nw.length) toast("🏅 Új jelvény: " + nw.map(function (b) { return b.i + " " + b.n; }).join(", "));
  return nw;
}
function toast(msg) {
  var t = $("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.className = "show";
  clearTimeout(toast.h);
  toast.h = setTimeout(function () { t.className = ""; setTimeout(function () { if (t.className === "") t.textContent = ""; }, 400); }, 4500);
}

function nav(i) {
  var n = topics(Y).length;
  return '<div class="nv">' +
    (i > 0 ? '<button class="btn" onclick="lesson(' + (i - 1) + ')">← Előző</button>' : "<span></span>") +
    (i < n - 1 ? '<button class="btn" onclick="lesson(' + (i + 1) + ')">Következő →</button>' : "<span></span>") + "</div>";
}

/* ---- leckék ---- */
/* Egy szakasz: [cím, szöveg, kód?, ábra-kulcs?]. A "Megoldás..." című szakasz lenyitható. */
var TRY = [];   /* az aktuális lecke kódpéldái a „Kipróbálom” gombokhoz */
function code(c) {
  var d = dq(c), b = "<pre>" + hl(d) + "</pre>";
  if (runnable(d)) { TRY.push(d); b += '<button class="btn gh try" onclick="rnTry(this,TRY[' + (TRY.length - 1) + '])">▶ Kipróbálom</button><div class="rnbox"></div>'; }
  return b;
}

function sec(s) {
  var b = '<div class="tx">' + dl(s[1]) + "</div>" + (s[2] ? code(s[2]) : "") + (s[3] ? fig(s[3]) : "");
  return /^Megoldás/.test(s[0])
    ? "<details><summary>" + s[0] + " (kattints a megnyitáshoz)</summary>" + b + "</details>"
    : "<h3>" + s[0] + "</h3>" + b;
}

/* ---- keresés ---- */
var IDX = null;
var fold = function (s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
function buildIdx() {
  IDX = [];
  [9, 10, 11].forEach(function (y) {
    topics(y).forEach(function (e, i) {
      IDX.push({ y: y, i: i, n: e.n, fn: fold(e.n), s: e.s.map(function (s) { return { t: s[0], f: fold(s[0] + " " + s[1].replace(/<[^>]*>/g, "") + " " + (s[2] || "")) }; }) });
    });
  });
}
function srch(q) {
  var tl = $("tl"), sr = $("sr"), sd = $("side");
  var T = fold(q).split(/\s+/).filter(Boolean);
  sd.classList.toggle("srch", T.length > 0);
  if (!T.length) { sr.innerHTML = ""; tl.style.display = ""; return; }
  if (!IDX) buildIdx();
  var res = [];
  IDX.forEach(function (e) {
    var tt = T.every(function (w) { return e.fn.indexOf(w) >= 0; });
    var hit = e.s.filter(function (s) { return T.every(function (w) { return s.f.indexOf(w) >= 0 || e.fn.indexOf(w) >= 0; }); });
    if (tt || hit.length) res.push({ e: e, sc: (tt ? 0 : 1), h: hit[0] });
  });
  res.sort(function (a, b) { return a.sc - b.sc; });
  tl.style.display = "none";
  sr.innerHTML = res.length ? '<div class="tgrid">' + res.slice(0, 20).map(function (r) {
    return '<button class="tp" onclick="openL(' + r.e.y + "," + r.e.i + ')"><b>' + r.e.y + '.</b><span>' + esc(r.e.n) + (r.h ? '<br><small class="mut">' + esc(r.h.t) + "</small>" : "") + "</span></button>";
  }).join("") + "</div>" : '<p class="mut">Nincs találat.</p>';
}
function openL(y, i) { Y = y; lesson(i); }

/* ---- témalista ---- */
function mistakes() { return Object.keys(S.w).filter(function (k) { var m = /^(\d+-\d+)-(\d+)$/.exec(k); return m && R[m[1]] && R[m[1]].t[m[2]] && !R[m[1]].t[m[2]].k; }); }

function home() {
  REV = false;
  hdr();
  var L = topics(Y), n = L.filter(function (_, i) { return S.done[Y + "-" + i]; }).length, mk = mistakes().length;
  var nx = -1;
  L.forEach(function (_, i) { if (nx < 0 && !S.done[Y + "-" + i]) nx = i; });
  setV('<div class="layout"><aside class="side" id="side" aria-label="Keresés, évfolyamok és eszközök">' +
    '<input id="sq" class="o sq" type="search" aria-label="Keresés a tananyagban" placeholder="🔎 Keresés a tananyagban…" oninput="srch(this.value)" autocomplete="off">' +
    '<div class="sx"><div class="tabs">' + [9, 10, 11].map(function (y) { return '<button class="' + (y == Y ? "on" : "") + '" aria-pressed="' + (y == Y) + '" onclick="Y=' + y + ';home()">' + y + ". évf.</button>"; }).join("") + "</div>" +
    '<div class="prog"><span>' + Y + ". évfolyam</span><span>" + n + "/" + L.length + " téma kész</span></div>" +
    '<div class="bar"><i style="width:' + n / L.length * 100 + '%"></i></div>' +
    (nx >= 0 ? '<button class="btn go" onclick="lesson(' + nx + ')">▶ ' + (n ? "Folytatás" : "Kezdés") + ": " + (nx + 1) + ". " + L[nx].n + "</button>" : "") +
    '<div class="tools"><button class="btn gh" onclick="play()">🧪 Játszótér</button><button class="btn gh" onclick="awards()">🏅 Eredmények</button><button class="btn gh" onclick="exams()">🎓 Érettségi mód</button>' + offBtn() +
    (mk ? '<button class="btn gh" onclick="review()">🔁 Ismétlő (' + mk + ")</button>" : "") + "</div></div></aside>" +
    '<div class="mn"><h2 class="mh">' + Y + ". évfolyam</h2>" + '<div id="sr"></div><div id="tl"><div class="tgrid col" style="--rows:' + Math.ceil(L.length / 2) + '">' +
    L.map(function (e, i) { var d = S.done[Y + "-" + i]; return '<button class="tp' + (d ? " d" : "") + '" onclick="lesson(' + i + ')"><b aria-hidden="true">' + (d ? "✓" : i + 1) + "</b>" + (d ? '<span class="sr">Kész: </span>' : "") + "<span>" + e.n + "</span></button>"; }).join("") + "</div></div></div></div>");
}

/* ---- feladatok ---- */
var fid = function (p, j) { return p + "-" + j; };

/* Kódolós / hibakereső feladat: szerkesztő + tesztek. */
function codeTask(q, p, j) {
  var t0 = q.ts[0];
  return (t0[0] !== "" ? "<p><b>Példa bemenet</b></p><pre>" + esc(t0[0]) + "</pre>" : "") +
    "<p><b>Példa kimenet</b></p><pre>" + esc(t0[1]) + "</pre>" +
    rnHtml(q.st, { task: [p, j], tests: q.ts, check: true, file: true, input: /input\(/.test(q.st) || t0[0] !== "", sin: t0[0] }) +
    (q.m ? "<details><summary>Mintamegoldás (előbb próbálkozz magad!)</summary><pre>" + hl(dq(q.m)) + "</pre></details>" : "");
}

/* Sorbarendezős (Parsons) feladat: a sorok össze vannak keverve, ▲▼ gombokkal rendezheted őket. */
function parsonsHtml(q, p, j) {
  var L = q.pz.map(function (s, i) { return { s: s, i: i }; }), tries = 0;
  do {
    for (var a = L.length - 1; a > 0; a--) { var b = Math.floor(Math.random() * (a + 1)), x = L[a]; L[a] = L[b]; L[b] = x; }
  } while (L.every(function (o, i) { return o.s === q.pz[i]; }) && ++tries < 20);
  return '<ol class="pz" id="pz_' + fid(p, j) + '">' + L.map(function (o) {
    return '<li><span class="pl">' + hl(dq(o.s)) + '</span><span class="pb"><button onclick="pzMove(this,-1)" aria-label="Feljebb: ' + esc(dq(o.s).trim()) + '">▲</button><button onclick="pzMove(this,1)" aria-label="Lejjebb: ' + esc(dq(o.s).trim()) + '">▼</button></span></li>';
  }).join("") + '</ol><button class="btn" onclick="pzCheck(\'' + p + "'," + j + ')">Ellenőrzés</button>';
}
function pzMove(b, d) {
  var li = b.closest("li"), o = li.parentNode;
  if (d < 0 && li.previousElementSibling) o.insertBefore(li, li.previousElementSibling);
  else if (d > 0 && li.nextElementSibling) o.insertBefore(li.nextElementSibling, li);
  var fb = $("f_" + o.id.slice(3));
  if (fb) fb.textContent = "A sor most a(z) " + (Array.prototype.indexOf.call(o.children, li) + 1) + ". helyen áll a(z) " + o.children.length + " közül.";
}
function pzCheck(p, j) {
  var q = R[p].t[j], box = $("f_" + fid(p, j));
  var tx = [].map.call($("pz_" + fid(p, j)).querySelectorAll(".pl"), function (e) { return e.textContent; });
  var good = tx.filter(function (t, i) { return t === q.pz[i]; }).length;
  if (good === tx.length) return rok(p, j);
  /* más, de szintén helyes sorrend? (a tesztek eldöntik) */
  if (q.ts) {
    box.textContent = "Tesztelés…";
    var T = q.ts, k = 0, code = tx.join("\n");
    (function next() {
      if (k >= T.length) return rok(p, j);
      pyRun(code, T[k][0], T[k][3]).then(function (x) {
        if (!x.err && rnNorm(x.out) === rnNorm(T[k][1])) { k++; next(); } else pzBad(p, j, good, tx.length);
      }).catch(function () { pzBad(p, j, good, tx.length); });
    })();
  } else pzBad(p, j, good, tx.length);
}
function pzBad(p, j, good, n) {
  bad(p, j);
  $("f_" + fid(p, j)).textContent = "Még nem jó a sorrend (" + good + " sor van a helyén a(z) " + n + "-ból). Gondold végig, mi az, ami előbb kell, hogy létezzen!";
}

/* Nyomkövetési táblázat: a rejtett cellákat kell kitölteni. */
function traceHtml(q, p, j) {
  var T = q.tr, hid = {};
  T.hid.forEach(function (h) { hid[h[0] + "," + h[1]] = 1; });
  return '<div class="tw"><table class="trt"><tr><th>' + esc(T.h || "") + "</th>" + T.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>" +
    T.rows.map(function (r, ri) {
      return "<tr><th>" + (ri + 1) + ".</th>" + r.map(function (v, ci) {
        return hid[ri + "," + ci] ? '<td><input class="tc" data-r="' + ri + '" data-c="' + ci + '" aria-label="' + esc(T.cols[ci]) + ", " + (ri + 1) + '. lépés" autocomplete="off" autocapitalize="off" spellcheck="false"></td>' : "<td>" + esc(v) + "</td>";
      }).join("") + "</tr>";
    }).join("") + '</table></div><button class="btn" onclick="trCheck(\'' + p + "'," + j + ')">Ellenőrzés</button>';
}
function trCheck(p, j) {
  var q = R[p].t[j], T = q.tr, nz = function (x) { return String(x).replace(/\s+/g, "").toLowerCase().replace(/'/g, '"'); };
  var tb = $("f_" + fid(p, j)).parentNode, wrong = 0, empty = 0;
  tb.querySelectorAll("input.tc").forEach(function (inp) {
    var ok = nz(inp.value) === nz(T.rows[+inp.dataset.r][+inp.dataset.c]);
    if (inp.value.trim() === "") empty++;
    inp.classList.toggle("ok", ok); inp.classList.toggle("no", !ok);
    if (!ok) wrong++;
  });
  if (!wrong) return rok(p, j);
  bad(p, j);
  $("f_" + fid(p, j)).innerHTML = wrong + " cella nem jó" + (empty ? " (ebből " + empty + " üres)" : "") + ". " + (q.h || "Kövesd végig a programot lépésenként!");
}

/* Válaszlehetőség szövege: ha a szerző HTML-t írt bele (<code>, &lt; ...), azt megjelenítjük, különben szövegként kezeljük. */
function optHtml(o) {
  o = dq(o);
  return /<\/?(code|b|i|em|strong)>|&(lt|gt|amp);/.test(o) ? o : esc(o);
}

/* Egy feladat HTML-je (j az eredeti sorszám a lecke feladattömbjében; n a kijelzett sorszám). */
function taskHtml(q, p, j, n) {
  var body;
  if (q.k) body = codeTask(q, p, j);
  else if (q.pz) body = parsonsHtml(q, p, j);
  else if (q.tr) body = traceHtml(q, p, j);
  else if (q.o) body = q.o.map(function (o, k) {
    return '<button class="o' + (q.oc ? " oc" : "") + '" onclick="rans(\'' + p + "'," + j + "," + k + ',this)">' + (q.oc ? '<span class="pl">' + hl(dq(o)) + "</span>" : optHtml(o)) + "</button>";
  }).join("");
  else body = '<input id="in_' + fid(p, j) + '" class="o" placeholder="Írd be a választ"><button class="btn" onclick="rin(\'' + p + "'," + j + ')">Ellenőrzés</button>';
  return '<div style="margin-bottom:20px"><p><b>' + n + ". " + (q.bug ? "🐞 " : q.pz ? "🧩 " : q.tr ? "🔍 " : "") + q.q + "</b></p>" +
    (q.g ? '<div class="task-fig">' + fig(q.g) + "</div>" : "") +
    (q.c ? "<pre>" + hl(dq(q.c)) + "</pre>" : "") + body +
    '<div class="fb" id="f_' + fid(p, j) + '" aria-live="polite"></div></div>';
}

function lesson(i) {
  REV = false;
  scrollTo(0, 0);
  TRY = [];
  var p = Y + "-" + i, e = R[p], A = "", B = "", a = 0, b = 0;
  e.t.forEach(function (q, j) { if (q.k) B += taskHtml(q, p, j, ++b); else A += taskHtml(q, p, j, ++a); });
  var toc = '<nav class="side toc" aria-label="' + Y + '. évfolyam témái"><div class="tochd"><b>' + Y + '. évfolyam</b><button class="back" onclick="home()">← Összes téma</button></div>' +
    '<div class="tocl" tabindex="0" role="region" aria-label="Témák listája">' + topics(Y).map(function (t, k) {
      return '<button class="ti' + (k === i ? " on" : "") + (S.done[Y + "-" + k] ? " d" : "") + '"' + (k === i ? ' aria-current="page"' : "") + ' onclick="lesson(' + k + ')"><b aria-hidden="true">' + (S.done[Y + "-" + k] ? "✓" : k + 1) + "</b>" + (S.done[Y + "-" + k] ? '<span class="sr">Kész: </span>' : "") + "<span>" + t.n + "</span></button>";
    }).join("") + "</div></nav>";
  setV('<div class="layout">' + toc + '<div class="mn">' + nav(i) +
    '<div class="card"><h2 style="margin-top:0">' + e.n + "</h2>" + e.s.map(sec).join("") + "</div>" +
    '<div class="card"><h3 style="margin-top:0">Gyakorló feladatok</h3>' + A + '<div id="fb" aria-live="polite"></div></div>' +
    (B ? '<div class="card"><h3 style="margin-top:0">💻 Programozz!</h3><div class="tx"><p>Írd meg a programot a szerkesztőben, és az <b>Ellenőrzés</b> gomb több tesztadattal is kipróbálja. ' + (e.t.some(function (q) { return q.bug; }) ? 'A 🐞 jelű feladatokban egy hibás programot kell kijavítanod. ' : '') + 'Ezek a feladatok nem kötelezők a téma teljesítéséhez, de mindegyik 15 XP-t ér. Ha elakadsz, a <b>🔍 Lépésenként</b> gomb megmutatja, mit csinál a program. Saját gépen írt <code>.py</code> fájlt is betölthetsz.</p></div>' + B + "</div>" : "") + nav(i) + "</div></div>");
  rnInit();
}

/* ---- ismétlő: a korábban elrontott feladatok ---- */
function review() {
  REV = true;
  scrollTo(0, 0);
  var K = mistakes().slice(0, 8);
  var h = '<div class="card"><h2 style="margin-top:0">🔁 Ismétlő</h2><div class="tx"><p>Ezeket a feladatokat korábban elrontottad legalább egyszer. Ha most hibátlanul megoldod, kikerülnek a listából, és 5 XP-t kapsz.</p></div>';
  if (!K.length) h += '<p>🎉 Nincs több ismételnivaló feladat!</p><button class="btn" onclick="home()">Vissza a témákhoz</button>';
  else K.forEach(function (k, n) {
    var m = /^(\d+-\d+)-(\d+)$/.exec(k), e = R[m[1]];
    h += '<p class="mut"><small>' + esc(e.n) + "</small></p>" + taskHtml(e.t[m[2]], m[1], +m[2], n + 1);
  });
  setV(h + "</div>", "nar");
}

/* ---- eredmények ---- */
function awards() {
  REV = false;
  scrollTo(0, 0);
  var solved = cnt(function () { return 1; }), total = 0;
  [9, 10, 11].forEach(function (y) { topics(y).forEach(function (e) { total += e.t.length; }); });
  var n = BADGES.filter(function (b) { return S.b[b.id]; }).length;
  setV('<div class="card"><h2 style="margin-top:0">🏅 Eredmények</h2><div class="stats">' +
    '<div><b>' + S.xp + '</b><span>XP</span></div><div><b>' + (Math.floor(S.xp / 50) + 1) + '</b><span>szint</span></div>' +
    '<div><b>' + streak() + '</b><span>napos sorozat</span></div><div><b>' + S.best + '</b><span>leghosszabb sorozat</span></div>' +
    '<div><b>' + solved + "/" + total + '</b><span>megoldott feladat</span></div><div><b>' + Object.keys(S.done).length + '</b><span>kész téma</span></div></div>' +
    '<h3>Jelvények (' + n + "/" + BADGES.length + ')</h3><div class="bdg">' +
    BADGES.map(function (b) { return '<div class="' + (S.b[b.id] ? "got" : "") + '"><i>' + b.i + "</i><b>" + b.n + "</b><span>" + b.d + (S.b[b.id] ? " <em>(" + S.b[b.id] + ")</em>" : "") + "</span></div>"; }).join("") +
    '</div>' + exSummary() + '<button class="btn" onclick="home()">Vissza a témákhoz</button></div>', "nar");
}

/* ---- játszótér ---- */
function play() {
  REV = false;
  scrollTo(0, 0);
  S.pl = 1; checkBadges(); save();
  setV('<div class="card"><h2 style="margin-top:0">🧪 Játszótér</h2><div class="tx"><p>Itt bármilyen Python-programot kipróbálhatsz. Ha az <code>input()</code> kér adatot, írd a <b>Bemenet</b> mezőbe, soronként egy értéket. A <b>🔍 Lépésenként</b> gombbal végigkövetheted, mit csinál a program. A saját gépen írt <code>.py</code> fájlt is betöltheted.</p></div>' +
    rnHtml('nev = input("Hogy hívnak? ")\nprint("Szia, " + nev + "!")', { file: true, sin: "Bence" }) + "</div>", "nar");
  rnInit();
}

/* ---- válaszok ---- */
function bad(p, j) { var k = fid(p, j); S.w[k] = (S.w[k] || 0) + 1; save(); }

/* Helyes válasz: XP, sorozat, jelvények, téma kész-e. */
function rok(p, j) {
  var e = R[p], q = e.t[j], k = fid(p, j), m = "Helyes! 🎉";
  if (!S.t[k]) { S.t[k] = 1; var x = q.k ? 15 : 10; S.xp += x; m += " +" + x + " XP"; }
  if (REV && S.w[k]) { delete S.w[k]; S.xp += 5; S.rc++; m += " +5 XP (ismétlés)"; }
  touch();
  /* a kódolós feladatok nem kötelezők a téma teljesítéséhez */
  if (e.t.every(function (t, x) { return t.k || S.t[fid(p, x)]; })) S.done[p] = 1;
  checkBadges();
  save(); hdr();
  var box = $("f_" + k);
  if (box) {
    if (q.k) box.textContent = m;
    else box.innerHTML = m + (q.e ? '<br><span style="font-weight:400">' + q.e + "</span>" : "");
  }
  if (S.done[p] && $("fb")) $("fb").innerHTML = '🏆 A téma kész! <button class="btn" onclick="home()">Vissza a témákhoz</button>';
}

function rans(p, j, k, b) {
  if (k !== R[p].t[j].a) { b.classList.add("bad"); b.disabled = true; bad(p, j); $("f_" + fid(p, j)).textContent = "Nem egészen, gondold át újra!"; return; }
  b.classList.add("ok");
  b.parentNode.querySelectorAll(".o").forEach(function (x) { x.disabled = true; });
  rok(p, j);
}

/* Beírt válasz: kis-nagybetű és a szóközök száma nem számít. */
function rin(p, j) {
  var nz = function (x) { return x.trim().toLowerCase().replace(/\s+/g, " "); };
  var q = R[p].t[j], v = nz($("in_" + fid(p, j)).value);
  if (q.i.some(function (a) { return nz(a) === v; })) rok(p, j);
  else { bad(p, j); $("f_" + fid(p, j)).innerHTML = "Még nem az. " + (q.h || "Nézd át újra a példát!"); }
}

/* ---- az oldalváltás után: oldalcím, fókusz a tartalomra (képernyőolvasóhoz, billentyűzethez); görgethető kódblokkok elérhetősége ---- */
function fixScroll() {
  Array.prototype.forEach.call(document.querySelectorAll("#v pre:not(.hlp)"), function (p) {
    if (p.scrollWidth > p.clientWidth + 1 || p.scrollHeight > p.clientHeight + 1) { if (!p.hasAttribute("tabindex")) p.tabIndex = 0; }
  });
}
(function () {
  var v = $("v"), first = true, h = 0;
  new MutationObserver(function () {
    var t = v.querySelector("h2");
    document.title = (t ? t.textContent.replace(/^[^\p{L}\p{N}]+/u, "") + " – " : "") + "PyTanuló";
    if (first) first = false; else v.focus({ preventScroll: true });
    clearTimeout(h); h = setTimeout(fixScroll, 60);
  }).observe(v, { childList: true });
  new MutationObserver(function () { clearTimeout(h); h = setTimeout(fixScroll, 60); }).observe(v, { childList: true, subtree: true });
  addEventListener("resize", function () { clearTimeout(h); h = setTimeout(fixScroll, 150); });
})();

/* ---- offline használat (service worker + a Pyodide gyorsítótárazása) ---- */
var CANSW = "serviceWorker" in navigator && /^https?:$/.test(location.protocol);
function offBtn() {
  if (!CANSW) return "";
  var on = false;
  try { on = localStorage.getItem("pyt-off") === "1"; } catch (e) {}
  return '<button class="btn gh" id="offb" onclick="offlinePrep()"' + (on ? " disabled" : "") + ">" + (on ? "✓ Offline is használható" : "📥 Offline használat") + "</button>";
}
function offlinePrep() {
  var b = $("offb");
  if (!b) return;
  b.disabled = true; b.textContent = "Letöltés… (kb. 10 MB)";
  var fail = function (m) { b.disabled = false; b.textContent = "📥 Offline használat"; toast(m); };
  navigator.serviceWorker.ready.then(function () {
    if (!navigator.serviceWorker.controller) return fail("Frissítsd az oldalt, és próbáld újra.");
    return pyLoad().then(function () {
      try { localStorage.setItem("pyt-off", "1"); } catch (e) {}
      b.textContent = "✓ Offline is használható";
      toast("Kész: az oldal és a Python internet nélkül is működik.");
    });
  }).catch(function () { fail("Nem sikerült letölteni. Internetkapcsolat kell hozzá."); });
}
if (CANSW) navigator.serviceWorker.register("sw.js").catch(function () {});

home();
