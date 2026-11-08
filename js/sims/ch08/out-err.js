/* PHY.sims.outErr: what the error of a weighted tally really is. The same toy run (PHY.ch08.makeRun) is
   repeated with `reps` different seeds; the histogram collects the result of every repetition (Σw, or the row
   count when every weight is 1). Over it, three widths:
     rows rule     the spread a count of R independent rows would have: relative 1/√R
     event sums    the error ldns prints: √(N·var(x)) from the per-event sums x_i (MeanErr), averaged over
                   the repetitions
     measured      the standard deviation between the repetitions (the truth the other two try to predict)
   mode 'weights': flat sampling, weights between about 0.03 and 5, one neutron per reacting proton.
   mode 'pairs': analog (w = 1), and every reacting proton gives two neutrons (mult2 = 1).
   Before the run the histogram is empty and the readouts show "?". play(seconds) adds the repetitions one by
   one; the curves appear at the end. Free play: a button for another set of repetitions.
   opts: {mode, N, p, reps, seed, locked}.
   getState(): {values (one per repetition), mean, sd, relSd, rowsRule (relative), eventRule (relative), meanRows,
   meanK, ran, shown}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K1 = PHY.ch01, K = PHY.ch08;

  PHY.sims.outErr = function (canvasEl, controlsEl, opts) {
    const pairs = opts && opts.mode === 'pairs';
    opts = Object.assign(pairs
      ? { mode: 'pairs', N: 2e4, p: 0.02, reps: 200, seed: 31, locked: true }
      : { mode: 'weights', N: 2e4, p: 0.011, reps: 200, seed: 17, locked: true }, opts || {});
    const plot = PL.create(canvasEl, { x: [0, 1], y: [0, 1], grid: true, aspect: 1.5, minHeight: 260, maxHeight: 400, margin: { l: 44, r: 14, t: 34, b: 40 },
      xLabel: pairs ? 'שורות בריצה' : 'סכום המשקלים בריצה', yLabel: 'ריצות', yColor: 'ink' });
    const view = plot.view;
    const tw = PHY.tweens();
    const S = { ran: false, shown: 0, batch: 0, list: [] };

    function one(seed) {
      const r = K.makeRun({ N: opts.N, p: opts.p, mult2: pairs ? 1 : 0, flat: !pairs, seed: seed });
      const ee = K.eventErr(r);
      return { v: pairs ? r.R : r.S, R: r.R, K: r.K, evRel: ee.mean ? ee.err / ee.mean : 0 };
    }
    function batch() {
      S.batch++;
      const out = [];
      for (let i = 0; i < opts.reps; i++) out.push(one(opts.seed * 1000 + S.batch * 7919 + i));
      return out;
    }
    function summary(list) {
      const n = list.length;
      if (!n) return null;
      const m = list.reduce((a, q) => a + q.v, 0) / n;
      const sd = Math.sqrt(list.reduce((a, q) => a + (q.v - m) * (q.v - m), 0) / Math.max(1, n - 1));
      const R = list.reduce((a, q) => a + q.R, 0) / n;
      const Kk = list.reduce((a, q) => a + q.K, 0) / n;
      const ev = list.reduce((a, q) => a + q.evRel, 0) / n;
      return { mean: m, sd, relSd: sd / m, rowsRule: 1 / Math.sqrt(R), eventRule: ev, meanRows: R, meanK: Kk };
    }

    let readouts = null, again = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'meas', label: 'הפיזור שנמדד בין הריצות, %', color: 'var(--accent)' },
        { key: 'rows', label: 'לפי השורש של מספר השורות, %' },
        { key: 'ev', label: 'לפי הסכומים של כל אירוע, %', color: 'var(--c-neutron)' },
      ]);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      again = U.Button(row, 'עוד ' + opts.reps + ' ריצות, זרעים חדשים', () => { S.list = batch(); S.shown = S.list.length; fit(); paint(); loop.requestRender(); }, {});
    }
    function paint() {
      if (!readouts) return;
      const done = S.ran && S.shown >= S.list.length && S.list.length;
      const s = done ? summary(S.list) : null;
      readouts.set('meas', s ? F.num(100 * s.relSd, 1) : '?');
      readouts.set('rows', s ? F.num(100 * s.rowsRule, 1) : '?');
      readouts.set('ev', s ? F.num(100 * s.eventRule, 1) : '?');
    }
    function lock(on) { opts.locked = on; if (again) again.disabled = on; }

    /* the axis is set from what the run should give, so it does not move while the repetitions arrive */
    const ref = one(opts.seed * 1000 - 1);
    function fit() {
      const s = S.list.length ? summary(S.list) : null;
      const m = s ? s.mean : ref.v;
      const w = s ? Math.max(s.sd, s.mean * s.rowsRule) : m * Math.max(ref.evRel, 1 / Math.sqrt(ref.R));
      plot.setRange({ x: [Math.max(0, m - 4.2 * w), m + 4.2 * w] });
    }
    fit();

    function render() {
      view.clear();
      const xr = plot.range.x;
      const nb = 24, dx = (xr[1] - xr[0]) / nb;
      const counts = new Array(nb).fill(0);
      const n = Math.min(S.shown, S.list.length);
      for (let i = 0; i < n; i++) {
        const b = Math.floor((S.list[i].v - xr[0]) / dx);
        if (b >= 0 && b < nb) counts[b]++;
      }
      /* room above the tallest curve for the legend: the rows rule is the narrowest, so the tallest */
      const s0 = S.list.length ? summary(S.list) : null;
      const sigN = s0 ? Math.min(s0.mean * s0.rowsRule, s0.mean * s0.eventRule) : (xr[1] - xr[0]) / 8.4;
      const expectPeak = (opts.reps * dx) / (Math.sqrt(2 * Math.PI) * Math.max(1e-9, sigN));
      plot.setRange({ y: [0, PL.niceRange(0, Math.max(6, 1.6 * Math.max(expectPeak, Math.max.apply(null, counts))))[1]] });
      plot.axes();
      K1.bars(plot, xr[0], dx, counts, { color: pairs ? 'neutron' : 'neutron', alpha: 0.5 });
      const done = S.ran && n >= S.list.length && n > 0;
      if (done) {
        const s = summary(S.list);
        const gauss = (sig) => (x) => (opts.reps * dx * Math.exp(-0.5 * ((x - s.mean) / sig) * ((x - s.mean) / sig))) / (Math.sqrt(2 * Math.PI) * sig);
        const xs = [];
        for (let i = 0; i <= 160; i++) xs.push(xr[0] + ((xr[1] - xr[0]) * i) / 160);
        plot.line(xs, gauss(s.mean * s.rowsRule), { color: 'muted', width: 2, dash: [6, 5] });
        plot.line(xs, gauss(s.mean * s.eventRule), { color: 'ink', width: 2.2 });
        plot.legend([{ label: 'השורש של מספר השורות', color: 'muted', dash: [6, 5] }, { label: 'מהסכומים של כל אירוע', color: 'ink' }], { corner: 'left' });
      }
      if (!S.ran) K1.mark(view, plot.X((xr[0] + xr[1]) / 2), plot.Y(plot.range.y[1] / 2));
      K1.clock(view, 'צעצוע: ' + F.num(n, 0) + ' ריצות של ' + F.sci(opts.N, 0) + ' אירועים');
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true;
        S.list = batch();
        S.shown = 0;
        fit(); paint(); loop.start();
        const n = S.list.length;
        return tw.run(seconds || 3.5, function (k) {
          S.shown = Math.floor(n * k + 1e-9);
          if (k >= 1) { S.shown = n; lock(false); }
          paint(); loop.requestRender();
        });
      },
      batch() { S.ran = true; S.list = batch(); S.shown = S.list.length; fit(); paint(); loop.requestRender(); return S.list.map((q) => q.v); },
      setParam(key, v) { if (key === 'locked') lock(v); else opts[key] = v; paint(); loop.requestRender(); },
      getState() {
        const s = summary(S.list) || {};
        return Object.assign({ values: S.list.map((q) => q.v), ran: S.ran, shown: S.shown }, s);
      },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
