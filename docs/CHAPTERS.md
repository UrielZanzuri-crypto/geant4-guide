# Geant4 צעד אחר צעד: chapter briefs

One brief per chapter. A chapter agent reads its brief, `docs/PLAN.md` (the concept and the table of
site-wide numbers in section 4), `CONTENT_GUIDE.md`, `CLAUDE.md` and the reference chapter
(`chapters/01-montecarlo.html` with `js/sims/ch01/` and `tests/ch01.js`), then builds the chapter page, its
sims in `js/sims/chNN/` and `tests/chNN.js`.

**Source material (read-only, outside this folder):**
- `/Users/urielzanzuri/Desktop/PhD/ELIMAIA proposal/geant4_converter/README.md` (English: physics, assumptions, ntuple columns, validation table),
  `GUIDE_HE.md` (Hebrew: macros section 5, geometry 6, stages 8, output 9, plots 10, validation 12, troubleshooting 15),
  `ldns.cc`, `src/SteppingAction.cc`, `src/PrimaryGeneratorAction.cc`, `src/DetectorConstruction.cc`,
  `macros/template_stageA.mac`, `macros/vis.mac`.
- `/Users/urielzanzuri/Desktop/PhD/30J 300fs/neutrons/results/SUMMARY.md` (the runs behind the site-wide numbers),
  `vis_30J.mac`, `picture_30J.mac`, `run_spectra.sh`, `output/E30J_M2p5_Be2.mac`, `output/E30J_M2p5_Be2.log`.
- Geant4 documentation: Book For Application Developers (geometry, materials, physics, UI commands, visualisation,
  analysis), Physics Reference Manual, Guide for Physics Lists. Quote concepts, never copy text.
- Real pictures and plots for `<figure>`s: `assets/geometry_30J_Be4.png`, `assets/neutrons_30J_Be4.png` (Geant4 TSG
  export, Be 4 mm, 30 J spectrum), `assets/ldns/1_leak_spectrum.png … 5_birth_spectrum.png`, `input_check.png`
  (the Be 2 mm run), `compare_30J.png`, `yield_vs_thickness.png`. Use `<img loading="lazy">` with an `alt`.

**Rules that hold in every chapter:**
- Every number that appears comes from `docs/PLAN.md` section 4, is derived in the chapter from numbers given
  there, or is a textbook constant (N_A, barn, masses). Toy curves (a schematic σ(E)) are labelled "סכמטי".
  No invented experimental values. When a value is approximate, say so.
- Geant4 facts to get right: a *step* is the segment between two points; each process proposes a step length
  (physical interaction length sampled from an exponential, or a continuous-process limit) and the geometry
  proposes the distance to the next boundary; the shortest wins. Steps are not time steps. A *track* is a
  particle being transported (track ID, parent ID, creator process, weight); a *trajectory* is the stored
  record drawn by the vis system. An *event* is one primary and all its descendants; a *run* is a set of
  events with fixed geometry and physics. Secondaries go on a stack and are transported after their parent
  (LIFO). In MT mode each worker thread processes whole events; with a fixed seed, Geant4 seeds every event
  from the master generator, so the result does not depend on the thread count. Geant4 internal units are
  mm, ns, MeV; in a macro the unit is written after the number. Geometry: solid → logical volume (solid +
  material) → physical volume (placement in a mother, copy number); everything lives in the World.
  Reference physics lists come from `G4PhysListFactory`; `QGSP_BIC_AllHP_EMZ` = QGSP strings at high energy,
  Binary cascade in between, ParticleHP data for n, p, d, t, ³He, α below 20 MeV (cross sections) with the
  HP final-state model up to 200 MeV, EM option 4. `G4AnalysisManager` writes histograms and ntuples, merged
  across threads; `/analysis/setFileName` takes a name without extension (a dot inside the name is read as
  an extension and the ROOT file is not written).
- Code and macro blocks: `<pre class="code" dir="ltr">` with the lines verbatim from the project files (at most
  12 lines), a Hebrew sentence above saying what the block does. Macro commands and class names inline go in
  `<code dir="ltr">`. Never write C++ the project does not contain.
- Colors: proton `proton` (red), neutron `neutron` (green), gamma `gamma` (amber), electron `electron` (blue),
  geometry/boundaries `volume` (purple). Text classes `c-p c-n c-g c-e c-vol`. Nothing else is colored by
  meaning.
- Hebrew terms with the English in parentheses on first use: צעד (step), מסלול (track), אירוע (event), ריצה
  (run), תהליך (process), חתך פעולה (cross section), מרחק חופשי ממוצע (mean free path), נפח לוגי (logical
  volume), נפח פיזי (physical volume), רשימת פיזיקה (physics list), משקל סטטיסטי (weight), טבלה (ntuple),
  מסנן (filter). After that, the Hebrew alone.
- Problems: 4 or 5 per chapter (the gate warns above 4; that warning is accepted), our own numbers, every solution staged; the answer is a plain decimal in a prefixed unit.
- Quiz: 5 questions in chapter 01; 5 + 2 review questions from earlier chapters from chapter 02 on.
- Every chapter ends with a pocket card the reader can photograph: the commands or formulas of the chapter.

---

## 01 מונטה קרלו: צעד, הגרלה, חתך פעולה (`01-montecarlo.html`)

- Hook: the same simulation twice. 3×10⁶ protons into Be 2 mm; the first run counts 1341 neutrons leaving
  (sum of weights in `leak`; 6126 rows with mean weight 0.219). The second run, same macro, new seed: exactly 1341 /
  about 1341 ± 40 / could be anything. Answer: a spread of order √1341 ≈ 37 (the printed weighted error is ±27). Reveal: run a toy 20 times, see the spread; then
  the same seed twice gives identical results.
- Cycles: (1) a particle in matter flies freely and then interacts; the mean free path λ = 1/(nσ), the
  barn (10⁻²⁴ cm²), number density n = ρN_A/A; the depth of the first interaction is exponential (sim: a slab,
  particles shot one by one, histogram of first-interaction depth with the exponential overlay, λ readout;
  sliders for density and σ). (2) the step: each process proposes a length (sampled from its exponential),
  the geometry proposes the distance to the boundary, the shortest wins; PreStepPoint and PostStepPoint; a
  boundary step has zero physics (sim: one particle crossing two slabs, candidate lengths drawn as arrows,
  the winner highlighted, step by step on a button). (3) track, event, run: a proton slows down by
  continuous energy loss (many steps), one inelastic step makes a neutron and a gamma; the secondaries are
  new tracks with parent ID; the event is the whole tree; a run is many events (sim: a schematic event tree
  built live, counters of steps/tracks). (4) statistics: a rate p estimated from N trials has relative
  error 1/√(Np); the running mean converges; the error bar shrinks; same seed = same numbers (sim: toy MC
  with an N slider, running mean with error band, a "same seed" toggle). (5) why Monte Carlo and not a
  formula: integration by sampling (π by darts), and the list of what a formula cannot do here: multiple
  scattering, secondaries, (n,2n), geometry, angular distributions.
- Formulas: λ = 1/(nσ); P(x) dx = e^(−x/λ) dx/λ; n = ρN_A/A; relative error 1/√N; for weighted tallies the
  error from the event-by-event variance (not √rows).
- Playground: "מעבדת הצעדים": material (Be 1.848, Li 0.534, LiF 2.635, Pb 11.35, HDPE 0.95 g/cm³) with a σ
  slider in barn, N particles, histogram of depth, mean and error.
- Game: "לנחש את λ": a histogram of interaction depths for a random material and σ; guess λ; 3 rounds.
- Traps: more events change the result (they shrink the error); a Monte Carlo number without an error bar
  is a result (it is not); the same seed with more threads gives different numbers (no); zero counts means
  the yield is zero (it means an upper limit, about 3/N at 95 %).
- Problems: n of Be (1.235×10²³ cm⁻³); λ for σ = 0.5 b in Be (16.2 cm); events for a 1 % relative error on a
  yield of 4.47×10⁻⁴ per proton (2.24×10⁷); the 95 % upper limit after 0 counts in 10⁶ events (3×10⁻⁶);
  fraction of particles interacting in 2 mm with λ = 16.2 cm (1.2 %).
- Quiz: 5 questions, no review.

## 02 איך Geant4 בנוי: Run, Event, Track, Step (`02-architecture.html`)

- Hook: in the run of 3×10⁶ protons, which object was created most often: events, tracks or steps? (steps,
  by far: every proton makes tens of steps while slowing down, every secondary adds more.)
- Cycles: (1) the four nested boxes G4Run ⊃ G4Event ⊃ G4Track ⊃ G4Step, animated on one schematic event
  with a proton, a neutron, a gamma and an electron; the vocabulary: primary, secondary, track ID, parent ID,
  creator process, kinetic energy at the pre-step point, weight (sim: event animation with a live tree and a
  highlighted "current step"). (2) where the user plugs in: the mandatory classes (detector construction,
  physics list from `G4PhysListFactory`, primary generator, action initialisation) and the optional actions
  (run, event, tracking, stepping, stacking); the timeline of callbacks for one event (sim: a timeline that
  lights BeginOfRun → BeginOfEvent → PreUserTracking → UserStepping ×n → PostUserTracking → EndOfEvent →
  EndOfRun as the event plays); code block: 10 lines of `ldns.cc` main() (run manager, detector, physics
  list, action initialisation, UI manager). (3) the stack: secondaries are pushed and transported after the
  parent finishes, last in first out; why the order does not change the physics (sim: a stack drawn as a
  pile that grows and shrinks as the event runs). (4) what a stepping action does: the `leak` tally of ldns:
  "the particle is a neutron, the post-step point is on a geometry boundary, and the next volume is outside
  the converter → one row" (code block from `SteppingAction.cc`); sim: a neutron random walk inside a disc,
  the surface lights when it crosses outward, the counter and the row that would be written (E, cosθ, w).
  (5) multithreading: master and workers, whole events per worker, merged output, a seed per event from the
  master so `-t 4` and `-t 8` give the same numbers; `-t`, `-s` flags (sim: 4 lanes consuming events, one
  merged counter).
- "Formula" card becomes a glossary card: run, event, track, trajectory, step, process, volume, action,
  messenger, with one line each.
- Playground: "מעבדת האירוע": shoot one schematic event; toggles for steps, secondaries, boundary steps;
  counters; "replay with the same seed".
- Game: "מי נקרא מתי": put the callbacks of an event in order (choice buttons), 3 rounds with different
  events (with and without secondaries).
- Traps: an event is one particle (primary plus all descendants); a track is the line on the screen (the
  line is the trajectory, the stored record); Geant4 advances in time steps (steps come from interaction
  lengths and boundaries); more threads mean more events (same events, less wall time).
- Problems: count tracks and steps in a described event; events per second per thread from "3×10⁶ in 17.6 s on
  10 threads" (1.7×10⁴); total steps if a proton makes 40 steps and 4.5×10⁻⁴ of events add 10 more; the wall
  time for 2.24×10⁷ events at that rate (about 130 s).
- Quiz 5 + 2 review (from 01).

## 03 גיאומטריה וחומרים (`03-geometry.html`)

- Hook: the converter is a disc of radius 22 mm at 45 mm, the protons leave in a 20° cone. What fraction
  misses the disc? 0 % / about 10 % / about 25 %. Answer 0 %: the cone radius on the front face is
  45·tan 20° = 16.4 mm, and 17.1 mm on the back face of Be 2 mm.
- Cycles: (1) solid → logical volume (solid + material) → physical volume (position, rotation, mother, copy
  number); the World, a cube of vacuum (G4_Galactic) that holds everything; the ldns stack built layer by
  layer (sim: 2-D cross-section r–z; buttons "addLayer Be 2 mm", distance and radius sliders; the Geant4
  printout line `layer 0 : Be t = 2 mm z = [45, 47] mm` updates live). (2) units: internal mm, ns, MeV; in
  a macro `16 mm` or `1.6 cm`; forgetting the unit means the default (here mm) (sim: a unit toy: type a
  value with and without a unit and see what Geant4 builds). (3) materials: the NIST database (G4_Be,
  G4_Pb, G4_LITHIUM_FLUORIDE, G4_POLYETHYLENE), density, composition, natural isotopes (Li: 7.5 % ⁶Li,
  92.5 % ⁷Li; Geant4 samples the isotope hit, and ldns records it as targetA); custom materials in
  `DetectorConstruction::GetMaterial` (HDPE 0.95 g/cm³ with the thermal-scattering element
  `TS_H_of_Polyethylene`) (sim: a material card: pick a material, see density, elements, number densities
  per isotope, λ for a σ slider). (4) checks: `Checking overlaps ... OK!`, daughters inside mothers, the
  geometry table printed at the start of every run, and the cone rule r ≥ d·tan θ at the back face too
  (sim: cone and disc with sliders, intercepted fraction = (1 − cos θ_disc)/(1 − cos θ_cone) when the disc
  is smaller than the cone). (5) nested volumes: the converter inside a moderator (insert mode: the
  moderator is the mother, a vacuum channel is a daughter), a reflector shell; why the mother/daughter
  order matters for boundary crossings and copy numbers; the LDNS005 error when the moderator would start
  before the source (sim: the ldns insert geometry with insertDepth slider).
- Formulas: n_i = ρ N_A w_i / A_i; r_cone(z) = z tan θ; Ω = 2π(1 − cos θ); intercepted fraction.
- Playground: "בונה הגיאומטריה": a layer list editor (material, thickness), distance, radius, cone angle,
  optional moderator; live cross-section, the Geant4-style printout, and the generated macro lines
  (`/ldns/det/clearLayers`, `/ldns/det/addLayer ...`, `/ldns/det/distance`, `/ldns/det/radius`).
- Game: "לבנות לפי ההדפסה": a Geant4 geometry printout is shown; set the controls to reproduce it; 3 rounds.
- Traps: the World is air (vacuum here); a thicker converter always gives more neutrons (the real scan is
  flat beyond the proton range: show `assets/ldns/yield_vs_thickness.png`); radius 22 mm is a 22 mm disc
  (44 mm); a unit-less number is an error (it is silently the default unit).
- Problems: cone radius at 45 and 61 mm (16.4, 22.2 mm); intercepted fraction for a 10 mm disc at 45 mm
  (θ_disc = 12.5°, 39 %); number density of ⁷Li in LiF (ρ 2.635 g/cm³, M 25.94 g/mol: 6.12×10²² LiF/cm³, ⁷Li
  5.66×10²²); the z table for LiF 2 mm | Pb 10 mm at 20 mm ([20, 22], [22, 32]).
- Quiz 5 + 2 review.

## 04 פיזיקה: רשימות, מודלים ונתונים גרעיניים (`04-physics.html`)

- Hook: the same LiF converter and 5 MeV protons. With `QGSP_BIC_HP` zero neutrons, with `QGSP_BIC_AllHP`
  5×10⁻⁴ per proton (the project's benchmark table). Who is right? (AllHP: evaluated data below 20 MeV; the
  cascade model has no valid cross sections for light nuclei at these energies.)
- Cycles: (1) a process = a cross-section dataset (how often) + a model (what comes out); the processes of
  a proton: ionisation (continuous), multiple scattering, elastic, inelastic; the "Hadronic Processes for
  proton" table printed at start-up (`protonInelastic Model: ProtonHPInelastic 0 → 200 MeV; Cr_sctns:
  ProtonHPInelasticXS 0 → 20 MeV, protonParticleXS above`) (sim: an energy axis with the model and dataset
  ranges as bars; an E slider shows which act). (2) reference physics lists and how to read a name: QGSP,
  BIC, HP, AllHP, EMZ, with the energy range each block covers (sim: assemble a name from blocks, see the
  coverage). (3) evaluated nuclear data: ENDF/B-VIII.0, TENDL-2019, what a file holds (σ(E) per channel,
  angular distributions, multiplicities ν(E)); the threshold E_th = −Q (m_p + m_t)/m_t, ⁷Li(p,n): Q = −1.644
  MeV → 1.88 MeV (sim: schematic σ(E) for ⁷Li, ⁹Be, ¹⁹F, Pb with their thresholds, labelled סכמטי).
  (4) thick-target yield Y(E₀) = (N_A/A) ∫ σ(E)/S_m(E) dE: stopping power, range, why density cancels, why a
  heavy target needs a σ about 30 times larger per unit energy lost; production vs depth flat beyond the
  range (sim: integrate σ/S for toy curves with an E₀ slider; yield vs E₀ and production vs depth; compare
  with `assets/ldns/3_birth_depth.png` and `4_proton_energy_at_reaction.png`). (5) validate: the multiplicity
  rounding since Geant4 11.2 (ν = 0.07 → 0 for ¹⁹F; Be 25 % high), the fix (Poisson for fractional ν),
  ratios Geant4/evaluated ≈ 1.00 below 20 MeV, what is not validated (above 20 MeV, ²⁰⁸Pb 10–16 MeV) (sim:
  ν(E) curve, "round" vs "Poisson" sampling, the mean neutrons each gives). A paragraph on production cuts
  (range cut, default 0.7 mm, for γ, e⁻, e⁺ from EM processes; neutrons have none).
- Formulas: Y(E₀); E_th; λ; σ_xn = σ_nonel · ν.
- Playground: "מעבדת התפוקה": material (Li, Be, LiF, Pb toy σ), E₀, physics-list choice (AllHP vs a
  cascade-like list that gives zero below 20 MeV for light nuclei), multiplicity mode; yield readout.
- Game: "לזהות את הרשימה": from a described need (light converter, 13 MeV protons; thick Pb at 100 MeV;
  thermal neutrons in HDPE) assemble the right list blocks; 3 rounds.
- Traps: more physics is always better (slower, and some models are invalid at low energy); the physics
  list is the physics (a set of choices, validate them); σ alone picks the material (σ/S); "HP" makes
  everything precise (only below 20 MeV, only where data exist).
- Problems: ⁷Li(p,n) threshold from Q (1.88 MeV); ⁹Be(p,n) threshold from Q = −1.850 MeV (2.06 MeV);
  mean neutrons from 1000 reactions with ν = 0.49 rounded vs Poisson (0 vs 490); which fraction of the
  ELIMAIA spectrum (102 MeV cut-off) is above the 20 MeV data limit, qualitatively; the number-density
  ratio Be/Pb (1.235×10²³ / 3.30×10²²).
- Quiz 5 + 2 review.

## 05 המקור: ספקטרום, קונוס ומשקלים (`05-source.html`)

- Hook: in the analog mix only about 2 % of the fired protons are above 6 MeV, but 57 % of the neutrons come
  from protons above 6 MeV. How do we give the tail statistics without biasing the answer? (weights.)
- Cycles: (1) `G4ParticleGun`: one particle per call with energy, direction, position, time; GPS as the
  general alternative; ldns sets the energy, the direction and the event weight in
  `PrimaryGeneratorAction` (code block: the 6 lines with `SampleEnergy`, `SetParticleEnergy`,
  `SetParticleMomentumDirection`) (sim: a gun firing with chosen E and direction). (2) sampling an energy
  from a table: f(E) = dN/dE/dΩ, the cumulative, inverse-CDF sampling (sim: a HERMIONE-like spectrum,
  exponential with T ≈ 0.8 MeV and a 13 MeV cut-off, its CDF, samples dropping on it, histogram vs curve).
  (3) directions uniform in solid angle: cos θ uniform in [cos θ_max, 1], φ uniform; the wrong way (θ
  uniform) piles particles on the axis; N_shot = 2π(1 − cos θ_max) ∫ f dE (sim: dots on the disc for both
  methods; N_shot readout). (4) weights: flat sampling, w = f(E)(E_max − E_min)/∫f, ⟨w⟩ = 1, every tally
  stays unbiased, only the variance changes; importance sampling (sim: analog vs flat with the same N; the
  neutron-yield estimate with error bars for a tail-dominated yield). (5) checking the input: the `primary`
  ntuple and `check_inputs.py`: weighted spectrum vs f(E) with χ², mean weight 1.000 ± 0.001, all directions
  in the cone, the cone fits the disc (figure: `assets/ldns/input_check.png`).
- Formulas: N_shot; inverse CDF; w; cos θ sampling; error of a weighted sum.
- Playground: "מעבדת המקור": T, cut-off, E_min, cone angle, sampling mode; readouts N_shot, ⟨E⟩, fraction
  above a threshold; the generated `/ldns/src/...` lines.
- Game: "לכוון את המקור": reach a target N_shot and ⟨E⟩ with E_min, E_max and the cone; 3 rounds.
- Traps: flat sampling changes the physics result (only the variance); θ uniform is isotropic (no);
  cutting below 1.85 MeV loses neutrons (none are made there); protons per shot is a property of the file
  (it depends on the cone and the energy range).
- Problems: Ω of a 20° cone (0.379 sr); N_shot from ∫f = 1.165×10¹² per sr (4.42×10¹¹); the weight of a
  12 MeV proton in flat sampling for a given f; relative error analog vs flat for a tail-dominated yield
  from given counts.
- Quiz 5 + 2 review.

## 06 מאקרו ושורת הפקודה (`06-macros.html`)

- Hook: a macro that looks fine, and Geant4 stops it with `illegal application state`. Which line? (an
  `/ldns/det/addLayer` after `/run/initialize`.)
- Cycles: (1) the UI manager and the command tree: `/run/`, `/control/`, `/random/`, `/vis/`,
  `/analysis/`, `/process/`, `/material/`, and the application's own messengers (`/ldns/det/`, `/ldns/src/`,
  `/ldns/out/`), each command with parameters, units, ranges and allowed states; `help` and `ls` in the
  GUI (sim: an explorable command tree). (2) application states PreInit → Init → Idle → GeomClosed →
  EventProc and which commands are legal when (sim: the state machine animated while a macro runs line by
  line; an illegal line stops with the real message). (3) anatomy of a run macro from
  `template_stageA.mac`: geometry, `/run/initialize`, source, output, `/run/beamOn`; `#` comments; units
  after numbers; `/control/alias` and `{VAR}`; `/control/foreach` and `/control/loop` for scans;
  `/run/printProgress` (sim: a macro runner that executes a macro in a mock terminal and prints what Geant4
  prints: the geometry table, the source summary, progress lines, the run summary with the site-wide
  numbers). (4) batch and interactive, the ldns command line: `-m` batch, `-u` GUI with a macro, `-g` stack,
  `-t` threads, `-s` seed, `-p` physics list, `-n` multiplicity mode; a shell script that writes macros and
  runs them (the idea of `run_spectra.sh`); relative paths are relative to the working directory. (5) the
  error catalogue: `integer expected` (`/run/beamOn 3e6`), a dot in `setFileName` (no ROOT file, a warning
  about an unsupported output type), `Cannot open spectrum file` (path), `command not found` (old binary),
  the same `setFileName` twice (overwritten), geometry after initialize, a trailing `/` (`/run/beamOn 300/`).
- The formula card becomes the order card: the canonical skeleton and the state table.
- Playground: "עורך המאקרו": a textarea with a macro; a validator checks order, state, units, integers,
  the dot, and shows Geant4-style messages; "run" prints the mock output.
- Game: "לתקן את המאקרו": three broken macros to fix by choosing or reordering lines; 3 rounds.
- Traps: units are optional (the default unit is taken silently); `3e6` is a fine integer (it is not);
  geometry can be changed after `/run/initialize` in this application (no); editing `macros/X.mac` in the
  source changes a run of `macros/X.mac` in `build/` (the build copies; run `../macros/X.mac`).
- Problems: expected run time from a measured rate; the `/control/loop` line for a thickness scan; fix the
  units in a given line; the output files produced by a given `setFileName` (`.root`, `_summary.json`).
- Quiz 5 + 2 review.

## 07 ויזואליזציה (`07-visualisation.html`)

- Hook: 10 000 protons from the real spectrum into Be, with a filter that draws neutrons only. How many
  green tracks appear? about 10 000 / about 100 / one or two / none. (one or two: one neutron per ~6000
  protons in the 0.5 MeV analog mix.) Lesson: pictures need a biased source (E_min 5 MeV, flat sampling),
  which is fine for pictures only.
- Cycles: (1) scene, scene handler (graphics driver: OGL/Qt, TSG, TSG_OFFSCREEN, VRML, HepRep) and viewer;
  `/vis/open`, `/vis/drawVolume`, `/vis/viewer/set/viewpointVector`, `/vis/viewer/set/style wireframe|surface`,
  `/vis/scene/add/axes`, `/vis/scene/add/trajectories smooth` (sim: a mini viewer of the ldns converter
  drawn as projected cylinders with axes; viewpoint θ, φ and zoom sliders; style toggle; the vis commands
  update live). (2) trajectory modelling: `drawByParticleID` with proton red, neutron green, gamma yellow,
  e⁻ blue; `drawByCharge` as the default; filters (`particleFilter`, `mode hard` discards unmatched
  trajectories to save memory); `endOfEventAction accumulate N` (sim: an event viewer with color model,
  filter toggles and accumulate count on schematic events). (3) GUI and offscreen: `./ldns -u vis_30J.mac`
  opens the Qt window; `/vis/open TSG_OFFSCREEN 1600x1000` and `/vis/tsg/export` write a PNG without a
  window; `-t 1` for pictures; the two real pictures as figures with captions
  (`assets/geometry_30J_Be4.png`: 300 protons, `assets/neutrons_30J_Be4.png`: neutron trajectories only,
  50 000 protons above 5 MeV). (4) the picture is not the result: few events, often a biased source,
  `/ldns/out/level 0`; the numbers come from the tallies; `/tracking/verbose 1` with `/run/beamOn 1` and
  `-t 1` as the text alternative (sim: the same run as a picture and as a histogram; 300 filtered tracks
  look like "many neutrons", the tally says 4.47×10⁻⁴). (5) reading a picture: the cone, the disc, where
  protons stop (the range), neutrons leaving in all directions, gammas; the colour legend (an annotated
  schematic that mirrors the real picture).
- The formula card becomes the vis command card: the 12 most useful commands and what each does.
- Playground: "מעבדת הצפייה": the full viewer with all toggles and the generated vis macro text.
- Game: "לשחזר את התמונה": a target picture (viewpoint, style, filter) is shown; set the controls to match;
  3 rounds.
- Traps: more accumulated events make a better picture (memory; `mode hard`); the picture is the result
  (no); wireframe hides the geometry (it shows the edges); offscreen export needs a display (no).
- Problems: expected neutron trajectories for N protons at a given yield; which E_min raises the neutrons
  per fired proton from 1/6000 to about 1/600 (qualitative, from the proton-energy table); the viewpoint
  vector for a side view; what `viewpointThetaPhi 70 20` means.
- Quiz 5 + 2 review.

## 08 פלט וניתוח: ntuples, ROOT ופייתון (`08-output.html`)

- Hook: the ROOT file of the Be 2 mm run has 6126 rows in `leak` from 3×10⁶ protons, with weights that sum to
  1341. How do we get to 1.97×10⁸ neutrons per shot: 6126 or 1341, and times what? (Σw / N_events × N_shot =
  4.47×10⁻⁴ × 4.42×10¹¹; the rows are not the neutrons because the run used flat sampling with weights.)
- Cycles: (1) `G4AnalysisManager`: histograms and ntuples, typed columns (I, D, S), one row per thing (a
  neutron leaving), files written per thread and merged, formats root/csv/hdf5; `/analysis/setFileName`
  without an extension (sim: a live ntuple filling as events run, with the real `leak` columns: evt, E,
  cosTheta, phi, x, y, z, dx, dy, dz, t, birthLayer, process, w). (2) output levels and file size: level 0
  summary only, 1 adds `leak` and `residual`, 2 adds `birth`, `reaction`, `primary` (about 48 bytes per
  event: 3×10⁶ events → about 150 MB) (sim: a size estimator). (3) from rows to physics: per proton Σw/N,
  per shot × N_shot; a weighted histogram; the lethargy plot E·dN/dE on a log axis (equal area = equal
  count per decade); dN/dΩ = Σw/(2π Δcos θ) per shot; the forward fraction (sim: a histogram builder fed by
  a toy stream: linear or log bins, lethargy toggle, error bars, per-shot readouts). (4) errors: the
  standard error from the event-by-event variance (one proton can make two neutrons, and the weights
  differ) versus √rows; in the real run ±27 on a weight sum of 1341 (sim: both estimates on a toy with multiplicity and weights). (5) reading the file
  in Python: the 8-line `uproot` snippet from the project README; the five standard plots and what each
  tells (figures: `assets/ldns/1_leak_spectrum.png` … `5_birth_spectrum.png`); `_summary.json` fields;
  sanity checks before believing a number: `check_inputs.py` PASS, the validation ratios ≈ 1.00, the
  Apollon benchmark 1.27, the comparison figure `assets/ldns/compare_30J.png`.
- Formulas: per-shot normalisation; lethargy; dN/dΩ; the error of a weighted sum; relative error.
- Playground: "מעבדת הניתוח": a toy `leak` dataset with chosen yield and spectrum; bins and scale; readouts
  per shot, forward fraction, ⟨E⟩, error.
- Game: "לנרמל נכון": given N_events, Σw and N_shot (random), compute per shot; 3 rounds.
- Traps: the error is √rows (weights and multiplicity); a dot in the file name is harmless (silent, no ROOT
  file); more columns are free (file size); the shape of a histogram depends on the binning (lethargy with
  log bins fixes it).
- Problems: per shot from Σw = 1341, N = 3×10⁶, N_shot = 4.42×10¹¹ (1.98×10⁸), and why 6126 rows is the wrong input; file size at level 2 for
  5×10⁶ events (about 240 MB); dN/dΩ for a bin with Σw = 120 in cos θ ∈ [0.9, 1] (per proton and per
  shot); the relative error from σ_event; the forward fraction from 1.172×10⁸ of 1.974×10⁸ (59 %).
- Quiz 5 + 2 review.
