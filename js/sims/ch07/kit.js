/* PHY.ch07: chapter 7 helpers (visualisation), loaded before the chapter's sims.

   The camera of a Geant4 viewer, orthogonal projection (the default):
   viewpointVector v is the direction from the target to the camera; the up vector is +y. The screen
   right is r = up × v (normalised) and the screen up is u = v × r. So -1 0 0 puts +z to the right (beam
   left to right), and viewpointThetaPhi θ φ means v = (sin θ cos φ, sin θ sin φ, cos θ).
     camera(vec) or cameraTP(theta, phi) -> {v, r, u}; project(cam, p) -> [right, up, depth]
     beamOnScreen(cam) -> the unit screen direction of +z (and its length: 0 when we look along the beam)

   The ldns scene in mm: source at the origin, a cone of half-angle 20°, a Be disc of radius 22 mm whose
   front face is at z = 45 mm (thickness 2 mm in the Be run, 4 mm in the two pictures).
     drawScene(view, cam, o): o = {zoom, center, style 'wireframe'|'surface', aux, axes, t, tracks,
       model 'id'|'charge', filter (Set of types or null), dimInside}. Colors from PHY.colors at draw time:
       the disc is `volume`; tracks are proton/neutron/gamma/electron with drawByParticleID; with drawByCharge
       they are drawn by charge class only, with non-particle colors (ink, dashed ink, muted).

   Schematic events (labelled schematic in the chapter):
     rangeMm(E)     proton range in Be, Bragg-Kleeman R ∝ E^1.75 scaled to 1.3 mm at 13 MeV (PLAN 4)
     sampleE(rng, src)  analog: an exponential with T = 1.27 MeV between 0.5 and 13 MeV, chosen so that
                    35% are above 1.85 MeV, as 4.42e11 / 1.28e12 in PLAN 4; flat: uniform in [Emin, 13]
     coneDir(rng)   uniform in solid angle inside 20°
     neutronDir(rng)  cos θ from 1 + a cos θ with a = 0.36, so that 59% go forward (PLAN 4)
     protonTrack, neutronTrack, makeEvent(rng, src) -> {tracks, nNeutron}
   Rates from PLAN 4: P_ANALOG = 1.97e8 / 1.28e12 neutrons per proton in the real mix above 0.5 MeV
   (about one in 6500, "about one in 6000"); P_FLAT = 6126 / 3e6 neutron rows per fired proton in the
   flat run from 1.85 MeV (the rows of `leak`); W_MEAN = 0.219, the mean weight of those rows. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const D = Math.PI / 180;

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.sqrt(dot(a, a));
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  function camera(vec) {
    const v = norm(vec);
    let r = cross([0, 1, 0], v);
    if (len(r) < 1e-9) r = [1, 0, 0];
    r = norm(r);
    const u = cross(v, r);
    return { v, r, u, vec: vec.slice() };
  }
  function tpVector(theta, phi) { return [Math.sin(theta * D) * Math.cos(phi * D), Math.sin(theta * D) * Math.sin(phi * D), Math.cos(theta * D)]; }
  function cameraTP(theta, phi) { const c = camera(tpVector(theta, phi)); c.theta = theta; c.phi = phi; return c; }
  const project = (cam, p) => [dot(p, cam.r), dot(p, cam.u), dot(p, cam.v)];
  function beamOnScreen(cam) {
    const x = cam.r[2], y = cam.u[2], l = Math.hypot(x, y);
    return { x: l ? x / l : 0, y: l ? y / l : 0, len: l };
  }

  /* ---------- schematic physics ---------- */
  const R13 = 1.3, E_CUT = 13, T_ANALOG = 1.27, CONE = 20;
  const P_ANALOG = 1.97e8 / 1.28e12;
  const P_FLAT = 6126 / 3e6;
  const W_MEAN = 0.219;
  const FWD = 0.59, A_FWD = 4 * FWD - 2;
  const rangeMm = (E) => R13 * Math.pow(Math.max(E, 0) / E_CUT, 1.75);
  function sampleE(rng, src) {
    src = src || {};
    if (src.mode === 'flat') { const a = src.Emin || 1.85; return a + (E_CUT - a) * rng(); }
    const a = src.Emin || 0.5;
    const span = 1 - Math.exp(-(E_CUT - a) / T_ANALOG);
    return a - T_ANALOG * Math.log(1 - span * rng());
  }
  function coneDir(rng) {
    const c = 1 - (1 - Math.cos(CONE * D)) * rng(), s = Math.sqrt(1 - c * c), p = 2 * Math.PI * rng();
    return [s * Math.cos(p), s * Math.sin(p), c];
  }
  function neutronDir(rng) {
    let c;
    for (let k = 0; k < 100; k++) { c = 2 * rng() - 1; if (rng() * (1 + Math.abs(A_FWD)) < 1 + A_FWD * c) break; }
    const s = Math.sqrt(1 - c * c), p = 2 * Math.PI * rng();
    return [s * Math.cos(p), s * Math.sin(p), c];
  }
  /* a proton from the source to where it stops in the disc (front face z0) */
  function protonTrack(rng, src, z0) {
    z0 = z0 || 45;
    const E = sampleE(rng, src);
    const d = coneDir(rng);
    const s0 = z0 / d[2], R = rangeMm(E);
    const pts = [[0, 0, 0], [d[0] * s0, d[1] * s0, d[2] * s0], [d[0] * (s0 + R), d[1] * (s0 + R), d[2] * (s0 + R)]];
    return { type: 'proton', charge: 1, pts, E, R, dir: d, s0 };
  }
  function neutronTrack(rng, p, L) {
    const f = 0.7 * rng();
    const b = [p.dir[0] * (p.s0 + f * p.R), p.dir[1] * (p.s0 + f * p.R), p.dir[2] * (p.s0 + f * p.R)];
    const d = neutronDir(rng);
    L = L || 160;
    return { type: 'neutron', charge: 0, pts: [b, [b[0] + d[0] * L, b[1] + d[1] * L, b[2] + d[2] * L]], dir: d, birth: b };
  }
  /* one event: a proton, and a neutron with probability pN */
  function makeEvent(rng, src) {
    const p = protonTrack(rng, src, src && src.z0);
    const tracks = [p];
    const pN = src && src.pN !== undefined ? src.pN : src && src.mode === 'flat' ? P_FLAT : P_ANALOG;
    let n = 0;
    if (rng() < pN) { tracks.push(neutronTrack(rng, p)); n = 1; }
    return { tracks, nNeutron: n };
  }

  /* ---------- drawing ---------- */
  const TYPES = ['proton', 'neutron', 'gamma', 'e-'];
  const KEY = { proton: 'proton', neutron: 'neutron', gamma: 'gamma', 'e-': 'electron' };
  function cylinder(R, z0, z1, n) {
    const f = [], b = [];
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; f.push([R * Math.cos(a), R * Math.sin(a), z0]); b.push([R * Math.cos(a), R * Math.sin(a), z1]); }
    return { f, b, n };
  }
  function drawScene(view, cam, o) {
    const C = PHY.colors, ctx = view.ctx;
    const zoom = o.zoom || 1, cen = o.center || [0, 0, 24];
    const pc = project(cam, cen);
    const P = (p) => { const q = project(cam, p); return [(q[0] - pc[0]) * zoom, (q[1] - pc[1]) * zoom, q[2]]; };
    const R = o.R || 22, z0 = o.z0 || 45, t = o.t || 4;
    const cyl = cylinder(R, z0, z0 + t, 24);
    const F = cyl.f.map(P), B = cyl.b.map(P);
    const cf = P([0, 0, z0]), cb = P([0, 0, z0 + t]);
    const style = o.style || 'wireframe';
    function polyline(pts, close, col, w, alpha, dash) {
      ctx.save();
      ctx.beginPath();
      pts.forEach(function (p, i) { const x = view.sx(p[0]), y = view.sy(p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      if (close) ctx.closePath();
      ctx.strokeStyle = col; ctx.lineWidth = w || 1.2; ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      if (dash) ctx.setLineDash(dash);
      ctx.stroke();
      ctx.restore();
    }
    function fill(pts, col, alpha) {
      ctx.save();
      ctx.beginPath();
      pts.forEach(function (p, i) { const x = view.sx(p[0]), y = view.sy(p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath();
      ctx.fillStyle = col; ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    }
    /* faces of the disc: caps and side quads, each with its outward normal */
    const faces = [{ pts: F, n: [0, 0, -1] }, { pts: B, n: [0, 0, 1] }];
    for (let i = 0; i < cyl.n; i++) {
      const j = (i + 1) % cyl.n, a = (2 * Math.PI * (i + 0.5)) / cyl.n;
      faces.push({ pts: [F[i], F[j], B[j], B[i]], n: [Math.cos(a), Math.sin(a), 0], side: true });
    }
    const facing = (f) => dot(f.n, cam.v) > 1e-9;
    function drawGeomBack() {
      if (style === 'surface') faces.forEach(function (f) { if (!facing(f)) fill(f.pts, C.volume, 0.12); });
    }
    function drawGeomFront() {
      const col = C.volume;
      if (style === 'surface') {
        faces.forEach(function (f) { if (facing(f)) fill(f.pts, col, f.side ? 0.32 : 0.42); });
        polyline(F, true, col, 1.4, 0.9); polyline(B, true, col, 1.4, 0.9);
        return;
      }
      polyline(F, true, col, 1.3); polyline(B, true, col, 1.3);
      if (o.aux) {
        for (let i = 0; i < cyl.n; i++) {
          polyline([F[i], B[i]], false, col, 0.9, 0.75);
          polyline([cf, F[i]], false, col, 0.8, 0.5);
          polyline([cb, B[i]], false, col, 0.8, 0.5);
        }
      }
    }
    /* axes in pixels through view.sx/sy, so a sub-viewer (an object with its own sx, sy) works too */
    function drawAxes() {
      const L = o.axisLen || 10;
      const O = P([0, 0, 0]);
      const ox = view.sx(O[0]), oy = view.sy(O[1]);
      [['x', [L, 0, 0]], ['y', [0, L, 0]], ['z', [0, 0, L]]].forEach(function (a) {
        const E = P(a[1]);
        const ex = view.sx(E[0]), ey = view.sy(E[1]);
        const dx = ex - ox, dy = ey - oy, l = Math.hypot(dx, dy);
        if (l < 3) { view.screenText(ox + 9, oy - 9, a[0], { size: 11, color: C.muted, weight: 700, halo: true }); return; }
        const ux = dx / l, uy = dy / l, hd = Math.min(6, l * 0.4);
        ctx.save();
        ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * hd - uy * hd * 0.5, ey - uy * hd + ux * hd * 0.5); ctx.lineTo(ex - ux * hd + uy * hd * 0.5, ey - uy * hd - ux * hd * 0.5); ctx.closePath(); ctx.fill();
        ctx.restore();
        view.screenText(ex + ux * 9, ey + uy * 9, a[0], { size: 11.5, color: C.ink, weight: 700, halo: true });
      });
    }
    function trackColor(tr) {
      if (o.model === 'charge') return tr.charge > 0 ? C.ink : tr.charge < 0 ? C.ink : C.muted;
      return C[KEY[tr.type]];
    }
    /* all tracks of one look (color, width, alpha, dash) go into one path: thousands stay cheap */
    function drawTracks() {
      const list = o.tracks || [];
      const insideDim = style === 'surface' && o.dimInside !== false;
      const groups = new Map();
      const add = function (pts, col, w, alpha, dash) {
        const key = col + '|' + w + '|' + alpha + '|' + (dash ? dash.join(',') : '');
        if (!groups.has(key)) groups.set(key, { col, w, alpha, dash, paths: [] });
        groups.get(key).paths.push(pts);
      };
      list.forEach(function (tr) {
        if (o.filter && !o.filter.has(tr.type)) return;
        const pts = tr.pts.map(P);
        const col = trackColor(tr);
        const w = tr.type === 'proton' ? (o.thin ? 0.8 : 1.1) : 1.3;
        const dash = o.model === 'charge' && tr.charge < 0 ? [5, 4] : null;
        const a = o.trackAlpha || 0.9;
        if (tr.type === 'proton' && insideDim && pts.length === 3) {
          add([pts[0], pts[1]], col, w, a, dash);
          add([pts[1], pts[2]], col, w, 0.25, dash);
        } else add(pts, col, w, a, dash);
      });
      groups.forEach(function (g) {
        ctx.save();
        ctx.beginPath();
        g.paths.forEach(function (pts) { pts.forEach(function (p, i) { const x = view.sx(p[0]), y = view.sy(p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); });
        ctx.strokeStyle = g.col; ctx.lineWidth = g.w; ctx.globalAlpha = g.alpha;
        if (g.dash) ctx.setLineDash(g.dash);
        ctx.stroke();
        ctx.restore();
      });
    }
    drawGeomBack();
    if (style === 'surface') { drawTracks(); drawGeomFront(); }
    else { drawGeomFront(); drawTracks(); }
    if (o.axes) drawAxes();
    return { P, F, B };
  }

  /* the commands that set a camera */
  const fmtN = (x) => { const r = Math.round(x * 100) / 100; return String(Object.is(r, -0) ? 0 : r); };
  const vecText = (v) => v.map(fmtN).join(' ');

  PHY.ch07 = {
    dot, cross, norm, camera, cameraTP, tpVector, project, beamOnScreen,
    rangeMm, sampleE, coneDir, neutronDir, protonTrack, neutronTrack, makeEvent, drawScene, cylinder,
    P_ANALOG, P_FLAT, W_MEAN, FWD, A_FWD, CONE, E_CUT, T_ANALOG, R13, TYPES, KEY, vecText, fmtN,
  };
})();
