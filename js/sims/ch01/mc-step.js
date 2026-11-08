/* PHY.sims.mcStep: how Geant4 picks the length of one step. A neutron crosses two schematic layers, A and B,
   in vacuum (the World). For each discrete process (hadElastic, neutronInelastic) Geant4 keeps the number
   of mean free paths left, n_λ, drawn once from an exponential (n_λ = −ln u); the process proposes
   n_λ·λ(material). The geometry (the Transportation process) proposes the distance to the next boundary.
   The shortest proposal wins. After the step every n_λ goes down by length/λ, so at a boundary the
   leftover is carried into the next material with its own λ. A step that ends on a boundary has no
   physics: the particle only changes volume. Leaving the World ends the track.
   The first steps are scripted to match the card (n_λ = 0.7 and 0.6, so 35 mm and 120 mm against 20 mm to
   the boundary); after the track ends, "new neutron" draws everything from opts.rng.
   Lengths in mm. Proposals are drawn as parallel bars from the pre-step point; play(seconds) runs the
   first step: the bars grow, the winner lights up, the neutron moves, a row is added to the step table.
   opts: {locked, rng, chapter, section}. Actions: play(s), next() (animated, returns a Promise),
   stepNow() (no animation), newTrack(). getState(): {steps, volume, pos, nLeft, alive}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, K = PHY.ch01;

  /* Schematic mean free paths (mm). The World is vacuum: no interactions. */
  const LAM = { A: { el: 50, inel: 200 }, B: { el: 25, inel: 100 }, World: { el: Infinity, inel: Infinity } };
  const BOX = { A: [0, 20, -15, 15], B: [20, 50, -15, 15], World: [-8, 62, -22, 22] };
  const PROC = { el: 'hadElastic', inel: 'neutronInelastic', geom: 'Transportation' };
  const SCRIPT = { n: { el: 0.7, inel: 0.6 }, scatter: [40], resample: [1.2] };

  function volumeAt(x, y) {
    for (const v of ['A', 'B']) { const b = BOX[v]; if (x >= b[0] && x <= b[1] && y >= b[2] && y <= b[3]) return v; }
    const w = BOX.World;
    return x >= w[0] && x <= w[1] && y >= w[2] && y <= w[3] ? 'World' : null;
  }
  /* Distance from (x, y) along (dx, dy) to the next surface crossed: the walls of the current box, or,
     in the World, the first face of A or B ahead, or the World's own wall. */
  function toBoundary(vol, x, y, dx, dy) {
    let best = Infinity;
    const exitBox = function (b) {
      const ts = [];
      if (dx > 1e-12) ts.push((b[1] - x) / dx); if (dx < -1e-12) ts.push((b[0] - x) / dx);
      if (dy > 1e-12) ts.push((b[3] - y) / dy); if (dy < -1e-12) ts.push((b[2] - y) / dy);
      return Math.min.apply(null, ts.filter((t) => t > 1e-9));
    };
    if (vol !== 'World') return exitBox(BOX[vol]);
    best = exitBox(BOX.World);
    ['A', 'B'].forEach(function (v) {
      const b = BOX[v];
      /* slab entry by the ray-box method */
      let t0 = -Infinity, t1 = Infinity;
      for (const [p, d, lo, hi] of [[x, dx, b[0], b[1]], [y, dy, b[2], b[3]]]) {
        if (Math.abs(d) < 1e-12) { if (p < lo || p > hi) { t0 = Infinity; } continue; }
        const a = (lo - p) / d, c = (hi - p) / d;
        t0 = Math.max(t0, Math.min(a, c)); t1 = Math.min(t1, Math.max(a, c));
      }
      if (t0 <= t1 && t0 > 1e-9 && t0 < best) best = t0;
    });
    return best;
  }

  PHY.sims.mcStep = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    const rng = opts.rng || Math.random;
    const view = PHY.canvas.create(canvasEl, { world: { xMin: -8, xMax: 62, yMin: -22, yMax: 24 }, aspect: 1.45, minHeight: 250, maxHeight: 420 });
    const tw = PHY.tweens();
    const S = {};

    function fresh(scripted) {
      S.pos = { x: 0, y: 0 };
      S.ang = 0;
      S.vol = 'A';
      S.alive = true;
      S.scripted = scripted;
      S.nScatter = 0;
      S.nLeft = scripted ? { el: SCRIPT.n.el, inel: SCRIPT.n.inel } : { el: -Math.log(1 - rng()), inel: -Math.log(1 - rng()) };
      S.steps = [];
      S.path = [{ x: 0, y: 0 }];
      S.anim = null;
      S.ended = '';
    }

    function proposals() {
      const lam = LAM[S.vol];
      const a = (S.ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
      return { el: S.nLeft.el * lam.el, inel: S.nLeft.inel * lam.inel, geom: toBoundary(S.vol, S.pos.x, S.pos.y, dx, dy), dx, dy };
    }

    /* One step, computed. Returns the step record without moving the drawing. */
    function compute() {
      const p = proposals();
      const lam = LAM[S.vol];
      let win = 'geom', len = p.geom;
      if (p.el < len) { win = 'el'; len = p.el; }
      if (p.inel < len) { win = 'inel'; len = p.inel; }
      const from = { x: S.pos.x, y: S.pos.y };
      const to = { x: from.x + len * p.dx, y: from.y + len * p.dy };
      const pre = S.vol;
      const leftBefore = { el: S.nLeft.el, inel: S.nLeft.inel };
      /* every process used up len/λ of its mean free paths */
      if (isFinite(lam.el)) S.nLeft.el -= len / lam.el;
      if (isFinite(lam.inel)) S.nLeft.inel -= len / lam.inel;
      let post = pre, end = '';
      if (win === 'geom') {
        post = volumeAt(to.x + p.dx * 1e-6, to.y + p.dy * 1e-6);
        if (!post) { end = 'OutOfWorld'; S.alive = false; post = 'מחוץ לעולם'; }
      } else if (win === 'el') {
        const scripted = S.scripted && S.nScatter < SCRIPT.scatter.length;
        S.ang = scripted ? SCRIPT.scatter[S.nScatter] : S.ang + (rng() < 0.5 ? -1 : 1) * (20 + 140 * rng());
        S.nLeft.el = scripted ? SCRIPT.resample[S.nScatter] : -Math.log(1 - rng());
        S.nScatter++;
      } else {
        end = 'נבלע'; S.alive = false;
      }
      S.pos = to;
      if (win === 'geom' && post && post !== 'מחוץ לעולם') S.vol = post;
      const rec = { i: S.steps.length + 1, from, to, len, win, proc: PROC[win], pre, post, prop: { el: p.el, inel: p.inel, geom: p.geom }, leftBefore, leftAfter: { el: S.nLeft.el, inel: S.nLeft.inel }, end };
      S.steps.push(rec);
      S.path.push(to);
      return rec;
    }

    /* ---------- controls: the step table and buttons ---------- */
    let tbody = null, nextBtn = null, newBtn = null;
    if (controlsEl) {
      const table = U.h('table', { class: 'step-table' });
      table.appendChild(U.h('thead', {}, [U.h('tr', {}, ['צעד', 'אורך', 'מי ניצח', 'איפה נגמר'].map((t) => U.h('th', { text: t })))]));
      tbody = U.h('tbody');
      table.appendChild(tbody);
      controlsEl.appendChild(U.h('div', { class: 'step-table-wrap' }, [table]));
      const row = U.h('div', { class: 'btn-row' });
      controlsEl.appendChild(row);
      nextBtn = U.Button(row, 'הצעד הבא', () => { api.next(); mark(); }, { primary: true });
      newBtn = U.Button(row, 'נייטרון חדש', () => { api.newTrack(); mark(); }, {});
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    const where = (r) => (r.end === 'OutOfWorld' ? 'יוצא מהעולם' : r.end ? 'המסלול נגמר' : r.win === 'geom' ? 'על הגבול, נכנס ל-' + r.post : 'בתוך ' + r.pre);
    function table() {
      if (!tbody) return;
      tbody.innerHTML = '';
      S.steps.forEach(function (r) {
        if (S.anim && S.anim.rec === r && S.anim.phase < 2) return;
        tbody.appendChild(U.h('tr', { class: r.win === 'geom' ? 'is-geom' : 'is-phys' }, [
          U.h('td', { text: String(r.i) }), U.h('td', { text: F.unit(r.len, 'mm', 1) }), U.h('td', { dir: 'ltr', text: r.proc }), U.h('td', { text: where(r) }),
        ]));
      });
    }
    function buttons() {
      if (nextBtn) nextBtn.disabled = opts.locked || !S.alive || !!S.anim;
      if (newBtn) newBtn.disabled = opts.locked || !!S.anim;
    }

    /* ---------- drawing ---------- */
    function box(v, label) {
      const b = BOX[v];
      view.poly([{ x: b[0], y: b[2] }, { x: b[1], y: b[2] }, { x: b[1], y: b[3] }, { x: b[0], y: b[3] }], { close: true, color: 'volume', width: 2 });
      const ctx = view.ctx;
      ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = C.volume;
      ctx.fillRect(view.sx(b[0]), view.sy(b[3]), (b[1] - b[0]) * view.scale, (b[3] - b[2]) * view.scale);
      ctx.restore();
      view.text((b[0] + b[1]) / 2, b[2] + 3, label, { size: 12, weight: 700, color: C.volume });
    }
    /* Distance from (x, y) along (dx, dy) to the edge of the World box (the drawing). */
    function toWall(x, y, dx, dy) {
      const b = BOX.World, ts = [];
      if (dx > 1e-12) ts.push((b[1] - x) / dx); if (dx < -1e-12) ts.push((b[0] - x) / dx);
      if (dy > 1e-12) ts.push((b[3] - y) / dy); if (dy < -1e-12) ts.push((b[2] - y) / dy);
      return Math.min.apply(null, ts.filter((t) => t > 0));
    }
    function bar(from, dx, dy, len, off, color, width, label, alpha) {
      const nx = -dy, ny = dx;
      const fx = from.x + nx * off, fy = from.y + ny * off;
      /* clip the drawn length to the drawing, and mark a bar that continues beyond it with dashes */
      let L = len, cut = false;
      const maxL = toWall(fx, fy, dx, dy);
      if (!isFinite(L) || L > maxL - 1.5) { L = Math.max(0, maxL - 1.5); cut = true; }
      const tx = fx + dx * L, ty = fy + dy * L;
      const a = alpha === undefined ? 1 : alpha;
      if (cut) view.line(fx, fy, tx, ty, { color, width: width || 2.4, alpha: a, dash: [6, 4] });
      else view.arrow(fx, fy, tx, ty, { color, width: width || 2.4, head: 9, alpha: a });
      if (!label) return;
      /* the label sits after the bar's end, or before it when the bar reaches the edge */
      const right = !cut && maxL - L > 14;
      view.text(tx, ty, label, { offset: [right ? 7 : -4, right ? 0 : -10], size: 11.5, weight: 700, color, align: right ? 'left' : 'right', halo: true, alpha: a });
    }

    function render() {
      view.clear();
      box('A', 'A'); box('B', 'B');
      view.text(BOX.World[0] + 1, BOX.World[3] + 0.5, 'World: ריק', { size: 11, color: C.muted, align: 'left' });
      /* the path so far */
      const path = S.path.slice();
      if (S.anim && S.anim.phase >= 2) {
        const r = S.anim.rec, k = S.anim.move;
        path[path.length - 1] = { x: r.from.x + (r.to.x - r.from.x) * k, y: r.from.y + (r.to.y - r.from.y) * k };
      } else if (S.anim) path.pop();
      if (path.length > 1) view.poly(path, { color: 'neutron', width: 2.6 });
      path.forEach(function (p, i) { if (i) view.circle(p.x, p.y, 4, { px: true, fill: C.neutron, color: C.neutron }); });
      const head = path[path.length - 1];
      if (S.alive || S.anim) view.circle(head.x, head.y, 6.5, { px: true, fill: C.neutron, color: C.neutron });
      /* proposals */
      let pr = null, grow = 1, winner = null, fade = 1;
      if (S.anim) {
        pr = S.anim.rec.prop; grow = S.anim.grow; winner = S.anim.phase >= 1 ? S.anim.rec.win : null; fade = S.anim.phase >= 1 ? 0.25 : 1;
        if (S.anim.phase >= 2) pr = null;
      } else if (S.alive && !S.ran) {
        pr = proposals();
      }
      if (pr) {
        const from = S.anim ? S.anim.rec.from : S.pos;
        const p = proposals();
        const dx = S.anim ? (S.anim.rec.to.x - S.anim.rec.from.x) / (S.anim.rec.len || 1) : p.dx;
        const dy = S.anim ? (S.anim.rec.to.y - S.anim.rec.from.y) / (S.anim.rec.len || 1) : p.dy;
        const items = [['geom', 'גבול', 3.5], ['el', 'אלסטי', 8], ['inel', 'לא-אלסטי', 12.5]];
        items.forEach(function (it) {
          const key = it[0], len = pr[key];
          const on = winner === key;
          const label = it[1] + ' ' + (isFinite(len) ? F.unit(len, 'mm', 1) : '∞');
          bar(from, dx, dy, (isFinite(len) ? len : 1e9) * grow, it[2], on ? C.accent : C.ink, on ? 3.6 : 2.2, grow >= 1 ? label : null, on ? 1 : fade);
        });
      }
      if (!S.ran && !S.anim) K.mark(view, view.sx(35), view.sy(-8), '?');
      /* what is left of each process */
      if (S.ran || S.anim) {
        const t = 'נשאר: אלסטי ' + F.ltr(F.num(S.nLeft.el, 2) + ' λ') + ', לא-אלסטי ' + F.ltr(F.num(S.nLeft.inel, 2) + ' λ');
        view.screenText(view.w / 2, view.h - 12, S.alive || S.anim ? t : 'המסלול נגמר (' + S.ended + ')', { size: 11.5, weight: 600, color: C.muted });
      }
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });

    /* Animate one computed step: bars grow (0.9 s), the winner lights (0.5 s), the neutron moves (0.8 s). */
    function animate(rec, scale) {
      const k = scale || 1;
      S.anim = { rec, phase: 0, grow: 0, move: 0 };
      table(); buttons();
      loop.start();
      return tw.run(0.9 * k, (t) => { S.anim.grow = PHY.ease.out(t); loop.requestRender(); })
        .then(() => { S.anim.phase = 1; loop.requestRender(); return tw.wait(0.5 * k); })
        .then(() => tw.run(0.8 * k, (t) => {
          S.anim.phase = 2; S.anim.move = PHY.ease.inOut(t);
          if (t >= 1) {
            S.anim = null;
            if (!S.alive) S.ended = S.steps[S.steps.length - 1].end === 'OutOfWorld' ? 'יצא מהעולם' : 'נבלע';
            table(); buttons();
          }
          loop.requestRender();
        }));
    }

    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); fresh(true); S.ran = false; table(); buttons(); loop.requestRender(); },
      /* The first step of the scripted neutron, animated. */
      play(seconds) {
        tw.clear();
        fresh(true);
        S.ran = true;
        const rec = compute();
        return animate(rec, (seconds || 2.6) / 2.2).then(() => { opts.locked = false; buttons(); });
      },
      next() {
        if (!S.alive || S.anim) return Promise.resolve(null);
        S.ran = true;
        const rec = compute();
        return animate(rec, 1).then(() => rec);
      },
      stepNow() {
        if (!S.alive) return null;
        S.ran = true;
        const rec = compute();
        S.anim = null;
        if (!S.alive) S.ended = rec.end === 'OutOfWorld' ? 'יצא מהעולם' : 'נבלע';
        table(); buttons(); loop.requestRender();
        return rec;
      },
      newTrack() { tw.clear(); fresh(false); S.ran = true; table(); buttons(); loop.requestRender(); },
      setParam(key, v) { if (key === 'locked') { opts.locked = v; buttons(); } loop.requestRender(); },
      getState() {
        return { steps: S.steps.map((r) => Object.assign({}, r)), volume: S.vol, pos: Object.assign({}, S.pos), nLeft: Object.assign({}, S.nLeft), alive: S.alive, lambdas: LAM };
      },
    };
    fresh(true);
    S.ran = !opts.locked;
    table();
    buttons();
    return api;
  };
  PHY.sims.mcStep.LAM = LAM;
})();
