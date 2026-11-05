// public/js/rodokmen.js — CALEDONIA · Rodokmen
// Samostatná stránka /rodokmen. Osoby (jméno, narození, lore, fotka, titul) + vazby mezi nimi.
// Příbuzenství (strýc/teta, synovec/neteř, bratranec, švagr, zeť/snacha, tchán…) se nezadává ručně,
// ale dopočítává se z rodičů, partnerů a sourozenců — a podle pohlaví se skloňuje správně.
(function () {
  'use strict';

  var CFG = window.RODOKMEN_CFG || { canEdit: false, isStaff: false, canDiscord: false };
  var S = { persons: [], relations: [], events: [], sel: null, view: 'full', mode: 'tree', tab: 'tree', dtab: 'profil', genLimit: 0, status: 'all', scale: 1, full: null, fullL: null, vis: null, threads: true };

  // ───────────── pomocné ─────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function toast(msg, err) { if (window.showToast) window.showToast(msg, !!err); }
  function api(method, url, body) {
    return fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (r) { return r.json(); });
  }
  function byId(id) { for (var i = 0; i < S.persons.length; i++) if (S.persons[i].id === id) return S.persons[i]; return null; }
  function fmtDate(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); if (!m) return iso;
    return m[3] + '. ' + m[2] + '. ' + m[1];
  }
  function ageOf(p) {
    if (!p.narozeni) return null;
    var b = new Date(p.narozeni + 'T00:00:00'); if (isNaN(b)) return null;
    var end = p.umrti ? new Date(p.umrti + 'T00:00:00') : new Date();
    var a = end.getFullYear() - b.getFullYear();
    var m = end.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < b.getDate())) a--;
    return a >= 0 ? a : null;
  }
  function letText(n) { return n === 1 ? '1 rok' : (n >= 2 && n <= 4 ? n + ' roky' : n + ' let'); }
  function initials(name) {
    var w = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return w.length === 1 ? w[0].charAt(0).toUpperCase() : (w[0].charAt(0) + w[w.length - 1].charAt(0)).toUpperCase();
  }
  function wrapName(name) {
    name = String(name || '').trim();
    if (name.length <= 16) return [name];
    var w = name.split(/\s+/), best = null, bd = 1e9;
    for (var i = 1; i < w.length; i++) {
      var a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), d = Math.abs(a.length - b.length);
      if (d < bd) { bd = d; best = [a, b]; }
    }
    if (!best) best = [name.slice(0, 16) + '…'];
    return best.map(function (l) { return l.length > 21 ? l.slice(0, 20) + '…' : l; });
  }
  function push(arr, v) { if (arr.indexOf(v) < 0) arr.push(v); }
  function cmpName(a, b) { return String(a).localeCompare(String(b), 'cs'); }

  // ───────────── slovník příbuzenství (m / ž / neutrální) ─────────────
  var T = {
    parent: ['otec', 'matka', 'rodič'], child: ['syn', 'dcera', 'dítě'], sibling: ['bratr', 'sestra', 'sourozenec'],
    grandparent: ['dědeček', 'babička', 'prarodič'], grandchild: ['vnuk', 'vnučka', 'vnouče'],
    greatgp: ['pradědeček', 'prababička', 'praprarodič'], greatgc: ['pravnuk', 'pravnučka', 'pravnouče'],
    uncle: ['strýc', 'teta', 'strýc/teta'], nephew: ['synovec', 'neteř', 'synovec/neteř'],
    cousin: ['bratranec', 'sestřenice', 'bratranec/sestřenice'], cousin2: ['druhý bratranec', 'druhá sestřenice', 'druhý bratranec/sestřenice'],
    greatuncle: ['prastrýc', 'prateta', 'prastrýc/prateta'], greatnephew: ['prasynovec', 'praneteř', 'prasynovec/praneteř'],
    uncle2: ['vzdálený strýc', 'vzdálená teta', 'vzdálený strýc/teta'], nephew2: ['vzdálený synovec', 'vzdálená neteř', 'vzdálený synovec/neteř'],
    ancestor: ['předek', 'předek', 'předek'], descendant: ['potomek', 'potomek', 'potomek'], distant: ['vzdálený příbuzný', 'vzdálená příbuzná', 'vzdálený příbuzný'],
    partner: ['partner', 'partnerka', 'partner/ka'], inlaw: ['švagr', 'švagrová', 'švagr/švagrová'],
    childinlaw: ['zeť', 'snacha', 'zeť/snacha'], parentinlaw: ['tchán', 'tchyně', 'tchán/tchyně'],
    stepparent: ['partner rodiče', 'partnerka rodiče', 'partner rodiče'], stepchild: ['nevlastní syn', 'nevlastní dcera', 'nevlastní dítě'],
    uncleinlaw: ['strýc sňatkem', 'teta sňatkem', 'strýc/teta sňatkem'], nephewinlaw: ['synovec sňatkem', 'neteř sňatkem', 'synovec/neteř sňatkem'],
    relinlaw: ['příbuzný sňatkem', 'příbuzná sňatkem', 'příbuzný sňatkem'], partneruncle: ['strýc partnera', 'teta partnera', 'strýc/teta partnera'],
    godparent: ['kmotr', 'kmotra', 'kmotr/kmotra'], godchild: ['kmotřenec', 'kmotřenka', 'kmotřenec/kmotřenka'],
    friend: ['rodinný známý', 'rodinná známá', 'rodinný známý']
  };
  var GROUP_ORDER = ['parent', 'stepparent', 'partner', 'sibling', 'child', 'stepchild', 'grandparent', 'grandchild', 'greatgp', 'greatgc', 'uncle', 'nephew', 'greatuncle', 'greatnephew', 'cousin', 'cousin2', 'uncle2', 'nephew2', 'inlaw', 'childinlaw', 'parentinlaw', 'uncleinlaw', 'nephewinlaw', 'partneruncle', 'relinlaw', 'ancestor', 'descendant', 'godparent', 'godchild', 'friend', 'distant'];
  function kinText(key, person) {
    var t = T[key] || T.distant, g = person && person.pohlavi;
    return g === 'm' ? t[0] : g === 'z' ? t[1] : t[2];
  }

  // ───────────── model ─────────────
  function buildModel(persons, relations) {
    var people = {}, sats = [];
    persons.forEach(function (p) { people[p.id] = { id: p.id, p: p, parents: [], children: [], partners: [], siblings: [] }; });
    relations.forEach(function (r) {
      var a = people[r.a], b = people[r.b]; if (!a || !b || a === b) return;
      if (r.typ === 'rodic') { push(a.children, b.id); push(b.parents, a.id); }
      else if (r.typ === 'partner') { push(a.partners, b.id); push(b.partners, a.id); }
      else if (r.typ === 'sourozenec') { push(a.siblings, b.id); push(b.siblings, a.id); }
      else if (r.typ === 'stryc' || r.typ === 'kmotr' || r.typ === 'znamy') sats.push({ typ: r.typ, from: r.a, to: r.b });
    });
    return { people: people, sats: sats };
  }

  function makeKinship(model) {
    var people = model.people, keys = Object.keys(people);
    var uf = {};
    keys.forEach(function (k) { uf[k] = k; });
    function find(x) { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; }
    keys.forEach(function (k) { people[k].siblings.forEach(function (o) { var a = find(k), b = find(o); if (a !== b) uf[a] = b; }); });
    var cp = {}, cs = {};
    keys.forEach(function (k) {
      var r = find(k); cs[r] = (cs[r] || 0) + 1; cp[r] = cp[r] || [];
      people[k].parents.forEach(function (p) { push(cp[r], p); });
    });
    function effParents(k) { var r = find(k); if (cp[r].length) return cp[r]; return cs[r] > 1 ? ['§v' + r] : []; }
    var cache = {};
    function anc(k) {
      if (cache[k]) return cache[k];
      var m = {}; m[k] = 0; var q = [k];
      while (q.length) {
        var c = q.shift();
        var ps = c.charAt(0) === '§' ? [] : effParents(c);
        ps.forEach(function (p) { if (m[p] == null || m[p] > m[c] + 1) { m[p] = m[c] + 1; q.push(p); } });
      }
      return (cache[k] = m);
    }
    function blood(P, Sx) {
      var a = anc(P), b = anc(Sx), best = null;
      Object.keys(a).forEach(function (c) { if (b[c] == null) return; var sum = a[c] + b[c]; if (!best || sum < best.sum) best = { da: a[c], db: b[c], sum: sum }; });
      if (!best || (best.da === 0 && best.db === 0)) return null;
      var da = best.da, db = best.db;
      if (da === 0) return db === 1 ? 'parent' : db === 2 ? 'grandparent' : db === 3 ? 'greatgp' : 'ancestor';
      if (db === 0) return da === 1 ? 'child' : da === 2 ? 'grandchild' : da === 3 ? 'greatgc' : 'descendant';
      if (da === 1 && db === 1) return 'sibling';
      if (da === 1 && db === 2) return 'uncle';
      if (da === 2 && db === 1) return 'nephew';
      if (da === 2 && db === 2) return 'cousin';
      if (da === 1 && db === 3) return 'greatuncle';
      if (da === 3 && db === 1) return 'greatnephew';
      if (da === 2 && db === 3) return 'uncle2';
      if (da === 3 && db === 2) return 'nephew2';
      if (da === 3 && db === 3) return 'cousin2';
      return 'distant';
    }
    // klíč: kým je P pro osobu Sx
    function label(P, Sx) {
      if (P === Sx) return null;
      var i, s, bb;
      for (i = 0; i < model.sats.length; i++) {
        s = model.sats[i];
        if (s.from === P && s.to === Sx) return s.typ === 'stryc' ? 'uncle' : s.typ === 'kmotr' ? 'godparent' : 'friend';
        if (s.from === Sx && s.to === P) return s.typ === 'stryc' ? 'nephew' : s.typ === 'kmotr' ? 'godchild' : 'friend';
      }
      if (people[P].partners.indexOf(Sx) >= 0) return 'partner';
      var b = blood(P, Sx); if (b) return b;
      var ps = people[P].partners;
      for (i = 0; i < ps.length; i++) {
        bb = blood(ps[i], Sx); if (!bb) continue;
        return bb === 'sibling' ? 'inlaw' : bb === 'child' ? 'childinlaw' : bb === 'parent' ? 'stepparent' : bb === 'uncle' ? 'uncleinlaw' : bb === 'nephew' ? 'nephewinlaw' : 'relinlaw';
      }
      var ss = people[Sx].partners;
      for (i = 0; i < ss.length; i++) {
        bb = blood(P, ss[i]); if (!bb) continue;
        return bb === 'parent' ? 'parentinlaw' : bb === 'sibling' ? 'inlaw' : bb === 'child' ? 'stepchild' : bb === 'uncle' ? 'partneruncle' : 'relinlaw';
      }
      return null;
    }
    return { label: label };
  }


  // ───────────── rozložení stromu ─────────────
  var NODE_W = 236, NODE_H = 92, GAP_X = 36, PARTNER_GAP = 40, GAP_Y = 92, GUTTER = 70, TOP = 100, MARGIN = 44;

  function layout(model) {
    var people = model.people, keys = Object.keys(people);
    function nm(k) { return people[k].p.jmeno; }
    var structured = keys.filter(function (k) { var p = people[k]; return p.parents.length || p.children.length || p.partners.length || p.siblings.length; });
    var isStruct = {}; structured.forEach(function (k) { isStruct[k] = 1; });
    var gen = {}; structured.forEach(function (k) { gen[k] = 0; });
    for (var pass = 0; pass < structured.length + 3; pass++) {
      var changed = false;
      structured.forEach(function (k) {
        var p = people[k];
        p.children.forEach(function (c) { if (gen[c] < gen[k] + 1 && gen[k] + 1 <= structured.length) { gen[c] = gen[k] + 1; changed = true; } });
        p.partners.concat(p.siblings).forEach(function (o) { if (gen[o] < gen[k]) { gen[o] = gen[k]; changed = true; } });
      });
      if (!changed) break;
    }
    // osoby jen s „vedlejšími“ vazbami (kmotr, známý, strýc bez rodičů) se přilepí přímo vedle své kotvy
    var floaters = keys.filter(function (k) { return !isStruct[k]; });
    var anchorOf = {}, rootOf = {}, depthOf = {}, guard = floaters.length + 2;
    while (guard-- > 0) {
      var prog = false;
      floaters.forEach(function (k) {
        if (anchorOf[k]) return;
        for (var i = 0; i < model.sats.length; i++) {
          var s = model.sats[i], other = s.from === k ? s.to : (s.to === k ? s.from : null);
          if (!other) continue;
          if (isStruct[other]) { anchorOf[k] = other; rootOf[k] = other; depthOf[k] = 1; prog = true; return; }
          if (anchorOf[other]) { anchorOf[k] = other; rootOf[k] = rootOf[other]; depthOf[k] = depthOf[other] + 1; prog = true; return; }
        }
      });
      if (!prog) break;
    }
    var attached = floaters.filter(function (k) { return anchorOf[k]; });
    var isolated = floaters.filter(function (k) { return !anchorOf[k]; });
    attached.forEach(function (k) { gen[k] = gen[rootOf[k]]; });
    var maxGen = 0; Object.keys(gen).forEach(function (k) { if (gen[k] > maxGen) maxGen = gen[k]; });
    var isoGen = null;
    if (isolated.length) { isoGen = Object.keys(gen).length ? maxGen + 1 : 0; isolated.forEach(function (k) { gen[k] = isoGen; }); maxGen = Math.max(maxGen, isoGen); }

    var uf = {}; structured.forEach(function (k) { uf[k] = k; });
    function find(x) { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; }
    structured.forEach(function (k) { people[k].partners.forEach(function (o) { var a = find(k), b = find(o); if (a !== b) uf[a] = b; }); });
    var groups = {}; structured.forEach(function (k) { (groups[find(k)] = groups[find(k)] || []).push(k); });
    var units = Object.keys(groups).map(function (r) {
      var m = groups[r].slice().sort(function (a, b) { return cmpName(nm(a), nm(b)); });
      return { members: m, gen: gen[m[0]] };
    });
    var unitOf = {}; units.forEach(function (u, i) { u.id = i; u.members.forEach(function (k) { unitOf[k] = u; }); });
    var att = {}; attached.forEach(function (k) { var u = unitOf[rootOf[k]]; (att[u.id] = att[u.id] || []).push(k); });
    function allOf(u) {
      var Ls = [], Rs = [];
      (att[u.id] || []).forEach(function (k) { var left = u.members.length > 1 && u.members[0] === rootOf[k]; (left ? Ls : Rs).push(k); });
      Ls.sort(function (a, b) { return depthOf[b] - depthOf[a]; }); Rs.sort(function (a, b) { return depthOf[a] - depthOf[b]; });
      return Ls.concat(u.members, Rs);
    }
    var rows = []; for (var g = 0; g <= maxGen; g++) rows.push([]);
    units.forEach(function (u) { rows[u.gen].push(u); });
    function uw(u) { return u.all.length * NODE_W + (u.all.length - 1) * PARTNER_GAP; }
    var x = {};
    function cmpUnits(a, b) {
      if (a.bary != null && b.bary != null && a.bary !== b.bary) return a.bary - b.bary;
      if (a.bary != null && b.bary == null) return -1;
      if (a.bary == null && b.bary != null) return 1;
      return cmpName(nm(a.members[0]), nm(b.members[0]));
    }
    rows.forEach(function (row) {
      if (!row.length) return;
      row.forEach(function (u) {
        var xs = []; u.members.forEach(function (k) { people[k].parents.forEach(function (pk) { if (x[pk] != null) xs.push(x[pk]); }); });
        u.bary = xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : null;
      });
      var ru = {}; row.forEach(function (u) { ru[u.id] = u.id; });
      function rf(a) { while (ru[a] !== a) { ru[a] = ru[ru[a]]; a = ru[a]; } return a; }
      row.forEach(function (u) { u.members.forEach(function (k) { people[k].siblings.forEach(function (o) {
        if (unitOf[o] && ru[unitOf[o].id] != null) { var a = rf(u.id), b = rf(unitOf[o].id); if (a !== b) ru[a] = b; }
      }); }); });
      var clusters = {}; row.forEach(function (u) { (clusters[rf(u.id)] = clusters[rf(u.id)] || []).push(u); });
      var cl = Object.keys(clusters).map(function (id) {
        var us = clusters[id].sort(cmpUnits);
        var bs = us.filter(function (u) { return u.bary != null; }).map(function (u) { return u.bary; });
        return { us: us, bary: bs.length ? bs.reduce(function (a, b) { return a + b; }, 0) / bs.length : null };
      });
      cl.sort(function (a, b) { return cmpUnits({ bary: a.bary, members: a.us[0].members }, { bary: b.bary, members: b.us[0].members }); });
      var flat = []; cl.forEach(function (c) { c.us.forEach(function (u) { flat.push(u); }); });
      row.length = 0; flat.forEach(function (u) { row.push(u); });
      row.forEach(function (u, idx) {
        if (u.members.length < 2) return;
        var score = {};
        u.members.forEach(function (k) { var sc = 0; people[k].siblings.forEach(function (o) { var ou = unitOf[o]; if (!ou || ou === u) return; sc += row.indexOf(ou) > idx ? 1 : -1; }); score[k] = sc; });
        u.members.sort(function (a, b) { return score[a] - score[b] || cmpName(nm(a), nm(b)); });
      });
      row.forEach(function (u) { u.all = allOf(u); });
      var cursor = GUTTER + MARGIN;
      row.forEach(function (u) {
        var w = uw(u), left = cursor;
        if (u.bary != null) left = Math.max(cursor, u.bary - w / 2);
        u.left = left; u.w = w;
        u.all.forEach(function (k, i) { x[k] = left + NODE_W / 2 + i * (NODE_W + PARTNER_GAP); });
        cursor = left + w + GAP_X;
      });
    });
    for (var g2 = maxGen - 1; g2 >= 0; g2--) {
      var row2 = rows[g2];
      row2.forEach(function (u, idx) {
        var cx = []; u.members.forEach(function (k) { people[k].children.forEach(function (c) { if (x[c] != null) cx.push(x[c]); }); });
        if (!cx.length) return;
        var target = (Math.min.apply(null, cx) + Math.max.apply(null, cx)) / 2, nl = target - u.w / 2;
        var minL = idx > 0 ? row2[idx - 1].left + row2[idx - 1].w + GAP_X : GUTTER + MARGIN;
        var nx = row2[idx + 1], maxL = nx ? nx.left - GAP_X - u.w : Infinity;
        nl = Math.max(minL, Math.min(maxL, nl)); u.left = nl;
        u.all.forEach(function (k, i) { x[k] = nl + NODE_W / 2 + i * (NODE_W + PARTNER_GAP); });
      });
    }
    if (isolated.length) {
      var cur0 = GUTTER + MARGIN;
      isolated.sort(function (a, b) { return cmpName(nm(a), nm(b)); }).forEach(function (k) { x[k] = cur0 + NODE_W / 2; cur0 += NODE_W + GAP_X; });
    }
    var minX = Infinity, maxX = -Infinity;
    keys.forEach(function (k) { minX = Math.min(minX, x[k] - NODE_W / 2); maxX = Math.max(maxX, x[k] + NODE_W / 2); });
    var shift = GUTTER + MARGIN - minX; keys.forEach(function (k) { x[k] += shift; }); maxX += shift;
    var pos = {}; keys.forEach(function (k) { pos[k] = { cx: x[k], top: TOP + gen[k] * (NODE_H + GAP_Y) }; });
    return { pos: pos, gen: gen, maxGen: maxGen, isoGen: isoGen, W: Math.max(maxX + MARGIN, 560), H: TOP + (maxGen + 1) * NODE_H + maxGen * GAP_Y + 80 };
  }

  function bez(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
  }
  function pkey(a, b) { return [a, b].sort().join('|'); }
  // pravoúhlá spojnice se zaoblenými rohy (rodič → dítě)
  function elbow(sx, sy, ex, ey, busY, r) {
    if (Math.abs(sx - ex) < 2) return 'M' + sx + ' ' + sy + ' V' + ey;
    var dir = ex > sx ? 1 : -1; r = Math.max(2, Math.min(r, Math.abs(ex - sx) / 2, (busY - sy) / 1.5, (ey - busY) / 1.5));
    return 'M' + sx + ' ' + sy + ' V' + (busY - r) + ' Q' + sx + ' ' + busY + ' ' + (sx + dir * r) + ' ' + busY + ' H' + (ex - dir * r) + ' Q' + ex + ' ' + busY + ' ' + ex + ' ' + (busY + r) + ' V' + ey;
  }

  // geometrie hran — každý prvek ví, které dvojice osob spojuje (kvůli zvýraznění cesty)
  function geometry(model, L, threadsOn) {
    var people = model.people, pos = L.pos, keys = Object.keys(people), els = [], chips = [];
    function adjacent(a, b) { return Math.abs(a.top - b.top) < 1 && Math.abs(a.cx - b.cx) - NODE_W <= PARTNER_GAP + 6; }
    function straight(a, b) {
      var l = a.cx <= b.cx ? a : b, r = a.cx <= b.cx ? b : a, y = l.top + NODE_H / 2;
      return { d: 'M' + (l.cx + NODE_W / 2) + ' ' + y + ' L' + (r.cx - NODE_W / 2) + ' ' + y, mid: { x: (l.cx + r.cx) / 2, y: y }, x1: l.cx + NODE_W / 2, x2: r.cx - NODE_W / 2, y: y };
    }
    function arcAbove(a, b) {
      var lift = 34 + Math.min(46, Math.abs(a.cx - b.cx) / 9), ty = Math.min(a.top, b.top) - lift;
      var p0 = { x: a.cx, y: a.top }, p1 = { x: a.cx, y: ty }, p2 = { x: b.cx, y: ty }, p3 = { x: b.cx, y: b.top };
      return { d: 'M' + p0.x + ' ' + p0.y + ' C' + p1.x + ' ' + p1.y + ' ' + p2.x + ' ' + p2.y + ' ' + p3.x + ' ' + p3.y, mid: bez(p0, p1, p2, p3, 0.5) };
    }
    // sourozenci bez společného rodiče
    var seen = {};
    keys.forEach(function (k) { people[k].siblings.forEach(function (o) {
      var pk = pkey(k, o); if (seen[pk]) return; seen[pk] = 1;
      if (people[k].parents.some(function (p) { return people[o].parents.indexOf(p) >= 0; })) return;
      var a = pos[k], b = pos[o];
      var g = adjacent(a, b) ? straight(a, b) : arcAbove(a, b);
      els.push({ typ: 'sourozenec', d: g.d, w: 2.6, dash: '3 5', pairs: [pk] });
    }); });
    // partneři + kotvy pro děti
    var anchor = {}, seenP = {};
    keys.forEach(function (k) { people[k].partners.forEach(function (o) {
      var pk = pkey(k, o); if (seenP[pk]) return; seenP[pk] = 1;
      var a = pos[k], b = pos[o]; if (Math.abs(a.top - b.top) > 1) return;
      var g = straight(a, b);
      els.push({ typ: 'partner', d: g.d, w: 3, pairs: [pk], ring: { x: g.mid.x, y: g.y } });
      anchor[pk] = { x: g.mid.x, y: g.y };
    }); });
    // rodič → dítě
    keys.forEach(function (ck) {
      var c = people[ck]; if (!c.parents.length) return;
      var cp = pos[ck], used = {}, starts = [];
      for (var i = 0; i < c.parents.length; i++) for (var j = i + 1; j < c.parents.length; j++) {
        var pk = pkey(c.parents[i], c.parents[j]);
        if (anchor[pk] && !used[c.parents[i]] && !used[c.parents[j]]) {
          used[c.parents[i]] = used[c.parents[j]] = 1;
          starts.push({ x: anchor[pk].x, y: anchor[pk].y + 18, ps: [c.parents[i], c.parents[j]] });
        }
      }
      c.parents.forEach(function (p) { if (!used[p]) starts.push({ x: pos[p].cx, y: pos[p].top + NODE_H, ps: [p] }); });
      starts.forEach(function (s) {
        var ey = cp.top, busY = ey - GAP_Y / 2;
        if (busY < s.y + 14) busY = (s.y + ey) / 2;
        els.push({ typ: 'rodic', w: 2.2, d: elbow(s.x, s.y, cp.cx, ey, busY, 12), dot: { x: cp.cx, y: ey }, pairs: s.ps.map(function (p) { return pkey(p, ck); }) });
      });
    });
    // kmotr / známý / strýc bez rodičů — krátká spojnice (vedle sebe) nebo oblouk
    model.sats.forEach(function (s) {
      var a = pos[s.from], b = pos[s.to]; if (!a || !b) return;
      var d, mid, fp = people[s.from] && people[s.from].p;
      if (Math.abs(a.top - b.top) < 1) { var g = adjacent(a, b) ? straight(a, b) : arcAbove(a, b); d = g.d; mid = g.mid; }
      else {
        var hi = a.top < b.top ? a : b, lo = a.top < b.top ? b : a;
        var q0 = { x: hi.cx, y: hi.top + NODE_H }, q3 = { x: lo.cx, y: lo.top }, dy2 = Math.max(30, (q3.y - q0.y) * 0.5);
        var q1 = { x: q0.x, y: q0.y + dy2 }, q2 = { x: q3.x, y: q3.y - dy2 };
        d = 'M' + q0.x + ' ' + q0.y + ' C' + q1.x + ' ' + q1.y + ' ' + q2.x + ' ' + q2.y + ' ' + q3.x + ' ' + q3.y; mid = bez(q0, q1, q2, q3, 0.5);
      }
      els.push({ typ: s.typ, d: d, w: 2.4, dash: s.typ === 'kmotr' ? '2 5' : '7 6', pairs: [pkey(s.from, s.to)] });
      chips.push({ x: mid.x, y: mid.y, text: s.typ === 'stryc' ? kinText('uncle', fp) : s.typ === 'kmotr' ? kinText('godparent', fp) : 'známý', typ: s.typ });
    });
    chips.forEach(function (c, i) { for (var j = 0; j < i; j++) { var o = chips[j]; if (Math.abs(o.x - c.x) < 90 && Math.abs(o.y - c.y) < 22) c.y = o.y + 24; } });

    // „červené nitě“: odvozené vazby (strýc–synovec, bratranci, švagři, zeť/snacha, tchán) vždy viditelně mezi špendlíky
    if (threadsOn) {
      var kin = makeKinship(S.full), TH = { uncle: 1, nephew: 1, cousin: 1, inlaw: 1, childinlaw: 1, parentinlaw: 1 };
      var hasSat = {}; model.sats.forEach(function (st) { hasSat[pkey(st.from, st.to)] = 1; });
      var ths = [], n = 0;
      keys.forEach(function (a) { keys.forEach(function (b) {
        if (a >= b) return;
        var pk = pkey(a, b); if (hasSat[pk]) return;
        var l = kin.label(a, b); if (!l || !TH[l]) return;
        var A = pos[a], B = pos[b], pa = { x: A.cx - NODE_W / 2 + 16, y: A.top + 5 }, pb = { x: B.cx - NODE_W / 2 + 16, y: B.top + 5 }, d;
        n++;
        if (Math.abs(A.top - B.top) < 1) {
          var lift = 38 + Math.min(40, Math.abs(pa.x - pb.x) / 12) + (n % 3) * 8, ty = A.top - lift;
          d = 'M' + pa.x + ' ' + pa.y + ' C' + pa.x + ' ' + ty + ' ' + pb.x + ' ' + ty + ' ' + pb.x + ' ' + pb.y;
        } else {
          var up = A.top < B.top ? pa : pb, lo = A.top < B.top ? pb : pa, dy = Math.max(60, (lo.y - up.y) * 0.5), bias = ((n % 3) - 1) * 26;
          d = 'M' + up.x + ' ' + up.y + ' C' + (up.x + bias) + ' ' + (up.y + dy) + ' ' + (lo.x - bias) + ' ' + (lo.y - dy) + ' ' + lo.x + ' ' + lo.y;
        }
        ths.push({ typ: 'nit', d: d, w: 1.8, pairs: [pk], thread: true, a: a, b: b, title: people[a].p.jmeno + ' — ' + kinText(l, people[a].p) + ' — ' + people[b].p.jmeno });
      }); });
      ths.forEach(function (t) { t.many = ths.length > 40; els.push(t); });
    }
    return { els: els, chips: chips };
  }


  // ───────────── filtry a pohledy ─────────────
  function applyFilters() {
    var gen = S.fullL ? S.fullL.gen : {}, ids = {};
    S.persons.forEach(function (p) {
      if (S.status === 'alive' && p.umrti) return;
      if (S.status === 'dead' && !p.umrti) return;
      if (S.genLimit && (gen[p.id] || 0) >= S.genLimit) return;
      ids[p.id] = 1;
    });
    S.vis = buildModel(S.persons.filter(function (p) { return ids[p.id]; }), S.relations.filter(function (r) { return ids[r.a] && ids[r.b]; }));
  }
  function viewModel() {
    var base = S.vis;
    if (S.view === 'full' || !S.sel || !base.people[S.sel]) return base;
    var inc = {}; inc[S.sel] = 1;
    function addPartners(k) { base.people[k].partners.forEach(function (p) { inc[p] = 1; }); }
    if (S.view === 'predci') {
      var st = [S.sel]; while (st.length) { var c = st.pop(); base.people[c].parents.forEach(function (p) { if (!inc[p]) { inc[p] = 1; st.push(p); } }); }
      Object.keys(inc).forEach(addPartners);
    } else if (S.view === 'potomci') {
      var st2 = [S.sel]; while (st2.length) { var c2 = st2.pop(); base.people[c2].children.forEach(function (p) { if (!inc[p]) { inc[p] = 1; st2.push(p); } }); }
      Object.keys(inc).forEach(addPartners);
    } else if (S.view === 'okoli') {
      var P = base.people[S.sel];
      P.parents.concat(P.children, P.partners, P.siblings).forEach(function (k) { inc[k] = 1; });
      P.parents.forEach(addPartners);
    }
    return buildModel(S.persons.filter(function (p) { return inc[p.id] && base.people[p.id]; }), S.relations.filter(function (r) { return inc[r.a] && inc[r.b]; }));
  }

  // ───────────── kreslení stromu ─────────────
  var uidN = 0;
  function pathEdges(sel, targets) {
    var F = S.full, adj = {};
    function link(a, b) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
    Object.keys(F.people).forEach(function (k) {
      var P = F.people[k];
      P.children.forEach(function (c) { link(k, c); }); P.partners.forEach(function (o) { link(k, o); }); P.siblings.forEach(function (o) { link(k, o); });
    });
    F.sats.forEach(function (s) { link(s.from, s.to); });
    var prev = {}, q = [sel]; prev[sel] = null;
    while (q.length) { var c = q.shift(); (adj[c] || []).forEach(function (n) { if (!(n in prev)) { prev[n] = c; q.push(n); } }); }
    var set = {};
    targets.forEach(function (t) { var n = t; while (n != null && prev[n] != null) { set[pkey(n, prev[n])] = 1; n = prev[n]; } });
    return set;
  }
  var CLR = { rodic: '#d9ad5c', partner: '#d4a95a', stryc: '#d99a63', kmotr: '#e6c75e', znamy: '#8f95a3', sourozenec: '#7fb0d6', nit: '#d6455d' };
  var HL = '#ffe08a';

  function drawer(model, L, geo, kin) {
    var uid = 'rk' + (++uidN), people = model.people, pos = L.pos, keys = Object.keys(people);
    var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    var defs = '<defs>' +
      '<linearGradient id="' + uid + 'c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f2320"/><stop offset="1" stop-color="#1a1413"/></linearGradient>' +
      '<linearGradient id="' + uid + 'cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f2c29"/><stop offset="1" stop-color="#2a1a18"/></linearGradient>' +
      '<radialGradient id="' + uid + 'm" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#8a2f3d"/><stop offset="1" stop-color="#4a1520"/></radialGradient>' +
      '<radialGradient id="' + uid + 'bg" cx="0.5" cy="0.3" r="0.9"><stop offset="0" stop-color="#2a1e1a"/><stop offset="1" stop-color="#0f0b0a"/></radialGradient>' +
      '<filter id="' + uid + 'gl" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="' + uid + 'gl2" filterUnits="userSpaceOnUse" x="0" y="0" width="' + L.W + '" height="' + L.H + '"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="' + uid + 'sh" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.6"/></filter>' +
      keys.map(function (k) { var p = pos[k]; return '<clipPath id="' + uid + 'p' + k + '"><rect x="' + (p.cx - NODE_W / 2 + 12) + '" y="' + (p.top + 14) + '" width="64" height="64" rx="11"/></clipPath>'; }).join('') +
      '</defs>';
    function bands() {
      var s = '';
      for (var g = 0; g <= L.maxGen; g++) {
        var y = TOP + g * (NODE_H + GAP_Y), iso = L.isoGen === g;
        s += '<rect x="0" y="' + (y - 24) + '" width="' + L.W + '" height="' + (NODE_H + 48) + '" fill="' + (g % 2 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.03)') + '"/>';
        s += iso
          ? '<text x="' + (GUTTER / 2) + '" y="' + (y + NODE_H / 2 + 2) + '" text-anchor="middle" style="fill:#7a6236;font-family:var(--font-mono,monospace);font-size:10px">bez</text><text x="' + (GUTTER / 2) + '" y="' + (y + NODE_H / 2 + 15) + '" text-anchor="middle" style="fill:#7a6236;font-family:var(--font-mono,monospace);font-size:10px">vazeb</text>'
          : '<text x="' + (GUTTER / 2) + '" y="' + (y + NODE_H / 2 + 7) + '" text-anchor="middle" style="fill:#7a6236;font-family:var(--font-display,Georgia,serif);font-size:22px;font-style:italic">' + (ROMAN[g] || (g + 1)) + '</text>';
        s += '<line x1="' + GUTTER + '" y1="' + (y - 18) + '" x2="' + GUTTER + '" y2="' + (y + NODE_H + 18) + '" stroke="#7a6236" stroke-opacity="0.35"/>';
      }
      return s;
    }
    function pill(xr, y, text, fill, color, stroke) {
      var w = text.length * 6.5 + 20;
      return '<g><rect x="' + (xr - w) + '" y="' + (y - 11) + '" width="' + w + '" height="22" rx="11" fill="' + fill + '" stroke="' + (stroke || fill) + '" stroke-width="1.2"/>' +
        '<text x="' + (xr - w / 2) + '" y="' + (y + 4) + '" text-anchor="middle" style="fill:' + color + ';font-family:var(--font-mono,monospace);font-size:10.5px;font-weight:600">' + esc(text) + '</text></g>';
    }
    function rings(x, y, hl) {
      var c = hl ? HL : '#d9ad5c';
      return '<g><circle cx="' + x + '" cy="' + y + '" r="16" fill="#1a1413" stroke="' + (hl ? HL : '#7a6236') + '"/>' +
        '<circle cx="' + (x - 5) + '" cy="' + y + '" r="7.5" fill="none" stroke="' + c + '" stroke-width="2"/><circle cx="' + (x + 5) + '" cy="' + y + '" r="7.5" fill="none" stroke="' + c + '" stroke-width="2"/></g>';
    }
    function chip(c) {
      var w = c.text.length * 6.4 + 18, col = CLR[c.typ];
      return '<g><rect x="' + (c.x - w / 2) + '" y="' + (c.y - 10) + '" width="' + w + '" height="20" rx="10" fill="#1a1413" stroke="' + col + '" stroke-width="1.2"/>' +
        '<text x="' + c.x + '" y="' + (c.y + 4) + '" text-anchor="middle" style="fill:' + col + ';font-family:var(--font-mono,monospace);font-size:10.5px">' + esc(c.text) + '</text></g>';
    }
    function elSvg(el, hl) {
      var col = hl ? HL : CLR[el.typ], w = hl ? el.w + 1.6 : el.w;
      var s = '<path d="' + el.d + '" stroke="' + col + '" stroke-width="' + w + '"' + (el.dash && !hl ? ' stroke-dasharray="' + el.dash + '"' : '') + (hl ? ' filter="url(#' + uid + 'gl2)"' : '') + '>' + (el.title ? '<title>' + esc(el.title) + '</title>' : '') + '</path>';
      if (el.dot) s += '<circle cx="' + el.dot.x + '" cy="' + el.dot.y + '" r="3.6" fill="' + col + '"/>';
      if (el.ring) s += rings(el.ring.x, el.ring.y, hl);
      return s;
    }
    function pin(x, y, on) {
      return '<g pointer-events="none"><ellipse cx="' + (x + 1.5) + '" cy="' + (y + 3) + '" rx="5" ry="2.4" fill="#000" opacity="0.4"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="5.4" fill="' + (on ? '#ffe08a' : '#d6455d') + '" stroke="#5b1520" stroke-width="1"/>' +
        '<circle cx="' + (x - 1.7) + '" cy="' + (y - 1.8) + '" r="1.6" fill="#fff" opacity="0.7"/></g>';
    }
    function node(k, sel, labels) {
      var p = people[k].p, ps = pos[k], x0 = ps.cx - NODE_W / 2, isSel = sel === k;
      var lab = sel && !isSel ? labels[k] : null, dim = sel && !isSel && !lab, dead = !!p.umrti;
      var lines = wrapName(p.jmeno), nl = lines.length, tx = x0 + 88;
      var dts = []; if (p.narozeni) dts.push('★ ' + fmtDate(p.narozeni)); if (p.umrti) dts.push('† ' + fmtDate(p.umrti));
      var showPill = !!p.titul && nl === 1 && dts.length <= 1;
      var contentH = nl * 16 + dts.length * 14 + (showPill ? 24 : 0);
      var y = ps.top + (NODE_H - contentH) / 2 + 12;
      var name = lines.map(function (l, i) { return '<text x="' + tx + '" y="' + (y + i * 16) + '" style="fill:#f4ebd9;font-family:var(--font-display,Georgia,serif);font-size:14.5px">' + esc(l) + '</text>'; }).join('');
      var yy = y + (nl - 1) * 16, dateSvg = '', lastY = yy;
      dts.forEach(function (d, i) { lastY = yy + 16 + i * 14; dateSvg += '<text x="' + tx + '" y="' + lastY + '" style="fill:#b3a78d;font-family:var(--font-mono,monospace);font-size:10.5px">' + esc(d) + '</text>'; });
      var title = '';
      if (showPill) {
        var t = p.titul.length > 17 ? p.titul.slice(0, 16) + '…' : p.titul, w = t.length * 6.2 + 16, ty = lastY + 7;
        title = '<g><rect x="' + tx + '" y="' + ty + '" width="' + w + '" height="18" rx="9" fill="rgba(217,173,92,0.12)" stroke="#a8843f"/><text x="' + (tx + w / 2) + '" y="' + (ty + 12.5) + '" text-anchor="middle" style="fill:#e6c97c;font-family:var(--font-mono,monospace);font-size:10px">' + esc(t) + '</text></g>';
      }
      var photo;
      if (p.foto) photo = '<image href="' + esc(p.foto) + '" x="' + (x0 + 12) + '" y="' + (ps.top + 14) + '" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + uid + 'p' + k + ')"' + (dead ? ' style="filter:grayscale(1) brightness(0.85)"' : '') + '/>' +
        '<rect x="' + (x0 + 12) + '" y="' + (ps.top + 14) + '" width="64" height="64" rx="11" fill="none" stroke="#c9a35b" stroke-width="1.4"/>';
      else photo = '<rect x="' + (x0 + 12) + '" y="' + (ps.top + 14) + '" width="64" height="64" rx="11" fill="url(#' + uid + 'm)" stroke="#c9a35b" stroke-width="1.4"/>' +
        '<text x="' + (x0 + 44) + '" y="' + (ps.top + 55) + '" text-anchor="middle" style="fill:#f1e8d6;font-family:var(--font-display,Georgia,serif);font-size:22px;font-weight:600">' + esc(initials(p.jmeno)) + '</text>';
      var badge = isSel ? pill(x0 + NODE_W - 10, ps.top, 'POHLED Z', '#d9ad5c', '#1a1413') : (lab ? pill(x0 + NODE_W - 10, ps.top, kinText(lab, p), '#1a1413', '#e6c97c', '#d9ad5c') : '');
      return '<g class="rk-node" data-k="' + esc(k) + '" style="cursor:pointer;opacity:' + (dim ? 0.36 : 1) + '"' + (isSel ? ' filter="url(#' + uid + 'gl)"' : '') + '>' +
        '<title>' + esc(p.jmeno) + (p.titul ? ' · ' + esc(p.titul) : '') + (lab ? ' — ' + esc(kinText(lab, p)) : '') + '</title>' +
        '<rect x="' + x0 + '" y="' + ps.top + '" width="' + NODE_W + '" height="' + NODE_H + '" rx="13" filter="url(#' + uid + 'sh)" fill="url(#' + uid + (isSel ? 'cs' : 'c') + ')" stroke="' + (isSel ? '#f0d38a' : '#7a6236') + '" stroke-width="' + (isSel ? 2.4 : 1.3) + '"/>' +
        photo + name + dateSvg + title + badge + pin(x0 + 16, ps.top + 5, isSel) + '</g>';
    }
    return function (sel) {
      var labels = {}, hlSet = {}, hasSel = sel && S.full.people[sel];
      if (hasSel) {
        keys.forEach(function (k) { if (k !== sel) { var l = kin.label(k, sel); if (l) labels[k] = l; } });
        hlSet = pathEdges(sel, Object.keys(labels));
      }
      var out = defs + '<rect width="' + L.W + '" height="' + L.H + '" fill="url(#' + uid + 'bg)"/>' + bands();
      var base = '', top = '';
      geo.els.forEach(function (el) {
        var hl = hasSel && (el.pairs.some(function (p) { return hlSet[p]; }) || (el.thread && (el.a === sel || el.b === sel) && (labels[el.a] || labels[el.b])));
        if (hl) top += elSvg(el, true);
        else if (!(el.many && !hasSel)) base += elSvg(el, false);
      });
      out += '<g opacity="' + (hasSel ? 0.3 : 1) + '" fill="none" stroke-linecap="round">' + base + '</g>';
      out += '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' + top + '</g>';
      geo.chips.forEach(function (c) { out += chip(c); });
      keys.forEach(function (k) { out += node(k, sel, labels); });
      return out;
    };
  }

  // ───────────── mapa vztahů (kruhy podle generací) ─────────────
  function mapLayout(model, mini) {
    var keys = Object.keys(model.people), gens = layout(model).gen, byGen = {};
    keys.forEach(function (k) { (byGen[gens[k]] = byGen[gens[k]] || []).push(k); });
    var gk = Object.keys(byGen).map(Number).sort(function (a, b) { return a - b; });
    var step = mini ? 26 : 150, base = mini ? 22 : 130, spacing = mini ? 13 : 98, pos = {}, maxR = 0, radii = [];
    gk.forEach(function (g, ri) {
      var list = byGen[g].sort(function (a, b) { return cmpName(model.people[a].p.jmeno, model.people[b].p.jmeno); });
      var r = (ri === 0 && list.length === 1) ? 0 : Math.max(base + (gk[0] === gk[ri] && list.length === 1 ? 0 : ri * step), list.length * spacing / (2 * Math.PI));
      maxR = Math.max(maxR, r); if (r > 0) radii.push(r);
      list.forEach(function (k, i) { var ang = -Math.PI / 2 + 2 * Math.PI * i / list.length + ri * 0.5; pos[k] = { x: r * Math.cos(ang), y: r * Math.sin(ang) }; });
    });
    var m = mini ? 12 : 100, W = 2 * (maxR + m), H = 2 * (maxR + m);
    keys.forEach(function (k) { pos[k].x += W / 2; pos[k].y += H / 2; });
    return { pos: pos, radii: radii, W: Math.max(W, mini ? 80 : 520), H: Math.max(H, mini ? 80 : 520), cx: W / 2, cy: H / 2 };
  }
  function mapEdges(model) {
    var out = [];
    model.sats.forEach(function (s) { out.push({ a: s.from, b: s.to, typ: s.typ }); });
    var seen = {};
    Object.keys(model.people).forEach(function (k) {
      var P = model.people[k];
      P.children.forEach(function (c) { out.push({ a: k, b: c, typ: 'rodic' }); });
      P.partners.forEach(function (o) { var pk = pkey(k, o); if (!seen['p' + pk]) { seen['p' + pk] = 1; out.push({ a: k, b: o, typ: 'partner' }); } });
      P.siblings.forEach(function (o) { var pk = pkey(k, o); if (!seen['s' + pk]) { seen['s' + pk] = 1; out.push({ a: k, b: o, typ: 'sourozenec' }); } });
    });
    return out;
  }
  function miniMapSvg(model) {
    if (!Object.keys(model.people).length) return '';
    var M = mapLayout(model, true), s = '<svg viewBox="0 0 ' + M.W + ' ' + M.H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:150px">';
    mapEdges(model).forEach(function (e) {
      var a = M.pos[e.a], b = M.pos[e.b]; if (!a || !b) return;
      s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (CLR[e.typ] || '#888') + '" stroke-width="1" opacity="0.7"/>';
    });
    Object.keys(model.people).forEach(function (k) { var q = M.pos[k]; s += '<circle cx="' + q.x + '" cy="' + q.y + '" r="4.5" fill="' + (model.people[k].p.umrti ? '#8f95a3' : '#e6c97c') + '" stroke="#5b4420"/>'; });
    return s + '</svg>';
  }
  function mapDrawer(model, M, kin) {
    var uid = 'rm' + (++uidN), keys = Object.keys(model.people), R = 30;
    var defs = '<defs><radialGradient id="' + uid + 'bg" cx="0.5" cy="0.5" r="0.8"><stop offset="0" stop-color="#2a1e1a"/><stop offset="1" stop-color="#0f0b0a"/></radialGradient>' +
      '<radialGradient id="' + uid + 'm" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#8a2f3d"/><stop offset="1" stop-color="#4a1520"/></radialGradient>' +
      '<filter id="' + uid + 'gl" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      keys.map(function (k) { var q = M.pos[k]; return '<clipPath id="' + uid + 'c' + k + '"><circle cx="' + q.x + '" cy="' + q.y + '" r="' + (R - 2) + '"/></clipPath>'; }).join('') + '</defs>';
    var edges = mapEdges(model);
    return function (sel) {
      var hasSel = sel && model.people[sel], labels = {};
      if (hasSel) keys.forEach(function (k) { if (k !== sel) { var l = kin.label(k, sel); if (l) labels[k] = l; } });
      var out = defs + '<rect width="' + M.W + '" height="' + M.H + '" fill="url(#' + uid + 'bg)"/>';
      (M.radii || []).forEach(function (r, i) { out += '<circle cx="' + M.cx + '" cy="' + M.cy + '" r="' + r + '" fill="none" stroke="#7a6236" stroke-opacity="0.22" stroke-dasharray="4 8"/>'; });
      var base = '', top = '';
      edges.forEach(function (e) {
        var a = M.pos[e.a], b = M.pos[e.b]; if (!a || !b) return;
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, qx = mx + (M.cx - mx) * 0.22, qy = my + (M.cy - my) * 0.22;
        var touch = hasSel && (e.a === sel || e.b === sel);
        var d = '<path d="M' + a.x + ' ' + a.y + ' Q' + qx + ' ' + qy + ' ' + b.x + ' ' + b.y + '" fill="none" stroke="' + (touch ? HL : CLR[e.typ]) + '" stroke-width="' + (touch ? 3.4 : 2) + '"' + (e.typ === 'kmotr' || e.typ === 'sourozenec' ? ' stroke-dasharray="3 5"' : '') + '/>';
        if (touch) top += d; else base += d;
      });
      out += '<g opacity="' + (hasSel ? 0.28 : 0.85) + '">' + base + '</g><g>' + top + '</g>';
      keys.forEach(function (k) {
        var p = model.people[k].p, q = M.pos[k], isSel = sel === k, lab = hasSel && !isSel ? labels[k] : null, dim = hasSel && !isSel && !lab;
        var nm = p.jmeno.length > 22 ? p.jmeno.slice(0, 21) + '…' : p.jmeno;
        out += '<g class="rk-node" data-k="' + esc(k) + '" style="cursor:pointer;opacity:' + (dim ? 0.35 : 1) + '"' + (isSel ? ' filter="url(#' + uid + 'gl)"' : '') + '><title>' + esc(p.jmeno) + '</title>' +
          '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + R + '" fill="url(#' + uid + 'm)" stroke="' + (isSel ? HL : '#c9a35b') + '" stroke-width="' + (isSel ? 3 : 2) + '"/>' +
          (p.foto ? '<image href="' + esc(p.foto) + '" x="' + (q.x - R + 2) + '" y="' + (q.y - R + 2) + '" width="' + (2 * R - 4) + '" height="' + (2 * R - 4) + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + uid + 'c' + k + ')"' + (p.umrti ? ' style="filter:grayscale(1) brightness(0.85)"' : '') + '/>'
            : '<text x="' + q.x + '" y="' + (q.y + 6) + '" text-anchor="middle" style="fill:#f1e8d6;font-family:var(--font-display,Georgia,serif);font-size:17px;font-weight:600">' + esc(initials(p.jmeno)) + '</text>') +
          '<text x="' + q.x + '" y="' + (q.y + R + 17) + '" text-anchor="middle" style="fill:#f4ebd9;font-family:var(--font-display,Georgia,serif);font-size:12.5px">' + esc(nm) + '</text>' +
          (lab ? '<text x="' + q.x + '" y="' + (q.y + R + 31) + '" text-anchor="middle" style="fill:#e6c97c;font-family:var(--font-mono,monospace);font-size:10px">' + esc(kinText(lab, p)) + '</text>' : '') + '</g>';
      });
      return out;
    };
  }

  // ───────────── vykreslení plátna ─────────────
  var cur = { L: null, drawFn: null };
  function emptyCanvas(title, text) {
    $('rk-svg-host').innerHTML = '<div class="rk-empty"><div class="rk-empty-ico">❦</div><div class="rk-empty-t">' + esc(title) + '</div><div>' + text + '</div></div>';
    cur.L = null; cur.drawFn = null;
  }
  function renderCanvas() {
    if (!S.persons.length) {
      emptyCanvas('Rodokmen je zatím prázdný', CFG.canEdit ? 'Začni tlačítkem <b>+ Přidat osobu</b>. U osoby pak přidáš rodiče, partnera, děti i širší rodinu — strom se sestaví sám.' : 'Vedení sem zatím nepřidalo žádné osoby.');
      $('rk-info').style.display = 'none'; return;
    }
    $('rk-info').style.display = '';
    var model = viewModel();
    if (!Object.keys(model.people).length) { emptyCanvas('Filtr nic nenašel', 'Zkus změnit filtr generací nebo členů.'); return; }
    var host = $('rk-svg-host'), kin = makeKinship(S.full);
    if (S.mode === 'map') {
      var M = mapLayout(model, false);
      cur.L = { W: M.W, H: M.H, pos: {} };
      Object.keys(M.pos).forEach(function (k) { cur.L.pos[k] = { cx: M.pos[k].x, top: M.pos[k].y - NODE_H / 2 }; });
      cur.drawFn = mapDrawer(model, M, kin);
    } else {
      var L = layout(model), geo = geometry(model, L, S.threads);
      cur.L = L; cur.drawFn = drawer(model, L, geo, kin);
    }
    host.innerHTML = '<svg id="rk-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + cur.L.W + ' ' + cur.L.H + '" width="' + cur.L.W + '" height="' + cur.L.H + '"></svg>';
    paintSvg(); applyScale();
  }
  function paintSvg() {
    var svg = $('rk-svg'); if (!svg || !cur.drawFn) return;
    svg.innerHTML = cur.drawFn(S.sel);
    var info = $('rk-info'), p = S.sel && byId(S.sel);
    if (p) info.innerHTML = 'Pohled z: <b>' + esc(p.jmeno) + '</b> — u ostatních vidíš, kým jsou pro tuto osobu. <button type="button" id="rk-clear">zrušit výběr</button>';
    else info.textContent = 'Klikni na osobu — zobrazí se detail a u ostatních, kým jsou pro ni (strýc, teta, bratranec, švagr, zeť, tchán…).';
  }
  function applyScale() {
    var svg = $('rk-svg'); if (!svg || !cur.L) return;
    svg.setAttribute('width', Math.round(cur.L.W * S.scale)); svg.setAttribute('height', Math.round(cur.L.H * S.scale));
  }
  function fitScale() {
    var sc = $('rk-scroll'); if (!sc || !cur.L) return;
    var av = sc.clientWidth - 4; S.scale = av > 0 ? Math.max(0.72, Math.min(1, av / cur.L.W)) : 1; applyScale();
  }
  function focusOn(id) {
    var sc = $('rk-scroll'); if (!sc || !cur.L || !cur.L.pos[id]) return;
    var p = cur.L.pos[id];
    if (!sc.scrollTo) return;
    sc.scrollTo({ left: Math.max(0, p.cx * S.scale - sc.clientWidth / 2), top: Math.max(0, (p.top + NODE_H / 2) * S.scale - sc.clientHeight / 2), behavior: 'smooth' });
  }

  // ───────────── export obrázku ─────────────
  function blobToDataUrl(b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); }); }
  function renderExport(opts) {
    var svg = $('rk-svg');
    if (!svg) return Promise.reject(new Error('Není co exportovat'));
    var vb = svg.viewBox.baseVal, W = vb.width, H = vb.height;
    var clone = svg.cloneNode(true);
    return Promise.all([].slice.call(clone.querySelectorAll('image')).map(function (im) {
      var href = im.getAttribute('href') || im.getAttribute('xlink:href');
      if (!href || href.indexOf('data:') === 0) return null;
      return fetch(href).then(function (r) { return r.blob(); }).then(blobToDataUrl).then(function (d) { im.setAttribute('href', d); }).catch(function () { if (im.parentNode) im.parentNode.removeChild(im); });
    })).then(function () {
      var headerH = opts.title ? 90 : 0;
      var sc = Math.min(opts.scale, 7600 / Math.max(W, H + headerH));
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', Math.round(W * sc)); clone.setAttribute('height', Math.round(H * sc));
      var str = new XMLSerializer().serializeToString(clone).replace(/var\(--[a-z0-9-]+,([^)]+)\)/g, '$1');
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas'); c.width = Math.round(W * sc); c.height = Math.round((H + headerH) * sc);
          var ctx = c.getContext('2d'); ctx.fillStyle = '#0f0b0a'; ctx.fillRect(0, 0, c.width, c.height);
          if (opts.title) {
            var g = ctx.createLinearGradient(0, 0, c.width, 0); g.addColorStop(0, '#2a1e1a'); g.addColorStop(1, '#120d0c');
            ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, headerH * sc);
            ctx.fillStyle = '#e6c97c'; ctx.font = 'italic ' + Math.round(38 * sc) + 'px Georgia, serif'; ctx.textBaseline = 'middle';
            ctx.fillText('Rodokmen Caledonie', 36 * sc, 42 * sc);
            ctx.fillStyle = '#9a8f78'; ctx.font = Math.round(14 * sc) + 'px monospace';
            ctx.fillText(new Date().toLocaleDateString('cs-CZ') + '  ·  ' + S.persons.length + ' osob', 38 * sc, 72 * sc);
            ctx.strokeStyle = '#7a6236'; ctx.lineWidth = sc; ctx.beginPath(); ctx.moveTo(0, headerH * sc); ctx.lineTo(c.width, headerH * sc); ctx.stroke();
          }
          ctx.drawImage(img, 0, headerH * sc, c.width, Math.round(H * sc));
          try { resolve({ png: c.toDataURL('image/png'), jpg: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height }); } catch (e) { reject(e); }
        };
        img.onerror = function () { reject(new Error('Obrázek se nepodařilo vykreslit')); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
      });
    });
  }
  function dataUrlBytes(d) { return Math.round((d.length - d.indexOf(',') - 1) * 0.75); }
  function openExport() {
    if (!$('rk-svg')) return toast('Není co exportovat — rodokmen je prázdný', true);
    var m = $('rk-modal'), res = null, busy = false;
    m.innerHTML = '<div class="rk-ov"><div class="rk-md" style="max-width:900px"><div class="rk-md-h"><span>Exportovat rodokmen</span><button class="rk-x" id="ex-close">✕</button></div>' +
      '<div class="rk-md-b"><div class="rk-ex-grid"><div class="rk-ex-prev" id="ex-prev"><div class="rk-muted">Připravuji náhled…</div></div><div>' +
      '<div class="rk-d-h" style="margin-top:0">Co se exportuje</div><div class="rk-muted">Aktuální pohled (' + (S.mode === 'map' ? 'mapa vztahů' : 'rodinný strom') + (S.sel ? ', zvýrazněná osoba ' + esc(byId(S.sel) ? byId(S.sel).jmeno : '') : '') + '). Chceš-li něco jiného, zavři okno a změň filtr nebo pohled.</div>' +
      '<div class="form-group" style="margin-top:1rem"><label>Rozlišení</label><select id="ex-scale"><option value="1">Standardní (1×)</option><option value="2" selected>Vysoké (2×)</option><option value="3">Maximální (3×)</option></select></div>' +
      '<label class="rk-toggle" style="margin-bottom:1rem"><input type="checkbox" id="ex-title" checked><span>Přidat nadpis a datum</span></label>' +
      '<div class="rk-ex-size rk-muted" id="ex-size"></div>' +
      '<div class="rk-ex-btns"><button class="rk-btn rk-btn-gold" id="ex-dl" disabled>⤓ Stáhnout obrázek</button><button class="rk-btn" id="ex-copy" disabled>Kopírovat do schránky</button></div>' +
      (CFG.canDiscord ? '<div class="rk-d-h">Poslat na Discord</div><div class="form-group"><input type="text" id="ex-cap" maxlength="300" placeholder="Poznámka ke zprávě (nepovinné)"></div><button class="rk-btn rk-btn-gold" id="ex-dc" disabled>Odeslat na Discord</button>' : '<div class="rk-muted" style="margin-top:1rem">Odeslání na Discord je dostupné od hodnosti Senior Member. Obrázek si stáhni a pošli ručně.</div>') +
      '</div></div></div></div></div>';
    function close() { m.innerHTML = ''; }
    $('ex-close').addEventListener('click', close);
    function make() {
      if (busy) return; busy = true;
      ['ex-dl', 'ex-copy', 'ex-dc'].forEach(function (id) { var b = $(id); if (b) b.disabled = true; });
      $('ex-prev').innerHTML = '<div class="rk-muted">Vykresluji…</div>';
      renderExport({ scale: parseFloat($('ex-scale').value), title: $('ex-title').checked }).then(function (r) {
        busy = false; res = r;
        $('ex-prev').innerHTML = '<img src="' + r.png + '" alt="Náhled">';
        $('ex-size').textContent = r.w + ' × ' + r.h + ' px · PNG ≈ ' + (dataUrlBytes(r.png) / 1048576).toFixed(1) + ' MB';
        ['ex-dl', 'ex-copy', 'ex-dc'].forEach(function (id) { var b = $(id); if (b) b.disabled = false; });
      }).catch(function (e) { busy = false; $('ex-prev').innerHTML = '<div class="rk-muted">Export se nepodařil: ' + esc(e.message || '') + '</div>'; });
    }
    $('ex-scale').addEventListener('change', make); $('ex-title').addEventListener('change', make);
    $('ex-dl').addEventListener('click', function () {
      if (!res) return; var a = document.createElement('a'); a.href = res.png; a.download = 'rodokmen-caledonia.png'; document.body.appendChild(a); a.click(); a.remove();
    });
    $('ex-copy').addEventListener('click', function () {
      if (!res) return;
      fetch(res.png).then(function (r) { return r.blob(); }).then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); })
        .then(function () { toast('Obrázek zkopírován — vlož ho (Ctrl+V) třeba do Discordu'); }).catch(function () { toast('Prohlížeč nepovolil kopírování — použij Stáhnout', true); });
    });
    if ($('ex-dc')) $('ex-dc').addEventListener('click', function () {
      if (!res) return;
      var img = dataUrlBytes(res.png) > 7.5 * 1048576 ? res.jpg : res.png;
      if (dataUrlBytes(img) > 7.7 * 1048576) return toast('Obrázek je pro Discord příliš velký — sniž rozlišení', true);
      var b = $('ex-dc'); b.disabled = true; b.textContent = 'Odesílám…';
      api('POST', '/api/rodokmen/export-discord', { image: img, caption: $('ex-cap').value.trim() }).then(function (d) {
        b.disabled = false; b.textContent = 'Odeslat na Discord';
        if (d.ok) { toast('Rodokmen odeslán na Discord'); close(); } else toast(d.error || 'Odeslání selhalo', true);
      }).catch(function () { b.disabled = false; b.textContent = 'Odeslat na Discord'; toast('Odeslání selhalo', true); });
    });
    make();
  }


  // ───────────── přidání vazby (z pohledu vybrané osoby X) ─────────────
  var ROLES = [
    ['rodic', 'je rodič (otec / matka) osoby'], ['dite', 'je dítě osoby'], ['partner', 'je partner / manžel(ka) osoby'], ['sourozenec', 'je sourozenec osoby'],
    ['stryc', 'je strýc / teta osoby'], ['neter', 'je synovec / neteř osoby'], ['svagr', 'je švagr / švagrová osoby'],
    ['kmotr', 'je kmotr / kmotra osoby'], ['kmotrenec', 'je kmotřenec osoby'], ['znamy', 'je rodinný známý osoby']
  ];
  function addRelationHtml(p) {
    return '<div class="rk-d-h">Přidat vazbu</div><div class="rk-addrel">' +
      '<div class="rk-ar-line"><select id="ar-person"><option value="">— vyber osobu —</option>' +
      S.persons.filter(function (o) { return o.id !== p.id; }).sort(function (a, b) { return cmpName(a.jmeno, b.jmeno); }).map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.jmeno) + '</option>'; }).join('') +
      '<option value="__new__">+ Nová osoba…</option></select></div>' +
      '<input type="text" id="ar-new" placeholder="Jméno nové osoby" style="display:none">' +
      '<div class="rk-ar-line"><select id="ar-role">' + ROLES.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + ' ' + esc(p.jmeno) + '</option>'; }).join('') + '</select></div>' +
      '<div id="ar-via-wrap" style="display:none"><select id="ar-via"></select><div class="rk-hint" id="ar-hint"></div></div>' +
      '<button class="rk-btn rk-btn-gold" id="ar-go">Zapsat vazbu</button></div>';
  }
  function bindAddRelation(x) {
    function parentsOf(id) { return S.relations.filter(function (r) { return r.typ === 'rodic' && r.b === id; }).map(function (r) { return r.a; }); }
    function partnersOf(id) { var o = []; S.relations.forEach(function (r) { if (r.typ === 'partner') { if (r.a === id) o.push(r.b); else if (r.b === id) o.push(r.a); } }); return o; }
    function siblingsOf(id) { var o = []; S.relations.forEach(function (r) { if (r.typ === 'sourozenec') { if (r.a === id) o.push(r.b); else if (r.b === id) o.push(r.a); } }); return o; }
    function name(id) { var p = byId(id); return p ? p.jmeno : '?'; }
    var selP = $('ar-person'), selR = $('ar-role'), via = $('ar-via'), wrap = $('ar-via-wrap'), hint = $('ar-hint'), nw = $('ar-new');
    function refresh() {
      nw.style.display = selP.value === '__new__' ? '' : 'none';
      var role = selR.value, y = selP.value, opts = [], h = '', allowNone = false;
      if (role === 'stryc') {
        parentsOf(x.id).forEach(function (pid) { opts.push(['sib:' + pid, 'Vybraná osoba je sourozenec osoby ' + name(pid)]); });
        h = opts.length ? 'Napojí se jako sourozenec rodiče — strýc/teta se pak dopočítá sám.' : 'Osoba ' + x.jmeno + ' zatím nemá zapsané rodiče, vazba se zapíše samostatně.'; allowNone = true;
      } else if (role === 'neter') {
        if (y && y !== '__new__') parentsOf(y).forEach(function (pid) { opts.push(['sib:' + pid, x.jmeno + ' je sourozenec osoby ' + name(pid)]); });
        h = opts.length ? 'Napojí se přes rodiče vybrané osoby.' : 'Vybraná osoba zatím nemá zapsané rodiče, vazba se zapíše samostatně.'; allowNone = true;
      } else if (role === 'svagr') {
        partnersOf(x.id).forEach(function (pid) { opts.push(['sib:' + pid, 'Vybraná osoba je sourozenec partnera ' + name(pid)]); });
        siblingsOf(x.id).forEach(function (pid) { opts.push(['par:' + pid, 'Vybraná osoba je partner sourozence ' + name(pid)]); });
        h = opts.length ? 'Švagr/švagrová se napojí přes partnera nebo sourozence.' : 'Nejdřív u osoby ' + x.jmeno + ' zapiš partnera nebo sourozence — přes něj se švagr napojí.';
      } else { wrap.style.display = 'none'; return; }
      wrap.style.display = '';
      via.innerHTML = opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + (allowNone ? '<option value="">— jen zapsat, bez napojení —</option>' : '');
      hint.textContent = h;
    }
    selP.addEventListener('change', refresh); selR.addEventListener('change', refresh); refresh();

    $('ar-go').addEventListener('click', function () {
      var role = selR.value, y = selP.value;
      if (!y) return toast('Vyber osobu', true);
      var viaVal = wrap.style.display === 'none' ? '' : via.value;
      if (role === 'svagr' && !viaVal) return toast('Švagra nejde napojit bez partnera nebo sourozence', true);
      var chain = Promise.resolve(y);
      if (y === '__new__') {
        var nn = nw.value.trim(); if (!nn) return toast('Vyplň jméno nové osoby', true);
        chain = api('POST', '/api/rodokmen/osoby', { jmeno: nn }).then(function (d) { if (!d.ok) throw new Error(d.error); return d.person.id; });
      }
      chain.then(function (yid) {
        var jobs = [];
        function rel(a, b, typ) { jobs.push({ a: a, b: b, typ: typ }); }
        if (role === 'rodic') rel(yid, x.id, 'rodic');
        else if (role === 'dite') rel(x.id, yid, 'rodic');
        else if (role === 'partner') rel(x.id, yid, 'partner');
        else if (role === 'sourozenec') rel(x.id, yid, 'sourozenec');
        else if (role === 'kmotr') rel(yid, x.id, 'kmotr');
        else if (role === 'kmotrenec') rel(x.id, yid, 'kmotr');
        else if (role === 'znamy') rel(x.id, yid, 'znamy');
        else if (role === 'stryc') { if (viaVal) { var o = viaVal.slice(4); rel(yid, o, 'sourozenec'); } else rel(yid, x.id, 'stryc'); }
        else if (role === 'neter') { if (viaVal) { rel(x.id, viaVal.slice(4), 'sourozenec'); } else rel(x.id, yid, 'stryc'); }
        else if (role === 'svagr') { var kind = viaVal.slice(0, 3), other = viaVal.slice(4); rel(yid, other, kind === 'sib' ? 'sourozenec' : 'partner'); }
        return jobs.reduce(function (pr, j) { return pr.then(function () { return api('POST', '/api/rodokmen/vazby', j).then(function (d) { if (!d.ok) throw new Error(d.error); }); }); }, Promise.resolve());
      }).then(function () { toast('Vazba zapsána'); return reload(); })
        .catch(function (e) { toast(e.message || 'Zápis se nepodařil', true); return reload(); });
    });
  }

  // ───────────── seznam osob ─────────────
  function renderPeople() {
    var q = ($('rk-pq').value || '').trim().toLowerCase();
    var list = S.persons.filter(function (p) { return !q || p.jmeno.toLowerCase().indexOf(q) >= 0 || (p.titul || '').toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return cmpName(a.jmeno, b.jmeno); });
    $('rk-people-grid').innerHTML = list.length ? list.map(function (p) {
      var age = ageOf(p);
      return '<div class="rk-pc" data-k="' + esc(p.id) + '"><div class="rk-pc-ph">' + (p.foto ? '<img src="' + esc(p.foto) + '" alt=""' + (p.umrti ? ' style="filter:grayscale(1) brightness(.85)"' : '') + '>' : '<div class="rk-d-mono">' + esc(initials(p.jmeno)) + '</div>') + '</div>' +
        '<div class="rk-pc-b"><div class="rk-pc-n">' + esc(p.jmeno) + (p.umrti ? ' †' : '') + '</div>' + (p.titul ? '<div class="rk-pc-t">' + esc(p.titul) + '</div>' : '') +
        '<div class="rk-pc-d">' + (p.narozeni ? esc(fmtDate(p.narozeni)) + (age != null ? ' · ' + letText(age) : '') : '—') + '</div></div></div>';
    }).join('') : '<div class="rk-muted" style="padding:1rem">Nic nenalezeno.</div>';
  }

  // ───────────── editor osoby ─────────────
  function openEditor(person) {
    var p = person || { jmeno: '', titul: '', pohlavi: '', narozeni: '', umrti: '', lore: '', foto: null, clen: '' };
    var photoNew; // undefined = beze změny, '' = odebrat, dataURL = nová
    var m = $('rk-modal');
    m.innerHTML = '<div class="rk-ov"><div class="rk-md"><div class="rk-md-h"><span>' + (person ? 'Upravit osobu' : 'Nová osoba') + '</span><button class="rk-x" id="md-close">✕</button></div>' +
      '<div class="rk-md-b"><div class="rk-md-grid"><div><div class="rk-drop" id="md-drop" tabindex="0"><img id="md-prev" alt="" style="display:none"><div class="rk-drop-t" id="md-drop-t">Klikni, přetáhni<br>nebo <b>Ctrl+V</b><br>fotku</div></div>' +
      '<button type="button" class="rk-link" id="md-rmphoto" style="display:none">Odebrat fotku</button><input type="file" id="md-file" accept="image/*" style="display:none"></div>' +
      '<div><div class="form-group"><label>Jméno *</label><input type="text" id="md-jmeno" maxlength="80" value="' + esc(p.jmeno) + '"></div>' +
      '<div class="form-row"><div class="form-group"><label>Titul / role</label><input type="text" id="md-titul" maxlength="60" placeholder="např. Zakladatel" value="' + esc(p.titul) + '"></div>' +
      '<div class="form-group"><label>Pohlaví</label><select id="md-pohlavi"><option value="">Neuvedeno</option><option value="m"' + (p.pohlavi === 'm' ? ' selected' : '') + '>Muž</option><option value="z"' + (p.pohlavi === 'z' ? ' selected' : '') + '>Žena</option></select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Datum narození</label><input type="date" id="md-nar" value="' + esc(p.narozeni) + '"></div>' +
      '<div class="form-group"><label>Datum úmrtí (nepovinné)</label><input type="date" id="md-umr" value="' + esc(p.umrti) + '"></div></div>' +
      '<div class="form-group"><label>Propojit s členem webu (IC jméno, nepovinné)</label><input type="text" id="md-clen" list="md-members" maxlength="80" value="' + esc(p.clen) + '"><datalist id="md-members"></datalist></div></div></div>' +
      '<div class="form-group" style="margin-top:0.8rem"><label>Představení / lore</label><textarea id="md-lore" rows="6" maxlength="2500" placeholder="Krátký příběh, povaha, role v rodině…">' + esc(p.lore) + '</textarea></div></div>' +
      '<div class="rk-md-f"><button class="rk-btn" id="md-cancel">Zrušit</button><button class="rk-btn rk-btn-gold" id="md-save">' + (person ? 'Uložit změny' : 'Přidat osobu') + '</button></div></div></div>';
    fetch('/api/ic-names').then(function (r) { return r.json(); }).then(function (d) { if (d.ok && $('md-members')) $('md-members').innerHTML = d.names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join(''); }).catch(function () {});

    var prev = $('md-prev'), dropT = $('md-drop-t'), rm = $('md-rmphoto');
    function showPhoto(src) {
      if (src) { prev.src = src; prev.style.display = 'block'; dropT.style.display = 'none'; rm.style.display = ''; }
      else { prev.style.display = 'none'; dropT.style.display = ''; rm.style.display = 'none'; }
    }
    showPhoto(p.foto);
    function handleFile(file) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) return;
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 900, w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          var ctx = c.getContext('2d'); ctx.fillStyle = '#111'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
          photoNew = c.toDataURL('image/jpeg', 0.86); showPhoto(photoNew);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    }
    var drop = $('md-drop'), file = $('md-file');
    drop.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function (e) { handleFile(e.target.files && e.target.files[0]); });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); handleFile(e.dataTransfer.files && e.dataTransfer.files[0]); });
    function onPaste(e) {
      var items = e.clipboardData && e.clipboardData.items; if (!items) return;
      for (var i = 0; i < items.length; i++) if (items[i].type && items[i].type.indexOf('image/') === 0) { handleFile(items[i].getAsFile()); e.preventDefault(); break; }
    }
    document.addEventListener('paste', onPaste);
    rm.addEventListener('click', function () { photoNew = ''; showPhoto(null); });
    function close() { document.removeEventListener('paste', onPaste); m.innerHTML = ''; }
    $('md-close').addEventListener('click', close); $('md-cancel').addEventListener('click', close);
    $('md-save').addEventListener('click', function () {
      var body = { jmeno: $('md-jmeno').value.trim(), titul: $('md-titul').value.trim(), pohlavi: $('md-pohlavi').value, narozeni: $('md-nar').value, umrti: $('md-umr').value, clen: $('md-clen').value.trim(), lore: $('md-lore').value.trim() };
      if (!body.jmeno) return toast('Vyplň jméno', true);
      if (photoNew !== undefined) body.foto = photoNew;
      var btn = $('md-save'); btn.disabled = true;
      api(person ? 'PUT' : 'POST', person ? '/api/rodokmen/osoby/' + person.id : '/api/rodokmen/osoby', body).then(function (d) {
        btn.disabled = false;
        if (!d.ok) return toast(d.error || 'Chyba', true);
        toast(person ? 'Osoba uložena' : 'Osoba přidána'); close();
        S.sel = d.person.id; return reload().then(function () { focusOn(S.sel); });
      }).catch(function () { btn.disabled = false; toast('Uložení se nepodařilo', true); });
    });
  }


  // ───────────── události (časová osa) ─────────────
  function allEvents() {
    var out = [];
    S.persons.forEach(function (p) {
      var f = p.pohlavi === 'z';
      if (p.narozeni) out.push({ kind: 'birth', d: p.narozeni, persons: [p.id], title: (f ? 'Narodila se ' : 'Narodil se ') + p.jmeno });
      if (p.umrti) out.push({ kind: 'death', d: p.umrti, persons: [p.id], title: (f ? 'Zemřela ' : 'Zemřel ') + p.jmeno });
    });
    S.events.forEach(function (e) { out.push({ kind: 'event', id: e.id, d: e.datum, persons: e.osoby || [], title: e.nazev, text: e.popis }); });
    out.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
    return out;
  }
  function avatar(p, cls) {
    return p.foto ? '<img class="' + cls + '" src="' + esc(p.foto) + '" alt="">' : '<div class="' + cls + ' rk-mono">' + esc(initials(p.jmeno)) + '</div>';
  }
  var EV_ICON = { birth: '✶', death: '†', event: '◆' };
  function evRow(e, editable) {
    var ps = e.persons.map(byId).filter(Boolean);
    return '<div class="rk-tl-item"><div class="rk-tl-dot rk-tl-' + e.kind + '">' + EV_ICON[e.kind] + '</div><div class="rk-tl-card">' +
      '<div class="rk-tl-d">' + esc(fmtDate(e.d)) + '</div><div class="rk-tl-t">' + esc(e.title) + '</div>' + (e.text ? '<div class="rk-tl-x">' + esc(e.text) + '</div>' : '') +
      (ps.length && e.kind === 'event' ? '<div class="rk-tl-p">' + ps.map(function (p) { return '<span class="rk-tl-chip" data-k="' + esc(p.id) + '">' + esc(p.jmeno) + '</span>'; }).join('') + '</div>' : '') +
      (editable && e.kind === 'event' ? '<div class="rk-tl-a"><button class="rk-link" data-act="edit-event" data-id="' + esc(e.id) + '">Upravit</button><button class="rk-link" data-act="del-event" data-id="' + esc(e.id) + '">Smazat</button></div>' : '') +
      '</div></div>';
  }

  // ───────────── spodní panely ─────────────
  function genCount() { return S.fullL ? S.fullL.maxGen + 1 : 0; }
  function renderBottom() {
    var ev = allEvents();
    $('rk-hist').innerHTML = ev.length ? '<div class="rk-mini-tl">' + ev.slice(0, 5).map(function (e) {
      return '<div class="rk-mtl-i"><span class="rk-mtl-dot"></span><span class="rk-mtl-y">' + esc(fmtDate(e.d)) + '</span><span class="rk-mtl-t">' + esc(e.title) + '</span></div>';
    }).join('') + '</div><button class="rk-link" data-tab="history">Zobrazit všechny události →</button>' : '<div class="rk-muted">Zatím žádné události. Doplň datum narození u osob nebo přidej událost.</div>';
    var last = S.events.slice().sort(function (a, b) { return a.datum < b.datum ? 1 : -1; })[0];
    $('rk-sig').innerHTML = last
      ? '<div class="rk-sig-card"><div class="rk-sig-t">' + esc(last.nazev) + '</div><div class="rk-sig-d">◆ ' + esc(fmtDate(last.datum)) + '</div>' + (last.popis ? '<div class="rk-sig-x">' + esc(last.popis.length > 170 ? last.popis.slice(0, 169) + '…' : last.popis) + '</div>' : '') + '<button class="rk-link" data-tab="history">Zobrazit detail →</button></div>'
      : '<div class="rk-muted">Zatím žádná významná událost (svatba, narození, rozchod…).' + (CFG.canEdit ? '</div><button class="rk-btn" style="margin-top:0.8rem" data-act="add-event">+ Přidat událost</button>' : '</div>');
    var alive = S.persons.filter(function (p) { return !p.umrti; }).length;
    $('rk-statp').innerHTML = '<div class="rk-sgrid">' + [['Členů', S.persons.length], ['Generací', genCount()], ['Žijících', alive], ['Vazeb', S.relations.length]].map(function (x) {
      return '<div class="rk-sg"><div class="rk-sg-n">' + x[1] + '</div><div class="rk-sg-l">' + x[0] + '</div></div>';
    }).join('') + '</div>';
    $('rk-mini').innerHTML = S.persons.length ? '<div class="rk-mini-map" data-act="map" title="Otevřít mapu vztahů">' + miniMapSvg(S.full) + '</div><button class="rk-link" data-act="map">Zobrazit mapu →</button>' : '<div class="rk-muted">Mapa se objeví po přidání osob.</div>';
  }

  // ───────────── detail osoby (záložky Profil / Rodina / Vazby / Historie) ─────────────
  function directRelations(id) { return S.relations.filter(function (r) { return r.a === id || r.b === id; }); }
  function relDesc(r, id) {
    var other = byId(r.a === id ? r.b : r.a); if (!other) return null;
    var key = r.typ === 'rodic' ? (r.a === id ? 'child' : 'parent') : r.typ === 'partner' ? 'partner' : r.typ === 'sourozenec' ? 'sibling' :
      r.typ === 'stryc' ? (r.a === id ? 'nephew' : 'uncle') : r.typ === 'kmotr' ? (r.a === id ? 'godchild' : 'godparent') : 'friend';
    return { other: other, text: kinText(key, other) };
  }
  function renderDetail() {
    var host = $('rk-detail'), p = S.sel && byId(S.sel);
    if (!p) {
      host.innerHTML = '<div class="rk-d-empty"><div class="rk-empty-ico">❦</div><div>Vyber osobu v rodokmenu nebo v seznamu osob.</div>' + (CFG.canEdit ? '<button class="rk-btn rk-btn-gold" style="margin-top:1rem" data-act="add">+ Přidat osobu</button>' : '') + '</div>';
      return;
    }
    var age = ageOf(p), kin = makeKinship(S.full), tab = S.dtab, body = '';
    var sub = p.narozeni ? '★ ' + fmtDate(p.narozeni) + (age != null ? ' (' + (p.umrti ? 'dožil/a se ' + letText(age) : letText(age)) + ')' : '') : '';
    if (tab === 'profil') {
      var partners = S.full.people[p.id].partners.map(byId).filter(Boolean);
      body = '<div class="rk-d-h" style="margin-top:0.4rem">Základní informace</div>' +
        (p.titul ? '<div class="rk-d-row"><span>Role</span><b>' + esc(p.titul) + '</b></div>' : '') +
        (p.narozeni ? '<div class="rk-d-row"><span>Narození</span><b>' + esc(fmtDate(p.narozeni)) + '</b></div>' : '') +
        (p.umrti ? '<div class="rk-d-row"><span>Úmrtí</span><b>' + esc(fmtDate(p.umrti)) + '</b></div>' : '') +
        '<div class="rk-d-row"><span>Status</span><b>' + (p.umrti ? '<span class="rk-dot rk-dot-dead"></span>Zesnulý/á' : '<span class="rk-dot rk-dot-live"></span>Žije') + '</b></div>' +
        (partners.length ? '<div class="rk-d-row"><span>Partner/ka</span><b>' + partners.map(function (o) { return '<a href="#" data-k="' + esc(o.id) + '" class="rk-lnk">' + esc(o.jmeno) + '</a>'; }).join(', ') + '</b></div>' : '') +
        (p.clen ? '<div class="rk-d-row"><span>Člen webu</span><b>' + (CFG.isStaff ? '<a href="/karta/' + encodeURIComponent(p.clen) + '">' + esc(p.clen) + '</a>' : esc(p.clen)) + '</b></div>' : '') +
        (p.lore ? '<div class="rk-d-h">Představení</div><div class="rk-d-lore">' + esc(p.lore) + '</div>' : '<div class="rk-muted" style="margin-top:1rem">Zatím bez představení.' + (CFG.canEdit ? ' Doplň ho přes Upravit osobu.' : '') + '</div>') +
        (CFG.canEdit ? '<div class="rk-d-actions"><button class="rk-btn rk-btn-gold" data-act="edit">Upravit osobu</button><button class="rk-btn rk-btn-red" data-act="delete">Smazat</button></div>' : '');
    } else if (tab === 'rodina') {
      var groups = {};
      S.persons.forEach(function (o) { if (o.id === p.id) return; var k = kin.label(o.id, p.id); if (k) (groups[k] = groups[k] || []).push(o); });
      body = '<div class="rk-d-h" style="margin-top:0.4rem">Rodinné vazby</div><div class="rk-kins">' + (GROUP_ORDER.filter(function (k) { return groups[k]; }).map(function (k) {
        return groups[k].sort(function (a, b) { return cmpName(a.jmeno, b.jmeno); }).map(function (o) {
          return '<div class="rk-kin" data-k="' + esc(o.id) + '">' + avatar(o, 'rk-kin-av') + '<div><div class="rk-kin-l">' + esc(kinText(k, o)) + '</div><div class="rk-kin-n">' + esc(o.jmeno) + '</div></div></div>';
        }).join('');
      }).join('') || '<div class="rk-muted">Zatím žádné vazby.</div>') + '</div>' +
        '<div class="rk-d-h">Zobrazit ve stromu</div><div class="rk-views">' + [['full', 'Celý strom'], ['predci', 'Předci'], ['potomci', 'Potomci'], ['okoli', 'Nejbližší okolí']].map(function (v) {
          return '<button class="rk-chip' + (S.view === v[0] ? ' on' : '') + '" data-view="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>';
    } else if (tab === 'vazby') {
      var rels = directRelations(p.id);
      body = '<div class="rk-d-h" style="margin-top:0.4rem">Zapsané vazby</div>' + (rels.map(function (r) {
        var d = relDesc(r, p.id); if (!d) return '';
        return '<div class="rk-rel"><span><b>' + esc(d.text) + ':</b> ' + esc(d.other.jmeno) + '</span>' + (CFG.canEdit ? '<button class="rk-x" data-del-rel="' + esc(r.id) + '" title="Smazat vazbu">✕</button>' : '') + '</div>';
      }).join('') || '<div class="rk-muted">Zatím žádné zapsané vazby.</div>') + (CFG.canEdit ? addRelationHtml(p) : '');
    } else {
      var evs = allEvents().filter(function (e) { return e.persons.indexOf(p.id) >= 0; });
      body = '<div class="rk-d-h" style="margin-top:0.4rem">Historie osoby</div>' + (evs.length ? '<div class="rk-tl rk-tl-sm">' + evs.map(function (e) { return evRow(e, CFG.canEdit); }).join('') + '</div>' : '<div class="rk-muted">Zatím žádné události.</div>') +
        (CFG.canEdit ? '<button class="rk-btn" style="margin-top:1rem" data-act="add-event">+ Přidat událost k této osobě</button>' : '');
    }
    host.innerHTML =
      '<button class="rk-d-close" data-act="close" title="Zavřít">✕</button>' +
      '<div class="rk-d-photo">' + (p.foto ? '<img src="' + esc(p.foto) + '" alt=""' + (p.umrti ? ' style="filter:grayscale(1) brightness(.85)"' : '') + '>' : '<div class="rk-d-mono">' + esc(initials(p.jmeno)) + '</div>') + '<div class="rk-d-fade"></div></div>' +
      '<div class="rk-d-head"><h2 class="rk-d-name">' + esc(p.jmeno) + (p.umrti ? ' <span title="Zesnulý/á">†</span>' : '') + '</h2>' + (sub ? '<div class="rk-d-sub">' + esc(sub) + '</div>' : '') + (p.titul ? '<div class="rk-d-title">' + esc(p.titul) + '</div>' : '') + '</div>' +
      '<div class="rk-d-tabs">' + [['profil', 'Profil'], ['rodina', 'Rodina'], ['vazby', 'Vazby'], ['historie', 'Historie']].map(function (t) { return '<button class="rk-dt' + (tab === t[0] ? ' on' : '') + '" data-dtab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="rk-d-body">' + body + '</div>';
    if (tab === 'vazby' && CFG.canEdit) bindAddRelation(p);
  }

  // ───────────── záložky Historie a Statistiky ─────────────
  function renderHistoryTab() {
    var ev = allEvents(), byYear = {}, years = [];
    ev.forEach(function (e) { var y = e.d.slice(0, 4); if (!byYear[y]) { byYear[y] = []; years.push(y); } byYear[y].push(e); });
    $('rk-history').innerHTML = (CFG.canEdit ? '<div style="margin-bottom:1.2rem"><button class="rk-btn rk-btn-gold" data-act="add-event">+ Přidat událost</button></div>' : '') +
      (years.length ? '<div class="rk-tl">' + years.map(function (y) { return '<div class="rk-tl-year">' + y + '</div>' + byYear[y].map(function (e) { return evRow(e, CFG.canEdit); }).join(''); }).join('') + '</div>' : '<div class="rk-empty"><div class="rk-empty-ico">❦</div><div>Zatím žádné události. Doplň datum narození u osob nebo přidej vlastní událost.</div></div>');
  }
  function renderStatsTab() {
    var P = S.persons;
    if (!P.length) { $('rk-stats').innerHTML = '<div class="rk-empty"><div class="rk-empty-ico">❦</div><div>Statistiky se zobrazí po přidání osob.</div></div>'; return; }
    var alive = P.filter(function (p) { return !p.umrti; }), dead = P.filter(function (p) { return p.umrti; });
    var ages = alive.map(function (p) { return { p: p, a: ageOf(p) }; }).filter(function (x) { return x.a != null; });
    var avg = ages.length ? Math.round(ages.reduce(function (s, x) { return s + x.a; }, 0) / ages.length) : null;
    ages.sort(function (a, b) { return b.a - a.a; });
    var lived = dead.map(function (p) { return { p: p, a: ageOf(p) }; }).filter(function (x) { return x.a != null; }).sort(function (a, b) { return b.a - a.a; });
    var kids = Object.keys(S.full.people).map(function (k) { return { p: S.full.people[k].p, n: S.full.people[k].children.length }; }).sort(function (a, b) { return b.n - a.n; });
    var m = P.filter(function (p) { return p.pohlavi === 'm'; }).length, z = P.filter(function (p) { return p.pohlavi === 'z'; }).length, u = P.length - m - z;
    var gens = {}; if (S.fullL) Object.keys(S.fullL.gen).forEach(function (k) { gens[S.fullL.gen[k]] = (gens[S.fullL.gen[k]] || 0) + 1; });
    var gk = Object.keys(gens).map(Number).sort(function (a, b) { return a - b; }), maxN = Math.max.apply(null, gk.map(function (g) { return gens[g]; }));
    var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    function card(l, v, sub) { return '<div class="rk-sc"><div class="rk-sc-l">' + l + '</div><div class="rk-sc-v">' + v + '</div>' + (sub ? '<div class="rk-sc-s">' + sub + '</div>' : '') + '</div>'; }
    function who(x, extra) { return x ? '<span class="rk-lnk" data-k="' + esc(x.p.id) + '">' + esc(x.p.jmeno) + '</span>' + (extra || '') : '—'; }
    $('rk-stats').innerHTML = '<div class="rk-sc-grid">' +
      card('Členů rodiny', P.length, alive.length + ' žije · ' + dead.length + ' zesnulých') +
      card('Generací', genCount(), 'od nejstarších předků po nejmladší') +
      card('Vazeb', S.relations.length, S.relations.filter(function (r) { return r.typ === 'partner'; }).length + ' partnerských') +
      card('Průměrný věk žijících', avg != null ? avg + ' let' : '—', ages.length ? 'z ' + ages.length + ' osob s datem narození' : 'doplň data narození') +
      card('Nejstarší žijící', ages[0] ? who(ages[0], ' · ' + ages[0].a + ' let') : '—') +
      card('Nejmladší žijící', ages.length ? who(ages[ages.length - 1], ' · ' + ages[ages.length - 1].a + ' let') : '—') +
      card('Nejdéle žil/a', lived[0] ? who(lived[0], ' · ' + lived[0].a + ' let') : '—') +
      card('Nejvíce dětí', kids[0] && kids[0].n ? who(kids[0], ' · ' + kids[0].n) : '—') + '</div>' +
      '<div class="rk-bottom" style="margin-top:1.2rem"><div class="rk-panel"><h3>Osob podle generací</h3>' + gk.map(function (g) {
        return '<div class="rk-bar"><span class="rk-bar-l">' + (ROMAN[g] || (g + 1)) + '.</span><div class="rk-bar-t"><div class="rk-bar-f" style="width:' + Math.round(gens[g] / maxN * 100) + '%"></div></div><span class="rk-bar-n">' + gens[g] + '</span></div>'; }).join('') + '</div>' +
      '<div class="rk-panel"><h3>Pohlaví</h3><div class="rk-split">' + (m ? '<div style="flex:' + m + ';background:#7fb0d6">' + m + '</div>' : '') + (z ? '<div style="flex:' + z + ';background:#d4688a">' + z + '</div>' : '') + (u ? '<div style="flex:' + u + ';background:#8f95a3">' + u + '</div>' : '') + '</div>' +
      '<div class="rk-split-l"><span><i style="background:#7fb0d6"></i>muži</span><span><i style="background:#d4688a"></i>ženy</span>' + (u ? '<span><i style="background:#8f95a3"></i>neuvedeno</span>' : '') + '</div></div></div>';
  }

  // ───────────── editor události ─────────────
  function openEventEditor(ev, presetPerson) {
    var e = ev || { nazev: '', datum: '', popis: '', osoby: presetPerson ? [presetPerson] : [] };
    var m = $('rk-modal');
    m.innerHTML = '<div class="rk-ov"><div class="rk-md" style="max-width:600px"><div class="rk-md-h"><span>' + (ev ? 'Upravit událost' : 'Nová událost') + '</span><button class="rk-x" id="ev-close">✕</button></div><div class="rk-md-b">' +
      '<div class="form-row"><div class="form-group"><label>Název *</label><input type="text" id="ev-nazev" maxlength="100" placeholder="např. Svatba" value="' + esc(e.nazev) + '"></div><div class="form-group"><label>Datum *</label><input type="date" id="ev-datum" value="' + esc(e.datum) + '"></div></div>' +
      '<div class="form-group"><label>Popis (nepovinné)</label><textarea id="ev-popis" rows="4" maxlength="600">' + esc(e.popis || '') + '</textarea></div>' +
      '<div class="form-group"><label>Koho se týká</label><div class="rk-checks">' + S.persons.slice().sort(function (a, b) { return cmpName(a.jmeno, b.jmeno); }).map(function (p) {
        return '<label class="rk-check"><input type="checkbox" value="' + esc(p.id) + '"' + ((e.osoby || []).indexOf(p.id) >= 0 ? ' checked' : '') + '><span>' + esc(p.jmeno) + '</span></label>'; }).join('') + '</div></div></div>' +
      '<div class="rk-md-f"><button class="rk-btn" id="ev-cancel">Zrušit</button><button class="rk-btn rk-btn-gold" id="ev-save">' + (ev ? 'Uložit změny' : 'Přidat událost') + '</button></div></div></div>';
    function close() { m.innerHTML = ''; }
    $('ev-close').addEventListener('click', close); $('ev-cancel').addEventListener('click', close);
    $('ev-save').addEventListener('click', function () {
      var body = { nazev: $('ev-nazev').value.trim(), datum: $('ev-datum').value, popis: $('ev-popis').value.trim(), osoby: [].slice.call(m.querySelectorAll('.rk-check input:checked')).map(function (i) { return i.value; }) };
      if (!body.nazev) return toast('Vyplň název', true); if (!body.datum) return toast('Vyplň datum', true);
      api(ev ? 'PUT' : 'POST', ev ? '/api/rodokmen/udalosti/' + ev.id : '/api/rodokmen/udalosti', body).then(function (d) {
        if (!d.ok) return toast(d.error || 'Chyba', true);
        toast(ev ? 'Událost uložena' : 'Událost přidána'); close(); reload();
      }).catch(function () { toast('Uložení se nepodařilo', true); });
    });
  }


  // ───────────── výběr / záložky / načítání ─────────────
  var ROMAN_G = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  function select(id, scroll) {
    S.sel = id || null;
    if (!S.sel && S.view !== 'full') { S.view = 'full'; $('rk-view').value = 'full'; }
    renderCanvas(); renderDetail();
    if (S.sel && scroll) setTimeout(function () { focusOn(S.sel); }, 40);
  }
  var TABS = ['tree', 'people', 'history', 'stats'];
  function setTab(t) {
    S.tab = t;
    TABS.forEach(function (x) { $('rk-tab-' + x).style.display = x === t ? '' : 'none'; $('rk-tabbtn-' + x).classList.toggle('active', x === t); });
    if (t === 'tree') fitScaleSoon(); else if (t === 'people') renderPeople();
  }
  function fitScaleSoon() { setTimeout(function () { fitScale(); if (S.sel) focusOn(S.sel); }, 40); }
  function recompute() {
    S.full = buildModel(S.persons, S.relations);
    S.fullL = S.persons.length ? layout(S.full) : null;
    applyFilters();
  }
  function populateGen() {
    var n = genCount(), html = '<option value="0">Všechny generace</option>';
    for (var i = 1; i < n; i++) html += '<option value="' + i + '">Generace I–' + (ROMAN_G[i - 1] || i) + '</option>';
    var sel = $('rk-gen'); sel.innerHTML = html;
    if (S.genLimit >= n) S.genLimit = 0;
    sel.value = String(S.genLimit);
  }
  function renderAll() {
    recompute(); populateGen(); renderCanvas(); renderDetail(); renderBottom(); renderPeople(); renderHistoryTab(); renderStatsTab();
    var dl = $('rk-names'); if (dl) dl.innerHTML = S.persons.map(function (p) { return '<option value="' + esc(p.jmeno) + '">'; }).join('');
    fitScaleSoon();
  }
  function reload() {
    return fetch('/api/rodokmen', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) { toast('Rodokmen se nepodařilo načíst', true); return; }
      S.persons = d.persons || []; S.relations = d.relations || []; S.events = d.events || [];
      if (S.sel && !byId(S.sel)) S.sel = null;
      renderAll();
    }).catch(function () { toast('Rodokmen se nepodařilo načíst', true); });
  }

  function init() {
    document.addEventListener('click', function (e) {
      var t = e.target, n;
      if (!t || !t.closest) return;
      if (t.id === 'rk-clear') return select(null);
      n = t.closest('[data-del-rel]');
      if (n) { if (confirm('Smazat tuto vazbu?')) api('DELETE', '/api/rodokmen/vazby/' + n.getAttribute('data-del-rel')).then(function (d) { if (d.ok) { toast('Vazba smazána'); reload(); } else toast(d.error, true); }); return; }
      n = t.closest('[data-act]');
      if (n) {
        var a = n.getAttribute('data-act'), p = S.sel && byId(S.sel);
        if (a === 'add') return openEditor(null);
        if (a === 'close') return select(null);
        if (a === 'edit' && p) return openEditor(p);
        if (a === 'export') return openExport();
        if (a === 'add-event') return openEventEditor(null, n.closest('#rk-detail') && p ? p.id : null);
        if (a === 'edit-event') { var ev = S.events.filter(function (x) { return x.id === n.getAttribute('data-id'); })[0]; if (ev) openEventEditor(ev); return; }
        if (a === 'del-event') { if (confirm('Smazat tuto událost?')) api('DELETE', '/api/rodokmen/udalosti/' + n.getAttribute('data-id')).then(function (d) { if (d.ok) { toast('Událost smazána'); reload(); } else toast(d.error, true); }); return; }
        if (a === 'map') { setTab('tree'); setMode('map'); return; }
        if (a === 'delete' && p) {
          if (!confirm('Trvale smazat osobu „' + p.jmeno + '“ včetně všech jejích vazeb?')) return;
          api('DELETE', '/api/rodokmen/osoby/' + p.id).then(function (d) { if (d.ok) { toast('Osoba smazána'); S.sel = null; reload(); } else toast(d.error, true); });
          return;
        }
      }
      n = t.closest('[data-view]');
      if (n) { S.view = n.getAttribute('data-view'); $('rk-view').value = S.view; renderCanvas(); renderDetail(); fitScaleSoon(); return; }
      n = t.closest('[data-dtab]');
      if (n) { S.dtab = n.getAttribute('data-dtab'); renderDetail(); return; }
      n = t.closest('[data-tab]');
      if (n) { setTab(n.getAttribute('data-tab')); return; }
      n = t.closest('[data-k]');
      if (n && !t.closest('#rk-svg-host')) {
        e.preventDefault();
        var id = n.getAttribute('data-k'); if (!byId(id)) return;
        if (S.tab !== 'tree') setTab('tree');
        S.sel = id; renderCanvas(); renderDetail(); setTimeout(function () { focusOn(id); }, 60);
      }
    });
    TABS.forEach(function (x) { $('rk-tabbtn-' + x).addEventListener('click', function () { setTab(x); }); });
    $('rk-pq').addEventListener('input', renderPeople);
    $('rk-threads').addEventListener('change', function () { S.threads = this.checked; renderCanvas(); fitScaleSoon(); });
    $('rk-gen').addEventListener('change', function () { S.genLimit = parseInt(this.value) || 0; applyFilters(); renderCanvas(); fitScaleSoon(); });
    $('rk-status').addEventListener('change', function () { S.status = this.value; applyFilters(); renderCanvas(); fitScaleSoon(); });
    $('rk-view').addEventListener('change', function () {
      S.view = this.value;
      if (S.view !== 'full' && !S.sel) { toast('Nejdřív klikni na osobu, ke které se má pohled vztahovat', true); S.view = 'full'; this.value = 'full'; return; }
      renderCanvas(); renderDetail(); fitScaleSoon();
    });
    function setMode(m) {
      S.mode = m; $('rk-mode-tree').classList.toggle('on', m === 'tree'); $('rk-mode-map').classList.toggle('on', m === 'map');
      $('rk-threads-wrap').style.display = m === 'tree' ? '' : 'none';
      renderCanvas(); fitScaleSoon();
    }
    window.rkSetMode = setMode;
    $('rk-mode-tree').addEventListener('click', function () { setMode('tree'); });
    $('rk-mode-map').addEventListener('click', function () { setMode('map'); });
    $('rk-search').addEventListener('change', function () {
      var q = this.value.trim().toLowerCase(); if (!q) return;
      var p = S.persons.filter(function (x) { return x.jmeno.toLowerCase() === q; })[0] || S.persons.filter(function (x) { return x.jmeno.toLowerCase().indexOf(q) >= 0; })[0];
      if (!p) return toast('Osoba nenalezena', true);
      if (S.tab !== 'tree') setTab('tree');
      S.status = 'all'; $('rk-status').value = 'all'; S.genLimit = 0; $('rk-gen').value = '0'; S.view = 'full'; $('rk-view').value = 'full'; applyFilters();
      S.sel = p.id; renderCanvas(); renderDetail(); setTimeout(function () { focusOn(p.id); }, 60);
    });
    ['in', 'out', 'fit'].forEach(function (a) {
      $('rk-z-' + a).addEventListener('click', function () {
        if (a === 'in') S.scale = Math.min(2.5, S.scale + 0.15); else if (a === 'out') S.scale = Math.max(0.2, S.scale - 0.15); else return fitScale();
        applyScale();
      });
    });
    var host = $('rk-svg-host'), sc = $('rk-scroll'), dragged = false, down = false, sx = 0, sy = 0, sl = 0, st = 0;
    sc.addEventListener('mousedown', function (e) { if (e.button !== 0) return; down = true; dragged = false; sx = e.clientX; sy = e.clientY; sl = sc.scrollLeft; st = sc.scrollTop; });
    window.addEventListener('mousemove', function (e) {
      if (!down) return; var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragged && Math.abs(dx) + Math.abs(dy) > 5) { dragged = true; sc.classList.add('rk-drag'); }
      if (dragged) { sc.scrollLeft = sl - dx; sc.scrollTop = st - dy; }
    });
    window.addEventListener('mouseup', function () { if (!down) return; down = false; sc.classList.remove('rk-drag'); setTimeout(function () { dragged = false; }, 0); });
    host.addEventListener('click', function (e) {
      if (dragged) return;
      var n = e.target; while (n && n !== host && !(n.getAttribute && n.getAttribute('data-k'))) n = n.parentNode;
      var k = n && n !== host ? n.getAttribute('data-k') : null;
      select(k && k !== S.sel ? k : null, false);
    });
    sc.addEventListener('wheel', function (e) {
      if (!e.ctrlKey) return; e.preventDefault();
      S.scale = Math.max(0.2, Math.min(2.5, S.scale + (e.deltaY < 0 ? 0.1 : -0.1))); applyScale();
    }, { passive: false });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('rk-modal').innerHTML && S.sel) select(null); });
    window.addEventListener('resize', function () { if (S.tab === 'tree') fitScale(); });
    reload();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
