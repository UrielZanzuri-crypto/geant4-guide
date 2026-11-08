/* PHY.sims.physMult: the multiplicity rounding of ParticleHP since Geant4 11.2, and the ldns fix.
   The evaluated file gives the MEAN number of neutrons per reaction, ν(E). Geant4 ≥ 11.2 as is ("round",
   ldns -n round) emits round(ν) neutrons in every reaction; the ldns fix (-n fix) draws the number from a
   Poisson distribution with mean ν for products whose ν is not an integer. N reactions are sampled both
   ways; the histogram shows how many reactions gave 0, 1, 2, 3 neutrons, and the readouts the totals.
   Top: ν(E) of the chosen nucleus: ¹⁹F with ν = 0.07 at 5 MeV (real) rising slowly (schematic), or ⁹Be with
   the example ν = 0.8 (schematic). Card: ¹⁹F at 5 MeV, 1000 reactions; before the run the histogram and the
   totals are hidden. opts: {nucleus, E, N, seed, locked, chapter, section}.
   getState(): {nu, N, round: {total, counts}, poisson: {total, counts}}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;

  PHY.sims.physMult = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ nucleus: 'F19', E: 5, N: 1000, seed: 100, locked: true }, opts || {});
    const top = PL.create(canvasEl, { x: [0, 20], y: [0, 1.1], rect: { x: 0, y: 0, w: 1, h: 0.42 }, margin: { l: 40, r: 14, t: 28, b: 34 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'ν, נייטרונים לתגובה', aspect: 1.1, minHeight: 380, maxHeight: 520 });
    const view = top.view;
    const bot = PL.panel(view, { x: [-0.6, 3.6], y: [0, 1000], rect: { x: 0, y: 0.42, w: 1, h: 0.58 }, margin: { l: 44, r: 14, t: 30, b: 36 }, xLabel: 'נייטרונים בתגובה אחת', yLabel: 'תגובות' });
    const tw = PHY.tweens();
    const S = { ran: !opts.locked, frac: opts.locked ? 0 : 1, round: null, pois: null, seed: opts.seed };

    const nu = () => K4.nu(opts.nucleus, opts.E);
    function sample() {
      const r = PHY.random(S.seed);
      const v = nu();
      const listR = [], listP = [];
      for (let i = 0; i < opts.N; i++) {
        const a = Math.round(v);
        const b = K.poisson(v, r.next);
        listR.push(a); listP.push(b);
      }
      S.round = { list: listR }; S.pois = { list: listP };
    }
    function counts(list, n) {
      const c = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) c[Math.min(3, list[i])]++;
      return c;
    }
    const total = (list, n) => { let s = 0; for (let i = 0; i < n; i++) s += list[i]; return s; };

    let readouts = null, slider = null, choice = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'nu', label: 'ν הממוצע' },
        { key: 'r', label: 'נייטרונים, עיגול (Geant4 כמו שהוא)', color: 'var(--c-neutron)' },
        { key: 'p', label: 'נייטרונים, פואסון (התיקון)', color: 'var(--c-neutron)' },
      ]);
      choice = U.Choice(controlsEl, { label: 'גרעין', options: [{ value: 'F19', text: '¹⁹F' }, { value: 'Be9', text: '⁹Be (לדוגמה)' }], value: opts.nucleus, onChange: (v) => { opts.nucleus = v; again(); } });
      slider = U.Slider(controlsEl, { label: 'אנרגיית הפרוטון', min: 4.3, max: 20, step: 0.1, value: opts.E, unit: 'MeV', digits: 1, color: 'var(--c-proton)', onInput: (v) => { opts.E = v; again(); } });
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function again() { S.seed += 13; sample(); S.ran = true; S.frac = 1; paint(); loop.requestRender(); mark(); }

    function paint() {
      if (!readouts) return;
      const n = Math.floor(opts.N * S.frac);
      readouts.set('nu', F.num(nu(), 2));
      readouts.set('r', S.ran ? F.num(total(S.round.list, n), 0) : '?');
      readouts.set('p', S.ran ? F.num(total(S.pois.list, n), 0) : '?');
    }

    function render() {
      view.clear();
      top.axes();
      const xs = [], ys = [];
      for (let i = 0; i <= 200; i++) { const E = 4.3 + (15.7 * i) / 200; xs.push(E); ys.push(K4.nu(opts.nucleus, E)); }
      top.line(xs, ys, { color: 'neutron', width: 2.4 });
      top.hline(0.5, { color: 'muted', dash: [4, 4] });
      top.text(19.6, 0.5, 'עיגול: מתחת לזה 0', { color: 'muted', size: 10.5, align: 'right', offset: [0, -9] });
      top.marker(opts.E, nu(), { color: 'neutron', r: 5, shape: 'ring' });
      top.text(19.6, 1.02, 'צורה סכמטית', { color: 'muted', size: 10.5, align: 'right' });
      bot.axes();
      if (S.ran) {
        const n = Math.floor(opts.N * S.frac);
        const cr = counts(S.round.list, n), cp = counts(S.pois.list, n);
        bot.setRange({ y: [0, PL.niceRange(0, opts.N * 1.05)[1]] });
        const ctx = view.ctx;
        bot.clip(function () {
          for (let j = 0; j < 4; j++) {
            ctx.save();
            ctx.fillStyle = C.muted; ctx.globalAlpha = 0.55;
            ctx.fillRect(bot.X(j - 0.36), bot.Y(cr[j]), bot.X(j - 0.02) - bot.X(j - 0.36), bot.Y(0) - bot.Y(cr[j]));
            ctx.fillStyle = C.neutron; ctx.globalAlpha = 0.65;
            ctx.fillRect(bot.X(j + 0.02), bot.Y(cp[j]), bot.X(j + 0.36) - bot.X(j + 0.02), bot.Y(0) - bot.Y(cp[j]));
            ctx.restore();
          }
        });
        for (let j = 0; j < 4; j++) view.screenText(bot.X(j), bot.Y(0) + 11, j === 3 ? '3+' : String(j), { size: 11, color: C.muted });
        bot.legend([{ label: 'עיגול', color: 'muted' }, { label: 'פואסון', color: 'neutron' }], { corner: 'right' });
      } else {
        K.mark(view, bot.X(1.5), bot.Y(500));
      }
      K.clock(view, F.ltr(F.num(opts.N, 0)) + ' תגובות, ' + F.ltr(F.num(opts.E, 1) + ' MeV'));
    }

    function lock(on) { opts.locked = on; if (slider) slider.setEnabled(!on); if (choice) choice.setEnabled(!on); }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        sample(); S.ran = true; S.frac = 0;
        paint(); loop.start();
        return tw.run(seconds || 3, function (k) {
          S.frac = k;
          if (k >= 1) lock(false);
          paint(); loop.requestRender();
        });
      },
      setParam(k, v) {
        if (k === 'locked') { lock(v); return; }
        opts[k] = v;
        if (k === 'E' && slider) slider.set(v);
        if (k === 'nucleus' && choice) choice.set(v);
        sample(); S.ran = true; S.frac = 1; paint(); loop.requestRender();
      },
      getState() {
        const n = S.round ? opts.N : 0;
        return {
          nu: nu(), N: opts.N, ran: S.ran,
          round: S.round ? { total: total(S.round.list, n), counts: counts(S.round.list, n) } : null,
          poisson: S.pois ? { total: total(S.pois.list, n), counts: counts(S.pois.list, n) } : null,
        };
      },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
