/* PHY.sims.mcSlab: free flight, then an interaction. Neutral particles enter a thick block one by one (it
   continues beyond the drawing), and for each one the depth of its first interaction is drawn from the
   exponential: x = −λ ln(1 − u), with λ = 1/(nσ) and n = ρ N_A / A (PHY.ch01). The top panel shows the
   block, the last tracks and the interaction points; the bottom panel the histogram of depths, and after
   the run the expected curve N·Δx·e^{−x/λ}/λ and the mark at λ. The uniforms u are kept, so moving a slider
   rescales the same particles; "shoot again" draws new ones.
   mode 'card': Be with sliders for ρ and σ, locked until play(seconds) (histogram empty, readouts "?").
   mode 'lab': the playground: material (Be, Li, LiF, Pb, HDPE), σ, N and a depth d with the fraction that
   interacted before d, measured and from 1 − e^{−d/λ}. The axis follows λ (0 to about 4.5λ).
   opts: {mode, material, rho, sigma (barn), N, X (mm, card axis), d (mm), seed, locked, chapter, section}.
   getState(): {n, lambda, N, shown, mean, err, counts, dx, x1, over, fracD, fracDTrue}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01;

  PHY.sims.mcSlab = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'card', material: 'Be', rho: null, sigma: 1, N: 2000, X: 300, d: 2, seed: 7, locked: true }, opts || {});
    const lab = opts.mode === 'lab';
    const NMAX = lab ? 100000 : opts.N;
    if (opts.rho === null) opts.rho = K.material(opts.material).rho;
    const M = { l: 46, r: 14 };
    const top = PL.create(canvasEl, { x: [0, 1], y: [-1, 1], grid: false, rect: { x: 0, y: 0, w: 1, h: 0.36 }, margin: { l: M.l, r: M.r, t: 32, b: 6 }, aspect: 1.25, minHeight: 330, maxHeight: 500 });
    const view = top.view;
    const bot = PL.panel(view, { x: [0, 1], y: [0, 1], rect: { x: 0, y: 0.36, w: 1, h: 0.64 }, margin: { l: M.l, r: M.r }, xLabel: 'עומק', xUnit: 'mm', yLabel: 'אינטראקציות ראשונות', yColor: 'neutron' });
    const tw = PHY.tweens();
    const S = { u: null, v: null, D: null, shown: lab || !opts.locked ? opts.N : 0, ran: lab || !opts.locked, seed: opts.seed, X: opts.X, nb: lab ? 36 : 30 };

    function draw(seed) {
      const r = PHY.random(seed);
      S.u = new Float64Array(NMAX);
      S.v = new Float64Array(NMAX);
      for (let i = 0; i < NMAX; i++) { S.u[i] = r.next(); S.v[i] = -0.8 + 1.6 * r.next(); }
    }
    const mat = () => K.material(opts.material);
    const nDens = () => K.numberDensity(lab ? mat().rho : opts.rho, mat().A);
    const lam = () => K.lambdaMm(nDens(), opts.sigma);
    function build() {
      const L = lam();
      S.D = new Float64Array(NMAX);
      for (let i = 0; i < NMAX; i++) S.D[i] = K.depth(L, S.u[i]);
      if (lab) S.X = PL.niceRange(0, 4.5 * L)[1];
      const xmin = -0.07 * S.X;
      top.setRange({ x: [xmin, S.X] });
      bot.setRange({ x: [xmin, S.X] });
      const dx = S.X / S.nb;
      const expectFirst = opts.N * (1 - Math.exp(-dx / L));
      bot.setRange({ y: PL.niceRange(0, 1.25 * expectFirst + 3 * Math.sqrt(expectFirst)) });
    }

    let readouts = null, sl = {}, matChoice = null, again = null;
    if (controlsEl) {
      const items = [
        { key: 'n', label: 'צפיפות האטומים n, ב-cm⁻³' },
        { key: 'lam', label: 'מרחק חופשי ממוצע λ', color: 'var(--c-neutron)' },
        { key: 'mean', label: 'העומק הממוצע שנמדד', color: 'var(--c-neutron)' },
      ];
      if (lab) items.push({ key: 'fd', label: 'נבלעו לפני העומק d: נמדד' }, { key: 'ft', label: 'לפי הנוסחה \\(1 - e^{-d/\\lambda}\\)' });
      readouts = U.Readouts(controlsEl, items);
      if (lab) {
        matChoice = U.Choice(controlsEl, {
          label: 'חומר',
          options: K.MATERIALS.map((m) => ({ value: m.key, text: m.name })),
          value: opts.material,
          onChange: (v) => set('material', v),
        });
      }
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      if (lab) {
        sl.sigma = U.Slider(grid, { label: 'חתך פעולה \\(\\sigma\\)', min: -1, max: 1, step: 0.01, value: Math.log10(opts.sigma), format: (v) => F.unit(Math.pow(10, v), 'b', Math.pow(10, v) < 1 ? 2 : 1), color: 'var(--accent)', onInput: (v) => set('sigma', Math.pow(10, v)) });
        sl.N = U.Slider(grid, { label: 'מספר החלקיקים \\(N\\)', min: 2, max: 5, step: 0.1, value: Math.log10(opts.N), format: (v) => F.num(Math.round(Math.pow(10, v)), 0), color: 'var(--accent)', onInput: (v) => set('N', Math.round(Math.pow(10, v))) });
        sl.d = U.Slider(grid, { label: 'עומק השכבה \\(d\\)', min: -1, max: 2, step: 0.01, value: Math.log10(opts.d), format: (v) => F.unit(Math.pow(10, v), 'mm', Math.pow(10, v) < 1 ? 2 : 1), color: 'var(--c-volume)', onInput: (v) => set('d', Math.pow(10, v)) });
      } else {
        sl.rho = U.Slider(grid, { label: 'צפיפות \\(\\rho\\) של ה-Be', min: 0.5, max: 3, step: 0.01, value: opts.rho, unit: 'g/cm³', digits: 2, color: 'var(--accent)', onInput: (v) => set('rho', v) });
        sl.sigma = U.Slider(grid, { label: 'חתך פעולה \\(\\sigma\\)', min: 0.2, max: 5, step: 0.1, value: opts.sigma, unit: 'b', digits: 1, color: 'var(--accent)', onInput: (v) => set('sigma', v) });
      }
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      again = U.Button(row, 'לירות שוב, חלקיקים חדשים', () => { S.seed += 101; draw(S.seed); build(); if (lab) { paint(); loop.requestRender(); } else api.play(1.5); mark(); }, {});
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };

    function set(key, v) {
      opts[key] = v;
      if (key === 'N') { S.shown = Math.min(v, NMAX); }
      build();
      if (key === 'N' && !lab) S.shown = opts.N;
      paint();
      loop.requestRender();
      mark();
    }

    function measure() {
      const L = lam(), n = Math.min(S.shown, NMAX);
      let s = 0, s2 = 0, inD = 0;
      for (let i = 0; i < n; i++) { const x = S.D[i]; s += x; s2 += x * x; if (x < opts.d) inD++; }
      const me = K.meanErr(s, s2, n);
      const h = K.hist(S.D, n, 0, S.X, S.nb);
      return { L, n, mean: me.mean, err: me.err, counts: h.counts, dx: h.dx, over: h.over, fracD: n ? inD / n : 0, fracDTrue: 1 - Math.exp(-opts.d / L) };
    }

    function paint() {
      if (!readouts) return;
      const m = measure();
      const done = S.ran && S.shown >= opts.N;
      readouts.set('n', S.ran ? F.sci(nDens(), 3) : '?');
      readouts.set('lam', S.ran ? K.lamText(m.L) : '?');
      const dg = m.mean < 10 ? 2 : m.mean < 1000 ? 1 : 0;
      readouts.set('mean', done ? F.ltr(F.num(m.mean, dg) + ' ± ' + F.num(m.err, m.err < 1 ? 2 : dg) + ' mm') : '?');
      if (lab) {
        readouts.set('fd', F.unit(100 * m.fracD, '%', 2));
        readouts.set('ft', F.unit(100 * m.fracDTrue, '%', 2));
      }
    }

    function lock(on) {
      opts.locked = on;
      Object.keys(sl).forEach((k) => sl[k].setEnabled(!on));
      if (again) again.disabled = on;
    }

    function render() {
      view.clear();
      const m = measure();
      const ctx = view.ctx;
      /* the block: from x = 0 to beyond the drawing */
      top.clip(function (b) {
        const x0 = top.X(0), y0 = top.Y(0.92), y1 = top.Y(-0.92);
        ctx.save();
        ctx.fillStyle = C.volume; ctx.globalAlpha = 0.07;
        ctx.fillRect(x0, y0, b.x + b.w - x0, y1 - y0);
        ctx.globalAlpha = 1; ctx.strokeStyle = C.volume; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x + b.w + 2, y0); ctx.lineTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(b.x + b.w + 2, y1); ctx.stroke();
        ctx.restore();
      });
      view.screenText(top.X(0) + 8, top.Y(0.92) + 11, lab ? opts.material : 'Be', { size: 12, weight: 700, color: C.volume, align: 'left' });
      const n = Math.min(S.shown, NMAX);
      const x0 = top.range.x[0];
      /* interaction points, then the last tracks */
      top.clip(function () {
        ctx.save();
        ctx.fillStyle = C.neutron;
        ctx.globalAlpha = 0.55;
        for (let i = Math.max(0, n - 1500); i < n; i++) {
          if (S.D[i] > S.X) continue;
          ctx.beginPath(); ctx.arc(top.X(S.D[i]), top.Y(S.v[i]), 1.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = C.neutron; ctx.lineWidth = 1.3;
        for (let i = Math.max(0, n - 18); i < n; i++) {
          const y = top.Y(S.v[i]);
          ctx.beginPath(); ctx.moveTo(top.X(x0), y); ctx.lineTo(top.X(Math.min(S.D[i], S.X * 1.02)), y); ctx.stroke();
          if (S.D[i] <= S.X) { ctx.beginPath(); ctx.arc(top.X(S.D[i]), y, 3.4, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.restore();
      });
      /* histogram */
      bot.axes();
      K.bars(bot, 0, m.dx, m.counts, { color: 'neutron', alpha: 0.5 });
      const done = S.ran && S.shown >= opts.N;
      if (done) {
        const xs = [], ys = [];
        for (let i = 0; i <= 160; i++) { const x = (S.X * i) / 160; xs.push(x); ys.push((opts.N * m.dx * Math.exp(-x / m.L)) / m.L); }
        bot.line(xs, ys, { color: 'ink', width: 2, dash: [6, 4] });
        if (m.L < S.X) bot.vline(m.L, { color: 'ink', dash: [3, 4], label: 'λ', labelAt: 'top' });
        if (lab && opts.d < S.X) top.vline(opts.d, { color: 'volume', dash: [4, 3], label: 'd', labelAt: 'bottom' });
      }
      if (!S.ran) {
        K.mark(view, bot.X(S.X * 0.5), bot.Y(bot.range.y[1] * 0.5));
      }
      K.clock(view, F.ltr('N = ' + F.num(n, 0)));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      /* Particles enter one by one; the histogram fills over `seconds`. */
      play(seconds) {
        tw.clear();
        S.ran = true;
        S.shown = 0;
        paint();
        loop.start();
        return tw.run(seconds || 3.5, function (k) {
          S.shown = Math.floor(opts.N * k);
          if (k >= 1) { S.shown = opts.N; lock(false); }
          paint();
          loop.requestRender();
        });
      },
      /* New particles (a new seed), shown at once. */
      reshoot(seed) {
        S.seed = seed === undefined ? S.seed + 101 : seed;
        draw(S.seed); build();
        S.shown = opts.N; S.ran = true;
        paint(); loop.requestRender();
      },
      setParam(key, v) {
        if (key === 'locked') lock(v);
        else {
          opts[key] = v;
          if (key === 'material' && !lab) opts.rho = K.material(v).rho;
          if (sl[key]) sl[key].set(key === 'sigma' && lab ? Math.log10(v) : key === 'N' || key === 'd' ? Math.log10(v) : v);
          if (key === 'material' && matChoice) matChoice.set(v);
          if (key === 'N') S.shown = Math.min(v, NMAX);
          build();
        }
        paint();
        loop.requestRender();
      },
      getState() {
        const m = measure();
        return { n: nDens(), lambda: m.L, N: opts.N, shown: S.shown, mean: m.mean, err: m.err, counts: m.counts.slice(), dx: m.dx, x1: S.X, over: m.over, fracD: m.fracD, fracDTrue: m.fracDTrue, ran: S.ran };
      },
    };
    draw(S.seed);
    build();
    lock(lab ? false : opts.locked);
    paint();
    return api;
  };
})();
