/* PHY.ch01: chapter 1 helpers (Monte Carlo basics), loaded before the chapter's sims.
   NA = 6.022×10²³ mol⁻¹, BARN = 10⁻²⁴ cm².
   MATERIALS: Be, Li, LiF, Pb, HDPE with density rho (g/cm³) and molar mass A (g/mol) of one atom, or of one
     formula unit for a compound (LiF: one Li and one F; HDPE: one CH₂ unit). material(key) finds one.
   numberDensity(rho, A)      atoms (or formula units) per cm³: n = ρ N_A / A
   lambdaMm(n, sigmaBarn)     mean free path in mm: λ = 1/(nσ), σ in barn
   depth(lambda, u)           depth of the first interaction for a uniform u in [0, 1): −λ ln(1 − u),
                              the inverse of the cumulative distribution 1 − e^{−x/λ}
   compete(lams, rng)         every process samples its own exponential length; the shortest wins.
                              Returns {len, which}. With Infinity in lams that process never wins.
   gauss(rng), poisson(mu, rng), binomial(n, p, rng)   draws from a uniform source rng() in [0, 1).
                              binomial: exact below n = 1000; above, Poisson for p < 0.05 and np < 500,
                              otherwise the normal approximation (np(1 − p) > 25 there, so it is accurate).
   meanErr(s, s2, n)          {mean, err}: mean and standard error of the mean from per-event sums,
                              the same formula as MeanErr in ldns src/RunAction.cc
   hist(values, count, x0, x1, nb)   counts in nb equal bins of [x0, x1) over the first `count` values;
                              returns {counts, dx, over} (over: values ≥ x1)
   bars(plot, x0, dx, counts, o)     draws a histogram on a PHY.plot panel. o: {color, alpha}
   band(plot, xs, lo, hi, o)  shades the area between two curves. o: {color, alpha}
   mark(view, px, py, text)   a big "?" (or a short text) at CSS pixel (px, py), for a card that waits
   clock(view, text)          a small pill in the top corner
   lamText(mm)                a mean free path as text: mm with sensible digits, m above 1000 mm
   All colors are read from PHY.colors at draw time. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt;
  const NA = 6.02214e23;
  const BARN = 1e-24;

  const MATERIALS = [
    { key: 'Be', name: 'Be', rho: 1.848, A: 9.012, what: 'אטומים' },
    { key: 'Li', name: 'Li', rho: 0.534, A: 6.94, what: 'אטומים' },
    { key: 'LiF', name: 'LiF', rho: 2.635, A: 25.94, what: 'יחידות LiF' },
    { key: 'Pb', name: 'Pb', rho: 11.35, A: 207.2, what: 'אטומים' },
    { key: 'HDPE', name: 'HDPE', rho: 0.95, A: 14.03, what: 'יחידות CH₂' },
  ];
  const material = (key) => MATERIALS.find((m) => m.key === key) || MATERIALS[0];

  const numberDensity = (rho, A) => (rho * NA) / A;
  const lambdaMm = (n, sigmaBarn) => 10 / (n * sigmaBarn * BARN);
  const depth = (lambda, u) => -lambda * Math.log(1 - u);

  function compete(lams, rng) {
    let len = Infinity, which = -1;
    lams.forEach(function (l, i) {
      if (!isFinite(l)) return;
      const d = -l * Math.log(1 - rng());
      if (d < len) { len = d; which = i; }
    });
    return { len, which };
  }

  function gauss(rng) {
    const u1 = rng(), u2 = rng();
    return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
  }

  function poisson(mu, rng) {
    if (mu <= 0) return 0;
    if (mu > 500) return Math.max(0, Math.round(mu + Math.sqrt(mu) * gauss(rng)));
    const u = rng();
    let k = 0, p = Math.exp(-mu), cdf = p;
    while (u > cdf && k < 100000) { k++; p *= mu / k; cdf += p; }
    return k;
  }

  function binomial(n, p, rng) {
    n = Math.round(n);
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    if (n < 1000) {
      let k = 0;
      for (let i = 0; i < n; i++) if (rng() < p) k++;
      return k;
    }
    if (p < 0.05 && n * p < 500) return Math.min(n, poisson(n * p, rng));
    const k = Math.round(n * p + Math.sqrt(n * p * (1 - p)) * gauss(rng));
    return Math.max(0, Math.min(n, k));
  }

  function meanErr(s, s2, n) {
    if (n <= 0) return { mean: 0, err: 0 };
    const m = s / n;
    const v = Math.max(s2 / n - m * m, 0);
    return { mean: m, err: Math.sqrt(v / n) };
  }

  function hist(values, count, x0, x1, nb) {
    const counts = new Array(nb).fill(0);
    const dx = (x1 - x0) / nb;
    let over = 0;
    const n = Math.min(count, values.length);
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v >= x1) { over++; continue; }
      if (v < x0) continue;
      counts[Math.min(nb - 1, Math.floor((v - x0) / dx))]++;
    }
    return { counts, dx, over };
  }

  const colorOf = (c, d) => (c && PHY.colors[c]) || c || PHY.colors[d];

  function bars(plot, x0, dx, counts, o) {
    o = o || {};
    const ctx = plot.view.ctx;
    plot.clip(function () {
      ctx.save();
      ctx.fillStyle = colorOf(o.color, 'neutron');
      ctx.globalAlpha = o.alpha === undefined ? 0.55 : o.alpha;
      const y0 = plot.Y(0);
      for (let i = 0; i < counts.length; i++) {
        if (!counts[i]) continue;
        const xa = plot.X(x0 + i * dx), xb = plot.X(x0 + (i + 1) * dx), y = plot.Y(counts[i]);
        ctx.fillRect(xa + 0.6, y, Math.max(1, xb - xa - 1.2), y0 - y);
      }
      ctx.restore();
    });
  }

  function band(plot, xs, lo, hi, o) {
    o = o || {};
    const ctx = plot.view.ctx;
    if (!xs.length) return;
    plot.clip(function () {
      ctx.save();
      ctx.fillStyle = colorOf(o.color, 'neutron');
      ctx.globalAlpha = o.alpha === undefined ? 0.18 : o.alpha;
      ctx.beginPath();
      for (let i = 0; i < xs.length; i++) {
        const px = plot.X(xs[i]), py = plot.Y(hi[i]);
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(plot.X(xs[i]), plot.Y(lo[i]));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  function mark(view, px, py, text, size) {
    view.screenText(px, py, text || '?', { size: size || 30, weight: 800, color: PHY.colors.muted, halo: true });
  }

  function clock(view, text) {
    view.screenText(view.w - 10, 16, text, { size: 11.5, weight: 600, align: 'right', color: PHY.colors.muted, pill: true });
  }

  function lamText(mm) {
    if (!isFinite(mm)) return '∞';
    if (mm >= 1000) return F.unit(mm / 1000, 'm', 2);
    return F.unit(mm, 'mm', mm < 10 ? 2 : mm < 100 ? 1 : 0);
  }

  PHY.ch01 = { NA, BARN, MATERIALS, material, numberDensity, lambdaMm, depth, compete, gauss, poisson, binomial, meanErr, hist, bars, band, mark, clock, lamText };
})();
