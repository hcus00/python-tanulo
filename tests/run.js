/* A PyTanuló automatikus tesztje.
 *   cd tests && npm install && npx playwright install chromium && npm test
 * Egy valódi böngészőben (Playwright) végigmegy az oldalon:
 *  - minden téma minden feladatát megoldja a felületen át (teszt, beírós, kódolós, hibakereső, sorbarendezős, nyomkövetési táblázat),
 *  - minden érettségi feladatsort kipróbál (a mintamegoldás teljes pontot kap, a kezdőkód és a „beégetett” kimenet nem),
 *  - ellenőrzi, hogy nincs konzolhiba és vízszintes görgetés telefonméreten,
 *  - lefuttatja az axe akadálymentességi ellenőrzést.
 * A Pyodide a tests/node_modules-ból jön, az interneten nem kell elérni semmit. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PYD = path.dirname(require.resolve('pyodide/package.json'));
let AXE = null;
try { AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch (e) { console.log('(az axe-core nincs telepítve, az akadálymentességi ellenőrzés kimarad)'); }

const MIME = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', json: 'application/json', wasm: 'application/wasm', zip: 'application/zip', webmanifest: 'application/manifest+json' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = u.startsWith('/__pyodide/') ? path.join(PYD, u.slice(10)) : path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) && !f.startsWith(PYD)) { r.statusCode = 403; return r.end(); }
  try { r.setHeader('content-type', MIME[f.split('.').pop()] || 'application/octet-stream'); r.end(fs.readFileSync(f)); }
  catch (e) { r.statusCode = 404; r.end(); }
});

const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const problems = [];
const bad = (...a) => { problems.push(a.join(' ')); console.log('  HIBA:', ...a); };
const section = (s) => console.log('\n== ' + s);

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = 'http://localhost:' + server.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { window.PY_BASE = '/__pyodide/'; });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(base);

  /* ---------- 1. az adatok szerkezete ---------- */
  if (want('adat')) {
  section('Az adatok szerkezete');
  const data = await page.evaluate(() => {
    const out = [], keys = Object.keys(FCD);
    for (const y of [9, 10, 11]) {
      for (let i = 0; R[y + '-' + i]; i++) {
        const e = R[y + '-' + i], w = y + '-' + i;
        if (!e.n || !e.s.length || !e.t.length) out.push(w + ': üres téma');
        e.s.forEach(s => { if (s[3] && !keys.includes(s[3])) out.push(w + ': ismeretlen ábra: ' + s[3]); });
        e.t.forEach((t, j) => {
          const id = w + '/' + (j + 1) + '. feladat';
          if (t.g && !keys.includes(t.g)) out.push(id + ': ismeretlen ábra: ' + t.g);
          if (t.o && !(t.a >= 0 && t.a < t.o.length)) out.push(id + ': hibás jó válasz');
          if (!t.o && !t.k && !t.pz && !t.tr && !(t.i && t.i.length && t.i[0] !== '')) out.push(id + ': nincs elfogadott válasz');
          if (t.k && !(t.ts && t.ts.length && t.m && t.st !== undefined)) out.push(id + ': hiányos kódolós feladat');
        });
      }
    }
    EX.forEach(e => { if (e.parts.reduce((a, p) => a + p.p, e.gen ? e.gen.p : 0) !== 15) out.push('érettségi ' + e.id + ': nem 15 pontos'); });
    return { problems: out, topics: Object.keys(R).length, exams: EX.length };
  });
  data.problems.forEach(p => bad(p));
  console.log('  témák:', data.topics, ', érettségi feladatsorok:', data.exams);
  }

  /* ---------- 2. minden feladat megoldása a felületen ---------- */
  const cnt = {}, overflow = [];
  if (want('feladat')) {
  section('Feladatok végigkattintása');
  for (const y of [9, 10, 11]) {
    const n = await page.evaluate(y => { Y = y; home(); return topics(y).length; }, y);
    for (let i = 0; i < n; i++) {
      await page.evaluate(i => lesson(i), i);
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      if (w[0] > w[1]) overflow.push(y + '-' + i);
      const tasks = await page.evaluate(([y, i]) => R[y + '-' + i].t.map(t => ({ k: !!t.k, bug: !!t.bug, pz: !!t.pz, tr: !!t.tr, oc: !!t.oc, o: !!t.o })), [y, i]);
      for (let j = 0; j < tasks.length; j++) {
        const t = tasks[j], key = y + '-' + i;
        const r = await page.evaluate(async ([key, j, t]) => {
          const id = key + '-' + j, box = document.getElementById('f_' + id);
          if (!box) return 'nincs feladatdoboz';
          const q = R[key].t[j], wrap = box.parentNode;
          /* a szerző által írt HTML (<code>, &lt;) sehol se jelenhet meg szövegként: sem a feladatban, sem a rossz válaszra adott súgóban */
          const raw = /<\/?(code|b|i|em|strong|br|pre|span)>|&(lt|gt|amp|nbsp);/;
          if (raw.test(wrap.innerText)) return 'nyers HTML a feladat szövegében: ' + raw.exec(wrap.innerText)[0];
          if (t.o) { const bs = [...wrap.querySelectorAll('button.o')]; bs[bs.findIndex((x, k) => k !== q.a)].click(); }
          else if (t.tr) wrap.querySelector('button.btn').click();
          else if (!t.k && !t.pz) { document.getElementById('in_' + id).value = 'zzzz'; wrap.querySelector('button.btn').click(); }
          if (raw.test(box.innerText)) return 'nyers HTML a visszajelzésben: ' + raw.exec(box.innerText)[0];
          if (t.k) {
            const rn = wrap.querySelector('.rn'); rn.querySelector('textarea').value = q.m; rnSync(rn.id); rnCheck(rn.id);
            for (let k = 0; k < 300; k++) { await new Promise(r => setTimeout(r, 100)); if (rn.querySelector('.rres').textContent) break; }
            return /Mind a/.test(rn.querySelector('.rres').textContent) ? 'ok' : 'a mintamegoldás nem megy át: ' + rn.querySelector('.rres').textContent.slice(0, 120);
          }
          if (t.pz) {
            const ol = wrap.querySelector('ol.pz'), lis = [...ol.children], used = new Set();
            q.pz.map(s => { const l = lis.find(l => !used.has(l) && l.querySelector('.pl').textContent === s); used.add(l); return l; }).forEach(l => ol.appendChild(l));
            wrap.querySelector('button.btn').click();
            for (let k = 0; k < 100; k++) { await new Promise(r => setTimeout(r, 100)); if (S.t[id]) break; }
            return S.t[id] ? 'ok' : 'sorbarendezés: ' + box.textContent;
          }
          if (t.tr) { wrap.querySelectorAll('input.tc').forEach(inp => { inp.value = q.tr.rows[+inp.dataset.r][+inp.dataset.c]; }); wrap.querySelector('button.btn').click(); return S.t[id] ? 'ok' : 'táblázat: ' + box.textContent; }
          if (t.o) { wrap.querySelectorAll('button.o')[q.a].click(); return S.t[id] ? 'ok' : 'teszt: ' + box.textContent; }
          document.getElementById('in_' + id).value = q.i[0]; wrap.querySelector('button.btn').click();
          return S.t[id] ? 'ok' : 'beírós: ' + box.textContent;
        }, [key, j, t]);
        const kind = t.k ? (t.bug ? 'hibakereső' : 'kódolós') : t.pz ? 'sorbarendezős' : t.tr ? 'nyomkövetés' : t.oc ? 'ábra–kód' : t.o ? 'teszt' : 'beírós';
        if (r === 'ok') cnt[kind] = (cnt[kind] || 0) + 1; else bad(key + ' ' + (j + 1) + '. feladat (' + kind + '):', r);
      }
      if (!(await page.evaluate(k => !!S.done[k], y + '-' + i))) bad(y + '-' + i, 'a téma nem teljesíthető');
    }
  }
  console.log('  megoldva:', JSON.stringify(cnt));
  if (overflow.length) bad('vízszintes görgetés telefonméreten:', overflow.join(', '));
  }

  /* ---------- 3. érettségi mód ---------- */
  if (want('erettsegi')) {
  section('Érettségi mód');
  const blocks = await page.evaluate(() => JSON.stringify(exBlocks('2. feladat: 5\n3. feladat\nx\n\ny\n 4. feladat :  z')));
  if (blocks !== '{"2":["5"],"3":["x","y"],"4":["z"]}') bad('az exBlocks hibás:', blocks);
  const nEx = await page.evaluate(() => EX.length);
  const score = async (i, mod, acc) => {
    await page.evaluate(i => { exams(); exSetup(i); }, i);
    await page.evaluate(acc => { document.getElementById('exacc').checked = acc; }, acc);
    await page.evaluate(i => exRun(i), i);
    await page.evaluate(([i, mod]) => {
      if (typeof mod === 'string' && mod.startsWith('=>')) mod = eval(mod.slice(2));
      const e = EX[i], ta = document.querySelector('.rn textarea');
      let code = e.m;
      if (mod === 'starter') code = e.st;
      if (mod === 'hard') code = e.ts[0][1].split('\n').map(l => 'print(' + JSON.stringify(l) + ')').join('\n');
      if (mod === 'noacc') code = ['import unicodedata', '_p = print', 'def print(*a, **k):', '    _p(*[unicodedata.normalize("NFD", str(x)).encode("ascii", "ignore").decode() for x in a], **k)', e.m].join('\n');
      if (mod === 'sameline') code = e.m.replace(/print\("(\d+)\. feladat"\)\n(\s*)print\(/g, 'print("$1. feladat:", end=" ")\n$2print(');
      if (typeof mod === 'function') code = mod(e);
      ta.value = code; rnSync(document.querySelector('.rn').id);
    }, [i, mod]);
    await page.evaluate(() => exSubmit());
    await page.waitForFunction(() => document.querySelector('#exres h3'), null, { timeout: 120000 });
    return page.evaluate(() => { const m = /(\d+)\/(\d+) pont/.exec(document.querySelector('#exres h3').textContent); return [+m[1], +m[2], /nem ismertem fel/.test(document.querySelector('#exres').textContent)]; });
  };
  for (let i = 0; i < nEx; i++) {
    const [p, t] = await score(i, 'sol', true);
    if (p !== t) bad('érettségi', i + 1 + '. feladatsor: a mintamegoldás ' + p + '/' + t + ' pontot kapott');
    const [p2] = await score(i, 'starter', true);
    if (p2 > 0) bad('érettségi', i + 1 + '. feladatsor: a kezdőkód (üres program) is ' + p2 + ' pontot kap');
    const [p3, , skipped3] = await score(i, 'hard', true);
    const hasData = await page.evaluate(i => EX[i].c.length > 0, i);
    if (hasData && !skipped3) bad('érettségi', i + 1 + '. feladatsor: a beégetett kimenet (adat nélkül) nem kap figyelmeztetést');
    if (p3 >= t) bad('érettségi', i + 1 + '. feladatsor: a beégetett kimenet teljes pontot kap');
    if (p3 > t * 0.6) bad('érettségi', i + 1 + '. feladatsor: a beégetett kimenet ' + p3 + '/' + t + ' pontot kap (a rejtett adatokra nem működik)');
  }
  const [pa] = await score(1, 'noacc', true), [pb] = await score(1, 'noacc', false);
  if (pa !== 15) bad('ékezetmentes kimenet bekapcsolt opcióval nem teljes pontos:', pa);
  if (pb === 15) bad('ékezetmentes kimenet kikapcsolt opcióval is teljes pontos');
  const [pc] = await score(0, 'sameline', true);
  if (pc !== 15) bad('az „N. feladat:” fejlécet és az eredményt egy sorba író megoldás nem teljes pontos:', pc);
  /* az adatokat a diáknak kell beírnia; a szerkesztő és a bemenet üres; nincs táblázat és részpontszám a feladatlapon */
  for (let i = 0; i < nEx; i++) {
    const r = await page.evaluate(i => {
      exams(); exSetup(i); exRun(i);
      const e = EX[i], ta = document.querySelector('.rn textarea'), sin = document.querySelector('.rn .rin');
      const hasIn = e.ts.some(t => t[0] !== '');
      return { ta: ta.value, sin: sin ? sin.value : null, hasIn, hasSin: !!sin, tab: !!document.querySelector('table.exp'), li: document.querySelectorAll('ol.exl2 li').length, n: e.parts.length,
        pts: /\d+\/\d+ pont/.test(document.querySelector('.exleft').textContent), nc: e.c.length, nd: document.querySelectorAll('.exleft .exd').length, left: document.querySelector('.exleft').textContent, exres: document.querySelector('#exres').textContent };
    }, i);
    const id = i + 1 + '. feladatsor: ';
    if (r.nd !== r.nc) bad('érettségi', id + 'az adatblokkok száma ' + r.nd + ', ' + r.nc + ' kellene');
    if (/\b(random|randint|input\(\)|import|lista|list\()/i.test(r.left)) bad('érettségi', id + 'a feladatlap konkrét Python-utasítást vagy adatszerkezetet említ: ' + /\b(random|randint|input\(\)|import|lista|list\()/i.exec(r.left)[0]);
    if (r.ta.trim().split('\n').filter(l => !l.startsWith('#')).length) bad('érettségi', id + 'a szerkesztő nem üres: ' + JSON.stringify(r.ta.slice(0, 60)));
    if (r.hasIn !== r.hasSin) bad('érettségi', id + 'a Bemenet mező ' + (r.hasIn ? 'hiányzik' : 'feleslegesen látszik'));
    if (r.sin) bad('érettségi', id + 'a Bemenet mező nem üres');
    if (r.tab) bad('érettségi', id + 'a feladatok táblázatban vannak');
    if (r.li !== r.n) bad('érettségi', id + 'a feladatlista ' + r.li + ' pontból áll, ' + r.n + ' kellene');
    if (r.pts) bad('érettségi', id + 'a feladatlapon részpontszám látszik');
  }
  /* az adatot a diák bárhogy tárolhatja: sorokként, szótárban, bármilyen néven; a rejtett adatokra ez alapján cseréljük */
  const i3 = await page.evaluate(() => EX.findIndex(e => e.n === 'Mozgáskihívás'));
  const rowsCode = (mk) => '=>(e => { const n = e.c[0], p = e.c[1]; return ' + mk + '; })';
  const head12 = 'print("1. feladat")\nprint("Résztvevők: " + str(len(X)) + ", átlag: " + str(round(sum(Y) / len(X), 1)) + " perc")\nprint("2. feladat")\nprint("Teljesítők:", sum(1 for v in Y if v >= 150))\n';
  const variants = {
    rows: rowsCode("'adatok = ' + JSON.stringify(n.map((x, k) => [x, p[k]])) + '\\n' + " + JSON.stringify(head12.replace(/len\(X\)/g, 'len(adatok)').replace(/sum\(Y\)/g, 'sum(r[1] for r in adatok)').replace(/for v in Y/g, 'for r in adatok').replace(/v >= 150/, 'r[1] >= 150')) ),
    dict: rowsCode("'d = {' + n.map((x, k) => JSON.stringify(x) + ': ' + p[k]).join(', ') + '}\\n' + " + JSON.stringify(head12.replace(/len\(X\)/g, 'len(d)').replace(/sum\(Y\)/g, 'sum(d.values())').replace(/for v in Y/g, 'for v in d.values()')) ),
    hardcount: rowsCode("'adatok = ' + JSON.stringify(n.map((x, k) => [x, p[k]])) + '\\n' + " + JSON.stringify('print("1. feladat")\nprint("Résztvevők: 8, átlag: 165.0 perc")\nprint("2. feladat")\nprint("Teljesítők:", sum(1 for r in adatok if r[1] >= 150))\n')),
    unknown: rowsCode("'nevek = ' + JSON.stringify(n.join(' ')) + '.split()\\nszamok = ' + JSON.stringify(p) + '\\n' + " + JSON.stringify('print("1. feladat")\nprint("Résztvevők: " + str(len(nevek)) + ", átlag: " + str(round(sum(szamok) / len(szamok), 1)) + " perc")\nprint("2. feladat")\nprint("Teljesítők:", sum(1 for v in szamok if v >= 150))\n')),
  };
  const rr = {};
  for (const k of Object.keys(variants)) rr[k] = await score(i3, variants[k], true);
  if (process.env.DBG) console.log('variánsok:', JSON.stringify(rr));
  if (rr.rows[0] !== 4 || rr.rows[2]) bad('érettségi: soronként tárolt adat (rejtett tesztekkel) nem 4 pontos / jelzi a kihagyást:', rr.rows);
  if (rr.dict[0] !== 4 || rr.dict[2]) bad('érettségi: szótárban tárolt adat (rejtett tesztekkel) nem 4 pontos / jelzi a kihagyást:', rr.dict);
  /* részpontok: a mintára jó, de a rejtett adatokra nem működő megoldás csak a mintás szempontok pontjait kapja */
  if (rr.hardcount[0] !== 3 || rr.hardcount[2]) bad('érettségi: a beégetett résztvevőszám nem 3 pontot kap (minta jó, rejtett nem):', rr.hardcount);
  /* fel nem ismert adattárolás: a mintára jó pontok megvannak, a rejtettekre épülők nem, és a program jelzi */
  if (rr.unknown[0] !== 2 || !rr.unknown[2]) bad('érettségi: a fel nem ismert adattárolásnál nincs kihagyás-jelzés vagy nem 2 pont jár:', rr.unknown);
  /* az „adat” szempont: önmagában az adatok eltárolása már pontot ér */
  const iA = await page.evaluate(() => EX.findIndex(e => e.g === 'e' && e.parts[0].k.some(c => c.k === 'adat') && e.ts.every(t => t[0] === '')));
  if (iA < 0) bad('érettségi: nincs adat-szempontos, bemenet nélküli feladatsor');
  else {
    const rA = await score(iA, '=>(e => { const ls = e.m.split("\\n"), k = ls.findIndex(l => /feladat/.test(l)); return ls.slice(0, k).join("\\n") + "\\n"; })', true);
    const wantA = await page.evaluate(i => EX[i].parts[0].k.find(c => c.k === 'adat').p + (EX[i].gen ? 1 : 0), iA);
    if (rA[0] !== wantA) bad('érettségi: az adatok eltárolása önmagában ' + rA[0] + ' pontot kapott, ' + wantA + ' kellene:', rA);
    const res = await page.evaluate(() => [...document.querySelectorAll('#exres ul.cr li')].map(l => l.className + ':' + l.textContent.slice(0, 3)).join(' | '));
    if (!/ok:/.test(res) || !/no:/.test(res)) bad('érettségi: az eredménylistában nincs szempontonkénti ✔/✘:', res);
    const mid = await page.evaluate(() => document.querySelectorAll('#exres ul.exl > li.mid, #exres ul.exl > li.ok').length);
    if (!mid) bad('érettségi: nincs részben/teljesen jó részfeladat jelölve');
  }
  /* a hivatalos útmutatók szerinti szempontok: bekérés felirata, számok és feliratok külön, általános pontok */
  const iP = await page.evaluate(() => EX.findIndex(e => e.n === 'Péksütemény-eladás'));
  const iK = await page.evaluate(() => EX.findIndex(e => e.n === 'Könyvtári késedelem'));
  const sc = (i, f) => score(i, '=>(e => { const c = e.m; return (' + f + ')(c); })', true);
  const [pNoPrompt] = await sc(iP, 'c => c.replace(\'input("Kérem a napi feljegyzést: ")\', \'input()\')');
  if (pNoPrompt !== 14) bad('érettségi: bekérő felirat nélkül 14 pont kellene (a felirat 1 pontot ér):', pNoPrompt);
  const [pPrintPrompt] = await sc(iP, 'c => c.replace(\'input("Kérem a napi feljegyzést: ")\', \'input()\').replace(\'napi =\', \'print("Kérem a napi feljegyzést:")\\nnapi =\')');
  if (pPrintPrompt !== 15) bad('érettségi: a print-tel kiírt bekérő szöveg is elfogadott kell legyen (15 pont):', pPrintPrompt);
  /* nulla alapú sorszám: az érték (nap) jó, a sorszám nem: a szamK szempontok külön pontoznak */
  const [pIdx] = await sc(iK, 'c => c.replace(\'str(legtobb + 1)\', \'str(legtobb)\')');
  if (pIdx !== 13) bad('érettségi: a nulla alapú sorszám 13 pontot kapjon (az érték és a felirat jó):', pIdx);
  const [pEmpty] = await sc(iK, 'c => "# semmi\\n"');
  if (pEmpty !== 0) bad('érettségi: a csak megjegyzést tartalmazó program ' + pEmpty + ' pontot kap');
  /* fejléc nélkül kiírt eredmények: nincs „fejléc” pont, a részfeladatok sem pontozhatók */
  const [pNoHead] = await sc(iK, 'c => c.replace(/print\\("\\d\\. feladat"\\)\\n/g, "")');
  if (pNoHead > 5) bad('érettségi: az „N. feladat” fejlécek nélkül túl sok pont jár:', pNoHead);
  /* két csoport: érettségi típusú és hosszabb gyakorló */
  const grp = await page.evaluate(() => { exams(); const h = [...document.querySelectorAll('#v h3')].map(x => x.textContent); const n = document.querySelectorAll('#v .tp').length; return { h, n, e: EX.filter(e => e.g === 'e').length, l: EX.filter(e => e.g === 'h').length }; });
  if (grp.e !== 8 || grp.l !== 6 || grp.n !== 14 || !grp.h.includes('Érettségi típusú feladatsorok') || !grp.h.includes('Hosszabb gyakorló feladatsorok')) bad('érettségi: a csoportos lista nem a várt:', JSON.stringify(grp));
  const longT = await page.evaluate(() => EX.filter(e => e.g === 'e').every(e => e.t === 30 && e.m.split('\n').filter(l => l.trim()).length <= 30));
  if (!longT) bad('érettségi: az érettségi típusú feladatsorok mintamegoldása 30 sornál hosszabb, vagy nem 30 perces');
  console.log('  feladatsorok:', nEx);
  }

  /* ---------- 4. nyomkövető, hibamagyarázó ---------- */
  if (want('nyomkoveto')) {
  section('Nyomkövető és hibamagyarázó');
  await page.evaluate(() => play());
  const tr = await page.evaluate(async () => {
    const rn = document.querySelector('.rn'); rn.querySelector('textarea').value = 'x = 1\nfor i in range(3):\n    x *= 2\nprint(x)'; rnSync(rn.id); rnTrace(rn.id);
    for (let k = 0; k < 300; k++) { await new Promise(r => setTimeout(r, 100)); if (rn.querySelector('.rtr').innerHTML) break; }
    rnTr(rn.id, 99);
    return rn.querySelector('.rtr').innerText.replace(/\s+/g, ' ');
  });
  if (!/A program véget ért/.test(tr) || !/x 8/.test(tr)) bad('a nyomkövető nem a várt eredményt adja:', tr.slice(0, 200));
  {
    /* valódi egérkattintásokkal: a gomb nem ugrál a fókusz változásától, minden kattintás lépést jelent, a csúszka is működik */
    await page.evaluate(() => rnTr(document.querySelector('.rn').id, 0));
    const btn = page.locator('.rn .trb .btn', { hasText: 'Következő' }).first();
    const ys = [(await btn.evaluate(e => e.getBoundingClientRect().top + scrollY))];
    await page.locator('.rn textarea').first().click(); ys.push((await btn.evaluate(e => e.getBoundingClientRect().top + scrollY)));
    await btn.click(); ys.push((await btn.evaluate(e => e.getBoundingClientRect().top + scrollY)));
    await page.locator('.rn .trb .btn', { hasText: '◀' }).first().click(); ys.push((await btn.evaluate(e => e.getBoundingClientRect().top + scrollY)));
    await btn.click(); await btn.click(); ys.push((await btn.evaluate(e => e.getBoundingClientRect().top + scrollY)));
    const tn = await page.locator('.rn .tn').first().innerText();
    if (!/^3 \//.test(tn)) bad('a nyomkövető gombjai nem minden kattintásra léptek:', tn);
    if (new Set(ys.map(Math.round)).size !== 1) bad('a nyomkövető gombja elmozdul kattintás közben:', ys.join(', '));
    await page.locator('.rn .tr input[type=range]').first().fill('5');
    const tn2 = await page.locator('.rn .tn').first().innerText();
    if (!/^6 \//.test(tn2)) bad('a nyomkövető csúszkája nem léptet:', tn2);
  }
  const he = await page.evaluate(async () => {
    const rn = document.querySelector('.rn'); rn.querySelector('textarea').value = 'print(nev)'; rnSync(rn.id); rnRun(rn.id);
    for (let k = 0; k < 300; k++) { await new Promise(r => setTimeout(r, 100)); if (rn.querySelector('.rres').textContent) break; }
    return rn.querySelector('.rres').innerText;
  });
  if (!/nev/.test(he) || !/változó/.test(he)) bad('a hibamagyarázó nem ad magyar magyarázatot:', he.slice(0, 200));
  }


  /* ---------- 4b. szerkesztő: billentyűzet és telefonos gyorsbillentyűk ---------- */
  if (want('szerkeszto')) {
    section('Szerkesztő: billentyűzet, gyorsbillentyűk');
  {
    /* a Futtatás kiírja a beolvasott értéket is (mint egy konzol), az ellenőrzés viszont a valódi Python kimenetével hasonlít */
    const code = 'x = input("Neved: ")\nprint("Szia", x)';
    const [plain, echo] = await page.evaluate(async c => { const a = await pyRun(c, 'Anna'), b = await pyRun(c, 'Anna', null, true); return [a.out, b.out]; }, code);
    if (plain !== 'Neved: Szia Anna\n') bad('az ellenőrző futtatás kimenete megváltozott:', JSON.stringify(plain));
    if (echo !== 'Neved: Anna\nSzia Anna\n') bad('a Futtatás nem írja ki a beolvasott értéket új sorban:', JSON.stringify(echo));
  }
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; play(); });
    const ta = page.locator('.rn textarea').first();
    const val = () => page.evaluate(() => document.querySelector('.rn textarea').value);
    const set = async (v) => { await page.evaluate(v => { const t = document.querySelector('.rn textarea'); t.value = v; rnSync(document.querySelector('.rn').id); t.focus(); t.setSelectionRange(v.length, v.length); }, v); };
    await set('if x:'); await page.keyboard.press('Enter');
    if ((await val()) !== 'if x:\n    ') bad('az Enter nem tartja meg a behúzást:', JSON.stringify(await val()));
    await page.keyboard.type('pass'); await page.keyboard.press('Shift+Tab');
    if ((await val()) !== 'if x:\npass') bad('a Shift+Tab nem lépteti vissza a sort:', JSON.stringify(await val()));
    await page.keyboard.press('Tab');
    if ((await val()) !== 'if x:\npass    ') bad('a Tab nem ad behúzást:', JSON.stringify(await val()));
    await page.keyboard.press('Control+z');
    if ((await val()) === 'if x:\npass    ') bad('a Ctrl+Z nem vonja vissza a behúzást');
    await page.keyboard.press('Escape'); await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement.tagName === 'TEXTAREA' && document.activeElement.getAttribute('aria-label') === 'Python-kód')) bad('az Esc + Tab nem lép ki a szerkesztőből (billentyűzet-csapda)');
    await set('print');
    const qk = page.locator('.rn .qk button');
    if (!(await qk.first().isVisible())) bad('a gyorsbillentyű-sor nem látszik telefonméreten');
    await page.click('.rn .qk button[aria-label="zárójelpár"]');
    if ((await val()) !== 'print()' || (await page.evaluate(() => document.querySelector('.rn textarea').selectionStart)) !== 6) bad('a zárójelpár gomb hibás:', JSON.stringify(await val()));
    await page.evaluate(() => { const t = document.querySelector('.rn textarea'); t.value = 'x + 1'; t.setSelectionRange(0, 5); });
    await page.click('.rn .qk button[aria-label="zárójelpár"]');
    if ((await val()) !== '(x + 1)') bad('a zárójelpár gomb nem veszi körbe a kijelölést:', JSON.stringify(await val()));
    await page.evaluate(() => { const t = document.querySelector('.rn textarea'); t.value = 'a\nb'; t.setSelectionRange(0, 3); });
    await page.click('.rn .qk button[aria-label="Behúzás"]');
    if ((await val()) !== '    a\n    b') bad('a behúzás gomb több sort nem húz be:', JSON.stringify(await val()));
    await page.click('.rn .qk button[aria-label="Visszaléptetés"]');
    if ((await val()) !== 'a\nb') bad('a visszaléptetés gomb hibás:', JSON.stringify(await val()));
    await page.evaluate(() => { Y = 9; lesson(2); });
    await page.waitForTimeout(150);
    const nav = await page.evaluate(() => [document.activeElement.id, document.title]);
    if (nav[0] !== 'v' || !/Változók/.test(nav[1])) bad('oldalváltás után a fókusz vagy az oldalcím hibás:', JSON.stringify(nav));
    const hasKb = await page.evaluate(() => document.querySelector('.rn textarea').getAttribute('aria-describedby') && !!document.getElementById(document.querySelector('.rn textarea').getAttribute('aria-describedby')));
    if (!hasKb) bad('a szerkesztőhöz nincs billentyűzet-súgó');
  }

  /* ---------- 5. akadálymentesség (axe) ---------- */
  if (AXE && want('axe')) {
    section('Akadálymentesség (axe)');
    const views = [
      ['témalista', () => home()], ['lecke', () => { Y = 9; lesson(9); }], ['játszótér', () => play()],
      ['10. évfolyam lecke', () => { Y = 10; lesson(6); }], ['11. évfolyam lecke', () => { Y = 11; lesson(2); }],
      ['eredmények', () => awards()], ['érettségi lista', () => exams()], ['érettségi indítás', () => exSetup(0)], ['érettségi feladat', () => exRun(0)]
    ];
    for (const th of ['light', 'dark']) {
      for (const [name, fn] of views) {
        await page.evaluate(th => { document.documentElement.dataset.theme = th; }, th);
        await page.evaluate(`(${fn.toString()})()`);
        await page.evaluate(() => { const t = document.getElementById('toast'); t.style.transition = 'none'; t.className = ''; t.textContent = ''; });
        await page.waitForTimeout(300);
        await page.addScriptTag({ content: AXE }).catch(() => {});
        const res = await page.evaluate(async () => {
          const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
          return r.violations.map(v => v.id + ' (' + v.nodes.length + '): ' + v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' – ' + ((n.any[0] || n.all[0] || n.none[0] || {}).message || v.help).slice(0, 110)).join(' || '));
        });
        res.forEach(v => bad('axe [' + name + ', ' + th + ']', v));
      }
    }
  }

  /* ---------- 5b. reszponzív elrendezés ---------- */
  if (want('elrendezes')) {
    section('Elrendezés különböző képernyőméreteken');
    const views = [
      ['témalista', () => { Y = 9; home(); }], ['lecke', () => { Y = 10; lesson(6); }], ['kódolós lecke', () => { Y = 11; lesson(6); }],
      ['játszótér', () => play()], ['eredmények', () => awards()], ['érettségi lista', () => exams()], ['érettségi feladat', () => { exSetup(2); exRun(2); }]
    ];
    const sizes = [[1440, 900], [1180, 800], [1024, 768], [768, 1024], [390, 844]];
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      for (const [name, fn] of views) {
        await page.evaluate(`(${fn.toString()})()`);
        await page.waitForTimeout(120);
        const r = await page.evaluate(() => {
          const q = s => document.querySelector(s), cs = e => e && getComputedStyle(e);
          const lay = q('.layout'), side = q('.side'), toc = q('.toc'), sp = q('.exsplit'), grid = q('.tgrid');
          return { over: document.documentElement.scrollWidth - innerWidth,
            lay: lay ? cs(lay).display : null, side: side ? side.getBoundingClientRect().width : null, tocShown: toc ? cs(toc).display !== 'none' : null,
            split: sp ? cs(sp).display : null, cols: grid ? cs(grid).gridTemplateColumns.split(' ').length : null,
            mainW: q('#v').getBoundingClientRect().width };
        });
        const id = w + 'px, ' + name + ': ';
        if (r.over > 1) bad('elrendezés', id + 'vízszintes görgetés (' + r.over + 'px)');
        if (name === 'témalista' || name === 'lecke') {
          if (w >= 960 && (r.lay !== 'grid' || r.side < 250 || r.side > 320)) bad('elrendezés', id + 'asztali nézetben nincs oldalsáv: ' + JSON.stringify(r));
          if (w < 960 && r.lay === 'grid') bad('elrendezés', id + 'keskeny nézetben is oldalsávos: ' + JSON.stringify(r));
        }
        if (name === 'lecke' && (w >= 960) !== r.tocShown) bad('elrendezés', id + 'a témák oldalsávja ' + (r.tocShown ? 'feleslegesen látszik' : 'hiányzik'));
        if (name === 'témalista' && w >= 640 && r.cols < 2) bad('elrendezés', id + 'a témák nem két oszlopban vannak (' + r.cols + ')');
        if (name === 'témalista' && w < 640 && r.cols !== 1) bad('elrendezés', id + 'a témák telefonon nem egy oszlopban vannak (' + r.cols + ')');
        if (name === 'érettségi feladat' && (w >= 1000) !== (r.split === 'grid')) bad('elrendezés', id + 'a feladat és a szerkesztő elrendezése hibás: ' + r.split);
        if (name === 'eredmények' && r.mainW > 981) bad('elrendezés', id + 'az eredmények oldal túl széles: ' + r.mainW);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }

  if (errs.length) errs.forEach(e => bad('konzolhiba:', e));
  await browser.close(); server.close();
  console.log('\n' + (problems.length ? problems.length + ' hiba.' : 'Minden teszt sikerült.'));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
