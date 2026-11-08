/* PHY.sims.mcCompare: two numbers without error bars. Pair 0 is the one the question gives (A = 460 and
   B = 440 neutrons from 10⁶ protons each). play(seconds) first adds the error bars ±√count to it, then runs
   12 pairs in which A and B are the SAME converter (true yield p, binomial counts from PHY.ch01), and counts
   how often A comes out above B. Before the run the given pair has no error bars and the readouts show "?".
   simulate(n) runs n more pairs without drawing (tests). opts: {N, p, A, B, pairs, seed, locked}.
   getState(): {pairs: [[a, b], ...] (the given pair first), aWins (among the simulated), sdDiff, errA, errB}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01;

  PHY.sims.mcCompare = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 1e6, p: 4.5e-4, A: 460, B: 440, pairs: 12, seed: 21, locked: true }, opts || {});
    const mu = opts.N * opts.p;
    const plot = PL.create(canvasEl, { x: [-0.8, opts.pairs + 0.8], y: [Math.round(mu - 110), Math.round(mu + 110)], xLabel: 'זוג ריצות', yLabel: 'נייטרונים', yColor: 'neutron', aspect: 1.6, minHeight: 250, maxHeight: 400 });
    const view = plot.view;
    const tw = PHY.tweens();
    const rng = PHY.random(opts.seed).next;
    const S = { sim: [], extra: [], shown: 0, bars: 0, ran: false };

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'err', label: 'השגיאה של כל מספר' },
        { key: 'wins', label: 'A מעל B בזוגות החדשים' },
      ]);
    }
    function paint() {
      if (!readouts) return;
      readouts.set('err', S.bars >= 1 ? F.ltr('±' + F.num(Math.sqrt(opts.A), 0)) : '?');
      const n = Math.min(S.shown, S.sim.length);
      const w = S.sim.slice(0, n).filter((q) => q[0] > q[1]).length;
      readouts.set('wins', S.ran && n >= S.sim.length ? F.num(w, 0) + ' מתוך ' + F.num(n, 0) : '?');
    }

    function render() {
      view.clear();
      plot.axes();
      const drawPair = function (x, a, b, bars, big) {
        const pts = [[x - 0.17, a, 'accent', 'A'], [x + 0.17, b, 'ink', 'B']];
        pts.forEach(function (q) {
          if (bars > 0) {
            const e = Math.sqrt(q[1]) * bars, ctx = view.ctx;
            ctx.save(); ctx.strokeStyle = C[q[2]]; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(plot.X(q[0]), plot.Y(q[1] - e)); ctx.lineTo(plot.X(q[0]), plot.Y(q[1] + e)); ctx.stroke();
            ctx.restore();
          }
          plot.marker(q[0], q[1], { color: q[2], r: big ? 5.5 : 4, shape: 'dot' });
          if (big) view.screenText(plot.X(q[0]) + (q[3] === 'A' ? -11 : 11), plot.Y(q[1]) + (q[3] === 'A' ? -13 : 13), q[3], { size: 12, weight: 800, color: C[q[2]], halo: true });
        });
      };
      drawPair(0, opts.A, opts.B, S.bars, true);
      const n = Math.min(S.shown, S.sim.length);
      for (let i = 0; i < n; i++) drawPair(i + 1, S.sim[i][0], S.sim[i][1], 1, false);
      const fin = S.ran && n >= S.sim.length;
      if (fin) plot.hline(mu, { color: 'muted', dash: [5, 5] });
      if (!S.ran) K.mark(view, plot.X(opts.pairs / 2 + 0.5), plot.Y(mu));
      plot.legend([{ label: 'A', color: 'accent' }, { label: 'B', color: 'ink' }].concat(fin ? [{ label: 'שניהם אותו ממיר', color: 'muted', dash: [5, 5] }] : []), { corner: 'right' });
    }

    const pair = () => [K.binomial(opts.N, opts.p, rng), K.binomial(opts.N, opts.p, rng)];
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const T = seconds || 4;
        S.ran = true;
        S.sim = []; for (let i = 0; i < opts.pairs; i++) S.sim.push(pair());
        S.shown = 0; S.bars = 0;
        paint(); loop.start();
        return tw.run(0.25 * T, (k) => { S.bars = k; if (k >= 1) paint(); loop.requestRender(); })
          .then(() => tw.run(0.75 * T, (k) => { S.shown = Math.floor(opts.pairs * k + 1e-9); if (k >= 1) S.shown = opts.pairs; paint(); loop.requestRender(); }));
      },
      simulate(n) { const out = []; for (let i = 0; i < n; i++) out.push(pair()); S.extra = S.extra.concat(out); return out; },
      setParam(key, v) { opts[key] = v; loop.requestRender(); },
      getState() {
        const all = S.sim.concat(S.extra);
        const d = all.map((q) => q[0] - q[1]);
        const m = d.reduce((a, b) => a + b, 0) / (d.length || 1);
        const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, d.length - 1));
        return { pairs: [[opts.A, opts.B]].concat(all), aWins: all.filter((q) => q[0] > q[1]).length, ties: all.filter((q) => q[0] === q[1]).length, n: all.length, sdDiff: sd, errA: Math.sqrt(opts.A), errB: Math.sqrt(opts.B), mu };
      },
    };
    paint();
    return api;
  };
})();
