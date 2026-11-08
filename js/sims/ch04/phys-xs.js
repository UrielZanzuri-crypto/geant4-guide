/* PHY.sims.physXs: why a reaction has a threshold. Top: two bars, the proton energy E in the lab and the
   energy available in the centre of mass, E·m_t/(m_p + m_t) (part of E always goes into moving the whole
   system), against the energy the reaction needs, |Q|. The reaction opens when the second bar reaches |Q|,
   at E_th = −Q (m_p + m_t)/m_t (PHY.ch04.threshold). Bottom: a schematic σ(E) of the nucleus (real threshold,
   schematic shape), drawn up to the current E.
   Card mode: ⁷Li with Q = −1.644 MeV; before the run E = 1 MeV and the curve and the threshold are hidden;
   play(seconds) sweeps E from 1 to 3 MeV and records the first E at which the reaction is open.
   Free mode: nucleus (⁷Li, ⁹Be, ¹⁹F, Pb) and E (0 to 20 MeV). ¹⁹F has no Q in the chapter: |Q| is derived
   back from its 4.2 MeV threshold. Pb has no sharp threshold here: it opens in practice above ~10 MeV.
   opts: {mode, nucleus, E, locked, chapter, section}. getState(): {E, thr, avail, open, firstOpen, nucleus}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;

  PHY.sims.physXs = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'card', nucleus: 'Li7', E: 1, locked: true }, opts || {});
    const card = opts.mode === 'card';
    const top = PL.create(canvasEl, { x: [0, 3], y: [0, 3], grid: false, rect: { x: 0, y: 0, w: 1, h: 0.42 }, margin: { l: 14, r: 14, t: 30, b: 22 }, aspect: 1.15, minHeight: 360, maxHeight: 500 });
    const view = top.view;
    const bot = PL.panel(view, { x: [0, 3], y: [0, 0.6], rect: { x: 0, y: 0.42, w: 1, h: 0.58 }, margin: { l: 40, r: 14, t: 26, b: 36 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'σ(p,n), סכמטי' });
    const tw = PHY.tweens();
    const S = { E: opts.E, ran: !card || !opts.locked, firstOpen: null, done: !card || !opts.locked };

    const nuc = () => K4.NUCLEI[opts.nucleus];
    const qAbs = () => {
      const n = nuc();
      if (n.Q !== undefined) return -n.Q;
      if (n.key === 'F19') return (n.thr * n.mass) / (K4.MP + n.mass);
      return null;
    };
    const thrOf = () => { const n = nuc(); return n.Q !== undefined ? K4.threshold(n.Q, n.mass) : n.thr; };
    const avail = (E) => (E * nuc().mass) / (K4.MP + nuc().mass);
    const isOpen = (E) => (qAbs() === null ? E >= nuc().thr : avail(E) >= qAbs() - 1e-12);
    function setRanges() {
      const xmax = card && opts.mode === 'card' ? 3 : 20;
      top.setRange({ x: [0, xmax] });
      bot.setRange({ x: [0, xmax], y: [0, opts.nucleus === 'Pb' ? 1 : 0.6] });
    }

    let readouts = null, slider = null, choice = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'cm', label: 'זמין במרכז המסה (MeV)' },
        { key: 'q', label: 'צריך: |Q| (MeV)' },
        { key: 'thr', label: 'הסף (MeV)', color: 'var(--c-neutron)' },
      ]);
      choice = U.Choice(controlsEl, { label: 'גרעין המטרה', options: [{ value: 'Li7', text: '⁷Li' }, { value: 'Be9', text: '⁹Be' }, { value: 'F19', text: '¹⁹F' }, { value: 'Pb', text: 'Pb' }], value: opts.nucleus, onChange: (v) => { opts.nucleus = v; toFree(); paint(); loop.requestRender(); mark(); } });
      slider = U.Slider(controlsEl, { label: 'אנרגיית הפרוטון', min: 0, max: card ? 3 : 20, step: 0.01, value: S.E, unit: 'MeV', digits: 2, color: 'var(--c-proton)', onInput: (v) => { S.E = v; S.ran = true; S.done = true; paint(); loop.requestRender(); mark(); } });
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };

    function paint() {
      if (!readouts) return;
      const q = qAbs();
      readouts.set('cm', F.num(avail(S.E), 2));
      readouts.set('q', q === null ? 'אין סף חד' : F.num(q, opts.nucleus === 'F19' ? 1 : 3));
      readouts.set('thr', S.done ? F.num(thrOf(), opts.nucleus === 'F19' ? 1 : opts.nucleus === 'Pb' ? 0 : 2) + (opts.nucleus === 'Pb' ? ' בערך' : '') : '?');
    }

    function render() {
      view.clear();
      const ctx = view.ctx;
      const q = qAbs();
      /* top: two energy bars */
      const bar = (y, val, label, color) => {
        const x0 = top.X(0), x1 = top.X(Math.min(val, top.range.x[1]));
        ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = 0.28; ctx.fillRect(x0, top.Y(y + 0.34), x1 - x0, top.Y(y - 0.34) - top.Y(y + 0.34));
        ctx.globalAlpha = 1; ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.strokeRect(x0, top.Y(y + 0.34), x1 - x0, top.Y(y - 0.34) - top.Y(y + 0.34)); ctx.restore();
        view.screenText(top.X(0) + 4, top.Y(y + 0.62), label, { size: 11.5, weight: 700, color: C.ink, align: 'left' });
      };
      bar(2.0, S.E, 'אנרגיית הפרוטון במעבדה', C.proton);
      bar(0.75, avail(S.E), 'זמין לתגובה, במרכז המסה', C.ink);
      if (q !== null) {
        top.vline(q, { color: 'accent', dash: [6, 4], width: 2 });
        view.screenText(top.X(q) + 5, top.Y(0.75) - 22, '|Q|', { size: 12, weight: 800, color: C.accent, align: 'left', halo: true });
      } else {
        view.screenText(top.X(top.range.x[1]) - 4, top.Y(1.4), 'אין סף חד: מעל ' + F.ltr('~10 MeV') + ' בפועל', { size: 11.5, weight: 600, color: C.muted, align: 'right', halo: true });
      }
      const open = isOpen(S.E);
      if (S.ran) view.screenText(top.X(top.range.x[1]) - 4, top.Y(2.75), open ? 'התגובה פתוחה' : 'סגורה', { size: 12.5, weight: 800, color: open ? C.neutron : C.muted, align: 'right', halo: true });
      K.clock(view, nuc().label + F.ltr('(p,n)'));
      /* bottom: schematic σ(E) */
      bot.axes();
      const xmax = bot.range.x[1];
      if (S.done || (S.ran && S.E > 0)) {
        const upTo = S.done ? xmax : S.E;
        const xs = [], ys = [];
        for (let i = 0; i <= 400; i++) { const E = (upTo * i) / 400; xs.push(E); ys.push(K4.sigma(opts.nucleus, E)); }
        bot.fill(xs, ys, { color: 'neutron', alpha: 0.14 });
        bot.line(xs, ys, { color: 'neutron', width: 2.4 });
      }
      if (S.done) bot.vline(thrOf(), { color: 'neutron', dash: [3, 4], label: F.ltr(F.num(thrOf(), opts.nucleus === 'Li7' || opts.nucleus === 'Be9' ? 2 : 1) + ' MeV'), labelAt: 'top' });
      bot.vline(Math.min(S.E, xmax), { color: 'proton', dash: [5, 4] });
      if (!S.done) K.mark(view, bot.X(xmax * 0.72), bot.Y(0.3));
      view.screenText(bot.X(xmax) - 4, bot.Y(bot.range.y[1]) + 10, 'סכמטי', { size: 11, weight: 700, color: C.muted, align: 'right', halo: true });
    }

    function lock(on) { opts.locked = on; if (slider) slider.setEnabled(!on); if (choice) choice.setEnabled(!on); }
    function toFree() {
      if (opts.mode === 'free' && !card) { setRanges(); return; }
      opts.mode = 'free'; setRanges();
      if (slider) { slider.setRange(0, 20); slider.set(S.E); }
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.done = false; S.firstOpen = null; S.E = 1;
        paint(); loop.start();
        return tw.run(seconds || 3.5, function (k) {
          S.E = 1 + 2 * k;
          if (S.firstOpen === null && isOpen(S.E)) S.firstOpen = S.E;
          if (k >= 1) { S.done = true; if (slider) slider.set(S.E); lock(false); }
          paint(); loop.requestRender();
        });
      },
      /* Sweep without drawing: the first E (step dE) at which the reaction is open. */
      scan(dE) {
        for (let E = 0; E <= 25; E += dE || 0.001) if (isOpen(E)) return E;
        return null;
      },
      setParam(k, v) {
        if (k === 'locked') { lock(v); return; }
        if (k === 'E') { S.E = v; if (slider) slider.set(v); }
        else { opts[k] = v; if (k === 'nucleus') { toFree(); if (choice) choice.set(v); } }
        S.ran = true; S.done = true;
        paint(); loop.requestRender();
      },
      getState() { return { E: S.E, thr: thrOf(), avail: avail(S.E), q: qAbs(), open: isOpen(S.E), firstOpen: S.firstOpen, nucleus: opts.nucleus, done: S.done }; },
    };
    setRanges();
    lock(card ? opts.locked : false);
    paint();
    return api;
  };
})();
