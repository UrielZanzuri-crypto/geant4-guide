/* PHY.sims.outHist: from rows to a spectrum. A toy leak table (PHY.ch08.makeRun) is put into a histogram, and
   each bin's sum of weights is turned into a physical quantity:
     counts    Σw in the bin
     density   Σw / ΔE (dN/dE), or for the angle Σw / (2π Δcosθ) (dN/dΩ)
     lethargy  Σw / Δ(ln E) = E dN/dE: on a log energy axis, equal areas hold equal numbers of neutrons
   divided by N (per proton) or times N_shot/N (per shot) when the scale asks for it. Error bars are √Σw² per
   bin, as in ldns_analysis.py (they ignore that one proton can make two neutrons).
   mode 'angle' (a card): isotropic analog neutrons, θ in 15° bins, raw counts. The histogram fills during
     play(seconds). Free play: the y choice (counts or dN/dΩ) and a toggle for the Be run's anisotropy (59 %
     forward).
   mode 'energy' (a card): the same neutrons in two panels, 0.5 MeV linear bins on top and 10 bins per decade
     on a log axis below, counts per bin; after the run a dashed mark at each panel's highest bin. Free play:
     the y choice (counts per bin, dN/dE, or E dN/dE).
   mode 'lab' (the playground): N, the yield p, the temperature T of the toy spectrum; energy or angle; linear or
     log bins; counts, density or lethargy; per proton or per shot; error bars. Readouts: rows, Σw, the yield
     per proton and its relative error from the per-event sums, per shot, forward fraction, ⟨E⟩.
   opts: {mode, N, p, T, aniso, flat, mult2, seed, locked, chapter, section}.
   getState(): {ran, shown, R, S, N, panels: [{x: 'E'|'theta', log, edges, sum, sum2, y (plotted), peak
   (center of the highest bin, MeV or deg)}], perProton, err, perShot, forward, meanE, areaAbove1}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K1 = PHY.ch01, K = PHY.ch08;
  const DEG = 180 / Math.PI;

  PHY.sims.outHist = function (canvasEl, controlsEl, opts) {
    const mode0 = (opts && opts.mode) || 'lab';
    const defaults = {
      angle: { N: 2e5, p: 0.05, T: K.TN, aniso: 0, flat: false, mult2: 0, seed: 5, x: 'theta', log: false, y: 'counts', scale: 'raw', nb: 12 },
      energy: { N: 2e5, p: 0.06, T: K.TN, aniso: K.ANISO, flat: false, mult2: 0, seed: 6, x: 'E', log: false, y: 'counts', scale: 'raw', nb: 16 },
      lab: { N: K.BE.N, p: K.BE.p, T: K.TN, aniso: K.ANISO, flat: true, mult2: 0, seed: 140, x: 'E', log: true, y: 'lethargy', scale: 'shot', nb: 30, err: true },
    }[mode0];
    opts = Object.assign({ mode: mode0, locked: mode0 !== 'lab' }, defaults, opts || {});
    const lab = opts.mode === 'lab', two = opts.mode === 'energy';
    const P1 = PL.create(canvasEl, { x: [0, 1], y: [0, 1], grid: true, aspect: two ? 1.05 : 1.45, minHeight: two ? 360 : 270, maxHeight: two ? 560 : 420,
      rect: { x: 0, y: 0, w: 1, h: two ? 0.5 : 1 }, margin: { l: 50, r: 14, t: 34, b: 40 }, xLabel: ' ', yLabel: ' ' });
    const view = P1.view;
    const P2 = two ? PL.panel(view, { x: [0, 1], y: [0, 1], grid: true, rect: { x: 0, y: 0.5, w: 1, h: 0.5 }, margin: { l: 50, r: 14, t: 30, b: 40 }, xLabel: ' ', yLabel: ' ' }) : null;
    const tw = PHY.tweens();
    const S = { ran: !opts.locked, shown: 1, run: null };

    function regen() { S.run = K.makeRun({ N: opts.N, p: opts.p, T: opts.T, aniso: opts.aniso, flat: opts.flat, mult2: opts.mult2, seed: opts.seed }); }
    regen();

    /* ---------- histogram of one panel ---------- */
    function panelSpec(i) {
      if (two) return i === 0 ? { x: 'E', log: false, nb: 16, lo: 0, hi: 8 } : { x: 'E', log: true, nb: 33, lo: -2, hi: 1.3 };
      if (opts.x === 'theta') return { x: 'theta', log: false, nb: lab ? opts.nb : 12, lo: 0, hi: 180 };
      return opts.log ? { x: 'E', log: true, nb: opts.nb, lo: -2, hi: 1.3 } : { x: 'E', log: false, nb: opts.nb, lo: 0, hi: 10 };
    }
    function build(i) {
      const sp = panelSpec(i), run = S.run;
      const n = S.ran ? Math.round(run.R * S.shown) : 0;
      let vals = run.E;
      if (sp.x === 'theta') { vals = new Float64Array(run.R); for (let j = 0; j < run.R; j++) vals[j] = Math.acos(Math.max(-1, Math.min(1, run.cos[j]))) * DEG; }
      const h = K.hist(vals, run.w, n, sp.lo, sp.hi, sp.nb, sp.log);
      const ymode = opts.x === 'theta' && opts.y === 'lethargy' ? 'density' : opts.y;
      const norm = opts.scale === 'proton' ? 1 / run.N : opts.scale === 'shot' ? K.BE.nShot / run.N : 1;
      const y = [], e = [];
      for (let b = 0; b < sp.nb; b++) {
        const a = h.edges[b], z = h.edges[b + 1];
        let d = 1;
        if (ymode === 'density') d = sp.x === 'theta' ? 2 * Math.PI * (Math.cos(a / DEG) - Math.cos(z / DEG)) : z - a;
        else if (ymode === 'lethargy') d = Math.log(z / Math.max(a, 1e-12));
        if (ymode === 'lethargy' && !sp.log && a <= 0) d = Math.log(z / (z / 2));   /* the first linear bin starts at 0 */
        y.push((h.sum[b] / d) * norm);
        e.push((Math.sqrt(h.sum2[b]) / d) * norm);
      }
      let pk = 0;
      for (let b = 1; b < sp.nb; b++) if (y[b] > y[pk]) pk = b;
      const center = sp.log ? Math.sqrt(h.edges[pk] * h.edges[pk + 1]) : (h.edges[pk] + h.edges[pk + 1]) / 2;
      return Object.assign({}, sp, { edges: h.edges, sum: h.sum, sum2: h.sum2, y, err: e, peak: center, ymode, n });
    }

    function yLabelOf(pn) {
      const per = opts.scale === 'shot' ? ' לירייה' : opts.scale === 'proton' ? ' לפרוטון' : '';
      if (pn.ymode === 'counts') return (opts.scale === 'raw' ? 'נייטרונים בבין' : 'נייטרונים בבין' + per);
      if (pn.ymode === 'lethargy') return F.ltr('E·dN/dE') + per;
      return pn.x === 'theta' ? F.ltr('dN/dΩ') + per + ' (לסטרדיאן)' : F.ltr('dN/dE') + per + ' (ל-MeV)';
    }

    /* ---------- controls ---------- */
    let readouts = null, ctl = {};
    if (controlsEl) {
      const items = opts.mode === 'angle'
        ? [{ key: 'b0', label: 'בבין ' + F.ltr('0°–15°') }, { key: 'b90', label: 'בבין ' + F.ltr('75°–90°') }, { key: 'ratio', label: 'היחס בין שני הבינים' }]
        : two
          ? [{ key: 'pl', label: 'השיא בבינים ליניאריים, MeV', color: 'var(--c-neutron)' }, { key: 'pg', label: 'השיא בבינים לוגריתמיים, MeV', color: 'var(--c-neutron)' }]
          : [{ key: 'rows', label: 'שורות בטבלה' }, { key: 'sw', label: 'סכום המשקלים' }, { key: 'pp', label: 'נייטרונים לפרוטון', color: 'var(--c-neutron)' },
            { key: 'rel', label: 'שגיאה יחסית, %' }, { key: 'ps', label: 'נייטרונים לירייה', color: 'var(--c-neutron)' }, { key: 'fwd', label: 'קדימה, %' }, { key: 'me', label: 'אנרגיה ממוצעת, MeV' }];
      readouts = U.Readouts(controlsEl, items);
      if (opts.mode === 'angle') {
        ctl.y = U.Choice(controlsEl, { label: 'מה מציירים', options: [{ value: 'counts', text: 'נייטרונים בכל בין' }, { value: 'density', text: 'חלקי \\(2\\pi\\,\\Delta\\cos\\theta\\)' }], value: opts.y, onChange: (v) => set('y', v) });
        const row = U.h('div', { class: 'sim-row' });
        controlsEl.appendChild(row);
        ctl.aniso = U.Toggle(row, 'כמו בריצת ה-Be: ' + F.unit(100 * K.BE.fwd, '%', 0) + ' קדימה', { value: false, onChange: (v) => set('aniso', v ? K.ANISO : 0) });
      } else if (two) {
        ctl.y = U.Choice(controlsEl, { label: 'מה מציירים', options: [{ value: 'counts', text: 'נייטרונים בכל בין' }, { value: 'density', text: F.ltr('dN/dE') }, { value: 'lethargy', text: F.ltr('E·dN/dE') }], value: opts.y, onChange: (v) => set('y', v) });
      } else {
        ctl.x = U.Choice(controlsEl, { label: 'מה ממיינים', options: [{ value: 'E', text: 'אנרגיה' }, { value: 'theta', text: 'זווית \\(\\theta\\)' }], value: opts.x, onChange: (v) => set('x', v) });
        ctl.log = U.Choice(controlsEl, { label: 'הבינים של האנרגיה', options: [{ value: 'lin', text: 'ליניאריים' }, { value: 'log', text: 'לוגריתמיים' }], value: opts.log ? 'log' : 'lin', onChange: (v) => set('log', v === 'log') });
        ctl.y = U.Choice(controlsEl, { label: 'ציר y', options: [{ value: 'counts', text: 'בבין' }, { value: 'density', text: 'צפיפות' }, { value: 'lethargy', text: F.ltr('E·dN/dE') }], value: opts.y, onChange: (v) => set('y', v) });
        const grid = U.h('div', { class: 'sim-grid' });
        controlsEl.appendChild(grid);
        ctl.N = U.Slider(grid, { label: 'מספר האירועים \\(N\\)', min: 4, max: Math.log10(3e6), step: 0.01, value: Math.log10(opts.N), format: (v) => F.sci(Math.pow(10, v), 1), color: 'var(--accent)', onInput: (v) => set('N', Math.round(Math.pow(10, v))) });
        ctl.p = U.Slider(grid, { label: 'תפוקה לפרוטון \\(p\\)', min: -4, max: -2, step: 0.01, value: Math.log10(opts.p), format: (v) => F.sci(Math.pow(10, v), 2), color: 'var(--accent)', onInput: (v) => set('p', Math.pow(10, v)) });
        ctl.T = U.Slider(grid, { label: 'טמפרטורת הספקטרום \\(T\\)', min: 0.3, max: 3, step: 0.01, value: opts.T, unit: 'MeV', digits: 2, color: 'var(--c-neutron)', onInput: (v) => set('T', v) });
        ctl.nb = U.Slider(grid, { label: 'מספר הבינים', min: 6, max: 60, step: 1, value: opts.nb, digits: 0, color: 'var(--accent)', onInput: (v) => set('nb', v) });
        const row = U.h('div', { class: 'sim-row' });
        controlsEl.appendChild(row);
        ctl.shot = U.Toggle(row, 'לירייה, לא לפרוטון', { value: opts.scale === 'shot', onChange: (v) => set('scale', v ? 'shot' : 'proton') });
        ctl.err = U.Toggle(row, 'פסי שגיאה', { value: !!opts.err, onChange: (v) => set('err', v) });
      }
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };

    function set(key, v) {
      opts[key] = v;
      if (key === 'N' || key === 'p' || key === 'T' || key === 'aniso') regen();
      paint(); loop.requestRender(); mark();
    }

    function stats() {
      const run = S.run;
      const me = K.eventErr(run);
      let fw = 0, se = 0, a1 = 0;
      for (let j = 0; j < run.R; j++) { if (run.cos[j] > 0) fw += run.w[j]; se += run.w[j] * run.E[j]; if (run.E[j] > 1) a1 += run.w[j]; }
      return { perProton: me.mean, err: me.err, perShot: me.mean * K.BE.nShot, forward: run.S ? fw / run.S : 0, meanE: run.S ? se / run.S : 0, above1: run.S ? a1 / run.S : 0 };
    }

    function paint() {
      if (!readouts) return;
      const done = S.ran && S.shown >= 1;
      if (opts.mode === 'angle') {
        const pn = build(0);
        readouts.set('b0', done ? F.num(pn.sum[0], 0) : '?');
        readouts.set('b90', done ? F.num(pn.sum[5], 0) : '?');
        readouts.set('ratio', done ? F.num(pn.sum[5] / Math.max(1, pn.sum[0]), 1) : '?');
      } else if (two) {
        readouts.set('pl', done ? F.num(build(0).peak, 2) : '?');
        readouts.set('pg', done ? F.num(build(1).peak, 2) : '?');
      } else {
        const st = stats(), run = S.run;
        readouts.set('rows', F.num(run.R, 0));
        readouts.set('sw', F.num(run.S, run.S < 100 ? 1 : 0));
        readouts.set('pp', F.sci(st.perProton, 2));
        readouts.set('rel', st.perProton ? F.num((100 * st.err) / st.perProton, 1) : '–');
        readouts.set('ps', F.sci(st.perShot, 2));
        readouts.set('fwd', F.num(100 * st.forward, 0));
        readouts.set('me', F.num(st.meanE, 2));
      }
    }

    function lock(on) {
      opts.locked = on;
      Object.keys(ctl).forEach(function (k) {
        const c = ctl[k];
        if (c.setEnabled) c.setEnabled(!on);
        else if (c.input) c.input.disabled = on;
      });
    }

    function drawPanel(P, pn, i) {
      const xr = pn.log ? [pn.lo, pn.hi] : [pn.lo, pn.hi];
      let ymax = 0;
      for (let b = 0; b < pn.nb; b++) ymax = Math.max(ymax, pn.y[b] + (opts.err ? pn.err[b] : 0));
      if (!S.ran || ymax <= 0) ymax = 1;
      const nice = PL.niceRange(0, ymax * 1.15);
      /* scale the y numbers to a power of ten so the tick labels stay short */
      const e3 = nice[1] >= 1e4 || nice[1] < 0.1 ? Math.floor(Math.log10(nice[1])) : 0;
      const f = Math.pow(10, -e3);
      P.setRange({ x: xr, y: [0, nice[1] * f] });
      P.opts.xLabel = pn.x === 'theta' ? 'זווית ' + F.ltr('θ') + ' (מעלות)'
        : two ? (i === 0 ? 'אנרגיה (MeV), בינים של ' + F.unit(0.5, 'MeV', 1) : 'אנרגיה (MeV), 10 בינים לכל פי 10')
        : pn.log ? 'אנרגיה, סקלה לוגריתמית (MeV)' : 'אנרגיה (MeV)';
      P.opts.yLabel = yLabelOf(pn) + (e3 ? ' ' + F.ltr('×' + K.pow10(e3)) : '');
      P.opts.yColor = 'neutron';
      P.axes();
      if (pn.log) K.logAxis(P, pn.lo, pn.hi);
      if (pn.x === 'theta') K.ticksX(P, [0, 45, 90, 135, 180].map((v) => ({ v, label: F.deg(v) })));
      const ctx = view.ctx;
      const X = (v) => P.X(pn.log ? Math.log10(v) : v);
      P.clip(function () {
        ctx.save();
        ctx.fillStyle = C.neutron; ctx.globalAlpha = 0.5;
        const y0 = P.Y(0);
        for (let b = 0; b < pn.nb; b++) {
          if (!pn.y[b]) continue;
          const xa = X(Math.max(pn.edges[b], pn.log ? 1e-9 : -1e9)), xb = X(pn.edges[b + 1]), yy = P.Y(pn.y[b] * f);
          ctx.fillRect(xa + 0.5, yy, Math.max(1, xb - xa - 1), y0 - yy);
        }
        if (opts.err && S.shown >= 1) {
          ctx.globalAlpha = 0.9; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
          for (let b = 0; b < pn.nb; b++) {
            if (!pn.y[b]) continue;
            const xc = (X(Math.max(pn.edges[b], 1e-9)) + X(pn.edges[b + 1])) / 2;
            ctx.beginPath(); ctx.moveTo(xc, P.Y((pn.y[b] - pn.err[b]) * f)); ctx.lineTo(xc, P.Y((pn.y[b] + pn.err[b]) * f)); ctx.stroke();
          }
        }
        ctx.restore();
      });
      if (S.ran && S.shown >= 1 && two) {
        const xp = pn.log ? Math.log10(pn.peak) : pn.peak;
        P.vline(xp, { color: 'ink', dash: [5, 4] });
        const right = P.X(xp) > P.box.x + P.box.w * 0.55;
        view.screenText(P.X(xp) + (right ? -6 : 6), P.box.y + 10, 'שיא: ' + F.unit(pn.peak, 'MeV', 2), { size: 12, weight: 700, color: C.ink, align: right ? 'right' : 'left', halo: true });
      }
      if (!S.ran) K1.mark(view, P.box.x + P.box.w / 2, P.box.y + P.box.h / 2);
    }

    function render() {
      view.clear();
      drawPanel(P1, build(0), 0);
      if (P2) drawPanel(P2, build(1), 1);
      const n = S.ran ? Math.round(S.run.R * S.shown) : 0;
      if (opts.mode === 'angle') K1.clock(view, (opts.aniso ? 'כמו ב-Be' : 'נייטרונים איזוטרופיים') + ', צעצוע: ' + F.num(n, 0));
      else if (two) K1.clock(view, 'אותם נייטרונים, צעצוע: ' + F.num(n, 0));
      else K1.clock(view, 'טבלת צעצוע: ' + F.num(S.run.R, 0) + ' שורות');
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.shown = 0;
        paint(); loop.start();
        return tw.run(seconds || 3.5, function (k) {
          S.shown = k;
          if (k >= 1) { S.shown = 1; lock(false); }
          paint(); loop.requestRender();
        });
      },
      setParam(key, v) {
        if (key === 'locked') { lock(v); return; }
        opts[key] = v;
        if (key === 'N' || key === 'p' || key === 'T' || key === 'aniso' || key === 'seed' || key === 'flat' || key === 'mult2') regen();
        paint(); loop.requestRender();
      },
      getState() {
        const panels = [build(0)].concat(P2 ? [build(1)] : []);
        const st = stats();
        /* fraction of the plotted area above 1 MeV, for the energy panels */
        const areaAbove1 = panels.map(function (pn) {
          if (pn.x !== 'E') return null;
          let a = 0, t = 0;
          for (let b = 0; b < pn.nb; b++) {
            const w = pn.log ? Math.log10(pn.edges[b + 1] / pn.edges[b]) : pn.edges[b + 1] - pn.edges[b];
            const ar = pn.y[b] * w;
            t += ar; if (pn.edges[b] >= 1 - 1e-9) a += ar;
          }
          return t ? a / t : 0;
        });
        return Object.assign({ ran: S.ran, shown: S.shown, R: S.run.R, S: S.run.S, N: S.run.N, X2: S.run.X2, panels, areaAbove1 }, st);
      },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
