# Changelog

All notable changes to the Floating Wind Hydrostatics Lab are listed here.
The project uses [semantic versioning](https://semver.org/): MAJOR.MINOR.PATCH.

## [1.2.0] - 2026-11-27

### Added
- **Five guided exercises, HS0–HS4**, in the format of the Hydrodynamics Lab (task, data table with units, numeric or multiple-choice answers, three attempts, progressive hints, explanation, follow-up block), each at the bottom of its tab:
  - HS0 signs warm-up (Conventions, S2); HS1 draft and heave stiffness (Heave, S1, S13; spar, barge, semisub); HS2 the three terms of K_55 (Pitch stiffness, S12; barge, spar, semisub); HS3 static pitch of the semisub (Static pitch, S14, S12, S10, S11; reference, s_EC = 55 m, F_T = 2.5 MN, random case); HS4 "Rescue the narrow semisub" (Dashboard, design exercise, see below); HS4+ free design with the sliders (homework).
  - Learning objectives S-LO1 to S-LO5, with the slides and equations, at the top of each exercise.
  - The expected answers are computed at run time by the model on the reference design or on the case of the exercise, never from the sliders (except HS4, a slider exercise by design).
  - Uniform precision: answers with 3 significant digits, tolerance ±2 %. A dot or a comma can be used as decimal separator; thousands separators are understood.
  - HS2 and HS3 draw the K_55 bar chart and the moment chart of their own case.
- **Answers hidden until the exercise is answered** (as the natural periods of the Hydrodynamics Lab): Heave tab (draft table, total row of the mass budget) until HS1; Pitch stiffness tab (K_55 chart and table) until HS2; Static pitch tab (moment chart, M_ext, ξ_5, positions) until HS3. On the Dashboard the cards m, D (HS1), J, GM, K_55 (HS2) and ξ_5 (HS3), the draft and pitch in the OK message and the numbers of the moment chart are hidden the same way. Show them now buttons, and Show all results now in HS4, reveal them earlier.
- **Conventions sketch**: frame, O, x, y, z, DoFs ξ_1, ξ_3, ξ_5, wind and thrust on the side view of the reference semisub (one column upwind, two downwind), as in the Hydrodynamics Lab but without waves.
- HS0 question 2 uses tick boxes (any combination can be selected, one is correct); multiple-choice questions put the answer box below the question, so long questions and options fit. In the mass budget, m·z is explained (first moment of mass).
- **Instructor mode** (`index.html?instructor` or `#instructor`): a Show solution button in every exercise fills in and solves all the answers and shows a worked solution with the slide labels and the intermediate numbers, in a projector-size font, with the charts of the case.
- **Self-test** (`index.html?selftest`): checks the reference results and the exercise answers against the values of the course material, drives every exercise (expected answer accepted, a value 5 % off rejected), checks the instructor flag and the notation. It replaces a Node script, so nothing has to be installed.
- `bisect()` in `model.js`: a pure root-finding helper, used for the barge widths of HS4.
- **Tabs**, as in the Hydrodynamics Lab: Dashboard (the previous first screen), Conventions, Heave, Pitch stiffness, Static pitch, Equations. The slider panel and the messages stay visible in every tab. `index.html#heave` (etc.) opens a tab directly.
- **Conventions tab**: reference frame, sign of a pitch moment (S2), the 6 degrees of freedom, symbols, and the table of the slide equation labels S1–S14.
- **Bar chart of the pitch stiffness terms** (Pitch stiffness tab): ρ_w g J, ρ_w g V_s CoB_0^Z, −m g CoM^Z and their sum K_55, with a stable/unstable verdict (K_55 > 0).
- **Equation labels of the lecture slides** (S1, S3–S5, S7, S10–S14) in the equations, tables and README.
- The moment balance chart is also shown, larger, in the Static pitch tab.
- **HS4 design exercise**: a design exercise starting from the narrow-spacing scenario ("Rescue the narrow semisub", about 12 min, S-LO5 with S-LO3, slide 14, S12, S14): Load the starting design, a live "Check my design" on the sliders (s_EC = 30 m, the design works, ξ_5 ≤ 8°, D ≥ 18 m; values hidden until HS1 and HS3), K_55 bar charts before and after on the same scale with the cost, the smallest d_EC (numeric, ±2 %), why ballast alone fails (multiple choice) and an open question with a model answer and a self-assessment checklist. Instructor mode: Apply step walks through the solution on the sliders.
- The earlier free slider exercise is kept as HS4+ (homework).
- New question types in the exercise engine: `design` (live check of the sliders, no attempt limit) and `open` (free text, not graded, not stored). Multiple-choice questions with long options are shown as radio buttons. The K_55 bar chart can share its vertical scale with another design.
- The external column diameter box shows two decimals.
- Self-test extended with the HS4 checks (narrow start, smallest d_EC, the design at 8°, ballast only never works, the design checker).

### Changed
- **Notation of the lecture slides** in every displayed text (labels, cards, charts, tables, equations, messages, README): static pitch θ → ξ_5, allowable pitch θ_max → ξ_5,max, pitch stiffness K → K_55, heave stiffness C_33 → K_33, total mass M_tot → m, z_CoM, x_CoM → CoM^Z, CoM^X, upright z_CoB, x_CoB → CoB_0^Z, CoB_0^X. The 6 × 6 stiffness matrix is called K. The overturning moment is written M_ext = F_T h_hub + m g CoM^X − ρ_w g V_s CoB_0^X. JavaScript names are unchanged.
- **"Capsize angle" renamed "limit angle of the linear model"** (card "Linear-model limit", chart line, messages, scenarios, README). It is the angle at which the deck edge goes under water or the keel comes out of the water: there the linear model stops being valid (P2 on slide 9), which is not the capsize (P3). It is still a failure. Past this limit the figures draw the hull at the limit angle with the label BEYOND LINEAR-MODEL LIMIT; with K_55 ≤ 0 the hull is drawn on its side with the label UNSTABLE.
- The OK message and the "Linear-model limit" card give the limit in the direction of the pitch.
- The tables are split by topic over the Heave, Pitch stiffness and Static pitch tabs.
- Semisub with the pontoons cutting the water surface: the warning now says that J, K_55 and K_33 are not valid there.
- Version 1.2.0 in `model.js`, the page footer and the README (they disagreed before).

### Unchanged
- No change to the model or to the numerical results.

## [1.1.1] - 2026-11-23
README corrections; no changes to the model or results.

## [1.1.0]

Changes after review by colleagues.

### Added
- **Steel thickness slider** (equivalent thickness t_s, 20–100 mm) for every platform.
  - The steel mass is now computed as ρ_steel · A_shell · t_s, from the shell area of the current geometry, and is shown under the slider and in a summary card.
  - The defaults reproduce the reference steel masses (3 500 / 4 000 / 3 000 t).
- **Turbine model with tower scaling.**
  - The turbine is split into the rotor-nacelle assembly (RNA, constant mass, CoM at hub height) and the tower.
  - The tower mass grows linearly with the hub height (NREL cost and scaling model, Fingersh et al. 2006), with its CoM at 40 % of the tower height.
  - Calibrated to reproduce the reference turbine (2 100 t, CoM 95 m above the tower base) at a 135 m hub height.
- **Values outside the slider range** can be typed in the number boxes.
  - The box is highlighted and a note shows the slider range.
  - Only physically meaningless values (negative masses, near-zero dimensions, …) are limited.
- **Design objectives** menu: allowable static pitch, minimum blade tip clearance and target draft together.
- **Definition of the pitch stiffness K** in the equations panel: K is the pitch–pitch term C55 of the 6 × 6 restoring matrix, the 1D reduction of the stiffness matrix.
- Version number in the page footer and this changelog.

### Changed
- **Summary cards** are split into *Inputs to the hydrostatics* (total mass, steel mass, ballast height, J) and *Outputs* (draft, pitch, GM, K, capsize angle). Each group has one uniform border colour.
- **Spar figures:** legend, labels and markers scale with the figure, so they stay readable in the tall, narrow spar drawing.
- **Equations panel:**
  - The heave equilibrium is written explicitly for each platform (e.g. spar: ρ_w (π d²/4) D = M_tot).
  - The coordinate-change and CoB-arc formulas were removed, as were the references to the MATLAB script.
  - The reference frame is described in words, including the fact that surge and heave are not part of the 1D pitch model.
- Mass budget table: the turbine is listed as RNA + tower.

### Removed
- Sliders *Turbine COM above tower base* and *Turbine mass*. The turbine CoM and mass now follow the hub height and the RNA mass.
- Slider *Platform steel mass* and the *scale with hull surface area* checkbox, replaced by the steel thickness slider.

### Fixed
- **Overturning moment.** The moment chart showed F_T·h_hub + x_CoM·M·g, while the equations showed an extra buoyancy term. Both, and the tables, now use the same expression: M_ext = F_T·h_hub + M_tot·g·(x_CoM − x_CoB), with x_CoB = 0 for the symmetric hulls. The numerical results are unchanged.

### Unchanged
- With the default inputs, all reference results are identical to version 1.0.0 and to the exercise: draft, ballast, J, K and static pitch for the semisub, spar and barge.

## [1.0.0]

First public version.
- Semisubmersible, spar and barge, with the heave equilibrium and the static pitch under maximum thrust.
- Failure checks: no room for ballast, sinking, instability, capsize, blade tip clearance.
- Four figures (close-up, whole turbine, top view, moment balance) with a full-screen mode, CoM / CoB / metacentre markers, scenarios and the target-draft helper.
