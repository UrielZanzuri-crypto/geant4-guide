/* PHY.sims.outNormGame: "לנרמל נכון". Three levels, random numbers every time:
     1  N events, Σw and N_shot are given: neutrons per shot = Σw / N × N_shot
     2  the rows R and their mean weight are given instead of Σw: Σw = R × mean weight
     3  Σw inside a cone cosθ ≥ c is given: neutrons per sr per shot = Σw / (2π (1 − c)) / N × N_shot
   The answer is typed as a decimal in units of 10^k (k from the true value, shown next to the field), within
   ±3 %. A wrong answer is diagnosed when it matches a common slip (rows instead of weights, no division by N,
   no division by the solid angle). The canvas is a log number line with our answer and, once solved, the truth.
   Points: 3 on the first check, 2 on the second, then 1. Stars: 8-9 → 3, 6-7 → 2, else 1.
   opts: {rng, chapter, section, onDone}. Actions: setGuess(value), check(), next(), restart().
   getState(): {level, phase, points, stars, truth, guess, checks, given: {...}, slip}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K1 = PHY.ch01, K = PHY.ch08;
  const NAMES = ['שלב 1: לירייה', 'שלב 2: משורות', 'שלב 3: לסטרדיאן'];
  const NS = [1e6, 2e6, 3e6, 5e6, 1e7];
  const SHOTS = [4.42e11, 6.34e11, 1.28e12];
  const WBAR = [0.15, 0.219, 0.3, 0.45];
  const CUTS = [0.8, 0.9, 0.95];

  PHY.sims.outNormGame = function (canvasEl, controlsEl, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const plot = PL.create(canvasEl, { x: [3, 13], y: [0, 2], grid: false, aspect: 2.6, minHeight: 160, maxHeight: 240, margin: { l: 16, r: 16, t: 34, b: 40 } });
    const view = plot.view;
    const G = { level: 0, points: [], checks: 0, phase: 'play', stars: 0, guess: NaN, truth: 1, k: 0, given: {}, slip: null };

    const hud = controlsEl ? U.GameHud(controlsEl, NAMES) : null;
    let input = null, unitEl = null, checkBtn = null, nextBtn = null;
    if (hud) {
      input = U.h('input', { class: 'num-input', type: 'text', inputmode: 'decimal', autocomplete: 'off', dir: 'ltr', placeholder: '?', 'aria-label': 'התשובה' });
      unitEl = U.h('span', { class: 'num-unit' });
      const field = U.h('div', { class: 'num-field' }, [U.h('label', { text: 'התשובה' }), input, unitEl]);
      hud.main.appendChild(field);
      input.addEventListener('input', function () { const v = F.parse(input.value); G.guess = isNaN(v) ? NaN : v * Math.pow(10, G.k); loop.requestRender(); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') api.check(); });
      const row = U.h('div', { class: 'btn-row' });
      hud.main.appendChild(row);
      checkBtn = U.Button(row, 'בדיקה', () => api.check(), { primary: true });
      nextBtn = U.Button(row, 'לשלב הבא', () => api.next(), { primary: true });
    }

    const pick = (list) => list[Math.floor(rng() * list.length)];
    const tex = (x, d) => '\\(' + K.sciTex(x, d) + '\\)';

    function startLevel(i) {
      G.level = i; G.checks = 0; G.phase = 'play'; G.guess = NaN; G.slip = null;
      const N = pick(NS), shot = pick(SHOTS);
      const p = Math.pow(10, -4 + 1.2 * rng());
      const S = Math.round(p * N);
      let task;
      if (i === 0) {
        G.truth = (S / N) * shot;
        G.given = { N, S, shot };
        task = 'בריצה של ' + tex(N, 0) + ' אירועים, סכום המשקלים בטבלה ' + F.ltr('leak') + ' הוא ' + F.num(S, 0) + '. בירייה יש ' + tex(shot, 2) + ' פרוטונים. כמה נייטרונים יוצאים בירייה אחת?';
      } else if (i === 1) {
        const wb = pick(WBAR);
        const R = Math.round(S / wb);
        G.truth = ((R * wb) / N) * shot;
        G.given = { N, R, wb, shot };
        task = 'בריצה של ' + tex(N, 0) + ' אירועים יש בטבלה ' + F.ltr('leak') + ' ' + F.num(R, 0) + ' שורות, והמשקל הממוצע של שורה הוא ' + F.num(wb, 3) + '. בירייה יש ' + tex(shot, 2) + ' פרוטונים. כמה נייטרונים יוצאים בירייה אחת?';
      } else {
        const c = pick(CUTS);
        const Sb = Math.max(5, Math.round(S * (1 - c) * (0.55 + 0.25 * rng())));
        G.truth = (Sb / (2 * Math.PI * (1 - c)) / N) * shot;
        G.given = { N, Sb, c, shot };
        task = 'בריצה של ' + tex(N, 0) + ' אירועים, סכום המשקלים של השורות עם \\(\\cos\\theta \\ge ' + c + '\\) הוא ' + F.num(Sb, 0) + '. בירייה יש ' + tex(shot, 2) + ' פרוטונים. כמה נייטרונים לסטרדיאן יוצאים בירייה אחת בתוך הקונוס הזה?';
      }
      G.k = Math.floor(Math.log10(G.truth));
      if (hud) {
        hud.setTask(task);
        hud.say('', '');
        hud.paint(i, G.points, false);
        hud.showMain();
        input.value = '';
        input.classList.remove('is-right', 'is-off');
        unitEl.textContent = '×' + K.pow10(G.k) + (i === 2 ? ' sr⁻¹' : '');
        checkBtn.hidden = false; nextBtn.hidden = true;
      }
      plot.setRange({ x: [G.k - 4, G.k + 4] });
      loop.requestRender();
    }

    function diagnose(v) {
      const g = G.given;
      const near = (a) => Math.abs(v / a - 1) < 0.05;
      if (G.level === 1 && near((g.R / g.N) * g.shot)) return 'נראה שספרנו שורות. כל שורה שווה רק את המשקל שלה.';
      if (G.level === 0 && near(g.S * g.shot)) return 'חסרה החלוקה במספר האירועים: סכום המשקלים הוא של כל הריצה.';
      if (G.level === 1 && near(g.R * g.wb * g.shot)) return 'חסרה החלוקה במספר האירועים.';
      if (G.level === 2 && near((g.Sb / g.N) * g.shot)) return 'זה מספר הנייטרונים בקונוס. לסטרדיאן צריך לחלק בזווית המרחבית שלו.';
      if (G.level === 2 && near((g.Sb / (1 - g.c) / g.N) * g.shot)) return 'כמעט: הזווית המרחבית של הקונוס היא ' + F.ltr('2π(1 − cos θ)') + ', כולל ה-' + F.ltr('2π') + '.';
      return null;
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
        const words = ['', 'כוכב אחד. הנרמול עוד מתחמק, וזה בסדר: עוד סיבוב.', 'שני כוכבים. עוד סיבוב, והשרשרת תהיה אוטומטית.', 'שלושה כוכבים. ככה מגיעים מקובץ ROOT למספר לירייה.'];
        hud.showFinal(G.stars, words[G.stars], () => api.restart());
      }
      if (opts.onDone) opts.onDone(G.stars);
    }

    function render() {
      view.clear();
      const b = plot.box, ctx = view.ctx;
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
      ctx.restore();
      K.logAxis(plot, plot.range.x[0], plot.range.x[1], K.pow10);
      view.screenText(b.x + b.w / 2, b.y + b.h + 28, G.level === 2 ? 'נייטרונים לסטרדיאן לירייה' : 'נייטרונים לירייה', { size: 12, weight: 600, color: C.ink });
      const won = G.phase === 'won' || G.phase === 'final';
      if (won) {
        const x = Math.log10(G.truth);
        plot.vline(x, { color: 'good', dash: [5, 4] });
        view.screenText(plot.X(x), b.y + 8, F.sci(G.truth, 2), { size: 12, weight: 700, color: C.good, halo: true });
      }
      if (isFinite(G.guess) && G.guess > 0) {
        const x = Math.max(plot.range.x[0], Math.min(plot.range.x[1], Math.log10(G.guess)));
        plot.marker(x, 0.8, { color: 'accent', r: 6, shape: 'diamond' });
        view.screenText(plot.X(x), plot.Y(0.8) + 18, 'הניחוש שלנו', { size: 11, weight: 600, color: C.accent, halo: true });
      } else if (!won) K1.mark(view, b.x + b.w / 2, b.y + b.h / 2, '?', 24);
    }

    const loop = PHY.SimLoop({ view, step() {}, render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { api.restart(); },
      setParam(key, v) { if (key === 'guess') api.setGuess(v); },
      setGuess(v) {
        if (G.phase !== 'play') return;
        G.guess = v;
        if (input) input.value = F.plain(F.num(v / Math.pow(10, G.k), 3));
        loop.requestRender();
      },
      check() {
        if (G.phase !== 'play') return null;
        if (!isFinite(G.guess)) { if (hud) hud.say('קודם צריך מספר.', 'bad'); return null; }
        G.checks++;
        const ok = U.numClose(String(G.guess), G.truth, 0.03);
        if (input) { input.classList.toggle('is-right', ok); input.classList.toggle('is-off', !ok); }
        if (ok) {
          G.phase = 'won';
          G.points[G.level] = Math.max(1, 4 - G.checks);
          if (hud) {
            hud.say('בול. ' + ['', 'נקודה אחת.', 'שתי נקודות.', 'שלוש נקודות.'][G.points[G.level]], 'good');
            hud.paint(G.level, G.points, false);
            checkBtn.hidden = true; nextBtn.hidden = false;
            nextBtn.textContent = G.level === 2 ? 'לתוצאה' : 'לשלב הבא';
          }
        } else {
          G.slip = diagnose(G.guess);
          if (hud) hud.say('עוד לא. ' + (G.slip || (G.guess > G.truth ? 'יצא גדול מדי.' : 'יצא קטן מדי.')), 'bad');
        }
        loop.requestRender();
        return ok;
      },
      next() {
        if (G.phase !== 'won') return;
        if (G.level === 2) finish(); else startLevel(G.level + 1);
      },
      restart() { G.points = []; G.stars = 0; startLevel(0); },
      getState() { return { level: G.level, phase: G.phase, points: G.points.slice(), stars: G.stars, truth: G.truth, guess: G.guess, checks: G.checks, given: Object.assign({}, G.given), slip: G.slip, k: G.k }; },
    };
    startLevel(0);
    return api;
  };
})();
