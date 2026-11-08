/* PHY.sims.mcConverge: a running estimate and its error band. Each trial (a proton) succeeds (makes a
   neutron) with probability p. At log-spaced checkpoints N_k the count is advanced by a binomial draw of
   the new trials (PHY.ch01.binomial), so the curve is the real running estimate p̂ = k/N of one random
   sequence. The band is p̂ ± σ with σ = √(p̂(1 − p̂)/N): it narrows as 1/√N. The x axis is log₁₀ N.
   play(seconds) draws the curve from N = 10 to Nmax; before it the plot is empty and the readouts "?".
   mode 'card' (cycle 4): p = 1 %, marks at N = 10⁴ and 10⁶ with their relative errors.
   mode 'trap' (trap 1): p = 4.47×10⁻⁴, Nmax = 10⁸, error bars at N = 10⁶ and 10⁸.
   After the reveal: an Nmax slider, a "same seed" toggle (the run seed stays opts.seed, so the curve is
   identical; off, every run takes the next seed) and "run again". The previous curve stays in grey.
   opts: {mode, p, Nmax, seed, yScale (display factor), yUnit, marks, locked, chapter, section}.
   getState(): {N, est, err, p, runs, seed, sameSeed, relAt(N), estAt(N), errAt(N)}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01;

  PHY.sims.mcConverge = function (canvasEl, controlsEl, opts) {
    const trap = opts && opts.mode === 'trap';
    opts = Object.assign(trap
      ? { p: 4.47e-4, Nmax: 1e8, yScale: 1e4, yLabel: 'נייטרונים לפרוטון', yUnit: '×10⁻⁴', marks: [1e6, 1e8] }
      : { p: 0.01, Nmax: 1e6, yScale: 100, yLabel: 'ההערכה של p', yUnit: '%', marks: [1e4, 1e6] },
    { seed: 11, locked: true }, opts || {});
    const NMIN = 10;
    const plot = PL.create(canvasEl, {
      x: [1, Math.log10(opts.Nmax)], y: [0, 2 * opts.p * opts.yScale],
      xLabel: 'log₁₀ N', yLabel: opts.yLabel, yUnit: opts.yUnit, yColor: 'neutron', aspect: 1.6, minHeight: 260, maxHeight: 420,
    });
    const view = plot.view;
    const tw = PHY.tweens();
    const S = { N: [], est: [], err: [], prev: null, shownTo: 0, ran: !opts.locked, sameSeed: true, runs: 0, seed: opts.seed };

    function simulate(seed) {
      const rng = PHY.random(seed).next;
      const K1 = 260, lo = Math.log10(NMIN), hi = Math.log10(opts.Nmax);
      const N = [], est = [], err = [];
      let n = 0, k = 0;
      for (let i = 0; i <= K1; i++) {
        const Ni = Math.round(Math.pow(10, lo + ((hi - lo) * i) / K1));
        if (Ni <= n) continue;
        k += K.binomial(Ni - n, opts.p, rng);
        n = Ni;
        const ph = k / n;
        N.push(n); est.push(ph); err.push(Math.sqrt((ph * (1 - ph)) / n));
      }
      return { N, est, err };
    }
    function run() {
      if (S.N.length) S.prev = { N: S.N, est: S.est };
      if (!S.sameSeed && S.runs > 0) S.seed += 1;
      const r = simulate(S.seed);
      S.N = r.N; S.est = r.est; S.err = r.err;
      S.runs++;
      plot.setRange({ x: [1, Math.log10(opts.Nmax)] });
    }
    const idxAt = (N) => { let j = 0; while (j < S.N.length - 1 && S.N[j + 1] <= N * 1.0000001) j++; return j; };

    let readouts = null, slider = null, toggle = null, again = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'N', label: 'ניסיונות \\(N\\)' },
        { key: 'est', label: 'ההערכה ± שגיאה (' + F.ltr(opts.yUnit) + ')', color: 'var(--c-neutron)' },
        { key: 'rel', label: 'שגיאה יחסית', color: 'var(--c-neutron)' },
      ]);
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      slider = U.Slider(grid, { label: 'עד כמה ניסיונות', min: 3, max: trap ? 9 : 7, step: 0.5, value: Math.log10(opts.Nmax), format: (v) => F.sci(Math.pow(10, v), 0), color: 'var(--accent)', onInput: (v) => { opts.Nmax = Math.pow(10, v); run(); S.shownTo = S.N.length; paint(); loop.requestRender(); mark(); } });
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      toggle = U.Toggle(row, 'אותו זרע בכל הרצה', { value: true, onChange: (v) => { S.sameSeed = v; mark(); } });
      again = U.Button(row, 'להריץ שוב', () => { api.play(1.6); mark(); }, { primary: true });
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };

    function paint() {
      if (!readouts) return;
      const j = Math.min(S.shownTo, S.N.length) - 1;
      if (!S.ran || j < 0) { ['N', 'est', 'rel'].forEach((k) => readouts.set(k, '?')); return; }
      const sc = opts.yScale, d = sc === 100 ? 3 : 2;
      readouts.set('N', F.sci(S.N[j], 1));
      readouts.set('est', F.ltr(F.num(S.est[j] * sc, d) + ' ± ' + F.num(S.err[j] * sc, d)));
      readouts.set('rel', S.est[j] > 0 ? F.unit((100 * S.err[j]) / S.est[j], '%', 1) : '–');
    }
    function lock(on) {
      opts.locked = on;
      if (slider) slider.setEnabled(!on);
      if (toggle) toggle.input.disabled = on;
      if (again) again.disabled = on;
    }

    function render() {
      view.clear();
      plot.axes();
      const sc = opts.yScale, lx = (a) => a.map((v) => Math.log10(v));
      /* the true p is given in the cycle-4 question; in the trap it would answer the card, so it waits */
      if (S.ran || !trap) {
        plot.hline(opts.p * sc, { color: 'ink', dash: [6, 5] });
        view.screenText(plot.X(1) + 6, plot.Y(opts.p * sc) - 11, 'האמת: ' + F.ltr(F.num(opts.p * sc, 2) + ' ' + opts.yUnit), { size: 11.5, weight: 700, color: C.ink, align: 'left', halo: true });
      }
      if (!S.ran) { K.mark(view, plot.X((1 + Math.log10(opts.Nmax)) / 2), plot.Y(opts.p * sc * 1.45)); return; }
      if (S.prev) plot.line(lx(S.prev.N), S.prev.est.map((v) => v * sc), { color: 'muted', width: 1.4, alpha: 0.8 });
      const n = Math.min(S.shownTo, S.N.length);
      const xs = lx(S.N.slice(0, n));
      const lo = [], hi = [], ys = [];
      for (let i = 0; i < n; i++) { ys.push(S.est[i] * sc); lo.push((S.est[i] - S.err[i]) * sc); hi.push((S.est[i] + S.err[i]) * sc); }
      K.band(plot, xs, lo, hi, { color: 'neutron', alpha: 0.2 });
      plot.line(xs, ys, { color: 'neutron', width: 2.2 });
      if (n >= S.N.length) {
        opts.marks.forEach(function (Nm) {
          if (Nm > opts.Nmax * 1.0001) return;
          const j = idxAt(Nm);
          const x = Math.log10(S.N[j]), y = S.est[j] * sc, e = S.err[j] * sc;
          plot.vline(x, { color: 'muted', dash: [3, 4] });
          const ctx = view.ctx;
          ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(plot.X(x), plot.Y(y - e)); ctx.lineTo(plot.X(x), plot.Y(y + e)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(plot.X(x) - 6, plot.Y(y - e)); ctx.lineTo(plot.X(x) + 6, plot.Y(y - e)); ctx.moveTo(plot.X(x) - 6, plot.Y(y + e)); ctx.lineTo(plot.X(x) + 6, plot.Y(y + e)); ctx.stroke();
          ctx.restore();
          plot.marker(x, y, { color: 'ink', r: 4, shape: 'dot' });
          const rel = S.est[j] > 0 ? (100 * S.err[j]) / S.est[j] : 0;
          view.screenText(plot.X(x) - 6, plot.Y(Math.min(plot.range.y[1] * 0.93, y + e)) - 12, F.ltr('±' + F.num(rel, rel < 2 ? 1 : 0) + ' %'), { size: 12, weight: 700, color: C.ink, align: 'right', halo: true });
        });
      }
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      /* A new run (same seed or the next one), drawn from N = 10 to Nmax over `seconds`. */
      play(seconds) {
        tw.clear();
        S.ran = true;
        run();
        S.shownTo = 0;
        paint();
        loop.start();
        const n = S.N.length;
        return tw.run(seconds || 4, function (k) {
          S.shownTo = Math.ceil(n * k);
          if (k >= 1) { S.shownTo = n; lock(false); }
          paint();
          loop.requestRender();
        });
      },
      runNow() { S.ran = true; run(); S.shownTo = S.N.length; paint(); loop.requestRender(); return api.getState(); },
      setParam(key, v) {
        if (key === 'locked') lock(v);
        else if (key === 'sameSeed') { S.sameSeed = !!v; if (toggle) toggle.set(!!v); }
        else if (key === 'seed') S.seed = v;
        else { opts[key] = v; if (key === 'Nmax' && slider) slider.set(Math.log10(v)); }
        paint();
        loop.requestRender();
      },
      getState() {
        return {
          N: S.N.slice(), est: S.est.slice(), err: S.err.slice(), p: opts.p, runs: S.runs, seed: S.seed, sameSeed: S.sameSeed,
          estAt: (N) => S.est[idxAt(N)], errAt: (N) => S.err[idxAt(N)], relAt: (N) => S.err[idxAt(N)] / S.est[idxAt(N)], NAt: (N) => S.N[idxAt(N)],
        };
      },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
