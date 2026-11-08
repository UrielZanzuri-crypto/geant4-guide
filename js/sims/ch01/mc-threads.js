/* PHY.sims.mcThreads: a fixed seed and the number of threads. The master generator, seeded with opts.seed
   (as -s does), hands every event its own pair of seeds before the run. An event's outcome (in this toy:
   whether it makes a neutron, probability p) and its duration are drawn from its own seeds only, so it does
   not matter which thread runs it. The same 24 events are run on 4 and on 8 threads (each free thread takes
   the next event), drawn as lanes: the totals are equal, only the order in which events finish differs.
   perEvent = false (a toggle after the reveal) shows the alternative that Geant4 avoids: every thread draws
   from its own generator in the order it meets events, and the totals depend on the thread count.
   play(seconds) runs both schedules; before it the lanes are empty and the readouts show "?".
   opts: {events, p, seed, perEvent, locked, chapter, section}.
   getState(): {totals: {t4, t8}, order4, order8, seeds, outcomes4, outcomes8}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, K = PHY.ch01;

  PHY.sims.mcThreads = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ events: 24, p: 0.3, seed: 12345, perEvent: true, locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 }, aspect: 1.15, minHeight: 300, maxHeight: 460 });
    const tw = PHY.tweens();
    const S = { t: 0, ran: false };

    function plan() {
      const master = PHY.random(opts.seed);
      S.seeds = [];
      for (let i = 0; i < opts.events; i++) S.seeds.push([master.int(1, 99999999), master.int(1, 99999999)]);
      /* an event's own outcome and duration, from its own seeds */
      S.own = S.seeds.map(function (s) {
        const r = PHY.random((s[0] * 31 + s[1]) >>> 0);
        return { dur: 0.6 + r.next(), hit: r.next() < opts.p };
      });
      S.lanes = { 4: schedule(4), 8: schedule(8) };
      S.T = Math.max(S.lanes[4].end, S.lanes[8].end);
    }
    function schedule(nThreads) {
      const free = new Array(nThreads).fill(0);
      const gens = [];
      for (let i = 0; i < nThreads; i++) gens.push(PHY.random(opts.seed + 7 * (i + 1)));
      const jobs = [];
      for (let e = 0; e < opts.events; e++) {
        let lane = 0;
        for (let i = 1; i < nThreads; i++) if (free[i] < free[lane] - 1e-12) lane = i;
        const start = free[lane], dur = S.own[e].dur;
        const hit = opts.perEvent ? S.own[e].hit : gens[lane].next() < opts.p;
        jobs.push({ e, lane, start, end: start + dur, hit });
        free[lane] = start + dur;
      }
      const order = jobs.slice().sort((a, b) => a.end - b.end || a.e - b.e).map((j) => j.e);
      return { jobs, end: Math.max.apply(null, free), order, total: jobs.filter((j) => j.hit).length, n: nThreads };
    }

    let readouts = null, toggle = null, again = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 't4', label: 'נייטרונים, 4 הליכים', color: 'var(--c-neutron)' },
        { key: 't8', label: 'נייטרונים, 8 הליכים', color: 'var(--c-neutron)' },
        { key: 'ord', label: 'האירועים הראשונים שנגמרו (4 / 8)' },
      ]);
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      toggle = U.Toggle(row, 'זרע לכל אירוע מהמנהל, כמו ב-Geant4', { value: true, onChange: (v) => { opts.perEvent = v; api.play(2.5); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); } });
      again = U.Button(row, 'להריץ שוב', () => api.play(2.5), {});
    }
    function doneCount(L) { return L.jobs.filter((j) => j.end <= S.t + 1e-9); }
    function paint() {
      if (!readouts) return;
      const fin = S.ran && S.t >= S.T - 1e-9;
      readouts.set('t4', fin ? F.num(S.lanes[4].total, 0) : '?');
      readouts.set('t8', fin ? F.num(S.lanes[8].total, 0) : '?');
      readouts.set('ord', fin ? F.ltr(S.lanes[4].order.slice(0, 5).join(', ') + ' / ' + S.lanes[8].order.slice(0, 5).join(', ')) : '?');
    }
    function lock(on) { opts.locked = on; if (toggle) toggle.input.disabled = on; if (again) again.disabled = on; }

    function lanePanel(L, y0, y1, title) {
      const ctx = view.ctx, x0 = 14, x1 = 97;
      const h = (y1 - y0) / L.n;
      view.text(2, y1 + 2.5, title, { size: 12, weight: 700, color: C.ink, align: 'left' });
      for (let i = 0; i < L.n; i++) {
        const ya = y1 - (i + 1) * h, yb = y1 - i * h;
        view.text(2, (ya + yb) / 2, 'WT' + i, { size: 10, color: C.muted, align: 'left' });
        view.line(x0, ya, x1, ya, { color: 'grid', width: 1 });
      }
      const sx = (t) => x0 + ((x1 - x0) * t) / S.T;
      L.jobs.forEach(function (j) {
        if (!S.ran || j.start > S.t) return;
        const end = Math.min(j.end, S.t);
        const ya = y1 - (j.lane + 1) * h + h * 0.14, yb = y1 - j.lane * h - h * 0.14;
        const px0 = view.sx(sx(j.start)) + 1, px1 = view.sx(sx(end)) - 1;
        ctx.save();
        ctx.fillStyle = C.volume; ctx.globalAlpha = j.end <= S.t ? 0.2 : 0.42;
        ctx.fillRect(px0, view.sy(yb), Math.max(1, px1 - px0), view.sy(ya) - view.sy(yb));
        ctx.restore();
        if (px1 - px0 > 14) view.screenText((px0 + px1) / 2, view.sy((ya + yb) / 2), String(j.e), { size: 10, weight: 600, color: C.ink });
        if (j.hit && j.end <= S.t) view.circle(sx(j.end) - 0.9, (ya + yb) / 2 + h * 0.22, 3.6, { px: true, fill: C.neutron });
      });
      if (S.ran) {
        const n = doneCount(L).filter((j) => j.hit).length;
        view.text(97, y1 + 2.5, 'נייטרונים: ' + n, { size: 12, weight: 700, color: C.neutron, align: 'right' });
      }
    }

    function render() {
      view.clear();
      lanePanel(S.lanes[4], 56, 93, F.ltr('-s ' + opts.seed + ' -t 4'));
      lanePanel(S.lanes[8], 6, 47, F.ltr('-s ' + opts.seed + ' -t 8'));
      if (!S.ran) { K.mark(view, view.sx(55), view.sy(76)); K.mark(view, view.sx(55), view.sy(27)); }
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        plan();
        S.ran = true; S.t = 0;
        paint(); loop.start();
        return tw.run(seconds || 4, (k) => { S.t = S.T * k; if (k >= 1) { S.t = S.T; lock(false); } paint(); loop.requestRender(); });
      },
      setParam(key, v) { if (key === 'locked') lock(v); else { opts[key] = v; if (key === 'perEvent' && toggle) toggle.set(!!v); plan(); if (S.ran) S.t = S.T; } paint(); loop.requestRender(); },
      getState() {
        return { totals: { t4: S.lanes[4].total, t8: S.lanes[8].total }, order4: S.lanes[4].order.slice(), order8: S.lanes[8].order.slice(), seeds: S.seeds.map((s) => s.slice()), outcomes4: S.lanes[4].jobs.slice().sort((a, b) => a.e - b.e).map((j) => j.hit), outcomes8: S.lanes[8].jobs.slice().sort((a, b) => a.e - b.e).map((j) => j.hit), perEvent: opts.perEvent };
      },
    };
    plan();
    lock(opts.locked);
    paint();
    return api;
  };
})();
