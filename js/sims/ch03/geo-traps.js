/* Chapter 3 traps, three small sims.
   PHY.sims.geoWorld: what fills the World. ldns builds the World as a box of G4_Galactic (the Geant4 NIST
     vacuum: a gas of density 10⁻²⁵ g/cm³), at least 1 m in each direction from the centre. Protons cross
     the 45 mm to the converter without losing energy. Before play the World's material is "?".
     getState(): {material, density, half (mm), ran}.
   PHY.sims.geoThick: why a thicker converter is not better. Schematic toy: protons with energies uniform in
     1.85-13 MeV stop at their range R(E) = 1.3 mm·(E/13 MeV)^1.75 (Bragg-Kleeman form, scaled to the
     approximate 13 MeV range in Be of PLAN); each proton above the ⁹Be(p,n) threshold of 2.06 MeV marks one
     neutron birth point, uniform along the part of its path where its energy is above the threshold. The
     count is the number of birth points inside the layer, depth < t. play() shows Be 2 mm and then grows it
     to 4 mm. After it: a thickness slider (1-8 mm). getState(): {t, born(t), births, maxRange}.
   PHY.sims.geoRadius: /ldns/det/radius is the radius. The layers are G4Tubs(name, 0, fRadius, 0.5·t, 0,
     360°): the outer radius is the radius, and only the length along z is given as a half-length. The face
     of the disc, with its diameter and the footprint of the 20° cone at 45 mm (radius 16.4 mm).
     getState(): {radius, diameter, footprint, margin}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch03;

  /* ---------- the World ---------- */
  PHY.sims.geoWorld = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 62 }, aspect: 1.6, minHeight: 210, maxHeight: 360 });
    const tw = PHY.tweens();
    const S = { ran: false, k: 0 };
    const HALF = Math.max(1000, 2 * 47);
    let Rd = null;
    if (controlsEl) Rd = U.Readouts(controlsEl, [
      { key: 'm', label: 'החומר של World' },
      { key: 'rho', label: 'הצפיפות שלו, ב-g/cm³' },
      { key: 's', label: 'צלע העולם' },
    ]);
    function paint() {
      if (!Rd) return;
      const done = S.ran && S.k >= 1;
      Rd.set('m', done ? F.ltr('G4_Galactic') : '?');
      Rd.set('rho', done ? F.sci(1e-25, 0) : '?');
      Rd.set('s', done ? F.unit(2 * HALF / 1000, 'm', 0) : '?');
    }
    function render() {
      view.clear();
      const C = PHY.colors, ctx = view.ctx;
      const done = S.ran && S.k >= 1;
      view.poly([{ x: 4, y: 4 }, { x: 96, y: 4 }, { x: 96, y: 54 }, { x: 4, y: 54 }], { close: true, color: 'gridStrong', width: 1.6, dash: [6, 4] });
      view.text(6, 50.5, 'World', { size: 11, weight: 700, color: C.muted, align: 'left' });
      view.text(94, 50.5, done ? 'G4_Galactic' : '?', { size: 12, weight: 800, color: done ? C.ink : C.muted, align: 'right' });
      /* the source and the disc, not to scale */
      view.circle(18, 29, 4.5, { px: true, fill: C.proton });
      ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = C.volume;
      ctx.fillRect(view.sx(70), view.sy(42), 2.5 * view.scale, 26 * view.scale);
      ctx.restore();
      view.poly([{ x: 70, y: 16 }, { x: 72.5, y: 16 }, { x: 72.5, y: 42 }, { x: 70, y: 42 }], { close: true, color: 'volume', width: 1.8 });
      view.text(71.2, 12, 'Be', { size: 11, weight: 700, color: C.volume });
      view.text(44, 8, 'לא בקנה מידה', { size: 10, color: C.muted });
      if (S.ran) {
        for (let i = 0; i < 9; i++) {
          const y1 = 29 + (i - 4) * 2.6, f = Math.min(1, S.k * 1.4 - i * 0.04);
          if (f <= 0) continue;
          view.line(18, 29, 18 + (70 - 18) * f, 29 + (y1 - 29) * f, { color: 'proton', width: 1.6, alpha: 0.85 });
        }
      } else K.mark(view, view.sx(50), view.sy(38), '?', 26);
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start, stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.k = 0; paint(); loop.requestRender(); },
      play(seconds) { tw.clear(); S.ran = true; S.k = 0; loop.start(); return tw.run(seconds || 3, (k) => { S.k = k; paint(); loop.requestRender(); }).then(() => { opts.locked = false; }); },
      setParam() {},
      getState() { return { material: 'G4_Galactic', density: 1e-25, half: HALF, ran: S.ran }; },
    };
    paint();
    return api;
  };

  /* ---------- the thickness ---------- */
  PHY.sims.geoThick = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true, N: 140, seed: 6, t: 2 }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -1.6, xMax: 8.6, yMin: -0.6, yMax: 6.6 }, aspect: 1.5, minHeight: 220, maxHeight: 380 });
    const tw = PHY.tweens();
    const r = PHY.random(opts.seed);
    const R13 = 1.3, ETH = 2.06;
    const range = (E) => R13 * Math.pow(E / 13, 1.75);
    const P = [];
    for (let i = 0; i < opts.N; i++) {
      const E = 1.85 + (13 - 1.85) * r.next();
      const y = 0.3 + 5.4 * r.next();
      const Rg = range(E);
      const birth = E > ETH ? (Rg - range(ETH)) * r.next() : null;
      P.push({ E, y, R: Rg, birth });
    }
    const births = P.filter((p) => p.birth !== null).length;
    const born = (t) => P.filter((p) => p.birth !== null && p.birth < t).length;
    const S = { ran: false, k: 0, t: opts.t, grow: 0 };
    let Rd = null, slider = null;
    if (controlsEl) {
      Rd = U.Readouts(controlsEl, [
        { key: 'n', label: 'נקודות לידה בתוך השכבה', color: 'var(--c-neutron)' },
        { key: 't', label: 'עובי השכבה' },
        { key: 'rm', label: 'הטווח של פרוטון של 13 MeV' },
      ]);
      slider = U.Slider(controlsEl, { label: 'עובי ה-Be', min: 1, max: 8, step: 0.1, value: S.t, unit: 'mm', digits: 1, onInput: (v) => { S.t = v; paint(); loop.requestRender(); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); } });
      slider.setEnabled(!opts.locked);
    }
    function paint() {
      if (!Rd) return;
      const done = S.ran && S.k >= 1;
      Rd.set('n', done || (S.ran && S.k > 0.5) ? F.num(born(S.t), 0) : '?');
      Rd.set('t', F.unit(S.t, 'mm', 1));
      Rd.set('rm', S.ran ? F.ltr('≈ ' + F.num(R13, 1) + ' mm') : '?');
    }
    function render() {
      view.clear();
      const C = PHY.colors, ctx = view.ctx;
      ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = C.volume;
      ctx.fillRect(view.sx(0), view.sy(6), S.t * view.scale, 6 * view.scale);
      ctx.restore();
      view.poly([{ x: 0, y: 0 }, { x: S.t, y: 0 }, { x: S.t, y: 6 }, { x: 0, y: 6 }], { close: true, color: 'volume', width: 2 });
      view.text(S.t / 2, 6.3, 'Be, ' + F.unit(S.t, 'mm', 1), { size: 11, weight: 700, color: C.volume });
      for (let z = 1; z <= 8; z++) view.text(z, -0.35, String(z), { size: 9.5, color: C.muted });
      view.text(-0.2, -0.35, 'z, mm', { size: 9.5, color: C.muted, align: 'right' });
      K.clock(view, 'סכמטי');
      if (!S.ran) { K.mark(view, view.sx(4.5), view.sy(3)); return; }
      const f = Math.min(1, S.k * 1.25);
      P.forEach(function (p, i) {
        const g = Math.max(0, Math.min(1, f * 1.6 - (i / P.length) * 0.6));
        if (g <= 0) return;
        const x = -1.4 + (p.R + 1.4) * g;
        view.line(-1.4, p.y, x, p.y, { color: 'proton', width: 1, alpha: 0.45 });
        if (g >= 1) view.circle(p.R, p.y, 1.6, { px: true, fill: C.proton });
        if (p.birth !== null && x >= p.birth) view.circle(p.birth, p.y, 2.6, { px: true, fill: C.neutron });
      });
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start, stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.k = 0; S.t = opts.t; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear(); S.ran = true; S.k = 0; S.t = 2; loop.start();
        const sec = seconds || 4;
        return tw.run(sec * 0.6, (k) => { S.k = k * 0.99; paint(); loop.requestRender(); })
          .then(() => tw.run(sec * 0.4, (k) => { S.t = 2 + 2 * PHY.ease.inOut(k); if (k >= 1) S.k = 1; if (slider) slider.set(S.t); paint(); loop.requestRender(); }))
          .then(() => { opts.locked = false; if (slider) slider.setEnabled(true); paint(); });
      },
      setParam(key, v) { if (key === 't') { S.t = v; S.ran = true; S.k = 1; } paint(); loop.requestRender(); },
      getState() { return { t: S.t, born: born(S.t), bornAt: born, births, maxRange: Math.max.apply(null, P.map((p) => p.R)), N: P.length }; },
    };
    paint();
    return api;
  };

  /* ---------- the radius ---------- */
  PHY.sims.geoRadius = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true, radius: 22, d: 45, cone: 20 }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -34, xMax: 34, yMin: -32, yMax: 34 }, aspect: 1.15, minHeight: 250, maxHeight: 420 });
    const tw = PHY.tweens();
    const S = { ran: false, k: 0 };
    const foot = K.coneR(opts.d, opts.cone);
    let Rd = null;
    if (controlsEl) Rd = U.Readouts(controlsEl, [
      { key: 'D', label: 'קוטר הדיסקה' },
      { key: 'f', label: 'קוטר העקבה של הקונוס', color: 'var(--c-proton)' },
      { key: 'm', label: 'שוליים מכל צד' },
    ]);
    function paint() {
      if (!Rd) return;
      const done = S.ran && S.k >= 1;
      Rd.set('D', done ? F.unit(2 * opts.radius, 'mm', 0) : '?');
      Rd.set('f', done ? F.unit(2 * foot, 'mm', 1) : '?');
      Rd.set('m', done ? F.unit(opts.radius - foot, 'mm', 1) : '?');
    }
    function render() {
      view.clear();
      const C = PHY.colors, ctx = view.ctx;
      view.line(-32, 0, 32, 0, { color: 'grid', width: 1 });
      view.line(0, -30, 0, 30, { color: 'grid', width: 1 });
      view.text(-32, 31, '/ldns/det/radius 22 mm', { size: 11.5, weight: 700, color: C.ink, align: 'left', font: 'ui-monospace, Menlo, Consolas, monospace' });
      K.clock(view, 'מבט מהמקור');
      if (!S.ran) { K.mark(view, view.sx(0), view.sy(0)); return; }
      const g = Math.min(1, S.k * 2);
      const r = opts.radius * g;
      ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = C.volume;
      ctx.beginPath(); ctx.arc(view.sx(0), view.sy(0), r * view.scale, 0, 2 * Math.PI); ctx.fill();
      ctx.restore();
      view.circle(0, 0, r, { color: 'volume', width: 2 });
      if (g >= 1) {
        view.arrow(0, 0, opts.radius * Math.cos(0.9), opts.radius * Math.sin(0.9), { color: 'volume', width: 1.8, head: 8 });
        view.text(opts.radius * 0.5 * Math.cos(0.9) - 4, opts.radius * 0.5 * Math.sin(0.9) + 2, 'rmax', { size: 11, weight: 700, color: C.volume, halo: true });
      }
      if (S.k > 0.55) {
        const a = Math.min(1, (S.k - 0.55) * 4);
        view.line(-opts.radius, -26, opts.radius, -26, { color: 'ink', width: 1.6, alpha: a });
        view.line(-opts.radius, -24.5, -opts.radius, -27.5, { color: 'ink', width: 1.6, alpha: a });
        view.line(opts.radius, -24.5, opts.radius, -27.5, { color: 'ink', width: 1.6, alpha: a });
        view.text(0, -29, F.unit(2 * opts.radius, 'mm', 0), { size: 12, weight: 800, color: C.ink, alpha: a });
      }
      if (S.k > 0.75) {
        view.circle(0, 0, foot, { color: 'proton', width: 1.8, dash: [6, 4] });
        view.text(-foot * 0.72, -foot * 0.72 - 3, '20° @ 45 mm', { size: 10.5, weight: 700, color: C.proton, halo: true, align: 'right' });
      }
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start, stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.k = 0; paint(); loop.requestRender(); },
      play(seconds) { tw.clear(); S.ran = true; S.k = 0; loop.start(); return tw.run(seconds || 3.5, (k) => { S.k = k; paint(); loop.requestRender(); }).then(() => { opts.locked = false; }); },
      setParam() {},
      getState() { return { radius: opts.radius, diameter: 2 * opts.radius, footprint: 2 * foot, margin: opts.radius - foot, ran: S.ran }; },
    };
    paint();
    return api;
  };
})();
