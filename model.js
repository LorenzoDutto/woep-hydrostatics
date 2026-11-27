/* ==========================================================================
 *  model.js  -  1D hydrostatic model of floating wind turbine platforms
 *               (semisubmersible, spar, barge)
 * ==========================================================================
 *
 *  This file contains ONLY the physics. It has no graphics in it, so it can be
 *  read side by side with the MATLAB script `exercise_statics.m`:
 *     semisubmersible -> Exercises 1 and 2
 *     spar            -> Exercise 3
 *     barge           -> Exercise 4
 *  The formulas are the same. The difference is in the direction of the calculation:
 *
 *    MATLAB exercise :  draft D is a target  ->  ballast is computed
 *    this tool       :  ballast is an input  ->  draft D is computed
 *                       (heave equilibrium), then static pitch is computed.
 *
 *  Structure of the file
 *    1. constants and turbine data (common to all platforms)
 *    2. one object per platform type (PLATFORMS.semisub / .spar / .barge).
 *       Each one describes its own geometry: submerged volume, centre of
 *       buoyancy, waterplane, ballast, mass items, limit angles of the linear
 *       model, checks.
 *    3. the common solver solve(type, params), the same for every platform:
 *       mass budget -> heave equilibrium -> centre of gravity -> stiffness
 *       -> static pitch -> failure checks.
 *
 *  Reference frames (both with x downwind = direction of the thrust, z upward,
 *  y completing a right-handed frame):
 *    - STRUCTURE frame (x, z): fixed to the platform, origin O on the platform axis at
 *      the still water level (SWL) of the upright floating position. It rotates with the
 *      platform. All hydrostatic quantities (CoB_0^Z, CoM^Z, J, K55, ...) are computed
 *      in this frame, in the upright position.
 *    - EARTH frame (X, Z): fixed to the ground, origin at the SWL. Used to show where
 *      CoM, CoB and metacentre are once the platform has pitched (see framesAt()).
 *  Positive pitch xi_5 = the turbine leans downwind (top moves to +x).
 *  Notation of the lecture slides: xi_5 = static pitch (variable `pitch`), K55 = pitch
 *  stiffness (`K`), K33 = heave stiffness (`heaveStiffness`), m = total mass
 *  (`totalMass`), CoM^X, CoM^Z = `COM[0]`, `COM[2]`, CoB_0^Z = `COB[2]` (upright CoB).
 *
 *  Units: SI everywhere inside this file (m, kg, N, rad).
 * ========================================================================== */

(function (root) {
  "use strict";

  // ---------------- 1. constants ----------------
  const RHO_W = 1025;     // kg/m3  sea water density
  const G = 9.80665;      // m/s2   gravity acceleration
  const RHO_STEEL = 7850; // kg/m3  structural steel density

  // ---------------- turbine model ----------------
  // The same 15 MW turbine on every platform, split into two parts:
  //   - RNA (rotor-nacelle assembly: blades + hub + nacelle). Its mass does NOT depend on
  //     the tower height. Rotor.mat / Semisub.mat: nacelle 680 t + hub 180 t + 3 blades of
  //     66.1 t = 1 058 t, rounded to 1 060 t. Its CoM is taken at hub height.
  //   - TOWER. Its mass grows linearly with the tower height, as in the NREL cost and
  //     scaling model (Fingersh, Hand & Laxson, 2006, NREL/TP-500-40566), where the tower
  //     mass is proportional to (rotor swept area) x (hub height): with a fixed rotor it is
  //     proportional to the hub height. Its CoM is at a fixed fraction of the tower height
  //     (a tapered tower has its CoM below mid-height).
  // The two constants (tower mass and CoM fraction) are calibrated so that, for the
  // reference hub height (135 m above the tower base), the turbine is exactly the one of the
  // exercise: 2 100 t, CoM 95 m above the tower base, CoM x = -2 m.
  const TURBINE_REF = { mass: 2100e3, comX: -2, comZrel: 95, hubRel: 135 };
  const RNA_REF_MASS = 1060e3;                                              // kg
  const TOWER_REF_MASS = TURBINE_REF.mass - RNA_REF_MASS;                   // 1 040 t at the reference height
  const TOWER_COM_FRACTION = (TURBINE_REF.mass * TURBINE_REF.comZrel - RNA_REF_MASS * TURBINE_REF.hubRel)
    / (TOWER_REF_MASS * TURBINE_REF.hubRel);                                // = 0.402 (tower CoM at 40 % of its height)
  const RNA_COM_X = TURBINE_REF.comX * TURBINE_REF.mass / RNA_REF_MASS;    // = -3.96 m (rotor overhang, upwind)

  // User-adjustable turbine, load and design-objective parameters
  const TURBINE_DEFAULTS = {
    rnaMass: RNA_REF_MASS, // kg  rotor-nacelle assembly mass (independent of the tower height)
    hubHeightRel: 135,     // m   hub height ABOVE THE TOWER BASE (= 150 m above SWL when the base is at +15 m)
    hubX: -10,             // m   rotor centre x-position (overhang, upwind)
    rotorRadius: 121,      // m   rotor radius (117 m blade + 4 m hub, Rotor15MW.mat)
    thrust: 2e6,           // N   maximum rotor thrust
    pitchLimitDeg: 10,     // deg design objective: allowable static pitch
    minTipClearance: 20,   // m   design objective: minimum distance between the lowest blade tip and the SWL
  };

  /** Turbine mass items (heights measured from the tower base). */
  function turbineParts(p) {
    const towerMass = TOWER_REF_MASS * p.hubHeightRel / TURBINE_REF.hubRel;
    const rna = { m: p.rnaMass, x: RNA_COM_X, zRel: p.hubHeightRel };
    const tower = { m: towerMass, x: 0, zRel: TOWER_COM_FRACTION * p.hubHeightRel };
    const mass = rna.m + tower.m;
    return { rna, tower, mass, comX: (rna.m * rna.x) / mass, comZrel: (rna.m * rna.zRel + tower.m * tower.zRel) / mass };
  }

  /* ==========================================================================
   *  2. PLATFORM TYPES
   *  Each platform has:
   *    name, refDraft     reference draft used to compute the default ballast
   *    steelRefMass       steel mass of the reference design (exercise); it sets the
   *                       default equivalent steel thickness
   *    DEFAULTS           platform parameters (t_steel and ballastMass are filled in at start-up)
   *    surfaceArea(p)     hull shell area: steel mass = rho_steel * area * t_steel
   *    build(p)           returns the "hull" object used by the solver:
   *        A_wp, J              waterplane area and inertia (pitch axis)
   *        height               keel-to-top height (used for the sinking check)
   *        Vs(D), zB(D)         submerged volume and centre of buoyancy vs draft
   *        draftFor(V)          inverse of Vs(D)
   *        otherMass            fixed ballast not controlled by the ballast slider
   *        ballastHeight(M)     height of the ballast for a mass M
   *        ballastMaxHeight     space available for the ballast
   *        items(D, steel, hb)  platform mass items {name, m, x, z}
   *        towerBase(D)         height of the tower base above the SWL
   *        crit(D, FB)          limit angles of the linear model (hull top under water or
 *                             keel out of water) for positive / negative pitch
   *        checks(r, msg)       platform-specific warnings
   * ======================================================================== */

  // ------------------------------------------------------------------------
  //  2a. SEMISUBMERSIBLE (VolturnUS-S-like), Exercises 1-2
  //     - 1 central column (diameter d) carrying the tower
  //     - 3 external columns (diameter d_EC) at radial distance s_EC
  //         * one column UPWIND  at  x = -s_EC          (y = 0)
  //         * two columns DOWNWIND at x = +s_EC/2       (y = +/- s_EC*sqrt(3)/2)
  //     - 3 rectangular pontoons (W_P x H_P) FILLED WITH SEA WATER
  //     - concrete ballast at the BOTTOM of the 3 external columns
  // ------------------------------------------------------------------------
  const semisub = {
    key: "semisub",
    name: "Semisubmersible",
    refDraft: 18,
    steelRefMass: 3500e3,
    DEFAULTS: {
      d: 12,                 // m   central column diameter
      d_EC: 13,              // m   external column diameter
      s_EC: 50,              // m   distance between central and external columns
      H_col: 33,             // m   total column height (keel to top) = D + FB = 18 + 15
      H_P: 6,                // m   pontoon height
      W_P: 9,                // m   pontoon width
      t_steel: 0,            // m   equivalent steel thickness (filled in below: gives 3 500 t)
      rho_b: 2400,           // kg/m3 concrete density
      ballastMass: 0,        // kg  concrete ballast (filled in below: 3 833 378 kg gives D = 18 m)
      waterFill: 1.0,        // -   filling ratio of the pontoons with sea water (1 = full)
    },
    surfaceArea(p) {
      const L_P = p.s_EC - p.d_EC / 2 - p.d / 2;
      const A_c = 0.25 * Math.PI * p.d ** 2, A_ec = 0.25 * Math.PI * p.d_EC ** 2;
      return Math.PI * p.d * p.H_col + 3 * Math.PI * p.d_EC * p.H_col   // column walls
        + 2 * (A_c + 3 * A_ec)                                           // top + bottom plates
        + 3 * 2 * (p.W_P + p.H_P) * Math.max(L_P, 0);                    // pontoons
    },
    build(p) {
      const L_P = p.s_EC - p.d_EC / 2 - p.d / 2;            // pontoon length (approx., as in MATLAB)
      if (L_P <= 0.5) return { error: "Invalid geometry: the external columns overlap the central column (pontoon length ≤ 0). Increase the column spacing s_EC or reduce the diameters." };
      if (p.H_P >= p.H_col) return { error: "Invalid geometry: the pontoon height must be smaller than the column height." };
      const A_c = 0.25 * Math.PI * p.d ** 2;                // central column section
      const A_ec = 0.25 * Math.PI * p.d_EC ** 2;            // one external column section
      const A_wp = A_c + 3 * A_ec;                          // waterplane area (all 4 columns)
      const V_P = 3 * L_P * p.W_P * p.H_P;                  // total pontoon volume
      // Waterplane second moment of area about the y axis (pitch axis):
      //   3 external columns: sum(x_i^2) * A_ec = s^2*(1 + 1/4 + 1/4) * A_ec = 1.5 s^2 A_ec
      //   + own inertia of each circle pi d^4 / 64
      const J = 1.5 * p.s_EC ** 2 * A_ec + Math.PI * p.d ** 4 / 64 + 3 * Math.PI * p.d_EC ** 4 / 64;
      const footprint = A_wp + V_P / p.H_P;                 // horizontal area at pontoon level
      return {
        A_wp, J, L_P, V_P, A_c, A_ec,
        height: p.H_col,
        // Vs(D) = A_wp*D + V_P (columns from keel to SWL + pontoons, as in MATLAB).
        // For D < H_P the pontoons pierce the free surface.
        Vs: (D) => D >= p.H_P ? A_wp * D + V_P : footprint * D,
        zB: (D) => D >= p.H_P ? (A_wp * D * (-D / 2) + V_P * (-D + p.H_P / 2)) / (A_wp * D + V_P) : -D / 2,
        draftFor: (V) => V <= footprint * p.H_P ? V / footprint : (V - V_P) / A_wp,
        otherMass: p.waterFill * V_P * RHO_W,               // water ballast in the pontoons
        ballastHeight: (M) => M / (3 * p.rho_b * A_ec),     // concrete split in the 3 external columns
        ballastMaxHeight: p.H_col,
        items: (D, steel, hb) => [
          { name: "Platform steel", m: steel, x: 0, z: -D + p.H_col / 2 },     // mid column height (as in MATLAB)
          { name: "Water ballast (pontoons)", m: p.waterFill * V_P * RHO_W, x: 0, z: -D + p.waterFill * p.H_P / 2 },
          { name: "Concrete ballast (ext. columns)", m: p.ballastMass, x: 0, z: -D + hb / 2 },
        ],
        towerBase: (D) => p.H_col - D,                      // tower on top of the central column
        crit: (D, FB) => {
          // positive pitch: downwind columns go down, upwind column goes up
          const xDown = p.s_EC / 2 + p.d_EC / 2;            // outer edge of the downwind columns
          const xUp = p.s_EC + p.d_EC / 2;                  // outer edge of the upwind column
          return {
            pos: minAngle([Math.atan(FB / xDown), "the top of the downwind columns goes under water"],
                          [Math.atan(D / xUp), "the keel of the upwind column comes out of the water"]),
            neg: minAngle([Math.atan(FB / xUp), "the top of the upwind column goes under water"],
                          [Math.atan(D / xDown), "the keel of the downwind columns comes out of the water"]),
          };
        },
        minFreeboard: 8,
        checks(r, msg) {
          const D = r.draft;
          // upwind pontoon top reaches the SWL: the waterplane changes, the linear model degrades
          r.pontoonEmergence = Math.atan(Math.max(D - p.H_P, 0) / Math.max(p.s_EC - p.d_EC / 2, 1e-6));
          if (!r.capsizes && r.pitch > 0 && r.pitch > r.pontoonEmergence) {
            msg.push({ level: "warn", text: `At ${deg(r.pitch).toFixed(1)}° the upwind pontoon reaches the free surface (from ${deg(r.pontoonEmergence).toFixed(1)}°). The waterplane changes, so the linear (small-angle) stiffness is only approximate.` });
          }
          if (D < p.H_P) {
            msg.push({ level: "warn", text: `The draft (${D.toFixed(1)} m) is smaller than the pontoon height (${p.H_P.toFixed(1)} m): the pontoons pierce the free surface, which is unusual for a semisubmersible. J and A_wp count the columns only, so K₅₅ and K₃₃ are not valid here.` });
          } else if (D < p.H_P + 3) {
            msg.push({ level: "info", text: `Very shallow draft: the pontoons are only ${(D - p.H_P).toFixed(1)} m below the surface. They will be strongly excited by waves.` });
          }
        },
      };
    },
  };

  // ------------------------------------------------------------------------
  //  2b. SPAR, Exercise 3
  //     - one long cylinder (diameter d, total length L from keel to top)
  //     - solid ballast (iron ore, rho_b = 5000 kg/m3) at the bottom
  //     - the tower stands on top of the cylinder
  //  Reference (MATLAB): d = 16 m, D = 104 m, FB = 15 m  ->  L = 119 m
  // ------------------------------------------------------------------------
  const spar = {
    key: "spar",
    name: "Spar",
    refDraft: 104,
    steelRefMass: 4000e3,
    DEFAULTS: {
      d: 16,                 // m   spar diameter
      L_spar: 119,           // m   total spar length (keel to top) = D + FB = 104 + 15
      t_steel: 0,            // m   equivalent steel thickness (filled in below: gives 4 000 t)
      rho_b: 5000,           // kg/m3 iron ore ballast
      ballastMass: 0,        // kg  (filled in below to give D = 104 m)
    },
    surfaceArea(p) { return Math.PI * p.d * p.L_spar + 2 * 0.25 * Math.PI * p.d ** 2; },
    build(p) {
      const A = 0.25 * Math.PI * p.d ** 2;                  // cross-section = waterplane area
      const J = Math.PI * p.d ** 4 / 64;                    // waterplane inertia (circle)
      return {
        A_wp: A, J,
        height: p.L_spar,
        Vs: (D) => A * D,
        zB: (D) => -D / 2,
        draftFor: (V) => V / A,
        otherMass: 0,
        ballastHeight: (M) => M / (p.rho_b * A),
        ballastMaxHeight: p.L_spar,
        items: (D, steel, hb) => [
          { name: "Platform steel", m: steel, x: 0, z: -D + p.L_spar / 2 },  // (-D+FB)/2 as in MATLAB
          { name: "Solid ballast (bottom)", m: p.ballastMass, x: 0, z: -D + hb / 2 },
        ],
        towerBase: (D) => p.L_spar - D,
        crit: (D, FB) => {
          const R = p.d / 2;
          const c = minAngle([Math.atan(FB / R), "the top of the spar goes under water"],
                             [Math.atan(D / R), "the keel of the spar comes out of the water"]);
          return { pos: c, neg: c };
        },
        minFreeboard: 8,
        checks() {},
      };
    },
  };

  // ------------------------------------------------------------------------
  //  2c. BARGE, Exercise 4
  //     - square box W x W, hull height H (keel to deck)
  //     - ballast (sea water by default) spread over the whole bottom
  //     - a short pedestal (transition piece) between deck and tower base
  //  Reference (MATLAB + Barge.mat): W = 52 m, D = 7 m, H = 14 m (deck at +7 m),
  //  pedestal 8 m  ->  tower base at +15 m, as for the other platforms.
  // ------------------------------------------------------------------------
  const barge = {
    key: "barge",
    name: "Barge",
    refDraft: 7,
    steelRefMass: 3000e3,
    DEFAULTS: {
      W: 52,                 // m   barge width (square)
      H_hull: 14,            // m   hull height (keel to deck)
      H_ped: 8,              // m   pedestal height (deck to tower base)
      t_steel: 0,            // m   equivalent steel thickness (filled in below: gives 3 000 t)
      rho_b: 1025,           // kg/m3 ballast density (sea water)
      ballastMass: 0,        // kg  (filled in below to give D = 7 m)
    },
    surfaceArea(p) { return 2 * p.W ** 2 + 4 * p.W * p.H_hull; },
    build(p) {
      const A = p.W ** 2;                                   // waterplane area
      const J = p.W ** 4 / 12;                              // waterplane inertia (square)
      return {
        A_wp: A, J,
        height: p.H_hull,
        Vs: (D) => A * D,
        zB: (D) => -D / 2,
        draftFor: (V) => V / A,
        otherMass: 0,
        ballastHeight: (M) => M / (p.rho_b * A),
        ballastMaxHeight: p.H_hull,
        items: (D, steel, hb) => [
          { name: "Platform steel", m: steel, x: 0, z: -D + p.H_hull / 2 },  // mid hull height (= 0 for the reference, as in MATLAB)
          { name: "Ballast (bottom of the hull)", m: p.ballastMass, x: 0, z: -D + hb / 2 },
        ],
        towerBase: (D) => p.H_hull - D + p.H_ped,
        crit: (D, FB) => {
          const B = p.W / 2;
          const c = minAngle([Math.atan(FB / B), "the deck edge goes under water"],
                             [Math.atan(D / B), "the upwind bottom edge comes out of the water"]);
          return { pos: c, neg: c };
        },
        minFreeboard: 3,
        checks() {},
      };
    },
  };

  const PLATFORMS = { semisub, spar, barge };

  /** Merge turbine defaults, platform defaults and user values. */
  function fullParams(type, pIn) {
    return Object.assign({}, TURBINE_DEFAULTS, PLATFORMS[type].DEFAULTS, pIn);
  }

  /**
   * Steel mass of the hull = steel density x shell area x equivalent thickness.
   * The equivalent thickness "smears" plates, stiffeners, bulkheads and outfitting over the
   * outer shell; it is therefore larger than the bare plate thickness.
   */
  function effectiveSteelMass(type, pIn) {
    const P = PLATFORMS[type], p = fullParams(type, pIn);
    return RHO_STEEL * P.surfaceArea(p) * p.t_steel;
  }

  /* ========================================================================
   *  3. MAIN SOLVER (same for every platform)
   *  Returns an object with every intermediate result + a list of messages
   *  ({level: 'ok'|'info'|'warn'|'error', text}).
   * ====================================================================== */
  function solve(type, pIn) {
    const p = fullParams(type, pIn);
    const msg = [];
    const r = { type, params: p, messages: msg, valid: true, sinks: false, capsizes: false };

    // ---------------- 0. geometry ----------------
    const hull = PLATFORMS[type].build(p);
    r.hull = hull;
    if (hull.error) {
      msg.push({ level: "error", text: hull.error });
      r.valid = false;
      return r;
    }

    // ---------------- 1. mass budget ----------------
    const steelMass = effectiveSteelMass(type, p);
    const turb = turbineParts(p);                                // RNA + tower (tower mass grows with its height)
    const totalMass = turb.mass + steelMass + hull.otherMass + p.ballastMass;
    r.steelMass = steelMass;
    r.shellArea = PLATFORMS[type].surfaceArea(p);
    r.turbine = turb;
    r.totalMass = totalMass;

    const ballastHeight = hull.ballastHeight(p.ballastMass);
    r.ballastHeight = ballastHeight;
    if (ballastHeight > hull.ballastMaxHeight) {
      msg.push({ level: "error", text: `Too much ballast: it needs ${ballastHeight.toFixed(1)} m of height but only ${hull.ballastMaxHeight.toFixed(1)} m are available. There is no room for it.` });
      r.valid = false;
    }

    // ---------------- 2. heave equilibrium (S1):  rho_w * Vs(D) = m ----------------
    const Vreq = totalMass / RHO_W;                              // volume that must be displaced
    const Vmax = hull.Vs(hull.height);                           // volume when fully submerged
    r.reserveBuoyancy = (Vmax - Vreq) / Vreq;
    const D = hull.draftFor(Vreq);
    r.draft = D;
    if (Vreq > Vmax) {
      r.sinks = true;
      r.valid = false;
      msg.push({ level: "error", text: `The platform SINKS: total mass ${tonnes(totalMass)} exceeds the maximum buoyancy ${tonnes(Vmax * RHO_W)} (hull completely submerged). Reduce the ballast or increase the hull volume.` });
      return r;
    }
    if (!r.valid) return r;

    const FB = hull.height - D;                                  // freeboard
    const Vs = hull.Vs(D);
    const COBz = hull.zB(D);
    const base = hull.towerBase(D);                              // tower base above SWL
    r.freeboard = FB;
    r.towerBase = base;
    r.Vs = Vs;
    r.COB = [0, 0, COBz];                                        // CoB, upright, structure frame (symmetric hull -> x = y = 0)

    // ---------------- 3. centre of mass of the full device ----------------
    const items = [
      { name: "Rotor-nacelle assembly (RNA)", m: turb.rna.m, x: turb.rna.x, z: base + turb.rna.zRel },
      { name: "Tower", m: turb.tower.m, x: turb.tower.x, z: base + turb.tower.zRel },
    ].concat(hull.items(D, steelMass, ballastHeight));
    const COMx = items.reduce((a, it) => a + it.m * it.x, 0) / totalMass;
    const COMz = items.reduce((a, it) => a + it.m * it.z, 0) / totalMass;
    r.items = items;
    r.COM = [COMx, 0, COMz];                                     // CoM of the whole device (platform + turbine), structure frame

    // ---------------- 4. pitch stiffness (S12) ----------------
    // 1D approach: of the 6x6 restoring (stiffness) matrix of the floating body, only the
    // pitch-pitch term K55 is kept (DOF 5 = rotation about the y axis, through O at the SWL);
    // couplings with the other DOFs and the mooring are neglected. K55 = Kh + Kg with
    //   Hydrostatic part   Kh = rho_w g (J + Vs * CoB_0^Z)   (CoB_0^Z < 0 -> destabilising term)
    //   Gravity part       Kg = - m g CoM^Z                  (CoM^Z > 0  -> destabilising)
    // so that the restoring moment for a small pitch angle xi_5 is  M_restoring = K55 * xi_5.
    const Kh = RHO_W * G * (hull.J + Vs * COBz);
    const Kg = -totalMass * G * COMz;
    const K = Kh + Kg;
    r.Kh = Kh; r.Kg = Kg; r.K = K;
    r.heaveStiffness = RHO_W * G * hull.A_wp;                    // K33 = rho_w g A_wp (S13)
    r.BM = hull.J / Vs;
    r.KB = COBz + D;
    r.KG = COMz + D;
    r.GM = K / (RHO_W * G * Vs);                                 // GM = K / (rho g Vs)

    // ---------------- 5. static pitch under maximum thrust ----------------
    const hubHeight = base + p.hubHeightRel;                     // hub height above SWL
    r.hubHeight = hubHeight;
    // Pitch equilibrium about O (S7, S10):  K55 * xi_5 = M_ext, with the overturning moment
    //   M_ext = F_T h_hub + m g CoM^X - rho_w g Vs CoB_0^X = F_T h_hub + m g (CoM^X - CoB_0^X)
    // (moment of the thrust + couple of weight and buoyancy when CoM and CoB are not on the
    //  same vertical in the upright position; m = rho_w Vs at heave equilibrium, S1).
    // For these symmetric hulls CoB_0^X = 0, so the second term is m g CoM^X
    // (CoM^X < 0: the overhanging rotor makes the turbine lean upwind).
    const M_thrust = p.thrust * hubHeight;                       // thrust * lever arm (about the SWL)
    const M_weight = totalMass * G * (COMx - r.COB[0]);          // weight-buoyancy couple
    const M_ext = M_thrust + M_weight;
    r.M_thrust = M_thrust; r.M_weight = M_weight; r.M_ext = M_ext;

    // Limit angles of the linear model (geometry only, the small-angle model keeps the draft):
    // beyond them the deck edge is under water or the keel is out of water, so the
    // waterplane changes and the linear stiffness no longer holds.
    const crit = hull.crit(D, FB);
    r.critPos = crit.pos[0]; r.critPosReason = crit.pos[1];
    r.critNeg = crit.neg[0]; r.critNegReason = crit.neg[1];

    if (K <= 0) {
      r.pitch = NaN;
      r.capsizes = true;
      msg.push({ level: "error", text: `UNSTABLE: the pitch stiffness is not positive (K₅₅ = ${(K / 1e9).toFixed(2)} GN·m/rad, GM = ${r.GM.toFixed(2)} m). The CoM is above the metacentre M. The platform capsizes even without wind.` });
    } else {
      const pitch = M_ext / K;                                   // rad
      r.pitch = pitch;
      const c = pitch >= 0 ? r.critPos : r.critNeg;
      const reason = pitch >= 0 ? r.critPosReason : r.critNegReason;
      if (Math.abs(pitch) >= c) {
        r.capsizes = true;
        msg.push({ level: "error", text: `LINEAR-MODEL LIMIT: the static pitch ξ₅ (${deg(pitch).toFixed(1)}°) exceeds the limit of the linear model, ${deg(c).toFixed(1)}° (deck edge under water or keel out of water; here ${reason}). The result is not valid. Increase the pitch stiffness K₅₅.` });
      } else if (Math.abs(pitch) > deg2rad(p.pitchLimitDeg)) {
        msg.push({ level: "warn", text: `The static pitch ξ₅ (${deg(pitch).toFixed(1)}°) exceeds the allowable value ξ₅,max = ${p.pitchLimitDeg.toFixed(1)}°. The platform floats, but the turbine would lose power and suffer extra loads. Increase the pitch stiffness K₅₅.` });
      }
    }

    // ---------------- 5b. positions in the two reference frames ----------------
    // STRUCTURE frame (x_b, z_b): fixed to the platform. Origin on the platform axis at the
    //   still water line when the platform is upright. It moves and rotates with the platform.
    // EARTH frame (X, Z): fixed to the ground/sea. Origin at the still water line.
    // For a pitch angle th (top towards +X), a structure point (x_b, z_b) is at
    //   X =  x_b cos(th) + z_b sin(th),   Z = -x_b sin(th) + z_b cos(th)
    //
    // CoM: the masses are rigidly attached to the structure, so the CoM has FIXED structure
    //   coordinates and simply rotates with the platform.
    // CoB: it is the centroid of the SUBMERGED volume. When the platform tilts, the immersed
    //   side gains volume and the emerged side loses it, so the CoB moves towards the immersed
    //   side. For small angles (the same assumption behind K) it moves on an arc of radius BM
    //   around the metacentre M, which is fixed in the structure frame at z_M = z_CoB + BM:
    //     structure frame:  ( BM sin(th),  z_M - BM cos(th) )
    //     earth frame:      ( z_M sin(th), z_M cos(th) - BM )   -> always directly below M
    // The horizontal distance between CoB and CoM (earth frame) is the lever arm of the
    // righting couple: M g (X_CoB - X_CoM) ~ rho g Vs (z_M - z_CoM) th - x_CoM M g = K th - x_CoM M g
    const zM = COBz + r.BM;
    r.zM = zM;
    r.frames = framesAt(r, (isFinite(r.pitch) && !r.capsizes) ? r.pitch : 0, p);

    // ---------------- 6. blade tip clearance (safety check) ----------------
    // Lowest blade tip = rotor centre minus radius. When the platform pitches the
    // rotor tilts with it, so the clearance is checked both upright and at the
    // static pitch angle, and the smaller value is used.
    const th = (isFinite(r.pitch) && !r.capsizes) ? r.pitch : 0;
    const tipUpright = hubHeight - p.rotorRadius;
    const tipPitched = -p.hubX * Math.sin(th) + (hubHeight - p.rotorRadius) * Math.cos(th);
    const tipClearance = Math.min(tipUpright, tipPitched);
    r.tipClearance = tipClearance;
    r.tipOk = tipClearance >= p.minTipClearance;
    if (!r.tipOk) {
      msg.push({ level: "error", text: `BLADE CLEARANCE: the lowest blade tip is only ${tipClearance.toFixed(1)} m above the still water line (minimum ${p.minTipClearance.toFixed(0)} m). Blades could hit waves or vessels. Raise the hub (taller tower) or increase the freeboard.` });
    }

    // ---------------- 7. other design-quality checks ----------------
    if (FB < hull.minFreeboard) {
      msg.push({ level: "warn", text: `Low freeboard (${FB.toFixed(1)} m): waves will overtop the hull (green water).` });
    }
    hull.checks(r, msg);
    if (ballastHeight > D) {
      msg.push({ level: "info", text: `The ballast (h_b = ${ballastHeight.toFixed(1)} m) extends above the still water line.` });
    }
    if (p.ballastMass === 0) {
      msg.push({ level: "info", text: "No ballast: the platform is floating as light as possible." });
    }
    if (!msg.some((m) => m.level === "error" || m.level === "warn")) {
      const lim = r.pitch >= 0 ? r.critPos : r.critNeg;          // limit in the direction of the pitch
      msg.unshift({ level: "ok", text: `The design works: draft ${D.toFixed(2)} m, static pitch ξ₅ = ${deg(r.pitch).toFixed(2)}° (allowable ${p.pitchLimitDeg.toFixed(1)}°, linear-model limit ${deg(lim).toFixed(1)}°), tip clearance ${tipClearance.toFixed(1)} m.` });
    }
    return r;
  }

  /* ------------------------------------------------------------------------
   *  Inverse problem = original exercise: ballast needed to reach a target draft
   *     M_b = rho_w Vs(D_target) - (M_turbine + M_steel + other fixed ballast)
   * ---------------------------------------------------------------------- */
  function ballastForDraft(type, pIn, Dtarget) {
    const p = fullParams(type, pIn);
    const hull = PLATFORMS[type].build(p);
    if (hull.error) return NaN;
    return RHO_W * hull.Vs(Dtarget) - (turbineParts(p).mass + effectiveSteelMass(type, p) + hull.otherMass);
  }

  // Defaults computed at start-up, so that the reference designs are those of the exercise:
  //  - equivalent steel thickness giving the reference steel mass
  //    (semisub 3 500 t -> 46.0 mm, spar 4 000 t -> 79.8 mm, barge 3 000 t -> 45.9 mm);
  //  - ballast giving the reference draft
  //    (semisub: 3 833 378 kg concrete, spar: 15 333 202 kg iron ore, barge: 14 301 200 kg water).
  Object.values(PLATFORMS).forEach((P) => {
    P.DEFAULTS.t_steel = P.steelRefMass / (RHO_STEEL * P.surfaceArea(P.DEFAULTS));
    P.DEFAULTS.ballastMass = ballastForDraft(P.key, {}, P.refDraft);
  });

  /** Structure-frame -> earth-frame rotation for a pitch angle th (top moves to +X). */
  function toEarth(x, z, th) { return [x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th)]; }

  /**
   * Positions of CoM, CoB, metacentre M and hub, in the structure frame and in the earth
   * frame, at the pitch angle th. Also returns the CoB-CoM lever arm and the righting couple.
   */
  function framesAt(r, th, p) {
    const BM = r.BM, zM = r.zM;
    const comS = [r.COM[0], r.COM[2]];                                      // fixed in the structure
    const cobS0 = [0, r.COB[2]];                                             // upright CoB
    const cobS = [BM * Math.sin(th), zM - BM * Math.cos(th)];                // CoB moved along the arc around M
    const mS = [0, zM];                                                      // metacentre (fixed in the structure)
    const hubS = [p.hubX, r.hubHeight];
    const comE = toEarth(comS[0], comS[1], th);
    const cobE = toEarth(cobS[0], cobS[1], th);                              // = (zM sin th, zM cos th - BM)
    const lever = cobE[0] - comE[0];                                         // horizontal CoB-CoM distance (earth frame)
    return {
      th, comS, cobS0, cobS, mS, hubS,
      comE, cobE, mE: toEarth(mS[0], mS[1], th), hubE: toEarth(hubS[0], hubS[1], th),
      lever,
      rightingCouple: r.totalMass * G * lever,                               // M g (X_CoB - X_CoM)
    };
  }

  /**
   * Root of f(x) = 0 between a and b by bisection (pure helper, used by the exercises,
   * e.g. the barge width at which K55 = 0). f(a) and f(b) must have opposite signs;
   * otherwise NaN is returned.
   */
  function bisect(f, a, b, tol = 1e-6, maxIter = 200) {
    let fa = f(a);
    const fb = f(b);
    if (!(fa * fb <= 0)) return NaN;
    for (let i = 0; i < maxIter && Math.abs(b - a) > tol; i++) {
      const c = 0.5 * (a + b), fc = f(c);
      if (fa * fc <= 0) { b = c; } else { a = c; fa = fc; }
    }
    return 0.5 * (a + b);
  }

  function minAngle(a, b) { return a[0] <= b[0] ? a : b; }
  function tonnes(kg) { return Math.round(kg / 1e3).toLocaleString("en-US") + " t"; }
  function deg(rad) { return rad * 180 / Math.PI; }
  function deg2rad(d) { return d * Math.PI / 180; }

  root.HydroModel = { VERSION: "1.2.0", RHO_W, G, RHO_STEEL, TURBINE_DEFAULTS, PLATFORMS, fullParams, solve, ballastForDraft, effectiveSteelMass, turbineParts, toEarth, deg, deg2rad, bisect };
  if (typeof module !== "undefined" && module.exports) module.exports = root.HydroModel;
})(typeof window !== "undefined" ? window : globalThis);
