/* PHY.sims.macTerminal: a macro, a mock terminal and the files it writes. DOM-only: the first argument is
   a host <div>. The macro is run by PHY.ch06.execute (the command tree, the states, the parameter checks
   and the lines ldns prints) and the terminal reveals the transcript line by line, with the current macro
   line highlighted, the application state in a pill and every new file in output/ listed.
   mode 'list': a numbered, read-only macro. mode 'edit': a textarea, with every problem listed under it
   as we type (execute with lint), and a run button (the playground).
   Before the first run the terminal and the file list are empty, so a card does not answer itself.
   opts: {macro, mode, cwd, fs, variants: [{value, text, macro}], locked, chapter, section, onRun(ctx)}.
   play(seconds) runs the macro (the reveal is spread over the given time), runNow() reveals at once.
   getState(): {ctx, shown, state, files, stopped, issues, macro}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const U = PHY.ui, K = PHY.ch06;
  const h = U.h;
  const W = { cmd: 0.2, out: 0.035, err: 0.25, note: 0.15, state: 0.25, file: 0.2, beat: 0.6 };

  PHY.sims.macTerminal = function (host, controlsEl, opts) {
    opts = Object.assign({ macro: K.MACROS.be2, mode: 'list', cwd: 'neutrons', fs: {}, locked: true, showFiles: true }, opts || {});
    host.classList.add('mac');
    host.setAttribute('data-no-iso', '');
    host.setAttribute('dir', 'rtl');

    const pill = h('span', { class: 'mac-pill', dir: 'ltr', text: 'PreInit' });
    const cwd = h('span', { class: 'mac-cwd', dir: 'ltr', text: 'cwd: ' + K.CWD[opts.cwd].name });
    host.appendChild(h('div', { class: 'mac-head' }, [h('span', { class: 'mac-label', text: 'מצב:' }), pill, cwd]));

    let listing = null, area = null, issuesEl = null;
    if (opts.mode === 'edit') {
      area = h('textarea', { class: 'mac-edit', dir: 'ltr', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'המאקרו' });
      area.value = opts.macro;
      area.rows = Math.min(20, opts.macro.split('\n').length + 1);
      area.addEventListener('input', function () { lint(); touch(); });
      host.appendChild(area);
      issuesEl = h('ul', { class: 'mac-issues' });
      host.appendChild(issuesEl);
    } else {
      listing = h('ol', { class: 'mac-lines', dir: 'ltr' });
      host.appendChild(listing);
    }
    const term = h('div', { class: 'mac-term', dir: 'ltr', role: 'log', 'aria-live': 'off' });
    host.appendChild(term);
    const filesList = h('div', { class: 'mac-files-list' });
    const filesBox = h('div', { class: 'mac-files', dir: 'ltr' }, [h('span', { class: 'mac-files-head', text: 'new files:' }), filesList]);
    if (opts.showFiles) host.appendChild(filesBox);

    const S = { ctx: null, shown: 0, state: 'PreInit', files: [], ran: false, playing: false };

    function macroText() { return area ? area.value : opts.macro; }
    function paintListing() {
      if (!listing) return;
      listing.innerHTML = '';
      macroText().split('\n').forEach(function (line) {
        listing.appendChild(h('li', { class: /^\s*#/.test(line) ? 'is-comment' : '', text: line || ' ' }));
      });
    }
    function placeholder() {
      term.innerHTML = '';
      term.appendChild(h('div', { class: 't-note', dir: 'rtl', text: 'המסוף ריק. הוא יתמלא כשנריץ.' }));
      filesList.innerHTML = '';
      filesList.appendChild(h('span', { class: 'mac-file is-none', text: '(none yet)' }));
      pill.textContent = 'PreInit';
      pill.className = 'mac-pill';
      if (listing) listing.querySelectorAll('li').forEach(function (li) { li.classList.remove('is-now', 'is-bad', 'is-done'); });
    }
    function lint() {
      if (!issuesEl) return;
      const c = K.execute(macroText(), { cwd: opts.cwd, fs: opts.fs, lint: true });
      issuesEl.innerHTML = '';
      if (!c.issues.length) issuesEl.appendChild(h('li', { class: 'is-ok', html: 'אין בעיות שהבודק מכיר. אפשר להריץ.' }));
      c.issues.forEach(function (it) { issuesEl.appendChild(h('li', { class: 'is-' + it.level, html: it.html })); });
      U.renderMath(issuesEl);
      return c;
    }
    function touch() { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }

    function showEntry(e) {
      if (e.k === 'state') {
        S.state = e.s;
        pill.textContent = e.s;
        pill.className = 'mac-pill is-' + e.s;
        return;
      }
      if (listing && e.line !== null && e.line !== undefined) {
        const rows = listing.children;
        for (let i = 0; i < rows.length; i++) {
          rows[i].classList.toggle('is-now', i === e.line);
          if (i < e.line) rows[i].classList.add('is-done');
        }
        if (e.k === 'err' && rows[e.line]) rows[e.line].classList.add('is-bad');
      }
      if (e.k === 'file') {
        if (S.files.length === 0) filesList.innerHTML = '';
        if (S.files.indexOf(e.s) >= 0) {
          Array.prototype.forEach.call(filesList.children, function (x) { if (x.dataset.name === e.s) { x.textContent = e.s + ' (overwritten)'; x.classList.add('is-over'); } });
          return;
        }
        S.files.push(e.s);
        filesList.appendChild(h('span', { class: 'mac-file is-new', 'data-name': e.s, text: e.s }));
        return;
      }
      if (e.k === 'beat') return;
      const cls = { cmd: 't-cmd', out: 't-out', err: 't-err', note: 't-note' }[e.k];
      const el = e.k === 'note' ? h('div', { class: cls, dir: 'rtl', text: e.s }) : h('div', { class: cls, text: e.s || ' ' });
      term.appendChild(el);
      term.scrollTop = term.scrollHeight;
    }
    function reveal(n) {
      const E = S.ctx.entries;
      while (S.shown < Math.min(n, E.length)) showEntry(E[S.shown++]);
    }
    function begin() {
      S.ctx = K.execute(macroText(), { cwd: opts.cwd, fs: opts.fs });
      S.shown = 0; S.files = []; S.state = 'PreInit'; S.ran = true;
      term.innerHTML = '';
      filesList.innerHTML = '';
      filesList.appendChild(h('span', { class: 'mac-file is-none', text: '(none yet)' }));
      pill.textContent = 'PreInit'; pill.className = 'mac-pill';
      if (listing) { paintListing(); }
    }
    function end() {
      reveal(Infinity);
      if (listing && S.ctx.stopped === null) Array.prototype.forEach.call(listing.children, function (li) { li.classList.remove('is-now'); li.classList.add('is-done'); });
      if (!S.files.length) filesList.innerHTML = '<span class="mac-file is-none">(none)</span>';
      if (opts.onRun) opts.onRun(S.ctx);
    }

    /* controls: a run button and, after a card, a choice of variants */
    let runBtn = null, choice = null;
    if (controlsEl) {
      const row = h('div', { class: 'sim-row' });
      if (opts.variants) {
        choice = U.Choice(controlsEl, { label: opts.variantsLabel || 'מאקרו להרצה', options: opts.variants.map((v) => ({ value: v.value, text: v.text })), value: opts.variants[0].value, onChange(v) { const x = opts.variants.find((q) => q.value === v); opts.macro = x.macro; paintListing(); placeholder(); touch(); } });
      }
      controlsEl.appendChild(row);
      runBtn = U.Button(row, opts.mode === 'edit' ? 'להריץ' : 'להריץ את המאקרו', function () { touch(); api.play(); }, { primary: opts.mode === 'edit' });
      if (opts.mode === 'edit') U.Button(row, 'לחזור למאקרו המקורי', function () { area.value = opts.original || opts.macro; area.rows = Math.min(20, area.value.split('\n').length + 1); lint(); placeholder(); touch(); }, {});
    }
    function lock(on) {
      opts.locked = on;
      if (runBtn) runBtn.disabled = on;
      if (choice) choice.setEnabled(!on);
    }

    const tw = PHY.tweens();
    const loop = PHY.SimLoop({ canvas: host, step: (dt) => tw.step(dt), render() {} });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; placeholder(); },
      play(seconds) {
        tw.clear();
        begin();
        const E = S.ctx.entries;
        const cum = [];
        let tot = 0;
        E.forEach(function (e) { tot += e.w !== undefined ? e.w : W[e.k]; cum.push(tot); });
        const T = seconds || Math.min(14, Math.max(2, tot));
        S.playing = true;
        if (runBtn) runBtn.disabled = true;
        loop.start();
        let j = 0;
        return tw.run(T, function (k) {
          const lim = k * tot;
          while (j < E.length && cum[j] <= lim + 1e-9) j++;
          reveal(j);
          if (k >= 1) { S.playing = false; end(); lock(false); }
        });
      },
      runNow() { tw.clear(); begin(); end(); return S.ctx; },
      setMacro(text) {
        opts.macro = text;
        if (area) { area.value = text; lint(); }
        paintListing();
        placeholder();
      },
      setParam(key, v) {
        if (key === 'locked') lock(v);
        else if (key === 'macro') api.setMacro(v);
        else if (key === 'variant' && opts.variants) { const x = opts.variants.find((q) => q.value === v); if (x) { if (choice) choice.set(v); api.setMacro(x.macro); } }
      },
      lint,
      getState() {
        return { ctx: S.ctx, shown: S.shown, state: S.state, files: S.files.slice(), stopped: S.ctx ? S.ctx.stopped : null, issues: S.ctx ? S.ctx.issues.slice() : [], macro: macroText(), ran: S.ran, terminalText: term.textContent };
      },
    };
    opts.original = opts.original || opts.macro;
    paintListing();
    placeholder();
    lint();
    lock(opts.locked);
    return api;
  };
})();
