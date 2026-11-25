/*
 * Folyamatábrák (SVG), JavaScriptből előállítva.
 * Miért nem külön .svg fájlok? Az inline SVG a lap CSS-változóit használja,
 * ezért követi a világos / sötét témát és a kézi témaváltót is.
 *
 * Használat: fig("kulcs") visszaadja a kész <figure> HTML-t.
 * Új ábra: vegyél fel egy kulcsot az FCD objektumba az fcBuild() segítségével.
 */
var FC_N = 0;

function fcBuild(H, alt, draw) {
  var id = "fcah" + (++FC_N), el = [];
  var q = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var n1 = function (n) { return Math.round(n * 10) / 10; };

  function txt(x, y, s, cls, anchor) {
    var L = String(s).split("\n"), n = L.length;
    var out = '<text x="' + x + '" y="' + y + '" class="' + (cls || "ft") + '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">";
    for (var i = 0; i < n; i++) {
      out += '<tspan x="' + x + '" dy="' + n1(i === 0 ? -(n - 1) * 0.55 + 0.35 : 1.1) + 'em">' + q(L[i]) + "</tspan>";
    }
    return out + "</text>";
  }
  function anch(x, y, w, h, k) {
    k = k || 0;
    return { t: [x, y - h / 2], b: [x, y + h / 2], l: [x - w / 2 + k / 2, y], r: [x + w / 2 - k / 2, y] };
  }

  var f = {
    /* kezdés / befejezés */
    term: function (x, y, s, w) {
      w = w || 110;
      el.push('<rect class="sh tm" x="' + (x - w / 2) + '" y="' + (y - 17) + '" width="' + w + '" height="34" rx="17"/>' + txt(x, y, s, "ft tw"));
      return anch(x, y, w, 34);
    },
    /* tevékenység */
    proc: function (x, y, s, w, h) {
      w = w || 190; h = h || 36;
      el.push('<rect class="sh" x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="4"/>' + txt(x, y, s));
      return anch(x, y, w, h);
    },
    /* adatbevitel, kiírás (paralelogramma) */
    io: function (x, y, s, w, h) {
      w = w || 180; h = h || 36;
      var k = 12, a = x - w / 2, b = x + w / 2, t = y - h / 2, d = y + h / 2;
      el.push('<polygon class="sh io" points="' + [a + k, t, b, t, b - k, d, a, d].join(",") + '"/>' + txt(x, y, s));
      return anch(x, y, w, h, k);
    },
    /* elágazás (rombusz) */
    dec: function (x, y, s, w, h) {
      w = w || 190; h = h || 72;
      el.push('<polygon class="sh dc" points="' + [x, y - h / 2, x + w / 2, y, x, y + h / 2, x - w / 2, y].join(",") + '"/>' + txt(x, y, s, "ft dt"));
      return anch(x, y, w, h);
    },
    /* nyíl (pontsor); head === false esetén nincs nyílhegy */
    arr: function (pts, head) {
      var d = "M" + pts.map(function (p) { return p[0] + " " + p[1]; }).join(" L");
      el.push('<path class="ar" d="' + d + '"' + (head === false ? "" : ' marker-end="url(#' + id + ')"') + "/>");
    },
    /* igen / nem felirat */
    lab: function (x, y, s) { el.push(txt(x, y, s, "ft lb", "middle")); },
    /* magyarázó szöveg */
    text: function (x, y, s) { el.push(txt(x, y, s, "ft st", "start")); },
    /* igen / nem felirat függőleges nyíl mellett (a nyíltól jobbra) */
    labv: function (x, y, s) { el.push(txt(x - 6, y, s, "ft lb st", "start")); },
    /* cella / doboz (cls: hl, hl2, hl3 = kiemelés; tcls: mn = kódbetű, mu = halvány) */
    box: function (x, y, w, h, s, cls, tcls) {
      el.push('<rect class="sh cl ' + (cls || "") + '" x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="4"/>' + (s === "" ? "" : txt(x, y, s, "ft " + (tcls || ""))));
      return anch(x, y, w, h);
    },
    /* kör, benne szöveggel */
    circ: function (x, y, r, s, cls) {
      el.push('<circle class="sh cl ' + (cls || "") + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>' + (s === "" || s == null ? "" : txt(x, y, s, "ft sm")));
    },
    /* szabad szöveg, középre igazítva (cls: sm, mu, bd, mn) */
    t: function (x, y, s, cls) { el.push(txt(x, y, s, "ft " + (cls || ""))); },
    /* vonal nyílhegy nélkül */
    ln: function (x1, y1, x2, y2, cls) { el.push('<line class="ar ' + (cls || "") + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>'); }
  };

  draw(f);
  return '<svg class="fcsvg" viewBox="0 0 360 ' + H + '" role="img" aria-label="' + q(alt) + '">' +
    '<defs><marker id="' + id + '" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" class="ahd"/></marker></defs>' +
    el.join("") + "</svg>";
}

/* ---- közös szerkezetek ---- */

/* START → Be → elágazás → két kimenet → STOP */
function fcIfElse(inT, cond, yesT, noT, alt) {
  return fcBuild(362, alt, function (f) {
    var s = f.term(180, 24, "START");
    var a = f.io(180, 84, inT, 200);
    var d = f.dec(180, 170, cond, 190, 74);
    var y = f.io(292, 250, yesT, 116);
    var n = f.io(68, 250, noT, 116);
    var e = f.term(180, 336, "STOP");
    f.arr([s.b, a.t]); f.arr([a.b, d.t]);
    f.arr([d.r, [292, 170], y.t]); f.arr([d.l, [68, 170], n.t]);
    f.lab(281, 160, "igen"); f.lab(79, 160, "nem");
    f.arr([y.b, [292, 300], [180, 300]], false);
    f.arr([n.b, [68, 300], [180, 300]], false);
    f.arr([[180, 300], e.t]);
  });
}

/* ciklus egy listán: kezdőérték, ciklus, (feltétel), kiírás */
function fcListLoop(init, step, cond, act, out, alt) {
  var H = cond ? 484 : 372;
  return fcBuild(H, alt, function (f) {
    var s = f.term(150, 24, "START");
    var p1 = f.proc(150, 80, init, 200);
    var d1 = f.dec(150, 162, "Van még elem?", 190, 72);
    var p2 = f.proc(150, 246, step, 190);
    var o = f.io(306, 238, out, 96, out.indexOf("\n") >= 0 ? 44 : 36);
    var e = f.term(306, 306, "STOP", 90);
    f.arr([s.b, p1.t]); f.arr([p1.b, d1.t]);
    f.arr([d1.b, p2.t]); f.labv(163, 214, "igen");
    f.arr([d1.r, [306, 162], o.t]); f.lab(268, 152, "nem");
    f.arr([o.b, e.t]);
    if (cond) {
      var d2 = f.dec(150, 334, cond, 190, 80);
      var p3 = f.proc(150, 432, act, 200);
      f.arr([p2.b, d2.t]);
      f.arr([d2.b, p3.t]); f.labv(163, 394, "igen");
      f.arr([p3.l, [14, 432], [14, 162], d1.l]);
      f.arr([d2.l, [14, 334]], false); f.lab(35, 324, "nem");
    } else {
      var p3b = f.proc(150, 302, act, 190);
      f.arr([p2.b, p3b.t]);
      f.arr([p3b.l, [14, 302], [14, 162], d1.l]);
    }
  });
}

/* while + index: eldöntés, keresés, kiválasztás */
function fcWhileIndex(mode, alt) {
  var withEnd = mode !== "kivalasztas";
  return fcBuild(withEnd ? 492 : 372, alt, function (f) {
    var s = f.term(130, 24, "START");
    var p1 = f.proc(130, 84, "index = 0", 170);
    var d1 = f.dec(130, 172, withEnd ? "index < len(l) és\nnem megfelelő elem?" : "nem megfelelő\nelem?", 204, 84);
    var p2 = f.proc(316, 172, "index =\nindex + 1", 80, 44);
    f.arr([s.b, p1.t]); f.arr([p1.b, d1.t]);
    f.arr([d1.r, p2.l]); f.lab(254, 161, "igen");
    f.arr([p2.t, [316, 120], [130, 120]]);
    if (withEnd) {
      var d2 = f.dec(130, 296, "index < len(l) ?", 190, 70);
      var yes = f.proc(316, 296, mode === "eldontes" ? "Ki: van\nilyen elem" : "Ki: index", 80, 44);
      var no = f.proc(130, 396, "Ki: nincs\nilyen elem", 140, 44);
      var e = f.term(130, 462, "STOP");
      f.arr([d1.b, d2.t]); f.labv(144, 236, "nem");
      f.arr([d2.r, yes.l]); f.lab(252, 286, "igen");
      f.arr([d2.b, no.t]); f.labv(144, 348, "nem");
      f.arr([no.b, e.t]);
      f.arr([yes.b, [316, 429], [130, 429]], false);
    } else {
      var o = f.io(130, 282, "Ki: index", 150);
      var e2 = f.term(130, 340, "STOP");
      f.arr([d1.b, o.t]); f.labv(144, 236, "nem");
      f.arr([o.b, e2.t]);
    }
  });
}

/* ---- az ábrák ---- */
var FCD = {};

FCD.jelek = function () {
  return fcBuild(304, "A folyamatábra jelei: kezdés és befejezés, adatbevitel és kiírás, tevékenység, elágazás, nyíl", function (f) {
    f.term(70, 32, "START", 110); f.text(150, 32, "Kezdés és befejezés");
    f.io(70, 92, "Be / Ki", 110, 38); f.text(150, 92, "Adatbevitel, kiírás");
    f.proc(70, 152, "tevékenység", 110, 38); f.text(150, 152, "Tevékenység, számolás");
    f.dec(70, 212, "feltétel?", 110, 54); f.text(150, 212, "Elágazás: igen / nem");
    f.arr([[40, 272], [100, 272]]); f.text(150, 272, "A lépések sorrendje");
  });
};

FCD.nagyobb = function () {
  return fcIfElse("Be: a, b", "a > b ?", "Ki: a", "Ki: b", "Folyamatábra: két szám közül a nagyobbat írja ki");
};

FCD.paros = function () {
  return fcIfElse("Be: szam", "szam % 2 == 0 ?", "Ki: páros", "Ki: páratlan", "Folyamatábra: páros vagy páratlan számot ír ki");
};

FCD.tea = function () {
  return fcBuild(470, "Folyamatábra: teafőzés, a víz forrásáig várakozó ciklussal", function (f) {
    var s = f.term(140, 24, "START");
    var p1 = f.proc(140, 84, "Víz a vízforralóba,\nbekapcsoljuk", 200, 44);
    var d = f.dec(140, 170, "Forr a víz?", 170, 70);
    var w = f.proc(306, 170, "Várunk\n10 másodpercet", 104, 44);
    var p3 = f.proc(140, 252, "Filtert a bögrébe,\nfelöntjük", 200, 44);
    var p4 = f.proc(140, 318, "Várunk 3 percet", 200, 40);
    var p5 = f.proc(140, 380, "Kivesszük a filtert", 200, 40);
    var e = f.term(140, 442, "STOP");
    f.arr([s.b, p1.t]); f.arr([p1.b, d.t]);
    f.arr([d.b, p3.t]); f.labv(152, 217, "igen");
    f.arr([d.r, w.l]); f.lab(238, 158, "nem");
    f.arr([w.t, [306, 116], [140, 116]]);
    f.arr([p3.b, p4.t]); f.arr([p4.b, p5.t]); f.arr([p5.b, e.t]);
  });
};

FCD.jegy = function () {
  return fcBuild(566, "Folyamatábra: a pontszámból jegyet számol többágú elágazással", function (f) {
    var s = f.term(130, 24, "START");
    var a = f.io(130, 80, "Be: pont", 160);
    var d1 = f.dec(130, 160, "pont >= 90 ?", 190, 66);
    var d2 = f.dec(130, 250, "pont >= 75 ?", 190, 66);
    var d3 = f.dec(130, 340, "pont >= 60 ?", 190, 66);
    var j5 = f.proc(300, 160, "jegy = 5", 90, 34);
    var j4 = f.proc(300, 250, "jegy = 4", 90, 34);
    var j3 = f.proc(300, 340, "jegy = 3", 90, 34);
    var j2 = f.proc(130, 420, "jegy = 2", 110, 34);
    var o = f.io(130, 486, "Ki: jegy", 140);
    var e = f.term(130, 540, "STOP");
    f.arr([s.b, a.t]); f.arr([a.b, d1.t]);
    f.arr([d1.b, d2.t]); f.labv(144, 206, "nem");
    f.arr([d2.b, d3.t]); f.labv(144, 296, "nem");
    f.arr([d3.b, j2.t]); f.labv(144, 389, "nem");
    f.arr([d1.r, j5.l]); f.lab(238, 150, "igen");
    f.arr([d2.r, j4.l]); f.lab(238, 240, "igen");
    f.arr([d3.r, j3.l]); f.lab(238, 330, "igen");
    f.arr([j2.b, o.t]);
    f.arr([[345, 160], [352, 160]], false);
    f.arr([[345, 250], [352, 250]], false);
    f.arr([[345, 340], [352, 340]], false);
    f.arr([[352, 160], [352, 486], o.r]);
    f.arr([o.b, e.t]);
  });
};

FCD.for_osszeg = function () {
  return fcBuild(430, "Folyamatábra: az 1-től n-ig terjedő számok összege számlálós ciklussal", function (f) {
    var s = f.term(150, 24, "START");
    var a = f.io(150, 80, "Be: n", 160);
    var p1 = f.proc(150, 134, "osszeg = 0", 170);
    var p2 = f.proc(150, 184, "i = 1", 170);
    var d = f.dec(150, 262, "i <= n ?", 180, 70);
    var p3 = f.proc(150, 346, "osszeg = osszeg + i", 180);
    var p4 = f.proc(150, 398, "i = i + 1", 170);
    var o = f.io(302, 336, "Ki: osszeg", 100);
    var e = f.term(302, 396, "STOP", 90);
    f.arr([s.b, a.t]); f.arr([a.b, p1.t]); f.arr([p1.b, p2.t]); f.arr([p2.b, d.t]);
    f.arr([d.b, p3.t]); f.labv(163, 314, "igen");
    f.arr([p3.b, p4.t]);
    f.arr([p4.l, [16, 398], [16, 262], d.l]);
    f.arr([d.r, [302, 262], o.t]); f.lab(262, 252, "nem");
    f.arr([o.b, e.t]);
  });
};

FCD.while_hiba = function () {
  return fcBuild(360, "Folyamatábra: addig kér új számot, amíg pozitívat nem kap", function (f) {
    var s = f.term(150, 24, "START");
    var a = f.io(150, 84, "Be: szam", 200);
    var d = f.dec(150, 176, "szam <= 0 ?", 170, 76);
    var e1 = f.proc(315, 176, "Ki:\nHibás adat!", 90, 44);
    var ok = f.proc(150, 276, "Ki: Rendben!", 150);
    var e = f.term(150, 336, "STOP");
    f.arr([s.b, a.t]); f.arr([a.b, d.t]);
    f.arr([d.r, e1.l]); f.lab(252, 166, "igen");
    f.arr([e1.t, [315, 84], a.r]);
    f.arr([d.b, ok.t]); f.labv(164, 232, "nem");
    f.arr([ok.b, e.t]);
  });
};

FCD.osszegzes = function () {
  return fcListLoop("osszeg = 0", "elem = következő elem", null, "osszeg = osszeg + elem", "Ki: osszeg", "Folyamatábra: az összegzés tétele");
};

FCD.megszamlalas = function () {
  return fcListLoop("db = 0", "elem = következő elem", "elem megfelel\na feltételnek?", "db = db + 1", "Ki: db", "Folyamatábra: a megszámlálás tétele");
};

FCD.maximum = function () {
  return fcListLoop("legnagyobb = l[0]", "elem = következő elem", "elem >\nlegnagyobb ?", "legnagyobb = elem", "Ki:\nlegnagyobb", "Folyamatábra: a maximum kiválasztása");
};

FCD.eldontes = function () { return fcWhileIndex("eldontes", "Folyamatábra: az eldöntés tétele while ciklussal"); };
FCD.kereses = function () { return fcWhileIndex("kereses", "Folyamatábra: a keresés tétele while ciklussal"); };
FCD.kivalasztas = function () { return fcWhileIndex("kivalasztas", "Folyamatábra: a kiválasztás tétele while ciklussal"); };

FCD.valaszto = function () {
  return fcBuild(630, "Döntési folyamatábra: melyik programozási tételt válaszd a feladat kérdése alapján", function (f) {
    var s = f.term(105, 24, "Feladat");
    var qs = ["Az elemek összegét\nkérik?", "Hány elem felel meg\negy feltételnek?", "A legnagyobb vagy\nlegkisebb elem kell?", "Csak azt kérik,\nvan-e ilyen elem?", "Biztosan van\nilyen elem?"];
    var rs = ["összegzés", "megszámlálás", "szélsőérték", "eldöntés", "kiválasztás"];
    var d = [], r = [];
    for (var i = 0; i < 5; i++) {
      var y = 104 + i * 100;
      d.push(f.dec(105, y, qs[i], 190, 70));
      r.push(f.proc(300, y, rs[i], 104, 34));
    }
    var k = f.proc(105, 604, "keresés", 104, 34);
    f.arr([s.b, d[0].t]);
    for (i = 0; i < 5; i++) {
      f.arr([d[i].r, r[i].l]); f.lab(224, d[i].r[1] - 9, "igen");
      if (i < 4) { f.arr([d[i].b, d[i + 1].t]); f.labv(120, d[i].b[1] + 15, "nem"); }
    }
    f.arr([d[4].b, k.t]); f.labv(120, d[4].b[1] + 14, "nem");
  });
};

FCD.exam = function () {
  return fcBuild(580, "Folyamatábra: egy érettségi programozási feladat megoldásának lépései", function (f) {
    var s = f.term(140, 24, "START");
    var p1 = f.proc(140, 80, "Feladat elolvasása", 200);
    var p2 = f.proc(140, 134, "Adatok tárolása\n(változók, listák)", 200, 44);
    var d1 = f.dec(140, 226, "Van még\nrészfeladat?", 170, 76);
    var fin = f.proc(310, 226, "Végső\nellenőrzés\na mintával", 100, 52);
    var e = f.term(310, 300, "STOP", 90);
    var p3 = f.proc(140, 314, "Tétel kiválasztása", 200);
    var p4 = f.proc(140, 368, "Kód megírása", 200);
    var p5 = f.proc(140, 422, "Kipróbálás", 200);
    var d2 = f.dec(140, 506, "Jó a kimenet?", 170, 70);
    var bad = f.proc(312, 506, "Hibakeresés,\njavítás", 90, 44);
    f.arr([s.b, p1.t]); f.arr([p1.b, p2.t]); f.arr([p2.b, d1.t]);
    f.arr([d1.r, fin.l]); f.lab(237, 215, "nem");
    f.arr([fin.b, e.t]);
    f.arr([d1.b, p3.t]); f.labv(153, 282, "igen");
    f.arr([p3.b, p4.t]); f.arr([p4.b, p5.t]); f.arr([p5.b, d2.t]);
    f.arr([d2.l, [14, 506], [14, 226], d1.l]); f.lab(30, 497, "igen");
    f.arr([d2.r, bad.l]); f.lab(240, 495, "nem");
    f.arr([bad.t, [312, 422], p5.r]);
  });
};

/* ---- szemléltető ábrák (nem folyamatábrák) ---- */

/* cellák: index felül, negatív index alul */
function fcCells(vals, alt, legend) {
  var n = vals.length, w = Math.min(54, Math.floor(300 / n)), x0 = 180 - n * w / 2;
  return fcBuild(legend ? 114 : 96, alt, function (f) {
    for (var i = 0; i < n; i++) {
      var x = x0 + i * w + w / 2;
      f.box(x, 50, w - 4, 38, String(vals[i]), "", "mn");
      f.t(x, 18, String(i), "sm bd");
      f.t(x, 84, String(i - n), "sm mu");
    }
    if (legend) f.t(180, 106, legend, "sm mu");
  });
}
FCD.szo_index = function () { return fcCells(["P", "y", "t", "h", "o", "n"], "A Python szó betűi: felül az index 0-tól 5-ig, alul a negatív index −6-tól −1-ig", "felül: index · alul: negatív index"); };
FCD.lista_index = function () { return fcCells([5, 8, 3, 6, 9], "Egy ötelemű lista elemei, felül az index 0-tól 4-ig, alul a negatív index −5-től −1-ig", "felül: index · alul: negatív index"); };

FCD.valtozo = function () {
  var D = [["kor", "16", "int"], ["nev", "\"Anna\"", "str"], ["ar", "2.5", "float"], ["kesz", "True", "bool"]];
  return fcBuild(112, "Változók dobozként: név, érték és típus", function (f) {
    D.forEach(function (d, i) {
      var x = 50 + i * 86;
      f.t(x, 18, d[0], "bd mn");
      f.box(x, 56, 74, 40, d[1], "hl", "mn");
      f.t(x, 94, d[2], "sm mu");
    });
  });
};

FCD.ertekadas = function () {
  return fcBuild(110, "Az x = x + 5 értékadás: az x értéke 10-ről 15-re változik", function (f) {
    f.t(52, 20, "előtte", "sm mu"); f.t(308, 20, "utána", "sm mu");
    var a = f.box(52, 62, 76, 44, "10", "", "mn");
    f.t(52, 96, "x", "bd mn");
    var b = f.box(308, 62, 76, 44, "15", "hl2", "mn");
    f.t(308, 96, "x", "bd mn");
    f.arr([[96, 62], [262, 62]]);
    f.t(180, 48, "x = x + 5", "bd mn");
  });
};

FCD.maradek = function () {
  return fcBuild(152, "A 17 felosztása 5-ös csoportokra: 3 teljes csoport és 2 maradék", function (f) {
    for (var r = 0; r < 4; r++) {
      var n = r < 3 ? 5 : 2;
      for (var c = 0; c < n; c++) f.box(30 + c * 26, 20 + r * 30, 22, 22, "", r === 3 ? "hl3" : (r % 2 ? "hl2" : "hl"));
      f.text(172, 20 + r * 30, r < 3 ? (r + 1) + ". csoport: 5 db" : "ennyi marad: 2 db");
    }
    f.t(100, 142, "17 // 5 = 3", "bd mn"); f.t(262, 142, "17 % 5 = 2", "bd mn");
  });
};

FCD.range = function () {
  var X = function (u) { return 24 + u * 28; };
  return fcBuild(146, "A range(2, 10, 3) számegyenesen: 2, 5 és 8 kerül bele, a 10 már nem", function (f) {
    f.arr([[10, 74], [350, 74]]);
    for (var u = 0; u <= 11; u++) { f.ln(X(u), 69, X(u), 79); f.t(X(u), 96, String(u), "sm"); }
    [2, 5, 8].forEach(function (u) { f.circ(X(u), 74, 9, "", "hl"); });
    f.circ(X(10), 74, 9, "", "hl3");
    f.arr([[X(2), 58], [X(2), 46], [X(5), 46], [X(5), 58]]);
    f.arr([[X(5), 58], [X(5), 46], [X(8), 46], [X(8), 58]]);
    f.t((X(2) + X(5)) / 2, 36, "+3", "bd"); f.t((X(5) + X(8)) / 2, 36, "+3", "bd");
    f.t(X(2), 118, "start = 2", "sm bd"); f.t(X(10), 118, "stop = 10", "sm bd");
    f.t(X(10), 134, "már nem része", "sm mu");
  });
};

FCD.egymasba = function () {
  return fcBuild(204, "Egymásba ágyazott ciklus: a külső ciklus 3 sora, a belső ciklus 4 oszlopa és a végrehajtás sorrendje", function (f) {
    for (var j = 0; j < 4; j++) f.t(112 + j * 58, 14, "j = " + j, "sm bd");
    for (var i = 0; i < 3; i++) {
      f.text(8, 54 + i * 52, "i = " + i);
      for (j = 0; j < 4; j++) f.circ(112 + j * 58, 54 + i * 52, 19, String(i * 4 + j + 1), i % 2 ? "hl2" : "hl");
    }
    f.t(180, 192, "a számok a végrehajtás sorrendjét mutatják", "sm mu");
  });
};

FCD.bejaras = function () {
  var v = [4, 9, 2, 7];
  return fcBuild(222, "A lista bejárása: minden körben az x a következő elem értékét veszi fel", function (f) {
    for (var r = 0; r < 4; r++) {
      var y = 26 + r * 50;
      for (var c = 0; c < 4; c++) f.box(40 + c * 50, y, 44, 34, String(v[c]), r === c ? "hl" : "", "mn");
      f.text(236, y, (r + 1) + ". kör: x = " + v[r]);
    }
  });
};

FCD.index_sorszam = function () {
  var v = [4, 7, -2, 3];
  return fcBuild(176, "Ugyanaz az elem három szemmel: értéke −2, indexe 2, sorszáma 3", function (f) {
    var rows = [["érték", 34, 0], ["index", 90, 1], ["sorszám", 146, 2]];
    rows.forEach(function (r) {
      f.text(6, r[1], r[0]);
      for (var c = 0; c < 4; c++) f.box(120 + c * 62, r[1], 56, 38, String(r[2] === 0 ? v[c] : r[2] === 1 ? c : c + 1), c === 2 ? "hl" : "", "mn");
    });
  });
};

FCD.szelet = function () {
  return fcBuild(134, "A szo[1:4] szelet a Python szó 1. és 4. határa között: yth", function (f) {
    var w = 46, x0 = 42, ch = "Python";
    for (var i = 0; i < 6; i++) f.box(x0 + i * w + w / 2, 36, w - 4, 38, ch[i], i >= 1 && i < 4 ? "hl" : "", "mn");
    for (i = 0; i <= 6; i++) f.t(x0 + i * w, 70, String(i), "sm bd");
    f.arr([[x0 + w, 86], [x0 + w, 94], [x0 + 4 * w, 94], [x0 + 4 * w, 86]], false);
    f.t(x0 + 2.5 * w, 112, "szo[1:4] = \"yth\"", "bd mn");
  });
};

FCD.maximum_nyom = function () {
  var v = [4, 9, 2, 7, 12, 5], mx = [], m = -1, i;
  for (i = 0; i < v.length; i++) { if (v[i] > m) m = v[i]; mx.push(m); }
  return fcBuild(214, "Maximumkiválasztás: az oszlopok magassága az elem értéke, a kiemelt oszlopok új legnagyobb elemet jelentenek", function (f) {
    for (i = 0; i < v.length; i++) {
      var x = 40 + i * 56, h = v[i] * 9;
      f.box(x, 134 - h / 2, 40, h, "", v[i] === mx[i] && (i === 0 || v[i] > mx[i - 1]) ? "hl" : "");
      f.t(x, 134 - h - 9, String(v[i]), "bd mn");
      f.box(x, 176, 40, 26, String(mx[i]), "", "mn");
    }
    f.t(180, 150, "eddigi legnagyobb", "sm mu");
    f.t(180, 204, "a kiemelt oszlopoknál cserélődik a legnagyobb", "sm mu");
  });
};

/* a kész <figure> HTML-je; minden hívás új SVG-t (új marker-azonosítót) készít */
function fig(key, cap) {
  if (!FCD[key]) return "";
  return '<figure class="fc">' + FCD[key]() + (cap ? "<figcaption>" + cap + "</figcaption>" : "") + "</figure>";
}
