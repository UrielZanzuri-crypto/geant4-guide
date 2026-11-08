/* PHY.sims.geoInsert: nested volumes, the ldns insert geometry (the example of the ldns guide, Pb 16 mm
   at 45 mm, r 22 mm, an HDPE moderator 100 mm long with radius 50 mm, insertDepth 42 mm). In insert mode
   the moderator is the mother of the converter layers, and a vacuum channel (Channel, a daughter of the
   moderator, of the converter's radius) leads from the moderator's upstream face to the converter. The
   moderator starts at z = distance − insertDepth; DetectorConstruction stops with LDNS005 when that is
   ≤ 0 (the source would be inside the moderator), when the stack does not fit in the moderator, or when
   the moderator is not wider than the converter. An optional Be reflector shell sits around the side.
   The canvas: r–z, to scale. Under it: the volume tree with copy numbers and the printout (or the error).
   Card: play(seconds) moves the distance from 45 mm to 40 mm; before it the outcome is hidden.
   After it: sliders for the distance and the insert depth, and the reflector toggle.
   opts: {locked, chapter, section}. getState(): {distance, insert, modZ, errors, volumes, lines}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch03;

  PHY.sims.geoInsert = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -25, xMax: 125, yMin: -62, yMax: 72 }, aspect: 1.15, minHeight: 280, maxHeight: 480 });
    const tw = PHY.tweens();
    const S = { distance: 45, insert: 42, refl: false, ran: false, anim: false, target: 40 };
    const model = () => ({ layers: [{ mat: 'Pb', t: 16 }], distance: S.distance, radius: 22, mod: { mat: 'HDPE', length: 100, radius: 50, insert: S.insert }, refl: S.refl ? { mat: 'Be', thickness: 50 } : null });

    let Rd = null, treeEl = null, prEl = null, sliders = [], tog = null;
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function change() { fit(); paint(); loop.requestRender(); mark(); }
    if (controlsEl) {
      Rd = U.Readouts(controlsEl, [
        { key: 'd', label: 'המרחק מהמקור' },
        { key: 'z', label: 'המאט מתחיל ב-z' },
        { key: 'st', label: 'מה Geant4 עושה' },
      ]);
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      sliders.push(U.Slider(grid, { label: 'המרחק מהמקור לממיר', min: 20, max: 90, step: 1, value: S.distance, unit: 'mm', digits: 0, onInput: (v) => { S.distance = v; change(); } }));
      sliders.push(U.Slider(grid, { label: 'עומק הממיר בתוך המאט', min: 0, max: 90, step: 1, value: S.insert, unit: 'mm', digits: 0, onInput: (v) => { S.insert = v; change(); } }));
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      tog = U.Toggle(row, 'מחזיר Be סביב המאט', { value: false, onChange: (v) => { S.refl = v; change(); } });
      sliders.forEach((s) => s.setEnabled(!opts.locked));
      tog.input.disabled = opts.locked;
      controlsEl.appendChild(U.h('div', { class: 'g4out-label', text: 'מי בתוך מי (ומספרי העותק):' }));
      treeEl = U.h('pre', { class: 'code g4out', dir: 'ltr' });
      controlsEl.appendChild(treeEl);
      controlsEl.appendChild(U.h('div', { class: 'g4out-label', text: 'מה Geant4 מדפיס:' }));
      prEl = U.h('pre', { class: 'code g4out', dir: 'ltr' });
      controlsEl.appendChild(prEl);
    }
    const hidden = () => !S.ran && opts.locked;
    function paint() {
      const b = K.build(model());
      if (Rd) {
        Rd.set('d', F.unit(S.distance, 'mm', 0));
        Rd.set('z', hidden() ? '?' : F.unit(b.modZ[0], 'mm', 0));
        Rd.set('st', hidden() || S.anim ? '?' : b.errors.length ? F.ltr(b.errors[0].code) + ', עוצר' : 'בונה');
      }
      if (!treeEl) return;
      const kids = (name) => b.volumes.filter((v) => v.mother === name);
      const lines = [];
      (function walk(name, depth) {
        const v = b.volumes.find((x) => x.name === name);
        lines.push('  '.repeat(depth) + (depth ? '└ ' : '') + v.name + ':' + v.copy + '  (' + v.mat + ')');
        kids(name).forEach((k) => walk(k.name, depth + 1));
      })('World', 0);
      treeEl.textContent = lines.join('\n');
      if (hidden() || S.anim) { prEl.textContent = '?'; return; }
      prEl.textContent = (b.errors.length
        ? ['-------- EEEE ------- G4Exception-START -------- EEEE -------', '*** G4Exception : ' + b.errors[0].code, '      issued by : DetectorConstruction::Construct', b.errors[0].text]
        : b.lines).join('\n');
    }
    function fit() {
      const big = S.refl ? 112 : 62;
      const w = { xMin: -25, xMax: 125, yMin: -big, yMax: big + 10 };
      if (view.world.yMax !== w.yMax) view.setWorld(w);
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      const m = model();
      const b = K.build(m);
      view.line(-24, 0, 124, 0, { color: 'grid', width: 1, dash: [3, 4] });
      K.drawRZ(view, m, { cone: 20, zMax: m.distance + 2, labels: true, labelSize: 10.5 });
      /* z = 0 and the moderator's front face */
      view.line(0, -8, 0, 8, { color: 'proton', width: 1.5 });
      view.text(0, -11, 'מקור', { size: 10, weight: 700, color: C.proton });
      if (!hidden() && !S.anim && b.errors.length) {
        view.screenText(view.w / 2, view.h - 18, b.errors[0].code + ': ' + (b.modZ[0] <= 0 ? 'המקור בתוך המאט' : 'הממיר לא נכנס'), { size: 12.5, weight: 800, color: C.bad, pill: true, pillBorder: 'bad' });
      }
      K.clock(view, 'בקנה מידה, r–z');
      if (hidden()) K.mark(view, view.sx(-12), view.sy(30), '?', 24);
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.distance = 45; S.insert = 42; S.refl = false; S.ran = false; S.anim = false; fit(); paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.anim = true; S.distance = 45; S.insert = 42; paint(); loop.start();
        const d0 = 45, d1 = S.target;
        return tw.run(seconds || 3, (k) => { S.distance = Math.round(d0 + (d1 - d0) * PHY.ease.inOut(k)); if (k >= 1) S.anim = false; if (sliders[0]) sliders[0].set(S.distance); paint(); loop.requestRender(); })
          .then(() => { opts.locked = false; sliders.forEach((s) => s.setEnabled(true)); if (tog) tog.input.disabled = false; paint(); });
      },
      setParam(key, v) { if (key in S) S[key] = v; S.ran = true; fit(); paint(); loop.requestRender(); },
      getState() { const b = K.build(model()); return { distance: S.distance, insert: S.insert, modZ: b.modZ.slice(), errors: b.errors.slice(), volumes: b.volumes, lines: b.lines.slice(), overlaps: b.overlaps.slice() }; },
    };
    fit();
    paint();
    return api;
  };
})();
