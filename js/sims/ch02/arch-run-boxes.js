/* PHY.sims.archRunBoxes: trap 1, "an event is one particle". /run/beamOn 3 fires three protons; the run
   (G4Run) holds three events (G4Event), one per primary proton, and every event holds all the tracks of
   its proton's family. Event 0: the proton's last step is an inelastic reaction that creates a neutron, a
   gamma and the residual nucleus (4 tracks); events 1 and 2: the proton stops (1 track each).
   Schematic drawings; play(seconds) fills the three boxes one after another; before it they are empty and
   the readouts show "?". opts: {locked}. getState(): {events, tracks, perEvent, ran}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;

  /* local coordinates of one event box: x 0..30, y 0..40; the Be layer x 10..22 */
  const EVTS = [
    { tracks: [
      { p: 'proton', pts: [{ x: 1, y: 20 }, { x: 10, y: 20 }, { x: 12, y: 20.6 }, { x: 14, y: 20.2 }, { x: 15.5, y: 21 }] },
      { p: 'neutron', pts: [{ x: 15.5, y: 21 }, { x: 19, y: 27 }, { x: 22, y: 30 }, { x: 29, y: 38 }] },
      { p: 'gamma', pts: [{ x: 15.5, y: 21 }, { x: 22, y: 13 }, { x: 29, y: 5 }] },
      { p: 'nucleus', pts: [{ x: 15.5, y: 21 }, { x: 16, y: 20.5 }] },
    ] },
    { tracks: [{ p: 'proton', pts: [{ x: 1, y: 17 }, { x: 10, y: 17 }, { x: 12, y: 17.4 }, { x: 13.6, y: 16.8 }, { x: 14.8, y: 17.3 }] }] },
    { tracks: [{ p: 'proton', pts: [{ x: 1, y: 23 }, { x: 10, y: 23 }, { x: 11.8, y: 22.5 }, { x: 13.2, y: 23.1 }] }] },
  ];

  PHY.sims.archRunBoxes = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 66 }, aspect: 1.5, minHeight: 220, maxHeight: 380 });
    const tw = PHY.tweens();
    const S = { ran: false, k: 0, f: 0 };
    const BX = [3, 35, 67];

    let R = null;
    if (controlsEl) R = U.Readouts(controlsEl, [
      { key: 'p', label: 'פרוטונים שנורו', color: 'var(--c-proton)' },
      { key: 'ev', label: 'אירועים בריצה' },
      { key: 'tr', label: 'מסלולים בריצה' },
    ]);
    const filled = () => (S.ran ? S.k + (S.f > 0 ? 1 : 0) : 0);
    function paint() {
      if (!R) return;
      const n = Math.min(3, filled());
      const done = S.ran && S.k >= 3;
      R.set('p', S.ran ? F.num(n, 0) : '?');
      R.set('ev', done ? '3' : '?');
      R.set('tr', done ? F.num(EVTS.reduce((s, e) => s + e.tracks.length, 0), 0) : '?');
    }

    function render() {
      view.clear();
      const C = PHY.colors, ctx = view.ctx;
      /* the run */
      view.poly([{ x: 1, y: 1 }, { x: 99, y: 1 }, { x: 99, y: 58 }, { x: 1, y: 58 }], { close: true, color: 'ink', width: 1.6 });
      view.text(2.5, 61.5, 'G4Run', { size: 12, weight: 800, color: C.ink, align: 'left' });
      view.text(98, 61.5, '/run/beamOn 3', { size: 11, weight: 600, color: C.muted, align: 'right' });
      EVTS.forEach(function (ev, i) {
        const x0 = BX[i], y0 = 5;
        view.poly([{ x: x0, y: y0 }, { x: x0 + 30, y: y0 }, { x: x0 + 30, y: y0 + 46 }, { x: x0, y: y0 + 46 }], { close: true, color: 'gridStrong', width: 1.4, dash: [5, 4] });
        view.text(x0 + 15, y0 + 49, S.ran && i < filled() ? 'G4Event ' + i : 'G4Event ?', { size: 10.5, weight: 700, color: C.muted });
        ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = C.volume;
        ctx.fillRect(view.sx(x0 + 10), view.sy(y0 + 40), 12 * view.scale, 36 * view.scale);
        ctx.restore();
        view.poly([{ x: x0 + 10, y: y0 + 4 }, { x: x0 + 22, y: y0 + 4 }, { x: x0 + 22, y: y0 + 40 }, { x: x0 + 10, y: y0 + 40 }], { close: true, color: 'volume', width: 1.4 });
        if (!S.ran || i > S.k || (i === S.k && S.f <= 0)) return;
        const f = i < S.k ? 1 : S.f;
        const n = ev.tracks.length;
        ev.tracks.forEach(function (t, j) {
          const g = Math.max(0, Math.min(1, f * n - j));
          if (g <= 0) return;
          const pts = t.pts.map((p) => ({ x: x0 + p.x, y: y0 + p.y }));
          const segs = pts.length - 1, upto = g * segs;
          const out = pts.slice(0, Math.floor(upto) + 1);
          if (upto < segs) { const a = pts[Math.floor(upto)], b = pts[Math.floor(upto) + 1], r = upto - Math.floor(upto); out.push({ x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r }); }
          view.poly(out, { color: C[K.PART[t.p].color], width: t.p === 'nucleus' ? 3.2 : 2.2 });
        });
      });
      if (!S.ran) K.mark(view, view.sx(50), view.sy(29));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.k = 0; S.f = 0; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.k = 0; S.f = 0; loop.start();
        const per = (seconds || 4) / 3;
        let chain = Promise.resolve();
        EVTS.forEach(function (e, i) {
          chain = chain.then(() => tw.run(per, (f) => { S.k = i; S.f = f; if (f >= 1) { S.k = i + 1; S.f = 0; } paint(); loop.requestRender(); }));
        });
        return chain.then(() => { opts.locked = false; });
      },
      setParam() {},
      getState() { return { ran: S.ran, events: S.k, tracks: EVTS.slice(0, S.k).reduce((s, e) => s + e.tracks.length, 0), perEvent: EVTS.map((e) => e.tracks.length) }; },
    };
    paint();
    return api;
  };
})();
