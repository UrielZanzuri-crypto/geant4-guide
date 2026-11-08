/* PHY.sims.archTimeline: who calls whom. A run of two schematic events: event 0 is the chapter's event
   (PHY.ch02.EV1), whose neutron leaves the converter; event 1 is a proton that stops without a reaction.
   Geant4 calls the user actions in a fixed order: BeginOfRunAction, then for every event
   GeneratePrimaries, BeginOfEventAction, for every track PreUserTrackingAction, one UserSteppingAction per
   step, PostUserTrackingAction, then EndOfEventAction; EndOfRunAction at the end. Each row lights when it
   is called and counts its calls; next to it, the ldns class that answers it (ldns has no tracking action).
   The ldns bookkeeping of the leak tally runs along: BeginOfEventAction resets the event sum fLeak,
   SteppingAction adds the weight of a neutron leaving the converter, EndOfEventAction hands the event sum
   to the run (RunAction::AddEvent).
   play(seconds) plays the run; before it the counters, the readouts and the ldns column show "?".
   opts: {locked, chapter, section}. getState(): {calls, fLeak, runSum, sums (fLeak at each EndOfEvent),
   resetAt (callback names where fLeak went to 0), done, nSteps}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;

  const ROWS = [
    { cb: 'BeginOfRunAction', cls: 'RunAction', what: 'פותח את קובץ הפלט ומאפס את סכומי הריצה' },
    { cb: 'GeneratePrimaries', cls: 'PrimaryGeneratorAction', what: 'מגריל אנרגיה, כיוון ומשקל לפרוטון' },
    { cb: 'BeginOfEventAction', cls: 'EventAction', what: 'מאפס את הסכומים של האירוע' },
    { cb: 'PreUserTrackingAction', cls: 'אין ב-ldns', what: 'שום דבר: ל-ldns אין פעולת מסלול' },
    { cb: 'UserSteppingAction', cls: 'SteppingAction', what: 'בודק את הצעד; נייטרון שיוצא נכנס לסכום' },
    { cb: 'PostUserTrackingAction', cls: 'אין ב-ldns', what: 'שום דבר: ל-ldns אין פעולת מסלול' },
    { cb: 'EndOfEventAction', cls: 'EventAction', what: 'מעביר את סכום האירוע לריצה' },
    { cb: 'EndOfRunAction', cls: 'RunAction', what: 'ממזג, כותב את הקובץ ומדפיס סיכום' },
  ];
  const EV2 = {
    p: 'proton',
    pts: [{ x: -9, y: -2 }, { x: 0, y: -2 }, { x: 1.8, y: -2.2 }, { x: 3.5, y: -1.8 }, { x: 5.1, y: -2.3 }, { x: 6.5, y: -1.9 }, { x: 7.7, y: -2.4 }, { x: 8.6, y: -2.1 }, { x: 9.2, y: -2.5 }],
    procs: ['Transportation', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni', 'hIoni'],
    E: [5.2, 5.2, 4.6, 4.0, 3.3, 2.6, 1.8, 1.0],
  };
  const ROW_H = 4.4, ROW_Y0 = -18.6;

  PHY.sims.archTimeline = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const yMin = ROW_Y0 - ROWS.length * ROW_H - 0.6;
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -10.5, xMax: 46.5, yMin, yMax: 15.5 }, aspect: 57 / (15.5 - yMin), minHeight: 330, maxHeight: 600 });
    const tw = PHY.tweens();
    const dur = (e) => (e.cb === 'UserSteppingAction' ? 0.13 : e.cb === 'push' || e.cb === 'pop' ? 0.14 : 0.24);
    const evs = [K.transport(K.EV1), K.transport(EV2)];
    const tls = evs.map((e) => K.timeline(e, dur));
    const D_RUN = 0.4;
    const T0 = [D_RUN, D_RUN + tls[0].T];
    const T = D_RUN + tls[0].T + tls[1].T + D_RUN;
    const S = { t: 0, ran: false, anim: false };

    /* Neutron leaving the converter: track 2 of event 0, its step 1 (out of the Be layer). */
    const LEAK = { ev: 0, id: 2, step: 1 };

    function state(t) {
      const q = { calls: {}, cb: null, ev: -1, local: null, fLeak: 0, runSum: 0, sums: [], resetAt: [], nSteps: 0, done: t >= T - 1e-9 };
      K.USER.forEach((c) => { q.calls[c] = 0; });
      if (t <= 0) return q;
      q.calls.BeginOfRunAction = 1; q.cb = 'BeginOfRunAction';
      for (let k = 0; k < 2; k++) {
        const lt = t - T0[k];
        if (lt < 0) break;
        const st = K.stateAt(evs[k], tls[k], Math.min(lt, tls[k].T));
        q.ev = k; q.local = st;
        K.USER.forEach((c) => { q.calls[c] += st.calls[c] || 0; });
        q.nSteps += st.nSteps;
        if (st.entry && K.isUser(st.entry.cb)) q.cb = st.entry.cb;
        else if (st.entry) q.cb = null;
        if (st.calls.BeginOfEventAction) { q.fLeak = 0; q.resetAt.push('BeginOfEventAction'); }
        if (k === LEAK.ev && (st.shown[LEAK.id] || 0) > LEAK.step) q.fLeak += K.EV1_WEIGHT;
        if (st.calls.EndOfEventAction) { q.sums.push(q.fLeak); q.runSum += q.fLeak; }
      }
      if (t >= T - D_RUN) { q.calls.EndOfRunAction = 1; q.cb = 'EndOfRunAction'; q.ev = 1; }
      return q;
    }

    let R = null, againBtn = null, nowEl = null;
    if (controlsEl) {
      nowEl = U.h('div', { class: 'g4now' }, [U.h('span', { class: 'g4now-k', text: 'מה ldns עושה עכשיו: ' }), U.h('span', { class: 'g4now-v', text: '?' })]);
      controlsEl.appendChild(nowEl);
      R = U.Readouts(controlsEl, [
        { key: 'leak', label: 'fLeak, הסכום של האירוע', color: 'var(--c-neutron)' },
        { key: 'run', label: 'הסכום של הריצה', color: 'var(--c-neutron)' },
      ]);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      againBtn = U.Button(row, 'להריץ את הריצה שוב', () => { api.play(8); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); });
    }
    function paint() {
      if (!R) return;
      const q = state(S.t);
      const row = ROWS.find((r) => r.cb === q.cb);
      const v = nowEl.querySelector('.g4now-v'), txt = !S.ran ? '?' : row ? row.what : '–';
      if (v.textContent !== txt) v.textContent = txt;
      R.set('leak', !S.ran ? '?' : F.num(q.fLeak, 2));
      R.set('run', !S.ran ? '?' : F.num(q.runSum, 2));
    }
    function buttons() { if (againBtn) againBtn.disabled = opts.locked || S.anim; }

    function render() {
      view.clear();
      const C = PHY.colors, ctx = view.ctx;
      const q = state(S.t);
      K.drawFrame(view);
      K.clock(view, S.ran && q.ev >= 0 ? 'אירוע ' + q.ev + ' מתוך 2' : 'סכמטי');
      if (S.ran && q.local) K.drawTracks(view, evs[q.ev], q.local, { highlight: true });
      /* rows */
      const x0 = -9.5, x1 = 45.5;
      ROWS.forEach(function (r, i) {
        const yc = ROW_Y0 - (i + 0.5) * ROW_H;
        const on = S.ran && q.cb === r.cb;
        if (on) {
          ctx.save(); ctx.fillStyle = C.accent; ctx.globalAlpha = 0.16;
          const y = view.sy(yc + ROW_H / 2 - 0.25), h = (ROW_H - 0.5) * view.scale;
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(view.sx(x0), y, (x1 - x0) * view.scale, h, 6); ctx.fill(); } else ctx.fillRect(view.sx(x0), y, (x1 - x0) * view.scale, h);
          ctx.restore();
        }
        const indent = r.cb === 'UserSteppingAction' ? 3.6 : /Tracking/.test(r.cb) ? 2.4 : /Run/.test(r.cb) ? 0.3 : 1.3;
        view.text(x0 + indent, yc, r.cb, { size: 11, weight: on ? 800 : 600, color: on ? C.accent : C.ink, align: 'left' });
        view.text(x1 - 4.2, yc, r.cls, { size: 9.5, weight: 600, color: C.muted, align: 'right' });
        const n = S.ran ? F.num(q.calls[r.cb], 0) : '?';
        view.text(x1 - 0.3, yc, n, { size: 12, weight: 800, color: on ? C.accent : C.ink, align: 'right' });
        view.line(x0, yc - ROW_H / 2, x1, yc - ROW_H / 2, { color: 'grid', width: 1 });
      });
      view.text(x0, ROW_Y0 + 1.2, 'הקריאות של Geant4', { size: 11, weight: 700, color: C.muted, align: 'left' });
      view.text(x1 - 0.3, ROW_Y0 + 1.2, 'כמה פעמים', { size: 10, weight: 600, color: C.muted, align: 'right' });
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.t = 0; S.ran = false; S.anim = false; paint(); buttons(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.t = 0; S.anim = true;
        paint(); buttons(); loop.start();
        return tw.run(seconds || 8, (k) => { S.t = T * k; if (k >= 1) S.anim = false; paint(); buttons(); loop.requestRender(); })
          .then(() => { opts.locked = false; buttons(); });
      },
      setParam(key, v) { if (key === 'locked') { opts.locked = v; buttons(); } loop.requestRender(); },
      getState() {
        const q = state(S.t);
        return { t: S.t, T, calls: q.calls, fLeak: q.fLeak, runSum: q.runSum, sums: q.sums.slice(), resetAt: q.resetAt.slice(), done: q.done, nSteps: q.nSteps, cb: q.cb, tracks: evs.map((e) => e.tracks.length), steps: evs.map((e) => e.nSteps) };
      },
      /* the state at an arbitrary time, for tests */
      stateAt(t) { return state(t); },
      get T() { return T; },
    };
    paint();
    buttons();
    return api;
  };
})();
