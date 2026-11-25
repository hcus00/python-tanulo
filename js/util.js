/* Közös segédfüggvények: a tananyag tárolója, szövegkezelés, kódszínezés. */
var R = {};   /* a leckék: js/data/grade*.js tölti fel */

var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };

/* A kódban az aposztróf helyett mindig kettős idézőjelet használunk. */
var dq = function (c) { return c.split("\n").map(function (l) { return /<class|Error:/.test(l) ? l : l.replace(/'/g, '"'); }).join("\n"); };
var dp = function (p) { return p.replace(/<code>([^<]*)<\/code>/g, function (m, x) { return "<code>" + x.replace(/'/g, '"') + "</code>"; }); };

/* Python-kód színezése (kulcsszavak, szövegek, számok, megjegyzések, függvények). */
var hl = function (c) {
  if (/^(START|\d\.|Be:|\w*Error:|Mintakimenet)/m.test(c)) return esc(c);
  return c.replace(/(#.*$)|(f?"(?:[^"\\\n]|\\.)*"?)|(\b\d+(?:\.\d+)?\b)|(\b(?:if|elif|else|for|while|in|and|or|not|import|True|False|break|del)\b)|(\b(?:print|input|int|float|str|len|range|abs|round|min|max|sum|type|randint|sorted|list|ord|chr|bool)\b)|([^#"\d\w]+|\w+)/gm,
    function (m, a, b, d, k, f) {
      var e = esc(m);
      return a ? '<span class="c">' + e + "</span>" : b ? '<span class="s">' + e + "</span>" : d ? '<span class="n">' + e + "</span>" : k ? '<span class="k">' + e + "</span>" : f ? '<span class="f">' + e + "</span>" : e;
    });
};

/* Szöveg -> HTML: "- " felsorolás, "1. " számozott lista, egyébként bekezdés. */
var dl = function (p) {
  var o = [], m = "";
  dp(p).split("\n").forEach(function (l) {
    var u = /^- /.test(l) ? "ul" : /^\d+\. /.test(l) ? "ol" : "";
    if (u !== m) { if (m) o.push("</" + m + ">"); if (u) o.push("<" + u + ">"); m = u; }
    o.push(u ? "<li>" + l.replace(/^(- |\d+\. )/, "") + "</li>" : "<p>" + l + "</p>");
  });
  if (m) o.push("</" + m + ">");
  return o.join("");
};
