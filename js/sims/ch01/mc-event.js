/* PHY.sims.mcEvent: one schematic event, built live. A proton enters a Be layer from the vacuum (a boundary
   step), slows down in many short steps (continuous energy loss, hIoni), and its last step is an
   inelastic reaction (protonInelastic) that ends the proton track and creates a neutron, a gamma and the
   residual nucleus. The gamma makes one Compton scattering (compt), which creates an electron.
   The sim runs the way Geant4 does: one track at a time; a secondary gets the next track ID when it is
   created and goes on a stack; the next track is popped from the top (last in, first out). So the order
   is 1, 4, 3, 5, 2, and the tree, the track count and the step count grow as the event plays.
   Geometry and step counts are schematic (labelled so on the canvas).
   play(seconds) plays the whole event; before it only the proton at the entrance is drawn, the tree and
   the readouts show "?". opts: {locked, chapter, section}.
   getState(): {tracks: [{id, parent, particle, creator, steps}], order, nTracks, nSteps, done}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, K = PHY.ch01;

  const P = { x: 12, y: 2 }, Q = { x: 17, y: -4 };
  const SCRIPT = {
    p: { particle: 'proton', color: 'proton', name: 'p', pts: [{ x: -7, y: 1 }, { x: 0, y: 1 }, { x: 1.6, y: 1.3 }, { x: 3.1, y: 1.1 }, { x: 4.6, y: 1.6 }, { x: 6, y: 1.4 }, { x: 7.3, y: 1.9 }, { x: 8.5, y: 1.7 }, { x: 9.6, y: 2.1 }, { x: 10.5, y: 1.9 }, { x: 11.3, y: 2.2 }, P],
      procs: ['Transportation', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'protonInelastic'], creates: { 10: ['n', 'g', 'A'] } },
    n: { particle: 'neutron', color: 'neutron', name: 'n', pts: [P, { x: 17, y: 12 }, { x: 19.2, y: 16.4 }], procs: ['Transportation', 'Transportation'] },
    g: { particle: 'gamma', color: 'gamma', name: 'γ', pts: [P, Q, { x: 22, y: -5.3 }, { x: 40.5, y: -10.1 }], procs: ['compt', 'Transportation', 'Transportation'], creates: { 0: ['e'] } },
    A: { particle: 'nucleus', color: 'ink', name: 'גרעין', pts: [P, { x: 12.6, y: 1.5 }], procs: ['ionIoni'] },
    e: { particle: 'e-', color: 'electron', name: 'e⁻', pts: [Q, { x: 17.7, y: -2.9 }, { x: 18.6, y: -2.6 }, { x: 19.1, y: -1.8 }, { x: 19.3, y: -1.4 }], procs: ['eIoni', 'eIoni', 'eIoni', 'eIoni'] },
  };
  const SLAB = [0, 22, -11, 12];
  const SEG_TIME = { p: 0.2, n: 0.5, g: 0.42, A: 0.4, e: 0.2 };

  PHY.sims.mcEvent = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -8, xMax: 41, yMin: -37, yMax: 17 }, aspect: 0.92, minHeight: 330, maxHeight: 520 });
    const tw = PHY.tweens();
    const S = {};

    function fresh() {
      S.tracks = [];          /* {id, parent, key, creator, steps, done, shown (points drawn), part} */
      S.stack = [];
      S.order = [];
      S.nextId = 1;
      S.current = null;
      S.nSteps = 0;
      S.done = false;
      S.ran = false;
    }
    function create(key, parent, creator) {
      const t = { id: S.nextId++, parent, key, creator, steps: 0, done: false, shown: 0, part: 0 };
      S.tracks.push(t);
      S.stack.push(t);
      return t;
    }

    let readouts = null, againBtn = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'tracks', label: 'מסלולים באירוע' },
        { key: 'steps', label: 'צעדים עד עכשיו' },
        { key: 'now', label: 'המסלול שרץ עכשיו' },
      ]);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      againBtn = U.Button(row, 'להריץ את האירוע שוב', () => { api.play(6.5); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }, {});
    }
    function paint() {
      if (!readouts) return;
      const cur = S.current;
      readouts.set('tracks', S.ran ? F.num(S.tracks.length, 0) : '?');
      readouts.set('steps', S.ran ? F.num(S.nSteps, 0) : '?');
      readouts.set('now', !S.ran ? '?' : cur ? 'מסלול ' + cur.id + ' (' + SCRIPT[cur.key].name + ')' : S.done ? 'האירוע נגמר' : '–');
    }
    function buttons() { if (againBtn) againBtn.disabled = opts.locked || (S.ran && !S.done); }

    /* ---------- drawing ---------- */
    function drawTrack(t) {
      const sc = SCRIPT[t.key];
      const n = t.shown;            /* whole segments drawn */
      const pts = sc.pts.slice(0, n + 1);
      if (t.part > 0 && n < sc.pts.length - 1) {
        const a = sc.pts[n], b = sc.pts[n + 1];
        pts.push({ x: a.x + (b.x - a.x) * t.part, y: a.y + (b.y - a.y) * t.part });
      }
      if (pts.length < 2) return;
      const col = C[sc.color];
      view.poly(pts, { color: col, width: sc.particle === 'nucleus' ? 3.4 : 2.4 });
      /* step points: every post-step point drawn so far */
      for (let i = 1; i <= n; i++) view.circle(sc.pts[i].x, sc.pts[i].y, 2.6, { px: true, fill: col });
    }

    function nodePos(t) {
      const cols = { 1: 15.5, 2: 2.5, 3: 15.5, 4: 28.5, 5: 15.5 };
      const rows = { 1: -16.2, 2: -25, 3: -25, 4: -25, 5: -32.5 };
      return { x: cols[t.id] !== undefined ? cols[t.id] : 15.5, y: rows[t.id] !== undefined ? rows[t.id] : -32.5 };
    }

    function render() {
      view.clear();
      const ctx = view.ctx;
      /* the Be layer */
      ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = C.volume;
      ctx.fillRect(view.sx(SLAB[0]), view.sy(SLAB[3]), (SLAB[1] - SLAB[0]) * view.scale, (SLAB[3] - SLAB[2]) * view.scale);
      ctx.restore();
      view.poly([{ x: SLAB[0], y: SLAB[2] }, { x: SLAB[1], y: SLAB[2] }, { x: SLAB[1], y: SLAB[3] }, { x: SLAB[0], y: SLAB[3] }], { close: true, color: 'volume', width: 2 });
      view.text(SLAB[0] + 1, SLAB[3] - 1.6, 'Be', { size: 12, weight: 700, color: C.volume, align: 'left' });
      view.screenText(view.w - 8, 14, 'סכמטי', { size: 11, weight: 600, color: C.muted, align: 'right', pill: true });
      /* tracks */
      S.tracks.forEach(drawTrack);
      if (!S.ran) {
        view.circle(-7, 1, 6, { px: true, fill: C.proton });
        view.arrow(-7, 1, -2.5, 1, { color: 'proton', width: 2.4 });
        view.text(-6.5, 3.2, F.unit(6.3, 'MeV', 1), { size: 11.5, weight: 700, color: C.proton, align: 'left' });
      }
      /* the tree */
      view.line(-7, -13.4, 40, -13.4, { color: 'grid', width: 1 });
      view.text(-7, -14.9, 'עץ האירוע', { size: 11.5, weight: 700, color: C.muted, align: 'left' });
      if (!S.ran) { K.mark(view, view.sx(15.5), view.sy(-25)); return; }
      S.tracks.forEach(function (t) {
        if (!t.parent) return;
        const a = nodePos(S.tracks[t.parent - 1]), b = nodePos(t);
        view.line(a.x, a.y - 4.6, b.x, b.y + 2, { color: 'gridStrong', width: 1.6 });
      });
      S.tracks.forEach(function (t) {
        const sc = SCRIPT[t.key], p = nodePos(t), col = C[sc.color];
        const px = view.sx(p.x), py = view.sy(p.y);
        const on = S.current === t;
        ctx.save();
        ctx.fillStyle = t.done || on ? col : C.panel;
        ctx.strokeStyle = col; ctx.lineWidth = on ? 3.5 : 2;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px - 30, py - 12, 60, 24, 12); else ctx.rect(px - 30, py - 12, 60, 24);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        view.screenText(px, py, t.id + ' ' + sc.name, { size: 12, weight: 700, color: t.done || on ? C.bg : col });
        view.screenText(px, py + 20, t.creator || 'ראשוני', { size: 10, weight: 600, color: C.muted });
      });
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    /* Plays one track to its end, one step at a time; creations push new tracks. */
    function runTrack(t, k) {
      const sc = SCRIPT[t.key];
      S.current = t;
      if (S.order.indexOf(t.id) < 0) S.order.push(t.id);
      paint();
      let chain = Promise.resolve();
      for (let i = 0; i < sc.procs.length; i++) {
        chain = chain.then(() => tw.run(SEG_TIME[t.key] * k, (f) => {
          t.part = f;
          if (f >= 1) {
            t.part = 0; t.shown = i + 1; t.steps++; S.nSteps++;
            (sc.creates && sc.creates[i] || []).forEach((c) => create(c, t.id, sc.procs[i]));
            if (i === sc.procs.length - 1) t.done = true;
            paint();
          }
          loop.requestRender();
        }));
      }
      return chain;
    }
    function runEvent(k) {
      const next = () => {
        if (!S.stack.length) { S.current = null; S.done = true; paint(); buttons(); loop.requestRender(); return Promise.resolve(); }
        const t = S.stack.pop();
        return runTrack(t, k).then(() => tw.wait(0.12 * k)).then(next);
      };
      return next();
    }

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); fresh(); paint(); buttons(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        fresh();
        S.ran = true;
        create('p', 0, '');
        paint(); buttons();
        loop.start();
        const k = (seconds || 6.5) / 6.5;
        return runEvent(k).then(() => { opts.locked = false; buttons(); });
      },
      setParam(key, v) { if (key === 'locked') { opts.locked = v; buttons(); } loop.requestRender(); },
      getState() {
        return {
          tracks: S.tracks.map((t) => ({ id: t.id, parent: t.parent, particle: SCRIPT[t.key].particle, creator: t.creator, steps: t.steps })),
          order: S.order.slice(), nTracks: S.tracks.length, nSteps: S.nSteps, done: S.done,
        };
      },
    };
    fresh();
    paint();
    buttons();
    return api;
  };
})();
