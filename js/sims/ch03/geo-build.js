/* PHY.sims.geoBuild: building the ldns converter the way DetectorConstruction::Construct does. Each
   /ldns/det/addLayer appends a G4Tubs layer behind the previous one, starting at /ldns/det/distance; all
   layers share /ldns/det/radius; layer i gets the name Layer<i>_<material> and copy number i + 1. The
   World is a vacuum box. Under the r–z drawing: the overlap-check lines and the geometry table that
   Geant4 prints at the start of the run (PHY.ch03.build), and in lab mode the macro lines.
   mode 'card': Be 2 mm at 45 mm (r 22 mm) is built; play(seconds) adds "addLayer Pb 10 mm"; before it the
     Pb line of the table shows z = [?, ?]. After it: buttons (add Be 2 mm, add Pb 10 mm, clear) and
     sliders for the distance and the radius.
   mode 'lab': the playground: a layer editor (which layer, material, thickness, add, remove), distance,
     radius, cone half-angle, and a moderator (none, behind the converter, or insert mode with its depth).
   opts: {mode, locked, chapter, section}. getState(): {model, zb, lines, macro, errors, volumes, frac}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch03;
  const MATS = ['Be', 'Li', 'LiF', 'Pb', 'PE'];

  PHY.sims.geoBuild = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'card', locked: true }, opts || {});
    const lab = opts.mode === 'lab';
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -5, xMax: 80, yMin: -36, yMax: 40 }, aspect: 1.25, minHeight: 250, maxHeight: 440 });
    const tw = PHY.tweens();
    const M = lab
      ? { layers: [{ mat: 'Be', t: 2 }], distance: 45, radius: 22, cone: 20, mod: null }
      : { layers: [{ mat: 'Be', t: 2 }], distance: 45, radius: 22, cone: 20, mod: null };
    const S = { ran: lab || !opts.locked, slide: lab ? 1 : 0, sel: 0, modMode: 'none', modLen: 100, modR: 50, insert: 42 };
    if (!lab) M.layers.push({ mat: 'Pb', t: 10 });

    /* the model as drawn: in card mode the Pb layer exists only after the run */
    function model() {
      const m = { layers: M.layers.slice(), distance: M.distance, radius: M.radius, cone: M.cone, mod: null };
      if (!lab && !S.ran) m.layers = m.layers.slice(0, 1);
      if (lab && S.modMode !== 'none') m.mod = { mat: 'HDPE', length: S.modLen, radius: S.modR, gap: 5, insert: S.modMode === 'insert' ? S.insert : -1 };
      return m;
    }
    function fit() {
      const b = K.build(model());
      const zLast = b.modZ ? Math.max(b.modZ[1], b.zEnd) : b.zEnd;
      const rMax = Math.max(M.radius, b.modZ ? S.modR : 0);
      const zMin = b.modZ ? Math.min(-5, b.modZ[0] - 5) : -5;
      const xMax = Math.max(70, zLast * 1.12 + 4);
      const yMax = Math.max(30, rMax * 1.3);
      const w = { xMin: zMin, xMax, yMin: -yMax, yMax: yMax + 10 };
      const cur = view.world;
      if (cur.xMin !== w.xMin || cur.xMax !== w.xMax || cur.yMax !== w.yMax) view.setWorld(w);
    }

    /* ---------- controls ---------- */
    let ovEl = null, prEl = null, macEl = null, Rd = null, btns = [], sliders = [], layerChoice = null, matChoice = null, tSlider = null, insSlider = null, lenSlider = null;
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function change() { fit(); paint(); loop.requestRender(); mark(); }
    if (controlsEl) {
      if (lab) {
        Rd = U.Readouts(controlsEl, [
          { key: 'cf', label: 'רדיוס הקונוס בפאה הקדמית' },
          { key: 'cb', label: 'ובפאה האחורית' },
          { key: 'fr', label: 'החלק שפוגע בממיר', color: 'var(--c-proton)' },
          { key: 'tt', label: 'עובי הממיר כולו' },
        ]);
        const ed = U.h('div', { class: 'g4edit' });
        controlsEl.appendChild(ed);
        layerChoice = U.Choice(ed, { label: 'השכבה שעורכים', options: [{ value: 0, text: '0' }], value: 0, onChange: (v) => { S.sel = v; syncEditor(); } });
        matChoice = U.Choice(ed, { label: 'החומר שלה', options: MATS.map((m) => ({ value: m, text: m })), value: 'Be', onChange: (v) => { M.layers[S.sel].mat = v; change(); } });
        tSlider = U.Slider(ed, { label: 'העובי שלה', min: 0.5, max: 30, step: 0.5, value: 2, unit: 'mm', digits: 1, onInput: (v) => { M.layers[S.sel].t = v; change(); } });
        const row = U.h('div', { class: 'btn-row' });
        ed.appendChild(row);
        U.Button(row, 'הוספת שכבה', () => { if (M.layers.length < 4) { M.layers.push({ mat: 'Pb', t: 10 }); S.sel = M.layers.length - 1; rebuildLayerChoice(); change(); } });
        U.Button(row, 'הסרת האחרונה', () => { if (M.layers.length > 1) { M.layers.pop(); S.sel = Math.min(S.sel, M.layers.length - 1); rebuildLayerChoice(); change(); } });
      }
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      const mk = (label, key, min, max, step, unit, d) => {
        const s = U.Slider(grid, { label, min, max, step, value: M[key], unit, digits: d, onInput: (v) => { M[key] = v; change(); } });
        s.setEnabled(lab || !opts.locked);
        sliders.push(s);
        return s;
      };
      mk('המרחק מהמקור', 'distance', 10, 80, 1, 'mm', 0);
      mk('הרדיוס', 'radius', 5, 40, 1, 'mm', 0);
      if (lab) {
        mk('חצי זווית הקונוס', 'cone', 5, 40, 1, 'deg', 0);
        const mrow = U.h('div', { class: 'g4edit' });
        controlsEl.appendChild(mrow);
        U.Choice(mrow, { label: 'מאט HDPE', options: [{ value: 'none', text: 'בלי' }, { value: 'behind', text: 'מאחורי הממיר' }, { value: 'insert', text: 'הממיר בתוכו' }], value: 'none', onChange: (v) => { S.modMode = v; syncEditor(); change(); } });
        lenSlider = U.Slider(mrow, { label: 'אורך המאט', min: 20, max: 200, step: 5, value: S.modLen, unit: 'mm', digits: 0, onInput: (v) => { S.modLen = v; change(); } });
        insSlider = U.Slider(mrow, { label: 'עומק הממיר בתוך המאט', min: 0, max: 100, step: 1, value: S.insert, unit: 'mm', digits: 0, onInput: (v) => { S.insert = v; change(); } });
      } else {
        const row = U.h('div', { class: 'btn-row' });
        controlsEl.appendChild(row);
        btns.push(U.Button(row, F.ltr('addLayer Be 2 mm'), () => { M.layers.push({ mat: 'Be', t: 2 }); if (M.layers.length > 6) M.layers.shift(); change(); }));
        btns.push(U.Button(row, F.ltr('addLayer Pb 10 mm'), () => { M.layers.push({ mat: 'Pb', t: 10 }); if (M.layers.length > 6) M.layers.shift(); change(); }));
        btns.push(U.Button(row, F.ltr('clearLayers'), () => { M.layers = [{ mat: 'Be', t: 2 }]; change(); }));
        btns.forEach((b) => { b.disabled = opts.locked; b.setAttribute('dir', 'ltr'); });
      }
      controlsEl.appendChild(U.h('div', { class: 'g4out-label', text: 'מה Geant4 מדפיס בתחילת הריצה:' }));
      ovEl = U.h('pre', { class: 'code g4out', dir: 'ltr' });
      prEl = U.h('pre', { class: 'code g4out', dir: 'ltr' });
      controlsEl.appendChild(ovEl);
      controlsEl.appendChild(prEl);
      if (lab) {
        controlsEl.appendChild(U.h('div', { class: 'g4out-label', text: 'שורות המאקרו שבונות את זה:' }));
        macEl = U.h('pre', { class: 'code g4out', dir: 'ltr' });
        controlsEl.appendChild(macEl);
      }
    }
    function rebuildLayerChoice() {
      if (!layerChoice) return;
      const parent = layerChoice.el.parentNode;
      const next = layerChoice.el.nextSibling;
      layerChoice.el.remove();
      layerChoice = U.Choice(null, { label: 'השכבה שעורכים', options: M.layers.map((l, i) => ({ value: i, text: String(i) })), value: S.sel, onChange: (v) => { S.sel = v; syncEditor(); } });
      parent.insertBefore(layerChoice.el, next);
      syncEditor();
    }
    function syncEditor() {
      if (!lab || !matChoice) return;
      matChoice.set(M.layers[S.sel].mat);
      tSlider.set(M.layers[S.sel].t);
      if (insSlider) { insSlider.el.hidden = S.modMode !== 'insert'; lenSlider.el.hidden = S.modMode === 'none'; }
    }

    function paint() {
      const m = model();
      const b = K.build(m);
      if (ovEl) {
        ovEl.textContent = b.overlaps.join('\n');
        let lines = b.lines.slice();
        if (!lab && !S.ran) {
          const full = K.build({ layers: M.layers, distance: M.distance, radius: M.radius }).lines;
          lines = full.slice();
          lines[3] = full[3].replace(/z = \[.*\] mm/, 'z = [?, ?] mm');
        }
        if (b.errors.length) lines = ['-------- EEEE ------- G4Exception-START -------- EEEE -------', '*** G4Exception : ' + b.errors[0].code, '      issued by : DetectorConstruction::Construct', b.errors[0].text];
        prEl.textContent = lines.join('\n');
        if (macEl) macEl.textContent = b.macro.join('\n');
      }
      if (Rd) {
        const T = M.layers.reduce((s, l) => s + l.t, 0);
        Rd.set('cf', F.unit(K.coneR(M.distance, M.cone), 'mm', 1));
        Rd.set('cb', F.unit(K.coneR(M.distance + T, M.cone), 'mm', 1));
        Rd.set('fr', F.unit(100 * K.intercept(M.distance, M.radius, M.cone), '%', 1));
        Rd.set('tt', F.unit(T, 'mm', 1));
      }
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      const m = model();
      view.line(view.world.xMin + 1, 0, view.world.xMax - 1, 0, { color: 'grid', width: 1, dash: [3, 4] });
      const b = K.drawRZ(view, m, { cone: M.cone, zMax: view.world.xMax - 1, labelGap: 3 });
      /* the card: the new layer slides in from the right */
      if (!lab && S.slide > 0 && S.slide < 1) {
        const z0 = M.distance + M.layers[0].t, t = M.layers[1].t;
        const off = (1 - PHY.ease.inOut(S.slide)) * 25;
        view.poly([{ x: z0 + off, y: -M.radius }, { x: z0 + t + off, y: -M.radius }, { x: z0 + t + off, y: M.radius }, { x: z0 + off, y: M.radius }], { close: true, color: 'volume', width: 1.8, dash: [5, 4] });
      }
      /* z marks of the boundaries */
      b.zb.forEach(function (z, i) {
        if (i > 0 && (z - b.zb[i - 1]) * view.scale < 9) return;
        view.text(z, M.radius + 2.2, K.g4num(z), { size: 10, weight: 600, color: C.muted });
      });
      K.clock(view, 'World: ואקום');
      if (!lab && !S.ran) K.mark(view, view.sx(M.distance + 12), view.sy(0));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); fit(); paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.slide = 0; fit(); paint(); loop.start();
        return tw.run(seconds || 3, (k) => { S.slide = k; loop.requestRender(); })
          .then(() => { opts.locked = false; sliders.forEach((s) => s.setEnabled(true)); btns.forEach((x) => { x.disabled = false; }); paint(); });
      },
      setParam(key, v) {
        if (key === 'layers') M.layers = v.map((l) => ({ mat: l.mat, t: l.t }));
        else if (key === 'modMode') S.modMode = v;
        else if (key === 'insert') S.insert = v;
        else if (key === 'modLen') S.modLen = v;
        else M[key] = v;
        S.sel = Math.min(S.sel, M.layers.length - 1);
        fit(); paint(); loop.requestRender();
      },
      getState() {
        const m = model(), b = K.build(m);
        return { model: m, zb: b.zb, lines: b.lines.slice(), macro: b.macro.slice(), errors: b.errors.slice(), volumes: b.volumes, overlaps: b.overlaps.slice(), modZ: b.modZ, frac: K.intercept(M.distance, M.radius, M.cone), ran: S.ran };
      },
    };
    syncEditor();
    fit();
    paint();
    return api;
  };
})();
