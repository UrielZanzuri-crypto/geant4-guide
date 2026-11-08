/* PHY.sims.srcGun: G4ParticleGun fires one proton per event, as PrimaryGeneratorAction does in ldns: the
   energy from the source (flat between 1.85 and 13 MeV with its weight, or analog), cos θ uniform inside the
   20° cone, φ uniform, position (0, 0, 0). Side view (z to the right, x up, mm): the source, the cone, the
   Be disc (radius 22 mm, front face at z = 45 mm, 2 mm thick). Every event is one red track; the last one is
   labelled with E, θ and w. Before the run there are no tracks and the readouts are "?".
   play(seconds) fires `events` events one after the other; fire() fires one more.
   opts: {events, sampling, seed, locked, chapter, section}. getState(): {fired: [{E, theta, w, x}], nEvents}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, K = PHY.ch01, K5 = PHY.ch05;

  PHY.sims.srcGun = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ events: 8, sampling: 'flat', seed: 77, locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -6, xMax: 56, yMin: -27, yMax: 31 }, aspect: 1.15, minHeight: 300, maxHeight: 460 });
    const tw = PHY.tweens();
    const rng = PHY.random(opts.seed);
    const tab = K5.table(1.85, 13);
    const S = { fired: [], anim: 1 };

    function shoot() {
      const E = opts.sampling === 'flat' ? 1.85 + rng.next() * 11.15 : K5.sampleAnalog(tab, rng.next());
      const w = opts.sampling === 'flat' ? K5.weightFlat(tab, E) : 1;
      const c = K5.cosUniform(rng.next(), 20);
      const th = Math.acos(c), phi = 2 * Math.PI * rng.next();
      const ev = { E, w, theta: (th * 180) / Math.PI, x: 45 * Math.tan(th) * Math.cos(phi) };
      S.fired.push(ev);
      return ev;
    }

    let readouts = null, btn = null, choice = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'n', label: 'אירועים' },
        { key: 'E', label: 'האנרגיה (MeV)', color: 'var(--c-proton)' },
        { key: 't', label: 'הזווית θ (מעלות)' },
        { key: 'w', label: 'המשקל w' },
      ]);
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      choice = U.Choice(row, { label: 'דגימה', options: [{ value: 'flat', text: '<bdi>flat</bdi>' }, { value: 'analog', text: '<bdi>analog</bdi>' }], value: opts.sampling, onChange: (v) => { opts.sampling = v; mark(); } });
      btn = U.Button(row, 'עוד אירוע', () => { api.fire(); mark(); }, { primary: true });
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function paint() {
      if (!readouts) return;
      const ev = S.fired[S.fired.length - 1];
      readouts.set('n', F.num(S.fired.length, 0));
      readouts.set('E', ev ? F.num(ev.E, 2) : '?');
      readouts.set('t', ev ? F.num(ev.theta, 1) : '?');
      readouts.set('w', ev ? F.num(ev.w, 3) : '?');
    }

    function render() {
      view.clear();
      const ctx = view.ctx;
      /* axis and cone */
      view.line(-4, 0, 54, 0, { color: 'gridStrong', width: 1, dash: [3, 4] });
      const tn = Math.tan((20 * Math.PI) / 180);
      view.line(0, 0, 52, 52 * tn, { color: 'muted', width: 1.2, dash: [6, 4] });
      view.line(0, 0, 52, -52 * tn, { color: 'muted', width: 1.2, dash: [6, 4] });
      view.arc(0, 0, 36, 0, 20, { color: 'muted', width: 1.4 });
      view.text(9.5, 2.0, F.deg(20), { size: 11.5, color: C.muted, weight: 700 });
      /* the Be disc */
      ctx.save(); ctx.fillStyle = C.volume; ctx.globalAlpha = 0.14;
      ctx.fillRect(view.sx(45), view.sy(22), view.sx(47) - view.sx(45), view.sy(-22) - view.sy(22)); ctx.restore();
      view.poly([{ x: 45, y: 22 }, { x: 47, y: 22 }, { x: 47, y: -22 }, { x: 45, y: -22 }], { color: 'volume', width: 2, close: true });
      view.text(46, 24.5, 'Be', { size: 12, weight: 700, color: C.volume });
      view.text(46, -25, F.unit(45, 'mm', 0), { size: 11, color: C.muted });
      /* the source */
      view.circle(0, 0, 5, { px: true, fill: 'ink' });
      view.text(0, -4, 'מקור', { size: 11, color: C.muted, offset: [0, 6] });
      /* events */
      const n = S.fired.length;
      for (let i = 0; i < n; i++) {
        const ev = S.fired[i];
        const last = i === n - 1;
        const k = last ? S.anim : 1;
        const zEnd = 45 + 0.6 * Math.min(1, ev.E / 13);
        const z = zEnd * k, x = (ev.x / 45) * z;
        view.line(0, 0, z, x, { color: 'proton', width: last ? 2.6 : 1.4, alpha: last ? 1 : 0.4 });
        if (last && k >= 1) {
          const lab = F.ltr(F.num(ev.E, 1) + ' MeV, θ = ' + F.num(ev.theta, 0) + '°, w = ' + F.num(ev.w, 2));
          view.screenText(view.sx(22), view.sy(x / 2 + (x >= 0 ? 7 : -7)), lab, { size: 11.5, weight: 700, color: C.proton, halo: true });
        }
      }
      if (!n) K.mark(view, view.sx(24), view.sy(0));
      K.clock(view, 'אירוע ' + F.ltr(F.num(n, 0)) + ': פרוטון אחד');
    }

    function lock(on) { opts.locked = on; if (btn) btn.disabled = on; if (choice) choice.setEnabled(!on); }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.fired = []; paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.fired = [];
        paint(); loop.start();
        const T = (seconds || 4) / opts.events;
        let chain = Promise.resolve();
        for (let i = 0; i < opts.events; i++) {
          chain = chain.then(() => { shoot(); S.anim = 0; paint(); return tw.run(T, (k) => { S.anim = Math.min(1, k * 1.6); loop.requestRender(); }); });
        }
        return chain.then(() => { lock(false); paint(); loop.requestRender(); });
      },
      fire() { const ev = shoot(); S.anim = 1; paint(); loop.requestRender(); return ev; },
      setParam(k, v) { opts[k] = v; if (k === 'sampling' && choice) choice.set(v); if (k === 'locked') lock(v); loop.requestRender(); },
      getState() { return { fired: S.fired.map((e) => Object.assign({}, e)), nEvents: S.fired.length }; },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
