/* PHY.sims.visOffscreen: a picture without a screen. DOM-only: the first argument is a host <div>.
   picture_30J.mac runs in batch mode (./ldns -m ... -t 1) on a computer with no display: ldns.cc creates
   the Qt session only when no macro is given, /vis/open TSG_OFFSCREEN 1600x1000 draws into memory, and
   /vis/tsg/export writes the PNG. play() walks through the steps and ends with the real picture,
   ../assets/geometry_30J_Be4.png; before it only the command line is shown.
   opts: {locked}. getState(): {shown, total, file}. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const U = PHY.ui;
  const h = U.h;
  const L = PHY.fmt.ltr;
  const STEPS = [
    { cmd: '$ ./ldns -m picture_30J.mac -t 1', note: 'יש מאקרו אחרי ' + L('-m') + ', ולכן ldns לא פותח ממשק גרפי: ב-' + L('ldns.cc') + ' החלון נוצר רק כשאין מאקרו.' },
    { cmd: '/vis/open TSG_OFFSCREEN 1600x1000', note: 'מערכת ציור שמציירת לזיכרון: אין חלון, יש תמונה של 1600 על 1000 פיקסלים.' },
    { cmd: '/run/beamOn 300', note: '300 אירועים, והמסלולים שלהם נצברים בסצנה.' },
    { cmd: '/vis/viewer/rebuild', note: 'הצופה מצייר את הסצנה מחדש, עם כל המסלולים.' },
    { cmd: '/vis/tsg/export zb_png results/geometry_30J_Be4.png', note: 'הציור נכתב לקובץ PNG.', file: 'results/geometry_30J_Be4.png' },
  ];

  PHY.sims.visOffscreen = function (host, controlsEl, opts) {
    opts = Object.assign({ locked: true }, opts || {});
    host.classList.add('vis-off');
    host.setAttribute('data-no-iso', '');
    const term = h('div', { class: 'vis-term', dir: 'ltr' });
    const img = h('img', { class: 'vis-off-img', src: '../assets/geometry_30J_Be4.png', loading: 'lazy', width: '1600', height: '1000', alt: 'התמונה שנכתבה: מבט אלכסוני על דיסקת Be בעובי 4 mm בשלד, עם קונוס של 300 מסלולי פרוטונים אדומים מהמקור, וצירים קטנים במקור.' });
    const fig = h('div', { class: 'vis-off-fig', hidden: true }, [img]);
    host.appendChild(h('div', { class: 'vis-off-head', text: 'מחשב בלי מסך, דרך ssh' }));
    host.appendChild(term);
    host.appendChild(fig);
    const S = { shown: 0, file: null };
    function paint(n) {
      term.innerHTML = '';
      STEPS.forEach(function (s, i) {
        if (i > 0 && i >= n) return;
        term.appendChild(h('div', { class: 't-cmd', text: s.cmd }));
        if (i < n) term.appendChild(h('div', { class: 't-note', dir: 'rtl', text: s.note }));
        if (i < n && s.file) term.appendChild(h('div', { class: 't-file', text: 'wrote ' + s.file }));
      });
      fig.hidden = n < STEPS.length;
    }
    const tw = PHY.tweens();
    const loop = PHY.SimLoop({ canvas: host, step: (dt) => tw.step(dt), render() {} });
    const api = {
      start: loop.start,
      stop: loop.stop,
      reset() { tw.clear(); S.shown = 0; S.file = null; paint(0); },
      play(seconds) {
        tw.clear();
        S.shown = 0; S.file = null;
        paint(0);
        loop.start();
        return tw.run(seconds || 5, function (k) {
          const n = Math.min(STEPS.length, Math.floor(k * (STEPS.length + 0.5)));
          if (n !== S.shown) { S.shown = n; if (n === STEPS.length) S.file = STEPS[STEPS.length - 1].file; paint(n); }
          if (k >= 1) { S.shown = STEPS.length; S.file = STEPS[STEPS.length - 1].file; paint(S.shown); }
        });
      },
      setParam() {},
      getState() { return { shown: S.shown, total: STEPS.length, file: S.file }; },
    };
    paint(0);
    return api;
  };
})();
