/* ==========================================================================
 *  app.js  -  user interface and figures of the Floating Wind Hydrostatics Lab
 * ==========================================================================
 *  - the header switch selects the platform: semisubmersible, spar or barge
 *  - the sliders are built from the tables below (UI[type].groups + TURBINE_GROUP)
 *  - every time a slider moves: params -> HydroModel.solve(type, params) -> redraw
 *  - figures are plain SVG drawn by hand (no external library, works offline)
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
  //  Turbine sliders (shared by all platforms). f = factor: displayed value * f = SI value
  // ------------------------------------------------------------------------
  const TURBINE_GROUP = {
    group: "Turbine and load", scope: "turbine", items: [
      { key: "thrust", label: "Maximum rotor thrust", sym: "F_T", unit: "MN", min: 0, max: 5, step: 0.05, f: 1e6, dec: 2 },
      { key: "turbineMass", label: "Turbine mass (RNA + tower)", sym: "M_t", unit: "t", min: 1000, max: 4000, step: 50, f: 1e3, dec: 0 },
      { key: "hubHeightRel", label: "Hub height above tower base", sym: "", unit: "m", min: 80, max: 220, step: 1, f: 1, dec: 0 },
      { key: "turbineCOMzRel", label: "Turbine COM above tower base", sym: "", unit: "m", min: 30, max: 150, step: 1, f: 1, dec: 0 },
      { key: "minTipClearance", label: "Minimum blade tip clearance", sym: "", unit: "m", min: 0, max: 60, step: 1, f: 1, dec: 0 },
      { key: "pitchLimitDeg", label: "Allowable static pitch", sym: "θ_max", unit: "°", min: 2, max: 20, step: 0.5, f: 1, dec: 1 },
    ],
  };

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
            { key: "d", label: "Central column diameter", sym: "d", unit: "m", min: 6, max: 20, step: 0.5, f: 1, dec: 1 },
            { key: "d_EC", label: "External column diameter", sym: "d_EC", unit: "m", min: 6, max: 20, step: 0.5, f: 1, dec: 1 },
            { key: "s_EC", label: "Column spacing (centre to centre)", sym: "s_EC", unit: "m", min: 25, max: 80, step: 0.5, f: 1, dec: 1 },
            { key: "H_col", label: "Column height (keel to top)", sym: "H_col", unit: "m", min: 15, max: 60, step: 0.5, f: 1, dec: 1 },
            { key: "H_P", label: "Pontoon height", sym: "H_P", unit: "m", min: 2, max: 12, step: 0.5, f: 1, dec: 1 },
            { key: "W_P", label: "Pontoon width", sym: "W_P", unit: "m", min: 3, max: 16, step: 0.5, f: 1, dec: 1 },
          ],
        },
        {
          group: "Masses and ballast", items: [
            { key: "ballastMass", label: "Concrete ballast (total, 3 columns)", sym: "M_b", unit: "t", min: 0, max: 16000, step: 10, f: 1e3, dec: 1 },
            { key: "rho_b", label: "Concrete ballast density", sym: "ρ_b", unit: "kg/m³", min: 1000, max: 8000, step: 50, f: 1, dec: 0 },
            { key: "waterFill", label: "Pontoon water-ballast filling", sym: "", unit: "%", min: 0, max: 100, step: 5, f: 0.01, dec: 0 },
            { key: "steelMass", label: "Platform steel mass", sym: "M_s", unit: "t", min: 1000, max: 9000, step: 50, f: 1e3, dec: 0, toggle: "autoSteel" },
          ],
        },
      ],
      presets: [
        ["noBallast", "No concrete ballast", { ballastMass: 0 }],
        ["sink", "Over-ballasted (sinks)", { ballastMass: 12500e3 }],
        ["narrow", "Narrow column spacing (unstable)", { s_EC: 30 }],
        ["capsize", "Smaller spacing + higher thrust (capsizes)", { s_EC: 40, thrust: 3e6 }],
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
        <p><b>Submerged volume</b> (D ≥ H<sub>P</sub>): V<sub>s</sub>(D) = A<sub>wp</sub>·D + 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub> &nbsp;⇒&nbsp; D = (M<sub>tot</sub>/ρ<sub>w</sub> − 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub>) / A<sub>wp</sub></p>
        <p><b>Masses:</b> M<sub>tot</sub> = M<sub>turbine</sub> + M<sub>steel</sub> + M<sub>water ballast</sub> + M<sub>concrete</sub>, with M<sub>water ballast</sub> = ρ<sub>w</sub>·3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub> (full pontoons).</p>
        <p><b>Freeboard and tower base:</b> FB = H<sub>col</sub> − D; the tower stands on the central column, at z = FB.</p>
        <p><b>Concrete ballast height</b> (3 external columns): h<sub>b</sub> = M<sub>concrete</sub> / (3 ρ<sub>b</sub> π d<sub>EC</sub>²/4) ≤ H<sub>col</sub>.</p>
        <p><b>CoB (upright):</b> z<sub>CoB</sub> = [A<sub>wp</sub> D (−D/2) + 3 L<sub>P</sub> W<sub>P</sub> H<sub>P</sub> (−D + H<sub>P</sub>/2)] / V<sub>s</sub></p>
        <p><b>Waterplane inertia:</b> J = 1.5 s<sub>EC</sub>² π d<sub>EC</sub>²/4 + π d⁴/64 + 3 π d<sub>EC</sub>⁴/64</p>`,
    },

    // ======================= SPAR =======================
    spar: {
      groups: [
        {
          group: "Platform geometry", items: [
            { key: "d", label: "Spar diameter", sym: "d", unit: "m", min: 6, max: 30, step: 0.5, f: 1, dec: 1 },
            { key: "L_spar", label: "Spar length (keel to top)", sym: "L", unit: "m", min: 30, max: 180, step: 0.5, f: 1, dec: 1 },
          ],
        },
        {
          group: "Masses and ballast", items: [
            { key: "ballastMass", label: "Solid ballast (bottom of the spar)", sym: "M_b", unit: "t", min: 0, max: 40000, step: 10, f: 1e3, dec: 1 },
            { key: "rho_b", label: "Ballast density (iron ore 5000)", sym: "ρ_b", unit: "kg/m³", min: 1000, max: 8000, step: 50, f: 1, dec: 0 },
            { key: "steelMass", label: "Platform steel mass", sym: "M_s", unit: "t", min: 1000, max: 10000, step: 50, f: 1e3, dec: 0, toggle: "autoSteel" },
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
        <p><b>Submerged volume:</b> V<sub>s</sub>(D) = π d²/4 · D &nbsp;⇒&nbsp; D = M<sub>tot</sub> / (ρ<sub>w</sub> π d²/4)</p>
        <p><b>Masses:</b> M<sub>tot</sub> = M<sub>turbine</sub> + M<sub>steel</sub> + M<sub>ballast</sub>.</p>
        <p><b>Freeboard and tower base:</b> FB = L − D; the tower stands on top of the spar, at z = FB.</p>
        <p><b>Ballast height:</b> h<sub>b</sub> = M<sub>ballast</sub> / (ρ<sub>b</sub> π d²/4) ≤ L. Steel COM at mid-length: z = (−D + FB)/2.</p>
        <p><b>CoB (upright):</b> z<sub>CoB</sub> = −D/2. <b>Waterplane inertia:</b> J = π d⁴/64 (very small: the spar is stable because its CoM is below its CoB).</p>`,
    },

    // ======================= BARGE =======================
    barge: {
      groups: [
        {
          group: "Platform geometry", items: [
            { key: "W", label: "Barge width (square)", sym: "W", unit: "m", min: 20, max: 90, step: 0.5, f: 1, dec: 1 },
            { key: "H_hull", label: "Hull height (keel to deck)", sym: "H", unit: "m", min: 5, max: 25, step: 0.5, f: 1, dec: 1 },
            { key: "H_ped", label: "Pedestal height (deck to tower base)", sym: "", unit: "m", min: 0, max: 25, step: 0.5, f: 1, dec: 1 },
          ],
        },
        {
          group: "Masses and ballast", items: [
            { key: "ballastMass", label: "Ballast (bottom of the hull)", sym: "M_b", unit: "t", min: 0, max: 40000, step: 10, f: 1e3, dec: 1 },
            { key: "rho_b", label: "Ballast density (sea water 1025)", sym: "ρ_b", unit: "kg/m³", min: 1000, max: 8000, step: 25, f: 1, dec: 0 },
            { key: "steelMass", label: "Platform steel mass", sym: "M_s", unit: "t", min: 1000, max: 10000, step: 50, f: 1e3, dec: 0, toggle: "autoSteel" },
          ],
        },
      ],
      presets: [
        ["capsize", "Narrower barge, W = 44 m (capsizes)", { W: 44 }, 7],
        ["narrow", "Narrow barge, W = 35 m (unstable)", { W: 35 }, 7],
        ["concrete", "Concrete ballast", { rho_b: 2400 }],
        ["noBallast", "No ballast (keel lifts out, capsizes)", { ballastMass: 0 }],
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
        <p><b>Submerged volume:</b> V<sub>s</sub>(D) = W² D &nbsp;⇒&nbsp; D = M<sub>tot</sub> / (ρ<sub>w</sub> W²)</p>
        <p><b>Masses:</b> M<sub>tot</sub> = M<sub>turbine</sub> + M<sub>steel</sub> + M<sub>ballast</sub>.</p>
        <p><b>Freeboard and tower base:</b> FB = H − D; the tower stands on a pedestal on the deck, at z = FB + H<sub>ped</sub>.</p>
        <p><b>Ballast height:</b> h<sub>b</sub> = M<sub>ballast</sub> / (ρ<sub>b</sub> W²) ≤ H. Steel COM at mid hull height: z = −D + H/2.</p>
        <p><b>CoB (upright):</b> z<sub>CoB</sub> = −D/2. <b>Waterplane inertia:</b> J = W⁴/12 (very large: the barge is stable thanks to its waterplane).</p>`,
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
  const symHTML = (s) => s ? s.replace(/_(\w+)/, "<sub>$1</sub>") : "";
  const sub = (s) => `<tspan dy="3" font-size="8">${s}</tspan><tspan dy="-3"></tspan>`;      // SVG subscript
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
      sec.innerHTML = `<summary>${grp.group}</summary><div class="group-body"></div>`;
      const body = sec.querySelector(".group-body");
      grp.items.forEach((def) => {
        const wrap = document.createElement("div");
        wrap.className = "ctrl";
        const id = "in_" + def.key;
        wrap.innerHTML = `
          <div class="ctrl-head">
            <label for="${id}">${def.label} <span class="sym">${symHTML(def.sym)}</span></label>
            <span class="ctrl-val"><input type="number" id="${id}_n" step="any" aria-label="${def.label} value"><span class="unit">${def.unit}</span></span>
          </div>
          <input type="range" id="${id}" min="${def.min}" max="${def.max}" step="${def.step}">`;
        if (def.toggle) {
          const chk = document.createElement("label");
          chk.className = "check";
          chk.innerHTML = `<input type="checkbox" id="chk_${def.toggle}"> scale with hull surface area (constant plate thickness)`;
          wrap.appendChild(chk);
          chk.querySelector("input").addEventListener("change", (e) => { state.plat[state.type].autoSteel = e.target.checked; syncInputs(); schedule(); });
        }
        body.appendChild(wrap);
        const range = wrap.querySelector("input[type=range]");
        const number = wrap.querySelector("input[type=number]");
        inputs[def.key] = { range, number, wrap, def, scope: grp.scope };

        // slider moved -> update parameter
        range.addEventListener("input", () => { setParam(def, grp.scope, parseFloat(range.value)); number.value = fmtInput(def, parseFloat(range.value)); schedule(); });
        // number typed -> update parameter (clamped to the slider range)
        number.addEventListener("change", () => {
          let v = parseFloat(number.value);
          if (!isFinite(v)) v = P()[def.key] / def.f;
          v = Math.min(def.max, Math.max(def.min, v));
          setParam(def, grp.scope, v);
          syncInputs();
          schedule();
        });
      });
      host.insertBefore(sec, before);
    });
  }

  const fmtInput = (def, v) => Number(v.toFixed(def.dec));
  function setParam(def, scope, displayValue) {
    (scope === "turbine" ? state.turbine : state.plat[state.type])[def.key] = displayValue * def.f;
  }

  /** Write the current params back into sliders and number boxes. */
  function syncInputs() {
    const p = P();
    Object.values(inputs).forEach(({ range, number, wrap, def }) => {
      let v = p[def.key] / def.f;
      const auto = def.key === "steelMass" && p.autoSteel;
      if (auto) v = M.effectiveSteelMass(state.type, p) / def.f;
      range.value = v;
      number.value = fmtInput(def, v);
      range.disabled = number.disabled = auto;
      wrap.classList.toggle("disabled", auto);
    });
    const chk = $("chk_autoSteel");
    if (chk) chk.checked = !!p.autoSteel;
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
    if (p.autoSteel) syncInputs();   // the steel slider shows the computed value
    renderMessages(r);
    renderCards(r);
    drawSide($("figWhole"), r, true);
    drawSide($("figClose"), r, false);
    drawTop($("figTop"), r);
    drawMoment($("figMoment"), r);
    renderTables(r);
  }

  // --------------------------- messages ---------------------------
  function renderMessages(r) {
    const label = { ok: "OK", info: "Note", warn: "Warning", error: "Failure" };
    const order = { error: 0, warn: 1, ok: 2, info: 3 };
    const list = r.messages.slice().sort((a, b) => order[a.level] - order[b.level]);
    $("messages").innerHTML = list.map((m) => `<div class="msg ${m.level}"><b>${label[m.level]}</b>${esc(m.text)}</div>`).join("");
  }

  // --------------------------- result cards ---------------------------
  function renderCards(r) {
    const ok = r.valid && !r.sinks;
    const hullOk = r.hull && !r.hull.error;
    const pitchDeg = deg(r.pitch);
    const ref = REF[state.type];
    const p = r.params;
    const cards = [
      { lbl: "Draft D", val: ok ? fmt(r.draft, 2) : (r.sinks ? "SUNK" : fmt(r.draft, 2)), unit: "m", ref: fmt(ref.draft, 2), key: true, bad: r.sinks },
      {
        lbl: "Static pitch θ", val: ok ? (r.K > 0 ? fmt(pitchDeg, 2) : "unstable") : "—", unit: "°", ref: fmt(deg(ref.pitch), 2), key: true,
        bad: r.capsizes, warn: ok && !r.capsizes && Math.abs(pitchDeg) > p.pitchLimitDeg,
      },
      { lbl: "Waterplane inertia J", val: hullOk ? fmt(r.hull.J, 0) : "—", unit: "m⁴", ref: fmt(ref.hull.J, 0), key: true },
      { lbl: "Total mass", val: r.totalMass ? fmt(r.totalMass / 1e3, 0) : "—", unit: "t", ref: fmt(ref.totalMass / 1e3, 0) },
      { lbl: "Ballast height h_b", val: r.ballastHeight !== undefined ? fmt(r.ballastHeight, 2) : "—", unit: "m", ref: fmt(ref.ballastHeight, 2), bad: hullOk && r.ballastHeight > r.hull.ballastMaxHeight },
      { lbl: "Metacentric height GM", val: ok ? fmt(r.GM, 2) : "—", unit: "m", ref: fmt(ref.GM, 2), bad: ok && r.GM <= 0 },
      { lbl: "Pitch stiffness K", val: ok ? fmt(r.K / 1e9, 2) : "—", unit: "GNm/rad", ref: fmt(ref.K / 1e9, 2), bad: ok && r.K <= 0 },
      { lbl: "Capsize angle", val: ok ? fmt(deg(r.critPos), 1) : "—", unit: "°", ref: fmt(deg(ref.critPos), 1) },
    ];
    $("cards").innerHTML = cards.map((c) => `
      <div class="card ${c.key ? "key" : ""} ${c.bad ? "bad" : ""} ${c.warn ? "warnc" : ""}">
        <div class="lbl">${symHTML(c.lbl)}</div>
        <div class="val">${c.val} <small>${c.val === "—" || c.val === "SUNK" || c.val === "unstable" ? "" : c.unit}</small></div>
        <div class="ref">reference: ${c.ref} ${c.unit}</div>
      </div>`).join("");
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
    const out = [];

    // Sky background, then horizontal grid lines
    out.push(`<rect x="0" y="0" width="${v.W}" height="${v.H}" rx="5" style="fill:var(--sky)"/>`);
    for (let z = Math.ceil(v.zmin / gstep) * gstep; z <= v.zmax; z += gstep) {
      out.push(`<line x1="0" x2="${v.W}" y1="${v.Y(z)}" y2="${v.Y(z)}" stroke="var(--line)" stroke-width="0.6"/>`);
      out.push(text(3, v.Y(z) - 2, `${z} m`, `font-size="9" style="fill:var(--muted)"`));
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
    else if (r.valid && r.capsizes) {
      // capsized: draw the platform lying on its side (the linear model no longer applies)
      th = (r.M_ext < 0 ? -1 : 1) * M.deg2rad(80); overlay = "CAPSIZED";
    } else if (r.valid && isFinite(r.pitch)) th = r.pitch;
    else if (r.ballastHeight > r.hull.ballastMaxHeight) overlay = "NO ROOM FOR BALLAST";

    const keel = -D;
    const h = ui.hull(p, r, keel, STYLES);
    // Body -> global transformation. Normally a rotation about the SWL origin (as in the
    // linear model). When capsized, rotate about the hull centre and leave it half submerged.
    let tf = (x, z) => rot(x, z, th);
    if (overlay === "CAPSIZED") {
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
        out.push(text(v.X(hx - L - 4), v.Y(hz) - 8, `F${sub("T")} = ${fmt(p.thrust / 1e6, 2)} MN`, `font-size="12" style="fill:var(--thrust)"`));
      }
    }

    // ---- sea (translucent, drawn over the hull so the submerged part is tinted) ----
    out.push(waterLayer(v));

    // ---- minimum blade tip clearance line (whole view) ----
    if (whole && p.minTipClearance > 0) {
      const bad = r.tipOk === false;
      const col = bad ? "var(--err)" : "var(--muted)";
      out.push(`<line x1="0" x2="${v.W}" y1="${v.Y(p.minTipClearance)}" y2="${v.Y(p.minTipClearance)}" stroke="${col}" stroke-dasharray="5 4" stroke-width="${bad ? 1.6 : 1}"/>`);
      out.push(text(v.W - 4, v.Y(p.minTipClearance) - 3, `min. tip clearance ${fmt(p.minTipClearance, 0)} m`, `text-anchor="end" font-size="9.5" style="fill:${col}"`));
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
          out.push(`<circle cx="${v.X(b0x)}" cy="${v.Y(b0z)}" r="4" fill="none" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="2 2"/>`);
          out.push(text(v.X(b0x) - 7, v.Y(b0z) + 14, `CoB${sub("0")}`, `text-anchor="end" font-size="10" style="fill:var(--muted)"`));
        }
        // weight (down, at CoM) and buoyancy (up, at CoB)
        out.push(arrow(v, gx, gz, gx, gz - aL, css("--G"), 2.2));
        out.push(arrow(v, bx, bz, bx, bz + aL, css("--B"), 2.2));
        // lever arm of the righting couple
        out.push(text(v.W - 8, 18, `lever arm X${sub("CoB")} − X${sub("CoM")} = ${fmt(f.lever, 2)} m`, `text-anchor="end" font-size="11"`));
      }
      // metacentre M (both views) with the line of action of the buoyancy: vertical through CoB and M
      const dm = whole ? 4.5 : 6;   // diamond half-size
      out.push(`<line x1="${v.X(bx)}" y1="${v.Y(bz)}" x2="${v.X(mx)}" y2="${v.Y(mz)}" stroke="var(--B)" stroke-dasharray="4 3" stroke-width="1.2"/>`);
      out.push(`<polygon points="${v.X(mx)},${v.Y(mz) - dm} ${v.X(mx) + dm * 0.85},${v.Y(mz)} ${v.X(mx)},${v.Y(mz) + dm} ${v.X(mx) - dm * 0.85},${v.Y(mz)}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.5"/>`);
      out.push(text(v.X(mx) - dm - 3, v.Y(mz) - 4, "M", `text-anchor="end" font-size="${whole ? 11 : 12}" font-weight="700"`));   // left: for a spar M is almost on the CoB
      const rad = whole ? 4.5 : 6;
      out.push(marker(v, gx, gz, css("--G"), "CoM", rad, -1));
      out.push(marker(v, bx, bz, css("--B"), "CoB", rad, 1));
    }

    // ---- annotations ----
    if (!whole) {
      if (r.ballastHeight > r.hull.ballastMaxHeight && !r.sinks) {
        out.push(text(v.W - 8, 18, `h${sub("b")} = ${fmt(r.ballastHeight, 1)} m &gt; available ${fmt(r.hull.ballastMaxHeight, 1)} m`, `text-anchor="end" font-size="11.5" style="fill:var(--err)"`));
      }
      const nL = ui.legend.length;         // legend (bottom-left), on a panel background
      out.push(`<rect x="4" y="${v.H - 22 - (nL - 1) * 15}" width="112" height="${nL * 15 + 6}" rx="4" fill="var(--panel)" fill-opacity=".85"/>`);
      ui.legend.forEach(([c, t], i) => {
        out.push(`<rect x="${8}" y="${v.H - 17 - i * 15}" width="10" height="10" fill="var(${c})" stroke="var(--steel-edge)" stroke-width=".5"/>`);
        out.push(text(22, v.H - 8 - i * 15, t, `font-size="10.5"`));
      });
    }
    out.push(text(42, 16, "wind →", `font-size="11" style="fill:var(--muted)"`));
    if (overlay) {
      out.push(text(v.W / 2, v.H * 0.28, overlay, `text-anchor="middle" font-size="${whole ? 22 : 24}" font-weight="700" style="fill:var(--err)"`));
    }
    svg.innerHTML = out.join("");
  }

  function waterLayer(v) {
    return `<rect x="0" y="${v.Y(0)}" width="${v.W}" height="${v.H - v.Y(0)}" style="fill:var(--sea)"/>` +
      `<line x1="0" x2="${v.W}" y1="${v.Y(0)}" y2="${v.Y(0)}" stroke="var(--sea-line)" stroke-width="1.6"/>` +
      `<text x="${v.W - 6}" y="${v.Y(0) - 4}" text-anchor="end" font-size="11" style="fill:var(--sea-line)">SWL</text>`;
  }
  /** Point marker; side = -1 puts the label on the left, +1 on the right. */
  function marker(v, x, z, color, label, rad = 6, side = 1) {
    const X = v.X(x), Y = v.Y(z);
    return `<circle cx="${X}" cy="${Y}" r="${rad}" fill="var(--panel)" stroke="${color}" stroke-width="2.2"/>` +
      `<circle cx="${X}" cy="${Y}" r="${rad * 0.37}" fill="${color}"/>` +
      `<text x="${X + side * (rad + 4)}" y="${Y + 4}" text-anchor="${side < 0 ? "end" : "start"}" font-size="${rad > 5 ? 12.5 : 11}" font-weight="700" style="fill:${color}">${label}</text>`;
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
  //  MOMENT vs PITCH chart: restoring K*θ and overturning moment
  // ======================================================================
  function drawMoment(svg, r) {
    const p = r.params;
    // Height fixed in SVG units; width follows the shape of the box so the chart fills it.
    const H = svg.parentElement.classList.contains("full") ? 400 : 270, ml = 62, mr = 16, mt = 14, mb = 40;
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

    out.push(`<defs><clipPath id="clipM"><rect x="${ml}" y="${mt}" width="${W - ml - mr}" height="${H - mt - mb}"/></clipPath></defs>`);
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
    out.push(text((ml + W - mr) / 2, H - 6, "pitch angle θ (deg)", `text-anchor="middle" font-size="12"`));
    out.push(text(14, (mt + H - mb) / 2, "moment (MN·m)", `text-anchor="middle" font-size="12" transform="rotate(-90 14 ${(mt + H - mb) / 2})"`));

    const g = [];
    // vertical lines: allowable pitch and capsize angle
    const lim = sgn * p.pitchLimitDeg, cr = sgn * critDeg;
    g.push(`<line x1="${X(lim)}" x2="${X(lim)}" y1="${mt}" y2="${H - mb}" stroke="var(--warn)" stroke-dasharray="5 4" stroke-width="1.5"/>`);
    // labels go on the right of their line, or on the left when the line is near the right edge
    const lab = (xl) => xl > W - mr - 90 ? `x="${(xl - 4).toFixed(1)}" text-anchor="end"` : `x="${(xl + 4).toFixed(1)}"`;
    g.push(`<text ${lab(X(lim))} y="${mt + 14}" font-size="11" style="fill:var(--warn)">allowable ${fmt(p.pitchLimitDeg, 1)}°</text>`);
    if (Math.abs(cr) <= tMax) {
      g.push(`<line x1="${X(cr)}" x2="${X(cr)}" y1="${mt}" y2="${H - mb}" stroke="var(--err)" stroke-dasharray="5 4" stroke-width="1.5"/>`);
      g.push(`<text ${lab(X(cr))} y="${mt + 30}" font-size="11" style="fill:var(--err)">capsize ${fmt(critDeg, 1)}°</text>`);
    }
    // restoring moment line K*θ
    g.push(`<line x1="${X(t0)}" y1="${Y(Kmn * M.deg2rad(t0))}" x2="${X(t1)}" y2="${Y(Kmn * M.deg2rad(t1))}" stroke="var(--chart-a)" stroke-width="2.5"/>`);
    // overturning moment (constant in the linear model)
    g.push(`<line x1="${X(t0)}" y1="${Y(Mext)}" x2="${X(t1)}" y2="${Y(Mext)}" stroke="var(--chart-b)" stroke-width="2.5"/>`);
    // equilibrium point
    if (isFinite(pitchDeg) && Math.abs(pitchDeg) <= tMax) {
      g.push(`<circle cx="${X(pitchDeg)}" cy="${Y(Mext)}" r="5.5" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>`);
      g.push(text(X(pitchDeg) + 8, Y(Mext) + 18, `θ = ${fmt(pitchDeg, 2)}°`, `font-size="12" font-weight="600"`));
    }
    out.push(`<g clip-path="url(#clipM)">${g.join("")}</g>`);
    // legend (bottom-right corner, usually empty)
    const lx = W - mr - 312, ly = H - mb - 34;
    out.push(`<rect x="${lx - 6}" y="${ly - 14}" width="300" height="44" rx="5" fill="var(--panel)" fill-opacity=".9" stroke="var(--line)"/>`);
    out.push(`<line x1="${lx}" x2="${lx + 22}" y1="${ly - 2}" y2="${ly - 2}" stroke="var(--chart-a)" stroke-width="2.5"/>`);
    out.push(text(lx + 28, ly + 2, `restoring K·θ  (K = ${fmt(r.K / 1e9, 2)} GN·m/rad)`, `font-size="11.5"`));
    out.push(`<line x1="${lx}" x2="${lx + 22}" y1="${ly + 16}" y2="${ly + 16}" stroke="var(--chart-b)" stroke-width="2.5"/>`);
    out.push(text(lx + 28, ly + 20, `overturning F_T·h_hub + x_CoM·M·g =${fmt(Mext, 0)} MN·m`, `font-size="11.5"`));
    svg.innerHTML = out.join("");
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
    const n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }

  // ======================================================================
  //  TABLES (below the first screen)
  // ======================================================================
  function renderTables(r) {
    if (!r.items) {
      const reason = r.sinks ? "Platform sunk: no equilibrium." : "No valid design.";
      $("massTable").innerHTML = `<tr><td>${reason}</td></tr>` + (r.totalMass ? `<tr><td>Total mass</td><td>${fmt(r.totalMass / 1e3, 0)} t</td></tr>` : "");
      $("stiffTable").innerHTML = `<tr><td>${reason}</td></tr>`;
      $("framesTable").innerHTML = `<tr><td>${reason}</td></tr>`;
      return;
    }
    const rows = r.items.map((it) => `<tr><td>${it.name}</td><td>${fmt(it.m / 1e3, 0)}</td><td>${fmt(it.x, 2)}</td><td>${fmt(it.z, 2)}</td><td>${fmt(it.m * it.z / 1e3, 0)}</td></tr>`).join("");
    $("massTable").innerHTML = `<tr><th>Component</th><th>mass (t)</th><th>x (m)</th><th>z above SWL (m)</th><th>m·z (t·m)</th></tr>${rows}
      <tr class="total"><td>Total / CoM of the whole device</td><td>${fmt(r.totalMass / 1e3, 0)}</td><td>${fmt(r.COM[0], 2)}</td><td>${fmt(r.COM[2], 2)}</td><td>${fmt(r.totalMass * r.COM[2] / 1e3, 0)}</td></tr>`;
    const st = [
      ["Draft D", fmt(r.draft, 2), "m"],
      ["Freeboard FB", fmt(r.freeboard, 2), "m"],
      ["Tower base above SWL", fmt(r.towerBase, 2), "m"],
      ["Submerged volume V<sub>s</sub>", fmt(r.Vs, 0), "m³"],
      ["Waterplane area A<sub>wp</sub>", fmt(r.hull.A_wp, 1), "m²"],
      ["Waterplane inertia J", fmt(r.hull.J, 0), "m⁴"],
      ["CoB height z<sub>CoB</sub> (upright)", fmt(r.COB[2], 2), "m"],
      ["CoM height z<sub>CoM</sub> (whole device)", fmt(r.COM[2], 2), "m"],
      ["BM = J / V<sub>s</sub>", fmt(r.BM, 2), "m"],
      ["Metacentre height z<sub>M</sub> = z<sub>CoB</sub> + BM", fmt(r.zM, 2), "m"],
      ["Metacentric height GM = z<sub>M</sub> − z<sub>CoM</sub>", fmt(r.GM, 2), "m"],
      ["Hydrostatic stiffness K<sub>h</sub> = ρg(J + V<sub>s</sub>z<sub>CoB</sub>)", fmt(r.Kh / 1e9, 3), "GN·m/rad"],
      ["Gravity stiffness K<sub>g</sub> = −M g z<sub>CoM</sub>", fmt(r.Kg / 1e9, 3), "GN·m/rad"],
      ["Total pitch stiffness K", fmt(r.K / 1e9, 3), "GN·m/rad"],
      ["Heave stiffness C<sub>33</sub> = ρ g A<sub>wp</sub>", fmt(r.heaveStiffness / 1e6, 2), "MN/m"],
      ["Hub height above SWL", fmt(r.hubHeight, 1), "m"],
      ["Thrust moment F<sub>T</sub>·h<sub>hub</sub>", fmt(r.M_thrust / 1e6, 1), "MN·m"],
      ["Weight-offset moment x<sub>CoM</sub>·M·g", fmt(r.M_weight / 1e6, 1), "MN·m"],
      ["Reserve buoyancy", fmt(100 * r.reserveBuoyancy, 1), "%"],
      ["Blade tip clearance (min. " + fmt(r.params.minTipClearance, 0) + " m)", fmt(r.tipClearance, 1), "m"],
    ];
    $("stiffTable").innerHTML = `<tr><th>Quantity</th><th>value</th><th>unit</th></tr>` +
      st.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join("");
    renderFrames(r);
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
      `<tr><th>Point</th><th>structure frame, upright (x, z)</th><th>structure frame at θ (x, z)</th><th>earth frame at θ (X, Z)</th><th>note</th></tr>` +
      rows.map((c) => `<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td><td class="note">${c[4]}</td></tr>`).join("") +
      (!eq ? `<tr class="total"><td colspan="5">θ = ${thTxt}</td></tr>` :
      `<tr class="total"><td colspan="3">θ = ${thTxt}. Lever arm X<sub>CoB</sub> − X<sub>CoM</sub></td><td>${fmt(f.lever, 3)} m</td><td></td></tr>` +
      `<tr><td colspan="3">Righting couple M g (X<sub>CoB</sub> − X<sub>CoM</sub>)</td><td>${fmt(f.rightingCouple / 1e6, 1)} MN·m</td><td class="note">≈ thrust moment F<sub>T</sub>·h<sub>hub</sub> = ${fmt(r.M_thrust / 1e6, 1)} MN·m (equal to first order in θ)</td></tr>`);
  }

  // ======================================================================
  //  PLATFORM SWITCH, SCENARIOS AND BUTTONS
  // ======================================================================
  function setPlatform(type) {
    state.type = type;
    document.querySelectorAll("#platformSwitch button").forEach((b) => b.classList.toggle("active", b.dataset.type === type));
    // scenario menu for this platform
    $("presetSelect").innerHTML = `<option value="">— choose —</option><option value="reference">Reference design (original exercise)</option>` +
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

  // --------------------------- start ---------------------------
  setupFullScreen();
  fitDash();
  setPlatform("semisub");
})();
