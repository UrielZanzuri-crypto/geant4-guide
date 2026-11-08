/* PHY.sims.visTally: the same run as a picture and as a tally. N protons of the flat source from 1.85 MeV
   (the source of the Be 2 mm run) fire into the disc; each makes a neutron trajectory with probability
   P_FLAT = 6126 / 3e6 (the rows of `leak` per proton in that run), and each neutron carries a weight. The
   weights here are schematic: exponential with the mean of the real rows, W_MEAN = 0.219. The picture
   (top) draws every trajectory alike. The tally (bottom) compares the count per proton, what a picture
   suggests, with the sum of weights per proton, what ldns prints: 6126 / 3e6 against 4.47e-4.
   Before play() the picture is empty and the bars hidden. opts: {N, seed, locked, chapter, section}.
   getState(): {N, count, sumW, perCount, perWeight}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch07, PL = PHY.plot;

  PHY.sims.visTally = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 150000, seed: 5, locked: true }, opts || {});
    const top = PL.create(canvasEl, { rect: { x: 0, y: 0, w: 1, h: 0.58 }, x: [0, 1], y: [0, 1], margin: { l: 8, r: 8, t: 30, b: 4 }, aspect: 1.05, minHeight: 320, maxHeight: 560 });
    const view = top.view;
    const bot = PL.panel(view, { rect: { x: 0, y: 0.58, w: 1, h: 0.42 }, x: [0, 3], y: [0, 25], yLabel: 'לפרוטון', yUnit: '×10⁻⁴', margin: { l: 58, r: 14, t: 18, b: 34 } });
    const C = PHY.colors;
    const tw = PHY.tweens();
    const cam = K.camera([-1, 0, 0]);
    const S = { events: 0, tracks: [], count: 0, sumW: 0, ran: false, rng: null, done: false };
    const filter = new Set(['neutron']);
    function begin() { S.rng = PHY.random(opts.seed).next; S.events = 0; S.tracks = []; S.count = 0; S.sumW = 0; S.done = false; }
    function advance(n) {
      for (let i = 0; i < n; i++) {
        S.events++;
        if (S.rng() < K.P_FLAT) {
          const p = K.protonTrack(S.rng, { mode: 'flat', Emin: 1.85 });
          const t = K.neutronTrack(S.rng, p);
          t.w = -K.W_MEAN * Math.log(1 - S.rng());
          S.tracks.push(t);
          S.count++;
          S.sumW += t.w;
        }
      }
    }
    let ro = null, againB = null;
    if (controlsEl) {
      ro = U.Readouts(controlsEl, [{ key: 'n', label: 'מסלולי נייטרונים בתמונה', color: 'var(--c-neutron)' }, { key: 'w', label: 'סכום המשקלים שלהם' }, { key: 'c', label: 'מסלולים לפרוטון, ביחידות <span dir="ltr">×10⁻⁴</span>' }, { key: 'y', label: 'התפוקה לפרוטון, ביחידות <span dir="ltr">×10⁻⁴</span>' }]);
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      againB = U.Button(row, 'ריצה אחרת', function () { opts.seed += 1; api.play(3); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }, {});
    }
    function lock(on) { opts.locked = on; if (againB) againB.disabled = on; }
    function paint() {
      if (!ro) return;
      ro.set('n', S.ran ? F.num(S.count, 0) : '?');
      ro.set('w', S.done ? F.num(S.sumW, 0) : '?');
      ro.set('c', S.done ? F.num((1e4 * S.count) / S.events, 1) : '?');
      ro.set('y', S.done ? F.num((1e4 * S.sumW) / S.events, 2) : '?');
    }
    function render() {
      view.clear();
      /* the picture: the scene in the top panel's box */
      const b = top.box;
      const vw = view.visible;
      const sx = (vw.xMax - vw.xMin) / view.w, sy = (vw.yMax - vw.yMin) / view.h;
      const ctx = view.ctx;
      ctx.save();
      ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
      /* map the scene to the top box with a temporary world */
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const scale = Math.min(b.w / 100, b.h / 62);
      const fake = Object.create(view);
      fake.sx = (x) => cx + x * scale;
      fake.sy = (y) => cy - y * scale;
      K.drawScene(fake, cam, { zoom: 1.2, center: [0, 0, 30], style: 'wireframe', aux: false, axes: false, t: 2, tracks: S.tracks, filter, thin: true, trackAlpha: 0.75 });
      ctx.restore();
      void sx; void sy;
      view.screenText(10, 16, 'התמונה: רק נייטרונים', { size: 11.5, weight: 600, align: 'left', color: C.muted, pill: true });
      if (!S.ran) view.screenText(cx, cy, '?', { size: 34, weight: 800, color: C.muted, halo: true });
      /* the tally: our own axis, since the x positions are two categories */
      const bb = bot.box;
      [0, 5, 10, 15, 20, 25].forEach(function (v) {
        view.screenText(bb.x - 6, bot.Y(v), F.num(v, 0), { size: 11, color: C.muted, align: 'right' });
        ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bb.x, Math.round(bot.Y(v)) + 0.5); ctx.lineTo(bb.x + bb.w, Math.round(bot.Y(v)) + 0.5); ctx.stroke(); ctx.restore();
      });
      ctx.save(); ctx.strokeStyle = C.axis; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bb.x, bot.Y(0)); ctx.lineTo(bb.x + bb.w, bot.Y(0)); ctx.moveTo(bb.x, bot.Y(0)); ctx.lineTo(bb.x, bb.y); ctx.stroke(); ctx.restore();
      view.screenText(bb.x - 6, bb.y - 9, '×10⁻⁴', { size: 11, weight: 600, color: C.ink, align: 'left' });
      view.screenText(bb.x + 44, bb.y - 9, 'לכל פרוטון', { size: 11, weight: 600, color: C.ink, align: 'left' });
      if (S.done) {
        const per = [(1e4 * S.count) / S.events, (1e4 * S.sumW) / S.events];
        const cols = [C.muted, C.neutron];
        per.forEach(function (v, i) {
          const x0 = bot.X(0.35 + i * 1.4), x1 = bot.X(1.25 + i * 1.4), y = bot.Y(Math.min(v, 25)), y0 = bot.Y(0);
          ctx.save(); ctx.fillStyle = cols[i]; ctx.globalAlpha = 0.65; ctx.fillRect(x0, y, x1 - x0, y0 - y); ctx.restore();
          view.screenText((x0 + x1) / 2, y - 9, F.num(v, i ? 2 : 1), { size: 12, weight: 700, color: C.ink });
        });
        bot.hline(4.47, { color: 'good', dash: [5, 4] });
        view.screenText(bot.X(0.8), bot.Y(0) + 14, 'מסלולים / N', { size: 11, weight: 600, color: C.ink });
        view.screenText(bot.X(2.2), bot.Y(0) + 14, F.ltr('Σw') + ' / N', { size: 11, weight: 600, color: C.ink });
      } else view.screenText(bot.X(1.5), bot.Y(12), '?', { size: 28, weight: 800, color: C.muted });
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; begin(); paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        begin();
        S.ran = true;
        loop.start();
        return tw.run(seconds || 4.5, function (k) {
          const target = Math.round(opts.N * Math.min(1, k / 0.8));
          if (target > S.events) advance(target - S.events);
          if (k >= 0.85) S.done = true;
          paint();
          loop.requestRender();
          if (k >= 1) lock(false);
        });
      },
      runNow() { begin(); S.ran = true; advance(opts.N); S.done = true; paint(); loop.requestRender(); return api.getState(); },
      setParam(key, v) { if (key === 'locked') lock(v); else { opts[key] = v; } },
      getState() { return { N: S.events, count: S.count, sumW: S.sumW, perCount: S.events ? S.count / S.events : 0, perWeight: S.events ? S.sumW / S.events : 0 }; },
    };
    begin();
    lock(opts.locked);
    paint();
    return api;
  };
})();
