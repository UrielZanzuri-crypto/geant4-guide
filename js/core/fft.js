/* PHY.fft: radix-2 FFT on separate Float64Array re/im (N a power of 2), and the axes that go with it.

   Convention (used across the series):          forward  Ẽ(ω) = ∫ E(t) e^{−iωt} dt,
                                                  inverse  E(t) = (1/2π) ∫ Ẽ(ω) e^{+iωt} dω.
   So a field e^{+iω0 t} has its spectrum at +ω0. Spectral phase: Ẽ(ω) = √S(ω) e^{−iφ(ω)}.

   fft(re, im)            in place, forward (e^{−i}), unscaled. Returns {re, im} (the same arrays).
   ifft(re, im)           in place, inverse (e^{+i}), divides by N.
   fft2(re, im, nx, ny)   in place 2D FFT of row-major data (rows of length nx); ifft2 likewise.
   fftshift(a), ifftshift(a)   NEW arrays with zero frequency moved to / from the middle (numpy semantics).
   fftshift2(a, nx, ny)   2D version, new array.
   timeAxis(N, dt)        t_i = (i − N/2)·dt: the centred grid that spectrum() assumes.
   freqAxis(N, dt)        ω_k = 2π(k − N/2)/(N·dt) after the shift. dt in fs gives rad/fs.
   spectrum(reT, imT, dt, {threshold})  -> {omega, re, im, S, phase}
                          continuous-FT scaling (multiplied by dt), so Parseval reads
                          Σ|E|² dt = Σ S dω / 2π. phase = φ(ω) = −arg Ẽ(ω), unwrapped outward from the
                          spectral peak and NaN where S < threshold·max S (phase blanking; default 1e-3).
   fromSpectrum(reW, imW, dt) -> {re, im}  the inverse of spectrum(): back to the centred time grid.
   unwrap(phases, start)  new Float64Array, NaN-aware, unwrapped outward from index `start` (default: the
                          first finite sample).
   isPow2(n), nextPow2(n) */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});
  const TAU = Math.PI * 2;

  const isPow2 = (n) => n > 0 && (n & (n - 1)) === 0;
  function nextPow2(n) { let p = 1; while (p < n) p <<= 1; return p; }

  /* Twiddle tables, one per N, so every butterfly uses an exact cos/sin. */
  const TABLES = new Map();
  function table(n) {
    let t = TABLES.get(n);
    if (!t) {
      const c = new Float64Array(n / 2), s = new Float64Array(n / 2);
      for (let k = 0; k < n / 2; k++) { c[k] = Math.cos((TAU * k) / n); s[k] = Math.sin((TAU * k) / n); }
      t = { c, s };
      TABLES.set(n, t);
    }
    return t;
  }

  function transform(re, im, inverse) {
    const n = re.length;
    if (!isPow2(n) || im.length !== n) throw new Error('PHY.fft: N must be a power of 2, and re and im the same length');
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    const T = table(n);
    const sign = inverse ? 1 : -1;
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1, step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < half; k++) {
          const wr = T.c[k * step], wi = sign * T.s[k * step];
          const a = i + k, b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
    return { re, im };
  }

  const fft = (re, im) => transform(re, im, false);
  const ifft = (re, im) => transform(re, im, true);

  function transform2(re, im, nx, ny, inverse) {
    if (re.length !== nx * ny || im.length !== nx * ny) throw new Error('PHY.fft.fft2: length must be nx·ny');
    const rr = new Float64Array(nx), ri = new Float64Array(nx);
    for (let j = 0; j < ny; j++) {
      const o = j * nx;
      for (let i = 0; i < nx; i++) { rr[i] = re[o + i]; ri[i] = im[o + i]; }
      transform(rr, ri, inverse);
      for (let i = 0; i < nx; i++) { re[o + i] = rr[i]; im[o + i] = ri[i]; }
    }
    const cr = new Float64Array(ny), ci = new Float64Array(ny);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) { cr[j] = re[j * nx + i]; ci[j] = im[j * nx + i]; }
      transform(cr, ci, inverse);
      for (let j = 0; j < ny; j++) { re[j * nx + i] = cr[j]; im[j * nx + i] = ci[j]; }
    }
    return { re, im };
  }
  const fft2 = (re, im, nx, ny) => transform2(re, im, nx, ny, false);
  const ifft2 = (re, im, nx, ny) => transform2(re, im, nx, ny, true);

  /* numpy: fftshift = roll by floor(N/2); ifftshift = roll by −floor(N/2). New arrays of the same type. */
  function roll(a, s) {
    const n = a.length;
    const out = new (a.constructor === Array ? Array : a.constructor)(n);
    for (let i = 0; i < n; i++) out[(((i + s) % n) + n) % n] = a[i];
    return out;
  }
  const fftshift = (a) => roll(a, Math.floor(a.length / 2));
  const ifftshift = (a) => roll(a, -Math.floor(a.length / 2));

  function fftshift2(a, nx, ny) {
    const out = new (a.constructor === Array ? Array : a.constructor)(nx * ny);
    const sx = Math.floor(nx / 2), sy = Math.floor(ny / 2);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out[((j + sy) % ny) * nx + ((i + sx) % nx)] = a[j * nx + i];
    return out;
  }

  function timeAxis(n, dt) {
    const t = new Float64Array(n), h = Math.floor(n / 2);
    for (let i = 0; i < n; i++) t[i] = (i - h) * dt;
    return t;
  }

  function freqAxis(n, dt) {
    const w = new Float64Array(n), h = Math.floor(n / 2), dw = TAU / (n * dt);
    for (let k = 0; k < n; k++) w[k] = (k - h) * dw;
    return w;
  }

  /* NaN-aware unwrap, outward from `start` in both directions. */
  function unwrap(ph, start) {
    const n = ph.length;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = ph[i];
    let s = start;
    if (s === undefined || !isFinite(ph[s])) {
      s = -1;
      for (let i = 0; i < n; i++) if (isFinite(ph[i])) { s = i; break; }
      if (s < 0) return out;
    }
    const walk = function (from, dir) {
      let last = out[from];
      for (let i = from + dir; i >= 0 && i < n; i += dir) {
        const v = ph[i];
        if (!isFinite(v)) { out[i] = NaN; continue; }
        const d = v - last;
        out[i] = v - TAU * Math.round(d / TAU);
        last = out[i];
      }
    };
    walk(s, 1);
    walk(s, -1);
    return out;
  }

  function spectrum(reT, imT, dt, o) {
    o = o || {};
    const n = reT.length;
    const thr = o.threshold === undefined ? 1e-3 : o.threshold;
    const re = Float64Array.from(ifftshift(reT));
    const im = Float64Array.from(ifftshift(imT || new Float64Array(n)));
    transform(re, im, false);
    const R = fftshift(re), I = fftshift(im);
    const S = new Float64Array(n);
    let max = 0, peak = 0;
    for (let k = 0; k < n; k++) {
      R[k] *= dt; I[k] *= dt;
      S[k] = R[k] * R[k] + I[k] * I[k];
      if (S[k] > max) { max = S[k]; peak = k; }
    }
    const raw = new Float64Array(n);
    for (let k = 0; k < n; k++) raw[k] = S[k] >= thr * max && max > 0 ? -Math.atan2(I[k], R[k]) : NaN;
    return { omega: freqAxis(n, dt), re: R, im: I, S, phase: unwrap(raw, peak) };
  }

  function fromSpectrum(reW, imW, dt) {
    const re = Float64Array.from(ifftshift(reW));
    const im = Float64Array.from(ifftshift(imW));
    transform(re, im, true);
    const R = fftshift(re), I = fftshift(im);
    for (let i = 0; i < R.length; i++) { R[i] /= dt; I[i] /= dt; }
    return { re: R, im: I };
  }

  PHY.fft = { fft, ifft, fft2, ifft2, fftshift, ifftshift, fftshift2, timeAxis, freqAxis, spectrum, fromSpectrum, unwrap, isPow2, nextPow2 };
})();
