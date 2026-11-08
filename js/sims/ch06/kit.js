/* PHY.ch06: chapter 6 helpers (macros and the command line), loaded before the chapter's sims.

   A mock of what ldns does with a macro, line by line, as Geant4's batch session does it:
   comments and blank lines are skipped, {ALIAS} is replaced, the command is echoed (with
   /control/verbose > 0), looked up in the command tree, checked against the application state,
   then its parameters are checked (type, omittable/default, candidates), and only then does the
   messenger act. The first failure stops the macro, as G4UIbatch does.

   COMMANDS   the commands the mock knows: ldns's own (parameters, units, ranges, states and guidance
              copied from src/DetectorMessenger.cc, SourceMessenger.cc, OutputConfig.cc, XSDump.cc) and a
              few Geant4 commands (parameters only; origin 'g4').
   execute(text, o)  runs a macro. o: {cwd: 'neutrons' | 'build', fs: {path: text}, lint, echo}. lint = true
              does not stop at the first error (the editor uses it to list every problem); echo = true
              starts as if /control/verbose 1 came first, so every command line is echoed.
              Returns ctx: {entries, issues, runs, files, state, stopped, geom, src, fileName, ...}.
              entries: {k: 'cmd'|'out'|'err'|'note'|'state'|'file'|'beat', s, line, w}
   CANON      the Be 2 mm run of docs/PLAN.md section 4. Only for that run does the mock print numbers:
              the source summary and the run summary are the lines of 30J 300fs/neutrons/output/
              E30J_M2p5_Be2.log, verbatim. Any other run prints the structure and a note.
   bestUnit(mm)  G4BestUnit for a length: the largest unit in which the value is >= 1, the symbol padded
              to 3 characters (the longest Length symbol is "Ang"), e.g. "4.5 cm ", "2 mm ", "200 um ".
   cpp(x)     a double as C++ prints it by default (6 significant digits, %g style).
   esc(s)     HTML escape. code(s): <code dir="ltr">s</code>.
   MACROS     the macros the chapter runs (the real Be 2 mm macro first, verbatim). */
(function () {
  'use strict';
  const PHY = window.PHY;

  const ALL = ['PreInit', 'Init', 'Idle', 'GeomClosed', 'EventProc'];
  const PRE = ['PreInit'];
  const PRE_IDLE = ['PreInit', 'Idle'];
  const IDLE = ['Idle'];

  const UNITS = {
    Length: { km: 1e6, m: 1e3, cm: 10, mm: 1, um: 1e-3, nm: 1e-6 },
    Energy: { eV: 1e-6, keV: 1e-3, MeV: 1, GeV: 1e3, TeV: 1e6 },
    Angle: { rad: 180 / Math.PI, mrad: 0.18 / Math.PI, deg: 1 },
  };
  const BASE = { Length: 'mm', Energy: 'MeV', Angle: 'deg' };

  /* a Latin fragment inside a Hebrew note set as text: an LTR isolate, as PHY.fmt.ltr does */
  const ltr = (s) => '\u2066' + s + '\u2069';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const code = (s) => '<code dir="ltr">' + esc(s) + '</code>';

  /* ---------- formatting as C++ and Geant4 print it ---------- */
  function cpp(x, p) {
    p = p || 6;
    if (!isFinite(x)) return String(x);
    if (x === 0) return '0';
    const ex = x.toExponential(p - 1);
    const e = parseInt(ex.split('e')[1], 10);
    if (e < -4 || e >= p) {
      let m = ex.split('e')[0];
      if (m.indexOf('.') >= 0) m = m.replace(/0+$/, '').replace(/\.$/, '');
      return m + 'e' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
    }
    let s = x.toFixed(Math.max(0, p - 1 - e));
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function bestUnit(mm) {
    const order = ['km', 'm', 'cm', 'mm', 'um', 'nm'];
    let u = 'nm';
    for (let i = 0; i < order.length; i++) {
      if (Math.abs(mm) / UNITS.Length[order[i]] >= 1) { u = order[i]; break; }
    }
    return cpp(mm / UNITS.Length[u]) + ' ' + (u + '   ').slice(0, 3);
  }

  /* ---------- the command tree ---------- */
  /* p(name, type, opt, def, extra): a parameter. type 's' string, 'd' double, 'i' integer. */
  const p = (n, t, opt, def, x) => Object.assign({ n, t, opt: !!opt, def }, x || {});
  /* A command with a double and a unit (G4UIcmdWithADoubleAndUnit). def: the default unit, or none. */
  const du = (cat, def, range) => [p('value', 'd', false, undefined, { range }), p('Unit', 's', !!def, def, { cands: Object.keys(UNITS[cat]), cat })];
  const ge0 = { test: (v) => v >= 0, text: '>= 0' };
  const gt0 = { test: (v) => v > 0, text: '> 0', cmdLevel: true };

  const COMMANDS = {
    /* ldns: src/DetectorMessenger.cc */
    '/ldns/det/clearLayers': { params: [], states: PRE, origin: 'DetectorMessenger.cc', guide: 'Remove all converter layers.', he: 'מוחק את כל השכבות. תמיד לפני addLayer.' },
    '/ldns/det/addLayer': { params: [p('material', 's'), p('thickness', 'd', false, undefined, { range: ge0 }), p('unit', 's', true, 'mm', { cat: 'Length', free: true })], states: PRE, origin: 'DetectorMessenger.cc', guide: 'Append a layer downstream: material thickness unit', he: 'מוסיף שכבה מאחורי האחרונה. היחידה אופציונלית, וברירת המחדל שלה mm.' },
    '/ldns/det/distance': { params: du('Length', null, gt0), states: PRE, origin: 'DetectorMessenger.cc', guide: 'Distance from proton source to the converter front face.', he: 'מהמקור (z = 0) לפאה הקדמית של השכבה הראשונה. בלי יחידת ברירת מחדל.' },
    '/ldns/det/radius': { params: du('Length', null, gt0), states: PRE, origin: 'DetectorMessenger.cc', guide: 'Radius of the (cylindrical) converter layers.', he: 'רדיוס כל השכבות. בלי יחידת ברירת מחדל.' },
    '/ldns/det/maxStep': { params: du('Length', null, ge0), states: PRE, origin: 'DetectorMessenger.cc', guide: 'Maximum step length in the converter layers (0 = no limit).', he: 'הגבלת צעד בשכבות, לבדיקות בלבד.' },
    '/ldns/mod/material': { params: [p('material', 's')], states: PRE, origin: 'DetectorMessenger.cc', guide: 'HDPE (with S(a,b) for H in polyethylene), HDPE_FREEGAS, or any material', he: 'חומר המאט.' },
    '/ldns/mod/length': { params: du('Length', null, ge0), states: PRE, origin: 'DetectorMessenger.cc', guide: 'Moderator length along z (0 = no moderator).', he: 'אורך המאט. בלי השורה הזאת אין מאט.' },
    '/ldns/mod/radius': { params: du('Length', null, ge0), states: PRE, origin: 'DetectorMessenger.cc', guide: 'Moderator radius (D/2).', he: 'רדיוס המאט.' },
    '/ldns/mod/gap': { params: du('Length', null, ge0), states: PRE, origin: 'DetectorMessenger.cc', guide: 'Gap between the last converter layer and the moderator.', he: 'מרווח בין הממיר למאט.' },
    '/ldns/mod/insertDepth': { params: du('Length', null), states: PRE, origin: 'DetectorMessenger.cc', guide: 'Put the converter INSIDE the moderator (cylindrical insert).', he: 'הממיר בתוך המאט, בעומק הזה.' },
    '/ldns/refl/material': { params: [p('material', 's')], states: PRE, origin: 'DetectorMessenger.cc', guide: 'Reflector material (Be, C, Pb, HDPE, any NIST name), or none.', he: 'חומר המחזיר.' },
    '/ldns/refl/thickness': { params: du('Length', null, ge0), states: PRE, origin: 'DetectorMessenger.cc', guide: 'Radial thickness of the reflector around the moderator side.', he: 'עובי המחזיר סביב המאט.' },
    /* ldns: src/SourceMessenger.cc */
    '/ldns/src/mode': { params: [p('mode', 's', false, undefined, { cands: ['mono', 'spectrum', 'phasespace', 'beam'] })], states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'mono = single energy; spectrum = table from file; phasespace = particle list;', he: 'סוג המקור. בלי השורה: mono, פרוטונים של 10 MeV.' },
    '/ldns/src/file': { params: [p('file', 's')], states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'Two-column table: E[MeV]  dN/dE/dOmega[1/MeV/sr]', he: 'טבלת הספקטרום. נתיב יחסי לתיקייה שממנה הורצה התוכנה.' },
    '/ldns/src/Emin': { params: du('Energy', 'MeV'), states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'Lower energy limit of the spectrum.', he: 'האנרגיה הנמוכה ביותר שנורית. ברירת המחדל של היחידה MeV.' },
    '/ldns/src/Emax': { params: du('Energy', 'MeV'), states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'Upper limit = proton cut-off energy.', he: 'אנרגיית ה-cut-off. ברירת המחדל של היחידה MeV.' },
    '/ldns/src/energy': { params: du('Energy', 'MeV'), states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'Proton energy in mono mode.', he: 'אנרגיה אחת, במצב mono.' },
    '/ldns/src/halfAngle': { params: du('Angle', 'deg'), states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'Half-angle of the emission cone (0 = pencil).', he: 'חצי זווית הקונוס. ברירת המחדל של היחידה deg.' },
    '/ldns/src/sampling': { params: [p('sampling', 's', false, undefined, { cands: ['analog', 'flat', 'log'] })], states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'Energy sampling: analog (w=1), flat or log (weighted)', he: 'איך מגרילים אנרגיה: analog בלי משקלים, flat או log עם משקלים.' },
    '/ldns/src/print': { params: [], states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'Load the spectrum (if needed) and print the source summary.', he: 'טוען את הספקטרום ומדפיס את סיכום המקור.' },
    '/ldns/src/particle': { params: [p('particle', 's')], states: PRE_IDLE, origin: 'SourceMessenger.cc', guide: 'Source particle (proton, neutron, deuteron, ...). Default proton.', he: 'החלקיק שנורה.' },
    /* ldns: src/OutputConfig.cc, src/XSDump.cc */
    '/ldns/out/level': { params: [p('level', 'i', false, undefined, { range: { test: (v) => v >= 0 && v <= 2, text: '0..2', cmdLevel: true } })], states: PRE_IDLE, origin: 'OutputConfig.cc', guide: '0 = summary only, 1 = + leak/modleak/residual ntuples, 2 = + birth/reaction/primary', he: 'כמה טבלאות לכתוב: 0 רק סיכום, 1 גם leak, 2 הכול.' },
    '/ldns/out/acceptance': { params: du('Angle', 'deg'), states: PRE_IDLE, origin: 'OutputConfig.cc', guide: 'Half-angle around +z for neutrons leaving the moderator towards the detector', he: 'הקונוס "לכיוון הגלאי".' },
    '/ldns/xs/dump': { params: [p('particle', 's'), p('material', 's'), p('Emin', 'd'), p('Emax', 'd'), p('n', 'i'), p('file', 's')], states: IDLE, origin: 'XSDump.cc', guide: 'particle material Emin[MeV] Emax[MeV] nPoints file.csv', he: 'כותב את חתכי הפעולה ש-Geant4 משתמש בהם. רק אחרי האתחול.' },

    /* Geant4: parameters only */
    '/run/initialize': { params: [], states: PRE_IDLE, origin: 'g4', he: 'בונה את הגיאומטריה ואת הפיזיקה. מכאן הגיאומטריה קבועה.' },
    '/run/beamOn': { params: [p('numberOfEvent', 'i', true, '1', { range: ge0 }), p('macroFile', 's', true, '')], states: PRE_IDLE, origin: 'g4', he: 'מריץ N אירועים. N מספר שלם.' },
    '/run/printProgress': { params: [p('modulo', 'i')], states: ALL, origin: 'g4', he: 'שורת התקדמות כל N אירועים.' },
    '/run/verbose': { params: [p('level', 'i')], states: ALL, origin: 'g4', he: 'כמה הליבה מדפיסה על הריצה.' },
    '/control/verbose': { params: [p('level', 'i')], states: ALL, origin: 'g4', he: 'מעל 0: כל פקודה מודפסת לפני שהיא רצה.' },
    '/control/execute': { params: [p('macroFile', 's')], states: ALL, origin: 'g4', he: 'מריץ מאקרו מתוך מאקרו.' },
    '/control/alias': { params: [p('aliasName', 's'), p('aliasValue', 's')], states: ALL, origin: 'g4', he: 'משתנה: {NAME} בשורות הבאות מוחלף בערך.' },
    '/control/foreach': { params: [p('macroFile', 's'), p('variable', 's'), p('valueList', 's')], states: ALL, origin: 'g4', he: 'מריץ מאקרו פעם לכל ערך ברשימה.' },
    '/control/loop': { params: [p('macroFile', 's'), p('counterName', 's'), p('initialValue', 'd'), p('finalValue', 'd'), p('stepSize', 'd', true, '1')], states: ALL, origin: 'g4', he: 'מריץ מאקרו לכל ערך בטווח מספרי.' },
    '/random/setSeeds': { params: [p('seeds', 's')], states: ALL, origin: 'g4', he: 'זרעים למחולל, כמו -s בשורת הפקודה.' },
    '/tracking/verbose': { params: [p('level', 'i')], states: ALL, origin: 'g4', he: 'מדפיס כל צעד. רק עם אירוע אחד.' },
    '/analysis/setFileName': { params: [p('name', 's')], states: ALL, origin: 'g4', he: 'שם קובץ הפלט, בלי סיומת.' },
    '/process/list': { params: [p('type', 's', true, 'all')], states: ALL, origin: 'g4', he: 'רשימת התהליכים הרשומים.' },
    '/material/g4/printMaterial': { params: [p('name', 's')], states: ALL, origin: 'g4', he: 'הרכב וצפיפות של חומר.' },
    '/vis/open': { params: [p('system', 's', true, '')], states: ALL, origin: 'g4', he: 'פותח מערכת ציור (פרק 7).' },
    '/vis/drawVolume': { params: [p('volume', 's', true, 'world')], states: ALL, origin: 'g4', he: 'מוסיף את הגיאומטריה לסצנה (פרק 7).' },
  };

  /* the tree of directories, for the explorer */
  const DIRS = {
    '/': { he: 'השורש' },
    '/control/': { he: 'שליטה במאקרו: הרצה, משתנים, לולאות' },
    '/run/': { he: 'אתחול והרצת אירועים' },
    '/random/': { he: 'המחולל האקראי' },
    '/tracking/': { he: 'מעקב אחרי מסלולים' },
    '/analysis/': { he: 'קובצי הפלט, G4AnalysisManager' },
    '/process/': { he: 'התהליכים הפיזיקליים' },
    '/material/': { he: 'חומרים' },
    '/material/g4/': { he: 'חומרי NIST' },
    '/vis/': { he: 'ויזואליזציה (פרק 7)' },
    '/ldns/': { he: 'הפקודות של ldns' },
    '/ldns/det/': { he: 'הממיר. לפני /run/initialize', guide: 'Converter geometry. Use before /run/initialize.' },
    '/ldns/mod/': { he: 'המאט. לפני /run/initialize', guide: 'Moderator behind the converter. Use before /run/initialize.' },
    '/ldns/refl/': { he: 'המחזיר. לפני /run/initialize' },
    '/ldns/src/': { he: 'המקור', guide: 'Proton source definition.' },
    '/ldns/out/': { he: 'הפלט', guide: 'Output control.' },
    '/ldns/xs/': { he: 'חתכי פעולה', guide: 'Print the cross sections Geant4 uses (after /run/initialize).' },
  };
  function children(dir) {
    const kids = new Set();
    Object.keys(DIRS).concat(Object.keys(COMMANDS)).forEach(function (path) {
      if (path === dir || path.indexOf(dir) !== 0) return;
      const rest = path.slice(dir.length);
      const cut = rest.indexOf('/');
      kids.add(cut >= 0 ? dir + rest.slice(0, cut + 1) : path);
    });
    return Array.from(kids).sort(function (a, b) {
      const da = a.endsWith('/'), db = b.endsWith('/');
      return da === db ? a.localeCompare(b) : da ? -1 : 1;
    });
  }

  /* ---------- materials ldns knows by a short name (DetectorConstruction::GetMaterial) ---------- */
  const MATS = {
    Be: ['G4_Be', 1.848], Li: ['G4_Li', 0.534], LiF: ['G4_LITHIUM_FLUORIDE', 2.635], Pb: ['G4_Pb', 11.35],
    C: ['G4_C', 2], PE: ['G4_POLYETHYLENE', 0.94], Al: ['G4_Al', 2.699], Cu: ['G4_Cu', 8.96], W: ['G4_W', 19.3],
  };
  function material(name) {
    if (MATS[name]) return { g4: MATS[name][0], rho: MATS[name][1] };
    const k = Object.keys(MATS).find((m) => MATS[m][0] === name);
    return k ? { g4: name, rho: MATS[k][1] } : null;
  }

  /* ---------- where ldns runs ---------- */
  const SPEC = 'data/E30J_M2_2.5_d10um_L0.012um_spectrum.txt';
  const CWD = {
    neutrons: {
      name: '30J 300fs/neutrons',
      dirs: ['output', 'results', 'data', 'scans'],
      files: [SPEC, 'data/E30J_M2_5_d10um_L0.027um_spectrum.txt', 'data/E3J_M2_2.5_d10um_L0.011um_spectrum.txt', 'data/E3J_M2_5_d10um_L0.011um_spectrum.txt'],
    },
    build: {
      name: 'geant4_converter/build',
      dirs: ['output', 'results', 'data', 'macros', '../macros', '../data'],
      files: ['data/hermione_E9.0J_tau27fs_R0um.txt', '../data/hermione_E9.0J_tau27fs_R0um.txt'],
    },
  };

  /* the macros the chapter runs */
  const MACROS = {
    /* 30J 300fs/neutrons/output/E30J_M2p5_Be2.mac, verbatim */
    be2: '/control/verbose 1\n/run/verbose 1\n/ldns/det/clearLayers\n/ldns/det/addLayer Be 2 mm\n/ldns/det/distance 45 mm\n/ldns/det/radius 22 mm\n/run/initialize\n/ldns/src/mode spectrum\n/ldns/src/file ' + SPEC + '\n/ldns/src/Emin 1.85 MeV\n/ldns/src/Emax 13.0 MeV\n/ldns/src/halfAngle 20 deg\n/ldns/src/sampling flat\n/ldns/src/print\n/ldns/out/level 2\n/analysis/setFileName output/E30J_M2p5_Be2\n/run/printProgress 500000\n/run/beamOn 3000000',
    /* GUIDE_HE.md 5.8: a scan inside Geant4, two files */
    oneEnergy: '# ../macros/one_energy.mac\n/ldns/src/energy {E} MeV\n/analysis/setFileName output/mono_{E}MeV\n/run/beamOn 100000',
    scanEnergy: '# ../macros/scan_energy.mac\n/ldns/det/clearLayers\n/ldns/det/addLayer LiF 4 mm\n/run/initialize\n/ldns/src/mode mono\n/ldns/src/halfAngle 0 deg\n/ldns/out/level 0\n/control/foreach ../macros/one_energy.mac E "5 10 20 40"',
  };
  MACROS.be2Lines = MACROS.be2.split('\n');
  /* the real macro with one line replaced: with(i, text), or removed (text null), or inserted (at, text, true) */
  function variant(edits) {
    const L = MACROS.be2Lines.slice();
    edits.forEach(function (e) {
      if (e.insert) L.splice(e.at, 0, e.text);
      else if (e.text === null) L.splice(e.at, 1);
      else L[e.at] = e.text;
    });
    return L.join('\n');
  }

  /* ---------- the Be 2 mm run: lines of E30J_M2p5_Be2.log, verbatim ---------- */
  const CANON = {
    layers: [['Be', 2]], distance: 45, radius: 22, file: SPEC, Emin: 1.85, Emax: 13, angle: 20, sampling: 'flat', N: 3000000,
    sourceBody: [
      '  table points used      : 1116',
      '  Integral f dE          : 1.16541e+12 protons/sr',
      '  protons per shot (cone): 4.416e+11',
      '  mean proton energy     : 3.93697 MeV',
      '  energy in cone / shot  : 0.278548 J',
    ],
    progress: [[0, 'G4WT0', '28174681,49237569'], [500000, 'G4WT2', '56933348,14847662'], [1000000, 'G4WT3', '13518119,75113947'],
      [1500000, 'G4WT5', '95552120,53726648'], [2000000, 'G4WT1', '10822275,79665705'], [2500000, 'G4WT1', '87975087,33606689']],
    time: '  User=139.720000s Real=17.560265s Sys=1.090000s [Cpu=801.9%]',
    summary: [
      ' events (source particles): 3000000   (sum of weights 2.99921e+06)',
      ' neutrons per source particle:',
      '   created by non-neutron parents: 4.459e-04 +- 9.033e-06',
      '     layer 0 (Be): 4.459e-04',
      '   leaving the converter       : 4.470e-04 +- 9.048e-06',
      '     forward (p_z > 0)         : 2.654e-04 +- 6.907e-06',
      ' source particles per shot: 4.416e+11',
      ' neutrons per SHOT leaving: 1.974e+08 +- 3.995e+06',
      '   forward                : 1.172e+08 +- 3.050e+06',
    ],
  };

  /* ---------- tokenizing a line as G4UIbatch does ---------- */
  function tokenize(s) {
    const out = [];
    const re = /"[^"]*"?|\S+/g;
    let m;
    while ((m = re.exec(s))) out.push(m[0]);
    return out;
  }
  /* drop everything from the first token that starts with '#', and squeeze the spaces */
  function clean(raw) {
    const t = tokenize(raw);
    const k = t.findIndex((x) => x[0] === '#');
    return (k >= 0 ? t.slice(0, k) : t).join(' ');
  }
  const isInt = (s) => /^[+-]?\d{1,20}$/.test(s);
  const isDouble = (s) => /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s);
  const unq = (s) => (s && s[0] === '"' ? s.replace(/^"/, '').replace(/"$/, '') : s);

  /* G4UIcommand::DoIt: parameters in order; the last string parameter takes the rest of the line */
  function parseParams(def, rest) {
    const toks = tokenize(rest);
    const vals = [];
    let ti = 0;
    for (let i = 0; i < def.params.length; i++) {
      const q = def.params[i];
      let tok;
      if (i === def.params.length - 1 && q.t === 's') { tok = toks.slice(ti).join(' '); ti = toks.length; }
      else tok = toks[ti++];
      if (tok === undefined || tok === '' || tok === '!') {
        if (q.opt) { vals.push(q.def); continue; }
        return { err: 'missing', i, q };
      }
      if (q.t === 'i' && !isInt(tok)) return { err: 'int', i, q, tok };
      if (q.t === 'd' && !isDouble(tok)) return { err: 'double', i, q, tok };
      if (q.cands && !q.free && q.cands.indexOf(tok) < 0) return { err: 'cand', i, q, tok };
      if (q.range && !q.range.test(+tok)) return { err: 'range', i, q, tok };
      vals.push(tok);
    }
    return { vals };
  }

  /* ---------- the executor ---------- */
  function makeCtx(o) {
    const cwd = CWD[o.cwd || 'neutrons'];
    return {
      lint: !!o.lint, cwd, fs: Object.assign({}, o.fs || {}),
      state: 'PreInit', verbose: o.echo ? 1 : 0, progress: 0, seeds: false,
      aliases: { STACK: 'default' },
      layers: [], distance: 20, radius: 25, extraGeom: false,
      src: { mode: 'mono', particle: 'proton', file: '', Emin: 0, Emax: 0, angle: 0, sampling: 'flat', dirty: true },
      fileName: 'output/ldns', fileNameSet: false,
      entries: [], issues: [], runs: [], files: [], stopped: null, runCount: 0, didInit: false,
    };
  }
  const E = (ctx, k, s, line, w) => ctx.entries.push({ k, s, line, w });
  function issue(ctx, line, level, html, kind) { ctx.issues.push({ line, level, html, kind }); }
  function stop(ctx, line, kind) {
    if (ctx.lint) return false;
    ctx.stopped = { line, kind };
    return true;
  }
  function interrupt(ctx, line, kind) {
    if (ctx.lint) return false;
    E(ctx, 'err', '', line);
    E(ctx, 'err', '***** Batch is interrupted!! *****', line, 0.3);
    return stop(ctx, line, kind);
  }
  function exception(ctx, line, codeName, by, msg, kind) {
    E(ctx, 'err', '', line);
    E(ctx, 'err', '-------- EEEE ------- G4Exception-START -------- EEEE -------', line);
    E(ctx, 'err', '*** G4Exception : ' + codeName, line);
    E(ctx, 'err', '      issued by : ' + by, line);
    E(ctx, 'err', msg, line);
    E(ctx, 'err', '*** Fatal Exception *** core dump ***', line);
    E(ctx, 'err', '-------- EEEE -------- G4Exception-END --------- EEEE -------', line, 0.3);
    if (!ctx.lint) E(ctx, 'note', 'כאן התוכנה נעצרת.', line);
    return stop(ctx, line, kind);
  }
  const L = (n) => 'שורה ' + (n + 1) + ': ';

  function execute(text, o) {
    o = o || {};
    const ctx = makeCtx(o);
    runLines(ctx, String(text).split('\n'), null, 0);
    if (!ctx.stopped) {
      if (!ctx.runs.length) issue(ctx, null, 'info', 'אין ' + code('/run/beamOn') + ': המאקרו לא מריץ אירועים.', 'norun');
      else if (!ctx.fileNameSet) issue(ctx, null, 'warn', 'אין ' + code('/analysis/setFileName') + ': הפלט נכתב ל-' + code('output/ldns') + ', וכל ריצה דורסת את הקודמת.', 'nofilename');
    }
    return ctx;
  }

  function runLines(ctx, lines, parent, depth) {
    for (let i = 0; i < lines.length && !ctx.stopped; i++) applyLine(ctx, lines[i], parent === null ? i : parent, depth);
  }

  function applyLine(ctx, raw, li, depth) {
    let cmd = clean(raw);
    if (!cmd) return;
    let missing = null;
    cmd = cmd.replace(/\{([^}]+)\}/g, function (m, name) {
      if (ctx.aliases[name] === undefined) { missing = name; return m; }
      return ctx.aliases[name];
    });
    if (missing) {
      issue(ctx, li, 'error', L(li) + 'המשתנה ' + code('{' + missing + '}') + ' לא הוגדר ב-' + code('/control/alias') + '.', 'alias');
      E(ctx, 'note', 'המשתנה ' + ltr('{' + missing + '}') + ' לא מוגדר, והשורה נדחית.', li);
      interrupt(ctx, li, 'alias');
      return;
    }
    if (ctx.verbose > 0) E(ctx, 'cmd', cmd, li, depth ? 0.12 : 0.2);
    const sp = cmd.indexOf(' ');
    const path = sp < 0 ? cmd : cmd.slice(0, sp);
    const rest = sp < 0 ? '' : cmd.slice(sp + 1);
    const def = COMMANDS[path];
    if (!def) {
      E(ctx, 'err', '***** COMMAND NOT FOUND <' + cmd + '> *****', li);
      issue(ctx, li, 'error', L(li) + 'אין פקודה ' + code(path) + '. שגיאת כתיב, או בינארי ישן שלא נבנה מחדש אחרי שינוי בקוד.', 'notfound');
      interrupt(ctx, li, 'notfound');
      return;
    }
    if (def.states.indexOf(ctx.state) < 0) {
      E(ctx, 'err', '***** Illegal application state <' + cmd + '> *****', li);
      issue(ctx, li, 'error', L(li) + code(path) + ' מותרת רק במצבים ' + code(def.states.join(' ')) + ', ועכשיו המצב ' + code(ctx.state) + (def.states.length === 1 && def.states[0] === 'PreInit' ? ': פקודות גיאומטריה רק לפני ' + code('/run/initialize') + '.' : '.'), 'state');
      interrupt(ctx, li, 'state');
      return;
    }
    const r = parseParams(def, rest);
    if (r.err) {
      const pn = r.i;
      if (r.err === 'int') {
        E(ctx, 'err', r.tok + ': integer expected.', li);
        issue(ctx, li, 'error', L(li) + code(r.tok) + ' אינו מספר שלם. ' + (/e/i.test(r.tok) ? 'כותבים את כל הספרות, ' + code(isDouble(r.tok) ? String(Math.round(+r.tok)) : '3000000') + '.' : 'בלי סימנים אחרי המספר.'), 'int');
      } else if (r.err === 'double') {
        E(ctx, 'err', r.tok + ': double value expected.', li);
        issue(ctx, li, 'error', L(li) + code(r.tok) + ' אינו מספר. בין המספר ליחידה צריך רווח.', 'double');
      } else if (r.err === 'cand') {
        E(ctx, 'err', 'parameter value (' + r.tok + ') is not listed in the candidate List.', li);
        issue(ctx, li, 'error', L(li) + code(r.tok) + ' אינו אחד הערכים המותרים: ' + code(r.q.cands.join(' ')) + '.', 'cand');
      } else if (r.err === 'missing') {
        if (r.q.n === 'Unit') issue(ctx, li, 'error', L(li) + 'חסרה יחידה, ולפקודה ' + code(path) + ' אין יחידת ברירת מחדל.', 'nounit');
        else issue(ctx, li, 'error', L(li) + 'חסר הפרמטר ' + code(r.q.n) + ', ואין לו ערך ברירת מחדל.', 'missing');
      } else if (r.err === 'range') {
        issue(ctx, li, 'error', L(li) + code(r.q.n) + ' מחוץ לטווח: צריך ' + code(r.q.range.text) + '.', 'range');
      }
      if (r.err === 'range' && r.q.range.cmdLevel) E(ctx, 'note', 'הערך מחוץ לטווח של הפקודה, והשורה נדחית.', li);
      else E(ctx, 'err', '***** Illegal parameter (' + pn + ') <' + cmd + '> *****', li);
      interrupt(ctx, li, r.err);
      return;
    }
    act(ctx, path, def, r.vals, li, cmd, depth);
  }

  function warnDefaultUnit(ctx, li, raw, unit) {
    issue(ctx, li, 'warn', L(li) + 'בלי יחידה. Geant4 לוקח בשקט את ברירת המחדל, ' + code(unit) + '.', 'unitdefault');
  }
  function hasUnitToken(raw, n) { return tokenize(raw.split('#')[0]).length > n; }

  function act(ctx, path, def, v, li, cmd, depth) {
    const s = ctx.src;
    switch (path) {
      case '/control/verbose': ctx.verbose = +v[0]; break;
      case '/run/printProgress': ctx.progress = +v[0]; break;
      case '/random/setSeeds': ctx.seeds = true; break;
      case '/control/alias': ctx.aliases[v[0]] = unq(v[1]); break;
      case '/control/execute': runMacro(ctx, v[0], li, depth, null); break;
      case '/control/foreach': {
        const vals = unq(v[2]).split(/\s+/).filter(Boolean);
        vals.forEach(function (x) { if (!ctx.stopped) runMacro(ctx, v[0], li, depth, [v[1], x]); });
        break;
      }
      case '/control/loop': {
        const a = +v[2], b = +v[3], st = +v[4] || 1;
        for (let x = a, k = 0; x <= b + 1e-9 && k < 200 && !ctx.stopped; x += st, k++) runMacro(ctx, v[0], li, depth, [v[1], cpp(x)]);
        break;
      }
      case '/ldns/det/clearLayers': ctx.layers = []; break;
      case '/ldns/det/addLayer': {
        const unit = v[2];
        const f = UNITS.Length[unit];
        if (!hasUnitToken(cmd, 3)) warnDefaultUnit(ctx, li, cmd, 'mm');
        if (f === undefined) {
          issue(ctx, li, 'error', L(li) + code(unit) + ' אינה יחידת אורך.', 'unit');
          E(ctx, 'note', 'יחידה שהמסוף לא מכיר. השכבה לא נוספה.', li);
          if (stop(ctx, li, 'unit')) return;
          break;
        }
        const t = +v[1] * f;
        if (t <= 0) {
          E(ctx, 'out', '### Layer ' + v[0] + ' with zero thickness skipped', li);
          issue(ctx, li, 'warn', L(li) + 'שכבה בעובי 0 מדולגת.', 'zero');
          break;
        }
        if (!material(v[0])) {
          issue(ctx, li, 'error', L(li) + 'החומר ' + code(v[0]) + ' לא מוכר (LDNS002).', 'material');
          exception(ctx, li, 'LDNS002', 'DetectorConstruction::AddLayer', 'Unknown material: ' + v[0], 'material');
          break;
        }
        ctx.layers.push([v[0], t]);
        break;
      }
      case '/ldns/det/distance': ctx.distance = +v[0] * UNITS.Length[v[1]]; break;
      case '/ldns/det/radius': ctx.radius = +v[0] * UNITS.Length[v[1]]; break;
      case '/ldns/det/maxStep': case '/ldns/mod/material': case '/ldns/mod/length': case '/ldns/mod/radius': case '/ldns/mod/gap':
      case '/ldns/mod/insertDepth': case '/ldns/refl/material': case '/ldns/refl/thickness':
        ctx.extraGeom = true; break;
      case '/run/initialize': initialize(ctx, li); break;
      case '/ldns/src/mode': s.mode = v[0]; s.dirty = true; break;
      case '/ldns/src/file': s.file = v[0]; s.dirty = true; break;
      case '/ldns/src/particle': s.particle = v[0]; s.dirty = true; break;
      case '/ldns/src/sampling': s.sampling = v[0]; s.dirty = true; break;
      case '/ldns/src/Emin': case '/ldns/src/Emax': case '/ldns/src/energy': case '/ldns/src/halfAngle': {
        if (!hasUnitToken(cmd, 2)) warnDefaultUnit(ctx, li, cmd, def.params[1].def);
        const x = +v[0] * UNITS[def.params[1].cat][v[1]];
        if (path === '/ldns/src/Emin') s.Emin = x;
        else if (path === '/ldns/src/Emax') s.Emax = x;
        else if (path === '/ldns/src/energy') s.energy = x;
        else s.angle = x;
        s.dirty = true;
        break;
      }
      case '/ldns/out/acceptance': if (!hasUnitToken(cmd, 2)) warnDefaultUnit(ctx, li, cmd, 'deg'); break;
      case '/ldns/src/print': prepareSource(ctx, li, true); break;
      case '/analysis/setFileName': {
        ctx.fileName = v[0]; ctx.fileNameSet = true;
        const base = v[0].split('/').pop();
        const dot = base.lastIndexOf('.');
        if (dot >= 0 && base.slice(dot + 1) !== 'root') {
          issue(ctx, li, 'error', L(li) + 'נקודה בשם הקובץ: Geant4 קורא את ' + code(base.slice(dot + 1)) + ' כסוג הקובץ, לא מכיר אותו, וקובץ ה-ROOT לא נכתב.', 'dot');
        }
        const dir = v[0].indexOf('/') >= 0 ? v[0].slice(0, v[0].lastIndexOf('/')) : '';
        if (dir && ctx.cwd.dirs.indexOf(dir) < 0) issue(ctx, li, 'warn', L(li) + 'התיקייה ' + code(dir) + ' לא קיימת בתיקיית העבודה, ושום קובץ לא ייכתב שם.', 'nodir');
        break;
      }
      case '/run/beamOn': beamOn(ctx, +v[0], li); break;
      case '/process/list': case '/material/g4/printMaterial':
        E(ctx, 'note', 'כאן Geant4 מדפיס רשימה ארוכה, והמסוף מדלג עליה.', li); break;
      default: break;
    }
  }

  function runMacro(ctx, file, li, depth, alias) {
    if (alias) ctx.aliases[alias[0]] = alias[1];
    const text = ctx.fs[file];
    if (text === undefined) {
      issue(ctx, li, 'error', L(li) + 'המאקרו ' + code(file) + ' לא נמצא יחסית לתיקיית העבודה.', 'nomacro');
      E(ctx, 'note', 'הקובץ ' + ltr(file) + ' לא נמצא.', li);
      interrupt(ctx, li, 'nomacro');
      return;
    }
    if (depth > 4) return;
    runLines(ctx, text.split('\n'), li, depth + 1);
  }

  function initialize(ctx, li) {
    if (ctx.state !== 'PreInit') return;
    E(ctx, 'state', 'Init', li, 0.3);
    if (!ctx.layers.length && !ctx.extraGeom) {
      issue(ctx, li, 'error', L(li) + 'אין שכבות ואין מאט (LDNS003).', 'nolayers');
      exception(ctx, li, 'LDNS003', 'DetectorConstruction::Construct', 'No converter layers and no moderator defined', 'nolayers');
      return;
    }
    E(ctx, 'out', '', li);
    ctx.layers.forEach(function (l, i) { E(ctx, 'out', 'Checking overlaps for volume Layer' + i + '_' + l[0] + ':' + (i + 1) + ' (G4Tubs) ... OK! ', li); });
    E(ctx, 'out', '', li);
    E(ctx, 'out', '================ LDNS converter geometry ================', li);
    E(ctx, 'out', ' source at z = 0, front face at z = ' + bestUnit(ctx.distance) + ', radius = ' + bestUnit(ctx.radius), li);
    let z = ctx.distance;
    ctx.layers.forEach(function (l, i) {
      const m = material(l[0]);
      E(ctx, 'out', '  layer ' + i + ' : ' + l[0] + ' (' + m.g4 + ', rho = ' + cpp(m.rho) + ' g/cm3)  t = ' + bestUnit(l[1]) + '  z = [' + cpp(z) + ', ' + cpp(z + l[1]) + '] mm', li);
      z += l[1];
    });
    if (ctx.extraGeom) E(ctx, 'note', 'המאט והמחזיר: המסוף לא מדפיס את השורות שלהם.', li);
    else E(ctx, 'out', '  moderator : none', li);
    E(ctx, 'out', '==========================================================', li, 0.4);
    ctx.geomZ = z;
    ctx.didInit = true;
    E(ctx, 'state', 'Idle', li, 0.3);
    ctx.state = 'Idle';
    ctx.geom = { layers: ctx.layers.map((l) => l.slice()), distance: ctx.distance, radius: ctx.radius };
  }

  function describe(s) {
    return 'proton spectrum \'' + s.file + '\' ' + cpp(s.Emin) + '-' + cpp(s.Emax) + ' MeV, half-angle ' + cpp(s.angle) + ' deg, sampling ' + s.sampling;
  }
  const canonSource = (s) => s.mode === 'spectrum' && s.particle === 'proton' && s.file === CANON.file && Math.abs(s.Emin - CANON.Emin) < 1e-9 && Math.abs(s.Emax - CANON.Emax) < 1e-9 && Math.abs(s.angle - CANON.angle) < 1e-9;

  /* SourceSpectrum::Prepare: open the table, check the limits, print the summary. false = fatal */
  function prepareSource(ctx, li, force) {
    const s = ctx.src;
    if (!s.dirty && !force) return true;
    s.dirty = false;
    if (s.mode !== 'spectrum') {
      E(ctx, 'note', 'סיכום המקור במצב ' + ltr(s.mode) + ': המסוף מדלג עליו.', li);
      return true;
    }
    if (ctx.cwd.files.indexOf(s.file) < 0) {
      issue(ctx, li, 'error', L(li) + 'הקובץ ' + code(s.file || '(ריק)') + ' לא נמצא יחסית לתיקיית העבודה, ' + code(ctx.cwd.name) + '.', 'nofile');
      return !exception(ctx, li, 'LDNS010', 'SourceSpectrum::Prepare', 'Cannot open spectrum file: ' + s.file, 'nofile');
    }
    if (s.Emax > 0 && s.Emin > 0 && s.Emax <= s.Emin) {
      issue(ctx, li, 'error', L(li) + code('Emax') + ' קטן מ-' + code('Emin') + ' או שווה לו (LDNS012). אולי חסרה יחידה, והמספר נלקח ב-MeV במקום ב-keV?', 'emax');
      return !exception(ctx, li, 'LDNS012', 'SourceSpectrum::Prepare', 'Emax <= Emin', 'emax');
    }
    E(ctx, 'out', '', li);
    E(ctx, 'out', '================ LDNS proton source ================', li);
    if (canonSource(s)) {
      E(ctx, 'out', ' ' + describe(s), li);
      CANON.sourceBody.forEach(function (x) { E(ctx, 'out', x, li); });
    } else {
      if (s.Emin > 0 && s.Emax > 0) E(ctx, 'out', ' ' + describe(s), li);
      E(ctx, 'note', 'את המספרים של המקור הזה המסוף לא מכיר: הוא מכיר רק את המקור של ריצת ה-' + ltr('Be 2 mm') + '.', li);
    }
    E(ctx, 'out', '====================================================', li, 0.4);
    E(ctx, 'out', '', li);
    return true;
  }

  function beamOn(ctx, N, li) {
    if (!ctx.didInit) {
      issue(ctx, li, 'error', L(li) + code('/run/beamOn') + ' לפני ' + code('/run/initialize') + ': Geant4 מתעלם מהריצה.', 'noinit');
      E(ctx, 'note', 'הליבה עוד לא אותחלה: Geant4 מדפיס הודעה ומתעלם מ-' + ltr('beamOn') + ', והמאקרו ממשיך.', li, 0.4);
      return;
    }
    if (!prepareSource(ctx, li, false)) return;
    const name = ctx.fileName;
    const base = name.split('/').pop();
    const dot = base.lastIndexOf('.');
    const ext = dot >= 0 ? base.slice(dot + 1) : '';
    const dir = name.indexOf('/') >= 0 ? name.slice(0, name.lastIndexOf('/')) : '';
    const dirOk = !dir || ctx.cwd.dirs.indexOf(dir) >= 0;
    const g = ctx.geom || { layers: [] };
    const canonical = ctx.runCount === 0 && !ctx.seeds && !ctx.extraGeom && g.layers.length === 1 && g.layers[0][0] === 'Be' && Math.abs(g.layers[0][1] - 2) < 1e-9 &&
      Math.abs(g.distance - 45) < 1e-9 && Math.abs(g.radius - 22) < 1e-9 && canonSource(ctx.src) && ctx.src.sampling === 'flat' && N === CANON.N;
    const prev = ctx.runs.find((r) => r.name === name);
    if (prev) issue(ctx, li, 'warn', L(li) + 'אותו שם קובץ כמו בריצה של שורה ' + (prev.line + 1) + ': הריצה הזאת דורסת אותה.', 'overwrite');
    const run = { name, N, line: li, canonical, ext, dirOk, index: ctx.runCount++ };
    ctx.runs.push(run);

    E(ctx, 'state', 'GeomClosed', li, 0.3);
    E(ctx, 'out', '### Run ' + run.index + ' starts.', li, 0.2);
    if (ext && ext !== 'root') E(ctx, 'note', 'כאן ' + ltr('G4AnalysisManager') + ' מדפיס אזהרה: הוא לא מכיר סוג קובץ בשם ' + ltr(ext) + ', ולא פותח קובץ. הריצה ממשיכה.', li, 0.3);
    E(ctx, 'state', 'EventProc', li, 0.2);
    if (canonical && ctx.progress === 500000) {
      CANON.progress.forEach(function (q) { E(ctx, 'out', q[1] + ' > --> Event ' + q[0] + ' starts with initial seeds (' + q[2] + ').', li, 0.5); });
    } else if (ctx.progress > 0 && N > 0) {
      const ev = [];
      for (let k = 0; k < N && ev.length < 400; k += ctx.progress) ev.push(k);
      const show = ev.length > 6 ? ev.slice(0, 3).concat([null], ev.slice(-2)) : ev;
      show.forEach(function (k) {
        if (k === null) E(ctx, 'note', 'עוד ' + (ev.length - 5) + ' שורות כאלה.', li, 0.2);
        else E(ctx, 'out', '--> Event ' + k + ' starts with initial seeds (…).', li, 0.4);
      });
    } else E(ctx, 'beat', '', li, 1.2);
    E(ctx, 'state', 'GeomClosed', li, 0.2);
    E(ctx, 'out', ' Run terminated.', li);
    E(ctx, 'out', 'Run Summary', li);
    E(ctx, 'out', '  Number of events processed : ' + N, li);
    if (canonical) E(ctx, 'out', CANON.time, li);
    E(ctx, 'out', '', li);
    if (N > 0) {
      E(ctx, 'out', '=================== LDNS run summary ===================', li);
      E(ctx, 'out', ' physics list           : QGSP_BIC_AllHP_EMZ', li);
      if (ctx.src.mode === 'spectrum' && ctx.src.Emin > 0 && ctx.src.Emax > 0) E(ctx, 'out', ' source                 : ' + describe(ctx.src), li);
      if (canonical) CANON.summary.forEach(function (x) { E(ctx, 'out', x, li, 0.15); });
      else {
        E(ctx, 'out', ' events (source particles): ' + N, li);
        E(ctx, 'note', 'את המספרים של הריצה הזאת המסוף לא מכיר: הוא מכיר רק את הריצה הראשונה של ממיר ה-' + ltr('Be 2 mm') + ', עם ' + ltr('3000000') + ' אירועים.', li);
      }
      E(ctx, 'out', '========================================================', li);
      E(ctx, 'out', '', li);
      const json = (ext === 'root' ? name.slice(0, -5) : name) + '_summary.json';
      E(ctx, 'out', ' summary written to ' + json, li, 0.3);
      if (dirOk) {
        if (!ext) { ctx.files.push(name + '.root'); E(ctx, 'file', name + '.root', li, 0.2); }
        else if (ext === 'root') { ctx.files.push(name); E(ctx, 'file', name, li, 0.2); }
        ctx.files.push(json); E(ctx, 'file', json, li, 0.2);
      }
    }
    E(ctx, 'state', 'Idle', li, 0.3);
    run.json = (ext === 'root' ? name.slice(0, -5) : name) + '_summary.json';
    run.root = !dirOk ? null : !ext ? name + '.root' : ext === 'root' ? name : null;
  }

  PHY.ch06 = {
    COMMANDS, DIRS, children, UNITS, BASE, MATS, material, CWD, SPEC, MACROS, CANON, variant,
    cpp, bestUnit, esc, code, ltr, tokenize, clean, isInt, isDouble, parseParams, execute,
    STATES: ['PreInit', 'Init', 'Idle', 'GeomClosed', 'EventProc'],
  };
})();
