/* PHY.ch08: chapter 8 helpers (output and analysis). Loaded after ../ch01/kit.js, whose binomial, gauss,
   mark and clock it uses.

   BE: the numbers of the Be 2 mm run (docs/PLAN.md §4), and the two values its log prints with more digits.

   The toy `leak` table (shown as "צעצוע" everywhere). A schematic model of the Be 2 mm run, tuned to its
   numbers:
     protons are fired flat in [EMIN, EMAX] = [1.85, 13] MeV. The true spectrum is f(E) ∝ e^{−E/TP} with
       TP = 2.15 MeV, which gives ⟨E⟩ = 3.94 MeV. A proton's weight is w = f(E)/g(E), g = 1/(EMAX − EMIN),
       so the mean source weight is 1 (wFlat).
     a proton reacts with probability q(E) = c·(E − ETH)^AY above ETH = 2.06 MeV, the ⁹Be(p,n) threshold.
       AY = 1.73 makes the mean weight of a leak row E_f[q]/E_g[q] = 0.219 (MEANW), as 1341/6126 in the run.
     a reacting proton gives 1 neutron, or 2 with probability mult2 (a toy multiplicity).
     the neutron energy is a Maxwell spectrum of temperature T (TN = 1.26 MeV: ⟨E⟩ = 1.5 T = 1.89 MeV,
       66 % above 1 MeV); the direction follows dN/dcosθ ∝ 1 + a cosθ with a = ANISO = 0.36 (59 % forward).
     c = p / ((1 + mult2) E_f[(E − ETH)^AY]), so that the true yield is p neutrons per proton.
   makeRun({N, p, mult2, T, aniso, flat, seed}) draws only the protons that react (their number is binomial),
     so 3×10⁶ events cost as much as the rows. flat: false is an analog run (protons from f, w = 1).
     Returns {N, p, K (reacting events), R (rows), S (Σw), S2 (Σw² over rows), X2 (Σx² over events, x = the
     weight sum of one event), evt, Ep, E, cos, w (typed arrays of length R, sorted by evt), m (rows per
     reacting event)}.
   hash32(seed)           the seed of a run is hashed, so neighbouring seeds give independent runs.
   eventErr(run)          {mean, err} per proton from the per-event sums: the MeanErr of ldns.
   maxwell(T, rng), cosAniso(a, rng)   the two samplers. sourceWeights(n, rng): n flat-sampled source weights.
   hist(values, weights, count, x0, x1, nb, log)   weighted histogram; log: x0, x1 are log₁₀ of the range and
                          the bins are equal in log₁₀. Returns {sum, sum2, edges (in the value's units), over}.
   ticksX(plot, [{v, label}]), hideY(plot)   own x tick labels; no y tick labels (bar charts of lanes).
   logAxis(plot, lo, hi, fmt)  over-paints the x tick labels of a panel whose x is log₁₀(value) and labels the
                          decades with fmt(d) (default 0.01, 0.1, 1, 10), with minor ticks.
   sciTex(x, d)           "1.97\times10^{8}" for a TeX string.
   All colors are read from PHY.colors at draw time. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, K1 = PHY.ch01;

  const BE = {
    N: 3e6, rows: 6126, sumW: 1341, meanW: 0.219, p: 4.47e-4, pErr: 0.09e-4, nShot: 4.42e11, perShot: 1.97e8,
    perShotErr: 0.04e8, fwd: 0.59, Emean: 1.89, above1: 0.67, cone: 16.4, radius: 22,
    logPerShot: 1.974e8, logNShot: 4.416e11,
  };

  const EMIN = 1.85, EMAX = 13.0, TP = 2.15, ETH = 2.06, AY = 1.73, TN = 1.26, ANISO = 0.36;
  const Z = TP * (Math.exp(-EMIN / TP) - Math.exp(-EMAX / TP));
  const fTrue = (E) => (E < EMIN || E > EMAX ? 0 : Math.exp(-E / TP) / Z);
  const wFlat = (E) => fTrue(E) * (EMAX - EMIN);
  const shape = (E) => (E > ETH ? Math.pow(E - ETH, AY) : 0);

  /* E_f[shape] by Simpson's rule; E_g[shape] in closed form. */
  function simpson(fn, a, b, n) {
    const h = (b - a) / n;
    let s = fn(a) + fn(b);
    for (let i = 1; i < n; i++) s += fn(a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
  }
  const EF = simpson((E) => fTrue(E) * shape(E), ETH, EMAX, 4000);
  const EG = Math.pow(EMAX - ETH, AY + 1) / ((AY + 1) * (EMAX - EMIN));
  const MEANW = EF / EG;
  const ESTAR = Math.min(EMAX, ETH + AY * TP);            /* the peak of f·shape */
  const FSMAX = fTrue(ESTAR) * shape(ESTAR) * 1.0001;
  const SHMAX = shape(EMAX);

  function maxwell(T, rng) {
    const g = K1.gauss(rng);
    return T * (-Math.log(1 - rng()) + 0.5 * g * g);
  }

  /* Inverse of the cumulative (c + 1)/2 + a(c² − 1)/4 on [−1, 1]. */
  function cosAniso(a, rng) {
    const u = rng();
    if (Math.abs(a) < 1e-9) return 2 * u - 1;
    const d = 0.25 - a * (0.5 - a / 4 - u);
    return Math.max(-1, Math.min(1, (-0.5 + Math.sqrt(Math.max(0, d))) / (a / 2)));
  }

  function sourceWeights(n, rng) {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) w[i] = wFlat(EMIN + (EMAX - EMIN) * rng());
    return w;
  }

  /* Neighbouring seeds give almost the same first draw of PHY.random (a linear congruential generator), so a
     run's seed is hashed first: repetitions with seeds 1, 2, 3 ... are then independent. */
  function hash32(x) {
    x = x >>> 0;
    x = Math.imul(x ^ (x >>> 16), 73244475);
    x = Math.imul(x ^ (x >>> 16), 73244475);
    return (x ^ (x >>> 16)) >>> 0;
  }

  function makeRun(o) {
    o = Object.assign({ N: 1e5, p: BE.p, mult2: 0, T: TN, aniso: ANISO, flat: true, seed: 1 }, o || {});
    const rng = PHY.random(hash32(o.seed)).next;
    const c = o.p / ((1 + o.mult2) * EF);
    const qbar = Math.min(1, o.flat ? c * EG : c * EF);
    const K = K1.binomial(o.N, qbar, rng);
    const evs = new Float64Array(K);
    for (let i = 0; i < K; i++) evs[i] = Math.floor(rng() * o.N);
    evs.sort();
    const Eps = new Float64Array(K), ws = new Float64Array(K), ms = new Uint8Array(K);
    let R = 0;
    for (let i = 0; i < K; i++) {
      let E, guard = 0;
      do {
        E = ETH + (EMAX - ETH) * rng();
        guard++;
      } while (guard < 1000 && rng() * (o.flat ? SHMAX : FSMAX) > (o.flat ? shape(E) : fTrue(E) * shape(E)));
      Eps[i] = E;
      ws[i] = o.flat ? wFlat(E) : 1;
      ms[i] = 1 + (rng() < o.mult2 ? 1 : 0);
      R += ms[i];
    }
    const run = {
      N: o.N, p: o.p, K, R, S: 0, S2: 0, X2: 0, m: ms,
      evt: new Int32Array(R), Ep: new Float64Array(R), E: new Float64Array(R), cos: new Float64Array(R), w: new Float64Array(R),
    };
    let j = 0;
    for (let i = 0; i < K; i++) {
      const x = ms[i] * ws[i];
      run.S += x; run.X2 += x * x;
      for (let k = 0; k < ms[i]; k++) {
        run.evt[j] = evs[i]; run.Ep[j] = Eps[i]; run.w[j] = ws[i];
        run.E[j] = maxwell(o.T, rng);
        run.cos[j] = cosAniso(o.aniso, rng);
        run.S2 += ws[i] * ws[i];
        j++;
      }
    }
    return run;
  }

  function eventErr(run) {
    return K1.meanErr(run.S, run.X2, run.N);
  }

  function hist(values, weights, count, x0, x1, nb, log) {
    const sum = new Float64Array(nb), sum2 = new Float64Array(nb);
    const dx = (x1 - x0) / nb;
    let over = 0;
    const n = Math.min(count, values.length);
    for (let i = 0; i < n; i++) {
      let v = values[i];
      if (log) v = v > 0 ? Math.log10(v) : -Infinity;
      const w = weights ? weights[i] : 1;
      if (v >= x1) { over += w; continue; }
      if (v < x0) continue;
      const b = Math.min(nb - 1, Math.floor((v - x0) / dx));
      sum[b] += w; sum2[b] += w * w;
    }
    const edges = [];
    for (let b = 0; b <= nb; b++) edges.push(log ? Math.pow(10, x0 + b * dx) : x0 + b * dx);
    return { sum, sum2, edges, over, dx };
  }

  const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const pow10 = (d) => '10' + (d < 0 ? '⁻' : '') + String(Math.abs(d)).split('').map((ch) => SUPS[+ch]).join('');

  function logAxis(plot, lo, hi, fmt) {
    const b = plot.box, ctx = plot.view.ctx, C = PHY.colors;
    const fs = b.small ? 10.5 : 11.5;
    ctx.save();
    ctx.fillStyle = C.bg;
    ctx.fillRect(b.x - 3, b.y + b.h + 3.5, b.w + 21, 18); ctx.fillRect(b.x - 16, b.y + b.h + 6.5, 14, 15);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    for (let d = Math.floor(lo); d <= Math.ceil(hi); d++) {
      for (let k = 1; k <= 9; k++) {
        const v = d + Math.log10(k);
        if (v < lo - 1e-9 || v > hi + 1e-9) continue;
        const px = Math.round(plot.X(v)) + 0.5;
        ctx.beginPath(); ctx.moveTo(px, b.y + b.h); ctx.lineTo(px, b.y + b.h + (k === 1 ? 4 : 2.5)); ctx.stroke();
      }
    }
    ctx.restore();
    for (let d = Math.ceil(lo - 1e-9); d <= hi + 1e-9; d++) {
      const label = fmt ? fmt(d) : F.num(Math.pow(10, d), Math.max(0, -d));
      plot.view.screenText(plot.X(d), b.y + b.h + 13, label, { size: fs, color: C.muted });
    }
  }

  /* Over-paints the x tick labels of a panel and writes its own: ticks = [{v, label}]. */
  function ticksX(plot, ticks) {
    const b = plot.box, ctx = plot.view.ctx, C = PHY.colors;
    const fs = b.small ? 10.5 : 11.5;
    ctx.save();
    ctx.fillStyle = C.bg;
    ctx.fillRect(b.x - 3, b.y + b.h + 3.5, b.w + 21, 18); ctx.fillRect(b.x - 16, b.y + b.h + 6.5, 14, 15);
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
    ticks.forEach(function (t) { const px = Math.round(plot.X(t.v)) + 0.5; ctx.beginPath(); ctx.moveTo(px, b.y + b.h); ctx.lineTo(px, b.y + b.h + 4); ctx.stroke(); });
    ctx.restore();
    ticks.forEach(function (t) { plot.view.screenText(plot.X(t.v), b.y + b.h + 13, t.label, { size: fs, color: C.muted }); });
  }

  /* Over-paints the y tick labels of a panel (for bar charts whose y is only a lane number). */
  function hideY(plot) {
    const b = plot.box, ctx = plot.view.ctx;
    ctx.save();
    ctx.fillStyle = PHY.colors.bg;
    ctx.fillRect(0, b.y - 8, b.x - 1, b.h + 16);
    ctx.restore();
  }

  function sciTex(x, d) {
    const e = Math.floor(Math.log10(Math.abs(x)) + 1e-12);
    let m = x / Math.pow(10, e);
    const f = Math.pow(10, d === undefined ? 2 : d);
    m = Math.round(m * f) / f;
    return '{' + F.num(m, d === undefined ? 2 : d) + '\\times10^{' + e + '}}';
  }

  PHY.ch08 = {
    BE, EMIN, EMAX, TP, ETH, AY, TN, ANISO, EF, EG, MEANW,
    fTrue, wFlat, shape, maxwell, cosAniso, sourceWeights, makeRun, eventErr, hist, logAxis, ticksX, hideY, pow10, sciTex, hash32,
  };
})();
