/* PHY.sims.geoGame: "לבנות לפי ההדפסה". Each level shows the geometry table that Geant4 printed at the
   start of a run (PHY.ch03.build, the format of DetectorConstruction::Construct) and we set the controls
   (materials, thicknesses, distance, radius) so that our own table, printed live under the controls, is
   the same. Level 1: one layer. Level 2: two layers. Level 3: two layers whose lengths print in cm or um
   (G4BestUnit), so the units have to be read.
   Points: 3 for the first check that matches, 2 for the second, then 1. Stars: 8-9 → 3, 6-7 → 2, else 1.
   opts: {rng, chapter, section, onDone}. Actions: set(key, value) with keys mat0, t0, mat1, t1, distance,
   radius; check(); next(); restart(). getState(): {level, phase, target, model, points, stars, checks, diff}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch03;
  const NAMES = ['שלב 1: שכבה אחת', 'שלב 2: שתי שכבות', 'שלב 3: יחידות'];
  const MATS = ['Be', 'Li', 'LiF', 'Pb'];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  PHY.sims.geoGame = function (canvasEl, controlsEl, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -5, xMax: 95, yMin: -36, yMax: 40 }, aspect: 1.45, minHeight: 210, maxHeight: 360 });
    const G = { level: 0, phase: 'play', points: [], stars: 0, checks: 0, target: null, diff: [] };
    const P = { mat0: 'Be', t0: 2, mat1: 'Pb', t1: 10, distance: 45, radius: 22 };

    function makeTarget(i) {
      const layers = [];
      if (i === 0) layers.push({ mat: pick(MATS), t: pick([1, 2, 3, 4, 5, 8]) });
      else if (i === 1) { layers.push({ mat: pick(MATS), t: pick([1, 2, 4, 5]) }); layers.push({ mat: pick(MATS), t: pick([2, 4, 6, 8]) }); }
      else { layers.push({ mat: pick(['Be', 'LiF', 'Li']), t: pick([0.5, 1.5, 2.5]) }); layers.push({ mat: pick(['Pb', 'Be']), t: pick([12, 15, 16, 18]) }); }
      const distance = i === 2 ? pick([25, 32, 45, 61]) : pick([20, 30, 40, 45, 50]);
      const radius = i === 2 ? pick([15, 18, 25, 35]) : pick([15, 20, 22, 25, 30]);
      return { layers, distance, radius };
    }
    const model = () => {
      const n = G.level === 0 ? 1 : 2;
      const layers = [{ mat: P.mat0, t: P.t0 }];
      if (n === 2) layers.push({ mat: P.mat1, t: P.t1 });
      return { layers, distance: P.distance, radius: P.radius };
    };

    const hud = controlsEl ? U.GameHud(controlsEl, NAMES) : null;
    let C1 = {}, l1Box = null, mine = null, checkBtn = null, nextBtn = null;
    if (hud) {
      const g = U.h('div', { class: 'g4edit' });
      hud.main.appendChild(g);
      C1.mat0 = U.Choice(g, { label: 'החומר של שכבה 0', options: MATS.map((m) => ({ value: m, text: m })), value: P.mat0, onChange: (v) => api.set('mat0', v) });
      C1.t0 = U.Slider(g, { label: 'העובי של שכבה 0', min: 0.5, max: 20, step: 0.5, value: P.t0, unit: 'mm', digits: 1, onInput: (v) => api.set('t0', v) });
      l1Box = U.h('div', { class: 'g4edit' });
      g.appendChild(l1Box);
      C1.mat1 = U.Choice(l1Box, { label: 'החומר של שכבה 1', options: MATS.map((m) => ({ value: m, text: m })), value: P.mat1, onChange: (v) => api.set('mat1', v) });
      C1.t1 = U.Slider(l1Box, { label: 'העובי של שכבה 1', min: 0.5, max: 20, step: 0.5, value: P.t1, unit: 'mm', digits: 1, onInput: (v) => api.set('t1', v) });
      const grid = U.h('div', { class: 'sim-grid' });
      g.appendChild(grid);
      C1.distance = U.Slider(grid, { label: 'המרחק מהמקור', min: 10, max: 80, step: 1, value: P.distance, unit: 'mm', digits: 0, onInput: (v) => api.set('distance', v) });
      C1.radius = U.Slider(grid, { label: 'הרדיוס', min: 10, max: 40, step: 1, value: P.radius, unit: 'mm', digits: 0, onInput: (v) => api.set('radius', v) });
      hud.main.appendChild(U.h('div', { class: 'g4out-label', text: 'מה Geant4 ידפיס עם הבחירות שלנו:' }));
      mine = U.h('pre', { class: 'code g4out', dir: 'ltr' });
      hud.main.appendChild(mine);
      const row = U.h('div', { class: 'btn-row' });
      hud.main.appendChild(row);
      checkBtn = U.Button(row, 'בדיקה', () => api.check(), { primary: true });
      nextBtn = U.Button(row, 'לשלב הבא', () => api.next(), { primary: true });
    }

    function startLevel(i) {
      G.level = i; G.phase = 'play'; G.checks = 0; G.diff = [];
      G.target = makeTarget(i);
      if (hud) {
        const lines = K.build(G.target).lines;
        const intro = ['זו הטבלה שהריצה הדפיסה. נבנה את אותה גיאומטריה:', 'הפעם שתי שכבות. הראשונה ברשימה היא הקרובה למקור.', 'שתי שכבות, והיחידות בטבלה כבר לא תמיד mm.'][i];
        hud.setTask(intro + '<pre class="code g4out" dir="ltr">' + esc(lines.join('\n')) + '</pre>');
        hud.say('', '');
        hud.paint(i, G.points, false);
        hud.showMain();
        l1Box.hidden = i === 0;
        checkBtn.hidden = false; nextBtn.hidden = true;
      }
      paint();
      loop.requestRender();
    }
    function paint() { if (mine) mine.textContent = K.build(model()).lines.join('\n'); }

    function finish() {
      const total = G.points.reduce((a, b) => a + b, 0);
      G.stars = total >= 8 ? 3 : total >= 6 ? 2 : 1;
      G.phase = 'final';
      if (opts.chapter) {
        PHY.progress.setGame(opts.chapter, G.stars);
        if (opts.section) PHY.progress.markSection(opts.chapter, opts.section);
      }
      if (hud) {
        hud.paint(3, G.points, true);
        const words = ['', 'כוכב אחד. היחידות בטבלה מטעות בהתחלה, וזה בסדר: עוד סיבוב.', 'שני כוכבים. עוד סיבוב, והטבלה תיקרא במבט אחד.', 'שלושה כוכבים. ככה קוראים את הטבלה בתחילת כל ריצה.'];
        hud.showFinal(G.stars, words[G.stars], () => api.restart());
      }
      if (opts.onDone) opts.onDone(G.stars);
    }

    function render() {
      view.clear();
      const m = model();
      const b = K.build(m);
      const zEnd = b.zEnd;
      const w = { xMin: -5, xMax: Math.max(70, zEnd * 1.15), yMin: -Math.max(30, m.radius * 1.35), yMax: Math.max(30, m.radius * 1.35) + 8 };
      if (view.world.xMax !== w.xMax || view.world.yMax !== w.yMax) view.setWorld(w);
      view.line(-4, 0, w.xMax - 1, 0, { color: 'grid', width: 1, dash: [3, 4] });
      K.drawRZ(view, m, { labels: true });
      b.zb.forEach(function (z, i) {
        if (i > 0 && (z - b.zb[i - 1]) * view.scale < 9) return;
        view.text(z, m.radius + 2.5, K.g4num(z), { size: 10, weight: 600, color: PHY.colors.muted });
      });
      K.clock(view, 'הגיאומטריה שלנו');
    }

    const loop = PHY.SimLoop({ view, step() {}, render });
    const same = (a, b) => Math.abs(a - b) < 1e-9;
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { api.restart(); },
      setParam(key, v) { api.set(key, v); },
      set(key, v) {
        if (G.phase !== 'play') return;
        P[key] = v;
        if (C1[key]) C1[key].set(v);
        paint();
        loop.requestRender();
      },
      check() {
        if (G.phase !== 'play') return false;
        G.checks++;
        const t = G.target, m = model(), d = [];
        t.layers.forEach(function (l, i) {
          if (l.mat !== m.layers[i].mat) d.push('החומר של שכבה ' + i);
          if (!same(l.t, m.layers[i].t)) d.push('העובי של שכבה ' + i);
        });
        if (!same(t.distance, m.distance)) d.push('המרחק');
        if (!same(t.radius, m.radius)) d.push('הרדיוס');
        G.diff = d;
        if (!d.length) {
          G.phase = 'won';
          G.points[G.level] = Math.max(1, 4 - G.checks);
          if (hud) {
            hud.say('בדיוק אותה טבלה. ' + ['', 'נקודה אחת.', 'שתי נקודות.', 'שלוש נקודות.'][G.points[G.level]], 'good');
            hud.paint(G.level, G.points, false);
            checkBtn.hidden = true; nextBtn.hidden = false;
            nextBtn.textContent = G.level === 2 ? 'לתוצאה' : 'לשלב הבא';
          }
          return true;
        }
        if (hud) hud.say('עוד לא. שונה: ' + d.join(', ') + '.', 'bad');
        return false;
      },
      next() {
        if (G.phase !== 'won') return;
        if (G.level === 2) finish(); else startLevel(G.level + 1);
      },
      restart() { G.points = []; G.stars = 0; startLevel(0); },
      getState() { return { level: G.level, phase: G.phase, target: JSON.parse(JSON.stringify(G.target)), model: model(), points: G.points.slice(), stars: G.stars, checks: G.checks, diff: G.diff.slice(), targetLines: K.build(G.target).lines }; },
    };
    startLevel(0);
    return api;
  };
})();
