/* Chapter 7: the visualisation sims, checked against the camera of a Geant4 viewer and the rates of
   docs/PLAN.md section 4. Runs inside tests/physics.html?only=07. The checks read what the sims drew or
   sampled (counts, depths, camera axes), not the parameters passed in. */
PHY_T.load(['ch07/kit.js', 'ch07/vis-viewer.js', 'ch07/vis-count.js', 'ch07/vis-model.js', 'ch07/vis-tally.js', 'ch07/vis-range.js', 'ch07/vis-offscreen.js', 'ch07/vis-game.js']);

PHY_T.add(async function (T) {
  var S = PHY.sims, K = PHY.ch07;
  var div = function () { var d = document.createElement('div'); T.stage.appendChild(d); return d; };

  await T.test('פרק 7: המצלמה של הצופה', async function () {
    var c = K.camera([-1, 0, 0]);
    T.near('-1 0 0: הקרן ימינה', 1, K.beamOnScreen(c).x, 1e-9);
    T.near('ובלי רכיב אנכי', 0, K.beamOnScreen(c).y, 1e-9);
    T.near('1 0 0: הקרן שמאלה', -1, K.beamOnScreen(K.camera([1, 0, 0])).x, 1e-9);
    T.near('0 0 -1: לאורך הקרן, בלי כיוון על המסך', 0, K.beamOnScreen(K.camera([0, 0, -1])).len, 1e-9);
    var v = K.tpVector(70, 20);
    T.near('70 20: x = sin70 cos20', 0.883, v[0], 1e-3);
    T.near('70 20: y = sin70 sin20', 0.321, v[1], 1e-3);
    T.near('70 20: z = cos70', 0.342, v[2], 1e-3);
    T.truthy('70 20: הקרן זורמת שמאלה', K.beamOnScreen(K.cameraTP(70, 20)).x < -0.9);
    T.truthy('90 0: הקרן שמאלה (שאלת הבוחן)', K.beamOnScreen(K.cameraTP(90, 0)).x < -0.99);
    var p = K.camera([-1, 0.35, -0.3]);
    T.truthy('המבט של התמונות: +z ימינה, x למעלה-שמאלה', K.beamOnScreen(p).x > 0.9 && p.r[0] < 0 && p.u[0] > 0);
    T.near('ציר y של המסך מאונך לכיוון המבט', 0, K.dot(p.u, p.v), 1e-12);
  });

  await T.test('פרק 7: הפיזיקה הסכמטית מול PLAN', async function () {
    T.rel('נייטרונים לפרוטון, התערובת: 1.97e8/1.28e12', 1.539e-4, K.P_ANALOG, 1e-3);
    T.rel('מסלולים לפרוטון, flat: 6126/3e6', 2.042e-3, K.P_FLAT, 1e-3);
    T.rel('ועם המשקל הממוצע: 4.47e-4', 4.47e-4, K.P_FLAT * K.W_MEAN, 2e-3);
    T.rel('טווח של 13 MeV: 1.3 mm', 1.3, K.rangeMm(13), 1e-9);
    var r = PHY.random(31).next, fwd = 0, hi = 0, n = 40000, inCone = 0;
    for (var i = 0; i < n; i++) {
      if (K.neutronDir(r)[2] > 0) fwd++;
      if (K.sampleE(r, { mode: 'analog' }) > 1.85) hi++;
      if (K.coneDir(r)[2] >= Math.cos(20 * Math.PI / 180) - 1e-12) inCone++;
    }
    T.near('59% מהנייטרונים קדימה', 0.59, fwd / n, 3 * Math.sqrt(0.59 * 0.41 / n));
    T.near('35% מהפרוטונים מעל 1.85 MeV (4.42e11/1.28e12)', 0.345, hi / n, 3 * Math.sqrt(0.345 * 0.655 / n) + 0.003);
    T.same('כל הכיוונים בתוך הקונוס של 20°', n, inCone);
  });

  await T.test('פרק 7: הפתיחה, 10000 פרוטונים', async function () {
    var s = T.make(S.visCount, { mode: 'hook', N: 10000, seed: 5, locked: true });
    T.same('לפני הריצה: אפס אירועים', 0, s.getState().events);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('10000 פרוטונים', 10000, q.events);
    T.truthy('אחד או שניים ירוקים (' + q.neutrons + ')', q.neutrons === 1 || q.neutrons === 2);
    T.near('צפוי 1.54', 1.54, q.expected, 0.01);
    s.setParam('src', 'flat');
    q = s.runNow();
    T.near('flat מ-1.85: כ-20 מסלולים', 20.4, q.neutrons, 3 * Math.sqrt(20.4));
  });

  await T.test('פרק 7: 300 פרוטונים בלי ירוק, וצבירה', async function () {
    var z = T.make(S.visCount, { mode: 'zero', N: 300, src: 'analog', seed: 2, locked: true });
    await T.run(z.play(1));
    T.same('בתמונה של 300 פרוטונים: אפס ירוקים', 0, z.getState().neutrons);
    var m = z.morePictures(600);
    var pw = 1 - Math.exp(-300 * K.P_ANALOG);
    T.near('תמונות עם נייטרון: 1 − e^{−0.046}', pw, m.withNeutron / m.pictures, 3 * Math.sqrt(pw * (1 - pw) / m.pictures));
    var mem = T.make(S.visCount, { mode: 'memory', N: 50000, src: 'flat', seed: 13, locked: true });
    var q = mem.runNow();
    T.truthy('soft: לפחות מסלול לכל אירוע', q.keptSoft >= 50000);
    T.same('hard: רק מה שעבר את המסנן', q.neutrons, q.keptHard);
    T.near('ובערך 102 נייטרונים', 50000 * K.P_FLAT, q.keptHard, 3 * Math.sqrt(50000 * K.P_FLAT));
  });

  await T.test('פרק 7: הצופה', async function () {
    var v = T.make(S.visViewer, { mode: 'view', theta: 70, phi: 20, events: 50, seed: 4, locked: true });
    T.truthy('לפני הריצה: המבט של vis.mac, הקרן שמאלה', v.getState().beam.x < -0.9);
    await T.run(v.play(1));
    var q = v.getState();
    T.same('בסוף: -1 0 0', '-1,0,0', q.vec.join(','));
    T.near('והקרן ימינה', 1, q.beam.x, 1e-9);
    T.truthy('הפקודה שנוצרה', q.commands[0] === '/vis/viewer/set/viewpointVector -1 0 0');
    var r = T.make(S.visViewer, { mode: 'rotate', theta: 72, phi: -160, events: 300, seed: 9, locked: true });
    var h0 = r.getState().hash, p0 = r.getState().phi;
    await T.run(r.play(1));
    q = r.getState();
    T.same('אחרי הסיבוב: אותם 300 אירועים', 300, q.events);
    T.same('אותם מסלולים בדיוק', h0, q.hash);
    T.truthy('המצלמה זזה', q.phi !== p0);
    T.truthy('והצופה צייר שוב', q.redraws > 0);
    var st = T.make(S.visViewer, { mode: 'style', vec: [-1, 0.35, -0.3], style: 'surface', aux: false, events: 50, seed: 6, locked: true });
    await T.run(st.play(1));
    T.same('בסוף: wireframe עם auxiliaryEdge', 'wireframe,true', st.getState().style + ',' + st.getState().aux);
    var lab = T.make(S.visViewer, { mode: 'lab', seed: 21 });
    lab.setParam('src', 'flat');
    var before = lab.getState().events;
    lab.beamOn(5000);
    T.same('beamOn מוסיף אירועים', before + 5000, lab.getState().events);
    T.truthy('והמאקרו מתאר את המקור', lab.getState().commands.indexOf('/ldns/src/sampling flat') >= 0);
  });

  await T.test('פרק 7: מודלי הצבעים', async function () {
    var m = T.make(S.visModel, { locked: true });
    var c = m.getState().classes;
    T.truthy('drawByParticleID: נייטרון וגמא בצבעים שונים', c.neutron !== c.gamma);
    await T.run(m.play(1));
    c = m.getState().classes;
    T.same('אחרי הריצה: drawByCharge', 'charge', m.getState().model);
    T.same('נייטרון וגמא באותה קבוצה', c.neutron, c.gamma);
    T.truthy('פרוטון ואלקטרון נבדלים', c.proton !== c['e-']);
  });

  await T.test('פרק 7: תמונה מול טבלה', async function () {
    var t = T.make(S.visTally, { N: 150000, seed: 5, locked: true });
    await T.run(t.play(1));
    var q = t.getState();
    T.same('150000 פרוטונים', 150000, q.N);
    T.near('קווים לפרוטון ≈ 6126/3e6', K.P_FLAT, q.perCount, 3 * Math.sqrt(K.P_FLAT / q.N));
    var sd = Math.sqrt(K.P_FLAT * 2 * K.W_MEAN * K.W_MEAN / q.N);
    T.near('משקלים לפרוטון ≈ 4.47e-4', 4.47e-4, q.perWeight, 3 * sd);
    T.truthy('היחס ביניהם בערך 1/0.219', Math.abs(q.perCount / q.perWeight - 1 / K.W_MEAN) < 1.5);
  });

  await T.test('פרק 7: איפה הפרוטונים נעצרים', async function () {
    var r = T.make(S.visRange, { N: 300, seed: 3, locked: true });
    await T.run(r.play(1));
    var q = r.getState();
    T.same('300 פרוטונים', 300, q.N);
    T.same('אף אחד לא עובר 4 mm', 0, q.beyond);
    T.truthy('העמוק ביותר עד 1.3 mm', q.max <= K.R13 + 1e-9);
    var bad = 0;
    q.depths.forEach(function (d, i) { if (d > K.rangeMm(q.energies[i]) + 1e-9) bad++; });
    T.same('כל עומק ≤ הטווח של האנרגיה שלו', 0, bad);
    T.truthy('רוב הפרוטונים עוצרים בפחות מ-0.1 mm', q.depths.filter(function (d) { return d < 0.1; }).length > 150);
  });

  await T.test('פרק 7: תמונה בלי מסך', async function () {
    var o = S.visOffscreen(div(), null, {});
    T.same('לפני הריצה: אף שלב', 0, o.getState().shown);
    await T.run(o.play(1));
    T.same('כל השלבים', o.getState().total, o.getState().shown);
    T.same('והקובץ', 'results/geometry_30J_Be4.png', o.getState().file);
  });

  await T.test('פרק 7: המשחק', async function () {
    var seeds = [1, 7, 2024];
    for (var i = 0; i < seeds.length; i++) {
      var g = T.make(S.visGame, { rng: PHY.random(seeds[i]).next });
      for (var lv = 0; lv < 3; lv++) {
        var st = g.getState();
        T.same('זרע ' + seeds[i] + ': שלב ' + (lv + 1), lv, st.level);
        g.setView(st.target.theta, st.target.phi);
        g.setStyle(st.target.style); g.setAux(st.target.aux); g.setFilter(st.target.filter);
        T.same('זרע ' + seeds[i] + ': התאמה בבדיקה ראשונה', true, g.check());
        g.next();
      }
      st = g.getState();
      T.same('זרע ' + seeds[i] + ': 9 נקודות, 3 כוכבים', '9,3', st.points.reduce(function (a, b) { return a + b; }, 0) + ',' + st.stars);
    }
    var h = T.make(S.visGame, { rng: PHY.random(5).next, chapter: 'x7', section: 'game' });
    var t = h.getState().target;
    h.setView(t.theta, t.phi + 40);
    T.same('40° בצד: לא עובר', false, h.check());
    h.setView(t.theta, t.phi + 360 > 180 ? t.phi : t.phi + 360);
    h.setView(t.theta + 8, t.phi);
    T.same('8° בצד: עובר', true, h.check());
    T.same('בבדיקה השנייה: 2 נקודות', 2, h.getState().points[0]);
    h.next();
    t = h.getState().target;
    h.setView(t.theta, t.phi);
    h.setStyle(t.style === 'surface' ? 'wireframe' : 'surface');
    T.same('סגנון אחר: לא עובר', false, h.check());
  });

  await T.test('פרק 7: התרגילים', async function () {
    T.near('שאלה 1: ממוצע', 1.54, 1e4 * K.P_ANALOG, 0.005);
    T.near('שאלה 1: סיכוי לאפס (%)', 21.4, 100 * Math.exp(-1e4 * K.P_ANALOG), 0.1);
    T.rel('שאלה 2: פרוטונים לירייה', 1.18e11, 600 * 1.97e8, 0.005);
    T.near('שאלה 2: החלק (%)', 9.2, 100 * 600 * 1.97e8 / 1.28e12, 0.05);
    T.near('שאלה 4: x', 0.883, K.tpVector(70, 20)[0], 1e-3);
    T.near('שאלה 4: z', 0.342, K.tpVector(70, 20)[2], 1e-3);
    T.rel('שאלה 5: analog', 6.5e5, 100 / K.P_ANALOG, 0.01);
    T.rel('שאלה 5: flat', 4.9e4, 100 / K.P_FLAT, 0.01);
    T.near('בוחן: רדיוס הקונוס (mm)', 16.4, 45 * Math.tan(20 * Math.PI / 180), 0.05);
  });
});
