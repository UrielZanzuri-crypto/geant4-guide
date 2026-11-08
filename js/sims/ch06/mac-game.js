/* PHY.sims.macGame: "לתקן את המאקרו". DOM-only: the first argument is a host <div>. Three rounds on the
   real Be 2 mm macro (PHY.ch06.MACROS.be2), every verdict from PHY.ch06.execute:
   1. one geometry line was moved after /run/initialize (which line and where are random): tap it, and it
      goes back above /run/initialize.
   2. one line is broken (from a pool: 3e6, a dot in the file name, a unit that was meant but not
      written): tap it, then choose the right replacement out of three.
   3. eight lines of a macro, shuffled: tap them in an order that runs; check() runs the macro.
   Points per round: 3 without a mistake, 2 after one, then 1. Stars from the total: 8-9 -> 3, 6-7 -> 2,
   else 1. opts: {rng, chapter, section, onDone}. Actions: tap(i), choose(j), pick(i), undo(), clear(),
   check(), next(), restart(). getState(): {level, phase, points, stars, mistakes, lines, bad, fix, built}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const U = PHY.ui, K = PHY.ch06;
  const h = U.h;
  const NAMES = ['שלב 1: מה זז', 'שלב 2: מה מתקנים', 'שלב 3: מאקרו מאפס'];
  const BASE = K.MACROS.be2Lines;
  const INIT = BASE.indexOf('/run/initialize');
  const GEOM = [4, 5];   /* distance, radius (addLayer after /run/initialize would leave no layer: LDNS003 first) */
  const BROKEN = [
    { at: 17, bad: '/run/beamOn 3e6', task: 'Geant4 עוצר את המאקרו הזה עם <code dir="ltr">integer expected</code>.', fix: ['/run/beamOn 3000000', '/run/beamOn 3e+06', '/run/beamOn 3,000,000'] },
    { at: 15, bad: '/analysis/setFileName output/E30J_M2.5_Be2', task: 'הריצה עוברת, הסיכום מודפס, אבל אין קובץ ROOT.', fix: ['/analysis/setFileName output/E30J_M2p5_Be2', '/analysis/setFileName output/E30J_M2.5Be2', '/analysis/setFileName output.E30J_M2p5_Be2'] },
    { at: 3, bad: '/ldns/det/addLayer Be 0.2', task: 'רצינו ממיר בעובי 0.2 cm, וטבלת הגיאומטריה מראה 200 um.', fix: ['/ldns/det/addLayer Be 0.2 cm', '/ldns/det/addLayer Be 0.2 mm', '/ldns/det/addLayer Be cm 0.2'] },
    { at: 9, bad: '/ldns/src/Emin 1850', task: 'רצינו לחתוך ב-1850 keV, ו-ldns עוצר עם <code dir="ltr">Emax &lt;= Emin</code>.', fix: ['/ldns/src/Emin 1850 keV', '/ldns/src/Emin 1850 MeV', '/ldns/src/Emin 1.85 keV'] },
    { at: 11, bad: '/ldns/src/halfAngle 0.35', task: 'רצינו קונוס של 0.35 rad, וקיבלנו קרן כמעט צרה כמו עיפרון.', fix: ['/ldns/src/halfAngle 0.35 rad', '/ldns/src/halfAngle 0.35 deg', '/ldns/src/halfAngle 35 deg'] },
  ];
  const BUILD = ['/ldns/det/clearLayers', '/ldns/det/addLayer Be 2 mm', '/ldns/det/distance 45 mm', '/run/initialize', '/ldns/src/mode spectrum', '/ldns/src/file ' + K.SPEC, '/analysis/setFileName output/E30J_M2p5_Be2', '/run/beamOn 3000000'];

  PHY.sims.macGame = function (host, controlsEl, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const R = PHY.random(Math.floor(rng() * 1e9));
    host.classList.add('mac', 'mac-game');
    host.setAttribute('data-no-iso', '');
    const G = { level: 0, phase: 'play', points: [], stars: 0, mistakes: 0, lines: [], bad: -1, fix: null, built: [], pool: [], opts: [], picked: -1, checks: 0 };

    /* the task reads before the lines: the hud goes on top of the host */
    const hud = U.GameHud(host, NAMES);
    const board = h('ol', { class: 'mac-lines game-lines', dir: 'ltr' });
    const fixBox = h('div', { class: 'game-fix' });
    const builtBox = h('ol', { class: 'mac-lines game-built', dir: 'ltr' });
    const pool = h('div', { class: 'game-pool', dir: 'ltr' });
    host.appendChild(board);
    host.appendChild(fixBox);
    host.appendChild(builtBox);
    host.appendChild(pool);
    const row = h('div', { class: 'btn-row' });
    hud.main.appendChild(row);
    const undoBtn = U.Button(row, 'לבטל את האחרונה', () => api.undo(), {});
    const clearBtn = U.Button(row, 'להתחיל מחדש', () => api.clear(), {});
    const checkBtn = U.Button(row, 'להריץ ולבדוק', () => api.check(), { primary: true });
    const nextBtn = U.Button(row, 'לשלב הבא', () => api.next(), { primary: true });

    function say(t, kind) { hud.say(t, kind); }
    function paint() {
      board.innerHTML = ''; fixBox.innerHTML = ''; builtBox.innerHTML = ''; pool.innerHTML = '';
      board.hidden = G.level === 2; builtBox.hidden = pool.hidden = G.level !== 2;
      if (G.level < 2) {
        G.lines.forEach(function (line, i) {
          const li = h('li', { class: (i === G.picked ? 'is-now ' : '') + (G.phase !== 'play' && i === G.bad ? 'is-done' : '') });
          li.appendChild(h('button', { type: 'button', class: 'game-line', text: line, onclick() { api.tap(i); } }));
          board.appendChild(li);
        });
        if (G.level === 1 && G.picked === G.bad && G.phase === 'play') {
          fixBox.appendChild(h('p', { class: 'game-fix-q', text: 'במה להחליף אותה?' }));
          G.opts.forEach(function (o, j) {
            fixBox.appendChild(h('button', { type: 'button', class: 'choice-btn game-fix-btn', dir: 'ltr', text: o, onclick() { api.choose(j); } }));
          });
        }
      } else {
        G.built.forEach(function (i) { builtBox.appendChild(h('li', { text: BUILD[i] })); });
        if (!G.built.length) builtBox.appendChild(h('li', { class: 'is-comment', text: '# tap the lines below, in order' }));
        G.pool.forEach(function (i) {
          if (G.built.indexOf(i) >= 0) return;
          pool.appendChild(h('button', { type: 'button', class: 'choice-btn game-pool-btn', text: BUILD[i], onclick() { api.pick(i); } }));
        });
      }
      undoBtn.hidden = clearBtn.hidden = checkBtn.hidden = G.level !== 2 || G.phase !== 'play';
      checkBtn.disabled = G.built.length !== BUILD.length;
      nextBtn.hidden = G.phase !== 'won';
      nextBtn.textContent = G.level === 2 ? 'לתוצאה' : 'לשלב הבא';
    }

    function startLevel(i) {
      G.level = i; G.phase = 'play'; G.mistakes = 0; G.picked = -1; G.checks = 0;
      if (i === 0) {
        const L = BASE.slice();
        const from = R.pick(GEOM);
        const line = L.splice(from, 1)[0];
        const at = R.int(INIT, L.length - 2);   /* after /run/initialize (now at INIT - 1), before beamOn */
        L.splice(at, 0, line);
        G.lines = L; G.bad = at; G.badText = line;
        hud.setTask('Geant4 עוצר את המאקרו הזה עם <code dir="ltr">Illegal application state</code>. איזו שורה צריכה לזוז? הקשה עליה תחזיר אותה למקום.');
      } else if (i === 1) {
        const b = R.pick(BROKEN);
        const L = BASE.slice();
        L[b.at] = b.bad;
        G.lines = L; G.bad = b.at; G.fix = b;
        G.opts = R.shuffle(b.fix);
        hud.setTask(b.task + ' קודם מקישים על השורה השבורה, ואחר כך בוחרים תיקון.');
      } else {
        G.built = [];
        G.pool = R.shuffle(BUILD.map((x, k) => k));
        hud.setTask('שמונה שורות של מאקרו, מעורבבות. מקישים עליהן בסדר שבו Geant4 יריץ אותן עד הסוף, ו-<code dir="ltr">/run/beamOn</code> אחרונה.');
      }
      say('', '');
      hud.paint(i, G.points, false);
      hud.showMain();
      paint();
    }
    function win() {
      G.phase = 'won';
      G.points[G.level] = Math.max(1, 3 - G.mistakes);
      say(['', 'עבר, נקודה אחת.', 'עבר, שתי נקודות.', 'בול, שלוש נקודות.'][G.points[G.level]], 'good');
      hud.paint(G.level, G.points, false);
      paint();
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
      const words = ['', 'כוכב אחד. הסדר והיחידות עוד מפתיעים, וזה בדיוק מה שהמשחק בשביל.', 'שני כוכבים. עוד סיבוב, והשגיאות יזהו את עצמן.', 'שלושה כוכבים. Geant4 כבר לא יפתיע אותנו עם מאקרו.'];
      hud.showFinal(G.stars, words[G.stars], () => api.restart());
      paint();
      if (opts.onDone) opts.onDone(G.stars);
    }

    const api = {
      start() {}, stop() {},
      reset() { api.restart(); },
      setParam() {},
      tap(i) {
        if (G.phase !== 'play' || G.level === 2) return null;
        if (G.level === 0) {
          if (i === G.bad) {
            G.lines.splice(i, 1);
            const at = G.lines.indexOf('/run/initialize');
            G.lines.splice(at, 0, G.badText);
            const c = K.execute(G.lines.join('\n'));
            G.ok = c.stopped === null;
            win();
            return true;
          }
          G.mistakes++;
          const d = K.COMMANDS[G.lines[i].split(' ')[0]];
          say('לא זו. ' + (d && d.states.indexOf('Idle') >= 0 ? 'השורה הזאת מותרת גם אחרי האתחול.' : 'השורה הזאת לפני האתחול, ושם היא בסדר.'), 'bad');
          return false;
        }
        G.picked = i;
        if (i !== G.bad) {
          G.mistakes++;
          say('השורה הזאת תקינה. מה בתיאור מצביע על השורה השבורה?', 'bad');
        } else say('נכון, זו השורה. עכשיו התיקון.', '');
        paint();
        return i === G.bad;
      },
      choose(j) {
        if (G.phase !== 'play' || G.level !== 1 || G.picked !== G.bad) return null;
        const pick = G.opts[j];
        if (pick === G.fix.fix[0]) {
          G.lines[G.bad] = pick;
          win();
          return true;
        }
        G.mistakes++;
        const c = K.execute(G.lines.map((l, k) => (k === G.bad ? pick : l)).join('\n'));
        const why = c.issues.find((q) => q.line === G.bad);
        say('עוד לא. ' + (why ? why.html.replace(/<[^>]+>/g, '').replace(/^שורה \d+: /, '') : 'השורה עוברת, אבל לא עושה את מה שרצינו.'), 'bad');
        return false;
      },
      pick(i) {
        if (G.phase !== 'play' || G.level !== 2 || G.built.indexOf(i) >= 0) return;
        G.built.push(i);
        say('', '');
        paint();
      },
      undo() { if (G.level === 2 && G.phase === 'play') { G.built.pop(); paint(); } },
      clear() { if (G.level === 2 && G.phase === 'play') { G.built = []; paint(); } },
      check() {
        if (G.phase !== 'play' || G.level !== 2 || G.built.length !== BUILD.length) return null;
        G.checks++;
        const text = G.built.map((i) => BUILD[i]).join('\n');
        const c = K.execute(text);
        const last = BUILD[G.built[G.built.length - 1]] === '/run/beamOn 3000000';
        const ok = c.stopped === null && c.runs.length === 1 && last && !c.issues.some((q) => q.level === 'error');
        if (ok) { G.mistakes = G.checks - 1; win(); return true; }
        const why = c.issues.find((q) => q.level === 'error');
        say('Geant4 לא מסיים. ' + (why ? why.html.replace(/<[^>]+>/g, '') : !last ? 'מה שבא אחרי /run/beamOn לא משפיע על הריצה.' : 'משהו בסדר לא עובד.'), 'bad');
        return false;
      },
      next() {
        if (G.phase !== 'won') return;
        if (G.level === 2) finish(); else startLevel(G.level + 1);
      },
      restart() { G.points = []; G.stars = 0; startLevel(0); },
      getState() {
        return { level: G.level, phase: G.phase, points: G.points.slice(), stars: G.stars, mistakes: G.mistakes, lines: G.lines.slice(), bad: G.bad, badText: G.badText, fix: G.fix ? { bad: G.fix.bad, right: G.fix.fix[0] } : null, opts: G.opts.slice(), built: G.built.slice(), pool: G.pool.slice(), BUILD: BUILD.slice(), ok: G.ok };
      },
    };
    startLevel(0);
    return api;
  };
})();
