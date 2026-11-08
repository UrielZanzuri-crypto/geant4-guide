/* PHY.sims.physLab: "מעבדת התפוקה", the playground. Thick-target yield per proton,
   Y(E₀) = (N_A/A) Σ f_i ∫ σ_i(E)/S_m(E) dE (PHY.ch04.yieldOf), for Li, Be, LiF or Pb, with a choice of
   physics list (evaluated data, AllHP, or a cascade-like list whose light-nucleus σ is near zero below
   10 MeV, a toy after the project's benchmark table) and multiplicity mode (fix or round).
   Top: the schematic σ(E) of the material's nuclei with their real thresholds, shaded up to E₀.
   Bottom: log₁₀ Y versus E₀ for the current settings (and AllHP-fix in grey for comparison), with the
   benchmark point LiF 5 MeV = 5.0×10⁻⁴ that sets the scale. Every other yield is a toy number.
   opts: {mat, E0, list, mode, chapter, section}. getState(): {Y, Yref, thr, range}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;
  const PARTCOL = ['neutron', 'ink'];

  PHY.sims.physLab = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mat: 'LiF', E0: 5, list: 'allhp', mode: 'fix' }, opts || {});
    const top = PL.create(canvasEl, { x: [0, 20], y: [0, 1], rect: { x: 0, y: 0, w: 1, h: 0.42 }, margin: { l: 44, r: 14, t: 28, b: 30 }, xLabel: 'E', xUnit: 'MeV', yLabel: 'σ(p,n), סכמטי', aspect: 1.05, minHeight: 400, maxHeight: 560 });
    const view = top.view;
    const bot = PL.panel(view, { x: [0, 20], y: [-6, -1.5], rect: { x: 0, y: 0.42, w: 1, h: 0.58 }, margin: { l: 44, r: 14, t: 30, b: 36 }, xLabel: 'אנרגיית הפרוטון בכניסה', xUnit: 'MeV', yLabel: 'log₁₀ התפוקה לפרוטון (צעצוע)', yColor: 'neutron' });

    let readouts = null, ch = {}, slider = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'y', label: 'נייטרונים לפרוטון (צעצוע)', color: 'var(--c-neutron)' },
        { key: 't', label: 'הסף הנמוך (MeV)' },
        { key: 'r', label: 'טווח הפרוטון, בקירוב (mm)' },
      ]);
      ch.mat = U.Choice(controlsEl, { label: 'חומר', options: ['Li', 'Be', 'LiF', 'Pb'].map((m) => ({ value: m, text: m })), value: opts.mat, onChange: (v) => set('mat', v) });
      slider = U.Slider(controlsEl, { label: 'אנרגיית הפרוטון בכניסה \\(E_0\\)', min: 1, max: 20, step: 0.1, value: opts.E0, unit: 'MeV', digits: 1, color: 'var(--c-proton)', onInput: (v) => set('E0', v) });
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      ch.list = U.Choice(grid, { label: 'רשימת פיזיקה', options: [{ value: 'allhp', text: 'נתונים מוערכים <bdi>(AllHP)</bdi>' }, { value: 'cascade', text: 'קסקדה (צעצוע)' }], value: opts.list, onChange: (v) => set('list', v) });
      ch.mode = U.Choice(grid, { label: 'ריבוי', options: [{ value: 'fix', text: 'פואסון <bdi>(-n fix)</bdi>' }, { value: 'round', text: 'עיגול <bdi>(-n round)</bdi>' }], value: opts.mode, onChange: (v) => set('mode', v) });
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function set(k, v) { opts[k] = v; paint(); loop.requestRender(); mark(); }

    const M = () => K4.MATS[opts.mat];
    const Y = (E, o) => K4.yieldOf(opts.mat, E, o || { list: opts.list, mode: opts.mode });
    const lowThr = () => Math.min.apply(null, M().parts.map((p) => K4.NUCLEI[p.n].thr));

    function paint() {
      if (!readouts) return;
      const y = Y(opts.E0);
      readouts.set('y', y > 0 ? F.sci(y, 1) : '0');
      readouts.set('t', opts.mat === 'Pb' ? F.ltr('~10') : F.num(lowThr(), 2));
      readouts.set('r', opts.mat === 'Pb' ? '–' : F.num(K4.rangeMm(opts.mat, opts.E0), opts.E0 < 4 ? 2 : 1));
    }

    function render() {
      view.clear();
      top.axes();
      M().parts.forEach(function (p, i) {
        const xs = [], ys = [], xf = [], yf = [];
        for (let j = 0; j <= 300; j++) {
          const E = (20 * j) / 300; xs.push(E); ys.push(K4.sigma(p.n, E));
          if (E <= opts.E0) { xf.push(E); yf.push(K4.sigma(p.n, E)); }
        }
        top.fill(xf, yf, { color: PARTCOL[i], alpha: 0.16 });
        top.line(xs, ys, { color: PARTCOL[i], width: 2.2 });
        const n = K4.NUCLEI[p.n];
        top.vline(n.thr, { color: PARTCOL[i], dash: [3, 4], width: 1.2 });
        top.text(Math.min(19, n.thr + 0.3), 0.9 - 0.14 * i, n.label + (p.n === 'Pb' ? ' ~' : ' ') + F.num(n.thr, p.n === 'F19' || p.n === 'Pb' ? 1 : 2), { color: PARTCOL[i], size: 11, align: 'left', weight: 700 });
      });
      top.vline(opts.E0, { color: 'proton', dash: [5, 4] });
      view.screenText(top.X(20) - 4, top.Y(1) + 10, 'סכמטי', { size: 11, weight: 700, color: C.muted, align: 'right', halo: true });
      bot.axes();
      const xs = [], ys = [], yr = [];
      for (let j = 1; j <= 190; j++) {
        const E = 1 + (19 * j) / 190; xs.push(E);
        const a = Y(E), b = Y(E, { list: 'allhp', mode: 'fix' });
        ys.push(a > 0 ? Math.log10(a) : NaN); yr.push(b > 0 ? Math.log10(b) : NaN);
      }
      if (opts.list !== 'allhp' || opts.mode !== 'fix') bot.line(xs, yr, { color: 'muted', width: 1.8, dash: [6, 4] });
      bot.line(xs, ys, { color: 'neutron', width: 2.6 });
      const y0 = Y(opts.E0);
      if (y0 > 0) bot.marker(opts.E0, Math.log10(y0), { color: 'neutron', r: 5, shape: 'ring' });
      if (opts.mat === 'LiF') bot.marker(5, Math.log10(5e-4), { color: 'ink', r: 4.5, shape: 'diamond' });
      const items = [{ label: 'הבחירה', color: 'neutron' }];
      if (opts.list !== 'allhp' || opts.mode !== 'fix') items.push({ label: F.ltr('AllHP') + ', פואסון', color: 'muted', dash: [6, 4] });
      if (opts.mat === 'LiF') items.push({ label: 'בנצ\'מרק', color: 'ink' });
      bot.legend(items, { corner: 'right' });
      K.clock(view, opts.mat + ', ' + F.ltr(F.num(opts.E0, 1) + ' MeV'));
    }

    const loop = PHY.SimLoop({ view, step() {}, render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { loop.requestRender(); },
      setParam(k, v) {
        opts[k] = v;
        if (ch[k]) ch[k].set(v);
        if (k === 'E0' && slider) slider.set(v);
        paint(); loop.requestRender();
      },
      getState() {
        return { Y: Y(opts.E0), Yref: Y(opts.E0, { list: 'allhp', mode: 'fix' }), thr: lowThr(), range: K4.rangeMm(opts.mat, opts.E0), mat: opts.mat, E0: opts.E0 };
      },
    };
    paint();
    return api;
  };
})();
