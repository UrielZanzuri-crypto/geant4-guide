/* PHY.sims.archLeak: what the ldns stepping action does with every step: the leak tally
   (src/SteppingAction.cc, part 3). A row is written when the particle is a neutron, the step started in a
   converter layer, it ended on a geometry boundary (fGeomBoundary), the next volume (the post-step
   point's volume) is not a converter layer, and it is the first exit of this track.
   A two-layer converter (Be | Pb, copy numbers 1 and 2) in the vacuum World, drawn as an r-z cross
   section (schematic sizes). The scripted neutron of the card: born in Be, scatters, crosses into Pb (a
   boundary step that writes nothing: the next volume is still a layer), scatters, leaves through the back
   face (the row) and then leaves the World. Each step goes into the step table with its process, the
   next volume and whether a row was written; the exit face lights up when the row is written.
   After the card, "another neutron" draws a random walk (schematic mean free path, scattering or capture).
   play(seconds) runs the scripted neutron; before it the table is empty and the readouts show "?".
   opts: {locked, rng, chapter, section}. getState(): {steps: [{proc, next, row}], rows, neutrons,
   rowsTotal, inner (boundary steps between layers)}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, K = PHY.ch02;

  const LAYERS = [{ name: 'Layer0_Be', x0: 0, x1: 12, copy: 1, mat: 'Be' }, { name: 'Layer1_Pb', x0: 12, x1: 30, copy: 2, mat: 'Pb' }];
  const R = 12;
  const WORLD = { x0: -4, x1: 44, y0: -16, y1: 16 };
  const BOX = { x0: 0, x1: 30, y0: -R, y1: R };
  const SCRIPT = {
    birth: { x: 5, y: 3 },
    pts: [{ x: 8, y: -4 }, { x: 12, y: -2.4 }, { x: 20, y: 0.8 }, { x: 30, y: 5.8 }, { x: 44, y: 12.8 }],
    procs: ['hadElastic', 'Transportation', 'hadElastic', 'Transportation', 'Transportation'],
    E: 1.9,
  };

  function layerAt(x, y) {
    if (Math.abs(y) > R + 1e-9) return null;
    for (const l of LAYERS) if (x >= l.x0 - 1e-9 && x <= l.x1 + 1e-9) return l;
    return null;
  }
  function volName(x, y, d) {
    const l = layerAt(x + d.x * 1e-6, y + d.y * 1e-6);
    if (l) return l.name;
    const w = WORLD;
    const xx = x + d.x * 1e-6, yy = y + d.y * 1e-6;
    return xx > w.x0 && xx < w.x1 && yy > w.y0 && yy < w.y1 ? 'World' : 'OutOfWorld';
  }

  PHY.sims.archLeak = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true, lam: 9, pCap: 0.15 }, opts || {});
    const rng = opts.rng || Math.random;
    const view = PHY.canvas.create(canvasEl, { world: { xMin: WORLD.x0 - 0.5, xMax: WORLD.x1 + 0.5, yMin: WORLD.y0 - 0.5, yMax: WORLD.y1 + 4.5 }, aspect: 1.4, minHeight: 230, maxHeight: 400 });
    const tw = PHY.tweens();
    const S = { ran: false, anim: false, path: null, k: 0, frac: 0, flash: 0, neutrons: 0, rowsTotal: 0, inner: 0, evt: 0 };

    /* Every step of a path: {from, to, proc, next, row, inner}. */
    function judge(steps) {
      let leaked = false;
      steps.forEach(function (s) {
        const pre = /^Layer/.test(volName(s.from.x, s.from.y, s.d));
        s.next = s.proc === 'Transportation' ? volName(s.to.x, s.to.y, s.d) : volName(s.to.x - s.d.x * 2e-6, s.to.y - s.d.y * 2e-6, s.d);
        const nextIsLayer = /^Layer/.test(s.next);
        s.row = pre && s.proc === 'Transportation' && !nextIsLayer && !leaked;
        if (s.row) leaked = true;
        s.inner = pre && s.proc === 'Transportation' && nextIsLayer;
      });
      return steps;
    }
    function scripted() {
      let from = SCRIPT.birth;
      const steps = SCRIPT.pts.map(function (to, i) {
        const L = Math.hypot(to.x - from.x, to.y - from.y);
        const s = { from, to, proc: SCRIPT.procs[i], d: { x: (to.x - from.x) / L, y: (to.y - from.y) / L } };
        from = to;
        return s;
      });
      return { birth: SCRIPT.birth, steps: judge(steps), E: SCRIPT.E, w: K.EV1_WEIGHT };
    }
    function randomPath() {
      const l = rng() < 0.45 ? LAYERS[0] : LAYERS[1];
      const birth = { x: l.x0 + 1 + (l.x1 - l.x0 - 2) * rng(), y: (rng() * 2 - 1) * (R - 1.5) };
      let pos = birth, ang = rng() * 2 * Math.PI, alive = true, E = 0.5 + 3.5 * rng();
      const steps = [];
      for (let g = 0; g < 40 && alive; g++) {
        const d = { x: Math.cos(ang), y: Math.sin(ang) };
        const inBox = !!layerAt(pos.x + d.x * 1e-6, pos.y + d.y * 1e-6);
        if (!inBox) {
          const to = { x: pos.x + d.x * K.exitBox(pos, d, WORLD), y: pos.y + d.y * K.exitBox(pos, d, WORLD) };
          steps.push({ from: pos, to, proc: 'Transportation', d });
          break;
        }
        /* distance to the next boundary: the box walls or the layer interface */
        let geo = K.exitBox(pos, d, BOX);
        LAYERS.forEach(function (ly) {
          [ly.x0, ly.x1].forEach(function (xb) {
            if (Math.abs(d.x) > 1e-12) { const t = (xb - pos.x) / d.x; if (t > 1e-7 && t < geo) geo = t; }
          });
        });
        const phys = opts.lam * -Math.log(1 - rng());
        if (phys < geo) {
          const to = { x: pos.x + d.x * phys, y: pos.y + d.y * phys };
          const cap = rng() < opts.pCap;
          steps.push({ from: pos, to, proc: cap ? 'nCapture' : 'hadElastic', d });
          pos = to;
          if (cap) alive = false;
          ang = rng() * 2 * Math.PI;
          E *= 0.7 + 0.3 * rng();
        } else {
          const to = { x: pos.x + d.x * geo, y: pos.y + d.y * geo };
          steps.push({ from: pos, to, proc: 'Transportation', d });
          pos = to;
        }
      }
      return { birth, steps: judge(steps), E: +E.toFixed(2), w: K.EV1_WEIGHT };
    }

    /* ---------- controls ---------- */
    let Rd = null, tbody = null, newBtn = null;
    if (controlsEl) {
      Rd = U.Readouts(controlsEl, [
        { key: 'rows', label: 'שורות ב-leak מהנייטרון הזה', color: 'var(--c-neutron)' },
        { key: 'row', label: 'השורה: E, cosθ, w' },
        { key: 'tot', label: 'נייטרונים / שורות, בסך הכול' },
      ]);
      const wrap = U.h('div', { class: 'g4table-wrap' });
      const table = U.h('table', { class: 'g4table' });
      table.appendChild(U.h('thead', {}, [U.h('tr', {}, ['צעד', 'התהליך', 'הנפח הבא', 'שורה?'].map((x) => U.h('th', { text: x })))]));
      tbody = U.h('tbody');
      table.appendChild(tbody);
      wrap.appendChild(table);
      controlsEl.appendChild(wrap);
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      newBtn = U.Button(row, 'עוד נייטרון', () => { api.another(); if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); });
    }
    function rowsOf(p, k) { return p.steps.slice(0, k).filter((s) => s.row).length; }
    function paint() {
      if (!Rd) return;
      const p = S.path, k = S.k;
      const n = p && S.ran ? rowsOf(p, k) : null;
      Rd.set('rows', n === null ? '?' : F.num(n, 0));
      const r = p && S.ran ? p.steps.slice(0, k).find((s) => s.row) : null;
      Rd.set('row', !S.ran ? '?' : r ? F.ltr(F.num(p.E, 1) + ', ' + F.num(r.d.x, 2) + ', ' + F.num(p.w, 2)) : '–');
      Rd.set('tot', !S.ran ? '?' : F.ltr(F.num(S.neutrons, 0) + ' / ' + F.num(S.rowsTotal, 0)));
      tbody.innerHTML = '';
      if (!p || !S.ran) return;
      p.steps.slice(0, k).forEach(function (s, i) {
        const tr = U.h('tr', { class: s.row ? 'is-row' : '' }, [
          U.h('td', { text: String(i + 1) }),
          U.h('td', { dir: 'ltr', text: s.proc }),
          U.h('td', { dir: 'ltr', text: s.next }),
          U.h('td', { text: s.row ? 'כן' : s.inner ? 'לא, בממיר' : 'לא' }),
        ]);
        tbody.appendChild(tr);
      });
    }
    function buttons() { if (newBtn) newBtn.disabled = opts.locked || S.anim; }

    function render() {
      view.clear();
      const C = PHY.colors, ctx = view.ctx;
      view.poly([{ x: WORLD.x0, y: WORLD.y0 }, { x: WORLD.x1, y: WORLD.y0 }, { x: WORLD.x1, y: WORLD.y1 }, { x: WORLD.x0, y: WORLD.y1 }], { close: true, color: 'gridStrong', width: 1.2, dash: [5, 4] });
      view.text(WORLD.x1 - 0.6, WORLD.y0 + 1.3, 'World', { size: 10.5, weight: 600, color: C.muted, align: 'right' });
      LAYERS.forEach(function (l, i) {
        ctx.save(); ctx.globalAlpha = i ? 0.16 : 0.08; ctx.fillStyle = C.volume;
        ctx.fillRect(view.sx(l.x0), view.sy(R), (l.x1 - l.x0) * view.scale, 2 * R * view.scale);
        ctx.restore();
        view.poly([{ x: l.x0, y: -R }, { x: l.x1, y: -R }, { x: l.x1, y: R }, { x: l.x0, y: R }], { close: true, color: 'volume', width: 2 });
        view.text((l.x0 + l.x1) / 2, R + 1.7, l.mat + ', copy ' + l.copy, { size: 10.5, weight: 700, color: C.volume });
      });
      view.line(-3, 0, 43, 0, { color: 'grid', width: 1, dash: [3, 4] });
      const p = S.path;
      if (!p || !S.ran) K.clock(view, 'סכמטי');
      if (!p) return;
      view.circle(p.birth.x, p.birth.y, 5, { px: true, fill: C.neutron });
      if (!S.ran) { K.mark(view, view.sx(37), view.sy(-8), '?', 26); return; }
      const pts = [p.birth];
      for (let i = 0; i < S.k && i < p.steps.length; i++) pts.push(p.steps[i].to);
      if (S.k < p.steps.length && S.frac > 0) {
        const s = p.steps[S.k];
        pts.push({ x: s.from.x + (s.to.x - s.from.x) * S.frac, y: s.from.y + (s.to.y - s.from.y) * S.frac });
      }
      view.poly(pts, { color: 'neutron', width: 2.4 });
      for (let i = 0; i < S.k && i < p.steps.length; i++) {
        const s = p.steps[i];
        if (s.proc === 'Transportation') view.circle(s.to.x, s.to.y, s.row ? 6 : 4.2, { px: true, color: s.row ? C.neutron : C.volume, width: 2.2, fill: C.bg });
        else view.circle(s.to.x, s.to.y, 3, { px: true, fill: s.proc === 'nCapture' ? C.ink : C.neutron });
        if (s.row && S.flash > 0) {
          /* the face it crossed lights up */
          const onBack = Math.abs(s.to.x - BOX.x1) < 1e-6, onFront = Math.abs(s.to.x - BOX.x0) < 1e-6;
          const a = onBack ? { x: BOX.x1, y: -R } : onFront ? { x: BOX.x0, y: -R } : { x: BOX.x0, y: Math.sign(s.to.y) * R };
          const b = onBack ? { x: BOX.x1, y: R } : onFront ? { x: BOX.x0, y: R } : { x: BOX.x1, y: Math.sign(s.to.y) * R };
          view.line(a.x, a.y, b.x, b.y, { color: 'neutron', width: 5, alpha: Math.min(1, S.flash) });
        }
      }
      K.clock(view, 'שורות שנכתבו: ' + rowsOf(p, S.k));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => { tw.step(dt); if (S.flash > 0) { S.flash -= dt * 0.6; loop.requestRender(); } }, render });

    function runPath(p, secPerStep) {
      S.path = p; S.k = 0; S.frac = 0; S.ran = true; S.anim = true; S.evt++;
      paint(); buttons(); loop.start();
      let chain = Promise.resolve();
      p.steps.forEach(function (s, i) {
        const len = Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y);
        chain = chain.then(() => tw.run(secPerStep * Math.min(1.6, 0.5 + len / 12), (f) => {
          S.frac = f;
          if (f >= 1) {
            S.k = i + 1; S.frac = 0;
            if (s.row) { S.flash = 1.6; S.rowsTotal++; }
            if (i === p.steps.length - 1) { S.neutrons++; S.anim = false; }
            paint(); buttons();
          }
          loop.requestRender();
        }));
      });
      return chain;
    }

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.ran = false; S.anim = false; S.path = scripted(); S.k = 0; S.neutrons = 0; S.rowsTotal = 0; paint(); buttons(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.neutrons = 0; S.rowsTotal = 0;
        return runPath(scripted(), (seconds || 5) / 6).then(() => { opts.locked = false; buttons(); });
      },
      another() { tw.clear(); return runPath(randomPath(), 0.5); },
      /* n random neutrons without animation, for tests */
      simulate(n) {
        let rows = 0, inner = 0, steps = 0, multi = 0;
        for (let i = 0; i < n; i++) {
          const p = randomPath();
          const r = rowsOf(p, p.steps.length);
          rows += r; if (r > 1) multi++;
          inner += p.steps.filter((s) => s.inner).length;
          steps += p.steps.length;
          p.steps.forEach(function (s) {
            /* a row only on a boundary step into a volume that is not a layer */
            if (s.row && (s.proc !== 'Transportation' || /^Layer/.test(s.next))) multi += 1000;
          });
        }
        return { n, rows, inner, steps, bad: multi };
      },
      setParam(key, v) { if (key === 'locked') { opts.locked = v; buttons(); } loop.requestRender(); },
      getState() {
        const p = S.path;
        return {
          steps: p ? p.steps.slice(0, S.k).map((s) => ({ proc: s.proc, next: s.next, row: s.row, inner: s.inner })) : [],
          rows: p ? rowsOf(p, S.k) : 0, neutrons: S.neutrons, rowsTotal: S.rowsTotal, ran: S.ran,
        };
      },
    };
    S.path = scripted();
    paint();
    buttons();
    return api;
  };
})();
