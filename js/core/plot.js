/* PHY.plot: data plots with independent x and y scales, on top of PHY.canvas. Loaded before canvas.js,
   so PHY.canvas and PHY.colors are used only at call and draw time.

   const P = PHY.plot.create(canvasEl, {x: [-50, 50], y: [0, 1], xLabel: 't', xUnit: 'fs', yLabel: 'I(t)',
       y2: [-10, 10], y2Label: 'φ(t)', y2Unit: 'rad', yColor: 'gamma', y2Color: 'volume',
       aspect: 16 / 9, minHeight: 220, maxHeight: 420, grid: true, margin: {l, r, t, b}});
   Several plots can share one canvas: PHY.plot.panel(view, {rect: {x: 0, y: 0.5, w: 1, h: 0.5}, ...})
   (rect is a fraction of the canvas, y measured down from the top).

   Drawing (call inside the sim's render): P.clear(); P.axes(); P.line(xs, ys, {color: 'neutron'}) ...
     line(xs, ys | fn, {color, width, dash, alpha, axis: 'y'|'y2'})   NaN breaks the line (blanked phase)
     fill(xs, ys, {color, alpha, base, axis})       area between the curve and `base` (0 or the axis)
     marker(x, y, {color, r, shape: 'dot'|'ring'|'cross'|'diamond', axis, label})
     text(x, y, str, {offset, size, weight, color, align, axis, halo})
     vline(x, {color, dash, width, label, labelAt: 'top'|'bottom'}), hline(y, {..., axis})
     heatmap(z, {x: [x0, x1], y: [y0, y1], cmap: 'viridis'|'inferno'|'grey'|'spectral', log, decades, min, max, smooth})
         z: array of rows (z[j][i], row j at y0 + j·dy) or {nx, ny, data} row-major
     legend([{label, color, dash}], {corner: 'right'|'left'})
     clip(fn)   setRange({x, y, y2})   X(v) Y(v) Y2(v): data to CSS pixels   toData(px, py)
     box: the inner plot rectangle in CSS pixels   pxDist(a, b): pixel distance between data points
     drag({hit(d), start(h, d), move(h, d), end(h, d)}) and onTap(fn(d)) in data coordinates
       (d = {x, y, y2, px, py, inside}); return null from hit when the pointer misses: the page keeps scrolling.
     view: the underlying PHY.canvas view (for SimLoop and for world-coordinate drawing)
   Colors may be PHY.colors keys ('proton', 'neutron', 'gamma', 'electron', 'volume', 'muted', ...), resolved
   at draw time, or any CSS color.

   PHY.plot.wavelengthColor(nm, {raw, theme}) -> 'rgb(r, g, b)' for 380-780 nm, adjusted to stay legible on
       the current theme (raw: true gives the unadjusted color). Below 380 nm violet-grey, above 780 nm dark red.
   PHY.plot.cmap(name)(t) -> CSS color for t in [0, 1]; cmap(name).rgb(t) -> [r, g, b].
   PHY.plot.niceStep(span, count), niceRange(lo, hi). */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});
  const FONT = 'Heebo, Rubik, system-ui, sans-serif';

  const col = (c, fallback) => {
    if (!c) return (PHY.colors && PHY.colors[fallback]) || fallback;
    return (PHY.colors && PHY.colors[c]) || c;
  };

  function niceStep(span, count) {
    const raw = Math.abs(span) / (count || 5) || 1;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function niceRange(lo, hi, count) {
    const step = niceStep(hi - lo, count || 5);
    return [Math.floor(lo / step + 1e-9) * step, Math.ceil(hi / step - 1e-9) * step];
  }
  function decimalsFor(step) {
    let d = 0;
    while (d < 6 && Math.abs(Math.round(step * Math.pow(10, d)) - step * Math.pow(10, d)) > 1e-6) d++;
    return d;
  }

  /* ---------- color maps ---------- */
  const STOPS = {
    viridis: [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89], [253, 231, 37]],
    inferno: [[0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106], [186, 54, 85], [227, 89, 51], [249, 140, 10], [249, 201, 50], [252, 255, 164]],
    grey: [[0, 0, 0], [255, 255, 255]],
  };
  const LUTS = {};
  function lut(name) {
    if (LUTS[name]) return LUTS[name];
    const L = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let rgb;
      if (name === 'spectral') rgb = waveRGB(400 + 300 * t, true);
      else {
        const s = STOPS[name] || STOPS.viridis;
        const x = t * (s.length - 1), k = Math.min(s.length - 2, Math.floor(x)), f = x - k;
        rgb = [0, 1, 2].map((c) => s[k][c] + (s[k + 1][c] - s[k][c]) * f);
      }
      L[i * 3] = rgb[0]; L[i * 3 + 1] = rgb[1]; L[i * 3 + 2] = rgb[2];
    }
    LUTS[name] = L;
    return L;
  }
  function cmap(name) {
    const L = lut(name || 'viridis');
    const rgb = (t) => {
      const i = Math.max(0, Math.min(255, Math.round((isFinite(t) ? t : 0) * 255))) * 3;
      return [L[i], L[i + 1], L[i + 2]];
    };
    const f = (t) => { const c = rgb(t); return 'rgb(' + c[0] + ', ' + c[1] + ', ' + c[2] + ')'; };
    f.rgb = rgb;
    return f;
  }

  /* ---------- wavelength to color ---------- */
  /* Hue after Bruton's piecewise model, gamma 0.8, a gentle fall-off at the ends of the visible range. */
  function brutonRGB(nm) {
    let r = 0, g = 0, b = 0;
    if (nm < 380) return [0.47, 0.4, 0.6];
    if (nm > 780) return [0.55, 0.08, 0.08];
    if (nm < 440) { r = (440 - nm) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
    else r = 1;
    let f = 1;
    if (nm < 420) f = 0.45 + (0.55 * (nm - 380)) / 40;
    else if (nm > 700) f = 0.45 + (0.55 * (780 - nm)) / 80;
    const gm = (c) => (c <= 0 ? 0 : Math.pow(c * f, 0.8));
    return [gm(r), gm(g), gm(b)];
  }
  const lin = (c) => Math.pow(c, 2.2);
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);

  /* Light theme: no brighter than luminance 0.28 (readable on white). Dark theme: at least 0.16. */
  function legible(c, theme) {
    const Y = lum(c);
    if (theme === 'dark') {
      if (Y >= 0.16) return c;
      let lo = 0, hi = 1;
      for (let i = 0; i < 18; i++) {
        const m = (lo + hi) / 2;
        if (lum(c.map((v) => v + (1 - v) * m)) < 0.16) lo = m; else hi = m;
      }
      return c.map((v) => v + (1 - v) * hi);
    }
    if (Y <= 0.28) return c;
    const s = Math.pow(0.28 / Y, 1 / 2.2);
    return c.map((v) => v * s);
  }
  function waveRGB(nm, raw, theme) {
    let c = brutonRGB(nm);
    if (!raw) {
      const th = theme || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'light';
      c = legible(c, th);
    }
    return c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255));
  }
  function wavelengthColor(nm, o) {
    o = o || {};
    const c = waveRGB(nm, !!o.raw, o.theme);
    return 'rgb(' + c[0] + ', ' + c[1] + ', ' + c[2] + ')';
  }
  wavelengthColor.rgb = (nm, o) => waveRGB(nm, !!(o && o.raw), o && o.theme);

  /* ---------- plot panel ---------- */
  function panel(view, o) {
    o = Object.assign({ x: [0, 1], y: [0, 1], grid: true }, o || {});
    const R = { x: o.x.slice(), y: o.y.slice(), y2: o.y2 ? o.y2.slice() : null };
    const ctx = view.ctx;
    let img = null;

    function outer() {
      const r = o.rect || { x: 0, y: 0, w: 1, h: 1 };
      return { x: r.x * view.w, y: r.y * view.h, w: r.w * view.w, h: r.h * view.h };
    }
    let cache = null, cw = -1, chh = -1;
    function layout() {
      if (cache && cw === view.w && chh === view.h) return cache;
      cw = view.w; chh = view.h;
      const ob = outer();
      const small = ob.w < 420;
      const m = Object.assign({
        l: small ? 38 : 46,
        r: R.y2 ? (small ? 38 : 46) : 14,
        t: o.yLabel || o.y2Label ? 24 : 10,
        b: o.xLabel ? 38 : 24,
      }, o.margin || {});
      cache = { x: ob.x + m.l, y: ob.y + m.t, w: Math.max(10, ob.w - m.l - m.r), h: Math.max(10, ob.h - m.t - m.b), m, small, outer: ob };
      return cache;
    }

    const P = {
      view, opts: o,
      get box() { return layout(); },
      get range() { return { x: R.x.slice(), y: R.y.slice(), y2: R.y2 ? R.y2.slice() : null }; },
      setRect(r) { o.rect = r; cache = null; return P; },
      setRange(r) {
        if (r.x) R.x = r.x.slice();
        if (r.y) R.y = r.y.slice();
        if (r.y2) R.y2 = r.y2.slice();
        cache = null;
        return P;
      },
      X(v) { const b = layout(); return b.x + ((v - R.x[0]) / (R.x[1] - R.x[0] || 1)) * b.w; },
      Y(v) { const b = layout(); return b.y + b.h - ((v - R.y[0]) / (R.y[1] - R.y[0] || 1)) * b.h; },
      Y2(v) { const r = R.y2 || R.y; const b = layout(); return b.y + b.h - ((v - r[0]) / (r[1] - r[0] || 1)) * b.h; },
      toData(px, py) {
        const b = layout();
        const fx = (px - b.x) / b.w, fy = (b.y + b.h - py) / b.h;
        const r2 = R.y2 || R.y;
        return {
          x: R.x[0] + fx * (R.x[1] - R.x[0]), y: R.y[0] + fy * (R.y[1] - R.y[0]), y2: r2[0] + fy * (r2[1] - r2[0]),
          px, py, inside: fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1,
        };
      },
      pxDist(a, b) {
        const ya = a.axis === 'y2' ? P.Y2(a.y) : P.Y(a.y), yb = b.axis === 'y2' ? P.Y2(b.y) : P.Y(b.y);
        return Math.hypot(P.X(a.x) - P.X(b.x), ya - yb);
      },
      clear(color) { view.clear(color ? col(color) : undefined); return P; },
      clip(fn) {
        const b = layout();
        ctx.save();
        ctx.beginPath();
        ctx.rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
        ctx.clip();
        try { fn(b); } finally { ctx.restore(); }
        return P;
      },

      axes() {
        const b = layout();
        const C = PHY.colors;
        const fs = b.small ? 10.5 : 11.5;
        const xs = niceStep(R.x[1] - R.x[0], Math.max(2, Math.floor(b.w / 70)));
        const ys = niceStep(R.y[1] - R.y[0], Math.max(2, Math.floor(b.h / 42)));
        const xd = decimalsFor(xs), yd = decimalsFor(ys);
        ctx.save();
        ctx.lineWidth = 1;
        for (let i = Math.ceil(R.x[0] / xs - 1e-9); i * xs <= R.x[1] + 1e-9 * xs; i++) {
          const v = i * xs, px = Math.round(P.X(v)) + 0.5;
          if (o.grid) {
            ctx.strokeStyle = Math.abs(v) < xs * 1e-6 ? C.gridStrong : C.grid;
            ctx.beginPath(); ctx.moveTo(px, b.y); ctx.lineTo(px, b.y + b.h); ctx.stroke();
          }
          view.screenText(px, b.y + b.h + 11, PHY.fmt.num(v, xd), { size: fs, color: C.muted });
        }
        for (let j = Math.ceil(R.y[0] / ys - 1e-9); j * ys <= R.y[1] + 1e-9 * ys; j++) {
          const v = j * ys, py = Math.round(P.Y(v)) + 0.5;
          if (o.grid) {
            ctx.strokeStyle = Math.abs(v) < ys * 1e-6 ? C.gridStrong : C.grid;
            ctx.beginPath(); ctx.moveTo(b.x, py); ctx.lineTo(b.x + b.w, py); ctx.stroke();
          }
          view.screenText(b.x - 5, py, PHY.fmt.num(v, yd), { size: fs, color: o.yColor ? col(o.yColor) : C.muted, align: 'right' });
        }
        if (R.y2) {
          const s2 = niceStep(R.y2[1] - R.y2[0], Math.max(2, Math.floor(b.h / 42)));
          const d2 = decimalsFor(s2);
          for (let j = Math.ceil(R.y2[0] / s2 - 1e-9); j * s2 <= R.y2[1] + 1e-9 * s2; j++) {
            view.screenText(b.x + b.w + 5, Math.round(P.Y2(j * s2)) + 0.5, PHY.fmt.num(j * s2, d2), { size: fs, color: o.y2Color ? col(o.y2Color) : C.muted, align: 'left' });
          }
        }
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h);
        if (R.y2) ctx.lineTo(b.x + b.w, b.y);
        ctx.stroke();
        ctx.restore();
        const label = (name, unit) => (unit ? name + ' (' + PHY.fmt.ltr(PHY.fmt.unitName(unit)) + ')' : name);
        if (o.yLabel) view.screenText(b.x - b.m.l + 4, b.outer.y + 12, label(o.yLabel, o.yUnit), { size: fs + 0.5, weight: 700, color: o.yColor ? col(o.yColor) : C.ink, align: 'left' });
        if (o.y2Label) view.screenText(b.x + b.w + b.m.r - 4, b.outer.y + 12, label(o.y2Label, o.y2Unit), { size: fs + 0.5, weight: 700, color: o.y2Color ? col(o.y2Color) : C.ink, align: 'right' });
        if (o.xLabel) view.screenText(b.x + b.w / 2, b.y + b.h + 27, label(o.xLabel, o.xUnit), { size: fs + 0.5, weight: 600, color: C.ink });
        return P;
      },

      line(xs, ys, s) {
        s = s || {};
        if (typeof ys === 'function') { const f = ys; ys = Array.prototype.map.call(xs, (x) => f(x)); }
        const mapY = s.axis === 'y2' ? P.Y2 : P.Y;
        P.clip(function () {
          ctx.strokeStyle = col(s.color, 'electron');
          ctx.lineWidth = s.width || 2.2;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          if (s.alpha !== undefined) ctx.globalAlpha = s.alpha;
          if (s.dash) ctx.setLineDash(s.dash);
          ctx.beginPath();
          let pen = false;
          for (let i = 0; i < xs.length; i++) {
            const x = xs[i], y = ys[i];
            if (!isFinite(x) || !isFinite(y)) { pen = false; continue; }
            const px = P.X(x), py = Math.max(-1e4, Math.min(1e4, mapY(y)));
            if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
          }
          ctx.stroke();
        });
        return P;
      },

      fill(xs, ys, s) {
        s = s || {};
        const r = s.axis === 'y2' && R.y2 ? R.y2 : R.y;
        const mapY = s.axis === 'y2' ? P.Y2 : P.Y;
        const base = s.base !== undefined ? s.base : r[0] <= 0 && r[1] >= 0 ? 0 : r[0];
        P.clip(function () {
          ctx.fillStyle = col(s.color, 'gamma');
          ctx.globalAlpha = s.alpha === undefined ? 0.25 : s.alpha;
          let i = 0;
          while (i < xs.length) {
            while (i < xs.length && !(isFinite(xs[i]) && isFinite(ys[i]))) i++;
            if (i >= xs.length) break;
            const i0 = i;
            ctx.beginPath();
            ctx.moveTo(P.X(xs[i0]), mapY(base));
            while (i < xs.length && isFinite(xs[i]) && isFinite(ys[i])) { ctx.lineTo(P.X(xs[i]), Math.max(-1e4, Math.min(1e4, mapY(ys[i])))); i++; }
            ctx.lineTo(P.X(xs[i - 1]), mapY(base));
            ctx.closePath();
            ctx.fill();
          }
        });
        return P;
      },

      marker(x, y, s) {
        s = s || {};
        const px = P.X(x), py = s.axis === 'y2' ? P.Y2(y) : P.Y(y);
        const r = s.r || 5, c = col(s.color, 'ink');
        ctx.save();
        ctx.lineWidth = 2;
        if (s.shape === 'cross') {
          ctx.strokeStyle = c;
          ctx.beginPath(); ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r); ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r); ctx.stroke();
        } else {
          ctx.beginPath();
          if (s.shape === 'diamond') { ctx.moveTo(px, py - r * 1.3); ctx.lineTo(px + r * 1.3, py); ctx.lineTo(px, py + r * 1.3); ctx.lineTo(px - r * 1.3, py); ctx.closePath(); }
          else ctx.arc(px, py, r, 0, Math.PI * 2);
          if (s.shape === 'ring') { ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.stroke(); }
          else { ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = PHY.colors.bg; ctx.stroke(); }
        }
        ctx.restore();
        if (s.label) view.screenText(px + (s.labelOffset ? s.labelOffset[0] : 0), py + (s.labelOffset ? s.labelOffset[1] : -14), s.label, { size: 12, weight: 700, color: c, halo: true });
        return P;
      },

      text(x, y, str, s) {
        s = Object.assign({ size: 12, halo: true }, s || {});
        const off = s.offset || [0, 0];
        if (s.color) s.color = col(s.color);
        view.screenText(P.X(x) + off[0], (s.axis === 'y2' ? P.Y2(y) : P.Y(y)) + off[1], str, s);
        return P;
      },

      vline(x, s) {
        s = s || {};
        const b = layout(), px = P.X(x);
        ctx.save();
        ctx.strokeStyle = col(s.color, 'muted');
        ctx.lineWidth = s.width || 1.5;
        ctx.setLineDash(s.dash === undefined ? [5, 4] : s.dash);
        ctx.beginPath(); ctx.moveTo(px, b.y); ctx.lineTo(px, b.y + b.h); ctx.stroke();
        ctx.restore();
        if (s.label) view.screenText(px, s.labelAt === 'bottom' ? b.y + b.h - 9 : b.y + 9, s.label, { size: 11.5, weight: 700, color: col(s.color, 'muted'), halo: true });
        return P;
      },

      hline(y, s) {
        s = s || {};
        const b = layout(), py = s.axis === 'y2' ? P.Y2(y) : P.Y(y);
        ctx.save();
        ctx.strokeStyle = col(s.color, 'muted');
        ctx.lineWidth = s.width || 1.5;
        ctx.setLineDash(s.dash === undefined ? [5, 4] : s.dash);
        ctx.beginPath(); ctx.moveTo(b.x, py); ctx.lineTo(b.x + b.w, py); ctx.stroke();
        ctx.restore();
        if (s.label) view.screenText(b.x + b.w - 4, py - 9, s.label, { size: 11.5, weight: 700, color: col(s.color, 'muted'), align: 'right', halo: true });
        return P;
      },

      heatmap(z, s) {
        s = s || {};
        let nx, ny, at;
        if (z && z.data) { nx = z.nx; ny = z.ny; at = (i, j) => z.data[j * nx + i]; }
        else { ny = z.length; nx = ny ? z[0].length : 0; at = (i, j) => z[j][i]; }
        if (!nx || !ny) return P;
        let lo = s.min, hi = s.max;
        if (lo === undefined || hi === undefined) {
          let a = Infinity, bb = -Infinity;
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = at(i, j); if (isFinite(v)) { if (v < a) a = v; if (v > bb) bb = v; } }
          if (lo === undefined) lo = s.log ? 0 : a;
          if (hi === undefined) hi = bb;
        }
        const dec = s.decades || 3;
        const L = lut(s.cmap || 'viridis');
        if (!img || img.width !== nx || img.height !== ny) {
          img = document.createElement('canvas');
          img.width = nx; img.height = ny;
        }
        const ictx = img.getContext('2d');
        const data = ictx.createImageData(nx, ny);
        const d = data.data;
        for (let j = 0; j < ny; j++) {
          const row = ny - 1 - j;
          for (let i = 0; i < nx; i++) {
            const v = at(i, j);
            let t;
            if (!isFinite(v)) t = 0;
            else if (s.log) t = v <= 0 || hi <= 0 ? 0 : 1 + Math.log10(v / hi) / dec;
            else t = (v - lo) / (hi - lo || 1);
            const k = Math.max(0, Math.min(255, Math.round(t * 255))) * 3;
            const p = (row * nx + i) * 4;
            d[p] = L[k]; d[p + 1] = L[k + 1]; d[p + 2] = L[k + 2]; d[p + 3] = 255;
          }
        }
        ictx.putImageData(data, 0, 0);
        const xr = s.x || R.x, yr = s.y || R.y;
        P.clip(function () {
          ctx.imageSmoothingEnabled = s.smooth !== false;
          if (s.alpha !== undefined) ctx.globalAlpha = s.alpha;
          const x0 = P.X(xr[0]), x1 = P.X(xr[1]), y0 = P.Y(yr[0]), y1 = P.Y(yr[1]);
          ctx.drawImage(img, Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
        });
        return P;
      },

      legend(items, s) {
        s = s || {};
        const b = layout();
        const size = b.small ? 11 : 12;
        ctx.save();
        ctx.font = '600 ' + size + 'px ' + FONT;
        const ws = items.map((it) => ctx.measureText(it.label).width + 30);
        const total = ws.reduce((a, c) => a + c, 0) + 8;
        const stack = total > b.w - 12;
        const w = stack ? Math.max.apply(null, ws) + 8 : total;
        const h = stack ? items.length * (size + 8) + 6 : size + 12;
        const left = s.corner === 'left';
        const x0 = left ? b.x + 6 : b.x + b.w - 6 - w, y0 = b.y + 6;
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = PHY.colors.panel;
        ctx.strokeStyle = PHY.colors.grid;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x0, y0, w, h, 8); else ctx.rect(x0, y0, w, h);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        let cx = x0 + 6, cy = y0 + h / 2;
        items.forEach(function (it, i) {
          if (stack) { cx = x0 + 6; cy = y0 + 3 + (size + 8) * i + (size + 8) / 2; }
          ctx.save();
          ctx.strokeStyle = col(it.color, 'ink');
          ctx.lineWidth = 3;
          if (it.dash) ctx.setLineDash(it.dash);
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 18, cy); ctx.stroke();
          ctx.restore();
          view.screenText(cx + 24, cy, it.label, { size, weight: 600, color: col(it.color, 'ink'), align: 'left' });
          cx += ws[i];
        });
        return P;
      },

      drag(h) {
        const conv = (p) => P.toData(view.sx(p.x), view.sy(p.y));
        view.drag({
          hit(p, e) { return h.hit ? h.hit(conv(p), e) : true; },
          start(handle, p, e) { if (h.start) h.start(handle, conv(p), e); },
          move(handle, p, e) { if (h.move) h.move(handle, conv(p), e); },
          end(handle, p, e) { if (h.end) h.end(handle, conv(p), e); },
        });
        return P;
      },
      onTap(fn) { view.onTap(function (p, e) { fn(P.toData(view.sx(p.x), view.sy(p.y)), e); }); return P; },
    };
    return P;
  }

  function create(canvasEl, o) {
    o = o || {};
    const view = PHY.canvas.create(canvasEl, {
      world: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
      aspect: o.aspect || 16 / 9, minHeight: o.minHeight || 220, maxHeight: o.maxHeight || 420, padding: 0,
    });
    return panel(view, o);
  }

  PHY.plot = { create, panel, niceStep, niceRange, decimalsFor, cmap, lut, wavelengthColor, color: col };
})();
