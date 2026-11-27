/* ==========================================================================
 *  app.js  -  user interface and figures of the Floating Wind Hydrostatics Lab
 * ==========================================================================
 *  - the header switch selects the platform: semisubmersible, spar or barge
 *  - the sliders are built from the tables below (UI[type].groups + TURBINE_GROUP)
 *  - every time a slider moves: params -> HydroModel.solve(type, params) -> redraw
 *  - figures are plain SVG drawn by hand (no external library, works offline)
 *  - tabs: Dashboard, Conventions, Heave, Pitch stiffness, Static pitch, Equations
 *  - displayed text uses the notation of the lecture slides (xi_5, K55, K33, m, CoM^Z,
 *    CoB_0^Z, ...); the JavaScript names keep the model's names (pitch, K, totalMass, COM, COB)
 *
 *  To add a slider: add a line to the right group below, with the key of the
 *  parameter (it must exist in the platform DEFAULTS or in TURBINE_DEFAULTS of
 *  model.js) and the factor f that converts the displayed unit into SI.
 * ========================================================================== */
(function () {
  "use strict";
  const M = window.HydroModel;
  const deg = M.deg;

  // ------------------------------------------------------------------------
  //  Slider definitions. f = factor: displayed value * f = SI value.
  //  min/max = slider range. The number box accepts values OUTSIDE the slider range,
  //  limited only by the physical limits hardMin (default 0) and hardMax (default none).
  // ------------------------------------------------------------------------
  // Turbine sliders (shared by all platforms)
  const TURBINE_GROUP = {
    group: "Turbine and load", scope: "turbine",
    note: "The tower mass grows with the hub height, and the turbine CoM moves with it (the RNA mass does not change).",
    items: [
      { key: "thrust", label: "Maximum rotor thrust", sym: "F_T", unit: "MN", min: 0, max: 5, step: 0.05, f: 1e6, dec: 2 },
      { key: "rnaMass", label: "Rotor-nacelle assembly mass", sym: "M_RNA", unit: "t", min: 500, max: 2000, step: 10, f: 1e3, dec: 0 },
      { key: "hubHeightRel", label: "Hub height above tower base", sym: "", unit: "m", min: 80, max: 220, step: 1, f: 1, dec: 0, hardMin: 1 },
    ],
  };
  // Design objectives (shared by all platforms), shown in the "Design objectives" menu
  // together with the target-draft helper
  const OBJECTIVES_GROUP = {
    group: "Design objectives", scope: "turbine", mount: "objectiveSliders",
    items: [
      { key: "pitchLimitDeg", label: "Allowable static pitch", sym: "ξ<sub>5,max</sub>", unit: "°", min: 2, max: 20, step: 0.5, f: 1, dec: 1, hardMin: 0.1, hardMax: 80 },
      { key: "minTipClearance", label: "Minimum blade tip clearance", sym: "", unit: "m", min: 0, max: 60, step: 1, f: 1, dec: 0 },
    ],
  };
  // Equivalent steel thickness slider (same for all platforms; mm on screen, m in the model)
  const STEEL_ITEM = { key: "t_steel", label: "Steel thickness (equivalent)", sym: "t_s", unit: "mm", min: 20, max: 100, step: 0.5, f: 1e-3, dec: 1, hardMin: 1, info: "steel" };
  const GEO_MIN = 0.5;   // m, physical lower limit for any geometric dimension typed in a box

  // ------------------------------------------------------------------------
  //  Platform-specific user interface: sliders, scenarios, figure ranges,
  //  drawings, legend and equations.
  //  Scenario entries: [id, label, changes w.r.t. the reference, optional target draft
  //  (the ballast is then recomputed to reach it)]
  // ------------------------------------------------------------------------
  const UI = {
    // ======================= SEMISUBMERSIBLE =======================
    semisub: {
      groups: [
        {
          group: "Platform geometry", items: [
            { key: "d", label: "Central column diameter", sym: "d", unit: "m", min: 6, max: 20, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
            { key: "d_EC", label: "External column diameter", sym: "d_EC", unit: "m", min: 6, max: 20, step: 0.5, f: 1, dec: 2, hardMin: GEO_MIN },
            { key: "s_EC", label: "Column spacing (centre to centre)", sym: "s_EC", unit: "m", min: 25, max: 80, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
            { key: "H_col", label: "Column height (keel to top)", sym: "H_col", unit: "m", min: 15, max: 60, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
            { key: "H_P", label: "Pontoon height", sym: "H_P", unit: "m", min: 2, max: 12, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
            { key: "W_P", label: "Pontoon width", sym: "W_P", unit: "m", min: 3, max: 16, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
          ],
        },
        {
          group: "Masses and ballast", items: [
            { key: "ballastMass", label: "Concrete ballast (total, 3 columns)", sym: "M_b", unit: "t", min: 0, max: 16000, step: 10, f: 1e3, dec: 1 },
            { key: "rho_b", label: "Concrete ballast density", sym: "ρ_b", unit: "kg/m³", min: 1000, max: 8000, step: 50, f: 1, dec: 0, hardMin: 1 },
            { key: "waterFill", label: "Pontoon water-ballast filling", sym: "", unit: "%", min: 0, max: 100, step: 5, f: 0.01, dec: 0, hardMax: 100 },
            STEEL_ITEM,
          ],
        },
      ],
      presets: [
        ["noBallast", "No concrete ballast", { ballastMass: 0 }],
        ["sink", "Over-ballasted (sinks)", { ballastMass: 12500e3 }],
        ["narrow", "Narrow column spacing (unstable)", { s_EC: 30 }],
        ["capsize", "Smaller spacing + higher thrust (beyond the linear-model limit)", { s_EC: 40, thrust: 3e6 }],
        ["tallHeavy", "Heavy ballast, tall columns", { H_col: 45, ballastMass: 9000e3 }],
        ["noRoom", "Light ballast material (no room)", { d: 20, rho_b: 1100, ballastMass: 15000e3 }],
        ["lowHub", "Short tower (blade clearance)", { hubHeightRel: 125 }],
      ],
      ranges: { close: [-95, 70, -65, 62, 10], whole: [-120, 120, -70, 310, 50], top: [-95, 70, -78, 78] },
      legend: [["--steel", "steel hull"], ["--concrete", "concrete ballast"], ["--water-ballast", "water ballast"]],
      /** Side-view drawing in body coordinates (keel at z = keel). */
      hull(p, r, keel, S) {
        const s = p.s_EC, dEC = p.d_EC, d = p.d, Hc = p.H_col, HP = p.H_P, hb = r.ballastHeight, top = keel + Hc;
        const parts = [];
        // pontoons (side projection): upwind one to x = -s, the two downwind ones to x = +s/2
        [[-s, 0], [0, s / 2]].forEach(([a, b]) => {
          parts.push([rectPts(a, b, keel, keel + HP), S.steel]);
          if (p.waterFill > 0) parts.push([rectPts(a + 0.4, b - 0.4, keel + 0.4, keel + Math.max(p.waterFill * HP - 0.4, 0.05)), S.water]);
        });
        // columns, with concrete ballast inside the 3 external columns
        [[-d / 2, d / 2, false], [-s - dEC / 2, -s + dEC / 2, true], [s / 2 - dEC / 2, s / 2 + dEC / 2, true]].forEach(([a, b, ext]) => {
          parts.push([rectPts(a, b, keel, top), S.steel]);
          if (ext && hb > 0) {
            parts.push([rectPts(a + 0.4, b - 0.4, keel + 0.4, keel + Math.min(hb, Hc - 0.4)), S.conc]);
            if (hb > Hc) parts.push([rectPts(a, b, top, keel + hb), S.over]);   // ballast that does not fit
          }
        });
        return { parts, top, towerHalf: Math.min(d / 2, 5), height: Hc };
      },
      top(v, p, r, out) {
        const s = p.s_EC, dEC = p.d_EC, d = p.d;
        const cols = [[-s, 0], [s / 2, s * Math.sqrt(3) / 2], [s / 2, -s * Math.sqrt(3) / 2]];
        cols.forEach(([cx, cy]) => {   // pontoons: rectangles from the central column to each external column
          const L = Math.hypot(cx, cy), ux = cx / L, uy = cy / L, nx = -uy, ny = ux, w = p.W_P / 2;
          const a = d / 2, b = L - dEC / 2;
          const pts = [[a * ux + w * nx, a * uy + w * ny], [b * ux + w * nx, b * uy + w * ny], [b * ux - w * nx, b * uy - w * ny], [a * ux - w * nx, a * uy - w * ny]];
          out.push(`<polygon points="${pts.map(([x, y]) => `${v.X(x)},${v.Y(y)}`).join(" ")}" style="${TOPSTEEL}"/>`);
        });
        out.push(`<circle cx="${v.X(0)}" cy="${v.Y(0)}" r="${d / 2 * v.sc}" style="${TOPSTEEL}"/>`);
        cols.forEach(([cx, cy]) => out.push(`<circle cx="${v.X(cx)}" cy="${v.Y(cy)}" r="${dEC / 2 * v.sc}" style="${TOPSTEEL}"/>` +
          `<circle cx="${v.X(cx)}" cy="${v.Y(cy)}" r="${Math.max(dEC / 2 - 1.2, 0.5) * v.sc}" style="fill:var(--concrete);fill-opacity:${r.ballastHeight > 0 ? 0.85 : 0}"/>`));
        out.push(`<line x1="${v.X(0)}" y1="${v.Y(0)}" x2="${v.X(-s)}" y2="${v.Y(0)}" stroke="var(--ink)" stroke-dasharray="4 3"/>`);
        out.push(text(v.X(-s / 2), v.Y(p.W_P / 2) - 6, `s${sub("EC")} = ${fmt(s, 1)} m`, `text-anchor="middle" font-size="11"`));
        return [`d = ${fmt(d, 1)} m`, `d_EC = ${fmt(dEC, 1)} m`, `W_P = ${fmt(p.W_P, 1)} m`, `L_P = ${fmt(r.hull.L_P, 1)} m`];
      },
      equations: `
        <p><b>Geometry.</b> Pontoon length L<sub>P</sub> = s<sub>EC</sub> − d<sub>EC</sub>/2 − d/2. Waterplane area A<sub>wp</sub> = π d²/4 + 3 π d<sub>EC</sub>²/4.</p>
        <p><b>Submerged volume</b> (D ≥ H<sub>P</sub>): V<sub>s</sub>(D) = A<sub>wp</sub>·D + 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub> (columns from the keel to the SWL + pontoons).</p>
        <p><b>Masses:</b> m = M<sub>RNA</sub> + M<sub>tower</sub> + M<sub>steel</sub> + M<sub>water ballast</sub> + M<sub>concrete</sub>, with M<sub>water ballast</sub> = ρ<sub>w</sub>·3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub> (full pontoons).</p>
        <p><b>Steel:</b> M<sub>steel</sub> = ρ<sub>steel</sub> A<sub>shell</sub> t<sub>s</sub>, with A<sub>shell</sub> = π d H<sub>col</sub> + 3 π d<sub>EC</sub> H<sub>col</sub> + 2 (π d²/4 + 3 π d<sub>EC</sub>²/4) + 6 (W<sub>P</sub> + H<sub>P</sub>) L<sub>P</sub>. Steel CoM at mid column height.</p>
        <p><b>Heave equilibrium (S1):</b> ρ<sub>w</sub> (A<sub>wp</sub> D + 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub>) = m &nbsp;⇒&nbsp; D = (m/ρ<sub>w</sub> − 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub>) / A<sub>wp</sub></p>
        <p><b>Freeboard and tower base:</b> FB = H<sub>col</sub> − D; the tower stands on the central column, at z = FB.</p>        <p><b>Concrete ballast height</b> (3 external columns): h<sub>b</sub> = M<sub>concrete</sub> / (3 ρ<sub>b</sub> π d<sub>EC</sub>²/4) ≤ H<sub>col</sub>.</p>
        <p><b>CoB (upright):</b> CoB<sub>0</sub><sup>Z</sup> = [A<sub>wp</sub> D (−D/2) + 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub> (−D + H<sub>P</sub>/2)] / V<sub>s</sub></p>
        <p><b>Waterplane inertia:</b> J = 1.5 s<sub>EC</sub>² π d<sub>EC</sub>²/4 + π d⁴/64 + 3 π d<sub>EC</sub>⁴/64: the first term is S14 of the slides; the other two are the columns' own second moments, which S14 neglects (about 1 % here).</p>`,
    },

    // ======================= SPAR =======================
    spar: {
      groups: [
        {
          group: "Platform geometry", items: [
            { key: "d", label: "Spar diameter", sym: "d", unit: "m", min: 6, max: 30, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
            { key: "L_spar", label: "Spar length (keel to top)", sym: "L", unit: "m", min: 30, max: 180, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
          ],
        },
        {
          group: "Masses and ballast", items: [
            { key: "ballastMass", label: "Solid ballast (bottom of the spar)", sym: "M_b", unit: "t", min: 0, max: 40000, step: 10, f: 1e3, dec: 1 },
            { key: "rho_b", label: "Ballast density (iron ore 5000)", sym: "ρ_b", unit: "kg/m³", min: 1000, max: 8000, step: 50, f: 1, dec: 0, hardMin: 1 },
            STEEL_ITEM,
          ],
        },
      ],
      presets: [
        ["concrete", "Concrete instead of iron ore", { rho_b: 2400 }],
        ["noBallast", "No ballast (unstable)", { ballastMass: 0 }],
        ["short", "Short spar, D = 60 m (unstable)", { L_spar: 75 }, 60],
        ["wide", "Wide, shallow spar d = 24 m, D = 50 m (pitch too large)", { d: 24, L_spar: 65 }, 50],
        ["sink", "Over-ballasted (sinks)", { ballastMass: 20000e3 }],
        ["lowHub", "Short tower (blade clearance)", { hubHeightRel: 125 }],
      ],
      ranges: { close: [-75, 75, -185, 45, 20], whole: [-130, 130, -190, 310, 50], top: [-25, 25, -25, 25] },
      legend: [["--steel", "steel hull"], ["--concrete", "solid ballast"]],
      hull(p, r, keel, S) {
        const R = p.d / 2, L = p.L_spar, hb = r.ballastHeight, top = keel + L;
        const parts = [[rectPts(-R, R, keel, top), S.steel]];
        if (hb > 0) {
          parts.push([rectPts(-R + 0.4, R - 0.4, keel + 0.4, keel + Math.min(hb, L - 0.4)), S.conc]);
          if (hb > L) parts.push([rectPts(-R, R, top, keel + hb), S.over]);
        }
        return { parts, top, towerHalf: Math.min(R, 5), height: L };
      },
      top(v, p, r, out) {
        const R = p.d / 2;
        out.push(`<circle cx="${v.X(0)}" cy="${v.Y(0)}" r="${R * v.sc}" style="${TOPSTEEL}"/>`);
        out.push(`<circle cx="${v.X(0)}" cy="${v.Y(0)}" r="${Math.max(R - 0.5, 0.2) * v.sc}" style="fill:var(--concrete);fill-opacity:${r.ballastHeight > 0 ? 0.85 : 0}"/>`);
        out.push(`<line x1="${v.X(-R)}" y1="${v.Y(0)}" x2="${v.X(R)}" y2="${v.Y(0)}" stroke="var(--ink)" stroke-dasharray="4 3"/>`);
        out.push(text(v.X(0), v.Y(R) - 6, `d = ${fmt(p.d, 1)} m`, `text-anchor="middle" font-size="11"`));
        return [`d = ${fmt(p.d, 1)} m`, `L = ${fmt(p.L_spar, 1)} m`];
      },
      equations: `
        <p><b>Geometry.</b> One cylinder of diameter d and length L. Waterplane area A<sub>wp</sub> = π d²/4.</p>
        <p><b>Submerged volume:</b> V<sub>s</sub>(D) = π d²/4 · D (cylinder from the keel to the SWL).</p>
        <p><b>Masses:</b> m = M<sub>RNA</sub> + M<sub>tower</sub> + M<sub>steel</sub> + M<sub>ballast</sub>.</p>
        <p><b>Steel:</b> M<sub>steel</sub> = ρ<sub>steel</sub> A<sub>shell</sub> t<sub>s</sub>, with A<sub>shell</sub> = π d L + 2 π d²/4. Steel CoM at mid-length: z = −D + L/2.</p>
        <p><b>Heave equilibrium (S1):</b> ρ<sub>w</sub> (π d²/4) D = m &nbsp;⇒&nbsp; D = 4 m / (ρ<sub>w</sub> π d²). The draft grows with the total mass and decreases with the square of the diameter.</p>
        <p><b>Freeboard and tower base:</b> FB = L − D; the tower stands on top of the spar, at z = FB.</p>
        <p><b>Ballast height:</b> h<sub>b</sub> = M<sub>ballast</sub> / (ρ<sub>b</sub> π d²/4) ≤ L.</p>
        <p><b>CoB (upright):</b> CoB<sub>0</sub><sup>Z</sup> = −D/2. <b>Waterplane inertia:</b> J = π d⁴/64 (very small: the spar is stable because its CoM is below its CoB).</p>`,
    },

    // ======================= BARGE =======================
    barge: {
      groups: [
        {
          group: "Platform geometry", items: [
            { key: "W", label: "Barge width (square)", sym: "W", unit: "m", min: 20, max: 90, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
            { key: "H_hull", label: "Hull height (keel to deck)", sym: "H", unit: "m", min: 5, max: 25, step: 0.5, f: 1, dec: 1, hardMin: GEO_MIN },
            { key: "H_ped", label: "Pedestal height (deck to tower base)", sym: "", unit: "m", min: 0, max: 25, step: 0.5, f: 1, dec: 1 },
          ],
        },
        {
          group: "Masses and ballast", items: [
            { key: "ballastMass", label: "Ballast (bottom of the hull)", sym: "M_b", unit: "t", min: 0, max: 40000, step: 10, f: 1e3, dec: 1 },
            { key: "rho_b", label: "Ballast density (sea water 1025)", sym: "ρ_b", unit: "kg/m³", min: 1000, max: 8000, step: 25, f: 1, dec: 0, hardMin: 1 },
            STEEL_ITEM,
          ],
        },
      ],
      presets: [
        ["capsize", "Narrower barge, W = 44 m (beyond the linear-model limit)", { W: 44 }, 7],
        ["narrow", "Narrow barge, W = 35 m (unstable)", { W: 35 }, 7],
        ["concrete", "Concrete ballast", { rho_b: 2400 }],
        ["noBallast", "No ballast (keel lifts out: beyond the linear-model limit)", { ballastMass: 0 }],
        ["sink", "Over-ballasted (sinks)", { ballastMass: 35000e3 }],
        ["lowHub", "No pedestal, short tower (blade clearance)", { H_ped: 0, hubHeightRel: 130 }],
      ],
      ranges: { close: [-60, 60, -30, 50, 10], whole: [-120, 120, -50, 320, 50], top: [-50, 50, -50, 50] },
      legend: [["--steel", "steel hull"], ["--water-ballast", "water ballast"], ["--concrete", "solid ballast"]],
      hull(p, r, keel, S) {
        const B = p.W / 2, H = p.H_hull, hb = r.ballastHeight, deck = keel + H;
        const parts = [[rectPts(-B, B, keel, deck), S.steel]];
        if (hb > 0) {
          parts.push([rectPts(-B + 0.4, B - 0.4, keel + 0.4, keel + Math.min(hb, H - 0.4)), p.rho_b < 1300 ? S.water : S.conc]);
          if (hb > H) parts.push([rectPts(-B, B, deck, keel + hb), S.over]);
        }
        if (p.H_ped > 0) parts.push([rectPts(-6, 6, deck, deck + p.H_ped), S.steel]);   // pedestal (12 m diameter)
        return { parts, top: deck + p.H_ped, towerHalf: 5, height: H };
      },
      top(v, p, r, out) {
        const B = p.W / 2;
        out.push(`<rect x="${v.X(-B)}" y="${v.Y(B)}" width="${p.W * v.sc}" height="${p.W * v.sc}" style="${TOPSTEEL}"/>`);
        out.push(`<rect x="${v.X(-B + 1)}" y="${v.Y(B - 1)}" width="${(p.W - 2) * v.sc}" height="${(p.W - 2) * v.sc}" style="fill:var(${p.rho_b < 1300 ? "--water-ballast" : "--concrete"});fill-opacity:${r.ballastHeight > 0 ? 0.6 : 0}"/>`);
        out.push(`<circle cx="${v.X(0)}" cy="${v.Y(0)}" r="${6 * v.sc}" style="${TOPSTEEL}"/>`);
        out.push(`<line x1="${v.X(-B)}" y1="${v.Y(-B) + 8}" x2="${v.X(B)}" y2="${v.Y(-B) + 8}" stroke="var(--ink)" stroke-dasharray="4 3"/>`);
        out.push(text(v.X(0), v.Y(-B) + 20, `W = ${fmt(p.W, 1)} m`, `text-anchor="middle" font-size="11"`));
        return [`W = ${fmt(p.W, 1)} m`, `H = ${fmt(p.H_hull, 1)} m`];
      },
      equations: `
        <p><b>Geometry.</b> Square box W × W, hull height H. Waterplane area A<sub>wp</sub> = W².</p>
        <p><b>Submerged volume:</b> V<sub>s</sub>(D) = W² D (box from the keel to the SWL).</p>
        <p><b>Masses:</b> m = M<sub>RNA</sub> + M<sub>tower</sub> + M<sub>steel</sub> + M<sub>ballast</sub>.</p>
        <p><b>Steel:</b> M<sub>steel</sub> = ρ<sub>steel</sub> A<sub>shell</sub> t<sub>s</sub>, with A<sub>shell</sub> = 2 W² + 4 W H (pedestal not included). Steel CoM at mid hull height: z = −D + H/2.</p>
        <p><b>Heave equilibrium (S1):</b> ρ<sub>w</sub> W² D = m &nbsp;⇒&nbsp; D = m / (ρ<sub>w</sub> W²)</p>
        <p><b>Freeboard and tower base:</b> FB = H − D; the tower stands on a pedestal on the deck, at z = FB + H<sub>ped</sub>.</p>
        <p><b>Ballast height:</b> h<sub>b</sub> = M<sub>ballast</sub> / (ρ<sub>b</sub> W²) ≤ H.</p>
        <p><b>CoB (upright):</b> CoB<sub>0</sub><sup>Z</sup> = −D/2. <b>Waterplane inertia:</b> J = W⁴/12 (very large: the barge is stable thanks to its waterplane).</p>`,
    },
  };

  // --------------------------- state ---------------------------
  // Each platform keeps its own parameters, so switching back and forth does not lose changes.
  // The turbine parameters are shared.
  const state = {
    type: "semisub",
    turbine: Object.assign({}, M.TURBINE_DEFAULTS),
    plat: {
      semisub: Object.assign({}, M.PLATFORMS.semisub.DEFAULTS),
      spar: Object.assign({}, M.PLATFORMS.spar.DEFAULTS),
      barge: Object.assign({}, M.PLATFORMS.barge.DEFAULTS),
    },
  };
  const P = () => Object.assign({}, state.turbine, state.plat[state.type]);   // current merged parameters
  const REF = {};                                                              // reference results (for "reference:" values)
  Object.keys(M.PLATFORMS).forEach((t) => { REF[t] = M.solve(t, {}); });
  let inputs = {};                                                             // key -> {range, number, wrap, def, scope}
  const $ = (id) => document.getElementById(id);

  // --------------------------- formatting helpers ---------------------------
  const fmt = (v, dec = 1) => (v === undefined || v === null || !isFinite(v)) ? "—"
    : v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  // "M_b" -> M<sub>b</sub>; a string that already contains HTML tags is used as it is
  const symHTML = (s) => !s ? "" : s.includes("<") ? s : s.replace(/_(\w+)/, "<sub>$1</sub>");
  // notation of the lecture slides, as HTML (tables, cards) and as SVG text (figures)
  const N = {
    comX: "CoM<sup>X</sup>", comZ: "CoM<sup>Z</sup>", cobX: "CoB<sub>0</sub><sup>X</sup>", cobZ: "CoB<sub>0</sub><sup>Z</sup>",
    xi5: "ξ<sub>5</sub>", K55: "K<sub>55</sub>", K33: "K<sub>33</sub>", rw: "ρ<sub>w</sub>", Vs: "V<sub>s</sub>",
  };
  const sup = (s) => `<tspan dy="-0.45em" font-size="72%">${s}</tspan><tspan dy="0.45em"></tspan>`;   // SVG superscript
  const subsup = (b, s) => `<tspan dy="0.3em" font-size="72%">${b}</tspan><tspan dy="-0.75em" font-size="72%">${s}</tspan><tspan dy="0.45em"></tspan>`;
  const SV = {
    comX: `CoM${sup("X")}`, comZ: `CoM${sup("Z")}`, cobX: `CoB${subsup("0", "X")}`, cobZ: `CoB${subsup("0", "Z")}`,
    xi5: `ξ<tspan dy="0.3em" font-size="72%">5</tspan><tspan dy="-0.3em"></tspan>`,
    K55: `K<tspan dy="0.3em" font-size="72%">55</tspan><tspan dy="-0.3em"></tspan>`,
  };
  const sub = (s) => `<tspan dy="0.3em" font-size="72%">${s}</tspan><tspan dy="-0.3em"></tspan>`;   // SVG subscript (relative to the text size)
  const TOPSTEEL = `fill:var(--steel);stroke:var(--steel-edge);stroke-width:1`;

  // ======================================================================
  //  BUILD CONTROLS (rebuilt every time the platform changes)
  // ======================================================================
  function buildControls() {
    const host = $("controls");
    const before = $("targetDraftGroup");
    // remember which menus were open
    const wasOpen = {};
    host.querySelectorAll("details.group[data-gen]").forEach((d) => { wasOpen[d.dataset.gen] = d.open; d.remove(); });
    inputs = {};
    const groups = UI[state.type].groups.map((g) => Object.assign({ scope: "plat" }, g)).concat([TURBINE_GROUP]);
    groups.forEach((grp, gi) => {
      // Each group is a foldable <details> menu; only the first one starts open.
      const sec = document.createElement("details");
      sec.className = "group";
      sec.dataset.gen = grp.group;
      sec.open = grp.group in wasOpen ? wasOpen[grp.group] : gi === 0;
      sec.innerHTML = `<summary>${grp.group}</summary><div class="group-body">${grp.note ? `<p class="hint">${grp.note}</p>` : ""}</div>`;
      const body = sec.querySelector(".group-body");
      grp.items.forEach((def) => buildSlider(body, def, grp.scope));
      host.insertBefore(sec, before);
    });
    // design objectives: their sliders live inside the static "Design objectives" menu
    const objHost = $(OBJECTIVES_GROUP.mount);
    objHost.innerHTML = "";
    OBJECTIVES_GROUP.items.forEach((def) => buildSlider(objHost, def, OBJECTIVES_GROUP.scope));
  }

  /** One slider + number box. The box accepts values outside the slider range. */
  function buildSlider(body, def, scope) {
    const wrap = document.createElement("div");
    wrap.className = "ctrl";
    const id = "in_" + def.key;
    wrap.innerHTML = `
      <div class="ctrl-head">
        <label for="${id}">${def.label} <span class="sym">${symHTML(def.sym)}</span></label>
        <span class="ctrl-val"><input type="number" id="${id}_n" step="any" aria-label="${def.label} value"><span class="unit">${def.unit}</span></span>
      </div>
      <input type="range" id="${id}" min="${def.min}" max="${def.max}" step="${def.step}">
      <div class="ctrl-note"></div>`;
    body.appendChild(wrap);
    const range = wrap.querySelector("input[type=range]");
    const number = wrap.querySelector("input[type=number]");
    const note = wrap.querySelector(".ctrl-note");
    inputs[def.key] = { range, number, wrap, note, def, scope };

    // slider moved -> update parameter
    range.addEventListener("input", () => { setParam(def, scope, parseFloat(range.value)); syncInputs(); schedule(); });
    // number typed -> update parameter. Any value is accepted, also outside the slider range;
    // only physically meaningless values are limited (e.g. negative masses, zero diameters).
    number.addEventListener("change", () => {
      let v = parseFloat(number.value);
      if (!isFinite(v)) v = P()[def.key] / def.f;
      const lo = def.hardMin !== undefined ? def.hardMin : 0;
      const hi = def.hardMax !== undefined ? def.hardMax : Infinity;
      v = Math.min(hi, Math.max(lo, v));
      setParam(def, scope, v);
      syncInputs();
      schedule();
    });
  }

  const fmtInput = (def, v) => Number(v.toFixed(def.dec));
  function setParam(def, scope, displayValue) {
    (scope === "turbine" ? state.turbine : state.plat[state.type])[def.key] = displayValue * def.f;
  }

  /** Write the current params back into sliders and number boxes. */
  function syncInputs() {
    const p = P();
    Object.values(inputs).forEach(({ range, number, wrap, note, def }) => {
      const v = p[def.key] / def.f;
      range.value = v;                       // the browser pins the slider at its end if v is outside
      number.value = fmtInput(def, v);
      const outside = v < def.min - 1e-9 || v > def.max + 1e-9;
      wrap.classList.toggle("outside", outside);
      let txt = outside ? `outside the slider range (${def.min}–${def.max} ${def.unit})` : "";
      if (def.info === "steel") {            // show the steel mass that results from the thickness
        const area = M.PLATFORMS[state.type].surfaceArea(p);
        txt = `→ steel mass ${fmt(M.effectiveSteelMass(state.type, p) / 1e3, 0)} t (shell area ${fmt(area, 0)} m²)` + (txt ? ` · ${txt}` : "");
      }
      note.textContent = txt;
    });
  }

  // Redraw at most once per animation frame (smooth slider dragging)
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(); });
  }

  // ======================================================================
  //  MAIN UPDATE
  // ======================================================================
  function update() {
    const p = P();
    const r = M.solve(state.type, p);
    renderMessages(r);
    renderCards(r);
    drawSide($("figWhole"), r, true);
    drawSide($("figClose"), r, false);
    drawTop($("figTop"), r);
    drawMoment($("figMoment"), r, { hideK: !unlocked.k55, hidePitch: !unlocked.pitch });   // numbers hidden until HS2 / HS3
    drawMoment($("figMoment2"), r);
    renderTables(r);
  }

  // --------------------------- messages ---------------------------
  function renderMessages(r) {
    const label = { ok: "OK", info: "Note", warn: "Warning", error: "Failure" };
    const order = { error: 0, warn: 1, ok: 2, info: 3 };
    const list = r.messages.slice().sort((a, b) => order[a.level] - order[b.level]).map((m) => {
      if (m.level !== "ok") return m;
      // the OK message quotes only the results whose exercise is answered (draft: HS1, pitch: HS3)
      const lim = deg(r.pitch >= 0 ? r.critPos : r.critNeg), parts = [];
      if (unlocked.heave) parts.push(`draft ${r.draft.toFixed(2)} m`);
      if (unlocked.pitch) parts.push(`static pitch ξ₅ = ${deg(r.pitch).toFixed(2)}° (allowable ${r.params.pitchLimitDeg.toFixed(1)}°, linear-model limit ${lim.toFixed(1)}°)`);
      parts.push(`tip clearance ${r.tipClearance.toFixed(1)} m`);
      const miss = [!unlocked.heave && "the draft after HS1", !unlocked.pitch && "the static pitch after HS3"].filter(Boolean);
      const later = miss.length ? ` Shown here later: ${miss.join(", ")}.` : "";
      return { level: "ok", text: `The design works: ${parts.join(", ")}.${later}` };
    });
    $("messages").innerHTML = list.map((m) => `<div class="msg ${m.level}"><b>${label[m.level]}</b>${esc(m.text)}</div>`).join("");
  }

  // --------------------------- result cards ---------------------------
  function renderCards(r) {
    const ok = r.valid && !r.sinks;
    const hullOk = r.hull && !r.hull.error;
    const pitchDeg = deg(r.pitch);
    const ref = REF[state.type];
    const p = r.params;
    // INPUTS of the hydrostatic problem: properties that follow directly from the design choices
    const inputsCards = [
      { lbl: "Total mass m", val: r.totalMass ? fmt(r.totalMass / 1e3, 0) : "—", unit: "t", ref: fmt(ref.totalMass / 1e3, 0) },
      { lbl: "Steel mass", val: r.steelMass !== undefined ? fmt(r.steelMass / 1e3, 0) : "—", unit: "t", ref: fmt(ref.steelMass / 1e3, 0) },
      { lbl: "Ballast height h_b", val: r.ballastHeight !== undefined ? fmt(r.ballastHeight, 2) : "—", unit: "m", ref: fmt(ref.ballastHeight, 2), bad: hullOk && r.ballastHeight > r.hull.ballastMaxHeight },
      { lbl: "Waterplane inertia J", val: hullOk ? fmt(r.hull.J, 0) : "—", unit: "m⁴", ref: fmt(ref.hull.J, 0) },
    ];
    // OUTPUTS: equilibrium and stability results
    const outputCards = [
      { lbl: "Draft D", val: ok ? fmt(r.draft, 2) : (r.sinks ? "SUNK" : fmt(r.draft, 2)), unit: "m", ref: fmt(ref.draft, 2), bad: r.sinks },
      {
        lbl: `Static pitch ${N.xi5}`, val: ok ? (r.K > 0 ? fmt(pitchDeg, 2) : "unstable") : "—", unit: "°", ref: fmt(deg(ref.pitch), 2),
        bad: r.capsizes, warn: ok && !r.capsizes && Math.abs(pitchDeg) > p.pitchLimitDeg,
      },
      { lbl: "Metacentric height GM", val: ok ? fmt(r.GM, 2) : "—", unit: "m", ref: fmt(ref.GM, 2), bad: ok && r.GM <= 0 },
      { lbl: `Pitch stiffness ${N.K55}`, val: ok ? fmt(r.K / 1e9, 2) : "—", unit: "GN·m/rad", ref: fmt(ref.K / 1e9, 2), bad: ok && r.K <= 0 },
      // limit angle of the linear model in the direction of the pitch (deck edge under water / keel out of water)
      { lbl: "Linear-model limit", val: ok ? fmt(deg(r.pitch < 0 ? r.critNeg : r.critPos), 1) : "—", unit: "°", ref: fmt(deg(ref.critPos), 1) },
    ];
    // values that answer an exercise stay hidden until it is answered (the state words SUNK and unstable stay)
    const LOCK_OF = { "Total mass m": "heave", "Draft D": "heave", "Waterplane inertia J": "k55", "Metacentric height GM": "k55" };
    LOCK_OF[`Pitch stiffness ${N.K55}`] = "k55"; LOCK_OF[`Static pitch ${N.xi5}`] = "pitch";
    const card = (c) => {
      const lk = LOCK_OF[c.lbl], hide = lk && !unlocked[lk] && !["—", "SUNK", "unstable"].includes(c.val);
      if (hide) return `
      <div class="card locked-card" title="Answer ${LOCKS[lk].ex} (or press Show all results now in HS4) to see this value">
        <div class="lbl">${symHTML(c.lbl)}</div>
        <div class="val">hidden</div>
        <div class="ref">shown after ${LOCKS[lk].ex}</div>
      </div>`;
      return `
      <div class="card ${c.bad ? "bad" : ""} ${c.warn ? "warnc" : ""}">
        <div class="lbl">${symHTML(c.lbl)}</div>
        <div class="val">${c.val} <small>${c.val === "—" || c.val === "SUNK" || c.val === "unstable" ? "" : c.unit}</small></div>
        <div class="ref">ref.: ${c.ref} ${c.unit}</div>
      </div>`;
    };
    $("cards").innerHTML = `
      <div class="card-group in"><div class="cg-title">Inputs to the hydrostatics <span>(from your design)</span></div>
        <div class="cg-cards" style="--n:${inputsCards.length}">${inputsCards.map(card).join("")}</div></div>
      <div class="card-group out"><div class="cg-title">Outputs <span>(equilibrium and stability)</span></div>
        <div class="cg-cards" style="--n:${outputCards.length}">${outputCards.map(card).join("")}</div></div>`;
  }

  // ======================================================================
  //  SVG HELPERS
  // ======================================================================
  /** Create a coordinate mapping (x right, z up) -> SVG units with equal scaling. */
  function view(svg, xmin, xmax, zmin, zmax, W) {
    const sc = W / (xmax - xmin);
    const H = (zmax - zmin) * sc;
    svg.setAttribute("viewBox", `0 0 ${W} ${H.toFixed(1)}`);
    return { X: (x) => (x - xmin) * sc, Y: (z) => (zmax - z) * sc, sc, W, H, xmin, xmax, zmin, zmax };
  }
  /** Rotate a body point (x, z) by the pitch angle th about the origin. Positive th: top moves to +x. */
  const rot = (x, z, th) => [x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th)];
  function rectPts(x0, x1, z0, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }
  /** Draw a polygon given in body coordinates; tf maps body (x,z) -> global (x,z). */
  function poly(v, pts, tf, style) {
    const s = pts.map(([x, z]) => { const [a, b] = tf(x, z); return `${v.X(a).toFixed(1)},${v.Y(b).toFixed(1)}`; }).join(" ");
    return `<polygon points="${s}" style="${style}"/>`;
  }
  function arrow(v, x0, z0, x1, z1, color, w = 2) {
    const X0 = v.X(x0), Y0 = v.Y(z0), X1 = v.X(x1), Y1 = v.Y(z1);
    const a = Math.atan2(Y1 - Y0, X1 - X0), h = 8;
    const p1 = [X1 - h * Math.cos(a - 0.45), Y1 - h * Math.sin(a - 0.45)];
    const p2 = [X1 - h * Math.cos(a + 0.45), Y1 - h * Math.sin(a + 0.45)];
    return `<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y1}" stroke="${color}" stroke-width="${w}"/>` +
      `<polygon points="${X1},${Y1} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}" fill="${color}"/>`;
  }
  function text(x, y, s, opt = "") { return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${opt}>${s}</text>`; }
  const css = (name) => `var(${name})`;
  const STYLES = {
    steel: `fill:${css("--steel")};stroke:${css("--steel-edge")};stroke-width:1`,
    conc: `fill:${css("--concrete")};stroke:none`,
    water: `fill:${css("--water-ballast")};stroke:none`,
    over: `fill:${css("--overflow")};stroke:${css("--err")};stroke-width:1;fill-opacity:.75`,
    turb: `fill:${css("--turbine")};stroke:${css("--steel-edge")};stroke-width:1`,
  };

  // ======================================================================
  //  SIDE VIEW (x-z plane), used for the whole turbine and for the close-up
  // ======================================================================
  function drawSide(svg, r, whole) {
    const p = r.params;
    const ui = UI[state.type];
    // Fixed axis ranges per platform (so that changes in size are visible). The last argument
    // of view() is the drawing width in SVG units: it sets how big the text looks once scaled.
    const [x0, x1, z0, z1, gstep] = whole ? ui.ranges.whole : ui.ranges.close;
    const v = view(svg, x0, x1, z0, z1, whole ? 300 : 450);
    // Text/marker scale factor: a tall, narrow drawing (e.g. the spar) is shrunk a lot to fit
    // its box, so its text and symbols are enlarged to keep the same apparent size.
    const fs = v.fs = whole ? Math.max(1, v.H / 475) : Math.max(1, v.H / 350);
    const out = [];

    // Sky background, then horizontal grid lines
    out.push(`<rect x="0" y="0" width="${v.W}" height="${v.H}" rx="5" style="fill:var(--sky)"/>`);
    for (let z = Math.ceil(v.zmin / gstep) * gstep; z <= v.zmax; z += gstep) {
      out.push(`<line x1="0" x2="${v.W}" y1="${v.Y(z)}" y2="${v.Y(z)}" stroke="var(--line)" stroke-width="0.6"/>`);
      out.push(text(3, v.Y(z) - 2, `${z} m`, `font-size="${9 * fs}" style="fill:var(--muted)"`));
    }

    if (!r.hull || r.hull.error) {
      out.push(waterLayer(v));
      out.push(text(v.W / 2, v.H / 2, "Invalid geometry", `text-anchor="middle" font-size="20" style="fill:var(--err)"`));
      svg.innerHTML = out.join("");
      return;
    }

    // ---- choose the drawn draft and angle ----
    let D = r.draft, th = 0, overlay = null;
    if (r.sinks) { D = r.hull.height + 6; overlay = "SUNK"; }
    else if (r.valid && r.K <= 0) {
      // unstable (K55 <= 0): no equilibrium, the platform capsizes; draw it lying on its side
      th = (r.M_ext < 0 ? -1 : 1) * M.deg2rad(80); overlay = "UNSTABLE (K₅₅ ≤ 0)";
    } else if (r.valid && r.capsizes) {
      // beyond the limit of the linear model: draw the platform at the limit angle
      th = r.pitch < 0 ? -r.critNeg : r.critPos; overlay = "BEYOND LINEAR-MODEL LIMIT";
    } else if (r.valid && isFinite(r.pitch)) th = r.pitch;
    else if (r.ballastHeight > r.hull.ballastMaxHeight) overlay = "NO ROOM FOR BALLAST";

    const keel = -D;
    const h = ui.hull(p, r, keel, STYLES);
    // Body -> global transformation. Normally a rotation about the SWL origin (as in the
    // linear model). When unstable, rotate about the hull centre and leave it half submerged.
    let tf = (x, z) => rot(x, z, th);
    if (overlay && overlay.startsWith("UNSTABLE")) {
      const zc = keel + h.height / 2;
      tf = (x, z) => rot(x, z - zc, th);
    }
    h.parts.forEach(([pts, style]) => out.push(poly(v, pts, tf, style)));

    // ---- turbine: tower, nacelle, rotor (whole view only) ----
    if (whole) {
      const hubZ = h.top + p.hubHeightRel, xr = p.hubX, tb = h.towerHalf;
      out.push(poly(v, [[-tb, h.top], [tb, h.top], [3.25, hubZ - 3], [-3.25, hubZ - 3]], tf, STYLES.turb));
      out.push(poly(v, rectPts(xr, 10, hubZ - 3.5, hubZ + 3.5), tf, STYLES.turb));
      out.push(poly(v, rectPts(xr - 1.6, xr, hubZ - p.rotorRadius, hubZ + p.rotorRadius), tf, `fill:${css("--steel-edge")};stroke:none`));
      const [hx, hz] = tf(xr, hubZ);
      out.push(`<circle cx="${v.X(hx)}" cy="${v.Y(hz)}" r="4" fill="var(--steel-edge)"/>`);
      // thrust arrow (horizontal, as in the 1D model)
      if (p.thrust > 0 && !overlay) {
        const L = 25 + 20 * p.thrust / 2e6;
        out.push(arrow(v, hx - L - 4, hz, hx - 4, hz, css("--thrust"), 3));
        out.push(text(v.X(hx - L - 4), v.Y(hz) - 8 * fs, `F${sub("T")} = ${fmt(p.thrust / 1e6, 2)} MN`, `font-size="${12 * fs}" style="fill:var(--thrust)"`));
      }
    }

    // ---- sea (translucent, drawn over the hull so the submerged part is tinted) ----
    out.push(waterLayer(v));

    // ---- minimum blade tip clearance line (whole view) ----
    if (whole && p.minTipClearance > 0) {
      const bad = r.tipOk === false;
      const col = bad ? "var(--err)" : "var(--muted)";
      out.push(`<line x1="0" x2="${v.W}" y1="${v.Y(p.minTipClearance)}" y2="${v.Y(p.minTipClearance)}" stroke="${col}" stroke-dasharray="5 4" stroke-width="${bad ? 1.6 : 1}"/>`);
      out.push(text(v.W - 4, v.Y(p.minTipClearance) - 3, `min. tip clearance ${fmt(p.minTipClearance, 0)} m`, `text-anchor="end" font-size="${9.5 * fs}" style="fill:${col}"`));
    }

    // ---- CoM, CoB (whole device) and metacentre M ----
    // All positions come from the model already in the EARTH frame (r.frames):
    //  - CoM is fixed in the structure, so it simply rotates with the hull;
    //  - CoB is NOT fixed in the structure: it moves towards the immersed side, on an arc
    //    around M, and ends up directly below M. Its horizontal distance from the CoM is the
    //    lever arm of the righting couple.
    if (r.valid && !overlay && r.frames) {
      const f = r.frames;
      const [gx, gz] = f.comE, [bx, bz] = f.cobE, [mx, mz] = f.mE;
      if (!whole) {
        const aL = (z1 - z0) / 10;
        // where the CoB would be if it were fixed to the structure (upright CoB rotated with the hull)
        if (Math.abs(f.th) > M.deg2rad(0.5)) {
          const [b0x, b0z] = tf(0, r.COB[2]);
          out.push(`<circle cx="${v.X(b0x)}" cy="${v.Y(b0z)}" r="${4 * fs}" fill="none" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="2 2"/>`);
          out.push(text(v.X(b0x) - 7 * fs, v.Y(b0z) + 14 * fs, `CoB${sub("0")}`, `text-anchor="end" font-size="${10 * fs}" style="fill:var(--muted)"`));
        }
        // weight (down, at CoM) and buoyancy (up, at CoB)
        out.push(arrow(v, gx, gz, gx, gz - aL, css("--G"), 2.2 * fs));
        out.push(arrow(v, bx, bz, bx, bz + aL, css("--B"), 2.2 * fs));
        // lever arm of the righting couple
        out.push(text(v.W - 8, (fs > 1.2 ? 38 : 18) * fs, `lever arm CoB${sup("X")}(${SV.xi5}) − CoM${sup("X")}(${SV.xi5}) = ${fmt(f.lever, 2)} m`, `text-anchor="end" font-size="${11 * fs}"`));
      }
      // metacentre M (both views) with the line of action of the buoyancy: vertical through CoB and M
      const dm = (whole ? 4.5 : 6) * fs;   // diamond half-size
      out.push(`<line x1="${v.X(bx)}" y1="${v.Y(bz)}" x2="${v.X(mx)}" y2="${v.Y(mz)}" stroke="var(--B)" stroke-dasharray="4 3" stroke-width="1.2"/>`);
      out.push(`<polygon points="${v.X(mx)},${v.Y(mz) - dm} ${v.X(mx) + dm * 0.85},${v.Y(mz)} ${v.X(mx)},${v.Y(mz) + dm} ${v.X(mx) - dm * 0.85},${v.Y(mz)}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.5"/>`);
      out.push(text(v.X(mx) - dm - 3, v.Y(mz) - 4 * fs, "M", `text-anchor="end" font-size="${(whole ? 11 : 12) * fs}" font-weight="700"`));   // left: for a spar M is almost on the CoB
      const rad = (whole ? 4.5 : 6) * fs;
      out.push(marker(v, gx, gz, css("--G"), "CoM", rad, -1));
      out.push(marker(v, bx, bz, css("--B"), "CoB", rad, 1));
    }

    // ---- annotations ----
    if (!whole) {
      if (r.ballastHeight > r.hull.ballastMaxHeight && !r.sinks) {
        out.push(text(v.W - 8, 18 * fs, `h${sub("b")} = ${fmt(r.ballastHeight, 1)} m &gt; available ${fmt(r.hull.ballastMaxHeight, 1)} m`, `text-anchor="end" font-size="${11.5 * fs}" style="fill:var(--err)"`));
      }
      // legend (bottom-left), on a panel background; sizes scaled with fs
      const nL = ui.legend.length, lh = 15 * fs, ls = 10 * fs;
      out.push(`<rect x="4" y="${v.H - 7 * fs - nL * lh}" width="${112 * fs}" height="${nL * lh + 6 * fs}" rx="4" fill="var(--panel)" fill-opacity=".85"/>`);
      ui.legend.forEach(([c, t], i) => {
        out.push(`<rect x="${4 + 4 * fs}" y="${v.H - 17 * fs - i * lh}" width="${ls}" height="${ls}" fill="var(${c})" stroke="var(--steel-edge)" stroke-width=".5"/>`);
        out.push(text(4 + 18 * fs, v.H - 8 * fs - i * lh, t, `font-size="${10.5 * fs}"`));
      });
    }
    out.push(text(42 * fs, 16 * fs, "wind →", `font-size="${11 * fs}" style="fill:var(--muted)"`));
    if (overlay) {
      // long labels are shrunk so that they fit the drawing width
      const ofs = Math.min((whole ? 22 : 24) * fs, 0.92 * v.W / (0.62 * overlay.length));
      out.push(text(v.W / 2, v.H * 0.28, overlay, `text-anchor="middle" font-size="${ofs.toFixed(1)}" font-weight="700" style="fill:var(--err)"`));
    }
    svg.innerHTML = out.join("");
  }

  function waterLayer(v) {
    const fs = v.fs || 1;
    return `<rect x="0" y="${v.Y(0)}" width="${v.W}" height="${v.H - v.Y(0)}" style="fill:var(--sea)"/>` +
      `<line x1="0" x2="${v.W}" y1="${v.Y(0)}" y2="${v.Y(0)}" stroke="var(--sea-line)" stroke-width="1.6"/>` +
      `<text x="${v.W - 6}" y="${v.Y(0) - 4}" text-anchor="end" font-size="${11 * fs}" style="fill:var(--sea-line)">SWL</text>`;
  }
  /** Point marker; side = -1 puts the label on the left, +1 on the right. */
  function marker(v, x, z, color, label, rad = 6, side = 1) {
    const X = v.X(x), Y = v.Y(z);
    return `<circle cx="${X}" cy="${Y}" r="${rad}" fill="var(--panel)" stroke="${color}" stroke-width="2.2"/>` +
      `<circle cx="${X}" cy="${Y}" r="${rad * 0.37}" fill="${color}"/>` +
      `<text x="${X + side * (rad + 4)}" y="${Y + rad * 0.65}" text-anchor="${side < 0 ? "end" : "start"}" font-size="${Math.max(11, rad * 2.08)}" font-weight="700" style="fill:${color}">${label}</text>`;
  }

  // ======================================================================
  //  TOP VIEW (x-y plane), fixed scale per platform
  // ======================================================================
  function drawTop(svg, r) {
    const p = r.params;
    const ui = UI[state.type];
    const [x0, x1, y0, y1] = ui.ranges.top;
    const v = view(svg, x0, x1, y0, y1, 320);     // here "z" plays the role of y
    const out = [`<rect x="0" y="0" width="${v.W}" height="${v.H}" rx="5" style="fill:var(--sea)"/>`];
    if (r.hull && !r.hull.error) {
      const dims = ui.top(v, p, r, out);
      // dimension summary (bottom-left corner)
      dims.forEach((t, i) => out.push(text(6, v.H - 8 - (dims.length - 1 - i) * 14, t.replace(/_(\w+)/, (m, s) => sub(s)), `font-size="10.5"`)));
    } else {
      out.push(text(v.W / 2, v.H / 2, "Invalid geometry", `text-anchor="middle" font-size="16" style="fill:var(--err)"`));
    }
    // wind arrow (top-left) and scale bar (bottom-right)
    const w = x1 - x0, hgt = y1 - y0;
    out.push(arrow(v, x0 + 0.03 * w, y1 - 0.12 * hgt, x0 + 0.16 * w, y1 - 0.12 * hgt, "var(--thrust)", 2.5));
    out.push(text(v.X(x0 + 0.03 * w), v.Y(y1 - 0.12 * hgt) - 8, "wind / thrust", `font-size="11" style="fill:var(--thrust)"`));
    const bar = w > 100 ? 20 : 10;
    out.push(`<line x1="${v.X(x1 - 0.05 * w - bar)}" x2="${v.X(x1 - 0.05 * w)}" y1="${v.Y(y0 + 0.05 * hgt)}" y2="${v.Y(y0 + 0.05 * hgt)}" stroke="var(--ink)" stroke-width="2"/>`);
    out.push(text(v.X(x1 - 0.05 * w - bar / 2), v.Y(y0 + 0.05 * hgt) - 5, `${bar} m`, `text-anchor="middle" font-size="11"`));
    svg.innerHTML = out.join("");
  }

  // ======================================================================
  //  MOMENT vs PITCH chart: restoring K55*xi_5 and overturning moment.
  //  Drawn into any SVG (dashboard, Static pitch tab, exercises) for any result r.
  // ======================================================================
  function drawMoment(svg, r, opt = {}) {   // opt.hideK, opt.hidePitch: hide the numbers that answer HS2 / HS3
    const p = r.params;
    // Height fixed in SVG units; width follows the shape of the box so the chart fills it.
    const H = svg.parentElement.classList.contains("full") ? 400 : 270, ml = 62, mr = 16, mt = 14, mb = 40;
    const clip = "clip-" + (svg.id || "m" + Math.random().toString(36).slice(2, 8));   // one clip path per chart
    const box = svg.parentElement.getBoundingClientRect();
    const fill = window.innerWidth >= 1000 && box.width > 0 && box.height > 40;
    const W = fill ? Math.min(Math.max(H * box.width / (box.height - 24), 480), 1400) : 760;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const out = [];
    if (!r.valid || r.sinks || r.K === undefined) {
      out.push(text(W / 2, H / 2, "No equilibrium to show: fix the failure above first.", `text-anchor="middle" font-size="14" style="fill:var(--muted)"`));
      svg.innerHTML = out.join("");
      return;
    }
    const Mext = r.M_ext / 1e6;                                        // MNm
    const critDeg = deg(Mext >= 0 ? r.critPos : r.critNeg);
    const pitchDeg = r.K > 0 ? deg(r.pitch) : NaN;
    let tMax = Math.max(15, 1.15 * Math.max(Math.abs(pitchDeg) || 0, critDeg, p.pitchLimitDeg));
    tMax = Math.min(Math.ceil(tMax / 5) * 5, 90);
    const sgn = Mext >= 0 ? 1 : -1;
    const t0 = sgn > 0 ? 0 : -tMax, t1 = sgn > 0 ? tMax : 0;
    const Kmn = r.K / 1e6;                                             // MNm/rad
    const yMax = Math.max(Math.abs(Mext) * 1.8, 50);
    let y0 = sgn > 0 ? Math.min(0, Kmn * M.deg2rad(tMax)) : -yMax, y1 = sgn > 0 ? yMax : Math.max(0, -Kmn * M.deg2rad(tMax));
    if (y0 < -yMax) y0 = -yMax;
    if (y1 > yMax) y1 = yMax;
    if (sgn > 0 && y0 === 0 && Kmn <= 0) y0 = -yMax / 2;
    const X = (t) => ml + (t - t0) / (t1 - t0) * (W - ml - mr);
    const Y = (m) => mt + (y1 - m) / (y1 - y0) * (H - mt - mb);

    out.push(`<defs><clipPath id="${clip}"><rect x="${ml}" y="${mt}" width="${W - ml - mr}" height="${H - mt - mb}"/></clipPath></defs>`);
    // grid + ticks
    const yStep = niceStep((y1 - y0) / 5), tStep = niceStep((t1 - t0) / 8);
    for (let m = Math.ceil(y0 / yStep) * yStep; m <= y1 + 1e-9; m += yStep) {
      out.push(`<line x1="${ml}" x2="${W - mr}" y1="${Y(m)}" y2="${Y(m)}" stroke="var(--line)" stroke-width="${Math.abs(m) < 1e-9 ? 1.4 : 0.7}"/>`);
      out.push(text(ml - 6, Y(m) + 4, fmt(m, 0), `text-anchor="end" font-size="11" style="fill:var(--muted)"`));
    }
    for (let t = Math.ceil(t0 / tStep) * tStep; t <= t1 + 1e-9; t += tStep) {
      out.push(`<line x1="${X(t)}" x2="${X(t)}" y1="${mt}" y2="${H - mb}" stroke="var(--line)" stroke-width="0.7"/>`);
      out.push(text(X(t), H - mb + 16, fmt(t, 0), `text-anchor="middle" font-size="11" style="fill:var(--muted)"`));
    }
    out.push(text((ml + W - mr) / 2, H - 6, `pitch angle ${SV.xi5} (deg)`, `text-anchor="middle" font-size="12"`));
    out.push(text(14, (mt + H - mb) / 2, "moment (MN·m)", `text-anchor="middle" font-size="12" transform="rotate(-90 14 ${(mt + H - mb) / 2})"`));

    const g = [];
    // vertical lines: allowable pitch and limit angle of the linear model
    const lim = sgn * p.pitchLimitDeg, cr = sgn * critDeg;
    g.push(`<line x1="${X(lim)}" x2="${X(lim)}" y1="${mt}" y2="${H - mb}" stroke="var(--warn)" stroke-dasharray="5 4" stroke-width="1.5"/>`);
    // labels go on the right of their line, or on the left when the line is near the right edge
    const lab = (xl) => xl > W - mr - 140 ? `x="${(xl - 4).toFixed(1)}" text-anchor="end"` : `x="${(xl + 4).toFixed(1)}"`;
    g.push(`<text ${lab(X(lim))} y="${mt + 14}" font-size="11" style="fill:var(--warn)">allowable ${fmt(p.pitchLimitDeg, 1)}°</text>`);
    if (Math.abs(cr) <= tMax) {
      g.push(`<line x1="${X(cr)}" x2="${X(cr)}" y1="${mt}" y2="${H - mb}" stroke="var(--err)" stroke-dasharray="5 4" stroke-width="1.5"/>`);
      g.push(`<text ${lab(X(cr))} y="${mt + 30}" font-size="11" style="fill:var(--err)">linear-model limit ${fmt(critDeg, 1)}°</text>`);
    }
    // restoring moment line K55 * xi_5
    g.push(`<line x1="${X(t0)}" y1="${Y(Kmn * M.deg2rad(t0))}" x2="${X(t1)}" y2="${Y(Kmn * M.deg2rad(t1))}" stroke="var(--chart-a)" stroke-width="2.5"/>`);
    // overturning moment (constant in the linear model)
    g.push(`<line x1="${X(t0)}" y1="${Y(Mext)}" x2="${X(t1)}" y2="${Y(Mext)}" stroke="var(--chart-b)" stroke-width="2.5"/>`);
    // equilibrium point
    if (isFinite(pitchDeg) && Math.abs(pitchDeg) <= tMax) {
      g.push(`<circle cx="${X(pitchDeg)}" cy="${Y(Mext)}" r="5.5" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>`);
      g.push(text(X(pitchDeg) + 8, Y(Mext) + 18, opt.hidePitch ? SV.xi5 : `${SV.xi5} = ${fmt(pitchDeg, 2)}°`, `font-size="12" font-weight="600"`));
    }
    out.push(`<g clip-path="url(#${clip})">${g.join("")}</g>`);
    // legend (bottom-right corner, usually empty)
    const lx = W - mr - 462, ly = H - mb - 34;
    out.push(`<rect x="${lx - 6}" y="${ly - 14}" width="456" height="46" rx="5" fill="var(--panel)" fill-opacity=".9" stroke="var(--line)"/>`);
    out.push(`<line x1="${lx}" x2="${lx + 22}" y1="${ly - 2}" y2="${ly - 2}" stroke="var(--chart-a)" stroke-width="2.5"/>`);
    out.push(text(lx + 28, ly + 2, `restoring ${SV.K55}·${SV.xi5}` + (opt.hideK ? "" : `  (${SV.K55} = ${fmt(r.K / 1e9, 2)} GN·m/rad)`), `font-size="11.5"`));
    out.push(`<line x1="${lx}" x2="${lx + 22}" y1="${ly + 16}" y2="${ly + 16}" stroke="var(--chart-b)" stroke-width="2.5"/>`);
    out.push(text(lx + 28, ly + 20, `overturning M${sub("ext")} = F${sub("T")} h${sub("hub")} + m g ${SV.comX} − ρ${sub("w")} g V${sub("s")} ${SV.cobX}` + (opt.hidePitch ? "" : ` = ${fmt(Mext, 0)} MN·m`), `font-size="11.5"`));
    svg.innerHTML = out.join("");
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
    const n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }

  // ======================================================================
  //  TABLES (Heave, Pitch stiffness and Static pitch tabs)
  // ======================================================================
  // Tables that give away the answers of HS1 (Heave tab) and HS2 (Pitch stiffness tab) stay hidden until
  // the exercise is answered (correctly or after three attempts), or until "Show them now" is pressed,
  // as the natural periods of the Hydrodynamics Lab. Nothing is stored: a reload hides them again.
  //  The same locks hide the answer values in the dashboard cards, in the OK message and in the
  //  dashboard moment chart: m and D until HS1; J, GM and K55 until HS2; xi_5 and M_ext until HS3.
  const LOCKS = { heave: { ex: "HS1", res: "heaveTable" }, k55: { ex: "HS2", res: "res-k55" }, pitch: { ex: "HS3", res: "res-pitch" } };
  const unlocked = { heave: false, k55: false, pitch: false };
  function unlockTables(tab) {
    if (tab === "all") { Object.keys(LOCKS).forEach((t) => { if (!unlocked[t]) { unlocked[t] = true; $("lock-" + t).hidden = true; $(LOCKS[t].res).hidden = false; } }); update(); return; }
    if (unlocked[tab]) return;
    unlocked[tab] = true;
    $("lock-" + tab).hidden = true;
    $(LOCKS[tab].res).hidden = false;
    update();
  }
  // one listener for every "Show them now" / "Show all results now" button, also those built later
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-unlock]"); if (b) unlockTables(b.dataset.unlock); });
  const rowsHTML = (st) => `<tr><th>Quantity</th><th>value</th><th>unit</th></tr>` +
    st.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join("");
  function renderTables(r) {
    if (!r.items) {
      const reason = r.sinks ? "Platform sunk: no equilibrium." : "No valid design.";
      $("massTable").innerHTML = `<tr><td>${reason}</td></tr>` + (r.totalMass ? `<tr><td>Total mass m</td><td>${fmt(r.totalMass / 1e3, 0)} t</td></tr>` : "");
      ["heaveTable", "stiffTable", "pitchTable", "framesTable"].forEach((id) => { $(id).innerHTML = `<tr><td>${reason}</td></tr>`; });
      $("kChart").innerHTML = text(160, 145, reason, `text-anchor="middle" font-size="13" fill="var(--muted)"`);
      return;
    }
    renderKChart(r, $("kChart"));
    const rows = r.items.map((it) => `<tr><td>${it.name}</td><td>${fmt(it.m / 1e3, 0)}</td><td>${fmt(it.x, 2)}</td><td>${fmt(it.z, 2)}</td><td>${fmt(it.m * it.z / 1e3, 0)}</td></tr>`).join("");
    $("massTable").innerHTML = `<tr><th>Component</th><th>mass (t)</th><th>x (m)</th><th>z above SWL (m)</th><th title="mass × height above the SWL (first moment of mass)">m·z (t·m)</th></tr>${rows}` +
      (unlocked.heave
        ? `<tr class="total"><td>Total mass m, CoM of the whole device (${N.comX}, ${N.comZ})</td><td>${fmt(r.totalMass / 1e3, 0)}</td><td>${fmt(r.COM[0], 2)}</td><td>${fmt(r.COM[2], 2)}</td><td>${fmt(r.totalMass * r.COM[2] / 1e3, 0)}</td></tr>`
        : `<tr class="total"><td colspan="5" class="note">Total mass m and CoM of the whole device: shown after HS1 (below).</td></tr>`);
    // Heave tab: draft and heave stiffness
    $("heaveTable").innerHTML = rowsHTML([
      ["Total mass m", fmt(r.totalMass / 1e3, 0), "t"],
      [`Submerged volume ${N.Vs} = m / ${N.rw} (S1)`, fmt(r.Vs, 0), "m³"],
      ["Draft D", fmt(r.draft, 2), "m"],
      ["Freeboard FB", fmt(r.freeboard, 2), "m"],
      ["Tower base above SWL", fmt(r.towerBase, 2), "m"],
      ["Waterplane area A<sub>wp</sub>", fmt(r.hull.A_wp, 1), "m²"],
      [`Heave stiffness ${N.K33} = ${N.rw} g A<sub>wp</sub> (S13)`, fmt(r.heaveStiffness / 1e6, 2), "MN/m"],
      ["Ballast height h<sub>b</sub>", fmt(r.ballastHeight, 2), "m"],
      ["Reserve buoyancy", fmt(100 * r.reserveBuoyancy, 1), "%"],
    ]);
    // Pitch stiffness tab
    $("stiffTable").innerHTML = rowsHTML([
      ["Waterplane inertia J", fmt(r.hull.J, 0), "m⁴"],
      [`Submerged volume ${N.Vs}`, fmt(r.Vs, 0), "m³"],
      [`CoB height ${N.cobZ} (upright)`, fmt(r.COB[2], 2), "m"],
      [`CoM height ${N.comZ} (whole device)`, fmt(r.COM[2], 2), "m"],
      ["BM = J / V<sub>s</sub>", fmt(r.BM, 2), "m"],
      [`Metacentre height z<sub>M</sub> = ${N.cobZ} + BM`, fmt(r.zM, 2), "m"],
      [`Metacentric height GM = z<sub>M</sub> − ${N.comZ}`, fmt(r.GM, 2), "m"],
      [`Hydrostatic stiffness K<sub>h</sub> = ${N.rw} g (J + ${N.Vs} ${N.cobZ})`, fmt(r.Kh / 1e9, 3), "GN·m/rad"],
      [`Gravity stiffness K<sub>g</sub> = −m g ${N.comZ}`, fmt(r.Kg / 1e9, 3), "GN·m/rad"],
      [`Pitch stiffness ${N.K55} = K<sub>h</sub> + K<sub>g</sub> (S12)`, fmt(r.K / 1e9, 3), "GN·m/rad"],
    ]);
    // Static pitch tab
    const lim = r.pitch < 0 ? r.critNeg : r.critPos;
    $("pitchTable").innerHTML = rowsHTML([
      ["Hub height above SWL h<sub>hub</sub>", fmt(r.hubHeight, 1), "m"],
      ["Thrust moment F<sub>T</sub> h<sub>hub</sub>", fmt(r.M_thrust / 1e6, 1), "MN·m"],
      [`Weight–buoyancy couple m g ${N.comX} − ${N.rw} g ${N.Vs} ${N.cobX}`, fmt(r.M_weight / 1e6, 1), "MN·m"],
      ["Overturning moment M<sub>ext</sub> (S10 numerator)", fmt(r.M_ext / 1e6, 1), "MN·m"],
      [`Pitch stiffness ${N.K55} (S12)`, fmt(r.K / 1e9, 3), "GN·m/rad"],
      [`Static pitch ${N.xi5} = M<sub>ext</sub> / ${N.K55} (S10)`, r.K > 0 ? fmt(deg(r.pitch), 2) : "unstable", "°"],
      ["Allowable static pitch ξ<sub>5,max</sub>", fmt(r.params.pitchLimitDeg, 1), "°"],
      ["Limit angle of the linear model", fmt(deg(lim), 1), "°"],
      ["Blade tip clearance (min. " + fmt(r.params.minTipClearance, 0) + " m)", fmt(r.tipClearance, 1), "m"],
    ]);
    renderFrames(r);
  }

  /**
   * Bar chart of the three terms of the pitch stiffness and their sum:
   *   K55 = ρ_w g J  +  ρ_w g V_s CoB_0^Z  −  m g CoM^Z   (S12)
   * drawn into the SVG `svg` (Pitch stiffness tab or an exercise; viewBox 0 0 320 290).
   * Bars start from zero, so a negative term points downwards. The vertical
   * scale is shared by all bars (GN·m/rad).
   */
  function renderKChart(r, svg, scaleWith = []) {   // scaleWith: other results drawn with the same vertical scale
    const rg = M.RHO_W * M.G;
    const vals = (x) => [rg * x.hull.J / 1e9, rg * x.Vs * x.COB[2] / 1e9, -x.totalMass * M.G * x.COM[2] / 1e9, x.K / 1e9];
    const all = [r].concat(scaleWith).map(vals).flat();
    const bars = [
      { sub: "waterplane", v: rg * r.hull.J / 1e9, col: "--k-wp" },
      { sub: "buoyancy height", v: rg * r.Vs * r.COB[2] / 1e9, col: "--k-buoy" },
      { sub: "gravity", v: -r.totalMass * M.G * r.COM[2] / 1e9, col: "--k-grav" },
      { sub: "total", v: r.K / 1e9, col: "--k-tot" },
    ];
    // bar labels, with SVG subscripts
    const labs = [
      `ρgJ`,
      `ρgV<tspan dy="3" font-size="75%">s</tspan><tspan dy="-3"> </tspan>${SV.cobZ}`,
      `−mg ${SV.comZ}`,
      `K<tspan dy="3" font-size="75%">55</tspan>`,
    ];
    const W = 320, H = 290, ml = 40, mr = 4, mt = 26, mb = 40;   // must match the viewBox in index.html
    const vmax = Math.max(0, ...all), vmin = Math.min(0, ...all);
    const span = (vmax - vmin) || 1;
    const step = niceStep(span / 5);
    // leave room (≈ 10 % of the range) for the value labels at the end of the bars
    const top = Math.ceil((vmax + (vmax > 0 ? 0.1 * span : 0)) / step) * step;
    const bot = Math.floor((vmin - (vmin < 0 ? 0.1 * span : 0)) / step) * step;
    const minus = (s) => s.replace(/^-/, "−");
    const y = (v) => mt + (top - v) / ((top - bot) || 1) * (H - mt - mb);
    const out = [];
    // grid and axis
    for (let v = bot; v <= top + 1e-9; v += step) {
      out.push(`<line x1="${ml}" x2="${W - mr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--line)" stroke-width="${Math.abs(v) < 1e-9 ? 0 : 1}"/>`);
      out.push(text(ml - 5, y(v) + 4, minus(fmt(Math.abs(v) < 1e-9 ? 0 : v, step < 1 ? 1 : 0)), `text-anchor="end" font-size="10.5" fill="var(--muted)"`));
    }
    out.push(text(12, mt + (H - mt - mb) / 2, "GN·m/rad", `font-size="10.5" fill="var(--muted)" text-anchor="middle" transform="rotate(-90 12 ${(mt + (H - mt - mb) / 2).toFixed(1)})"`));
    // separator before the total bar
    const slot = (W - ml - mr) / bars.length, bw = slot * 0.58;
    const xSep = ml + 3 * slot;
    out.push(`<line x1="${xSep}" x2="${xSep}" y1="${mt - 8}" y2="${H - mb + 4}" stroke="var(--line)" stroke-dasharray="3 3"/>`);
    bars.forEach((b, i) => {
      const cx = ml + slot * (i + 0.5), y0 = y(0), y1 = y(b.v);
      const yTop = Math.min(y0, y1), h = Math.max(Math.abs(y1 - y0), 1);
      out.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="var(${b.col})" rx="2"/>`);
      // value: above a positive bar, below a negative one
      const vy = b.v >= 0 ? y1 - 5 : y1 + 13;
      out.push(text(cx, vy, (b.v > 0 ? "+" : "") + minus(fmt(b.v, 2)), `text-anchor="middle" font-size="11.5" font-weight="${i === 3 ? 700 : 500}" fill="var(--ink)"`));
      // label under the plot area
      out.push(text(cx, H - mb + 18, labs[i], `text-anchor="middle" font-size="11.5" fill="var(--ink)"`));
      out.push(text(cx, H - mb + 33, b.sub, `text-anchor="middle" font-size="10" fill="var(--muted)"`));
    });
    // zero line on top of the bars
    out.push(`<line x1="${ml}" x2="${W - mr}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--ink)" stroke-width="1.2"/>`);
    // stability verdict
    const ok = r.K > 0;
    out.push(text(W - mr, 12, ok ? "K₅₅ > 0: stable in pitch" : "K₅₅ ≤ 0: unstable in pitch",
      `text-anchor="end" font-size="11.5" font-weight="600" fill="var(${ok ? "--ok" : "--err"})"`));
    svg.innerHTML = out.join("");
  }

  /** Structure frame vs earth frame: where CoM, CoB, M and hub are at the static pitch. */
  function renderFrames(r) {
    const f = r.frames, pt = (a) => `(${fmt(a[0], 2)}, ${fmt(a[1], 2)})`;
    if (!f) { $("framesTable").innerHTML = ""; return; }
    const eq = r.K > 0 && !r.capsizes;                     // is there a static equilibrium?
    const thTxt = eq ? fmt(deg(f.th), 2) + "°" : "0° (no static equilibrium: positions shown upright)";
    const rows = [
      ["CoM (whole device)", pt(f.comS), pt(f.comS), pt(f.comE), "fixed in the structure: rotates with it"],
      ["CoB", pt(f.cobS0), pt(f.cobS), pt(f.cobE), "moves towards the immersed side, on an arc around M"],
      ["Metacentre M", pt(f.mS), pt(f.mS), pt(f.mE), "fixed in the structure (small angles)"],
      ["Hub", pt(f.hubS), pt(f.hubS), pt(f.hubE), "fixed in the structure"],
    ];
    $("framesTable").innerHTML =
      `<tr><th>Point</th><th>upright (x, z)</th><th>relative to the structure at ${N.xi5} (x, z)</th><th>relative to the ground at ${N.xi5} (X, Z)</th><th>note</th></tr>` +
      rows.map((c) => `<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td><td class="note">${c[4]}</td></tr>`).join("") +
      (!eq ? `<tr class="total"><td colspan="5">${N.xi5} = ${thTxt}</td></tr>` :
      `<tr class="total"><td colspan="3">${N.xi5} = ${thTxt}. Lever arm CoB<sup>X</sup>(${N.xi5}) − CoM<sup>X</sup>(${N.xi5})</td><td>${fmt(f.lever, 3)} m</td><td></td></tr>` +
      `<tr><td colspan="3">Righting couple m g [CoB<sup>X</sup>(${N.xi5}) − CoM<sup>X</sup>(${N.xi5})]</td><td>${fmt(f.rightingCouple / 1e6, 1)} MN·m</td><td class="note">≈ thrust moment F<sub>T</sub>·h<sub>hub</sub> = ${fmt(r.M_thrust / 1e6, 1)} MN·m (equal to first order in ${N.xi5})</td></tr>`);
  }

  // ======================================================================
  //  PLATFORM SWITCH, SCENARIOS AND BUTTONS
  // ======================================================================
  function setPlatform(type) {
    state.type = type;
    document.querySelectorAll("#platformSwitch button").forEach((b) => b.classList.toggle("active", b.dataset.type === type));
    // scenario menu for this platform
    $("presetSelect").innerHTML = `<option value="">— choose —</option><option value="reference">Reference design</option>` +
      UI[type].presets.map(([id, label]) => `<option value="${id}">${label}</option>`).join("");
    $("eqPlatform").innerHTML = UI[type].equations;
    $("targetDraft").value = M.PLATFORMS[type].refDraft;
    $("targetDraftMsg").textContent = "";
    buildControls();
    syncInputs();
    update();
  }

  function applyPreset(id) {
    const type = state.type;
    state.turbine = Object.assign({}, M.TURBINE_DEFAULTS);
    state.plat[type] = Object.assign({}, M.PLATFORMS[type].DEFAULTS);
    const pr = UI[type].presets.find((x) => x[0] === id);
    if (pr) {
      Object.entries(pr[2]).forEach(([k, val]) => { (k in M.TURBINE_DEFAULTS ? state.turbine : state.plat[type])[k] = val; });
      if (pr[3] !== undefined) state.plat[type].ballastMass = Math.max(0, M.ballastForDraft(type, P(), pr[3]));   // ballast for the target draft
    }
    syncInputs();
    update();
  }
  $("resetBtn").addEventListener("click", () => { $("presetSelect").value = ""; applyPreset("reference"); });
  $("presetSelect").addEventListener("change", (e) => { if (e.target.value) applyPreset(e.target.value); });
  document.querySelectorAll("#platformSwitch button").forEach((b) => b.addEventListener("click", () => setPlatform(b.dataset.type)));

  // Design helper (original exercise): ballast for a target draft
  $("ballastForDraftBtn").addEventListener("click", () => {
    const Dt = parseFloat($("targetDraft").value);
    const out = $("targetDraftMsg");
    const hull = M.PLATFORMS[state.type].build(P());
    if (hull.error) { out.textContent = "Fix the geometry first."; return; }
    if (!isFinite(Dt) || Dt <= 0) { out.textContent = "Enter a positive draft."; return; }
    if (Dt >= hull.height) { out.textContent = `The target draft must be smaller than the hull height (${fmt(hull.height, 1)} m).`; return; }
    const mb = M.ballastForDraft(state.type, P(), Dt);
    if (mb < 0) {
      out.textContent = `Not possible: even without ballast the platform floats deeper than ${fmt(Dt, 1)} m (it would need ${fmt(-mb / 1e3, 0)} t less mass).`;
      return;
    }
    state.plat[state.type].ballastMass = mb;
    out.textContent = `Ballast set to ${fmt(mb / 1e3, 1)} t.`;
    syncInputs();
    update();
  });

  // ------------------------------------------------------------------------
  //  Fit the "dash" (messages + cards + figures) to the window height, so that
  //  all figures are visible without scrolling on a laptop screen. Tables and
  //  equations stay below and can be reached by scrolling.
  // ------------------------------------------------------------------------
  function fitDash() {
    const dash = $("dash");
    if (window.innerWidth < 1000) { dash.style.height = ""; return; }   // narrow: normal scrolling page
    if (state.tab && state.tab !== "dashboard") return;                       // hidden: sized when its tab is shown
    const top = dash.getBoundingClientRect().top + window.scrollY;
    dash.style.height = Math.max(480, window.innerHeight - top - 8) + "px";
  }
  window.addEventListener("resize", () => { fitDash(); schedule(); });

  // ------------------------------------------------------------------------
  //  Full-screen figures: each figure gets a ⛶ button in its caption. The enlarged
  //  figure covers the output area but NOT the slider panel, so the platform can
  //  still be modified while looking at it. Esc or the button closes it.
  // ------------------------------------------------------------------------
  function setupFullScreen() {
    document.querySelectorAll(".fig").forEach((fig) => {
      const cap = fig.querySelector("figcaption");
      cap.innerHTML = `<span class="cap">${cap.innerHTML}</span>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fs-btn";
      btn.title = "Full screen (Esc to close)";
      btn.setAttribute("aria-label", "Show this figure full screen");
      btn.textContent = "⛶";
      btn.addEventListener("click", () => toggleFull(fig));
      cap.appendChild(btn);
    });
    document.addEventListener("keydown", (e) => {
      const open = document.querySelector(".fig.full");
      if (e.key === "Escape" && open) toggleFull(open);
    });
  }
  function toggleFull(fig) {
    const on = !fig.classList.contains("full");
    document.querySelectorAll(".fig.full").forEach((f) => f.classList.remove("full"));
    fig.classList.toggle("full", on);
    document.body.classList.toggle("has-full", on);
    const btn = fig.querySelector(".fs-btn");
    btn.textContent = on ? "✕" : "⛶";
    btn.title = on ? "Close full screen (Esc)" : "Full screen (Esc to close)";
    schedule();   // redraw (the moment chart adapts its width to the new box)
  }

  // ======================================================================
  //  CONVENTIONS SKETCH: frame, DoFs and side view of the reference semisub
  //  (as in the Conventions tab of the Hydrodynamics Lab, without the waves; the
  //  platform is drawn as in this tool: one column upwind at x = -s_EC, two downwind
  //  at x = +s_EC/2, wind and thrust along +x)
  // ======================================================================
  function drawConvSketch() {
    const svg = $("convSketch"), r = REF.semisub, p = r.params;
    const v = view(svg, -150, 150, -46, 286, 330);
    v.fs = 1;
    const c1 = "var(--dof1)", c3 = "var(--dof3)", c5 = "var(--dof5)", ink = "var(--ink)";
    const mk = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:${col}"/></marker>`;
    const out = [`<defs>${mk("cv1", c1)}${mk("cv3", c3)}${mk("cv5", c5)}${mk("cvk", ink)}${mk("cvt", "var(--thrust)")}</defs>`];
    out.push(`<rect x="0" y="0" width="${v.W}" height="${v.H}" rx="5" style="fill:var(--sky)"/>`);
    // platform (upright, reference design) and turbine
    const keel = -r.draft, h = UI.semisub.hull(p, r, keel, STYLES), id = (x, z) => [x, z];
    h.parts.forEach(([pts, style]) => out.push(poly(v, pts, id, style)));
    const hubZ = h.top + p.hubHeightRel, xr = p.hubX, tb = h.towerHalf;
    out.push(poly(v, [[-tb, h.top], [tb, h.top], [3.25, hubZ - 3], [-3.25, hubZ - 3]], id, STYLES.turb));
    out.push(poly(v, rectPts(xr, 10, hubZ - 3.5, hubZ + 3.5), id, STYLES.turb));
    out.push(poly(v, rectPts(xr - 1.6, xr, hubZ - p.rotorRadius, hubZ + p.rotorRadius), id, `fill:var(--steel-edge);stroke:none`));
    out.push(`<circle cx="${v.X(xr)}" cy="${v.Y(hubZ)}" r="4" style="fill:var(--steel-edge)"/>`);
    out.push(waterLayer(v));
    const T = (x, z, s, o = "") => text(v.X(x), v.Y(z), s, o.includes("font-size") ? o : `font-size="12" ${o}`);
    // axes at O: x right (downwind), z up, y into the page (right-handed)
    const O = [v.X(0), v.Y(0)], L = 52;
    out.push(`<line x1="${O[0]}" y1="${O[1]}" x2="${O[0] + L}" y2="${O[1]}" style="stroke:${ink}" stroke-width="2" marker-end="url(#cvk)"/>`);
    out.push(`<line x1="${O[0]}" y1="${O[1]}" x2="${O[0]}" y2="${O[1] - L}" style="stroke:${ink}" stroke-width="2" marker-end="url(#cvk)"/>`);
    out.push(text(O[0] + L + 3, O[1] + 14, "x", `font-size="13" font-weight="700"`), text(O[0] + 7, O[1] - L, "z", `font-size="13" font-weight="700"`));
    const cr = 6.5, q = cr * 0.62;
    out.push(`<circle cx="${O[0]}" cy="${O[1]}" r="${cr}" style="fill:var(--panel);stroke:${ink}" stroke-width="1.5"/>`);
    out.push(`<path d="M${O[0] - q},${O[1] - q} L${O[0] + q},${O[1] + q} M${O[0] - q},${O[1] + q} L${O[0] + q},${O[1] - q}" style="stroke:${ink}" stroke-width="1.5"/>`);
    out.push(text(O[0] - 9, O[1] + 18, "O", `text-anchor="end" font-size="13" font-weight="700"`), text(O[0] + 9, O[1] + 20, "y", `font-size="13" font-weight="700"`));
    // degrees of freedom: surge, heave, pitch (positive pitch = tower top downwind)
    out.push(`<line x1="${v.X(42)}" y1="${v.Y(12)}" x2="${v.X(72)}" y2="${v.Y(12)}" style="stroke:${c1}" stroke-width="3" marker-end="url(#cv1)"/>`);
    out.push(T(42, 18, "ξ₁ surge", `style="fill:${c1}" font-weight="600"`));
    out.push(`<line x1="${v.X(-95)}" y1="${v.Y(6)}" x2="${v.X(-95)}" y2="${v.Y(36)}" style="stroke:${c3}" stroke-width="3" marker-end="url(#cv3)"/>`);
    out.push(T(-95, 41, "ξ₃ heave", `text-anchor="middle" style="fill:${c3}" font-weight="600"`));
    const rr = 70 * v.sc, a0 = -100 * Math.PI / 180, a1 = -55 * Math.PI / 180;
    const p0 = [O[0] + rr * Math.cos(a0), O[1] + rr * Math.sin(a0)], p1 = [O[0] + rr * Math.cos(a1), O[1] + rr * Math.sin(a1)];
    out.push(`<path d="M${p0[0]},${p0[1]} A${rr},${rr} 0 0 1 ${p1[0]},${p1[1]}" fill="none" style="stroke:${c5}" stroke-width="3" marker-end="url(#cv5)"/>`);
    out.push(text(p1[0] + 8, p1[1] - 16, `ξ₅ pitch &gt; 0:<tspan x="${(p1[0] + 8).toFixed(1)}" dy="15">tower top downwind</tspan>`, `font-size="12" style="fill:${c5}" font-weight="600"`));
    // wind and thrust
    out.push(`<line x1="${v.X(-145)}" y1="${v.Y(262)}" x2="${v.X(-112)}" y2="${v.Y(262)}" style="stroke:${ink}" stroke-width="2" marker-end="url(#cvk)"/>`);
    out.push(T(-145, 268, "wind"));
    out.push(`<line x1="${v.X(xr - 45)}" y1="${v.Y(hubZ)}" x2="${v.X(xr - 5)}" y2="${v.Y(hubZ)}" style="stroke:var(--thrust)" stroke-width="3" marker-end="url(#cvt)"/>`);
    out.push(T(xr - 45, hubZ + 6, "F<tspan dy=\"0.3em\" font-size=\"72%\">T</tspan><tspan dy=\"-0.3em\"> at the hub</tspan>", `style="fill:var(--thrust)"`));
    out.push(T(xr - 4, hubZ + p.rotorRadius - 6, "rotor plane (y–z)", `text-anchor="end" style="fill:var(--muted)" font-size="11"`));
    // columns
    const s = p.s_EC;
    out.push(T(-s, keel - 10, "upwind column, x = −s<tspan dy=\"0.3em\" font-size=\"72%\">EC</tspan>", `text-anchor="middle" font-size="11"`));
    out.push(T(s / 2, keel - 20, "2 downwind columns, x = +s<tspan dy=\"0.3em\" font-size=\"72%\">EC</tspan><tspan dy=\"-0.3em\">/2</tspan>", `text-anchor="middle" font-size="11"`));
    svg.innerHTML = out.join("");
  }

  // ======================================================================
  //  GUIDED EXERCISES HS0-HS4 (engine adapted from the Hydrodynamics Lab)
  //  Each exercise sits at the bottom of its tab. The expected answers are computed at
  //  run time from HydroModel on the REFERENCE design (or on the case of the exercise),
  //  never from the sliders. Only HS4 asks the student to use the sliders.
  // ======================================================================
  const exercises = [];
  const TOL = 0.02;                 // same relative tolerance (±2 %) for every numeric answer
  const RG = M.RHO_W * M.G;
  const neg = (s) => String(s).replace(/^-/, "−");
  /** n significant digits with thousands separators (data tables: 4, answers: 3) */
  const sig = (v, n = 4) => (v === undefined || !isFinite(v)) ? "—"
    : neg((Math.abs(v) < 1e-12 ? 0 : v).toLocaleString("en-US", { minimumSignificantDigits: n, maximumSignificantDigits: n }));
  const dataTable = (rows) => `<table class="datatable small-table">${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="dim">${r[2] || ""}</td></tr>`).join("")}</table>`;
  const PREC = `<p class="hint">Give every number with 3 significant digits. Tolerance ±2 %. A dot or a comma can be used as decimal separator.</p>`;

  /** Possible readings of a typed number: "0,036" = 0.036; "609,300" = 609300 or 609.3 (both tried). */
  function readNumber(raw) {
    const s = String(raw).trim().replace(/\s/g, "").replace(/[−–]/g, "-");
    const out = [];
    if (/^[-+]?(\d+([.,]\d*)?|[.,]\d+)([eE][-+]?\d+)?$/.test(s)) out.push(+s.replace(",", "."));
    if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) out.push(+s.replace(/,/g, ""));
    return out.filter((v) => isFinite(v));
  }
  /** Does the typed text answer question q? */
  function accepts(q, raw) {
    if (q.type === "choice") return String(raw) !== "" && +raw === q.answer;
    if (q.type === "multi") return String(raw).split(",").filter((s) => s !== "").map(Number).sort().join(",") === q.answer.slice().sort().join(",");
    return readNumber(raw).some((v) => Math.abs(v - q.answer) <= TOL * Math.abs(q.answer));
  }

  /**
   * cfg  = { mount, title, minutes, lo, cases: [{label, value}], random: () => value, build: (value) => spec, toTop }
   * spec = { task, data (html), questions: [q], after: () => {html, questions, draw(box)} | null, solution: () => {html, draw(box)} }
   * q    = { id, label, unit, type: "num" | "choice" | "multi" | "design" | "open", options, answer, hints: [], explain }
   *        (multi: tick boxes, answer = array of the indices of the correct options)
   *        design: a live check of the slider state, q.evaluate() => {pass, html}; no attempt limit;
   *                q.applySolution() puts the solution on the sliders (instructor mode)
   *        open: free text, not graded; Submit shows q.explain (model answer and self-assessment)
   *        q.draw(div) is called after the explanation is shown (charts)
   * cfg.onComplete() is called when all the main questions are answered (used to reveal tables)
   */
  function Exercise(cfg) {
    const ex = { cfg, value: cfg.cases[0].value, caseIdx: 0, qs: {}, spec: null, afterShown: false };
    const root = $(cfg.mount);
    const toTop = cfg.toTop === false ? "" : `<a class="totop" href="#dashboard" title="Back to the dashboard">↑ dashboard</a>`;
    root.innerHTML = `<details class="exercise" id="${cfg.mount}-d"><summary><span class="ex-title">${cfg.title}</span><span class="ex-time">(${typeof cfg.minutes === "number" ? `about ${cfg.minutes} min` : cfg.minutes})</span>${toTop}</summary><div class="ex-body"><div class="ex-left"></div><div class="ex-right"></div><div class="sol"></div></div></details>`;
    const link = root.querySelector(".totop");
    if (link) link.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); showTab("dashboard"); });
    const left = root.querySelector(".ex-left"), right = root.querySelector(".ex-right"), solBox = root.querySelector(".sol");
    ex.details = root.querySelector("details");
    ex.render = function () {
      ex.spec = cfg.build(ex.value);
      ex.qs = {}; ex.afterShown = false;
      const showCases = cfg.cases.length > 1 || cfg.random;
      const cases = !showCases ? "" : cfg.cases.map((c, i) => `<button class="btn btn-small ${i === ex.caseIdx ? "sel" : "btn-ghost"}" data-c="${i}">${c.label}</button>`).join("") +
        (cfg.random ? `<button class="btn btn-small ${ex.caseIdx === -1 ? "sel" : "btn-ghost"}" data-c="rnd">New random case</button>` : "");
      left.innerHTML = (showCases ? `<div class="cases">${cases}</div>` : "") +
        `<p class="lo"><b>Objective:</b> ${cfg.lo}</p><p class="task">${ex.spec.task}</p>${ex.spec.data}` +
        (INSTRUCTOR ? `<p><button class="btn btn-small btn-ghost" data-a="sol">Show solution</button></p>` : "");
      left.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.c === "rnd") { ex.value = cfg.random(); ex.caseIdx = -1; } else { ex.caseIdx = +b.dataset.c; ex.value = cfg.cases[ex.caseIdx].value; }
        ex.render();                                     // a case change resets the exercise
      }));
      const sb = left.querySelector('[data-a="sol"]');
      if (sb) sb.addEventListener("click", () => ex.showSolution());
      right.innerHTML = `<div class="qs"></div><div class="after"></div>`;
      solBox.innerHTML = "";
      ex.spec.questions.forEach((q, i) => addQuestion(right.querySelector(".qs"), q, i + 1));
    };
    function addQuestion(container, q, num) {
      const st = { q, attempts: 0, done: false, hint: 0 };
      ex.qs[q.id] = st;
      const div = document.createElement("div");
      div.className = "q" + (q.type === "num" ? "" : " q-wide");          // choice questions: answer below the question
      div.dataset.q = q.id;
      // a choice with long options is shown as radio buttons (a closed drop-down would cut the text)
      const radio = q.type === "choice" && q.options.some((o) => o.replace(/<[^>]+>/g, "").length > 70);
      const input = radio
        ? `<span class="radios">${q.options.map((o, i) => `<label><input type="radio" name="${cfg.mount}-${q.id}" value="${i}">${o}</label>`).join("")}</span>`
        : q.type === "choice"
        ? `<select><option value="">choose…</option>${q.options.map((o, i) => `<option value="${i}">${o}</option>`).join("")}</select>`
        : q.type === "multi"
          ? `<span class="multi">${q.options.map((o, i) => `<label><input type="checkbox" value="${i}">${o}</label>`).join("")}</span>`
          : q.type === "open" ? `<textarea rows="4" class="open-text" placeholder="Write your answer here (it is not stored)."></textarea>`
          : q.type === "design" ? ""
          : `<input type="text" inputmode="decimal" autocomplete="off" spellcheck="false">`;
      const checkLabel = q.type === "design" ? "Check my design" : q.type === "open" ? "Submit" : "Check";
      div.innerHTML = `<div class="q-row"><label>${num ? num + ". " : ""}${q.label}${q.unit ? ` (${q.unit})` : ""}</label>${input}<button class="btn btn-small" data-a="check">${checkLabel}</button>${q.hints && q.hints.length ? `<button class="btn btn-small btn-ghost" data-a="hint">Hint</button>` : ""}<span class="res"></span></div><div class="dlines"></div><div class="hints"></div><div class="expl"></div>`;
      container.appendChild(div);
      const inps = Array.from(div.querySelectorAll(".q-row input, .q-row select, .q-row textarea")), res = div.querySelector(".res");
      // the answer as text: the number typed, the option index, or the ticked indices ("2,3,4")
      st.getVal = () => radio ? (inps.find((i) => i.checked) || { value: "" }).value : q.type === "multi" ? inps.filter((i) => i.checked).map((i) => i.value).join(",") : inps.length ? String(inps[0].value).trim() : "";
      st.setVal = (t) => { if (radio) inps.forEach((i) => { i.checked = i.value === String(t); }); else if (q.type === "multi") { const set = String(t).split(","); inps.forEach((i) => { i.checked = set.includes(i.value); }); } else if (inps.length) inps[0].value = t; };
      // design question: evaluate the current slider state, as many times as needed
      st.check = () => {
        const e = q.evaluate();
        div.querySelector(".dlines").innerHTML = e.html;
        return e.pass;
      };
      div.querySelector('[data-a="check"]').addEventListener("click", () => {
        if (st.done) return;
        if (q.type === "design") {
          if (st.check()) finish(true);
          else { st.attempts++; res.className = "res bad"; res.textContent = `✗ not yet: change the design and check again (check ${st.attempts})`; }
          return;
        }
        const raw = st.getVal();
        if (q.type === "open") {
          if (raw === "") { res.className = "res bad"; res.textContent = "write your answer first"; return; }
          finish(true);
          return;
        }
        if (raw === "") { res.className = "res bad"; res.textContent = q.type === "choice" ? "choose an option" : q.type === "multi" ? "tick at least one box" : "enter a value"; return; }
        if (q.type === "num" && !readNumber(raw).length) { res.className = "res bad"; res.textContent = "enter a number"; return; }
        if (accepts(q, raw)) finish(true);
        else {
          st.attempts++;
          if (st.attempts >= 3) finish(false);
          else { res.className = "res bad"; res.textContent = `✗ not correct${q.type === "num" ? " (±2 %)" : ""}, attempt ${st.attempts} of 3`; }
        }
      });
      const hb = div.querySelector('[data-a="hint"]');
      if (hb) hb.addEventListener("click", () => {
        if (st.hint < q.hints.length) { div.querySelector(".hints").insertAdjacentHTML("beforeend", `<div class="hintbox"><b>Hint ${st.hint + 1}.</b> ${q.hints[st.hint]}</div>`); st.hint++; }
        if (st.hint >= q.hints.length) hb.disabled = true;
      });
      const plain = (h) => { const t = document.createElement("div"); t.innerHTML = h; return t.textContent; };
      const ansText = () => q.type === "choice" ? plain(q.options[q.answer])
        : q.type === "multi" ? q.answer.map((i) => plain(q.options[i])).join(", ")
        : q.type === "design" ? "design applied to the sliders"
        : q.type === "open" ? "see the model answer"
        : sig(q.answer, 3) + (q.unit ? " " + q.unit : "");
      function finish(ok, byInstructor) {
        st.done = true; div.classList.add("done");
        res.className = ok && !byInstructor ? "res ok" : "res shown";
        res.textContent = byInstructor ? `solution: ${ansText()}` : q.type === "open" ? "✓ submitted" : ok ? "✓ correct" : `answer: ${ansText()}`;
        const pre = byInstructor ? "" : ok ? "" : `<b>After three attempts.</b> The answer is ${esc(ansText())}. `;
        div.querySelector(".expl").innerHTML = `<div class="explain ${ok && !byInstructor ? "" : "revealed"}">${pre}${typeof q.explain === "function" ? q.explain() : q.explain || ""}</div>`;
        inps.forEach((i) => { i.disabled = true; });
        div.querySelector('[data-a="check"]').disabled = true;
        if (q.draw) q.draw(div);
        maybeAfter();
      }
      // instructor mode: fill in the expected answer and mark the question as solved
      st.solve = () => {
        if (st.done) return;
        if (q.type === "design") { if (q.applySolution) q.applySolution(); st.check(); finish(true, true); return; }
        if (q.type === "open") { finish(true, true); return; }
        st.setVal(q.type === "choice" ? String(q.answer) : q.type === "multi" ? q.answer.join(",") : String(+q.answer.toPrecision(4)));
        finish(true, true);
      };
    }
    function maybeAfter() {
      if (!ex.spec.questions.every((q) => ex.qs[q.id].done)) return;
      if (cfg.onComplete) cfg.onComplete();                // e.g. reveal the tables of the tab
      if (ex.afterShown || !ex.spec.after) return;
      ex.afterShown = true;
      const a = ex.spec.after();
      const box = right.querySelector(".after");
      box.innerHTML = `<div class="reveal">${a.html}<div class="qs2"></div></div>`;
      (a.questions || []).forEach((q, i) => addQuestion(box.querySelector(".qs2"), q, "F" + (i + 1)));
      if (a.draw) a.draw(box);
    }
    /** Instructor mode: solve every question (also the follow-up ones) and show the worked solution. */
    ex.showSolution = function () {
      for (let pass = 0; pass < 3; pass++) Object.values(ex.qs).forEach((st) => st.solve());
      if (ex.spec.solution) {
        const s = ex.spec.solution();
        const box = solBox;
        box.innerHTML = `<div class="solution"><h4>Worked solution</h4>${s.html}</div>`;
        if (s.draw) s.draw(box);
      }
    };
    ex.isDone = () => Object.values(ex.qs).every((st) => st.done) && (!ex.spec.after || ex.afterShown);
    exercises.push(ex);
    ex.render();
    return ex;
  }
  /** Moment chart or K55 bar chart inside an exercise, for the result r of its case. */
  const momentFig = (cls) => `<figure class="fig ex-fig ${cls}"><figcaption>Pitch moment balance for this case</figcaption><svg role="img" aria-label="Restoring and overturning moments versus pitch angle"></svg></figure>`;
  const kFig = (cls) => `<svg class="ex-k ${cls}" viewBox="0 0 320 290" role="img" aria-label="Bar chart of the three terms of the pitch stiffness"></svg>`;

  // -------------------------------------------------------------- HS0
  function buildHS0() {
    const r = REF.semisub, p = r.params, tb = M.turbineParts(p);
    const hub = r.hubHeight, FT = p.thrust / 1e6, mt = tb.mass, cx = tb.comX;
    const Mt = hub * FT, Mg = mt * M.G * cx / 1e6;
    Exercise({
      mount: "exHS0", title: "HS0. Signs warm-up", minutes: 3,
      lo: "S-LO1. Slides 3–4 and 7, equation S2.",
      cases: [{ label: "Reference turbine", value: 0 }],
      build: () => ({
        task: "The frame has its origin O at the still water level on the platform axis, x downwind, z up. Use M = r × F (S2) to answer.",
        data: dataTable([["thrust F<sub>T</sub>", sig(FT), "MN"], ["hub height above O, h<sub>hub</sub>", sig(hub), "m"],
          ["turbine mass", sig(mt / 1e3), "t"], [`turbine ${N.comX}`, sig(cx), "m"], ["g", sig(M.G), "m/s²"]]),
        questions: [
          { id: "thrust", type: "choice", label: "The thrust F<sub>T</sub> acts along +x at the hub, at height h<sub>hub</sub> above O. The pitch moment it produces is …",
            options: ["zero", "positive: the tower top tilts downwind", "negative: the tower top tilts upwind"], answer: 1,
            hints: ["Write r and F as vectors and take the y component of r × F."],
            explain: `r = (x<sub>hub</sub>, 0, h<sub>hub</sub>) and F = (F<sub>T</sub>, 0, 0), so M<sub>y</sub> = z F<sub>x</sub> − x F<sub>z</sub> = h<sub>hub</sub> F<sub>T</sub> = ${sig(hub)} m × ${sig(FT)} MN = ${sig(Mt)} MN·m &gt; 0. The x-position of the hub does not matter, because F has no z component.` },
          { id: "dofs", type: "multi", label: "Which DoFs receive a restoring force or moment from hydrostatics alone? Tick all that apply.",
            options: ["ξ<sub>1</sub> surge", "ξ<sub>2</sub> sway", "ξ<sub>3</sub> heave", "ξ<sub>4</sub> roll", "ξ<sub>5</sub> pitch", "ξ<sub>6</sub> yaw"], answer: [2, 3, 4],
            hints: ["Which motions change the submerged volume, or the position of the CoB with respect to the CoM?"],
            explain: "Heave changes the submerged volume; roll and pitch change its shape and move the CoB. Surge, sway and yaw do not change the submerged volume or its shape, so they need moorings." },
          { id: "weight", type: "choice", label: `Turbine CoM ${sig(-cx, 3)} m upwind (${N.comX} &lt; 0). The pitch moment of its weight is …`,
            options: ["negative: it reduces the pitch due to the thrust", "positive: it adds to the pitch due to the thrust", "zero: the weight is vertical"], answer: 0,
            hints: ["The weight is F = (0, 0, −m g), applied at the CoM."],
            explain: `r = (${N.comX}, 0, ${N.comZ}) and F = (0, 0, −m g), so M<sub>y</sub> = z F<sub>x</sub> − x F<sub>z</sub> = m g ${N.comX} = ${sig(Mg)} MN·m &lt; 0 for the turbine alone. This term comes back in S10 (HS3).` },
        ],
        solution: () => ({ html: `<ol>
          <li>Thrust: r = (x<sub>hub</sub>, 0, h<sub>hub</sub>), F = (F<sub>T</sub>, 0, 0).<br>M<sub>y</sub> = z F<sub>x</sub> − x F<sub>z</sub> = h<sub>hub</sub> F<sub>T</sub> − x<sub>hub</sub> · 0 = ${sig(hub)} × ${sig(FT)} = <b>${sig(Mt)} MN·m &gt; 0</b>: tower top downwind (option 2).</li>
          <li>Only heave, roll and pitch change the submerged volume or move the CoB: tick ξ<sub>3</sub> heave, ξ<sub>4</sub> roll and ξ<sub>5</sub> pitch only. Surge, sway, yaw need moorings.</li>
          <li>Turbine weight: r = (${N.comX}, 0, ${N.comZ}), F = (0, 0, −m g).<br>M<sub>y</sub> = ${N.comZ} · 0 − ${N.comX} · (−m g) = m g ${N.comX} = ${sig(mt / 1e3)} t × ${sig(M.G)} × (${sig(cx)} m) = <b>${sig(Mg)} MN·m &lt; 0</b> (option 1): it reduces the pitch.</li></ol>` }),
      }),
    });
  }

  // -------------------------------------------------------------- HS1
  const DM = 100e3;                                    // kg added on deck in question 5
  const dDraft = (k) => DM / (M.RHO_W * REF[k].hull.A_wp);
  function buildHS1() {
    const NAMES = { semisub: "Semisubmersible", spar: "Spar", barge: "Barge" };
    const BAL = { semisub: "concrete ballast", spar: "iron-ore ballast", barge: "water ballast" };
    Exercise({
      mount: "exHS1", title: "HS1. Draft and heave stiffness", minutes: 7, onComplete: () => unlockTables("heave"),
      lo: "S-LO2. Slide 6, equation S1; slide 13, equation S13.",
      cases: [{ label: "Spar", value: "spar" }, { label: "Barge", value: "barge" }, { label: "Semisub", value: "semisub" }],
      build: (k) => {
        const r = REF[k], p = r.params, h = r.hull, A = h.A_wp;
        const geo = k === "spar" ? [["diameter d", sig(p.d), "m"]]
          : k === "barge" ? [["width W (square)", sig(p.W), "m"]]
          : [["central column diameter d", sig(p.d), "m"], ["external column diameter d<sub>EC</sub> (3 columns)", sig(p.d_EC), "m"],
            ["pontoon length L<sub>P</sub> (3 pontoons)", sig(h.L_P), "m"], ["pontoon width W<sub>P</sub>", sig(p.W_P), "m"], ["pontoon height H<sub>P</sub>", sig(p.H_P), "m"]];
        const mass = [["turbine mass", r.turbine.mass], ["steel mass", r.steelMass], [BAL[k], p.ballastMass]];
        if (k === "semisub") mass.push(["water in the pontoons", h.otherMass]);
        const VP = k === "semisub" ? h.V_P : 0;
        const vsHint = k === "spar" ? "V<sub>s</sub>(D) = π d²/4 · D." : k === "barge" ? "V<sub>s</sub>(D) = W² D."
          : "V<sub>s</sub>(D) = A<sub>wp</sub> D + 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub>, with A<sub>wp</sub> = π d²/4 + 3 π d<sub>EC</sub>²/4 (columns from the keel to the SWL, plus the pontoons).";
        const aTxt = k === "spar" ? `A<sub>wp</sub> = π d²/4 = ${sig(A)} m²` : k === "barge" ? `A<sub>wp</sub> = W² = ${sig(A)} m²`
          : `A<sub>wp</sub> = π d²/4 + 3 π d<sub>EC</sub>²/4 = ${sig(A)} m²`;
        const dTxt = k === "semisub" ? `D = (V<sub>s</sub> − 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub>) / A<sub>wp</sub> = (${sig(r.Vs)} − ${sig(VP)}) / ${sig(A)} = ${sig(r.draft)} m`
          : `D = V<sub>s</sub> / A<sub>wp</sub> = ${sig(r.Vs)} / ${sig(A)} = ${sig(r.draft)} m, with ${aTxt}`;
        return {
          task: `${NAMES[k]}, reference design. Find the draft D from the heave equilibrium (S1), m = ρ<sub>w</sub> V<sub>s</sub>, then the heave stiffness K<sub>33</sub> = ρ<sub>w</sub> g A<sub>wp</sub> (S13). Finally, find how much the draft grows if ${sig(DM / 1e3, 3)} t are added on deck.`,
          data: dataTable(geo.concat(mass.map(([n, v]) => [n, sig(v / 1e3), "t"]), [[N.rw, sig(M.RHO_W), "kg/m³"], ["g", sig(M.G), "m/s²"]])) + PREC,
          questions: [
            { id: "m", label: "Total mass m", unit: "t", type: "num", answer: r.totalMass / 1e3,
              hints: ["Sum of the masses in the table."],
              explain: `m = ${mass.map(([, v]) => sig(v / 1e3)).join(" + ")} = ${sig(r.totalMass / 1e3)} t.` },
            { id: "vs", label: `Submerged volume ${N.Vs}`, unit: "m³", type: "num", answer: r.Vs,
              hints: ["S1: m = ρ<sub>w</sub> V<sub>s</sub>. Use m in kg."],
              explain: `V<sub>s</sub> = m / ρ<sub>w</sub> = ${sig(r.totalMass)} kg / ${sig(M.RHO_W)} kg/m³ = ${sig(r.Vs)} m³.` },
            { id: "d", label: "Draft D", unit: "m", type: "num", answer: r.draft,
              hints: [vsHint, "Solve V<sub>s</sub>(D) = V<sub>s</sub> for D."],
              explain: dTxt + "." },
            { id: "k33", label: `Heave stiffness ${N.K33}`, unit: "MN/m", type: "num", answer: r.heaveStiffness / 1e6,
              hints: ["S13: K<sub>33</sub> = ρ<sub>w</sub> g A<sub>wp</sub>.", "A<sub>wp</sub> is the area cut by the still water plane."],
              explain: `${aTxt}, K<sub>33</sub> = ρ<sub>w</sub> g A<sub>wp</sub> = ${sig(M.RHO_W)} × ${sig(M.G)} × ${sig(A)} = ${sig(r.heaveStiffness / 1e6)} MN/m.` },
            { id: "dd", label: `Draft increase ΔD if ${sig(DM / 1e3, 3)} t are added on deck`, unit: "m", type: "num", answer: dDraft(k),
              hints: [`The extra weight is carried by extra buoyancy: ΔD = Δm / (ρ<sub>w</sub> A<sub>wp</sub>) = Δm g / K<sub>33</sub>.`],
              explain: `ΔD = Δm / (ρ<sub>w</sub> A<sub>wp</sub>) = ${sig(DM)} kg / (${sig(M.RHO_W)} × ${sig(A)}) = ${sig(dDraft(k))} m.` },
          ],
          after: () => {
            const ks = ["spar", "semisub", "barge"], dd = ks.map(dDraft);
            const opts = ["barge", "semisub", "spar"], best = ks[dd.indexOf(Math.max(...dd))], least = ks[dd.indexOf(Math.min(...dd))];
            return {
              html: `<b>The three platforms</b> (reference designs, ${sig(DM / 1e3, 3)} t added on deck):` +
                `<table class="datatable small-table"><tr><th></th><th>A<sub>wp</sub> (m²)</th><th>${N.K33} (MN/m)</th><th>ΔD (m)</th></tr>` +
                ks.map((x) => `<tr><td>${NAMES[x]}</td><td>${sig(REF[x].hull.A_wp)}</td><td>${sig(REF[x].heaveStiffness / 1e6)}</td><td>${sig(dDraft(x))}</td></tr>`).join("") + `</table>`,
              questions: [{ id: "prec", type: "choice", label: "Which platform needs the most precise ballasting to reach its design draft?",
                options: opts.map((o) => o), answer: opts.indexOf(best),
                explain: `ΔD = Δm / (ρ<sub>w</sub> A<sub>wp</sub>). The ${best} has the smallest waterplane (${sig(REF[best].hull.A_wp)} m²), so ${sig(DM / 1e3, 3)} t move it by about ${sig(dDraft(best), 2)} m, against about ${sig(dDraft(least), 1)} m for the ${least} (${sig(REF[least].hull.A_wp)} m²).` }],
            };
          },
          solution: () => ({ html: `<ol>
            <li>m = ${mass.map(([, v]) => sig(v / 1e3)).join(" + ")} = <b>${sig(r.totalMass / 1e3)} t</b></li>
            <li>S1: V<sub>s</sub> = m / ρ<sub>w</sub> = ${sig(r.totalMass)} / ${sig(M.RHO_W)} = <b>${sig(r.Vs)} m³</b></li>
            <li>${dTxt.replace(/= ([^=]+) m(,|$)/, "= <b>$1 m</b>$2")}</li>
            <li>S13: K<sub>33</sub> = ρ<sub>w</sub> g A<sub>wp</sub> = ${sig(M.RHO_W)} × ${sig(M.G)} × ${sig(A)} = <b>${sig(r.heaveStiffness / 1e6)} MN/m</b></li>
            <li>ΔD = Δm / (ρ<sub>w</sub> A<sub>wp</sub>) = ${sig(DM)} / (${sig(M.RHO_W)} × ${sig(A)}) = <b>${sig(dDraft(k))} m</b></li></ol>` }),
        };
      },
    });
  }

  // -------------------------------------------------------------- HS2
  /** The three terms of S12 (GN·m/rad) and the stabilising one, for a result r. */
  function k55Terms(r) {
    const t = { wp: RG * r.hull.J / 1e9, bh: RG * r.Vs * r.COB[2] / 1e9, gr: -r.totalMass * M.G * r.COM[2] / 1e9, K: r.K / 1e9 };
    const list = [["wp", t.wp], ["bh", t.bh], ["gr", t.gr]];
    t.stab = list.reduce((a, b) => (b[1] > a[1] ? b : a))[0];        // the largest positive term
    return t;
  }
  function buildHS2() {
    const NAMES = { semisub: "Semisubmersible", spar: "Spar", barge: "Barge" };
    const OPTS = ["gravity term", "waterplane term", "buoyancy height term"], KEY = { gr: 0, wp: 1, bh: 2 };
    Exercise({
      mount: "exHS2", title: `HS2. The three terms of ${N.K55}`, minutes: 8, onComplete: () => unlockTables("k55"),
      lo: "S-LO3. Slides 13–14 and 19–20, equation S12.",
      cases: [{ label: "Barge", value: "barge" }, { label: "Spar", value: "spar" }, { label: "Semisub", value: "semisub" }],
      build: (k) => {
        const r = REF[k], p = r.params, t = k55Terms(r), J = r.hull.J;
        const data = k === "barge" ? [["width W (square)", sig(p.W), "m"], ["draft D", sig(r.draft), "m"]]
          : k === "spar" ? [["diameter d", sig(p.d), "m"], ["draft D", sig(r.draft), "m"]]
          : [["J (waterplane, about the y axis)", sig(J), "m⁴"], [`submerged volume ${N.Vs}`, sig(r.Vs), "m³"], [`${N.cobZ}`, sig(r.COB[2]), "m"]];
        data.push(["total mass m", sig(r.totalMass / 1e3), "t"], [`${N.comZ} (whole device)`, sig(r.COM[2]), "m"], [N.rw, sig(M.RHO_W), "kg/m³"], ["g", sig(M.G), "m/s²"]);
        const vsTxt = k === "barge" ? `V<sub>s</sub> = W² D = ${sig(r.Vs)} m³` : k === "spar" ? `V<sub>s</sub> = π d²/4 · D = ${sig(r.Vs)} m³` : `V<sub>s</sub> = ${sig(r.Vs)} m³`;
        const jTxt = k === "barge" ? `J = W⁴/12 = ${sig(J)} m⁴` : k === "spar" ? `J = π d⁴/64 = ${sig(J)} m⁴` : `J = ${sig(J)} m⁴`;
        const qs = [];
        if (k !== "semisub") qs.push({ id: "J", label: "Waterplane second moment J", unit: "m⁴", type: "num", answer: J,
          hints: ["Square of side W: J = W⁴/12. Circle of diameter d: J = π d⁴/64."], explain: jTxt + "." });
        qs.push(
          { id: "wp", label: `Waterplane term ${N.rw} g J`, unit: "GN·m/rad", type: "num", answer: t.wp,
            hints: ["Multiply J by ρ<sub>w</sub> g and divide by 10⁹ to get GN·m/rad."],
            explain: `${N.rw} g J = ${sig(M.RHO_W)} × ${sig(M.G)} × ${sig(J)} = ${sig(t.wp)} GN·m/rad. Always positive.` },
          { id: "bh", label: `Buoyancy height term ${N.rw} g ${N.Vs} ${N.cobZ}`, unit: "GN·m/rad", type: "num", answer: t.bh,
            hints: [k === "semisub" ? `${N.Vs} and ${N.cobZ} are in the table.` : `${N.cobZ} = −D/2 for this hull, and ${vsTxt.split(" = ").slice(0, 2).join(" = ")} (or m/ρ<sub>w</sub>).`, "The sign is negative."],
            explain: `${vsTxt}, ${N.cobZ} = ${sig(r.COB[2])} m, so ${N.rw} g ${N.Vs} ${N.cobZ} = ${sig(t.bh)} GN·m/rad. The CoB is always below the SWL, so this term always destabilises.` },
          { id: "gr", label: `Gravity term −m g ${N.comZ}`, unit: "GN·m/rad", type: "num", answer: t.gr,
            hints: [`Negative if the CoM is above the still water level (${N.comZ} &gt; 0). Use m in kg.`],
            explain: `−m g ${N.comZ} = −${sig(r.totalMass)} × ${sig(M.G)} × (${sig(r.COM[2])}) = ${sig(t.gr)} GN·m/rad: ${t.gr > 0 ? "positive, because the CoM is below the SWL" : "negative, because the CoM is above the SWL"}.` },
          { id: "K", label: `Pitch stiffness ${N.K55}`, unit: "GN·m/rad", type: "num", answer: t.K,
            hints: ["S12: sum of the three terms."],
            explain: `${N.K55} = ${sig(t.wp)} + (${sig(t.bh)}) + (${sig(t.gr)}) = ${sig(t.K)} GN·m/rad ${t.K > 0 ? "&gt; 0: stable in pitch" : "≤ 0: unstable"}.` },
          { id: "stab", type: "choice", label: "Which term makes this platform stable?", options: OPTS, answer: KEY[t.stab],
            explain: t.stab === "gr" ? "The gravity term: the spar has a tiny waterplane, but its CoM is far below the SWL." : `The waterplane term: J is large because the waterplane area is ${k === "barge" ? "wide" : "far from the axis (columns at s<sub>EC</sub>)"}.` },
        );
        const bm = r.BM;
        return {
          task: `${NAMES[k]}, reference design. Compute the pitch stiffness term by term with S12:<br>K<sub>55</sub> = ρ<sub>w</sub> g J + ρ<sub>w</sub> g V<sub>s</sub> ${N.cobZ} − m g ${N.comZ}.<br>Assumptions: small pitch about O, waterplane centroid on the axis (symmetric hull), heave free (V<sub>s</sub> constant), no mooring. ${N.cobZ} &lt; 0 always, so the middle term always destabilises.`,
          data: dataTable(data) + PREC,
          questions: qs,
          after: () => ({
            html: `<b>The three terms of ${N.K55}</b> for this platform:${kFig("hs2k")}<p>BM = J/V<sub>s</sub> = ${sig(bm)} m: the CoB ${bm > 5 ? "moves a lot when the platform pitches (barge, semisub)" : "hardly moves when the platform pitches (spar)"}.</p>`,
            draw: (box) => renderKChart(r, box.querySelector(".hs2k")),
          }),
          solution: () => ({
            html: `<ol>${k !== "semisub" ? `<li>${jTxt}</li>` : `<li>J = ${sig(J)} m⁴ and ${N.cobZ} = ${sig(r.COB[2])} m (given)</li>`}
              <li>${N.rw} g J = ${sig(M.RHO_W)} × ${sig(M.G)} × ${sig(J)} = <b>${sig(t.wp)} GN·m/rad</b></li>
              <li>${N.rw} g ${N.Vs} ${N.cobZ} = ${sig(M.RHO_W)} × ${sig(M.G)} × ${sig(r.Vs)} × (${sig(r.COB[2])}) = <b>${sig(t.bh)} GN·m/rad</b></li>
              <li>−m g ${N.comZ} = −${sig(r.totalMass)} × ${sig(M.G)} × (${sig(r.COM[2])}) = <b>${sig(t.gr)} GN·m/rad</b></li>
              <li>S12: ${N.K55} = <b>${sig(t.K)} GN·m/rad</b> ${t.K > 0 ? "&gt; 0: stable" : "≤ 0: unstable"}. Largest positive term: <b>${OPTS[KEY[t.stab]]}</b>.</li></ol>${kFig("hs2ks")}`,
            draw: (box) => renderKChart(r, box.querySelector(".hs2ks")),
          }),
        };
      },
    });
  }

  // -------------------------------------------------------------- HS3
  function buildHS3() {
    const s0 = M.PLATFORMS.semisub.DEFAULTS.s_EC, F0 = M.TURBINE_DEFAULTS.thrust / 1e6;
    const S_ALT = 55, F_ALT = 2.5;                      // cases of the exercise
    Exercise({
      mount: "exHS3", title: "HS3. Static pitch of the semisub", minutes: 10, onComplete: () => unlockTables("pitch"),
      lo: "S-LO4. Slides 15–18, equations S14, S12, S10 and S11.",
      cases: [{ label: "Reference", value: { s: s0, F: F0 } }, { label: `s<sub>EC</sub> = ${S_ALT} m`, value: { s: S_ALT, F: F0 } }, { label: `F<sub>T</sub> = ${F_ALT} MN`, value: { s: s0, F: F_ALT } }],
      random: () => ({ s: 45 + 0.5 * Math.round(Math.random() * 30), F: +(1.5 + 0.1 * Math.round(Math.random() * 10)).toFixed(1) }),
      build: ({ s, F }) => {
        const r = M.solve("semisub", { s_EC: s, thrust: F * 1e6 }), p = r.params, t = k55Terms(r);
        const nC = 3, J14 = (nC / 2) * (Math.PI / 4) * p.d_EC ** 2 * p.s_EC ** 2, Jx = r.hull.J;
        const Mext = r.M_ext / 1e6, Mth = r.M_thrust / 1e6, Mw = r.M_weight / 1e6;
        const xi = deg(r.pitch), xi11 = deg(r.M_thrust / r.K), lim = p.pitchLimitDeg;
        const err = 100 * (J14 / Jx - 1), own = (Jx - J14);
        return {
          task: `Semisubmersible with s<sub>EC</sub> = ${sig(s, 3)} m and F<sub>T</sub> = ${sig(F, 2)} MN (all other inputs at the reference; the ballast mass is fixed, so D, V<sub>s</sub>, m and the CoM follow from the model). Follow slides 16–18: approximate J (S14), build ${N.K55} (S12) and the overturning moment, find the static pitch (S10) and compare it with the allowable value.<br>Assumptions: small angles, thrust horizontal and constant at the hub, rotation about O, ${N.cobX} = 0 for this symmetric hull.`,
          data: dataTable([["thrust F<sub>T</sub>", sig(F), "MN"], ["hub height above O, h<sub>hub</sub>", sig(r.hubHeight), "m"],
            ["total mass m", sig(r.totalMass / 1e3), "t"], [N.comX, sig(r.COM[0]), "m"], [N.comZ, sig(r.COM[2]), "m"],
            [`submerged volume ${N.Vs}`, sig(r.Vs), "m³"], [N.cobZ, sig(r.COB[2]), "m"],
            ["number of external columns N", nC, ""], ["external column diameter d<sub>EC</sub>", sig(p.d_EC), "m"], ["column spacing s<sub>EC</sub>", sig(p.s_EC), "m"],
            ["exact J, for question 2 (all digits)", fmt(Jx, 0), "m⁴"], ["allowable static pitch ξ<sub>5,max</sub>", sig(lim, 3), "°"],
            [N.rw, sig(M.RHO_W), "kg/m³"], ["g", sig(M.G), "m/s²"]]) + PREC,
          questions: [
            { id: "j14", label: "J with S14", unit: "m⁴", type: "num", answer: J14,
              hints: ["S14: J ≈ (N/2)(π/4) d<sub>EC</sub>² s<sub>EC</sub>²."],
              explain: `J ≈ (${nC}/2)(π/4) × ${sig(p.d_EC)}² × ${sig(p.s_EC)}² = ${sig(J14)} m⁴ (exact: ${fmt(Jx, 0)} m⁴).` },
            { id: "K", label: `${N.K55} with the exact J`, unit: "GN·m/rad", type: "num", answer: t.K,
              hints: ["S12, as in HS2: ρ<sub>w</sub> g J + ρ<sub>w</sub> g V<sub>s</sub> CoB<sub>0</sub><sup>Z</sup> − m g CoM<sup>Z</sup>."],
              explain: `${N.K55} = ${sig(t.wp)} + (${sig(t.bh)}) + (${sig(t.gr)}) = ${sig(t.K)} GN·m/rad.` },
            { id: "mext", label: "Overturning moment M<sub>ext</sub>", unit: "MN·m", type: "num", answer: Mext,
              hints: [`F<sub>T</sub> h<sub>hub</sub> + m g ${N.comX} (${N.cobX} = 0).`, `${N.comX} &lt; 0.`],
              explain: `M<sub>ext</sub> = ${sig(F)} × ${sig(r.hubHeight)} + ${sig(r.totalMass / 1e3)}·10³ × ${sig(M.G)} × (${sig(r.COM[0])})·10⁻⁶ = ${sig(Mth)} + (${sig(Mw)}) = ${sig(Mext)} MN·m.` },
            { id: "xi", label: `Static pitch ${N.xi5}`, unit: "deg", type: "num", answer: xi,
              hints: ["S10 gives radians: ξ<sub>5</sub> = M<sub>ext</sub> / K<sub>55</sub>. Multiply by 180/π."],
              explain: `${N.xi5} = M<sub>ext</sub> / ${N.K55} = ${sig(Mext * 1e6)} / ${sig(r.K)} = ${sig(r.pitch)} rad = ${sig(xi)}°.` },
            { id: "ok", type: "choice", label: `Is it below the allowable ξ<sub>5,max</sub> = ${sig(lim, 3)}°?`, options: ["no", "yes"], answer: xi <= lim ? 1 : 0,
              explain: xi <= lim ? `Yes: ${sig(xi, 3)}° ≤ ${sig(lim, 3)}°.` : `No: ${sig(xi, 3)}° &gt; ${sig(lim, 3)}°. A wider column spacing raises J (as s<sub>EC</sub>²) and K<sub>55</sub>.` },
          ],
          after: () => ({
            html: `<b>Moment balance for this case</b> (the crossing is ξ<sub>5</sub> = ${sig(xi, 3)}°):${momentFig("hs3m")}`,
            draw: (box) => drawMoment(box.querySelector(".hs3m svg"), r),
            questions: [
              { id: "err", label: "By how much does S14 underestimate the exact J? (J<sub>S14</sub>/J − 1, do not round J)", unit: "%", type: "num", answer: err,
                explain: `(${fmt(J14, 0)} / ${fmt(Jx, 0)} − 1) × 100 = ${sig(err, 3)} %. S14 keeps only the Steiner terms of the external columns; it neglects the columns' own second moments π d⁴/64 + 3 π d<sub>EC</sub>⁴/64 = ${sig(own)} m⁴.` },
              { id: "s11", label: `Static pitch with S11, i.e. neglecting m g ${N.comX}`, unit: "deg", type: "num", answer: xi11,
                explain: `S11: ${N.xi5} = F<sub>T</sub> h<sub>hub</sub> / ${N.K55} = ${sig(Mth)}·10⁶ / ${sig(r.K)} rad = ${sig(xi11)}°. The overhanging rotor shifts the CoM upwind (${N.comX} = ${sig(r.COM[0])} m), which reduces the pitch by about ${sig(100 * (1 - xi / xi11), 2)} % in this case.` },
            ],
          }),
          solution: () => ({
            html: `<ol><li>S14: J ≈ (N/2)(π/4) d<sub>EC</sub>² s<sub>EC</sub>² = 1.5 × 0.7854 × ${sig(p.d_EC)}² × ${sig(p.s_EC)}² = <b>${sig(J14)} m⁴</b> (exact ${fmt(Jx, 0)} m⁴, ${sig(err, 3)} %)</li>
              <li>S12 with the exact J: ${sig(t.wp)} + (${sig(t.bh)}) + (${sig(t.gr)}) = <b>${sig(t.K)} GN·m/rad</b></li>
              <li>M<sub>ext</sub> = F<sub>T</sub> h<sub>hub</sub> + m g ${N.comX} = ${sig(Mth)} + (${sig(Mw)}) = <b>${sig(Mext)} MN·m</b></li>
              <li>S10: ${N.xi5} = ${sig(Mext)}·10⁶ / ${sig(t.K)}·10⁹ = ${sig(r.pitch)} rad = <b>${sig(xi)}°</b> ${xi <= lim ? "≤" : "&gt;"} ${sig(lim, 3)}° (S11 would give ${sig(xi11)}°)</li></ol>${momentFig("hs3ms")}`,
            draw: (box) => drawMoment(box.querySelector(".hs3ms svg"), r),
          }),
        };
      },
    });
  }

  // -------------------------------------------------------------- HS4
  /** Barge widths of HS4 with the ballast fixed at the reference mass (bisection in model.js). */
  function hs4Targets() {
    const B = M.PLATFORMS.barge.DEFAULTS.ballastMass, W0 = M.PLATFORMS.barge.DEFAULTS.W;
    const at = (W) => M.solve("barge", { W, ballastMass: B });
    const Kof = (W) => { const r = at(W); return r.valid && !r.sinks ? r.K : -1; };
    let lo = W0;                                          // scan down to bracket the sign change of K55
    while (lo > 1 && Kof(lo) > 0) lo -= 0.5;
    const Wk = M.bisect(Kof, lo, W0);
    const xiOf = (W) => { const r = at(W); return r.K > 0 ? deg(r.pitch) : 1e9; };
    const XI = 5;                                         // pitch limit of question 1 (deg)
    const W5 = M.bisect((W) => xiOf(W) - XI, Wk + 1e-6, W0 + 40);
    const Wl = M.bisect((W) => (at(W).capsizes ? 1 : -1), Wk + 1e-6, W0);   // beyond this width: inside the linear model
    return { B, W0, Wk, W5, XI, Wl, r5: at(W5) };
  }
  /** HS4+: the four slider questions of the previous HS4, unchanged, as ungraded homework. */
  function buildHS4plus() {
    const T = hs4Targets();
    const sp0 = M.solve("spar", { ballastMass: 0 }), se0 = M.solve("semisub", { ballastMass: 0 }), se = REF.semisub, sp = REF.spar;
    const t0 = k55Terms(se0), t1 = k55Terms(se);
    Exercise({
      mount: "exHS4p", title: "HS4+. Sensitivity checks (homework)", minutes: "about 10 min, at home", toTop: false,
      lo: "S-LO5. Use the tool as a design tool (homework, not graded in class).",
      cases: [{ label: "Sliders", value: 0 }],
      build: () => ({
        task: `Press <b>Reset</b>, select the platform named in the question, and use the sliders and the summary cards above. For questions 1 and 2 the barge ballast stays at its reference mass (${sig(T.B / 1e3)} t): change only the width W. Below about W = ${sig(T.Wl, 3)} m the barge goes beyond the limit of the linear model (red message): keep going, the cards still show ξ<sub>5</sub> and K<sub>55</sub>. The cards show ξ<sub>5</sub> and K<sub>55</sub> once HS2 and HS3 are answered; if you skipped them, press <button class="btn btn-small btn-ghost" data-unlock="all">Show all results now</button>.`,
        data: PREC,
        questions: [
          { id: "w5", label: `Barge, ballast fixed: smallest width W that keeps ${N.xi5} ≤ ${T.XI}°`, unit: "m", type: "num", answer: T.W5,
            hints: ["Move the width slider down from the reference and watch the Static pitch card. You can also type a value in the box next to the slider."],
            explain: `W = ${sig(T.W5, 3)} m (D = ${sig(T.r5.draft, 3)} m, J = ${sig(T.r5.hull.J, 3)} m⁴). J grows as W⁴, but D falls as 1/W² and the steel mass grows with W.` },
          { id: "wk", label: `Barge, ballast fixed: width W at which ${N.K55} becomes zero`, unit: "m", type: "num", answer: T.Wk,
            hints: ["Keep reducing W and watch the Pitch stiffness card."],
            explain: `W = ${sig(T.Wk, 3)} m. J grows as W⁴, but D falls as 1/W² and the steel mass grows with W: below this width the waterplane term no longer beats the two negative terms.` },
          { id: "spar0", type: "choice", label: "Spar with zero ballast: what happens?",
            options: ["it sinks", `it becomes unstable in pitch, with ${N.K55} &lt; 0`, "it is still stable but pitches more"], answer: 1,
            explain: `Without ballast the spar floats at D = ${sig(sp0.draft, 3)} m (instead of ${sig(sp.draft, 3)} m) with its CoM at ${N.comZ} = ${sig(sp0.COM[2], 3)} m, far above the SWL: the gravity term becomes strongly negative and ${N.K55} = ${sig(sp0.K / 1e9, 3)} GN·m/rad.` },
          { id: "semi0", type: "choice", label: "Semisub with zero ballast: the static pitch …",
            options: ["decreases, because the platform is lighter", "does not change", "increases, although the platform is lighter"], answer: 2,
            explain: `Without ballast the CoM rises from about ${sig(se.COM[2], 2)} m to about ${sig(se0.COM[2], 3)} m above the still water level. The gravity term grows more negative (${sig(t1.gr, 3)} → ${sig(t0.gr, 3)} GN·m/rad) faster than the shallower draft helps (buoyancy height term ${sig(t1.bh, 3)} → ${sig(t0.bh, 3)} GN·m/rad): ${N.xi5} goes from ${sig(deg(se.pitch), 3)}° to ${sig(deg(se0.pitch), 3)}°.` },
        ],
        solution: () => ({ html: `<ol>
          <li>Reset, Barge. Width slider down from ${sig(T.W0, 3)} m: ${N.xi5} reaches ${T.XI}° at <b>W = ${sig(T.W5, 3)} m</b>.</li>
          <li>Keep going: below ${sig(T.Wl, 3)} m the linear-model limit is exceeded; ${N.K55} = 0 at <b>W = ${sig(T.Wk, 3)} m</b>.</li>
          <li>Reset, Spar, ballast to 0: D = ${sig(sp0.draft, 3)} m, ${N.comZ} = ${sig(sp0.COM[2], 3)} m, <b>${N.K55} = ${sig(sp0.K / 1e9, 3)} GN·m/rad</b>: unstable (option 2).</li>
          <li>Reset, Semisub, ballast to 0: ${N.comZ} ${sig(se.COM[2], 3)} → ${sig(se0.COM[2], 3)} m, <b>${N.xi5} ${sig(deg(se.pitch), 3)}° → ${sig(deg(se0.pitch), 3)}°</b>: it increases (option 3).</li></ol>` }),
      }),
    });
  }

  // -------------------------------------------------------------- HS4: rescue the narrow semisub
  // A design problem on the sliders: start from the scenario "narrow" (s_EC = 30 m, unstable)
  // and redesign the semisub, keeping s_EC = 30 m, so that it works with xi_5 <= 8 deg and D >= 18 m.
  const S_EC_FIX = 30, XI_MAX = 8, D_MIN = 18;            // targets of HS4: m, deg, m
  const HS4_PRESET = "narrow";                             // scenario of the Scenario menu used as the start
  /** Load the starting design through the same code path as the Scenario menu. */
  function loadNarrowStart() {
    setPlatform("semisub");
    $("presetSelect").value = HS4_PRESET;
    applyPreset(HS4_PRESET);
  }
  const hs4Start = () => M.solve("semisub", Object.assign({}, M.PLATFORMS.semisub.DEFAULTS, UI.semisub.presets.find((x) => x[0] === HS4_PRESET)[2]));
  /** Q2: smallest d_EC that gives xi_5 <= XI_MAX with the ballast set for D = D_MIN (bisection). */
  function hs4Design() {
    const at = (dEC, D = D_MIN) => {
      const mb = M.ballastForDraft("semisub", { s_EC: S_EC_FIX, d_EC: dEC }, D);
      return M.solve("semisub", { s_EC: S_EC_FIX, d_EC: dEC, ballastMass: mb });
    };
    const f = (dEC) => { const r = at(dEC); return (r.K > 0 ? deg(r.pitch) : 1e9) - XI_MAX; };
    const dMin = M.bisect(f, M.PLATFORMS.semisub.DEFAULTS.d_EC, 30);
    const dApply = Math.ceil(dMin / 0.05 - 1e-9) * 0.05;  // applied by the instructor: rounded UP to 0.05 m
    return { dMin, rMin: at(dMin), dApply, rApply: at(dApply), at };
  }
  /** Q3: ballast-only route (s_EC fixed, d_EC at the reference): K55 = 0 and sinking thresholds. */
  function hs4BallastOnly() {
    const bal = (mb) => M.solve("semisub", { s_EC: S_EC_FIX, ballastMass: mb });
    const B0 = M.PLATFORMS.semisub.DEFAULTS.ballastMass;
    let hi = B0;
    while (hi < 60e6 && !bal(hi).sinks) hi += 500e3;     // scan up to the first sinking design
    const mSink = M.bisect((mb) => (bal(mb).sinks ? 1 : -1), B0, hi);
    const mK = M.bisect((mb) => bal(mb).K, B0, mSink - 1);
    return { bal, B0, mK, rK: bal(mK + 10e3), mSink };
  }
  /** The four checks of HS4 Q1 for a result r (pure: also used by the self-test). */
  function hs4Checks(r) {
    const errors = (r.messages || []).filter((m) => m.level === "error");
    const works = r.valid && !r.sinks && !r.capsizes && errors.length === 0;
    return {
      s: Math.abs(r.params.s_EC - S_EC_FIX) <= 0.05,
      works, firstError: errors.length ? errors[0].text : "",
      xi: works && deg(r.pitch) <= XI_MAX + 0.01,
      D: !r.sinks && isFinite(r.draft) && r.draft >= D_MIN - 0.01,
    };
  }
  const hs4Pass = (c) => c.s && c.works && c.xi && c.D;

  let hs4Ex = null, hs4Last = null, hs4Step = 0;
  function buildHS4() {
    const Z = hs4Design(), Bo = hs4BallastOnly(), ref = REF.semisub;
    const st0 = hs4Start(), t0 = k55Terms(st0), tz = k55Terms(Z.rMin), tr = k55Terms(ref);
    const costLine = (r) => `<b>Cost:</b> steel ${sig(r.steelMass / 1e3, 3)} t and concrete ballast ${sig(r.params.ballastMass / 1e3, 3)} t, against ${sig(ref.steelMass / 1e3, 3)} t and ${sig(ref.params.ballastMass / 1e3, 3)} t for the reference design (s<sub>EC</sub> = ${sig(ref.params.s_EC, 2)} m).`;
    const kPair = (cls) => `<div class="kpair ${cls}"><figure>${kFig("k-start")}<figcaption>starting design (s<sub>EC</sub> = ${S_EC_FIX} m)</figcaption></figure><figure>${kFig("k-mine")}<figcaption>${cls === "kp-sol" ? "solution" : "your design"}</figcaption></figure></div>`;
    const drawPair = (box, r) => { renderKChart(st0, box.querySelector(".k-start"), [r]); renderKChart(r, box.querySelector(".k-mine"), [st0]); };
    const modelAnswer = `The narrow spacing cut J by about ${sig(ref.hull.J / st0.hull.J, 2)} times, so the only positive term, ρ<sub>w</sub> g J, could no longer beat the two negative ones and K<sub>55</sub> became negative. Since J of the external columns grows with d<sub>EC</sub>² s<sub>EC</sub>² and s<sub>EC</sub> was fixed, I widened the external columns (d<sub>EC</sub> ≈ ${sig(Z.dMin, 3)} m). That raised ρ<sub>w</sub> g J from ${sig(t0.wp, 3)} to about ${sig(tz.wp, 2)} GN·m/rad. Wider columns float the platform higher, so I added ballast (Set ballast, D = ${D_MIN} m). The ballast also lowered the CoM, so the gravity term went from ${sig(t0.gr, 3)} to about ${sig(tz.gr, 2)} GN·m/rad, while the deeper draft made the buoyancy-height term more negative (${sig(t0.bh, 3)} → about ${sig(tz.bh, 2)} GN·m/rad). The net K<sub>55</sub> is about ${sig(tz.K, 3)} GN·m/rad, and ξ<sub>5</sub> = ${sig(deg(Z.rMin.pitch), 2)}°. The price is about ${sig((Z.rMin.steelMass - ref.steelMass) / 1e3, 1)} t more steel and about ${sig(Z.rMin.params.ballastMass / 1e3, 3)} t of concrete instead of ${sig(ref.params.ballastMass / 1e3, 2)} t.`;
    const checklist = ["I named J and the waterplane term ρ<sub>w</sub> g J.",
      "I said that J ∝ d<sub>EC</sub>² s<sub>EC</sub>² (S14), so with s<sub>EC</sub> fixed I had to increase d<sub>EC</sub>.",
      `I noted that the extra ballast lowers ${N.comZ} (gravity term less negative) but deepens the draft (buoyancy-height term more negative).`,
      "I checked the sign of each term.",
      "I mentioned the cost: more steel and about three times the concrete."];
    const q3Explain = `J falls from ${fmt(ref.hull.J, 0)} m⁴ (s<sub>EC</sub> = ${sig(ref.params.s_EC, 2)} m) to ${fmt(st0.hull.J, 0)} m⁴ (s<sub>EC</sub> = ${S_EC_FIX} m), so ρ<sub>w</sub> g J drops to ${sig(t0.wp, 3)} GN·m/rad and no amount of ballast brings it back. With ballast alone, K<sub>55</sub> becomes positive only above about ${sig(Bo.mK / 1e3, 2)} t; by then D = ${sig(Bo.rK.draft, 3)} m, the freeboard is only ${sig(Bo.rK.freeboard, 2)} m and ξ<sub>5</sub> is far beyond the linear-model limit. Above about ${sig(Bo.mSink / 1e3, 3)} t the platform sinks. The ballast fits in the columns all the way.`;

    // instructor walkthrough on the sliders (Apply step): 1, 2a, 2b, 3, 4
    const STEPS = [
      { lbl: "1", run: () => { loadNarrowStart(); return { html: `<b>Step 1. Narrow start</b> (scenario "${UI.semisub.presets.find((x) => x[0] === HS4_PRESET)[1]}"): s<sub>EC</sub> = ${S_EC_FIX} m, D = ${sig(st0.draft, 3)} m, ρ<sub>w</sub> g J = ${sig(t0.wp, 3)}, buoyancy height ${sig(t0.bh, 3)}, gravity ${sig(t0.gr, 3)} → <b>K<sub>55</sub> = ${sig(t0.K, 3)} GN·m/rad &lt; 0</b>: unstable.${kFig("hs4-s1")}`, draw: (b) => renderKChart(st0, b.querySelector(".hs4-s1")) }; } },
      { lbl: "2a", run: () => { const mb = 9000e3, r = Bo.bal(mb); setSemisub({ ballastMass: mb }); return { html: `<b>Step 2a. Ballast only: ${sig(mb / 1e3, 2)} t.</b> K<sub>55</sub> = ${sig(r.K / 1e9, 2)} GN·m/rad, just positive, but D = ${sig(r.draft, 3)} m, FB = ${sig(r.freeboard, 2)} m and ξ<sub>5</sub> = ${sig(deg(r.pitch), 2)}°: far beyond the linear-model limit (${sig(deg(r.critPos), 3)}°).` }; } },
      { lbl: "2b", run: () => { const mb = 12500e3; setSemisub({ ballastMass: mb }); return { html: `<b>Step 2b. Ballast only: ${sig(mb / 1e3, 3)} t.</b> The platform sinks (above about ${sig(Bo.mSink / 1e3, 3)} t). <b>Ballast alone fails</b>: it never restores the waterplane term that the narrow spacing removed.` }; } },
      { lbl: "3", run: () => { applyHS4Solution(); if (hs4Ex && !hs4Ex.qs.design.done) hs4Ex.qs.design.solve(); else if (hs4Ex) hs4Ex.qs.design.check(); return { html: `<b>Step 3. The working route.</b> Narrow start again, then d<sub>EC</sub> = ${sig(Z.dApply, 4)} m (the smallest value ${sig(Z.dMin, 4)} m rounded up), then Set ballast for D = ${D_MIN} m (${sig(Z.rApply.params.ballastMass / 1e3, 3)} t): all four checks ✓ (Q1 on the right).` }; } },
      { lbl: "4", run: () => { if (hs4Ex) hs4Ex.showSolution(); return { html: `<b>Step 4. Before and after.</b>${kPair("kp-step")}<p>${costLine(Z.rApply)}</p><p>The answers to Q2–Q4 are in the worked solution below.</p>`, draw: (b) => drawPair(b, Z.rApply) }; } },
    ];
    function applyHS4Solution() {
      loadNarrowStart();
      setSemisub({ d_EC: Z.dApply });
      $("targetDraft").value = D_MIN;
      $("ballastForDraftBtn").click();                    // the real Set ballast button
    }

    hs4Ex = Exercise({
      mount: "exHS4", title: "HS4. Rescue the narrow semisub", minutes: 12, toTop: false,
      lo: "S-LO5 with S-LO3. Slide 14; equations S12, S14.",
      cases: [{ label: "Design", value: 0 }],
      build: () => {
        hs4Step = 0;
        return {
          task: `<button class="btn btn-small" data-a="load-narrow">Load the starting design</button><br>
            The yard can only build this semisub with a column spacing s<sub>EC</sub> = ${S_EC_FIX} m. Keep s<sub>EC</sub> = ${S_EC_FIX} m and redesign the platform so that:
            <br>1. it is stable and works (no red message);
            <br>2. the static pitch under maximum thrust is ξ<sub>5</sub> ≤ ${XI_MAX}°;
            <br>3. the draft is D ≥ ${D_MIN} m, so that the pontoons stay deep below the wave-affected layer.
            <br>You may change any other slider, and you may use <b>Set ballast</b> (Design objectives, target draft). Watch the K<sub>55</sub> terms: which one did the narrow spacing remove?
            <br><span class="hint">The cards show D, ξ<sub>5</sub> and K<sub>55</sub> only after HS1–HS3; if you skipped them, press <button class="btn btn-small btn-ghost" data-unlock="all">Show all results now</button>.</span>`,
          data: `<p class="hint"><b>Starting design</b> (scenario "${UI.semisub.presets.find((x) => x[0] === HS4_PRESET)[1]}", computed by the model):</p>` +
            dataTable([["s<sub>EC</sub>", sig(st0.params.s_EC), "m"], ["D", sig(st0.draft), "m"], ["J", sig(st0.hull.J), "m⁴"],
              [`${N.rw} g J`, sig(t0.wp), "GN·m/rad"], [`${N.rw} g ${N.Vs} ${N.cobZ}`, sig(t0.bh), "GN·m/rad"], [`−m g ${N.comZ}`, sig(t0.gr), "GN·m/rad"],
              [N.K55, sig(t0.K), "GN·m/rad"]]) + PREC +
            (INSTRUCTOR ? `<p><button class="btn btn-small" data-a="hs4step">Apply step 1</button> <span class="hint">walks through the solution on the sliders</span></p><div id="hs4steps"></div>` : ""),
          questions: [
            { id: "design", type: "design", label: "Check my design (reads the current sliders of the semisub; no attempt limit)",
              evaluate: () => {
                if (state.type !== "semisub") return { pass: false, html: `<div class="ln no"><b>✗</b> Switch the platform to <b>Semisub</b> first (top bar).</div>` };
                const r = M.solve("semisub", P()), c = hs4Checks(r);
                hs4Last = r;
                const ln = (ok, t) => `<div class="ln ${ok ? "ok" : "no"}"><b>${ok ? "✓" : "✗"}</b> ${t}</div>`;
                const xiTxt = !c.works ? "no valid design" : unlocked.pitch ? `${fmt(deg(r.pitch), 2)}°` : "hidden (after HS3)";
                const dTxt = r.sinks ? "sunk" : unlocked.heave ? `${fmt(r.draft, 2)} m` : "hidden (after HS1)";
                return {
                  pass: hs4Pass(c),
                  html: ln(c.s, `s<sub>EC</sub> = ${fmt(r.params.s_EC, 2)} m (must stay ${S_EC_FIX} m)`) +
                    ln(c.works, c.works ? "the design works (no red message)" : `the design does not work: ${esc(c.firstError || "invalid design")}`) +
                    ln(c.xi, `ξ<sub>5</sub> ≤ ${XI_MAX}°: ${xiTxt}`) +
                    ln(c.D, `D ≥ ${D_MIN} m: ${dTxt}`),
                };
              },
              applySolution: applyHS4Solution,
              explain: () => `<b>Your design works.</b> K<sub>55</sub> terms of the starting design and of yours, on the same scale:${kPair("kp-mine")}<p>${costLine(hs4Last || Z.rApply)}</p>`,
              draw: (div) => drawPair(div, hs4Last || Z.rApply) },
            { id: "dmin", type: "num", label: `With s<sub>EC</sub> = ${S_EC_FIX} m and the ballast set for D = ${D_MIN} m exactly (Set ballast), what is the smallest d<sub>EC</sub> that gives ξ<sub>5</sub> ≤ ${XI_MAX}°?`, unit: "m", answer: Z.dMin,
              hints: [`Fix D = ${D_MIN} m with Set ballast after every change of d<sub>EC</sub>. The slider moves in 0.5 m steps: type finer values in the box next to it.`, "J of the external columns grows as d<sub>EC</sub>² (S14)."],
              explain: `d<sub>EC</sub> = ${sig(Z.dMin, 3)} m, with ${sig(Z.rMin.params.ballastMass / 1e3, 3)} t of concrete. The three terms: ρ<sub>w</sub> g J = ${sig(tz.wp, 3)}, buoyancy height ${sig(tz.bh, 3)}, gravity ${sig(tz.gr, 3)} → K<sub>55</sub> = ${sig(tz.K, 3)} GN·m/rad. J = ${fmt(Z.rMin.hull.J, 0)} m⁴, against ${fmt(ref.hull.J, 0)} m⁴ for the reference design.` },
            { id: "ballast", type: "choice", label: `You cannot fix the narrow semisub with concrete ballast alone (s<sub>EC</sub> = ${S_EC_FIX} m, d<sub>EC</sub> = ${sig(st0.params.d_EC, 2)} m). Why?`,
              options: ["The ballast does not fit in the external columns.",
                "More ballast lowers the CoM, but it also deepens the draft, which makes the buoyancy-height term more negative. It never restores the waterplane term that the narrow spacing removed.",
                "Ballast raises the CoM."], answer: 1, explain: q3Explain },
            { id: "open", type: "open", label: "In three or four sentences, explain how you restored stability and why it worked. Name the terms of S12 that changed and their sign. (Not graded.)",
              explain: `<b>Model answer.</b> ${modelAnswer}<div class="selfcheck"><b>Self-assessment</b> (tick what your answer contains; nothing is stored):${checklist.map((t) => `<label><input type="checkbox"> ${t}</label>`).join("")}</div>` },
          ],
          solution: () => ({
            html: `<ol><li>Narrow start: K<sub>55</sub> = ${sig(t0.K, 3)} GN·m/rad &lt; 0 (ρ<sub>w</sub> g J only ${sig(t0.wp, 3)}).</li>
              <li>Ballast alone: K<sub>55</sub> &gt; 0 only above ${sig(Bo.mK / 1e3, 2)} t, then beyond the linear-model limit; it sinks above ${sig(Bo.mSink / 1e3, 3)} t (Q3: option 2).</li>
              <li>Working route: d<sub>EC</sub> = ${sig(Z.dApply, 4)} m + Set ballast (D = ${D_MIN} m) → K<sub>55</sub> = ${sig(Z.rApply.K / 1e9, 3)} GN·m/rad, ξ<sub>5</sub> = ${sig(deg(Z.rApply.pitch), 3)}°. Q2: smallest d<sub>EC</sub> = <b>${sig(Z.dMin, 3)} m</b>.</li></ol>
              ${kPair("kp-sol")}<p>${costLine(Z.rApply)}</p><p><b>Q4, model answer.</b> ${modelAnswer}</p>`,
            draw: (box) => drawPair(box, Z.rApply),
          }),
        };
      },
    });
    hs4Ex.steps = STEPS;
    hs4Ex.applySolution = applyHS4Solution;
    hs4Ex.Z = Z; hs4Ex.Bo = Bo; hs4Ex.start = st0;
  }
  /** Set semisub slider values (SI) and redraw, as if typed in the boxes. */
  function setSemisub(vals) {
    if (state.type !== "semisub") setPlatform("semisub");
    Object.assign(state.plat.semisub, vals);
    syncInputs();
    update();
  }
  // buttons inside HS4 (rebuilt with the exercise): one delegated listener
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-a="load-narrow"]')) { loadNarrowStart(); return; }
    const sb = e.target.closest('[data-a="hs4step"]');
    if (sb && hs4Ex) {
      const s = hs4Ex.steps[hs4Step % hs4Ex.steps.length];
      const out = s.run();
      const box = $("hs4steps");
      box.innerHTML = `<div class="solution">${out.html}</div>`;
      if (out.draw) out.draw(box);
      hs4Step = (hs4Step + 1) % hs4Ex.steps.length;
      sb.textContent = `Apply step ${hs4Ex.steps[hs4Step].lbl}`;
    }
  });

  // ======================================================================
  //  SELF-TEST: index.html?selftest (also ?selftest&instructor).
  //  Replaces tools/check_exercises.mjs (no Node needed): it checks the reference
  //  results and the expected exercise answers against the values of the course
  //  material, then drives every exercise as a student would.
  // ======================================================================
  function runSelfTest() {
    const rows = [];
    const add = (group, name, pass, detail) => rows.push({ group, name, pass, detail });
    // expected values written as in the course material; tolerance 0.5 % or half a unit of the last digit given
    const near = (v, e) => { const d = (e.split(".")[1] || "").length; return Math.abs(v - +e) <= Math.max(0.005 * Math.abs(+e), 0.5 * Math.pow(10, -d)) + 1e-12; };
    const val = (group, name, v, e) => add(group, name, near(v, e), `${sig(v, 5)} (expected ${e})`);
    const spec = (mount, caseVal) => exercises.find((x) => x.cfg.mount === mount).cfg.build(caseVal);
    const q = (s, id) => (s.questions.find((x) => x.id === id) || (s.after ? (s.after().questions || []).find((x) => x.id === id) : null) || {}).answer;
    const OPTS = ["gravity term", "waterplane term", "buoyancy height term"];

    [["semisub", "5.68", "2.611", "18"], ["spar", "4.82", "3.074", "104"], ["barge", "3.89", "3.813", "7"]].forEach(([k, xi, K, D]) => {
      const r = M.solve(k, {});
      val("Reference results", `${k}: ξ5 (deg)`, deg(r.pitch), xi); val("Reference results", `${k}: K55 (GN·m/rad)`, r.K / 1e9, K); val("Reference results", `${k}: D (m)`, r.draft, D);
    });
    let s = spec("exHS1", "spar");
    val("HS1 spar", "m (t)", q(s, "m"), "21433"); val("HS1 spar", "Vs (m³)", q(s, "vs"), "20910"); val("HS1 spar", "D (m)", q(s, "d"), "104.0");
    val("HS1 spar", "K33 (MN/m)", q(s, "k33"), "2.021"); val("HS1 spar", "ΔD (m)", q(s, "dd"), "0.485");
    s = spec("exHS1", "barge");
    val("HS1 barge", "K33 (MN/m)", q(s, "k33"), "27.18"); val("HS1 barge", "ΔD (m)", q(s, "dd"), "0.036");
    s = spec("exHS2", "barge");
    val("HS2 barge", "J (m⁴)", q(s, "J"), "609300"); val("HS2 barge", "ρw g J", q(s, "wp"), "6.125"); val("HS2 barge", "ρw g Vs CoB0Z", q(s, "bh"), "-0.666");
    val("HS2 barge", "−m g CoMZ", q(s, "gr"), "-1.645"); val("HS2 barge", "K55", q(s, "K"), "3.813");
    add("HS2 barge", "stabilising term", OPTS[q(s, "stab")] === "waterplane term", OPTS[q(s, "stab")]);
    s = spec("exHS2", "spar");
    val("HS2 spar", "ρw g J", q(s, "wp"), "0.032"); val("HS2 spar", "buoyancy height term", q(s, "bh"), "-10.93");
    val("HS2 spar", "gravity term", q(s, "gr"), "13.97"); val("HS2 spar", "K55", q(s, "K"), "3.074");
    add("HS2 spar", "stabilising term", OPTS[q(s, "stab")] === "gravity term", OPTS[q(s, "stab")]);
    const c3 = exercises.find((x) => x.cfg.mount === "exHS3").cfg.cases;
    s = spec("exHS3", c3[0].value);
    val("HS3 reference", "J (S14) (m⁴)", q(s, "j14"), "497700"); val("HS3 reference", "exact J (m⁴)", M.solve("semisub", {}).hull.J, "502970");
    val("HS3 reference", "K55", q(s, "K"), "2.611"); val("HS3 reference", "M_ext (MN·m)", q(s, "mext"), "258.8"); val("HS3 reference", "ξ5 (deg)", q(s, "xi"), "5.68");
    val("HS3 reference", "S14 error (%)", q(s, "err"), "-1.0"); val("HS3 reference", "ξ5 with S11 (deg)", q(s, "s11"), "6.58");
    s = spec("exHS3", c3[1].value);
    val("HS3 s_EC = 55 m", "ξ5 (deg)", q(s, "xi"), "4.04"); val("HS3 s_EC = 55 m", "K55", q(s, "K"), "3.664");
    const T = hs4Targets();
    val("HS4+", "barge W for ξ5 = 5° (m)", T.W5, "50.0"); val("HS4+", "barge W for K55 = 0 (m)", T.Wk, "40.0");
    val("HS4+", "spar, zero ballast: K55", M.solve("spar", { ballastMass: 0 }).K / 1e9, "-5.82");
    const s0 = M.solve("semisub", { ballastMass: 0 });
    val("HS4+", "semisub, zero ballast: ξ5 (deg)", deg(s0.pitch), "7.30"); val("HS4+", "semisub, zero ballast: CoMZ (m)", s0.COM[2], "18.5");
    // HS4: rescue the narrow semisub
    const Z = hs4Ex.Z, Bo = hs4Ex.Bo, st0 = hs4Ex.start;
    add("HS4", "narrow start: K55 < 0 and D ≈ 16.8 m", st0.K < 0 && near(st0.draft, "16.8"), `K55 = ${sig(st0.K / 1e9, 4)} GN·m/rad, D = ${sig(st0.draft, 4)} m`);
    add("HS4", "Q2: smallest d_EC ≈ 18.6 m (±0.1)", Math.abs(Z.dMin - 18.6) <= 0.1, `${sig(Z.dMin, 5)} m`);
    add("HS4", "at the Q2 design: ξ5 ≈ 8.0° (±1 %)", Math.abs(deg(Z.rMin.pitch) / 8.0 - 1) <= 0.01, `${sig(deg(Z.rMin.pitch), 5)}°`);
    add("HS4", "at the Q2 design: K55 ≈ 1.85 GN·m/rad (±1 %)", Math.abs(Z.rMin.K / 1e9 / 1.85 - 1) <= 0.01, `${sig(Z.rMin.K / 1e9, 5)} GN·m/rad`);
    { let found = 0; for (let mb = 0; mb <= 12300e3 + 1; mb += 100e3) if (hs4Pass(hs4Checks(Bo.bal(mb)))) found++;
      add("HS4", "ballast only (0–12 300 t, 100 t steps): no design meets the targets", found === 0, `${found} designs pass`); }
    add("HS4", "checker accepts the Q2 design (exact and rounded up)", hs4Pass(hs4Checks(Z.rMin)) && hs4Pass(hs4Checks(Z.rApply)), `d_EC = ${sig(Z.dMin, 4)} and ${sig(Z.dApply, 4)} m`);
    add("HS4", "checker rejects the narrow start", !hs4Pass(hs4Checks(st0)), "");
    add("HS4", "checker rejects the reference design (s_EC ≠ 30 m)", !hs4Pass(hs4Checks(REF.semisub)) && !hs4Checks(REF.semisub).s, "");
    add("HS4", "checker rejects a design with D = 17 m", !hs4Pass(hs4Checks(Z.at(Z.dApply, 17))) && !hs4Checks(Z.at(Z.dApply, 17)).D, "");
    { const h = hs4Ex.spec.questions[0].evaluate().html;
      add("HS4", "Q1 hides D and ξ5 before HS1 and HS3", h.includes("hidden (after HS1)") && (h.includes("hidden (after HS3)") || h.includes("no valid design")), ""); }

    // tables that give away the answers are hidden before HS1 and HS2 are answered
    add("Hidden tables", "Heave tab: draft table and total mass hidden at the start", $("heaveTable").hidden && !$("lock-heave").hidden && !/Total mass m, CoM/.test($("massTable").textContent), "");
    add("Hidden tables", "Pitch stiffness tab: K55 chart and table hidden at the start", $("res-k55").hidden && !$("lock-k55").hidden, "");
    add("Hidden tables", "Static pitch tab: chart and tables hidden at the start", $("res-pitch").hidden && !$("lock-pitch").hidden, "");
    add("Hidden tables", "Dashboard: m, D, J, GM, K55 and ξ5 cards hidden at the start", $("cards").querySelectorAll(".locked-card").length === 6, $("cards").querySelectorAll(".locked-card").length + " hidden cards");
    add("Hidden tables", "OK message without draft and pitch at the start", !/draft \d/.test($("messages").textContent) && !/ξ₅ = /.test($("messages").textContent), "");
    // drive every exercise and every fixed case through the user interface
    exercises.forEach((ex) => {
      const name = ex.cfg.title.replace(/<[^>]+>/g, "");
      ex.cfg.cases.forEach((c, ci) => {
        const caseName = `${name} [${c.label.replace(/<[^>]+>/g, "")}]`;
        const typeIn = (st, text) => {
          const d = $(ex.cfg.mount).querySelector(`.q[data-q="${st.q.id}"]`);
          if (st.q.type === "design") { if (text === "solution") st.q.applySolution(); else loadNarrowStart(); }
          else st.setVal(text);
          d.querySelector('[data-a="check"]').click();
          return d.querySelector(".res").className;
        };
        // 1. the expected answer (3 significant digits) is accepted, also in the follow-up block
        ex.caseIdx = ci; ex.value = c.value; ex.render();
        let okAll = true, bad = [];
        for (let pass = 0; pass < 2; pass++) Object.values(ex.qs).forEach((st) => {
          if (st.done) return;
          const t = st.q.type === "design" ? "solution" : st.q.type === "open" ? "my answer" : st.q.type === "choice" ? String(st.q.answer) : st.q.type === "multi" ? st.q.answer.join(",") : String(+st.q.answer.toPrecision(3));
          if (!/\bok\b/.test(typeIn(st, t))) { okAll = false; bad.push(st.q.id); }
        });
        add("Exercises in the page", `${caseName}: expected answers accepted`, okAll && ex.isDone(), bad.join(", ") || `${Object.keys(ex.qs).length} questions`);
        // 2. a value 5 % off (or another option) is rejected
        const after = ex.spec.after ? ex.spec.after().questions || [] : [];
        ex.render();
        let rejAll = true; bad = [];
        Object.values(ex.qs).forEach((st) => {
          if (st.q.type === "open") return;                // not graded: nothing to reject
          if (st.q.type === "design") { if (!typeIn(st, "narrow start").includes("bad")) { rejAll = false; bad.push(st.q.id); } return; }
          const wrong = st.q.type === "choice" ? String((st.q.answer + 1) % st.q.options.length) : st.q.type === "multi" ? st.q.answer.slice(0, -1).join(",") : String(st.q.answer * 1.05);
          if (!/\bbad\b/.test(typeIn(st, wrong))) { rejAll = false; bad.push(st.q.id); }
        });
        after.forEach((aq) => {
          const wrong = aq.type === "choice" ? (aq.answer + 1) % aq.options.length : aq.answer * 1.05;
          if (accepts(aq, String(wrong)) || !accepts(aq, String(aq.answer))) { rejAll = false; bad.push(aq.id); }
        });
        add("Exercises in the page", `${caseName}: a value 5 % off is rejected`, rejAll, bad.join(", ") || "all rejected");
      });
      ex.caseIdx = 0; ex.value = ex.cfg.cases[0].value; ex.render();
    });
    $("presetSelect").value = ""; setPlatform("semisub"); applyPreset("reference");   // leave the reference design on the sliders
    add("Hidden tables", "all shown once HS1, HS2 and HS3 are answered", !$("heaveTable").hidden && !$("res-k55").hidden && !$("res-pitch").hidden && $("cards").querySelectorAll(".locked-card").length === 0 && /draft \d/.test($("messages").textContent), "");
    add("Input", "HS0 question 2: only heave + roll + pitch is accepted", accepts({ type: "multi", answer: [2, 3, 4] }, "4,2,3") && !accepts({ type: "multi", answer: [2, 3, 4] }, "2,3,4,5") && !accepts({ type: "multi", answer: [2, 3, 4] }, "3,4"), "");
    // decimal comma and thousands separators
    add("Input", "\"0,036\", \"609,300\" and \"6,13\" are read correctly",
      accepts({ answer: 0.0361 }, "0,036") && accepts({ answer: 609301 }, "609,300") && accepts({ answer: 6.125 }, "6,13"), "");
    // instructor mode
    const nSol = document.querySelectorAll('[data-a="sol"]').length;
    add("Instructor mode", INSTRUCTOR ? "a Show solution button in every exercise" : "no Show solution button without the flag",
      INSTRUCTOR ? nSol === exercises.length : nSol === 0, `${nSol} buttons`);
    if (INSTRUCTOR) {
      exercises.forEach((ex) => {
        ex.showSolution();
        add("Instructor mode", `${ex.cfg.title.replace(/<[^>]+>/g, "")}: all solved, worked solution shown`, ex.isDone() && !!$(ex.cfg.mount).querySelector(".solution"), "");
        ex.render();
      });
    }
    // old notation anywhere in the page text (all tabs, also the hidden ones)
    const txt = document.body.textContent;
    // written with escapes, so that a text search of this file for the old symbols finds nothing
    [String.fromCharCode(0x3b8), "C" + String.fromCharCode(0x2083, 0x2083), "C" + "33", "Caps" + "ize angle", "caps" + "ize angle"].forEach((w) => add("Notation", `no "${w}" in the page`, !txt.includes(w), ""));

    const nFail = rows.filter((r) => !r.pass).length;
    const box = document.createElement("div");
    box.className = "selftest";
    box.innerHTML = `<h3>Self-test: ${rows.length - nFail} of ${rows.length} checks passed${nFail ? `, <span style="color:var(--err)">${nFail} failed</span>` : ""}${INSTRUCTOR ? " (instructor mode)" : ""}</h3>
      <table class="small-table"><tr><th>group</th><th>check</th><th>result</th><th>detail</th></tr>${rows.map((r) => `<tr><td>${r.group}</td><td>${r.name}</td><td class="${r.pass ? "pass" : "fail"}">${r.pass ? "PASS" : "FAIL"}</td><td>${r.detail}</td></tr>`).join("")}</table>`;
    $("output").insertBefore(box, $("output").firstChild);
    (nFail ? console.error : console.log)(`Hydrostatics Lab self-test: ${rows.length - nFail}/${rows.length} passed`);
    window.SELFTEST = rows;
  }

  // ------------------------------------------------------------------------
  //  Tabs (as in the Hydrodynamics Lab). The slider panel stays visible in every tab.
  //  index.html#heave opens the Heave tab directly (handy for slides).
  // ------------------------------------------------------------------------
  const TABS = Array.from(document.querySelectorAll("#tabs button")).map((b) => b.dataset.tab);
  function showTab(t, keepScroll) {
    if (!TABS.includes(t)) t = "dashboard";
    state.tab = t;
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
    document.querySelectorAll(".tabpane").forEach((p) => p.classList.toggle("active", p.id === "pane-" + t));
    try { history.replaceState(null, "", location.pathname + location.search + "#" + t); } catch (e) { /* file:// in some browsers */ }
    fitDash();
    schedule();                      // charts in a pane that was hidden have to be redrawn at their real size
    if (!keepScroll) window.scrollTo(0, 0);
  }
  document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (TABS.includes(t) && t !== state.tab) showTab(t); });

  // --------------------------- start ---------------------------
  setupFullScreen();
  // instructor mode (worked solutions in the exercises): index.html?instructor or index.html#instructor.
  // Read it before the tab code rewrites the address.
  const INSTRUCTOR = /(^|[?&#])instructor\b/.test(location.search + location.hash);
  state.tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "dashboard";
  showTab(state.tab, true);
  setPlatform("semisub");
  drawConvSketch();
  buildHS0(); buildHS1(); buildHS2(); buildHS3(); buildHS4(); buildHS4plus();
  if (/(^|[?&])selftest\b/.test(location.search)) runSelfTest();
})();
