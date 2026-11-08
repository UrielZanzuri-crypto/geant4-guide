/* Chapter 1: the Monte Carlo sims, measured against the formulas. Runs inside tests/physics.html?only=01.
   Every check reads what the sims sampled (depths, counts, steps, tracks), not the parameters passed in. */
PHY_T.load(['ch01/kit.js', 'ch01/mc-runs.js', 'ch01/mc-slab.js', 'ch01/mc-step.js', 'ch01/mc-event.js', 'ch01/mc-converge.js', 'ch01/mc-darts.js', 'ch01/mc-lambda-game.js', 'ch01/mc-compare.js', 'ch01/mc-threads.js', 'ch01/mc-zero.js']);

PHY_T.add(async function (T) {
  var S = PHY.sims, K = PHY.ch01;
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var meanOf = function (a) { return sum(a) / a.length; };
  var sdOf = function (a) { var m = meanOf(a); return Math.sqrt(a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1)); };

  await T.test('פרק 1: הערכה, חתך פעולה ודגימות', async function () {
    var nBe = K.numberDensity(1.848, 9.012);
    T.rel('Be: n = ρN_A/A (cm⁻³)', 1.235e23, nBe, 1e-3);
    T.rel('Pb: n (cm⁻³)', 3.30e22, K.numberDensity(11.35, 207.2), 2e-3);
    T.rel('Be, 1 b: λ = 1/(nσ) (mm)', 81.0, K.lambdaMm(nBe, 1), 2e-3);
    T.rel('Be, 0.5 b: λ (cm)', 16.2, K.lambdaMm(nBe, 0.5) / 10, 2e-3);
    T.rel('Pb, 2 b: λ (mm)', 151.6, K.lambdaMm(K.numberDensity(11.35, 207.2), 2), 2e-3);
    var r = PHY.random(3).next, a = [];
    for (var i = 0; i < 3000; i++) a.push(K.binomial(3e6, 4.47e-4, r));
    T.near('בינומי (3×10⁶, 4.47×10⁻⁴): ממוצע 1341', 1341, meanOf(a), 3 * 36.6 / Math.sqrt(3000) + 0.5);
    T.rel('ופיזור √1341 = 36.6', 36.6, sdOf(a), 0.05);
    var z = 0;
    for (i = 0; i < 20000; i++) if (K.poisson(1, r) === 0) z++;
    T.near('פואסון עם μ = 1: P(0) = e⁻¹', Math.exp(-1), z / 20000, 0.012);
    var b = [];
    for (i = 0; i < 4000; i++) b.push(K.binomial(400, 0.25, r));
    T.near('בינומי מדויק (400, 0.25): ממוצע', 100, meanOf(b), 0.6);
    T.rel('ופיזור √(np(1−p))', Math.sqrt(75), sdOf(b), 0.05);
  });

  await T.test('פרק 1: הפתיחה, ריצות חוזרות', async function () {
    var s = T.make(S.mcRuns, { N: 3e6, p: 4.47e-4, first: 1341, runs: 20, locked: true });
    T.same('לפני הריצה: רק ריצה 1 מוצגת', 1, s.getState().shown);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('20 ריצות', 20, q.counts.length);
    T.same('ריצה 1 היא הנתונה', 1341, q.counts[0]);
    var all = q.counts.slice(1);
    for (var k = 0; k < 25; k++) all = all.concat(s.batch());
    T.near('ממוצע של 519 ריצות ≈ 1341', 1341, meanOf(all), 3 * 36.6 / Math.sqrt(all.length));
    T.rel('סטיית התקן בין הריצות ≈ √1341', 36.6, sdOf(all), 0.1);
    s.setParam('sameSeed', true);
    var a = s.batch(), b = s.batch();
    T.same('אותו זרע: כל הריצות זהות', 0, sdOf(a));
    T.same('אותו זרע: שתי סדרות זהות', a.join(','), b.join(','));
    s.setParam('sameSeed', false);
    T.truthy('זרע חדש: ריצות שונות', sdOf(s.batch()) > 5);
  });

  await T.test('פרק 1: עומק האינטראקציה הראשונה', async function () {
    var s = T.make(S.mcSlab, { mode: 'card', material: 'Be', sigma: 1, N: 2000, X: 300, seed: 7, locked: true });
    T.same('לפני הריצה: ההיסטוגרמה ריקה', 0, sum(s.getState().counts));
    await T.run(s.play(1));
    var q = s.getState();
    T.rel('λ של Be עם 1 b (mm)', 81.0, q.lambda, 2e-3);
    T.near('העומק הממוצע שנדגם ≈ λ (mm)', q.lambda, q.mean, 3 * q.lambda / Math.sqrt(q.N));
    T.rel('שגיאת הממוצע ≈ λ/√N', q.lambda / Math.sqrt(q.N), q.err, 0.1);
    var chi = 0, nb = q.counts.length;
    for (var i = 0; i < nb; i++) {
      var x0 = i * q.dx, e = q.N * (Math.exp(-x0 / q.lambda) - Math.exp(-(x0 + q.dx) / q.lambda));
      chi += (q.counts[i] - e) * (q.counts[i] - e) / Math.max(e, 1);
    }
    T.truthy('ההיסטוגרמה מתאימה ל-e^{−x/λ} (χ² < 2·bins)', chi < 2 * nb);
    T.truthy('העמודה הראשונה היא הגבוהה ביותר', q.counts[0] === Math.max.apply(null, q.counts));
    T.near('עמוק מהציור: e^{−300/81}', Math.exp(-300 / q.lambda), q.over / q.N, 3 * Math.sqrt(Math.exp(-300 / q.lambda) / q.N) + 0.002);
    var t = T.make(S.mcSlab, { mode: 'card', material: 'Be', sigma: 1, N: 2000, X: 300, seed: 7, locked: false });
    T.same('אותו זרע: אותה היסטוגרמה', q.counts.join(','), t.getState().counts.join(','));
    s.setParam('sigma', 2);
    T.rel('σ פי 2: λ ועומק ממוצע קצרים פי 2', q.mean / 2, s.getState().mean, 1e-9);

    var lab = T.make(S.mcSlab, { mode: 'lab', material: 'Be', sigma: 1, N: 3000, d: 2, seed: 99 });
    lab.setParam('material', 'Pb'); lab.setParam('sigma', 2); lab.setParam('N', 100000);
    q = lab.getState();
    T.rel('מעבדה, Pb ו-2 b: λ (mm)', 151.6, q.lambda, 2e-3);
    T.near('10⁵ חלקיקים: ממוצע ≈ λ', q.lambda, q.mean, 3 * q.lambda / Math.sqrt(1e5));
    lab.setParam('d', 20);
    q = lab.getState();
    T.near('נבלעו לפני 20 mm: 1 − e^{−d/λ}', q.fracDTrue, q.fracD, 3 * Math.sqrt(q.fracDTrue * (1 - q.fracDTrue) / 1e5));
    lab.setParam('material', 'Be'); lab.setParam('sigma', 0.5); lab.setParam('d', 2);
    q = lab.getState();
    T.near('שכבה דקה: החלק ≈ d/λ = 1.23%', 0.0123, q.fracD, 3 * Math.sqrt(0.0123 / 1e5));
  });

  await T.test('פרק 1: הצעד, ההצעה הקצרה מנצחת', async function () {
    var s = T.make(S.mcStep, { locked: true, rng: PHY.random(42).next });
    await T.run(s.play(1));
    var st = s.getState().steps;
    T.same('צעד 1: הגבול ניצח', 'Transportation', st[0].proc);
    T.near('צעד 1: 20 mm', 20, st[0].len, 1e-9);
    T.same('צעד 1: נגמר בכניסה ל-B', 'B', st[0].post);
    T.near('נשאר לאלסטי 0.3 λ', 0.3, s.getState().nLeft.el, 1e-9);
    T.near('נשאר ללא-אלסטי 0.5 λ', 0.5, s.getState().nLeft.inel, 1e-9);
    var r2 = s.stepNow();
    T.same('צעד 2: פיזור אלסטי', 'hadElastic', r2.proc);
    T.near('צעד 2: 0.3·25 = 7.5 mm', 7.5, r2.len, 1e-9);
    T.near('ההצעה הלא-אלסטית ב-B: 0.5·100', 50, r2.prop.inel, 1e-9);
    var r3 = s.stepNow();
    T.same('צעד 3: יציאה דרך הדופן העליונה', 'Transportation', r3.proc);
    T.near('צעד 3: 15/sin 40° (mm)', 15 / Math.sin(40 * Math.PI / 180), r3.len, 1e-6);
    var r4 = s.stepNow();
    T.same('צעד 4: יציאה מהעולם', 'OutOfWorld', r4.end);
    T.same('המסלול נגמר', false, s.getState().alive);
    var bad = 0, nsteps = 0;
    for (var k = 0; k < 150; k++) {
      s.newTrack();
      for (var g = 0; g < 60 && s.getState().alive; g++) {
        var rec = s.stepNow();
        nsteps++;
        if (Math.abs(rec.len - Math.min(rec.prop.el, rec.prop.inel, rec.prop.geom)) > 1e-9) bad++;
      }
    }
    T.same('בכל ' + nsteps + ' הצעדים: האורך הוא ההצעה הקצרה', 0, bad);
    var r = PHY.random(9).next, L = [], el = 0;
    for (var i = 0; i < 20000; i++) { var c = K.compete([50, 200], r); L.push(c.len); if (c.which === 0) el++; }
    T.near('שני תהליכים: λ משותף 1/(1/50 + 1/200) = 40 mm', 40, meanOf(L), 3 * 40 / Math.sqrt(20000));
    T.near('האלסטי מנצח ב-200/250 מהמקרים', 0.8, el / 20000, 0.01);
  });

  await T.test('פרק 1: מסלולים ואירוע', async function () {
    var s = T.make(S.mcEvent, { locked: true });
    T.same('לפני הריצה אין מסלולים', 0, s.getState().nTracks);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('חמישה מסלולים', 5, q.nTracks);
    T.same('הורים: 0, 1, 1, 1, 3', '0,1,1,1,3', q.tracks.map(function (t) { return t.parent; }).join(','));
    T.same('יוצרים', ',protonInelastic,protonInelastic,protonInelastic,compt', q.tracks.map(function (t) { return t.creator; }).join(','));
    T.same('הסדר מהמחסנית: אחרון נכנס, ראשון יוצא', '1,4,3,5,2', q.order.join(','));
    T.same('סך הצעדים הוא סכום הצעדים של המסלולים', q.nSteps, sum(q.tracks.map(function (t) { return t.steps; })));
    T.same('21 צעדים באירוע הסכמטי', 21, q.nSteps);
    T.same('האירוע נגמר', true, q.done);
  });

  await T.test('פרק 1: השגיאה יורדת כמו 1/√N', async function () {
    var s = T.make(S.mcConverge, { mode: 'card', locked: true, seed: 11 });
    await T.run(s.play(1));
    var q = s.getState();
    T.near('שגיאה יחסית ב-10⁴: כ-10%', 0.1, q.relAt(1e4), 0.025);
    T.near('שגיאה יחסית ב-10⁶: כ-1%', 0.01, q.relAt(1e6), 0.0012);
    T.near('יחס השגיאות בין 10⁴ ל-10⁶: פי 10', 10, q.errAt(1e4) / q.errAt(1e6), 1.2);
    [1e4, 1e5, 1e6].forEach(function (N) {
      T.rel('σ·√N ≈ √(p(1−p)) ב-N = ' + N, Math.sqrt(0.01 * 0.99), q.errAt(N) * Math.sqrt(q.NAt(N)), 0.15);
    });
    T.near('ההערכה ב-10⁶ בתוך 4σ מ-1%', 0.01, q.estAt(1e6), 4 * Math.sqrt(0.01 * 0.99 / 1e6));
    var est1 = q.est.join(',');
    s.setParam('sameSeed', true);
    T.same('אותו זרע: אותה עקומה בדיוק', est1, s.runNow().est.join(','));
    s.setParam('sameSeed', false);
    T.truthy('זרע אחר: עקומה אחרת', s.runNow().est.join(',') !== est1);
    var t = T.make(S.mcConverge, { mode: 'trap', locked: true, seed: 21 });
    await T.run(t.play(1));
    q = t.getState();
    T.near('מלכודת 1: התפוקה ב-10⁸ ≈ 4.47×10⁻⁴', 4.47e-4, q.estAt(1e8), 4 * Math.sqrt(4.47e-4 / 1e8));
    T.near('ושגיאה קטנה פי 10 מ-10⁶', 0.1, q.errAt(1e8) / q.errAt(1e6), 0.015);
    T.near('שגיאה יחסית ב-10⁶: 1/√447', 1 / Math.sqrt(447), q.relAt(1e6), 0.008);
  });

  await T.test('פרק 1: π בחיצים', async function () {
    var s = T.make(S.mcDarts, { N: 1000, seed: 5, locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.near('1000 חיצים: שגיאה ≈ 4√(f(1−f)/N)', 0.052, q.err, 0.004);
    T.near('ההערכה בתוך 4σ מ-π', Math.PI, q.pi, 4 * 0.052);
    s.setParam('N', 100000);
    q = s.getState();
    T.near('10⁵ חיצים: בתוך 4σ מ-π', Math.PI, q.pi, 4 * 4 * Math.sqrt(0.785 * 0.215 / 1e5));
    T.near('ושגיאה קטנה פי 10', 0.0052, q.err, 0.0004);
  });

  await T.test('פרק 1: המשחק, משחק מושלם', async function () {
    var seeds = [1, 7, 2024];
    for (var i = 0; i < seeds.length; i++) {
      var g = T.make(S.mcLambdaGame, { rng: PHY.random(seeds[i]).next });
      for (var lv = 0; lv < 3; lv++) {
        var st = g.getState();
        T.same('זרע ' + seeds[i] + ': שלב ' + (lv + 1), lv, st.level);
        var mat = K.material(st.material);
        T.rel('זרע ' + seeds[i] + ': λ של השלב מ-ρ, A ו-σ', K.lambdaMm(K.numberDensity(mat.rho, mat.A), st.sigma), st.truth, 1e-9);
        if (lv === 1) T.near('שלב 2: מספר העוברים ≈ N e^{−L/λ}', 3000 * Math.exp(-st.L / st.truth), st.passed, 4 * Math.sqrt(3000 * Math.exp(-st.L / st.truth)) + 1);
        g.setGuess(st.truth);
        g.check();
        T.same('זרע ' + seeds[i] + ': ניצחון בבדיקה ראשונה', 'won', g.getState().phase);
        g.next();
      }
      st = g.getState();
      T.same('זרע ' + seeds[i] + ': 9 נקודות, 3 כוכבים', '9,3', sum(st.points) + ',' + st.stars);
    }
  });

  await T.test('פרק 1: המשחק, טעויות עולות נקודות', async function () {
    var g = T.make(S.mcLambdaGame, { rng: PHY.random(5).next, chapter: 'x1', section: 'game' });
    var st = g.getState();
    g.setGuess(st.truth * 1.3); g.check();
    T.same('30% מעל: לא עובר בשלב 1', 'play', g.getState().phase);
    T.near('המרחק היחסי נמדד', 0.3, g.getState().err, 1e-6);
    g.setGuess(st.truth * 0.8); g.check();
    g.setGuess(st.truth * 1.1); g.check();
    T.same('בבדיקה השלישית, בתוך 15%: נקודה אחת', 1, g.getState().points[0]);
    g.next();
    st = g.getState();
    g.setGuess(st.truth * 1.2); g.check();
    T.same('שלב 2: 20% לא מספיק', 'play', g.getState().phase);
    g.setGuess(st.truth); g.check(); g.next();
    st = g.getState();
    g.setGuess(st.truth * 1.08); g.check();
    T.same('שלב 3: 8% לא מספיק', 'play', g.getState().phase);
    g.setGuess(st.truth * 1.04); g.check();
    T.same('שלב 3: 4% עובר', 'won', g.getState().phase);
    g.next();
    st = g.getState();
    T.same('1 + 2 + 2 = 5 נקודות: כוכב אחד', '5,1', sum(st.points) + ',' + st.stars);
    T.same('הכוכבים נשמרו', 1, PHY.progress.chapter('x1').game);
    T.same('הסעיף סומן', true, PHY.progress.hasSection('x1', 'game'));
  });

  await T.test('פרק 1: מלכודות', async function () {
    var c = T.make(S.mcCompare, { locked: true });
    await T.run(c.play(1));
    c.simulate(4000);
    var q = c.getState();
    T.near('שני ממירים זהים: A מעל B בערך בחצי', (1 - q.ties / q.n) / 2, q.aWins / q.n, 0.03);
    T.rel('פיזור ההפרש ≈ √(2·450) = 30', 30, q.sdDiff, 0.06);
    T.near('השגיאה של 460: √460', 21.4, q.errA, 0.05);

    var th = T.make(S.mcThreads, { locked: true });
    await T.run(th.play(1));
    q = th.getState();
    T.same('אותו זרע: אותו מספר ב-4 וב-8 הליכים', q.totals.t4, q.totals.t8);
    T.same('ואותה תוצאה לכל אירוע', q.outcomes4.join(','), q.outcomes8.join(','));
    T.truthy('אבל סדר הסיום שונה', q.order4.join(',') !== q.order8.join(','));
    th.setParam('perEvent', false);
    q = th.getState();
    T.truthy('בלי זרע לכל אירוע: התוצאה תלויה בהליך', q.outcomes4.join(',') !== q.outcomes8.join(','));

    var z = T.make(S.mcZero, { locked: true });
    await T.run(z.play(1));
    z.simulate(20000);
    q = z.getState();
    T.near('תפוקה 10⁻⁶ ב-10⁶ פרוטונים: אפס ב-e⁻¹ מהריצות', Math.exp(-1), q.fracZero, 0.012);
    T.near('הגבול העליון ב-95%: μ = ln 20', 2.996, q.mu95, 1e-3);
    T.near('ושם הסיכוי לאפס הוא 5%', 0.05, q.p0At(q.mu95), 1e-9);
  });
});
