/* PHY.sims.visViewer: a small Geant4 viewer of the ldns converter (PHY.ch07.drawScene): the Be disc,
   the source at the origin, the axes and schematic proton (and neutron) trajectories, seen through the
   camera of /vis/viewer/set/viewpointVector or viewpointThetaPhi, orthogonal, with the style, the auxiliary
   edges and the zoom of the vis commands. The commands that give the current picture are printed under it.
   Modes:
     'view'   a card: play() shows the scene from each vector of opts.sequence in turn, with the screen
              direction of the beam (+z); before it the viewer shows the vis.mac view (θ 70°, φ 20°).
     'rotate' a card: 300 events are drawn once; play() turns the camera as a mouse drag does. The events
              are not run again: the count of simulated events stays, only the redraw count grows.
     'style'  a card: play() goes surface -> wireframe -> wireframe with auxiliaryEdge.
     'lab'    the playground: every control, a source (analog from 0.5 MeV or flat from 1.85 MeV), a
              filter, the trajectory model, and /run/beamOn N with accumulate.
   opts: {mode, theta, phi, vec, zoom, style, aux, axes, t, events, seed, sequence, locked, chapter, section}.
   getState(): {theta, phi, vec, cam, beam, style, aux, zoom, events, neutrons, redraws, hash, commands, phase}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch07;
  const h = U.h;

  PHY.sims.visViewer = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'lab', theta: 70, phi: 20, vec: null, zoom: 1.3, style: 'wireframe', aux: true, axes: true, t: 4, events: 300, seed: 7, src: 'analog', filter: null, model: 'id', locked: false }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -48, xMax: 48, yMin: -30, yMax: 30 }, aspect: 1.6, minHeight: 220, maxHeight: 430 });
    const C = PHY.colors;
    const tw = PHY.tweens();
    const S = { tracks: [], events: 0, neutrons: 0, redraws: 0, label: '', phase: 'ready', ran: false, seqIndex: -1, hash: '' };
    let cam = null;

    function setCam() {
      cam = opts.vec ? K.camera(opts.vec) : K.cameraTP(opts.theta, opts.phi);
    }
    function generate(n) {
      const rng = PHY.random(opts.seed).next;
      S.tracks = []; S.events = 0; S.neutrons = 0;
      api.beamOn(n, rng);
    }
    function hashTracks() {
      let x = 0;
      S.tracks.forEach(function (t) { t.pts.forEach(function (p) { x = (x * 31 + Math.round(p[0] * 1000) + 7 * Math.round(p[1] * 1000) + 13 * Math.round(p[2] * 1000)) | 0; }); });
      return String(x);
    }

    /* ---------- controls ---------- */
    let thS = null, phS = null, zS = null, styleC = null, auxT = null, axesT = null, cmds = null, ro = null;
    let srcC = null, filtC = null, modelC = null, nS = null, runB = null, clearB = null;
    function touch() { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }
    if (controlsEl) {
      if (opts.mode === 'rotate') {
        ro = U.Readouts(controlsEl, [{ key: 'ev', label: 'אירועים שהורצו' }, { key: 'rd', label: 'ציורים מחדש' }]);
      }
      if (opts.mode === 'lab') {
        ro = U.Readouts(controlsEl, [{ key: 'ev', label: 'אירועים בתמונה' }, { key: 'n', label: 'מסלולי נייטרונים', color: 'var(--c-neutron)' }]);
      }
      const g = h('div', { class: 'sim-grid' });
      controlsEl.appendChild(g);
      thS = U.Slider(g, { label: 'θ, הזווית מציר z', min: 0, max: 180, step: 1, value: opts.theta, unit: 'deg', digits: 0, onInput(v) { opts.theta = v; opts.vec = null; setCam(); paint(); touch(); } });
      phS = U.Slider(g, { label: 'φ, הזווית סביב z', min: -180, max: 180, step: 1, value: opts.phi, unit: 'deg', digits: 0, onInput(v) { opts.phi = v; opts.vec = null; setCam(); paint(); touch(); } });
      zS = U.Slider(g, { label: 'זום', min: 0.5, max: 3, step: 0.1, value: opts.zoom, digits: 1, onInput(v) { opts.zoom = v; paint(); touch(); } });
      styleC = U.Choice(controlsEl, { label: 'סגנון', options: [{ value: 'wireframe', text: '<span dir="ltr">wireframe</span>' }, { value: 'surface', text: '<span dir="ltr">surface</span>' }], value: opts.style, onChange(v) { opts.style = v; paint(); touch(); } });
      const row = h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      auxT = U.Toggle(row, F.ltr('auxiliaryEdge'), { value: opts.aux, onChange(v) { opts.aux = v; paint(); touch(); } });
      axesT = U.Toggle(row, 'צירים', { value: opts.axes, onChange(v) { opts.axes = v; paint(); touch(); } });
      if (opts.mode === 'lab') {
        srcC = U.Choice(controlsEl, { label: 'המקור', options: [{ value: 'analog', text: 'התערובת האמיתית, <span dir="ltr">analog</span> מ-0.5 MeV' }, { value: 'flat', text: '<span dir="ltr">flat</span> מ-1.85 MeV' }], value: opts.src, onChange(v) { opts.src = v; paint(); touch(); } });
        filtC = U.Choice(controlsEl, { label: 'המסנן', options: [{ value: 'pn', text: 'פרוטונים ונייטרונים' }, { value: 'n', text: 'רק נייטרונים' }, { value: 'all', text: 'בלי מסנן' }], value: 'pn', onChange(v) { opts.filter = v === 'n' ? new Set(['neutron']) : v === 'pn' ? new Set(['proton', 'neutron']) : null; paint(); touch(); } });
        modelC = U.Choice(controlsEl, { label: 'צבעים', options: [{ value: 'id', text: '<span dir="ltr">drawByParticleID</span>' }, { value: 'charge', text: '<span dir="ltr">drawByCharge</span>' }], value: 'id', onChange(v) { opts.model = v; paint(); touch(); } });
        nS = U.Slider(controlsEl, { label: 'כמה אירועים להריץ', min: 2, max: 4, step: 0.05, value: Math.log10(2000), format: (v) => F.num(Math.round(Math.pow(10, v) / 100) * 100, 0), color: 'var(--accent)' });
        const r2 = h('div', { class: 'sim-row' });
        controlsEl.appendChild(r2);
        runB = U.Button(r2, F.ltr('/run/beamOn'), function () { const n = Math.round(Math.pow(10, nS.value) / 100) * 100; api.beamOn(n); touch(); }, { primary: true });
        clearB = U.Button(r2, 'לנקות את התמונה', function () { S.tracks = []; S.events = 0; S.neutrons = 0; paint(); touch(); }, {});
      }
      cmds = h('div', { class: 'vis-cmds', dir: 'ltr' });
      controlsEl.appendChild(cmds);
    }
    function lock(on) {
      opts.locked = on;
      [thS, phS, zS].forEach(function (s) { if (s) s.setEnabled(!on); });
      if (styleC) styleC.setEnabled(!on);
      if (auxT) auxT.input.disabled = on;
      if (axesT) axesT.input.disabled = on;
    }
    function commands() {
      const L = [];
      if (opts.mode === 'lab') L.push('/vis/open', '/vis/drawVolume');
      L.push(opts.vec ? '/vis/viewer/set/viewpointVector ' + K.vecText(opts.vec) : '/vis/viewer/set/viewpointThetaPhi ' + Math.round(opts.theta) + ' ' + Math.round(opts.phi) + ' deg');
      L.push('/vis/viewer/set/style ' + opts.style);
      L.push('/vis/viewer/set/auxiliaryEdge ' + (opts.aux ? 'true' : 'false'));
      L.push('/vis/viewer/zoomTo ' + K.fmtN(opts.zoom));
      if (opts.axes) L.push('/vis/scene/add/axes 0 0 0 10 mm');
      if (opts.mode === 'lab') {
        L.push('/vis/scene/add/trajectories smooth');
        if (opts.model === 'id') L.push('/vis/modeling/trajectories/create/drawByParticleID', '/vis/modeling/trajectories/drawByParticleID-0/set proton red', '/vis/modeling/trajectories/drawByParticleID-0/set neutron green');
        if (opts.filter) {
          L.push('/vis/filtering/trajectories/create/particleFilter');
          opts.filter.forEach(function (p) { L.push('/vis/filtering/trajectories/particleFilter-0/add ' + p); });
        }
        L.push('/vis/scene/endOfEventAction accumulate 10000');
        L.push(opts.src === 'flat' ? '/ldns/src/Emin 1.85 MeV' : '/ldns/src/Emin 0.5 MeV');
        L.push('/ldns/src/sampling ' + opts.src);
      }
      return L;
    }
    function paint() {
      if (cmds) { cmds.innerHTML = ''; commands().forEach(function (l) { cmds.appendChild(h('div', { text: l })); }); }
      if (thS) {
        if (opts.vec) {
          const v = K.norm(opts.vec);
          thS.set(Math.round(Math.acos(Math.max(-1, Math.min(1, v[2]))) * 180 / Math.PI));
          phS.set(Math.round(Math.atan2(v[1], v[0]) * 180 / Math.PI));
        } else { thS.set(opts.theta); phS.set(opts.phi); }
      }
      if (zS) zS.set(opts.zoom);
      if (styleC) styleC.set(opts.style);
      if (auxT) auxT.set(opts.aux);
      if (ro) {
        if (opts.mode === 'rotate') { ro.set('ev', S.ran ? F.num(S.events, 0) : '?'); ro.set('rd', S.ran ? F.num(S.redraws, 0) : '?'); }
        else { ro.set('ev', F.num(S.events, 0)); ro.set('n', F.num(S.neutrons, 0)); }
      }
      loop.requestRender();
    }

    function render() {
      view.clear();
      if (S.ran && opts.mode === 'rotate') S.redraws++;
      K.drawScene(view, cam, { zoom: opts.zoom, style: opts.style, aux: opts.aux, axes: opts.axes, t: opts.t, tracks: S.tracks, filter: opts.filter, model: opts.model, thin: S.tracks.length > 1500 });
      /* the screen direction of the beam, in a small box in the top-left corner */
      const b = K.beamOnScreen(cam);
      const ctx = view.ctx, bx = 8, by = 8, bw = 74, bh = 34;
      ctx.save();
      ctx.fillStyle = C.panel; ctx.strokeStyle = C.gridStrong; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.92;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 9); else ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      ctx.restore();
      const cx = bx + 22, cy = by + bh / 2;
      if (b.len > 0.08) {
        ctx.save();
        ctx.strokeStyle = C.accent; ctx.fillStyle = C.accent; ctx.lineWidth = 2.4;
        const ux = b.x, uy = -b.y;
        ctx.beginPath(); ctx.moveTo(cx - ux * 13, cy - uy * 13); ctx.lineTo(cx + ux * 10, cy + uy * 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + ux * 15, cy + uy * 15); ctx.lineTo(cx + ux * 7 - uy * 5, cy + uy * 7 + ux * 5); ctx.lineTo(cx + ux * 7 + uy * 5, cy + uy * 7 - ux * 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        view.circle(view.toWorld(cx, cy).x, view.toWorld(cx, cy).y, 8, { px: true, color: C.accent, width: 2 });
        view.screenText(cx, cy + 0.5, cam.v[2] < 0 ? '×' : '•', { size: 13, weight: 800, color: C.accent });
      }
      view.screenText(bx + bw - 8, cy, F.ltr('+z'), { size: 12, weight: 700, color: C.accent, align: 'right' });
      if (S.label) view.screenText(view.w - 10, 16, S.label, { size: 11.5, weight: 600, align: 'right', color: C.ink, pill: true });
      if (opts.mode === 'lab' && opts.model === 'charge') view.screenText(view.w - 10, view.h - 16, 'drawByCharge: הצבע לפי המטען בלבד', { size: 11, weight: 600, align: 'right', color: C.muted, pill: true });
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); paint(); },
      beamOn(n, rng) {
        rng = rng || PHY.random(opts.seed + S.events * 7 + 1).next;
        const src = opts.src === 'flat' ? { mode: 'flat', Emin: 1.85, z0: 45 } : { mode: 'analog', Emin: 0.5, z0: 45 };
        for (let i = 0; i < n && S.events < 10000; i++) {
          const e = K.makeEvent(rng, src);
          e.tracks.forEach(function (t) { S.tracks.push(t); });
          S.events++; S.neutrons += e.nNeutron;
        }
        S.hash = hashTracks();
        paint();
        return { events: S.events, neutrons: S.neutrons };
      },
      play(seconds) {
        tw.clear();
        S.ran = true;
        loop.start();
        if (opts.mode === 'view') {
          const seq = opts.sequence || [[0, 0, -1], [1, 0, 0], [-1, 0, 0]];
          const T = seconds || 6;
          let shown = -1;
          return tw.run(T, function (k) {
            const i = Math.min(seq.length - 1, Math.floor(k * seq.length));
            if (i !== shown) { shown = i; S.seqIndex = i; opts.vec = seq[i].slice(); setCam(); S.label = F.ltr('viewpointVector ' + K.vecText(seq[i])); paint(); }
            if (k >= 1) { S.phase = 'done'; lock(false); paint(); }
          });
        }
        if (opts.mode === 'rotate') {
          const T = seconds || 5, p0 = opts.phi, t0 = opts.theta;
          S.redraws = 0;
          return tw.run(T, function (k) {
            opts.vec = null;
            opts.phi = ((Math.round(p0 + 160 * PHY.ease.inOut(k)) + 540) % 360) - 180;
            opts.theta = Math.round(t0 + 25 * Math.sin(Math.PI * k));
            setCam(); paint();
            if (k >= 1) { S.phase = 'done'; lock(false); }
          });
        }
        if (opts.mode === 'style') {
          const seq = [['surface', false], ['wireframe', false], ['wireframe', true]];
          const T = seconds || 6;
          let shown = -1;
          return tw.run(T, function (k) {
            const i = Math.min(seq.length - 1, Math.floor(k * seq.length));
            if (i !== shown) { shown = i; opts.style = seq[i][0]; opts.aux = seq[i][1]; S.label = F.ltr('style ' + seq[i][0] + (seq[i][1] ? ', auxiliaryEdge' : '')); paint(); }
            if (k >= 1) { S.phase = 'done'; lock(false); paint(); }
          });
        }
        return tw.wait(0.1);
      },
      setView(o) { if (o.vec) { opts.vec = o.vec.slice(); } else { opts.vec = null; if (o.theta !== undefined) opts.theta = o.theta; if (o.phi !== undefined) opts.phi = o.phi; } setCam(); paint(); },
      setParam(key, v) {
        if (key === 'locked') lock(v);
        else if (key === 'filter') { opts.filter = v ? new Set(v) : null; paint(); }
        else { opts[key] = v; if (key === 'theta' || key === 'phi') opts.vec = null; setCam(); paint(); }
      },
      getState() {
        return { theta: opts.theta, phi: opts.phi, vec: opts.vec ? opts.vec.slice() : null, cam, beam: K.beamOnScreen(cam), style: opts.style, aux: opts.aux, zoom: opts.zoom, events: S.events, neutrons: S.neutrons, redraws: S.redraws, hash: S.hash, commands: commands(), phase: S.phase, seqIndex: S.seqIndex, nTracks: S.tracks.length };
      },
    };
    setCam();
    if (opts.mode === 'rotate' || opts.mode === 'style' || opts.mode === 'view') generate(opts.events);
    else if (opts.mode === 'lab') api.beamOn(300, PHY.random(opts.seed).next);
    if (opts.mode === 'rotate') S.ran = false;
    if (opts.mode === 'view') S.label = F.ltr('viewpointThetaPhi ' + opts.theta + ' ' + opts.phi + ' deg');
    lock(opts.locked);
    paint();
    return api;
  };
})();
