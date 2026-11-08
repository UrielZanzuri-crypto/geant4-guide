/* PHY.sims.outFileName: what /analysis/setFileName does with a dot. Geant4 takes the part of the file name after
   the last dot as its extension, and the extension as the output type (root, csv, hdf5, xml). A name without
   a dot gets the default type that ldns sets, root. For any other extension Geant4 prints a warning that the
   type is not supported and writes no ROOT file; the run itself goes on and ldns still prints its summary
   and writes the _summary.json.
   parse(name) does the same split: {base, ext, type, root (a ROOT file is written)}.
   The canvas is a schematic terminal: the command line, then, stage by stage during play(seconds), how the name
   is split, the warning, the summary, and the output folder. Before the run only the command line is shown.
   Free play after the reveal: a choice between the two names (with a dot, as M2.5, or with p, as M2p5).
   opts: {name, alt, locked}. getState(): {ran, stage, name, parsed}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K1 = PHY.ch01;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const TYPES = ['root', 'csv', 'hdf5', 'xml'];

  function parse(name) {
    const file = name.split('/').pop();
    const i = file.lastIndexOf('.');
    const ext = i > 0 ? file.slice(i + 1) : '';
    const base = ext ? name.slice(0, name.length - ext.length - 1) : name;
    const type = ext ? (TYPES.includes(ext) ? ext : null) : 'root';
    return { base, ext, type, root: type === 'root' };
  }

  PHY.sims.outFileName = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ name: 'output/E30J_M2.5_Be2', alt: 'output/E30J_M2p5_Be2', locked: true }, opts || {});
    const view = PHY.canvas.create(canvasEl, { world: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, aspect: 1.35, minHeight: 300, maxHeight: 420, padding: 0 });
    const tw = PHY.tweens();
    const S = { ran: false, stage: 0, name: opts.name };

    let choice = null;
    if (controlsEl) {
      choice = U.Choice(controlsEl, {
        label: 'השם בפקודה',
        options: [{ value: opts.name, text: F.ltr(opts.name.split('/').pop()) }, { value: opts.alt, text: F.ltr(opts.alt.split('/').pop()) }],
        value: opts.name,
        onChange: (v) => { S.name = v; S.stage = 4; loop.requestRender(); },
      });
    }
    /* The second name would hint at the answer, so the choice appears only after the run. */
    function lock(on) { opts.locked = on; if (choice) { choice.setEnabled(!on); choice.el.hidden = on; } }

    function render() {
      view.clear();
      const ctx = view.ctx, W = view.w, H = view.h;
      const small = W < 420;
      const fs = small ? 11.5 : 13;
      const p = parse(S.name);
      /* the terminal box */
      ctx.save();
      ctx.fillStyle = C.shade; ctx.globalAlpha = 0.55;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(8, 8, W - 16, H - 16, 10); else ctx.rect(8, 8, W - 16, H - 16);
      ctx.fill();
      ctx.restore();
      const x0 = 20;
      let y = 32;
      const line = (str, o) => { view.screenText(o && o.x !== undefined ? o.x : x0, y, str, Object.assign({ size: fs, align: 'left', font: MONO, color: C.ink }, o || {})); };
      const heb = (str, o) => { view.screenText(W - 20, y, str, Object.assign({ size: fs, align: 'right', weight: 600, color: C.ink }, o || {})); };
      /* 1: the command, the extension in color after stage 1 */
      const cmd = '/analysis/setFileName ';
      line(cmd, { color: C.muted });
      ctx.save(); ctx.font = '500 ' + fs + 'px ' + MONO; let wc = ctx.measureText(cmd).width; ctx.restore();
      ctx.save(); ctx.font = '700 ' + fs + 'px ' + MONO; const wn = ctx.measureText(S.name).width; ctx.restore();
      if (x0 + wc + wn > W - 22) { y += 22; wc = 18; }
      if (S.stage >= 1 && p.ext) {
        line(p.base + '.', { x: x0 + wc, weight: 700 });
        ctx.save(); ctx.font = '700 ' + fs + 'px ' + MONO; const wb = ctx.measureText(p.base + '.').width; ctx.restore();
        line(p.ext, { x: x0 + wc + wb, weight: 700, color: C.bad });
      } else line(S.name, { x: x0 + wc, weight: 700 });
      y += 34;
      if (S.stage >= 1) {
        heb(p.ext ? 'אחרי הנקודה: הסיומת ' + F.ltr(p.ext) : 'אין נקודה: הסוג הוא ברירת המחדל, ' + F.ltr('root'));
        y += 26;
        heb(p.ext ? 'וסוג פלט כזה לא קיים' : 'כמו שהוגדר ב-' + F.ltr('RunAction.cc'), { color: p.ext ? C.bad : C.muted, weight: 500 });
        y += 32;
      }
      if (S.stage >= 2) {
        if (!p.root) { line('... is not supported.', { color: C.bad, weight: 700 }); heb('אזהרה, בתוך הלוג', { color: C.bad, weight: 500 }); }
        else heb('בלי אזהרה', { color: C.muted, weight: 500 });
        y += 32;
      }
      if (S.stage >= 3) {
        heb('הריצה נגמרת, והסיכום מודפס כרגיל', { color: C.good });
        y += 34;
      }
      if (S.stage >= 4) {
        line('output/', { weight: 700 });
        y += 24;
        const file = S.name.split('/').pop();
        line('  ' + file + '_summary.json', { weight: 600 });
        heb('נכתב', { color: C.good });
        y += 22;
        line('  ' + file + '.root', { weight: 600, color: p.root ? C.ink : C.muted });
        heb(p.root ? 'נכתב' : 'לא נכתב', { color: p.root ? C.good : C.bad, weight: 700 });
        if (!p.root) {
          ctx.save();
          ctx.font = '600 ' + fs + 'px ' + MONO;
          const ww = ctx.measureText('  ' + file + '.root').width;
          ctx.strokeStyle = C.bad; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x0 + 14, y); ctx.lineTo(x0 + ww, y); ctx.stroke();
          ctx.restore();
        }
      }
      if (!S.ran) K1.mark(view, W / 2, H * 0.58);
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      play(seconds) {
        tw.clear();
        S.ran = true; S.stage = 0; S.name = opts.name;
        if (choice) choice.set(opts.name);
        loop.start();
        return tw.run(seconds || 4, function (k) {
          S.stage = Math.min(4, Math.floor(5 * k + 1e-9));
          if (k >= 1) { S.stage = 4; lock(false); }
          loop.requestRender();
        });
      },
      parse,
      setParam(key, v) { if (key === 'locked') lock(v); else if (key === 'name') { S.name = v; if (choice) choice.set(v); } else opts[key] = v; loop.requestRender(); },
      getState() { return { ran: S.ran, stage: S.stage, name: S.name, parsed: parse(S.name) }; },
    };
    lock(opts.locked);
    return api;
  };
  PHY.sims.outFileName.parse = parse;
})();
