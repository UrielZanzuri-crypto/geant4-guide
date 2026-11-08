/* PHY.sims.physVote: three official lists, one right answer, and a vote would pick the wrong one. Top: the
   ⁷Li(p,n) cross section from 1 to 20 MeV on a log scale: the evaluated data (schematic shape, real
   threshold), what QGSP_BIC_AllHP uses (the same data), and what the cascade lists QGSP_BIC_HP and
   QGSP_INCLXX_HP use: 3 to 100 times too small below ~10 MeV (the project's validation; the curves here are
   schematic, ratio 0.01 at 3 MeV rising to 0.33 at 10 MeV). Bottom: the ratio list / evaluated.
   Before the run the plot is empty ("?"). play(seconds) draws the evaluated curve, then each list.
   opts: {locked}. getState(): {ratioAt(E) for 'allhp' | 'bic' | 'incl', ran, done}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;

  function cascadeRatio(E, which) {
    let r;
    if (E <= 3) r = 0.01;
    else if (E <= 10) r = Math.pow(10, -2 + (Math.log10(0.33) + 2) * (E - 3) / 7);
    else r = Math.min(0.8, 0.33 + (0.47 * (E - 10)) / 10);
    return which === 'incl' ? r * 1.25 : r;
  }
  const ratioAt = (E, which) => (which === 'allhp' ? 1 : cascadeRatio(E, which));

  PHY.sims.physVote = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const top = PL.create(canvasEl, { x: [1, 20], y: [-3.5, 1.9], rect: { x: 0, y: 0, w: 1, h: 0.58 }, margin: { l: 40, r: 14, t: 28, b: 30 }, xLabel: 'E', xUnit: 'MeV', yLabel: 'log₁₀ σ של ' + F.ltr('⁷Li(p,n)') + ', סכמטי', aspect: 1.05, minHeight: 380, maxHeight: 520 });
    const view = top.view;
    const bot = PL.panel(view, { x: [1, 20], y: [-2.2, 0.3], rect: { x: 0, y: 0.58, w: 1, h: 0.42 }, margin: { l: 40, r: 14, t: 26, b: 36 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'log₁₀ (רשימה / מוערך)' });
    const tw = PHY.tweens();
    const S = { stage: 0, ran: false };

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'a', label: '<bdi>AllHP</bdi> / מוערך, ב-5 MeV' },
        { key: 'b', label: '<bdi>BIC_HP</bdi> / מוערך, ב-5 MeV' },
        { key: 'i', label: '<bdi>INCLXX_HP</bdi> / מוערך, ב-5 MeV' },
      ]);
      U.renderMath(controlsEl);
    }
    function paint() {
      if (!readouts) return;
      readouts.set('a', S.stage >= 2 ? F.num(ratioAt(5, 'allhp'), 2) : '?');
      readouts.set('b', S.stage >= 3 ? F.num(ratioAt(5, 'bic'), 3) : '?');
      readouts.set('i', S.stage >= 4 ? F.num(ratioAt(5, 'incl'), 3) : '?');
    }
    function curve(which) {
      const xs = [], ys = [], rs = [];
      for (let i = 0; i <= 380; i++) {
        const E = 1 + (19 * i) / 380;
        const s = K4.sigma('Li7', E) * ratioAt(E, which);
        xs.push(E); ys.push(s > 0 ? Math.log10(s) : NaN); rs.push(E > 1.9 ? Math.log10(ratioAt(E, which)) : NaN);
      }
      return { xs, ys, rs };
    }
    function render() {
      view.clear();
      top.axes(); bot.axes();
      if (S.stage >= 1) { const c = curve('allhp'); top.line(c.xs, c.ys, { color: 'ink', width: 4, alpha: 0.35 }); }
      if (S.stage >= 2) { const c = curve('allhp'); top.line(c.xs, c.ys, { color: 'accent', width: 1.8 }); bot.line(c.xs, c.rs, { color: 'accent', width: 2 }); }
      if (S.stage >= 3) { const c = curve('bic'); top.line(c.xs, c.ys, { color: 'muted', width: 2, dash: [6, 4] }); bot.line(c.xs, c.rs, { color: 'muted', width: 2, dash: [6, 4] }); }
      if (S.stage >= 4) { const c = curve('incl'); top.line(c.xs, c.ys, { color: 'muted', width: 2, dash: [2, 3] }); bot.line(c.xs, c.rs, { color: 'muted', width: 2, dash: [2, 3] }); }
      if (S.stage >= 1) {
        const items = [{ label: 'מוערך', color: 'ink' }];
        if (S.stage >= 2) items.push({ label: 'AllHP', color: 'accent' });
        if (S.stage >= 3) items.push({ label: 'BIC_HP', color: 'muted', dash: [6, 4] });
        if (S.stage >= 4) items.push({ label: 'INCLXX_HP', color: 'muted', dash: [2, 3] });
        top.legend(items, { corner: 'right' });
        top.vline(5, { color: 'proton', dash: [5, 4] });
      } else {
        K.mark(view, top.X(10), top.Y(-1.7));
      }
      K.clock(view, 'מול הקובץ המוערך, סכמטי');
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.stage = 0;
        paint(); loop.start();
        return tw.run(seconds || 3.5, function (k) {
          S.stage = Math.min(4, 1 + Math.floor(k * 4 + 1e-9));
          paint(); loop.requestRender();
        });
      },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { return { ratioAt, ran: S.ran, stage: S.stage, done: S.stage >= 4 }; },
    };
    paint();
    return api;
  };
})();
