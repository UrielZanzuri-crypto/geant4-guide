/* PHY.sims.physValid: what the project validated, by nucleus and proton energy (README §6.5, GUIDE §12):
   below 20 MeV the ParticleHP cross sections equal the evaluated files (ratio 1.00 for ⁷Li, ⁹Be, ¹⁹F with
   the multiplicity fix); above 20 MeV σ comes from G4PARTICLEXS, 12-27 % low for ¹⁹F and ⁹Be; ⁷Li has no
   evaluated data above 20 MeV at all (the final state is extrapolated: not validated); ²⁰⁸Pb at 10-16 MeV
   gives too few neutrons for a reason not understood yet. One row per nucleus on a linear axis 0-102 MeV
   (the ELIMAIA cut-off). Before the run the rows are grey; play(seconds) colours them one by one.
   opts: {locked}. getState(): {rows, stage, statusAt(nucleus, E)}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, C = PHY.colors, PL = PHY.plot, K = PHY.ch01;

  const ROWS = [
    { label: '⁷Li', segs: [{ lo: 1.88, hi: 20, st: 'ok', t: '1.00' }, { lo: 20, hi: 102, st: 'none', t: 'אין נתונים מוערכים' }] },
    { label: '⁹Be', segs: [{ lo: 2.06, hi: 20, st: 'ok', t: '1.00' }, { lo: 20, hi: 102, st: 'low', t: 'σ נמוך ב-' + F.ltr('12-27%') }] },
    { label: '¹⁹F', segs: [{ lo: 4.2, hi: 20, st: 'ok', t: '1.00' }, { lo: 20, hi: 102, st: 'low', t: 'σ נמוך ב-' + F.ltr('12-27%') }] },
    { label: '²⁰⁸Pb', segs: [{ lo: 10, hi: 16, st: 'none', t: '?' }, { lo: 16, hi: 20, st: 'ok', t: '' }, { lo: 20, hi: 102, st: 'xs', t: 'σ מ-G4PARTICLEXS' }] },
  ];
  function statusAt(label, E) {
    const r = ROWS.find((x) => x.label === label);
    const s = r && r.segs.find((q) => E >= q.lo && E < q.hi);
    return s ? s.st : 'below';
  }

  PHY.sims.physValid = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const P = PL.create(canvasEl, { x: [0, 102], y: [0, 4.4], grid: false, margin: { l: 44, r: 12, t: 30, b: 38 }, aspect: 1.35, minHeight: 300, maxHeight: 440 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { stage: 0 };

    function render() {
      view.clear();
      const ctx = view.ctx, box = P.box;
      ctx.save(); ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke(); ctx.restore();
      [0, 20, 40, 60, 80, 100].forEach(function (v) { view.screenText(P.X(v), box.y + box.h + 11, F.num(v, 0), { size: 10.5, color: C.muted }); });
      view.screenText(box.x + box.w / 2, box.y + box.h + 27, 'אנרגיית הפרוטון (' + F.ltr('MeV') + ')', { size: 11.5, weight: 600, color: C.ink });
      P.vline(20, { color: 'ink', dash: [4, 4], label: F.ltr('20 MeV'), labelAt: 'top' });
      ROWS.forEach(function (row, i) {
        const y = 3.6 - i * 1.0;
        view.screenText(box.x - 6, P.Y(y), row.label, { size: 12, weight: 700, color: C.ink, align: 'right' });
        const on = S.stage > i;
        row.segs.forEach(function (s) {
          const x0 = P.X(s.lo), x1 = P.X(s.hi), t = P.Y(y + 0.32), h = P.Y(y - 0.32) - t;
          ctx.save();
          if (!on) { ctx.fillStyle = C.muted; ctx.globalAlpha = 0.12; }
          else if (s.st === 'ok') { ctx.fillStyle = C.accent; ctx.globalAlpha = 0.45; }
          else if (s.st === 'low' || s.st === 'xs') { ctx.fillStyle = C.accent; ctx.globalAlpha = 0.16; }
          else { ctx.fillStyle = C.bad; ctx.globalAlpha = 0.16; }
          ctx.fillRect(x0, t, x1 - x0, h);
          ctx.globalAlpha = 1; ctx.lineWidth = 1.2; ctx.strokeStyle = on && s.st === 'none' ? C.bad : C.gridStrong;
          if (on && s.st === 'none') ctx.setLineDash([4, 3]);
          ctx.strokeRect(x0, t, x1 - x0, h);
          ctx.restore();
          if (on && s.t) {
            ctx.save(); ctx.font = '600 10.5px Heebo, sans-serif'; const w = ctx.measureText(s.t).width; ctx.restore();
            if (w + 6 < x1 - x0) view.screenText((x0 + x1) / 2, t + h / 2, s.t, { size: 10.5, weight: 600, color: s.st === 'none' ? C.bad : C.ink });
          }
        });
      });
      if (S.stage === 0) K.mark(view, P.X(60), P.Y(2.2));
      K.clock(view, 'Geant4 מול הקובץ המוערך');
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear(); S.stage = 0; loop.start();
        return tw.run(seconds || 3, function (k) { S.stage = Math.min(4, Math.floor(k * 4 + 1e-9) + (k >= 1 ? 0 : 0)); if (k >= 1) S.stage = 4; loop.requestRender(); });
      },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { return { rows: ROWS, stage: S.stage, statusAt }; },
    };
    return api;
  };
})();
