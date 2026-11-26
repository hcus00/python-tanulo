#!/usr/bin/env python3
"""A tananyag forrásfájljaiból (tananyag/) elkészíti a js/data/*.js fájlokat.

Használat (a projekt gyökeréből):
    python3 tools/build.py            # legenerálja a js/data/*.js fájlokat
    python3 tools/build.py --check    # csak ellenőriz: a generált fájlok egyeznek-e a meglévőkkel

Csak Python 3 kell hozzá, külső csomag nem. A kódolós feladatok elvárt kimenetét, a nyomkövetési
táblázatok celláit és a „Mit ír ki?” feladatok válaszát a szkript a megoldás valódi lefuttatásával számolja.
A forrásfájlok formátumát a README.md írja le.
"""
import ast, contextlib, io, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tananyag')
OUT = os.path.join(ROOT, 'js', 'data')

MIKIIR_Q = 'Mit ír ki a program? (A kimenetet írd be.)'
TRACE_COL = 'Lépés'


class BuildError(Exception):
    pass


# ======================= a forrásfájlok olvasása =======================

def parse_fields(lines, where):
    """YAML-szerű mezők: `kulcs: érték`, `kulcs: |` + behúzott sorok, `kulcs:` + `- elem` sorok.
    Az eredmény: {kulcs: str | [str]}"""
    f = {}
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        if not ln.strip():
            i += 1
            continue
        m = re.match(r'^([a-z0-9_]+):(?: (.*))?$', ln)
        if not m:
            raise BuildError('%s: értelmezhetetlen sor: %r' % (where, ln))
        key, val = m.group(1), m.group(2)
        i += 1
        if val is not None and val.strip() == '|':
            blk = []
            while i < n and (lines[i] == '' or lines[i].startswith('  ')):
                blk.append(lines[i][2:])
                i += 1
            while blk and blk[-1] == '':
                blk.pop()
            f[key] = '\n'.join(blk)
        elif val is None:
            items = []
            while i < n and (lines[i] == '' or lines[i].startswith('-') or lines[i].startswith('  ')):
                if lines[i] == '':
                    i += 1
                    continue
                if not lines[i].startswith('-'):
                    raise BuildError('%s: a listaelem után behúzott sor csak „- |” blokkban lehet: %r' % (where, lines[i]))
                it = lines[i][1:].lstrip(' ') if lines[i] != '-' else ''
                i += 1
                if it.strip() == '|':
                    blk = []
                    while i < n and (lines[i] == '' or lines[i].startswith('    ')):
                        blk.append(lines[i][4:])
                        i += 1
                    while blk and blk[-1] == '':
                        blk.pop()
                    it = '\n'.join(blk)
                items.append(it)
            f[key] = items
        else:
            f[key] = val
    return f


def parse_topic(text, where):
    lines = text.replace('\r', '').split('\n')
    k = 0
    while k < len(lines) and not lines[k].strip():
        k += 1
    if k >= len(lines) or not lines[k].startswith('# '):
        raise BuildError('%s: az első sor „# Téma címe” legyen' % where)
    title = lines[k][2:].strip()
    k += 1
    sections, tasks = [], []
    cur = None          # (title, [lines])
    ctask = None        # (kind, [lines])
    fence = False
    for ln in lines[k:]:
        if ctask is not None:
            if ln.startswith('### '):
                tasks.append(ctask)
                ctask = (ln[4:].strip(), [])
            else:
                ctask[1].append(ln)
            continue
        if not fence and ln.startswith('### '):
            if cur: sections.append(cur)
            cur = None
            ctask = (ln[4:].strip(), [])
            continue
        if ln.startswith('```'):
            fence = not fence
        if not fence and ln.startswith('## '):
            if cur: sections.append(cur)
            cur = (ln[3:].strip(), [])
            continue
        if cur is not None:
            cur[1].append(ln)
        elif ln.strip():
            raise BuildError('%s: szakaszon kívüli sor: %r' % (where, ln))
    if cur: sections.append(cur)
    if ctask is not None: tasks.append(ctask)
    return title, [parse_section(s, where) for s in sections], [(kind, parse_fields(ls, where + ' / ' + kind)) for kind, ls in tasks]


def parse_section(sec, where):
    title, lines = sec
    text, code, diag = [], None, None
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith('```'):
            blk = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                blk.append(lines[i])
                i += 1
            if code is not None:
                raise BuildError('%s: a(z) „%s” szakaszban két kódblokk van' % (where, title))
            code = '\n'.join(blk)
        elif ln.startswith('@abra '):
            diag = ln[6:].strip()
        else:
            text.append(ln)
        i += 1
    s = '\n'.join(text).strip('\n')
    out = [title, s]
    if code is not None or diag is not None:
        out.append(code or '')
    if diag is not None:
        out.append(diag)
    return out


# ======================= Python-futtatás =======================

INPUT_PRE = (
    'import sys as _s\n'
    '_L = _s.stdin.read().split("\\n")[:-1]\n'
    '_i = [0]\n'
    'def input(p=""):\n'
    '    if _i[0] >= len(_L):\n'
    '        raise EOFError("nincs több bemenet")\n'
    '    v = _L[_i[0]]; _i[0] += 1\n'
    '    if _DISP:\n'
    '        _s.stdout.write(str(p) + v + "\\n")\n'
    '    return v\n'
)


def run_try(code, stdin, seed=None, timeout=2, disp=False):
    """A megoldás futtatása. Az input() kérdése nem kerül a kimenetbe (disp=True: a kérdés és a beírt érték is, mint a konzolon)."""
    pre = 'import random\nrandom.seed(%d)\n' % seed if seed is not None else ''
    pre += '_DISP = %s\n' % disp + INPUT_PRE
    try:
        r = subprocess.run([sys.executable, '-I', '-c', pre + code], input=stdin + '\n',
                           capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None, 'timeout'
    return (r.stdout if r.returncode == 0 else None), r.stderr


def run_sol(code, stdin, seed=None, disp=False):
    out, err = run_try(code, stdin, seed, 5, disp)
    if out is None:
        raise BuildError('a megoldás hibás:\n%s\n--- bemenet: %r\n%s' % (code, stdin, err))
    return out


def norm(o):
    L = [x.rstrip() for x in o.replace('\r', '').split('\n')]
    while L and L[-1] == '':
        L.pop()
    return '\n'.join(L)


def apply_pre(code, pre):
    if not pre:
        return code
    return pre + '\n' + '\n'.join(code.split('\n')[len(pre.split('\n')):])


def parse_tests(items, where):
    """`- stdin || pre: adatsorok || seed: 3` (a \\n sortörés)"""
    T = []
    for it in items:
        parts = re.split(r'\s*\|\|\s*', it) if '||' in it else [it]
        t = {'i': parts[0].replace('\\n', '\n')}
        for p in parts[1:]:
            m = re.match(r'^(pre|seed):\s*(.*)$', p)
            if not m:
                raise BuildError('%s: ismeretlen tesztmező: %r' % (where, p))
            if m.group(1) == 'pre':
                t['pre'] = m.group(2).replace('\\n', '\n')
            else:
                t['seed'] = int(m.group(2))
        T.append(t)
    return T


def make_ts(sol, tests):
    ts = []
    for t in tests:
        pre, seed = t.get('pre'), t.get('seed')
        out = norm(run_sol(apply_pre(sol, pre), t['i'], seed))
        e = [t['i'], out]
        if pre or seed is not None:
            e.append(pre or '')
        if seed is not None:
            e.append(seed)
        ts.append(e)
    return ts


def rp(v):
    if isinstance(v, str): return '"' + v + '"'
    if isinstance(v, list): return '[' + ', '.join(rp(x) for x in v) + ']'
    return str(v)


def trace_rows(code, at, names):
    rows = []

    def tracer(frame, ev, arg):
        if frame.f_code.co_filename != '<tr>': return None
        if ev == 'line' and frame.f_lineno == at:
            rows.append([rp(frame.f_globals[v]) for v in names])
        return tracer
    g = {'__name__': 'tr'}
    sys.settrace(tracer)
    try:
        exec(compile(code, '<tr>', 'exec'), g)
    finally:
        sys.settrace(None)
    return rows


# ======================= feladatok =======================

def need(f, keys, where):
    for k in keys:
        if k not in f:
            raise BuildError('%s: hiányzik a(z) „%s” mező' % (where, k))


def as_int(v, where):
    try:
        return int(v)
    except Exception:
        raise BuildError('%s: számot vártam, ez van: %r' % (where, v))


def build_task(kind, f, where):
    t = {}

    def copy(src, dst):
        if src in f: t[dst] = f[src]

    if kind in ('teszt', 'abrakod'):
        need(f, ['kerdes', 'valaszok', 'jo'], where)
        copy('kerdes', 'q'); copy('abra', 'g'); copy('kod', 'c')
        t['o'] = f['valaszok']; t['a'] = as_int(f['jo'], where); copy('magyarazat', 'e')
        if not 0 <= t['a'] < len(t['o']):
            raise BuildError('%s: a „jo” érték nincs a válaszok között' % where)
        if kind == 'abrakod':
            if 'abra' not in f: raise BuildError('%s: az ábra–kód feladathoz kell „abra”' % where)
            t['oc'] = 1
    elif kind == 'beiros':
        need(f, ['kerdes', 'elfogad'], where)
        copy('kerdes', 'q'); copy('abra', 'g'); copy('kod', 'c'); t['i'] = f['elfogad']; copy('segitseg', 'h')
    elif kind in ('kod', 'hiba'):
        need(f, ['kerdes', 'kezdokod', 'megoldas', 'tesztek'], where)
        sol, tests = f['megoldas'], parse_tests(f['tesztek'], where)
        ts = make_ts(sol, tests)
        if kind == 'hiba':
            fails = 0
            for tt in tests:
                want = norm(run_sol(apply_pre(sol, tt.get('pre')), tt['i'], tt.get('seed')))
                got, _ = run_try(apply_pre(f['kezdokod'], tt.get('pre')), tt['i'], tt.get('seed'), 1)
                if got is None or norm(got) != want: fails += 1
            if not fails:
                raise BuildError('%s: a hibás kód minden teszten átmegy, ez nem hibakereső feladat' % where)
        copy('kerdes', 'q'); t['k'] = 1; t['st'] = f['kezdokod'] + '\n'; t['ts'] = ts; t['m'] = sol; copy('segitseg', 'h')
        if kind == 'hiba': t['bug'] = 1
    elif kind == 'sorrend':
        need(f, ['kerdes', 'sorok'], where)
        copy('kerdes', 'q'); t['pz'] = f['sorok'].split('\n'); copy('segitseg', 'h')
        if 'tesztek' in f:
            t['ts'] = make_ts(f['sorok'], parse_tests(f['tesztek'], where))
    elif kind == 'nyomkovetes':
        need(f, ['kerdes', 'kod', 'sor', 'valtozok'], where)
        names = [x.strip() for x in f['valtozok'].split(',')]
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rows = trace_rows(f['kod'], as_int(f['sor'], where), names)
        if not 3 <= len(rows) <= 9:
            raise BuildError('%s: a nyomkövetési táblázat %d soros, 3 és 9 között jó' % (where, len(rows)))
        hid = [[r, c] for r in range(1, len(rows)) for c in range(len(names))]
        copy('kerdes', 'q'); t['c'] = f['kod']; t['tr'] = {'h': TRACE_COL, 'cols': names, 'rows': rows, 'hid': hid}
        copy('segitseg', 'h')
    elif kind == 'mikiir':
        need(f, ['kod'], where)
        out = norm(run_sol(f['kod'], ''))
        if not out or '\n' in out:
            raise BuildError('%s: a „Mit ír ki?” program kimenete egyetlen, nem üres sor legyen: %r' % (where, out))
        t['q'] = f.get('kerdes', MIKIIR_Q); t['c'] = f['kod']; t['i'] = [out]; copy('segitseg', 'h')
    else:
        raise BuildError('%s: ismeretlen feladattípus: %s' % (where, kind))
    return t


# ======================= érettségi feladatsorok =======================

def data_cols(src, where):
    """Az „adat” (vagy a teszt „pre”) sorai: `nev = [elemek]` értékadások -> oszlopok listája (egész vagy szöveg elemekkel)."""
    cols = []
    try:
        tree = ast.parse(src)
    except SyntaxError as e:
        raise BuildError('%s: az adat nem értelmezhető: %s' % (where, e))
    for n in tree.body:
        if not (isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name)):
            raise BuildError('%s: az adat sorai „változó = [elemek]” alakúak legyenek' % where)
        v = ast.literal_eval(n.value)
        if not isinstance(v, list) or not v or not all(isinstance(x, (int, str)) and not isinstance(x, bool) for x in v):
            raise BuildError('%s: az adat minden eleme egész szám vagy szöveg legyen, és ne legyen üres' % where)
        cols.append(v)
    return cols


def build_exam(path, num, group='e'):
    where = os.path.relpath(path, ROOT)
    text = open(path, encoding='utf-8').read().replace('\r', '')
    lines = text.split('\n')
    k = 0
    while not lines[k].strip(): k += 1
    if not lines[k].startswith('# '):
        raise BuildError('%s: az első sor „# Cím” legyen' % where)
    title = lines[k][2:].strip()
    f = parse_fields(lines[k + 1:], where)
    need(f, ['ido', 'leiras', 'megoldas', 'reszek', 'tesztek'], where)
    sol = f['megoldas']
    adat = f.get('adat', '')
    if not sol.startswith(adat):
        raise BuildError('%s: a megoldás az „adat” sorokkal kezdődjön' % where)
    cols = data_cols(adat, where) if adat else []
    labels = f.get('cimkek', [])
    if len(labels) != len(cols):
        raise BuildError('%s: a „cimkek” mezőben annyi elem legyen, ahány oszlop (értékadás) van az „adat”-ban (%d)' % (where, len(cols)))
    FORBID = re.compile(r'random|randint|input\(|\blist[aáeáoö]|\bimport\b|\bprint\(|\blen\(|\bint\(|\bstr\(|\bsplit\(|\brange\(|\bappend\(', re.I)
    for tx in [f['leiras']] + list(f['reszek']):
        m = FORBID.search(re.sub(r'<code>\s*(\d+\. feladat)\s*</code>', '', tx))
        if m:
            raise BuildError('%s: a feladat szövege nem említhet konkrét Python-utasítást vagy adatszerkezetet (%r)' % (where, m.group(0)))
    parts = []
    for n, it in enumerate(f['reszek'], 1):
        m = re.match(r'^(\d+)\s*\|\|\s*(.*)$', it, re.S)
        if not m: raise BuildError('%s: a részfeladat „pont || szöveg” alakú legyen: %r' % (where, it))
        parts.append({'n': n, 'p': int(m.group(1)), 't': m.group(2)})
    # kérdések (az input() felirata): „részfeladat || a felirat szövege”; a „kerdes” szempont ellenőrzi
    for it in f.get('kerdesek', []):
        m = re.match(r'^(\d+)\s*\|\|\s*(.+)$', it, re.S)
        if not m or not any(p['n'] == int(m.group(1)) for p in parts):
            raise BuildError('%s: a kérdés „részfeladat || szöveg” alakú legyen: %r' % (where, it))
        [p for p in parts if p['n'] == int(m.group(1))][0]['q'] = m.group(2).strip()
    # pontozási szempontok (logikai egységek): „részfeladat || pont || kulcs || megnevezés”; a 0. „részfeladat” az általános szempontoké
    crit = {p['n']: [] for p in parts}
    crit[0] = []
    KEY = re.compile(r'^(blokk|sor[1-9]|szam[1-9]|felirat):(minta|rejtett|mind)$')
    for it in f.get('pontozas', []):
        m = re.match(r'^(\d+)\s*\|\|\s*(\d+)\s*\|\|\s*([a-z0-9:]+)\s*\|\|\s*(.+)$', it, re.S)
        if not m or int(m.group(1)) not in crit:
            raise BuildError('%s: a pontozási szempont „részfeladat || pont || kulcs || megnevezés” alakú legyen: %r' % (where, it))
        n0, key = int(m.group(1)), m.group(3)
        if key in ('minta', 'rejtett', 'mind'): key = 'blokk:' + key
        if n0 == 0:
            if key not in ('fut', 'fejlec'):
                raise BuildError('%s: az általános (0.) szempont kulcsa fut vagy fejlec lehet: %r' % (where, key))
        elif key not in ('adat', 'kerdes') and not KEY.match(key):
            raise BuildError('%s: ismeretlen pontozási kulcs: %r (adat, kerdes, minta, rejtett, mind, blokk/sorK/szamK/felirat:minta|rejtett|mind)' % (where, key))
        if key == 'adat' and not cols:
            raise BuildError('%s: „adat” szempont csak adatot megadó feladatsorban lehet' % where)
        if key == 'kerdes' and 'q' not in [p for p in parts if p['n'] == n0][0]:
            raise BuildError('%s: „kerdes” szempont csak a „kerdesek” mezőben szereplő részfeladathoz lehet (%d.)' % (where, n0))
        crit[n0].append({'p': int(m.group(2)), 'k': key, 't': m.group(4).strip()})
    gen = None
    if crit[0]:
        gen = {'p': sum(c['p'] for c in crit[0]), 'k': crit[0]}
    for p in parts:
        cs = crit[p['n']]
        if not cs:   # alapértelmezés: a mintára, majd más adatokra helyes kimenet
            if p['p'] == 1:
                cs.append({'p': 1, 'k': 'blokk:mind', 't': 'A kimenet helyes minden adatra'})
            else:
                a = (p['p'] + 1) // 2
                cs.append({'p': a, 'k': 'blokk:minta', 't': 'A mintaadatokra helyes a kimenet'})
                cs.append({'p': p['p'] - a, 'k': 'blokk:rejtett', 't': 'Más adatokra és bemenetre is helyes'})
        if sum(c['p'] for c in cs) != p['p']:
            raise BuildError('%s: a(z) %d. részfeladat szempontjainak pontjai (%d) nem adják ki a részfeladat pontját (%d)' % (where, p['n'], sum(c['p'] for c in cs), p['p']))
        p['k'] = cs
        p['h'] = 1 if any(c['k'] not in ('adat', 'kerdes') for c in cs) else 0
    total = sum(p['p'] for p in parts) + (gen['p'] if gen else 0)
    if total != 15:
        raise BuildError('%s: a részfeladatok és az általános szempontok pontjai együtt 15-öt tegyenek ki (most: %d)' % (where, total))
    tests = parse_tests(f['tesztek'], where)
    ts = []
    for t in tests:
        pre, seed = t.get('pre'), t.get('seed')
        hc = 0
        if pre:
            if not adat or len(pre.split('\n')) != len(adat.split('\n')):
                raise BuildError('%s: a teszt adatsorainak száma egyezzen az „adat” sorok számával' % where)
            hc = data_cols(pre, where)
            if [len(c) for c in hc] and len(hc) != len(cols):
                raise BuildError('%s: a teszt adatai más számú oszlopból állnak' % where)
        out = norm(run_sol(apply_pre(sol, pre), t['i'], seed))
        ts.append([t['i'], out, hc, seed])
    heads = {int(h) for h in re.findall(r'^(\d+)\. feladat$', ts[0][1], re.M)}
    if heads != {p['n'] for p in parts if p['h']}:
        raise BuildError('%s: a mintamegoldás minden, kimenettel értékelt részfeladat előtt írja ki az „N. feladat” fejlécet (talált: %s)' % (where, sorted(heads)))
    if any(c['k'].endswith(':rejtett') for p in parts for c in p['k']) and len(ts) < 2:
        raise BuildError('%s: „rejtett” szemponthoz legalább két teszt kell' % where)
    NUM = re.compile(r'-?\d+(?:[.,]\d+)?')
    for t in ts:
        B = {}
        cur = None
        for ln in t[1].split('\n'):
            mm = re.match(r'^(\d+)\. feladat$', ln)
            if mm: cur = int(mm.group(1)); B[cur] = []
            elif cur is not None and ln.strip(): B[cur].append(ln)
        for p in parts:
            for c in p['k']:
                mm = re.match(r'^sor(\d):', c['k'])
                if mm and len(B.get(p['n'], [])) < int(mm.group(1)):
                    raise BuildError('%s: a(z) %d. részfeladat kimenete az egyik tesztben rövidebb, mint a(z) %s szempont sora' % (where, p['n'], c['k']))
                mm = re.match(r'^szam(\d):', c['k'])
                if mm and len(NUM.findall(' '.join(B.get(p['n'], [])))) < int(mm.group(1)):
                    raise BuildError('%s: a(z) %d. részfeladat kimenetében az egyik tesztben kevesebb szám van, mint a(z) %s szempont sorszáma' % (where, p['n'], c['k']))
    sm = norm(run_sol(sol, tests[0]['i'], tests[0].get('seed'), True))
    for p in parts:
        if 'q' in p and p['q'].lower() not in sm.lower():
            raise BuildError('%s: a megoldás kérdései között nincs ez: %r (a minta kimenetében sem szerepel)' % (where, p['q']))
    for t in ts:
        if {int(h) for h in re.findall(r'^(\d+)\. feladat$', t[1], re.M)} != heads:
            raise BuildError('%s: a tesztek kimenetében nem ugyanazok a „N. feladat” fejlécek szerepelnek' % where)
    st = f.get('kezdokod')
    if st is None:
        st = '# A megoldásod ide kerül\n'
    r = {'id': '%02d' % num, 'g': group, 'n': title, 't': as_int(f['ido'], where), 'd': f['leiras'], 'c': cols, 'cl': labels, 'st': st,
         'parts': parts, 'ts': ts, 'm': sol}
    if gen: r['gen'] = gen
    if sm != ts[0][1]: r['sm'] = sm
    return r


# ======================= kiírás =======================

def js_str(x):
    return "'" + x.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"


def js_val(v):
    if isinstance(v, str): return js_str(v)
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, int): return str(v)
    if isinstance(v, list): return '[' + ','.join(js_val(x) for x in v) + ']'
    if isinstance(v, dict): return '{' + ','.join(k + ':' + js_val(x) for k, x in v.items()) + '}'
    raise TypeError(v)


TASK_KEYS = ['q', 'g', 'c', 'o', 'a', 'e', 'i', 'h', 'k', 'st', 'ts', 'm', 'bug', 'pz', 'tr', 'oc']


def js_task(t):
    return '{' + ','.join(k + ':' + js_val(t[k]) for k in TASK_KEYS if k in t) + '}'


def js_sec(s):
    parts = [js_str(s[0]), js_str(s[1])]
    if len(s) > 2 and (s[2] or len(s) > 3): parts.append(js_str(s[2] or ''))
    if len(s) > 3: parts.append(js_str(s[3]))
    return '[' + ','.join(parts) + ']'


HEADER = ('/* GENERÁLT FÁJL – ne ezt szerkeszd! A forrás: tananyag/%s/ (lásd a README.md-t), újragenerálás: python3 tools/build.py\n'
          ' * %s. évfolyam tananyaga.\n'
          ' * Egy téma: R["%s-<sorszám>"] = {n: cím, s: [szakaszok], t: [feladatok]}\n'
          ' * Szakasz: [cím, szöveg, kód (elhagyható), ábra-kulcs (elhagyható)]\n'
          ' * Feladat: {q, g (ábra), c (kód), o (válaszok), a (jó válasz indexe), e (magyarázat), i (elfogadott beírt válaszok), h (segítség)} */')


def grade_files():
    res = {}
    for g in ['9', '10', '11']:
        d = os.path.join(SRC, g)
        if not os.path.isdir(d):
            raise BuildError('hiányzik a mappa: ' + d)
        files = sorted(x for x in os.listdir(d) if x.endswith('.txt'))
        lines = [HEADER % (g, g, g)]
        for idx, fn in enumerate(files):
            m = re.match(r'^(\d+)-', fn)
            if not m or int(m.group(1)) != idx:
                raise BuildError('%s/%s: a fájlnevek 00-, 01-, 02- … sorszámmal kezdődjenek, hézag nélkül' % (g, fn))
            where = g + '/' + fn
            title, secs, tasks = parse_topic(open(os.path.join(d, fn), encoding='utf-8').read(), where)
            T = [build_task(kind, f, '%s %d. feladat (%s)' % (where, i + 1, kind)) for i, (kind, f) in enumerate(tasks)]
            lines.append('R[' + js_str(g + '-' + str(idx)) + ']={n:' + js_str(title) + ',\ns:[')
            lines.append(',\n'.join(js_sec(s) for s in secs) + '],\nt:[')
            lines.append(',\n'.join(js_task(t) for t in T) + ']};')
        res['grade' + g + '.js'] = '\n'.join(lines) + '\n'
    return res


def exam_file():
    L = []
    for sub, group in (('', 'e'), ('hosszu', 'h')):
        d = os.path.join(SRC, 'erettsegi', sub)
        if not os.path.isdir(d): continue
        for fn in sorted(x for x in os.listdir(d) if x.endswith('.txt')):
            m = re.match(r'^(\d+)-', fn)
            if not m: raise BuildError('erettsegi/%s: a fájlnév sorszámmal kezdődjön' % fn)
            L.append(build_exam(os.path.join(d, fn), int(m.group(1)), group))
    ids = [e['id'] for e in L]
    if len(set(ids)) != len(ids):
        raise BuildError('erettsegi: két feladatsor azonosítója (a fájlnév sorszáma) megegyezik: %s' % ids)
    out = ['/* GENERÁLT FÁJL – ne ezt szerkeszd! A forrás: tananyag/erettsegi/, újragenerálás: python3 tools/build.py\n'
           ' * Érettségi feladatsorok: {id, g (e: érettségi típusú, h: hosszabb gyakorló), n (cím), t (perc), d (leírás), c (a feladatban megadott adatok oszlopai), cl (az oszlopok címkéi), st (kezdőkód), parts: [{n, p (pont, csak beadás után látszik), t (szöveg), h (van-e kimenete), k: [{p, k (kulcs), t}] (pontozási szempontok)}],\n'
           ' * ts: [[bemenet, várt kimenet, adat-oszlopok (a rejtett tesztekben, különben 0), seed (vagy null)]], m (mintamegoldás)} */',
           'var EX=[']
    out.append(',\n'.join(js_val(e) for e in L))
    out.append('];')
    return {'erettsegi.js': '\n'.join(out) + '\n'}


def main():
    check = '--check' in sys.argv
    try:
        files = grade_files()
        files.update(exam_file())
    except BuildError as e:
        print('HIBA:', e)
        return 1
    bad = 0
    for name, content in files.items():
        p = os.path.join(OUT, name)
        if check:
            cur = open(p, encoding='utf-8').read() if os.path.exists(p) else None
            if cur != content:
                print('ELTÉRÉS: js/data/%s nem egyezik a forrásfájlokkal; futtasd: python3 tools/build.py' % name)
                bad += 1
        else:
            os.makedirs(OUT, exist_ok=True)
            open(p, 'w', encoding='utf-8').write(content)
    if check:
        print('rendben' if not bad else 'hibák: %d' % bad)
        return 1 if bad else 0
    print('kész:', ', '.join(sorted(files)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
