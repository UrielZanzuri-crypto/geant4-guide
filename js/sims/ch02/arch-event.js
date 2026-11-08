/* PHY.sims.archEvent: the four nested objects G4Run ⊃ G4Event ⊃ G4Track ⊃ G4Step, live, on the chapter's
   schematic event (PHY.ch02.EV1): a proton enters Be, slows down and its last step (protonInelastic) creates
   a neutron, a gamma and the residual nucleus; the gamma's Compton scattering creates an electron.
   The canvas draws the event (the step being made is highlighted: its pre-step point and the moving head)
   and the tree below it; the nested boxes under the canvas show what each object holds at that moment:
   the run and event numbers, the track (ID, parent ID, creator process, weight) and the step (its number
   in the track, the process that limits it, the kinetic energy at the pre-step point).
   play(seconds) plays the whole event; before it everything shows "?". After it: "again" and "one step".
   opts: {locked, chapter, section}. getState(): {t, T, current, nSteps, born: [...ids], parents, creators, done}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;

  PHY.sims.archEvent = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -10.5, xMax: 46.5, yMin: -39, yMax: 15.5 }, aspect: 1.02, minHeight: 300, maxHeight: 540 });
    const tw = PHY.tweens();
    const ev = K.transport(K.EV1, 'lifo');
    const tl = K.timeline(ev);
    const S = { t: 0, ran: false, anim: false };

    /* ---------- the nested boxes ---------- */
    let V = null, againBtn = null, stepBtn = null;
    if (controlsEl) {
      V = {};
      const box = (cls, title, items, child) => {
        const vals = U.h('div', { class: 'g4nest-vals' });
        items.forEach(function (it) {
          const v = U.h('span', { class: 'g4nest-v', dir: 'ltr', text: '?' });
          V[it[0]] = v;
          vals.appendChild(U.h('span', { class: 'g4nest-kv' }, [U.h('span', { class: 'g4nest-k', text: it[1] }), v]));
        });
        return U.h('div', { class: 'g4nest ' + cls }, [U.h('div', { class: 'g4nest-title', dir: 'ltr', text: title }), vals, child || null]);
      };
      const step = box('g4nest-step', 'G4Step', [['sNum', 'צעד במסלול'], ['sProc', 'התהליך שקבע אותו'], ['sE', 'אנרגיה בתחילת הצעד, MeV']]);
      const track = box('g4nest-track', 'G4Track', [['tId', 'מספר (track ID)'], ['tPar', 'הורה (parent ID)'], ['tCre', 'נוצר בתהליך'], ['tW', 'משקל']], step);
      const event = box('g4nest-event', 'G4Event', [['eId', 'מספר האירוע'], ['eTr', 'מסלולים שנוצרו'], ['eSt', 'צעדים עד עכשיו']], track);
      const run = box('g4nest-run', 'G4Run', [['rId', 'מספר הריצה'], ['rEv', 'אירועים שהסתיימו']], event);
      controlsEl.appendChild(run);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      againBtn = U.Button(row, 'להריץ את האירוע שוב', () => { api.play(7); mark(); });
      stepBtn = U.Button(row, 'צעד אחד קדימה', () => { api.next(); mark(); });
    }
    function mark() { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }

    function paint() {
      if (!V) return;
      const st = K.stateAt(ev, tl, S.t);
      const q = (v) => (S.ran ? v : '?');
      V.rId.textContent = q('0');
      V.rEv.textContent = q(st.done ? '1' : '0');
      V.eId.textContent = q('0');
      V.eTr.textContent = q(String(Object.keys(st.born).length));
      V.eSt.textContent = q(String(st.nSteps));
      const t = st.current ? ev.track(st.current) : null;
      V.tId.textContent = q(t ? t.id + ' (' + K.PART[t.p].sym + ')' : '–');
      V.tPar.textContent = q(t ? String(t.parent) : '–');
      V.tCre.textContent = q(t ? t.creator || 'primary' : '–');
      V.tW.textContent = q(t ? F.num(K.EV1_WEIGHT, 2) : '–');
      const e = st.entry && st.entry.cb === 'UserSteppingAction' ? st.entry : null;
      V.sNum.textContent = q(e ? String(e.step + 1) : '–');
      V.sProc.textContent = q(e ? e.proc : '–');
      V.sE.textContent = q(e ? F.num(ev.track(e.id).spec.E[e.step], 2) : '–');
    }
    function buttons() {
      const busy = S.anim;
      if (againBtn) againBtn.disabled = opts.locked || busy;
      if (stepBtn) stepBtn.disabled = opts.locked || busy;
    }

    function render() {
      view.clear();
      const st = K.stateAt(ev, tl, S.t);
      K.drawFrame(view);
      K.clock(view, 'סכמטי');
      if (!S.ran) {
        view.circle(-9, 1, 6, { px: true, fill: PHY.colors.proton });
        view.arrow(-9, 1, -3.5, 1, { color: 'proton', width: 2.4 });
        view.text(-8.5, 3.6, F.unit(6.3, 'MeV', 1), { size: 11, weight: 700, color: PHY.colors.proton, align: 'left' });
      } else {
        K.drawTracks(view, ev, st, { highlight: true });
      }
      view.line(-9.5, -15.2, 45.5, -15.2, { color: 'grid', width: 1 });
      view.text(-9.5, -16.6, 'עץ האירוע', { size: 11, weight: 700, color: PHY.colors.muted, align: 'left' });
      if (!S.ran) { K.mark(view, view.sx(18), view.sy(-27)); return; }
      K.drawTree(view, ev, st, { y0: -20.5, dy: 8 });
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    function goTo(t1, sec) {
      const t0 = S.t;
      S.anim = true;
      return tw.run(sec, (k) => { S.t = t0 + (t1 - t0) * k; if (k >= 1) S.anim = false; paint(); buttons(); loop.requestRender(); });
    }

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.t = 0; S.ran = false; S.anim = false; paint(); buttons(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.t = 0;
        paint(); buttons(); loop.start();
        return goTo(tl.T, seconds || 7).then(() => { opts.locked = false; buttons(); });
      },
      /* to the end of the next step (from the start when the event is over) */
      next() {
        if (!S.ran || S.t >= tl.T - 1e-9) { S.ran = true; S.t = 0; }
        let i = ev.seq.findIndex((e, j) => e.cb === 'UserSteppingAction' && tl[j].t1 > S.t + 1e-9);
        const t1 = i < 0 ? tl.T : tl[i].t1;
        buttons(); loop.start();
        return goTo(t1, Math.max(0.25, Math.min(1.2, (t1 - S.t) * 0.7)));
      },
      setParam(key, v) { if (key === 'locked') { opts.locked = v; buttons(); } loop.requestRender(); },
      getState() {
        const st = K.stateAt(ev, tl, S.t);
        return {
          t: S.t, T: tl.T, current: st.current, nSteps: st.nSteps, done: st.done, ran: S.ran,
          born: Object.keys(st.born).map(Number), order: ev.order.slice(),
          parents: ev.tracks.map((t) => t.parent), creators: ev.tracks.map((t) => t.creator), particles: ev.tracks.map((t) => t.p),
          entry: st.entry ? { cb: st.entry.cb, id: st.entry.id, step: st.entry.step, proc: st.entry.proc } : null,
        };
      },
    };
    paint();
    buttons();
    return api;
  };
})();
