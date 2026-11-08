/* PHY.ch03: chapter 3 helpers (geometry and materials), loaded before the chapter's sims.

   MAT: the materials of the chapter as ldns builds them (DetectorConstruction::GetMaterial): the short
     name used in /ldns/det/addLayer, the Geant4 material name, the density (g/cm³), and the composition
     per formula unit: elements with atoms per unit, molar mass and natural isotopic abundances (atom
     fractions; textbook values, Li approximately 7.5 % ⁶Li). HDPE is ldns's own material: CH₂ at
     0.95 g/cm³ whose H element is named TS_H_of_Polyethylene (thermal scattering).
   numberDensities(key) -> {nUnit, A, elements: [{sym, n, w, iso: [{A, frac, n}]}]}: per cm³; w is the mass
     fraction, so n_element = ρ N_A w / A_element.
   g4num(x): a number as C++ prints it by default (6 significant digits).
   bestUnit(mm): G4BestUnit for a length: the unit with the smallest value ≥ 1, the symbol padded to 3
     characters ("2 mm ", "4.5 cm ", "500 um ").
   build(model): what DetectorConstruction::Construct builds for a model
     {layers: [{mat, t (mm)}], distance, radius, mod: null | {mat, length, radius, gap, insert (mm or -1)},
      refl: null | {mat, thickness}}: the z boundaries, the moderator z range, the LDNS errors, the
     overlap-check lines, the printout (lines as in the run log) and the macro lines.
   coneR(z, deg), thetaDisc(d, r) (deg), intercept(d, r, deg): the fraction of a cone, uniform in solid
     angle, that hits a disc of radius r at distance d: (1 − cos θ_disc)/(1 − cos θ_cone), or 1.
   drawRZ(view, model, o): the r–z cross-section (z to the right, r up), source at z = 0, cone lines,
     layers, moderator, channel and reflector. o: {cone (deg), zMax, labels, ghost}.
   All colors are read from PHY.colors at draw time. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt;
  const NA = 6.02214e23;
  const DEG = Math.PI / 180;

  const EL = {
    Be: { sym: 'Be', A: 9.012, iso: [{ A: 9, frac: 1 }] },
    Li: { sym: 'Li', A: 6.94, iso: [{ A: 6, frac: 0.075 }, { A: 7, frac: 0.925 }] },
    F: { sym: 'F', A: 19.00, iso: [{ A: 19, frac: 1 }] },
    Pb: { sym: 'Pb', A: 207.2, iso: [{ A: 204, frac: 0.014 }, { A: 206, frac: 0.241 }, { A: 207, frac: 0.221 }, { A: 208, frac: 0.524 }] },
    C: { sym: 'C', A: 12.011, iso: [{ A: 12, frac: 0.989 }, { A: 13, frac: 0.011 }] },
    H: { sym: 'H', A: 1.008, iso: [{ A: 1, frac: 1 }] },
  };
  const MAT = {
    Be: { key: 'Be', g4: 'G4_Be', rho: 1.848, parts: [['Be', 1]] },
    Li: { key: 'Li', g4: 'G4_Li', rho: 0.534, parts: [['Li', 1]] },
    LiF: { key: 'LiF', g4: 'G4_LITHIUM_FLUORIDE', rho: 2.635, parts: [['Li', 1], ['F', 1]] },
    Pb: { key: 'Pb', g4: 'G4_Pb', rho: 11.35, parts: [['Pb', 1]] },
    PE: { key: 'PE', g4: 'G4_POLYETHYLENE', rho: 0.94, parts: [['C', 1], ['H', 2]] },
    HDPE: { key: 'HDPE', g4: 'HDPE', rho: 0.95, T: 293.6, parts: [['C', 1], ['H', 2]], elNames: ['C', 'TS_H_of_Polyethylene'] },
  };
  const ISO_SUP = { 1: '¹', 6: '⁶', 7: '⁷', 9: '⁹', 12: '¹²', 13: '¹³', 19: '¹⁹', 204: '²⁰⁴', 206: '²⁰⁶', 207: '²⁰⁷', 208: '²⁰⁸' };
  const isoName = (A, sym) => (ISO_SUP[A] || String(A)) + sym;

  function numberDensities(key) {
    const m = MAT[key];
    const A = m.parts.reduce((s, p) => s + EL[p[0]].A * p[1], 0);
    const nUnit = (m.rho * NA) / A;
    return {
      key, A, nUnit, rho: m.rho,
      elements: m.parts.map(function (p) {
        const e = EL[p[0]];
        const w = (e.A * p[1]) / A;
        const n = (m.rho * NA * w) / e.A;
        return { sym: e.sym, atoms: p[1], A: e.A, w, n, iso: e.iso.map((i) => ({ A: i.A, frac: i.frac, n: n * i.frac, name: isoName(i.A, e.sym) })) };
      }),
    };
  }

  const g4num = (x) => String(+(+x).toPrecision(6));
  const UNITS = [['km', 1e6], ['m', 1e3], ['cm', 10], ['mm', 1], ['um', 1e-3], ['nm', 1e-6], ['Ang', 1e-7], ['fm', 1e-12]];
  function bestUnit(mm) {
    let best = null;
    UNITS.forEach(function (u) {
      const r = Math.abs(mm) / u[1];
      if (r >= 1 && (!best || r < best.r)) best = { r, u };
    });
    if (!best) best = { u: UNITS[UNITS.length - 1] };
    return g4num(mm / best.u[1]) + ' ' + (best.u[0] + '   ').slice(0, 3);
  }
  const UNIT_MM = { mm: 1, cm: 10, m: 1000, um: 1e-3, km: 1e6, nm: 1e-6 };

  function build(model) {
    const out = { errors: [], overlaps: [], lines: [], macro: [] };
    const L = model.layers;
    const zb = [model.distance];
    L.forEach((l) => zb.push(zb[zb.length - 1] + l.t));
    out.zb = zb;
    const zEnd = zb[zb.length - 1];
    const mod = model.mod && model.mod.length > 0 ? model.mod : null;
    const insert = mod && mod.insert >= 0;
    if (!L.length && !mod) out.errors.push({ code: 'LDNS003', text: 'No converter layers and no moderator defined' });
    if (mod) {
      out.modZ = [insert ? model.distance - mod.insert : zEnd + (mod.gap === undefined ? 5 : mod.gap), 0];
      out.modZ[1] = out.modZ[0] + mod.length;
      if (insert) {
        let err = '';
        if (out.modZ[0] <= 0) err = 'insert depth >= source-converter distance: the source would be inside the moderator';
        else if (zEnd >= out.modZ[1]) err = 'converter does not fit inside the moderator (insert depth + stack >= length)';
        else if (mod.radius <= model.radius) err = 'moderator radius must be larger than the converter radius in insert mode';
        if (err) out.errors.push({ code: 'LDNS005', text: err });
      }
    }
    out.insert = !!insert;
    /* placements, in the order Construct makes them, with their copy numbers */
    out.volumes = [{ name: 'World', copy: 0, mother: null, mat: 'G4_Galactic' }];
    if (mod) {
      out.volumes.push({ name: 'Moderator', copy: 100, mother: 'World', mat: mod.mat });
      if (insert && mod.insert > 0) out.volumes.push({ name: 'Channel', copy: 101, mother: 'Moderator', mat: 'G4_Galactic' });
    }
    if (mod && model.refl && model.refl.thickness > 0) out.volumes.push({ name: 'ReflectorSide', copy: 102, mother: 'World', mat: model.refl.mat });
    L.forEach((l, i) => out.volumes.push({ name: 'Layer' + i + '_' + l.mat, copy: i + 1, mother: insert ? 'Moderator' : 'World', mat: MAT[l.mat] ? MAT[l.mat].g4 : l.mat }));
    out.volumes.forEach(function (v) { if (v.mother) out.overlaps.push('Checking overlaps for volume ' + v.name + ':' + v.copy + ' (G4Tubs) ... OK! '); });
    /* the printout of DetectorConstruction::Construct */
    const P = out.lines;
    P.push('================ LDNS converter geometry ================');
    P.push(' source at z = 0, front face at z = ' + bestUnit(model.distance) + ', radius = ' + bestUnit(model.radius));
    L.forEach(function (l, i) {
      const m = MAT[l.mat];
      P.push('  layer ' + i + ' : ' + l.mat + ' (' + m.g4 + ', rho = ' + g4num(m.rho) + ' g/cm3)  t = ' + bestUnit(l.t) + '  z = [' + g4num(zb[i]) + ', ' + g4num(zb[i + 1]) + '] mm');
    });
    if (mod) {
      const mm = MAT[mod.mat];
      P.push('  moderator : ' + mod.mat + ' (rho = ' + g4num(mm.rho) + ' g/cm3, T = ' + g4num(mm.T || 293.15) + ' K)  L = ' + bestUnit(mod.length) + '  D = ' + bestUnit(2 * mod.radius) + '  z = [' + g4num(out.modZ[0]) + ', ' + g4num(out.modZ[1]) + '] mm');
      if (insert) P.push('      INSERT mode: converter inside the moderator, front face ' + g4num(mod.insert) + ' mm below the upstream face (vacuum channel r = ' + g4num(model.radius) + ' mm)');
      (mm.elNames || mm.parts.map((p) => p[0])).forEach((e) => P.push('      element ' + e));
    } else P.push('  moderator : none');
    if (mod && model.refl && model.refl.thickness > 0) {
      const rm = MAT[model.refl.mat];
      P.push('  reflector : ' + model.refl.mat + ' (' + rm.g4 + ', rho = ' + g4num(rm.rho) + ' g/cm3), side shell r = [' + g4num(mod.radius) + ', ' + g4num(mod.radius + model.refl.thickness) + '] mm');
    }
    P.push('==========================================================');
    /* the macro */
    const M = out.macro;
    M.push('/ldns/det/clearLayers');
    L.forEach((l) => M.push('/ldns/det/addLayer ' + l.mat + ' ' + g4num(l.t) + ' mm'));
    M.push('/ldns/det/distance ' + g4num(model.distance) + ' mm');
    M.push('/ldns/det/radius ' + g4num(model.radius) + ' mm');
    if (mod) {
      M.push('/ldns/mod/material ' + mod.mat);
      M.push('/ldns/mod/length ' + g4num(mod.length) + ' mm');
      M.push('/ldns/mod/radius ' + g4num(mod.radius) + ' mm');
      if (insert) M.push('/ldns/mod/insertDepth ' + g4num(mod.insert) + ' mm');
      if (model.refl && model.refl.thickness > 0) { M.push('/ldns/refl/material ' + model.refl.mat); M.push('/ldns/refl/thickness ' + g4num(model.refl.thickness) + ' mm'); }
    }
    M.push('/run/initialize');
    if (model.cone !== undefined) M.push('/ldns/src/halfAngle ' + g4num(model.cone) + ' deg');
    out.zEnd = zEnd;
    return out;
  }

  const coneR = (z, deg) => z * Math.tan(deg * DEG);
  const thetaDisc = (d, r) => Math.atan(r / d) / DEG;
  function intercept(d, r, deg) {
    const td = thetaDisc(d, r);
    if (td >= deg) return 1;
    return (1 - Math.cos(td * DEG)) / (1 - Math.cos(deg * DEG));
  }

  /* fill a z-r rectangle (r from r0 to r1, mirrored to −r) */
  function band(view, z0, z1, r0, r1, o) {
    const C = PHY.colors, ctx = view.ctx;
    ctx.save();
    ctx.globalAlpha = o.alpha === undefined ? 0.12 : o.alpha;
    ctx.fillStyle = o.fill ? (C[o.fill] || o.fill) : C.volume;
    [1, -1].forEach(function (s) {
      const ya = view.sy(s > 0 ? r1 : -r0), yb = view.sy(s > 0 ? r0 : -r1);
      ctx.fillRect(view.sx(z0), ya, (z1 - z0) * view.scale, yb - ya);
    });
    ctx.restore();
    const lw = o.width || 1.6;
    [1, -1].forEach(function (s) {
      view.poly([{ x: z0, y: s * r0 }, { x: z1, y: s * r0 }, { x: z1, y: s * r1 }, { x: z0, y: s * r1 }], { close: true, color: o.color || 'volume', width: lw, dash: o.dash });
    });
  }

  /* r-z cross-section. The model's layers use the volume color with growing opacity, the moderator and
     reflector are drawn faint. o: {cone, zMax, labels (bool), labelSize} */
  function drawRZ(view, model, o) {
    o = o || {};
    const C = PHY.colors;
    const b = build(model);
    const R = model.radius;
    if (b.modZ) {
      const mod = model.mod;
      if (model.refl && model.refl.thickness > 0) band(view, b.modZ[0], b.modZ[1], mod.radius, mod.radius + model.refl.thickness, { alpha: 0.18, fill: 'muted', color: 'volume', width: 1.2 });
      const ctx = view.ctx;
      ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = C.volume;
      ctx.fillRect(view.sx(b.modZ[0]), view.sy(mod.radius), mod.length * view.scale, 2 * mod.radius * view.scale);
      ctx.restore();
      view.poly([{ x: b.modZ[0], y: -mod.radius }, { x: b.modZ[1], y: -mod.radius }, { x: b.modZ[1], y: mod.radius }, { x: b.modZ[0], y: mod.radius }], { close: true, color: 'volume', width: 1.4, dash: [6, 4] });
      if (b.insert && mod.insert > 0) {
        /* the vacuum channel: cut the moderator's tint */
        ctx.save(); ctx.fillStyle = C.bg; ctx.globalAlpha = 1;
        ctx.fillRect(view.sx(b.modZ[0]), view.sy(R), mod.insert * view.scale, 2 * R * view.scale);
        ctx.restore();
        view.poly([{ x: b.modZ[0], y: R }, { x: model.distance, y: R }], { color: 'volume', width: 1.2, dash: [3, 3] });
        view.poly([{ x: b.modZ[0], y: -R }, { x: model.distance, y: -R }], { color: 'volume', width: 1.2, dash: [3, 3] });
      }
      if (o.labels !== false) view.text((b.modZ[0] + b.modZ[1]) / 2, mod.radius * 0.72, mod.mat, { size: o.labelSize || 11, weight: 700, color: C.volume });
    }
    model.layers.forEach(function (l, i) {
      const z0 = b.zb[i], z1 = b.zb[i + 1];
      const ctx = view.ctx;
      ctx.save(); ctx.globalAlpha = 0.16 + 0.14 * (i % 3); ctx.fillStyle = C.volume;
      ctx.fillRect(view.sx(z0), view.sy(R), (z1 - z0) * view.scale, 2 * R * view.scale);
      ctx.restore();
      view.poly([{ x: z0, y: -R }, { x: z1, y: -R }, { x: z1, y: R }, { x: z0, y: R }], { close: true, color: 'volume', width: 1.8 });
      if (o.labels !== false && (z1 - z0) * view.scale > 14) view.text((z0 + z1) / 2, -R - (o.labelGap || 2.5), l.mat, { size: o.labelSize || 11, weight: 700, color: C.volume, offset: [0, 8] });
    });
    if (o.cone) {
      const zm = o.zMax || b.zEnd * 1.2;
      const r = coneR(zm, o.cone);
      view.line(0, 0, zm, r, { color: 'proton', width: 1.4, dash: [6, 4], alpha: 0.8 });
      view.line(0, 0, zm, -r, { color: 'proton', width: 1.4, dash: [6, 4], alpha: 0.8 });
    }
    view.circle(0, 0, 4.5, { px: true, fill: C.proton });
    return b;
  }

  function clock(view, text) {
    view.screenText(view.w - 10, 16, text, { size: 11, weight: 600, align: 'right', color: PHY.colors.muted, pill: true });
  }
  function mark(view, px, py, text, size) {
    view.screenText(px, py, text || '?', { size: size || 30, weight: 800, color: PHY.colors.muted, halo: true });
  }

  PHY.ch03 = { NA, EL, MAT, numberDensities, isoName, g4num, bestUnit, UNIT_MM, build, coneR, thetaDisc, intercept, drawRZ, band, clock, mark };
})();
