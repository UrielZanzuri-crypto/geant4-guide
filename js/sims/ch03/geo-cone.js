/* PHY.sims.geoCone: the proton cone and the converter disc, in r–z, to scale. The source at z = 0 fires
   protons uniformly in solid angle inside a cone of half-angle θ (cos θ uniform in [cos θ_max, 1], φ
   uniform), as ldns does (/ldns/src/halfAngle). A proton at polar angle θ is at radius z·tan θ at depth z,
   so it hits the front face of a disc of radius r at distance d when d·tan θ ≤ r. Every ray is drawn in
   the r–z half plane of its own φ (mirrored up or down), so a ray that misses also misses in the drawing.
   The fraction that hits, from the solid angles: (1 − cos θ_disc)/(1 − cos θ) with θ_disc = atan(r/d).
   The back face, at d + t, has the cone radius (d + t)·tan θ: if that is larger than r, some protons
   leave through the side wall before crossing the whole thickness.
   mode 'hook': Be 2 mm, r 22 mm at 45 mm, 20°: before play the readouts show "?".
   mode 'check': r 12 mm (the card); after play, sliders for d, r, θ and t (free play).
   opts: {mode, d, r, t, theta, N, seed, locked, chapter, section}.
   getState(): {d, r, t, theta, frac, fracSampled, missed, coneFront, coneBack, thetaDisc, N}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch03;
  const DEG = Math.PI / 180;

  PHY.sims.geoCone = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'hook', d: 45, r: 22, t: 2, theta: 20, N: 260, seed: 4, locked: true }, opts || {});
    const check = opts.mode === 'check';
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -5, xMax: 92, yMin: -40, yMax: 46 }, aspect: 1.2, minHeight: 260, maxHeight: 460 });
    const tw = PHY.tweens();
    const rng = PHY.random(opts.seed);
    const U1 = [], U2 = [];
    for (let i = 0; i < opts.N; i++) { U1.push(rng.next()); U2.push(rng.next()); }
    const S = { ran: !opts.locked, shown: opts.locked ? 0 : opts.N };

    function rays() {
      const c0 = Math.cos(opts.theta * DEG);
      return U1.map(function (u, i) {
        const ct = 1 - u * (1 - c0);
        const th = Math.acos(ct);
        return { tan: Math.tan(th), sgn: U2[i] < 0.5 ? 1 : -1 };
      });
    }
    function stats() {
      const R = rays();
      const hit = R.filter((q) => opts.d * q.tan <= opts.r).length;
      return { frac: K.intercept(opts.d, opts.r, opts.theta), fracSampled: hit / R.length, missed: R.length - hit };
    }

    let Rd = null, sliders = [];
    if (controlsEl) {
      Rd = U.Readouts(controlsEl, check
        ? [{ key: 'hit', label: 'פגעו בפאה הקדמית', color: 'var(--c-proton)' }, { key: 'td', label: 'הזווית של שפת הדיסקה θ_disc' }, { key: 'cf', label: 'רדיוס הקונוס בפאה הקדמית' }, { key: 'cb', label: 'ובפאה האחורית' }]
        : [{ key: 'miss', label: 'פספסו את הדיסקה', color: 'var(--c-proton)' }, { key: 'cf', label: 'רדיוס הקונוס בפאה הקדמית' }, { key: 'cb', label: 'ובפאה האחורית' }]);
      if (check) {
        const grid = U.h('div', { class: 'sim-grid' });
        controlsEl.appendChild(grid);
        const mk = (key, label, min, max, step, unit, d) => {
          const s = U.Slider(grid, { label, min, max, step, value: opts[key], unit, digits: d, onInput: (v) => { opts[key] = v; paint(); loop.requestRender(); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); } });
          s.setEnabled(!opts.locked);
          sliders.push(s);
        };
        mk('d', 'מרחק מהמקור d', 10, 90, 1, 'mm', 0);
        mk('r', 'רדיוס הדיסקה r', 4, 40, 0.5, 'mm', 1);
        mk('theta', 'חצי זווית הקונוס θ', 5, 40, 1, 'deg', 0);
        mk('t', 'עובי הממיר t', 0.5, 30, 0.5, 'mm', 1);
      }
    }
    function paint() {
      if (!Rd) return;
      const done = S.ran && S.shown >= opts.N;
      const st = stats();
      const cf = K.coneR(opts.d, opts.theta), cb = K.coneR(opts.d + opts.t, opts.theta);
      if (check) {
        Rd.set('hit', done ? F.unit(100 * st.frac, '%', 1) : '?');
        Rd.set('td', done ? F.deg(K.thetaDisc(opts.d, opts.r), 1) : '?');
        Rd.set('cf', done ? F.unit(cf, 'mm', 1) : '?');
        Rd.set('cb', done ? F.unit(cb, 'mm', 1) : '?');
      } else {
        Rd.set('miss', done ? F.unit(100 * (1 - st.frac), '%', 0) : '?');
        Rd.set('cf', done ? F.unit(cf, 'mm', 1) : '?');
        Rd.set('cb', done ? F.unit(cb, 'mm', 1) : '?');
      }
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      const zMax = 90;
      /* axis */
      view.line(-3, 0, zMax, 0, { color: 'grid', width: 1, dash: [3, 4] });
      view.text(zMax - 1, -2.6, 'z', { size: 11, color: C.muted, align: 'right' });
      view.text(-1.5, 40, 'r', { size: 11, color: C.muted });
      /* the disc */
      const model = { layers: [{ mat: 'Be', t: opts.t }], distance: opts.d, radius: opts.r };
      K.drawRZ(view, model, { cone: opts.theta, zMax, labels: true });
      /* rays */
      const R = rays();
      const n = S.ran ? S.shown : 0;
      for (let i = 0; i < n; i++) {
        const q = R[i];
        const hit = opts.d * q.tan <= opts.r;
        const z1 = hit ? opts.d : Math.min(zMax, 44 / Math.max(q.tan, 1e-6));
        view.line(0, 0, z1, q.sgn * z1 * q.tan, { color: 'proton', width: 1, alpha: hit ? 0.35 : 0.6 });
        if (!hit) view.circle(z1, q.sgn * z1 * q.tan, 1.6, { px: true, fill: C.proton });
      }
      /* the cone radius at the two faces */
      if (S.ran && S.shown >= opts.N) {
        const cf = K.coneR(opts.d, opts.theta), cb = K.coneR(opts.d + opts.t, opts.theta);
        view.line(opts.d - 1.5, cf, opts.d - 1.5, 0, { color: 'ink', width: 1.4 });
        view.text(opts.d - 2.5, cf / 2, F.num(cf, 1), { size: 10.5, weight: 700, color: C.ink, align: 'right', halo: true });
        if (opts.t * view.scale > 6) view.line(opts.d + opts.t + 1.5, -cb, opts.d + opts.t + 1.5, 0, { color: 'ink', width: 1.4 });
      }
      K.clock(view, 'בקנה מידה, r–z');
      if (!S.ran) K.mark(view, view.sx(70), view.sy(18));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = !opts.locked; S.shown = S.ran ? opts.N : 0; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.shown = 0; loop.start();
        return tw.run(seconds || 3, (k) => { S.shown = Math.round(opts.N * k); if (k >= 1) S.shown = opts.N; paint(); loop.requestRender(); })
          .then(() => { opts.locked = false; sliders.forEach((s) => s.setEnabled(true)); paint(); });
      },
      setParam(key, v) { opts[key] = v; paint(); loop.requestRender(); },
      getState() {
        const st = stats();
        return { d: opts.d, r: opts.r, t: opts.t, theta: opts.theta, frac: st.frac, fracSampled: st.fracSampled, missed: st.missed, N: opts.N, coneFront: K.coneR(opts.d, opts.theta), coneBack: K.coneR(opts.d + opts.t, opts.theta), thetaDisc: K.thetaDisc(opts.d, opts.r), shown: S.shown };
      },
    };
    paint();
    return api;
  };
})();
