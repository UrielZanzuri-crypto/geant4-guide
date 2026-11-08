/* PHY.sims.srcLab: "מעבדת המקור", the playground. The spectrum shape T (toy away from 0.782 MeV, the
   HERMIONE value), the cut-off Emax, Emin, the half-angle of the cone and the sampling mode. Top: log₁₀ f(E)
   with the fired range shaded. Bottom: the energies of 4000 fired protons (unweighted counts): analog piles
   them where f is large, flat spreads them evenly. Readouts: N_shot = 2π(1 − cos θ)∫f dE, ⟨E⟩ of the fired
   spectrum, and the share above 2.06 MeV (the ⁹Be threshold). Below the canvas: the /ldns/src/ lines.
   opts: {T, Emin, Emax, deg, sampling, chapter, section}. getState(): {nShot, meanE, above, macro}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K5 = PHY.ch05;
  const NB = 32, NS = 4000;

  PHY.sims.srcLab = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ T: K5.T0, Emin: 1.85, Emax: 13, deg: 20, sampling: 'flat' }, opts || {});
    const top = PL.create(canvasEl, { x: [0, 14], y: [8, 13], rect: { x: 0, y: 0, w: 1, h: 0.5 }, margin: { l: 40, r: 12, t: 28, b: 26 }, yLabel: 'log₁₀ f, ב-' + F.ltr('/MeV/sr'), yColor: 'proton', aspect: 1.05, minHeight: 380, maxHeight: 540 });
    const view = top.view;
    const bot = PL.panel(view, { x: [0, 14], y: [0, 1], rect: { x: 0, y: 0.5, w: 1, h: 0.5 }, margin: { l: 40, r: 12, t: 26, b: 36 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'פרוטונים שנורו, בתא', yColor: 'proton' });
    let tab = null;
    const U01 = (function () { const r = PHY.random(42); const a = []; for (let i = 0; i < NS; i++) a.push(r.next()); return a; })();
    let samples = [];
    function rebuild() {
      if (opts.Emin >= opts.Emax - 0.2) opts.Emin = Math.max(0.5, opts.Emax - 0.2);
      tab = K5.table(opts.Emin, opts.Emax, opts.T, 800);
      samples = U01.map((u) => (opts.sampling === 'flat' ? opts.Emin + u * (opts.Emax - opts.Emin) : K5.sampleAnalog(tab, u)));
    }

    let readouts = null, sl = {}, choice = null, pre = null;
    const isDefT = () => Math.abs(opts.T - K5.T0) < 1e-6;
    function macro() {
      const lines = ['/ldns/src/mode spectrum'];
      if (isDefT()) lines.push('/ldns/src/file data/E30J_M2_2.5_d10um_L0.012um_spectrum.txt');
      else { lines.push('# toy spectrum, T = ' + opts.T.toFixed(2) + ' MeV'); lines.push('/ldns/src/file data/toy_T' + opts.T.toFixed(2) + 'MeV.txt'); }
      lines.push('/ldns/src/Emin ' + opts.Emin.toFixed(2) + ' MeV');
      lines.push('/ldns/src/Emax ' + opts.Emax.toFixed(1) + ' MeV');
      lines.push('/ldns/src/halfAngle ' + (+opts.deg.toFixed(1)) + ' deg');
      lines.push('/ldns/src/sampling ' + opts.sampling);
      lines.push('/ldns/src/print');
      return lines.join('\n');
    }
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'n', label: 'פרוטונים לירייה, ב-' + F.ltr('10¹¹'), color: 'var(--c-proton)' },
        { key: 'e', label: 'האנרגיה הממוצעת (MeV)', color: 'var(--c-proton)' },
        { key: 'a', label: 'מעל 2.06 MeV, הסף של ⁹Be' },
      ]);
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      sl.T = U.Slider(grid, { label: 'שיפוע הספקטרום T', min: 0.4, max: 1.4, step: 0.002, value: opts.T, format: (v) => F.unit(v, 'MeV', 2) + (Math.abs(v - K5.T0) < 1e-6 ? '' : ' (צעצוע)'), color: 'var(--c-proton)', onInput: (v) => set('T', v) });
      sl.Emax = U.Slider(grid, { label: 'ה-cut-off, Emax', min: 3, max: 13, step: 0.1, value: opts.Emax, unit: 'MeV', digits: 1, color: 'var(--c-proton)', onInput: (v) => set('Emax', v) });
      sl.Emin = U.Slider(grid, { label: 'Emin', min: 0.5, max: 5, step: 0.05, value: opts.Emin, unit: 'MeV', digits: 2, color: 'var(--c-proton)', onInput: (v) => set('Emin', v) });
      sl.deg = U.Slider(grid, { label: 'חצי זווית הקונוס', min: 5, max: 40, step: 0.5, value: opts.deg, format: (v) => F.deg(v, 1), color: 'var(--accent)', onInput: (v) => set('deg', v) });
      choice = U.Choice(controlsEl, { label: 'דגימה', options: [{ value: 'analog', text: '<bdi>analog</bdi>' }, { value: 'flat', text: '<bdi>flat</bdi>' }], value: opts.sampling, onChange: (v) => set('sampling', v) });
      pre = U.h('pre', { class: 'code', dir: 'ltr', 'data-no-iso': '' });
      controlsEl.appendChild(pre);
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function set(k, v) { opts[k] = v; rebuild(); paint(); loop.requestRender(); mark(); }
    const stats = () => ({ nShot: K5.nShot(opts.Emin, opts.Emax, opts.deg, opts.T), meanE: K5.meanE(opts.Emin, opts.Emax, opts.T), above: opts.Emin >= 2.06 ? 1 : K5.integ((E) => K5.spec(E, opts.T), 2.06, opts.Emax, 2000) / K5.integ((E) => K5.spec(E, opts.T), opts.Emin, opts.Emax, 2000) });
    function paint() {
      if (!readouts) return;
      const s = stats();
      readouts.set('n', F.num(s.nShot / 1e11, 2));
      readouts.set('e', F.num(s.meanE, 2));
      readouts.set('a', F.unit(100 * s.above, '%', 0));
      if (pre) pre.textContent = macro();
    }
    function render() {
      view.clear();
      top.axes(); bot.axes();
      const xs = [], ys = [], xf = [], yf = [];
      for (let i = 0; i <= 280; i++) {
        const E = 0.5 + (13.5 * i) / 280; if (E > 13.001) break;
        const v = Math.log10(K5.spec(E, opts.T)); xs.push(E); ys.push(v);
        if (E >= opts.Emin && E <= opts.Emax) { xf.push(E); yf.push(v); }
      }
      top.fill(xf, yf, { color: 'proton', alpha: 0.18, base: 8 });
      top.line(xs, ys, { color: 'proton', width: 2.4 });
      top.vline(opts.Emin, { color: 'proton', dash: [4, 3], label: 'Emin', labelAt: 'bottom' });
      top.vline(opts.Emax, { color: 'proton', dash: [4, 3], label: 'Emax', labelAt: 'bottom' });
      top.vline(2.06, { color: 'volume', dash: [2, 4], width: 1.2 });
      const h = K.hist(samples, NS, 0, 14, 56);
      bot.setRange({ y: PL.niceRange(0, Math.max(10, 1.15 * Math.max.apply(null, h.counts))) });
      K.bars(bot, 0, h.dx, h.counts, { color: 'proton', alpha: 0.45 });
      if (!isDefT()) view.screenText(top.X(14) - 4, top.Y(13) + 10, 'צעצוע', { size: 11, weight: 700, color: C.muted, align: 'right', halo: true });
      K.clock(view, F.ltr(opts.sampling) + ', ' + F.ltr(F.num(NS, 0)) + ' פרוטונים');
    }
    const loop = PHY.SimLoop({ view, step() {}, render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { loop.requestRender(); },
      setParam(k, v) { opts[k] = v; if (sl[k]) sl[k].set(v); if (k === 'sampling' && choice) choice.set(v); rebuild(); paint(); loop.requestRender(); },
      getState() { const s = stats(); return { nShot: s.nShot, meanE: s.meanE, above: s.above, macro: macro(), samples: samples.slice() }; },
    };
    rebuild();
    paint();
    return api;
  };
})();
