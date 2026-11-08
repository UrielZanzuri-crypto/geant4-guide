/* PHY.sims.physLists: reading the name of a reference physics list. The name is built from three blocks:
   a base (QGSP_BIC, QGSP_INCLXX, FTFP_BERT), an evaluated-data block (none, _HP, _AllHP; AllHP exists only
   with QGSP_BIC) and an EM option (none or _EMZ = option 4). Below the name, on a log energy axis from
   1 meV to 200 MeV, four rows say which block acts for a proton and a neutron (PHY.ch04.listInfo); each bar
   has the style of the block that owns it. A readout gives the LiF yield at 5 MeV from the project's
   benchmark table (or says it was not measured).
   Card mode: QGSP_BIC_AllHP_EMZ, the rows hidden ("?"); play(seconds) reveals them one by one and then the
   5 MeV proton line. Free mode: three Choice rows.
   Also defines PHY.ch04.drawList(P, info, o) for the game: o = {reveal (0-4 rows), marker (MeV), markerLabel}.
   opts: {mode, base, data, em, locked, chapter, section}. getState(): {name, valid, rows, lif5, reveal}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01, K4 = PHY.ch04;
  const XMIN = -9, XMAX = Math.log10(200);
  const ROW_Y = [6.9, 5.0, 3.1, 1.2];

  function boxStyle(ctx, owner, on) {
    if (owner === 'data') { ctx.fillStyle = C.accent; ctx.globalAlpha = on ? 0.38 : 0.22; ctx.strokeStyle = C.accent; ctx.setLineDash([]); }
    else if (owner === 'em') { ctx.fillStyle = C.accent; ctx.globalAlpha = on ? 0.18 : 0.08; ctx.strokeStyle = C.accent; ctx.setLineDash([5, 3]); }
    else if (owner === 'base') { ctx.fillStyle = C.ink; ctx.globalAlpha = on ? 0.2 : 0.1; ctx.strokeStyle = C.ink; ctx.setLineDash([]); }
    else { ctx.fillStyle = C.muted; ctx.globalAlpha = 0.1; ctx.strokeStyle = C.gridStrong; ctx.setLineDash([]); }
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function drawList(P, info, o) {
    o = o || {};
    const view = P.view, ctx = view.ctx, box = P.box;
    const reveal = o.reveal === undefined ? 4 : o.reveal;
    /* axis */
    ctx.save(); ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = C.grid;
    [-9, -6, -3, 0].forEach(function (d) { const px = P.X(d); ctx.beginPath(); ctx.moveTo(px, P.Y(8)); ctx.lineTo(px, box.y + box.h); ctx.stroke(); });
    ctx.restore();
    [[-9, '1 meV'], [-6, '1 eV'], [-3, '1 keV'], [0, '1 MeV'], [XMAX, '200 MeV']].forEach(function (t, i) {
      const al = i === 0 ? 'left' : i >= 3 ? 'right' : 'center';
      view.screenText(P.X(t[0]) + (i === 3 ? 12 : 0), box.y + box.h + 11, t[1], { size: 10.5, color: C.muted, align: al });
    });
    view.screenText(box.x + box.w / 2, box.y + box.h + 26, 'אנרגיה, סקלה לוגריתמית', { size: 11.5, weight: 600, color: C.ink });
    /* the name, block by block */
    const parts = [{ t: info.name.split('_').slice(0, 2).join('_'), owner: 'base' }];
    const rest = info.name.split('_').slice(2);
    rest.forEach(function (p) { parts.push({ t: '_' + p, owner: p === 'EMZ' ? 'em' : 'data' }); });
    ctx.save(); ctx.font = '700 14px ui-monospace, Menlo, monospace';
    const ws = parts.map((p) => ctx.measureText(p.t).width + 14);
    ctx.restore();
    const total = ws.reduce((a, b) => a + b, 0) + 6 * (parts.length - 1);
    let x = box.x + (box.w - total) / 2;
    const yTop = P.Y(9.95), hh = P.Y(8.75) - yTop;
    parts.forEach(function (p, i) {
      ctx.save(); boxStyle(ctx, p.owner, true); rrect(ctx, x, yTop, ws[i], hh, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
      view.screenText(x + ws[i] / 2, yTop + hh / 2, p.t, { size: 14, weight: 700, color: C.ink, font: 'ui-monospace, Menlo, monospace' });
      x += ws[i] + 6;
    });
    if (!info.valid) view.screenText(box.x + box.w / 2, yTop + hh + 12, 'אין רשימת ייחוס בשם הזה', { size: 11.5, weight: 700, color: C.bad, halo: true });
    /* rows */
    info.rows.forEach(function (row, r) {
      const y = ROW_Y[r];
      view.screenText(box.x + 2, P.Y(y + 0.78), row.title, { size: 11.5, weight: 700, color: C.ink, align: 'left' });
      const shown = r < reveal && info.valid;
      const bars = shown ? row.bars : [{ lo: 0, hi: 200, label: '?', owner: 'none' }];
      bars.forEach(function (b) {
        const x0 = P.X(K4.lg(b.lo, XMIN)), x1 = P.X(Math.min(XMAX, Math.log10(b.hi)));
        const t = P.Y(y + 0.42), h = P.Y(y - 0.42) - t;
        ctx.save(); boxStyle(ctx, b.owner, false); rrect(ctx, x0, t, Math.max(3, x1 - x0), h, 5); ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.font = '600 10.5px Heebo, sans-serif'; const tw = ctx.measureText(b.label).width; ctx.restore();
        const fits = tw + 8 < x1 - x0;
        if (fits) view.screenText((x0 + x1) / 2, t + h / 2, b.label, { size: 10.5, weight: 600, color: shown ? C.ink : C.muted });
        else view.screenText(x1, P.Y(y + 0.78), b.label, { size: 10.5, weight: 600, color: C.ink, align: 'right', halo: true });
      });
    });
    if (o.marker) {
      const px = P.X(Math.log10(o.marker));
      const mc = C[o.markerColor || 'proton'];
      ctx.save(); ctx.strokeStyle = mc; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(px, P.Y(7.9)); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.restore();
      const leftSide = px - box.x > 110;
      view.screenText(leftSide ? px - 5 : px + 5, P.Y(7.95), o.markerLabel || K4.energyText(o.marker), { size: 11, weight: 700, color: mc, align: leftSide ? 'right' : 'left', halo: true });
    }
  }
  K4.drawList = drawList;
  K4.listAxis = { XMIN, XMAX };

  PHY.sims.physLists = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'card', base: 'QGSP_BIC', data: 'AllHP', em: 'EMZ', locked: true }, opts || {});
    const card = opts.mode === 'card';
    const P = PL.create(canvasEl, { x: [XMIN, XMAX], y: [0, 10.2], grid: false, margin: { l: 12, r: 12, t: 30, b: 34 }, aspect: 1.15, minHeight: 360, maxHeight: 480 });
    const view = P.view;
    const tw = PHY.tweens();
    const S = { reveal: card && opts.locked ? 0 : 4, marker: card && opts.locked ? null : 5, done: !card || !opts.locked };

    let readouts = null, ch = {};
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'lif', label: 'LiF ב-5 MeV: נייטרונים לפרוטון', color: 'var(--c-neutron)' },
        { key: 'who', label: 'מי מטפל בתגובה ב-5 MeV' },
      ]);
      const grid = U.h('div', { class: 'sim-grid' });
      controlsEl.appendChild(grid);
      ch.base = U.Choice(grid, { label: 'בסיס', options: K4.BASES.map((b) => ({ value: b, text: '<bdi>' + b + '</bdi>' })), value: opts.base, onChange: (v) => set('base', v) });
      ch.data = U.Choice(grid, { label: 'נתונים מוערכים', options: [{ value: '', text: 'בלי' }, { value: 'HP', text: '<bdi>_HP</bdi>' }, { value: 'AllHP', text: '<bdi>_AllHP</bdi>' }], value: opts.data, onChange: (v) => set('data', v) });
      ch.em = U.Choice(grid, { label: 'אלקטרומגנטי', options: [{ value: '', text: 'רגיל' }, { value: 'EMZ', text: '<bdi>_EMZ</bdi>' }], value: opts.em, onChange: (v) => set('em', v) });
      U.renderMath(controlsEl);
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    const info = () => K4.listInfo(opts.base, opts.data, opts.em);

    function syncAllHP() {
      if (!ch.data) return;
      const btn = ch.data.el.querySelectorAll('.choice-btn')[2];
      btn.disabled = opts.locked || opts.base !== 'QGSP_BIC';
    }
    function set(k, v) {
      opts[k] = v;
      if (k === 'base' && v !== 'QGSP_BIC' && opts.data === 'AllHP') { opts.data = 'HP'; ch.data.set('HP'); }
      syncAllHP();
      S.reveal = 4; S.marker = 5; S.done = true;
      paint(); loop.requestRender(); mark();
    }
    function paint() {
      if (!readouts) return;
      const I = info();
      readouts.set('lif', S.done ? I.lif5.text : '?');
      readouts.set('who', S.done ? F.ltr(I.all ? '_AllHP' : opts.base) : '?');
    }
    function lock(on) {
      opts.locked = on;
      Object.keys(ch).forEach((k) => ch[k].setEnabled(!on));
      syncAllHP();
    }
    function render() {
      view.clear();
      drawList(P, info(), { reveal: S.reveal, marker: S.marker, markerLabel: 'פרוטון, ' + F.ltr(K4.energyText(5)) });
      if (S.reveal < 4) K.mark(view, P.X(-3), P.Y(4), '?');
      K.clock(view, 'מה בתוך השם');
    }
    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        const T = seconds || 4;
        S.reveal = 0; S.marker = null; S.done = false;
        paint(); loop.start();
        return tw.run(T, function (k) {
          S.reveal = Math.min(4, Math.floor(k * 5 + 1e-9));
          if (k >= 0.8) S.marker = 5;
          if (k >= 1) { S.reveal = 4; S.done = true; lock(false); }
          paint(); loop.requestRender();
        });
      },
      setParam(k, v) {
        if (k === 'locked') { lock(v); return; }
        opts[k] = v;
        if (ch[k]) ch[k].set(v);
        syncAllHP();
        S.reveal = 4; S.marker = 5; S.done = true;
        paint(); loop.requestRender();
      },
      getState() { const I = info(); return { name: I.name, valid: I.valid, rows: I.rows, lif5: I.lif5, reveal: S.reveal, done: S.done }; },
    };
    lock(card ? opts.locked : false);
    paint();
    return api;
  };
})();
