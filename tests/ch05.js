/* Chapter 5: the source. Runs inside tests/physics.html?only=05.
   Every check reads what the sims sampled or computed (energies, directions, weights, counts, χ²), not the
   parameters passed in. */
PHY_T.load(['ch01/kit.js', 'ch05/kit.js', 'ch05/src-hook.js', 'ch05/src-gun.js', 'ch05/src-cdf.js', 'ch05/src-cone.js', 'ch05/src-weights.js', 'ch05/src-check.js', 'ch05/src-lab.js', 'ch05/src-game.js', 'ch05/src-traps.js']);

PHY_T.add(async function (T) {
  var S = PHY.sims, K5 = PHY.ch05;
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };

  await T.test('פרק 5: הספקטרום, הקונוס והמספרים של הריצה', async function () {
    T.rel('∫f dE בין 1.85 ל-13 MeV (הלוג: 1.16541×10¹²)', 1.16541e12, K5.integ(function (E) { return K5.spec(E); }, 1.85, 13, 20000), 1e-6);
    T.rel('Ω של 20°: 0.379 sr', 0.3789, K5.omega(20), 1e-3);
    T.rel('N_shot = 4.42×10¹¹ (הלוג: 4.416e+11)', 4.416e11, K5.nShot(1.85, 13, 20), 1e-3);
    T.rel('מעל 0.5 MeV: 1.28×10¹² (כותרת הקובץ: 1.278e+12)', 1.278e12, K5.nShot(0.5, 13, 20), 2e-3);
    T.rel('⟨E⟩ = 3.94 MeV (הלוג: 3.93697)', 3.93697, K5.meanE(1.85, 13), 1e-3);
    T.rel('f(12 MeV) כמו בקובץ: 9.560443e+09', 9.560443e9, K5.spec(12), 2e-3);
    T.rel('f(1.85 MeV) כמו בקובץ: 7.046477e+11', 7.046477e11, K5.spec(1.85), 2e-3);
    T.rel('w של 12 MeV: 0.0915', 0.0915, K5.spec(12) * 11.15 / 1.16541e12, 2e-3);
    T.rel('10° מול 20°: פי 0.252', 0.2519, K5.nShot(1.85, 13, 10) / K5.nShot(1.85, 13, 20), 1e-3);
    T.near('בתפוקת הצעצוע: 56% מהתגובות מעל 6 MeV (הריצה: 57%)', 0.57, K5.reactionShareAbove(6, 1.85, 13), 0.025);
    T.near('ו-17% מעל 9 MeV (הריצה: 18%)', 0.18, K5.reactionShareAbove(9, 1.85, 13), 0.02);
    T.rel('התפוקה הממוצעת על הספקטרום: 4.47×10⁻⁴', 4.47e-4, K5.integ(function (E) { return K5.spec(E) * K5.yieldAt(E); }, 1.85, 13, 6000) / 1.16541e12, 2e-3);
    T.same('אין תפוקה מתחת ל-2.06 MeV', 0, K5.yieldAt(2.0));
  });

  await T.test('פרק 5: הפתיחה, שלוש שיטות', async function () {
    var s = T.make(S.srcHook, { N: 3e6, seed: 2026, locked: true });
    T.same('לפני הריצה אין הערכות', false, s.getState().ran);
    await T.run(s.play(1));
    var q = s.getState(), tr = q.truth;
    T.rel('הערך הנכון: 1.97×10⁸ לירייה', 1.974e8, tr, 2e-3);
    T.near('analog מ-0.5 MeV: בתוך 3σ מהנכון', tr, q.runs.analog.perShot, 3 * q.runs.analog.errShot);
    T.near('flat עם משקלים: בתוך 3σ מהנכון', tr, q.runs.flat.perShot, 3 * q.runs.flat.errShot);
    T.truthy('רק מעל 6 MeV: נמוך מהנכון ביותר מ-5σ', tr - q.runs.cut6.perShot > 5 * q.runs.cut6.errShot);
    T.rel('ובערך בחסר של הנייטרונים מפרוטונים שנורו מתחת ל-6 MeV (18%)', 0.82, q.runs.cut6.perShot / tr, 0.03);
    T.truthy('flat: שגיאה קטנה מ-analog', q.runs.flat.errShot < 0.6 * q.runs.analog.errShot);
    T.near('analog מ-0.5 MeV: כ-5% מהפרוטונים מעל 6 MeV', 0.0524, q.runs.analog.above6, 0.002);
    T.near('flat: כ-63% מעל 6 MeV', 7 / 11.15, q.runs.flat.above6, 0.003);
    T.same('רק מעל 6 MeV: כולם מעל 6 MeV', 1, q.runs.cut6.above6);
    T.near('flat, 3×10⁶: שגיאה יחסית כ-2% (הריצה: 2.0%)', 0.02, q.runs.flat.errShot / q.runs.flat.perShot, 0.005);
  });

  await T.test('פרק 5: התותח, פרוטון אחד בכל אירוע', async function () {
    var s = T.make(S.srcGun, { events: 8, sampling: 'flat', seed: 77, locked: true });
    T.same('לפני הריצה אין אירועים', 0, s.getState().nEvents);
    await T.run(s.play(1));
    T.same('8 אירועים, פרוטון אחד בכל אחד', 8, s.getState().nEvents);
    var bad = 0, sw = 0, n = 4000, tab = K5.table(1.85, 13);
    for (var i = 0; i < n; i++) {
      var ev = s.fire();
      if (ev.theta > 20 + 1e-9 || ev.E < 1.85 || ev.E > 13) bad++;
      if (Math.abs(ev.w - K5.weightFlat(tab, ev.E)) > 1e-12) bad++;
      sw += ev.w;
    }
    T.same('כל הכיוונים בקונוס, כל האנרגיות בטווח, משקל לפי הנוסחה', 0, bad);
    T.near('המשקל הממוצע של 4000 אירועים ≈ 1', 1, sw / n, 0.08);
    T.rel('כל אירוע מייצג 4.42×10¹¹/3×10⁶ פרוטונים', 1.472e5, K5.nShot(1.85, 13, 20) / 3e6, 2e-3);
  });

  await T.test('פרק 5: היפוך הפונקציה המצטברת', async function () {
    var s = T.make(S.srcCdf, { N: 3000, show: 12, seed: 5, locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.same('3000 דגימות', 3000, q.N);
    var mono = 0;
    for (var i = 0; i < 300; i++) for (var j = 0; j < 300; j++) if (q.u[i] < q.u[j] && q.E[i] > q.E[j] + 1e-12) mono++;
    T.same('u גדול יותר נותן E גדול יותר (F מונוטונית)', 0, mono);
    T.near('הממוצע ≈ 3.94 MeV', 3.937, q.mean, 3 * 2.0 / Math.sqrt(3000));
    T.near('מתחת ל-3 MeV: 46%', 0.461, q.fracBelow3, 3 * Math.sqrt(0.25 / 3000));
    T.truthy('העמודה הראשונה היא הגבוהה ביותר', q.counts[0] === Math.max.apply(null, q.counts));
    var chi = 0, tab = q.tab;
    for (var b = 0; b < q.counts.length; b++) {
      var e = 3000 * K5.integ(function (E) { return K5.spec(E); }, 1.85 + b * q.dx, 1.85 + (b + 1) * q.dx, 20) / tab.I;
      chi += (q.counts[b] - e) * (q.counts[b] - e) / Math.max(e, 1);
    }
    T.truthy('ההיסטוגרמה מתאימה ל-f(E) (χ² < 2·bins)', chi < 2 * q.counts.length);
  });

  await T.test('פרק 5: כיוונים בקונוס', async function () {
    var s = T.make(S.srcCone, { N: 1500, deg: 20, seed: 8, locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.near('cos θ אחיד: 25% בתוך 10°', 0.252, q.inner.cos, 3 * Math.sqrt(0.25 * 0.75 / 1500));
    T.near('θ אחיד: 50% בתוך 10°', 0.5, q.inner.theta, 3 * Math.sqrt(0.25 / 1500));
    T.rel('רדיוס הקונוס על הפאה הקדמית: 16.4 mm', 16.38, q.rCone, 2e-3);
    T.truthy('כל הפגיעות בתוך 16.4 mm', Math.max.apply(null, q.hits) <= q.rCone + 1e-9);
    s.setParam('deg', 10);
    T.rel('קונוס של 10°: 1.11×10¹¹', 1.113e11, s.getState().nShot, 3e-3);
  });

  await T.test('פרק 5: משקלים', async function () {
    var s = T.make(S.srcWeights, { N: 20000, seed: 3, locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.near('⟨w⟩ = 1 בתוך 3σ', 1, q.meanW, 3 * q.errW);
    T.near('63% נורו מעל 6 MeV', 7 / 11.15, q.above6, 3 * Math.sqrt(0.25 / 20000));
    T.near('המשקל הממוצע של הנייטרונים: כ-0.2 (הריצה: 0.219)', 0.2, q.meanWn, 0.03);
    T.truthy('ההיסטוגרמה עם המשקלים מתאימה ל-f (χ²/ndf < 2)', q.chi2 / q.ndf < 2);
  });

  await T.test('פרק 5: בדיקת הקלט', async function () {
    var s = T.make(S.srcCheck, { N: 300000, seed: 11, locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.near('ספקטרום: χ²/ndf ≈ 1', 1, q.chi2E / q.ndfE, 0.8);
    T.near('כיוונים: χ²/ndf ≈ 1', 1, q.chi2C / q.ndfC, 0.9);
    T.near('⟨w⟩ = 1 בתוך 3σ', 1, q.meanW, 3 * q.errW);
    T.truthy('cos θ לא יורד מתחת ל-cos 20° = 0.940', q.cosMin >= Math.cos(20 * Math.PI / 180) - 1e-12);
    var vals = [];
    for (var k = 1; k <= 10; k++) vals.push(s.rerun(1000 + 37 * k).chi2E / 30);
    var m = sum(vals) / vals.length;
    T.near('10 ריצות: ממוצע χ²/ndf ≈ 1', 1, m, 3 * Math.sqrt(2 / 30) / Math.sqrt(10) + 0.05);
  });

  await T.test('פרק 5: מעבדת המקור', async function () {
    var s = T.make(S.srcLab, {});
    var q = s.getState();
    T.rel('ברירת המחדל: 4.42×10¹¹', 4.416e11, q.nShot, 1e-3);
    T.rel('ו-3.94 MeV', 3.937, q.meanE, 1e-3);
    T.truthy('שורות המאקרו כמו בריצה', q.macro.indexOf('/ldns/src/Emin 1.85 MeV') >= 0 && q.macro.indexOf('/ldns/src/halfAngle 20 deg') >= 0 && q.macro.indexOf('/ldns/src/sampling flat') >= 0);
    s.setParam('Emin', 0.5);
    T.rel('Emin 0.5 MeV: 1.28×10¹²', 1.278e12, s.getState().nShot, 2e-3);
    s.setParam('sampling', 'analog');
    var sm = s.getState().samples, lo = 0;
    sm.forEach(function (E) { if (E < 1.85) lo++; });
    T.near('analog מ-0.5 MeV: 65% מהפרוטונים מתחת ל-1.85 MeV', 0.655, lo / sm.length, 3 * Math.sqrt(0.25 / sm.length));
    s.setParam('sampling', 'flat');
    sm = s.getState().samples; lo = 0;
    sm.forEach(function (E) { if (E < 1.85) lo++; });
    T.near('flat מ-0.5 MeV: 1.35/12.5 מתחת ל-1.85 MeV', 1.35 / 12.5, lo / sm.length, 3 * Math.sqrt(0.1 / sm.length));
  });

  await T.test('פרק 5: המשחק, משחק מושלם', async function () {
    var seeds = [1, 7, 2024];
    for (var i = 0; i < seeds.length; i++) {
      var g = T.make(S.srcGame, { rng: PHY.random(seeds[i]).next });
      for (var lv = 0; lv < 3; lv++) {
        var st = g.getState();
        T.same('זרע ' + seeds[i] + ': שלב ' + (lv + 1), lv, st.level);
        g.set('Emax', st.target.Emax); g.set('Emin', st.target.Emin); g.set('deg', st.target.deg);
        g.check();
        T.same('זרע ' + seeds[i] + ': ניצחון בבדיקה ראשונה', 'won', g.getState().phase);
        g.next();
      }
      st = g.getState();
      T.same('זרע ' + seeds[i] + ': 9 נקודות, 3 כוכבים', '9,3', sum(st.points) + ',' + st.stars);
    }
  });

  await T.test('פרק 5: המשחק, טעויות עולות נקודות', async function () {
    var g = T.make(S.srcGame, { rng: PHY.random(5).next, chapter: 'x5', section: 'game' });
    var t = g.getState().target;
    g.set('deg', t.deg + 3); g.check();
    T.same('קונוס רחב ב-3°: לא עובר', 'play', g.getState().phase);
    g.set('Emin', 3);
    T.same('בשלב 1 Emin נעול', 1.85, g.getState().mine.Emin);
    g.set('deg', t.deg); g.check();
    T.same('בבדיקה השנייה: שתי נקודות', 2, g.getState().points[0]);
    g.next();
    t = g.getState().target;
    g.set('deg', t.deg); g.set('Emin', t.Emin + 0.4); g.check();
    T.same('Emin רחוק ב-0.4 MeV: לא עובר', 'play', g.getState().phase);
    g.set('Emin', t.Emin); g.check(); g.next();
    t = g.getState().target;
    g.set('Emax', t.Emax); g.set('Emin', t.Emin); g.set('deg', t.deg); g.check(); g.next();
    var st = g.getState();
    T.same('2 + 2 + 3 = 7 נקודות: שני כוכבים', '7,2', sum(st.points) + ',' + st.stars);
    T.same('הכוכבים נשמרו', 2, PHY.progress.chapter('x5').game);
  });

  await T.test('פרק 5: מלכודות', async function () {
    var r = T.make(S.srcRuns, { R: 12, N: 2e5, seed: 99, locked: true });
    await T.run(r.play(1));
    var more = r.simulate(40);
    var A = r.getState().analog.concat(more.a), Fl = r.getState().flat.concat(more.f);
    var mA = sum(A.map(function (q) { return q.mean; })) / A.length, mF = sum(Fl.map(function (q) { return q.mean; })) / Fl.length;
    var sd = function (L, m) { return Math.sqrt(sum(L.map(function (q) { return (q.mean - m) * (q.mean - m); })) / (L.length - 1)); };
    var sA = sd(A, mA), sF = sd(Fl, mF);
    T.near('analog, 52 ריצות: ממוצע ≈ 4.47×10⁻⁴', 4.47e-4, mA, 3 * sA / Math.sqrt(A.length));
    T.near('flat, 52 ריצות: ממוצע ≈ 4.47×10⁻⁴', 4.47e-4, mF, 3 * sF / Math.sqrt(Fl.length));
    T.truthy('flat מתפזר פחות', sF < 0.8 * sA);
    T.rel('והשגיאה שכל ריצה מדפיסה מתאימה לפיזור בין הריצות (flat)', sF, sum(Fl.map(function (q) { return q.err; })) / Fl.length, 0.25);

    var th = T.make(S.srcTheta, { N: 20000, deg: 20, inner: 10, seed: 4, locked: true });
    await T.run(th.play(1));
    var q = th.getState();
    T.near('בתוך 10°: 25.2%', q.shareTheory, q.share, 3 * Math.sqrt(0.25 * 0.75 / 20000));
    T.rel('והנוסחה: (1 − cos 10°)/(1 − cos 20°)', 0.2519, q.shareTheory, 1e-3);
    T.truthy('dN/dθ עולה עם θ (התא האחרון פי 10 מהראשון לפחות)', q.counts[q.counts.length - 1] > 10 * q.counts[0]);

    var c = T.make(S.srcCut, { locked: true });
    await T.run(c.play(1));
    q = c.getState();
    T.near('65% מהפרוטונים מתחת ל-1.85 MeV', 0.655, q.shareBelow, 0.005);
    T.same('ואפס נייטרונים מהם', 0, q.yieldBelow);

    var p = T.make(S.srcPerShot, { locked: true });
    await T.run(p.play(1));
    q = p.getState();
    T.rel('1.85-13 MeV, 20°: 4.42×10¹¹', 4.416e11, q.bars[0].nShot, 1e-3);
    T.rel('0.5-13 MeV, 20°: 1.28×10¹²', 1.278e12, q.bars[1].nShot, 2e-3);
    T.rel('1.85-13 MeV, 10°: 1.11×10¹¹', 1.113e11, q.bars[2].nShot, 3e-3);
    T.same('שלוש העמודות הוצגו', 3, q.stage);
  });
});
