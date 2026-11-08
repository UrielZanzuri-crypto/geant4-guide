# Geant4 צעד אחר צעד: project conventions

Interactive Hebrew (RTL) guide to Geant4, the Monte Carlo toolkit for particle transport in matter, for readers who already run a Geant4 application and want to understand what happens inside it. The running example is the author's proton-to-neutron converter `ldns`. Static site, the fifth of the series. Read `CONTENT_GUIDE.md` before writing any Hebrew, `docs/PLAN.md` (the concept, and section 4: the site-wide numbers) and `docs/CHAPTERS.md` (the general rules at the top and your chapter's brief). The reference chapter is `chapters/01-montecarlo.html` with its sims `js/sims/ch01/` and test `tests/ch01.js`: copy its structure.

The engine (`js/core`, `css/style.css`, `tests/chapter-check.mjs`, `tests/physics.html`, `tests/core.js`, `index.html`) was copied from the Ultra Fast sister site (`../Ultra Fast`, read-only) and adapted; **this site owns its own engine copy now**. Engine fixes are made here, never in a sister folder. What differs from the sister sites: the SITE block of `js/core/progress.js` (`PHY.course`, with `attribution`, `credit` and a `ref` per chapter instead of `lectures`), `data-course="geant4"` on every `<html>`, the particle colors, the code-block CSS, and the gate's attribution check.

## Hard rules

- **No build step and no ES modules** (`type="module"` breaks on `file://`). Classic `<script src>` tags, everything under `window.PHY`. Works by double-clicking `index.html` and via `python3 -m http.server`. Relative paths only.
- **External code only from cdnjs, pinned:** KaTeX 0.16.11 (css, js, contrib/auto-render). Google Fonts for Rubik and Heebo. Nothing else.
- **Every `<html>`:** `lang="he" dir="rtl" data-course="geant4"`.
- **Every number** comes from `docs/PLAN.md` section 4, is derived in the chapter from numbers given there (show the derivation in a staged solution), or is a textbook constant (N_A, barn, masses, densities of the materials). A toy or schematic value is labelled so ("צעצוע", "סכמטי") on the canvas and in the text. No invented experimental values. Approximate values say so.
- **Units are Geant4's internal units:** mm, ns, MeV. Neutron energies too are in MeV. In a macro the unit is written after the number.
- **Semantic colors are particles**, as the Geant4 GUI draws them in `ldns` (`macros/vis.mac`), and mean one thing only:

  | particle | CSS variable | text class | canvas (`PHY.colors.`) | color |
  |---|---|---|---|---|
  | proton | `--c-proton` | `c-p` | `proton` | red |
  | neutron | `--c-neutron` | `c-n` | `neutron` | green |
  | gamma | `--c-gamma` | `c-g` | `gamma` | amber (yellow in `vis.mac`; amber reads on a light page) |
  | electron | `--c-electron` | `c-e` | `electron` | blue |
  | volume: geometry, boundaries, walls | `--c-volume` | `c-vol` | `volume` | purple |

  The hex values are those of the sister sites, renamed one to one: `field` → `electron`, `intensity` → `gamma`, `phase` → `volume`, `ray` → `neutron`, `bfield` → `proton` (a sim ported from a sister site needs the same renaming). Anything that is not one of these (a residual nucleus, a guess, an estimate) uses `ink`, `muted` or `accent`.
- **Never hard-code a color in a sim, and never copy a color into a variable that outlives a frame.** `PHY.colors` is mutated in place on theme change: read `C.neutron` at draw time. Every `color` option of `view.*` and `plot.*` also accepts a key name (`'neutron'`, `'muted'`), resolved at draw time. Theme changes repaint through `SimLoop`.
- **375px wide with no horizontal scroll.** Touch targets at least 44px. `prefers-reduced-motion` turns off decorative animation only, not simulations.
- No drawn characters (feedback goes through `PHY.coach`), no em dashes, no `setTimeout` in sims, no globals on `window` besides `PHY`.

## Geant4 facts to get right (from `docs/CHAPTERS.md`)

A *step* is the segment between two points; each process proposes a step length (physical interaction length sampled from an exponential, or a continuous-process limit) and the geometry proposes the distance to the next boundary; the shortest wins. Steps are not time steps. A *track* is a particle being transported (track ID, parent ID, creator process, weight); a *trajectory* is the stored record drawn by the vis system. An *event* is one primary and all its descendants; a *run* is a set of events with fixed geometry and physics. Secondaries go on a stack and are transported after their parent (LIFO). In MT mode each worker thread processes whole events; with a fixed seed, Geant4 seeds every event from the master generator, so the result does not depend on the thread count. Geant4 internal units are mm, ns, MeV; in a macro the unit is written after the number. Geometry: solid → logical volume (solid + material) → physical volume (placement in a mother, copy number); everything lives in the World. Reference physics lists come from `G4PhysListFactory`; `QGSP_BIC_AllHP_EMZ` = QGSP strings at high energy, Binary cascade in between, ParticleHP data for n, p, d, t, ³He, α below 20 MeV (cross sections) with the HP final-state model up to 200 MeV, EM option 4. `G4AnalysisManager` writes histograms and ntuples, merged across threads; `/analysis/setFileName` takes a name without extension (a dot inside the name is read as an extension and the ROOT file is not written).

## Code and macro blocks

- A block is `<pre class="code" dir="ltr">`, at most 12 lines, **verbatim** from a project file (`ldns.cc`, `src/*.cc`, `macros/*.mac`, a run log), with `<`, `>` and `&` escaped. A Hebrew sentence **above** the block says what it does and names the file; the block itself holds no Hebrew. Never write C++ the project does not contain.
- Inline commands, flags, class and process names: `<code dir="ltr">/run/beamOn</code>`, `<code dir="ltr">-s 12345</code>`, `<code dir="ltr">protonInelastic</code>`.
- The CSS scrolls a long line inside the block, so the page never scrolls sideways; the block follows the theme.
- Chapter 1 shows the pattern: the `ldns.cc` usage lines for `-t`/`-s`, `G4Random::setTheSeed(seed);`, the run summary from `E30J_M2p5_Be2.log`, `MeanErr` from `src/RunAction.cc`, and five seed lines of the log.

## Files

```
index.html               home, entirely from PHY.course (PHY.ui.initHome); particle legend and units
README.md                Hebrew: what the site is, how to open it, tests, sources and license
.nojekyll                GitHub Pages
css/style.css            tokens on :root, :root[data-theme=dark], accents per :root[data-course=...]; all components; pre.code
js/core/fmt.js           PHY.fmt     num, unit, deg, sci, prefix, auto, parse, ltr, plain (RTL-safe)
js/core/vec.js           PHY.vec     immutable {x, y}; angles in degrees
js/core/complex.js       PHY.cx      immutable {re, im}; angles in radians
js/core/fft.js           PHY.fft     radix-2 FFT, shifts, axes, spectrum with phase blanking, fft2
js/core/pulse.js         PHY.pulse   Gaussian pulses (kept from the sister site; the core tests use it)
js/core/plot.js          PHY.plot    data plots on a canvas, heatmaps, colormaps, wavelengthColor
js/core/progress.js      PHY.course (SITE block: course metadata and all chapters) + PHY.progress
js/core/canvas.js        PHY.canvas, PHY.colors, PHY.theme
js/core/loop.js          PHY.SimLoop, PHY.sims, PHY.tweens, PHY.ease, PHY.random
js/core/coach.js         PHY.coach   floating feedback bubble, callout boxes, icons
js/core/ui.js            PHY.ui      components and page chrome
js/sims/chNN/ready.js    the chapter stamp, one line: PHY.course.ready('NN');
js/sims/chNN/kit.js      chapter helpers (PHY.chNN), loaded first
js/sims/chNN/<name>.js   one simulation per file, registers PHY.sims.<camelName>
chapters/NN-<slug>.html  one page per chapter
assets/                  real pictures: geometry_30J_Be4.png, neutrons_30J_Be4.png, ldns/*.png (the Be 2 mm run)
docs/PLAN.md             concept and the site-wide numbers     docs/CHAPTERS.md   the chapter briefs
tests/core.js            engine unit tests        tests/chNN.js   a chapter's physics tests
tests/physics.html       manual-clock runner      tests/chapter-check.mjs   the chapter gate
```

**Script order is fixed:** katex, auto-render, fmt, vec, complex, fft, pulse, plot, progress, canvas, loop, coach, ui, then the chapter's sims (its kit first), then the inline chapter script. `plot.js` loads before `canvas.js`, so it touches `PHY.canvas`/`PHY.colors` only at call time; keep it that way.

## Adding a chapter

1. Copy the reference chapter `chapters/01-montecarlo.html`: the head (theme script, fonts, KaTeX css, `../css/style.css`, a `<style>` block for chapter-only CSS), `<header class="topbar" data-topbar></header>`, the sections, `<div data-chapter-nav></div>`, `<footer data-footer></footer>`, and the script list in the fixed order. The file name is the one in `PHY.course.chapters`.
2. Create the stamp `js/sims/chNN/ready.js` containing `PHY.course.ready('NN');`, **last**, once the page exists. Without it the home page shows the chapter as "בקרוב" and the neighbours do not link to it.
3. Sections: `<section class="section wrap" data-section="name">` (or `wrap-wide` for a big sim), each with `.section-head` and a `.section-num`, except the hook (kicker + `h1.hero-title`). `data-passive` on `formula` and `pocket`.
4. A predict card is a `<div id="pc-x">` holding `<figure class="sim"><canvas></canvas><div class="sim-controls"></div></figure>`; build the sim, then `U.PredictCard($('pc-x'), {...})`. Traps are cards with `tag: 'מלכודת N: ...'` and `onDone`, and the inline script marks `traps` when all are done.
5. Math: `\(inline\)` and `\[display\]`; in a JS string `\\(` and `\\[`.
6. End the inline script with `U.initChapter({ id: 'NN' })`. It builds the top bar, nav and footer.
7. Write `tests/chNN.js`, then pass `node tests/chapter-check.mjs NN-<slug>.html` (exit 0) and `tests/physics.html?only=NN`.
8. A sim or kit from another chapter can be reused by loading its file (chapter 2 can load `../js/sims/ch01/kit.js` for `PHY.ch01.binomial`, or `../js/sims/ch01/mc-step.js` and call `PHY.sims.mcStep`). Do not copy and fork it; do not edit another chapter's files.

## Adding a simulation

Factory: `PHY.sims.name(canvasEl, controlsEl, opts)` returns `{start, stop, reset, setParam, getState}`; extra methods are fine (`play()` returning a Promise, `batch()`, `simulate(n)` for tests). A DOM-only sim takes a host `<div>` as the first argument.

```js
(function () {
  'use strict';
  const PHY = window.PHY, F = PHY.fmt, U = PHY.ui, C = PHY.colors, PL = PHY.plot;
  PHY.sims.mySim = function (canvasEl, controlsEl, opts) {
    opts = Object.assign({ lambda: 81 }, opts || {});
    const P = PL.create(canvasEl, { x: [0, 300], y: [0, 1.1], xLabel: 'עומק', xUnit: 'mm', yLabel: 'נייטרונים', yColor: 'neutron' });
    const tw = PHY.tweens();
    const S = { t: 0, playing: false };
    function step(dt) { tw.step(dt); /* physics at fixed dt = 1/120 s */ }
    function render() { P.clear(); P.axes(); /* P.line(xs, ys, {color: 'neutron'}) */ }
    const loop = PHY.SimLoop({ view: P.view, step, render });
    return {
      start: loop.start, stop: loop.stop,
      reset() { tw.clear(); loop.requestRender(); },
      async play(sec) { S.playing = true; await tw.run(sec, (k) => { if (k >= 1) S.playing = false; }); },
      setParam(k, v) { opts[k] = v; loop.requestRender(); },
      getState() { return { t: S.t }; },
    };
  };
})();
```

- **Scripted time runs inside `step`**, through `PHY.tweens()` (`run(T, fn(k))`, `wait(T)`, `clear()`), never `setTimeout`: offscreen sims pause.
- **Stop a scripted clock inside the tween callback (`if (k >= 1) S.playing = false`), not after `await`.** The promise resolves in a microtask after the whole frame's fixed steps, so code after `await` runs up to a frame late.
- **Randomness is seeded:** `PHY.random(seed)` (`next`, `range`, `int`, `pick`, `shuffle`), so tests replay a sim. Games take `opts.rng` (`PHY.random(seed).next`) and expose their actions (`check()`, `next()`, `restart()`, `setGuess()`). Use `U.GameHud` for level pips, task, feedback and the star panel; call `PHY.progress.setGame(chapter, stars)` and `markSection` at the end.
- **Sampling helpers** in `PHY.ch01` (load `ch01/kit.js`): `depth(λ, u)` (inverse CDF of the exponential), `compete(lams, rng)` (shortest of several exponential lengths), `gauss`, `poisson(mu, rng)`, `binomial(n, p, rng)` (exact below n = 1000, then Poisson or normal), `meanErr(s, s2, n)` (the `MeanErr` of ldns), `hist`, `bars(plot, ...)`, `band(plot, ...)`, `numberDensity`, `lambdaMm`, `MATERIALS` (Be, Li, LiF, Pb, HDPE with ρ and A), `mark` ("?" on a waiting card), `clock` (a corner pill), `lamText`.
- **Sliders and readouts go in `controlsEl`:** `U.Slider`, `U.Readouts`, `U.Toggle`, `U.Choice`, `U.Button`. Wrap groups in `<div class="sim-grid">` (responsive columns) or `.sim-row`.
- **A slider or toggle the reader moves** should mark the section (`PHY.progress.markSection(opts.chapter, opts.section)`) when the section is a playground.
- **Dragging:** `view.drag({hit(p), start(h, p), move(h, p), end(h, p)})` (world coordinates) or `plot.drag(...)` (data coordinates). Return null from `hit` on a miss: that keeps the page scrollable on touch. Hit radius about 30 px (`view.pxDist`, `plot.pxDist`).
- Chapter helpers shared by several sims live in `js/sims/chNN/kit.js` as `PHY.chNN` and load first.

### Text and numbers on canvas and in the DOM (RTL)

- Numbers always through `F.num`, `F.unit`, `F.sci`, `F.prefix`, so negatives and units never flip. `F.unit` returns an LTR isolate (U+2066 … U+2069); keep it in the string as is.
- **Prose is handled for you:** a Latin "number unit" pair in Hebrew HTML ("2 mm", "6.3 MeV", "1.848 g/cm³", and an inline formula followed by a unit, "\(\lambda = 81\) mm") would render reversed. `renderMath` runs `PHY.ui.isolateNumbers`, which wraps each pair in `<span class="num">`; `initChapter` runs it on the page and the components on what they add. So just write "בעובי 2 mm". Text you set with `textContent` must use `F.unit`. Opt out with `data-no-iso`.
- **What isolateNumbers does not fix, so write it in TeX:** a bare power of ten (`\(3\times10^{6}\)` פרוטונים), a value with an error (`\(1341 \pm 37\)`), anything with `×` or `·` between numbers and no Latin unit after it.
- **KaTeX may soft-break inline math at a binary operator** (a line can end at the `\times` of `3\times10^{6}`). Group the number in braces, `\({3\times10^{6}}\)`, where a break would look wrong. Do not add `white-space: nowrap` to `.katex`: long inline formulas in solution steps must still wrap at 375 px.
- `isolateNumbers` skips `pre` as well as `code`, so a code block needs no `data-no-iso`.
- `PHY.random(seed)` scrambles the seed before the generator starts, so neighbouring seeds (s, s+1, ...) give independent sequences. Repetitions can simply use seeds 1, 2, 3 ...
- **Percent without a space in Hebrew text:** "59%", "בביטחון של 95%". With a space ("95 %") the sign lands on the wrong side. Inside `F.unit(x, '%')` and inside an LTR table cell (`td.v`) a space is fine.
- **Latin fragments in a Hebrew label set as text** (a toggle, a readout label): wrap them with `F.ltr` (`'אותו זרע (כמו ' + F.ltr('-s 12345') + ')'`), or the flag and the number swap places.
- isolateNumbers also matches a digit inside a word ("Geant4 Book" becomes "Geant" + an isolate "4 Book"). That is harmless when Latin text follows, as in the `ref` lines; a phrase like "Geant4 Book" directly before Hebrew text should go in `<bdi>`.
- `view.text`/`screenText` draw Hebrew strings RTL. A Hebrew label with a Latin formula in it needs `F.ltr()` around the Latin part: `'נשאר: אלסטי ' + F.ltr(F.num(0.3, 2) + ' λ')`. Without it the formula comes out reordered.
- `F.plain()` strips the isolates: use it in tests only, never for display.
- Do not mix `F.unit` output with a literal "number unit" in one string: `isolateNumbers` skips a text node that already holds an isolate, so the literal pair would stay flipped. Use `F.unit` for every number in such a string.
- **Readout values must be short.** At 375 px readouts sit two to a row, and a long value with its unit wraps inside the box ("1.235×10²³ cm⁻³" breaks before ⁻³). Put the unit in the label ("צפיפות האטומים n, ב-cm⁻³", "ההערכה ± שגיאה (%)") and keep the value a number.

### `view` (PHY.canvas.create)

`PHY.canvas.create(canvas, {world: {xMin, xMax, yMin, yMax}, aspect, minHeight, maxHeight, padding})`. World coordinates (x right, y UP), uniform scale, canvas forced `dir="ltr"`. Helpers: `clear(color)`, `grid(step, {majorEvery})`, `axes({origin, xLabel, yLabel, tickEvery, tickLabels})`, `line(x1, y1, x2, y2, o)`, `poly(points, {color, width, fill, close, dash, alpha})` (`fill` paints the inside solid: for a tinted volume use `fillRect` with a low `globalAlpha`, as `mcStep` does), `circle(x, y, r, {px, fill, color})`, `arrow(x1, y1, x2, y2, {color, width, head, dash, alpha, label, labelSide, labelGap})` (a `head` of 0 falls back to the default size: draw a `line` for a headless arrow), `arc(cx, cy, rPx, a0deg, a1deg, o)`, `text(x, y, str, {offset, size, weight, color, align, halo, pill, alpha})`, `screenText(px, py, str, o)`, `pxDist`, `toWorld`, `toScreen`, `sx`, `sy`, `visible`, `setWorld`, `onResize`, `drag`, `onTap`, `w`, `h`, `ctx`, `scale`.

### `PHY.plot`

`PL.create(canvas, o)` makes a canvas and one panel; `PL.panel(view, {rect: {x, y, w, h}, ...o})` puts several panels on one canvas (rect in fractions, y down). `PL.create` accepts `rect` and `margin` too, so a sim can stack a geometry panel over a histogram (`mcSlab`, `mcZero`): give both panels the same `margin.l`, `margin.r` and x range so they line up. `o`: `{x: [min, max], y: [min, max], y2: [...], xLabel, xUnit, yLabel, yUnit, y2Label, y2Unit, yColor, y2Color, grid, margin: {l, r, t, b}}`. Units are `F` keys (`'mm'`, `'ns'`) or any string (`'MeV'`).
Drawing, inside `render`: `clear()`, `axes()` (tick labels are plain numbers: for a log axis label it `log₁₀ N`), `line(xs, ys | fn, {color, width, dash, alpha, axis: 'y2'})` (NaN breaks the line), `fill(xs, ys, {color, alpha, base, axis})`, `marker(x, y, {color, r, shape: 'dot'|'ring'|'cross'|'diamond', label, axis})`, `text(x, y, str, o)`, `vline(x, {color, dash, label, labelAt})`, `hline(y, o)` (its label sits at the right end, where curves usually end: prefer a `legend` or your own `screenText`), `heatmap(z, {x, y, cmap: 'viridis'|'inferno'|'grey'|'spectral', log, decades, min, max, smooth})`, `legend([{label, color, dash}], {corner})`, `clip(fn)`.
Mapping: `X(v) Y(v) Y2(v)` to CSS px, `toData(px, py)`, `box` (inner rect), `range`, `setRange({x, y, y2})`, `setRect(rect)`, `pxDist(a, b)`, `drag(h)`, `onTap(fn)`, `view`.
Colors: `PL.wavelengthColor(nm, {raw, theme})`, `PL.cmap(name)(t)` and `.rgb(t)`, `PL.niceStep`, `PL.niceRange`.

### `PHY.fft`, `PHY.pulse`, `PHY.cx`

Kept from the sister site and covered by `tests/core.js`; a chapter that needs a Fourier transform can use them. `fft(re, im)` / `ifft(re, im)` in place on `Float64Array`s (N a power of 2), `fft2/ifft2`, `fftshift`, `timeAxis`, `freqAxis`, `spectrum(reT, imT, dt, {threshold})`, `fromSpectrum`, `unwrap`, `isPow2`, `nextPow2`. `PHY.pulse`: Gaussian pulses and spectral phase (see the comments at the top of `js/core/pulse.js`). `cx(re, im)`, `add sub mul div scale neg conj inv abs abs2 arg exp polar expi sum eq format`.

### `PHY.fmt`

`F.num(x, d)`, `F.unit(x, key, d)` (keys: m cm mm um nm km s ms us ns ps fs Hz kHz MHz GHz THz rad deg sr eV meV J mJ uJ nJ pJ fJ W ... 'm/s', or any string: `F.unit(6.3, 'MeV', 1)`, `F.unit(1, 'b', 1)`), `F.deg`, `F.sci(1.235e23, 3, 'cm⁻³')` → "1.235×10²³ cm⁻³", `F.prefix(1.2e-13, 's')` → "120 fs", `F.auto`, `F.parse` (accepts "1,5", "−3", "3e8", "3×10^8"), `F.ltr`, `F.rtl`, `F.plain`, `F.unitName`.

## Components (`PHY.ui`)

- `PredictCard(host, {chapter, id, section, tag, question, options: [{text, correct, why}], onRun(i, opt) -> Promise, steps, explanation, sayRight, sayWrong, onDone})`. Children already inside `host` (the `<figure class="sim">`) become the stage. **The reveal waits for the promise that `onRun` returns.** `explanation` stays open under the solution, so keep it to a call to action. `sayRight`/`sayWrong` are plain text (no TeX), shown by the coach. Put your own data on options.
- `Quiz(host, {chapter, section, questions: [{type: 'mc', q, options, answer, steps} | {type: 'num', q, answer, unit, tol, abs, steps}]})`. Each question has its own check button. ±3% default tolerance; an answer of 0 uses `abs` (0.05). Review questions start with `<span class="chip">חזרה מפרק N</span>`.
- `Problem(host, {chapter, section, tag, text, fields: [{label, answer, unit, tol, abs}], steps})` wraps `StepSolution`.
- **Answers are plain decimals in a prefixed unit** (1.235 with `'×10²³ cm⁻³'`, 16.2 with `'cm'`, 2.24 with `'×10⁷'`), so the number typed is short and `chapter-check` can find it in the solution text. Input accepts "3e8" anyway.
- `StepSolution(host, {steps: [{hint, work}], open, startLabel, onDone})`, `StarScore(host, {value, size, animate})`, `Slider(host, {label, min, max, step, value, unit, digits, format, color, onInput, onCommit})` (`.set(v)` without firing, `.setEnabled`; for a log slider keep log₁₀ of the value and show it with `format`), `Toggle(host, label, {value, onChange})` (`.input.disabled` to lock it), `Choice(host, {label, options: [{value, text}], value, onChange})`, `Button(host, text, fn, {primary, ghost})`, `Readouts(host, [{key, label, color}])` (`.set(key, text)`), `GameHud(controlsEl, names)`, `burst(el, n)`, `h(tag, attrs, children)`, `renderMath(el)`.
- Page chrome is automatic: `initChapter({id})` fills `[data-topbar]`, `[data-chapter-nav]` and `[data-footer]`, tracks progress, mounts callouts and renders math. The footer prints `PHY.course.attribution.html` (the sources: the Geant4 documentation, the code of the Geant4 Collaboration with a link to geant4.web.cern.ch, the ldns project, the Geant4 Software License). Do not write a footer by hand.

## Coach and callouts

`PHY.coach.say(text, 'right'|'wrong'|'hint')` shows the floating bubble (the components already call it). Inline boxes: `<div data-callout="lab|intuition|trap" data-title="...">` with paragraphs inside; titles default to במעבדה, אינטואיציה, מלכודת. A "lab numbers" table is `<table class="lab-table">` with `<td class="v">` values (LTR cells: keep them Latin). Formula cards are `<div class="formula-card">` with `.formula-main` and a `<table class="symbol-table">` (columns סמל, משמעות, יחידה; `td.sym`, `td.unit`), and a `<p class="not-say">` for what the formula does not say. In a chapter with few formulas the card becomes "כרטיס הפקודות" or "מילון המונחים" (same component; the table columns become פקודה / משמעות, or מונח / משמעות).

## Staged solutions

Every question has a full solution in `steps: [{hint, work}]`: predict cards, problems and quiz questions.

- A hint points to the next move and asks a question. It never contains the result of its own step, nor the final answer.
- `work` is the full calculation of that step, with units. The last step states the final answer of the question, with its number as in `answer`.
- After a wrong quiz answer, the right one stays hidden until the last step is revealed.
- First person plural ("נחשב", "נציב"), gender-neutral. A term defined inside a solution also appears in visible text after the card.

## Progress and the chapter list

- `PHY.course` (SITE block of `progress.js`) holds the course metadata (`title`, `subtitle`, `level`, `reading`, `series`, `siteUrl`, `attribution: {html}`, `credit: {title, html, note}`) and **all 8 chapters** with `{id, file, title, desc, ref}`. `ref` is a short line naming the Geant4-documentation section or the ldns file the chapter leans on; the home page prints it under the chapter card. It is the single source of truth for the home page and the chapter nav; chapter agents do not edit it.
- A chapter is live when its stamp `js/sims/chNN/ready.js` loads (`PHY.course.detect(ids, base)`). Until then the home page shows it as "בקרוב" and the neighbours' nav hides the link. A missing stamp logs one "file not found" line; that is expected and `chapter-check` ignores it.
- Key `g4-progress-v1` (`PHY.course.storageKey`): `{chapters: {"01": {sections: [...], total, quiz, game, predictions}}}`. Always go through `PHY.progress`. Every `<section class="section wrap" data-section="name">` counts; `data-passive` sections are marked after 1 s in view; the rest by their components (`section` option) or `PHY.progress.markSection`.

## Testing

- **Whole chapter:** `node tests/chapter-check.mjs 01-montecarlo.html [--shots dir] [--no-cards] [--no-physics]`. Real headless Chrome over `file://`: source lint (voice, em dash, hex colors, setTimeout, window globals, script order, `data-course`, stamp, tests file), console and KaTeX errors, every predict card in real time, every staged solution, the quiz wrong then right, reload, 375px, nav links, the attribution footer (`footer .attribution a[href^="https://"]`), and the chapter's physics tests. Exit 0 means no failures. It warns above 4 exam problems; the briefs that ask for 5 accept that warning.
- The voice lint flags whole words, so it also flags innocent homographs: "שנה" (year), "ירה" (fired), "חשב" (thought), "קרא" (read, past). Rephrase.
- **Physics:** `tests/physics.html` runs `tests/core.js` and every `tests/chNN.js` on a manual clock; `?only=NN` one chapter, `?only=core` the engine. Title `PASS n/n`. Headless: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --virtual-time-budget=60000 --dump-dom "file://<URL-encoded path>/tests/physics.html?only=01"`.
  ```js
  PHY_T.load(['ch01/kit.js', 'ch01/mc-slab.js']);            // sims, relative to js/sims, in load order
  PHY_T.add(async function (T) {                            // T: near, rel, same, truthy, row, make, run, frames, settle, test, stage
    await T.test('פרק 1: עומק האינטראקציה', async function () {
      var s = T.make(PHY.sims.mcSlab, { mode: 'card', sigma: 1, N: 2000, seed: 7 });
      await T.run(s.play(1));
      var q = s.getState();
      T.near('העומק הממוצע ≈ λ', q.lambda, q.mean, 3 * q.lambda / Math.sqrt(q.N));
    });
  });
  ```
  Test the physics from what the sim sampled or drew (the mean of the sampled depths, the spread between runs, the length of each step against its proposals), not by re-reading the parameters you passed in. With random sims, use a fixed seed and a tolerance of about three standard errors, and test that the same seed replays exactly.
- **Real browser:** serve with `python3 -m http.server 8080`, click through, toggle dark mode (canvases recolor), check 375px (`document.documentElement.scrollWidth <= innerWidth`), reload and check the stars on the home page, and also open from `file://`.

## Rules for chapter agents

- Never edit `js/core/*`, `css/style.css`, `index.html`, `tests/chapter-check.mjs` or `tests/physics.html`. If the engine needs a fix, report it instead.
- You own `chapters/NN-<slug>.html` (file name as in `PHY.course`), `js/sims/chNN/*` (including the one-line stamp `ready.js`) and `tests/chNN.js`.
- Chapter-local CSS goes in a `<style>` block in the chapter head.
- Every chapter passes `node tests/chapter-check.mjs NN-<slug>.html` with exit 0 and ships `tests/chNN.js` that passes in `tests/physics.html?only=NN`.
- Template (CONTENT_GUIDE.md): `hook`, 3-5 predict cycles, `formula` (passive; or the command card / glossary card), `playground`, `game`, `traps` (3-4 cards), `problems` (as the brief says), `quiz` (5 in chapter 01, 7 from chapter 02: 5 plus 2 review), `pocket` (passive). Section numbers restart in every chapter: "מסעיף N" for a section, "מפרק N" for a chapter.
- Write Hebrew per CONTENT_GUIDE.md: first person plural, gender-neutral (no אתה, נסה, גרור, לחץ, שים לב, חשב...), paragraphs of at most 4 sentences, intuition and animation before the formula, every number with a unit, no em dash. The lint does not catch everything; read your text once more.
- Source material (read-only, outside this folder) is listed at the top of `docs/CHAPTERS.md`: the ldns project and the runs behind the site-wide numbers. Never touch anything under `/Users/urielzanzuri/Desktop/PhD/`. Rewrite in our words; quote code and macros verbatim, never documentation text.
- The attribution footer is automatic through `initChapter`.

## Lessons from building the reference chapters

- `[hidden]` is forced to `display: none` globally, so `hidden` is safe on any component.
- A wide no-wrap element anywhere (a table cell with `white-space: nowrap`) widens the whole RTL page at 375px; the overflow appears on the left. `chapter-check` reports it; find it with `getBoundingClientRect().left < 0`.
- A Hebrew word before inline math (`ב-\(t\)`) is correct but reads oddly in labels; rephrase readout labels in words.
- Readouts that do not apply to a mode should not be shown (`–` forever looks broken).
- Do not leave debug handles on `window`.
- **A card must not answer itself.** While a card's sim waits in its ready state, nothing on the stage may show the value or outcome the card asks about: no readout, label, result arrow, bar, curve, caption or color. Show `?` until the run starts, and bring everything back in free play after the reveal. Things the question itself gives are fine. A card's tag must not name one of its options as the mistake either. Chapter 1: the hook shows only run 1 (given) and hides runs 2-20; the step card draws the three proposals (given) but not the winner; the event card hides the tree; the "more events" trap hides the true yield line; the zero-count trap hides the toy's true expected count; the A/B trap's readout label does not say that the two converters are the same.
- **Text after a card is held** (hidden) until the card is answered: `initChapter` holds the card's following siblings up to the next card, a `<nav>`, or an element with `data-no-hold`. Put `data-no-hold` on the first element that does not depend on the answer. `chapter-check` fails if anything stays held after every card was answered.
- Inside Hebrew text, `×`, `·` and `±` between numbers flip, and so does a Latin "number unit" pair. `isolateNumbers` fixes the "number unit" case; use TeX for the rest. `chapter-check` fails on a flipped `°`, `×`, `·` or "number unit" anywhere in the rendered page.
- Keep throwaway helper scripts in your own scratch folder; parallel agents overwrite generic names in a shared one.
- **`PHY.sims` names and `PHY.chNN` kits must be unique across the whole site.** `tests/physics.html` loads every chapter's sims together, so a second `PHY.sims.slab` silently replaces the first. Prefix names (chapter 1 uses `mc`: `mcSlab`, `mcStep`, `mcEvent`, ...).
- **Create the stamp `js/sims/chNN/ready.js` only after the chapter page exists.** The neighbours' nav links to a stamped chapter, and their gates fail on a link to a missing file.
- **Display formulas must fit a phone.** A `\[ … \]` block never wraps; at 375 px the formula card is about 311 px wide. Put one formula per `\[ \]` (several may share a `.formula-main`) and break a long one with `aligned` or `gathered`.
- Dense `plot.marker` rings hide the line under them (each ring is filled with the background). Use few markers or `shape: 'dot'`.
- A corner pill (`clock`) or a legend sits in the top 30 px of the canvas; leave that much margin above a geometry drawing (`margin.t` of the panel), or the pill covers it.
- Label positions: `plot.hline` labels and marker labels collide easily on a phone. Check every sim at 375 px after its card has run, in both themes (`--shots` gives the untouched page only; a small CDP script that runs the cards and clips `figure.sim` shows the rest).
