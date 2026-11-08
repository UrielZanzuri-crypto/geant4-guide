/* PHY.ch04: chapter 4 helpers (physics lists, models and nuclear data), loaded before the chapter's sims.
   Needs PHY.ch01 (ch01/kit.js) for NA, binomial, poisson, hist, bars, mark, clock.

   Real numbers (from the run log E30J_M2p5_Be2.log and the ldns README):
   PROTON_TABLE   the "Hadronic Processes for proton" table and the proton EM models, energies in MeV
                  (0 eV is stored as 0, 100 TeV as 1e8). modelAt(E) and xsAt(E) say which act at E.
   threshold(Q, mt)  E_th = −Q (m_p + m_t)/m_t, masses in u (non-relativistic, as in the chapter)
   NUCLEI         ⁷Li, ⁹Be, ¹⁹F, Pb: (p,n) threshold in MeV (1.88, 2.06, 4.2, and ~10 for Pb, where it opens
                  in practice), Q where the chapter gives it, target mass in u.
   RANGE13        approximate range of a 13 MeV proton (PLAN): Be 1.3 mm, LiF 1 mm, Li 5 mm.

   Schematic (labelled סכמטי on every canvas): the shapes of σ(E), ν(E), the cascade ratio and the Pb range.
   sigma(key, E)     neutron-production cross section σ_xn(E) in barn, schematic shapes with the real thresholds
   nu(key, E)        mean neutrons per reaction: ⁷Li 1 (two-body, integer), ⁹Be 0.8 (an example value that
                     rounds to 1: +25 %), ¹⁹F 0.07 at 5 MeV (real) rising slowly (schematic), Pb 1
   multFactor(key, E, mode)  'fix' → 1; 'round' → round(ν)/ν (⁹Be 1.25, ¹⁹F 0, ⁷Li and Pb 1)
   cascadeRatio(key, E)      'cascade' list / evaluated: light nuclei 0 below 8 MeV, then rising to 0.5 at
                     20 MeV (toy, after the project's benchmark table); Pb 0.95
   rangeRho(mat, E)  range in g/cm² from the Bragg–Kleeman rule R ∝ E^1.75, anchored at the 13 MeV ranges;
   Sm(mat, E)        the mass stopping power dE/d(ρx) in MeV cm²/g that follows from it
   yieldOf(mat, E0, o)  thick-target yield per proton (N_A/A) Σ f_i ∫ σ_i/S_m dE, o: {list, mode};
                     the σ scale is set so that LiF at 5 MeV gives 5.0×10⁻⁴ (the benchmark table), so
                     every other value is a toy number and is shown as one.
   logAxis helpers: lg(E) = log10(E/MeV) with 0 eV drawn at the left edge. */
(function () {
  'use strict';
  const PHY = window.PHY;
  const F = PHY.fmt;
  const NA = 6.02214e23;
  const MP = 1.007276;

  const PROTON_TABLE = {
    hIoni: [{ name: 'Bragg', lo: 0, hi: 2 }, { name: 'BetheBloch', lo: 2, hi: 1e8 }],
    msc: [{ name: 'WentzelVIUni', lo: 0, hi: 1e8 }],
    elModel: [{ name: 'hElasticCHIPS', lo: 0, hi: 1e8 }],
    elXS: [{ name: 'BarashenkovGlauberGribov', lo: 0, hi: 1e8 }],
    inelModel: [
      { name: 'ProtonHPInelastic', short: 'HP', lo: 0, hi: 200 },
      { name: 'Binary Cascade', short: 'BIC', lo: 190, hi: 1500 },
      { name: 'BertiniCascade', short: 'BERT', lo: 1000, hi: 6000 },
      { name: 'FTFP', short: 'FTFP', lo: 3000, hi: 25000 },
      { name: 'QGSP', short: 'QGSP', lo: 12000, hi: 1e8 },
    ],
    inelXS: [
      { name: 'ProtonHPInelasticXS', short: 'HP data', lo: 0, hi: 20 },
      { name: 'protonParticleXS', short: 'G4PARTICLEXS', lo: 0, hi: 1e8 },
    ],
  };
  const inR = (r, E) => E >= r.lo && E <= r.hi;
  /* The models that act at E: one, or two inside an overlap (Geant4 then picks one at random). */
  const modelAt = (E) => PROTON_TABLE.inelModel.filter((m) => inR(m, E));
  /* The cross section: the HP data set where it applies (up to 20 MeV), protonParticleXS above. */
  const xsAt = (E) => (E <= 20 ? PROTON_TABLE.inelXS[0] : PROTON_TABLE.inelXS[1]);
  const ioniAt = (E) => (E < 2 ? PROTON_TABLE.hIoni[0] : PROTON_TABLE.hIoni[1]);

  const threshold = (Q, mt) => (-Q * (MP + mt)) / mt;

  const NUCLEI = {
    Li7: { key: 'Li7', label: '⁷Li', thr: 1.88, Q: -1.644, mass: 7.016003 },
    Be9: { key: 'Be9', label: '⁹Be', thr: 2.06, Q: -1.850, mass: 9.012183 },
    F19: { key: 'F19', label: '¹⁹F', thr: 4.2, mass: 18.998403 },
    Pb: { key: 'Pb', label: 'Pb', thr: 10, mass: 207.2 },
  };

  /* Schematic σ_xn shapes in barn (the thresholds are real, the shapes are not). */
  function sigma(key, E) {
    if (key === 'Li7') {
      if (E <= 1.88) return 0;
      const x = E - 1.88;
      return 0.26 * (1 - Math.exp(-x / 0.18)) + 0.3 * Math.exp(-Math.pow((E - 2.3) / 0.22, 2)) - 0.06 * (1 - Math.exp(-x / 4));
    }
    if (key === 'Be9') {
      if (E <= 2.06) return 0;
      const x = E - 2.06;
      return 0.17 * (1 - Math.exp(-x / 2.2)) + 0.05 * Math.exp(-Math.pow((E - 3.4) / 0.6, 2));
    }
    if (key === 'F19') {
      if (E <= 4.2) return 0;
      return 0.32 * (1 - Math.exp(-(E - 4.2) / 4.5));
    }
    if (key === 'Pb') {
      if (E <= 6) return 0;
      return 0.9 / (1 + Math.exp(-(E - 12.5) / 1.1));
    }
    return 0;
  }
  function nu(key, E) {
    if (key === 'Be9') return 0.8;
    if (key === 'F19') return Math.min(0.49, 0.07 + 0.42 * Math.max(0, (E - 5) / 25));
    return 1;
  }
  function multFactor(key, E, mode) {
    if (mode !== 'round') return 1;
    const n = nu(key, E);
    return Math.round(n) / n;
  }
  function cascadeRatio(key, E) {
    if (key === 'Pb') return 0.95;
    if (E <= 8) return 0;
    return Math.min(0.5, (0.5 * (E - 8)) / 12);
  }

  /* Materials: atoms per formula unit, molar mass A per formula unit, density, range of 13 MeV protons. */
  const MATS = {
    Li: { key: 'Li', name: 'Li', rho: 0.534, A: 6.94, parts: [{ n: 'Li7', f: 0.925 }], r13: 5, toy: false },
    Be: { key: 'Be', name: 'Be', rho: 1.848, A: 9.012, parts: [{ n: 'Be9', f: 1 }], r13: 1.3, toy: false },
    LiF: { key: 'LiF', name: 'LiF', rho: 2.635, A: 25.94, parts: [{ n: 'Li7', f: 0.925 }, { n: 'F19', f: 1 }], r13: 1, toy: false },
    Pb: { key: 'Pb', name: 'Pb', rho: 11.35, A: 207.2, parts: [{ n: 'Pb', f: 1 }], r13: 0.45, toy: true },
  };
  const P_BK = 1.75;
  const rangeRho = (mat, E) => (MATS[mat].r13 * 0.1 * MATS[mat].rho) * Math.pow(E / 13, P_BK);
  const rangeMm = (mat, E) => rangeRho(mat, E) / (0.1 * MATS[mat].rho);
  function Sm(mat, E) {
    const a = (MATS[mat].r13 * 0.1 * MATS[mat].rho) / Math.pow(13, P_BK);
    return 1 / (a * P_BK * Math.pow(E, P_BK - 1));
  }

  let SCALE = 1;
  function rawYield(mat, E0, o) {
    o = o || {};
    const M = MATS[mat];
    if (!(E0 > 0)) return 0;
    const nG = NA / M.A;
    let total = 0;
    M.parts.forEach(function (p) {
      const thr = p.n === 'Pb' ? 6 : NUCLEI[p.n].thr;
      if (E0 <= thr) return;
      const n = 240, h = (E0 - thr) / n;
      let s = 0;
      for (let i = 0; i <= n; i++) {
        const E = thr + i * h;
        let sg = sigma(p.n, E) * multFactor(p.n, E, o.mode);
        if (o.list === 'cascade') sg *= cascadeRatio(p.n, E);
        const v = sg / Sm(mat, E);
        s += (i === 0 || i === n ? 0.5 : 1) * v;
      }
      total += p.f * s * h;
    });
    return nG * total * 1e-24;
  }
  SCALE = 5.0e-4 / rawYield('LiF', 5, { list: 'allhp', mode: 'fix' });
  const yieldOf = (mat, E0, o) => SCALE * rawYield(mat, E0, o);
  const sigmaScaled = (key, E) => SCALE * sigma(key, E);

  /* Log energy axis: 0 eV (lo = 0) is drawn at the left edge xMin. */
  const lg = (E, xMin) => (E <= 0 ? xMin : Math.max(xMin, Math.log10(E)));
  function energyText(E) {
    if (E <= 0) return F.unit(0, 'eV', 0);
    if (E >= 1e6) return F.unit(E / 1e6, 'TeV', E >= 1e7 ? 0 : 1);
    if (E >= 1e3) return F.unit(E / 1e3, 'GeV', E >= 1e4 ? 0 : 1);
    if (E >= 1) return F.unit(E, 'MeV', E >= 10 ? 0 : 1);
    return F.unit(E * 1e3, 'keV', 0);
  }


  /* Reference lists the chapter lets us assemble: a base, the evaluated-data block, the EM option.
     AllHP exists only on QGSP_BIC. rows: what acts below 200 MeV (all from the log for QGSP_BIC_AllHP_EMZ;
     for the other lists only which block acts, without energy limits we did not check).
     lif5: neutrons per proton for LiF at 5 MeV, from the project's benchmark table where it was measured. */
  const BASES = ['QGSP_BIC', 'QGSP_INCLXX', 'FTFP_BERT'];
  const CASCADE = { QGSP_BIC: 'Binary Cascade', QGSP_INCLXX: 'INCL++', FTFP_BERT: 'BertiniCascade' };
  function listInfo(base, data, em) {
    const valid = data !== 'AllHP' || base === 'QGSP_BIC';
    const name = base + (data ? '_' + data : '') + (em ? '_' + em : '');
    const cas = CASCADE[base];
    const all = data === 'AllHP' && valid;
    const hpN = data === 'HP' || all;
    const rows = [
      { title: 'פרוטון: מודל התגובה הגרעינית', bars: all ? [{ lo: 0, hi: 200, label: 'ProtonHPInelastic', owner: 'data' }] : [{ lo: 0, hi: 200, label: cas, owner: 'base' }] },
      { title: 'פרוטון: חתך הפעולה של התגובה', bars: all ? [{ lo: 0, hi: 20, label: 'HP data', owner: 'data' }, { lo: 20, hi: 200, label: 'G4PARTICLEXS', owner: 'none' }] : [{ lo: 0, hi: 200, label: base === 'FTFP_BERT' ? 'פרמטריזציה' : 'G4PARTICLEXS', owner: 'base' }] },
      { title: 'נייטרון: תגובות ופיזור', bars: hpN ? [{ lo: 0, hi: 20, label: 'NeutronHP (G4NDL)', owner: 'data' }, { lo: 20, hi: 200, label: cas, owner: 'base' }] : [{ lo: 0, hi: 200, label: cas, owner: 'base' }] },
      { title: 'איבוד אנרגיה ופיזור (EM)', bars: [{ lo: 0, hi: 200, label: em === 'EMZ' ? 'EM option 4' : 'EM standard', owner: 'em' }] },
    ];
    let lif5;
    if (all) lif5 = { v: 5.0e-4, text: F.sci(5.0e-4, 1) };
    else if (base === 'QGSP_BIC') lif5 = { v: 0, text: '0' };
    else if (base === 'QGSP_INCLXX') lif5 = { v: 0, text: 'כמעט 0' };
    else lif5 = { v: null, text: 'לא נבדק' };
    return { name, valid, rows, lif5, all, hpN, em: em === 'EMZ' };
  }

  PHY.ch04 = { NA, MP, PROTON_TABLE, modelAt, xsAt, ioniAt, threshold, NUCLEI, sigma, sigmaScaled, nu, multFactor, cascadeRatio, MATS, rangeRho, rangeMm, Sm, yieldOf, lg, energyText, BASES, CASCADE, listInfo };
})();
