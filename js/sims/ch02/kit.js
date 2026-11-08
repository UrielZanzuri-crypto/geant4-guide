/* PHY.ch02: chapter 2 helpers (how Geant4 is organised: run, event, track, step), loaded before the
   chapter's sims.

   A schematic event is a tree of track specs:
     {p: 'proton'|'neutron'|'gamma'|'electron'|'nucleus', pts: [{x, y}, ...], procs: ['Transportation', ...],
      E: [kinetic energy at the pre-step point of every step, MeV], kids: {stepIndex: [spec, ...]}}
   pts has one point more than procs (the pre-step point of step 0, then every post-step point). kids[i] are
   the secondaries created in step i, in creation order.

   transport(primary, order) runs the event the way G4EventManager does: BeginOfEventAction, the primary
     is stacked with track ID 1, then a loop pops a track, calls PreUserTrackingAction, one
     UserSteppingAction per step, PostUserTrackingAction; only then are the track's secondaries given the
     next track IDs (in creation order) and pushed on the stack. order 'lifo' (Geant4: last in, first out)
     or 'fifo' (a queue, for comparison only). GeneratePrimaries comes before BeginOfEventAction.
     Returns {tracks: [{id, parent, p, creator, spec, nSteps}], seq: [{cb, id, step, proc, ids, stack}],
              order: [ids in transport order], nSteps}. cb is a user callback, or 'push'/'pop' (stack
     operations, not user code). stack: the ids on the stack after the entry, bottom first.
   USER: the user callbacks in calling order; isUser(cb).
   timeline(ev, dur) and stateAt(ev, tl, t): a schedule of the sequence (dur(entry) seconds each) and
     the state at time t: {i (entry under way), frac, shown: {id: steps drawn}, born: {id}, started,
     ended, stack, calls: {cb: n}, nSteps, current (id being transported)}. The sims animate by moving t.
   EV1: the schematic event of the chapter: a 6.3 MeV proton enters the Be layer, slows down (hIoni) and
     its last step is protonInelastic, which creates a neutron, a gamma and the residual nucleus (IDs 2, 3,
     4); the neutron scatters once (hadElastic) and leaves; the gamma makes a Compton scattering (compt)
     that creates an electron (ID 5). 5 tracks, 21 steps, transport order 1, 4, 3, 5, 2.
   randomEvent(rng, o): a random schematic event in the same frame, for the playground.
   FRAME, SLAB: the drawing frame (World) and the Be layer, schematic units.
   drawFrame(view, o), drawTracks(view, ev, st, o), drawTree(view, ev, st, o): drawing helpers.
   PART: symbol, Hebrew name and color key of every particle.
   All colors are read from PHY.colors at draw time. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt;

  const PART = {
    proton: { sym: 'p', he: 'פרוטון', color: 'proton' },
    neutron: { sym: 'n', he: 'נייטרון', color: 'neutron' },
    gamma: { sym: 'γ', he: 'גמא', color: 'gamma' },
    electron: { sym: 'e⁻', he: 'אלקטרון', color: 'electron' },
    nucleus: { sym: 'גרעין', he: 'גרעין', color: 'ink' },
  };
  const USER = ['BeginOfRunAction', 'GeneratePrimaries', 'BeginOfEventAction', 'PreUserTrackingAction', 'UserSteppingAction', 'PostUserTrackingAction', 'EndOfEventAction', 'EndOfRunAction'];
  const isUser = (cb) => USER.indexOf(cb) >= 0;

  const FRAME = { xMin: -10, xMax: 46, yMin: -14, yMax: 14 };
  const SLAB = { x0: 0, x1: 24, y0: -11, y1: 11 };

  function transport(primary, order) {
    order = order || 'lifo';
    const tracks = [], seq = [], stack = [], ord = [];
    let counter = 0, nSteps = 0;
    const snap = () => stack.map((t) => t.id);
    const push = (list) => {
      if (!list.length) return;
      list.forEach((t) => { tracks.push(t); stack.push(t); });
      seq.push({ cb: 'push', ids: list.map((t) => t.id), stack: snap() });
    };
    seq.push({ cb: 'GeneratePrimaries', stack: [] });
    seq.push({ cb: 'BeginOfEventAction', stack: [] });
    push([{ id: ++counter, parent: 0, p: primary.p, creator: '', spec: primary, nSteps: primary.procs.length }]);
    while (stack.length) {
      const t = order === 'fifo' ? stack.shift() : stack.pop();
      ord.push(t.id);
      seq.push({ cb: 'pop', id: t.id, stack: snap() });
      seq.push({ cb: 'PreUserTrackingAction', id: t.id, stack: snap() });
      const born = [];
      t.spec.procs.forEach(function (proc, i) {
        nSteps++;
        seq.push({ cb: 'UserSteppingAction', id: t.id, step: i, proc, stack: snap() });
        ((t.spec.kids && t.spec.kids[i]) || []).forEach((k) => born.push({ spec: k, creator: proc }));
      });
      seq.push({ cb: 'PostUserTrackingAction', id: t.id, stack: snap() });
      push(born.map((b) => ({ id: ++counter, parent: t.id, p: b.spec.p, creator: b.creator, spec: b.spec, nSteps: b.spec.procs.length })));
    }
    seq.push({ cb: 'EndOfEventAction', stack: [] });
    return { tracks, seq, order: ord, nSteps, track: (id) => tracks[id - 1] };
  }

  /* dur(entry) -> seconds. Default: a step takes 0.22 s, a stack operation 0.3 s, a callback 0.16 s. */
  function timeline(ev, dur) {
    dur = dur || defaultDur;
    let t = 0;
    const tl = ev.seq.map(function (e) { const d = dur(e); const a = { t0: t, t1: t + d }; t += d; return a; });
    tl.T = t;
    return tl;
  }
  function defaultDur(e) {
    if (e.cb === 'UserSteppingAction') return 0.22;
    if (e.cb === 'push' || e.cb === 'pop') return 0.3;
    return 0.16;
  }

  function stateAt(ev, tl, t) {
    const st = { i: -1, frac: 0, shown: {}, born: {}, started: {}, ended: {}, stack: [], calls: {}, nSteps: 0, current: 0, entry: null, done: false };
    USER.forEach((c) => { st.calls[c] = 0; });
    for (let i = 0; i < ev.seq.length; i++) {
      const e = ev.seq[i], a = tl[i];
      if (t < a.t0 - 1e-12 || (i > 0 && t <= a.t0 + 1e-12)) break;
      st.i = i; st.entry = e;
      const full = t >= a.t1 - 1e-12;
      st.frac = full ? 1 : (t - a.t0) / (a.t1 - a.t0);
      if (e.cb === 'pop' || e.cb === 'PreUserTrackingAction') st.current = e.id;
      if (e.cb === 'push') e.ids.forEach((id) => { st.born[id] = true; });
      if (isUser(e.cb) && (e.cb !== 'UserSteppingAction' || full)) st.calls[e.cb]++;
      if (e.cb === 'UserSteppingAction') {
        st.current = e.id;
        if (full) { st.shown[e.id] = e.step + 1; st.nSteps++; }
      }
      if (e.cb === 'PreUserTrackingAction') st.started[e.id] = true;
      if (e.cb === 'PostUserTrackingAction') st.ended[e.id] = true;
      if (full || e.cb !== 'push') st.stack = e.stack;
    }
    st.done = t >= tl.T - 1e-12;
    if (st.done) st.current = 0;
    return st;
  }

  /* ---------- the chapter's schematic event ---------- */
  const P = { x: 12, y: 2 }, Q = { x: 16.5, y: -3.5 };
  const EV1 = {
    p: 'proton',
    pts: [{ x: -9, y: 1 }, { x: 0, y: 1 }, { x: 1.6, y: 1.3 }, { x: 3.1, y: 1.1 }, { x: 4.6, y: 1.6 }, { x: 6, y: 1.4 }, { x: 7.3, y: 1.9 }, { x: 8.5, y: 1.7 }, { x: 9.6, y: 2.1 }, { x: 10.5, y: 1.9 }, { x: 11.3, y: 2.2 }, P],
    procs: ['Transportation', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'protonInelastic'],
    E: [6.3, 6.3, 6.0, 5.7, 5.4, 5.1, 4.8, 4.5, 4.2, 3.9, 3.6],
    kids: {
      10: [
        { p: 'neutron', pts: [P, { x: 17, y: 6.5 }, { x: 24, y: 9.4 }, { x: 35.1, y: 14 }], procs: ['hadElastic', 'Transportation', 'Transportation'], E: [2.6, 2.3, 2.3] },
        { p: 'gamma', pts: [P, Q, { x: 24, y: -5.2 }, { x: 46, y: -10.2 }], procs: ['compt', 'Transportation', 'Transportation'], E: [0.6, 0.4, 0.4],
          kids: { 0: [{ p: 'electron', pts: [Q, { x: 17.2, y: -2.8 }, { x: 17.8, y: -2.2 }, { x: 18.1, y: -1.7 }], procs: ['eIoni', 'eIoni', 'eIoni'], E: [0.2, 0.13, 0.06] }] } },
        { p: 'nucleus', pts: [P, { x: 12.5, y: 1.6 }], procs: ['ionIoni'], E: [0.3] },
      ],
    },
  };
  const EV1_WEIGHT = 0.22;

  /* ---------- geometry for random events ---------- */
  /* Distance from p along unit d to the first wall of box b (from inside), or into b (from outside). */
  function exitBox(p, d, b) {
    let t = Infinity;
    if (d.x > 1e-12) t = Math.min(t, (b.x1 - p.x) / d.x);
    if (d.x < -1e-12) t = Math.min(t, (b.x0 - p.x) / d.x);
    if (d.y > 1e-12) t = Math.min(t, (b.y1 - p.y) / d.y);
    if (d.y < -1e-12) t = Math.min(t, (b.y0 - p.y) / d.y);
    return Math.max(0, t);
  }
  const WORLD = { x0: FRAME.xMin, x1: FRAME.xMax, y0: FRAME.yMin, y1: FRAME.yMax };
  const add = (p, d, s) => ({ x: p.x + d.x * s, y: p.y + d.y * s });
  const dirOf = (a) => ({ x: Math.cos(a), y: Math.sin(a) });

  /* A neutral particle from p inside the slab: scatters (prob pScat each time, at most `max` times),
     then leaves the slab (boundary step) and the World (boundary step). */
  function neutral(rng, part, p, E, scatProc, o) {
    const pts = [p], procs = [], Es = [];
    let ang = rng() * 2 * Math.PI, e = E, pos = p, kids = {};
    for (let k = 0; k < o.max; k++) {
      const d = dirOf(ang), wall = exitBox(pos, d, SLAB);
      const s = o.lam * -Math.log(1 - rng());
      if (s >= wall || rng() > o.pScat) break;
      pos = add(pos, d, s);
      pts.push(pos); procs.push(scatProc); Es.push(+e.toFixed(2));
      if (o.child && rng() < o.pChild) kids[procs.length - 1] = [o.child(pos, e * 0.4)];
      e *= 0.65 + 0.3 * rng();
      ang += (rng() < 0.5 ? -1 : 1) * (0.5 + 1.8 * rng());
    }
    const d = dirOf(ang);
    pos = add(pos, d, exitBox(pos, d, SLAB));
    pts.push(pos); procs.push('Transportation'); Es.push(+e.toFixed(2));
    pos = add(pos, d, exitBox(pos, d, WORLD));
    pts.push(pos); procs.push('Transportation'); Es.push(+e.toFixed(2));
    return { p: part, pts, procs, E: Es, kids };
  }
  function electron(rng, p, E) {
    const pts = [p], procs = [], Es = [];
    let ang = rng() * 2 * Math.PI, pos = p, e = E;
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      pos = add(pos, dirOf(ang), 0.5 + 0.4 * rng());
      pts.push(pos); procs.push('eIoni'); Es.push(+e.toFixed(2));
      e *= 0.55; ang += (rng() - 0.5) * 1.6;
    }
    return { p: 'electron', pts, procs, E: Es };
  }

  /* o: {E (MeV, 2-13), pReact (toy probability of an inelastic reaction), seed-free: uses rng}.
     The number of steps grows with E (schematic): about 6 + E steps in the layer. */
  function randomEvent(rng, o) {
    o = Object.assign({ E: 6.3, pReact: 0.5 }, o || {});
    const y0 = -3 + 6 * rng();
    const L = Math.min(21, 3 + 1.6 * Math.pow(o.E, 1.1));
    const n = Math.max(3, Math.round(4 + o.E * 0.8 + rng() * 3));
    const pts = [{ x: -9, y: y0 }, { x: 0, y: y0 }], procs = ['Transportation'], Es = [o.E];
    let pos = { x: 0, y: y0 }, ang = (rng() - 0.5) * 0.2;
    const react = rng() < o.pReact;
    const nn = react ? Math.max(2, Math.round(n * (0.4 + 0.5 * rng()))) : n;
    for (let i = 0; i < nn; i++) {
      const s = L / n * (1.25 - 0.5 * i / n);
      ang += (rng() - 0.5) * (0.12 + 0.5 * i / n);
      pos = add(pos, dirOf(ang), s);
      pos.y = Math.max(SLAB.y0 + 0.5, Math.min(SLAB.y1 - 0.5, pos.y));
      pts.push(pos);
      procs.push(react && i === nn - 1 ? 'protonInelastic' : 'hIoni');
      Es.push(+(o.E * Math.pow(1 - i / n, 0.6)).toFixed(2));
    }
    const spec = { p: 'proton', pts, procs, E: Es, kids: {} };
    if (react) {
      const Eat = Es[Es.length - 1];
      const prods = [neutral(rng, 'neutron', pos, Math.max(0.3, Eat - 1.9), 'hadElastic', { lam: 9, pScat: 0.6, max: 2 })];
      if (rng() < 0.6) prods.push(neutral(rng, 'gamma', pos, 0.5 + 0.4 * rng(), 'compt', { lam: 8, pScat: 0.5, max: 1, child: (p, e) => electron(rng, p, e), pChild: 1 }));
      prods.push({ p: 'nucleus', pts: [pos, add(pos, dirOf(rng() * 6.28), 0.6)], procs: ['ionIoni'], E: [0.3] });
      spec.kids[procs.length - 1] = rng() < 0.5 ? prods : prods.reverse();
    }
    return spec;
  }

  /* ---------- drawing ---------- */
  function drawFrame(view, o) {
    o = o || {};
    const ctx = view.ctx, C = PHY.colors;
    view.poly([{ x: FRAME.xMin, y: FRAME.yMin }, { x: FRAME.xMax, y: FRAME.yMin }, { x: FRAME.xMax, y: FRAME.yMax }, { x: FRAME.xMin, y: FRAME.yMax }], { close: true, color: 'gridStrong', width: 1.2, dash: [5, 4] });
    ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = C.volume;
    ctx.fillRect(view.sx(SLAB.x0), view.sy(SLAB.y1), (SLAB.x1 - SLAB.x0) * view.scale, (SLAB.y1 - SLAB.y0) * view.scale);
    ctx.restore();
    view.poly([{ x: SLAB.x0, y: SLAB.y0 }, { x: SLAB.x1, y: SLAB.y0 }, { x: SLAB.x1, y: SLAB.y1 }, { x: SLAB.x0, y: SLAB.y1 }], { close: true, color: 'volume', width: o.slabWidth || 2 });
    view.text(SLAB.x0 + 0.8, SLAB.y1 - 1.6, o.slabLabel || 'Be', { size: 12, weight: 700, color: C.volume, align: 'left' });
    if (o.worldLabel !== false) view.text(FRAME.xMax - 0.6, FRAME.yMin + 1.4, 'World', { size: 10.5, weight: 600, color: C.muted, align: 'right' });
  }

  /* Tracks of ev up to the state st. o: {highlight (bool), boundary (mark Transportation steps), points,
     only (a Set of ids to draw), dim (a Set of ids drawn faint)}. */
  function drawTracks(view, ev, st, o) {
    o = Object.assign({ highlight: true, points: true, boundary: false }, o || {});
    const C = PHY.colors;
    ev.tracks.forEach(function (t) {
      if (o.only && !o.only.has(t.id)) return;
      const sp = t.spec, n = st.shown[t.id] || 0;
      const cur = st.entry && st.entry.cb === 'UserSteppingAction' && st.entry.id === t.id && st.frac < 1 ? st.frac : 0;
      const pts = sp.pts.slice(0, n + 1);
      if (cur > 0) {
        const a = sp.pts[n], b = sp.pts[n + 1];
        pts.push({ x: a.x + (b.x - a.x) * cur, y: a.y + (b.y - a.y) * cur });
      }
      if (pts.length < 2) return;
      const col = C[PART[t.p].color];
      const alpha = o.dim && o.dim.has(t.id) ? 0.3 : 1;
      view.poly(pts, { color: col, width: t.p === 'nucleus' ? 3.4 : 2.3, alpha });
      if (o.points) for (let i = 1; i <= n; i++) {
        const bnd = o.boundary && sp.procs[i - 1] === 'Transportation';
        view.circle(sp.pts[i].x, sp.pts[i].y, bnd ? 4.2 : 2.5, bnd ? { px: true, color: C.volume, width: 2, fill: C.bg, alpha } : { px: true, fill: col, alpha });
      }
      if (o.highlight && cur > 0) {
        const head = pts[pts.length - 1];
        view.circle(head.x, head.y, 7, { px: true, color: col, width: 2.5 });
        view.circle(sp.pts[n].x, sp.pts[n].y, 4, { px: true, fill: C.bg, color: col, width: 2 });
      }
    });
  }

  /* The tree of ev, as nodes laid out by generation, in world coordinates under the frame.
     o: {y0 (top row), dy, x0, x1}. Nodes appear when their track is born. */
  function treeLayout(ev, o) {
    o = Object.assign({ y0: -18, dy: 7.6, x0: FRAME.xMin + 4, x1: FRAME.xMax - 4 }, o || {});
    const gen = {}, rows = [];
    ev.tracks.forEach(function (t) {
      const g = t.parent ? gen[t.parent] + 1 : 0;
      gen[t.id] = g;
      (rows[g] = rows[g] || []).push(t.id);
    });
    const pos = {};
    rows.forEach(function (ids, g) {
      ids.forEach(function (id, j) {
        pos[id] = { x: o.x0 + ((j + 0.5) * (o.x1 - o.x0)) / ids.length, y: o.y0 - g * o.dy };
      });
    });
    /* a child sits under its parent when it is an only child of a parent that is not centred */
    rows.forEach(function (ids, g) {
      if (!g) return;
      const byParent = {};
      ids.forEach((id) => { const p = ev.track(id).parent; (byParent[p] = byParent[p] || []).push(id); });
      if (Object.keys(byParent).length === 1 && ids.length === 1) pos[ids[0]].x = pos[ev.track(ids[0]).parent].x;
    });
    return pos;
  }

  function drawTree(view, ev, st, o) {
    o = o || {};
    const C = PHY.colors, ctx = view.ctx;
    const pos = o.pos || treeLayout(ev, o);
    ev.tracks.forEach(function (t) {
      if (!t.parent || !st.born[t.id]) return;
      const a = pos[t.parent], b = pos[t.id];
      view.line(a.x, a.y - 1.9, b.x, b.y + 1.9, { color: 'gridStrong', width: 1.5 });
    });
    ev.tracks.forEach(function (t) {
      if (!st.born[t.id]) return;
      const p = pos[t.id], col = C[PART[t.p].color];
      const px = view.sx(p.x), py = view.sy(p.y);
      const on = st.current === t.id, done = !!st.ended[t.id];
      const w = o.nodeW || 54, h = 22;
      ctx.save();
      ctx.fillStyle = done || on ? col : C.panel;
      ctx.strokeStyle = col; ctx.lineWidth = on ? 3.4 : 1.8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px - w / 2, py - h / 2, w, h, h / 2); else ctx.rect(px - w / 2, py - h / 2, w, h);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      view.screenText(px, py + 0.5, t.id + ' ' + PART[t.p].sym, { size: 11.5, weight: 700, color: done || on ? C.bg : col });
      if (o.creators !== false) view.screenText(px, py + 18, t.creator || 'ראשוני', { size: 9.5, weight: 600, color: C.muted });
    });
    return pos;
  }

  function clock(view, text) {
    view.screenText(view.w - 10, 16, text, { size: 11, weight: 600, align: 'right', color: PHY.colors.muted, pill: true });
  }
  function mark(view, px, py, text, size) {
    view.screenText(px, py, text || '?', { size: size || 30, weight: 800, color: PHY.colors.muted, halo: true });
  }

  PHY.ch02 = { PART, USER, isUser, FRAME, SLAB, WORLD, transport, timeline, stateAt, EV1, EV1_WEIGHT, randomEvent, exitBox, drawFrame, drawTracks, drawTree, treeLayout, clock, mark };
})();
