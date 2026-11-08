/* PHY.sims.mcLambdaGame: "לנחש את λ". Each level draws a material (PHY.ch01.MATERIALS) and a cross section
   σ from a list, so that λ = 1/(nσ) is between 15 and 330 mm, then N depths of first interaction
   x = −λ ln(1 − u). We set our guess with a slider (log scale, 5 to 500 mm); the dashed curve
   N·Δx·e^{−x/λ_g}/λ_g of the guess is drawn over the histogram, so a good guess follows the bars.
   Level 1: a thick block, 3000 particles, ±15 %. Level 2: a thin block of thickness L between 0.6λ and
   1.1λ; only the interactions inside are in the histogram, and the number that passed is given; ±15 %.
   Level 3: no histogram; the material card (ρ, A, σ) is given and λ is computed first; ±5 %.
   Points: 3 on the first check, 2 on the second, then 1. Stars from the total: 8-9 → 3, 6-7 → 2, else 1.
   opts: {rng, chapter, section, onDone}. Actions: setGuess(mm), check(), next(), restart().
   getState(): {level, phase, points, stars, guess, truth, tol, err, checks, L, passed, material, sigma}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01;
  const NAMES = ['שלב 1: לפי העין', 'שלב 2: בלוק דק', 'שלב 3: קודם מחשבים'];
  const TOL = [0.15, 0.15, 0.05];
  const SIGMAS = [0.5, 1, 2, 3, 5];
  const NPART = [3000, 3000, 0];

  PHY.sims.mcLambdaGame = function (canvasEl, controlsEl, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const plot = PL.create(canvasEl, { x: [0, 100], y: [0, 100], xLabel: 'עומק', xUnit: 'mm', yLabel: 'אינטראקציות ראשונות', yColor: 'neutron', aspect: 1.5, minHeight: 260, maxHeight: 420 });
    const view = plot.view;
    const G = { level: 0, points: [], checks: 0, phase: 'play', stars: 0, guess: 50, err: null, mat: null, sigma: 1, lam: 50, L: Infinity, D: null, counts: [], dx: 1, passed: 0, X: 100 };

    const combos = [];
    K.MATERIALS.forEach(function (m) {
      SIGMAS.forEach(function (s) {
        const lam = K.lambdaMm(K.numberDensity(m.rho, m.A), s);
        if (lam >= 15 && lam <= 330) combos.push({ m, s, lam });
      });
    });

    const hud = controlsEl ? U.GameHud(controlsEl, NAMES) : null;
    let slider = null, checkBtn = null, nextBtn = null;
    if (hud) {
      slider = U.Slider(hud.main, { label: 'הניחוש שלנו ל-\\(\\lambda\\)', min: Math.log10(5), max: Math.log10(500), step: 0.005, value: Math.log10(50), format: (v) => K.lamText(Math.pow(10, v)), color: 'var(--accent)', onInput: (v) => api.setGuess(Math.pow(10, v)) });
      const row = U.h('div', { class: 'btn-row' });
      hud.main.appendChild(row);
      checkBtn = U.Button(row, 'בדיקה', () => api.check(), { primary: true });
      nextBtn = U.Button(row, 'לשלב הבא', () => api.next(), { primary: true });
      U.renderMath(hud.main);
    }

    function startLevel(i) {
      G.level = i; G.checks = 0; G.phase = 'play'; G.err = null;
      const c = combos[Math.floor(rng() * combos.length)];
      G.mat = c.m; G.sigma = c.s; G.lam = c.lam;
      G.L = i === 1 ? Math.max(5, Math.round((G.lam * (0.6 + 0.5 * rng())) / 5) * 5) : Infinity;
      const N = NPART[i] || 3000;
      G.D = new Float64Array(N);
      for (let j = 0; j < N; j++) G.D[j] = K.depth(G.lam, rng());
      G.X = i === 1 ? G.L : PL.niceRange(0, G.lam * (2.6 + 2.2 * rng()))[1];
      const h = K.hist(G.D, N, 0, G.X, 30);
      G.counts = h.counts; G.dx = h.dx; G.passed = i === 1 ? h.over : 0;
      plot.setRange({ x: [0, G.X], y: [0, PL.niceRange(0, 1.18 * Math.max.apply(null, G.counts.concat([1])))[1]] });
      G.guess = 50;
      if (slider) slider.set(Math.log10(G.guess));
      if (hud) {
        const card = G.mat.name + ': \\(\\rho = ' + G.mat.rho + '\\ \\text{g/cm}^3\\), \\(A = ' + G.mat.A + '\\ \\text{g/mol}\\)' + (G.mat.key === 'LiF' ? ' (ליחידת LiF)' : G.mat.key === 'HDPE' ? ' (ליחידת CH₂)' : '') + ', \\(\\sigma = ' + G.sigma + '\\ \\text{b}\\).';
        const task = [
          '\\(N = 3000\\) חלקיקים נכנסו לבלוק עבה של ' + G.mat.name + '. איזה \\(\\lambda\\) מתאים להיסטוגרמה? העקומה המקווקוות היא הניחוש שלנו.',
          'הפעם הבלוק דק: \\(L = ' + G.L + '\\ \\text{mm}\\). מתוך 3000 חלקיקים, <b>' + G.passed + '</b> עברו בלי אינטראקציה. מה \\(\\lambda\\)?',
          'בלי היסטוגרמה. ' + card + ' מה המרחק החופשי הממוצע? צריך לדייק ל-5%.',
        ][i];
        hud.setTask(task);
        hud.say('', '');
        hud.paint(i, G.points, false);
        hud.showMain();
        checkBtn.hidden = false; nextBtn.hidden = true;
      }
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
        const words = ['', 'כוכב אחד. הדעיכה עוד מטעה את העין, וזה בסדר: עוד סיבוב.', 'שני כוכבים. עוד סיבוב, והשיפוע ייכנס לאצבעות.', 'שלושה כוכבים. ככה קוראים היסטוגרמה של Geant4.'];
        hud.showFinal(G.stars, words[G.stars], () => api.restart());
      }
      if (opts.onDone) opts.onDone(G.stars);
    }

    function render() {
      view.clear();
      plot.axes();
      const show = G.level < 2 || G.phase !== 'play';
      if (show) {
        K.bars(plot, 0, G.dx, G.counts, { color: 'neutron', alpha: 0.5 });
        const N = G.D.length, xs = [], gs = [], ts = [];
        for (let i = 0; i <= 150; i++) {
          const x = (G.X * i) / 150; xs.push(x);
          gs.push((N * G.dx * Math.exp(-x / G.guess)) / G.guess);
          ts.push((N * G.dx * Math.exp(-x / G.lam)) / G.lam);
        }
        if (G.phase === 'won' || G.phase === 'final') {
          plot.line(xs, ts, { color: 'good', width: 2.4 });
          if (G.lam < G.X) plot.vline(G.lam, { color: 'good', dash: [4, 3], label: 'λ', labelAt: 'top' });
        }
        if (G.level < 2 || G.phase !== 'play') plot.line(xs, gs, { color: 'accent', width: 2.2, dash: [7, 5] });
      } else {
        K.mark(view, plot.X(G.X / 2), plot.Y(plot.range.y[1] / 2));
      }
      if (G.level === 1) K.clock(view, 'עברו: ' + F.num(G.passed, 0) + ' מתוך ' + F.num(3000, 0));
      else if (G.err !== null && G.phase === 'play') K.clock(view, 'מרחק מהאמת: ' + F.unit(100 * G.err, '%', 0));
    }

    const loop = PHY.SimLoop({ view, step() {}, render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { api.restart(); },
      setParam(key, v) { if (key === 'guess') api.setGuess(v); },
      setGuess(mm) {
        if (G.phase !== 'play') return;
        G.guess = Math.max(5, Math.min(500, mm));
        if (slider) slider.set(Math.log10(G.guess));
        loop.requestRender();
      },
      check() {
        if (G.phase !== 'play') return null;
        G.checks++;
        G.err = Math.abs(G.guess - G.lam) / G.lam;
        if (G.err <= TOL[G.level] + 1e-9) {
          G.phase = 'won';
          G.points[G.level] = Math.max(1, 4 - G.checks);
          if (hud) {
            hud.say('בול. ' + F.ltr('λ = ' + K.lamText(G.lam)) + '. ' + ['', 'נקודה אחת.', 'שתי נקודות.', 'שלוש נקודות.'][G.points[G.level]], 'good');
            hud.paint(G.level, G.points, false);
            checkBtn.hidden = true; nextBtn.hidden = false;
            nextBtn.textContent = G.level === 2 ? 'לתוצאה' : 'לשלב הבא';
          }
        } else if (hud) {
          const dir = G.guess < G.lam ? 'λ ארוך יותר: החלקיקים מגיעים עמוק יותר' : 'λ קצר יותר: הדעיכה מהירה יותר';
          hud.say('עוד לא. ' + dir + (G.err > 0.5 ? ', ועוד רחוק.' : ', וכבר קרוב.'), 'bad');
        }
        loop.requestRender();
        return G.err;
      },
      next() {
        if (G.phase !== 'won') return;
        if (G.level === 2) finish(); else startLevel(G.level + 1);
      },
      restart() { G.points = []; G.stars = 0; startLevel(0); },
      getState() {
        return { level: G.level, phase: G.phase, points: G.points.slice(), stars: G.stars, guess: G.guess, truth: G.lam, tol: TOL[G.level], err: G.err, checks: G.checks, L: G.L, passed: G.passed, N: G.D.length, material: G.mat.key, sigma: G.sigma, counts: G.counts.slice(), dx: G.dx };
      },
    };
    startLevel(0);
    return api;
  };
})();
