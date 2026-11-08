/* PHY.sims.srcGame: "לכוון את המקור". Each level hides a source setting (Emin, Emax, half-angle) drawn at
   random and shows its N_shot and ⟨E⟩; we move the sliders until both match (N_shot within 3 %, ⟨E⟩ within
   2 %). Level 1: only the cone (the energy range is 1.85-13 MeV). Level 2: Emin and the cone (Emax = 13).
   Level 3: Emin, Emax and the cone. The canvas shows the spectrum with our range and the cone next to the
   target's. Points: 3 on the first check, 2 on the second, then 1; stars 8-9 → 3, 6-7 → 2, else 1.
   opts: {rng, chapter, section, onDone}. Actions: set(key, v), check(), next(), restart().
   getState(): {level, phase, points, stars, target: {Emin, Emax, deg, nShot, meanE}, mine: {...}, ok, checks}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K5 = PHY.ch05;
  const NAMES = ['שלב 1: קונוס', 'שלב 2: קונוס ו-Emin', 'שלב 3: הכול'];
  const TOL_N = 0.03, TOL_E = 0.02;

  PHY.sims.srcGame = function (canvasEl, controlsEl, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const P = PL.create(canvasEl, { x: [0, 14], y: [8, 13], margin: { l: 40, r: 12, t: 30, b: 36 }, xLabel: 'אנרגיית הפרוטון', xUnit: 'MeV', yLabel: 'log₁₀ f', yColor: 'proton', aspect: 1.5, minHeight: 260, maxHeight: 400 });
    const view = P.view;
    const G = { level: 0, points: [], checks: 0, phase: 'play', stars: 0, target: null, mine: { Emin: 1.85, Emax: 13, deg: 20 }, ok: null };

    const describe = (s) => ({ Emin: s.Emin, Emax: s.Emax, deg: s.deg, nShot: K5.nShot(s.Emin, s.Emax, s.deg), meanE: K5.meanE(s.Emin, s.Emax) });
    const hud = controlsEl ? U.GameHud(controlsEl, NAMES) : null;
    let sl = {}, readouts = null, checkBtn = null, nextBtn = null;
    if (hud) {
      readouts = U.Readouts(hud.main, [
        { key: 'n', label: 'שלנו: פרוטונים לירייה, ב-' + F.ltr('10¹¹'), color: 'var(--c-proton)' },
        { key: 'e', label: 'שלנו: האנרגיה הממוצעת (MeV)', color: 'var(--c-proton)' },
      ]);
      const grid = U.h('div', { class: 'sim-grid' });
      hud.main.appendChild(grid);
      sl.deg = U.Slider(grid, { label: 'חצי זווית הקונוס', min: 5, max: 40, step: 0.5, value: 20, format: (v) => F.deg(v, 1), color: 'var(--accent)', onInput: (v) => api.set('deg', v) });
      sl.Emin = U.Slider(grid, { label: 'Emin', min: 0.5, max: 6, step: 0.05, value: 1.85, unit: 'MeV', digits: 2, color: 'var(--c-proton)', onInput: (v) => api.set('Emin', v) });
      sl.Emax = U.Slider(grid, { label: 'Emax', min: 4, max: 13, step: 0.1, value: 13, unit: 'MeV', digits: 1, color: 'var(--c-proton)', onInput: (v) => api.set('Emax', v) });
      const row = U.h('div', { class: 'btn-row' });
      hud.main.appendChild(row);
      checkBtn = U.Button(row, 'בדיקה', () => api.check(), { primary: true });
      nextBtn = U.Button(row, 'לשלב הבא', () => api.next(), { primary: true });
      U.renderMath(hud.main);
    }
    function paint() {
      if (!readouts) return;
      const m = describe(G.mine);
      readouts.set('n', F.num(m.nShot / 1e11, 2));
      readouts.set('e', F.num(m.meanE, 2));
    }
    function enable() {
      if (!hud) return;
      const play = G.phase === 'play';
      sl.deg.setEnabled(play);
      sl.Emin.setEnabled(play && G.level >= 1);
      sl.Emax.setEnabled(play && G.level >= 2);
    }
    const r2 = (v, s) => Math.round(v / s) * s;
    function startLevel(i) {
      G.level = i; G.checks = 0; G.phase = 'play'; G.ok = null;
      const t = { Emin: 1.85, Emax: 13, deg: r2(8 + 24 * rng(), 0.5) };
      if (i >= 1) t.Emin = r2(1 + 3 * rng(), 0.05);
      if (i >= 2) t.Emax = r2(7 + 6 * rng(), 0.1);
      if (Math.abs(t.deg - 20) < 1.5) t.deg += 4;
      G.target = describe(t);
      G.mine = { Emin: 1.85, Emax: 13, deg: 20 };
      if (hud) {
        sl.deg.set(20); sl.Emin.set(1.85); sl.Emax.set(13);
        const tN = F.num(G.target.nShot / 1e11, 2), tE = F.num(G.target.meanE, 2);
        const what = ['רק את זווית הקונוס', 'את Emin ואת זווית הקונוס', 'את Emin, את Emax ואת זווית הקונוס'][i];
        hud.setTask('המקור שלנו צריך לתת \\(' + tN + '\\times10^{11}\\) פרוטונים לירייה, עם אנרגיה ממוצעת של ' + tE + ' MeV. מכוונים ' + what + '.');
        hud.say('', '');
        hud.paint(i, G.points, false);
        hud.showMain();
        checkBtn.hidden = false; nextBtn.hidden = true;
      }
      enable(); paint(); loop.requestRender();
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
        const words = ['', 'כוכב אחד. הקונוס והטווח עוד מתערבבים, וזה בסדר: עוד סיבוב.', 'שני כוכבים. עוד סיבוב, וה-Emin יסתדר לבד.', 'שלושה כוכבים. ככה מכוונים מקור לפני ריצה.'];
        hud.showFinal(G.stars, words[G.stars], () => api.restart());
      }
      if (opts.onDone) opts.onDone(G.stars);
    }
    function render() {
      view.clear();
      P.axes();
      const xs = [], ys = [];
      for (let i = 0; i <= 260; i++) { const E = 0.5 + (12.5 * i) / 260; xs.push(E); ys.push(Math.log10(K5.spec(E))); }
      const band = (lo, hi, color, alpha) => { const a = [], b = []; xs.forEach((E, i) => { if (E >= lo && E <= hi) { a.push(E); b.push(ys[i]); } }); P.fill(a, b, { color, alpha, base: 8 }); };
      if (G.phase !== 'play') band(G.target.Emin, G.target.Emax, 'ink', 0.12);
      band(G.mine.Emin, G.mine.Emax, 'proton', 0.22);
      P.line(xs, ys, { color: 'proton', width: 2.2 });
      if (G.phase !== 'play') {
        P.vline(G.target.Emin, { color: 'ink', dash: [3, 3] });
        P.vline(G.target.Emax, { color: 'ink', dash: [3, 3] });
      }
      /* the cone, small, in the top-right corner */
      const cx = P.X(10.5), cy = P.Y(12.2), L = 60;
      const draw = (deg, color, dash) => {
        const a = (deg * Math.PI) / 180, ctx = view.ctx;
        ctx.save(); ctx.strokeStyle = C[color]; ctx.lineWidth = 2; if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(cx + L * Math.cos(a), cy - L * Math.sin(a)); ctx.lineTo(cx, cy); ctx.lineTo(cx + L * Math.cos(a), cy + L * Math.sin(a)); ctx.stroke(); ctx.restore();
      };
      draw(G.mine.deg, 'proton');
      view.screenText(cx - 6, cy, 'קונוס', { size: 11, weight: 700, color: C.muted, align: 'right', halo: true });
      if (G.phase !== 'play') draw(G.target.deg, 'ink', [4, 3]);
      K.clock(view, G.phase === 'play' ? 'מכוונים' : 'פגיעה');
    }
    const loop = PHY.SimLoop({ view, step() {}, render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { api.restart(); },
      setParam(k, v) { api.set(k, v); },
      set(k, v) {
        if (G.phase !== 'play') return;
        if (k === 'Emin' && G.level < 1) return;
        if (k === 'Emax' && G.level < 2) return;
        G.mine[k] = v;
        if (G.mine.Emin > G.mine.Emax - 0.5) G.mine.Emin = G.mine.Emax - 0.5;
        if (sl[k]) sl[k].set(G.mine[k]);
        paint(); loop.requestRender();
      },
      check() {
        if (G.phase !== 'play') return null;
        G.checks++;
        const m = describe(G.mine), t = G.target;
        const eN = Math.abs(m.nShot - t.nShot) / t.nShot, eE = Math.abs(m.meanE - t.meanE) / t.meanE;
        G.ok = eN <= TOL_N + 1e-9 && eE <= TOL_E + 1e-9;
        if (G.ok) {
          G.phase = 'won';
          G.points[G.level] = Math.max(1, 4 - G.checks);
          if (hud) {
            hud.say('בול. ' + ['', 'נקודה אחת.', 'שתי נקודות.', 'שלוש נקודות.'][G.points[G.level]], 'good');
            hud.paint(G.level, G.points, false);
            checkBtn.hidden = true; nextBtn.hidden = false;
            nextBtn.textContent = G.level === 2 ? 'לתוצאה' : 'לשלב הבא';
          }
        } else if (hud) {
          let msg;
          if (eE > TOL_E) msg = m.meanE < t.meanE ? 'האנרגיה הממוצעת נמוכה מדי: הטווח צריך לזוז למעלה.' : 'האנרגיה הממוצעת גבוהה מדי: הטווח צריך לזוז למטה.';
          else msg = m.nShot < t.nShot ? 'האנרגיה בסדר, אבל חסרים פרוטונים: הקונוס צר מדי.' : 'האנרגיה בסדר, אבל יש יותר מדי פרוטונים: הקונוס רחב מדי.';
          hud.say('עוד לא. ' + msg, 'bad');
        }
        enable(); loop.requestRender();
        return G.ok;
      },
      next() { if (G.phase !== 'won') return; if (G.level === 2) finish(); else startLevel(G.level + 1); },
      restart() { G.points = []; G.stars = 0; startLevel(0); },
      getState() { return { level: G.level, phase: G.phase, points: G.points.slice(), stars: G.stars, target: Object.assign({}, G.target), mine: Object.assign({}, G.mine), ok: G.ok, checks: G.checks }; },
    };
    startLevel(0);
    return api;
  };
})();
