/* PHY.sims.physYield: why the density cancels in a thick target. Two Be converters, the real one
   (ρ = 1.848 g/cm³) and a second one at a chosen density (a hypothetical foam, half by default), both
   thicker than the range. N protons of E₀ enter each; the range scales as 1/ρ (R ∝ E^1.75, anchored at
   1.3 mm for 13 MeV in Be, PHY.ch04.rangeRho). Along the path the depth is cut into steps; in a step of
   length dx at energy E(x) the number of reactions is binomial with p = n σ(E) dx, n = ρ N_A / A.
   σ is the schematic Be shape multiplied by BOOST (a toy factor that makes the counts visible), so the
   yields shown are toy numbers. Halving ρ halves n and doubles every dx: p per step is unchanged.
   Top: the two slabs with proton tracks and neutron births. Bottom: births per depth for both.
   Card: ρ₂ = ρ/2, E₀ = 13 MeV; before the run the counts and the histogram are hidden.
   opts: {E0, rho2, N, seed, locked, chapter, section}. getState(): {k1, k2, N, R1, R2, mean1, mean2, Y1, Y2}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;
  const NSTEP = 80, BOOST = 150, RHO = 1.848, A = 9.012;

  PHY.sims.physYield = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ E0: 13, rho2: RHO / 2, N: 2000, seed: 31, locked: true }, opts || {});
    const top = PL.create(canvasEl, { x: [-0.3, 3.2], y: [0, 4], grid: false, rect: { x: 0, y: 0, w: 1, h: 0.46 }, margin: { l: 44, r: 14, t: 30, b: 6 }, aspect: 1.15, minHeight: 360, maxHeight: 500 });
    const view = top.view;
    const bot = PL.panel(view, { x: [-0.3, 3.2], y: [0, 1], rect: { x: 0, y: 0.46, w: 1, h: 0.54 }, margin: { l: 44, r: 14, t: 26, b: 36 }, xLabel: 'עומק', xUnit: 'mm', yLabel: 'לידות נייטרונים (צעצוע)', yColor: 'neutron' });
    const tw = PHY.tweens();
    const S = { ran: !opts.locked, done: !opts.locked, frac: opts.locked ? 0 : 1, d1: [], d2: [], seed: opts.seed };

    const range = (rho) => K4.rangeRho('Be', opts.E0) / (0.1 * rho);
    function simulate(rho, rng) {
      const R = range(rho), dx = R / NSTEP, n = (rho * K4.NA) / A;
      const out = [];
      for (let i = 0; i < NSTEP; i++) {
        const xm = (i + 0.5) * dx;
        const E = opts.E0 * Math.pow((R - xm) / R, 1 / 1.75);
        const p = Math.min(0.5, n * K4.sigma('Be9', E) * 1e-24 * BOOST * dx * 0.1);
        const k = K.binomial(opts.N, p, rng);
        for (let j = 0; j < k; j++) out.push(i * dx + rng() * dx);
      }
      return out;
    }
    function run() {
      const r = PHY.random(S.seed);
      S.d1 = simulate(RHO, r.next);
      S.d2 = simulate(opts.rho2, r.next);
      const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
      shuffle(S.d1); shuffle(S.d2);
      const xmax = Math.max(range(RHO), range(opts.rho2)) * 1.12;
      top.setRange({ x: [-0.06 * xmax, xmax] });
      bot.setRange({ x: [-0.06 * xmax, xmax] });
    }

    let readouts = null, sl = {};
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'k1', label: 'נייטרונים ב-Be הרגיל', color: 'var(--c-neutron)' },
        { key: 'k2', label: 'נייטרונים ב-Be השני', color: 'var(--c-neutron)' },
        { key: 'r', label: 'טווח הפרוטון: רגיל / שני (mm)' },
      ]);
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      sl.rho = U.Slider(grid, { label: 'צפיפות ה-Be השני', min: 0.3, max: 3.7, step: 0.01, value: opts.rho2, unit: 'g/cm³', digits: 2, color: 'var(--accent)', onInput: (v) => { opts.rho2 = v; again(); } });
      sl.E = U.Slider(grid, { label: 'אנרגיית הפרוטונים', min: 3, max: 13, step: 0.1, value: opts.E0, unit: 'MeV', digits: 1, color: 'var(--c-proton)', onInput: (v) => { opts.E0 = v; again(); } });
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function again() { S.seed += 17; run(); S.ran = S.done = true; S.frac = 1; paint(); loop.requestRender(); mark(); }

    const shownOf = (a) => Math.floor(a.length * S.frac);
    function paint() {
      if (!readouts) return;
      const pm = (k) => F.ltr(F.num(k, 0) + ' ± ' + F.num(Math.sqrt(k), 0));
      readouts.set('k1', S.ran ? (S.done ? pm(S.d1.length) : F.num(shownOf(S.d1), 0)) : '?');
      readouts.set('k2', S.ran ? (S.done ? pm(S.d2.length) : F.num(shownOf(S.d2), 0)) : '?');
      readouts.set('r', F.ltr(F.num(range(RHO), 2) + ' / ' + F.num(range(opts.rho2), 2)));
    }

    function slab(y0, rho, label, d) {
      const ctx = view.ctx;
      const xmax = top.range.x[1];
      const R = range(rho);
      ctx.save();
      ctx.fillStyle = C.volume; ctx.globalAlpha = 0.05 + 0.06 * (rho / RHO);
      ctx.fillRect(top.X(0), top.Y(y0 + 0.62), top.X(xmax) - top.X(0), top.Y(y0 - 0.62) - top.Y(y0 + 0.62));
      ctx.globalAlpha = 1; ctx.strokeStyle = C.volume; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(top.X(xmax), top.Y(y0 + 0.62)); ctx.lineTo(top.X(0), top.Y(y0 + 0.62)); ctx.lineTo(top.X(0), top.Y(y0 - 0.62)); ctx.lineTo(top.X(xmax), top.Y(y0 - 0.62)); ctx.stroke();
      ctx.restore();
      view.screenText(top.X(0) - 6, top.Y(y0), label, { size: 11, weight: 700, color: C.volume, align: 'right' });
      if (!S.ran) return;
      const r = PHY.random(5);
      for (let i = 0; i < 9; i++) {
        const yy = y0 + (r.next() - 0.5) * 1.0;
        top.line([top.range.x[0], R * Math.min(1, S.frac * 1.3)], [yy, yy], { color: 'proton', width: 1.2, alpha: 0.55 });
      }
      const n = Math.min(160, shownOf(d));
      for (let i = 0; i < n; i++) top.marker(d[i], y0 + (((i * 0.6180339) % 1) - 0.5) * 1.05, { color: 'neutron', r: 2.2, shape: 'dot' });
    }

    function render() {
      view.clear();
      slab(3.0, RHO, F.ltr(F.num(RHO, 2)), S.d1);
      slab(1.1, opts.rho2, F.ltr(F.num(opts.rho2, 2)), S.d2);
      K.clock(view, 'צפיפות ב-' + F.ltr('g/cm³') + ', פרוטונים של ' + F.ltr(F.num(opts.E0, 1) + ' MeV'));
      bot.axes();
      if (S.ran) {
        const xmax = top.range.x[1], nb = 32;
        const h1 = K.hist(S.d1, shownOf(S.d1), 0, xmax, nb), h2 = K.hist(S.d2, shownOf(S.d2), 0, xmax, nb);
        const peak = Math.max(4, Math.max.apply(null, h1.counts.concat(h2.counts)));
        bot.setRange({ y: PL.niceRange(0, peak * 1.15) });
        K.bars(bot, 0, h1.dx, h1.counts, { color: 'neutron', alpha: 0.55 });
        const xs = [], ys = [];
        h2.counts.forEach(function (c, i) { xs.push(i * h2.dx, (i + 1) * h2.dx); ys.push(c, c); });
        bot.line(xs, ys, { color: 'ink', width: 1.8 });
        bot.legend([{ label: 'רגיל', color: 'neutron' }, { label: 'השני', color: 'ink' }], { corner: 'right' });
      } else {
        K.mark(view, bot.X(top.range.x[1] * 0.5), bot.Y(0.5));
      }
    }

    function lock(on) { opts.locked = on; Object.keys(sl).forEach((k) => sl[k].setEnabled(!on)); }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        run(); S.ran = true; S.done = false; S.frac = 0;
        paint(); loop.start();
        return tw.run(seconds || 3.5, function (k) {
          S.frac = k;
          if (k >= 1) { S.done = true; lock(false); }
          paint(); loop.requestRender();
        });
      },
      setParam(k, v) {
        if (k === 'locked') { lock(v); return; }
        opts[k] = v;
        if (k === 'rho2' && sl.rho) sl.rho.set(v);
        if (k === 'E0' && sl.E) sl.E.set(v);
        run(); S.ran = S.done = true; S.frac = 1; paint(); loop.requestRender();
      },
      getState() {
        const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
        return { k1: S.d1.length, k2: S.d2.length, N: opts.N, R1: range(RHO), R2: range(opts.rho2), mean1: mean(S.d1), mean2: mean(S.d2), Y1: S.d1.length / opts.N, Y2: S.d2.length / opts.N, done: S.done, d1: S.d1.slice(), d2: S.d2.slice() };
      },
    };
    run();
    lock(opts.locked);
    paint();
    return api;
  };
})();
