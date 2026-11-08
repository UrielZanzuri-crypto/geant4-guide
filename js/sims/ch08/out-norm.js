/* PHY.sims.outNorm: from the leak table to neutrons per shot. The top panel shows what the question gives:
   the 6126 rows of `leak` and the sum of their weights, 1341, from 3×10⁶ protons, as two bars. The bottom
   panel is a log number line of "neutrons per shot". play(seconds) puts three candidates on it, one by one:
     rows       rows / N × N_shot            (every row taken as one neutron)
     weights    Σw / N × N_shot              (the normalisation of ldns)
     per row    Σw / rows × N_shot           (the mean weight of a row, as if a row were a proton)
   and then the value the run printed in its log, 1.974×10⁸; the candidate within 1 % of it is marked.
   Before the run the number line is empty ("?") and the readouts show "?".
   opts: {rows, sumW, N, nShot, logValue, locked}. getState(): {ran, shown, values: {rows, weights, perRow},
   log, match (the key within 1 % of the log value)}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K1 = PHY.ch01, K = PHY.ch08;

  PHY.sims.outNorm = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ rows: K.BE.rows, sumW: K.BE.sumW, N: K.BE.N, nShot: K.BE.nShot, logValue: K.BE.logPerShot, locked: true }, opts || {});
    const M = { l: 18, r: 18 };
    const top = PL.create(canvasEl, { x: [0, 7000], y: [0, 2.6], grid: false, rect: { x: 0, y: 0, w: 1, h: 0.42 }, margin: { l: M.l, r: M.r, t: 34, b: 8 }, aspect: 1.3, minHeight: 320, maxHeight: 460 });
    const view = top.view;
    const bot = PL.panel(view, { x: [7, 11.5], y: [0, 4], rect: { x: 0, y: 0.42, w: 1, h: 0.58 }, margin: { l: M.l, r: M.r, t: 10, b: 38 }, xLabel: 'נייטרונים לירייה', grid: false });
    const tw = PHY.tweens();
    const S = { ran: false, shown: 0, logShown: 0 };
    const vals = () => ({
      rows: (opts.rows / opts.N) * opts.nShot,
      weights: (opts.sumW / opts.N) * opts.nShot,
      perRow: (opts.sumW / opts.rows) * opts.nShot,
    });
    const KEYS = ['rows', 'weights', 'perRow'];
    const NAMES = { rows: 'לפי השורות', weights: 'לפי המשקלים', perRow: 'משקל ממוצע לשורה' };

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'rows', label: 'שורות ÷ אירועים × פרוטונים בירייה' },
        { key: 'weights', label: 'סכום המשקלים ÷ אירועים × פרוטונים בירייה', color: 'var(--c-neutron)' },
        { key: 'perRow', label: 'סכום המשקלים ÷ שורות × פרוטונים בירייה' },
        { key: 'log', label: 'בלוג של הריצה' },
      ]);
    }
    function paint() {
      if (!readouts) return;
      const v = vals();
      KEYS.forEach(function (k, i) { readouts.set(k, S.ran && S.shown > i ? F.sci(v[k], 2) : '?'); });
      readouts.set('log', S.ran && S.logShown >= 1 ? F.sci(opts.logValue, 3) : '?');
    }
    function match() {
      const v = vals();
      return KEYS.find((k) => Math.abs(v[k] / opts.logValue - 1) < 0.01) || null;
    }

    function render() {
      view.clear();
      const ctx = view.ctx;
      /* the two given bars */
      const rowsY = 1.85, wY = 0.75, hh = 0.32;
      top.clip(function () {
        ctx.save();
        ctx.fillStyle = C.muted; ctx.globalAlpha = 0.35;
        ctx.fillRect(top.X(0), top.Y(rowsY + hh), top.X(opts.rows) - top.X(0), top.Y(rowsY - hh) - top.Y(rowsY + hh));
        ctx.fillStyle = C.neutron; ctx.globalAlpha = 0.6;
        ctx.fillRect(top.X(0), top.Y(wY + hh), top.X(opts.sumW) - top.X(0), top.Y(wY - hh) - top.Y(wY + hh));
        ctx.restore();
      });
      view.screenText(top.X(opts.rows) - 6, top.Y(rowsY), 'שורות בטבלה: ' + F.num(opts.rows, 0), { size: 12.5, weight: 700, color: C.ink, align: 'right' });
      view.screenText(top.X(opts.sumW) + 8, top.Y(wY), 'סכום המשקלים: ' + F.num(opts.sumW, 0), { size: 12.5, weight: 700, color: C.neutron, align: 'left' });
      K1.clock(view, 'אירועים: ' + F.sci(opts.N, 0) + ', פרוטונים בירייה: ' + F.sci(opts.nShot, 2));

      /* the number line */
      const b = bot.box;
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
      ctx.restore();
      K.logAxis(bot, bot.range.x[0], bot.range.x[1], K.pow10);
      const label = (name) => view.screenText(b.x + b.w / 2, b.y + b.h + 27, name, { size: 12, weight: 600, color: C.ink });
      label('נייטרונים לירייה (סקלה לוגריתמית)');
      const v = vals();
      const m = S.logShown >= 1 ? match() : null;
      if (S.logShown > 0) {
        const lx = Math.log10(opts.logValue);
        ctx.save();
        ctx.globalAlpha = Math.min(1, S.logShown);
        ctx.strokeStyle = C.good; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(bot.X(lx), b.y); ctx.lineTo(bot.X(lx), b.y + b.h); ctx.stroke();
        ctx.restore();
        view.screenText(bot.X(lx) + 6, b.y + 9, 'הלוג: ' + F.sci(opts.logValue, 3), { size: 12, weight: 700, color: C.good, align: 'left', halo: true, alpha: Math.min(1, S.logShown) });
      }
      KEYS.forEach(function (k, i) {
        if (!S.ran || S.shown <= i) return;
        const lane = 3 - i;
        const x = Math.log10(v[k]);
        const on = m === k;
        bot.marker(x, lane, { color: on ? 'neutron' : 'ink', r: on ? 7 : 5.5, shape: on ? 'dot' : 'ring' });
        const right = bot.X(x) > b.x + b.w * 0.62;
        view.screenText(bot.X(x) + (right ? -12 : 12), bot.Y(lane), NAMES[k] + ': ' + F.sci(v[k], 2), { size: 12, weight: 700, color: on ? C.neutron : C.ink, align: right ? 'right' : 'left', halo: true });
      });
      if (!S.ran) K1.mark(view, bot.X(9.25), bot.Y(2));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    function lock(on) { opts.locked = on; }
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const T = seconds || 3.5;
        S.ran = true; S.shown = 0; S.logShown = 0;
        paint(); loop.start();
        return tw.run(0.75 * T, function (k) {
          S.shown = Math.min(3, Math.floor(3 * k + 1e-9) + 1);
          if (k >= 1) S.shown = 3;
          paint(); loop.requestRender();
        }).then(() => tw.run(0.25 * T, function (k) {
          S.logShown = k;
          if (k >= 1) { S.logShown = 1; lock(false); }
          paint(); loop.requestRender();
        }));
      },
      setParam(key, v) { opts[key] = v; paint(); loop.requestRender(); },
      getState() { return { ran: S.ran, shown: S.shown, values: vals(), log: opts.logValue, match: S.logShown >= 1 ? match() : null }; },
    };
    paint();
    return api;
  };
})();
