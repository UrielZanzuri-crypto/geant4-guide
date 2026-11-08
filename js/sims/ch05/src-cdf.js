/* PHY.sims.srcCdf: drawing an energy from a table by inverting its cumulative, as SourceSpectrum does in
   analog mode. Top: the 30 J spectrum f(E) between 1.85 and 13 MeV (PHY.ch05.spec) and the histogram of the
   sampled energies, scaled to f. Bottom: the cumulative F(E) = ∫f/∫f from 0 to 1. A sample is a uniform u on
   the vertical axis, carried across to the curve and down to E. play(seconds): the first `show` samples are
   drawn as arrows, then the histogram fills to N. Before the run the histogram and the arrows are hidden.
   opts: {N, show, seed, locked}. getState(): {E: [...], N, mean, median, fracBelow3, counts, dx}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K5 = PHY.ch05;
  const E0 = 1.85, E1 = 13, NB = 34;

  PHY.sims.srcCdf = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 3000, show: 12, seed: 5, locked: true }, opts || {});
    const tab = K5.table(E0, E1);
    const top = PL.create(canvasEl, { x: [0, 13.5], y: [0, 8], rect: { x: 0, y: 0, w: 1, h: 0.5 }, margin: { l: 40, r: 12, t: 28, b: 26 }, yLabel: 'f(E)', yUnit: '10¹¹/MeV/sr', yColor: 'proton', aspect: 1.0, minHeight: 400, maxHeight: 560 });
    const view = top.view;
    const bot = PL.panel(view, { x: [0, 13.5], y: [0, 1], rect: { x: 0, y: 0.5, w: 1, h: 0.5 }, margin: { l: 40, r: 12, t: 26, b: 36 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'F(E): החלק מתחת ל-E' });
    const tw = PHY.tweens();
    const S = { u: [], E: [], shown: 0, ran: false, seed: opts.seed, arrow: 0 };

    function draw(seed) {
      const r = PHY.random(seed);
      S.u = []; S.E = [];
      for (let i = 0; i < opts.N; i++) { const u = r.next(); S.u.push(u); S.E.push(K5.sampleAnalog(tab, u)); }
    }
    let readouts = null, again = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'n', label: 'דגימות' },
        { key: 'lo', label: 'מתחת ל-3 MeV', color: 'var(--c-proton)' },
        { key: 'mean', label: 'האנרגיה הממוצעת (MeV)', color: 'var(--c-proton)' },
      ]);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      again = U.Button(row, 'דגימות חדשות', () => { S.seed += 31; draw(S.seed); S.shown = opts.N; S.ran = true; S.arrow = 0; paint(); loop.requestRender(); }, {});
      U.renderMath(controlsEl);
    }
    function stats(n) {
      let s = 0, lo = 0;
      for (let i = 0; i < n; i++) { s += S.E[i]; if (S.E[i] < 3) lo++; }
      return { mean: n ? s / n : NaN, lo: n ? lo / n : NaN };
    }
    function paint() {
      if (!readouts) return;
      const st = stats(S.shown);
      readouts.set('n', S.ran ? F.num(S.shown, 0) : '?');
      readouts.set('lo', S.ran && S.shown > opts.show ? F.unit(100 * st.lo, '%', 0) : '?');
      readouts.set('mean', S.ran && S.shown >= opts.N ? F.num(st.mean, 2) : '?');
    }
    function render() {
      view.clear();
      top.axes(); bot.axes();
      const xs = [], fs = [], cs = [];
      for (let i = 0; i <= tab.n; i += 6) { xs.push(tab.E[i]); fs.push(tab.f[i] / 1e11); cs.push(tab.cdf[i] / tab.I); }
      if (S.ran && S.shown > opts.show) {
        const h = K.hist(S.E, S.shown, E0, E1, NB);
        const scale = tab.I / (S.shown * h.dx) / 1e11;
        K.bars(top, E0, h.dx, h.counts.map((c) => c * scale), { color: 'proton', alpha: 0.35 });
      }
      top.line(xs, fs, { color: 'proton', width: 2.4 });
      bot.line(xs, cs, { color: 'ink', width: 2.4 });
      /* the arrows of the first samples */
      const nA = S.ran ? Math.min(S.shown, opts.show) : 0;
      for (let i = 0; i < nA; i++) {
        const u = S.u[i], E = S.E[i];
        const last = i === nA - 1 && S.shown <= opts.show;
        const al = last ? 1 : 0.35;
        bot.line([0, E], [u, u], { color: 'accent', width: last ? 2 : 1.2, alpha: al });
        bot.line([E, E], [u, 0], { color: 'proton', width: last ? 2 : 1.2, alpha: al, dash: [4, 3] });
        bot.marker(0, u, { color: 'accent', r: last ? 4.5 : 3, shape: 'dot' });
        bot.marker(E, 0, { color: 'proton', r: last ? 4.5 : 3, shape: 'dot' });
      }
      if (!S.ran) K.mark(view, top.X(7), top.Y(4));
      K.clock(view, 'הספקטרום של ' + F.ltr('30 J, M² = 2.5'));
    }
    function lock(on) { opts.locked = on; if (again) again.disabled = on; }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const T = seconds || 4;
        draw(S.seed);
        S.ran = true; S.shown = 0;
        paint(); loop.start();
        return tw.run(0.55 * T, (k) => { S.shown = Math.min(opts.show, Math.floor(k * opts.show) + 1); paint(); loop.requestRender(); })
          .then(() => tw.run(0.45 * T, (k) => { S.shown = Math.max(opts.show, Math.floor(k * opts.N)); if (k >= 1) { S.shown = opts.N; lock(false); } paint(); loop.requestRender(); }));
      },
      setParam(k, v) { if (k === 'locked') lock(v); else opts[k] = v; loop.requestRender(); },
      getState() {
        const st = stats(S.shown);
        const sorted = S.E.slice(0, S.shown).sort((a, b) => a - b);
        const h = K.hist(S.E, S.shown, E0, E1, NB);
        return { E: S.E.slice(0, S.shown), u: S.u.slice(0, S.shown), N: S.shown, mean: st.mean, fracBelow3: st.lo, median: sorted[Math.floor(sorted.length / 2)], counts: h.counts, dx: h.dx, tab };
      },
    };
    draw(S.seed);
    lock(opts.locked);
    paint();
    return api;
  };
})();
