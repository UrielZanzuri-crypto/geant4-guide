/* PHY.sims.visGame: "לשחזר את התמונה". The canvas holds two viewers of the same schematic run (protons
   and a few neutrons of the flat source, PHY.ch07.makeEvent): the target on top, ours below. Each round
   draws a random target and we set the controls to match it:
     1. the viewpoint only (θ, φ);  2. the viewpoint and the style;  3. the viewpoint, the style, the
     auxiliary edges and the particle filter.
   A viewpoint matches when the angle between the two view vectors is at most 12°, which also accepts a φ
   that differs by 360°. Points: 3 on the first check, 2 on the second, then 1; stars from the total:
   8-9 -> 3, 6-7 -> 2, else 1. opts: {rng, chapter, section, onDone}.
   Actions: setView(theta, phi), setStyle(s), setAux(b), setFilter('pn'|'n'), check(), next(), restart().
   getState(): {level, phase, target, ours, angle, points, stars, checks}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch07;
  const h = U.h;
  const NAMES = ['שלב 1: נקודת מבט', 'שלב 2: וגם סגנון', 'שלב 3: וגם מסנן'];
  const TOL = 12;

  PHY.sims.visGame = function (canvasEl, controlsEl, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const R = PHY.random(Math.floor(rng() * 1e9));
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -48, xMax: 48, yMin: -62, yMax: 62 }, aspect: 0.82, minHeight: 360, maxHeight: 640 });
    const C = PHY.colors;
    const G = { level: 0, phase: 'play', points: [], stars: 0, checks: 0, target: null, ours: { theta: 90, phi: 0, style: 'wireframe', aux: false, filter: 'pn' }, angle: null };
    /* one fixed run for both viewers */
    const ev = PHY.random(17).next;
    const TRACKS = [];
    for (let i = 0; i < 400; i++) K.makeEvent(ev, { mode: 'flat', Emin: 1.85, pN: 0.02 }).tracks.forEach(function (t) { TRACKS.push(t); });

    const hud = U.GameHud(controlsEl, NAMES);
    const grid = h('div', { class: 'sim-grid' });
    hud.main.appendChild(grid);
    const thS = U.Slider(grid, { label: 'θ', min: 0, max: 180, step: 1, value: 90, unit: 'deg', digits: 0, onInput(v) { api.setView(v, G.ours.phi); } });
    const phS = U.Slider(grid, { label: 'φ', min: -180, max: 180, step: 1, value: 0, unit: 'deg', digits: 0, onInput(v) { api.setView(G.ours.theta, v); } });
    const styleC = U.Choice(hud.main, { label: 'סגנון', options: [{ value: 'wireframe', text: '<span dir="ltr">wireframe</span>' }, { value: 'surface', text: '<span dir="ltr">surface</span>' }], value: 'wireframe', onChange(v) { api.setStyle(v); } });
    const auxT = U.Toggle(hud.main, F.ltr('auxiliaryEdge'), { value: false, onChange(v) { api.setAux(v); } });
    const filtC = U.Choice(hud.main, { label: 'המסנן', options: [{ value: 'pn', text: 'פרוטונים ונייטרונים' }, { value: 'n', text: 'רק נייטרונים' }], value: 'pn', onChange(v) { api.setFilter(v); } });
    const row = h('div', { class: 'btn-row' });
    hud.main.appendChild(row);
    const checkBtn = U.Button(row, 'בדיקה', () => api.check(), { primary: true });
    const nextBtn = U.Button(row, 'לשלב הבא', () => api.next(), { primary: true });

    function sub(y0, y1) {
      /* a viewer in the world band y0..y1 of the canvas (world units), scene centred in it */
      const o = Object.create(view);
      const cy = (y0 + y1) / 2;
      const s = Math.min(1, (y1 - y0) / 60);
      o.sx = (x) => view.sx(x * s);
      o.sy = (y) => view.sy(cy + y * s);
      return o;
    }
    const filt = (f) => (f === 'n' ? new Set(['neutron']) : new Set(['proton', 'neutron']));
    function render() {
      view.clear();
      const top = sub(2, 62), bot = sub(-62, -2);
      const T = G.target;
      const ctx = view.ctx;
      const band = function (y0, y1, fn) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, view.sy(y1), view.w, view.sy(y0) - view.sy(y1)); ctx.clip();
        fn();
        ctx.restore();
      };
      band(0, 62, function () { K.drawScene(top, K.cameraTP(T.theta, T.phi), { zoom: 1.1, style: T.style, aux: T.aux, axes: true, t: 4, tracks: TRACKS, filter: filt(T.filter), thin: true }); });
      band(-62, 0, function () { K.drawScene(bot, K.cameraTP(G.ours.theta, G.ours.phi), { zoom: 1.1, style: G.ours.style, aux: G.ours.aux, axes: true, t: 4, tracks: TRACKS, filter: filt(G.ours.filter), thin: true }); });
      view.line(-48, 0, 48, 0, { color: 'gridStrong', width: 1.5 });
      view.screenText(10, 16, 'המטרה', { size: 12, weight: 700, align: 'left', color: C.ink, pill: true });
      view.screenText(10, view.sy(-2) + 16, 'שלנו', { size: 12, weight: 700, align: 'left', color: C.ink, pill: true });
      if (G.phase === 'won' || G.phase === 'final') view.screenText(view.w - 10, 16, F.ltr('viewpointThetaPhi ' + T.theta + ' ' + T.phi), { size: 11, weight: 600, align: 'right', color: C.good, pill: true });
    }
    const loop = PHY.SimLoop({ view, step() {}, render });

    function startLevel(i) {
      G.level = i; G.phase = 'play'; G.checks = 0; G.angle = null;
      let th, ph;
      do { th = R.int(25, 155); ph = R.int(-170, 170); } while (angleBetween({ theta: th, phi: ph }, { theta: 90, phi: 0 }) < 35);
      G.target = { theta: th, phi: ph, style: i >= 1 ? R.pick(['wireframe', 'surface']) : 'wireframe', aux: i >= 2 ? R.pick([true, false]) : false, filter: i >= 2 ? R.pick(['pn', 'n']) : 'pn' };
      if (i === 1 && G.target.style === 'wireframe') G.target.style = 'surface';
      G.ours = { theta: 90, phi: 0, style: 'wireframe', aux: false, filter: 'pn' };
      thS.set(90); phS.set(0); styleC.set('wireframe'); auxT.set(false); filtC.set('pn');
      styleC.setEnabled(i >= 1); auxT.input.disabled = i < 2; filtC.setEnabled(i >= 2);
      hud.setTask(['מזיזים את θ ואת φ עד שהתמונה התחתונה נראית כמו העליונה. מספיק להגיע להבדל של פחות מ-\\(12°\\) בכיוון המבט.', 'הפעם גם הסגנון שונה: <span dir="ltr">wireframe</span> או <span dir="ltr">surface</span>.', 'נקודת מבט, סגנון, קווי העזר של <span dir="ltr">auxiliaryEdge</span>, ומה המסנן מעביר.'][i]);
      hud.say('', '');
      hud.paint(i, G.points, false);
      hud.showMain();
      checkBtn.hidden = false; nextBtn.hidden = true;
      loop.requestRender();
    }
    function angleBetween(a, b) {
      const u = K.tpVector(a.theta, a.phi), v = K.tpVector(b.theta, b.phi);
      return Math.acos(Math.max(-1, Math.min(1, K.dot(u, v)))) * 180 / Math.PI;
    }
    function finish() {
      const total = G.points.reduce((a, b) => a + b, 0);
      G.stars = total >= 8 ? 3 : total >= 6 ? 2 : 1;
      G.phase = 'final';
      if (opts.chapter) {
        PHY.progress.setGame(opts.chapter, G.stars);
        if (opts.section) PHY.progress.markSection(opts.chapter, opts.section);
      }
      hud.paint(3, G.points, true);
      const words = ['', 'כוכב אחד. המצלמה של Geant4 עוד מבלבלת, וזה בסדר: עוד סיבוב.', 'שני כוכבים. עוד סיבוב, ו-θ ו-φ ייכנסו לאצבעות.', 'שלושה כוכבים. אפשר לכוון כל צופה של Geant4.'];
      hud.showFinal(G.stars, words[G.stars], () => api.restart());
      if (opts.onDone) opts.onDone(G.stars);
      loop.requestRender();
    }

    const api = {
      start: loop.start, stop: loop.stop,
      reset() { api.restart(); },
      setParam() {},
      setView(theta, phi) { if (G.phase !== 'play') return; G.ours.theta = theta; G.ours.phi = phi; thS.set(theta); phS.set(phi); loop.requestRender(); },
      setStyle(s) { if (G.phase !== 'play') return; G.ours.style = s; styleC.set(s); loop.requestRender(); },
      setAux(b) { if (G.phase !== 'play') return; G.ours.aux = !!b; auxT.set(!!b); loop.requestRender(); },
      setFilter(f) { if (G.phase !== 'play') return; G.ours.filter = f; filtC.set(f); loop.requestRender(); },
      check() {
        if (G.phase !== 'play') return null;
        G.checks++;
        const T = G.target, O = G.ours;
        G.angle = angleBetween(T, O);
        const bad = [];
        if (G.angle > TOL) bad.push('כיוון המבט רחוק ב-' + F.unit(G.angle, '°', 0));
        if (O.style !== T.style) bad.push('הסגנון אחר');
        if (G.level >= 2 && O.aux !== T.aux) bad.push('קווי העזר אחרים');
        if (G.level >= 2 && O.filter !== T.filter) bad.push('המסנן אחר');
        if (!bad.length) {
          G.phase = 'won';
          G.points[G.level] = Math.max(1, 4 - G.checks);
          hud.say('בול. ' + F.ltr('viewpointThetaPhi ' + T.theta + ' ' + T.phi + ' deg') + '. ' + ['', 'נקודה אחת.', 'שתי נקודות.', 'שלוש נקודות.'][G.points[G.level]], 'good');
          hud.paint(G.level, G.points, false);
          checkBtn.hidden = true; nextBtn.hidden = false;
          nextBtn.textContent = G.level === 2 ? 'לתוצאה' : 'לשלב הבא';
        } else hud.say('עוד לא: ' + bad.join(', ') + '.', 'bad');
        loop.requestRender();
        return !bad.length;
      },
      next() { if (G.phase !== 'won') return; if (G.level === 2) finish(); else startLevel(G.level + 1); },
      restart() { G.points = []; G.stars = 0; startLevel(0); },
      getState() { return { level: G.level, phase: G.phase, target: Object.assign({}, G.target), ours: Object.assign({}, G.ours), angle: G.angle, points: G.points.slice(), stars: G.stars, checks: G.checks }; },
    };
    startLevel(0);
    return api;
  };
})();
