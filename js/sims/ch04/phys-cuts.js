/* PHY.sims.physCuts: a lower production cut is more work, not more neutrons. Two lanes with the same
   proton track in Be: the default range cut (0.7 mm, which the log turns into an electron threshold of
   366.6 keV in G4_Be) and a cut of 1 µm (the threshold then sits at the lower limit, about 1 keV). A 13 MeV
   proton can give an electron at most T_max = 2 m_e c² β²γ² ≈ 28 keV, so with the default cut it makes no
   δ-electron tracks at all; with 1 µm it makes many (drawn schematically, blue). The energy the proton loses
   is the same, so the neutron count is a binomial draw with the same p = 4.47×10⁻⁴ in both lanes
   (3×10⁶ protons, independent seeds). Before the run the neutron counts are hidden.
   opts: {N, p, locked, seed}. getState(): {k1, k2, N, tmax, delta1, delta2}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01;
  const ME = 0.51100, MPC2 = 938.272;

  PHY.sims.physCuts = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 3e6, p: 4.47e-4, E: 13, seed: 12, locked: true }, opts || {});
    const P = PL.create(canvasEl, { x: [-0.25, 1.6], y: [0, 4.2], grid: false, margin: { l: 10, r: 12, t: 30, b: 10 }, aspect: 1.5, minHeight: 280, maxHeight: 420 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { ran: false, frac: 0, k1: 0, k2: 0, deltas: [] };
    const gamma = 1 + opts.E / MPC2, b2 = 1 - 1 / (gamma * gamma);
    const tmax = (2 * ME * b2 * gamma * gamma) * 1000;

    (function makeDeltas() {
      const r = PHY.random(9);
      for (let i = 0; i < 70; i++) {
        const x = 1.3 * Math.pow(r.next(), 0.7);
        S.deltas.push({ x, a: (r.next() - 0.5) * 2.6, l: 0.015 + 0.05 * r.next() });
      }
      S.deltas.sort((a, b) => a.x - b.x);
    })();

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'n1', label: 'נייטרונים, חיתוך 0.7 mm', color: 'var(--c-neutron)' },
        { key: 'n2', label: 'נייטרונים, חיתוך 1 µm', color: 'var(--c-neutron)' },
        { key: 'd', label: 'מסלולי e⁻ מהפרוטון: 0.7 mm / 1 µm', color: 'var(--c-electron)' },
      ]);
      U.renderMath(controlsEl);
    }
    function paint() {
      if (!readouts) return;
      const done = S.ran && S.frac >= 1;
      readouts.set('n1', done ? F.ltr(F.num(S.k1, 0) + ' ± ' + F.num(Math.sqrt(S.k1), 0)) : '?');
      readouts.set('n2', done ? F.ltr(F.num(S.k2, 0) + ' ± ' + F.num(Math.sqrt(S.k2), 0)) : '?');
      readouts.set('d', done ? '0 / הרבה' : '?');
    }

    function lane(y0, title, withDeltas) {
      const ctx = view.ctx;
      ctx.save();
      ctx.fillStyle = C.volume; ctx.globalAlpha = 0.07;
      ctx.fillRect(P.X(0), P.Y(y0 + 0.7), P.X(1.6) - P.X(0), P.Y(y0 - 0.7) - P.Y(y0 + 0.7));
      ctx.globalAlpha = 1; ctx.strokeStyle = C.volume; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(P.X(1.6), P.Y(y0 + 0.7)); ctx.lineTo(P.X(0), P.Y(y0 + 0.7)); ctx.lineTo(P.X(0), P.Y(y0 - 0.7)); ctx.lineTo(P.X(1.6), P.Y(y0 - 0.7)); ctx.stroke();
      ctx.restore();
      view.screenText(P.X(1.58), P.Y(y0 + 0.92), title, { size: 11.5, weight: 700, color: C.ink, align: 'right' });
      view.screenText(P.X(1.55), P.Y(y0 - 0.5), 'Be', { size: 11, weight: 700, color: C.volume, align: 'right' });
      const end = S.ran ? 1.3 * Math.min(1, S.frac * 1.25) : 0;
      P.line([-0.22, end], [y0, y0 - 0.04], { color: 'proton', width: 2.2 });
      if (withDeltas && S.ran) {
        S.deltas.forEach(function (d) {
          if (d.x > end) return;
          P.line([d.x, d.x + d.l * Math.cos(d.a)], [y0, y0 + 7 * d.l * Math.sin(d.a)], { color: 'electron', width: 1.2 });
        });
      }
    }
    function render() {
      view.clear();
      lane(3.0, 'חיתוך ' + F.unit(0.7, 'mm', 1) + ': סף e⁻ של ' + F.unit(366.6, 'keV', 1), false);
      lane(1.05, 'חיתוך ' + F.unit(1, 'um', 0) + ': סף e⁻ של כ-' + F.unit(1, 'keV', 0), true);
      K.clock(view, 'פרוטון של ' + F.unit(opts.E, 'MeV', 0) + ' ב-Be, סכמטי');
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const r = PHY.random(opts.seed);
        S.k1 = K.binomial(opts.N, opts.p, r.next);
        S.k2 = K.binomial(opts.N, opts.p, r.next);
        S.ran = true; S.frac = 0;
        paint(); loop.start();
        return tw.run(seconds || 3, function (k) { S.frac = k; paint(); loop.requestRender(); });
      },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { return { k1: S.k1, k2: S.k2, N: opts.N, p: opts.p, tmax, delta1: tmax < 366.6 ? 0 : NaN, delta2: S.deltas.length, ran: S.ran }; },
    };
    paint();
    return api;
  };
})();
