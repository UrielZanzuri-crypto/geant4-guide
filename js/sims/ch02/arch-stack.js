/* PHY.sims.archStack: the track stack. The chapter's schematic event (PHY.ch02.EV1): when the proton
   (track 1) has finished, its three secondaries get IDs 2 (n), 3 (γ), 4 (nucleus) in creation order and are
   pushed on the stack. Geant4 then pops the top: last in, first out. The gamma's electron is pushed when
   the gamma has finished and gets ID 5. Transport order 1, 4, 3, 5, 2.
   The canvas: on the left the stack as a pile of cards (bottom first), above it the slot of the track
   being transported; on the right the event tree, nodes filled when their track is done.
   Card mode: the sim waits right after the proton's secondaries were pushed (the pile 2, 3, 4 is given in
   the question); play(seconds) runs the rest. After it: "the whole event" from the start, and a toggle
   that replays it with a queue (first in, first out), which Geant4 does not use: the same tracks and steps
   in another order.
   opts: {locked, chapter, section}. getState(): {order, stack, maxStack, nTracks, nSteps, fifo, done}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;
  const CARD_H = 8, CARD_X0 = 3, CARD_X1 = 37, PILE_Y0 = 4;

  PHY.sims.archStack = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 74 }, aspect: 1.25, minHeight: 270, maxHeight: 460 });
    const tw = PHY.tweens();
    const S = { t: 0, ran: false, anim: false, fifo: false };
    let ev, tl, tPre;
    function build() {
      ev = K.transport(K.EV1, S.fifo ? 'fifo' : 'lifo');
      tl = K.timeline(ev, (e) => (e.cb === 'UserSteppingAction' ? 0.12 : e.cb === 'push' || e.cb === 'pop' ? 0.55 : 0.12));
      /* the moment right after the proton's secondaries were pushed */
      const i = ev.seq.findIndex((e) => e.cb === 'push' && e.ids[0] === 2);
      tPre = tl[i].t1;
    }
    build();
    S.t = tPre;

    let R = null, againBtn = null, fifo = null;
    if (controlsEl) {
      R = U.Readouts(controlsEl, [
        { key: 'order', label: 'סדר ההובלה עד עכשיו' },
        { key: 'stack', label: 'מסלולים במחסנית' },
        { key: 'steps', label: 'צעדים באירוע' },
      ]);
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      againBtn = U.Button(row, 'את כל האירוע מההתחלה', () => { api.replay(); mark(); });
      fifo = U.Toggle(row, 'תור (FIFO), לא כמו Geant4', { value: false, onChange: (v) => { S.fifo = v; build(); api.replay(); mark(); } });
    }
    function mark() { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); }
    function orderSoFar(st) { return ev.order.filter((id) => st.started[id] || (st.entry && st.entry.cb === 'pop' && st.entry.id === id)); }
    function paint() {
      if (!R) return;
      const st = K.stateAt(ev, tl, S.t);
      const ord = orderSoFar(st);
      R.set('order', S.ran ? F.ltr(ord.join(', ')) : F.ltr('1, ?'));
      R.set('stack', F.num(st.stack.length, 0));
      R.set('steps', S.ran ? F.num(st.nSteps, 0) : '?');
    }
    function buttons() {
      if (againBtn) againBtn.disabled = opts.locked || S.anim;
      if (fifo) fifo.input.disabled = opts.locked || S.anim;
    }

    function card(y, id, o) {
      const C = PHY.colors, ctx = view.ctx;
      const t = ev.track(id), col = C[K.PART[t.p].color];
      const x0 = view.sx(o.x0 === undefined ? CARD_X0 : o.x0), x1 = view.sx(o.x1 === undefined ? CARD_X1 : o.x1);
      const ya = view.sy(y + CARD_H - 0.8), yb = view.sy(y);
      ctx.save();
      ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
      ctx.fillStyle = o.fill ? col : C.panel; ctx.strokeStyle = col; ctx.lineWidth = o.bold ? 3 : 1.8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0, ya, x1 - x0, yb - ya, 7); else ctx.rect(x0, ya, x1 - x0, yb - ya);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      view.screenText((x0 + x1) / 2, (ya + yb) / 2, id + '  ' + K.PART[t.p].he, { size: 12, weight: 700, color: o.fill ? C.bg : col, alpha: o.alpha });
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      const st = K.stateAt(ev, tl, S.t);
      const e = st.entry;
      /* the pile */
      view.line(CARD_X0 - 1.5, PILE_Y0 - 0.6, CARD_X1 + 1.5, PILE_Y0 - 0.6, { color: 'axis', width: 2 });
      view.text((CARD_X0 + CARD_X1) / 2, PILE_Y0 - 2.6, S.fifo ? 'תור: יוצאים מלמטה' : 'מחסנית: יוצאים מלמעלה', { size: 10.5, weight: 600, color: C.muted });
      let pile = st.stack.slice();
      let falling = null;
      if (e && e.cb === 'push' && st.frac < 1) { pile = e.stack.slice(); falling = new Set(e.ids); }
      pile.forEach(function (id, j) {
        const drop = falling && falling.has(id) ? (1 - st.frac) * 14 : 0;
        card(PILE_Y0 + j * CARD_H + drop, id, { alpha: falling && falling.has(id) ? Math.max(0.2, st.frac) : 1 });
      });
      /* the slot of the track being transported */
      const slotY = PILE_Y0 + 5 * CARD_H + 6;
      view.text((CARD_X0 + CARD_X1) / 2, slotY + CARD_H + 2.2, 'מועבר עכשיו', { size: 10.5, weight: 700, color: C.muted });
      view.poly([{ x: CARD_X0, y: slotY }, { x: CARD_X1, y: slotY }, { x: CARD_X1, y: slotY + CARD_H - 0.8 }, { x: CARD_X0, y: slotY + CARD_H - 0.8 }], { close: true, color: 'gridStrong', width: 1.4, dash: [4, 4] });
      if (e && e.cb === 'pop' && st.frac < 1) {
        const from = S.fifo ? PILE_Y0 : PILE_Y0 + e.stack.length * CARD_H;
        const y = from + (slotY - from) * PHY.ease.inOut(st.frac);
        card(y, e.id, { bold: true });
      } else if (st.current && !st.ended[st.current]) {
        card(slotY, st.current, { bold: true, fill: true });
      }
      if (!S.ran) K.mark(view, view.sx((CARD_X0 + CARD_X1) / 2), view.sy(slotY + CARD_H / 2 - 0.4), '?', 26);
      /* the tree */
      view.line(43, 4, 43, 70, { color: 'grid', width: 1 });
      K.drawTree(view, ev, st, { y0: 62, dy: 21, x0: 45, x1: 99, nodeW: 50, creators: false });
      view.text(71, 71, 'עץ האירוע', { size: 10.5, weight: 700, color: C.muted });
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    function goTo(t0, t1, sec) {
      S.t = t0; S.anim = true; paint(); buttons(); loop.start();
      return tw.run(sec, (k) => { S.t = t0 + (t1 - t0) * k; if (k >= 1) S.anim = false; paint(); buttons(); loop.requestRender(); });
    }

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.anim = false; S.fifo = false; build(); S.t = tPre; paint(); buttons(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true;
        return goTo(tPre, tl.T, seconds || 6).then(() => { opts.locked = false; buttons(); });
      },
      replay(seconds) { tw.clear(); S.ran = true; return goTo(0, tl.T, seconds || 7); },
      setParam(key, v) {
        if (key === 'locked') { opts.locked = v; buttons(); }
        if (key === 'fifo') { S.fifo = !!v; if (fifo) fifo.set(S.fifo); build(); S.t = S.ran ? tl.T : tPre; paint(); }
        loop.requestRender();
      },
      getState() {
        const st = K.stateAt(ev, tl, S.t);
        let maxStack = 0;
        ev.seq.forEach((e) => { maxStack = Math.max(maxStack, e.stack.length); });
        return { order: ev.order.slice(), shownOrder: orderSoFar(st), stack: st.stack.slice(), maxStack, nTracks: ev.tracks.length, nSteps: ev.nSteps, stepsSoFar: st.nSteps, fifo: S.fifo, done: st.done, ids: ev.tracks.map((t) => t.id + K.PART[t.p].sym) };
      },
    };
    paint();
    buttons();
    return api;
  };
})();
