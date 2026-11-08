/* Chapter 3: geometry and materials. Runs inside tests/physics.html?only=03.
   The checks read what the sims built (z boundaries, printouts, sampled rays, number densities), and
   compare them with the formulas and with the lines of the real run log. */
PHY_T.load(['ch03/kit.js', 'ch03/geo-cone.js', 'ch03/geo-build.js', 'ch03/geo-units.js', 'ch03/geo-material.js', 'ch03/geo-insert.js', 'ch03/geo-game.js', 'ch03/geo-traps.js']);

PHY_T.add(async function (T) {
  var S = PHY.sims, K = PHY.ch03;
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };

  await T.test('פרק 3: הטבלה כמו בלוג של ריצת ה-Be', async function () {
    var b = K.build({ layers: [{ mat: 'Be', t: 2 }], distance: 45, radius: 22 });
    T.same('כותרת', '================ LDNS converter geometry ================', b.lines[0]);
    T.same('שורת המקור (מהלוג)', ' source at z = 0, front face at z = 4.5 cm , radius = 2.2 cm ', b.lines[1]);
    T.same('שורת השכבה (מהלוג)', '  layer 0 : Be (G4_Be, rho = 1.848 g/cm3)  t = 2 mm   z = [45, 47] mm', b.lines[2]);
    T.same('בלי מאט', '  moderator : none', b.lines[3]);
    T.same('בדיקת החפיפות (מהלוג)', 'Checking overlaps for volume Layer0_Be:1 (G4Tubs) ... OK! ', b.overlaps[0]);
    T.same('G4BestUnit: 16 mm → 1.6 cm', '1.6 cm ', K.bestUnit(16));
    T.same('G4BestUnit: 0.5 mm → 500 um', '500 um ', K.bestUnit(0.5));
    T.same('G4BestUnit: 2000 mm → 2 m', '2 m  ', K.bestUnit(2000));
    var two = K.build({ layers: [{ mat: 'LiF', t: 2 }, { mat: 'Pb', t: 10 }], distance: 20, radius: 25 });
    T.same('LiF 2 | Pb 10 ב-20 mm: גבולות z', '20,22,32', two.zb.join(','));
    T.same('Pb: עותק 2, השם Layer1_Pb', 'Layer1_Pb:2', two.volumes[2].name + ':' + two.volumes[2].copy);
    T.same('מאקרו: addLayer לפי הסדר', '/ldns/det/addLayer LiF 2 mm|/ldns/det/addLayer Pb 10 mm', two.macro.slice(1, 3).join('|'));
  });

  await T.test('פרק 3: הקונוס והדיסקה', async function () {
    T.near('45·tan 20° (mm)', 16.38, K.coneR(45, 20), 0.01);
    T.near('47·tan 20° (mm)', 17.11, K.coneR(47, 20), 0.01);
    T.near('61·tan 20° (mm)', 22.20, K.coneR(61, 20), 0.01);
    T.near('דיסקה של 10 mm ב-45 mm: θ_disc (deg)', 12.53, K.thetaDisc(45, 10), 0.01);
    T.near('ו-39.5% פוגעים', 0.3949, K.intercept(45, 10, 20), 5e-4);
    var s = T.make(S.geoCone, { mode: 'hook', locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.same('הפתיחה: אף קרן לא מפספסת', 0, q.missed);
    T.same('ולפי הזוויות: הכול פוגע', 1, q.frac);
    var c = T.make(S.geoCone, { mode: 'check', r: 12, N: 20000, seed: 9, locked: true });
    await T.run(c.play(1));
    q = c.getState();
    T.near('דיסקה של 12 mm: (1 − cos θ_disc)/(1 − cos 20°)', 0.5599, q.frac, 5e-4);
    T.near('ו-20000 קרניים אחידות בזווית המרחבית נותנות אותו דבר', q.frac, q.fracSampled, 3 * Math.sqrt(q.frac * (1 - q.frac) / 20000));
    c.setParam('r', 25); c.setParam('d', 45);
    T.same('דיסקה רחבה מהקונוס: הכול פוגע', 1, c.getState().frac);
    c.setParam('r', 10);
    T.near('דיסקה של 10 mm: דגימה מול נוסחה', 0.3949, c.getState().fracSampled, 3 * Math.sqrt(0.3949 * 0.6051 / 20000));
  });

  await T.test('פרק 3: בניית השכבות', async function () {
    var s = T.make(S.geoBuild, { mode: 'card', locked: true });
    T.same('לפני הריצה: רק Be', 1, s.getState().model.layers.length);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('Pb מאחורי ה-Be: [47, 57]', '45,47,57', q.zb.join(','));
    T.same('שורת ה-Pb', '  layer 1 : Pb (G4_Pb, rho = 11.35 g/cm3)  t = 1 cm   z = [47, 57] mm', q.lines[3]);
    T.same('שתי בדיקות חפיפות', 'Layer0_Be:1,Layer1_Pb:2', q.overlaps.map(function (l) { return l.split(' ')[4]; }).join(','));
    var lab = T.make(S.geoBuild, { mode: 'lab' });
    lab.setParam('layers', [{ mat: 'Be', t: 2 }, { mat: 'Pb', t: 16 }]);
    q = lab.getState();
    T.same('מעבדה: Pb 16 mm מודפס 1.6 cm', true, q.lines[3].indexOf('t = 1.6 cm ') > 0);
    lab.setParam('modMode', 'insert'); lab.setParam('insert', 60);
    q = lab.getState();
    T.same('insert עמוק מהמרחק: LDNS005', 'LDNS005', q.errors.length ? q.errors[0].code : 'none');
    lab.setParam('insert', 10);
    q = lab.getState();
    T.same('insert של 10 mm: אין שגיאה', 0, q.errors.length);
    T.same('השכבות בנות של המאט', 'Moderator,Moderator', q.volumes.filter(function (v) { return /^Layer/.test(v.name); }).map(function (v) { return v.mother; }).join(','));
    T.same('ותעלה, עותק 101', true, q.volumes.some(function (v) { return v.name === 'Channel' && v.copy === 101; }));
  });

  await T.test('פרק 3: יחידות', async function () {
    var s = T.make(S.geoUnits, { mode: 'card', locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.same('1.6 cm נשמר כ-16 (mm)', 16, q.stored);
    T.same('ומודפס t = 1.6 cm, z = [45, 61]', '  layer 0 : Be (G4_Be, rho = 1.848 g/cm3)  t = 1.6 cm   z = [45, 61] mm', q.printed);
    var t = T.make(S.geoUnits, { mode: 'trap', locked: true });
    await T.run(t.play(1));
    q = t.getState();
    T.same('בלי יחידה: ברירת המחדל mm', 'mm', q.used);
    T.same('ונשמר 2', 2, q.stored);
    t.setParam('unit', 'um'); t.setParam('value', 500);
    T.near('500 um = 0.5 mm', 0.5, t.getState().stored, 1e-12);
    t.setParam('unit', 'm'); t.setParam('value', 2);
    T.same('2 m = 2000 mm', 2000, t.getState().stored);
  });

  await T.test('פרק 3: חומרים וצפיפויות', async function () {
    var be = K.numberDensities('Be');
    T.rel('Be: 1.235×10²³ cm⁻³', 1.235e23, be.nUnit, 2e-3);
    var lif = K.numberDensities('LiF');
    T.rel('LiF: 6.12×10²² יחידות ב-cm³', 6.12e22, lif.nUnit, 2e-3);
    var li7 = lif.elements[0].iso.filter(function (i) { return i.A === 7; })[0].n;
    T.rel('⁷Li ב-LiF: 5.66×10²²', 5.66e22, li7, 2e-3);
    T.near('ב-LiF: שכיחויות Li מסתכמות ב-1', 1, sum(lif.elements[0].iso.map(function (i) { return i.frac; })), 1e-12);
    T.near('n_i = ρ N_A w_i / A_i שווה ליחידות כפול אטומים', lif.nUnit, lif.elements[1].n, lif.nUnit * 1e-9);
    var pe = K.numberDensities('HDPE');
    T.rel('HDPE: שני מימנים לכל פחמן', 2, pe.elements[1].n / pe.elements[0].n, 1e-9);
    var s = T.make(S.geoMaterial, { locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    T.rel('Li מתכתי: 4.63×10²²', 4.63e22, q.liMetal, 3e-3);
    T.rel('היחס LiF / Li: 1.32', 1.32, q.ratio, 3e-3);
    s.setParam('material', 'Be'); s.setParam('sigma', 1);
    T.rel('כרטיס Be, σ = 1 b: λ = 81.0 mm', 81.0, s.getState().table[0].lam, 2e-3);
    s.setParam('material', 'Pb');
    T.same('Pb: ארבעה איזוטופים', 4, s.getState().table.length);
  });

  await T.test('פרק 3: נפחים מקוננים ו-LDNS005', async function () {
    var s = T.make(S.geoInsert, { locked: true });
    var q0 = s.getState();
    T.same('דוגמת המדריך: המאט מתחיל ב-3 mm', 3, q0.modZ[0]);
    T.same('בלי שגיאה', 0, q0.errors.length);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('distance 40 mm: המאט מתחיל ב-−2 mm', -2, q.modZ[0]);
    T.same('ו-LDNS005', 'LDNS005', q.errors[0].code);
    T.truthy('בגלל המקור', /source would be inside the moderator/.test(q.errors[0].text));
    s.setParam('distance', 90); s.setParam('insert', 85);
    q = s.getState();
    T.truthy('ממיר שלא נכנס: LDNS005 מהסיבה השנייה', q.errors.length && /does not fit/.test(q.errors[0].text));
    s.setParam('distance', 45); s.setParam('insert', 42); s.setParam('refl', true);
    q = s.getState();
    T.same('מחזיר: עותק 102, בן של העולם', 'World:102', q.volumes.filter(function (v) { return v.name === 'ReflectorSide'; }).map(function (v) { return v.mother + ':' + v.copy; }).join(''));
    T.same('שורת המחזיר', '  reflector : Be (G4_Be, rho = 1.848 g/cm3), side shell r = [50, 100] mm', q.lines.filter(function (l) { return /reflector/.test(l); })[0]);
    T.same('שורת ה-INSERT', '      INSERT mode: converter inside the moderator, front face 42 mm below the upstream face (vacuum channel r = 22 mm)', q.lines.filter(function (l) { return /INSERT/.test(l); })[0]);
  });

  await T.test('פרק 3: המשחק, משחק מושלם', async function () {
    var seeds = [1, 7, 2024];
    for (var i = 0; i < seeds.length; i++) {
      var g = T.make(S.geoGame, { rng: PHY.random(seeds[i]).next });
      for (var lv = 0; lv < 3; lv++) {
        var st = g.getState();
        T.same('זרע ' + seeds[i] + ': שלב ' + (lv + 1) + ', שכבות', lv === 0 ? 1 : 2, st.target.layers.length);
        st.target.layers.forEach(function (l, j) { g.set('mat' + j, l.mat); g.set('t' + j, l.t); });
        g.set('distance', st.target.distance); g.set('radius', st.target.radius);
        T.same('זרע ' + seeds[i] + ': הטבלה שלנו זהה', st.targetLines.join('|'), K.build(g.getState().model).lines.join('|'));
        T.same('זרע ' + seeds[i] + ': ניצחון בבדיקה ראשונה', true, g.check());
        g.next();
      }
      st = g.getState();
      T.same('זרע ' + seeds[i] + ': 9 נקודות, 3 כוכבים', '9,3', sum(st.points) + ',' + st.stars);
    }
  });

  await T.test('פרק 3: המשחק, טעויות עולות נקודות', async function () {
    var g = T.make(S.geoGame, { rng: PHY.random(5).next, chapter: 'x3', section: 'game' });
    var st = g.getState();
    g.set('distance', st.target.distance === 80 ? 79 : 80);
    T.same('מרחק שגוי: לא עובר', false, g.check());
    T.truthy('והמשוב אומר מה שונה', g.getState().diff.indexOf('המרחק') >= 0);
    st.target.layers.forEach(function (l, j) { g.set('mat' + j, l.mat); g.set('t' + j, l.t); });
    g.set('distance', st.target.distance); g.set('radius', st.target.radius);
    g.check();
    T.same('הצלחה בבדיקה השנייה: 2 נקודות', 2, g.getState().points[0]);
    for (var lv = 1; lv < 3; lv++) {
      g.next(); st = g.getState();
      st.target.layers.forEach(function (l, j) { g.set('mat' + j, l.mat); g.set('t' + j, l.t); });
      g.set('distance', st.target.distance); g.set('radius', st.target.radius);
      g.check();
    }
    g.next();
    st = g.getState();
    T.same('2 + 3 + 3 = 8 נקודות: שלושה כוכבים', '8,3', sum(st.points) + ',' + st.stars);
    T.same('הכוכבים נשמרו', 3, PHY.progress.chapter('x3').game);
    T.same('הסעיף סומן', true, PHY.progress.hasSection('x3', 'game'));
  });

  await T.test('פרק 3: מלכודות', async function () {
    var w = T.make(S.geoWorld, { locked: true });
    await T.run(w.play(1));
    var q = w.getState();
    T.same('העולם: G4_Galactic', 'G4_Galactic', q.material);
    T.same('חצי צלע: 1 m כשהממיר נגמר ב-47 mm', 1000, q.half);

    var t = T.make(S.geoThick, { locked: true });
    await T.run(t.play(1));
    q = t.getState();
    T.truthy('כל הפרוטונים נעצרים לפני 1.3 mm', q.maxRange <= 1.3 + 1e-9);
    T.same('2 mm ו-4 mm: אותו מספר נקודות לידה', q.bornAt(2), q.bornAt(4));
    T.same('ושניהם כל הלידות', q.births, q.bornAt(2));
    T.truthy('שכבה של 1 mm: כמעט הכול', q.bornAt(1) >= 0.9 * q.births);
    T.truthy('אבל לא שכבה של 0.2 mm', q.bornAt(0.2) < 0.8 * q.births);

    var r = T.make(S.geoRadius, { locked: true });
    await T.run(r.play(1));
    q = r.getState();
    T.same('רדיוס 22: קוטר 44 mm', 44, q.diameter);
    T.near('עקבת הקונוס: 32.8 mm', 32.76, q.footprint, 0.01);
    T.near('שוליים: 5.6 mm', 5.62, q.margin, 0.01);
  });
});
