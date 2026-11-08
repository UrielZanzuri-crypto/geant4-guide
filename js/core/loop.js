/* PHY.SimLoop: fixed-timestep physics (dt = 1/120 s) with requestAnimationFrame rendering.
   An IntersectionObserver pauses anything offscreen. A stopped loop still repaints on demand
   (requestRender), on resize and on theme change.

   const loop = PHY.SimLoop({view, step(dt, t), render(t)});   // view from PHY.canvas.create or plot.view
   loop.start(); loop.stop(); loop.requestRender(); loop.time; loop.running; loop.resetClock();

   PHY.tweens(): scripted animation driven by step(dt), so it pauses with the sim when it is offscreen.
     const tw = PHY.tweens();  in step(dt): tw.step(dt);
     await tw.run(1.5, (k) => { S.x = lerp(a, b, PHY.ease.inOut(k)); });   // k goes 0..1 over 1.5 s
     await tw.wait(0.5);  tw.clear() resolves everything pending (a cancelled await never hangs);  tw.busy
   PHY.ease: linear, inOut, out, in.
   PHY.random(seed?): {next() in [0, 1), range(a, b), int(a, b), pick(list), shuffle(list)}. A seed makes it
     repeatable (tests); without one it uses Math.random. Games take opts.rng = PHY.random(seed).next. */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});
  PHY.sims = PHY.sims || {};
  const FIXED_DT = 1 / 120;
  const MAX_FRAME = 0.1;

  PHY.SimLoop = function (o) {
    const step = o.step || function () {};
    const render = o.render || function () {};
    const canvas = o.canvas || (o.view && o.view.canvas);
    let started = false;
    let visible = false;
    let rafId = 0;
    let last = 0;
    let acc = 0;
    let dirty = true;

    const api = {
      time: 0,
      get running() { return started; },
      get visible() { return visible; },
      start() { started = true; last = 0; kick(); },
      stop() { started = false; },
      requestRender() { dirty = true; kick(); },
      resetClock() { api.time = 0; acc = 0; },
    };

    function kick() {
      if (!rafId && visible && (started || dirty)) rafId = requestAnimationFrame(frame);
    }

    function frame(now) {
      rafId = 0;
      if (started && visible) {
        if (!last) last = now;
        acc += Math.min((now - last) / 1000, MAX_FRAME);
        last = now;
        while (acc >= FIXED_DT) {
          step(FIXED_DT, api.time);
          api.time += FIXED_DT;
          acc -= FIXED_DT;
        }
      } else {
        last = 0;
      }
      if (visible) {
        render(api.time);
        dirty = false;
      }
      kick();
    }

    if ('IntersectionObserver' in window && canvas) {
      new IntersectionObserver(
        function (entries) {
          visible = entries[entries.length - 1].isIntersecting;
          last = 0;
          if (visible) { dirty = true; kick(); }
        },
        { rootMargin: '80px' }
      ).observe(canvas);
    } else {
      visible = true;
    }

    if (o.view) o.view.onResize(api.requestRender);
    document.addEventListener('phy:theme', api.requestRender);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(api.requestRender);
    return api;
  };
})();

/* Step-driven tweens, easing and a small seedable random source. */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});

  PHY.tweens = function () {
    let list = [];
    const api = {
      step(dt) {
        if (!list.length) return;
        list.slice().forEach(function (w) {
          w.t += dt;
          const k = Math.min(w.t / w.T, 1);
          if (w.fn) w.fn(k, dt);
          if (k >= 1) {
            const i = list.indexOf(w);
            if (i >= 0) list.splice(i, 1);
            w.resolve();
          }
        });
      },
      run(T, fn) { return new Promise(function (resolve) { list.push({ t: 0, T: Math.max(T, 1e-6), fn: fn, resolve: resolve }); }); },
      wait(T) { return api.run(T, null); },
      clear() { const old = list; list = []; old.forEach(function (w) { w.resolve(); }); },
      get busy() { return list.length > 0; },
    };
    return api;
  };

  PHY.ease = {
    linear: (k) => k,
    inOut: (k) => k * k * (3 - 2 * k),
    out: (k) => 1 - (1 - k) * (1 - k),
    in: (k) => k * k,
  };

  PHY.random = function (seed) {
    let x = seed === undefined ? null : seed >>> 0;
    if (x !== null) { // scramble: neighbouring seeds (s, s+1, ...) must not give nearly the same first draw
      x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = (x ^ (x >>> 16)) >>> 0;
    }
    const next = x === null ? Math.random : function () { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
    const api = {
      next: next,
      range: (a, b) => a + (b - a) * next(),
      int: (a, b) => a + Math.floor(next() * (b - a + 1)),
      pick: (list) => list[Math.floor(next() * list.length)],
      shuffle(list) {
        const b = list.slice();
        for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
        return b;
      },
    };
    return api;
  };
})();
