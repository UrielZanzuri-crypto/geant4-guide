/* PHY.sims.outNtuple: the leak table filling during a multithreaded run. Four worker threads (G4WT0-3) take
   whole events, one at a time, from a common queue; an event takes a random time. When a neutron leaves the
   converter, the thread that runs the event fills one row with the real leak columns of ldns (evt E cosTheta
   phi x y z dx dy dz t birthLayer process w; the values are a schematic toy, PHY.ch08.makeRun with a yield
   100 times the real one so there is something to see). A thread keeps its rows in its own buffer and hands
   them on in groups of `batch` rows, and the rest at the end of the run.
   merge on (SetNtupleMerging(true), as in ldns): the groups go into one file, in the order they arrive, so the
   evt column is not sorted. merge off: every thread writes its own file, name_t0.root ... name_t3.root.
   The DOM table under the canvas shows the last rows of the (first) file. Before the run: no rows, no files,
   "?" in the readouts. play(seconds) runs the whole schedule; free play after the reveal: a toggle for the merge.
   opts: {events, threads, batch, seed, merge, locked, chapter, section}.
   getState(): {ran, done (events finished), files: [{name, rows: [row...]}], rowsByThread, eventsByThread,
   schedule: [{evt, thread, t0, t1, n}], total (rows), sorted (the first file's evt column is sorted)}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K1 = PHY.ch01, K = PHY.ch08;
  const COLS = ['evt', 'E', 'cosTheta', 'phi', 'x', 'y', 'z', 'dx', 'dy', 'dz', 't', 'birthLayer', 'process', 'w'];

  PHY.sims.outNtuple = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ events: 240, threads: 4, batch: 3, seed: 8, merge: true, locked: true }, opts || {});
    const NT = opts.threads;
    const plot = PL.create(canvasEl, { x: [0, 1], y: [0, 1], grid: false, aspect: 1.45, minHeight: 280, maxHeight: 420, margin: { l: 8, r: 8, t: 34, b: 8 } });
    const view = plot.view;
    const tw = PHY.tweens();
    const S = { ran: !opts.locked, tau: 0, T: 1 };

    /* ---------- the schedule: events to threads, rows, groups ---------- */
    const rng = PHY.random(opts.seed).next;
    const toy = K.makeRun({ N: opts.events, p: 100 * K.BE.p, mult2: 0.15, seed: opts.seed + 1 });
    const byEvt = {};
    for (let j = 0; j < toy.R; j++) (byEvt[toy.evt[j]] = byEvt[toy.evt[j]] || []).push(j);
    function rowOf(j) {
      const cos = toy.cos[j], sin = Math.sqrt(Math.max(0, 1 - cos * cos)), ph = Math.PI * (2 * rng() - 1);
      const r = K.BE.cone * Math.sqrt(rng()), a = 2 * Math.PI * rng();
      const side = rng() < 0.08;
      const R = side ? K.BE.radius : r;
      return {
        evt: toy.evt[j], E: toy.E[j], cosTheta: cos, phi: ph,
        x: R * Math.cos(a), y: R * Math.sin(a), z: side ? 45 + 2 * rng() : cos > 0 ? 47 : 45,
        dx: sin * Math.cos(ph), dy: sin * Math.sin(ph), dz: cos,
        t: 1.3 + 1.2 * rng(), birthLayer: 0, process: rng() < 0.986 ? 'protonInelastic' : 'neutronInelastic', w: toy.w[j],
      };
    }
    const free = new Array(NT).fill(0);
    const schedule = [];
    for (let e = 0; e < opts.events; e++) {
      let th = 0;
      for (let i = 1; i < NT; i++) if (free[i] < free[th] - 1e-12) th = i;
      const t0 = free[th], t1 = t0 + 0.55 + 0.9 * rng();
      free[th] = t1;
      const rows = (byEvt[e] || []).map(rowOf);
      schedule.push({ evt: e, thread: th, t0, t1, n: rows.length, rows });
    }
    const TEND = Math.max.apply(null, free);
    /* rows reach a thread's buffer when its event ends; a full group (batch rows) goes on at once */
    const flushes = [];
    const buf = Array.from({ length: NT }, () => []);
    schedule.slice().sort((a, b) => a.t1 - b.t1).forEach(function (ev) {
      ev.rows.forEach((r) => buf[ev.thread].push(r));
      if (buf[ev.thread].length >= opts.batch) { flushes.push({ t: ev.t1, thread: ev.thread, rows: buf[ev.thread] }); buf[ev.thread] = []; }
    });
    buf.forEach(function (b, th) { if (b.length) flushes.push({ t: TEND + 1e-6, thread: th, rows: b }); });
    S.T = TEND;

    function stateAt(tau) {
      const done = schedule.filter((ev) => ev.t1 <= tau + 1e-12);
      const running = schedule.filter((ev) => ev.t0 <= tau && ev.t1 > tau);
      const sent = flushes.filter((f) => f.t <= tau + 1e-9);
      const bufRows = new Array(NT).fill(0);
      done.forEach((ev) => { bufRows[ev.thread] += ev.n; });
      sent.forEach((f) => { bufRows[f.thread] -= f.rows.length; });
      const files = [];
      if (opts.merge) files.push({ name: 'E30J_M2p5_Be2.root', rows: [].concat.apply([], sent.map((f) => f.rows)) });
      else for (let th = 0; th < NT; th++) files.push({ name: 'E30J_M2p5_Be2_t' + th + '.root', rows: [].concat.apply([], sent.filter((f) => f.thread === th).map((f) => f.rows)) });
      return { done, running, bufRows, files };
    }

    /* ---------- controls: readouts, the row table, the merge toggle ---------- */
    let readouts = null, toggle = null, tbody = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'ev', label: 'אירועים שהסתיימו' },
        { key: 'rows', label: 'שורות ב-leak' },
        { key: 'files', label: 'קובצי ROOT בתיקייה' },
      ]);
      const wrap = U.h('div', { class: 'nt-wrap', dir: 'ltr' });
      const table = U.h('table', { class: 'nt-table' });
      const thead = U.h('thead');
      const tr = U.h('tr');
      COLS.forEach((c) => tr.appendChild(U.h('th', { text: c })));
      thead.appendChild(tr);
      tbody = U.h('tbody');
      table.appendChild(thead); table.appendChild(tbody);
      wrap.appendChild(table);
      controlsEl.appendChild(U.h('div', { class: 'small muted', text: 'השורות האחרונות בקובץ (ערכים של צעצוע):' }));
      controlsEl.appendChild(wrap);
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      toggle = U.Toggle(row, 'מיזוג לקובץ אחד, ' + F.ltr('SetNtupleMerging(true)'), { value: opts.merge, onChange: (v) => { opts.merge = v; paint(); loop.requestRender(); mark(); } });
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    const fmtCell = (c, v) => {
      if (c === 'evt' || c === 'birthLayer') return String(v);
      if (c === 'process') return v;
      if (c === 'w') return F.plain(F.num(v, 4));
      if (c === 'x' || c === 'y' || c === 'z') return F.plain(F.num(v, 2));
      return F.plain(F.num(v, 3)).replace('−', '-');
    };
    let lastKey = '';
    function paint() {
      const st = stateAt(S.ran ? S.tau : -1);
      if (readouts) {
        readouts.set('ev', S.ran ? F.num(st.done.length, 0) + ' / ' + F.num(opts.events, 0) : '?');
        readouts.set('rows', S.ran ? F.num(st.files.reduce((a, f) => a + f.rows.length, 0), 0) : '?');
        readouts.set('files', S.ran && st.files.some((f) => f.rows.length) ? F.num(st.files.length, 0) : '?');
      }
      if (tbody) {
        const rows = S.ran ? st.files[0].rows.slice(-6) : [];
        const key = rows.length + ':' + (rows.length ? rows[rows.length - 1].evt + '/' + rows[0].evt : '') + ':' + opts.merge;
        if (key !== lastKey) {
          lastKey = key;
          tbody.innerHTML = '';
          rows.forEach(function (r) {
            const tr = U.h('tr');
            COLS.forEach((c) => tr.appendChild(U.h('td', { class: c === 'evt' ? 'is-evt' : '', text: fmtCell(c, r[c]) })));
            tbody.appendChild(tr);
          });
        }
      }
    }

    /* The merge toggle names the answer of the card, so it appears only after the run. */
    function lock(on) {
      opts.locked = on;
      if (toggle) { toggle.input.disabled = on; toggle.el.parentNode.hidden = on; }
    }

    /* ---------- drawing ---------- */
    function render() {
      view.clear();
      const ctx = view.ctx;
      const W = view.w, H = view.h;
      const st = stateAt(S.ran ? S.tau : -1);
      const small = W < 420;
      const laneX = 10, laneW = W * (small ? 0.56 : 0.6), fileX = laneX + laneW + 14, fileW = W - fileX - 10;
      const top = 44, laneH = (H - top - 14) / NT;
      for (let th = 0; th < NT; th++) {
        const y = top + th * laneH;
        ctx.save();
        ctx.fillStyle = C.shade; ctx.globalAlpha = 0.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(laneX, y + 3, laneW, laneH - 6, 8); else ctx.rect(laneX, y + 3, laneW, laneH - 6);
        ctx.fill();
        ctx.restore();
        view.screenText(laneX + 8, y + 15, 'G4WT' + th, { size: 11.5, weight: 700, color: C.muted, align: 'left', font: 'ui-monospace, Menlo, monospace' });
        const run = st.running.find((ev) => ev.thread === th);
        if (S.ran && run) {
          const k = (S.tau - run.t0) / (run.t1 - run.t0);
          view.screenText(laneX + 62, y + 15, 'evt ' + run.evt, { size: 11.5, weight: 600, color: C.ink, align: 'left', font: 'ui-monospace, Menlo, monospace' });
          ctx.save();
          ctx.fillStyle = C.accent; ctx.globalAlpha = 0.55;
          ctx.fillRect(laneX + 8, y + laneH - 14, (laneW - 16) * Math.max(0, Math.min(1, k)), 4);
          ctx.restore();
        }
        const nb = S.ran ? st.bufRows[th] : 0;
        for (let i = 0; i < nb; i++) {
          ctx.save(); ctx.fillStyle = C.neutron;
          ctx.fillRect(laneX + laneW - 14 - i * 12, y + 10, 9, 9);
          ctx.restore();
        }
        if (S.ran) {
          const n = st.done.filter((ev) => ev.thread === th).length;
          view.screenText(laneX + laneW - 8, y + laneH - 24, F.num(n, 0) + ' אירועים', { size: 10.5, color: C.muted, align: 'right' });
        }
      }
      /* the output folder */
      view.screenText(fileX + fileW / 2, top - 8, 'output/', { size: 12, weight: 700, color: C.ink, font: 'ui-monospace, Menlo, monospace' });
      const shown = st.files.filter((f) => f.rows.length);
      if (!S.ran || !shown.length) {
        K1.mark(view, fileX + fileW / 2, top + (H - top) / 2 - 10);
      } else {
        const fh = Math.min(58, (H - top - 16) / st.files.length - 6);
        st.files.forEach(function (f, i) {
          const y = top + 4 + i * (fh + 6);
          ctx.save();
          ctx.fillStyle = C.panel; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(fileX, y, fileW, fh, 6); else ctx.rect(fileX, y, fileW, fh);
          ctx.fill(); ctx.stroke();
          ctx.restore();
          const name = opts.merge ? '…_Be2.root' : '…_Be2_t' + i + '.root';
          view.screenText(fileX + fileW / 2, y + Math.min(16, fh * 0.32), name, { size: small ? 10.5 : 11.5, weight: 700, color: C.ink, font: 'ui-monospace, Menlo, monospace' });
          view.screenText(fileX + fileW / 2, y + fh - Math.min(15, fh * 0.3), F.num(f.rows.length, 0) + ' שורות', { size: 11, color: C.neutron, weight: 700 });
        });
      }
      K1.clock(view, S.ran ? 'אירועים: ' + F.num(st.done.length, 0) + ' מתוך ' + F.num(opts.events, 0) : 'ארבעה הליכים, ' + F.num(opts.events, 0) + ' אירועים');
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.tau = 0;
        paint(); loop.start();
        return tw.run(seconds || 4, function (k) {
          S.tau = k * (S.T + 2e-6);
          if (k >= 1) { S.tau = S.T + 1; lock(false); }
          paint(); loop.requestRender();
        });
      },
      setParam(key, v) {
        if (key === 'locked') lock(v);
        else { opts[key] = v; if (key === 'merge' && toggle) toggle.set(!!v); }
        paint(); loop.requestRender();
      },
      getState() {
        const st = stateAt(S.ran ? S.tau : -1);
        const ev0 = st.files.length ? st.files[0].rows.map((r) => r.evt) : [];
        let sorted = true;
        for (let i = 1; i < ev0.length; i++) if (ev0[i] < ev0[i - 1]) sorted = false;
        const rowsByThread = new Array(NT).fill(0), eventsByThread = new Array(NT).fill(0);
        schedule.forEach((ev) => { rowsByThread[ev.thread] += ev.n; eventsByThread[ev.thread]++; });
        return {
          ran: S.ran, done: st.done.length, files: st.files.map((f) => ({ name: f.name, rows: f.rows.slice() })),
          rowsByThread, eventsByThread, schedule: schedule.map((ev) => ({ evt: ev.evt, thread: ev.thread, t0: ev.t0, t1: ev.t1, n: ev.n })),
          total: st.files.reduce((a, f) => a + f.rows.length, 0), sorted, toyRows: toy.R,
        };
      },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
