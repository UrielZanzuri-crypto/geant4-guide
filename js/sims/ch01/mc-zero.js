/* PHY.sims.mcZero: zero counts is not zero yield. Top panel: 30 runs of 10⁶ protons on a toy converter whose
   true yield is 10⁻⁶ per proton (expected count μ = 1), counts drawn with PHY.ch01.binomial; the runs that
   counted 0 are ringed. Bottom panel: the chance of counting 0 when the expected count is μ, P(0) = e^{−μ}
   (Poisson), with the 5 % line; it is crossed at μ = ln 20 ≈ 3.0, so 0 counts in N events means a yield
   below 3/N at 95 % confidence. play(seconds) shows the runs, then draws the curve; before it both panels are
   empty and the readouts show "?". simulate(n) adds n runs without drawing (tests).
   opts: {N, p, runs, seed, locked}. getState(): {counts, zeros, fracZero, mu, mu95, n}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01;
  const MU95 = Math.log(20);

  PHY.sims.mcZero = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 1e6, p: 1e-6, runs: 30, seed: 17, locked: true }, opts || {});
    const mu = opts.N * opts.p;
    const top = PL.create(canvasEl, { x: [0, opts.runs + 1], y: [0, 5], rect: { x: 0, y: 0, w: 1, h: 0.46 }, xLabel: 'ריצה', yLabel: 'נייטרונים בריצה', yColor: 'neutron', aspect: 1.05, minHeight: 330, maxHeight: 520 });
    const view = top.view;
    const bot = PL.panel(view, { x: [0, 6], y: [0, 1], rect: { x: 0, y: 0.5, w: 1, h: 0.5 }, xLabel: 'התוחלת μ', yLabel: 'הסיכוי לספור 0' });
    const tw = PHY.tweens();
    const rng = PHY.random(opts.seed).next;
    const S = { counts: [], extra: [], shown: 0, curve: 0, ran: false };

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'z', label: 'ריצות עם 0 נייטרונים' },
        { key: 'p0', label: 'הסיכוי לאפס כש-μ = 1' },
        { key: 'lim', label: 'הגבול העליון ב-95%', color: 'var(--c-neutron)' },
      ]);
    }
    function paint() {
      if (!readouts) return;
      const n = Math.min(S.shown, S.counts.length);
      const z = S.counts.slice(0, n).filter((c) => c === 0).length;
      readouts.set('z', S.ran && n >= opts.runs ? F.num(z, 0) + ' מתוך ' + F.num(n, 0) : '?');
      readouts.set('p0', S.curve >= 1 ? F.unit(100 * Math.exp(-1), '%', 0) : '?');
      readouts.set('lim', S.curve >= 1 ? F.ltr('μ < ' + F.num(MU95, 1) + ', p < ' + F.sci(MU95 / opts.N, 1)) : '?');
    }

    function render() {
      view.clear();
      top.axes();
      const n = Math.min(S.shown, S.counts.length);
      for (let i = 0; i < n; i++) {
        const c = S.counts[i];
        top.marker(i + 1, c, { color: c === 0 ? 'ink' : 'neutron', r: c === 0 ? 5 : 4, shape: c === 0 ? 'ring' : 'dot' });
      }
      if (!S.ran) K.mark(view, top.X(opts.runs / 2), top.Y(2.5));
      bot.axes();
      if (S.curve > 0) {
        const xs = [], ys = [];
        const xe = 6 * S.curve;
        for (let i = 0; i <= 120; i++) { const x = (xe * i) / 120; xs.push(x); ys.push(Math.exp(-x)); }
        bot.line(xs, ys, { color: 'ink', width: 2.2 });
        bot.hline(0.05, { color: 'muted', dash: [5, 4], label: '5 %' });
        if (S.curve >= 1) {
          bot.vline(MU95, { color: 'neutron', dash: [4, 3], label: F.ltr('μ = ' + F.num(MU95, 2)), labelAt: 'top' });
          bot.marker(MU95, 0.05, { color: 'neutron', r: 5, shape: 'dot' });
          bot.marker(1, Math.exp(-1), { color: 'ink', r: 4, shape: 'ring', label: F.ltr('μ = 1: ' + F.num(100 * Math.exp(-1), 0) + ' %') });
        }
      } else if (!S.ran) {
        K.mark(view, bot.X(3), bot.Y(0.5));
      }
      /* the toy's true yield would hint at the answer, so it shows only after the run */
      if (S.ran) K.clock(view, 'צעצוע: ' + F.ltr('μ = ' + F.num(mu, 0)) + ' בריצה');
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const T = seconds || 4;
        S.ran = true; S.counts = [];
        for (let i = 0; i < opts.runs; i++) S.counts.push(K.binomial(opts.N, opts.p, rng));
        S.shown = 0; S.curve = 0;
        paint(); loop.start();
        return tw.run(0.55 * T, (k) => { S.shown = Math.floor(opts.runs * k + 1e-9); if (k >= 1) S.shown = opts.runs; paint(); loop.requestRender(); })
          .then(() => tw.run(0.45 * T, (k) => { S.curve = k; paint(); loop.requestRender(); }));
      },
      simulate(n) { const out = []; for (let i = 0; i < n; i++) out.push(K.binomial(opts.N, opts.p, rng)); S.extra = S.extra.concat(out); return out; },
      setParam(key, v) { opts[key] = v; loop.requestRender(); },
      getState() {
        const all = S.counts.concat(S.extra);
        const z = all.filter((c) => c === 0).length;
        return { counts: all, zeros: z, n: all.length, fracZero: all.length ? z / all.length : 0, mu, mu95: MU95, p0At: (m) => Math.exp(-m) };
      },
    };
    paint();
    return api;
  };
})();
