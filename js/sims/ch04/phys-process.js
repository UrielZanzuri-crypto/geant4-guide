/* PHY.sims.physProcess: the processes of a proton, as Geant4 prints them at start-up (PHY.ch04.PROTON_TABLE,
   copied from the log of the Be run). A log energy axis from 0.1 MeV to 100 TeV; one row per model or
   cross-section data set, with its range. A proton energy E (slider, log scale) lights what acts there:
   the protonInelastic model (two inside an overlap), the protonInelastic cross section (the HP data set up
   to 20 MeV, protonParticleXS above), and the ionisation model.
   Card mode: two energies, 13 MeV (the 30 J cut-off) and 100 MeV (near the ELIMAIA cut-off); before the run
   nothing is lit and the readouts are "?". play(seconds) sweeps from 13 to 100 MeV, then shows both.
   opts: {mode: 'card'|'free', E, locked, chapter, section}. getState(): {E, models, xs, ioni, at13, at100, ran}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;
  const XMIN = -1, XMAX = 8;

  PHY.sims.physProcess = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'card', E: 13, locked: true }, opts || {});
    const card = opts.mode === 'card';
    const P = PL.create(canvasEl, { x: [XMIN, XMAX], y: [0, 11.3], grid: false, margin: { l: 10, r: 12, t: 30, b: 34 }, aspect: 1.05, minHeight: 380, maxHeight: 520 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { E: opts.E, ran: !card || !opts.locked, sweep: null, done: !card };
    const T = K4.PROTON_TABLE;

    const ROWS = [
      { title: 'hIoni: יינון, רציף (EM)', y: 10.2, bars: T.hIoni.map((b) => ({ b, lane: 0 })) },
      { title: 'msc: פיזור מרובה (EM)', y: 8.65, bars: T.msc.map((b) => ({ b, lane: 0 })) },
      { title: 'hadElastic: מודל', y: 7.1, bars: T.elModel.map((b) => ({ b, lane: 0 })) },
      { title: 'protonInelastic: מודל, מה יוצא', y: 5.55, bars: T.inelModel.map((b, i) => ({ b, lane: [0, 1, 2, 1, 0][i] })) },
      { title: 'protonInelastic: חתך פעולה, כמה פעמים', y: 1.9, bars: T.inelXS.map((b, i) => ({ b, lane: i })) },
    ];

    let readouts = null, slider = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'm', label: 'מודל (מה יוצא)' },
        { key: 'x', label: 'חתך פעולה (כמה פעמים)' },
        { key: 'i', label: 'יינון' },
      ]);
      slider = U.Slider(controlsEl, { label: 'אנרגיית הפרוטון', min: -1, max: 8, step: 0.01, value: Math.log10(S.E), format: (v) => K4.energyText(Math.pow(10, v)), color: 'var(--c-proton)', onInput: (v) => { S.E = Math.pow(10, v); S.done = true; S.ran = true; paint(); loop.requestRender(); mark(); } });
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    const names = (list) => (list.length ? F.ltr(list.map((m) => m.name).join(' + ')) : '');

    function paint() {
      if (!readouts) return;
      const hide = opts.mode === 'card' && !S.done;
      readouts.set('m', hide ? '?' : names(K4.modelAt(S.E)) || '–');
      readouts.set('x', hide ? '?' : F.ltr(K4.xsAt(S.E).name));
      readouts.set('i', hide ? '?' : F.ltr(K4.ioniAt(S.E).name));
    }

    function isActive(b, E) {
      if (b === T.inelXS[0] || b === T.inelXS[1]) return K4.xsAt(E) === b;
      return E >= b.lo && E <= b.hi;
    }

    function render() {
      view.clear();
      const ctx = view.ctx;
      const box = P.box;
      /* custom log axis */
      ctx.save(); ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
      ctx.lineWidth = 1;
      for (let d = XMIN; d <= XMAX; d++) {
        const px = P.X(d);
        ctx.strokeStyle = C.grid;
        ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke();
      }
      ctx.restore();
      [[0, '1 MeV'], [3, '1 GeV'], [6, '1 TeV'], [8, '100 TeV']].forEach(function (t) {
        view.screenText(P.X(t[0]), box.y + box.h + 11, t[1], { size: 10.5, color: C.muted, align: t[0] === 8 ? 'right' : 'center' });
      });
      view.screenText(box.x + box.w / 2, box.y + box.h + 26, 'אנרגיית הפרוטון, סקלה לוגריתמית', { size: 11.5, weight: 600, color: C.ink });

      const lit = [];
      if (S.ran && opts.mode !== 'card') lit.push(S.E);
      if (S.ran && opts.mode === 'card') { if (S.sweep !== null) lit.push(S.sweep); if (S.done) lit.push(13, 100); }
      ROWS.forEach(function (row) {
        view.screenText(box.x + 2, P.Y(row.y + 0.62), row.title, { size: 11.5, weight: 700, color: C.ink, align: 'left' });
        row.bars.forEach(function (it) {
          const b = it.b;
          const y = row.y - it.lane * 1.05;
          const x0 = P.X(K4.lg(b.lo, XMIN)), x1 = P.X(Math.min(XMAX, Math.log10(b.hi)));
          const on = lit.some((E) => isActive(b, E));
          const yTop = P.Y(y + 0.36), hh = P.Y(y - 0.36) - yTop;
          ctx.save();
          ctx.fillStyle = on ? C.accent : C.muted;
          ctx.globalAlpha = on ? 0.32 : 0.12;
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x0, yTop, Math.max(2, x1 - x0), hh, 5); ctx.fill(); } else ctx.fillRect(x0, yTop, x1 - x0, hh);
          ctx.globalAlpha = 1; ctx.strokeStyle = on ? C.accent : C.gridStrong; ctx.lineWidth = on ? 2 : 1;
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x0, yTop, Math.max(2, x1 - x0), hh, 5); ctx.stroke(); } else ctx.strokeRect(x0, yTop, x1 - x0, hh);
          ctx.restore();
          const label = b.short || b.name;
          ctx.save(); ctx.font = '600 10.5px Heebo, sans-serif';
          const wText = ctx.measureText(label).width;
          ctx.restore();
          const fits = wText + 8 < x1 - x0;
          view.screenText(fits ? (x0 + x1) / 2 : x1 + 4, yTop + hh / 2, label, { size: 10.5, weight: 600, color: on ? C.ink : C.muted, align: fits ? 'center' : 'left' });
        });
      });
      /* the energy markers */
      lit.forEach(function (E) {
        const px = P.X(Math.log10(E));
        ctx.save(); ctx.strokeStyle = C.proton; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(px, box.y + 4); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.restore();
      });
      if (opts.mode === 'card') {
        [13, 100].forEach(function (E, i) {
          const px = P.X(Math.log10(E));
          view.screenText(px + (i ? 4 : -4), box.y + box.h - 8, K4.energyText(E), { size: 10.5, weight: 700, color: C.proton, align: i ? 'left' : 'right', halo: true });
          if (!S.done) {
            ctx.save(); ctx.strokeStyle = C.proton; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(px, box.y + 4); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.restore();
          }
        });
        if (!S.ran) K.mark(view, P.X(1.6), P.Y(3.6));
      } else {
        view.screenText(P.X(Math.log10(S.E)) + 4, box.y + box.h - 8, K4.energyText(S.E), { size: 10.5, weight: 700, color: C.proton, align: Math.log10(S.E) > 6 ? 'right' : 'left', halo: true });
      }
      K.clock(view, 'תהליכים של פרוטון, מהלוג');
    }

    function lock(on) { opts.locked = on; if (slider) slider.setEnabled(!on); }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        opts.mode = 'card'; S.ran = true; S.done = false; S.sweep = 13;
        paint(); loop.start();
        return tw.run(seconds || 3, function (k) {
          S.sweep = Math.pow(10, Math.log10(13) + PHY.ease.inOut(k) * (2 - Math.log10(13)));
          if (k >= 1) { S.sweep = null; S.done = true; S.E = 100; if (slider) slider.set(2); lock(false); }
          paint(); loop.requestRender();
        });
      },
      setParam(key, v) {
        if (key === 'E') { S.E = v; opts.mode = 'free'; S.ran = true; S.done = true; if (slider) slider.set(Math.log10(v)); }
        else if (key === 'locked') lock(v);
        else opts[key] = v;
        paint(); loop.requestRender();
      },
      getState() {
        return {
          E: S.E, models: K4.modelAt(S.E).map((m) => m.name), xs: K4.xsAt(S.E).name, ioni: K4.ioniAt(S.E).name,
          at13: { xs: K4.xsAt(13).name, models: K4.modelAt(13).map((m) => m.name) },
          at100: { xs: K4.xsAt(100).name, models: K4.modelAt(100).map((m) => m.name) },
          ran: S.ran, done: S.done,
        };
      },
    };
    lock(card ? opts.locked : false);
    paint();
    return api;
  };
})();
