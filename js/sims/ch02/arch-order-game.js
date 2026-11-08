/* PHY.sims.archOrderGame: "מי נקרא מתי". Each level shows a schematic event (its tree, how many steps each
   track makes and, in level 3, the order in which the reaction created its products) and the user
   callbacks of that event as shuffled buttons; the steps of one track are one button ("Stepping ×4 p").
   We tap them in the order Geant4 calls them. The right order comes from PHY.ch02.transport: the primary,
   then the secondaries from the top of the stack, each with PreTracking, its steps, PostTracking.
   Level 1: a proton without secondaries. Level 2: one secondary. Level 3: two secondaries in a random
   creation order, and the gamma's Compton electron. A wrong tap costs a mistake and gets a hint.
   Points per level: 3 with no mistake, 2 with one or two, else 1. Stars from the total: 8-9 → 3, 6-7 → 2.
   opts: {rng, chapter, section, onDone}. Actions: tap(key) → true/false, next(), restart().
   getState(): {level, phase, expected: [keys], placed: [keys], mistakes, points, stars, chips: [{key, label}]}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;
  const NAMES = ['שלב 1: בלי משניים', 'שלב 2: משני אחד', 'שלב 3: מחסנית'];
  const SHORT = { GeneratePrimaries: 'GeneratePrimaries', BeginOfEventAction: 'BeginOfEvent', EndOfEventAction: 'EndOfEvent', PreUserTrackingAction: 'PreTracking', PostUserTrackingAction: 'PostTracking', UserSteppingAction: 'Stepping' };

  const spec = (p, n, kids) => ({ p, pts: new Array(n + 1).fill({ x: 0, y: 0 }), procs: new Array(n).fill('step'), E: new Array(n).fill(1), kids: kids || {} });

  PHY.sims.archOrderGame = function (canvasEl, controlsEl, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 62 }, aspect: 1.75, minHeight: 190, maxHeight: 300 });
    const G = { level: 0, phase: 'play', points: [], stars: 0, mistakes: 0, ev: null, chips: [], expected: [], placed: [], note: '' };
    const int = (a, b) => a + Math.floor(rng() * (b - a + 1));

    function makeEvent(level) {
      const kp = int(3, 6);
      if (level === 0) return { spec: spec('proton', kp), note: '' };
      if (level === 1) {
        const x = rng() < 0.5 ? 'neutron' : 'gamma';
        return { spec: spec('proton', kp, { [kp - 1]: [spec(x, int(2, 4))] }), note: '' };
      }
      const e = spec('electron', int(2, 3));
      const g = spec('gamma', int(2, 3), { 0: [e] });
      const n = spec('neutron', int(2, 4));
      const first = rng() < 0.5 ? [n, g] : [g, n];
      return { spec: spec('proton', kp, { [kp - 1]: first }), note: 'התגובה יצרה קודם ' + K.PART[first[0].p].he + ' ואחר כך ' + K.PART[first[1].p].he + '. ' };
    }
    function chipsOf(ev) {
      const out = [];
      ev.seq.forEach(function (e) {
        if (!K.isUser(e.cb)) return;
        const t = e.id ? ev.track(e.id) : null;
        const sym = t ? K.PART[t.p].sym : '';
        if (e.cb === 'UserSteppingAction') {
          if (e.step > 0) return;
          out.push({ key: 'S' + e.id, label: SHORT[e.cb] + ' ×' + t.nSteps + ' ' + sym, id: e.id, cb: e.cb });
        } else {
          out.push({ key: (e.id ? e.cb + e.id : e.cb), label: SHORT[e.cb] + (t ? ' ' + sym : ''), id: e.id || 0, cb: e.cb });
        }
      });
      return out;
    }

    const hud = controlsEl ? U.GameHud(controlsEl, NAMES) : null;
    let placedEl = null, poolEl = null, nextBtn = null;
    if (hud) {
      placedEl = U.h('div', { class: 'g4seq', dir: 'ltr' });
      poolEl = U.h('div', { class: 'g4pool', dir: 'ltr' });
      hud.main.appendChild(U.h('div', { class: 'g4seq-label', text: 'הסדר שבנינו:' }));
      hud.main.appendChild(placedEl);
      hud.main.appendChild(U.h('div', { class: 'g4seq-label', text: 'הקריאות שנשארו:' }));
      hud.main.appendChild(poolEl);
      const row = U.h('div', { class: 'btn-row' });
      hud.main.appendChild(row);
      nextBtn = U.Button(row, 'לשלב הבא', () => api.next(), { primary: true });
    }

    function startLevel(i) {
      G.level = i; G.phase = 'play'; G.mistakes = 0; G.placed = [];
      const m = makeEvent(i);
      G.ev = K.transport(m.spec);
      G.note = m.note;
      G.expected = chipsOf(G.ev);
      G.chips = G.expected.slice();
      for (let j = G.chips.length - 1; j > 0; j--) { const k = Math.floor(rng() * (j + 1)); const t = G.chips[j]; G.chips[j] = G.chips[k]; G.chips[k] = t; }
      if (hud) {
        const task = [
          'פרוטון אחד, בלי חלקיקים משניים. באיזה סדר Geant4 קורא לפעולות של המשתמש? הצעדים של מסלול הם כפתור אחד.',
          'הפעם התגובה בצעד האחרון של הפרוטון יוצרת חלקיק משני אחד. מתי מתחיל המסלול שלו?',
          G.note + 'והגמא יוצר אלקטרון בפיזור קומפטון. מי מועבר קודם?',
        ][i];
        hud.setTask(task);
        hud.say('', '');
        hud.paint(i, G.points, false);
        hud.showMain();
        nextBtn.hidden = true;
        paintPool();
      }
      loop.requestRender();
    }
    function paintPool() {
      if (!hud) return;
      placedEl.innerHTML = '';
      G.placed.forEach(function (key) {
        const c = G.expected.find((x) => x.key === key);
        const t = c.id ? G.ev.track(c.id) : null;
        const chip = U.h('span', { class: 'g4chip', text: c.label });
        if (t) chip.style.setProperty('--chip-color', 'var(--c-' + (K.PART[t.p].color === 'ink' ? 'volume' : K.PART[t.p].color) + ')');
        placedEl.appendChild(chip);
      });
      if (!G.placed.length) placedEl.appendChild(U.h('span', { class: 'g4seq-empty', text: '…' }));
      poolEl.innerHTML = '';
      G.chips.forEach(function (c) {
        if (G.placed.indexOf(c.key) >= 0) return;
        const b = U.h('button', { type: 'button', class: 'btn g4pick', dir: 'ltr', text: c.label });
        b.addEventListener('click', () => api.tap(c.key));
        b.disabled = G.phase !== 'play';
        poolEl.appendChild(b);
      });
    }

    function hint(c, want) {
      if (c.cb === 'BeginOfEventAction' && want.cb === 'GeneratePrimaries') return 'עוד לא: קודם צריך חלקיק ראשוני. מי יוצר אותו?';
      if (c.cb === 'EndOfEventAction') return 'האירוע עוד לא נגמר: יש מסלולים שמחכים.';
      const started = (id) => G.placed.indexOf('PreUserTrackingAction' + id) >= 0;
      if ((c.cb === 'UserSteppingAction' || c.cb === 'PostUserTrackingAction') && !started(c.id)) return 'המסלול הזה עוד לא התחיל: לפני הצעדים שלו בא PreTracking.';
      if (c.cb === 'PostUserTrackingAction' && want.cb === 'UserSteppingAction') return 'קודם הצעדים של המסלול, ורק אז הוא נגמר.';
      if (c.cb === 'PreUserTrackingAction' && want.cb !== 'PreUserTrackingAction') return 'המסלול הנוכחי עוד לא נגמר: Geant4 מעביר מסלול אחד עד הסוף.';
      if (c.cb === 'PreUserTrackingAction' && want.cb === 'PreUserTrackingAction') return 'לא המסלול הזה. במחסנית, האחרון שנכנס יוצא ראשון.';
      return 'עוד לא. מה Geant4 עושה עכשיו?';
    }

    function finishLevel() {
      G.phase = 'won';
      G.points[G.level] = G.mistakes === 0 ? 3 : G.mistakes <= 2 ? 2 : 1;
      if (hud) {
        hud.say('נכון, זה הסדר. ' + ['', 'נקודה אחת.', 'שתי נקודות.', 'שלוש נקודות.'][G.points[G.level]], 'good');
        hud.paint(G.level, G.points, false);
        nextBtn.hidden = false;
        nextBtn.textContent = G.level === 2 ? 'לתוצאה' : 'לשלב הבא';
        paintPool();
      }
    }
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
        const words = ['', 'כוכב אחד. המחסנית מבלבלת בהתחלה, וזה בסדר: עוד סיבוב.', 'שני כוכבים. עוד סיבוב, והסדר ייכנס לאצבעות.', 'שלושה כוכבים. ככה Geant4 עובר על אירוע.'];
        hud.showFinal(G.stars, words[G.stars], () => api.restart());
      }
      if (opts.onDone) opts.onDone(G.stars);
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      if (!G.ev) return;
      const st = { born: {}, ended: {}, current: 0 };
      G.ev.tracks.forEach((t) => { st.born[t.id] = true; });
      G.placed.forEach(function (key) {
        const c = G.expected.find((x) => x.key === key);
        if (c.cb === 'PreUserTrackingAction') st.current = c.id;
        if (c.cb === 'PostUserTrackingAction') { st.ended[c.id] = true; st.current = 0; }
      });
      const rows = Math.max.apply(null, G.ev.tracks.map(function g(t) { return t.parent ? 1 + g(G.ev.track(t.parent)) : 1; }));
      const dy = rows > 2 ? 19 : 24;
      const pos = K.drawTree(view, G.ev, st, { y0: 33 + ((rows - 1) * dy) / 2, dy, x0: 4, x1: 96, nodeW: 50, creators: false });
      G.ev.tracks.forEach(function (t) {
        const p = pos[t.id];
        view.screenText(view.sx(p.x), view.sy(p.y) + 18, t.nSteps + ' צעדים', { size: 10, weight: 600, color: C.muted });
      });
      if (G.level === 2) view.text(50, 59, 'מספרי המסלולים לפי סדר היצירה', { size: 10, weight: 600, color: C.muted });
    }

    const loop = PHY.SimLoop({ view, step() {}, render });

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { api.restart(); },
      setParam() {},
      tap(key) {
        if (G.phase !== 'play') return false;
        const want = G.expected[G.placed.length];
        if (key === want.key) {
          G.placed.push(key);
          if (hud) hud.say('', '');
          if (G.placed.length === G.expected.length) finishLevel(); else paintPool();
          loop.requestRender();
          return true;
        }
        G.mistakes++;
        const c = G.expected.find((x) => x.key === key);
        if (hud && c) hud.say(hint(c, want), 'bad');
        return false;
      },
      next() {
        if (G.phase !== 'won') return;
        if (G.level === 2) finish(); else startLevel(G.level + 1);
      },
      restart() { G.points = []; G.stars = 0; startLevel(0); },
      getState() {
        return { level: G.level, phase: G.phase, expected: G.expected.map((c) => c.key), labels: G.expected.map((c) => c.label), placed: G.placed.slice(), mistakes: G.mistakes, points: G.points.slice(), stars: G.stars, chips: G.chips.map((c) => ({ key: c.key, label: c.label })), order: G.ev.order.slice(), particles: G.ev.tracks.map((t) => t.p) };
      },
    };
    startLevel(0);
    return api;
  };
})();
