/* PHY.sims.archLab: the playground "מעבדת האירוע". One schematic event at a time, drawn from a seed: a
   proton of energy E enters the Be layer and slows down; in this toy half of the events end with an
   inelastic reaction (in the real run about one proton in 2200 makes a neutron), which makes a neutron,
   sometimes a gamma (whose Compton scattering makes an electron) and the residual nucleus. The event
   is played the way Geant4 runs it (PHY.ch02.transport: one track at a time, last in first out), with
   the tree below.
   Toggles: step points, secondaries (off: the primary only), boundary steps (rings on the steps that
   ended on a volume boundary, process Transportation). Counters: tracks, steps, boundary steps, the seed.
   "new event" takes the next seed; "again, same seed" replays the same event exactly.
   opts: {seed, E, pReact, chapter, section}. getState(): {seed, E, tracks, steps, boundary, order, signature}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;

  PHY.sims.archLab = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ seed: 12356, E: 6.3, pReact: 0.5 }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -10.5, xMax: 46.5, yMin: -39, yMax: 15.5 }, aspect: 1.02, minHeight: 300, maxHeight: 540 });
    const tw = PHY.tweens();
    const S = { t: 0, show: { points: true, sec: true, boundary: true } };
    let ev, tl;
    function build() {
      ev = K.transport(K.randomEvent(PHY.random(opts.seed).next, { E: opts.E, pReact: opts.pReact }));
      tl = K.timeline(ev, (e) => (e.cb === 'UserSteppingAction' ? 0.12 : e.cb === 'push' || e.cb === 'pop' ? 0.12 : 0.06));
    }
    const boundary = () => ev.tracks.reduce((s, t) => s + t.spec.procs.filter((p) => p === 'Transportation').length, 0);
    function mark() { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }

    let R = null;
    if (controlsEl) {
      R = U.Readouts(controlsEl, [
        { key: 'tr', label: 'מסלולים' },
        { key: 'st', label: 'צעדים' },
        { key: 'bd', label: 'צעדי גבול', color: 'var(--c-volume)' },
        { key: 'seed', label: 'הזרע' },
      ]);
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      U.Slider(grid, { label: 'אנרגיית הפרוטון', min: 2, max: 13, step: 0.1, value: opts.E, unit: 'MeV', digits: 1, color: 'var(--c-proton)', onInput: (v) => { opts.E = v; build(); S.t = tl.T; paint(); loop.requestRender(); }, onCommit: () => { api.play(); mark(); } });
      const tg = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(tg);
      U.Toggle(tg, 'נקודות הצעדים', { value: true, onChange: (v) => { S.show.points = v; loop.requestRender(); mark(); } });
      U.Toggle(tg, 'משניים', { value: true, onChange: (v) => { S.show.sec = v; loop.requestRender(); mark(); } });
      U.Toggle(tg, 'צעדי גבול', { value: true, onChange: (v) => { S.show.boundary = v; loop.requestRender(); mark(); } });
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      U.Button(row, 'אירוע חדש', () => { opts.seed++; build(); api.play(); mark(); }, { primary: true });
      U.Button(row, 'שוב, אותו זרע', () => { api.play(); mark(); });
    }
    function paint() {
      if (!R) return;
      const st = K.stateAt(ev, tl, S.t);
      R.set('tr', F.num(Object.keys(st.born).length, 0));
      R.set('st', F.num(st.nSteps, 0));
      let b = 0;
      ev.tracks.forEach((t) => { for (let i = 0; i < (st.shown[t.id] || 0); i++) if (t.spec.procs[i] === 'Transportation') b++; });
      R.set('bd', F.num(b, 0));
      R.set('seed', F.ltr(String(opts.seed)));
    }

    function render() {
      view.clear();
      const st = K.stateAt(ev, tl, S.t);
      K.drawFrame(view);
      K.clock(view, 'צעצוע: תגובה בחצי מהאירועים');
      const only = S.show.sec ? null : new Set([1]);
      K.drawTracks(view, ev, st, { highlight: true, points: S.show.points, boundary: S.show.boundary, only });
      view.line(-9.5, -15.2, 45.5, -15.2, { color: 'grid', width: 1 });
      view.text(-9.5, -16.6, 'עץ האירוע', { size: 11, weight: 700, color: PHY.colors.muted, align: 'left' });
      K.drawTree(view, ev, st, { y0: -20.5, dy: 8 });
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); build(); S.t = tl.T; paint(); loop.requestRender(); },
      play() {
        tw.clear();
        S.t = 0; loop.start();
        const T = tl.T;
        return tw.run(T, (k) => { S.t = T * k; paint(); loop.requestRender(); });
      },
      setParam(key, v) {
        if (key === 'seed' || key === 'E' || key === 'pReact') { opts[key] = v; build(); S.t = tl.T; paint(); }
        if (key in S.show) S.show[key] = v;
        loop.requestRender();
      },
      getState() {
        return {
          seed: opts.seed, E: opts.E, tracks: ev.tracks.length, steps: ev.nSteps, boundary: boundary(), order: ev.order.slice(),
          particles: ev.tracks.map((t) => t.p),
          signature: ev.tracks.map((t) => t.id + ':' + t.parent + ':' + t.p + ':' + t.spec.procs.join('/') + ':' + t.spec.pts.map((p) => p.x.toFixed(3) + ',' + p.y.toFixed(3)).join(';')).join('|'),
          lifoOk: checkLifo(),
        };
      },
    };
    /* every secondary is transported after its parent, and the next track is always the newest on the stack */
    function checkLifo() {
      const stack = [];
      for (const e of ev.seq) {
        if (e.cb === 'push') e.ids.forEach((id) => stack.push(id));
        if (e.cb === 'pop') { const top = stack.pop(); if (top !== e.id) return false; }
      }
      return ev.tracks.every((t) => !t.parent || ev.order.indexOf(t.parent) < ev.order.indexOf(t.id));
    }
    build();
    S.t = tl.T;
    paint();
    return api;
  };
})();
