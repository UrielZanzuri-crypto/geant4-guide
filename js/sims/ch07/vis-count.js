/* PHY.sims.visCount: how many trajectories a picture holds. A side view of the ldns converter
   (/vis/viewer/set/viewpointVector -1 0.35 -0.3, as in the two pictures) while N schematic events accumulate (PHY.ch07.makeEvent),
   with a particle filter. The neutron rate per proton is the one of PLAN 4: P_ANALOG (the real mix from
   0.5 MeV, analog) or P_FLAT (flat from 1.85 MeV: 6126 rows from 3e6 protons).
   Modes:
     'hook'   10000 protons of the real mix, only neutrons drawn: how many green tracks? Before play() the
              stage shows "?" and the readouts too. After it: the biased source, and another 10000.
     'zero'   300 protons of the real mix, protons and neutrons drawn, as in geometry_30J_Be4.png; after
              it, "20 more pictures" counts the pictures that show at least one neutron.
     'memory' accumulate 50000 events, only neutrons drawn: the trajectories kept for drawing in soft
              mode (every trajectory, at least one per event) and in hard mode (only those that pass).
   opts: {mode, N, src, seed, locked, chapter, section}.
   getState(): {events, neutrons, expected, pictures, withNeutron, keptSoft, keptHard, src}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch07;
  const h = U.h;

  PHY.sims.visCount = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'hook', N: 10000, src: 'analog', seed: 11, locked: true }, opts || {});
    const memory = opts.mode === 'memory';
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -48, xMax: 48, yMin: memory ? -52 : -30, yMax: 30 }, aspect: memory ? 1.18 : 1.6, minHeight: 230, maxHeight: 460 });
    const C = PHY.colors;
    const tw = PHY.tweens();
    const cam = K.camera([-1, 0.35, -0.3]);
    const S = { events: 0, neutrons: 0, tracks: [], ran: false, pictures: 0, withNeutron: 0, keptSoft: 0, keptHard: 0, rng: null };
    const filter = opts.mode === 'zero' ? new Set(['proton', 'neutron']) : new Set(['neutron']);
    const rate = () => (opts.src === 'flat' ? K.P_FLAT : K.P_ANALOG);
    const src = () => (opts.src === 'flat' ? { mode: 'flat', Emin: 1.85 } : { mode: 'analog', Emin: 0.5 });

    function begin(seed) {
      S.rng = PHY.random(seed).next;
      S.events = 0; S.neutrons = 0; S.tracks = []; S.keptSoft = 0; S.keptHard = 0;
    }
    function advance(n) {
      const s = src();
      for (let i = 0; i < n; i++) {
        const e = K.makeEvent(S.rng, s);
        S.events++;
        S.keptSoft += e.tracks.length;
        e.tracks.forEach(function (t) {
          if (filter.has(t.type)) {
            S.keptHard++;
            if (t.type === 'neutron' || S.tracks.length < 2000) S.tracks.push(t);
          }
        });
        S.neutrons += e.nNeutron;
      }
    }

    let ro = null, srcC = null, againB = null, moreB = null;
    function touch() { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }
    if (controlsEl) {
      if (opts.mode === 'hook') {
        ro = U.Readouts(controlsEl, [{ key: 'p', label: 'פרוטונים שנורו' }, { key: 'n', label: 'מסלולים ירוקים', color: 'var(--c-neutron)' }, { key: 'e', label: 'צפוי בממוצע' }]);
        srcC = U.Choice(controlsEl, { label: 'המקור', options: [{ value: 'analog', text: 'התערובת האמיתית מ-0.5 MeV' }, { value: 'flat', text: '<span dir="ltr">flat</span> מ-1.85 MeV' }], value: 'analog', onChange(v) { opts.src = v; api.play(2.5); touch(); } });
        const row = h('div', { class: 'sim-row' });
        controlsEl.appendChild(row);
        againB = U.Button(row, 'עוד 10000 פרוטונים', function () { opts.seed += 1; api.play(2.5); touch(); }, {});
      } else if (opts.mode === 'zero') {
        ro = U.Readouts(controlsEl, [{ key: 'p', label: 'פרוטונים בתמונה' }, { key: 'n', label: 'מסלולים ירוקים', color: 'var(--c-neutron)' }, { key: 'pic', label: 'תמונות עם נייטרון' }]);
        const row = h('div', { class: 'sim-row' });
        controlsEl.appendChild(row);
        moreB = U.Button(row, 'עוד 20 תמונות', function () { api.morePictures(20); touch(); }, {});
      } else {
        ro = U.Readouts(controlsEl, [{ key: 'p', label: 'אירועים שנצברו' }, { key: 'n', label: 'מסלולים בתמונה', color: 'var(--c-neutron)' }, { key: 's', label: 'נשמרים לציור, soft' }, { key: 'hh', label: 'נשמרים לציור, hard' }]);
      }
    }
    function lock(on) {
      opts.locked = on;
      if (srcC) srcC.setEnabled(!on);
      if (againB) againB.disabled = on;
      if (moreB) moreB.disabled = on;
    }
    function paint() {
      if (!ro) return;
      const q = S.ran;
      if (opts.mode === 'hook') {
        ro.set('p', q ? F.num(S.events, 0) : '?');
        ro.set('n', q ? F.num(S.neutrons, 0) : '?');
        ro.set('e', q && S.events === opts.N ? F.num(opts.N * rate(), opts.N * rate() < 10 ? 2 : 0) : '?');
      } else if (opts.mode === 'zero') {
        ro.set('p', q ? F.num(S.events, 0) : '?');
        ro.set('n', q ? F.num(S.neutrons, 0) : '?');
        ro.set('pic', S.pictures ? F.num(S.withNeutron, 0) + ' / ' + F.num(S.pictures, 0) : '–');
      } else {
        ro.set('p', q ? F.num(S.events, 0) : '?');
        ro.set('n', q ? F.num(S.neutrons, 0) : '?');
        ro.set('s', q ? F.num(S.keptSoft, 0) : '?');
        ro.set('hh', q ? F.num(S.keptHard, 0) : '?');
      }
    }

    function bars() {
      /* two bars on a log scale: trajectories kept for drawing in soft and in hard mode */
      const y1 = -38, y2 = -44.5, x0 = -30, x1 = 44, top = 5;
      const X = (n) => x0 + (x1 - x0) * Math.max(0, Math.log10(Math.max(n, 1))) / top;
      view.text(x0 - 2, y1, 'soft', { size: 11.5, weight: 700, color: C.ink, align: 'right' });
      view.text(x0 - 2, y2, 'hard', { size: 11.5, weight: 700, color: C.ink, align: 'right' });
      const ctx = view.ctx;
      [[y1, S.keptSoft, C.muted], [y2, S.keptHard, C.neutron]].forEach(function (b) {
        ctx.save();
        ctx.fillStyle = b[2]; ctx.globalAlpha = 0.6;
        const px0 = view.sx(x0), px1 = view.sx(X(b[1])), py = view.sy(b[0] + 2), ph = view.sy(b[0] - 2) - py;
        ctx.fillRect(px0, py, Math.max(1, px1 - px0), ph);
        ctx.restore();
      });
      for (let d = 0; d <= top; d++) {
        view.line(X(Math.pow(10, d)), y2 - 3, X(Math.pow(10, d)), y2 - 4, { color: 'axis', width: 1 });
        view.text(X(Math.pow(10, d)), y2 - 6.5, F.ltr(['1', '10', '10²', '10³', '10⁴', '10⁵'][d]), { size: 10.5, color: C.muted });
      }
      view.text(x1, y1 + 4.5, 'מסלולים שנשמרים לציור, סקלה לוגריתמית', { size: 10.5, color: C.muted, align: 'right' });
    }
    function render() {
      view.clear();
      const ctx = view.ctx;
      ctx.save();
      if (memory) { ctx.beginPath(); ctx.rect(0, 0, view.w, view.sy(-31)); ctx.clip(); }
      K.drawScene(view, cam, { zoom: 1.25, center: [0, 0, 26], style: 'wireframe', aux: false, axes: true, t: 4, tracks: S.tracks, filter, thin: S.tracks.length > 400 });
      ctx.restore();
      if (memory) { view.line(-48, -31, 48, -31, { color: 'gridStrong', width: 1 }); bars(); }
      if (!S.ran) {
        view.screenText(view.w / 2, view.h * (memory ? 0.36 : 0.5), '?', { size: 34, weight: 800, color: C.muted, halo: true });
      }
      const lbl = opts.mode === 'zero' ? 'פרוטונים ונייטרונים' : 'רק נייטרונים';
      view.screenText(10, 16, 'מסנן: ' + lbl, { size: 11.5, weight: 600, align: 'left', color: C.muted, pill: true });
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; begin(opts.seed); paint(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        begin(opts.seed);
        S.ran = true;
        const N = opts.mode === 'memory' ? opts.N || 50000 : opts.N;
        const T = seconds || 4;
        loop.start();
        return tw.run(T, function (k) {
          const target = Math.round(N * Math.min(1, k));
          if (target > S.events) advance(target - S.events);
          paint();
          loop.requestRender();
          if (k >= 1) lock(false);
        });
      },
      runNow() { begin(opts.seed); S.ran = true; advance(opts.mode === 'memory' ? opts.N || 50000 : opts.N); paint(); loop.requestRender(); return api.getState(); },
      morePictures(n) {
        const r = PHY.random(opts.seed * 101 + S.pictures + 1).next;
        for (let i = 0; i < n; i++) {
          let k = 0;
          for (let j = 0; j < opts.N; j++) if (r() < rate()) k++;
          S.pictures++;
          if (k > 0) S.withNeutron++;
        }
        paint();
        return { pictures: S.pictures, withNeutron: S.withNeutron };
      },
      setParam(key, v) { if (key === 'locked') lock(v); else { opts[key] = v; paint(); loop.requestRender(); } },
      getState() { return { events: S.events, neutrons: S.neutrons, expected: S.events * rate(), pictures: S.pictures, withNeutron: S.withNeutron, keptSoft: S.keptSoft, keptHard: S.keptHard, src: opts.src, rate: rate() }; },
    };
    begin(opts.seed);
    lock(opts.locked);
    paint();
    return api;
  };
})();
