/* PHY.sims.mcDarts: π by darts, an integral by sampling. Darts land uniformly in the unit square
   (x, y from opts.rng-like seeded PHY.random); the fraction inside the quarter circle x² + y² ≤ 1 estimates
   its area π/4, so π ≈ 4·inside/N, with the binomial error 4·√(f(1 − f)/N). Up to 3000 darts are drawn; the
   count goes on to N. play(seconds) throws N darts one by one; before it the square is empty and the
   readouts show "?". After the reveal: an N slider (10² to 10⁶) and "throw again" (a new seed).
   opts: {N, seed, locked, chapter, section}. getState(): {N, inside, pi, err, shown}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, K = PHY.ch01;
  const DRAW = 3000;

  PHY.sims.mcDarts = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 1000, seed: 5, locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -0.08, xMax: 1.08, yMin: -0.1, yMax: 1.1 }, aspect: 1.15, minHeight: 260, maxHeight: 420 });
    const tw = PHY.tweens();
    const S = { xs: null, ys: null, inside: 0, shown: 0, ran: !opts.locked, seed: opts.seed };

    function throwAll(seed) {
      const r = PHY.random(seed).next;
      const n = opts.N, m = Math.min(n, DRAW);
      S.xs = new Float64Array(m); S.ys = new Float64Array(m);
      S.cum = new Int32Array(m + 1);
      let inside = 0;
      for (let i = 0; i < n; i++) {
        const x = r(), y = r();
        const hit = x * x + y * y <= 1;
        if (hit) inside++;
        if (i < m) { S.xs[i] = x; S.ys[i] = y; S.cum[i + 1] = inside; }
      }
      S.inside = inside;
    }
    function result(n) {
      const m = Math.min(opts.N, DRAW);
      const ins = n >= opts.N ? S.inside : S.cum[Math.min(n, m)];
      const f = n ? ins / n : 0;
      return { n, inside: ins, pi: 4 * f, err: n ? 4 * Math.sqrt((f * (1 - f)) / n) : 0 };
    }

    let readouts = null, slider = null, again = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'n', label: 'חיצים' },
        { key: 'in', label: 'בתוך רבע העיגול' },
        { key: 'pi', label: 'π משוער ± שגיאה', color: 'var(--accent)' },
      ]);
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      slider = U.Slider(grid, { label: 'מספר החיצים \\(N\\)', min: 2, max: 6, step: 0.5, value: Math.log10(opts.N), format: (v) => F.num(Math.round(Math.pow(10, v)), 0), color: 'var(--accent)', onInput: (v) => { opts.N = Math.round(Math.pow(10, v)); throwAll(S.seed); S.shown = opts.N; paint(); loop.requestRender(); mark(); } });
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      again = U.Button(row, 'לזרוק שוב', () => { S.seed += 1; api.play(1.5); mark(); }, {});
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };

    function paint() {
      if (!readouts) return;
      const r = result(S.shown);
      readouts.set('n', S.ran ? F.num(r.n, 0) : '?');
      readouts.set('in', S.ran ? F.num(r.inside, 0) : '?');
      readouts.set('pi', S.ran && r.n ? F.ltr(F.num(r.pi, 3) + ' ± ' + F.num(r.err, r.err < 0.01 ? 4 : 3)) : '?');
    }
    function lock(on) { opts.locked = on; if (slider) slider.setEnabled(!on); if (again) again.disabled = on; }

    function render() {
      view.clear();
      const ctx = view.ctx;
      view.poly([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], { close: true, color: 'axis', width: 1.6 });
      ctx.save();
      ctx.globalAlpha = 0.1; ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.moveTo(view.sx(0), view.sy(0)); ctx.arc(view.sx(0), view.sy(0), view.scale, -Math.PI / 2, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(view.sx(0), view.sy(0), view.scale, -Math.PI / 2, 0); ctx.stroke(); ctx.restore();
      const m = Math.min(S.shown, S.xs ? S.xs.length : 0);
      const r = m > 1500 ? 1.5 : 2.4;
      ctx.save();
      for (let i = 0; i < m; i++) {
        const x = S.xs[i], y = S.ys[i];
        ctx.fillStyle = x * x + y * y <= 1 ? C.accent : C.muted;
        ctx.beginPath(); ctx.arc(view.sx(x), view.sy(y), r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      view.text(0, -0.05, '0', { size: 11, color: C.muted });
      view.text(1, -0.05, '1', { size: 11, color: C.muted });
      view.text(-0.04, 1, '1', { size: 11, color: C.muted });
      if (!S.ran) K.mark(view, view.sx(0.5), view.sy(0.5));
      else if (S.shown >= opts.N) K.clock(view, F.ltr('π ≈ ' + F.num(result(S.shown).pi, 3)));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true;
        throwAll(S.seed);
        S.shown = 0;
        paint();
        loop.start();
        return tw.run(seconds || 3, function (k) {
          S.shown = Math.floor(opts.N * k);
          if (k >= 1) { S.shown = opts.N; lock(false); }
          paint();
          loop.requestRender();
        });
      },
      setParam(key, v) {
        if (key === 'locked') lock(v);
        else { opts[key] = v; if (key === 'seed') S.seed = v; throwAll(S.seed); S.shown = opts.N; S.ran = true; if (key === 'N' && slider) slider.set(Math.log10(v)); }
        paint();
        loop.requestRender();
      },
      getState() { const r = result(S.shown); return { N: opts.N, shown: S.shown, inside: r.inside, pi: r.pi, err: r.err }; },
    };
    throwAll(S.seed);
    lock(opts.locked);
    paint();
    return api;
  };
})();
