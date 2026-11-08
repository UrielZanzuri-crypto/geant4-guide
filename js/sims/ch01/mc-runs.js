/* PHY.sims.mcRuns: the same simulation, run again and again. A toy run sends N protons into the converter,
   and each one makes a neutron with probability p, so the count of one run is a binomial draw
   (PHY.ch01.binomial). Run 1 is the count the question gives (opts.first). play(seconds) adds runs 2..R,
   each with its own seed from a master generator, one dot at a time; then the band mean ± standard
   deviation and the readouts appear. Before the run the other dots and all readouts are hidden ("?").
   After the reveal: a toggle "same seed" (every run uses opts.seed, as -s does in ldns) and a button for
   another batch of R runs. batch() makes a full batch at once (tests, and the button).
   opts: {N, p, first, runs, seed, master, locked, chapter, section}.
   getState(): {counts, mean, sd, expected (Np), sqrtN (√(Np)), sameSeed, ran, shown, batches}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot, K = PHY.ch01;

  PHY.sims.mcRuns = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ N: 3e6, p: 4.47e-4, first: 1341, runs: 20, seed: 12345, master: 2026, locked: true }, opts || {});
    const mu = opts.N * opts.p;
    const sd0 = Math.sqrt(mu * (1 - opts.p));
    const plot = PL.create(canvasEl, {
      x: [0, opts.runs + 1], y: [Math.round(mu - 5.4 * sd0), Math.round(mu + 5.4 * sd0)],
      xLabel: 'מספר הריצה', yLabel: 'נייטרונים שיצאו', yColor: 'neutron', aspect: 1.7, minHeight: 260, maxHeight: 400,
    });
    const view = plot.view;
    const tw = PHY.tweens();
    const master = PHY.random(opts.master);
    const S = { counts: [opts.first], prev: null, shown: 1, ran: !opts.locked, sameSeed: false, batches: 0, given: true };

    let readouts = null, toggle = null, again = null;
    if (controlsEl) {
      readouts = U.Readouts(controlsEl, [
        { key: 'mean', label: 'ממוצע הריצות', color: 'var(--c-neutron)' },
        { key: 'sd', label: 'פיזור: סטיית התקן', color: 'var(--c-neutron)' },
        { key: 'root', label: 'השורש של הממוצע' },
      ]);
      const row = U.h('div', { class: 'sim-row' });
      controlsEl.appendChild(row);
      toggle = U.Toggle(row, 'אותו זרע בכל ריצה (כמו ' + F.ltr('-s ' + opts.seed) + ')', { value: false, onChange: (v) => { S.sameSeed = v; api.batch(); mark(); } });
      again = U.Button(row, 'עוד ' + opts.runs + ' ריצות', () => { api.batch(); mark(); }, { primary: true });
    }
    const mark = () => { if (opts.chapter && opts.section) PHY.progress.markSection(opts.chapter, opts.section); };

    function runOnce() {
      const seed = S.sameSeed ? opts.seed : master.int(1, 2147483646);
      return K.binomial(opts.N, opts.p, PHY.random(seed).next);
    }

    function stats(list) {
      const n = list.length;
      if (!n) return { mean: NaN, sd: NaN };
      const m = list.reduce((a, b) => a + b, 0) / n;
      const v = n > 1 ? list.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1) : 0;
      return { mean: m, sd: Math.sqrt(v) };
    }

    function paint() {
      if (!readouts) return;
      const done = S.ran && S.shown >= S.counts.length;
      const st = stats(S.counts.slice(0, S.shown));
      readouts.set('mean', done ? F.num(st.mean, 0) : '?');
      readouts.set('sd', done ? F.num(st.sd, 1) : '?');
      readouts.set('root', done ? F.num(Math.sqrt(st.mean), 1) : '?');
    }

    function lock(on) {
      opts.locked = on;
      if (toggle) toggle.input.disabled = on;
      if (again) again.disabled = on;
    }

    function render() {
      view.clear();
      plot.axes();
      const done = S.ran && S.shown >= S.counts.length;
      if (done) {
        const st = stats(S.counts);
        const xs = [0, opts.runs + 1];
        K.band(plot, xs, [st.mean - st.sd, st.mean - st.sd], [st.mean + st.sd, st.mean + st.sd], { color: 'neutron', alpha: 0.13 });
        plot.hline(st.mean, { color: 'ink', dash: [6, 5] });
        plot.legend([{ label: S.sameSeed ? 'אותו זרע: אותו מספר' : 'ממוצע ± סטיית תקן', color: 'ink', dash: [6, 5] }], { corner: 'left' });
      }
      if (S.prev) S.prev.forEach(function (c, i) { plot.marker(i + 1, c, { color: 'muted', r: 3, shape: 'dot' }); });
      for (let i = 0; i < S.shown; i++) {
        const first = i === 0 && S.given;
        plot.marker(i + 1, S.counts[i], { color: 'neutron', r: first ? 6 : 4.5, shape: first ? 'ring' : 'dot', label: first ? F.num(S.counts[0], 0) : null });
      }
      if (!S.ran) K.mark(view, plot.X(opts.runs * 0.6), plot.Y(mu));
      K.clock(view, 'פרוטונים בכל ריצה: ' + F.sci(opts.N, 0));
    }

    const loop = PHY.SimLoop({ view, step: (dt) => tw.step(dt), render });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      /* Runs 2..R appear one by one over `seconds`. */
      play(seconds) {
        S.ran = true;
        for (let i = S.counts.length; i < opts.runs; i++) S.counts.push(runOnce());
        S.shown = 1;
        paint();
        loop.start();
        const n = S.counts.length;
        return tw.run(seconds || 3.5, function (k) {
          S.shown = Math.max(1, Math.min(n, 1 + Math.floor(k * (n - 1) + 1e-9)));
          if (k >= 1) { S.shown = n; lock(false); }
          paint();
          loop.requestRender();
        });
      },
      /* A whole new batch of R runs at once. The previous batch stays in grey. */
      batch() {
        tw.clear();
        S.prev = S.counts.slice();
        S.counts = [];
        for (let i = 0; i < opts.runs; i++) S.counts.push(runOnce());
        S.shown = S.counts.length;
        S.ran = true;
        S.given = false;
        S.batches++;
        paint();
        loop.requestRender();
        return S.counts.slice();
      },
      setParam(key, v) {
        if (key === 'locked') lock(v);
        else if (key === 'sameSeed') { S.sameSeed = !!v; if (toggle) toggle.set(!!v); }
        else opts[key] = v;
        paint();
        loop.requestRender();
      },
      getState() {
        const st = stats(S.counts.slice(0, S.shown));
        return { counts: S.counts.slice(), mean: st.mean, sd: st.sd, expected: mu, sqrtN: Math.sqrt(mu), sameSeed: S.sameSeed, ran: S.ran, shown: S.shown, batches: S.batches };
      },
    };
    lock(opts.locked);
    paint();
    return api;
  };
})();
