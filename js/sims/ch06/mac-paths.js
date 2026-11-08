/* PHY.sims.macPaths: where a relative path points. DOM-only: the first argument is a host <div>.
   The project folder as GUIDE_HE.md 2.3 describes it: cmake copies macros/ and data/ into build/, and we
   run ldns from build/. A relative path, the one after -m and the one inside a macro, is joined to the
   working directory of the process, never to the folder of the macro that holds it.
   mode 'file': ./ldns -m ../macros/my_run.mac, and the macro reads data/hermione_E9.0J_tau27fs_R0um.txt.
   mode 'copy': we edited macros/my_run.mac (Be 2 mm -> Be 4 mm) in the project and run
   ./ldns -m macros/my_run.mac from build/, which is the copy cmake made before the edit.
   play(seconds) resolves the paths step by step and lights the files that are read; before it nothing
   is lit. resolve(cwd, rel) joins and normalises. After the card both paths can be chosen.
   opts: {mode, locked, chapter, section}. getState(): {macroFile, dataFile, layer, steps}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const U = PHY.ui;
  const h = U.h;
  const SPEC = 'hermione_E9.0J_tau27fs_R0um.txt';
  const ROOT = 'geant4_converter';
  /* the tree: [path, depth, note] */
  const TREE = [
    [ROOT + '/', 0, 'הפרויקט'],
    [ROOT + '/macros/', 1, ''],
    [ROOT + '/macros/my_run.mac', 2, 'המקור, שערכנו'],
    [ROOT + '/data/', 1, ''],
    [ROOT + '/data/' + SPEC, 2, 'המקור'],
    [ROOT + '/build/', 1, 'תיקיית העבודה'],
    [ROOT + '/build/ldns', 2, 'התוכנה'],
    [ROOT + '/build/macros/', 2, ''],
    [ROOT + '/build/macros/my_run.mac', 3, 'עותק שיצר cmake'],
    [ROOT + '/build/data/', 2, ''],
    [ROOT + '/build/data/' + SPEC, 3, 'עותק שיצר cmake'],
    [ROOT + '/build/output/', 2, ''],
  ];
  const CWD = ROOT + '/build/';

  function resolve(cwd, rel) {
    const parts = (cwd + rel).split('/');
    const out = [];
    parts.forEach(function (p, i) {
      if (p === '..') out.pop();
      else if (p !== '.' && !(p === '' && i < parts.length - 1)) out.push(p);
    });
    return out.join('/');
  }

  PHY.sims.macPaths = function (host, controlsEl, opts) {
    opts = Object.assign({ mode: 'file', locked: true }, opts || {});
    host.classList.add('mac', 'mac-paths');
    host.setAttribute('data-no-iso', '');
    const cmdEl = h('div', { class: 'mac-term mac-term-short', dir: 'ltr' });
    const tree = h('ul', { class: 'path-tree', dir: 'ltr' });
    const steps = h('ol', { class: 'path-steps' });
    host.appendChild(cmdEl);
    host.appendChild(tree);
    host.appendChild(steps);
    const S = { lit: {}, cwd: false, steps: [], macroArg: '', fileArg: '', result: null };

    function setup() {
      S.macroArg = opts.macroArg || (opts.mode === 'copy' ? 'macros/my_run.mac' : '../macros/my_run.mac');
      S.fileArg = opts.fileArg || 'data/' + SPEC;
    }
    /* what the run reads, and what it builds */
    function compute() {
      const mac = resolve(CWD, S.macroArg);
      const dat = resolve(CWD, S.fileArg);
      const edited = opts.mode === 'copy';
      const layer = mac === ROOT + '/macros/my_run.mac' && edited ? 'Be 4 mm' : 'Be 2 mm';
      return {
        macroFile: mac, dataFile: dat, layer,
        steps: [
          { kind: 'cwd', he: 'תיקיית העבודה:', path: CWD },
          { kind: 'mac', he: 'הנתיב ' + PHY.fmt.ltr(S.macroArg) + ' אחרי ' + PHY.fmt.ltr('-m') + ' מצביע אל:', path: mac, hit: mac },
          opts.mode === 'copy' ? { kind: 'layer', he: 'ובקובץ הזה כתובה השכבה:', path: '/ldns/det/addLayer ' + layer, hit: mac } : { kind: 'dat', he: 'הנתיב ' + PHY.fmt.ltr(S.fileArg.replace(SPEC, '…')) + ' שבמאקרו מצביע אל:', path: dat, hit: dat },
        ],
      };
    }
    function paintCmd() {
      cmdEl.innerHTML = '';
      cmdEl.appendChild(h('div', { class: 't-cmd', text: '$ cd ' + ROOT + '/build' }));
      cmdEl.appendChild(h('div', { class: 't-cmd', text: '$ ./ldns -m ' + S.macroArg }));
      if (opts.mode !== 'copy') cmdEl.appendChild(h('div', { class: 't-out', text: '/ldns/src/file ' + S.fileArg }));
      else cmdEl.appendChild(h('div', { class: 't-note', dir: 'rtl', text: 'לפני כן, ב-VS Code, שינינו בקובץ macros/my_run.mac של הפרויקט את Be 2 mm ל-Be 4 mm.' }));
    }
    function paintTree() {
      tree.innerHTML = '';
      TREE.forEach(function (t) {
        const name = t[0].replace(/\/$/, '').split('/').pop() + (t[0].endsWith('/') ? '/' : '');
        const li = h('li', { class: 'path-node' + (S.lit[t[0]] ? ' is-hit' : '') + (S.cwd && t[0] === CWD ? ' is-cwd' : '') + (t[0].endsWith('/') ? ' is-dir' : ''), style: 'padding-inline-start:' + (6 + 16 * t[1]) + 'px' }, [
          h('span', { class: 'path-name', text: name }),
          t[2] ? h('span', { class: 'path-note', dir: 'rtl', text: t[2] }) : null,
          opts.mode === 'copy' && /my_run\.mac$/.test(t[0]) ? h('span', { class: 'path-note path-content', text: t[0].indexOf('/build/') > 0 ? 'Be 2 mm' : 'Be 4 mm' }) : null,
        ]);
        tree.appendChild(li);
      });
    }
    function paintSteps(n) {
      steps.innerHTML = '';
      S.steps.slice(0, n).forEach(function (s) {
        steps.appendChild(h('li', {}, [h('span', { text: s.he }), h('code', { dir: 'ltr', class: 'path-full', text: s.path })]));
      });
    }
    function paint(n) { paintCmd(); paintTree(); paintSteps(n === undefined ? S.steps.length : n); }

    let macChoice = null, fileChoice = null;
    if (controlsEl) {
      macChoice = U.Choice(controlsEl, { label: 'הפקודה', options: [{ value: '../macros/my_run.mac', text: '<code dir="ltr">-m ../macros/my_run.mac</code>' }, { value: 'macros/my_run.mac', text: '<code dir="ltr">-m macros/my_run.mac</code>' }], value: opts.mode === 'copy' ? 'macros/my_run.mac' : '../macros/my_run.mac', onChange(v) { opts.macroArg = v; api.resolveNow(); } });
      if (opts.mode !== 'copy') fileChoice = U.Choice(controlsEl, { label: 'הנתיב בתוך המאקרו', options: [{ value: 'data/' + SPEC, text: '<code dir="ltr">data/…</code>' }, { value: '../data/' + SPEC, text: '<code dir="ltr">../data/…</code>' }], value: 'data/' + SPEC, onChange(v) { opts.fileArg = v; api.resolveNow(); } });
    }
    function lock(on) {
      opts.locked = on;
      if (macChoice) macChoice.setEnabled(!on);
      if (fileChoice) fileChoice.setEnabled(!on);
    }

    const tw = PHY.tweens();
    const loop = PHY.SimLoop({ canvas: host, step: (dt) => tw.step(dt), render() {} });
    const api = {
      start: loop.start,
      stop: loop.stop,
      resolve,
      reset() { tw.clear(); S.lit = {}; S.cwd = false; S.steps = []; setup(); paint(0); },
      resolveNow() {
        setup();
        const r = compute();
        S.result = r; S.steps = r.steps; S.cwd = true; S.lit = {};
        r.steps.forEach(function (s) { if (s.hit) S.lit[s.hit] = true; });
        if (opts.mode !== 'copy') S.lit[r.macroFile] = true;
        paint();
        if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section);
        return r;
      },
      play(seconds) {
        tw.clear();
        setup();
        const r = compute();
        S.result = r; S.steps = r.steps; S.lit = {}; S.cwd = false;
        paint(0);
        const T = seconds || 4;
        let shown = -1;
        loop.start();
        return tw.run(T, function (k) {
          const n = Math.min(r.steps.length, Math.floor(k * (r.steps.length + 0.6)));
          if (n !== shown) {
            shown = n;
            S.cwd = n >= 1;
            S.lit = {};
            r.steps.slice(0, n).forEach(function (s) { if (s.hit) S.lit[s.hit] = true; });
            paint(n);
          }
          if (k >= 1) { paint(); lock(false); }
        });
      },
      setParam(key, v) { if (key === 'locked') lock(v); else { opts[key] = v; api.reset(); } },
      getState() { return S.result ? { macroFile: S.result.macroFile, dataFile: S.result.dataFile, layer: S.result.layer, steps: S.steps.length } : { steps: 0 }; },
    };
    setup();
    paint(0);
    lock(opts.locked);
    return api;
  };
})();
