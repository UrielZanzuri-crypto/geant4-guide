/* PHY.sims.macStates: the application states of Geant4 while a macro runs. The canvas draws the state
   machine, PreInit -> Init -> Idle on /run/initialize, Idle -> GeomClosed -> EventProc for every event
   of /run/beamOn and back to Idle at the end of the run, with a token on the current state. Under it the
   macro, one line at a time, each marked accepted or refused; the macro is run by PHY.ch06.execute, so a
   refused line is refused for the real reason (the states an ldns messenger allows) and stops the macro.
   Before play() no line is marked and the token sits on PreInit.
   After the card: tryLine(line, state) for a list of ldns lines, in PreInit or Idle.
   opts: {macro, locked, chapter, section}. getState(): {trace, verdicts, state, stopped, visited}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const U = PHY.ui, K = PHY.ch06, F = PHY.fmt;
  const h = U.h;
  const NODES = {
    PreInit: [13, 46], Init: [45, 46], Idle: [78, 46], GeomClosed: [78, 13], EventProc: [30, 13],
  };
  const TRY = ['/ldns/det/addLayer Pb 10 mm', '/ldns/det/radius 30 mm', '/ldns/mod/length 100 mm', '/ldns/src/Emin 3 MeV', '/ldns/src/halfAngle 20 deg', '/ldns/out/level 1', '/ldns/xs/dump proton Be 1 13 60 output/xs_Be.csv'];

  PHY.sims.macStates = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ macro: '', locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 }, aspect: 1.75, minHeight: 200, maxHeight: 300 });
    const C = PHY.colors;
    const tw = PHY.tweens();
    const S = { state: 'PreInit', visited: { PreInit: true }, trace: [], verdicts: [], ran: false, pos: NODES.PreInit.slice(), events: 0, nEvents: 0, stopped: null, msg: '' };

    const listing = h('ol', { class: 'mac-lines mac-states-lines', dir: 'ltr' });
    const msg = h('div', { class: 'mac-term mac-term-short', dir: 'ltr' });
    if (controlsEl) { controlsEl.appendChild(listing); controlsEl.appendChild(msg); }
    function paintListing(cur) {
      listing.innerHTML = '';
      opts.macro.split('\n').forEach(function (line, i) {
        const v = S.verdicts[i];
        const li = h('li', { class: (i === cur ? 'is-now ' : '') + (v === true ? 'is-done' : v === false ? 'is-bad' : '') }, [h('span', { text: line }), v === undefined ? null : h('span', { class: 'mac-verdict', text: v ? ' ✓' : ' ✗' })]);
        listing.appendChild(li);
      });
    }
    function paintMsg() {
      msg.innerHTML = '';
      if (!S.msg) { msg.appendChild(h('div', { class: 't-note', dir: 'rtl', text: S.ran ? 'כל השורות התקבלו.' : 'כאן תופיע ההודעה של Geant4, אם תהיה.' })); return; }
      S.msg.split('\n').forEach(function (m) { msg.appendChild(h('div', { class: 't-err', text: m || ' ' })); });
    }

    /* free play: one ldns line in a chosen state */
    let tryChoice = null, stChoice = null, tryOut = null, tryBox = null;
    if (controlsEl) {
      const box = h('div', { class: 'mac-try' });
      tryBox = box;
      controlsEl.appendChild(box);
      tryChoice = U.Choice(box, { label: 'שורה לנסות', options: TRY.map((t, i) => ({ value: i, text: '<code dir="ltr">' + K.esc(t.replace(/ output\/xs_Be\.csv$/, ' …')) + '</code>' })), value: 1, onChange() { api.tryNow(); } });
      stChoice = U.Choice(box, { label: 'במצב', options: [{ value: 'PreInit', text: 'PreInit' }, { value: 'Idle', text: 'Idle' }], value: 'Idle', onChange() { api.tryNow(); } });
      tryOut = h('div', { class: 'mac-try-out' });
      box.appendChild(tryOut);
    }
    function lock(on) {
      opts.locked = on;
      if (tryChoice) tryChoice.setEnabled(!on);
      if (stChoice) stChoice.setEnabled(!on);
      if (tryOut) tryOut.hidden = on;
      if (tryBox) tryBox.hidden = on;
    }

    function node(name, active) {
      const p = NODES[name];
      const ctx = view.ctx;
      const w = name.length > 7 ? 26 : 21, hh = 11;
      const x0 = view.sx(p[0] - w / 2), y0 = view.sy(p[1] + hh / 2), pw = view.sx(p[0] + w / 2) - x0, ph = view.sy(p[1] - hh / 2) - y0;
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0, y0, pw, ph, 9); else ctx.rect(x0, y0, pw, ph);
      ctx.fillStyle = active ? C.accent : C.panel;
      ctx.globalAlpha = active ? 0.22 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = active ? 2.6 : 1.5;
      ctx.strokeStyle = active ? C.accent : S.visited[name] ? C.ink : C.muted;
      ctx.stroke();
      ctx.restore();
      view.text(p[0], p[1], name, { size: 12.5, weight: active ? 700 : 600, color: active ? C.ink : S.visited[name] ? C.ink : C.muted });
    }
    function render() {
      view.clear();
      const ar = (x1, y1, x2, y2) => view.arrow(x1, y1, x2, y2, { color: C.muted, width: 1.6 });
      ar(23.5, 46, 36.5, 46);
      view.text(29, 36.5, F.ltr('/run/initialize'), { size: 11, color: C.muted, weight: 600 });
      ar(53.5, 46, 69.5, 46);
      ar(75, 40.3, 75, 18.7);
      view.text(72, 33, F.ltr('↓ /run/beamOn'), { size: 11, color: C.muted, weight: 600, align: 'right' });
      ar(81, 18.7, 81, 40.3);
      view.text(72, 25.5, F.ltr('↑') + ' סוף הריצה', { size: 11, color: C.muted, weight: 600, align: 'right' });
      ar(63.8, 15.2, 43, 15.2);
      ar(43, 10.8, 63.8, 10.8);
      view.text(53.5, 5.5, 'אירוע', { size: 11, color: C.muted, weight: 600 });
      Object.keys(NODES).forEach(function (n) { node(n, n === S.state); });
      if (S.nEvents) view.text(NODES.EventProc[0], NODES.EventProc[1] - 9.5, 'אירוע ' + F.ltr(String(Math.min(S.events, S.nEvents)) + ' / ' + S.nEvents), { size: 11.5, color: C.ink, weight: 600 });
      if (!S.ran) view.screenText(view.w - 10, 16, 'לפני הריצה', { size: 11.5, weight: 600, align: 'right', color: C.muted, pill: true });
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    /* the run as a list of beats: {line, state, verdict} */
    function plan() {
      const ctx = K.execute(opts.macro, { echo: true });
      const beats = [];
      const lines = opts.macro.split('\n');
      let li = -1;
      ctx.entries.forEach(function (e) {
        if (e.line !== li && e.line !== null && e.line !== undefined) { li = e.line; beats.push({ line: li, verdict: true }); }
        if (e.k === 'state') beats.push({ line: li, state: e.s });
        if (e.k === 'err' && /\*\*\*\*\* (Illegal|COMMAND)/.test(e.s)) { beats.push({ line: li, verdict: false, msg: e.s }); }
      });
      /* every event of a short run as a pulse EventProc -> GeomClosed */
      const out = [];
      beats.forEach(function (b) {
        if (b.state === 'EventProc') {
          const r = ctx.runs.find((q) => q.line === b.line);
          const n = r ? Math.min(r.N, 5) : 1;
          for (let k = 0; k < n; k++) { out.push({ line: b.line, state: 'EventProc', ev: k + 1, n }); out.push({ line: b.line, state: 'GeomClosed', ev: k + 1, n }); }
        } else out.push(b);
      });
      return { ctx, beats: out, lines };
    }

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.state = 'PreInit'; S.visited = { PreInit: true }; S.verdicts = []; S.ran = false; S.msg = ''; S.pos = NODES.PreInit.slice(); S.nEvents = 0; paintListing(-1); paintMsg(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const P = plan();
        S.state = 'PreInit'; S.visited = { PreInit: true }; S.verdicts = []; S.ran = true; S.msg = ''; S.pos = NODES.PreInit.slice(); S.nEvents = 0; S.events = 0; S.trace = [];
        S.stopped = P.ctx.stopped;
        paintListing(-1); paintMsg();
        const T = seconds || 9;
        const n = P.beats.length;
        let j = 0, from = S.pos.slice(), to = S.pos.slice(), segStart = 0;
        loop.start();
        return tw.run(T, function (k) {
          const pos = k * n;
          while (j < n && j < pos) {
            const b = P.beats[j++];
            if (b.verdict !== undefined) { S.verdicts[b.line] = b.verdict; if (!b.verdict) S.msg = b.msg; paintMsg(); }
            if (b.state) {
              S.state = b.state; S.visited[b.state] = true; S.trace.push(b.state);
              from = S.pos.slice(); to = NODES[b.state].slice(); segStart = j - 1;
              if (b.n) { S.nEvents = b.n; S.events = b.ev; }
            }
            paintListing(b.line);
          }
          const f = Math.min(1, Math.max(0, pos - segStart));
          S.pos = [from[0] + (to[0] - from[0]) * PHY.ease.inOut(f), from[1] + (to[1] - from[1]) * PHY.ease.inOut(f)];
          if (k >= 1) { S.pos = NODES[S.state].slice(); paintListing(-1); lock(false); if (tryOut) api.tryNow(); }
          loop.requestRender();
        });
      },
      tryLine(line, state) {
        const cmd = K.clean(line);
        const path = cmd.split(' ')[0];
        const def = K.COMMANDS[path];
        return { ok: !!def && def.states.indexOf(state) >= 0, states: def ? def.states.slice() : [] };
      },
      tryNow() {
        if (!tryChoice) return null;
        const line = TRY[tryChoice.value], st = stChoice.value;
        const r = api.tryLine(line, st);
        tryOut.innerHTML = '';
        tryOut.appendChild(h('div', { class: r.ok ? 'mac-try-ok' : 'mac-try-bad', html: (r.ok ? '✓ מתקבלת. ' : '✗ נדחית: Illegal application state. ') + 'המצבים המותרים: <code dir="ltr">' + r.states.join(' ') + '</code>' }));
        if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section);
        return r;
      },
      setParam(key, v) { if (key === 'locked') lock(v); else if (key === 'macro') { opts.macro = v; api.reset(); } },
      getState() { return { trace: S.trace.slice(), verdicts: S.verdicts.slice(), state: S.state, stopped: S.stopped, visited: Object.keys(S.visited), msg: S.msg }; },
    };
    paintListing(-1);
    paintMsg();
    lock(opts.locked);
    return api;
  };
})();
