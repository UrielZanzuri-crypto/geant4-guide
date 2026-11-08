/* PHY.sims.macTree: the command tree that G4UImanager holds, to explore like `ls` and `help` in the GUI.
   DOM-only: the first argument is a host <div>. Tapping a directory lists what is in it; tapping a command
   opens its card: who defined it (Geant4 or an ldns messenger), the guidance string of the ldns code, the
   parameters (type, omittable with a default, range or candidate values, the unit and its default) and,
   for the ldns commands, the application states in which it is accepted.
   check(line, state) walks a typed line through what the UI manager does before the messenger sees it:
   find the command, check the state, check each parameter. play(seconds) does that, animated, for
   opts.probe; before it the card is closed, so the card does not answer itself.
   opts: {probe, probeState, locked, chapter, section}. getState(): {dir, open, result}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const U = PHY.ui, K = PHY.ch06;
  const h = U.h;
  const TYPE = { s: 'מחרוזת', d: 'מספר', i: 'מספר שלם' };

  function check(line, state) {
    const cmd = K.clean(line);
    const sp = cmd.indexOf(' ');
    const path = sp < 0 ? cmd : cmd.slice(0, sp);
    const rest = sp < 0 ? '' : cmd.slice(sp + 1);
    const def = K.COMMANDS[path];
    const out = { line: cmd, path, found: !!def, stateOk: false, params: [], ok: false, msg: [] };
    if (!def) { out.msg.push('***** COMMAND NOT FOUND <' + cmd + '> *****'); return out; }
    out.stateOk = def.states.indexOf(state) >= 0;
    if (!out.stateOk) { out.msg.push('***** Illegal application state <' + cmd + '> *****'); return out; }
    const r = K.parseParams(def, rest);
    const toks = K.tokenize(rest);
    def.params.forEach(function (q, i) {
      const bad = r.err && r.i === i;
      const after = r.err && i > r.i;
      out.params.push({ name: q.n, value: bad || after ? (bad && r.tok !== undefined ? r.tok : '') : r.vals ? r.vals[i] : toks[i], ok: !bad && !after, skipped: after, given: i < toks.length, err: bad ? r.err : null });
    });
    if (r.err) {
      if (r.err === 'int') out.msg.push(r.tok + ': integer expected.');
      if (r.err === 'double') out.msg.push(r.tok + ': double value expected.');
      if (r.err === 'cand') out.msg.push('parameter value (' + r.tok + ') is not listed in the candidate List.');
      if (!(r.err === 'range' && r.q.range.cmdLevel)) out.msg.push('***** Illegal parameter (' + r.i + ') <' + cmd + '> *****');
      out.err = r.err; out.errIndex = r.i;
      return out;
    }
    out.ok = true;
    return out;
  }

  PHY.sims.macTree = function (host, controlsEl, opts) {
    opts = Object.assign({ probe: '/ldns/det/addLayer Be', probeState: 'PreInit', locked: true }, opts || {});
    host.classList.add('mac', 'mac-tree');
    host.setAttribute('data-no-iso', '');
    const crumb = h('div', { class: 'tree-crumb', dir: 'ltr' });
    const list = h('ul', { class: 'tree-list', dir: 'ltr' });
    const card = h('div', { class: 'tree-card' });
    const probe = h('div', { class: 'tree-probe' });
    host.appendChild(crumb);
    host.appendChild(list);
    host.appendChild(card);
    host.appendChild(probe);
    const S = { dir: '/', open: null, result: null, playing: false };

    function touch() { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }
    function paintList() {
      crumb.innerHTML = '';
      const up = h('button', { type: 'button', class: 'tree-up', text: 'ls ' + S.dir, title: 'למעלה', onclick() { if (S.playing || opts.locked) return; if (S.dir !== '/') { S.dir = S.dir.replace(/[^/]+\/$/, ''); S.open = null; paint(); touch(); } } });
      crumb.appendChild(up);
      list.innerHTML = '';
      K.children(S.dir).forEach(function (path) {
        const isDir = path.endsWith('/');
        const name = path.slice(S.dir.length);
        const d = isDir ? K.DIRS[path] : K.COMMANDS[path];
        const li = h('li', { class: (isDir ? 'is-dir' : 'is-cmd') + (S.open === path ? ' is-open' : '') + (path.indexOf('/ldns/') === 0 ? ' is-ldns' : '') });
        const b = h('button', { type: 'button', onclick() { if (S.playing || opts.locked) return; go(path); touch(); } }, [
          h('span', { class: 'tree-name', text: name }),
          h('span', { class: 'tree-he', dir: 'rtl', text: d && d.he ? d.he : '' }),
        ]);
        li.appendChild(b);
        list.appendChild(li);
      });
    }
    function paintCard() {
      card.innerHTML = '';
      if (!S.open) { card.appendChild(h('p', { class: 'tree-empty', text: 'הקשה על פקודה פותחת את הכרטיס שלה, כמו help בממשק.' })); return; }
      const d = K.COMMANDS[S.open];
      const ldns = d.origin !== 'g4';
      card.appendChild(h('div', { class: 'tree-title', dir: 'ltr' }, [h('code', { dir: 'ltr', text: S.open })]));
      card.appendChild(h('p', { class: 'tree-origin', html: ldns ? 'הוגדרה ב-ldns, בקובץ <code dir="ltr">src/' + d.origin + '</code>' : 'פקודה של Geant4 עצמו' }));
      card.appendChild(h('p', { text: d.he }));
      if (d.guide) card.appendChild(h('p', { class: 'tree-guide', dir: 'ltr', text: 'Guidance: ' + d.guide }));
      if (d.params.length) {
        const t = h('table', { class: 'tree-params' });
        t.appendChild(h('thead', {}, [h('tr', {}, [h('th', { text: 'פרמטר' }), h('th', { text: 'סוג' }), h('th', { text: 'ברירת מחדל' }), h('th', { text: 'מותר' })])]));
        const tb = h('tbody');
        d.params.forEach(function (q) {
          let allowed = '', heb = false;
          if (q.cat) { allowed = q.free ? 'יחידת אורך' : q.cands.join(' '); heb = !!q.free; }
          else if (q.cands) allowed = q.cands.join(' ');
          if (q.range) allowed = (allowed ? allowed + ', ' : '') + q.range.text;
          tb.appendChild(h('tr', {}, [
            h('td', { dir: 'ltr', class: 'tree-pname', text: q.n }),
            h('td', { text: q.cat ? 'יחידה' : TYPE[q.t] }),
            q.opt ? h('td', { dir: 'ltr', text: q.def || '–' }) : h('td', { class: 'tree-req', text: 'חובה' }),
            heb || !allowed ? h('td', { text: allowed || '–' }) : h('td', { dir: 'ltr', class: 'tree-allowed', text: allowed }),
          ]));
        });
        t.appendChild(tb);
        card.appendChild(t);
      } else card.appendChild(h('p', { class: 'muted small', text: 'בלי פרמטרים.' }));
      card.appendChild(h('p', { class: 'tree-states', html: ldns ? 'מתקבלת במצבים: <code dir="ltr">' + d.states.join(' ') + '</code>' : 'את המצבים שבהם פקודה של Geant4 מתקבלת מראה <code dir="ltr">help</code> בממשק.' }));
    }
    function paintProbe(res, upTo) {
      probe.innerHTML = '';
      const line = h('div', { class: 'tree-line', dir: 'ltr' }, [h('span', { class: 'tree-prompt', text: opts.probeState + ' > ' }), h('span', { text: opts.probe })]);
      probe.appendChild(line);
      if (!res) return;
      const steps = [];
      steps.push([res.found, res.found ? 'הפקודה נמצאה בעץ' : 'אין פקודה כזאת בעץ']);
      if (res.found) steps.push([res.stateOk, res.stateOk ? 'המצב ' + opts.probeState + ' מותר' : 'המצב ' + opts.probeState + ' אינו מותר']);
      res.params.forEach(function (q) {
        if (q.skipped) return;
        steps.push([q.ok, q.ok ? 'הפרמטר ' + q.name + (q.given ? ' = ' + q.value : ': ברירת המחדל, ' + q.value) : q.err === 'missing' ? 'הפרמטר ' + q.name + ' חסר, ואין לו ברירת מחדל' : 'הפרמטר ' + q.name + ' = ' + q.value + ' נדחה']);
      });
      if (res.ok) steps.push([true, 'השורה עוברת ל-messenger של הפקודה']);
      const ul = h('ul', { class: 'tree-steps' });
      steps.slice(0, upTo === undefined ? steps.length : upTo).forEach(function (s) {
        ul.appendChild(h('li', { class: s[0] ? 'is-ok' : 'is-bad' }, [h('span', { class: 'tree-mark', text: s[0] ? '✓' : '✗' }), h('bdi', { text: s[1] })]));
      });
      probe.appendChild(ul);
      if (upTo === undefined || upTo >= steps.length) res.msg.forEach(function (m) { probe.appendChild(h('div', { class: 't-err', dir: 'ltr', text: m })); });
      return steps.length;
    }
    function paint() { paintList(); paintCard(); }
    function go(path) {
      if (path.endsWith('/')) { S.dir = path; S.open = null; }
      else { S.open = path; S.dir = path.slice(0, path.lastIndexOf('/') + 1); }
      paint();
    }

    let input = null, stateChoice = null, checkBtn = null;
    if (controlsEl) {
      input = h('input', { type: 'text', class: 'tree-input', dir: 'ltr', spellcheck: 'false', autocapitalize: 'off', 'aria-label': 'שורת פקודה' });
      input.value = opts.probe;
      controlsEl.appendChild(h('label', { class: 'tree-input-label', text: 'שורה לבדיקה' }));
      controlsEl.appendChild(input);
      stateChoice = U.Choice(controlsEl, { label: 'המצב של האפליקציה', options: [{ value: 'PreInit', text: 'PreInit' }, { value: 'Idle', text: 'Idle' }], value: opts.probeState, onChange(v) { opts.probeState = v; } });
      const row = h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      checkBtn = U.Button(row, 'לבדוק את השורה', function () { opts.probe = input.value; api.checkNow(); touch(); }, { primary: true });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { opts.probe = input.value; api.checkNow(); touch(); } });
    }
    function lock(on) {
      opts.locked = on;
      if (input) input.disabled = on;
      if (stateChoice) stateChoice.setEnabled(!on);
      if (checkBtn) checkBtn.disabled = on;
      host.classList.toggle('is-locked', on);
    }

    const tw = PHY.tweens();
    const loop = PHY.SimLoop({ canvas: host, step: (dt) => tw.step(dt), render() {} });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.dir = '/'; S.open = null; S.result = null; paint(); paintProbe(null); },
      check,
      checkNow() {
        const res = check(opts.probe, opts.probeState);
        S.result = res;
        if (res.found) go(res.path);
        paintProbe(res);
        return res;
      },
      play(seconds) {
        tw.clear();
        const T = seconds || 6;
        const res = check(opts.probe, opts.probeState);
        S.result = res;
        const parts = res.path.split('/').filter(Boolean);
        const hops = [];
        for (let i = 0; i < parts.length - 1; i++) hops.push('/' + parts.slice(0, i + 1).join('/') + '/');
        if (res.found) hops.push(res.path);
        S.dir = '/'; S.open = null; paint(); paintProbe(null);
        const nSteps = 2 + res.params.length + 2;
        S.playing = true;
        loop.start();
        let shownHop = -1, shownStep = -1;
        return tw.run(T, function (k) {
          const kh = Math.min(1, k / 0.5);
          const hi = Math.floor(kh * hops.length - 1e-9);
          if (hi > shownHop && hops.length) { shownHop = hi; go(hops[Math.min(hi, hops.length - 1)]); }
          if (k > 0.5) {
            const si = Math.floor(((k - 0.5) / 0.5) * (nSteps + 1));
            if (si !== shownStep) { shownStep = si; paintProbe(res, si); }
          }
          if (k >= 1) { S.playing = false; if (hops.length) go(hops[hops.length - 1]); paintProbe(res); lock(false); }
        });
      },
      setParam(key, v) { if (key === 'locked') lock(v); else if (key === 'probe') { opts.probe = v; if (input) input.value = v; } else if (key === 'probeState') { opts.probeState = v; if (stateChoice) stateChoice.set(v); } },
      open(path) { go(path); },
      getState() { return { dir: S.dir, open: S.open, result: S.result, listed: K.children(S.dir) }; },
    };
    paint();
    paintProbe(null);
    lock(opts.locked);
    return api;
  };
})();
