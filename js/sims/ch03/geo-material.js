/* PHY.sims.geoMaterial: a material card. Number densities from the density and the composition:
   n_i = ρ N_A w_i / A_i for every element (w_i its mass fraction), times the isotopic abundance for every
   isotope (PHY.ch03.numberDensities), and the mean free path λ = 1/(n σ) of each isotope for a cross
   section σ (slider, barn). The canvas draws a small cube of the material with one dot per 10²¹ atoms
   in 1 cm³ (scaled to fit), Li and Be in the accent color, the other elements grey.
   The card compares Li metal (G4_Li, 0.534 g/cm³) with LiF (G4_LITHIUM_FLUORIDE, 2.635 g/cm³): which has
   more Li atoms per cm³? Before play the cubes are empty and the readouts show "?". After it: a choice of
   material (Be, Li, LiF, Pb, PE, HDPE), the σ slider and the isotope table.
   opts: {locked, sigma, chapter, section}. getState(): {liMetal, liInLiF, ratio, material, table}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch03;
  const KEYS = ['Be', 'Li', 'LiF', 'Pb', 'PE', 'HDPE'];

  PHY.sims.geoMaterial = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true, sigma: 1 }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 62 }, aspect: 1.6, minHeight: 210, maxHeight: 360 });
    const tw = PHY.tweens();
    const S = { k: 0, ran: false, free: false, mat: 'LiF' };
    const rng = PHY.random(11);
    const JIT = [];
    for (let i = 0; i < 400; i++) JIT.push([rng.next(), rng.next()]);

    const liMetal = K.numberDensities('Li').elements[0].n;
    const liInLiF = K.numberDensities('LiF').elements[0].n;

    let Rd = null, choice = null, slider = null, tbody = null, info = null;
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    if (controlsEl) {
      Rd = U.Readouts(controlsEl, [
        { key: 'a', label: 'אטומי Li ב-Li מתכתי, ב-10²² cm⁻³' },
        { key: 'b', label: 'אטומי Li ב-LiF, ב-10²² cm⁻³' },
        { key: 'r', label: 'היחס LiF / Li' },
      ]);
      choice = U.Choice(controlsEl, { label: 'כרטיס חומר', options: KEYS.map((k) => ({ value: k, text: k })), value: S.mat, onChange: (v) => { S.mat = v; S.free = true; paint(); loop.requestRender(); mark(); } });
      slider = U.Slider(controlsEl, { label: 'חתך פעולה \\(\\sigma\\) לכל איזוטופ', min: -1, max: 1, step: 0.01, value: Math.log10(opts.sigma), format: (v) => F.unit(Math.pow(10, v), 'b', Math.pow(10, v) < 1 ? 2 : 1), onInput: (v) => { opts.sigma = Math.pow(10, v); paint(); mark(); } });
      U.renderMath(slider.el);
      info = U.h('div', { class: 'g4out-label' });
      controlsEl.appendChild(info);
      const wrap = U.h('div', { class: 'g4table-wrap' });
      const table = U.h('table', { class: 'g4table' });
      table.appendChild(U.h('thead', {}, [U.h('tr', {}, ['איזוטופ', 'שכיחות', 'n, ב-10²² cm⁻³', 'λ, ב-mm'].map((x) => U.h('th', { text: x })))]));
      tbody = U.h('tbody');
      table.appendChild(tbody);
      wrap.appendChild(table);
      controlsEl.appendChild(wrap);
      choice.setEnabled(!opts.locked); slider.setEnabled(!opts.locked);
    }
    function rows(key) {
      const d = K.numberDensities(key), out = [];
      d.elements.forEach((e) => e.iso.forEach((i) => out.push({ name: i.name, frac: i.frac, n: i.n, lam: 10 / (i.n * opts.sigma * 1e-24) })));
      return out;
    }
    function paint() {
      const done = S.ran && S.k >= 1;
      if (Rd) {
        Rd.set('a', done ? F.num(liMetal / 1e22, 2) : '?');
        Rd.set('b', done ? F.num(liInLiF / 1e22, 2) : '?');
        Rd.set('r', done ? F.num(liInLiF / liMetal, 2) : '?');
      }
      if (!tbody) return;
      tbody.innerHTML = '';
      if (!done) { info.textContent = ''; return; }
      const m = K.MAT[S.mat], d = K.numberDensities(S.mat);
      info.textContent = '';
      info.appendChild(document.createTextNode(S.mat + ': '));
      info.appendChild(U.h('code', { dir: 'ltr', text: m.g4 }));
      info.appendChild(document.createTextNode(', צפיפות ' + F.unit(m.rho, 'g/cm³', (String(m.rho).split('.')[1] || '').length) + ', ' + (d.elements.length > 1 ? 'יחידות נוסחה בסנטימטר מעוקב: ' : 'אטומים בסנטימטר מעוקב: ') + F.sci(d.nUnit, 3)));
      rows(S.mat).forEach(function (r) {
        tbody.appendChild(U.h('tr', {}, [
          U.h('td', { text: r.name }),
          U.h('td', { dir: 'ltr', text: F.num(100 * r.frac, r.frac < 0.1 ? 1 : 1) + '%' }),
          U.h('td', { dir: 'ltr', text: F.num(r.n / 1e22, r.n < 1e21 ? 3 : 2) }),
          U.h('td', { dir: 'ltr', text: r.lam > 1e5 ? F.sci(r.lam, 2) : F.num(r.lam, r.lam < 100 ? 1 : 0) }),
        ]));
      });
    }

    function cube(x0, y0, w, title, parts, frac) {
      const C = PHY.colors;
      view.poly([{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y0 + w }, { x: x0, y: y0 + w }], { close: true, color: 'ink', width: 1.4 });
      view.text(x0 + w / 2, y0 + w + 4, title, { size: 11.5, weight: 700, color: C.ink });
      let j = 0;
      parts.forEach(function (p) {
        const n = Math.round(p.count * frac);
        for (let i = 0; i < n; i++, j++) {
          const q = JIT[j % JIT.length];
          view.circle(x0 + 2 + q[0] * (w - 4), y0 + 2 + q[1] * (w - 4), p.r, { px: true, fill: C[p.color] });
        }
      });
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      const f = S.ran ? Math.min(1, S.k) : 0;
      if (!S.free) {
        /* one dot per 10²¹ Li atoms in 1 cm³ */
        cube(6, 8, 40, 'Li מתכתי', [{ count: liMetal / 1e21, color: 'accent', r: 2.6 }], f);
        cube(54, 8, 40, 'LiF', [{ count: liInLiF / 1e21, color: 'accent', r: 2.6 }, { count: liInLiF / 1e21, color: 'muted', r: 2.2 }], f);
        view.text(50, 3, 'כל נקודה: 10²¹ אטומים בסנטימטר מעוקב', { size: 10, color: C.muted });
        if (!S.ran) { K.mark(view, view.sx(26), view.sy(28)); K.mark(view, view.sx(74), view.sy(28)); }
      } else {
        const d = K.numberDensities(S.mat);
        const total = d.elements.reduce((s, e) => s + e.n, 0);
        const scale = 140 / total;
        const parts = d.elements.map((e) => ({ count: e.n * scale, color: e.sym === 'Li' || e.sym === 'Be' ? 'accent' : e.sym === 'H' ? 'ink' : 'muted', r: e.sym === 'H' ? 1.8 : 2.6 }));
        cube(30, 8, 40, S.mat, parts, 1);
        view.text(50, 3, 'יחס האטומים בחומר (לא בקנה מידה של הצפיפות)', { size: 10, color: C.muted });
      }
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.k = 0; S.free = false; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.k = 0; S.free = false; loop.start();
        return tw.run(seconds || 3, (k) => { S.k = k; paint(); loop.requestRender(); })
          .then(() => { opts.locked = false; if (choice) { choice.setEnabled(true); slider.setEnabled(true); } paint(); });
      },
      setParam(key, v) { if (key === 'material') { S.mat = v; S.free = true; } if (key === 'sigma') opts.sigma = v; S.ran = true; S.k = 1; paint(); loop.requestRender(); },
      getState() { return { liMetal, liInLiF, ratio: liInLiF / liMetal, material: S.mat, sigma: opts.sigma, table: rows(S.mat), density: K.numberDensities(S.mat) }; },
    };
    paint();
    return api;
  };
})();
