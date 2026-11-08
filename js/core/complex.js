/* PHY.cx: small immutable complex numbers {re, im}. Every function returns a new object and never
   changes its arguments. A plain number is accepted wherever a complex one is (it is read as re).
   Angles are in RADIANS here (PHY.vec uses degrees).

   const C = PHY.cx;
   const z = C.cx(1, 2);                     // 1 + 2i
   C.add(a, b)  C.sub(a, b)  C.mul(a, b)  C.div(a, b)  C.scale(z, k)  C.neg(z)  C.inv(z)
   C.conj(z)  C.abs(z)  C.abs2(z)  C.arg(z)  C.exp(z)  C.polar(r, theta)  C.expi(theta)
   C.sum([a, b, c])  C.eq(a, b, eps)  C.format(z, digits) -> "1 + 2i" (LTR isolate)
   C.ZERO  C.ONE  C.I
   For arrays of thousands of samples use separate Float64Array re/im (as PHY.fft does), not these objects. */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});

  const cx = (re, im) => ({ re: +re || 0, im: +im || 0 });
  const lift = (z) => (typeof z === 'number' ? { re: z, im: 0 } : z);

  function add(a, b) { a = lift(a); b = lift(b); return cx(a.re + b.re, a.im + b.im); }
  function sub(a, b) { a = lift(a); b = lift(b); return cx(a.re - b.re, a.im - b.im); }
  function mul(a, b) { a = lift(a); b = lift(b); return cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function div(a, b) {
    a = lift(a); b = lift(b);
    const d = b.re * b.re + b.im * b.im;
    return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  }
  function scale(z, k) { z = lift(z); return cx(z.re * k, z.im * k); }
  function neg(z) { z = lift(z); return cx(-z.re, -z.im); }
  function conj(z) { z = lift(z); return cx(z.re, -z.im); }
  function inv(z) { return div(1, z); }
  function abs(z) { z = lift(z); return Math.hypot(z.re, z.im); }
  function abs2(z) { z = lift(z); return z.re * z.re + z.im * z.im; }
  function arg(z) { z = lift(z); return Math.atan2(z.im, z.re); }
  /* e^(a + ib) = e^a (cos b + i sin b) */
  function exp(z) { z = lift(z); const r = Math.exp(z.re); return cx(r * Math.cos(z.im), r * Math.sin(z.im)); }
  function polar(r, theta) { return cx(r * Math.cos(theta), r * Math.sin(theta)); }
  function expi(theta) { return polar(1, theta); }
  function sum(list) { return list.reduce(function (s, z) { return add(s, z); }, cx(0, 0)); }
  function eq(a, b, eps) { return abs(sub(a, b)) <= (eps === undefined ? 1e-9 : eps); }

  function format(z, digits) {
    z = lift(z);
    const F = PHY.fmt;
    const d = digits === undefined ? 2 : digits;
    const re = F ? F.num(z.re, d) : String(z.re);
    const im = F ? F.num(Math.abs(z.im), d) : String(Math.abs(z.im));
    return '⁦' + re + (z.im < 0 ? ' − ' : ' + ') + im + 'i' + '⁩';
  }

  PHY.cx = {
    cx, add, sub, mul, div, scale, neg, conj, inv, abs, abs2, arg, exp, polar, expi, sum, eq, format,
    ZERO: cx(0, 0), ONE: cx(1, 0), I: cx(0, 1),
  };
})();
