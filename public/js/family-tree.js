// public/js/family-tree.js — CALEDONIA · vizualizace vztahů (rodinný strom + síť)
//
// Samostatný soubor bez závislostí. Načítá se ze stránky Hierarchie
// (<script src="/js/family-tree.js">) a vystavuje window.FamilyViz.render().
//
// Vstup: pole vztahů ve tvaru { id, a, b, typ, note }
//   typ 'rodic'      — A je rodič B (směrový)
//   typ 'partner'    — A a B jsou partneři / manželé
//   typ 'sourozenec' — A a B jsou sourozenci
//   typ 'rodina'     — jiná příbuzenská vazba (čárkovaně)
//   typ 'mentor'     — A mentoruje B
//   typ 'spojenec' / 'rival'
(function () {
  'use strict';

  var FAMILY_TYPES = { rodic: 1, partner: 1, sourozenec: 1, rodina: 1 };
  var NODE_W = 168, NODE_H = 46, GAP_X = 34, PARTNER_GAP = 26, GAP_Y = 96, MARGIN = 40;

  var COLORS = {
    rodic: '#c9a35b', partner: '#d9546b', sourozenec: '#7fa6c9', rodina: '#9a8f7a',
    mentor: '#6fbf52', spojenec: '#5fb3a1', rival: '#c04b4b'
  };
  var LABELS = {
    rodic: 'Rodič → dítě', partner: 'Partneři', sourozenec: 'Sourozenci', rodina: 'Jiná rodinná vazba',
    mentor: 'Mentor → chráněnec', spojenec: 'Spojenci', rival: 'Rivalové'
  };

  function esc(s) {
    return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function keyOf(name) { return String(name || '').trim().toLowerCase(); }

  // Rozdělí jméno na max. 2 řádky, aby se vešlo do uzlu.
  function wrapName(name) {
    name = String(name || '').trim();
    if (name.length <= 19) return [name];
    var words = name.split(/\s+/);
    var best = null, bestDiff = 1e9;
    for (var i = 1; i < words.length; i++) {
      var l1 = words.slice(0, i).join(' '), l2 = words.slice(i).join(' ');
      var diff = Math.abs(l1.length - l2.length);
      if (diff < bestDiff) { bestDiff = diff; best = [l1, l2]; }
    }
    if (!best) best = [name.slice(0, 18) + '…'];
    return best.map(function (l) { return l.length > 24 ? l.slice(0, 23) + '…' : l; });
  }

  function legendHtml(types) {
    return '<div class="fv-legend">' + types.map(function (t) {
      var dash = (t === 'rodina') ? 'border-top-style:dashed;' : '';
      return '<span class="fv-legend-item"><i style="border-top:3px solid ' + COLORS[t] + ';' + dash + '"></i>' + esc(LABELS[t]) + '</span>';
    }).join('') + '</div>';
  }

  function emptyHtml(text) {
    return '<div class="fv-empty">' + esc(text) + '</div>';
  }

  // ───────────────────────── RODINNÝ STRO M ─────────────────────────
  function buildTree(relations) {
    var people = {};     // key -> { key, name }
    function person(name) {
      var k = keyOf(name);
      if (!people[k]) people[k] = { key: k, name: String(name).trim(), parents: [], children: [], partners: [], siblings: [], rodina: [] };
      return people[k];
    }
    var fam = relations.filter(function (r) { return FAMILY_TYPES[r.typ] && keyOf(r.a) && keyOf(r.b) && keyOf(r.a) !== keyOf(r.b); });
    fam.forEach(function (r) {
      var a = person(r.a), b = person(r.b);
      if (r.typ === 'rodic') {
        if (a.children.indexOf(b.key) < 0) a.children.push(b.key);
        if (b.parents.indexOf(a.key) < 0) b.parents.push(a.key);
      } else if (r.typ === 'partner') {
        if (a.partners.indexOf(b.key) < 0) a.partners.push(b.key);
        if (b.partners.indexOf(a.key) < 0) b.partners.push(a.key);
      } else if (r.typ === 'sourozenec') {
        if (a.siblings.indexOf(b.key) < 0) a.siblings.push(b.key);
        if (b.siblings.indexOf(a.key) < 0) b.siblings.push(a.key);
      } else {
        if (a.rodina.indexOf(b.key) < 0) a.rodina.push(b.key);
        if (b.rodina.indexOf(a.key) < 0) b.rodina.push(a.key);
      }
    });
    return { people: people, edges: fam };
  }

  function computeGenerations(people) {
    var keys = Object.keys(people);
    var gen = {};
    keys.forEach(function (k) { gen[k] = 0; });
    var limit = keys.length + 3;
    for (var pass = 0; pass < limit; pass++) {
      var changed = false;
      keys.forEach(function (k) {
        var p = people[k];
        p.children.forEach(function (c) {
          if (gen[c] < gen[k] + 1 && gen[k] + 1 <= keys.length) { gen[c] = gen[k] + 1; changed = true; }
        });
        p.partners.concat(p.siblings).forEach(function (o) {
          if (gen[o] < gen[k]) { gen[o] = gen[k]; changed = true; }
        });
      });
      if (!changed) break;
    }
    return gen;
  }

  // Skupiny partnerů (sousedí vedle sebe) — union-find přes partnerské vazby.
  function buildUnits(people, gen) {
    var parent = {};
    Object.keys(people).forEach(function (k) { parent[k] = k; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    Object.keys(people).forEach(function (k) {
      people[k].partners.forEach(function (o) { var ra = find(k), rb = find(o); if (ra !== rb) parent[ra] = rb; });
    });
    var groups = {};
    Object.keys(people).forEach(function (k) {
      var r = find(k);
      (groups[r] = groups[r] || []).push(k);
    });
    var units = Object.keys(groups).map(function (r) {
      var members = groups[r].slice().sort(function (a, b) { return people[a].name.localeCompare(people[b].name, 'cs'); });
      // Partner s dětmi / rodiči uvnitř skupiny: jednoduché pořadí podle jména stačí
      return { members: members, gen: gen[members[0]] };
    });
    return units;
  }

  function layoutTree(tree) {
    var people = tree.people;
    var gen = computeGenerations(people);
    var units = buildUnits(people, gen);

    var unitOf = {};
    units.forEach(function (u, i) { u.id = i; u.members.forEach(function (k) { unitOf[k] = u; }); });

    var maxGen = 0;
    units.forEach(function (u) { if (u.gen > maxGen) maxGen = u.gen; });

    var rows = [];
    for (var g = 0; g <= maxGen; g++) rows.push([]);
    units.forEach(function (u) { rows[u.gen].push(u); });

    function unitWidth(u) { return u.members.length * NODE_W + (u.members.length - 1) * PARTNER_GAP; }

    var x = {}; // key -> střed uzlu (x)

    rows.forEach(function (row, g) {
      // pořadí: podle barycentra rodičů (u g>0), jinak podle jména; sourozenci/rodina blízko sebe
      row.forEach(function (u) {
        var xs = [];
        u.members.forEach(function (k) {
          people[k].parents.forEach(function (pk) { if (x[pk] != null) xs.push(x[pk]); });
        });
        u.bary = xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : null;
      });
      row.sort(function (a, b) {
        if (a.bary != null && b.bary != null && a.bary !== b.bary) return a.bary - b.bary;
        if (a.bary != null && b.bary == null) return -1;
        if (a.bary == null && b.bary != null) return 1;
        return people[a.members[0]].name.localeCompare(people[b.members[0]].name, 'cs');
      });
      // umístění zleva doprava s ohledem na barycentrum
      var cursor = MARGIN;
      row.forEach(function (u) {
        var w = unitWidth(u);
        var left = cursor;
        if (u.bary != null) left = Math.max(cursor, u.bary - w / 2);
        u.left = left; u.w = w;
        u.members.forEach(function (k, i) { x[k] = left + NODE_W / 2 + i * (NODE_W + PARTNER_GAP); });
        cursor = left + w + GAP_X;
      });
    });

    // Druhý průchod zdola nahoru: rodiče vycentrovat nad děti, pokud se tím nepřekrývají.
    for (var g2 = maxGen - 1; g2 >= 0; g2--) {
      var row2 = rows[g2];
      row2.forEach(function (u) {
        var cx = [];
        u.members.forEach(function (k) { people[k].children.forEach(function (c) { if (x[c] != null) cx.push(x[c]); }); });
        if (!cx.length) return;
        var target = (Math.min.apply(null, cx) + Math.max.apply(null, cx)) / 2;
        var newLeft = target - u.w / 2;
        var idx = row2.indexOf(u);
        var minLeft = idx > 0 ? row2[idx - 1].left + row2[idx - 1].w + GAP_X : MARGIN;
        var nextU = row2[idx + 1];
        var maxLeft = nextU ? nextU.left - GAP_X - u.w : Infinity;
        newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
        u.left = newLeft;
        u.members.forEach(function (k, i) { x[k] = newLeft + NODE_W / 2 + i * (NODE_W + PARTNER_GAP); });
      });
    }

    // Normalizace: nejlevější uzel na MARGIN
    var minX = Infinity, maxX = -Infinity;
    Object.keys(x).forEach(function (k) { minX = Math.min(minX, x[k] - NODE_W / 2); maxX = Math.max(maxX, x[k] + NODE_W / 2); });
    var shift = MARGIN - minX;
    Object.keys(x).forEach(function (k) { x[k] += shift; });
    maxX += shift;

    var pos = {};
    Object.keys(people).forEach(function (k) {
      pos[k] = { cx: x[k], top: MARGIN + 20 + gen[k] * (NODE_H + GAP_Y), gen: gen[k] };
    });
    return { pos: pos, width: maxX + MARGIN, height: MARGIN + 20 + (maxGen + 1) * NODE_H + maxGen * GAP_Y + MARGIN + 20, unitOf: unitOf, gen: gen };
  }

  function renderTree(container, relations) {
    var tree = buildTree(relations);
    var keys = Object.keys(tree.people);
    if (!keys.length) {
      container.innerHTML = emptyHtml('Zatím nejsou zaznamenané žádné rodinné vazby. Přidej vztah typu „Rodič → Dítě“, „Partneři“ nebo „Sourozenci“ a strom se sám sestaví.');
      return;
    }
    var L = layoutTree(tree);
    var pos = L.pos, people = tree.people;
    var svg = [];
    var line = function (d, color, extra) {
      return '<path d="' + d + '" fill="none" style="stroke:' + color + ';stroke-width:2;' + (extra || '') + '"/>';
    };

    // 1) sourozenci bez společného rodiče — oblouk nad uzly
    var drawnPairs = {};
    keys.forEach(function (k) {
      people[k].siblings.forEach(function (o) {
        var pairKey = [k, o].sort().join('|');
        if (drawnPairs[pairKey]) return; drawnPairs[pairKey] = 1;
        var common = people[k].parents.some(function (p) { return people[o].parents.indexOf(p) >= 0; });
        if (common) return;
        var a = pos[k], b = pos[o];
        var ax = a.cx, bx = b.cx, ay = a.top, by = b.top;
        var lift = 26 + Math.min(40, Math.abs(ax - bx) / 8);
        var topY = Math.min(ay, by) - lift;
        svg.push(line('M' + ax + ' ' + ay + ' C' + ax + ' ' + topY + ' ' + bx + ' ' + topY + ' ' + bx + ' ' + by, COLORS.sourozenec, 'stroke-dasharray:2 4;'));
      });
    });

    // 2) jiná rodinná vazba — čárkovaný oblouk pod uzly
    var drawnR = {};
    keys.forEach(function (k) {
      people[k].rodina.forEach(function (o) {
        var pairKey = [k, o].sort().join('|');
        if (drawnR[pairKey]) return; drawnR[pairKey] = 1;
        var a = pos[k], b = pos[o];
        var ay = a.top + NODE_H, by = b.top + NODE_H;
        var lowY = Math.max(ay, by) + 30;
        svg.push(line('M' + a.cx + ' ' + ay + ' C' + a.cx + ' ' + lowY + ' ' + b.cx + ' ' + lowY + ' ' + b.cx + ' ' + by, COLORS.rodina, 'stroke-dasharray:6 5;'));
      });
    });

    // 3) partneři — čára mezi uzly + srdíčko/kosočtverec uprostřed
    var anchor = {};  // pairKey -> {x, y}
    var seenPartner = {};
    keys.forEach(function (k) {
      people[k].partners.forEach(function (o) {
        var pairKey = [k, o].sort().join('|');
        if (seenPartner[pairKey]) return; seenPartner[pairKey] = 1;
        var a = pos[k], b = pos[o];
        var left = a.cx <= b.cx ? a : b, right = a.cx <= b.cx ? b : a;
        var y = left.top + NODE_H / 2;
        var x1 = left.cx + NODE_W / 2, x2 = right.cx - NODE_W / 2;
        if (Math.abs(left.top - right.top) > 1) { // nemělo by nastat, ale pro jistotu
          svg.push(line('M' + left.cx + ' ' + (left.top + NODE_H) + ' L' + right.cx + ' ' + right.top, COLORS.partner));
        } else {
          svg.push(line('M' + x1 + ' ' + y + ' L' + x2 + ' ' + y, COLORS.partner, 'stroke-width:3;'));
          var mx = (x1 + x2) / 2;
          svg.push('<path d="M' + mx + ' ' + (y - 7) + ' L' + (mx + 7) + ' ' + y + ' L' + mx + ' ' + (y + 7) + ' L' + (mx - 7) + ' ' + y + ' Z" style="fill:' + COLORS.partner + ';stroke:#1a1412;stroke-width:1.5"/>');
          anchor[pairKey] = { x: mx, y: y };
        }
      });
    });

    // 4) rodič → dítě
    keys.forEach(function (ck) {
      var c = people[ck];
      if (!c.parents.length) return;
      var cpos = pos[ck];
      var childX = cpos.cx, childTop = cpos.top;
      // zda jsou (alespoň 2) rodiče partneři → sdílený kotevní bod
      var used = {};
      var groups = [];
      for (var i = 0; i < c.parents.length; i++) {
        for (var j = i + 1; j < c.parents.length; j++) {
          var pk = [c.parents[i], c.parents[j]].sort().join('|');
          if (anchor[pk] && !used[c.parents[i]] && !used[c.parents[j]]) {
            used[c.parents[i]] = used[c.parents[j]] = 1;
            groups.push({ x: anchor[pk].x, y: anchor[pk].y });
          }
        }
      }
      c.parents.forEach(function (p) {
        if (!used[p]) groups.push({ x: pos[p].cx, y: pos[p].top + NODE_H });
      });
      groups.forEach(function (g) {
        var busY = childTop - 30;
        if (busY < g.y + 10) busY = (g.y + childTop) / 2;
        svg.push(line('M' + g.x + ' ' + g.y + ' L' + g.x + ' ' + busY + ' L' + childX + ' ' + busY + ' L' + childX + ' ' + childTop, COLORS.rodic));
      });
    });

    // 5) uzly
    keys.forEach(function (k) {
      var p = pos[k], person = people[k];
      var lines = wrapName(person.name);
      var x0 = p.cx - NODE_W / 2;
      var textY = lines.length === 1 ? p.top + NODE_H / 2 + 4.5 : p.top + NODE_H / 2 - 4;
      var t = lines.map(function (l, i) {
        return '<text x="' + p.cx + '" y="' + (textY + i * 15) + '" text-anchor="middle" style="fill:var(--ivory,#efe6d4);font-family:var(--font-display,Georgia,serif);font-size:13px">' + esc(l) + '</text>';
      }).join('');
      svg.push('<g class="fv-node"><title>' + esc(person.name) + '</title>' +
        '<rect x="' + x0 + '" y="' + p.top + '" width="' + NODE_W + '" height="' + NODE_H + '" rx="3" style="fill:var(--panel2,#1e1816);stroke:var(--border-brass,#7a6236);stroke-width:1.4"/>' + t + '</g>');
    });

    var legendTypes = ['rodic', 'partner', 'sourozenec', 'rodina'];
    mountSvg(container, svg.join(''), L.width, L.height, legendTypes);
  }

  // ───────────────────────── SÍŤ VZTAHŮ ─────────────────────────
  function renderNetwork(container, relations) {
    var valid = relations.filter(function (r) { return keyOf(r.a) && keyOf(r.b) && keyOf(r.a) !== keyOf(r.b); });
    if (!valid.length) { container.innerHTML = emptyHtml('Zatím žádné zaznamenané vztahy.'); return; }

    var names = {}; var order = [];
    valid.forEach(function (r) {
      [r.a, r.b].forEach(function (n) { var k = keyOf(n); if (!names[k]) { names[k] = String(n).trim(); order.push(k); } });
    });
    // seřadit podle počtu vazeb (nejpropojenější nahoře), pak jména
    var degree = {};
    order.forEach(function (k) { degree[k] = 0; });
    valid.forEach(function (r) { degree[keyOf(r.a)]++; degree[keyOf(r.b)]++; });
    order.sort(function (a, b) { return degree[b] - degree[a] || names[a].localeCompare(names[b], 'cs'); });

    var n = order.length;
    var R = Math.max(150, n * 26);
    var pad = 260;
    var W = 2 * (R + pad), H = 2 * (R + 70);
    var cx0 = W / 2, cy0 = H / 2;
    var p = {};
    order.forEach(function (k, i) {
      var ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
      p[k] = { x: cx0 + R * Math.cos(ang), y: cy0 + R * Math.sin(ang), ang: ang };
    });

    var svg = [];
    // šipky
    svg.push('<defs>' + ['rodic', 'mentor'].map(function (t) {
      return '<marker id="fv-arrow-' + t + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" style="fill:' + COLORS[t] + '"/></marker>';
    }).join('') + '</defs>');

    // několik vazeb mezi stejnou dvojicí → rozevřít oblouky
    var pairCount = {}, pairIdx = {};
    valid.forEach(function (r) { var pk = [keyOf(r.a), keyOf(r.b)].sort().join('|'); pairCount[pk] = (pairCount[pk] || 0) + 1; });

    valid.forEach(function (r) {
      var ka = keyOf(r.a), kb = keyOf(r.b);
      var pk = [ka, kb].sort().join('|');
      var idx = pairIdx[pk] = (pairIdx[pk] || 0) + 1;
      var a = p[ka], b = p[kb];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      // ohyb směrem ke středu kruhu, u více vazeb mezi dvojicí se rozbíhá
      var pull = 0.28 + (idx - 1) * 0.18;
      var qx = mx + (cx0 - mx) * pull, qy = my + (cy0 - my) * pull;
      var color = COLORS[r.typ] || '#999';
      var arrow = (r.typ === 'rodic' || r.typ === 'mentor') ? ' marker-end="url(#fv-arrow-' + r.typ + ')"' : '';
      var dash = r.typ === 'rodina' ? 'stroke-dasharray:6 5;' : (r.typ === 'rival' ? 'stroke-dasharray:2 4;' : '');
      // zkrátit konec k uzlu (kvůli šipce)
      var ex = b.x, ey = b.y;
      var dx = ex - qx, dy = ey - qy, dl = Math.sqrt(dx * dx + dy * dy) || 1;
      ex -= dx / dl * 8; ey -= dy / dl * 8;
      svg.push('<path d="M' + a.x + ' ' + a.y + ' Q' + qx + ' ' + qy + ' ' + ex + ' ' + ey + '" fill="none"' + arrow + ' style="stroke:' + color + ';stroke-width:2;opacity:0.85;' + dash + '"><title>' +
        esc(r.a + ' — ' + (LABELS[r.typ] || r.typ) + ' — ' + r.b + (r.note ? ' (' + r.note + ')' : '')) + '</title></path>');
    });

    order.forEach(function (k) {
      var q = p[k];
      var right = Math.cos(q.ang) > 0.25, left = Math.cos(q.ang) < -0.25;
      var anchorAttr = right ? 'start' : (left ? 'end' : 'middle');
      var tx = q.x + (right ? 13 : (left ? -13 : 0));
      var ty = q.y + (right || left ? 4.5 : (Math.sin(q.ang) < 0 ? -14 : 22));
      svg.push('<g class="fv-node"><circle cx="' + q.x + '" cy="' + q.y + '" r="7" style="fill:var(--panel2,#1e1816);stroke:var(--brass,#b08d57);stroke-width:2"/>' +
        '<text x="' + tx + '" y="' + ty + '" text-anchor="' + anchorAttr + '" style="fill:var(--ivory,#efe6d4);font-family:var(--font-display,Georgia,serif);font-size:13px">' + esc(names[k]) + '</text></g>');
    });

    var present = {};
    valid.forEach(function (r) { present[r.typ] = 1; });
    var types = Object.keys(LABELS).filter(function (t) { return present[t]; });
    mountSvg(container, svg.join(''), W, H, types);
  }

  // ───────────────────────── SPOLEČNÉ ─────────────────────────
  var STYLE_ID = 'fv-style';
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.fv-wrap{background:var(--panel2,#1e1816);border:1px solid var(--border-brass,#7a6236);padding:0.8rem}' +
      '.fv-toolbar{display:flex;gap:0.5rem;align-items:center;margin-bottom:0.6rem;flex-wrap:wrap}' +
      '.fv-btn{background:transparent;border:1px solid var(--border-brass,#7a6236);color:var(--ivory-dim,#bfb5a0);width:30px;height:30px;cursor:pointer;font-size:1rem;line-height:1}' +
      '.fv-btn:hover{background:var(--brass-faint,rgba(176,141,87,.12))}' +
      '.fv-scroll{overflow:auto;max-height:72vh;border:1px solid var(--border,#3a302a)}' +
      '.fv-legend{display:flex;gap:1rem;flex-wrap:wrap;margin-left:auto;font-family:var(--font-mono,monospace);font-size:0.68rem;color:var(--ivory-dim,#bfb5a0)}' +
      '.fv-legend-item{display:inline-flex;align-items:center;gap:0.4rem}' +
      '.fv-legend-item i{display:inline-block;width:22px;height:0}' +
      '.fv-empty{padding:2rem;text-align:center;color:var(--ivory-faint,#8a8070);font-family:var(--font-mono,monospace);font-size:0.82rem;border:1px dashed var(--border,#3a302a)}' +
      '.fv-node:hover rect,.fv-node:hover circle{stroke:var(--brass-bright,#e0bd7a)}';
    document.head.appendChild(st);
  }

  function mountSvg(container, inner, W, H, legendTypes) {
    var scale = 1;
    var id = 'fv-svg-' + Math.floor(Math.random() * 1e9);
    container.innerHTML =
      '<div class="fv-wrap"><div class="fv-toolbar">' +
      '<button type="button" class="fv-btn" data-act="out" title="Oddálit">−</button>' +
      '<button type="button" class="fv-btn" data-act="fit" title="Přizpůsobit">⤢</button>' +
      '<button type="button" class="fv-btn" data-act="in" title="Přiblížit">+</button>' +
      legendHtml(legendTypes) + '</div>' +
      '<div class="fv-scroll"><svg id="' + id + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + inner + '</svg></div></div>';
    var svgEl = container.querySelector('#' + id);
    var scroll = container.querySelector('.fv-scroll');
    function apply() { svgEl.setAttribute('width', Math.round(W * scale)); svgEl.setAttribute('height', Math.round(H * scale)); }
    function fit() {
      var avail = scroll.clientWidth - 4;
      scale = avail > 0 ? Math.min(1, avail / W) : 1;
      apply();
    }
    container.querySelector('.fv-toolbar').addEventListener('click', function (e) {
      var act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
      if (!act) return;
      if (act === 'in') scale = Math.min(2.5, scale + 0.15);
      else if (act === 'out') scale = Math.max(0.25, scale - 0.15);
      else fit();
      apply();
    });
    fit();
  }

  window.FamilyViz = {
    // mode: 'tree' | 'network'
    render: function (container, relations, mode) {
      if (!container) return;
      ensureStyle();
      var list = Array.isArray(relations) ? relations : [];
      try {
        if (mode === 'network') renderNetwork(container, list);
        else renderTree(container, list);
      } catch (e) {
        console.error('[FamilyViz]', e);
        container.innerHTML = emptyHtml('Vizualizaci se nepodařilo vykreslit.');
      }
    }
  };
})();
