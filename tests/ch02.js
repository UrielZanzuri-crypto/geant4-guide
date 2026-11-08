/* Chapter 2: how Geant4 is organised. Runs inside tests/physics.html?only=02.
   The checks read what the sims built and played (the callback sequence, the stack, the rows written,
   the lanes), not the parameters passed in. */
PHY_T.load(['ch02/kit.js', 'ch02/arch-count.js', 'ch02/arch-event.js', 'ch02/arch-timeline.js', 'ch02/arch-stack.js', 'ch02/arch-leak.js', 'ch02/arch-threads.js', 'ch02/arch-lab.js', 'ch02/arch-order-game.js', 'ch02/arch-run-boxes.js', 'ch02/arch-traj.js', 'ch02/arch-time.js']);

PHY_T.add(async function (T) {
  var S = PHY.sims, K = PHY.ch02;
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var user = function (ev) { return ev.seq.filter(function (e) { return K.isUser(e.cb); }); };

  await T.test('פרק 2: מנוע האירוע, הסדר של Geant4', async function () {
    var ev = K.transport(K.EV1, 'lifo');
    T.same('חמישה מסלולים', 5, ev.tracks.length);
    T.same('21 צעדים', 21, ev.nSteps);
    T.same('הורים 0, 1, 1, 1, 3', '0,1,1,1,3', ev.tracks.map(function (t) { return t.parent; }).join(','));
    T.same('יוצרים', ',protonInelastic,protonInelastic,protonInelastic,compt', ev.tracks.map(function (t) { return t.creator; }).join(','));
    T.same('חלקיקים לפי המספרים', 'proton,neutron,gamma,nucleus,electron', ev.tracks.map(function (t) { return t.p; }).join(','));
    T.same('סדר ההובלה: אחרון נכנס, ראשון יוצא', '1,4,3,5,2', ev.order.join(','));
    var u = user(ev).map(function (e) { return e.cb; });
    T.same('GeneratePrimaries לפני BeginOfEventAction', 'GeneratePrimaries,BeginOfEventAction', u.slice(0, 2).join(','));
    T.same('EndOfEventAction אחרון', 'EndOfEventAction', u[u.length - 1]);
    var n = function (cb) { return u.filter(function (c) { return c === cb; }).length; };
    T.same('PreUserTrackingAction: פעם לכל מסלול', 5, n('PreUserTrackingAction'));
    T.same('PostUserTrackingAction: פעם לכל מסלול', 5, n('PostUserTrackingAction'));
    T.same('UserSteppingAction: פעם לכל צעד', 21, n('UserSteppingAction'));
    /* every step lies between the Pre and Post of its own track, and a track is never interrupted */
    var cur = 0, ok = true, pushedAfterPost = true, lastPost = 0;
    ev.seq.forEach(function (e) {
      if (e.cb === 'PreUserTrackingAction') { if (cur) ok = false; cur = e.id; }
      if (e.cb === 'UserSteppingAction' && e.id !== cur) ok = false;
      if (e.cb === 'PostUserTrackingAction') { if (e.id !== cur) ok = false; lastPost = e.id; cur = 0; }
      if (e.cb === 'push' && e.ids[0] !== 1 && ev.track(e.ids[0]).parent !== lastPost) pushedAfterPost = false;
    });
    T.truthy('כל צעד בין ה-Pre וה-Post של המסלול שלו', ok);
    T.truthy('משניים נכנסים למחסנית אחרי שההורה נגמר', pushedAfterPost);
    var q = K.transport(K.EV1, 'fifo');
    T.same('תור: סדר אחר', '1,2,3,4,5', q.order.join(','));
    T.same('תור: אותם מסלולים ואותם צעדים', '5,21', q.tracks.length + ',' + q.nSteps);
    var tl = K.timeline(ev), mid = K.stateAt(ev, tl, tl.T / 2), end = K.stateAt(ev, tl, tl.T);
    T.truthy('באמצע האירוע: חלק מהצעדים', mid.nSteps > 0 && mid.nSteps < 21);
    T.same('בסוף: כל הצעדים, מחסנית ריקה', '21,0', end.nSteps + ',' + end.stack.length);
  });

  await T.test('פרק 2: הפתיחה, אירועים מסלולים וצעדים', async function () {
    var s = T.make(S.archCount, { locked: true });
    T.same('לפני הריצה: אין ספירה', 0, s.getState().steps);
    await T.run(s.play(1));
    var q = s.getState();
    T.rel('3×10⁶ אירועים', 3e6, q.events, 1e-6);
    T.rel('מסלולים: N(1 + 4.5×10⁻⁴)', 3.00135e6, q.tracks, 1e-6);
    T.rel('צעדים: N(40 + 10·4.5×10⁻⁴)', 1.200135e8, q.steps, 1e-6);
    var fe = q.firstEvents;
    T.near('בצעצוע: 40 צעדים לפרוטון בממוצע', 40, sum(fe.map(function (e) { return e.steps; })) / fe.length, 3);
    T.truthy('צעדים > מסלולים ≥ אירועים', q.steps > 10 * q.tracks && q.tracks >= q.events);
  });

  await T.test('פרק 2: הקופסאות והעץ', async function () {
    var s = T.make(S.archEvent, { locked: true });
    T.same('לפני הריצה: לא רץ', false, s.getState().ran);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('האירוע נגמר', true, q.done);
    T.same('כל חמשת המסלולים נולדו', '1,2,3,4,5', q.born.sort().join(','));
    T.same('האלקטרון: הורה 3', 3, q.parents[4]);
    T.same('והיוצר שלו compt', 'compt', q.creators[4]);
    T.same('21 צעדים', 21, q.nSteps);
    await T.run(s.next());
    q = s.getState();
    T.same('צעד אחד קדימה מתחילת האירוע: צעד 1 של מסלול 1', '1:0:Transportation', q.entry.id + ':' + q.entry.step + ':' + q.entry.proc);
  });

  await T.test('פרק 2: הקריאות ואיפוס fLeak', async function () {
    var s = T.make(S.archTimeline, { locked: true });
    await T.run(s.play(1));
    var q = s.getState();
    var c = q.calls;
    T.same('BeginOfRunAction ו-EndOfRunAction פעם אחת', '1,1', c.BeginOfRunAction + ',' + c.EndOfRunAction);
    T.same('שני אירועים: GeneratePrimaries, BeginOfEvent, EndOfEvent', '2,2,2', c.GeneratePrimaries + ',' + c.BeginOfEventAction + ',' + c.EndOfEventAction);
    T.same('PreUserTrackingAction: 5 + 1 מסלולים', sum(q.tracks), c.PreUserTrackingAction);
    T.same('UserSteppingAction: 21 + 8 צעדים', sum(q.steps), c.UserSteppingAction);
    T.same('ספירת הצעדים מהמצב', sum(q.steps), q.nSteps);
    T.near('אירוע 0: fLeak = משקל הנייטרון', K.EV1_WEIGHT, q.sums[0], 1e-12);
    T.near('אירוע 1: fLeak אופס ל-0', 0, q.sums[1], 1e-12);
    T.near('סכום הריצה', K.EV1_WEIGHT, q.runSum, 1e-12);
    T.same('האיפוס קרה ב-BeginOfEventAction', 'BeginOfEventAction', q.resetAt[0]);
    /* just before event 1 starts, fLeak still holds event 0; right after its BeginOfEventAction it is 0 */
    var T0 = q.T, a = null, b = null;
    for (var t = 0; t <= T0; t += T0 / 4000) {
      var st = s.stateAt(t);
      if (st.calls.EndOfEventAction === 1 && st.calls.BeginOfEventAction === 1 && a === null) a = st.fLeak;
      if (st.calls.BeginOfEventAction === 2 && b === null) b = st.fLeak;
    }
    T.near('אחרי סוף אירוע 0: fLeak עדיין 0.22', K.EV1_WEIGHT, a, 1e-12);
    T.near('אחרי BeginOfEventAction של אירוע 1: אפס', 0, b, 1e-12);
  });

  await T.test('פרק 2: המחסנית', async function () {
    var s = T.make(S.archStack, { locked: true });
    T.same('לפני הריצה: 2, 3, 4 במחסנית', '2,3,4', s.getState().stack.join(','));
    await T.run(s.play(1));
    var q = s.getState();
    T.same('הסדר: 1, 4, 3, 5, 2', '1,4,3,5,2', q.order.join(','));
    T.same('מחסנית ריקה בסוף', 0, q.stack.length);
    s.setParam('fifo', true);
    var f = s.getState();
    T.same('תור: 1, 2, 3, 4, 5', '1,2,3,4,5', f.order.join(','));
    T.same('תור: אותם מסלולים ואותם צעדים', q.nTracks + ',' + q.nSteps, f.nTracks + ',' + f.nSteps);
    T.same('ואותם חלקיקים לכל מספר', q.ids.join(','), f.ids.join(','));
  });

  await T.test('פרק 2: פעולת הצעד וטבלת leak', async function () {
    var s = T.make(S.archLeak, { locked: true, rng: PHY.random(8).next });
    T.same('לפני הריצה: אין צעדים', 0, s.getState().steps.length);
    await T.run(s.play(1));
    var q = s.getState();
    T.same('חמישה צעדים', 5, q.steps.length);
    T.same('התהליכים', 'hadElastic,Transportation,hadElastic,Transportation,Transportation', q.steps.map(function (x) { return x.proc; }).join(','));
    T.same('הנפחים הבאים', 'Layer0_Be,Layer1_Pb,Layer1_Pb,World,OutOfWorld', q.steps.map(function (x) { return x.next; }).join(','));
    T.same('שורה רק ביציאה מהפאה האחורית', 'false,false,false,true,false', q.steps.map(function (x) { return x.row; }).join(','));
    T.same('המעבר Be→Pb: גבול בתוך הממיר', true, q.steps[1].inner);
    T.same('שורה אחת', 1, q.rows);
    var r = s.simulate(3000);
    T.same('3000 נייטרונים: שורה רק בצעד גבול אל מחוץ לממיר, ולכל היותר אחת', 0, r.bad);
    T.truthy('חלק נבלעים: פחות שורות מנייטרונים', r.rows < r.n && r.rows > 0.3 * r.n);
    T.truthy('יש צעדי גבול בין השכבות שלא נספרו', r.inner > 0);
  });

  await T.test('פרק 2: הליכים', async function () {
    var s = T.make(S.archThreads, { mode: 'card', locked: true });
    await T.run(s.play(1));
    var q = s.getState(), L = q.lanes[0];
    T.same('16 אירועים, כל אחד בהליך אחד', 16, L.laneOf.length);
    T.truthy('כל ההליכים עבדו', [0, 1, 2, 3].every(function (i) { return L.laneOf.indexOf(i) >= 0; }));
    T.same('המיזוג: סכום ההליכים', sum(L.perLane), L.total);
    T.same('המיזוג קרה', 1, q.merged);
    var t = T.make(S.archThreads, { mode: 'trap', locked: true });
    await T.run(t.play(1));
    q = t.getState();
    T.same('10 ו-20 הליכים: אותם 60 אירועים', '60,60', q.lanes[0].events + ',' + q.lanes[1].events);
    T.same('ואותה ספירה', q.totals[0], q.totals[1]);
    T.same('ואותה תוצאה לכל אירוע', q.lanes[0].hits.join(','), q.lanes[1].hits.join(','));
    T.near('זמן השעון ב-10 הליכים: 17.6 s', 17.6, q.wall[0], 1e-9);
    T.near('ב-20 הליכים: בערך חצי', 0.5, q.wall[1] / q.wall[0], 0.08);
  });

  await T.test('פרק 2: מעבדת האירוע וזרעים', async function () {
    var s = T.make(S.archLab, { seed: 12345, E: 6.3 });
    var a = s.getState().signature;
    s.setParam('seed', 12346);
    T.truthy('זרע אחר: אירוע אחר', s.getState().signature !== a);
    s.setParam('seed', 12345);
    T.same('אותו זרע: אותו אירוע בדיוק', a, s.getState().signature);
    var allLifo = true, react = 0, lo = 0, hi = 0;
    for (var k = 0; k < 60; k++) {
      s.setParam('E', 6.3); s.setParam('seed', 100 + k);
      var g = s.getState();
      if (!g.lifoOk) allLifo = false;
      if (g.tracks > 1) react++;
      s.setParam('E', 3); lo += s.getState().steps;
      s.setParam('E', 12); hi += s.getState().steps;
    }
    T.truthy('60 אירועים: תמיד אחרון נכנס ראשון יוצא, וכל משני אחרי ההורה', allLifo);
    T.near('צעצוע: תגובה בכחצי מהאירועים', 0.5, react / 60, 0.2);
    T.truthy('פרוטון של 12 MeV עושה יותר צעדים מפרוטון של 3 MeV', hi > lo);
  });

  await T.test('פרק 2: המשחק, משחק מושלם', async function () {
    var seeds = [1, 7, 2024];
    for (var i = 0; i < seeds.length; i++) {
      var g = T.make(S.archOrderGame, { rng: PHY.random(seeds[i]).next });
      for (var lv = 0; lv < 3; lv++) {
        var st = g.getState();
        T.same('זרע ' + seeds[i] + ': שלב ' + (lv + 1) + ', מתחיל ב-GeneratePrimaries ונגמר ב-EndOfEvent', 'GeneratePrimaries|EndOfEventAction', st.expected[0] + '|' + st.expected[st.expected.length - 1]);
        if (lv === 2) {
          var kids = st.expected.filter(function (k) { return /^PreUserTrackingAction[0-9]$/.test(k); }).map(function (k) { return +k.slice(-1); });
          T.same('שלב 3: המשני האחרון שנוצר (3) מועבר ראשון אחרי הפרוטון', '1,3', kids.slice(0, 2).join(','));
        }
        st.expected.forEach(function (k) { g.tap(k); });
        T.same('זרע ' + seeds[i] + ': שלב ' + (lv + 1) + ' בלי טעויות', 'won,0', g.getState().phase + ',' + g.getState().mistakes);
        g.next();
      }
      st = g.getState();
      T.same('זרע ' + seeds[i] + ': 9 נקודות, 3 כוכבים', '9,3', sum(st.points) + ',' + st.stars);
    }
  });

  await T.test('פרק 2: המשחק, טעויות עולות נקודות', async function () {
    var g = T.make(S.archOrderGame, { rng: PHY.random(5).next, chapter: 'x2', section: 'game' });
    var st = g.getState();
    T.same('BeginOfEvent לפני GeneratePrimaries: טעות', false, g.tap('BeginOfEventAction'));
    T.same('EndOfEvent באמצע: טעות', false, g.tap('EndOfEventAction'));
    T.same('Stepping לפני PreTracking: טעות', false, g.tap('S1'));
    st.expected.forEach(function (k) { g.tap(k); });
    T.same('שלוש טעויות בשלב 1: נקודה אחת', 1, g.getState().points[0]);
    g.next();
    st = g.getState();
    g.tap('EndOfEventAction');
    st.expected.forEach(function (k) { g.tap(k); });
    T.same('טעות אחת בשלב 2: שתי נקודות', 2, g.getState().points[1]);
    g.next();
    st = g.getState();
    st.expected.forEach(function (k) { g.tap(k); });
    g.next();
    st = g.getState();
    T.same('1 + 2 + 3 = 6 נקודות: שני כוכבים', '6,2', sum(st.points) + ',' + st.stars);
    T.same('הכוכבים נשמרו', 2, PHY.progress.chapter('x2').game);
    T.same('הסעיף סומן', true, PHY.progress.hasSection('x2', 'game'));
  });

  await T.test('פרק 2: מלכודות', async function () {
    var b = T.make(S.archRunBoxes, { locked: true });
    await T.run(b.play(1));
    var q = b.getState();
    T.same('שלושה פרוטונים: שלושה אירועים', 3, q.events);
    T.same('ושישה מסלולים', 6, q.tracks);

    var tr = T.make(S.archTraj, { locked: true });
    await T.run(tr.play(1));
    q = tr.getState();
    T.same('רשומת המסלול: נקודה לכל סוף צעד ועוד נקודת הלידה', q.steps + 1, q.points);
    T.same('ה-G4Track נמחק', false, q.trackAlive);
    T.near('הקו צויר בסוף', 1, q.drawn, 1e-9);

    var tm = T.make(S.archTime, { locked: true });
    await T.run(tm.play(1));
    q = tm.getState();
    T.rel('מהירות של נייטרון של 1 MeV (mm/ns)', 13.82, q.v[0], 2e-3);
    T.rel('ושל 10 MeV', 43.39, q.v[1], 2e-3);
    T.rel('זמן טיסה 953 mm ב-1 MeV (ns)', 68.95, q.tof[0], 2e-3);
    T.rel('וב-10 MeV', 21.96, q.tof[1], 2e-3);
    /* one step each: the shortest proposal in vacuum is the distance to the World's wall */
    var lamVacuum = 1 / (1e-25 / 1.008 * 6.022e23 * 1e-24) * 10;
    T.truthy('בוואקום: λ ארוך בהרבה מהעולם, ולכן צעד אחד', Math.min(lamVacuum, q.path) === q.path);
  });
});
