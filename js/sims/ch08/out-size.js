/* PHY.sims.outSize: how big the output of a run will be, before it runs. The estimate counts bytes per event:
     primary (level 2): one row per event, one I column (4 bytes) and five D columns (8 bytes each) = 44 bytes
     the rest at level 2: the tables of rare events (leak, birth, reaction, residual) and the file's own
       structure, about 4 bytes per event, so that level 2 is about 48 bytes per event (an estimate)
     level 1: leak and residual only: 6126 leak rows in 3×10⁶ events (2.04×10⁻³ per event) of about
       112 bytes, plus a little residual: about 0.3 bytes per event
     level 0: only the summary (the JSON next to it is a few lines)
   extra: one more D column in primary adds 8 bytes per event.
   The file Geant4 writes is compressed, so the real file is smaller than this estimate.
   Drawing: one horizontal bar per part (primary, the rest, the extra column), in MB (10⁶ bytes).
   mode 'card': N = 3×10⁶ at level 2, bars hidden until play(seconds) grows them; then sliders and a level
   choice are free. mode 'trap': the bars of the run are shown, and play() grows the extra column.
   opts: {mode, N, level, extra, locked, chapter, section}.
   getState(): {N, level, extra, bytesPerEvent, parts: {primary, rest, extra} in MB, totalMB, ran}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K1 = PHY.ch01, K = PHY.ch08;
  const B_PRIMARY = 4 + 5 * 8, B_L2 = 48, B_L1 = 0.3, B_COL = 8;

  PHY.sims.outSize = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ mode: 'card', N: K.BE.N, level: 2, extra: false, locked: true }, opts || {});
    const trap = opts.mode === 'trap';
    const plot = PL.create(canvasEl, { x: [0, 200], y: [0, 3.2], grid: true, aspect: 1.55, minHeight: 250, maxHeight: 380, xLabel: 'גודל, הערכה', xUnit: 'MB', margin: { l: 14, r: 16, t: 36, b: 40 } });
    const view = plot.view;
    const tw = PHY.tweens();
    const S = { ran: !opts.locked || trap, grow: trap ? 1 : opts.locked ? 0 : 1, extraGrow: opts.extra ? 1 : 0 };

    function parts() {
      const N = opts.N;
      const lv = opts.level;
      const primary = lv >= 2 ? (B_PRIMARY * N) / 1e6 : 0;
      const rest = lv >= 2 ? ((B_L2 - B_PRIMARY) * N) / 1e6 : lv >= 1 ? (B_L1 * N) / 1e6 : 0;
      const extra = lv >= 2 && opts.extra ? (B_COL * N) / 1e6 : 0;
      return { primary, rest, extra };
    }
    const perEvent = () => (opts.level >= 2 ? B_L2 + (opts.extra ? B_COL : 0) : opts.level >= 1 ? B_L1 : 0);

    let readouts = null, sl = null, lv = null, tg = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'bpe', label: 'בייטים לאירוע' },
        { key: 'mb', label: 'גודל הקובץ, MB (לפני דחיסה)', color: 'var(--accent)' },
      ]);
      if (!trap) {
        lv = U.Choice(controlsEl, {
          label: 'רמת הפלט, ' + F.ltr('/ldns/out/level'),
          options: [{ value: 0, text: '0' }, { value: 1, text: '1' }, { value: 2, text: '2' }],
          value: opts.level,
          onChange: (v) => { opts.level = v; refresh(); },
        });
        const grid = U.h('div', { class: 'sim-grid' });
        controlsEl.appendChild(grid);
        sl = U.Slider(grid, { label: 'מספר האירועים \\(N\\)', min: 4, max: 8, step: 0.001, value: Math.log10(opts.N), format: (v) => F.sci(Math.pow(10, v), 1), color: 'var(--accent)', onInput: (v) => { opts.N = Math.round(Math.pow(10, v) / 1000) * 1000; refresh(); } });
        U.renderMath(controlsEl);
      }
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      tg = U.Toggle(row, 'עוד עמודה מסוג D בטבלה primary', { value: opts.extra, onChange: (v) => { opts.extra = v; S.extraGrow = v ? 1 : 0; refresh(); } });
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };
    function refresh() { fit(); paint(); loop.requestRender(); mark(); }

    function fit() {
      const p = parts();
      const tot = p.primary + p.rest + (trap ? (B_COL * opts.N) / 1e6 : p.extra);
      plot.setRange({ x: [0, PL.niceRange(0, Math.max(1e-3, tot * 1.12))[1]] });
    }

    function paint() {
      if (!readouts) return;
      const p = parts();
      const show = S.ran && S.grow >= 1 && (!trap || S.extraGrow >= 1 || !opts.extra);
      readouts.set('bpe', show ? F.num(perEvent(), perEvent() < 1 ? 1 : 0) : '?');
      readouts.set('mb', show ? F.num(p.primary + p.rest + p.extra, p.primary + p.rest + p.extra < 10 ? 2 : 0) : '?');
    }

    function lock(on) {
      opts.locked = on;
      if (sl) sl.setEnabled(!on);
      if (lv) lv.setEnabled(!on);
      if (tg) tg.input.disabled = on;
    }

    function render() {
      view.clear();
      plot.axes();
      K.hideY(plot);
      const p = parts();
      const ctx = view.ctx;
      const done = S.ran && S.grow >= 1;
      const restName = opts.level >= 2 ? 'leak, birth, reaction, residual' : opts.level === 1 ? F.ltr('leak') + ' ו-' + F.ltr('residual') : 'רמה 0: רק הסיכום';
      const lanes = [
        { key: 'primary', y: 2.45, label: done ? 'הטבלה ' + F.ltr('primary') + ': ' + F.num(B_PRIMARY, 0) + ' בייט לאירוע' : 'primary', v: p.primary, color: 'accent', grow: S.grow },
        { key: 'rest', y: 1.55, label: done && opts.level >= 2 ? 'כל השאר: כ-' + F.num(B_L2 - B_PRIMARY, 0) + ' בייט לאירוע' : restName, v: p.rest, color: 'neutron', grow: S.grow },
        { key: 'extra', y: 0.65, label: trap && S.extraGrow < 1 ? 'עמודה נוספת מסוג D בטבלה ' + F.ltr('primary') : 'עמודת D נוספת: ' + F.num(B_COL, 0) + ' בייט לאירוע', v: trap ? (B_COL * opts.N) / 1e6 : p.extra, color: 'ink', grow: S.extraGrow, hide: !opts.extra && !trap },
      ];
      lanes.forEach(function (L) {
        if (L.hide) return;
        const hh = 0.28;
        const visible = S.ran && L.grow > 0;
        if (visible) {
          plot.clip(function () {
            ctx.save();
            ctx.fillStyle = C[L.color]; ctx.globalAlpha = 0.55;
            ctx.fillRect(plot.X(0), plot.Y(L.y + hh), Math.max(1, plot.X(L.v * L.grow) - plot.X(0)), plot.Y(L.y - hh) - plot.Y(L.y + hh));
            ctx.restore();
          });
        }
        const lx = plot.X(0) + 6;
        view.screenText(lx, plot.Y(L.y + hh) - 9, L.label, { size: 11.5, weight: 700, color: C[L.color === 'ink' ? 'ink' : L.color], align: 'left', halo: true });
        if (visible && L.grow >= 1) {
          const vx = plot.X(L.v);
          const inside = vx > plot.box.x + plot.box.w * 0.72;
          view.screenText(inside ? vx - 6 : vx + 6, plot.Y(L.y), F.num(L.v, L.v < 10 ? 2 : 0) + ' MB', { size: 12, weight: 700, color: C.ink, align: inside ? 'right' : 'left', halo: true });
        } else if (!S.ran || (trap && L.key === 'extra' && L.grow < 1)) {
          K1.mark(view, plot.X(plot.range.x[1] * 0.5), plot.Y(L.y), '?', 22);
        }
      });
      K1.clock(view, F.ltr(F.sci(opts.N, 1)) + ' אירועים, רמה ' + opts.level);
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true;
        if (trap) { opts.extra = true; S.extraGrow = 0; if (tg) tg.set(true); }
        else S.grow = 0;
        fit(); paint(); loop.start();
        return tw.run(seconds || 3, function (k) {
          const e = PHY.ease ? PHY.ease.inOut(k) : k;
          if (trap) S.extraGrow = e; else S.grow = e;
          if (k >= 1) { if (trap) S.extraGrow = 1; else S.grow = 1; lock(false); }
          paint(); loop.requestRender();
        });
      },
      setParam(key, v) {
        if (key === 'locked') { lock(v); return; }
        opts[key] = v;
        if (key === 'extra') { S.extraGrow = v ? 1 : 0; if (tg) tg.set(!!v); }
        if (key === 'level' && lv) lv.set(v);
        if (key === 'N' && sl) sl.set(Math.log10(v));
        fit(); paint(); loop.requestRender();
      },
      getState() {
        const p = parts();
        return { N: opts.N, level: opts.level, extra: opts.extra, bytesPerEvent: perEvent(), parts: p, totalMB: p.primary + p.rest + p.extra, ran: S.ran };
      },
    };
    fit();
    lock(opts.locked);
    paint();
    return api;
  };
})();
