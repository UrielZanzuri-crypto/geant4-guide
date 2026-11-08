/* PHY.pulse: ultrashort-pulse helpers shared by every pulse chapter. Times in fs, angular frequencies in
   rad/fs, spectral-phase coefficients in fs², fs³, fs⁴.

   Convention (the sister sites' pulse convention; keep it everywhere):
     E(t) = Re{ √I(t) · exp(i(ω0 t − φ(t))) }      φ(t) is the temporal phase
     ω_inst(t) = ω0 − dφ/dt                          the instantaneous frequency
     Ẽ(ω) = ∫ E(t) e^{−iωt} dt = √S(ω) · exp(−iφ(ω))  spectrum at +ω0, φ(ω) the spectral phase
     τ_g(ω) = dφ/dω                                    group delay
   A pulse object is {t, re, im, dt, omega0}: the COMPLEX field √I·e^{i(ω0t − φ)} on the centred grid of
   PHY.fft.timeAxis. The real, measurable field is `re`.

   gaussian({t | n & dt, tau, omega0, chirp, phi0, phase, t0, amp})
       tau: intensity FWHM (fs). chirp: dω_inst/dt in rad/fs² (positive = up-chirp, blue at the back),
       that is φ(t) = phi0 − ½·chirp·(t − t0)². phase(t): any extra temporal phase, added to φ.
       omega0 defaults to 0 (envelope only), which needs the fewest samples.
   applySpectralPhase(E, {gdd, tod, fod, phase(dω)}, omega0)
       multiplies Ẽ(ω) by exp(−iφ(ω)), φ(ω) = gdd/2·Δω² + tod/6·Δω³ + fod/24·Δω⁴, Δω = ω − omega0
       (default: E.omega0). Positive GDD gives a positive (up) chirp. Returns a new pulse.
   delay(E, tau)          E(t − tau), done exactly in the frequency domain.
   intensity(E)           Float64Array |E|²
   phase(E, {omega0, threshold})   φ(t) = ω0 t − arg E(t), unwrapped from the peak, NaN where blanked
   instFreq(E, {threshold})        ω_inst(t) = d arg E / dt (rad/fs), NaN where blanked
   spectrum(E, {threshold})        PHY.fft.spectrum of the pulse: {omega, re, im, S, phase}
   fwhm(xs, ys)   rms(xs, ys)   widths(E) -> {tauFwhm, omegaFwhm, nuFwhm, tbp}   tbp(E) = Δν·Δt (FWHM)
   broadenedFwhm(tauIn, gdd) = tauIn·√(1 + (4 ln2·gdd/tauIn²)²)   (a flat-phase Gaussian after GDD)
   TBP_GAUSS = 2 ln2 / π ≈ 0.441 (flat-phase Gaussian, FWHM in time and in ν)
   c = 300 nm/fs (c = 3×10⁸ m/s), omegaOf(nm) = 2πc/λ in rad/fs, lambdaOf(omega) in nm. */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});
  const LN2 = Math.LN2;
  const TAU = Math.PI * 2;
  const C_NM_FS = 300;

  function make(t, re, im, extra) {
    return Object.assign({ t, re, im, dt: t.length > 1 ? t[1] - t[0] : 1, omega0: 0 }, extra || {});
  }

  function gaussian(o) {
    o = o || {};
    const t = o.t ? Float64Array.from(o.t) : PHY.fft.timeAxis(o.n || 1024, o.dt || 0.5);
    const n = t.length;
    const tau = o.tau || 20, w0 = o.omega0 || 0, chirp = o.chirp || 0, phi0 = o.phi0 || 0, t0 = o.t0 || 0;
    const amp = o.amp === undefined ? 1 : o.amp;
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const s = t[i] - t0;
      const a = amp * Math.exp((-2 * LN2 * s * s) / (tau * tau));
      const phi = phi0 - 0.5 * chirp * s * s + (o.phase ? o.phase(t[i]) : 0);
      const P = w0 * t[i] - phi;
      re[i] = a * Math.cos(P);
      im[i] = a * Math.sin(P);
    }
    return make(t, re, im, { omega0: w0 });
  }

  function spectrum(E, o) { return PHY.fft.spectrum(E.re, E.im, E.dt, o); }

  /* Multiplies the spectrum by exp(−i·phi(k)) and returns to the time domain. */
  function filter(E, phiOf) {
    const sp = PHY.fft.spectrum(E.re, E.im, E.dt, { threshold: 0 });
    const n = sp.omega.length;
    const R = sp.re, I = sp.im;
    for (let k = 0; k < n; k++) {
      const p = phiOf(sp.omega[k]);
      if (!p) continue;
      const c = Math.cos(p), s = Math.sin(p);
      const r = R[k], m = I[k];
      R[k] = r * c + m * s;
      I[k] = m * c - r * s;
    }
    const back = PHY.fft.fromSpectrum(R, I, E.dt);
    return make(E.t, back.re, back.im, { omega0: E.omega0 });
  }

  function applySpectralPhase(E, c, omega0) {
    c = c || {};
    const wc = omega0 !== undefined ? omega0 : E.omega0 || 0;
    const gdd = c.gdd || 0, tod = c.tod || 0, fod = c.fod || 0, extra = c.phase;
    return filter(E, function (w) {
      const d = w - wc;
      return (gdd / 2) * d * d + (tod / 6) * d * d * d + (fod / 24) * d * d * d * d + (extra ? extra(d) : 0);
    });
  }

  function delay(E, tau) {
    return filter(E, function (w) { return w * tau; });
  }

  function intensity(E) {
    const n = E.re.length, I = new Float64Array(n);
    for (let i = 0; i < n; i++) I[i] = E.re[i] * E.re[i] + E.im[i] * E.im[i];
    return I;
  }

  function peakOf(I) {
    let max = 0, k = 0;
    for (let i = 0; i < I.length; i++) if (I[i] > max) { max = I[i]; k = i; }
    return { max, k };
  }

  function phase(E, o) {
    o = o || {};
    const w0 = o.omega0 !== undefined ? o.omega0 : E.omega0 || 0;
    const thr = o.threshold === undefined ? 0.01 : o.threshold;
    const I = intensity(E), p = peakOf(I), n = I.length;
    const raw = new Float64Array(n);
    for (let i = 0; i < n; i++) raw[i] = I[i] >= thr * p.max ? Math.atan2(E.im[i], E.re[i]) : NaN;
    const total = PHY.fft.unwrap(raw, p.k);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = isFinite(total[i]) ? w0 * E.t[i] - total[i] : NaN;
    return out;
  }

  /* arg(E[i+1]·E*[i−1]) / 2dt: the local rate of the full phase, with no unwrapping needed. */
  function instFreq(E, o) {
    o = o || {};
    const thr = o.threshold === undefined ? 0.01 : o.threshold;
    const I = intensity(E), p = peakOf(I), n = I.length, dt = E.dt;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (I[i] < thr * p.max) { out[i] = NaN; continue; }
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      const re = E.re[b] * E.re[a] + E.im[b] * E.im[a];
      const im = E.im[b] * E.re[a] - E.re[b] * E.im[a];
      out[i] = Math.atan2(im, re) / ((b - a) * dt);
    }
    return out;
  }

  /* Outermost half-maximum crossings, linearly interpolated. */
  function fwhm(xs, ys) {
    const n = ys.length;
    let max = -Infinity;
    for (let i = 0; i < n; i++) if (ys[i] > max) max = ys[i];
    if (!(max > 0)) return NaN;
    const h = max / 2;
    let i0 = 0;
    while (i0 < n && !(ys[i0] >= h)) i0++;
    let i1 = n - 1;
    while (i1 >= 0 && !(ys[i1] >= h)) i1--;
    if (i0 >= n || i1 < 0) return NaN;
    const left = i0 === 0 ? xs[0] : xs[i0 - 1] + ((h - ys[i0 - 1]) / (ys[i0] - ys[i0 - 1])) * (xs[i0] - xs[i0 - 1]);
    const right = i1 === n - 1 ? xs[n - 1] : xs[i1] + ((ys[i1] - h) / (ys[i1] - ys[i1 + 1])) * (xs[i1 + 1] - xs[i1]);
    return right - left;
  }

  /* Standard deviation of xs weighted by ys. */
  function rms(xs, ys) {
    let s = 0, m = 0;
    for (let i = 0; i < ys.length; i++) if (isFinite(ys[i]) && isFinite(xs[i])) { s += ys[i]; m += xs[i] * ys[i]; }
    if (!s) return NaN;
    m /= s;
    let v = 0;
    for (let i = 0; i < ys.length; i++) if (isFinite(ys[i]) && isFinite(xs[i])) v += (xs[i] - m) * (xs[i] - m) * ys[i];
    return Math.sqrt(v / s);
  }

  function widths(E) {
    const I = intensity(E);
    const sp = spectrum(E, { threshold: 0 });
    const tauFwhm = fwhm(E.t, I);
    const omegaFwhm = fwhm(sp.omega, sp.S);
    const nuFwhm = omegaFwhm / TAU;
    return { tauFwhm, omegaFwhm, nuFwhm, tbp: tauFwhm * nuFwhm };
  }

  const tbp = (E) => widths(E).tbp;
  const broadenedFwhm = (tauIn, gdd) => tauIn * Math.sqrt(1 + Math.pow((4 * LN2 * gdd) / (tauIn * tauIn), 2));
  const omegaOf = (nm) => (TAU * C_NM_FS) / nm;
  const lambdaOf = (omega) => (TAU * C_NM_FS) / omega;

  PHY.pulse = {
    gaussian, applySpectralPhase, delay, intensity, phase, instFreq, spectrum, fwhm, rms, widths, tbp,
    broadenedFwhm, omegaOf, lambdaOf, make,
    TBP_GAUSS: (2 * LN2) / Math.PI, c: C_NM_FS, cSI: 3e8,
  };
})();
