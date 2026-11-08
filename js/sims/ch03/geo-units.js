/* PHY.sims.geoUnits: units in a macro line. /ldns/det/addLayer takes "material thickness [unit]"; the
   unit parameter is optional with the default value "mm" (src/DetectorMessenger.cc), and the messenger
   multiplies the number by the value of the unit in Geant4's internal units, where mm = 1, cm = 10,
   m = 1000, um = 0.001. So Geant4 stores a length as a number of millimetres. The geometry table prints
   the thickness with G4BestUnit (the unit that gives the smallest number ≥ 1) and z in mm.
   mode 'card': "/ldns/det/addLayer Be 1.6 cm"; mode 'trap': "/ldns/det/addLayer Be 2" without a unit.
   play(seconds) parses the line (the default unit appears when the unit is missing), stores the value and
   builds the layer; before it the readouts show "?". After it: choices for the number and the unit.
   opts: {mode, locked, chapter, section}. getState(): {value, unit, used (unit used), stored (mm), line, printed}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch03;
  const VALUES = [2, 16, 1.6, 0.2, 500];
  const UNITS = ['', 'mm', 'cm', 'm', 'um'];

  PHY.sims.geoUnits = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'card', locked: true }, opts || {});
    const trap = opts.mode === 'trap';
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 72 }, aspect: 1.45, minHeight: 230, maxHeight: 400 });
    const tw = PHY.tweens();
    const S = { value: trap ? 2 : 1.6, unit: trap ? '' : 'cm', ran: false, k: 1 };
    const D = 45, R = 22;

    const used = () => S.unit || 'mm';
    const stored = () => S.value * K.UNIT_MM[used()];
    const line = () => '/ldns/det/addLayer Be ' + K.g4num(S.value) + (S.unit ? ' ' + S.unit : '');
    const printed = () => K.build({ layers: [{ mat: 'Be', t: stored() }], distance: D, radius: R }).lines[2];

    let Rd = null, ch1 = null, ch2 = null, prEl = null;
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    if (controlsEl) {
      Rd = U.Readouts(controlsEl, [
        { key: 'u', label: 'היחידה שבשימוש' },
        { key: 'v', label: 'המספר בזיכרון', color: 'var(--c-volume)' },
        { key: 'z', label: 'השכבה, z ב-mm' },
      ]);
      const g = U.h('div', { class: 'g4edit' });
      controlsEl.appendChild(g);
      ch1 = U.Choice(g, { label: 'המספר בשורה', options: VALUES.map((v) => ({ value: v, text: K.g4num(v) })), value: S.value, onChange: (v) => { S.value = v; S.k = 1; paint(); loop.requestRender(); mark(); } });
      ch2 = U.Choice(g, { label: 'היחידה בשורה', options: UNITS.map((u) => ({ value: u, text: u || 'בלי' })), value: S.unit, onChange: (v) => { S.unit = v; S.k = 1; paint(); loop.requestRender(); mark(); } });
      ch1.setEnabled(!opts.locked); ch2.setEnabled(!opts.locked);
      controlsEl.appendChild(U.h('div', { class: 'g4out-label', text: 'השורה בטבלה של Geant4:' }));
      prEl = U.h('pre', { class: 'code g4out', dir: 'ltr' });
      controlsEl.appendChild(prEl);
    }
    function paint() {
      const done = S.ran && S.k >= 1;
      if (Rd) {
        Rd.set('u', done ? F.ltr(used()) + (S.unit ? '' : ' (ברירת מחדל)') : '?');
        Rd.set('v', done ? K.g4num(stored()) : '?');
        Rd.set('z', done ? F.ltr('[45, ' + K.g4num(D + stored()) + ']') : '?');
      }
      if (prEl) prEl.textContent = done ? printed() : '  layer 0 : Be (G4_Be, rho = 1.848 g/cm3)  t = ?';
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      /* the macro line, token by token */
      const toks = ['/ldns/det/addLayer', 'Be', K.g4num(S.value)].concat(S.unit ? [S.unit] : []);
      const ctx = view.ctx;
      ctx.save();
      ctx.font = '600 13px ui-monospace, Menlo, Consolas, monospace';
      let x = view.sx(3);
      const y = view.sy(62);
      const tokX = [];
      toks.forEach(function (t, i) {
        ctx.fillStyle = i === 3 ? C.accent : i === 2 ? C.ink : C.muted;
        ctx.fillText(t, x, y);
        tokX.push([x, x + ctx.measureText(t).width]);
        x += ctx.measureText(t + ' ').width;
      });
      const done = S.ran && S.k >= 1;
      if (!S.unit && S.ran) {
        /* the default value of the unit parameter fills in */
        ctx.globalAlpha = Math.min(1, S.k * 1.6);
        ctx.fillStyle = C.accent;
        ctx.fillText('mm', x, y);
        ctx.strokeStyle = C.accent; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
        ctx.strokeRect(x - 3, y - 13, ctx.measureText('mm').width + 6, 18);
      }
      ctx.restore();
      if (!S.unit && S.ran) view.text(3, 52, 'ברירת המחדל של הפרמטר unit', { size: 10.5, weight: 600, color: C.accent, align: 'left' });
      if (S.ran && S.k > 0.4) {
        const f = K.UNIT_MM[used()];
        view.text(3, 45, F.ltr('t = ' + K.g4num(S.value) + ' × ' + used() + ' = ' + K.g4num(S.value) + ' × ' + K.g4num(f) + ' = ' + K.g4num(stored())), { size: 13, weight: 700, color: C.ink, align: 'left', font: 'ui-monospace, Menlo, Consolas, monospace' });
      }
      /* the layer, to scale in z (z axis from 0 to the end of the layer, at least 70 mm) */
      const z1 = D + (done ? stored() : 0);
      const zMax = Math.max(70, z1 * 1.08);
      const sz = (z) => 3 + (94 * z) / zMax;
      const yr = (r) => 18 + (r / 30) * 14;
      view.line(sz(0), 18, sz(zMax), 18, { color: 'grid', width: 1, dash: [3, 4] });
      view.circle(sz(0), 18, 4, { px: true, fill: C.proton });
      if (done) {
        ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = C.volume;
        const xa = view.sx(sz(D)), xb = Math.max(xa + 1.5, view.sx(sz(z1)));
        ctx.fillRect(xa, view.sy(yr(R)), xb - xa, view.sy(yr(-R)) - view.sy(yr(R)));
        ctx.restore();
        view.poly([{ x: sz(D), y: yr(-R) }, { x: sz(z1), y: yr(-R) }, { x: sz(z1), y: yr(R) }, { x: sz(D), y: yr(R) }], { close: true, color: 'volume', width: 1.8 });
        view.text(sz(D), yr(-R) - 3, '45', { size: 10, color: C.muted });
        view.text(sz(z1), yr(-R) - 3, K.g4num(z1), { size: 10, color: C.muted, align: z1 - D < 0.1 * zMax ? 'left' : 'center' });
      } else K.mark(view, view.sx(sz(D + 10)), view.sy(18), '?', 24);
      K.clock(view, 'z בקנה מידה');
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.k = 1; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.k = 0; paint(); loop.start();
        return tw.run(seconds || 3, (k) => { S.k = k; paint(); loop.requestRender(); })
          .then(() => { opts.locked = false; if (ch1) { ch1.setEnabled(true); ch2.setEnabled(true); } paint(); });
      },
      setParam(key, v) { if (key === 'value') S.value = v; if (key === 'unit') S.unit = v; S.ran = true; S.k = 1; paint(); loop.requestRender(); },
      getState() { return { value: S.value, unit: S.unit, used: used(), stored: stored(), line: line(), printed: printed(), ran: S.ran }; },
    };
    paint();
    return api;
  };
})();
