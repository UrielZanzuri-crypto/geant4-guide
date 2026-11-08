/* PHY.ch05: chapter 5 helpers (the source: spectrum, cone and weights), loaded before the chapter's sims.
   Needs PHY.ch01 (ch01/kit.js) for binomial, poisson, hist, bars, mark, clock, meanErr.

   The spectrum. The HERMIONE file of the 30 J, M² = 2.5 run (data/E30J_M2_2.5_d10um_L0.012um_spectrum.txt)
   follows f(E) = A e^{−√(2E/T)} / √(2ET) with T = 0.782 MeV (the header line; checked against the file to
   0.1 %). A is fixed so that ∫ f dE from 1.85 to 13 MeV is 1.16541×10¹² protons/sr, the value the run
   printed; with it the chapter's own numbers come out: N_shot = 4.42×10¹¹ in 20°, 1.28×10¹² above
   0.5 MeV, ⟨E⟩ = 3.94 MeV. A different T (playground) keeps A: a toy spectrum.
   spec(E, T)                f(E) in protons/MeV/sr, zero above the cut-off is the caller's business
   table(Emin, Emax, T, n)   {E, f, cdf, I}: n+1 points, trapezoid cumulative, I = ∫f
   sampleAnalog(tab, u)      inverse of the cumulative (linear inside a bin)
   weightFlat(tab, E)        w = f(E)(Emax − Emin)/∫f, the ldns flat weight (mean 1)
   omega(deg), nShot(Emin, Emax, deg, T), meanE(Emin, Emax, T)
   cosUniform(u, deg), thetaUniform(u, deg): cos θ of a direction in the cone, the right and the wrong way
   Toy yield (schematic, calibrated): a thick-target yield per proton of initial energy E₀,
   Y(E₀) = c ∫_{2.06}^{E₀} (E − 2.06)^1.75 e^{−0.12 E} dE, with c set so that the spectrum-averaged yield over
   1.85-13 MeV is 4.47×10⁻⁴ (the run). With this shape 56 % of the reactions happen above 6 MeV
   (the run: 57 %) and 17 % above 9 MeV (18 %). yieldAt(E0) uses a table. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const T0 = 0.782, I0 = 1.16541e12, EMIN0 = 1.85, EMAX0 = 13;

  const shape = (E, T) => (E > 0 ? Math.exp(-Math.sqrt((2 * E) / T)) / Math.sqrt(2 * E * T) : 0);
  function integ(fn, a, b, n) {
    n = n || 2000;
    const h = (b - a) / n;
    let s = 0.5 * (fn(a) + fn(b));
    for (let i = 1; i < n; i++) s += fn(a + i * h);
    return s * h;
  }
  const A = I0 / integ((E) => shape(E, T0), EMIN0, EMAX0, 20000);
  const spec = (E, T) => A * shape(E, T === undefined ? T0 : T);

  function table(Emin, Emax, T, n) {
    n = n || 1200;
    const E = new Float64Array(n + 1), f = new Float64Array(n + 1), cdf = new Float64Array(n + 1);
    const h = (Emax - Emin) / n;
    for (let i = 0; i <= n; i++) { E[i] = Emin + i * h; f[i] = spec(E[i], T); }
    for (let i = 1; i <= n; i++) cdf[i] = cdf[i - 1] + 0.5 * (f[i] + f[i - 1]) * h;
    return { E, f, cdf, I: cdf[n], Emin, Emax, T: T === undefined ? T0 : T, n, h };
  }
  function sampleAnalog(tab, u) {
    const target = u * tab.I;
    let lo = 0, hi = tab.n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab.cdf[m] < target) lo = m; else hi = m; }
    const seg = tab.cdf[hi] - tab.cdf[lo];
    return tab.E[lo] + (seg > 0 ? (target - tab.cdf[lo]) / seg : 0.5) * tab.h;
  }
  const weightFlat = (tab, E) => (spec(E, tab.T) * (tab.Emax - tab.Emin)) / tab.I;

  const omega = (deg) => 2 * Math.PI * (1 - Math.cos((deg * Math.PI) / 180));
  const nShot = (Emin, Emax, deg, T) => omega(deg) * integ((E) => spec(E, T), Emin, Emax, 4000);
  const meanE = (Emin, Emax, T) => integ((E) => E * spec(E, T), Emin, Emax, 4000) / integ((E) => spec(E, T), Emin, Emax, 4000);
  const cosUniform = (u, deg) => 1 - u * (1 - Math.cos((deg * Math.PI) / 180));
  const thetaUniform = (u, deg) => Math.cos((u * deg * Math.PI) / 180);

  /* toy thick-target yield */
  const ETH = 2.06, YN = 1100;
  const g = (E) => (E > ETH ? Math.pow(E - ETH, 1.75) * Math.exp(-0.12 * E) : 0);
  const YE = new Float64Array(YN + 1), YV = new Float64Array(YN + 1);
  (function () {
    const h = (EMAX0 - EMIN0) / YN;
    for (let i = 0; i <= YN; i++) YE[i] = EMIN0 + i * h;
    for (let i = 1; i <= YN; i++) YV[i] = YV[i - 1] + 0.5 * (g(YE[i]) + g(YE[i - 1])) * h;
  })();
  function rawY(E0) {
    if (E0 <= EMIN0) return 0;
    if (E0 >= EMAX0) return YV[YN];
    const x = ((E0 - EMIN0) / (EMAX0 - EMIN0)) * YN, i = Math.floor(x), t = x - i;
    return YV[i] + t * (YV[i + 1] - YV[i]);
  }
  const C = 4.47e-4 / (integ((E) => spec(E) * rawY(E), EMIN0, EMAX0, 6000) / I0);
  const yieldAt = (E0) => C * rawY(E0);
  /* share of the reactions (by proton energy AT the reaction) above Ex, over the spectrum Emin-Emax */
  function reactionShareAbove(Ex, Emin, Emax) {
    const tab = table(Emin, Emax, T0, 1500);
    const pass = (E) => { /* protons whose initial energy is above E */
      if (E <= Emin) return tab.I;
      let s = 0;
      for (let i = 1; i <= tab.n; i++) if (tab.E[i] > E) s += 0.5 * (tab.f[i] + tab.f[i - 1]) * tab.h;
      return s;
    };
    const num = integ((E) => g(E) * pass(E), Math.max(Ex, ETH), Emax, 300);
    const den = integ((E) => g(E) * pass(E), ETH, Emax, 300);
    return num / den;
  }


  /* A toy run of N protons, binned in energy (nb bins): how many protons fall in each bin (a multinomial
     draw), how many neutrons each bin gives (binomial with the toy yield), and the estimate with its error
     from the event-by-event spread (PHY.ch01.meanErr logic: x_i = w_i k_i, k_i 0 or 1).
     mode 'analog': E from f between Emin and Emax, w = 1. mode 'flat': E uniform, w = f(E)(Emax − Emin)/∫f.
     Returns {N, k (neutron rows), sumW, mean (per proton fired), err, perShot, errShot, nShot, fired: counts}. */
  function toyRun(mode, N, rng, o) {
    o = o || {};
    const K = PHY.ch01;
    const Emin = o.Emin === undefined ? EMIN0 : o.Emin, Emax = o.Emax === undefined ? EMAX0 : o.Emax, deg = o.deg || 20;
    const nb = o.nb || 220;
    const tab = table(Emin, Emax, T0, nb * 4);
    const h = (Emax - Emin) / nb;
    const fired = new Array(nb).fill(0);
    let left = N, pLeft = 1, k = 0, s1 = 0, s2 = 0;
    for (let j = 0; j < nb; j++) {
      const a = Emin + j * h, b = a + h, mid = a + h / 2;
      let p;
      if (mode === 'flat') p = 1 / nb;
      else p = integ((E) => spec(E), a, b, 8) / tab.I;
      const n = j === nb - 1 ? left : K.binomial(left, Math.min(1, p / Math.max(pLeft, 1e-12)), rng);
      left -= n; pLeft -= p;
      fired[j] = n;
      const kj = K.binomial(n, Math.min(1, yieldAt(mid)), rng);
      const w = mode === 'flat' ? weightFlat(tab, mid) : 1;
      k += kj; s1 += w * kj; s2 += w * w * kj;
    }
    const mean = s1 / N;
    const err = Math.sqrt(Math.max(s2 / N - mean * mean, 0) / N);
    const ns = nShot(Emin, Emax, deg);
    return { N, k, sumW: s1, mean, err, perShot: mean * ns, errShot: err * ns, nShot: ns, fired, Emin, Emax, h };
  }


  /* Axes of a PHY.plot panel without x tick labels (for category columns): the frame, y ticks and the y label. */
  function yAxisOnly(P) {
    const PL = PHY.plot, C = PHY.colors, view = P.view, ctx = view.ctx, b = P.box, r = P.range, o = P.opts;
    const st = PL.niceStep(r.y[1] - r.y[0], Math.max(2, Math.floor(b.h / 42)));
    const d = PL.decimalsFor(st);
    ctx.save(); ctx.lineWidth = 1;
    for (let j = Math.ceil(r.y[0] / st - 1e-9); j * st <= r.y[1] + 1e-9 * st; j++) {
      const v = j * st, py = Math.round(P.Y(v)) + 0.5;
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(b.x, py); ctx.lineTo(b.x + b.w, py); ctx.stroke();
      view.screenText(b.x - 5, py, PHY.fmt.num(v, d), { size: b.small ? 10.5 : 11.5, color: o.yColor ? PL.color(o.yColor) : C.muted, align: 'right' });
    }
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
    ctx.restore();
    if (o.yLabel) view.screenText(b.x - b.m.l + 4, b.outer.y + 12, o.yLabel, { size: b.small ? 11 : 12, weight: 700, color: o.yColor ? PL.color(o.yColor) : C.ink, align: 'left' });
  }

  PHY.ch05 = { T0, I0, EMIN0, EMAX0, A, spec, integ, table, sampleAnalog, weightFlat, omega, nShot, meanE, cosUniform, thetaUniform, yieldAt, reactionShareAbove, toyRun, yAxisOnly };
})();
