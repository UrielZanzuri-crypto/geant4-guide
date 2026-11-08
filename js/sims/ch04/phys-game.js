/* PHY.sims.physGame: "לזהות את הרשימה". Each level describes a need; we assemble a reference list from the
   blocks (base, evaluated data, EM) and check it. The canvas draws the assembled list with
   PHY.ch04.drawList and the energy of the need.
   Level 1: a light converter (LiF, Be or Li) with protons up to 13 MeV: QGSP_BIC + _AllHP + _EMZ (the proton
     data below 20 MeV, and the low-energy stopping power that the thick-target yield depends on).
   Level 2: Pb with protons up to 102 MeV, the neutrons go on to a moderator: QGSP_BIC with _HP or _AllHP
     (the combination the project validated for Pb; neutrons below 20 MeV need G4NDL).
   Level 3: neutrons slowing down to thermal energies in HDPE: any base with _HP or _AllHP.
   Points: 3 on the first check, 2 on the second, then 1. Stars from the total: 8-9 → 3, 6-7 → 2, else 1.
   opts: {rng, chapter, section, onDone}. Actions: setChoice(slot, value), check(), next(), restart().
   getState(): {level, phase, points, stars, name, ok, answer, variant, checks}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;
  const NAMES = ['שלב 1: ממיר קל', 'שלב 2: עופרת', 'שלב 3: מאט'];

  const LEVELS = [
    {
      variants: ['LiF בעובי 2 mm', 'Be בעובי 2 mm', 'Li בעובי 4 mm'],
      task: (v) => 'ממיר ' + v + ', פרוטונים מספקטרום HERMIONE עד 13 MeV, וסופרים נייטרונים לפרוטון. איזו רשימה?',
      marker: 13, markerLabel: 'פרוטון, ' + F.unit(13, 'MeV', 0),
      answer: { base: 'QGSP_BIC', data: 'AllHP', em: 'EMZ' },
      judge(c) {
        if (c.data !== 'AllHP') return 'בלי ' + F.ltr('_AllHP') + ' פרוטון של ' + F.unit(13, 'MeV', 0) + ' עובר למודל הקסקדה, ובממיר קל זה כמעט אפס נייטרונים.';
        if (c.em !== 'EMZ') return 'כמעט. התפוקה בממיר עבה הולכת כמו ' + F.ltr('1/S') + ', ולכן צריך את עוצמת העצירה המדויקת באנרגיה נמוכה: ' + F.ltr('_EMZ') + '.';
        return null;
      },
    },
    {
      variants: ['בעובי 16 mm', 'בעובי 10 mm'],
      task: (v) => 'פרוטונים עד 102 MeV (ELIMAIA) על ממיר Pb ' + v + ', והנייטרונים ממשיכים אחר כך למאט. איזו רשימה?',
      marker: 100, markerLabel: 'פרוטון, ' + F.unit(100, 'MeV', 0),
      answer: { base: 'QGSP_BIC', data: 'HP', em: 'EMZ' },
      judge(c) {
        if (c.data !== 'HP' && c.data !== 'AllHP') return 'הנייטרונים מתחת ל-' + F.unit(20, 'MeV', 0) + ' צריכים את הנתונים של ' + F.ltr('G4NDL') + ' כדי להאט נכון במאט: חסר ' + F.ltr('_HP') + '.';
        if (c.base !== 'QGSP_BIC') return 'את Pb עם פרוטונים כאלה הפרויקט בדק עם ' + F.ltr('QGSP_BIC') + ', עם ' + F.ltr('_HP') + ' ועם ' + F.ltr('_AllHP') + ', והן מסכימות בתוך כ-10%. רשימה אחרת צריך לאמת מחדש.';
        return null;
      },
    },
    {
      variants: ['HDPE', 'פוליאתילן בעובי 10 cm'],
      task: (v) => 'נייטרונים של 1-2 MeV יוצאים מהממיר, נכנסים למאט ' + v + ' ומאטים עד אנרגיות תרמיות. איזו רשימה?',
      marker: 2.5e-8, markerLabel: 'נייטרון תרמי', markerColor: 'neutron',
      answer: { base: 'QGSP_BIC', data: 'AllHP', em: 'EMZ' },
      judge(c) {
        if (c.data !== 'HP' && c.data !== 'AllHP') return 'בלי ' + F.ltr('_HP') + ' הנייטרון מתחת ל-' + F.unit(20, 'MeV', 0) + ' עובר למודל קסקדה, בלי הנתונים המוערכים שמתארים האטה.';
        return null;
      },
    },
  ];

  PHY.sims.physGame = function (canvasEl, controlsEl, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const AX = K4.listAxis;
    const P = PL.create(canvasEl, { x: [AX.XMIN, AX.XMAX], y: [0, 10.2], grid: false, margin: { l: 12, r: 12, t: 30, b: 34 }, aspect: 1.15, minHeight: 360, maxHeight: 480 });
    const view = P.view;
    const G = { level: 0, points: [], checks: 0, phase: 'play', stars: 0, variant: 0, c: { base: 'FTFP_BERT', data: '', em: '' }, ok: null };

    const hud = controlsEl ? U.GameHud(controlsEl, NAMES) : null;
    let ch = {}, checkBtn = null, nextBtn = null;
    if (hud) {
      const grid = U.h('div', { class: 'sim-grid' });
      hud.main.appendChild(grid);
      ch.base = U.Choice(grid, { label: 'בסיס', options: K4.BASES.map((b) => ({ value: b, text: '<bdi>' + b + '</bdi>' })), value: G.c.base, onChange: (v) => api.setChoice('base', v) });
      ch.data = U.Choice(grid, { label: 'נתונים מוערכים', options: [{ value: '', text: 'בלי' }, { value: 'HP', text: '<bdi>_HP</bdi>' }, { value: 'AllHP', text: '<bdi>_AllHP</bdi>' }], value: G.c.data, onChange: (v) => api.setChoice('data', v) });
      ch.em = U.Choice(grid, { label: 'אלקטרומגנטי', options: [{ value: '', text: 'רגיל' }, { value: 'EMZ', text: '<bdi>_EMZ</bdi>' }], value: G.c.em, onChange: (v) => api.setChoice('em', v) });
      const row = U.h('div', { class: 'btn-row' });
      hud.main.appendChild(row);
      checkBtn = U.Button(row, 'בדיקה', () => api.check(), { primary: true });
      nextBtn = U.Button(row, 'לשלב הבא', () => api.next(), { primary: true });
    }
    const info = () => K4.listInfo(G.c.base, G.c.data, G.c.em);
    function syncAllHP() {
      if (!ch.data) return;
      ch.data.el.querySelectorAll('.choice-btn')[2].disabled = G.c.base !== 'QGSP_BIC' || G.phase !== 'play';
    }
    function syncControls() {
      Object.keys(ch).forEach((k) => { ch[k].set(G.c[k]); ch[k].setEnabled(G.phase === 'play'); });
      syncAllHP();
    }

    function startLevel(i) {
      G.level = i; G.checks = 0; G.phase = 'play'; G.ok = null;
      G.variant = Math.floor(rng() * LEVELS[i].variants.length);
      const starts = [{ base: 'FTFP_BERT', data: '', em: '' }, { base: 'QGSP_INCLXX', data: 'HP', em: '' }, { base: 'QGSP_BIC', data: '', em: 'EMZ' }];
      G.c = Object.assign({}, starts[Math.floor(rng() * starts.length)]);
      if (hud) {
        hud.setTask(LEVELS[i].task(LEVELS[i].variants[G.variant]));
        hud.say('', '');
        hud.paint(i, G.points, false);
        hud.showMain();
        checkBtn.hidden = false; nextBtn.hidden = true;
      }
      syncControls();
      loop.requestRender();
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
        const words = ['', 'כוכב אחד. השם של רשימה עוד מטעה, וזה בסדר: עוד סיבוב.', 'שני כוכבים. עוד סיבוב, והבלוקים יסתדרו לבד.', 'שלושה כוכבים. ככה קוראים שם של רשימת פיזיקה.'];
        hud.showFinal(G.stars, words[G.stars], () => api.restart());
      }
      if (opts.onDone) opts.onDone(G.stars);
    }

    function render() {
      view.clear();
      const L = LEVELS[Math.min(G.level, 2)];
      K4.drawList(P, info(), { reveal: 4, marker: L.marker, markerLabel: L.markerLabel, markerColor: L.markerColor });
      K.clock(view, G.phase === 'won' ? 'מתאים' : 'מה צריך כאן?');
    }

    const loop = PHY.SimLoop({ view, step() {}, render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { api.restart(); },
      setParam(k, v) { api.setChoice(k, v); },
      setChoice(slot, v) {
        if (G.phase !== 'play') return;
        G.c[slot] = v;
        if (slot === 'base' && v !== 'QGSP_BIC' && G.c.data === 'AllHP') G.c.data = 'HP';
        syncControls();
        loop.requestRender();
      },
      check() {
        if (G.phase !== 'play') return null;
        G.checks++;
        const I = info();
        const msg = I.valid ? LEVELS[G.level].judge(G.c) : 'אין רשימת ייחוס בשם הזה.';
        G.ok = msg === null;
        if (G.ok) {
          G.phase = 'won';
          G.points[G.level] = Math.max(1, 4 - G.checks);
          if (hud) {
            hud.say('מתאים: ' + F.ltr(I.name) + '. ' + ['', 'נקודה אחת.', 'שתי נקודות.', 'שלוש נקודות.'][G.points[G.level]], 'good');
            hud.paint(G.level, G.points, false);
            checkBtn.hidden = true; nextBtn.hidden = false;
            nextBtn.textContent = G.level === 2 ? 'לתוצאה' : 'לשלב הבא';
          }
          syncControls();
        } else if (hud) hud.say('עוד לא. ' + msg, 'bad');
        loop.requestRender();
        return G.ok;
      },
      next() {
        if (G.phase !== 'won') return;
        if (G.level === 2) finish(); else startLevel(G.level + 1);
      },
      restart() { G.points = []; G.stars = 0; startLevel(0); },
      getState() {
        return { level: G.level, phase: G.phase, points: G.points.slice(), stars: G.stars, name: info().name, ok: G.ok, answer: Object.assign({}, LEVELS[Math.min(G.level, 2)].answer), variant: G.variant, checks: G.checks, choice: Object.assign({}, G.c) };
      },
    };
    startLevel(0);
    return api;
  };
})();
