// public/js/family-tree.js — CALEDONIA · rodinný strom a síť vztahů
//
// Samostatný soubor bez závislostí; načítá ho stránka Hierarchie.
// window.FamilyViz.render(container, relations, mode)  mode: 'tree' | 'network'
//
// Typy vztahů (a = první osoba, b = druhá):
//   rodic      a je rodič b            (základ stromu)
//   partner    a a b jsou partneři     (základ stromu)
//   sourozenec a a b jsou sourozenci   (základ stromu)
//   stryc      a je strýc/teta b       (satelit, pokud nejde odvodit z rodičů)
//   kmotr      a je kmotr/kmotra b     (satelit)
//   znamy      rodinný známý           (satelit)
//   rodina     jiná rodinná vazba      (oblouk)
//   mentor / spojenec / rival          (jen v „Síti vztahů“)
//
// Příbuzenství (strýc/teta, neteř/synovec, bratranec, švagr, zeť/snacha, tchán…)
// se NEZADÁVÁ ručně — po kliknutí na osobu ve stromu se spočítá z rodičů,
// partnerů a sourozenců, tak jak rodina opravdu funguje.
(function () {
  'use strict';

  var STRUCT = { rodic: 1, partner: 1, sourozenec: 1 };
  var SAT = { stryc: 1, kmotr: 1, znamy: 1 };

  var NODE_W = 214, NODE_H = 64, GAP_X = 44, PARTNER_GAP = 34, GAP_Y = 112, GUTTER = 70, TOP = 56, MARGIN = 46;

  var COLORS = {
    rodic: '#d4a95a', partner: '#e0627a', sourozenec: '#7fb0d6', rodina: '#a89c84',
    stryc: '#d99a63', kmotr: '#e6c75e', znamy: '#8f95a3',
    mentor: '#79c25c', spojenec: '#5fb8a4', rival: '#c75252'
  };
  var LABELS = {
    rodic: 'Rodič → dítě', partner: 'Partneři', sourozenec: 'Sourozenci', rodina: 'Jiná rodinná vazba',
    stryc: 'Strýc / teta', kmotr: 'Kmotr', znamy: 'Rodinný známý',
    mentor: 'Mentor → chráněnec', spojenec: 'Spojenci', rival: 'Rivalové'
  };
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function keyOf(n) { return String(n || '').trim().toLowerCase(); }
  function push(arr, v) { if (arr.indexOf(v) < 0) arr.push(v); }

  function wrapName(name) {
    name = String(name || '').trim();
    if (name.length <= 19) return [name];
    var w = name.split(/\s+/), best = null, bd = 1e9;
    for (var i = 1; i < w.length; i++) {
      var a = w.slice(0, i).join(' '), b = w.slice(i).join(' ');
      var d = Math.abs(a.length - b.length);
      if (d < bd) { bd = d; best = [a, b]; }
    }
    if (!best) best = [name.slice(0, 18) + '…'];
    return best.map(function (l) { return l.length > 22 ? l.slice(0, 21) + '…' : l; });
  }
  function initials(name) {
    var w = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    if (w.length === 1) return w[0].charAt(0).toUpperCase();
    return (w[0].charAt(0) + w[w.length - 1].charAt(0)).toUpperCase();
  }
  function bez(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    };
  }

  // ───────────────────────── MODEL ─────────────────────────
  function buildModel(relations) {
    var people = {}, sats = [];
    function P(name) {
      var k = keyOf(name);
      if (!people[k]) people[k] = { key: k, name: String(name).trim(), parents: [], children: [], partners: [], siblings: [], rodina: [] };
      return people[k];
    }
    relations.forEach(function (r) {
      var ka = keyOf(r.a), kb = keyOf(r.b);
      if (!ka || !kb || ka === kb) return;
      var t = r.typ;
      if (!STRUCT[t] && !SAT[t] && t !== 'rodina') return;
      var a = P(r.a), b = P(r.b);
      if (t === 'rodic') { push(a.children, kb); push(b.parents, ka); }
      else if (t === 'partner') { push(a.partners, kb); push(b.partners, ka); }
      else if (t === 'sourozenec') { push(a.siblings, kb); push(b.siblings, ka); }
      else if (t === 'rodina') { push(a.rodina, kb); push(b.rodina, ka); }
      else sats.push({ typ: t, from: ka, to: kb, note: r.note || '' });
    });
    return { people: people, sats: sats };
  }

  // ───────────────────── PŘÍBUZENSKÝ MOTOR ─────────────────────
  function makeKinship(model) {
    var people = model.people;
    var keys = Object.keys(people);

    // clustery sourozenců (explicitní vazby) — sdílejí „efektivní“ rodiče
    var uf = {};
    keys.forEach(function (k) { uf[k] = k; });
    function find(x) { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; }
    keys.forEach(function (k) { people[k].siblings.forEach(function (o) { var a = find(k), b = find(o); if (a !== b) uf[a] = b; }); });
    var clusterParents = {}, clusterSize = {};
    keys.forEach(function (k) {
      var r = find(k);
      clusterSize[r] = (clusterSize[r] || 0) + 1;
      (clusterParents[r] = clusterParents[r] || []);
      people[k].parents.forEach(function (p) { push(clusterParents[r], p); });
    });
    function effParents(k) {
      var r = find(k), cp = clusterParents[r];
      if (cp.length) return cp;
      return clusterSize[r] > 1 ? ['§virt:' + r] : [];
    }
    var ancCache = {};
    function anc(k) {
      if (ancCache[k]) return ancCache[k];
      var m = {}; m[k] = 0;
      var q = [k];
      while (q.length) {
        var c = q.shift();
        var ps = c.indexOf('§virt:') === 0 ? [] : effParents(c);
        ps.forEach(function (p) { if (m[p] == null || m[p] > m[c] + 1) { m[p] = m[c] + 1; q.push(p); } });
      }
      return (ancCache[k] = m);
    }
    function blood(P, S) {
      var a = anc(P), b = anc(S), best = null;
      Object.keys(a).forEach(function (c) {
        if (b[c] == null) return;
        var sum = a[c] + b[c];
        if (!best || sum < best.sum) best = { da: a[c], db: b[c], sum: sum };
      });
      if (!best) return null;
      var da = best.da, db = best.db;
      if (da === 0 && db === 0) return null;
      if (da === 0) return ['', 'rodič', 'prarodič', 'praprarodič'][db] || 'předek';
      if (db === 0) return ['', 'dítě', 'vnouče', 'pravnouče'][da] || 'potomek';
      if (da === 1 && db === 1) return 'sourozenec';
      if (da === 1 && db === 2) return 'strýc/teta';
      if (da === 2 && db === 1) return 'neteř/synovec';
      if (da === 2 && db === 2) return 'bratranec/sestřenice';
      if (da === 1 && db === 3) return 'prastrýc/prateta';
      if (da === 3 && db === 1) return 'praneteř/prasynovec';
      if (da === 2 && db === 3) return 'strýc/teta z druhé linie';
      if (da === 3 && db === 2) return 'synovec/neteř z druhé linie';
      if (da === 3 && db === 3) return 'druhý bratranec/sestřenice';
      return 'vzdálený příbuzný';
    }
    // P je ___ osoby S
    function label(P, S) {
      if (P === S) return null;
      var i, s, k, bb;
      for (i = 0; i < model.sats.length; i++) {
        s = model.sats[i];
        if (s.from === P && s.to === S) return s.typ === 'stryc' ? 'strýc/teta' : s.typ === 'kmotr' ? 'kmotr/kmotra' : 'rodinný známý';
        if (s.from === S && s.to === P) return s.typ === 'stryc' ? 'neteř/synovec' : s.typ === 'kmotr' ? 'kmotřenec' : 'rodinný známý';
      }
      if (people[P].partners.indexOf(S) >= 0) return 'partner/manžel(ka)';
      var b = blood(P, S);
      if (b) return b;
      if (people[P].rodina.indexOf(S) >= 0) return 'příbuzný';
      var ps = people[P].partners;
      for (i = 0; i < ps.length; i++) {
        bb = blood(ps[i], S);
        if (!bb) continue;
        if (bb === 'sourozenec') return 'švagr/švagrová';
        if (bb === 'dítě') return 'zeť/snacha';
        if (bb === 'rodič') return 'partner rodiče';
        if (bb === 'strýc/teta') return 'strýc/teta sňatkem';
        if (bb === 'neteř/synovec') return 'neteř/synovec sňatkem';
        return 'příbuzný sňatkem';
      }
      var ss = people[S].partners;
      for (k = 0; k < ss.length; k++) {
        bb = blood(P, ss[k]);
        if (!bb) continue;
        if (bb === 'rodič') return 'tchán/tchyně';
        if (bb === 'sourozenec') return 'švagr/švagrová';
        if (bb === 'dítě') return 'nevlastní dítě';
        if (bb === 'strýc/teta') return 'strýc/teta partnera';
        return 'příbuzný sňatkem';
      }
      return null;
    }
    return { label: label };
  }

  // ───────────────────────── ROZLOŽENÍ ─────────────────────────
  function layout(model) {
    var people = model.people, keys = Object.keys(people);
    var structured = keys.filter(function (k) {
      var p = people[k]; return p.parents.length || p.children.length || p.partners.length || p.siblings.length;
    });
    var gen = {};
    structured.forEach(function (k) { gen[k] = 0; });
    var limit = structured.length + 3;
    for (var pass = 0; pass < limit; pass++) {
      var changed = false;
      structured.forEach(function (k) {
        var p = people[k];
        p.children.forEach(function (c) { if (gen[c] < gen[k] + 1 && gen[k] + 1 <= structured.length) { gen[c] = gen[k] + 1; changed = true; } });
        p.partners.concat(p.siblings).forEach(function (o) { if (gen[o] < gen[k]) { gen[o] = gen[k]; changed = true; } });
      });
      if (!changed) break;
    }

    // „plovoucí“ osoby (jen satelitní nebo „rodina“ vazby) — generace z kotvy
    var floaters = keys.filter(function (k) { return gen[k] == null; });
    var anchorOf = {};
    var guard = floaters.length + 2;
    if (!structured.length && floaters.length) { gen[floaters[0]] = 0; }
    while (guard-- > 0) {
      var progress = false;
      floaters.forEach(function (k) {
        if (gen[k] != null) return;
        var hit = null;
        model.sats.forEach(function (s) {
          if (hit) return;
          var other = s.from === k ? s.to : (s.to === k ? s.from : null);
          if (!other || gen[other] == null) return;
          var g;
          if (s.typ === 'znamy') g = gen[other];
          else if (s.from === k) g = gen[other] - 1;
          else g = gen[other] + 1;
          hit = { g: g, other: other };
        });
        if (!hit) people[k].rodina.forEach(function (o) { if (!hit && gen[o] != null) hit = { g: gen[o], other: o }; });
        if (hit) { gen[k] = hit.g; anchorOf[k] = hit.other; progress = true; }
      });
      if (!progress) break;
    }
    floaters.forEach(function (k) { if (gen[k] == null) gen[k] = 0; });

    var minGen = 0;
    keys.forEach(function (k) { if (gen[k] < minGen) minGen = gen[k]; });
    keys.forEach(function (k) { gen[k] -= minGen; });
    var maxGen = 0;
    keys.forEach(function (k) { if (gen[k] > maxGen) maxGen = gen[k]; });

    // jednotky = skupiny partnerů
    var uf = {};
    structured.forEach(function (k) { uf[k] = k; });
    function find(x) { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; }
    structured.forEach(function (k) { people[k].partners.forEach(function (o) { var a = find(k), b = find(o); if (a !== b) uf[a] = b; }); });
    var groups = {};
    structured.forEach(function (k) { (groups[find(k)] = groups[find(k)] || []).push(k); });
    var units = Object.keys(groups).map(function (r) {
      var m = groups[r].slice().sort(function (a, b) { return people[a].name.localeCompare(people[b].name, 'cs'); });
      return { members: m, gen: gen[m[0]] };
    });
    var unitOf = {};
    units.forEach(function (u, i) { u.id = i; u.members.forEach(function (k) { unitOf[k] = u; }); });

    var rows = [];
    for (var g = 0; g <= maxGen; g++) rows.push([]);
    units.forEach(function (u) { rows[u.gen].push(u); });

    function uw(u) { return u.members.length * NODE_W + (u.members.length - 1) * PARTNER_GAP; }
    var x = {};

    rows.forEach(function (row) {
      if (!row.length) return;
      row.forEach(function (u) {
        var xs = [];
        u.members.forEach(function (k) { people[k].parents.forEach(function (pk) { if (x[pk] != null) xs.push(x[pk]); }); });
        u.bary = xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : null;
      });
      // clustery sourozeneckých jednotek, aby seděly vedle sebe
      var ru = {}; row.forEach(function (u) { ru[u.id] = u.id; });
      function rf(a) { while (ru[a] !== a) { ru[a] = ru[ru[a]]; a = ru[a]; } return a; }
      row.forEach(function (u) {
        u.members.forEach(function (k) {
          people[k].siblings.forEach(function (o) {
            if (unitOf[o] && ru[unitOf[o].id] != null) { var a = rf(u.id), b = rf(unitOf[o].id); if (a !== b) ru[a] = b; }
          });
        });
      });
      var clusters = {};
      row.forEach(function (u) { (clusters[rf(u.id)] = clusters[rf(u.id)] || []).push(u); });
      var cl = Object.keys(clusters).map(function (id) {
        var us = clusters[id];
        us.sort(function (a, b) {
          if (a.bary != null && b.bary != null && a.bary !== b.bary) return a.bary - b.bary;
          if (a.bary != null && b.bary == null) return -1;
          if (a.bary == null && b.bary != null) return 1;
          return people[a.members[0]].name.localeCompare(people[b.members[0]].name, 'cs');
        });
        var bs = us.filter(function (u) { return u.bary != null; }).map(function (u) { return u.bary; });
        return { us: us, bary: bs.length ? bs.reduce(function (a, b) { return a + b; }, 0) / bs.length : null };
      });
      cl.sort(function (a, b) {
        if (a.bary != null && b.bary != null && a.bary !== b.bary) return a.bary - b.bary;
        if (a.bary != null && b.bary == null) return -1;
        if (a.bary == null && b.bary != null) return 1;
        return people[a.us[0].members[0]].name.localeCompare(people[b.us[0].members[0]].name, 'cs');
      });
      var flat = [];
      cl.forEach(function (c) { c.us.forEach(function (u) { flat.push(u); }); });
      row.length = 0; flat.forEach(function (u) { row.push(u); });

      // člen s vnějším sourozencem blíž k tomu sourozenci
      row.forEach(function (u, idx) {
        if (u.members.length < 2) return;
        var score = {};
        u.members.forEach(function (k) {
          var sc = 0;
          people[k].siblings.forEach(function (o) {
            var ou = unitOf[o]; if (!ou || ou === u) return;
            sc += row.indexOf(ou) > idx ? 1 : -1;
          });
          score[k] = sc;
        });
        u.members.sort(function (a, b) { return score[a] - score[b] || people[a].name.localeCompare(people[b].name, 'cs'); });
      });

      var cursor = GUTTER + MARGIN;
      row.forEach(function (u) {
        var w = uw(u), left = cursor;
        if (u.bary != null) left = Math.max(cursor, u.bary - w / 2);
        u.left = left; u.w = w;
        u.members.forEach(function (k, i) { x[k] = left + NODE_W / 2 + i * (NODE_W + PARTNER_GAP); });
        cursor = left + w + GAP_X;
      });
    });

    // rodiče vycentrovat nad děti
    for (var g2 = maxGen - 1; g2 >= 0; g2--) {
      var row2 = rows[g2];
      row2.forEach(function (u, idx) {
        var cx = [];
        u.members.forEach(function (k) { people[k].children.forEach(function (c) { if (x[c] != null) cx.push(x[c]); }); });
        if (!cx.length) return;
        var target = (Math.min.apply(null, cx) + Math.max.apply(null, cx)) / 2;
        var nl = target - u.w / 2;
        var minL = idx > 0 ? row2[idx - 1].left + row2[idx - 1].w + GAP_X : GUTTER + MARGIN;
        var nx = row2[idx + 1];
        var maxL = nx ? nx.left - GAP_X - u.w : Infinity;
        nl = Math.max(minL, Math.min(maxL, nl));
        u.left = nl;
        u.members.forEach(function (k, i) { x[k] = nl + NODE_W / 2 + i * (NODE_W + PARTNER_GAP); });
      });
    }

    // plovoucí osoby: volné místo v řadě co nejblíž kotvě
    var occ = {};
    structured.forEach(function (k) { (occ[gen[k]] = occ[gen[k]] || []).push([x[k] - NODE_W / 2, x[k] + NODE_W / 2]); });
    function free(g, cx) {
      var l = cx - NODE_W / 2, r = cx + NODE_W / 2;
      return !(occ[g] || []).some(function (iv) { return l < iv[1] + GAP_X && r > iv[0] - GAP_X; });
    }
    var order = floaters.slice().sort(function (a, b) { return (anchorOf[a] ? 0 : 1) - (anchorOf[b] ? 0 : 1); });
    var fallbackX = GUTTER + MARGIN + NODE_W / 2;
    order.forEach(function (k) {
      var ax = anchorOf[k] && x[anchorOf[k]] != null ? x[anchorOf[k]] : fallbackX;
      var chosen = null, step = NODE_W + GAP_X;
      for (var n = 0; n < 60 && chosen == null; n++) {
        var offs = n === 0 ? [0] : [n * step, -n * step];
        for (var j = 0; j < offs.length; j++) {
          var cx2 = ax + offs[j];
          if (cx2 - NODE_W / 2 < GUTTER + MARGIN - 1) continue;
          if (free(gen[k], cx2)) { chosen = cx2; break; }
        }
      }
      if (chosen == null) chosen = ax + 61 * step;
      x[k] = chosen;
      (occ[gen[k]] = occ[gen[k]] || []).push([chosen - NODE_W / 2, chosen + NODE_W / 2]);
    });

    var minX = Infinity, maxX = -Infinity;
    keys.forEach(function (k) { minX = Math.min(minX, x[k] - NODE_W / 2); maxX = Math.max(maxX, x[k] + NODE_W / 2); });
    var shift = GUTTER + MARGIN - minX;
    keys.forEach(function (k) { x[k] += shift; });
    maxX += shift;

    var pos = {};
    keys.forEach(function (k) { pos[k] = { cx: x[k], top: TOP + gen[k] * (NODE_H + GAP_Y), gen: gen[k] }; });
    return {
      pos: pos, gen: gen, maxGen: maxGen,
      W: Math.max(maxX + MARGIN, 520),
      H: TOP + (maxGen + 1) * NODE_H + maxGen * GAP_Y + 70
    };
  }

  // ───────────────────────── GEOMETRIE HRAN ─────────────────────────
  function buildGeometry(model, L) {
    var people = model.people, pos = L.pos, keys = Object.keys(people);
    var geo = { arcs: [], partners: [], links: [], chips: [] };

    var seen = {};
    keys.forEach(function (k) {
      people[k].siblings.forEach(function (o) {
        var pk = [k, o].sort().join('|'); if (seen[pk]) return; seen[pk] = 1;
        if (people[k].parents.some(function (p) { return people[o].parents.indexOf(p) >= 0; })) return;
        var a = pos[k], b = pos[o];
        var lift = 30 + Math.min(46, Math.abs(a.cx - b.cx) / 9);
        var ty = Math.min(a.top, b.top) - lift;
        geo.arcs.push({ typ: 'sourozenec', d: 'M' + a.cx + ' ' + a.top + ' C' + a.cx + ' ' + ty + ' ' + b.cx + ' ' + ty + ' ' + b.cx + ' ' + b.top });
      });
    });
    var seenR = {};
    keys.forEach(function (k) {
      people[k].rodina.forEach(function (o) {
        var pk = [k, o].sort().join('|'); if (seenR[pk]) return; seenR[pk] = 1;
        var a = pos[k], b = pos[o];
        var ay = a.top + NODE_H, by = b.top + NODE_H;
        var low = Math.max(ay, by) + 34;
        geo.arcs.push({ typ: 'rodina', d: 'M' + a.cx + ' ' + ay + ' C' + a.cx + ' ' + low + ' ' + b.cx + ' ' + low + ' ' + b.cx + ' ' + by });
      });
    });

    var anchor = {}, seenP = {};
    keys.forEach(function (k) {
      people[k].partners.forEach(function (o) {
        var pk = [k, o].sort().join('|'); if (seenP[pk]) return; seenP[pk] = 1;
        var a = pos[k], b = pos[o];
        var l = a.cx <= b.cx ? a : b, r = a.cx <= b.cx ? b : a;
        if (Math.abs(l.top - r.top) > 1) return;
        var y = l.top + NODE_H / 2;
        var x1 = l.cx + NODE_W / 2, x2 = r.cx - NODE_W / 2, mx = (x1 + x2) / 2;
        geo.partners.push({ x1: x1, x2: x2, y: y, mx: mx });
        anchor[pk] = { x: mx, y: y };
      });
    });

    keys.forEach(function (ck) {
      var c = people[ck]; if (!c.parents.length) return;
      var cp = pos[ck], used = {}, starts = [];
      for (var i = 0; i < c.parents.length; i++) {
        for (var j = i + 1; j < c.parents.length; j++) {
          var pk = [c.parents[i], c.parents[j]].sort().join('|');
          if (anchor[pk] && !used[c.parents[i]] && !used[c.parents[j]]) {
            used[c.parents[i]] = used[c.parents[j]] = 1;
            starts.push({ x: anchor[pk].x, y: anchor[pk].y + 12 });
          }
        }
      }
      c.parents.forEach(function (p) { if (!used[p]) starts.push({ x: pos[p].cx, y: pos[p].top + NODE_H }); });
      starts.forEach(function (s) {
        var ey = cp.top, dy = Math.max(30, (ey - s.y) * 0.55);
        geo.links.push({ typ: 'rodic', d: 'M' + s.x + ' ' + s.y + ' C' + s.x + ' ' + (s.y + dy) + ' ' + cp.cx + ' ' + (ey - dy) + ' ' + cp.cx + ' ' + ey, endX: cp.cx, endY: ey });
      });
    });

    model.sats.forEach(function (s) {
      var a = pos[s.from], b = pos[s.to]; if (!a || !b) return;
      var d, mid;
      if (Math.abs(a.top - b.top) < 1) {
        var lift = 36 + Math.min(40, Math.abs(a.cx - b.cx) / 10);
        var up = s.typ !== 'znamy';
        var y0 = up ? a.top : a.top + NODE_H, ty = up ? a.top - lift : a.top + NODE_H + lift;
        var p0 = { x: a.cx, y: y0 }, p1 = { x: a.cx, y: ty }, p2 = { x: b.cx, y: ty }, p3 = { x: b.cx, y: y0 };
        d = 'M' + p0.x + ' ' + p0.y + ' C' + p1.x + ' ' + p1.y + ' ' + p2.x + ' ' + p2.y + ' ' + p3.x + ' ' + p3.y;
        mid = bez(p0, p1, p2, p3, 0.5);
      } else {
        var hi = a.top < b.top ? a : b, lo = a.top < b.top ? b : a;
        var q0 = { x: hi.cx, y: hi.top + NODE_H }, q3 = { x: lo.cx, y: lo.top };
        var dy2 = Math.max(30, (q3.y - q0.y) * 0.5);
        var q1 = { x: q0.x, y: q0.y + dy2 }, q2 = { x: q3.x, y: q3.y - dy2 };
        d = 'M' + q0.x + ' ' + q0.y + ' C' + q1.x + ' ' + q1.y + ' ' + q2.x + ' ' + q2.y + ' ' + q3.x + ' ' + q3.y;
        mid = bez(q0, q1, q2, q3, 0.5);
      }
      geo.links.push({ typ: s.typ, d: d });
      var text = s.typ === 'stryc' ? 'strýc/teta' : s.typ === 'kmotr' ? 'kmotr' : 'známý';
      geo.chips.push({ x: mid.x, y: mid.y, text: text, color: COLORS[s.typ] });
    });
    // štítky, které by se překrývaly, trochu rozsuneme
    geo.chips.forEach(function (c, i) {
      for (var j = 0; j < i; j++) {
        var o = geo.chips[j];
        if (Math.abs(o.x - c.x) < 90 && Math.abs(o.y - c.y) < 22) c.y = o.y + 24;
      }
    });
    return geo;
  }

  // ───────────────────────── KRESLENÍ ─────────────────────────
  var uidCounter = 0;
  function makeDrawer(model, L, geo, kin) {
    var uid = 'fv' + (++uidCounter);
    var people = model.people, pos = L.pos, keys = Object.keys(people);
    var defs =
      '<defs>' +
      '<linearGradient id="' + uid + 'card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d211d"/><stop offset="1" stop-color="#1a1413"/></linearGradient>' +
      '<linearGradient id="' + uid + 'cardSel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2a28"/><stop offset="1" stop-color="#2a1a18"/></linearGradient>' +
      '<radialGradient id="' + uid + 'mono" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#8a2f3d"/><stop offset="1" stop-color="#4a1520"/></radialGradient>' +
      '<radialGradient id="' + uid + 'bg" cx="0.5" cy="0.35" r="0.85"><stop offset="0" stop-color="#241a17"/><stop offset="1" stop-color="#120d0c"/></radialGradient>' +
      '<filter id="' + uid + 'glow" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="' + uid + 'shadow" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.55"/></filter>' +
      '</defs>';

    function bands() {
      var s = '';
      for (var g = 0; g <= L.maxGen; g++) {
        var y = TOP + g * (NODE_H + GAP_Y);
        s += '<rect x="0" y="' + (y - 26) + '" width="' + L.W + '" height="' + (NODE_H + 52) + '" style="fill:' + (g % 2 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.028)') + '"/>';
        s += '<text x="' + (GUTTER / 2 + 4) + '" y="' + (y + NODE_H / 2 + 6) + '" text-anchor="middle" style="fill:#7a6236;font-family:var(--font-display,Georgia,serif);font-size:20px;font-style:italic;opacity:0.85">' + (ROMAN[g] || (g + 1)) + '</text>';
        s += '<line x1="' + GUTTER + '" y1="' + (y - 18) + '" x2="' + GUTTER + '" y2="' + (y + NODE_H + 18) + '" style="stroke:#7a6236;stroke-width:1;opacity:0.35"/>';
      }
      return s;
    }
    function heart(x, y, color) {
      return '<g transform="translate(' + x + ' ' + y + ')"><circle r="12" style="fill:#1a1413;stroke:' + color + ';stroke-width:2"/>' +
        '<path d="M0 5 C-9 -2 -5 -8 0 -3 C5 -8 9 -2 0 5Z" style="fill:' + color + '"/></g>';
    }
    function chip(c) {
      var w = c.text.length * 6.4 + 18;
      return '<g><rect x="' + (c.x - w / 2) + '" y="' + (c.y - 10) + '" width="' + w + '" height="20" rx="10" style="fill:#1a1413;stroke:' + c.color + ';stroke-width:1.2"/>' +
        '<text x="' + c.x + '" y="' + (c.y + 4) + '" text-anchor="middle" style="fill:' + c.color + ';font-family:var(--font-mono,monospace);font-size:10.5px">' + esc(c.text) + '</text></g>';
    }
    function pill(xr, y, text, fill, color, stroke) {
      var w = text.length * 6.5 + 20;
      return '<g><rect x="' + (xr - w) + '" y="' + (y - 11) + '" width="' + w + '" height="22" rx="11" style="fill:' + fill + ';stroke:' + (stroke || fill) + ';stroke-width:1.2"/>' +
        '<text x="' + (xr - w / 2) + '" y="' + (y + 4) + '" text-anchor="middle" style="fill:' + color + ';font-family:var(--font-mono,monospace);font-size:10.5px;font-weight:600">' + esc(text) + '</text></g>';
    }
    function node(k, sel, labels) {
      var p = pos[k], person = people[k];
      var x0 = p.cx - NODE_W / 2, isSel = sel === k;
      var lab = sel && !isSel ? labels[k] : null;
      var dim = sel && !isSel && !lab;
      var lines = wrapName(person.name);
      var cy = p.top + NODE_H / 2;
      var ty = lines.length === 1 ? cy + 5 : cy - 3;
      var t = lines.map(function (l, i) {
        return '<text x="' + (x0 + 62) + '" y="' + (ty + i * 16) + '" style="fill:#f1e8d6;font-family:var(--font-display,Georgia,serif);font-size:14px">' + esc(l) + '</text>';
      }).join('');
      var badge = '';
      if (isSel) badge = pill(x0 + NODE_W - 10, p.top, 'POHLED Z', '#d4a95a', '#1a1413');
      else if (lab) badge = pill(x0 + NODE_W - 10, p.top, lab, '#1a1413', '#e6c97c', '#d4a95a');
      return '<g class="fv-node" data-k="' + esc(k) + '" style="cursor:pointer;opacity:' + (dim ? 0.38 : 1) + '"' + (isSel ? ' filter="url(#' + uid + 'glow)"' : '') + '>' +
        '<title>' + esc(person.name) + (lab ? ' — ' + esc(lab) : '') + '</title>' +
        '<rect x="' + x0 + '" y="' + p.top + '" width="' + NODE_W + '" height="' + NODE_H + '" rx="12" filter="url(#' + uid + 'shadow)" style="fill:url(#' + uid + (isSel ? 'cardSel' : 'card') + ');stroke:' + (isSel ? '#e6c97c' : '#7a6236') + ';stroke-width:' + (isSel ? 2.2 : 1.3) + '"/>' +
        '<circle cx="' + (x0 + 32) + '" cy="' + cy + '" r="21" style="fill:url(#' + uid + 'mono);stroke:#c9a35b;stroke-width:1.6"/>' +
        '<text x="' + (x0 + 32) + '" y="' + (cy + 5.5) + '" text-anchor="middle" style="fill:#f1e8d6;font-family:var(--font-display,Georgia,serif);font-size:15px;font-weight:600;letter-spacing:0.5px">' + esc(initials(person.name)) + '</text>' +
        t + badge + '</g>';
    }

    return {
      draw: function (sel) {
        var labels = {};
        if (sel) keys.forEach(function (k) { if (k !== sel) { var l = kin.label(k, sel); if (l) labels[k] = l; } });
        var out = defs + '<rect width="' + L.W + '" height="' + L.H + '" fill="url(#' + uid + 'bg)"/>' + bands();
        out += '<g style="opacity:' + (sel ? 0.5 : 1) + '" fill="none" stroke-linecap="round">';
        geo.arcs.forEach(function (a) {
          out += '<path d="' + a.d + '" style="stroke:' + COLORS[a.typ] + ';stroke-width:2;' + (a.typ === 'sourozenec' ? 'stroke-dasharray:2 6;' : 'stroke-dasharray:7 6;') + '"/>';
        });
        geo.links.forEach(function (l) {
          if (l.typ === 'rodic') out += '<path d="' + l.d + '" style="stroke:' + COLORS.rodic + ';stroke-width:2.4"/><circle cx="' + l.endX + '" cy="' + l.endY + '" r="3.5" style="fill:' + COLORS.rodic + '"/>';
          else out += '<path d="' + l.d + '" style="stroke:' + COLORS[l.typ] + ';stroke-width:2;stroke-dasharray:' + (l.typ === 'kmotr' ? '1 6' : '7 6') + '"/>';
        });
        geo.partners.forEach(function (p) {
          out += '<line x1="' + p.x1 + '" y1="' + p.y + '" x2="' + p.x2 + '" y2="' + p.y + '" style="stroke:' + COLORS.partner + ';stroke-width:3"/>' + heart(p.mx, p.y, COLORS.partner);
        });
        out += '</g>';
        geo.chips.forEach(function (c) { out += chip(c); });
        keys.forEach(function (k) { out += node(k, sel, labels); });
        return out;
      }
    };
  }

  // ───────────────────────── MONTÁŽ ─────────────────────────
  var STYLE_ID = 'fv-style';
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.fv-wrap{background:linear-gradient(180deg,#1b1413,#120d0c);border:1px solid var(--border-brass,#7a6236);border-radius:6px;padding:0.9rem;box-shadow:0 8px 30px rgba(0,0,0,.35)}' +
      '.fv-toolbar{display:flex;gap:0.5rem;align-items:center;margin-bottom:0.7rem;flex-wrap:wrap}' +
      '.fv-btn{background:transparent;border:1px solid var(--border-brass,#7a6236);color:var(--ivory-dim,#bfb5a0);width:32px;height:32px;cursor:pointer;font-size:1rem;line-height:1;border-radius:4px}' +
      '.fv-btn:hover{background:rgba(201,163,91,.14);color:#e6c97c}' +
      '.fv-info{font-family:var(--font-mono,monospace);font-size:0.74rem;color:var(--ivory-dim,#bfb5a0);margin:0 0 0.7rem;padding:0.55rem 0.8rem;border-left:2px solid #c9a35b;background:rgba(201,163,91,.07)}' +
      '.fv-info b{color:#e6c97c;font-weight:600}' +
      '.fv-info button{background:none;border:none;color:#e0627a;cursor:pointer;font-family:inherit;font-size:inherit;text-decoration:underline;margin-left:0.6rem}' +
      '.fv-scroll{overflow:auto;max-height:76vh;border:1px solid rgba(122,98,54,.45);border-radius:4px;cursor:grab}' +
      '.fv-scroll.fv-drag{cursor:grabbing;user-select:none}' +
      '.fv-scroll svg{display:block;user-select:none}' +
      '.fv-legend{display:flex;gap:0.9rem;flex-wrap:wrap;margin-left:auto;font-family:var(--font-mono,monospace);font-size:0.66rem;color:var(--ivory-dim,#bfb5a0)}' +
      '.fv-legend-item{display:inline-flex;align-items:center;gap:0.4rem}' +
      '.fv-legend-item i{display:inline-block;width:20px;height:0}' +
      '.fv-empty{padding:2.2rem;text-align:center;color:var(--ivory-faint,#8a8070);font-family:var(--font-mono,monospace);font-size:0.82rem;border:1px dashed rgba(122,98,54,.5);border-radius:6px;line-height:1.7}';
    document.head.appendChild(st);
  }

  function legendHtml(types) {
    return '<div class="fv-legend">' + types.map(function (t) {
      var style = (t === 'rodina' || t === 'stryc') ? 'dashed' : (t === 'kmotr' || t === 'sourozenec' || t === 'znamy') ? 'dotted' : 'solid';
      return '<span class="fv-legend-item"><i style="border-top:3px ' + style + ' ' + COLORS[t] + '"></i>' + esc(LABELS[t]) + '</span>';
    }).join('') + '</div>';
  }
  function emptyHtml(text) { return '<div class="fv-empty">' + esc(text) + '</div>'; }

  function mount(container, o) {
    var scale = 1;
    var infoDefault = o.selectable ? 'Klikni na osobu — strom ukáže, kým je pro ni každý další (strýc/teta, neteř/synovec, bratranec, švagr, zeť/snacha, tchán…).' : '';
    container.innerHTML =
      '<div class="fv-wrap"><div class="fv-toolbar">' +
      '<button type="button" class="fv-btn" data-act="out" title="Oddálit">−</button>' +
      '<button type="button" class="fv-btn" data-act="fit" title="Přizpůsobit šířce">⤢</button>' +
      '<button type="button" class="fv-btn" data-act="in" title="Přiblížit">+</button>' +
      legendHtml(o.legend) + '</div>' +
      (o.selectable ? '<div class="fv-info"></div>' : '') +
      '<div class="fv-scroll"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + o.W + ' ' + o.H + '" width="' + o.W + '" height="' + o.H + '"></svg></div></div>';
    var svg = container.querySelector('svg'), scroll = container.querySelector('.fv-scroll'), info = container.querySelector('.fv-info');
    var sel = null, dragged = false;

    function redraw() {
      svg.innerHTML = o.draw(sel);
      if (info) {
        if (sel && o.names[sel]) info.innerHTML = 'Pohled z: <b>' + esc(o.names[sel]) + '</b> — u ostatních vidíš, kým jsou pro tuto osobu.<button type="button" data-act="clear">zrušit výběr</button>';
        else info.textContent = infoDefault;
      }
    }
    function apply() { svg.setAttribute('width', Math.round(o.W * scale)); svg.setAttribute('height', Math.round(o.H * scale)); }
    function fit() { var av = scroll.clientWidth - 4; scale = av > 0 ? Math.min(1, av / o.W) : 1; apply(); }

    container.querySelector('.fv-toolbar').addEventListener('click', function (e) {
      var act = e.target && e.target.getAttribute && e.target.getAttribute('data-act'); if (!act) return;
      if (act === 'in') scale = Math.min(2.5, scale + 0.15); else if (act === 'out') scale = Math.max(0.25, scale - 0.15); else fit();
      apply();
    });
    if (info) info.addEventListener('click', function (e) { if (e.target.getAttribute('data-act') === 'clear') { sel = null; redraw(); } });
    svg.addEventListener('click', function (e) {
      if (dragged || !o.selectable) return;
      var n = e.target; while (n && n !== svg && !(n.getAttribute && n.getAttribute('data-k'))) n = n.parentNode;
      var k = n && n !== svg ? n.getAttribute('data-k') : null;
      sel = (k && k !== sel) ? k : null;
      redraw();
    });
    var sx = 0, sy = 0, sl = 0, st = 0, down = false;
    scroll.addEventListener('mousedown', function (e) { if (e.button !== 0) return; down = true; dragged = false; sx = e.clientX; sy = e.clientY; sl = scroll.scrollLeft; st = scroll.scrollTop; });
    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragged && Math.abs(dx) + Math.abs(dy) > 5) { dragged = true; scroll.classList.add('fv-drag'); }
      if (dragged) { scroll.scrollLeft = sl - dx; scroll.scrollTop = st - dy; }
    });
    window.addEventListener('mouseup', function () { if (!down) return; down = false; scroll.classList.remove('fv-drag'); setTimeout(function () { dragged = false; }, 0); });

    redraw(); fit();
  }

  // ───────────────────────── STROM ─────────────────────────
  function renderTree(container, relations) {
    var model = buildModel(relations);
    var keys = Object.keys(model.people);
    if (!keys.length) {
      container.innerHTML = emptyHtml('Zatím nejsou zaznamenané žádné rodinné vazby. Přidej „Rodič → Dítě“, „Partneři“ nebo „Sourozenci“ a strom se sestaví sám. Strýce, neteře, bratrance nebo švagry nemusíš zadávat — dopočítají se.');
      return;
    }
    var L = layout(model), geo = buildGeometry(model, L), kin = makeKinship(model), dr = makeDrawer(model, L, geo, kin);
    var names = {}; keys.forEach(function (k) { names[k] = model.people[k].name; });
    var present = { rodic: 1, partner: 1, sourozenec: 1, rodina: 1 };
    model.sats.forEach(function (s) { present[s.typ] = 1; });
    var legend = Object.keys(LABELS).filter(function (t) { return present[t]; });
    mount(container, { W: L.W, H: L.H, draw: dr.draw, selectable: true, names: names, legend: legend });
  }

  // ───────────────────────── SÍŤ ─────────────────────────
  function renderNetwork(container, relations) {
    var valid = relations.filter(function (r) { return keyOf(r.a) && keyOf(r.b) && keyOf(r.a) !== keyOf(r.b); });
    if (!valid.length) { container.innerHTML = emptyHtml('Zatím žádné zaznamenané vztahy.'); return; }
    var names = {}, order = [], degree = {};
    valid.forEach(function (r) { [r.a, r.b].forEach(function (n) { var k = keyOf(n); if (!names[k]) { names[k] = String(n).trim(); order.push(k); degree[k] = 0; } }); });
    valid.forEach(function (r) { degree[keyOf(r.a)]++; degree[keyOf(r.b)]++; });
    order.sort(function (a, b) { return degree[b] - degree[a] || names[a].localeCompare(names[b], 'cs'); });
    var n = order.length, R = Math.max(150, n * 26), pad = 270;
    var W = 2 * (R + pad), H = 2 * (R + 80), cx0 = W / 2, cy0 = H / 2, p = {};
    order.forEach(function (k, i) { var ang = -Math.PI / 2 + 2 * Math.PI * i / n; p[k] = { x: cx0 + R * Math.cos(ang), y: cy0 + R * Math.sin(ang), ang: ang }; });
    var directed = { rodic: 1, mentor: 1, stryc: 1, kmotr: 1 };
    function draw() {
      var s = '<defs>' + Object.keys(directed).map(function (t) {
        return '<marker id="fvn-' + t + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" style="fill:' + COLORS[t] + '"/></marker>';
      }).join('') + '<radialGradient id="fvn-bg" cx="0.5" cy="0.5" r="0.8"><stop offset="0" stop-color="#241a17"/><stop offset="1" stop-color="#120d0c"/></radialGradient></defs>';
      s += '<rect width="' + W + '" height="' + H + '" fill="url(#fvn-bg)"/>';
      var pairCount = {};
      valid.forEach(function (r) {
        var ka = keyOf(r.a), kb = keyOf(r.b), pk = [ka, kb].sort().join('|');
        var idx = pairCount[pk] = (pairCount[pk] || 0) + 1;
        var a = p[ka], b = p[kb], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, pull = 0.28 + (idx - 1) * 0.18;
        var qx = mx + (cx0 - mx) * pull, qy = my + (cy0 - my) * pull;
        var color = COLORS[r.typ] || '#999';
        var dash = (r.typ === 'rodina' || r.typ === 'stryc') ? 'stroke-dasharray:7 6;' : (r.typ === 'rival' || r.typ === 'kmotr' || r.typ === 'znamy') ? 'stroke-dasharray:2 5;' : '';
        var ex = b.x, ey = b.y, dx = ex - qx, dy = ey - qy, dl = Math.sqrt(dx * dx + dy * dy) || 1;
        ex -= dx / dl * 9; ey -= dy / dl * 9;
        s += '<path d="M' + a.x + ' ' + a.y + ' Q' + qx + ' ' + qy + ' ' + ex + ' ' + ey + '" fill="none"' + (directed[r.typ] ? ' marker-end="url(#fvn-' + r.typ + ')"' : '') + ' style="stroke:' + color + ';stroke-width:2;opacity:0.85;' + dash + '"><title>' +
          esc(r.a + ' — ' + (LABELS[r.typ] || r.typ) + ' — ' + r.b + (r.note ? ' (' + r.note + ')' : '')) + '</title></path>';
      });
      order.forEach(function (k) {
        var q = p[k], right = Math.cos(q.ang) > 0.25, left = Math.cos(q.ang) < -0.25;
        var anc = right ? 'start' : (left ? 'end' : 'middle');
        var tx = q.x + (right ? 14 : (left ? -14 : 0)), ty = q.y + (right || left ? 4.5 : (Math.sin(q.ang) < 0 ? -15 : 24));
        s += '<g><circle cx="' + q.x + '" cy="' + q.y + '" r="7.5" style="fill:#1e1816;stroke:#c9a35b;stroke-width:2"/>' +
          '<text x="' + tx + '" y="' + ty + '" text-anchor="' + anc + '" style="fill:#f1e8d6;font-family:var(--font-display,Georgia,serif);font-size:14px">' + esc(names[k]) + '</text></g>';
      });
      return s;
    }
    var present = {}; valid.forEach(function (r) { present[r.typ] = 1; });
    mount(container, { W: W, H: H, draw: draw, selectable: false, names: names, legend: Object.keys(LABELS).filter(function (t) { return present[t]; }) });
  }

  window.FamilyViz = {
    render: function (container, relations, mode) {
      if (!container) return;
      ensureStyle();
      var list = Array.isArray(relations) ? relations : [];
      try { if (mode === 'network') renderNetwork(container, list); else renderTree(container, list); }
      catch (e) { console.error('[FamilyViz]', e); container.innerHTML = emptyHtml('Vizualizaci se nepodařilo vykreslit.'); }
    }
  };
})();
