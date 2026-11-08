/* Chapter 6: the macro sims, checked against what ldns and Geant4 do. Runs inside tests/physics.html?only=06.
   The mock executor must reproduce the real Be 2 mm run (30J 300fs/neutrons/output/E30J_M2p5_Be2.log) line by
   line, and refuse each broken macro at the right line for the right reason. */
PHY_T.load(['ch06/kit.js', 'ch06/mac-terminal.js', 'ch06/mac-tree.js', 'ch06/mac-states.js', 'ch06/mac-paths.js', 'ch06/mac-game.js']);

PHY_T.add(async function (T) {
  var S = PHY.sims, K = PHY.ch06;
  var outs = function (c) { return c.entries.filter(function (e) { return e.k === 'out'; }).map(function (e) { return e.s; }); };
  var errs = function (c) { return c.entries.filter(function (e) { return e.k === 'err'; }).map(function (e) { return e.s; }); };
  var has = function (list, s) { return list.indexOf(s) >= 0; };
  var div = function () { var d = document.createElement('div'); T.stage.appendChild(d); return d; };

  await T.test('פרק 6: עיצוב המספרים כמו ב-C++ וב-G4BestUnit', async function () {
    T.same('1.85', '1.85', K.cpp(1.85));
    T.same('13.0 MeV מודפס כ-13', '13', K.cpp(13.0));
    T.same('1.16541e+12', '1.16541e+12', K.cpp(1.16541e12));
    T.same('45 mm = "4.5 cm "', '4.5 cm ', K.bestUnit(45));
    T.same('22 mm = "2.2 cm "', '2.2 cm ', K.bestUnit(22));
    T.same('2 mm = "2 mm "', '2 mm ', K.bestUnit(2));
    T.same('0.2 mm = "200 um "', '200 um ', K.bestUnit(0.2));
    T.same('16 mm = "1.6 cm "', '1.6 cm ', K.bestUnit(16));
  });

  await T.test('פרק 6: המאקרו האמיתי משחזר את הלוג של ריצת ה-Be', async function () {
    var c = K.execute(K.MACROS.be2);
    var o = outs(c);
    T.same('בלי עצירה', null, c.stopped);
    T.same('בלי בעיות', 0, c.issues.length);
    T.truthy('שורת המקור והרדיוס', has(o, ' source at z = 0, front face at z = 4.5 cm , radius = 2.2 cm '));
    T.truthy('שורת השכבה, כמו בלוג', has(o, '  layer 0 : Be (G4_Be, rho = 1.848 g/cm3)  t = 2 mm   z = [45, 47] mm'));
    T.truthy('בדיקת החפיפות', has(o, 'Checking overlaps for volume Layer0_Be:1 (G4Tubs) ... OK! '));
    T.truthy('פרוטונים לירייה 4.416e+11', has(o, '  protons per shot (cone): 4.416e+11'));
    T.truthy('האנרגיה הממוצעת 3.93697 MeV', has(o, '  mean proton energy     : 3.93697 MeV'));
    T.truthy('נייטרונים יוצאים לפרוטון', has(o, '   leaving the converter       : 4.470e-04 +- 9.048e-06'));
    T.truthy('נייטרונים לירייה', has(o, ' neutrons per SHOT leaving: 1.974e+08 +- 3.995e+06'));
    T.same('6 שורות התקדמות (0 עד 2500000)', 6, o.filter(function (s) { return /--> Event \d+ starts/.test(s); }).length);
    T.same('הקבצים', 'output/E30J_M2p5_Be2.root,output/E30J_M2p5_Be2_summary.json', c.files.join(','));
    var st = c.entries.filter(function (e) { return e.k === 'state'; }).map(function (e) { return e.s; }).join(' ');
    T.same('המצבים', 'Init Idle GeomClosed EventProc GeomClosed Idle', st);
    T.rel('התפוקה לפרוטון כפול פרוטונים לירייה = לירייה', 1.974e8, 4.470e-4 * 4.416e11, 1e-3);
  });

  await T.test('פרק 6: פקודת ממיר אחרי האתחול', async function () {
    var HOOK = ['/control/verbose 2', '/ldns/det/clearLayers', '/ldns/det/addLayer Be 2 mm', '/ldns/det/distance 45 mm', '/run/initialize', '/ldns/src/mode spectrum', '/ldns/src/file ' + K.SPEC, '/ldns/src/Emin 1.85 MeV', '/ldns/det/radius 22 mm', '/ldns/out/level 2', '/analysis/setFileName output/E30J_M2p5_Be2', '/run/beamOn 3000000'].join('\n');
    var c = K.execute(HOOK);
    T.same('נעצר בשורה 9', 8, c.stopped.line);
    T.same('בגלל המצב', 'state', c.stopped.kind);
    T.truthy('ההודעה', has(errs(c), '***** Illegal application state </ldns/det/radius 22 mm> *****'));
    T.truthy('והמאקרו נקטע', has(errs(c), '***** Batch is interrupted!! *****'));
    T.truthy('הרדיוס בטבלה: ברירת המחדל 2.5 cm', has(outs(c), ' source at z = 0, front face at z = 4.5 cm , radius = 2.5 cm '));
    T.same('אף ריצה', 0, c.runs.length);
    var t = K.execute(K.MACROS.be2.replace('/ldns/det/radius 22 mm\n/run/initialize', '/run/initialize\n/ldns/det/radius 22 mm'));
    T.same('גם מיד אחרי initialize', 'state', t.stopped.kind);
  });

  await T.test('פרק 6: מספר שלם, יחידות ונקודה', async function () {
    var c = K.execute(K.variant([{ at: 17, text: '/run/beamOn 3e6' }]));
    T.truthy('3e6: integer expected', has(errs(c), '3e6: integer expected.'));
    T.same('לא רצה ריצה', 0, c.runs.length);
    c = K.execute(K.variant([{ at: 17, text: '/run/beamOn 300/' }]));
    T.truthy('300/: integer expected', has(errs(c), '300/: integer expected.'));
    c = K.execute(K.MACROS.be2Lines.slice(0, 7).map(function (l, i) { return i === 3 ? '/ldns/det/addLayer Be 0.2' : l; }).join('\n'));
    T.same('addLayer בלי יחידה עובר', null, c.stopped);
    T.truthy('ונבנה 0.2 mm: t = 200 um', has(outs(c), '  layer 0 : Be (G4_Be, rho = 1.848 g/cm3)  t = 200 um   z = [45, 45.2] mm'));
    T.truthy('עם אזהרה בבודק', c.issues.some(function (q) { return q.kind === 'unitdefault'; }));
    c = K.execute(K.MACROS.be2Lines.slice(0, 7).map(function (l, i) { return i === 3 ? '/ldns/det/addLayer Be 0.2 cm' : l; }).join('\n'));
    T.truthy('עם cm: t = 2 mm', has(outs(c), '  layer 0 : Be (G4_Be, rho = 1.848 g/cm3)  t = 2 mm   z = [45, 47] mm'));
    c = K.execute(K.variant([{ at: 4, text: '/ldns/det/distance 45' }]));
    T.same('distance בלי יחידה נדחית: אין ברירת מחדל', 'missing', c.stopped.kind);
    c = K.execute(K.variant([{ at: 9, text: '/ldns/src/Emin 1850' }]));
    T.same('Emin 1850 נקרא כ-MeV: Emax <= Emin', 'emax', c.stopped.kind);
    c = K.execute(K.variant([{ at: 15, text: '/analysis/setFileName output/E30J_M2.5_Be2' }]));
    T.same('נקודה: הריצה עוברת', null, c.stopped);
    T.same('ורק ה-JSON נכתב', 'output/E30J_M2.5_Be2_summary.json', c.files.join(','));
    T.truthy('והמספרים זהים לריצה האמיתית', has(outs(c), ' neutrons per SHOT leaving: 1.974e+08 +- 3.995e+06'));
    c = K.execute(K.MACROS.be2 + '\n/run/beamOn 3000000');
    T.same('אותו שם פעמיים: אזהרת דריסה', 'overwrite', c.issues[0].kind);
    T.same('והריצה השנייה לא מקבלת את המספרים של הראשונה', 'true,false', c.runs.map(function (r) { return r.canonical; }).join(','));
    c = K.execute(K.variant([{ at: 8, text: '/ldns/src/file data/hermione_E9.0J_tau27fs_R0um.txt' }]));
    T.truthy('נתיב לא נכון: Cannot open spectrum file', errs(c).indexOf('Cannot open spectrum file: data/hermione_E9.0J_tau27fs_R0um.txt') >= 0);
    c = K.execute(K.variant([{ at: 9, text: '/ldns/src/Emni 1.85 MeV' }]));
    T.truthy('שגיאת כתיב: COMMAND NOT FOUND', has(errs(c), '***** COMMAND NOT FOUND </ldns/src/Emni 1.85 MeV> *****'));
  });

  await T.test('פרק 6: foreach ו-loop', async function () {
    var fs = { '../macros/one_energy.mac': K.MACROS.oneEnergy };
    var c = K.execute('/control/verbose 2\n' + K.MACROS.scanEnergy, { cwd: 'build', fs: fs });
    T.same('ארבע ריצות', 4, c.runs.length);
    T.same('ארבעה קובצי ROOT', 4, c.files.filter(function (f) { return /\.root$/.test(f); }).length);
    T.truthy('{E} הוחלף ב-5', c.entries.some(function (e) { return e.k === 'cmd' && e.s === '/ldns/src/energy 5 MeV'; }));
    T.same('שמות הקבצים', 'output/mono_5MeV,output/mono_10MeV,output/mono_20MeV,output/mono_40MeV', c.runs.map(function (r) { return r.name; }).join(','));
    T.truthy('הממיר: LiF 4 mm במרחק ברירת המחדל 20 mm', has(outs(c), '  layer 0 : LiF (G4_LITHIUM_FLUORIDE, rho = 2.635 g/cm3)  t = 4 mm   z = [20, 24] mm'));
    var one = '/ldns/src/Emin {EMIN} MeV\n/analysis/setFileName output/Be2_Emin{EMIN}\n/run/beamOn 200000';
    var base = K.MACROS.be2Lines.slice(0, 14).join('\n');
    c = K.execute(base + '\n/control/loop one_emin.mac EMIN 2 6 1', { fs: { 'one_emin.mac': one } });
    T.same('loop 2..6: חמש ריצות', 5, c.runs.length);
    T.same('ו-\\(10^{6}\\) אירועים', 1000000, c.runs.reduce(function (a, r) { return a + r.N; }, 0));
    c = K.execute(base + '\n/control/loop one_emin.mac EMIN 1.5 3.5 0.5', { fs: { 'one_emin.mac': one } });
    T.same('loop 1.5..3.5 בחצאים: 5 ריצות', 5, c.runs.length);
    T.same('רק 2 קובצי ROOT (שמות בלי נקודה)', 2, c.files.filter(function (f) { return /\.root$/.test(f); }).length);
    T.same('ו-5 קובצי JSON', 5, c.files.filter(function (f) { return /_summary\.json$/.test(f); }).length);
    var SCAN = ['/ldns/det/clearLayers', '/ldns/det/addLayer Be 2 mm', '/ldns/det/distance 45 mm', '/ldns/det/radius 22 mm', '/run/initialize', '/ldns/src/mode spectrum', '/ldns/src/file ' + K.SPEC, '/analysis/setFileName output/Be2', '/run/beamOn 100000', '/ldns/det/clearLayers', '/ldns/det/addLayer Be 4 mm', '/analysis/setFileName output/Be4', '/run/beamOn 100000'].join('\n');
    c = K.execute(SCAN);
    T.same('סריקת עובי במאקרו אחד: ריצה אחת', 1, c.runs.length);
    T.same('ועצירה ב-clearLayers השני', 9, c.stopped.line);
  });

  await T.test('פרק 6: עץ הפקודות', async function () {
    var tr = S.macTree(div(), null, { probe: '/ldns/det/addLayer Be', probeState: 'PreInit', locked: true });
    T.same('לפני הריצה אין כרטיס פתוח', null, tr.getState().open);
    await T.run(tr.play(1));
    var r = tr.getState().result;
    T.same('נמצאה', true, r.found);
    T.same('המצב מותר', true, r.stateOk);
    T.same('הפרמטר החסר: thickness', 'missing,1', r.err + ',' + r.errIndex);
    T.same('הכרטיס של addLayer פתוח', '/ldns/det/addLayer', tr.getState().open);
    T.same('ההודעה', '***** Illegal parameter (1) </ldns/det/addLayer Be> *****', r.msg[r.msg.length - 1]);
    T.same('עם עובי: עובר, היחידה מברירת המחדל', 'true,mm', String(tr.check('/ldns/det/addLayer Be 2', 'PreInit').ok) + ',' + tr.check('/ldns/det/addLayer Be 2', 'PreInit').params[2].value);
    T.same('ב-Idle: מצב לא חוקי', false, tr.check('/ldns/det/addLayer Be 2 mm', 'Idle').stateOk);
    T.same('Emin בלי יחידה עובר (MeV)', true, tr.check('/ldns/src/Emin 1.85', 'Idle').ok);
    T.same('distance בלי יחידה לא עובר', false, tr.check('/ldns/det/distance 45', 'PreInit').ok);
    T.same('ספריית ldns/det', '/ldns/det/addLayer,/ldns/det/clearLayers,/ldns/det/distance,/ldns/det/maxStep,/ldns/det/radius', K.children('/ldns/det/').join(','));
  });

  await T.test('פרק 6: מכונת המצבים', async function () {
    var M = ['/ldns/det/clearLayers', '/ldns/det/addLayer Be 2 mm', '/ldns/det/distance 45 mm', '/run/initialize', '/run/beamOn 3', '/ldns/src/Emin 3 MeV', '/ldns/det/radius 30 mm'].join('\n');
    var s = T.make(S.macStates, { macro: M, locked: true });
    T.same('לפני הריצה: PreInit, בלי סימונים', 'PreInit,0', s.getState().state + ',' + s.getState().verdicts.filter(function (x) { return x !== undefined; }).length);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('Emin התקבל', true, q.verdicts[5]);
    T.same('radius נדחה', false, q.verdicts[6]);
    T.same('שלושה אירועים: EventProc שלוש פעמים', 3, q.trace.filter(function (x) { return x === 'EventProc'; }).length);
    T.same('המצב בסוף: Idle', 'Idle', q.state);
    T.same('ביקור בכל חמשת המצבים', 5, q.visited.length);
    T.same('xs/dump רק ב-Idle', 'false,true', String(s.tryLine('/ldns/xs/dump proton Be 1 13 60 x.csv', 'PreInit').ok) + ',' + s.tryLine('/ldns/xs/dump proton Be 1 13 60 x.csv', 'Idle').ok);
  });

  await T.test('פרק 6: נתיבים יחסיים', async function () {
    var p = S.macPaths(div(), null, { mode: 'file', locked: true });
    T.same('resolve', 'geant4_converter/macros/my_run.mac', p.resolve('geant4_converter/build/', '../macros/my_run.mac'));
    await T.run(p.play(1));
    T.same('הספקטרום: העותק ב-build', 'geant4_converter/build/data/hermione_E9.0J_tau27fs_R0um.txt', p.getState().dataFile);
    T.same('המאקרו: המקור', 'geant4_converter/macros/my_run.mac', p.getState().macroFile);
    var c = S.macPaths(div(), null, { mode: 'copy', locked: true });
    await T.run(c.play(1));
    T.same('macros/X.mac מתוך build: העותק', 'geant4_converter/build/macros/my_run.mac', c.getState().macroFile);
    T.same('ולכן Be 2 mm', 'Be 2 mm', c.getState().layer);
    c.setParam('macroArg', '../macros/my_run.mac');
    T.same('עם ../ : המקור, Be 4 mm', 'Be 4 mm', c.resolveNow().layer);
  });

  await T.test('פרק 6: המסוף', async function () {
    var host = div();
    var t = S.macTerminal(host, null, { macro: K.MACROS.be2, locked: true });
    T.same('לפני הריצה לא רץ כלום', false, t.getState().ran);
    T.truthy('והמסוף ריק', t.getState().terminalText.indexOf('LDNS') < 0);
    await T.run(t.play(1));
    var q = t.getState();
    T.same('כל השורות הוצגו', q.ctx.entries.length, q.shown);
    T.same('שני קבצים ברשימה', 2, q.files.length);
    T.same('המצב בסוף', 'Idle', q.state);
    T.truthy('הסיכום במסוף', q.terminalText.indexOf('neutrons per SHOT leaving: 1.974e+08') >= 0);
  });

  await T.test('פרק 6: המשחק, משחק מושלם', async function () {
    var seeds = [1, 7, 2024];
    for (var i = 0; i < seeds.length; i++) {
      var g = S.macGame(div(), div(), { rng: PHY.random(seeds[i]).next });
      var st = g.getState();
      T.truthy('זרע ' + seeds[i] + ': שלב 1, המאקרו השבור נעצר במצב', K.execute(st.lines.join('\n')).stopped.kind === 'state');
      g.tap(st.bad);
      T.same('זרע ' + seeds[i] + ': אחרי ההזזה המאקרו רץ', true, g.getState().ok);
      g.next();
      st = g.getState();
      T.truthy('זרע ' + seeds[i] + ': שלב 2, יש שורה שבורה', K.execute(st.lines.join('\n'), { lint: true }).issues.length > 0 || /0\.2$|1850$|0\.35$/.test(st.lines[st.bad]));
      g.tap(st.bad);
      g.choose(st.opts.indexOf(st.fix.right));
      T.same('זרע ' + seeds[i] + ': שלב 2 עבר', 'won', g.getState().phase);
      g.next();
      st = g.getState();
      [0, 1, 2, 3, 4, 5, 6, 7].forEach(function (k) { g.pick(k); });
      g.check();
      T.same('זרע ' + seeds[i] + ': שלב 3 עבר בסדר המקורי', 'won', g.getState().phase);
      g.next();
      st = g.getState();
      T.same('זרע ' + seeds[i] + ': 9 נקודות, 3 כוכבים', '9,3', st.points.reduce(function (a, b) { return a + b; }, 0) + ',' + st.stars);
    }
  });

  await T.test('פרק 6: המשחק, טעויות עולות נקודות', async function () {
    var g = S.macGame(div(), div(), { rng: PHY.random(5).next, chapter: 'x6', section: 'game' });
    var st = g.getState();
    g.tap(st.bad === 0 ? 1 : 0);
    g.tap(st.bad);
    T.same('שלב 1 עם טעות: 2 נקודות', 2, g.getState().points[0]);
    g.next();
    st = g.getState();
    g.tap(st.bad);
    var wrong = st.opts.findIndex(function (o) { return o !== st.fix.right; });
    g.choose(wrong);
    g.choose(st.opts.indexOf(st.fix.right));
    T.same('שלב 2 עם טעות: 2 נקודות', 2, g.getState().points[1]);
    g.next();
    [7, 0, 1, 2, 3, 4, 5, 6].forEach(function (k) { g.pick(k); });
    T.same('beamOn ראשון: לא עובר', false, g.check());
    g.clear();
    [0, 1, 2, 3, 4, 5, 6, 7].forEach(function (k) { g.pick(k); });
    g.check();
    T.same('בבדיקה השנייה: 2 נקודות', 2, g.getState().points[2]);
    g.next();
    st = g.getState();
    T.same('6 נקודות: שני כוכבים', '6,2', st.points.reduce(function (a, b) { return a + b; }, 0) + ',' + st.stars);
    T.same('הכוכבים נשמרו', 2, PHY.progress.chapter('x6').game);
  });

  await T.test('פרק 6: התרגילים', async function () {
    T.near('שאלה 1: זמן הסריקה (s)', 93.9, 8 * 2e6 / (3e6 / 17.6), 0.05);
    T.near('שאלה 3: 0.35 rad במעלות', 20.05, 0.35 * 180 / Math.PI, 0.01);
    var c = K.execute(K.variant([{ at: 11, text: '/ldns/src/halfAngle 0.35' }]));
    T.truthy('שאלה 3: בלי יחידה Geant4 לוקח deg', c.issues.some(function (q) { return q.kind === 'unitdefault'; }));
  });
});
