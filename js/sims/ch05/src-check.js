/* PHY.sims.srcCheck: the input check, as analysis/check_inputs.py does it on the 'primary' ntuple. N protons
   are fired flat between 1.85 and 13 MeV with their weights and with cos θ uniform in the 20° cone.
   Top: the weighted spectrum divided by the expected one, in 30 log-spaced bins, with error bars from Σw²,
   and χ²/ndf. Bottom: the histogram of cos θ in 20 bins between cos 20° = 0.940 and 1, with χ²/ndf against
   a flat line. A fresh sample (new seed) gives a new χ²/ndf: it scatters around 1.
   Before the run the plots are empty and the readouts "?". opts: {N, seed, locked}.
   getState(): {N, chi2E, ndfE, chi2C, ndfC, meanW, errW, cosMin, ratios}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K5 = PHY.ch05;
  const E0 = 1.85, E1 = 13, NBE = 30, NBC = 20;
  const CMIN = Math.cos((20 * Math.PI) / 180);

  PHY.sims.srcCheck = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 300000, seed: 11, locked: true }, opts || {});
    const tab = K5.table(E0, E1);
    const edges = [];
    for (let j = 0; j <= NBE; j++) edges.push(E0 * Math.pow(E1 / E0, j / NBE));
    const expFrac = edges.slice(0, NBE).map((a, j) => K5.integ((E) => K5.spec(E), a, edges[j + 1], 16) / tab.I);
    const top = PL.create(canvasEl, { x: [Math.log10(1.7), Math.log10(14)], y: [0.85, 1.15], rect: { x: 0, y: 0, w: 1, h: 0.5 }, margin: { l: 44, r: 12, t: 28, b: 38 }, xLabel: 'log₁₀ של האנרגיה', xUnit: 'MeV', yLabel: 'נורה חלקי ' + F.ltr('HERMIONE'), aspect: 1.0, minHeight: 400, maxHeight: 560 });
    const view = top.view;
    const bot = PL.panel(view, { x: [CMIN - 0.002, 1.002], y: [0, 1.4], rect: { x: 0, y: 0.5, w: 1, h: 0.5 }, margin: { l: 44, r: 12, t: 26, b: 36 }, xLabel: 'cos θ', yLabel: 'פרוטונים בתא, יחסית לממוצע' });
    const tw = PHY.tweens();
    const S = { ran: false, done: false, seed: opts.seed, res: null };

    function run(seed) {
      const r = PHY.random(seed).next;
      const cw = new Array(NBE).fill(0), cw2 = new Array(NBE).fill(0), cc = new Array(NBC).fill(0);
      let s = 0, s2 = 0, cosMin = 1;
      const lnr = Math.log(E1 / E0);
      for (let i = 0; i < opts.N; i++) {
        const E = E0 + r() * (E1 - E0);
        const w = K5.weightFlat(tab, E);
        s += w; s2 += w * w;
        const j = Math.min(NBE - 1, Math.floor((Math.log(E / E0) / lnr) * NBE));
        cw[j] += w; cw2[j] += w * w;
        const c = K5.cosUniform(r(), 20);
        if (c < cosMin) cosMin = c;
        cc[Math.min(NBC - 1, Math.floor(((c - CMIN) / (1 - CMIN)) * NBC))]++;
      }
      let chi2E = 0, chi2C = 0;
      const ratios = [];
      for (let j = 0; j < NBE; j++) {
        const exp = opts.N * expFrac[j];
        chi2E += ((cw[j] - exp) * (cw[j] - exp)) / cw2[j];
        ratios.push({ r: cw[j] / exp, e: Math.sqrt(cw2[j]) / exp });
      }
      const expC = opts.N / NBC;
      for (let j = 0; j < NBC; j++) chi2C += ((cc[j] - expC) * (cc[j] - expC)) / expC;
      const me = K.meanErr(s, s2, opts.N);
      return { chi2E, ndfE: NBE, chi2C, ndfC: NBC, meanW: me.mean, errW: me.err, cosMin, ratios, cc, expC };
    }

    let readouts = null, again = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'e', label: 'ספקטרום: χ²/ndf' },
        { key: 'c', label: 'כיוונים: χ²/ndf' },
        { key: 'w', label: 'המשקל הממוצע' },
      ]);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      again = U.Button(row, 'ריצה חדשה, זרע אחר', () => { S.seed += 1; S.res = run(S.seed * 7919); S.ran = S.done = true; paint(); loop.requestRender(); }, {});
    }
    function paint() {
      if (!readouts) return;
      const q = S.done ? S.res : null;
      readouts.set('e', q ? F.num(q.chi2E / q.ndfE, 2) : '?');
      readouts.set('c', q ? F.num(q.chi2C / q.ndfC, 2) : '?');
      readouts.set('w', q ? F.ltr(F.num(q.meanW, 4) + ' ± ' + F.num(q.errW, 4)) : '?');
    }
    function render() {
      view.clear();
      top.axes(); bot.axes();
      top.hline(1, { color: 'ink', dash: [5, 4] });
      bot.hline(1, { color: 'ink', dash: [5, 4] });
      if (S.done) {
        const q = S.res, ctx = view.ctx;
        q.ratios.forEach(function (b, j) {
          const xm = Math.log10(Math.sqrt(edges[j] * edges[j + 1]));
          ctx.save(); ctx.strokeStyle = C.proton; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(top.X(xm), top.Y(b.r - b.e)); ctx.lineTo(top.X(xm), top.Y(b.r + b.e)); ctx.stroke(); ctx.restore();
          top.marker(xm, b.r, { color: 'proton', r: 3, shape: 'dot' });
        });
        const dx = (1 - CMIN) / NBC;
        K.bars(bot, CMIN, dx, q.cc.map((c) => c / q.expC), { color: 'proton', alpha: 0.4 });
      } else {
        K.mark(view, top.X(Math.log10(5)), top.Y(1.06));
        K.mark(view, bot.X((1 + CMIN) / 2), bot.Y(0.7));
      }
      K.clock(view, F.ltr(F.num(opts.N, 0)) + ' פרוטונים, ' + F.ltr('flat'));
    }
    function lock(on) { opts.locked = on; if (again) again.disabled = on; }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.done = false;
        loop.start();
        return tw.run(seconds || 2.5, function (k) {
          if (k >= 1) { S.res = run(S.seed * 7919); S.done = true; lock(false); paint(); }
          loop.requestRender();
        });
      },
      /* A new independent sample (tests: the spread of χ²/ndf). */
      rerun(seed) { S.res = run(seed); S.ran = S.done = true; paint(); loop.requestRender(); return S.res; },
      setParam(k, v) { if (k === 'locked') lock(v); else opts[k] = v; loop.requestRender(); },
      getState() { const q = S.res || {}; return Object.assign({ N: opts.N, done: S.done }, q); },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
