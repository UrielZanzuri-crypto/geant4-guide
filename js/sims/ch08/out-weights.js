/* PHY.sims.outWeights: a check before believing a number: the mean weight of the source. Two weighted
   samples of the same toy run with flat sampling (PHY.ch08): on top the weight w of every proton fired (the
   `primary` table, one row per event), below the weight of every row of `leak`. Both on a log axis of w.
   The source weights are f(E)/g(E), so their mean is 1; the leak rows come mostly from the energetic protons,
   which have small weights, so their mean is about 0.219.
   Before the run both histograms are empty and the readouts show "?". play(seconds) fills them; the means are
   marked at the end.
   opts: {N, p, seed, locked}. getState(): {ran, shown, meanSource, errSource, meanRow, rows, nSource}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K1 = PHY.ch01, K = PHY.ch08;
  const LO = -1.7, HI = 0.8, NB = 25;

  PHY.sims.outWeights = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 2e4, p: 0.02, seed: 23, locked: true }, opts || {});
    const M = { l: 44, r: 14 };
    const top = PL.create(canvasEl, { x: [LO, HI], y: [0, 1], grid: true, rect: { x: 0, y: 0, w: 1, h: 0.5 }, margin: { l: M.l, r: M.r, t: 34, b: 30 }, aspect: 1.05, minHeight: 340, maxHeight: 520, yLabel: 'פרוטונים שנורו', yColor: 'proton' });
    const view = top.view;
    const bot = PL.panel(view, { x: [LO, HI], y: [0, 1], grid: true, rect: { x: 0, y: 0.5, w: 1, h: 0.5 }, margin: { l: M.l, r: M.r, t: 28, b: 40 }, xLabel: 'המשקל w, סקלה לוגריתמית', yLabel: 'שורות ב-leak', yColor: 'neutron' });
    const tw = PHY.tweens();
    const S = { ran: false, shown: 0 };
    const src = K.sourceWeights(opts.N, PHY.random(opts.seed).next);
    const run = K.makeRun({ N: opts.N, p: opts.p, seed: opts.seed + 1 });

    function stat() {
      const n = Math.round(src.length * S.shown), r = Math.round(run.R * S.shown);
      let s = 0, s2 = 0, sr = 0;
      for (let i = 0; i < n; i++) { s += src[i]; s2 += src[i] * src[i]; }
      for (let j = 0; j < r; j++) sr += run.w[j];
      const me = K1.meanErr(s, s2, n);
      return { n, r, meanSource: me.mean, errSource: me.err, meanRow: r ? sr / r : 0 };
    }

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'src', label: 'הממוצע של w בטבלה primary', color: 'var(--c-proton)' },
        { key: 'row', label: 'הממוצע של w בטבלה leak', color: 'var(--c-neutron)' },
      ]);
    }
    function paint() {
      if (!readouts) return;
      const done = S.ran && S.shown >= 1;
      const st = stat();
      readouts.set('src', done ? F.ltr(F.num(st.meanSource, 3) + ' ± ' + F.num(st.errSource, 3)) : '?');
      readouts.set('row', done ? F.num(st.meanRow, 3) : '?');
    }

    function panel(P, vals, count, color, mean) {
      const h = K.hist(vals, null, count, LO, HI, NB, true);
      const full = K.hist(vals, null, vals.length, LO, HI, NB, true);
      const ymax = Math.max.apply(null, Array.prototype.slice.call(full.sum));
      P.setRange({ y: [0, PL.niceRange(0, ymax * 1.2)[1]] });
      P.axes();
      K.logAxis(P, LO, HI);
      K1.bars(P, LO, full.dx, Array.prototype.slice.call(h.sum), { color, alpha: 0.5 });
      if (S.ran && S.shown >= 1) {
        P.vline(Math.log10(mean), { color: 'ink', dash: [5, 4] });
        view.screenText(P.X(Math.log10(mean)) + 6, P.box.y + 10, 'ממוצע: ' + F.num(mean, 2), { size: 12, weight: 700, color: C.ink, align: 'left', halo: true });
      }
      if (!S.ran) K1.mark(view, P.box.x + P.box.w / 2, P.box.y + P.box.h / 2);
    }

    function render() {
      view.clear();
      const st = stat();
      panel(top, src, st.n, 'proton', st.meanSource);
      panel(bot, run.w, st.r, 'neutron', st.meanRow);
      K1.clock(view, 'צעצוע, דגימה ' + F.ltr('flat') + ', ' + F.num(opts.N, 0) + ' אירועים');
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.shown = 0;
        paint(); loop.start();
        return tw.run(seconds || 3, function (k) {
          S.shown = k;
          if (k >= 1) S.shown = 1;
          paint(); loop.requestRender();
        });
      },
      setParam(key, v) { opts[key] = v; paint(); loop.requestRender(); },
      getState() { const st = stat(); return { ran: S.ran, shown: S.shown, meanSource: st.meanSource, errSource: st.errSource, meanRow: st.meanRow, rows: run.R, nSource: src.length }; },
    };
    paint();
    return api;
  };
})();
