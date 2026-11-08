/* PHY.sims.srcWeights: flat sampling with weights, as SourceSpectrum does with /ldns/src/sampling flat.
   E is uniform between 1.85 and 13 MeV and every proton gets w = f(E)(Emax − Emin)/∫f (PHY.ch05.weightFlat).
   Top: the histogram of the fired energies (flat) and the weight w(E) (right axis). Bottom: the same
   protons histogrammed with their weights, scaled to f, on top of f(E): the weighted histogram is the
   spectrum. Readouts: the mean weight of the fired protons ± its error, the share fired above 6 MeV, and
   the mean weight of the neutrons they make (toy yield): low, because neutrons come from the tail.
   Before the run the histograms and the readouts are hidden. opts: {N, seed, locked}.
   getState(): {N, meanW, errW, above6, meanWn, chi2, ndf}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K5 = PHY.ch05;
  const E0 = 1.85, E1 = 13, NB = 30;

  PHY.sims.srcWeights = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 20000, seed: 3, locked: true }, opts || {});
    const tab = K5.table(E0, E1);
    const top = PL.create(canvasEl, { x: [1.5, 13.5], y: [0, 1200], y2: [0, 7], rect: { x: 0, y: 0, w: 1, h: 0.48 }, margin: { l: 44, r: 36, t: 28, b: 26 }, yLabel: 'פרוטונים בתא', yColor: 'proton', y2Color: 'ink', aspect: 1.0, minHeight: 400, maxHeight: 560 });
    const view = top.view;
    const bot = PL.panel(view, { x: [1.5, 13.5], y: [0, 8], rect: { x: 0, y: 0.48, w: 1, h: 0.52 }, margin: { l: 44, r: 36, t: 26, b: 36 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'עם המשקל', yUnit: '10¹¹/MeV/sr', yColor: 'proton' });
    const tw = PHY.tweens();
    const S = { E: [], w: [], shown: 0, ran: false, seed: opts.seed };

    function draw(seed) {
      const r = PHY.random(seed);
      S.E = []; S.w = [];
      for (let i = 0; i < opts.N; i++) { const E = E0 + r.next() * (E1 - E0); S.E.push(E); S.w.push(K5.weightFlat(tab, E)); }
    }
    function measure(n) {
      let s = 0, s2 = 0, a6 = 0, yw = 0, y = 0;
      const cw = new Array(NB).fill(0), cw2 = new Array(NB).fill(0), cn = new Array(NB).fill(0);
      const dx = (E1 - E0) / NB;
      for (let i = 0; i < n; i++) {
        const E = S.E[i], w = S.w[i];
        s += w; s2 += w * w; if (E > 6) a6++;
        const Y = K5.yieldAt(E); yw += w * Y; y += Y;
        const j = Math.min(NB - 1, Math.floor((E - E0) / dx));
        cw[j] += w; cw2[j] += w * w; cn[j]++;
      }
      const me = K.meanErr(s, s2, n);
      let chi2 = 0;
      for (let j = 0; j < NB; j++) {
        const exp = (n * K5.integ((E) => K5.spec(E), E0 + j * dx, E0 + (j + 1) * dx, 12)) / tab.I;
        if (cw2[j] > 0) chi2 += ((cw[j] - exp) * (cw[j] - exp)) / cw2[j];
      }
      return { meanW: me.mean, errW: me.err, above6: n ? a6 / n : NaN, meanWn: y ? yw / y : NaN, cw, cn, dx, chi2, ndf: NB };
    }

    let readouts = null, again = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'w', label: 'המשקל הממוצע של הפרוטונים' },
        { key: 'a', label: 'נורו מעל 6 MeV', color: 'var(--c-proton)' },
        { key: 'n', label: 'המשקל הממוצע של הנייטרונים (צעצוע)', color: 'var(--c-neutron)' },
      ]);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      again = U.Button(row, 'פרוטונים חדשים', () => { S.seed += 19; draw(S.seed); S.shown = opts.N; S.ran = true; paint(); loop.requestRender(); }, {});
    }
    function paint() {
      if (!readouts) return;
      const done = S.ran && S.shown >= opts.N;
      const m = measure(S.shown);
      readouts.set('w', done ? F.ltr(F.num(m.meanW, 3) + ' ± ' + F.num(m.errW, 3)) : '?');
      readouts.set('a', done ? F.unit(100 * m.above6, '%', 0) : '?');
      readouts.set('n', done ? F.num(m.meanWn, 2) : '?');
    }
    function render() {
      view.clear();
      top.axes(); bot.axes();
      const xs = [], ws = [], fs = [];
      for (let i = 0; i <= tab.n; i += 6) { xs.push(tab.E[i]); ws.push(K5.weightFlat(tab, tab.E[i])); fs.push(tab.f[i] / 1e11); }
      if (S.ran) {
        const m = measure(S.shown);
        top.setRange({ y: [0, PL.niceRange(0, Math.max(10, (1.5 * opts.N) / NB))[1]] });
        K.bars(top, E0, m.dx, m.cn, { color: 'proton', alpha: 0.4 });
        if (S.shown) K.bars(bot, E0, m.dx, m.cw.map((c) => (c * tab.I) / (S.shown * m.dx) / 1e11), { color: 'proton', alpha: 0.4 });
        top.line(xs, ws, { color: 'ink', width: 2, axis: 'y2', dash: [6, 4] });
        top.hline(1, { color: 'muted', dash: [3, 4], axis: 'y2' });
        top.text(3.0, K5.weightFlat(tab, 3.0), 'w(E)', { color: 'ink', size: 12, weight: 700, align: 'left', axis: 'y2', offset: [8, 0] });
      } else {
        K.mark(view, top.X(7.5), top.Y(top.range.y[1] / 2));
      }
      bot.line(xs, fs, { color: 'proton', width: 2.4 });
      K.clock(view, F.ltr('flat') + ', ' + F.ltr(F.num(S.ran ? S.shown : 0, 0)) + ' פרוטונים');
    }
    function lock(on) { opts.locked = on; if (again) again.disabled = on; }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        draw(S.seed); S.ran = true; S.shown = 0;
        paint(); loop.start();
        return tw.run(seconds || 3.5, function (k) {
          S.shown = Math.floor(opts.N * k);
          if (k >= 1) { S.shown = opts.N; lock(false); }
          paint(); loop.requestRender();
        });
      },
      setParam(k, v) { if (k === 'locked') lock(v); else { opts[k] = v; draw(S.seed); S.shown = opts.N; S.ran = true; } paint(); loop.requestRender(); },
      getState() { const m = measure(S.shown); return { N: S.shown, meanW: m.meanW, errW: m.errW, above6: m.above6, meanWn: m.meanWn, chi2: m.chi2, ndf: m.ndf }; },
    };
    draw(S.seed);
    lock(opts.locked);
    paint();
    return api;
  };
})();
