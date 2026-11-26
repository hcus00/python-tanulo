/*
 * Böngészőben futó Python (Pyodide) + kódszerkesztő.
 * - A Pyodide csak az első futtatáskor töltődik le (CDN), addig semmit nem lassít.
 * - Az input() a "Bemenet" mezőből olvas (soronként egy érték), így tesztelhető.
 * - Végtelen ciklus ellen időkorlát védi a programot.
 */
/* A Pyodide helye. Saját szerveren is tárolható: az index.html-ben a runner.js elé írd be: <script>PY_BASE = "pyodide/";</script> */
var PY_BASE = window.PY_BASE || "https://cdn.jsdelivr.net/npm/pyodide@0.26.4/";
var PY = { py: null, loading: null, fn: null };
var RN = {};      /* a szerkesztők állapota: azonosító -> {orig, task, tests} */
var RN_N = 0;

var PY_HARNESS = [
  "import sys, io, time, traceback",
  "class _Stop(BaseException):",
  "    pass",
  "class _Out:",
  "    def __init__(self):",
  "        self.p = []",
  "        self.n = 0",
  "    def write(self, s):",
  "        self.n += len(s)",
  "        if self.n > 20000:",
  "            raise _Stop('Túl sok kimenet: biztos, hogy nem végtelen ciklus van a programban?')",
  "        self.p.append(s)",
  "        return len(s)",
  "    def flush(self):",
  "        pass",
  "    def getvalue(self):",
  "        return ''.join(self.p)",
  "def _run(code, stdin_text, limit, seed=None, echo=False, sep=False):",
  "    out = _Out()",
  "    prompts = []",
  "    data = iter(stdin_text.split('\\n') if stdin_text != '' else [])",
  "    def fake_input(prompt=''):",
  "        if sep:",
  "            prompts.append(str(prompt))",
  "        else:",
  "            out.write(str(prompt))",
  "        try:",
  "            v = next(data)",
  "        except StopIteration:",
  "            raise EOFError('Nincs több bemenet. Írd a Bemenet mezőbe az input() által kért értékeket, soronként egyet.')",
  "        if echo and not sep:",
  "            out.write(v + '\\n')",
  "        return v",
  "    start = time.time()",
  "    cnt = [0]",
  "    def tracer(frame, event, arg):",
  "        cnt[0] += 1",
  "        if cnt[0] % 1000 == 0 and time.time() - start > limit:",
  "            raise _Stop('A program túl sokáig fut. Lehet, hogy végtelen ciklus van benne?')",
  "        return tracer",
  "    if seed is not None:",
  "        import random",
  "        random.seed(seed)",
  "    g = {'__name__': '__main__', 'input': fake_input}",
  "    err = ''",
  "    old = sys.stdout",
  "    sys.stdout = out",
  "    try:",
  "        c = compile(code, 'program.py', 'exec')",
  "        sys.settrace(tracer)",
  "        try:",
  "            exec(c, g)",
  "        finally:",
  "            sys.settrace(None)",
  "    except _Stop as e:",
  "        err = str(e)",
  "    except BaseException as e:",
  "        lines = code.split('\\n')",
  "        fr = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == 'program.py']",
  "        if fr:",
  "            err = 'Traceback (most recent call last):\\n'",
  "            for f in fr:",
  "                err += '  File \"program.py\", line %d, in %s\\n' % (f.lineno, f.name)",
  "                if 1 <= f.lineno <= len(lines):",
  "                    err += '    ' + lines[f.lineno - 1].strip() + '\\n'",
  "        err += ''.join(traceback.format_exception_only(type(e), e)).rstrip()",
  "    finally:",
  "        sys.stdout = old",
  "    return (out.getvalue(), err, '\\n'.join(prompts))",
  "import json, types",
  "def _rp(v):",
  "    try:",
  "        if isinstance(v, str):",
  "            s = '\"' + v.replace('\\\\', '\\\\\\\\').replace('\"', '\\\\\"') + '\"'",
  "        else:",
  "            s = repr(v).replace(\"'\", '\"')",
  "    except Exception:",
  "        s = '?'",
  "    return s if len(s) <= 70 else s[:67] + '...'",
  "def _trace(code, stdin_text, limit):",
  "    out = _Out()",
  "    data = iter(stdin_text.split('\\n') if stdin_text != '' else [])",
  "    def fake_input(prompt=''):",
  "        out.write(str(prompt))",
  "        try:",
  "            v = next(data)",
  "        except StopIteration:",
  "            raise EOFError('Nincs több bemenet. Írd a Bemenet mezőbe az input() által kért értékeket, soronként egyet.')",
  "        if True:",
  "            out.write(v + '\\n')",
  "        return v",
  "    steps = []",
  "    start = time.time()",
  "    cnt = [0]",
  "    def snap(d):",
  "        r = {}",
  "        for k, v in list(d.items()):",
  "            if k.startswith('__') or v is fake_input or isinstance(v, (types.FunctionType, types.ModuleType, type)):",
  "                continue",
  "            r[k] = _rp(v)",
  "        return r",
  "    def tracer(frame, event, arg):",
  "        if frame.f_code.co_filename != 'program.py':",
  "            return None",
  "        cnt[0] += 1",
  "        if cnt[0] % 500 == 0 and time.time() - start > limit:",
  "            raise _Stop('A program túl sokáig fut.')",
  "        if event == 'line':",
  "            if len(steps) >= 400:",
  "                raise _Stop('trunc')",
  "            steps.append({'l': frame.f_lineno, 'v': snap(frame.f_locals), 'n': out.n, 'f': frame.f_code.co_name})",
  "        return tracer",
  "    g = {'__name__': '__main__', 'input': fake_input}",
  "    err = ''",
  "    trunc = False",
  "    old = sys.stdout",
  "    sys.stdout = out",
  "    try:",
  "        c = compile(code, 'program.py', 'exec')",
  "        sys.settrace(tracer)",
  "        try:",
  "            exec(c, g)",
  "        finally:",
  "            sys.settrace(None)",
  "    except _Stop as e:",
  "        if str(e) == 'trunc':",
  "            trunc = True",
  "        else:",
  "            err = str(e)",
  "    except BaseException as e:",
  "        lines = code.split('\\n')",
  "        fr = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == 'program.py']",
  "        if fr:",
  "            err = 'Traceback (most recent call last):\\n'",
  "            for f in fr:",
  "                err += '  File \"program.py\", line %d, in %s\\n' % (f.lineno, f.name)",
  "                if 1 <= f.lineno <= len(lines):",
  "                    err += '    ' + lines[f.lineno - 1].strip() + '\\n'",
  "        err += ''.join(traceback.format_exception_only(type(e), e)).rstrip()",
  "    finally:",
  "        sys.stdout = old",
  "    return json.dumps({'steps': steps, 'out': out.getvalue(), 'err': err, 'trunc': trunc, 'end': snap(g)})"
].join("\n");

/* A Pyodide betöltése (csak egyszer, az első futtatáskor). */
function pyLoad() {
  if (PY.fn) return Promise.resolve(PY.fn);
  if (PY.loading) return PY.loading;
  PY.loading = new Promise(function (res, rej) {
    var s = document.createElement("script");
    s.src = PY_BASE + "pyodide.js";
    s.onerror = function () { PY.loading = null; rej(new Error("load")); };
    s.onload = function () {
      loadPyodide({ indexURL: PY_BASE }).then(function (p) {
        p.runPython(PY_HARNESS);
        PY.py = p; PY.fn = p.globals.get("_run");
        res(PY.fn);
      }).catch(function (e) { PY.loading = null; rej(e); });
    };
    document.head.appendChild(s);
  });
  return PY.loading;
}

/* Egy program futtatása: {out, err}. */
/* echo: a beolvasott értéket is kiírja a kérdés után (mint egy valódi konzolon); az ellenőrzések echo nélkül futnak.
   sep: az input() kérdéseit nem a kimenetbe írja, hanem külön gyűjti (a pontozáshoz: prompts). */
function pyRun(code, stdin, seed, echo, sep) {
  return pyLoad().then(function (fn) {
    var r = fn(code, stdin || "", 5, seed == null ? null : seed, !!echo, !!sep), a = r.toJs();
    r.destroy();
    return { out: a[0], err: a[1], prompts: a[2] || "" };
  });
}

var rnNorm = function (s) {
  var L = s.replace(/\r/g, "").split("\n").map(function (x) { return x.replace(/\s+$/, ""); });
  while (L.length && L[L.length - 1] === "") L.pop();
  return L.join("\n");
};

/* ---- a szerkesztő felülete ---- */

/* opt: {task:[i,j], tests:[[bemenet, kimenet],...], input:true/false, file:true/false, check:true/false} */
/* Gyorsbillentyűk telefonhoz: [kód, felirat, képernyőolvasós név] */
var QK = [
  ["tab", "⇥", "Behúzás"], ["untab", "⇤", "Visszaléptetés"],
  [":", ":", "kettőspont"], ["()", "( )", "zárójelpár"], ["[]", "[ ]", "szögletes zárójelpár"], ['""', "\" \"", "idézőjelpár"],
  ["=", "=", "egyenlőségjel"], ["==", "==", "dupla egyenlőségjel"], ["#", "#", "kettőskereszt"], [".", ".", "pont"], [",", ",", "vessző"],
  ["+", "+", "plusz"], ["-", "-", "mínusz"], ["*", "*", "csillag"], ["/", "/", "per jel"], ["%", "%", "százalékjel"],
  ["<", "<", "kisebb jel"], [">", ">", "nagyobb jel"], ["_", "_", "alsó vonal"], ["{}", "{ }", "kapcsos zárójelpár"]
];

function rnHtml(code, opt) {
  opt = opt || {};
  var id = "rn" + (++RN_N);
  RN[id] = { orig: code, task: opt.task || null, tests: opt.tests || null };
  var inp = opt.input !== false;
  return '<div class="rn" id="' + id + '">' +
    '<div class="ed"><pre class="hlp" aria-hidden="true"></pre>' +
    '<textarea wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Python-kód" aria-describedby="' + id + 'h" rows="' + Math.max(4, Math.min(16, code.split("\n").length + 1)) + '" oninput="rnSync(\'' + id + '\')" onscroll="rnScroll(\'' + id + '\')" onkeydown="rnKey(event,\'' + id + '\')">' + esc(code) + '</textarea></div>' +
    '<p class="kbh" id="' + id + 'h">Billentyűzet: a Tab behúzást ad, a Shift+Tab visszaléptet, az Esc után a Tab kilép a szerkesztőből, a Ctrl+Enter futtat.</p>' +
    '<div class="qk" role="toolbar" aria-label="Gyorsbillentyűk a kódíráshoz">' + QK.map(function (q, n) {
      return '<button type="button" aria-label="' + q[2] + '" onmousedown="event.preventDefault()" onclick="rnQuick(\'' + id + "'," + n + ')">' + esc(q[1]) + "</button>";
    }).join("") + "</div>" +
    (inp ? '<label class="rl" for="' + id + 'i">Bemenet (soronként egy érték)</label><textarea class="rin" id="' + id + 'i" rows="2" spellcheck="false" placeholder="' + (opt.ph != null ? opt.ph : "pl.\n5\n12") + '">' + esc(opt.sin || "") + '</textarea>' : "") +
    '<div class="rb">' +
    '<button class="btn" onclick="rnRun(\'' + id + '\')">▶ Futtatás</button>' +
    (opt.check ? '<button class="btn ck" onclick="rnCheck(\'' + id + '\')">✔ Ellenőrzés</button>' : "") +
    '<button class="btn gh" onclick="rnTrace(\'' + id + '\')">🔍 Lépésenként</button>' +
    '<button class="btn gh" onclick="rnReset(\'' + id + '\')">↺ Eredeti kód</button>' +
    (opt.file ? '<label class="btn gh fl">📎 .py betöltése<input type="file" accept=".py,.txt,text/plain" onchange="rnFile(event,\'' + id + '\')" hidden></label>' : "") +
    '</div><pre class="rout" aria-live="polite"></pre><div class="rres"></div><div class="rtr"></div></div>';
}

/* A színezett réteg szinkronja a szövegmezővel. */
function rnSync(id) {
  var r = $(id), t = r.querySelector("textarea"), p = r.querySelector(".hlp");
  p.innerHTML = hl(t.value) + "\n ";
  rnScroll(id);
}
function rnScroll(id) {
  var r = $(id), t = r.querySelector("textarea"), p = r.querySelector(".hlp");
  p.scrollTop = t.scrollTop; p.scrollLeft = t.scrollLeft;
}
/* Szöveg beszúrása a kurzorhoz (az a–b tartomány helyére) úgy, hogy a visszavonás (Ctrl+Z) is működjön. */
function rnPut(t, s, a, b) {
  t.focus({ preventScroll: true });
  if (a != null) t.setSelectionRange(a, b);
  var ok = false;
  try { ok = document.execCommand("insertText", false, s); } catch (x) {}
  if (!ok) { t.setRangeText(s, t.selectionStart, t.selectionEnd, "end"); t.dispatchEvent(new Event("input", { bubbles: true })); }
}

/* Behúzás (dir > 0) vagy visszaléptetés (dir < 0) a kijelölt soroknál; kijelölés nélkül a Tab 4 szóközt szúr be. */
function rnIndent(id, dir) {
  var t = $(id).querySelector("textarea"), v = t.value, a = t.selectionStart, b = t.selectionEnd, I = "    ";
  if (dir > 0 && a === b) { rnPut(t, I); return; }
  var ls = v.lastIndexOf("\n", a - 1) + 1, e2 = b > a && v.charAt(b - 1) === "\n" ? b - 1 : b, le = v.indexOf("\n", e2);
  if (le < 0) le = v.length;
  var out = v.slice(ls, le).split("\n").map(function (l) { return dir > 0 ? I + l : l.replace(/^ {1,4}/, ""); }).join("\n");
  rnPut(t, out, ls, le);
  t.setSelectionRange(a === b ? Math.max(ls, a + out.length - (le - ls)) : ls, ls + out.length);
}

/* A telefonos gyorsbillentyű-sor gombjai. A párok (zárójel, idézőjel) közé teszik a kurzort, kijelölt szöveget körbevesznek. */
function rnQuick(id, n) {
  var q = QK[n][0], t = $(id).querySelector("textarea");
  if (q === "tab") return rnIndent(id, 1);
  if (q === "untab") return rnIndent(id, -1);
  if (["()", "[]", '""', "{}"].indexOf(q) >= 0) {
    var a = t.selectionStart, b = t.selectionEnd, mid = t.value.slice(a, b);
    rnPut(t, q.charAt(0) + mid + q.charAt(1));
    t.setSelectionRange(mid ? a + mid.length + 2 : a + 1, mid ? a + mid.length + 2 : a + 1);
  } else rnPut(t, q);
}

/* Tab: behúzás, Shift+Tab: visszaléptetés, Esc után a Tab kilép a szerkesztőből (nem csapda a billentyűzetes használónak);
   az Enter megtartja a behúzást (kettőspont után eggyel mélyebb); Ctrl+Enter futtat. */
function rnKey(e, id) {
  var t = e.target, a = t.selectionStart, v = t.value;
  if (e.key === "Escape") { t.dataset.free = "1"; return; }
  if (e.key === "Tab") {
    if (t.dataset.free === "1") { delete t.dataset.free; return; }
    e.preventDefault(); rnIndent(id, e.shiftKey ? -1 : 1);
    return;
  }
  if (["Shift", "Control", "Alt", "Meta"].indexOf(e.key) < 0) delete t.dataset.free;
  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    var ls = v.lastIndexOf("\n", a - 1) + 1, line = v.slice(ls, a), ind = /^ */.exec(line)[0];
    if (/:\s*$/.test(line)) ind += "    ";
    rnPut(t, "\n" + ind);
  } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault(); rnRun(id);
  }
}

function rnInit(root) {
  (root || document).querySelectorAll(".rn").forEach(function (r) { if (r.id) rnSync(r.id); });
}

function rnMsg(r, s) { r.querySelector(".rout").textContent = s; }

function rnLoadErr(r) {
  rnMsg(r, "Nem sikerült betölteni a Python-futtatót. Internetkapcsolat kell hozzá (az első indításkor kb. 10 MB-ot tölt le).");
}

function rnRun(id) {
  var r = $(id), code = r.querySelector("textarea").value, i = r.querySelector(".rin");
  var first = !PY.fn;
  rnMsg(r, first ? "A Python betöltődik… (az első alkalommal pár másodpercig tart)" : "Fut…");
  r.querySelector(".rres").innerHTML = "";
  r.querySelector(".rtr").innerHTML = "";
  pyRun(code, i ? i.value : "", null, true).then(function (x) {
    r.querySelector(".rout").textContent = x.out + (x.err ? (x.out && !/\n$/.test(x.out) ? "\n" : "") + x.err : "") || "(a program nem írt ki semmit)";
    r.querySelector(".rout").classList.toggle("er", !!x.err);
    r.querySelector(".rres").innerHTML = x.err ? hibaMagyaraz(x.err, code) : "";
  }).catch(function () { rnLoadErr(r); });
}

function rnReset(id) {
  var r = $(id); r.querySelector("textarea").value = RN[id].orig; rnSync(id);
  rnMsg(r, ""); r.querySelector(".rres").innerHTML = ""; r.querySelector(".rtr").innerHTML = "";
}

function rnFile(e, id) {
  var f = e.target.files[0], r = $(id);
  if (!f) return;
  if (f.size > 100000) { r.querySelector(".rres").innerHTML = '<span class="bd">A fájl túl nagy (legfeljebb 100 KB lehet).</span>'; return; }
  var fr = new FileReader();
  fr.onload = function () { r.querySelector("textarea").value = String(fr.result).replace(/\r\n?/g, "\n"); rnSync(id); rnMsg(r, "Betöltve: " + f.name + ". Most futtathatod vagy ellenőrizheted."); };
  fr.readAsText(f);
  e.target.value = "";
}

/* A feladat tesztjeinek lefuttatása sorban. */
function rnCheck(id) {
  var r = $(id), st = RN[id], code = r.querySelector("textarea").value, res = r.querySelector(".rres");
  var T = st.tests, k = 0;
  rnMsg(r, !PY.fn ? "A Python betöltődik…" : "Tesztelés…");
  res.innerHTML = "";
  (function next() {
    if (k >= T.length) {
      rnMsg(r, "");
      res.innerHTML = '<span class="gd">Mind a ' + T.length + ' teszt sikerült!</span>';
      if (st.task) rok(st.task[0], st.task[1]);
      return;
    }
    var t = T[k];
    /* t[2]: a tesztadatot adó első sorok (lecserélik a kód elejét), t[3]: véletlen mag */
    var c2 = t[2] ? t[2] + "\n" + code.split("\n").slice(t[2].split("\n").length).join("\n") : code;
    pyRun(c2, t[0], t[3]).then(function (x) {
      if (!x.err && rnNorm(x.out) === rnNorm(t[1])) { k++; return next(); }
      rnMsg(r, "");
      res.innerHTML = '<span class="bd">A(z) ' + (k + 1) + '. teszten (' + T.length + '-ből) nem jó a program.</span>' +
        (t[0] !== "" ? "<b>Bemenet</b><pre>" + esc(t[0]) + "</pre>" : "") +
        "<b>Várt kimenet</b><pre>" + esc(t[1]) + "</pre>" +
        "<b>A te kimeneted</b><pre>" + esc(x.out + (x.err ? (x.out && !/\n$/.test(x.out) ? "\n" : "") + x.err : "")) + "</pre>" +
        (x.err ? hibaMagyaraz(x.err, c2) : "");
    }).catch(function () { rnLoadErr(r); });
  })();
}

/* A leckék kódpéldái alatti „Kipróbálom” gomb: megnyitja / bezárja a szerkesztőt. */
function rnTry(btn, code) {
  var box = btn.nextElementSibling;
  if (box.innerHTML) { box.innerHTML = ""; btn.textContent = "▶ Kipróbálom"; return; }
  box.innerHTML = rnHtml(code, { input: /input\(/.test(code) });
  rnInit(box); btn.textContent = "✕ Bezárás";
}

/* Futtatható-e a kódrészlet? (a pszeudokód, hibaüzenet, mintakimenet nem az) */
var runnable = function (c) { return !/^(START|\d\.|Be:|\w*Error:|Mintakimenet)/m.test(c) && !/^\.\.\.|\.\.\.$/m.test(c); };

/* ---- lépésenkénti futtatás ---- */
function pyTrace(code, stdin) {
  return pyLoad().then(function () {
    var f = PY.py.globals.get("_trace"), s = f(code, stdin || "", 5);
    f.destroy();
    return JSON.parse(s);
  });
}

function rnTrace(id) {
  var r = $(id), code = r.querySelector("textarea").value, i = r.querySelector(".rin");
  rnMsg(r, !PY.fn ? "A Python betöltődik… (az első alkalommal pár másodpercig tart)" : "Nyomkövetés…");
  r.querySelector(".rres").innerHTML = "";
  r.querySelector(".rtr").innerHTML = "";
  pyTrace(code, i ? i.value : "").then(function (t) {
    rnMsg(r, "");
    RN[id].tr = { t: t, code: code.split("\n"), k: 0 };
    rnTrFrame(id, t.steps.length);
    rnTr(id, 0);
  }).catch(function () { rnLoadErr(r); });
}

/* A nyomkövető keretét (gombok, csúszka) egyszer építjük fel, lépésenként csak a tartalmát frissítjük:
   így a megnyomott gomb és a húzott csúszka nem cserélődik le, és az elrendezés sem ugrál. */
function rnTrFrame(id, N) {
  $(id).querySelector(".rtr").innerHTML = '<div class="tr">' +
    '<div class="trc"></div>' +
    '<div class="trb"><button class="btn gh" aria-label="Az első lépés" onclick="rnTr(\'' + id + "',0)\">⏮</button>" +
    '<button class="btn gh" aria-label="Előző lépés" onclick="rnTrGo(\'' + id + "',-1)\">◀</button>" +
    '<button class="btn" onclick="rnTrGo(\'' + id + "',1)\">▶ Következő</button>" +
    '<button class="btn gh" aria-label="Az utolsó lépés" onclick="rnTr(\'' + id + "'," + N + ')">⏭</button>' +
    '<span class="tn"></span></div>' +
    '<input type="range" aria-label="Lépés" min="0" max="' + N + '" value="0" oninput="rnTr(\'' + id + '\',+this.value)">' +
    '<p class="trn"></p><div class="trg"></div><div class="tre"></div></div>';
}
function rnTrGo(id, d) { rnTr(id, RN[id].tr.k + d); }

/* A k. lépés kirajzolása: a következőnek végrehajtandó sor, a változók és a kimenet addig. */
function rnTr(id, k) {
  var r = $(id), st = RN[id].tr, t = st.t, N = t.steps.length;
  k = Math.max(0, Math.min(N, k));
  st.k = k;
  var q = function (c) { return r.querySelector(".rtr ." + c); };
  var fin = k >= N, s = fin ? null : t.steps[k], vars = fin ? t.end : s.v;
  var prev = k > 0 ? t.steps[k - 1].v : {};
  var lines = st.code.map(function (ln, i) {
    return '<div class="tl' + (!fin && i + 1 === s.l ? " cur" : "") + '"><span class="ln">' + (i + 1) + "</span>" + (hl(ln) || " ") + "</div>";
  }).join("");
  var names = Object.keys(vars);
  var vt = names.length ? "<table>" + names.map(function (n) {
    return '<tr class="' + (prev[n] !== vars[n] ? "ch" : "") + '"><td>' + esc(n) + "</td><td>" + esc(vars[n]) + "</td></tr>";
  }).join("") + "</table>" : '<span class="mut">(még nincs változó)</span>';
  var out = fin ? t.out : t.out.slice(0, s.n);
  var note = fin ? (t.err ? "A program hibával állt le." : t.trunc ? "A nyomkövetés 400 lépés után megállt." : "A program véget ért.") :
    "A kiemelt sor <b>végrehajtás előtt</b> áll: a változók az eddigi lépések eredményét mutatják." + (s.f !== "<module>" ? " (függvény: <code>" + esc(s.f) + "</code>)" : "");
  var cur = q("trc"), sc = cur.scrollTop;
  cur.innerHTML = lines;
  cur.scrollTop = sc;
  q("tn").textContent = (k + 1) + " / " + (N + 1);
  var sl = r.querySelector(".rtr input[type=range]");
  if (+sl.value !== k) sl.value = k;
  q("trn").innerHTML = note;
  q("trg").innerHTML = '<div><b>Változók</b>' + vt + '</div><div><b>Kimenet eddig</b><pre>' + (esc(out) || " ") + "</pre></div>";
  q("tre").innerHTML = fin && t.err ? '<pre class="rout er">' + esc(t.err) + "</pre>" + hibaMagyaraz(t.err, st.code.join("\n")) : "";
}
