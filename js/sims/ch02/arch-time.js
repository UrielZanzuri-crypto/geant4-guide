/* PHY.sims.archTime: trap 3, "Geant4 advances in time steps". Two neutrons leave the back face of the Be
   converter (z = 47 mm) along the axis, at 1 MeV and at 10 MeV, and cross the vacuum World to its edge at
   z = 1000 mm (ldns builds a World at least 1 m in each direction). In vacuum no process proposes a
   length shorter than the distance to the World's wall, so each neutron makes one step; the time of the
   post-step point is computed from the length and the speed: t = L / v, with v from the kinetic energy
   (m_n = 939.565 MeV, c = 299.792 mm/ns).
   The animation runs both on a common clock (the slow one takes longer); before play the readouts show
   "?". opts: {locked}. getState(): {steps: [1, 1], tof: [ns, ns], v: [mm/ns, mm/ns]}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;
  const MN = 939.565, CMM = 299.792458;
  const Z0 = 47, Z1 = 1000;
  const speed = (T) => CMM * Math.sqrt(1 - Math.pow(MN / (MN + T), 2));

  PHY.sims.archTime = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -40, xMax: 1040, yMin: 0, yMax: 520 }, aspect: 2.1, minHeight: 170, maxHeight: 300 });
    const tw = PHY.tweens();
    const NS = [{ T: 1, y: 330 }, { T: 10, y: 150 }].map((n) => Object.assign(n, { v: speed(n.T), tof: (Z1 - Z0) / speed(n.T) }));
    const S = { ran: false, t: 0 };
    const tMax = Math.max(NS[0].tof, NS[1].tof);

    let R = null;
    if (controlsEl) R = U.Readouts(controlsEl, [
      { key: 'st', label: 'צעדים בוואקום, לכל אחד' },
      { key: 't1', label: 'זמן הטיסה, 1 MeV', color: 'var(--c-neutron)' },
      { key: 't10', label: 'זמן הטיסה, 10 MeV', color: 'var(--c-neutron)' },
    ]);
    function paint() {
      if (!R) return;
      const done = S.ran && S.t >= tMax - 1e-9;
      R.set('st', done ? '1' : '?');
      R.set('t1', done ? F.unit(NS[0].tof, 'ns', 1) : '?');
      R.set('t10', done ? F.unit(NS[1].tof, 'ns', 1) : '?');
    }

    function render() {
      view.clear();
      const C = PHY.colors, ctx = view.ctx;
      /* the converter's back face and the World wall */
      ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = C.volume;
      ctx.fillRect(view.sx(0), view.sy(470), Z0 * view.scale, 440 * view.scale);
      ctx.restore();
      view.line(Z0, 30, Z0, 470, { color: 'volume', width: 2 });
      view.text(Z0 / 2, 490, 'Be', { size: 11, weight: 700, color: C.volume });
      view.line(Z1, 30, Z1, 470, { color: 'gridStrong', width: 2, dash: [6, 4] });
      view.text(Z1, 490, 'קצה העולם', { size: 11, weight: 700, color: C.muted, align: 'right' });
      view.text(Z0 + 10, 12, 'z = ' + F.unit(Z0, 'mm', 0), { size: 10, color: C.muted, align: 'left' });
      view.text(Z1, 12, 'z = ' + F.unit(Z1, 'mm', 0), { size: 10, color: C.muted, align: 'right' });
      NS.forEach(function (n) {
        view.line(Z0, n.y, Z1, n.y, { color: 'grid', width: 1, dash: [3, 4] });
        view.text(Z0 + 8, n.y + 40, F.unit(n.T, 'MeV', 0), { size: 11, weight: 700, color: C.neutron, align: 'left' });
        view.circle(Z0, n.y, 4, { px: true, fill: C.neutron });
        if (!S.ran) return;
        const z = Math.min(Z1, Z0 + n.v * S.t);
        view.line(Z0, n.y, z, n.y, { color: 'neutron', width: 2.4 });
        view.circle(z, n.y, 6, { px: true, fill: C.neutron });
        if (z >= Z1 - 1e-6) {
          view.circle(Z1, n.y, 6.5, { px: true, color: C.volume, width: 2.4, fill: C.bg });
          view.text((Z0 + Z1) / 2, n.y - 40, 'צעד אחד, ' + F.unit(n.tof, 'ns', 1), { size: 11, weight: 700, color: C.ink });
        }
      });
      if (!S.ran) K.mark(view, view.sx(520), view.sy(240));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.t = 0; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.t = 0; loop.start();
        return tw.run(seconds || 4, (k) => { S.t = tMax * k; paint(); loop.requestRender(); }).then(() => { opts.locked = false; });
      },
      setParam() {},
      getState() { return { ran: S.ran, steps: [1, 1], tof: NS.map((n) => n.tof), v: NS.map((n) => n.v), path: Z1 - Z0 }; },
    };
    paint();
    return api;
  };
})();
