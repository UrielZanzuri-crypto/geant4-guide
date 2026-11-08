/* PHY.course: the course and its chapter list, the single source of truth for the home page and the
   chapter nav. PHY.progress: all persistence, under PHY.course.storageKey.

   The block marked SITE holds this site's metadata (the engine was copied from the Ultra Fast sister
   site, and this site owns its copy now), together with <html data-course="geant4">. The sister sites
   share one GitHub Pages origin, so each needs its own storage key.

   Progress shape: {chapters: {"01": {sections: [...], total, quiz: 0.8, game: 3, predictions: {id: {choice, correct}}}}}
   Every storage access is wrapped: private windows and blocked storage must never break a page.

   Which chapters exist: a chapter is live when its stamp js/sims/chNN/ready.js loads. The stamp is one
   line, PHY.course.ready('NN'); every chapter ships one (tests/chapter-check.mjs fails without it).
   PHY.course.detect(ids, base) loads the stamps and resolves to a Set of the ids that exist. A missing
   stamp only logs a "file not found" line in the console; the home page shows that chapter as "בקרוב"
   and the chapter nav hides the link. */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});

  /* ===================== SITE ===================== */
  /* attribution.html goes into every footer (.attribution); credit is the card on the home page;
     each chapter's ref names the Geant4-documentation section or the ldns file it leans on. */
  PHY.course = {
    id: 'geant4',
    storageKey: 'g4-progress-v1',
    title: 'Geant4 צעד אחר צעד',
    subtitle: 'ספריית מונטה קרלו להעברת חלקיקים בחומר, מוסברת מבפנים, עם ממיר הנייטרונים ldns כדוגמה שמלווה את כל הפרקים. קודם מנחשים, אחר כך רואים בהנפשה, ורק בסוף קוראים את הפקודה או את הנוסחה.',
    accent: 'geant4',
    siteUrl: 'https://urielzanzuri-crypto.github.io/geant4-guide/',
    attribution: {
      html: 'מבוסס על התיעוד הרשמי של <bdi>Geant4</bdi> (<bdi>Book For Application Developers</bdi>, <bdi>Physics Reference Manual</bdi>), על הקוד הפתוח של <bdi>Geant4 Collaboration</bdi> (<a href="https://geant4.web.cern.ch" rel="noopener">geant4.web.cern.ch</a>) ועל הפרויקט <bdi>ldns</bdi> של הכותב. <bdi>Geant4</bdi> מופץ תחת <bdi>Geant4 Software License</bdi>.',
    },
    credit: {
      title: 'המקורות שמאחורי האתר',
      html: 'האתר מבוסס על התיעוד הרשמי של <bdi>Geant4</bdi>: <bdi>Book For Application Developers</bdi>, <bdi>Physics Reference Manual</bdi> ו-<bdi>Guide for Physics Lists</bdi>, ועל הקוד הפתוח של <bdi>Geant4 Collaboration</bdi> (<a href="https://geant4.web.cern.ch" rel="noopener">geant4.web.cern.ch</a>). <bdi>Geant4</bdi> מופץ תחת <bdi>Geant4 Software License</bdi>. הדוגמה המלווה, המספרים והתמונות באים מהפרויקט <bdi>ldns</bdi> של הכותב, ממיר פרוטונים לנייטרונים למקור נייטרונים מבוסס לייזר.',
      note: 'הטקסט, ההנפשות, התרגילים והפתרונות נכתבו בעברית מאפס, ושום טקסט לא הועתק מהתיעוד. קטעי הקוד והמאקרו הקצרים לקוחים כלשונם מהפרויקט ldns. בכל כרטיס פרק מופיע הסעיף בתיעוד או הקובץ בפרויקט שהפרק נשען עליו.',
    },
    level: 'לקוראות ולקוראים שכבר מריצים אפליקציה של Geant4 ורוצים להבין מה קורה בתוכה. מניחים פיזיקה גרעינית בסיסית: חתך פעולה, MeV, barn. לא צריך לדעת C++: הקוד מופיע בקטעים קצרים, עם הסבר בעברית מעל כל קטע.',
    reading: [
      { title: 'Geant4 Collaboration, Book For Application Developers', note: 'המדריך הרשמי לבניית אפליקציה: גיאומטריה, פיזיקה, פקודות, ויזואליזציה וניתוח.' },
      { title: 'Geant4 Collaboration, Physics Reference Manual', note: 'מה כל תהליך ומודל עושים בפנים, עם הנוסחאות.' },
      { title: 'S. Agostinelli et al., Geant4: a simulation toolkit, NIM A 506 (2003) 250', note: 'המאמר המייסד: המבנה של הספרייה והעקרונות שלה.' },
      { title: 'J. Allison et al., Recent developments in Geant4, NIM A 835 (2016) 186', note: 'ריבוי הליכים (multithreading), מודלים ונתונים חדשים.' },
    ],
    series: [
      { title: 'פיזיקה עם ניוטון החתול', url: 'https://urielzanzuri-crypto.github.io/physics-with-newton/', desc: 'מכניקה ברמת מכינה.' },
      { title: 'אופטיקה', url: 'https://urielzanzuri-crypto.github.io/optics-course/', desc: 'גלים, צבע, קיטוב, עדשות, פורייה, התאבכות ועקיפה.' },
      { title: 'פולסים קצרים', url: 'https://urielzanzuri-crypto.github.io/ultrafast-optics/', desc: 'איך מייצרים, מודדים ומעצבים פולסים של פמטו-שניות.' },
      { title: 'אופטיקה לא-לינארית', url: 'https://urielzanzuri-crypto.github.io/nonlinear-optics/', desc: 'כשהאור חזק מספיק כדי לשנות את החומר שהוא עובר בו.' },
      { title: 'Geant4 צעד אחר צעד', url: 'https://urielzanzuri-crypto.github.io/geant4-guide/', desc: 'איך סימולציית מונטה קרלו של חלקיקים עובדת, ואיך עובדים איתה.' },
    ],
    chapters: [
      { id: '01', file: '01-montecarlo.html', title: 'מונטה קרלו: צעד, הגרלה, חתך פעולה',
        desc: 'מה זה בכלל לסמלץ חלקיק, ולמה התוצאה היא תמיד מספר עם שגיאה.',
        ref: 'נשען על: Physics Reference Manual, Monte Carlo Methods; ldns: RunAction.cc' },
      { id: '02', file: '02-architecture.html', title: 'איך Geant4 בנוי: Run, Event, Track, Step',
        desc: 'מי קורא למי בזמן ריצה, ואיפה הקוד שלנו נכנס לתמונה.',
        ref: 'נשען על: Geant4 Book, Toolkit Fundamentals, Tracking and Physics; ldns: ldns.cc, SteppingAction.cc' },
      { id: '03', file: '03-geometry.html', title: 'גיאומטריה וחומרים',
        desc: 'איך בונים עולם, נפחים וחומרים, ואיך בודקים שבנינו נכון.',
        ref: 'נשען על: Geant4 Book, Detector Definition (Geometry, Materials); ldns: DetectorConstruction.cc' },
      { id: '04', file: '04-physics.html', title: 'פיזיקה: רשימות, מודלים ונתונים גרעיניים',
        desc: 'מה קובע כמה נייטרונים ייצאו, ולמה רשימת פיזיקה לא מתאימה נותנת אפס.',
        ref: 'נשען על: Guide for Physics Lists, Physics Reference Manual (Hadronic); ldns: ParticleHPFix.cc' },
      { id: '05', file: '05-source.html', title: 'המקור: ספקטרום, קונוס ומשקלים',
        desc: 'איך יורים פרוטונים לפי ספקטרום ומנרמלים לירייה, בלי להטות את התוצאה.',
        ref: 'נשען על: Geant4 Book, Event Generator Interface; ldns: PrimaryGeneratorAction.cc, SourceSpectrum.cc' },
      { id: '06', file: '06-macros.html', title: 'מאקרו ושורת הפקודה',
        desc: 'איך שולטים בריצה בלי לקמפל, ואיך קוראים את הודעות השגיאה.',
        ref: 'נשען על: Geant4 Book, User Interface Commands; ldns: macros/template_stageA.mac' },
      { id: '07', file: '07-visualisation.html', title: 'ויזואליזציה',
        desc: 'איך רואים גיאומטריה ומסלולים, ולמה התמונה איננה התוצאה.',
        ref: 'נשען על: Geant4 Book, Visualization; ldns: macros/vis.mac' },
      { id: '08', file: '08-output.html', title: 'פלט וניתוח: ntuples, ROOT ופייתון',
        desc: 'מהשורות בקובץ ה-ROOT לגרף עם שגיאה, בפייתון.',
        ref: 'נשען על: Geant4 Book, Analysis; ldns: RunAction.cc, README.md' },
    ],
  };
  /* =================== end SITE =================== */

  const course = PHY.course;
  const KEY = course.storageKey;
  course.find = (id) => course.chapters.find((c) => c.id === id) || null;
  course.indexOf = (id) => course.chapters.findIndex((c) => c.id === id);
  course.stampPath = (id) => 'js/sims/ch' + id + '/ready.js';

  /* Chapters whose stamp has loaded on this page. */
  const live = new Set();
  course.ready = function (id) { live.add(String(id)); };
  course.isReady = (id) => live.has(String(id));

  /* Loads the stamps of `ids` (default: every chapter) relative to `base` ('' on the home page, '../' in
     chapters). Resolves to the Set of live ids. Never rejects; gives up on a stamp after 4 s. */
  course.detect = function (ids, base) {
    ids = ids || course.chapters.map((c) => c.id);
    base = base === undefined ? '' : base;
    return Promise.all(ids.map(function (id) {
      if (live.has(id)) return Promise.resolve();
      return new Promise(function (resolve) {
        const s = document.createElement('script');
        let done = false;
        const end = function (ok) {
          if (done) return;
          done = true;
          if (ok) live.add(id);
          s.remove();
          resolve();
        };
        s.async = true;
        s.src = base + course.stampPath(id);
        s.onload = function () { end(true); };
        s.onerror = function () { end(false); };
        setTimeout(function () { end(false); }, 4000);
        document.head.appendChild(s);
      });
    })).then(function () { return new Set(ids.filter((id) => live.has(id))); });
  };

  let memory = { chapters: {} };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.chapters) memory = parsed;
      }
    } catch (e) { /* keep the in-memory copy */ }
    return memory;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(memory));
    } catch (e) { /* in-memory only */ }
  }

  function chapter(id) {
    load();
    if (!memory.chapters[id]) memory.chapters[id] = { sections: [] };
    const c = memory.chapters[id];
    if (!Array.isArray(c.sections)) c.sections = [];
    return c;
  }

  function emit(id) {
    document.dispatchEvent(new CustomEvent('phy:progress', { detail: { chapter: id } }));
  }

  PHY.progress = {
    KEY,
    chapter,
    all() { load(); return memory; },
    markSection(id, name) {
      const c = chapter(id);
      if (c.sections.indexOf(name) < 0) {
        c.sections.push(name);
        save();
        emit(id);
      }
    },
    hasSection(id, name) { return chapter(id).sections.indexOf(name) >= 0; },
    setTotal(id, total) {
      const c = chapter(id);
      if (c.total !== total) { c.total = total; save(); }
    },
    /* Best score is kept. score is 0..1. */
    setQuiz(id, score) {
      const c = chapter(id);
      c.quiz = Math.max(c.quiz || 0, score);
      save();
      emit(id);
    },
    /* Best star count is kept. stars is 0..3. */
    setGame(id, stars) {
      const c = chapter(id);
      c.game = Math.max(c.game || 0, stars);
      save();
      emit(id);
    },
    recordPrediction(id, key, choice, correct) {
      const c = chapter(id);
      c.predictions = c.predictions || {};
      c.predictions[key] = { choice: choice, correct: !!correct };
      save();
    },
    fraction(id) {
      const c = chapter(id);
      return c.total ? Math.min(1, c.sections.length / c.total) : 0;
    },
    started(id) {
      const c = chapter(id);
      return c.sections.length > 0 || !!c.quiz || !!c.game;
    },
    /* Quiz score to stars: used by the quiz and the home page, so the two always agree. */
    quizStars(score) {
      if (!score) return 0;
      if (score >= 0.9) return 3;
      if (score >= 0.6) return 2;
      return 1;
    },
    reset() {
      memory = { chapters: {} };
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
      emit(null);
    },
  };

  load();
})();
