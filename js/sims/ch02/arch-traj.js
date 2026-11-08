/* PHY.sims.archTraj: trap 2, "the track is the line on the screen". The neutron of the chapter's event
   (PHY.ch02.EV1, track 2) is transported step by step: the G4Track object holds the current state (its
   position, kinetic energy, the step number) and changes at every step. When the vis system is on, Geant4
   also keeps a trajectory: a separate record with the particle, its IDs and one point per step end
   (/vis/scene/add/trajectories smooth in ldns vis.mac). When the track ends, the G4Track object is deleted;
   the trajectory stays with the event, and the viewer draws it at the end of the event.
   The canvas: the live track is the moving dot; the stored points are hollow rings; the line appears
   only at the end of the event. Readouts: does the G4Track exist, how many points the trajectory holds,
   what is on the screen. play(seconds) runs it; before it the readouts show "?".
   opts: {locked}. getState(): {points, trackAlive, drawn, steps}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;

  PHY.sims.archTraj = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -10.5, xMax: 46.5, yMin: -15, yMax: 15.5 }, aspect: 1.75, minHeight: 200, maxHeight: 340 });
    const tw = PHY.tweens();
    const n = K.EV1.kids[10][0];   /* the neutron: hadElastic, out of Be, out of the World */
    const steps = n.procs.length;
    const S = { ran: false, k: 0, f: 0, ended: false, drawn: 0 };

    let R = null;
    if (controlsEl) R = U.Readouts(controlsEl, [
      { key: 'track', label: 'אובייקט G4Track של הנייטרון' },
      { key: 'pts', label: 'נקודות שנשמרו ב-trajectory', color: 'var(--c-neutron)' },
      { key: 'screen', label: 'מה מצויר על המסך' },
    ]);
    function paint() {
      if (!R) return;
      if (!S.ran) { R.set('track', '?'); R.set('pts', '?'); R.set('screen', '?'); return; }
      R.set('track', S.ended ? 'נמחק' : 'קיים, צעד ' + Math.min(steps, S.k + 1));
      R.set('pts', F.num(1 + S.k, 0));
      R.set('screen', S.drawn > 0 ? 'הקו, בסוף האירוע' : 'עוד כלום');
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      K.drawFrame(view);
      K.clock(view, 'סכמטי');
      const pts = n.pts;
      if (!S.ran) { view.circle(pts[0].x, pts[0].y, 5, { px: true, fill: C.neutron }); K.mark(view, view.sx(30), view.sy(-4)); return; }
      /* the stored points */
      for (let i = 0; i <= S.k; i++) view.circle(pts[i].x, pts[i].y, 4.5, { px: true, color: C.neutron, width: 2, fill: C.bg });
      /* the line, drawn at the end of the event */
      if (S.drawn > 0) view.poly(pts, { color: 'neutron', width: 2.6, alpha: Math.min(1, S.drawn) });
      /* the live track */
      if (!S.ended) {
        const a = pts[S.k], b = pts[Math.min(S.k + 1, pts.length - 1)];
        const x = a.x + (b.x - a.x) * S.f, y = a.y + (b.y - a.y) * S.f;
        view.circle(x, y, 6.5, { px: true, fill: C.neutron });
        view.text(x, y + 2.6, 'G4Track', { size: 10.5, weight: 700, color: C.neutron, halo: true });
      }
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.k = 0; S.f = 0; S.ended = false; S.drawn = 0; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.k = 0; S.f = 0; S.ended = false; S.drawn = 0; loop.start();
        const sec = seconds || 4.5;
        let chain = Promise.resolve();
        for (let i = 0; i < steps; i++) {
          chain = chain.then(() => tw.run(sec * 0.22, (f) => { S.f = f; if (f >= 1) { S.k = i + 1; S.f = 0; if (i === steps - 1) S.ended = true; } paint(); loop.requestRender(); }));
        }
        return chain.then(() => tw.wait(sec * 0.08)).then(() => tw.run(sec * 0.26, (f) => { S.drawn = f; paint(); loop.requestRender(); }))
          .then(() => { opts.locked = false; });
      },
      setParam() {},
      getState() { return { ran: S.ran, points: S.ran ? 1 + S.k : 0, trackAlive: S.ran && !S.ended, drawn: S.drawn, steps }; },
    };
    paint();
    return api;
  };
})();
