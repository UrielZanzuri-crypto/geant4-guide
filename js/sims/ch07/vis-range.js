/* PHY.sims.visRange: where the red trajectories of geometry_30J_Be4.png end. A side view, magnified, of
   the Be disc of the picture: front face at z = 45 mm, 4 mm thick. Protons of the real mix (analog from
   0.5 MeV, schematic spectrum PHY.ch07.sampleE) come in from the source in the 20° cone and stop after
   their range, R(E) = 1.3 mm (E / 13 MeV)^1.75 (the Bragg-Kleeman rule, scaled to the 1.3 mm of PLAN 4,
   approximate). The transverse axis is y in mm, on its own scale. Under the disc, a histogram of the depth where they stop. Before play() the disc is empty
   and a "?" waits. After it, the source can be switched to flat from 1.85 MeV, which fires more energetic
   protons. opts: {N, src, seed, locked, chapter, section}. getState(): {N, depths, max, mean, beyond}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch07, PL = PHY.plot;
  const Z0 = 45, T = 4;

  PHY.sims.visRange = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 300, src: 'analog', seed: 3, locked: true }, opts || {});
    const P = PL.create(canvasEl, { rect: { x: 0, y: 0, w: 1, h: 0.66 }, x: [43.5, 50], y: [-18, 18], xLabel: 'z', xUnit: 'mm', yLabel: 'y', yUnit: 'mm', margin: { l: 40, r: 14, t: 30, b: 30 }, aspect: 1.05, minHeight: 330, maxHeight: 560 });
    const view = P.view;
    const H = PL.panel(view, { rect: { x: 0, y: 0.66, w: 1, h: 0.34 }, x: [43.5, 50], y: [0, 1], yLabel: 'נעצרו', margin: { l: 40, r: 14, t: 10, b: 32 } });
    const C = PHY.colors;
    const tw = PHY.tweens();
    const S = { list: [], shown: 0, ran: false, counts: [], dz: 0.1 };

    function plan() {
      const rng = PHY.random(opts.seed).next;
      const src = opts.src === 'flat' ? { mode: 'flat', Emin: 1.85 } : { mode: 'analog', Emin: 0.5 };
      S.list = [];
      for (let i = 0; i < opts.N; i++) {
        const p = K.protonTrack(rng, src, Z0);
        /* where it crosses the front face (y in the side view) and where it stops */
        const yf = p.pts[1][1], zs = p.pts[2][2], ys = p.pts[2][1];
        S.list.push({ yf, ys, zs, depth: zs - Z0, slope: p.dir[1] / p.dir[2], E: p.E });
      }
      const nb = Math.round((50 - 43.5) / S.dz);
      S.counts = new Array(nb).fill(0);
      S.shown = 0;
    }
    function histo() {
      S.counts.fill(0);
      for (let i = 0; i < S.shown; i++) {
        const b = Math.floor((S.list[i].zs - 43.5) / S.dz);
        if (b >= 0 && b < S.counts.length) S.counts[b]++;
      }
      H.setRange({ y: [0, Math.max(5, PL.niceRange(0, 1.15 * Math.max.apply(null, S.counts.concat([1])))[1])] });
    }
    let ro = null, srcC = null;
    if (controlsEl) {
      ro = U.Readouts(controlsEl, [{ key: 'n', label: 'פרוטונים', color: 'var(--c-proton)' }, { key: 'm', label: 'העמוק ביותר, mm' }, { key: 'a', label: 'עומק ממוצע, mm' }]);
      srcC = U.Choice(controlsEl, { label: 'המקור', options: [{ value: 'analog', text: 'התערובת האמיתית מ-0.5 MeV' }, { value: 'flat', text: '<span dir="ltr">flat</span> מ-1.85 MeV' }], value: opts.src, onChange(v) { opts.src = v; api.play(2.5); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); } });
    }
    function lock(on) { opts.locked = on; if (srcC) srcC.setEnabled(!on); }
    function stats() {
      const d = S.list.slice(0, S.shown).map((q) => q.depth);
      return { max: d.length ? Math.max.apply(null, d) : 0, mean: d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0 };
    }
    function paint() {
      if (!ro) return;
      const s = stats();
      ro.set('n', S.ran ? F.num(S.shown, 0) : '?');
      ro.set('m', S.ran && S.shown ? F.num(s.max, 2) : '?');
      ro.set('a', S.ran && S.shown ? F.num(s.mean, 2) : '?');
    }
    function render() {
      view.clear();
      P.axes();
      const ctx = view.ctx;
      /* the disc */
      P.clip(function () {
        ctx.save();
        ctx.fillStyle = C.volume; ctx.globalAlpha = 0.1;
        ctx.fillRect(P.X(Z0), P.Y(18), P.X(Z0 + T) - P.X(Z0), P.Y(-18) - P.Y(18));
        ctx.restore();
      });
      P.vline(Z0, { color: 'volume' });
      P.vline(Z0 + T, { color: 'volume' });
      P.vline(Z0 + K.R13, { color: 'muted', dash: [4, 4] });
      view.screenText(P.X(Z0 + T) - 4, P.Y(15.5), F.ltr('Be, 4 mm'), { size: 11.5, weight: 700, align: 'right', color: C.volume });
      view.screenText(P.X(Z0 + K.R13) + 4, P.Y(-15.5), F.ltr('R(13 MeV) ≈ 1.3 mm'), { size: 11, weight: 600, align: 'left', color: C.muted, halo: true });
      /* the protons: from the left edge to where they stop */
      P.clip(function () {
        ctx.save();
        ctx.strokeStyle = C.proton; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
        ctx.beginPath();
        for (let i = 0; i < S.shown; i++) {
          const q = S.list[i];
          const yA = q.yf - q.slope * (Z0 - 43.5);
          ctx.moveTo(P.X(43.5), P.Y(yA));
          ctx.lineTo(P.X(Z0), P.Y(q.yf));
          ctx.lineTo(P.X(q.zs), P.Y(q.ys));
        }
        ctx.stroke();
        ctx.restore();
      });
      view.screenText(10, 16, 'מבט מהצד, מוגדל', { size: 11.5, weight: 600, align: 'left', color: C.muted, pill: true });
      H.axes();
      const hctx = view.ctx;
      H.clip(function () {
        hctx.save();
        hctx.fillStyle = C.proton; hctx.globalAlpha = 0.55;
        const y0 = H.Y(0);
        S.counts.forEach(function (c, i) {
          if (!c) return;
          const xa = H.X(43.5 + i * S.dz), xb = H.X(43.5 + (i + 1) * S.dz), y = H.Y(c);
          hctx.fillRect(xa, y, Math.max(1, xb - xa - 0.5), y0 - y);
        });
        hctx.restore();
      });
      H.vline(Z0 + T, { color: 'volume' });
      if (!S.ran) view.screenText(P.X(Z0 + 1.5), P.Y(0), '?', { size: 34, weight: 800, color: C.muted, halo: true });
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; plan(); histo(); paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        plan();
        S.ran = true;
        loop.start();
        return tw.run(seconds || 3.5, function (k) {
          S.shown = Math.round(opts.N * Math.min(1, k));
          histo(); paint(); loop.requestRender();
          if (k >= 1) lock(false);
        });
      },
      setParam(key, v) { if (key === 'locked') lock(v); else { opts[key] = v; api.reset(); } },
      getState() {
        const s = stats();
        return { N: S.shown, depths: S.list.slice(0, S.shown).map((q) => q.depth), energies: S.list.slice(0, S.shown).map((q) => q.E), max: s.max, mean: s.mean, beyond: S.list.slice(0, S.shown).filter((q) => q.depth > T).length };
      },
    };
    plan(); histo();
    lock(opts.locked);
    paint();
    return api;
  };
})();
