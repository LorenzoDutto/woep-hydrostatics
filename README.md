# Floating Wind Hydrostatics Lab

**Version 1.1.0.** See [CHANGELOG.md](CHANGELOG.md) for the changes between versions.

An interactive tool for the course **Wind and Ocean Energy Plants**. It belongs to the exercise on the hydrostatics of floating offshore wind turbines.

You choose one of three platforms for the same 15 MW turbine and redesign it with sliders:

* a **semisubmersible** (4 columns, VolturnUS-S-like);
* a **spar**;
* a **barge**.

After every change the tool computes:

* the **heave equilibrium**: the draft at which buoyancy balances the total weight;
* the **static pitch angle** under the maximum rotor thrust;
* whether the design **fails**:
  * no room for the ballast;
  * the platform sinks;
  * it is statically unstable;
  * it capsizes under the thrust;
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

On a laptop screen the page is a dashboard. The controls are on the left. On the right, the messages, one row of summary cards and all four figures fit on one screen, so you never need to scroll while you play. Scroll down only to see the tables and the equations. On narrow screens (below about 1000 px wide), everything stacks in one column instead.

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
| Allowable static pitch θ_max | 10° |
| Minimum blade tip clearance | 20 m |
| Target draft + **Set ballast** | computes the ballast that gives that draft with the current geometry (the original exercise solved the other way round) |

**Scenario** menu (top right). It loads ready-made cases for the current platform: unstable, capsizing, sinking, no room for ballast, blade clearance, … **Reset to reference** restores the reference design of the current platform and the default turbine.

### Results (right side)

* **Messages.** Green means the design works. Blue is a note. Yellow is a warning: the platform floats but has a problem. Red is a failure.
* **Summary cards** (one row, two groups with different border colours):
  * **Inputs to the hydrostatics** (green border). These are the properties that follow directly from your design choices: total mass, steel mass, ballast height h_b and waterplane inertia J. Watch J when you change the column diameters or spacing, or the barge width.
  * **Outputs** (blue border). These are the equilibrium and stability results: draft D, static pitch θ, metacentric height GM, pitch stiffness K and capsize angle.

  Each card also shows the value of the reference design.
* **Platform close-up.** It shows the hull at the computed pitch angle, with the ballast and:
  * the **CoM of the whole device** (platform + ballast + turbine), with the weight arrow;
  * the **CoB** (centroid of the submerged volume), with the buoyancy arrow;
  * the **metacentre M**, with the line of action of the buoyancy (dashed);
  * **CoB₀** (small dashed circle): where the CoB would be if it were fixed to the hull. The distance between CoB₀ and the CoB shows how the CoB moves when the platform tilts;
  * the **lever arm** X_CoB − X_CoM of the righting couple.
* **Whole turbine** (right). It also shows the CoM, the CoB and M. The thrust arrow is at the hub. The dashed line is the **minimum blade tip clearance**. It turns red when the blades come too close to the sea.
* **Top view.** It shows the platform footprint at a fixed scale, so you can see it grow or shrink.
* **Pitch moment balance.** The restoring moment K·θ (blue) and the overturning moment M_ext (red) are plotted against the pitch angle. Where they cross is the static pitch. The yellow dashed line is the allowable angle and the red dashed line is the capsize angle.
* **Full screen.** Every figure has a **⛶** button in its title bar. It enlarges the figure over the whole results area.
  * The slider panel stays visible, so you can keep changing the platform and watch the enlarged figure update. This is useful when projecting in class.
  * Press **Esc** or the **✕** button to go back.
* **Tables** (scroll down):
  * the mass budget (RNA, tower, steel and ballast, each with its mass and position);
  * all the hydrostatic quantities (D, FB, V_s, A_wp, J, z_CoB, z_CoM, BM, z_M, GM, K_h, K_g, C_33, M_ext, tip clearance, …);
  * the positions of CoM, CoB, M and hub, upright and at the static pitch, relative to the structure and to the ground, with the lever arm and the righting couple.
* **Equations used** (scroll down). Click to expand the formulas for the current platform.

---

## 4. The model (1D hydrostatics)

The tool uses the formulas of the exercise.
| Input | ballast mass M_b |
| Output | draft D, then the static pitch |

Steps, the same for every platform:

1. **Masses:** M_tot = M_RNA + M_tower + M_steel + M_ballast (+ the water in the pontoons for the semisub), with M_steel = ρ_steel A_shell t_s.
2. **Heave equilibrium** (vertical force balance): buoyancy = weight, ρ_w g V_s = M_tot g.
   * V_s is a known function of the draft D through the hull dimensions. M_tot does not depend on D. Solving for D gives the draft.
   * Spar: ρ_w (π d²/4) D = M_tot, so D = 4 M_tot / (ρ_w π d²).
   * Barge: D = M_tot / (ρ_w W²).
   * Semisub: D = (M_tot/ρ_w − 3 L_P W_P H_P) / A_wp.
3. **Freeboard:** FB = (hull height) − D. The tower base, the hub and the turbine CoM move with it.
4. **Ballast height** h_b = M_b / (ρ_b · ballast area). It must fit in the hull.
5. **CoB and CoM:**
   * z_CoB: volume-weighted average of the submerged volume, upright;
   * z_CoM, x_CoM: mass-weighted average of the whole device (platform + ballast + turbine).
6. **Pitch stiffness K** (definition below).
7. **Static pitch:** moment balance about the origin, K θ = M_ext, so θ = M_ext / K.

### Turbine mass and CoM vs. tower height

The RNA (blades + hub + nacelle) does not depend on the tower:

* M_RNA = 1 060 t (680 t nacelle + 180 t hub + 3 × 66.1 t blades from the `.mat` files, rounded);
* its CoM is at hub height, 3.96 m upwind.

The tower mass grows linearly with the hub height h_t above the tower base. This is the form of the NREL wind turbine cost and scaling model (Fingersh, Hand & Laxson, 2006, NREL/TP-500-40566): there the tower mass is proportional to (swept area) × (hub height), so for a fixed rotor it is proportional to the hub height.

* M_tower = 1 040 t · h_t / 135 m;
* its CoM is at 0.40 · h_t (a tapered tower has its CoM below mid-height).

The two constants are calibrated so that, for h_t = 135 m, the turbine is exactly the one of the exercise: 2 100 t, CoM 95 m above the tower base, x_CoM = −2 m. A taller tower therefore makes the turbine heavier and raises its CoM. For example, at h_t = 160 m the turbine weighs 2 293 t with its CoM at 108.5 m.

### Pitch restoring stiffness K

In the general 6-DOF description, the restoring forces of a floating body come from a 6 × 6 stiffness matrix C (hydrostatics + gravity, plus mooring). The 1D approach keeps only the pitch degree of freedom: the rotation about the y axis through the origin (DOF 5). So C reduces to its pitch–pitch term:

K = C_55 = ρ_w g (J + V_s z_CoB) − M_tot g z_CoM = ρ_w g V_s · GM, with GM = z_M − z_CoM and z_M = z_CoB + J/V_s

* The couplings with the other DOFs and the mooring stiffness are neglected.
* K gives the restoring moment for a small pitch angle: M_restoring = K θ.
* The first term (K_h) comes from the waterplane and the buoyancy; the second (K_g) from the weight.

### Overturning moment

M_ext = F_T h_hub + M_tot g (x_CoM − x_CoB)

* The first term is the moment of the thrust, applied at the hub height above the SWL.
* The second term is the couple of weight and buoyancy (equal in size at heave equilibrium) when CoM and CoB are not on the same vertical in the upright position.
* For these symmetric hulls x_CoB = 0. x_CoM < 0 because of the overhanging rotor, so this couple slightly reduces the pitch.
* The same expression is used in the equations panel, in the moment chart and in the tables.

### Reference frame, and why the CoB moves

All positions are measured in a frame fixed to the structure. The origin is on the platform axis, at the SWL of the upright floating position; x points downwind and z upward. The hydrostatic quantities are computed in the upright position. In the figures and in the positions table, the pitched platform is shown rotated by θ about this origin. The 1D model has a single degree of freedom (pitch), so translations of the platform (surge, heave) are not represented.

The two centres behave differently when the platform pitches:

* **CoM.** The masses are rigidly attached to the structure, so the CoM simply rotates with it.
* **CoB.** The CoB is the centroid of the *submerged volume*, and that volume changes shape when the platform tilts. The immersed side gains volume and the emerged side loses it, so the CoB moves towards the immersed side.

For small angles the buoyancy always acts along a vertical through the metacentre M, which is fixed to the structure at z_M = z_CoB + BM, with BM = J/V_s. The horizontal distance between CoB and CoM is the lever arm of the righting couple. At the static pitch, this couple balances the thrust moment.

For the spar, BM is only 0.15 m, so the CoB hardly moves. The spar is stable because its CoM is well below its CoB, not because of its waterplane.

Platform-specific formulas:

| | V_s(D) | z_CoB | J | ballast area | A_shell |
|---|---|---|---|---|---|
| Semisub | (π d²/4 + 3 π d_EC²/4) D + 3 L_P W_P H_P | weighted columns + pontoons | 1.5 s_EC² π d_EC²/4 + π d⁴/64 + 3 π d_EC⁴/64 | 3 π d_EC²/4 | column walls + top/bottom plates + pontoons |
| Spar | π d²/4 · D | −D/2 | π d⁴/64 | π d²/4 | π d L + 2 π d²/4 |
| Barge | W² D | −D/2 | W⁴/12 | W² | 2 W² + 4 W H |

Constants: ρ_w = 1025 kg/m³, ρ_steel = 7850 kg/m³ and g = 9.80665 m/s².

### Failure and warning checks

| Check | Condition | Level |
|---|---|---|
| Invalid geometry | semisub: the external columns overlap the central column, or H_P ≥ H_col | failure |
| No room for ballast | h_b larger than the hull height | failure |
| Sinking | M_tot > ρ_w V_s of the fully submerged hull | failure |
| Static instability | K ≤ 0 (GM ≤ 0): it capsizes even without wind | failure |
| Capsize under thrust | \|θ\| larger than the capsize angle (see below) | failure |
| Blade tip clearance | the lowest blade tip is closer to the SWL than the minimum clearance, upright or at the static pitch | failure |
| Pitch above allowable | \|θ\| > θ_max | warning |
| Low freeboard | FB < 8 m (semisub, spar) or < 3 m (barge) | warning |
| Pontoon emerges (semisub) | the upwind pontoon reaches the surface, so the linear stiffness is only approximate | warning |
| Shallow draft (semisub) | D < H_P, or D < H_P + 3 m | warning / note |

**Blade tip clearance.** The tool checks two cases and keeps the smaller value:

* upright: h_hub − R;
* at the static pitch angle: −x_hub sin θ + (h_hub − R) cos θ.

h_hub is the hub height above the SWL, R = 121 m and x_hub = −10 m.

**Capsize angle.** The platform is rotated about the still water line, as in the linear model. Two geometric events limit the angle, and the smaller one is the capsize angle:

* the top of the hull goes under water (downwind side): tan θ = FB / x_down;
* the keel comes out of the water (upwind side): tan θ = D / x_up.

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

1. **Reference designs.** Check the reference results on all three platforms: θ ≈ 5.7° (semisub), 4.8° (spar), 3.9° (barge).
2. **Three ways to be stable.** Compare J, z_CoB, z_CoM, K_h and K_g of the three references (tables). Which platform relies on its waterplane? Which one on a low CoM?
   * In the close-up, look at how far the CoB moves away from CoB₀ on the semisub and the barge, and how little it moves on the spar.
   * Where is M with respect to the CoM in each case?
3. **Waterplane inertia (semisub).** Change s_EC and d_EC by the same percentage. Which one changes J more, and why? (Compare s² with d⁴.)
4. **Role of the ballast.** Set the ballast to 0 on each platform. Why does the semisub pitch *increase*? Why does the spar become unstable? Why does the barge capsize?
5. **Spar draft (Exercise 3).** Use the target draft to change the draft of the spar (adjust L so that FB stays 15 m). Find the draft that gives exactly 5° of pitch. What happens with concrete instead of iron ore?
6. **Barge width (Exercise 4).** Find the smallest W that keeps the static pitch below 5°. Where does the barge become unstable?
7. **Tower height.** Raise the hub height. The tower gets heavier and the turbine CoM goes up, while the thrust lever arm grows. How fast does the pitch grow? Then lower the hub until the blade clearance check fails.
8. **Steel.** Increase the steel thickness. Does the extra steel help or hurt the stability? Compare a wide semisub with a narrow one: how does the steel mass change?
9. **Ballasting limits.** Increase the ballast until the platform sinks. How large is the reserve buoyancy of each reference design?

---

## 6. Files

| File | Content |
|---|---|
| `index.html` | page layout (open this one) |
| `style.css` | appearance, light and dark mode |
| `model.js` | **physics only**, commented |
| `app.js` | platform switch, sliders, scenarios, messages, figures (hand-drawn SVG, no external libraries) |
| `CHANGELOG.md` | list of changes between versions |

**For instructors.**

* To change a reference design, edit the `DEFAULTS`, `refDraft` and `steelRefMass` of the platform in `model.js`. The default steel thickness and ballast are computed automatically from them.
* To change the turbine data, edit `TURBINE_DEFAULTS` and `TURBINE_REF` in `model.js`.
* To add or change a slider, edit the `groups` of the platform, `TURBINE_GROUP` or `OBJECTIVES_GROUP` in `app.js`. `min`/`max` are the slider range and `hardMin`/`hardMax` the physical limits for typed values.
* To add a scenario, add a line to the `presets` of the platform in `app.js`.
