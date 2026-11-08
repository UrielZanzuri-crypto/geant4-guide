/* Chapter 5 traps, four small sims.
   PHY.sims.srcRuns: flat sampling does not change the answer. R toy runs of N protons each (PHY.ch05.toyRun),
     analog and flat from 1.85 MeV, neutrons per proton with error bars, and after the run the true value
     4.47×10⁻⁴. Readouts: the mean of the runs and the spread between them, per mode.
     opts: {R, N, seed, locked}. getState(): {analog: [...], flat: [...], meanA, meanF, sdA, sdF, truth}.
   PHY.sims.srcTheta: isotropic directions inside a 20° cone have dN/dθ ∝ sin θ. Histogram of θ for N
     directions with cos θ uniform, the line of θ uniform for comparison, and the share inside 10°.
     opts: {N, deg, inner, seed, locked}. getState(): {share, shareTheory, counts}.
   PHY.sims.srcCut: protons below 1.85 MeV make no neutrons. The spectrum from 0.5 MeV (log), the part
     below 1.85 MeV shaded, the thresholds 1.88 and 2.06 MeV, and the toy yield Y(E). Readouts: the share
     of the protons below 1.85 MeV and the neutrons they make. opts: {locked}. getState(): {shareBelow, yieldBelow}.
   PHY.sims.srcPerShot: N_shot is not in the file alone. Three bars: 1.85-13 MeV in 20°, 0.5-13 MeV in 20°,
     1.85-13 MeV in 10°. opts: {locked}. getState(): {bars: [{label, nShot}], stage}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K5 = PHY.ch05;

  /* ---------- srcRuns ---------- */
  PHY.sims.srcRuns = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ R: 12, N: 2e5, seed: 99, locked: true }, opts || {});
    const P = PL.create(canvasEl, { x: [-0.5, opts.R + 0.5], y: [2.5, 7.5], margin: { l: 40, r: 12, t: 30, b: 36 }, xLabel: 'ריצה', yLabel: 'לפרוטון, ב-' + F.ltr('10⁻⁴'), yColor: 'neutron', aspect: 1.5, minHeight: 260, maxHeight: 400 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { a: [], f: [], shown: 0, ran: false };
    const truth = 4.47e-4;
    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'a', label: '<bdi>analog</bdi>: ממוצע ± פיזור' },
        { key: 'f', label: '<bdi>flat</bdi>: ממוצע ± פיזור' },
      ]);
    }
    const stat = (L) => { const n = L.length; if (!n) return { m: NaN, sd: NaN }; const m = L.reduce((s, q) => s + q.mean, 0) / n; const v = L.reduce((s, q) => s + (q.mean - m) * (q.mean - m), 0) / Math.max(1, n - 1); return { m, sd: Math.sqrt(v) }; };
    function paint() {
      if (!readouts) return;
      const done = S.ran && S.shown >= opts.R;
      const a = stat(S.a), f = stat(S.f);
      readouts.set('a', done ? F.ltr(F.num(a.m * 1e4, 2) + ' ± ' + F.num(a.sd * 1e4, 2)) : '?');
      readouts.set('f', done ? F.ltr(F.num(f.m * 1e4, 2) + ' ± ' + F.num(f.sd * 1e4, 2)) : '?');
    }
    function render() {
      view.clear(); P.axes();
      const ctx = view.ctx;
      const dot = (x, q, color) => {
        const y = q.mean * 1e4, e = q.err * 1e4;
        ctx.save(); ctx.strokeStyle = C[color]; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(P.X(x), P.Y(y - e)); ctx.lineTo(P.X(x), P.Y(y + e)); ctx.stroke(); ctx.restore();
        P.marker(x, y, { color, r: 3.6, shape: 'dot' });
      };
      for (let i = 0; i < Math.min(S.shown, opts.R); i++) { dot(i + 0.82, S.a[i], 'muted'); dot(i + 1.18, S.f[i], 'neutron'); }
      const done = S.ran && S.shown >= opts.R;
      if (done) P.hline(truth * 1e4, { color: 'ink', dash: [6, 4] });
      P.legend([{ label: 'analog', color: 'muted' }, { label: 'flat', color: 'neutron' }].concat(done ? [{ label: 'הנכון', color: 'ink', dash: [6, 4] }] : []), { corner: 'right' });
      if (!S.ran) K.mark(view, P.X(opts.R / 2), P.Y(4.5));
      K.clock(view, F.ltr(F.sci(opts.N, 0)) + ' פרוטונים בכל ריצה');
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start, stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const r = PHY.random(opts.seed).next;
        S.a = []; S.f = [];
        for (let i = 0; i < opts.R; i++) { S.a.push(K5.toyRun('analog', opts.N, r)); S.f.push(K5.toyRun('flat', opts.N, r)); }
        S.ran = true; S.shown = 0; paint(); loop.start();
        return tw.run(seconds || 3.5, function (k) { S.shown = Math.floor(k * opts.R + 1e-9); if (k >= 1) S.shown = opts.R; paint(); loop.requestRender(); });
      },
      simulate(R) { const r = PHY.random(opts.seed + 1).next; const a = [], f = []; for (let i = 0; i < R; i++) { a.push(K5.toyRun('analog', opts.N, r)); f.push(K5.toyRun('flat', opts.N, r)); } return { a, f }; },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { const a = stat(S.a), f = stat(S.f); return { analog: S.a, flat: S.f, meanA: a.m, meanF: f.m, sdA: a.sd, sdF: f.sd, truth }; },
    };
    paint();
    return api;
  };

  /* ---------- srcTheta ---------- */
  PHY.sims.srcTheta = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 20000, deg: 20, inner: 10, seed: 4, locked: true }, opts || {});
    const NB = 20;
    const P = PL.create(canvasEl, { x: [0, opts.deg], y: [0, 2000], margin: { l: 44, r: 12, t: 30, b: 36 }, xLabel: 'θ', xUnit: 'deg', yLabel: 'כיוונים בתא', yColor: 'proton', aspect: 1.5, minHeight: 250, maxHeight: 380 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { th: [], shown: 0, ran: false };
    (function () { const r = PHY.random(opts.seed); for (let i = 0; i < opts.N; i++) S.th.push((Math.acos(K5.cosUniform(r.next(), opts.deg)) * 180) / Math.PI); })();
    const theory = (1 - Math.cos((opts.inner * Math.PI) / 180)) / (1 - Math.cos((opts.deg * Math.PI) / 180));
    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 's', label: 'בתוך ' + F.deg(opts.inner) + ', נספר', color: 'var(--c-proton)' },
        { key: 't', label: 'לפי הנוסחה' },
      ]);
      U.renderMath(controlsEl);
    }
    const share = (n) => { let k = 0; for (let i = 0; i < n; i++) if (S.th[i] < opts.inner) k++; return n ? k / n : NaN; };
    function paint() {
      if (!readouts) return;
      const done = S.ran && S.shown >= opts.N;
      readouts.set('s', done ? F.unit(100 * share(opts.N), '%', 1) : '?');
      readouts.set('t', done ? F.unit(100 * theory, '%', 1) : '?');
    }
    function render() {
      view.clear(); P.axes();
      const h = K.hist(S.th, S.ran ? S.shown : 0, 0, opts.deg, NB);
      P.setRange({ y: [0, PL.niceRange(0, (2.2 * opts.N) / NB)[1]] });
      K.bars(P, 0, h.dx, h.counts, { color: 'proton', alpha: 0.45 });
      if (S.ran && S.shown >= opts.N) {
        P.line([0, opts.deg], [opts.N / NB, opts.N / NB], { color: 'ink', width: 2, dash: [6, 4] });
        P.vline(opts.inner, { color: 'accent', dash: [4, 3], label: F.deg(opts.inner), labelAt: 'top' });
        P.legend([{ label: F.ltr('θ') + ' אחיד', color: 'ink', dash: [6, 4] }], { corner: 'left' });
      }
      if (!S.ran) K.mark(view, P.X(opts.deg / 2), P.Y(P.range.y[1] / 2));
      K.clock(view, F.ltr('cos θ') + ' אחיד בקונוס של ' + F.deg(opts.deg));
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start, stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) { tw.clear(); S.ran = true; S.shown = 0; paint(); loop.start(); return tw.run(seconds || 3, function (k) { S.shown = Math.floor(opts.N * k); if (k >= 1) S.shown = opts.N; paint(); loop.requestRender(); }); },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { const h = K.hist(S.th, opts.N, 0, opts.deg, NB); return { share: share(opts.N), shareTheory: theory, counts: h.counts, dx: h.dx }; },
    };
    paint();
    return api;
  };

  /* ---------- srcCut ---------- */
  PHY.sims.srcCut = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const P = PL.create(canvasEl, { x: [0, 13.5], y: [9, 13.4], y2: [0, 8.8], margin: { l: 40, r: 30, t: 30, b: 36 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'log₁₀ f', yColor: 'proton', y2Color: 'neutron', aspect: 1.45, minHeight: 260, maxHeight: 400 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { k: 0, ran: false };
    const shareBelow = 1 - K5.nShot(1.85, 13, 20) / K5.nShot(0.5, 13, 20);
    const yieldBelow = K5.integ((E) => K5.spec(E) * K5.yieldAt(E), 0.5, 1.85, 400);
    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 's', label: 'מהפרוטונים מתחת ל-1.85 MeV', color: 'var(--c-proton)' },
        { key: 'y', label: 'נייטרונים מהם', color: 'var(--c-neutron)' },
      ]);
    }
    function paint() {
      if (!readouts) return;
      readouts.set('s', S.k >= 1 ? F.unit(100 * shareBelow, '%', 0) : '?');
      readouts.set('y', S.k >= 1 ? F.num(yieldBelow, 0) : '?');
    }
    function render() {
      view.clear(); P.axes();
      const xs = [], ys = [], xb = [], yb = [], yy = [];
      for (let i = 0; i <= 300; i++) {
        const E = 0.5 + (12.5 * i) / 300; xs.push(E); const v = Math.log10(K5.spec(E)); ys.push(v); yy.push(1e3 * K5.yieldAt(E));
        if (E <= 1.85) { xb.push(E); yb.push(v); }
      }
      if (S.k > 0) P.fill(xb, yb, { color: 'proton', alpha: 0.25 * Math.min(1, S.k * 2), base: 9 });
      P.line(xs, ys, { color: 'proton', width: 2.4 });
      P.vline(1.85, { color: 'proton', dash: [4, 3], label: '1.85', labelAt: 'bottom' });
      if (S.k >= 0.5) {
        P.vline(1.88, { color: 'muted', dash: [2, 3], width: 1.2 });
        P.vline(2.06, { color: 'muted', dash: [2, 3], width: 1.2 });
        P.text(2.5, 13.05, '⁷Li ' + F.num(1.88, 2) + ', ⁹Be ' + F.num(2.06, 2), { color: 'muted', size: 11, align: 'left', weight: 700 });
        const kk = Math.min(1, (S.k - 0.5) * 2);
        P.line(xs.slice(0, Math.floor(xs.length * kk) + 1), yy.slice(0, Math.floor(xs.length * kk) + 1), { color: 'neutron', width: 2.4, axis: 'y2' });
        P.text(8.6, 5.4, F.ltr('Y(E)') + ' ב-' + F.ltr('10⁻³') + ', צעצוע', { color: 'neutron', size: 11, align: 'right', axis: 'y2', weight: 700 });
      }
      if (!S.ran) K.mark(view, P.X(7), P.Y(11));
      K.clock(view, 'מאיפה מתחילים לירות');
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start, stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) { tw.clear(); S.ran = true; S.k = 0; loop.start(); return tw.run(seconds || 3, function (k) { S.k = k; paint(); loop.requestRender(); }); },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { return { shareBelow, yieldBelow, k: S.k }; },
    };
    paint();
    return api;
  };

  /* ---------- srcPerShot ---------- */
  PHY.sims.srcPerShot = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const BARS = [
      { label: 'כמו בריצה', sub: F.ltr('1.85-13 MeV, 20°'), Emin: 1.85, deg: 20 },
      { label: 'החל מ-' + F.unit(0.5, 'MeV', 1), sub: F.ltr('0.5-13 MeV, 20°'), Emin: 0.5, deg: 20 },
      { label: 'קונוס של ' + F.deg(10), sub: F.ltr('1.85-13 MeV, 10°'), Emin: 1.85, deg: 10 },
    ].map((b) => Object.assign(b, { nShot: K5.nShot(b.Emin, 13, b.deg) }));
    const P = PL.create(canvasEl, { x: [-0.6, 2.6], y: [0, 14], grid: true, margin: { l: 40, r: 12, t: 30, b: 50 }, yLabel: 'פרוטונים לירייה, ב-' + F.ltr('10¹¹'), yColor: 'proton', aspect: 1.5, minHeight: 260, maxHeight: 400 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { stage: 0, grow: 1 };
    function render() {
      view.clear(); K5.yAxisOnly(P);
      const ctx = view.ctx;
      BARS.forEach(function (b, i) {
        view.screenText(P.X(2 - i), P.box.y + P.box.h + 12, b.label, { size: 11.5, weight: 700, color: C.ink });
        view.screenText(P.X(2 - i), P.box.y + P.box.h + 28, b.sub, { size: 10, color: C.muted });
        const on = i === 0 || S.stage > i - 1;
        if (!on) { K.mark(view, P.X(2 - i), P.Y(4), '?', 24); return; }
        const k = i === 0 ? 1 : S.stage > i ? 1 : S.grow;
        const v = (b.nShot / 1e11) * k;
        ctx.save(); ctx.fillStyle = C.proton; ctx.globalAlpha = 0.45;
        ctx.fillRect(P.X(2 - i - 0.3), P.Y(v), P.X(2 - i + 0.3) - P.X(2 - i - 0.3), P.Y(0) - P.Y(v)); ctx.restore();
        if (k >= 1) view.screenText(P.X(2 - i), P.Y(v) - 10, F.num(b.nShot / 1e11, 2), { size: 12, weight: 700, color: C.ink, halo: true });
      });
      K.clock(view, 'אותו קובץ ספקטרום');
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start, stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear(); S.stage = 1; S.grow = 0; loop.start();
        const T = (seconds || 3) / 2;
        return tw.run(T, (k) => { S.stage = 1; S.grow = k; loop.requestRender(); })
          .then(() => tw.run(T, (k) => { S.stage = 2; S.grow = k; if (k >= 1) S.stage = 3; loop.requestRender(); }));
      },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { return { bars: BARS.map((b) => ({ label: b.label, nShot: b.nShot })), stage: S.stage }; },
    };
    S.stage = 0;
    return api;
  };
})();
