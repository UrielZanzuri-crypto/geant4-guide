/* PHY.sims.srcCone: directions inside the cone, the right way and the wrong way, seen on the front face of
   the converter (a disc of radius 22 mm at 45 mm; the cone of half-angle θmax reaches 45·tan θmax).
   Left: cos θ uniform in [cos θmax, 1] and φ uniform (ldns, uniform in solid angle). Right: θ uniform in
   [0, θmax] (the wrong way, it piles directions near the axis). Each dot is a hit at r = 45 tan θ.
   Readouts: the share inside half the angle (θ < θmax/2) for both, and N_shot = 2π(1 − cos θmax)∫f dE.
   Before the run the discs are empty. After the reveal a slider sets θmax.
   opts: {N, deg, seed, locked, chapter, section}. getState(): {deg, inner: {cos, theta}, nShot, rCone, hits}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, K = PHY.ch01, K5 = PHY.ch05;
  const D = 45, R = 22;

  PHY.sims.srcCone = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 1500, deg: 20, seed: 8, locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -26, xMax: 76, yMin: -30, yMax: 31 }, aspect: 1.55, minHeight: 240, maxHeight: 400 });
    const tw = PHY.tweens();
    const S = { u: [], phi: [], shown: 0, ran: false };
    (function () {
      const r = PHY.random(opts.seed);
      for (let i = 0; i < 4000; i++) { S.u.push(r.next()); S.phi.push(2 * Math.PI * r.next()); }
    })();

    const cosOf = (i, which) => (which === 'cos' ? K5.cosUniform(S.u[i], opts.deg) : K5.thetaUniform(S.u[i], opts.deg));
    function inner(which, n) {
      const c = Math.cos((opts.deg * Math.PI) / 360);
      let k = 0;
      for (let i = 0; i < n; i++) if (cosOf(i, which) > c) k++;
      return n ? k / n : NaN;
    }

    let readouts = null, slider = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'a', label: 'בחצי הזווית, cos θ אחיד', color: 'var(--c-proton)' },
        { key: 'b', label: 'בחצי הזווית, θ אחיד', color: 'var(--c-proton)' },
        { key: 'n', label: 'פרוטונים לירייה, ב-' + F.ltr('10¹¹') },
      ]);
      slider = U.Slider(controlsEl, { label: 'חצי זווית הקונוס', min: 5, max: 30, step: 0.5, value: opts.deg, format: (v) => F.deg(v, 1), color: 'var(--c-proton)', onInput: (v) => { opts.deg = v; S.ran = true; S.shown = opts.N; paint(); loop.requestRender(); mark(); } });
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function paint() {
      if (!readouts) return;
      const done = S.ran && S.shown >= opts.N;
      readouts.set('a', done ? F.unit(100 * inner('cos', opts.N), '%', 0) : '?');
      readouts.set('b', done ? F.unit(100 * inner('theta', opts.N), '%', 0) : '?');
      readouts.set('n', F.num(K5.nShot(1.85, 13, opts.deg) / 1e11, 2));
    }
    function disc(cx, title, which) {
      const ctx = view.ctx;
      const rc = D * Math.tan((opts.deg * Math.PI) / 180);
      ctx.save(); ctx.fillStyle = C.volume; ctx.globalAlpha = 0.07;
      ctx.beginPath(); ctx.arc(view.sx(cx), view.sy(0), R * view.scale, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      view.circle(cx, 0, R, { color: 'volume', width: 2 });
      view.circle(cx, 0, Math.min(rc, 29), { color: 'muted', width: 1.2, dash: [5, 4] });
      view.text(cx, 26.5, title, { size: 12, weight: 700, color: C.ink });
      const n = S.ran ? S.shown : 0;
      ctx.save(); ctx.fillStyle = C.proton; ctx.globalAlpha = 0.6;
      for (let i = 0; i < n; i++) {
        const c = cosOf(i, which), t = Math.sqrt(Math.max(0, 1 - c * c)) / c;
        const r = D * t;
        ctx.beginPath(); ctx.arc(view.sx(cx + r * Math.cos(S.phi[i])), view.sy(r * Math.sin(S.phi[i])), 1.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (!S.ran) K.mark(view, view.sx(cx), view.sy(0));
    }
    function render() {
      view.clear();
      disc(50, F.ltr('cos θ') + ' אחיד', 'cos');
      disc(0, F.ltr('θ') + ' אחיד', 'theta');
      view.text(25, -27.5, 'הפאה הקדמית, ' + F.unit(45, 'mm', 0) + ' מהמקור', { size: 11, color: C.muted });
      K.clock(view, 'קונוס של ' + F.deg(opts.deg, 1));
    }
    function lock(on) { opts.locked = on; if (slider) slider.setEnabled(!on); }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.shown = 0;
        paint(); loop.start();
        return tw.run(seconds || 3, function (k) {
          S.shown = Math.floor(opts.N * k);
          if (k >= 1) { S.shown = opts.N; lock(false); }
          paint(); loop.requestRender();
        });
      },
      setParam(k, v) { opts[k] = v; if (k === 'deg' && slider) slider.set(v); if (k === 'locked') lock(v); S.ran = true; S.shown = opts.N; paint(); loop.requestRender(); },
      getState() {
        const n = S.ran ? S.shown : 0;
        const hits = [];
        for (let i = 0; i < n; i++) { const c = cosOf(i, 'cos'); hits.push(D * Math.sqrt(1 - c * c) / c); }
        return { deg: opts.deg, inner: { cos: inner('cos', opts.N), theta: inner('theta', opts.N) }, nShot: K5.nShot(1.85, 13, opts.deg), rCone: D * Math.tan((opts.deg * Math.PI) / 180), hits, N: opts.N, done: S.ran && S.shown >= opts.N };
      },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
