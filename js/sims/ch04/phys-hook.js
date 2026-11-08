/* PHY.sims.physHook: the same LiF converter and the same 5 MeV protons under two physics lists. Each lane
   sends N protons (2×10⁴, as in the project's benchmark table) into LiF; a proton makes a neutron with the
   probability the list gives: QGSP_BIC_HP 0, QGSP_BIC_AllHP 5.0×10⁻⁴ (the benchmark values). The counts are
   binomial draws (PHY.ch01.binomial), so the AllHP lane shows about 10 neutrons ± √10.
   After the run a lower panel draws what each list uses for the cross section of ⁷Li(p,n): the evaluated
   data (schematic shape, real threshold 1.88 MeV) and a cascade-like curve 30 times lower (schematic).
   Before the run the counters and the lower panel are hidden ("?").
   opts: {N, pAll, pBic, E, seed, locked}. getState(): {N, shown, kAll, kBic, yAll, eAll, ran, done}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;

  PHY.sims.physHook = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 20000, pAll: 5.0e-4, pBic: 0, E: 5, seed: 682, locked: true }, opts || {});
    const top = PL.create(canvasEl, { x: [0, 10], y: [0, 6.4], grid: false, rect: { x: 0, y: 0, w: 1, h: 0.56 }, margin: { l: 10, r: 10, t: 30, b: 4 }, aspect: 1.1, minHeight: 360, maxHeight: 520 });
    const view = top.view;
    const bot = PL.panel(view, { x: [0, 10], y: [0, 0.6], rect: { x: 0, y: 0.56, w: 1, h: 0.44 }, margin: { l: 40, r: 12, t: 26, b: 34 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'σ של ' + F.ltr('⁷Li(p,n)') + ' (סכמטי)' });
    const tw = PHY.tweens();
    const rng = PHY.random(opts.seed);
    const S = { shown: 0, ran: false, done: false, kAll: 0, kBic: 0, idxAll: [], idxBic: [], seen: 0, dirs: [] };

    function draw() {
      S.kAll = K.binomial(opts.N, opts.pAll, rng.next);
      S.kBic = K.binomial(opts.N, opts.pBic, rng.next);
      const pick = (k) => { const a = []; for (let i = 0; i < k; i++) a.push(Math.floor(rng.next() * opts.N)); return a.sort((x, y) => x - y); };
      S.idxAll = pick(S.kAll); S.idxBic = pick(S.kBic);
      S.dirs = [];
      for (let i = 0; i < 40; i++) S.dirs.push({ a: rng.next() * Math.PI * 2, x: 4.6 + 0.9 * rng.next(), y: (rng.next() - 0.5) * 1.3 });
    }

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'bic', label: 'נייטרונים ב-<bdi>QGSP_BIC_HP</bdi>', color: 'var(--c-neutron)' },
        { key: 'all', label: 'נייטרונים ב-<bdi>QGSP_BIC_AllHP</bdi>', color: 'var(--c-neutron)' },
        { key: 'y', label: 'לפרוטון ב-<bdi>AllHP</bdi>, ביחידות של \\(10^{-4}\\)' },
      ]);
      U.renderMath(controlsEl);
    }
    const count = (idx) => { let c = 0; while (c < idx.length && idx[c] < S.shown) c++; return c; };
    function paint() {
      if (!readouts) return;
      readouts.set('bic', S.ran ? F.num(count(S.idxBic), 0) : '?');
      readouts.set('all', S.ran ? F.num(count(S.idxAll), 0) : '?');
      readouts.set('y', S.done ? F.ltr(F.num((1e4 * S.kAll) / opts.N, 1) + ' ± ' + F.num((1e4 * Math.sqrt(S.kAll)) / opts.N, 1)) : '?');
    }

    function lane(y0, name, idx, k) {
      const ctx = view.ctx;
      const X = top.X, Y = top.Y;
      /* the LiF block */
      ctx.save();
      ctx.fillStyle = C.volume; ctx.globalAlpha = 0.08;
      ctx.fillRect(X(4.5), Y(y0 + 1), X(9.6) - X(4.5), Y(y0 - 1) - Y(y0 + 1));
      ctx.globalAlpha = 1; ctx.strokeStyle = C.volume; ctx.lineWidth = 2;
      ctx.strokeRect(X(4.5), Y(y0 + 1), X(9.6) - X(4.5), Y(y0 - 1) - Y(y0 + 1));
      ctx.restore();
      view.screenText(X(9.5), Y(y0 - 1) - 10, 'LiF', { size: 11.5, weight: 700, color: C.volume, align: 'right' });
      view.screenText(X(0.15), Y(y0 + 1.33), name, { size: 12, weight: 700, color: C.ink, align: 'left' });
      /* the last protons: red tracks that stop near the entrance (the range of 5 MeV protons is short) */
      const n = S.shown;
      const r = PHY.random(7 + Math.floor(n / 37));
      for (let i = 0; i < Math.min(14, n); i++) {
        const yy = y0 + (r.next() - 0.5) * 1.5;
        const stop = 4.75 + 0.35 * r.next();
        view.ctx.save(); view.ctx.globalAlpha = 0.35 + 0.65 * (i / 14);
        top.line([0.3, stop], [yy, yy + (r.next() - 0.5) * 0.08], { color: 'proton', width: 1.4 });
        view.ctx.restore();
      }
      /* neutrons born so far */
      const shownK = count(idx);
      for (let i = 0; i < shownK; i++) {
        const d = S.dirs[i % S.dirs.length];
        const x = d.x, yy = y0 + d.y * 0.9;
        top.line([x, x + 0.75 * Math.cos(d.a)], [yy, yy + 0.75 * Math.sin(d.a)], { color: 'neutron', width: 1.6 });
        top.marker(x, yy, { color: 'neutron', r: 3.2, shape: 'dot' });
      }
      const txt = S.ran ? 'נייטרונים: ' + F.num(shownK, 0) : 'נייטרונים: ?';
      view.screenText(X(9.6), Y(y0 + 1.33), txt, { size: 12, weight: 700, color: C.neutron, align: 'right', halo: true });
      void k;
    }

    function render() {
      view.clear();
      lane(4.45, 'QGSP_BIC_HP', S.idxBic, S.kBic);
      lane(1.35, 'QGSP_BIC_AllHP', S.idxAll, S.kAll);
      K.clock(view, F.ltr(F.num(opts.E, 0) + ' MeV') + ' · פרוטונים: ' + F.ltr(F.num(S.shown, 0)));
      bot.axes();
      if (S.done) {
        const xs = [], ev = [], cs = [];
        for (let i = 0; i <= 300; i++) { const E = (10 * i) / 300; xs.push(E); ev.push(K4.sigma('Li7', E)); cs.push(K4.sigma('Li7', E) / 30); }
        bot.fill(xs, ev, { color: 'neutron', alpha: 0.12 });
        bot.line(xs, ev, { color: 'ink', width: 2.2 });
        bot.line(xs, cs, { color: 'muted', width: 2.2, dash: [6, 4] });
        bot.vline(1.88, { color: 'muted', dash: [3, 4], label: F.ltr('1.88 MeV'), labelAt: 'top' });
        bot.vline(opts.E, { color: 'proton', dash: [5, 4] });
        bot.legend([{ label: 'נתונים מוערכים (AllHP)', color: 'ink' }, { label: 'מודל קסקדה, סכמטי', color: 'muted', dash: [6, 4] }], { corner: 'right' });
      } else {
        K.mark(view, bot.X(5), bot.Y(0.3));
      }
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.done = false; S.shown = 0;
        draw();
        paint(); loop.start();
        return tw.run(seconds || 3.5, function (k) {
          S.shown = Math.floor(opts.N * k);
          if (k >= 1) { S.shown = opts.N; S.done = true; }
          paint(); loop.requestRender();
        });
      },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() {
        return { N: opts.N, shown: S.shown, kAll: S.kAll, kBic: S.kBic, yAll: S.kAll / opts.N, eAll: Math.sqrt(S.kAll) / opts.N, ran: S.ran, done: S.done };
      },
    };
    paint();
    return api;
  };
})();
