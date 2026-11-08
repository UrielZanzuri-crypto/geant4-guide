/* PHY.sims.archThreads: multithreading. The master thread builds the geometry and the physics once, hands
   every event its own seeds, and the worker threads (G4WT0, G4WT1, ...) each process whole events: when a
   worker is free it takes the next event. Every track of an event, the primary and its secondaries, is
   transported on the worker that runs that event. Each worker keeps its own sums; at the end of the run
   the master merges them into one result (RunAction::EndOfRunAction, G4AccumulableManager::Merge).
   Toy: an event's duration and whether its proton makes a neutron (probability p, a toy value) come from
   its own seeds only. The neutron, when there is one, is drawn as the green end of the event's block, in
   the same lane.
   mode 'card': 4 workers, 16 events, event 7 outlined; the readouts give each worker's count and the
     merged total, which appears only after the merge at the end.
   mode 'trap': the same 60 events on 10 and on 20 workers (two panels): the same events and the same
     total; the wall time scales the real run (17.6 s on 10 threads, PLAN) by the toy's ratio.
   play(seconds) runs; before it the lanes are empty and the readouts show "?".
   opts: {mode, events, p, seed, locked, chapter, section}.
   getState(): {lanes: [{n, jobs, end, total, perLane}], totals, events, laneOf(e), sameLane, wall}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;
  const REAL = { events: 3e6, wall: 17.6, threads: 10 };

  PHY.sims.archThreads = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'card', p: 0.3, seed: 12345, locked: true }, opts || {});
    const trap = opts.mode === 'trap';
    const nEvents = opts.events || (trap ? 60 : 16);
    const sizes = trap ? [10, 20] : [4];
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: trap ? 122 : 84 }, aspect: trap ? 0.95 : 1.25, minHeight: trap ? 330 : 270, maxHeight: trap ? 560 : 460 });
    const tw = PHY.tweens();
    const S = { t: 0, ran: false, anim: false, merged: 0 };

    /* the master hands out seeds; an event's outcome and duration come from them only */
    const master = PHY.random(opts.seed);
    const own = [];
    for (let i = 0; i < nEvents; i++) {
      const r = PHY.random(master.int(1, 99999999) * 31 + master.int(1, 99999999));
      own.push({ dur: 0.6 + r.next(), hit: r.next() < opts.p });
    }
    function schedule(n) {
      const free = new Array(n).fill(0), jobs = [];
      for (let e = 0; e < nEvents; e++) {
        let lane = 0;
        for (let i = 1; i < n; i++) if (free[i] < free[lane] - 1e-12) lane = i;
        jobs.push({ e, lane, start: free[lane], end: free[lane] + own[e].dur, hit: own[e].hit });
        free[lane] += own[e].dur;
      }
      const perLane = new Array(n).fill(0);
      jobs.forEach((j) => { if (j.hit) perLane[j.lane]++; });
      return { n, jobs, end: Math.max.apply(null, free), perLane, total: perLane.reduce((a, b) => a + b, 0) };
    }
    const lanes = sizes.map(schedule);
    const T = Math.max.apply(null, lanes.map((l) => l.end));

    let R = null, again = null;
    if (controlsEl) {
      const t10 = F.ltr('-t\u00A010'), t20 = F.ltr('-t\u00A020');
      R = U.Readouts(controlsEl, trap
        ? [{ key: 'ev10', label: 'אירועים, ' + t10 }, { key: 'ev20', label: 'אירועים, ' + t20 }, { key: 'w10', label: 'זמן שעון, ' + t10 }, { key: 'w20', label: 'זמן שעון, ' + t20 }]
        : [{ key: 'lanes', label: 'נייטרונים בכל הליך, WT0 עד WT3', color: 'var(--c-neutron)' }, { key: 'tot', label: 'אחרי המיזוג (master)', color: 'var(--c-neutron)' }, { key: 'e7', label: 'אירוע 7 רץ על' }]);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      again = U.Button(row, 'להריץ שוב', () => { api.play(trap ? 5 : 5.5); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); });
    }
    const doneJobs = (L) => L.jobs.filter((j) => j.end <= S.t + 1e-9);
    const fin = () => S.ran && S.t >= T - 1e-9;
    function paint() {
      if (!R) return;
      if (trap) {
        const a = lanes[0], b = lanes[1];
        R.set('ev10', S.ran ? F.num(doneJobs(a).length, 0) : '?');
        R.set('ev20', S.ran ? F.num(doneJobs(b).length, 0) : '?');
        R.set('w10', fin() ? F.unit(REAL.wall, 's', 1) : '?');
        R.set('w20', fin() ? F.ltr('≈ ' + F.num(REAL.wall * b.end / a.end, 1) + ' s') : '?');
      } else {
        const L = lanes[0];
        const per = new Array(L.n).fill(0);
        doneJobs(L).forEach((j) => { if (j.hit) per[j.lane]++; });
        R.set('lanes', S.ran ? F.ltr(per.join(', ')) : '?');
        R.set('tot', S.merged >= 1 ? F.num(L.total, 0) : '?');
        const j7 = L.jobs[7];
        R.set('e7', S.ran && j7.start <= S.t ? 'G4WT' + j7.lane : '?');
      }
    }
    function buttons() { if (again) again.disabled = opts.locked || S.anim; }

    function panel(L, y0, y1, title) {
      const C = PHY.colors, ctx = view.ctx, x0 = 15, x1 = 97;
      const h = (y1 - y0) / L.n;
      view.text(1.5, y1 + 3.2, title, { size: 11.5, weight: 700, color: C.ink, align: 'left' });
      const sx = (t) => x0 + ((x1 - x0) * t) / T;
      for (let i = 0; i < L.n; i++) {
        const ya = y1 - (i + 1) * h, yb = y1 - i * h;
        if (L.n <= 10 || i % 2 === 0) view.text(1.5, (ya + yb) / 2, 'WT' + i, { size: L.n > 10 ? 8.5 : 10, color: C.muted, align: 'left' });
        view.line(x0, ya, x1, ya, { color: 'grid', width: 1 });
      }
      L.jobs.forEach(function (j) {
        if (!S.ran || j.start > S.t) return;
        const end = Math.min(j.end, S.t);
        const ya = y1 - (j.lane + 1) * h + h * 0.13, yb = y1 - j.lane * h - h * 0.13;
        const px0 = view.sx(sx(j.start)) + 1, px1 = view.sx(sx(end)) - 1;
        const py0 = view.sy(yb), ph = view.sy(ya) - view.sy(yb);
        ctx.save();
        ctx.fillStyle = C.proton; ctx.globalAlpha = j.end <= S.t ? 0.22 : 0.45;
        ctx.fillRect(px0, py0, Math.max(1, px1 - px0), ph);
        if (j.hit) {
          /* the neutron of this event: the last part of the block, on the same worker */
          const nStart = j.start + 0.7 * (j.end - j.start);
          if (S.t > nStart) {
            const qa = view.sx(sx(nStart)), qb = view.sx(sx(Math.min(j.end, S.t))) - 1;
            ctx.fillStyle = C.neutron; ctx.globalAlpha = 0.85;
            ctx.fillRect(qa, py0, Math.max(1, qb - qa), ph);
          }
        }
        ctx.restore();
        if (!trap && j.e === 7) {
          ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5;
          ctx.strokeRect(px0 - 1, py0 - 1, Math.max(2, px1 - px0) + 2, ph + 2); ctx.restore();
        }
        if (!trap && px1 - px0 > 14) view.screenText((px0 + px1) / 2, py0 + ph / 2, String(j.e), { size: 10, weight: 700, color: C.ink });
      });
      if (S.ran) {
        const n = doneJobs(L).filter((j) => j.hit).length;
        view.text(97, y1 + 3.2, 'נייטרונים: ' + n, { size: 11.5, weight: 700, color: C.neutron, align: 'right' });
      }
    }

    function render() {
      view.clear();
      const C = PHY.colors;
      if (trap) {
        panel(lanes[0], 60, 102, '-t 10');
        panel(lanes[1], 6, 48, '-t 20');
        K.clock(view, 'צעצוע: 60 אירועים');
        if (!S.ran) K.mark(view, view.sx(56), view.sy(54));
        return;
      }
      const L = lanes[0];
      panel(L, 8, 58, 'הליכי העבודה (workers)');
      /* the master on top */
      const my = 72;
      view.poly([{ x: 15, y: my - 4.5 }, { x: 97, y: my - 4.5 }, { x: 97, y: my + 4.5 }, { x: 15, y: my + 4.5 }], { close: true, color: 'ink', width: 1.6 });
      view.text(1.5, my, 'master', { size: 10.5, weight: 700, color: C.ink, align: 'left' });
      view.text(56, my, S.merged >= 1 ? 'מוזג: ' + L.total + ' נייטרונים' : S.ran ? 'זרעים לכל אירוע, ואחר כך מיזוג' : 'זרעים לכל אירוע', { size: 11, weight: 700, color: S.merged >= 1 ? C.neutron : C.muted });
      if (S.merged > 0 && S.merged < 1) {
        /* every worker's count flies up to the master */
        for (let i = 0; i < L.n; i++) {
          const h = 50 / L.n, y = 58 - (i + 0.5) * h;
          const yy = y + (my - y) * PHY.ease.inOut(S.merged);
          view.circle(92, yy, 5, { px: true, fill: C.neutron });
        }
      }
      K.clock(view, 'צעצוע: 16 אירועים');
      if (!S.ran) K.mark(view, view.sx(56), view.sy(33));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.t = 0; S.ran = false; S.anim = false; S.merged = 0; paint(); buttons(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.t = 0; S.merged = 0; S.anim = true;
        paint(); buttons(); loop.start();
        const sec = seconds || 5;
        const runT = trap ? sec : sec * 0.8;
        let p = tw.run(runT, (k) => { S.t = T * k; paint(); loop.requestRender(); });
        if (!trap) p = p.then(() => tw.run(sec * 0.2, (k) => { S.merged = k; paint(); loop.requestRender(); }));
        return p.then(() => { S.anim = false; opts.locked = false; paint(); buttons(); });
      },
      setParam(key, v) { if (key === 'locked') { opts.locked = v; buttons(); } loop.requestRender(); },
      getState() {
        return {
          lanes: lanes.map((L) => ({ n: L.n, end: L.end, total: L.total, perLane: L.perLane.slice(), events: L.jobs.length, laneOf: L.jobs.map((j) => j.lane), hits: L.jobs.map((j) => j.hit) })),
          totals: lanes.map((L) => L.total), events: nEvents, wall: lanes.map((L) => REAL.wall * L.end / lanes[0].end), ran: S.ran, merged: S.merged,
        };
      },
    };
    paint();
    buttons();
    return api;
  };
})();
