/* Chapter 4: physics lists, models and nuclear data. Runs inside tests/physics.html?only=04.
   Every check reads what the sims sampled, drew or looked up (counts, depths, the first open energy, the rows
   of a list), not the parameters passed in. */
PHY_T.load(['ch01/kit.js', 'ch04/kit.js', 'ch04/phys-hook.js', 'ch04/phys-process.js', 'ch04/phys-lists.js', 'ch04/phys-xs.js', 'ch04/phys-yield.js', 'ch04/phys-mult.js', 'ch04/phys-lab.js', 'ch04/phys-game.js', 'ch04/phys-cuts.js', 'ch04/phys-vote.js', 'ch04/phys-pergram.js', 'ch04/phys-valid.js']);

PHY_T.add(async function (T) {
  var S = PHY.sims, K4 = PHY.ch04;
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };

  await T.test('פרק 4: ספים, חומרים ותפוקה', async function () {
    T.rel('⁷Li(p,n): E_th מ-Q = −1.644 MeV', 1.880, K4.threshold(-1.644, 7.016003), 1e-3);
    T.rel('⁹Be(p,n): E_th מ-Q = −1.850 MeV', 2.057, K4.threshold(-1.850, 9.012183), 1e-3);
    T.same('σ של ⁷Li מתחת לסף: 0', 0, K4.sigma('Li7', 1.87));
    T.truthy('σ של ⁷Li מעל הסף: חיובי', K4.sigma('Li7', 1.9) > 0);
    T.same('σ של ¹⁹F ב-4.1 MeV: 0', 0, K4.sigma('F19', 4.1));
    T.rel('LiF, 5 MeV, AllHP: 5.0×10⁻⁴ (הכיול)', 5.0e-4, K4.yieldOf('LiF', 5, { list: 'allhp', mode: 'fix' }), 1e-9);
    T.same('LiF, 5 MeV, קסקדה (צעצוע): 0', 0, K4.yieldOf('LiF', 5, { list: 'cascade', mode: 'fix' }));
    T.rel('Be עם עיגול: פי 1.25', 1.25, K4.yieldOf('Be', 10, { mode: 'round' }) / K4.yieldOf('Be', 10, { mode: 'fix' }), 1e-9);
    T.same('¹⁹F עם עיגול: ν = 0.07 → 0', 0, K4.multFactor('F19', 5, 'round'));
    T.near('ν של ¹⁹F ב-5 MeV', 0.07, K4.nu('F19', 5), 1e-9);
    T.rel('טווח של 13 MeV ב-Be: 1.3 mm', 1.3, K4.rangeMm('Be', 13), 1e-9);
    T.rel('טווח במסה ל-g/cm²: כמעט זהה ב-Li וב-Be (בערך 0.24 ו-0.27)', 0.267 / 0.240, K4.rangeRho('Li', 13) / K4.rangeRho('Be', 13), 0.01);
    T.rel('S_m = 1/(dR/dE): בדיקה נומרית', (K4.rangeRho('Be', 8.001) - K4.rangeRho('Be', 7.999)) / 0.002, 1 / K4.Sm('Be', 8), 1e-4);
  });

  await T.test('פרק 4: הפתיחה, שתי רשימות', async function () {
    var s = T.make(S.physHook, { N: 20000, pAll: 5.0e-4, pBic: 0, seed: 682, locked: true });
    T.same('לפני הריצה לא נספר כלום', 0, s.getState().shown);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('כל הפרוטונים עברו', 20000, q.shown);
    T.same('QGSP_BIC_HP: אפס נייטרונים', 0, q.kBic);
    T.near('AllHP: כ-10 נייטרונים (N·p)', 10, q.kAll, 3 * Math.sqrt(10));
    T.near('ולכן לפרוטון ≈ 5×10⁻⁴', 5e-4, q.yAll, 3 * Math.sqrt(10) / 20000);
    var t = T.make(S.physHook, { N: 20000, pAll: 5.0e-4, pBic: 0, seed: 682, locked: true });
    await T.run(t.play(1));
    T.same('אותו זרע: אותה ספירה', q.kAll, t.getState().kAll);
    var big = T.make(S.physHook, { N: 2e6, pAll: 5.0e-4, pBic: 0, seed: 9, locked: true });
    await T.run(big.play(1));
    T.near('2×10⁶ פרוטונים: 1000 ± 3√1000', 1000, big.getState().kAll, 3 * Math.sqrt(1000));
  });

  await T.test('פרק 4: תהליך, חתך פעולה ומודל', async function () {
    var s = T.make(S.physProcess, { mode: 'card', locked: true });
    T.same('לפני הריצה: לא סומן', false, s.getState().done);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('13 MeV: חתך פעולה מ-HP', 'ProtonHPInelasticXS', q.at13.xs);
    T.same('100 MeV: חתך פעולה מ-G4PARTICLEXS', 'protonParticleXS', q.at100.xs);
    T.same('13 MeV: מודל HP בלבד', 'ProtonHPInelastic', q.at13.models.join(','));
    T.same('100 MeV: עדיין מודל HP', 'ProtonHPInelastic', q.at100.models.join(','));
    s.setParam('E', 195);
    T.same('195 MeV: חפיפה של HP ו-BIC', 'ProtonHPInelastic,Binary Cascade', s.getState().models.join(','));
    s.setParam('E', 1e6);
    T.same('1 TeV: QGSP', 'QGSP', s.getState().models.join(','));
    s.setParam('E', 1.5);
    T.same('1.5 MeV: יינון במודל Bragg', 'Bragg', s.getState().ioni);
    s.setParam('E', 20.0001);
    T.same('מעט מעל 20 MeV: כבר G4PARTICLEXS', 'protonParticleXS', s.getState().xs);
  });

  await T.test('פרק 4: השם של הרשימה', async function () {
    var s = T.make(S.physLists, { mode: 'card', locked: true });
    T.same('לפני הריצה: השורות מוסתרות', 0, s.getState().reveal);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('כל השורות נחשפו', 4, q.reveal);
    T.same('השם', 'QGSP_BIC_AllHP_EMZ', q.name);
    T.same('פרוטון מתחת ל-200 MeV: המודל של HP, מהבלוק AllHP', 'ProtonHPInelastic/data', q.rows[0].bars[0].label + '/' + q.rows[0].bars[0].owner);
    T.same('חתך הפעולה: HP עד 20 MeV', 20, q.rows[1].bars[0].hi);
    T.same('LiF ב-5 MeV: 5.0×10⁻⁴', 5e-4, q.lif5.v);
    s.setParam('data', 'HP');
    q = s.getState();
    T.same('QGSP_BIC_HP: הפרוטון לקסקדה', 'Binary Cascade', q.rows[0].bars[0].label);
    T.same('QGSP_BIC_HP: LiF ב-5 MeV אפס', 0, q.lif5.v);
    T.same('נייטרון מתחת ל-20 MeV עדיין ב-HP', 'NeutronHP (G4NDL)', q.rows[2].bars[0].label);
    s.setParam('base', 'FTFP_BERT');
    s.setParam('data', 'AllHP');
    T.same('FTFP_BERT_AllHP: אין רשימה כזאת', false, s.getState().valid);
  });

  await T.test('פרק 4: הסף, מהסריקה', async function () {
    var s = T.make(S.physXs, { mode: 'card', nucleus: 'Li7', E: 1, locked: true });
    T.same('לפני הריצה: סגור ב-1 MeV', false, s.getState().open);
    await T.run(s.play(1));
    var q = s.getState();
    T.near('ההנפשה מצאה את הפתיחה ב-1.88 MeV', 1.880, q.firstOpen, 0.02);
    T.near('סריקה עדינה: 1.880 MeV', 1.880, s.scan(0.0002), 0.001);
    T.near('בסף הזמין במרכז המסה = |Q|', 1.644, (1.880 * 7.016003) / (7.016003 + 1.007276), 2e-3);
    s.setParam('nucleus', 'Be9');
    T.near('⁹Be: 2.06 MeV', 2.057, s.scan(0.0002), 0.001);
    s.setParam('nucleus', 'F19');
    T.near('¹⁹F: 4.2 MeV', 4.2, s.scan(0.0002), 0.001);
  });

  await T.test('פרק 4: ממיר עבה, הצפיפות מצטמצמת', async function () {
    var s = T.make(S.physYield, { E0: 13, rho2: 0.924, N: 2000, seed: 31, locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.rel('טווח ב-Be: 1.3 mm', 1.3, q.R1, 1e-9);
    T.rel('חצי צפיפות: טווח כפול', 2, q.R2 / q.R1, 1e-9);
    T.truthy('יש מספיק לידות כדי לבדוק (>100)', q.k1 > 100 && q.k2 > 100);
    T.near('אותו מספר נייטרונים בתוך 3σ', 0, q.k1 - q.k2, 3 * Math.sqrt(q.k1 + q.k2));
    T.rel('עומק הלידה הממוצע כפול בממיר הדליל', 2, q.mean2 / q.mean1, 0.08);
    T.truthy('כל הלידות בתוך הטווח', Math.max.apply(null, q.d1) <= q.R1 + 1e-9 && Math.max.apply(null, q.d2) <= q.R2 + 1e-9);
    var lo = 0, hi = 0;
    for (var k = 0; k < 6; k++) { s.setParam('rho2', 0.5 + 0.4 * k); var r = s.getState(); lo += r.k1; hi += r.k2; }
    T.near('שש צפיפויות: סכומים שווים בתוך 3σ (k1 חוזר שש פעמים, לכן 36·k1 בשונות)', 0, lo - hi, 3 * Math.sqrt(36 * q.k1 + hi));
    s.setParam('rho2', 1.848); s.setParam('E0', 5);
    var a = s.getState();
    s.setParam('E0', 13);
    T.truthy('פחות נייטרונים ב-5 MeV מאשר ב-13 MeV', a.k1 < s.getState().k1 / 3);
  });

  await T.test('פרק 4: ריבוי, עיגול מול פואסון', async function () {
    var s = T.make(S.physMult, { nucleus: 'F19', E: 5, N: 1000, seed: 100, locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.same('¹⁹F, עיגול: 0 נייטרונים', 0, q.round.total);
    T.near('¹⁹F, פואסון: כ-70', 70, q.poisson.total, 3 * Math.sqrt(70));
    T.same('1000 תגובות בהיסטוגרמה', 1000, sum(q.poisson.counts));
    s.setParam('nucleus', 'Be9');
    q = s.getState();
    T.same('⁹Be, ν = 0.8, עיגול: 1000', 1000, q.round.total);
    T.near('⁹Be, פואסון: כ-800', 800, q.poisson.total, 3 * Math.sqrt(800));
    T.near('ובפואסון P(0) = e^{−0.8}', Math.exp(-0.8), q.poisson.counts[0] / 1000, 3 * Math.sqrt(0.45 * 0.55 / 1000));
  });

  await T.test('פרק 4: מעבדת התפוקה', async function () {
    var s = T.make(S.physLab, { mat: 'LiF', E0: 5, list: 'allhp', mode: 'fix' });
    T.rel('LiF, 5 MeV: 5.0×10⁻⁴', 5e-4, s.getState().Y, 1e-9);
    s.setParam('mode', 'round');
    T.same('LiF, 5 MeV, עיגול: רק ⁷Li נשאר, פחות', true, s.getState().Y < 5e-4 && s.getState().Y > 0);
    s.setParam('E0', 3);
    T.rel('LiF מתחת ל-4.2 MeV: העיגול לא משנה (רק ⁷Li)', s.getState().Yref, s.getState().Y, 1e-9);
    s.setParam('mode', 'fix'); s.setParam('list', 'cascade'); s.setParam('E0', 7.5);
    T.same('קסקדה (צעצוע), LiF ב-7.5 MeV: 0', 0, s.getState().Y);
    s.setParam('mat', 'Pb'); s.setParam('list', 'allhp'); s.setParam('E0', 6);
    T.same('Pb ב-6 MeV: 0', 0, s.getState().Y);
    s.setParam('mat', 'Be'); s.setParam('E0', 1.9);
    T.same('Be מתחת ל-2.06 MeV: 0', 0, s.getState().Y);
  });

  await T.test('פרק 4: המשחק, משחק מושלם', async function () {
    var seeds = [1, 7, 2024];
    for (var i = 0; i < seeds.length; i++) {
      var g = T.make(S.physGame, { rng: PHY.random(seeds[i]).next });
      for (var lv = 0; lv < 3; lv++) {
        var st = g.getState();
        T.same('זרע ' + seeds[i] + ': שלב ' + (lv + 1), lv, st.level);
        g.setChoice('base', st.answer.base); g.setChoice('data', st.answer.data); g.setChoice('em', st.answer.em);
        g.check();
        T.same('זרע ' + seeds[i] + ': ניצחון בבדיקה ראשונה', 'won', g.getState().phase);
        g.next();
      }
      st = g.getState();
      T.same('זרע ' + seeds[i] + ': 9 נקודות, 3 כוכבים', '9,3', sum(st.points) + ',' + st.stars);
    }
  });

  await T.test('פרק 4: המשחק, טעויות עולות נקודות', async function () {
    var g = T.make(S.physGame, { rng: PHY.random(5).next, chapter: 'x4', section: 'game' });
    g.setChoice('base', 'QGSP_BIC'); g.setChoice('data', 'HP'); g.setChoice('em', 'EMZ');
    g.check();
    T.same('ממיר קל עם _HP בלבד: לא עובר', 'play', g.getState().phase);
    g.setChoice('data', 'AllHP'); g.setChoice('em', '');
    g.check();
    T.same('בלי EMZ: לא עובר', 'play', g.getState().phase);
    g.setChoice('em', 'EMZ'); g.check();
    T.same('בבדיקה השלישית: נקודה אחת', 1, g.getState().points[0]);
    g.next();
    g.setChoice('base', 'FTFP_BERT'); g.setChoice('data', 'HP'); g.check();
    T.same('Pb עם FTFP_BERT_HP: לא מה שאומת', 'play', g.getState().phase);
    g.setChoice('base', 'QGSP_BIC'); g.setChoice('data', 'AllHP'); g.check();
    T.same('Pb עם QGSP_BIC_AllHP: עובר', 'won', g.getState().phase);
    g.next();
    g.setChoice('base', 'QGSP_INCLXX'); g.setChoice('data', 'HP'); g.setChoice('em', '');
    g.check();
    T.same('מאט עם QGSP_INCLXX_HP: עובר', 'won', g.getState().phase);
    g.next();
    var st = g.getState();
    T.same('1 + 2 + 3 = 6 נקודות: שני כוכבים', '6,2', sum(st.points) + ',' + st.stars);
    T.same('הכוכבים נשמרו', 2, PHY.progress.chapter('x4').game);
  });

  await T.test('פרק 4: מלכודות', async function () {
    var c = T.make(S.physCuts, { N: 3e6, p: 4.47e-4, seed: 12, locked: true });
    await T.run(c.play(1));
    var q = c.getState();
    T.near('T_max של פרוטון של 13 MeV ≈ 28 keV', 28.5, q.tmax, 0.6);
    T.same('קטן מסף של 366.6 keV: אין אלקטרונים משניים', 0, q.delta1);
    T.near('חיתוך 0.7 mm: 1341 ± 3·37', 1341, q.k1, 3 * 36.6);
    T.near('חיתוך 1 µm: 1341 ± 3·37', 1341, q.k2, 3 * 36.6);
    T.near('ההפרש בתוך הרעש', 0, q.k1 - q.k2, 3 * Math.sqrt(2 * 1341));

    var v = T.make(S.physVote, { locked: true });
    await T.run(v.play(1));
    q = v.getState();
    T.same('כל הרשימות צוירו', true, q.done);
    T.same('AllHP / מוערך = 1', 1, q.ratioAt(5, 'allhp'));
    T.truthy('BIC_HP ב-5 MeV: קטן פי 3 עד 100', q.ratioAt(5, 'bic') <= 1 / 3 && q.ratioAt(5, 'bic') >= 0.01);
    T.truthy('INCLXX_HP ב-5 MeV: קטן פי 3 עד 100', q.ratioAt(5, 'incl') <= 1 / 3 && q.ratioAt(5, 'incl') >= 0.01);

    var p = T.make(S.physPerGram, { ratio: 10, locked: true });
    await T.run(p.play(1));
    q = p.getState();
    T.rel('גרעינים בגרם של ⁷Li', 8.58e22, q.nLi, 2e-3);
    T.rel('גרעינים בגרם של Pb', 2.91e21, q.nPb, 2e-3);
    T.rel('⁷Li חלקי Pb, עם σ פי 10 ל-Pb: 2.95', 2.95, q.ratioLiOverPb, 3e-3);
    T.same('שלושת השלבים הוצגו', 3, q.stage);

    var w = T.make(S.physValid, { locked: true });
    await T.run(w.play(1));
    q = w.getState();
    T.same('כל השורות נצבעו', 4, q.stage);
    T.same('⁷Li ב-50 MeV: אין נתונים', 'none', q.statusAt('⁷Li', 50));
    T.same('⁹Be ב-10 MeV: מאומת', 'ok', q.statusAt('⁹Be', 10));
    T.same('¹⁹F ב-30 MeV: נמוך', 'low', q.statusAt('¹⁹F', 30));
    T.same('²⁰⁸Pb ב-12 MeV: לא מאומת', 'none', q.statusAt('²⁰⁸Pb', 12));
  });
});
