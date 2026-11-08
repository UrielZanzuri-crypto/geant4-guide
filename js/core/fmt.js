/* PHY.fmt: RTL-safe numbers and SI units for optics.

   num(x, digits)          "3.14", negatives as LRM + "−3.1" so they never flip into "3.1−" inside Hebrew
   unit(x, u, digits)      "375 THz" wrapped in an LTR isolate (U+2066 … U+2069), so the whole thing stays
                           in one piece inside Hebrew text. u is a key of UNITS ('um-1' → "µm⁻¹") or any
                           string. A Hebrew unit name gets an RTL isolate instead, so "45 מעלות" reads right.
   deg(x, digits)          "45°" in an LTR isolate
   sci(x, digits, u)       "3.0×10⁸" (digits = decimals of the mantissa, default 1), optional unit after it
   prefix(x, base, sig)    picks an SI prefix: prefix(1.2e-13, 's') → "120 fs". sig = significant digits (3)
   auto(x, u, digits)      unit() for ordinary sizes, sci() for |x| ≥ 1e5 or < 1e-3
   parse(str)              accepts "1,5", "−3", "3e8", "3×10^8"; returns NaN when it cannot parse
   ltr(str), rtl(str)      wrap a mixed string in an LTR / RTL isolate. A Latin formula inside a Hebrew
                           canvas label needs it: 'גל במים: ' + F.ltr('λ = 3.2 m, T = 1.6 s')
   plain(str)              strips the bidi marks, for comparing strings in tests (never for display)
   unitName(u)             the display name of a unit key
   Numbers on canvas and in the DOM always go through these, never through toFixed. */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});
  const LRM = '‎';
  const LRI = '⁦';
  const RLI = '⁧';
  const PDI = '⁩';
  const NBSP = ' ';
  const MINUS = '−';
  const HEBREW = /[֐-׿]/;

  /* Latin SI symbols. Keys are easy to type ('um' for µm); any other string is shown as is. */
  const UNITS = {
    m: 'm', km: 'km', cm: 'cm', mm: 'mm', um: 'µm', 'µm': 'µm', nm: 'nm', pm: 'pm',
    s: 's', ms: 'ms', us: 'µs', 'µs': 'µs', ns: 'ns', ps: 'ps', fs: 'fs', as: 'as',
    Hz: 'Hz', kHz: 'kHz', MHz: 'MHz', GHz: 'GHz', THz: 'THz', PHz: 'PHz',
    rad: 'rad', deg: '°', '°': '°', sr: 'sr',
    eV: 'eV', meV: 'meV', J: 'J', mJ: 'mJ', uJ: 'µJ', 'µJ': 'µJ', nJ: 'nJ', pJ: 'pJ', fJ: 'fJ',
    W: 'W', mW: 'mW', uW: 'µW', 'µW': 'µW', kW: 'kW', MW: 'MW', GW: 'GW', TW: 'TW', PW: 'PW',
    'W/cm2': 'W/cm²', 'W/m2': 'W/m²', 'mW/mm2': 'mW/mm²', 'V/m': 'V/m', T: 'T',
    fs2: 'fs²', fs3: 'fs³', fs4: 'fs⁴', ps2: 'ps²',
    'fs2/mm': 'fs²/mm', 'fs/mm': 'fs/mm', 'ps/nm/km': 'ps/(nm·km)',
    'cm-1': 'cm⁻¹', 'm-1': 'm⁻¹', 'mm-1': 'mm⁻¹', 'um-1': 'µm⁻¹', 'µm-1': 'µm⁻¹', 'nm-1': 'nm⁻¹', 'fs-1': 'fs⁻¹',
    'rad/s': 'rad/s', 'rad/fs': 'rad/fs', 'rad/fs2': 'rad/fs²', 'rad/um': 'rad/µm', 'rad/m': 'rad/m',
    'm/s': 'm/s', 'um/fs': 'µm/fs', 'nm/mm': 'nm/mm', 'lines/mm': 'lines/mm', D: 'D', dB: 'dB', K: 'K',
  };

  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
  const sup = (n) => String(n).split('').map((ch) => SUP[ch] || ch).join('');

  function unitName(u) {
    if (u === undefined || u === null) return '';
    return UNITS[u] !== undefined ? UNITS[u] : String(u);
  }

  /* An isolate that keeps "number unit" together. Hebrew names read right to left, Latin left to right. */
  function iso(body, name) {
    return (HEBREW.test(name || '') ? RLI : LRI) + body + PDI;
  }

  function num(x, digits) {
    if (digits === undefined) digits = 2;
    if (typeof x !== 'number' || !isFinite(x)) return '–';
    const factor = Math.pow(10, digits);
    const r = Math.round(Math.abs(x) * factor + 1e-9) / factor;
    const neg = x < 0 && r !== 0;
    let s = r.toFixed(digits);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return neg ? LRM + MINUS + s : s;
  }

  function unit(x, u, digits) {
    const name = unitName(u);
    if (name === '°') return LRI + num(x, digits === undefined ? 0 : digits) + '°' + PDI;
    const body = name ? num(x, digits) + NBSP + name : num(x, digits);
    return iso(body, name);
  }

  function deg(x, digits) {
    return LRI + num(x, digits === undefined ? 0 : digits) + '°' + PDI;
  }

  /* Mantissa and exponent with the mantissa rounded to `digits` decimals, renormalised if it rounds to 10. */
  function split(x, digits) {
    let e = Math.floor(Math.log10(Math.abs(x)));
    let m = Math.abs(x) / Math.pow(10, e);
    const f = Math.pow(10, digits);
    let r = Math.round(m * f + 1e-9) / f;
    if (r >= 10) { e += 1; r = Math.round((m / 10) * f + 1e-9) / f; }
    return { m: r, e: e };
  }

  function sci(x, digits, u) {
    if (digits === undefined) digits = 1;
    const name = unitName(u);
    const tail = name ? NBSP + name : '';
    if (typeof x !== 'number' || !isFinite(x)) return '–';
    if (x === 0) return iso('0' + tail, name);
    const p = split(x, digits);
    const mant = (x < 0 ? MINUS : '') + p.m.toFixed(digits);
    const body = p.e === 0 ? mant : mant + '×10' + sup(p.e);
    return iso(body + tail, name);
  }

  const PREFIXES = [[-18, 'a'], [-15, 'f'], [-12, 'p'], [-9, 'n'], [-6, 'µ'], [-3, 'm'], [0, ''], [3, 'k'], [6, 'M'], [9, 'G'], [12, 'T'], [15, 'P'], [18, 'E']];

  function prefix(x, base, sig) {
    if (sig === undefined) sig = 3;
    base = base === undefined ? '' : String(base);
    if (typeof x !== 'number' || !isFinite(x)) return '–';
    if (x === 0) return iso('0' + (base ? NBSP + base : ''), base);
    let e3 = Math.floor(Math.log10(Math.abs(x)) / 3) * 3;
    e3 = Math.max(-18, Math.min(18, e3));
    let m = x / Math.pow(10, e3);
    let dec = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(m))));
    let r = Math.round(Math.abs(m) * Math.pow(10, dec)) / Math.pow(10, dec);
    if (r >= 1000 && e3 < 18) {
      e3 += 3;
      m /= 1000;
      dec = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(m))));
    }
    const p = PREFIXES.find((q) => q[0] === e3)[1];
    return iso(num(m, dec) + NBSP + p + base, base);
  }

  function auto(x, u, digits) {
    if (typeof x === 'number' && x !== 0 && isFinite(x) && (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3)) return sci(x, 2, u);
    return unit(x, u, digits);
  }

  const ltr = (s) => LRI + s + PDI;
  const rtl = (s) => RLI + s + PDI;

  function plain(str) {
    return String(str).replace(/[‎‏⁦-⁩]/g, '').replace(/ /g, ' ');
  }

  /* Accepts Hebrew/European decimal comma, the Unicode minus and scientific notation. NaN when unparsable. */
  function parse(str) {
    if (typeof str === 'number') return str;
    const clean = String(str)
      .replace(/[‎‏⁦-⁩\s ]/g, '')
      .replace(/−/g, '-')
      .replace(',', '.')
      .replace(/(?:[×xX*]|·)10\^?/g, 'e');
    if (clean === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(clean)) return NaN;
    return parseFloat(clean);
  }

  PHY.fmt = { num, unit, unitName, deg, sci, prefix, auto, parse, plain, ltr, rtl, sup, UNITS, LRM, LRI, RLI, PDI, NBSP, MINUS };
})();
