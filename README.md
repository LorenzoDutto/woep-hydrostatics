# Floating Wind Hydrostatics Lab

**Version 1.2.0**. [CHANGELOG.md](CHANGELOG.md) lists the changes between versions.

Open the lab online: <https://lorenzodutto.github.io/woep-hydrostatics/>. The next exercise of the course is the [Floating Wind Hydrodynamics Lab](https://github.com/LorenzoDutto/woep-hydrodynamics) (online: <https://lorenzodutto.github.io/woep-hydrodynamics/>).

An interactive tool for the course **Wind and Ocean Energy Plants**. It belongs to the exercise on the hydrostatics of floating offshore wind turbines.

You choose one of three platforms for the same 15 MW turbine and redesign it with sliders:

* a **semisubmersible** (4 columns, VolturnUS-S-like);
* a **spar**;
* a **barge**.

Five guided exercises (HS0 to HS4, section 3) and a homework block (HS4+) follow the lecture slides, with hints, three attempts and an instructor mode.

After every change the tool computes:

* the **heave equilibrium**: the draft at which buoyancy balances the total weight;
* the **static pitch angle** under the maximum rotor thrust;
* whether the design **fails**:
  * no room for the ballast;
  * the platform sinks;
  * it is statically unstable;
  * the static pitch exceeds the limit of the linear model (deck edge under water or keel out of water);
  * the blade tips come too close to the sea.

The figures and messages update immediately.

The tool runs entirely in your web browser. **You don't need an internet connection, MATLAB, Python or any installation.**

---

## 1. How to get it and start it

1. Download the repository from GitHub. Click the green **Code** button, then **Download ZIP**, and unzip it. If you use git, you can run `git clone` instead.
2. Open the folder `woep-hydrostatics-main`.
3. **Double-click `index.html`.** It opens in your default browser (Chrome, Firefox, Edge or Safari).

Keep the four files (`index.html`, `style.css`, `model.js` and `app.js`) in the same folder. The page needs all of them.

> If the page opens but nothing moves or no figures appear, use another browser (any recent Chrome, Firefox or Edge works). The tool needs no server.

---

## 2. The platforms

Use the **Semisub | Spar | Barge** switch at the top of the page. Each platform keeps its own settings, so you can switch back and forth and compare them. The turbine settings and the design objectives are shared by all three.

The reference designs are those of the hydrostatics exercise given in classroom.

| | Semisubmersible | Spar | Barge |
|---|---|---|---|
| Hull | central column d = 12 m; 3 external columns d_EC = 13 m at s_EC = 50 m; pontoons 9 × 6 m | one cylinder, d = 16 m, length L = 119 m | square box, W = 52 m, hull height H = 14 m |
| Ballast | concrete (2 400 kg/m³) at the bottom of the 3 external columns, plus pontoons full of sea water | iron ore (5 000 kg/m³) at the bottom of the spar | sea water (1 025 kg/m³) at the bottom of the hull |
| Steel mass (equivalent thickness) | 3 500 t (46.0 mm) | 4 000 t (79.8 mm) | 3 000 t (45.9 mm) |
| Reference draft | 18 m | 104 m | 7 m |
| Tower base | on the central column, at z = FB | on top of the spar, at z = FB | on an 8 m pedestal on the deck, at z = FB + 8 m |

The tower base is at +15 m above the still water line (SWL) in all three reference designs, so the hub is at 150 m above the SWL. If the draft changes, the tower base moves with the freeboard, and the hub height above the sea changes too.

**Turbine.** The reference turbine weighs 2 100 t, with its CoM 95 m above the tower base (110 m above the SWL) and 2 m upwind. The maximum thrust is 2 MN. The rotor radius is R = 121 m (117 m blade + 4 m hub) and the hub overhang is 10 m upwind.

```
   semisubmersible (side view, wind from the left)
                                 ┌──┐       ┌──┐       ┌──┐   ┐
                                 │  │       │  │       │  │   ┘ freeboard FB
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│~~│~~~~~~~│~~│~~~~~~~│~~│~~~~ still water line (SWL)
                                 │  │       │  │       │  │   ┐
                                 │▓▓│═══════│  │═══════│▓▓│   ┘ draft D
   upwind ext. column  (x=-s_EC)  ▲  central column      ▲  2 downwind ext. columns (x=+s_EC/2)
                         ▓ concrete ballast    ═ pontoons full of sea water
```

---

## 3. The interface

The page has a header (platform switch, scenarios, Reset), a **tab bar** and two columns. The controls are on the left and stay visible in every tab, so you can change the design while you look at any tab. The messages are at the top of the right column in every tab, so a failure is always visible. On narrow screens (below about 1000 px wide), everything stacks in one column instead.

| Tab | Content |
|---|---|
| **Dashboard** (default) | one row of summary cards and the four figures, sized to fit one laptop screen |
| **Conventions** | sketch of the frame and of the DoFs on the side view of the semisub, reference frame, sign of a pitch moment (S2), the 6 degrees of freedom, symbols and the equation labels of the slides |
| **Heave** | mass budget; draft, freeboard, V_s, A_wp, heave stiffness K_33 (S13), ballast height, reserve buoyancy |
| **Pitch stiffness** | bar chart of the three terms of K_55 (S12) and the table of J, CoB_0^Z, CoM^Z, BM, z_M, GM, K_h, K_g, K_55 |
| **Static pitch** | the moment balance chart, large; the overturning moment M_ext, K_55 and ξ_5 (S10); the positions of CoM, CoB, M and hub |
| **Equations** | all the formulas of the model for the current platform |

A link can open a tab directly: `index.html#heave`, `#k55`, `#pitch`, `#conv`, `#eq` (handy in slides).

### Guided exercises

Five guided exercises, HS0 to HS4, sit at the bottom of the tab whose content they use; the tab name carries a green badge (HS0 … HS4). Each one is a foldable box, closed at the start. It shows, in this order: case buttons (where there are several cases), the learning objective with the slides and equations, the task, a data table with units, and the questions on the right.

| | Exercise | Tab | Objective | Slides, equations | Time |
|---|---|---|---|---|---|
| HS0 | Signs warm-up | Conventions | S-LO1 | slides 3–4 and 7; S2 | 3 min |
| HS1 | Draft and heave stiffness (spar, barge, semisub) | Heave | S-LO2 | slide 6, S1; slide 13, S13 | 7 min |
| HS2 | The three terms of K_55 (barge, spar, semisub) | Pitch stiffness | S-LO3 | slides 13–14 and 19–20; S12 | 8 min |
| HS3 | Static pitch of the semisub (reference, s_EC = 55 m, F_T = 2.5 MN, random case) | Static pitch | S-LO4 | slides 15–18; S14, S12, S10, S11 | 10 min |
| HS4 | Rescue the narrow semisub: start from the scenario "Narrow column spacing (unstable)" and redesign it with s_EC = 30 m fixed, so that it works with ξ_5 ≤ 8° and D ≥ 18 m | Dashboard | S-LO5 with S-LO3 | slide 14; S12, S14 | 12 min |
| HS4+ | Sensitivity checks (homework): barge width for ξ_5 = 5° and for K_55 = 0, spar and semisub without ballast | Dashboard | S-LO5 | whole lecture | homework |

Learning objectives. After the exercise the student can …

| LO | … | Exercise |
|---|---|---|
| S-LO1 | name the 6 DoF, use the frame (O at the SWL, x downwind, z up) and find the sign of a pitch moment with M = r × F | HS0 |
| S-LO2 | compute the draft from the heave equilibrium (S1) and the heave stiffness K_33 (S13), and explain why a small waterplane makes the draft sensitive to weight changes | HS1 |
| S-LO3 | compute the three terms of K_55 (S12), decide whether a platform is stable in pitch, and say which term makes the barge, the spar and the semisub stable | HS2 |
| S-LO4 | compute the static pitch under maximum thrust (S10, S11), including the weight–buoyancy couple and the approximate J (S14), and compare it with the allowable angle | HS3 |
| S-LO5 | use the tool as a design tool: find a geometry that meets a pitch limit, and explain the effect of the ballast on stability | HS4, HS4+ |

How they work:

* **HS4 is a design problem.** **Load the starting design** loads the scenario "Narrow column spacing (unstable)" (s_EC = 30 m) through the Scenario menu. The students change the sliders and press **Check my design**: it reads the current sliders of the semisub and shows four lines (s_EC = 30 m, the design works, ξ_5 ≤ 8°, D ≥ 18 m), each ✓ or ✗, with no attempt limit; until HS1 and HS3 are answered, the values of D and ξ_5 read "hidden". When all four are ✓ it shows the K_55 bar charts of the starting design and of the student's design on the same scale, and the steel and concrete cost. Then: the smallest d_EC (numeric), why ballast alone fails (multiple choice) and an open question (not graded, nothing stored) with a model answer and a self-assessment checklist. In instructor mode, **Apply step** walks through the solution on the sliders: narrow start, ballast only (9 000 t, then 12 500 t: it sinks), wider external columns + Set ballast, before/after charts.
* HS0–HS3 are solved by hand, with a calculator, from the data table and the slide formula named in the task. Their answers are computed by the model on the **reference design** (or on the case of the exercise), never from the sliders. Only HS4 uses the sliders: press Reset first.
* Give every number with **3 significant digits**; the tolerance is **±2 %** for every numeric answer. A dot or a comma can be used as decimal separator.
* **Check** says ✓ correct or "✗ not correct (±2 %), attempt n of 3". **Hint** shows the hints one at a time. After a correct answer, or after three attempts, the explanation appears (with the answer, in yellow, after three wrong attempts).
* When all the questions are answered, a follow-up block appears (a comparison table, a chart or one or two more questions).
* **Hidden tables.** The tables that give away the answers stay hidden until the exercise of their tab is answered (correctly or after three attempts), as the natural periods of the Hydrodynamics Lab: in the Heave tab, the draft table and the total row of the mass budget (until HS1); in the Pitch stiffness tab, the K_55 chart and table (until HS2); in the Static pitch tab, the moment chart, the overturning moment, ξ_5 and the positions table (until HS3). On the Dashboard, the cards m and D (until HS1), J, GM and K_55 (until HS2) and ξ_5 (until HS3) read "hidden", the OK message leaves out the draft and the static pitch, and the moment chart leaves out its numbers. A **Show them now** button in each tab, and **Show all results now** in HS4, reveal them earlier. A reload hides them again.
* Question 2 of HS0 has tick boxes: any combination of DoFs can be selected, and only one combination is correct.
* Changing the case resets the exercise. The multiple-choice options are always in the same order, so the instructor can say "option 2".

### Controls (left panel)

The sliders are grouped into **foldable menus**: *Platform geometry*, *Masses and ballast*, *Turbine and load* and *Design objectives*. Click a title to open or close it. If you open several menus, the left panel scrolls by itself while the figures stay in place.

Drag a slider or type a value into the box next to it.

* **Values outside the slider range.** You can type a value outside the slider range in the box. The slider then stays at its end, and the box turns yellow with a note. Only physically meaningless values are refused: negative masses, dimensions below 0.5 m, a pontoon filling above 100 %, and so on.

| Menu | Semisub | Spar | Barge |
|---|---|---|---|
| Platform geometry | d, d_EC, s_EC, column height H_col, pontoon height H_P, pontoon width W_P | diameter d, length L (keel to top) | width W, hull height H, pedestal height |
| Masses and ballast | concrete ballast M_b and its density ρ_b, pontoon water filling, steel thickness t_s | solid ballast M_b and its density ρ_b, steel thickness t_s | ballast M_b and its density ρ_b (1 025 = water), steel thickness t_s |

Steel thickness. The steel mass is not an input. It is computed from the steel actually used:

M_steel = ρ_steel · A_shell · t_s, with ρ_steel = 7 850 kg/m³

* A_shell is the area of the outer shell of the hull. It changes when you change the geometry.
* t_s is an *equivalent* thickness. It spreads plates, stiffeners, bulkheads and outfitting over the outer shell, so it is larger than the bare plate thickness (the `.mat` models use 20 mm plates).
* The defaults (46.0 / 79.8 / 45.9 mm) give exactly the steel masses of the exercise. The slider covers a realistic range, 20–100 mm.
* The resulting steel mass and shell area are shown under the slider.

**Turbine and load** (shared):

| Control | Reference value |
|---|---|
| Maximum rotor thrust F_T | 2 MN |
| Rotor-nacelle assembly (RNA) mass | 1 060 t |
| Hub height above tower base | 135 m (= 150 m above SWL) |

The turbine CoM is not an input. It follows the tower height (see section 4).

**Design objectives** (shared):

| Control | Reference value |
|---|---|
| Allowable static pitch ξ_5,max | 10° |
| Minimum blade tip clearance | 20 m |
| Target draft + **Set ballast** | computes the ballast that gives that draft with the current geometry (the original exercise solved the other way round) |

**Scenario** menu (top right). It loads ready-made cases for the current platform: unstable, beyond the linear-model limit, sinking, no room for ballast, blade clearance, … **Reset** restores the reference design of the current platform and the default turbine.

### Results (Dashboard and the other tabs)

* **Messages** (every tab). Green means the design works. Blue is a note. Yellow is a warning: the platform floats but has a problem. Red is a failure.
* **Summary cards** (one row, two groups with different border colours):
  * **Inputs to the hydrostatics** (green border). These are the properties that follow directly from your design choices: total mass, steel mass, ballast height h_b and waterplane inertia J. Watch J when you change the column diameters or spacing, or the barge width.
  * **Outputs** (blue border). These are the equilibrium and stability results: draft D, static pitch ξ_5, metacentric height GM, pitch stiffness K_55 and the limit angle of the linear model (deck edge under water or keel out of water).

  Each card also shows the value of the reference design.
* **Platform close-up.** It shows the hull at the computed pitch angle, with the ballast and:
  * the **CoM of the whole device** (platform + ballast + turbine), with the weight arrow;
  * the **CoB** (centroid of the submerged volume), with the buoyancy arrow;
  * the **metacentre M**, with the line of action of the buoyancy (dashed);
  * **CoB₀** (small dashed circle): where the CoB would be if it were fixed to the hull. The distance between CoB₀ and the CoB shows how the CoB moves when the platform tilts;
  * the **lever arm** CoB^X(ξ_5) − CoM^X(ξ_5) of the righting couple (horizontal positions in the pitched position).
* **Whole turbine** (right). It also shows the CoM, the CoB and M. The thrust arrow is at the hub. The dashed line is the **minimum blade tip clearance**. It turns red when the blades come too close to the sea.
* **Top view.** It shows the platform footprint at a fixed scale, so you can see it grow or shrink.
* **Pitch moment balance.** The restoring moment K_55·ξ_5 (blue) and the overturning moment M_ext (red) are plotted against the pitch angle. Where they cross is the static pitch. The yellow dashed line is the allowable angle and the red dashed line is the limit angle of the linear model. The same chart is shown larger in the Static pitch tab.
* **Platform drawn in red.** Past the limit of the linear model the hull is drawn at the limit angle with the label BEYOND LINEAR-MODEL LIMIT. With K_55 ≤ 0 it is drawn on its side with the label UNSTABLE.
* **Full screen.** Every figure has a **⛶** button in its title bar. It enlarges the figure over the whole results area.
  * The slider panel stays visible, so you can keep changing the platform and watch the enlarged figure update. This is useful when projecting in class.
  * Press **Esc** or the **✕** button to go back.
* **Heave tab:** the mass budget (RNA, tower, steel and ballast, each with its mass and position; total mass m and CoM^X, CoM^Z), and the draft table (m, V_s, D, FB, A_wp, K_33 (S13), h_b, reserve buoyancy).
* **Pitch stiffness tab:** a bar chart of the three terms of K_55 and their sum: waterplane ρ_w g J (light blue), buoyancy height ρ_w g V_s CoB_0^Z (mustard), gravity −m g CoM^Z (violet) and K_55 (sage green). The platform is stable in pitch only if K_55 > 0. Next to it, J, CoB_0^Z, CoM^Z, BM, z_M, GM, K_h, K_g and K_55.
* **Static pitch tab:** the moment chart, the overturning moment (thrust moment and weight–buoyancy couple), K_55, ξ_5, the allowable and limit angles, the tip clearance, and the positions of CoM, CoB, M and hub, upright and at the static pitch, relative to the structure and to the ground, with the lever arm and the righting couple.
* **Equations tab:** the formulas for the current platform.

---

## 4. The model (1D hydrostatics)

The tool uses the formulas of the exercise and the notation of the lecture slides. Labels in brackets (S1, S7, …) are the equation numbers of the lecture slides.

**Frame.** Origin O at the still water level (SWL) on the platform axis, x downwind, z up, y completing a right-handed frame. Positive pitch ξ_5 tilts the tower top downwind. Small angles, linear hydrostatics, no mooring.

| Input | ballast mass M_b |
| Output | draft D, then the static pitch |

Steps, the same for every platform:

1. **Masses:** m = M_RNA + M_tower + M_steel + M_ballast (+ the water in the pontoons for the semisub), with M_steel = ρ_steel A_shell t_s.
2. **Heave equilibrium (S1)** (vertical force balance): buoyancy = weight, ρ_w g V_s = m g.
   * V_s is a known function of the draft D through the hull dimensions. m does not depend on D. Solving for D gives the draft.
   * Spar: ρ_w (π d²/4) D = m, so D = 4 m / (ρ_w π d²).
   * Barge: D = m / (ρ_w W²).
   * Semisub: D = (m/ρ_w − 3 L_P W_P H_P) / A_wp.
3. **Freeboard:** FB = (hull height) − D. The tower base, the hub and the turbine CoM move with it.
4. **Ballast height** h_b = M_b / (ρ_b · ballast area). It must fit in the hull.
5. **CoB and CoM:**
   * CoB_0^Z: volume-weighted average of the submerged volume, upright;
   * CoM^Z, CoM^X: mass-weighted average of the whole device (platform + ballast + turbine).
6. **Pitch stiffness K_55 (S12)** (definition below).
7. **Static pitch (S10):** moment balance about O (S7), K_55 ξ_5 = M_ext, so ξ_5 = M_ext / K_55.

### Turbine mass and CoM vs. tower height

The RNA (blades + hub + nacelle) does not depend on the tower:

* M_RNA = 1 060 t (680 t nacelle + 180 t hub + 3 × 66.1 t blades from the `.mat` files, rounded);
* its CoM is at hub height, 3.96 m upwind.

The tower mass grows linearly with the hub height h_t above the tower base. This is the form of the NREL wind turbine cost and scaling model (Fingersh, Hand & Laxson, 2006, NREL/TP-500-40566): there the tower mass is proportional to (swept area) × (hub height), so for a fixed rotor it is proportional to the hub height.

* M_tower = 1 040 t · h_t / 135 m;
* its CoM is at 0.40 · h_t (a tapered tower has its CoM below mid-height).

The two constants are calibrated so that, for h_t = 135 m, the turbine is exactly the one of the exercise: 2 100 t, CoM 95 m above the tower base, CoM^X = −2 m. A taller tower therefore makes the turbine heavier and raises its CoM. For example, at h_t = 160 m the turbine weighs 2 293 t with its CoM at 108.5 m.

### Pitch stiffness K_55

In the general 6-DOF description, the restoring forces of a floating body come from a 6 × 6 stiffness matrix K (hydrostatics + gravity, plus mooring). The 1D approach keeps only the pitch degree of freedom: the rotation about the y axis through O (DOF 5). So K reduces to its pitch–pitch term K_55:

K_55 = ρ_w g J + ρ_w g V_s CoB_0^Z − m g CoM^Z = ρ_w g V_s · GM, with GM = z_M − CoM^Z and z_M = CoB_0^Z + J/V_s   (S12)

* The couplings with the other DOFs and the mooring stiffness are neglected.
* K_55 gives the restoring moment for a small pitch angle: M_restoring = K_55 ξ_5.
* Signs of the three terms (see the K_55 bar chart in the Pitch stiffness tab):
  * ρ_w g J is always positive.
  * ρ_w g V_s CoB_0^Z is always negative, because the CoB is below the SWL (CoB_0^Z < 0).
  * −m g CoM^Z is negative when the CoM is above the SWL (semisub, barge), and positive when it is below (spar). That is where the spar gets its stability.
* In the Pitch stiffness tab the first two terms are grouped as K_h = ρ_w g (J + V_s CoB_0^Z) (waterplane and buoyancy) and the third is K_g = −m g CoM^Z (weight).

### Overturning moment

M_ext = F_T h_hub + m g CoM^X − ρ_w g V_s CoB_0^X   (S3 + S4 + S5 at ξ_5 = 0; the numerator of S10)

* The first term is the moment of the thrust, applied at the hub height above the SWL.
* The other two terms are the couple of weight and buoyancy (equal in size at heave equilibrium, m = ρ_w V_s) when CoM and CoB are not on the same vertical in the upright position.
* For these symmetric hulls CoB_0^X = 0. CoM^X < 0 because of the overhanging rotor, so this couple slightly reduces the pitch. Neglecting it gives S11, ξ_5 = F_T h_hub / K_55.
* The same expression is used in the equations panel, in the moment chart and in the tables.

### Reference frame, and why the CoB moves

All positions are measured in a frame fixed to the structure. The origin is on the platform axis, at the SWL of the upright floating position; x points downwind and z upward. The hydrostatic quantities are computed in the upright position. In the figures and in the positions table, the pitched platform is shown rotated by ξ_5 about O. The 1D model has a single degree of freedom (pitch), so translations of the platform (surge, heave) are not represented.

The two centres behave differently when the platform pitches:

* **CoM.** The masses are rigidly attached to the structure, so the CoM simply rotates with it.
* **CoB.** The CoB is the centroid of the *submerged volume*, and that volume changes shape when the platform tilts. The immersed side gains volume and the emerged side loses it, so the CoB moves towards the immersed side.

For small angles the buoyancy always acts along a vertical through the metacentre M, which is fixed to the structure at z_M = CoB_0^Z + BM, with BM = J/V_s. The horizontal distance CoB^X(ξ_5) − CoM^X(ξ_5) is the lever arm of the righting couple. At the static pitch, this couple balances the thrust moment.

For the spar, BM is only 0.15 m, so the CoB hardly moves. The spar is stable because its CoM is well below its CoB, not because of its waterplane.

Platform-specific formulas:

| | V_s(D) | CoB_0^Z | J | ballast area | A_shell |
|---|---|---|---|---|---|
| Semisub | (π d²/4 + 3 π d_EC²/4) D + 3 L_P W_P H_P | weighted columns + pontoons | 1.5 s_EC² π d_EC²/4 (S14) + π d⁴/64 + 3 π d_EC⁴/64 | 3 π d_EC²/4 | column walls + top/bottom plates + pontoons |
| Spar | π d²/4 · D | −D/2 | π d⁴/64 | π d²/4 | π d L + 2 π d²/4 |
| Barge | W² D | −D/2 | W⁴/12 | W² | 2 W² + 4 W H |

Constants: ρ_w = 1025 kg/m³, ρ_steel = 7850 kg/m³ and g = 9.80665 m/s².

### Failure and warning checks

| Check | Condition | Level |
|---|---|---|
| Invalid geometry | semisub: the external columns overlap the central column, or H_P ≥ H_col | failure |
| No room for ballast | h_b larger than the hull height | failure |
| Sinking | m > ρ_w V_s of the fully submerged hull | failure |
| Static instability | K_55 ≤ 0 (GM ≤ 0): it capsizes even without wind | failure |
| Limit of the linear model | \|ξ_5\| larger than the limit angle (see below): the deck edge goes under water or the keel comes out of the water, so the linear model is no longer valid | failure |
| Blade tip clearance | the lowest blade tip is closer to the SWL than the minimum clearance, upright or at the static pitch | failure |
| Pitch above allowable | \|ξ_5\| > ξ_5,max | warning |
| Low freeboard | FB < 8 m (semisub, spar) or < 3 m (barge) | warning |
| Pontoon emerges (semisub) | the upwind pontoon reaches the surface, so the linear stiffness is only approximate | warning |
| Shallow draft (semisub) | D < H_P, or D < H_P + 3 m | warning / note |

**Blade tip clearance.** The tool checks two cases and keeps the smaller value:

* upright: h_hub − R;
* at the static pitch angle: −x_hub sin ξ_5 + (h_hub − R) cos ξ_5.

h_hub is the hub height above the SWL, R = 121 m and x_hub = −10 m.

**Limit angle of the linear model.** The platform is rotated about O, as in the linear model. Two geometric events end the validity of the linear model, and the smaller angle is the limit. This is where the linear model stops being valid (point P2 on slide 9 of the lecture), not where the platform capsizes (P3):

* the top of the hull goes under water (downwind side): tan ξ_5 = FB / x_down;
* the keel comes out of the water (upwind side): tan ξ_5 = D / x_up.

x_down and x_up are the outer edges of the hull:

| Platform | x_down | x_up |
|---|---|---|
| Semisub | s_EC/2 + d_EC/2 | s_EC + d_EC/2 |
| Spar | d/2 | d/2 |
| Barge | W/2 | W/2 |

### Simplifications

* The model is linear and small-angle. The stiffness is computed at the upright position and the draft does not change while the platform pitches.
* Steel CoM:
  * semisub: at mid-height of the columns;
  * spar: at mid-length;
  * barge: at mid-height of the hull.
* The steel thickness is the same everywhere on the hull.
* The ballast is treated as a solid block. The free-surface effect of liquid ballast (important for the barge!) is neglected.
* Semisub: the columns and pontoons overlap at the keel and their volume is counted twice, as in the exercise.
* The spar has no tapered section, and the barge pedestal is not included in the steel mass.
* The tower mass scales linearly with its height. The constant term of the NREL model is neglected.
* The thrust is horizontal and is applied at the hub. Moments are taken about the still water line, and there are no mooring forces.

---

## 5. Suggested activities

Some activities of earlier versions are now guided exercises: the reference results and the three ways to be stable (HS2), the role of the ballast on the spar and the semisub (HS4, questions 3–4), the barge width (HS4, questions 1–2), and the static pitch of the semisub (HS3). The ones below are not covered by an exercise.

1. **Where is the stability?** In the close-up, look at how far the CoB moves away from CoB₀ on the semisub and the barge, and how little it moves on the spar. Where is M with respect to the CoM in each case? (Follows HS2.)
2. **Waterplane inertia (semisub).** Change s_EC and d_EC by the same percentage. Which one changes J more, and why? (Compare s² with d⁴; see S14 in HS3.)
3. **Barge without ballast.** Set the barge ballast to 0. Why does the barge go beyond the limit of the linear model, although K_55 stays positive? (Follows HS4.)
4. **Spar draft (Exercise 3).** Use the target draft to change the draft of the spar (adjust L so that FB stays 15 m). Find the draft that gives exactly 5° of pitch. What happens with concrete instead of iron ore?
5. **Tower height.** Raise the hub height. The tower gets heavier and the turbine CoM goes up, while the thrust lever arm grows. How fast does the pitch grow? Then lower the hub until the blade clearance check fails.
6. **Steel.** Increase the steel thickness. Does the extra steel help or hurt the stability? Compare a wide semisub with a narrow one: how does the steel mass change?
7. **Ballasting limits.** Increase the ballast until the platform sinks. How large is the reserve buoyancy of each reference design?

---

## 6. Files

| File | Content |
|---|---|
| `index.html` | page layout and tabs (open this one) |
| `style.css` | appearance, light and dark mode |
| `model.js` | **physics only**, commented |
| `app.js` | platform switch, sliders, scenarios, messages, figures (hand-drawn SVG, no external libraries), guided exercises and self-test |
| `CHANGELOG.md` | list of changes between versions |

**For instructors.**

* **Instructor mode.** Open `index.html?instructor` (or `index.html#instructor`). Every exercise then has a **Show solution** button. It fills every answer field with the expected value, marks the questions as solved (also the follow-up ones) and shows a worked solution below the exercise: the steps with the slide labels (S1, S12, …) and the intermediate numbers, in a large font for the projector, with the K_55 bar chart (HS2) or the moment chart (HS3) of the case. Without the flag the button is not there. Suggested use in class: explain the slides named in the exercise, let the students solve it on their laptops in the indicated time, then press Show solution and go through it step by step.
* **Self-test.** Open `index.html?selftest` (or `index.html?selftest&instructor`). A table at the top of the page checks the reference results and the expected answers of the exercises against the values of the course material (within 0.5 %), then answers every exercise as a student would: the expected answer must be accepted and a value 5 % off must be rejected. It also checks the instructor button and that no notation of version 1.1 is left in the page. Run it after any change to the model or to the defaults: a failure means that the results changed.
* The numbers in the exercises are all computed by the model, so they follow any change of the reference design.
* To change a reference design, edit the `DEFAULTS`, `refDraft` and `steelRefMass` of the platform in `model.js`. The default steel thickness and ballast are computed automatically from them.
* To change the turbine data, edit `TURBINE_DEFAULTS` and `TURBINE_REF` in `model.js`.
* To add or change a slider, edit the `groups` of the platform, `TURBINE_GROUP` or `OBJECTIVES_GROUP` in `app.js`. `min`/`max` are the slider range and `hardMin`/`hardMax` the physical limits for typed values.
* To add a scenario, add a line to the `presets` of the platform in `app.js`.
* To change an exercise, edit `buildHS0` … `buildHS4` and `buildHS4plus` in `app.js` (the HS4 targets are the constants `S_EC_FIX`, `XI_MAX`, `D_MIN`).
