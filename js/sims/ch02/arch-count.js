/* PHY.sims.archCount: the hook of chapter 2. Which object does Geant4 create most often in the Be run of
   3×10⁶ protons: events, tracks or steps? A schematic toy with the numbers of the chapter's problem: every
   proton is one event and one track, and makes 40 steps on average (36 to 44 here: one step from the
   source to the converter, the rest while it slows down); in a fraction 4.5×10⁻⁴ of the events (about
   the neutron yield per proton of the run) a neutron is made, one more track with 10 steps.
   The top panel replays the first 12 events, one after another; the bars below count events, tracks and
   steps on a logarithmic axis. Then the counters run on to 3×10⁶ events, where the totals are the expected
   values: tracks N(1 + p_sec), steps N(40 + 10 p_sec).
   play(seconds) runs it; before it the bars are empty and the readouts show "?".
   opts: {N, steps, pSec, secSteps, seed, locked}. getState(): {events, tracks, steps, firstEvents: [{steps, tracks}]}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;

  PHY.sims.archCount = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 3e6, steps: 40, pSec: 4.5e-4, secSteps: 10, seed: 3, locked: true, shown: 12 }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 82 }, aspect: 1.3, minHeight: 270, maxHeight: 440 });
    const tw = PHY.tweens();
    const rng = PHY.random(opts.seed).next;
    const SL = { x0: 40, x1: 72, y0: 50, y1: 76 };
    const SRC = { x: 6, y: 63 };

    /* the first events, drawn: entry point, then steps - 1 short steps inside the layer */
    const first = [];
    for (let i = 0; i < opts.shown; i++) {
      const n = opts.steps - 4 + Math.floor(rng() * 9);
      const y = SL.y0 + 6 + (SL.y1 - SL.y0 - 12) * rng();
      const Rg = 5 + 20 * Math.pow(rng(), 0.7);
      const pts = [SRC, { x: SL.x0, y }];
      let x = SL.x0, yy = y;
      for (let k = 1; k < n; k++) {
        const ds = (Rg / (n - 1)) * (1.5 - (k / n));
        x += ds; yy += (rng() - 0.5) * ds * (0.2 + 1.4 * k / n);
        pts.push({ x, y: Math.max(SL.y0 + 1, Math.min(SL.y1 - 1, yy)) });
      }
      first.push({ pts, steps: n, tracks: 1 });
    }
    const sumFirst = (k, key) => first.slice(0, k).reduce((s, e) => s + e[key], 0);
    const final = { events: opts.N, tracks: opts.N * (1 + opts.pSec), steps: opts.N * (opts.steps + opts.secSteps * opts.pSec) };
    const S = { ran: false, k: 0, f: 0, ff: 0, anim: false };

    function counts() {
      if (!S.ran) return null;
      if (S.ff <= 0) {
        const k = S.k;
        const partial = k < first.length ? Math.floor(S.f * first[k].steps) : 0;
        return { events: k + (S.f > 0 && k < first.length ? 1 : 0), tracks: sumFirst(k, 'tracks') + (S.f > 0 && k < first.length ? 1 : 0), steps: sumFirst(k, 'steps') + partial };
      }
      const a = { events: first.length, tracks: sumFirst(first.length, 'tracks'), steps: sumFirst(first.length, 'steps') };
      const lerp = (x, y) => Math.pow(10, Math.log10(x) + (Math.log10(y) - Math.log10(x)) * S.ff);
      return { events: lerp(a.events, final.events), tracks: lerp(a.tracks, final.tracks), steps: lerp(a.steps, final.steps) };
    }

    let R = null;
    if (controlsEl) {
      R = U.Readouts(controlsEl, [
        { key: 'ev', label: 'אירועים (G4Event)' },
        { key: 'tr', label: 'מסלולים (G4Track)' },
        { key: 'st', label: 'צעדים (G4Step)', color: 'var(--accent)' },
      ]);
    }
    const fmt = (v) => (v < 1e4 ? F.num(Math.round(v), 0) : F.sci(v, 2));
    function paint() {
      if (!R) return;
      const c = counts();
      R.set('ev', c ? fmt(c.events) : '?');
      R.set('tr', c ? fmt(c.tracks) : '?');
      R.set('st', c ? fmt(c.steps) : '?');
    }

    function render() {
      view.clear();
      const C = PHY.colors, ctx = view.ctx;
      /* the converter and the current event */
      ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = C.volume;
      ctx.fillRect(view.sx(SL.x0), view.sy(SL.y1), (SL.x1 - SL.x0) * view.scale, (SL.y1 - SL.y0) * view.scale);
      ctx.restore();
      view.poly([{ x: SL.x0, y: SL.y0 }, { x: SL.x1, y: SL.y0 }, { x: SL.x1, y: SL.y1 }, { x: SL.x0, y: SL.y1 }], { close: true, color: 'volume', width: 2 });
      view.text(SL.x1 + 1.5, SL.y1 - 3, 'Be', { size: 12, weight: 700, color: C.volume, align: 'left' });
      view.circle(SRC.x, SRC.y, 4, { px: true, fill: C.proton });
      K.clock(view, 'סכמטי: 40 צעדים לפרוטון');
      if (S.ran && S.ff <= 0 && S.k < first.length) {
        const e = first[S.k];
        const n = Math.max(1, Math.ceil(S.f * e.steps));
        const pts = e.pts.slice(0, n + 1);
        view.poly(pts, { color: 'proton', width: 2 });
        for (let i = 1; i < pts.length; i++) view.circle(pts[i].x, pts[i].y, 1.9, { px: true, fill: C.proton });
        view.text(SRC.x, SRC.y - 5, 'אירוע ' + (S.k + 1), { size: 11, weight: 700, color: C.muted, align: 'left' });
      } else if (S.ran) {
        view.text(SRC.x, SRC.y - 5, S.ff < 1 ? 'עוד ועוד אירועים...' : F.sci(opts.N, 0) + ' אירועים', { size: 11, weight: 700, color: C.muted, align: 'left' });
      }
      /* the bars, log scale 10^0 .. 10^9 */
      const bx0 = 26, bx1 = 96, dec = 9;
      const X = (v) => bx0 + (bx1 - bx0) * Math.max(0, Math.log10(Math.max(1, v))) / dec;
      for (let d = 0; d <= dec; d += 3) {
        view.line(X(Math.pow(10, d)), 4, X(Math.pow(10, d)), 40, { color: 'grid', width: 1 });
        view.text(X(Math.pow(10, d)), 1.8, '10' + ['⁰', '', '', '³', '', '', '⁶', '', '', '⁹'][d], { size: 10, color: C.muted });
      }
      const c = counts();
      const rows = [['events', 'אירועים', 33], ['tracks', 'מסלולים', 22], ['steps', 'צעדים', 11]];
      rows.forEach(function (r) {
        view.text(bx0 - 2, r[2], r[1], { size: 11.5, weight: 700, color: C.ink, align: 'right' });
        if (!c) return;
        const v = c[r[0]];
        ctx.save(); ctx.fillStyle = r[0] === 'steps' ? C.accent : C.muted; ctx.globalAlpha = 0.75;
        ctx.fillRect(view.sx(bx0), view.sy(r[2] + 3), Math.max(1, (X(v) - bx0) * view.scale), 6 * view.scale);
        ctx.restore();
      });
      if (!c) K.mark(view, view.sx(60), view.sy(22));
      view.line(bx0, 4, bx0, 40, { color: 'axis', width: 1.5 });
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.k = 0; S.f = 0; S.ff = 0; S.anim = false; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.k = 0; S.f = 0; S.ff = 0; S.anim = true;
        loop.start();
        const sec = seconds || 5;
        const per = (sec * 0.7) / first.length;
        let chain = Promise.resolve();
        first.forEach(function (e, i) {
          chain = chain.then(() => tw.run(per, (f) => { S.k = i; S.f = f; if (f >= 1) { S.k = i + 1; S.f = 0; } paint(); loop.requestRender(); }));
        });
        return chain.then(() => tw.run(sec * 0.3, (f) => { S.ff = f; if (f >= 1) S.anim = false; paint(); loop.requestRender(); }))
          .then(() => { opts.locked = false; });
      },
      setParam(key, v) { opts[key] = v; loop.requestRender(); },
      getState() {
        const c = counts();
        return { ran: S.ran, events: c ? c.events : 0, tracks: c ? c.tracks : 0, steps: c ? c.steps : 0, final, firstEvents: first.map((e) => ({ steps: e.steps, tracks: e.tracks })) };
      },
    };
    paint();
    return api;
  };
})();
