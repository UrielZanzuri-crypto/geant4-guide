/* PHY.sims.physPerGram: σ alone does not pick the material. A proton crosses the same mass thickness of ⁷Li
   and of Pb. Suppose (hypothetically) σ(Pb) = 10 σ(⁷Li). The number of reactions is σ times the number of
   nuclei in the layer, and per gram that is N_A/A: 8.58×10²² for ⁷Li (A = 7.016) and 2.91×10²¹ for Pb
   (A = 207.2), 29.5 times fewer. Three groups of bars appear one after the other: σ, nuclei per gram, and
   their product (reactions per g/cm², relative to ⁷Li). Before the run the bars are hidden.
   opts: {ratio, locked}. getState(): {nLi, nPb, perGram: {Li, Pb}, ratioLiOverPb, stage}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;
  const A_LI7 = 7.016, A_PB = 207.2;

  PHY.sims.physPerGram = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ ratio: 10, locked: true }, opts || {});
    const P = PL.create(canvasEl, { x: [0, 9], y: [0, 1.25], grid: false, margin: { l: 14, r: 14, t: 30, b: 40 }, aspect: 1.6, minHeight: 260, maxHeight: 400 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { stage: 0, grow: 0 };
    const nLi = K4.NA / A_LI7, nPb = K4.NA / A_PB;
    const prod = { Li: 1, Pb: (opts.ratio * nPb) / nLi };

    let readouts = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'li', label: '⁷Li: גרעינים בגרם, ב-\\(10^{22}\\)' },
        { key: 'pb', label: 'Pb: גרעינים בגרם, ב-\\(10^{22}\\)' },
        { key: 'r', label: 'תגובות: ⁷Li חלקי Pb', color: 'var(--c-neutron)' },
      ]);
      U.renderMath(controlsEl);
    }
    function paint() {
      if (!readouts) return;
      readouts.set('li', S.stage >= 2 ? F.num(nLi / 1e22, 2) : '?');
      readouts.set('pb', S.stage >= 2 ? F.num(nPb / 1e22, 3) : '?');
      readouts.set('r', S.stage >= 3 ? F.num(nLi / (opts.ratio * nPb), 2) : '?');
    }
    function group(x0, title, vLi, vPb, show, k, labels) {
      const ctx = view.ctx, y0 = P.Y(0);
      [[vLi, 'ink', '⁷Li', labels[0]], [vPb, 'muted', 'Pb', labels[1]]].forEach(function (b, i) {
        const x = x0 + i * 1.15;
        if (show) {
          const h = b[0] * k;
          ctx.save(); ctx.fillStyle = C[b[1]]; ctx.globalAlpha = 0.55;
          ctx.fillRect(P.X(x), P.Y(h), P.X(x + 0.95) - P.X(x), y0 - P.Y(h)); ctx.restore();
          if (k >= 1) view.screenText(P.X(x + 0.475), P.Y(h) - 9, b[3], { size: 11, weight: 700, color: C.ink, halo: true });
        }
        view.screenText(P.X(x + 0.475), y0 + 11, b[2], { size: 11.5, weight: 700, color: C.ink });
      });
      view.screenText(P.X(x0 + 1.05), y0 + 28, title, { size: 11.5, weight: 600, color: C.ink });
    }
    function render() {
      view.clear();
      const ctx = view.ctx;
      ctx.save(); ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(P.box.x, P.Y(0)); ctx.lineTo(P.box.x + P.box.w, P.Y(0)); ctx.stroke(); ctx.restore();
      const ks = [S.stage > 1 ? 1 : S.stage === 1 ? S.grow : 0, S.stage > 2 ? 1 : S.stage === 2 ? S.grow : 0, S.stage === 3 ? S.grow : 0];
      const pbN = nPb / nLi;
      group(0.2, 'σ (הנחה)', 1 / opts.ratio, 1, S.stage >= 1, ks[0], ['1', F.num(opts.ratio, 0)]);
      group(3.2, 'גרעינים בגרם', 1, pbN, S.stage >= 2, ks[1], ['1', F.num(pbN, 3)]);
      group(6.2, 'תגובות בגרם', 1, prod.Pb, S.stage >= 3, ks[2], ['1', F.num(prod.Pb, 2)]);
      if (S.stage === 0) K.mark(view, P.X(4.5), P.Y(0.6));
      K.clock(view, 'יחסית ל-⁷Li, לכל ' + F.ltr('g/cm²'));
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const T = (seconds || 3.6) / 3;
        S.stage = 1; S.grow = 0; paint(); loop.start();
        const step = (st) => tw.run(T, function (k) { S.stage = st; S.grow = k; if (k >= 1) paint(); loop.requestRender(); });
        return step(1).then(() => step(2)).then(() => step(3));
      },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { return { nLi, nPb, perGram: { Li: nLi, Pb: nPb }, ratioLiOverPb: nLi / (opts.ratio * nPb), stage: S.stage }; },
    };
    paint();
    return api;
  };
})();
