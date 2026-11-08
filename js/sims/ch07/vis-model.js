/* PHY.sims.visModel: one schematic event drawn by two trajectory models. A proton stops in the Be disc
   after an inelastic reaction that makes a neutron and a gamma; the gamma makes one Compton electron
   inside the disc and leaves. drawByParticleID colors by particle (as vis.mac sets it: proton red, neutron
   green, gamma yellow, e- blue). drawByCharge, the model Geant4 uses when the macro creates none, knows only
   the charge: here the classes are drawn with ink (positive, solid), ink dashed (negative) and muted
   (neutral), since the site keeps the particle colors for particles; Geant4's own defaults are named in
   the text. Before play() the event is drawn by drawByParticleID; play() switches to drawByCharge.
   opts: {locked, chapter, section}. getState(): {model, classes: {type: drawn color key}, filter}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch07;

  const R0 = [3.1, 2.2, 45], RX = [3.16, 2.24, 45.9];
  const G1 = [RX[0] - 7.2, RX[1] - 1.6, RX[2] + 1.6];
  const EVENT = [
    { type: 'proton', charge: 1, pts: [[0, 0, 0], R0, RX] },
    { type: 'neutron', charge: 0, pts: [RX, [RX[0] + 10, RX[1] + 17, RX[2] + 22]] },
    { type: 'gamma', charge: 0, pts: [RX, G1, [G1[0] + 3, G1[1] - 22, G1[2] + 12]] },
    { type: 'e-', charge: -1, pts: [G1, [G1[0] + 1.6, G1[1] - 1.4, G1[2] + 0.6], [G1[0] + 2.3, G1[1] - 3.4, G1[2] + 1.0]] },
  ];

  PHY.sims.visModel = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true, model: 'id' }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -48, xMax: 48, yMin: -30, yMax: 30 }, aspect: 1.6, minHeight: 230, maxHeight: 420 });
    const C = PHY.colors;
    const tw = PHY.tweens();
    const cam = K.camera([-1, 0.35, -0.3]);
    const S = { model: opts.model, filter: null, ran: false };

    let modelC = null, filtT = null;
    function touch() { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }
    if (controlsEl) {
      modelC = U.Choice(controlsEl, { label: 'מודל הצבעים', options: [{ value: 'id', text: '<span dir="ltr">drawByParticleID</span>' }, { value: 'charge', text: '<span dir="ltr">drawByCharge</span>, ברירת המחדל' }], value: S.model, onChange(v) { S.model = v; loop.requestRender(); touch(); } });
      filtT = U.Toggle(controlsEl, 'מסנן: רק פרוטונים ונייטרונים', { value: false, onChange(v) { S.filter = v ? new Set(['proton', 'neutron']) : null; loop.requestRender(); touch(); } });
    }
    function lock(on) {
      opts.locked = on;
      if (modelC) modelC.setEnabled(!on);
      if (filtT) filtT.input.disabled = on;
    }
    const NAME = { proton: 'p', neutron: 'n', gamma: 'γ', 'e-': 'e⁻' };
    function classOf(t) {
      if (S.model === 'id') return { proton: 'proton', neutron: 'neutron', gamma: 'gamma', 'e-': 'electron' }[t.type];
      return t.charge > 0 ? 'ink' : t.charge < 0 ? 'ink-dashed' : 'muted';
    }
    function render() {
      view.clear();
      const r = K.drawScene(view, cam, { zoom: 1.25, center: [0, 0, 38], style: 'wireframe', aux: false, axes: false, t: 4, tracks: EVENT, model: S.model === 'id' ? 'id' : 'charge', filter: S.filter });
      /* name each track along its last segment, offset to the side */
      const AT = { proton: 0.45, neutron: 0.75, gamma: 0.7, 'e-': 1 };
      EVENT.forEach(function (t) {
        if (S.filter && !S.filter.has(t.type)) return;
        const n = t.pts.length;
        const a = r.P(t.pts[n - 2]), b = r.P(t.pts[n - 1]);
        const f = AT[t.type];
        const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const key = classOf(t).replace('-dashed', '');
        view.text(x - (dy / l) * 3.2, y + (dx / l) * 3.2, F.ltr(NAME[t.type]), { size: 13, weight: 800, color: C[key], halo: true });
      });
      const title = S.model === 'id' ? 'drawByParticleID' : 'drawByCharge';
      view.screenText(10, 16, F.ltr(title), { size: 11.5, weight: 700, align: 'left', color: C.ink, pill: true });
      if (S.model === 'charge') {
        const y0 = view.h - 16;
        view.screenText(view.w - 10, y0, 'חיובי: קו מלא · שלילי: מקווקו · ניטרלי: אפור', { size: 11, weight: 600, align: 'right', color: C.muted, pill: true });
      }
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.model = 'id'; S.ran = false; loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true;
        S.model = 'id';
        if (modelC) modelC.set('id');
        loop.start();
        return tw.run(seconds || 3.5, function (k) {
          if (k >= 0.45 && S.model !== 'charge') { S.model = 'charge'; if (modelC) modelC.set('charge'); loop.requestRender(); }
          if (k >= 1) lock(false);
        });
      },
      setParam(key, v) { if (key === 'locked') lock(v); else if (key === 'model') { S.model = v; if (modelC) modelC.set(v); loop.requestRender(); } else if (key === 'filter') { S.filter = v ? new Set(v) : null; loop.requestRender(); } },
      getState() {
        const classes = {};
        EVENT.forEach(function (t) { classes[t.type] = classOf(t); });
        return { model: S.model, classes, filter: S.filter ? Array.from(S.filter) : null };
      },
    };
    lock(opts.locked);
    return api;
  };
})();
