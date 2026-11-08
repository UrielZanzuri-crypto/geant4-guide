/* Chapter 8: output and analysis. Runs inside tests/physics.html?only=08.
   The checks read what the sims sampled and drew (rows, weights, histograms, repetitions), and compare them with
   the numbers of the Be 2 mm run (docs/PLAN.md §4) and with the formulas of the chapter. */
PHY_T.load(['ch01/kit.js', 'ch08/kit.js', 'ch08/out-norm.js', 'ch08/out-ntuple.js', 'ch08/out-size.js', 'ch08/out-hist.js', 'ch08/out-err.js', 'ch08/out-weights.js', 'ch08/out-filename.js', 'ch08/out-norm-game.js']);

PHY_T.add(async function (T) {
  var S = PHY.sims, K = PHY.ch08;
  var sum = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; };

  await T.test('פרק 8: מודל הצעצוע מכויל לריצת ה-Be', async function () {
    T.near('משקל ממוצע של שורה E_f[q]/E_g[q] ≈ 0.219', 0.219, K.MEANW, 0.002);
    var r = PHY.random(4).next, n = 200000, s = 0, a1 = 0, f = 0, i;
    for (i = 0; i < n; i++) { var e = K.maxwell(K.TN, r); s += e; if (e > 1) a1++; }
    T.near('מקסוול עם T = 1.26 MeV: ⟨E⟩ = 1.89 MeV', 1.89, s / n, 0.02);
    T.near('ושני שלישים מעל 1 MeV', 0.66, a1 / n, 0.006);
    for (i = 0; i < n; i++) if (K.cosAniso(K.ANISO, r) > 0) f++;
    T.near('1 + 0.36 cos θ: 59% קדימה', 0.59, f / n, 0.005);
    var w = K.sourceWeights(n, r);
    T.near('משקל ממוצע של פרוטון שנורה: 1', 1, sum(w) / n, 0.015);
    var Ep = 0, Z = 0;
    for (var E = K.EMIN; E <= K.EMAX; E += 0.001) { Ep += E * K.fTrue(E) * 0.001; Z += K.fTrue(E) * 0.001; }
    T.near('הספקטרום של הצעצוע: ⟨E⟩ = 3.94 MeV', 3.94, Ep / Z, 0.01);
    var run = K.makeRun({ N: 3e6, p: 4.47e-4, seed: 9 });
    T.near('3×10⁶ אירועים: כ-6126 שורות', 6126, run.R, 3 * Math.sqrt(6126));
    var ee = K.eventErr(run);
    T.near('וסכום משקלים כ-1341', 1341, run.S, 3 * ee.err * 3e6);
    T.near('התפוקה לפרוטון Σw/N ≈ 4.47×10⁻⁴', 4.47e-4, ee.mean, 3 * ee.err);
    T.truthy('השגיאה היחסית בין 1.5% ל-3% (בריצה: 2.0%)', ee.err / ee.mean > 0.015 && ee.err / ee.mean < 0.03);
    T.same('אותו זרע: אותה טבלה', K.makeRun({ N: 3e6, p: 4.47e-4, seed: 9 }).S, run.S);
    var an = K.makeRun({ N: 1e6, p: 0.002, flat: false, seed: 3 });
    T.same('ריצה אנלוגית: כל המשקלים 1, שורות = סכום המשקלים', an.R, Math.round(an.S));
    T.near('ריצה אנלוגית: שורות ≈ pN', 2000, an.R, 3 * Math.sqrt(2000));
  });

  await T.test('פרק 8: הפתיחה, שורות מול משקלים', async function () {
    var s = T.make(S.outNorm, { locked: true });
    T.same('לפני הריצה אין מועמדים', 0, s.getState().shown);
    await T.run(s.play(1));
    var q = s.getState();
    T.rel('לפי השורות: 6126/3×10⁶ × 4.42×10¹¹ = 9.03×10⁸', 9.026e8, q.values.rows, 1e-3);
    T.rel('לפי המשקלים: 1341/3×10⁶ × 4.42×10¹¹ = 1.98×10⁸', 1.9757e8, q.values.weights, 1e-3);
    T.rel('משקל ממוצע לשורה × N_shot = 9.68×10¹⁰', 9.676e10, q.values.perRow, 1e-3);
    T.same('המועמד שמתאים ללוג (1.974×10⁸) הוא לפי המשקלים', 'weights', q.match);
  });

  await T.test('פרק 8: הטבלה מתמלאת בארבעה הליכים', async function () {
    var s = T.make(S.outNtuple, { locked: true, seed: 8 });
    T.same('לפני הריצה: אין שורות', 0, s.getState().total);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('כל האירועים הסתיימו', 240, q.done);
    T.same('קובץ אחד, עם מיזוג', 1, q.files.length);
    T.same('כל השורות של כל ההליכים בקובץ', sum(q.rowsByThread), q.total);
    T.same('ומספרן כמספר השורות של הצעצוע', q.toyRows, q.total);
    T.truthy('העמודה evt בקובץ לא ממוינת', !q.sorted);
    T.truthy('כל ארבעת ההליכים הריצו אירועים', q.eventsByThread.every(function (n) { return n > 30; }));
    var bad = 0;
    q.schedule.forEach(function (ev) { var n = q.files[0].rows.filter(function (r) { return r.evt === ev.evt; }).length; if (n !== ev.n) bad++; });
    T.same('לכל אירוע: שורה לכל נייטרון שיצא', 0, bad);
    var cols = Object.keys(q.files[0].rows[0]).join(',');
    T.same('העמודות של leak ב-ldns', 'evt,E,cosTheta,phi,x,y,z,dx,dy,dz,t,birthLayer,process,w', cols);
    var r0 = q.files[0].rows[0];
    T.near('כיוון: dz = cosTheta', r0.cosTheta, r0.dz, 1e-12);
    T.near('וקטור יחידה', 1, r0.dx * r0.dx + r0.dy * r0.dy + r0.dz * r0.dz, 1e-9);
    s.setParam('merge', false);
    q = s.getState();
    T.same('בלי מיזוג: קובץ לכל הליך', 4, q.files.length);
    T.same('עם הסיומת _t0 בשם', 'E30J_M2p5_Be2_t0.root', q.files[0].name);
    T.same('אותן שורות בסך הכול', sum(q.rowsByThread), q.files.reduce(function (a, f) { return a + f.rows.length; }, 0));
    T.same('ובכל קובץ השורות של ההליך שלו', q.rowsByThread.join(','), q.files.map(function (f) { return f.rows.length; }).join(','));
  });

  await T.test('פרק 8: גודל הקובץ', async function () {
    var s = T.make(S.outSize, { mode: 'card', locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.same('שורה של primary: עמודת I ו-5 עמודות D = 44 בייט', 44, 4 + 5 * 8);
    T.near('רמה 2: כ-48 בייט לאירוע', 48, q.bytesPerEvent, 1e-9);
    T.near('3×10⁶ אירועים: כ-144 MB', 144, q.totalMB, 1e-6);
    T.near('מתוכם primary: 132 MB', 132, q.parts.primary, 1e-6);
    T.truthy('primary הוא רוב הקובץ', q.parts.primary > 10 * q.parts.rest);
    s.setParam('N', 5e6);
    T.near('5×10⁶ אירועים: כ-240 MB', 240, s.getState().totalMB, 1e-6);
    s.setParam('level', 1);
    T.truthy('רמה 1: פחות מ-2 MB', s.getState().totalMB < 2);
    s.setParam('level', 0);
    T.same('רמה 0: רק הסיכום', 0, s.getState().totalMB);
    var t = T.make(S.outSize, { mode: 'trap', locked: true });
    var base = t.getState().totalMB;
    await T.run(t.play(1));
    T.near('עמודת D נוספת: +24 MB ל-3×10⁶ אירועים', 24, t.getState().totalMB - base, 1e-6);
  });

  await T.test('פרק 8: היסטוגרמה של זווית, וחלוקה בזווית המרחבית', async function () {
    var s = T.make(S.outHist, { mode: 'angle', locked: true });
    T.same('לפני הריצה: ההיסטוגרמה ריקה', 0, sum(s.getState().panels[0].sum));
    await T.run(s.play(1));
    var q = s.getState(), pn = q.panels[0];
    T.same('כל השורות בהיסטוגרמה', q.R, Math.round(sum(pn.sum)));
    var chi = 0;
    for (var b = 0; b < pn.sum.length; b++) {
      var e = q.R * (Math.cos(pn.edges[b] * Math.PI / 180) - Math.cos(pn.edges[b + 1] * Math.PI / 180)) / 2;
      chi += (pn.sum[b] - e) * (pn.sum[b] - e) / e;
    }
    T.truthy('איזוטרופי: ספירות בבין ∝ Δcos θ (χ² < 2·בינים)', chi < 24);
    T.truthy('הבין ליד 90° מלא פי 3 ויותר מהבין ליד 0°', pn.sum[5] > 3 * pn.sum[0]);
    T.near('היחס הצפוי: (cos 75° − cos 90°)/(1 − cos 15°) = 7.6', 7.60, (Math.cos(75 * Math.PI / 180)) / (1 - Math.cos(15 * Math.PI / 180)), 0.01);
    s.setParam('y', 'density');
    pn = s.getState().panels[0];
    var mean = sum(pn.y) / pn.y.length, sd = 0;
    pn.y.forEach(function (v) { sd += (v - mean) * (v - mean); });
    sd = Math.sqrt(sd / (pn.y.length - 1));
    T.near('dN/dΩ שטוח: ממוצע ≈ R/4π', q.R / (4 * Math.PI), mean, 3 * Math.sqrt(q.R) / (4 * Math.PI) + 0.02 * mean);
    T.truthy('והפיזור בין הבינים קטן (פחות מ-12%)', sd / mean < 0.12);
    s.setParam('aniso', PHY.ch08.ANISO);
    q = s.getState();
    T.near('כמו ב-Be: 59% קדימה', 0.59, q.forward, 0.02);
  });

  await T.test('פרק 8: אותם נייטרונים בבינים ליניאריים ולוגריתמיים', async function () {
    var s = T.make(S.outHist, { mode: 'energy', locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    var lin = q.panels[0], lg = q.panels[1];
    T.near('בינים ליניאריים: השיא ליד T/2 = 0.63 MeV', 0.63, lin.peak, 0.26);
    T.near('בינים לוגריתמיים: השיא ליד 1.5T = 1.89 MeV', 1.89, lg.peak, 0.45);
    T.truthy('השיא זז פי 1.8 ויותר', lg.peak / lin.peak > 1.8);
    s.setParam('y', 'lethargy');
    q = s.getState();
    T.near('E·dN/dE על ציר לוגריתמי: השטח מעל 1 MeV = החלק של הנייטרונים', q.above1, q.areaAbove1[1], 0.01);
    s.setParam('y', 'density');
    q = s.getState();
    T.truthy('dN/dE על ציר לוגריתמי: השטח מעל 1 MeV קטן מהחלק האמיתי', q.areaAbove1[1] < q.above1 - 0.1);
    T.truthy('dN/dE בבינים לוגריתמיים: השיא חוזר מתחת ל-1 MeV', q.panels[1].peak < 1);
  });

  await T.test('פרק 8: מעבדת הניתוח', async function () {
    var s = T.make(S.outHist, { mode: 'lab' });
    var q = s.getState();
    T.near('ברירת המחדל כמו ריצת ה-Be: כ-6126 שורות', 6126, q.R, 3 * Math.sqrt(6126));
    T.near('לירייה ≈ 1.97×10⁸', 1.97e8, q.perShot, 3 * q.err * 4.42e11 + 0.02e8);
    T.near('קדימה ≈ 59%', 0.59, q.forward, 0.03);
    T.near('⟨E⟩ ≈ 1.89 MeV', 1.89, q.meanE, 0.06);
    var pn = q.panels[0];
    var lnSum = 0;
    for (var b = 0; b < pn.nb; b++) lnSum += pn.y[b] * Math.log(pn.edges[b + 1] / pn.edges[b]);
    T.rel('לתרגיה לירייה: Σ (E·dN/dE)·Δln E = כל הנייטרונים לירייה', q.S * 4.42e11 / q.N, lnSum + 0, 0.01);
    s.setParam('scale', 'proton'); s.setParam('y', 'counts');
    pn = s.getState().panels[0];
    T.rel('ספירות לפרוטון: סכום הבינים = Σw/N', q.S / q.N, sum(pn.y), 0.01);
    s.setParam('x', 'theta'); s.setParam('y', 'density'); s.setParam('nb', 18);
    pn = s.getState().panels[0];
    var om = 0;
    for (b = 0; b < pn.nb; b++) om += pn.y[b] * 2 * Math.PI * (Math.cos(pn.edges[b] * Math.PI / 180) - Math.cos(pn.edges[b + 1] * Math.PI / 180));
    T.rel('dN/dΩ לפרוטון: האינטגרל על 4π = Σw/N', q.S / q.N, om, 1e-6);
    s.setParam('p', 4.47e-3);
    T.truthy('תפוקה פי 10: פי 10 שורות בערך', Math.abs(s.getState().R / q.R - 10) < 1);
  });

  await T.test('פרק 8: השגיאה של סכום משקלים', async function () {
    var s = T.make(S.outErr, { mode: 'weights', locked: true });
    T.same('לפני הריצה: אין ריצות', 0, s.getState().values.length);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('200 ריצות', 200, q.values.length);
    T.rel('הפיזור שנמדד ≈ השגיאה מהסכומים של כל אירוע', q.eventRule, q.relSd, 0.15);
    T.truthy('והוא גדול מכלל השורש של מספר השורות', q.relSd > 1.2 * q.rowsRule);
    var vals = q.values.concat(s.batch()).concat(s.batch());
    var m = sum(vals) / vals.length, sd = 0;
    vals.forEach(function (v) { sd += (v - m) * (v - m); });
    sd = Math.sqrt(sd / (vals.length - 1));
    T.near('600 ריצות: הממוצע ≈ pN = 220', 220, m, 3 * sd / Math.sqrt(vals.length));
    var p = T.make(S.outErr, { mode: 'pairs', locked: true });
    await T.run(p.play(1));
    q = p.getState();
    T.near('זוגות: כ-400 שורות', 400, q.mean, 6);
    T.rel('פיזור השורות ≈ 2√K', 2 * Math.sqrt(q.meanK), q.sd, 0.15);
    T.rel('והשגיאה מהאירועים צופה אותו', q.eventRule, q.relSd, 0.15);
    T.near('כלל השורש: 1/√400 = 5%', 0.05, q.rowsRule, 0.003);
    T.truthy('והוא קטן מהפיזור האמיתי', q.relSd > 1.2 * q.rowsRule);
  });

  await T.test('פרק 8: המשקל הממוצע של המקור', async function () {
    var s = T.make(S.outWeights, { locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.near('primary: המשקל הממוצע 1', 1, q.meanSource, 3 * q.errSource);
    T.near('leak: המשקל הממוצע כ-0.219', 0.219, q.meanRow, 0.03);
  });

  await T.test('פרק 8: נקודה בשם הקובץ', async function () {
    var P = S.outFileName.parse;
    var a = P('output/E30J_M2.5_Be2');
    T.same('M2.5: הסיומת היא 5_Be2', '5_Be2', a.ext);
    T.same('ואין קובץ ROOT', false, a.root);
    var b = P('output/E30J_M2p5_Be2');
    T.same('M2p5: בלי סיומת, ROOT כברירת מחדל', 'root', b.type);
    T.same('output/run.root: ROOT', true, P('output/run.root').root);
    T.same('output/run.csv: csv', 'csv', P('output/run.csv').type);
    var s = T.make(S.outFileName, { locked: true });
    await T.run(s.play(1));
    T.same('ההנפשה מגיעה לתיקייה', 4, s.getState().stage);
  });

  await T.test('פרק 8: המשחק, משחק מושלם', async function () {
    var seeds = [1, 7, 2024];
    for (var i = 0; i < seeds.length; i++) {
      var g = T.make(S.outNormGame, { rng: PHY.random(seeds[i]).next });
      for (var lv = 0; lv < 3; lv++) {
        var st = g.getState(), gv = st.given, expect;
        if (lv === 0) expect = gv.S / gv.N * gv.shot;
        else if (lv === 1) expect = gv.R * gv.wb / gv.N * gv.shot;
        else expect = gv.Sb / (2 * Math.PI * (1 - gv.c)) / gv.N * gv.shot;
        T.rel('זרע ' + seeds[i] + ', שלב ' + (lv + 1) + ': התשובה מהנתונים', expect, st.truth, 1e-12);
        g.setGuess(st.truth);
        g.check();
        T.same('זרע ' + seeds[i] + ': ניצחון בבדיקה ראשונה', 'won', g.getState().phase);
        g.next();
      }
      st = g.getState();
      T.same('זרע ' + seeds[i] + ': 9 נקודות, 3 כוכבים', '9,3', sum(st.points) + ',' + st.stars);
    }
  });

  await T.test('פרק 8: המשחק, טעויות נפוצות', async function () {
    var g = T.make(S.outNormGame, { rng: PHY.random(5).next, chapter: 'x8', section: 'game' });
    var st = g.getState(), gv = st.given;
    g.setGuess(gv.S * gv.shot); g.check();
    T.truthy('שלב 1, בלי חלוקה ב-N: מזוהה', /חלוקה/.test(g.getState().slip || ''));
    g.setGuess(st.truth * 1.02); g.check();
    T.same('בתוך 3%: עובר בבדיקה השנייה, 2 נקודות', 2, g.getState().points[0]);
    g.next();
    st = g.getState(); gv = st.given;
    g.setGuess(gv.R / gv.N * gv.shot); g.check();
    T.truthy('שלב 2, שורות במקום משקלים: מזוהה', /שורות/.test(g.getState().slip || ''));
    g.setGuess(st.truth); g.check(); g.next();
    st = g.getState(); gv = st.given;
    g.setGuess(gv.Sb / gv.N * gv.shot); g.check();
    T.truthy('שלב 3, בלי זווית מרחבית: מזוהה', /זווית/.test(g.getState().slip || ''));
    g.setGuess(st.truth * 1.05); g.check();
    T.same('5% לא מספיק', 'play', g.getState().phase);
    g.setGuess(st.truth); g.check(); g.next();
    st = g.getState();
    T.same('2 + 2 + 1 = 5 נקודות: כוכב אחד', '5,1', sum(st.points) + ',' + st.stars);
    T.same('הכוכבים נשמרו', 1, PHY.progress.chapter('x8').game);
  });
});
