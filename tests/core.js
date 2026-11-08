/* Engine unit tests: PHY.cx, PHY.fft, PHY.pulse, PHY.fmt, PHY.plot, PHY.course, PHY.colors, PHY.coach and small ui helpers.
   Runs inside tests/physics.html (all tests) or tests/physics.html?only=core. */
PHY_T.add(async function (T) {
  var C = PHY.cx, FF = PHY.fft, P = PHY.pulse, F = PHY.fmt, PL = PHY.plot;
  var LN2 = Math.LN2, PI = Math.PI;

  await T.test('מנוע: מספרים מרוכבים', async function () {
    var a = C.cx(1, 2), b = C.cx(3, -1);
    var m = C.mul(a, b);
    T.near('(1+2i)(3−i): ממשי', 5, m.re, 1e-12);
    T.near('(1+2i)(3−i): מדומה', 5, m.im, 1e-12);
    var d = C.div(m, b);
    T.near('חילוק מחזיר את 1+2i', 0, C.abs(C.sub(d, a)), 1e-12);
    T.near('|3+4i|', 5, C.abs(C.cx(3, 4)), 1e-12);
    T.near('z z* = |z|²', C.abs2(a), C.mul(a, C.conj(a)).re, 1e-12);
    T.near('z z* ממשי', 0, C.mul(a, C.conj(a)).im, 1e-12);
    T.near('arg(i) = π/2', PI / 2, C.arg(C.I), 1e-12);
    var e = C.exp(C.cx(0, PI));
    T.near('e^{iπ} = −1', -1, e.re, 1e-12);
    T.near('e^{iπ}: חלק מדומה', 0, e.im, 1e-12);
    var p = C.polar(2, PI / 3);
    T.near('polar(2, π/3): ממשי', 1, p.re, 1e-12);
    T.near('polar(2, π/3): מדומה', Math.sqrt(3), p.im, 1e-12);
    var z1 = C.cx(0.3, 1.1), z2 = C.cx(-0.2, 0.4);
    T.near('e^a e^b = e^{a+b}', 0, C.abs(C.sub(C.mul(C.exp(z1), C.exp(z2)), C.exp(C.add(z1, z2)))), 1e-12);
    T.near('אוילר: Re e^{iθ} = cos θ', Math.cos(0.7), C.expi(0.7).re, 1e-12);
    T.near('סכום של שלושה', 0, C.abs(C.sub(C.sum([a, b, C.ONE]), C.cx(5, 1))), 1e-12);
    T.near('מספר רגיל מתקבל כממשי', 6, C.mul(a, 3).im, 1e-12);
    C.add(a, b);
    T.same('הארגומנטים לא משתנים', '1,2', a.re + ',' + a.im);
    T.same('format', '1 + 2i', F.plain(C.format(a, 2)));
    T.same('format עם מינוס', '3 − 1i', F.plain(C.format(b, 2)));
  });

  await T.test('מנוע: FFT', async function () {
    var n = 256, i;
    var rnd = PHY.random(7).next;
    var re = new Float64Array(n), im = new Float64Array(n);
    for (i = 0; i < n; i++) { re[i] = rnd() - 0.5; im[i] = rnd() - 0.5; }
    var r0 = Float64Array.from(re), i0 = Float64Array.from(im);
    var e0 = 0;
    for (i = 0; i < n; i++) e0 += re[i] * re[i] + im[i] * im[i];
    FF.fft(re, im);
    var e1 = 0;
    for (i = 0; i < n; i++) e1 += re[i] * re[i] + im[i] * im[i];
    T.rel('פרסבל בדיד: Σ|x|² = Σ|X|²/N', e0, e1 / n, 1e-12);
    FF.ifft(re, im);
    var err = 0;
    for (i = 0; i < n; i++) err = Math.max(err, Math.abs(re[i] - r0[i]), Math.abs(im[i] - i0[i]));
    T.near('ifft(fft(x)) = x', 0, err, 1e-12);

    var tone = new Float64Array(64), toneI = new Float64Array(64);
    for (i = 0; i < 64; i++) { tone[i] = Math.cos((2 * PI * 5 * i) / 64); toneI[i] = Math.sin((2 * PI * 5 * i) / 64); }
    FF.fft(tone, toneI);
    T.near('e^{+2πi·5n/N}: שיא בתא 5', 64, tone[5], 1e-9);
    T.near('ושאר התאים ריקים', 0, Math.abs(tone[59]) + Math.abs(tone[6]), 1e-9);

    var w = FF.freqAxis(8, 0.5);
    T.near('ציר תדר: אפס באמצע', 0, w[4], 1e-15);
    T.near('ציר תדר: צעד 2π/(N dt)', (2 * PI) / 4, w[5] - w[4], 1e-12);
    T.same('fftshift ואז ifftshift', '0,1,2,3,4,5,6', Array.from(FF.ifftshift(FF.fftshift([0, 1, 2, 3, 4, 5, 6]))).join(','));
    T.same('fftshift של 0..7', '4,5,6,7,0,1,2,3', Array.from(FF.fftshift([0, 1, 2, 3, 4, 5, 6, 7])).join(','));

    /* A Gaussian transforms into a Gaussian: E(t) = e^{−t²/2σ²}  ->  σ√(2π) e^{−σ²ω²/2}, with zero phase. */
    var N = 1024, dt = 0.25, s = 6;
    var t = FF.timeAxis(N, dt), g = new Float64Array(N);
    for (i = 0; i < N; i++) g[i] = Math.exp((-t[i] * t[i]) / (2 * s * s));
    var sp = FF.spectrum(g, new Float64Array(N), dt);
    var k0 = N / 2, worst = 0, ph = 0;
    for (i = -40; i <= 40; i += 8) {
      var om = sp.omega[k0 + i];
      var expect = s * Math.sqrt(2 * PI) * Math.exp((-s * s * om * om) / 2);
      worst = Math.max(worst, Math.abs(sp.re[k0 + i] - expect) / (s * Math.sqrt(2 * PI)));
      if (Math.abs(i) <= 16) ph = Math.max(ph, Math.abs(sp.phase[k0 + i]));
    }
    T.near('גאוסיאן הופך לגאוסיאן: סטייה יחסית', 0, worst, 1e-9);
    T.near('ובלי פאזה ספקטרלית', 0, ph, 1e-9);
    var et = 0, ew = 0, dw = sp.omega[1] - sp.omega[0];
    for (i = 0; i < N; i++) { et += g[i] * g[i] * dt; ew += (sp.S[i] * dw) / (2 * PI); }
    T.rel('פרסבל רציף: ∫|E|²dt = ∫S dω/2π', et, ew, 1e-9);

    /* Shift theorem: E(t − τ) has the spectral phase φ(ω) = ωτ (φ = −arg Ẽ). */
    var tau = 7, gs = new Float64Array(N);
    for (i = 0; i < N; i++) gs[i] = Math.exp((-(t[i] - tau) * (t[i] - tau)) / (2 * s * s));
    var ss = FF.spectrum(gs, new Float64Array(N), dt);
    var slope = (ss.phase[k0 + 12] - ss.phase[k0 - 12]) / (ss.omega[k0 + 12] - ss.omega[k0 - 12]);
    T.same('חסימת פאזה: NaN היכן שהספקטרום חלש', true, isNaN(ss.phase[k0 + 40]));
    T.near('משפט ההזזה: dφ/dω = τ', tau, slope, 1e-9);
    T.near('ואותו ספקטרום', sp.S[k0 + 10], ss.S[k0 + 10], 1e-9);
    var back = FF.fromSpectrum(ss.re, ss.im, dt);
    var eb = 0;
    for (i = 0; i < N; i++) eb = Math.max(eb, Math.abs(back.re[i] - gs[i]), Math.abs(back.im[i]));
    T.near('fromSpectrum מחזיר את השדה', 0, eb, 1e-12);

    var wrapped = [], j;
    for (j = 0; j < 50; j++) wrapped.push(Math.atan2(Math.sin(0.9 * j), Math.cos(0.9 * j)));
    var un = FF.unwrap(wrapped);
    T.near('unwrap של פאזה לינארית', 0.9 * 49, un[49], 1e-9);
    wrapped[10] = NaN;
    T.near('unwrap מדלג על NaN', 0.9 * 49, FF.unwrap(wrapped)[49], 1e-9);

    var nx = 8, ny = 4, a2 = new Float64Array(nx * ny), b2 = new Float64Array(nx * ny);
    a2[0] = 1;
    FF.fft2(a2, b2, nx, ny);
    var flat = 0;
    for (i = 0; i < nx * ny; i++) flat = Math.max(flat, Math.abs(a2[i] - 1) + Math.abs(b2[i]));
    T.near('fft2 של דלתא הוא קבוע', 0, flat, 1e-12);
    for (i = 0; i < nx * ny; i++) { a2[i] = rnd(); b2[i] = 0; }
    var a20 = Float64Array.from(a2);
    FF.fft2(a2, b2, nx, ny); FF.ifft2(a2, b2, nx, ny);
    var e2 = 0;
    for (i = 0; i < nx * ny; i++) e2 = Math.max(e2, Math.abs(a2[i] - a20[i]));
    T.near('ifft2(fft2(x)) = x', 0, e2, 1e-12);
    var threw = false;
    try { FF.fft(new Float64Array(6), new Float64Array(6)); } catch (x) { threw = true; }
    T.same('N שאינו חזקה של 2 נדחה', true, threw);
  });

  await T.test('מנוע: פולסים', async function () {
    var E = P.gaussian({ n: 2048, dt: 0.5, tau: 20 });
    var W = P.widths(E);
    T.near('FWHM בזמן', 20, W.tauFwhm, 0.01);
    T.rel('TBP של גאוסיאן בלי צ\'ירפ: 0.441', 0.441, W.tbp, 0.02);
    T.rel('והקבוע עצמו 2ln2/π', 0.4413, P.TBP_GAUSS, 1e-3);

    var G = P.applySpectralPhase(E, { gdd: 200 });
    var tOut = P.widths(G).tauFwhm;
    T.rel('התרחבות ב-GDD = 200 fs² מול הנוסחה', P.broadenedFwhm(20, 200), tOut, 0.005);
    T.near('הנוסחה עצמה: 34.19 fs', 34.19, P.broadenedFwhm(20, 200), 0.01);
    T.rel('הספקטרום לא השתנה (TBP גדל באותו יחס)', 0.441 * tOut / 20, P.widths(G).tbp, 0.02);
    /* After GDD the instantaneous frequency is linear, rising (positive chirp), with slope
       4·GDD / (1/Γ² + 4·GDD²), Γ = 2 ln2 / τ². */
    var wi = P.instFreq(G), k0 = 1024, gam = (2 * LN2) / 400;
    var slope = (wi[k0 + 20] - wi[k0 - 20]) / (G.t[k0 + 20] - G.t[k0 - 20]);
    T.rel('GDD חיובי: שיפוע התדר הרגעי', (4 * 200) / (1 / (gam * gam) + 4 * 200 * 200), slope, 1e-3);
    var ph = P.phase(G);
    T.same('ו-φ(t) קעור (מינוס t²), לפי ω = ω0 − dφ/dt', true, ph[k0 + 20] < ph[k0]);

    var sp = P.spectrum(G);
    var dw = sp.omega[k0 + 4] - sp.omega[k0];
    T.near('פאזה ספקטרלית אחרי GDD: φ(ω) = GDD·Δω²/2', 100 * dw * dw, sp.phase[k0 + 4] - sp.phase[k0], 1e-6);

    var Ch = P.gaussian({ n: 2048, dt: 0.25, tau: 40, omega0: 2.0, chirp: 0.004 });
    var f = P.instFreq(Ch);
    T.near('צ\'ירפ לינארי: ω(0) = ω0', 2.0, f[1024], 1e-6);
    T.near('ω(+10 fs) = ω0 + 0.004·10', 2.04, f[1024 + 40], 1e-6);
    T.near('ω(−10 fs) = ω0 − 0.004·10', 1.96, f[1024 - 40], 1e-6);
    var pc = P.phase(Ch);
    T.near('φ(10 fs) − φ(0) = −½·0.004·100', -0.2, pc[1024 + 40] - pc[1024], 1e-6);
    var spc = P.spectrum(Ch), best = 0, at = 0;
    for (var i = 0; i < spc.S.length; i++) if (spc.S[i] > best) { best = spc.S[i]; at = spc.omega[i]; }
    T.near('הספקטרום יושב ב-+ω0 (המוסכמה e^{−iωt})', 2.0, at, 0.02);

    var D = P.delay(E, 15), I = P.intensity(D), m = 0, s = 0;
    for (i = 0; i < I.length; i++) { m += D.t[i] * I[i]; s += I[i]; }
    T.near('delay(E, 15 fs): מרכז הכובד', 15, m / s, 1e-6);
    var Ig = P.intensity(E);
    T.rel('rms של עוצמה גאוסית = τ/(2√(2ln2))', 20 / (2 * Math.sqrt(2 * LN2)), P.rms(E.t, Ig), 1e-6);
    T.near('fwhm של משולש', 2, P.fwhm([-2, -1, 0, 1, 2], [0, 0.5, 1, 0.5, 0]), 1e-12);
    T.near('ω של 800 nm', 2.3562, P.omegaOf(800), 1e-4);
    T.near('λ חזרה', 800, P.lambdaOf(P.omegaOf(800)), 1e-9);
  });

  await T.test('מנוע: עיצוב מספרים', async function () {
    T.same('unit עם בידוד LTR', '⁦375 THz⁩', F.unit(375, 'THz', 0));
    T.same('unit של מפתח', 'µm⁻¹', F.unitName('um-1'));
    T.same('מינוס מוגן', '⁦‎−3 fs⁩', F.unit(-3, 'fs', 1));
    T.same('יחידה בעברית מקבלת בידוד RTL', '⁧', F.unit(45, 'מעלות').charAt(0));
    T.same('deg', '45°', F.plain(F.deg(45)));
    T.same('sci 3e8', '3.0×10⁸', F.plain(F.sci(3e8)));
    T.same('sci עם יחידה', '3.0×10⁸ m/s', F.plain(F.sci(3e8, 1, 'm/s')));
    T.same('sci שלילי וחזקה שלילית', '−2.5×10⁻⁷', F.plain(F.sci(-2.5e-7, 1)));
    T.same('sci מעגל ל-10', '1.0×10⁸', F.plain(F.sci(9.96e7, 1)));
    T.same('sci בידוד', true, F.sci(3e8).charAt(0) === '⁦' && F.sci(3e8).slice(-1) === '⁩');
    T.same('prefix: 1.2e-13 s', '120 fs', F.plain(F.prefix(1.2e-13, 's')));
    T.same('prefix: 3.75e14 Hz', '375 THz', F.plain(F.prefix(3.75e14, 'Hz')));
    T.same('prefix: 8e-7 m', '800 nm', F.plain(F.prefix(8e-7, 'm')));
    T.same('prefix: 2.667e-15 s', '2.67 fs', F.plain(F.prefix(2.667e-15, 's')));
    T.same('prefix: עיגול שעובר ל-1000', '1 s', F.plain(F.prefix(0.999999, 's')));
    T.same('auto בוחר sci', '3.00×10⁸ m/s', F.plain(F.auto(3e8, 'm/s')));
    T.same('num בלי מינוס לאפס', '0', F.num(-0.001, 2));
    T.near('parse 3e8', 3e8, F.parse('3e8'), 1e-6);
    T.near('parse 3×10^8', 3e8, F.parse('3×10^8'), 1e-6);
    T.near('parse פסיק', 1.5, F.parse('1,5'), 1e-12);
    T.near('parse מינוס יוניקוד', -2, F.parse('−2'), 1e-12);
    T.same('parse זבל', true, isNaN(F.parse('abc')));
    T.near('parse של פלט num', -3.5, F.parse(F.num(-3.5, 1)), 1e-12);
  });

  await T.test('מנוע: גרפים וצבעים', async function () {
    var valid = function (c) { return /^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/.test(c) && (!window.CSS || CSS.supports('color', c)); };
    var all = [300, 380, 450, 520, 550, 580, 650, 700, 780, 900].every(function (nm) { return valid(PL.wavelengthColor(nm)) && valid(PL.wavelengthColor(nm, { theme: 'dark' })); });
    T.same('wavelengthColor נותן CSS תקין', true, all);
    var g = PL.wavelengthColor.rgb(530, { raw: true }), b = PL.wavelengthColor.rgb(450, { raw: true }), r = PL.wavelengthColor.rgb(650, { raw: true });
    T.same('530 nm ירוק', true, g[1] > g[0] && g[1] > g[2]);
    T.same('450 nm כחול', true, b[2] > b[0] && b[2] > b[1]);
    T.same('650 nm אדום', true, r[0] > r[1] && r[0] > r[2]);
    var yl = PL.wavelengthColor.rgb(575, { theme: 'light' }), yd = PL.wavelengthColor.rgb(575, { theme: 'dark' });
    T.same('צהוב כהה יותר במצב בהיר', true, yl[0] + yl[1] < yd[0] + yd[1]);
    var vd = PL.wavelengthColor.rgb(400, { theme: 'dark' }), vr = PL.wavelengthColor.rgb(400, { raw: true });
    T.same('סגול בהיר יותר במצב כהה', true, vd[0] + vd[1] + vd[2] > vr[0] + vr[1] + vr[2]);
    T.same('viridis(0)', 'rgb(68, 1, 84)', PL.cmap('viridis')(0));
    T.same('inferno(1)', 'rgb(252, 255, 164)', PL.cmap('inferno')(1));
    T.same('grey(0.5)', 'rgb(128, 128, 128)', PL.cmap('grey')(0.5));
    T.same('spectral מחזיר צבע', true, valid(PL.cmap('spectral')(0.5)));
    T.near('niceStep(10, 5)', 2, PL.niceStep(10, 5), 1e-12);
    T.near('niceStep(0.7, 5)', 0.2, PL.niceStep(0.7, 5), 1e-12);

    var cv = document.createElement('canvas');
    T.stage.appendChild(cv);
    var plot = PL.create(cv, { x: [-10, 10], y: [0, 1], y2: [-3, 3], xLabel: 't', xUnit: 'fs', yLabel: 'I', y2Label: 'φ', y2Unit: 'rad', yColor: 'gamma', y2Color: 'volume' });
    var bx = plot.box;
    T.near('X(min) בקצה התיבה', bx.x, plot.X(-10), 1e-9);
    T.near('Y(max) בראש התיבה', bx.y, plot.Y(1), 1e-9);
    var d = plot.toData(plot.X(3), plot.Y(0.25));
    T.near('toData הלוך ושוב: x', 3, d.x, 1e-9);
    T.near('toData הלוך ושוב: y', 0.25, d.y, 1e-9);
    var z = [], j, i;
    for (j = 0; j < 32; j++) { var row = []; for (i = 0; i < 64; i++) row.push(Math.exp(-((i - 32) * (i - 32) + (j - 16) * (j - 16)) / 50)); z.push(row); }
    var ok = true;
    try {
      plot.clear(); plot.axes();
      plot.heatmap(z, { x: [-10, 10], y: [0, 1], cmap: 'inferno' });
      plot.heatmap({ nx: 64, ny: 32, data: [].concat.apply([], z) }, { x: [-10, 10], y: [0, 1], cmap: 'viridis', log: true });
      var xs = [], ys = [];
      for (i = 0; i < 100; i++) { xs.push(-10 + i * 0.2); ys.push(i % 30 === 0 ? NaN : Math.sin(i / 10)); }
      plot.line(xs, ys, { color: 'volume', axis: 'y2' }).fill(xs, ys.map(Math.abs), { color: 'gamma' });
      plot.marker(0, 0.5, { shape: 'ring', label: 'x' }).vline(1, { label: 'a' }).hline(0.5).text(0, 0.8, 'טקסט');
      plot.legend([{ label: 'I(t)', color: 'gamma' }, { label: 'φ(t)', color: 'volume' }]);
    } catch (e) { ok = String(e && e.message); }
    T.same('heatmap, קווים ומקרא בלי שגיאה', true, ok);
    var px = plot.view.ctx.getImageData(Math.round(plot.X(0) * (cv.width / plot.view.w)), Math.round(plot.Y(0.5) * (cv.height / plot.view.h)), 1, 1).data;
    T.same('מפת החום צוירה (פיקסל בהיר באמצע)', true, px[0] + px[1] + px[2] > 300);
  });

  await T.test('מנוע: הקורס, ההתקדמות והרכיבים', async function () {
    var C0 = PHY.course;
    T.same('8 פרקים', 8, C0.chapters.length);
    T.same('מזהים 01..08 לפי הסדר', true, C0.chapters.every(function (c, i) { return c.id === String(i + 1).padStart(2, '0'); }));
    T.same('שמות קבצים NN-slug.html', true, C0.chapters.every(function (c) { return new RegExp('^' + c.id + '-[a-z0-9-]+\\.html$').test(c.file) && c.title && c.desc && c.ref; }));
    T.same('מפתח אחסון', 'g4-progress-v1', PHY.progress.KEY);
    T.same('חמישה אתרים בסדרה', 5, C0.series.length);
    T.same('find', 'מונטה קרלו: צעד, הגרלה, חתך פעולה', C0.find('01').title);
    T.same('stampPath', 'js/sims/ch01/ready.js', C0.stampPath('01'));
    T.same('האתר הזה ברשימת הסדרה', true, C0.series.some(function (x) { return x.url === C0.siteUrl; }));
    T.same('ייחוס בכותרת התחתונה: קישור https', true, /href="https:\/\//.test(C0.attribution.html) && !!C0.credit.html);
    var sw = ['proton', 'neutron', 'gamma', 'electron', 'volume'].filter(function (k) { return !PHY.colors[k]; });
    T.same('PHY.colors: חמשת צבעי החלקיקים', '', sw.join(','));
    T.same('numClose: 3e8 מול 3e8', true, PHY.ui.numClose('3e8', 3e8));
    T.same('numClose: 2.95 מול 3 (1.7%)', true, PHY.ui.numClose('2.95', 3));
    T.same('numClose: 2.9 מול 3 (3.3%)', false, PHY.ui.numClose('2.9', 3));
    T.same('numClose: תשובות זעירות לא מקבלות הכול', false, PHY.ui.numClose('0.001', 2.67e-15));
    T.same('numClose: אפס', true, PHY.ui.numClose('0.04', 0));
    PHY.coach.say('בדיקה', 'right');
    var bub = document.querySelector('.coach-bubble');
    T.same('coach.say: בועה עם aria-live', 'polite', bub && bub.getAttribute('aria-live'));
    T.same('coach.say: טקסט ומצב', 'בדיקה|right', bub && bub.textContent + '|' + bub.dataset.mood);
    PHY.coach.hide();
    var host = document.createElement('div');
    host.innerHTML = '<div data-callout="lab"><p>x</p></div><div data-callout="trap" data-title="כותרת"><p>y</p></div>';
    T.stage.appendChild(host);
    PHY.coach.autoMount(host);
    var boxes = host.querySelectorAll('.callout');
    T.same('callout: כותרת ברירת מחדל', 'במעבדה', boxes[0].querySelector('.callout-head').textContent);
    T.same('callout: כותרת משלנו', 'כותרת', boxes[1].querySelector('.callout-head').textContent);
    T.same('callout: מחלקה', true, boxes[0].classList.contains('callout-lab'));
    var tw = PHY.tweens(), seen = 0, done = false;
    tw.run(1, function (k) { seen = k; }).then(function () { done = true; });
    for (var q = 0; q < 4; q++) tw.step(0.25);
    await Promise.resolve();
    T.same('tweens: מסתיים אחרי שנייה', true, done && seen === 1);
    var box = document.createElement('div');
    box.innerHTML = '<p>לייזר ב-800 nm, וחלון של \u22123 fs, ו-2×10⁸ m/s. פרק 2 לא נוגעים.</p><p><span class="katex">t = 30</span> fs ועוד</p><p>\u2066375\u00A0THz\u2069</p>';
    T.stage.appendChild(box);
    PHY.ui.isolateNumbers(box);
    var nums = [].map.call(box.querySelectorAll('.num'), function (e) { return e.textContent; });
    T.same('isolateNumbers: מקף אחרי ב- איננו מינוס', '800 nm', nums[0]);
    T.same('isolateNumbers: מינוס אמיתי נשאר', '\u22123 fs', nums[1]);
    T.same('isolateNumbers: חזקה של 10 עם יחידה', '2×10⁸ m/s', nums[2]);
    T.same('isolateNumbers: נוסחה ואחריה יחידה', 't = 30 fs', nums[3]);
    T.same('isolateNumbers: מספר בלי יחידה לטינית לא נעטף, ופלט של F.unit לא נעטף שוב', 4, nums.length);
    var r1 = PHY.random(42), r2 = PHY.random(42);
    T.same('random עם זרע חוזר על עצמו', r1.next(), r2.next());
  });
});
