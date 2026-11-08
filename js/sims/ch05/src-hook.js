/* PHY.sims.srcHook: three ways to fire 3×10⁶ protons from the 30 J spectrum, and the neutrons per shot each
   one estimates (toy yield of PHY.ch05, calibrated to 4.47×10⁻⁴ per proton fired above 1.85 MeV, so the
   true value is 4.47×10⁻⁴ × 4.42×10¹¹ = 1.97×10⁸ per shot).
   'analog': as the spectrum says, from 0.5 MeV (the real mix: about 5 % of the protons above 6 MeV).
   'cut6':   as the spectrum says, but only from 6 MeV (all statistics in the tail, the rest thrown away).
   'flat':   uniform in E from 1.85 MeV, every proton with the weight w = f(E)(Emax − Emin)/∫f.
   play(seconds) runs each strategy in 10 chunks, so the estimate and its error bar settle as N grows.
   Top: the share of the fired protons above 6 MeV. Bottom: the estimate per shot ± error, and after the
   run the true value. Before the run nothing is shown ("?").
   opts: {N, seed, locked}. getState(): {runs: {analog, cut6, flat} each {perShot, errShot, k, N, above6}, truth}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K5 = PHY.ch05;
  const KEYS = ['analog', 'cut6', 'flat'];
  const SET = { analog: { mode: 'analog', Emin: 0.5 }, cut6: { mode: 'analog', Emin: 6 }, flat: { mode: 'flat', Emin: 1.85 } };
  const CHUNKS = 10;

  PHY.sims.srcHook = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 3e6, seed: 2026, locked: true }, opts || {});
    const LABELS = ['לפי הספקטרום', 'רק מעל ' + F.unit(6, 'MeV', 0), 'אחיד, עם משקל'];
    const top = PL.create(canvasEl, { x: [-0.6, 2.6], y: [0, 125], grid: false, rect: { x: 0, y: 0, w: 1, h: 0.36 }, margin: { l: 40, r: 12, t: 30, b: 12 }, yLabel: 'נורו מעל ' + F.unit(6, 'MeV', 0) + ' (%)', aspect: 1.05, minHeight: 380, maxHeight: 520 });
    const view = top.view;
    const bot = PL.panel(view, { x: [-0.6, 2.6], y: [1.2, 2.4], grid: true, rect: { x: 0, y: 0.36, w: 1, h: 0.64 }, margin: { l: 40, r: 12, t: 26, b: 40 }, yLabel: 'נייטרונים לירייה, ב-' + F.ltr('10⁸'), yColor: 'neutron' });
    const tw = PHY.tweens();
    const truth = 4.47e-4 * K5.nShot(1.85, 13, 20);
    const S = { ran: false, done: false, acc: null, chunk: 0 };

    function reset() {
      S.acc = {};
      KEYS.forEach((k) => { S.acc[k] = { N: 0, k: 0, s1: 0, s2: 0, above6: 0, nShot: K5.nShot(SET[k].Emin, 13, 20) }; });
      S.chunk = 0;
    }
    function addChunk(rng) {
      const n = opts.N / CHUNKS;
      KEYS.forEach(function (k) {
        const q = K5.toyRun(SET[k].mode, n, rng, { Emin: SET[k].Emin });
        const a = S.acc[k];
        a.N += n; a.k += q.k; a.s1 += q.sumW;
        /* Σ w² k: recover it from the chunk's error */
        a.s2 += (q.err * q.err * n + q.mean * q.mean) * n;
        let above = 0;
        q.fired.forEach((c, j) => { if (q.Emin + (j + 0.5) * q.h > 6) above += c; });
        a.above6 += above;
      });
      S.chunk++;
    }
    function est(k) {
      const a = S.acc[k];
      if (!a || !a.N) return null;
      const mean = a.s1 / a.N;
      const err = Math.sqrt(Math.max(a.s2 / a.N - mean * mean, 0) / a.N);
      return { perShot: mean * a.nShot, errShot: err * a.nShot, k: a.k, N: a.N, above6: a.above6 / a.N };
    }

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, KEYS.map((k, i) => ({ key: k, label: LABELS[i] + ' (' + F.ltr('10⁸') + ')', color: 'var(--c-neutron)' })));
    }
    function paint() {
      if (!readouts) return;
      KEYS.forEach(function (k) {
        const e = S.ran ? est(k) : null;
        readouts.set(k, e ? F.ltr(F.num(e.perShot / 1e8, 2) + ' ± ' + F.num(e.errShot / 1e8, 2)) : '?');
      });
    }

    function render() {
      view.clear();
      const ctx = view.ctx;
      K5.yAxisOnly(top);
      K5.yAxisOnly(bot);
      KEYS.forEach(function (k, j) {
        const i = 2 - j;   /* right to left, in the order of the readouts */
        view.screenText(bot.X(i), bot.box.y + bot.box.h + 12, LABELS[j], { size: 10.5, weight: 700, color: C.ink });
        const e = S.ran ? est(k) : null;
        if (!e) return;
        const pc = 100 * e.above6;
        top.clip(function () {
          ctx.save(); ctx.fillStyle = C.proton; ctx.globalAlpha = 0.45;
          ctx.fillRect(top.X(i - 0.28), top.Y(pc), top.X(i + 0.28) - top.X(i - 0.28), top.Y(0) - top.Y(pc));
          ctx.restore();
        });
        view.screenText(top.X(i), top.Y(pc) - 9, F.unit(pc, '%', 0), { size: 11, weight: 700, color: C.ink, halo: true });
        const y = e.perShot / 1e8, ey = e.errShot / 1e8;
        ctx.save(); ctx.strokeStyle = C.neutron; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(bot.X(i), bot.Y(y - ey)); ctx.lineTo(bot.X(i), bot.Y(y + ey)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bot.X(i) - 7, bot.Y(y - ey)); ctx.lineTo(bot.X(i) + 7, bot.Y(y - ey)); ctx.moveTo(bot.X(i) - 7, bot.Y(y + ey)); ctx.lineTo(bot.X(i) + 7, bot.Y(y + ey)); ctx.stroke();
        ctx.restore();
        bot.marker(i, y, { color: 'neutron', r: 5, shape: 'dot' });
      });
      if (S.done) {
        bot.hline(truth / 1e8, { color: 'ink', dash: [6, 4] });
        bot.legend([{ label: 'הערך הנכון', color: 'ink', dash: [6, 4] }], { corner: 'right' });
      }
      if (!S.ran) K.mark(view, bot.X(1), bot.Y(1.8));
      K.clock(view, 'פרוטונים בכל ריצה: ' + F.ltr(F.num(S.ran ? S.acc.flat.N : 0, 0)));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        reset();
        const rng = PHY.random(opts.seed).next;
        S.ran = true; S.done = false;
        paint(); loop.start();
        return tw.run(seconds || 4, function (k) {
          const want = Math.min(CHUNKS, Math.ceil(k * CHUNKS - 1e-9));
          while (S.chunk < want) addChunk(rng);
          if (k >= 1) { while (S.chunk < CHUNKS) addChunk(rng); S.done = true; }
          paint(); loop.requestRender();
        });
      },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() {
        const runs = {};
        KEYS.forEach((k) => { runs[k] = est(k); });
        return { runs, truth, done: S.done, ran: S.ran };
      },
    };
    reset();
    paint();
    return api;
  };
})();
