# Floating Wind Hydrostatics Lab

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
2. Open the folder `Exercise_OffshoreStructures/Interactive_Hydrostatics/`.
3. **Double-click `index.html`.** It opens in your default browser (Chrome, Firefox, Edge or Safari).

Keep the four files (`index.html`, `style.css`, `model.js` and `app.js`) in the same folder. The page needs all of them.

> If the page opens but nothing moves or no figures appear, use another browser (any recent Chrome, Firefox or Edge works). The tool needs no server.

---

## 2. The platforms

Use the **Semisub | Spar | Barge** switch at the top of the page. Each platform keeps its own settings, so you can switch back and forth and compare them. The turbine settings (thrust, hub height, etc.) are shared by all three.

The reference designs are those of `exercise_statics.m` (Exercises 1–4) and of the files `Semisub.mat`, `Spar.mat` and `Barge.mat`.

| | Semisubmersible (Ex. 1–2) | Spar (Ex. 3) | Barge (Ex. 4) |
|---|---|---|---|
| Hull | central column d = 12 m; 3 external columns d_EC = 13 m at s_EC = 50 m; pontoons 9 × 6 m | one cylinder, d = 16 m, length L = 119 m | square box, W = 52 m, hull height H = 14 m |
| Ballast | concrete (2 400 kg/m³) at the bottom of the 3 external columns, plus pontoons full of sea water | iron ore (5 000 kg/m³) at the bottom of the spar | sea water (1 025 kg/m³) at the bottom of the hull |
| Steel mass | 3 500 t | 4 000 t | 3 000 t |
| Reference draft | 18 m | 104 m | 7 m |
| Tower base | on the central column, at z = FB | on top of the spar, at z = FB | on an 8 m pedestal on the deck, at z = FB + 8 m |

The tower base is at +15 m above the still water line (SWL) in all three reference designs. So the hub is at 150 m and the turbine centre of mass at 110 m, as in the MATLAB script. If the draft changes, the tower base moves with the freeboard, and the hub height above the sea changes too.

Turbine data: 2 100 t, thrust 2 MN. The rotor radius is R = 121 m (117 m blade + 4 m hub) and the hub overhang is 10 m upwind (from `Rotor15MW.mat` and the `par` structure of the `.mat` files).

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

On a laptop screen the page is a dashboard. The controls are on the left. On the right, the messages, one row of result cards and all four figures fit on one screen, so you never need to scroll while you play. Scroll down only to see the tables and the equations. On narrow screens (below about 1000 px wide), everything stacks in one column instead.

### Controls (left panel)

The sliders are grouped into **foldable menus**: *Platform geometry*, *Masses and ballast*, *Turbine and load* and *Design helper*. Click a title to open or close it. If you open several menus, the left panel scrolls by itself while the figures stay in place. Drag a slider or type a value into the box next to it.

| Platform | Geometry sliders | Masses and ballast sliders |
|---|---|---|
| Semisub | d, d_EC, s_EC, column height H_col, pontoon height H_P, pontoon width W_P | concrete ballast M_b, its density ρ_b, pontoon water filling, steel mass |
| Spar | diameter d, length L (keel to top) | solid ballast M_b, its density ρ_b, steel mass |
| Barge | width W, hull height H, pedestal height | ballast M_b, its density ρ_b (1 025 = water), steel mass |

The turbine sliders are the same for all platforms:

| Control | Reference value |
|---|---|
| Maximum rotor thrust F_T | 2 MN |
| Turbine mass (RNA + tower) | 2 100 t |
| Hub height above tower base | 135 m (= 150 m above SWL) |
| Turbine COM above tower base | 95 m (= 110 m above SWL) |
| **Minimum blade tip clearance** | **20 m** |
| Allowable static pitch θ_max | 10° |

**Scale with hull surface area** (checkbox under the steel mass). When it is on, the steel mass is no longer an input. The tool scales it with the area of the hull shell, assuming a constant plate thickness. Bigger platforms then need more steel.

**Design helper (target draft).** Enter a draft and press **Set ballast**. The tool computes the ballast that gives that draft with the current geometry. This is the original MATLAB exercise solved the other way round.

**Scenario** menu (top right). It loads ready-made cases for the current platform: unstable, capsizing, sinking, no room for ballast, blade clearance, … **Reset to reference** restores the original exercise for the current platform and the default turbine.

### Results (right side)

* **Messages.** Green means the design works. Blue is a note. Yellow is a warning: the platform floats but has a problem. Red is a failure.
* **Result cards** (one row). They show:
  * draft D;
  * static pitch θ;
  * **waterplane inertia J**;
  * total mass;
  * ballast height h_b;
  * metacentric height GM;
  * pitch stiffness K;
  * capsize angle.

  Each card also shows the value of the reference design. Watch J when you change the column diameters or spacing, or the barge width.
* **Platform close-up.** It shows the hull at the computed pitch angle, with the ballast and:
  * the **CoM of the whole device** (platform + ballast + turbine), with the weight arrow;
  * the **CoB** (centroid of the submerged volume), with the buoyancy arrow;
  * the **metacentre M**, with the line of action of the buoyancy (dashed);
  * **CoB₀** (small dashed circle): where the CoB would be if it were fixed to the hull. The distance between CoB₀ and the CoB shows how the CoB moves when the platform tilts;
  * the **lever arm** X_CoB − X_CoM of the righting couple (top-right).
* **Whole turbine** (right). It also shows the CoM, the CoB and M. The thrust arrow is at the hub. The dashed line at 20 m is the **minimum blade tip clearance**. It turns red when the blades come too close to the sea.
* **Top view.** It shows the platform footprint at a fixed scale, so you can see it grow or shrink.
* **Pitch moment balance.** The restoring moment K·θ (blue) and the overturning moment (red) are plotted against the pitch angle. Where they cross is the static pitch. The yellow dashed line is the allowable angle and the red dashed line is the capsize angle.
* **Full screen.** Every figure has a **⛶** button in its title bar. It enlarges the figure over the whole results area.
  * The slider panel stays visible, so you can keep changing the platform and watch the enlarged figure update. This is useful when projecting in class.
  * Press **Esc** or the **✕** button to go back.
* **Tables** (scroll down):
  * the mass budget;
  * all the hydrostatic quantities (D, FB, V_s, A_wp, J, z_CoB, z_CoM, BM, z_M, GM, K_h, K_g, C_33, tip clearance, …);
  * **structure frame vs. earth frame**: the coordinates of CoM, CoB, M and hub, upright and at the static pitch, in both frames. It also gives the lever arm and the righting couple M g (X_CoB − X_CoM), which equals the thrust moment.
* **Equations used** (scroll down). Click to expand the formulas for the current platform.

---

## 4. The model (1D hydrostatics)

The formulas are the same as in `exercise_statics.m`. The difference is that the draft is now an **output**:

| | MATLAB exercise | This tool |
|---|---|---|
| Input | target draft D | ballast mass M_b |
| Output | ballast mass and height | draft D, then the static pitch |

Steps, the same for every platform:

1. **Heave equilibrium:** ρ_w V_s(D) = M_tot gives the draft D.
2. **Freeboard:** FB = (hull height) − D. The tower base, the hub and the turbine CoM move with it.
3. **Ballast height** h_b = M_b / (ρ_b · ballast area). It must fit in the hull.
4. **CoB and CoM:**
   * z_CoB: volume-weighted average of the submerged volume, upright;
   * z_CoM, x_CoM: mass-weighted average of the whole device (platform + ballast + turbine).
5. **Pitch stiffness:** K = ρ_w g (J + V_s z_CoB) − M g z_CoM = ρ_w g V_s · GM, with GM = z_M − z_CoM and z_M = z_CoB + J/V_s.
6. **Static pitch:** θ = (F_T h_hub + x_CoM M g) / K

### Two reference frames, and why the CoB moves

Both frames have x/X downwind and z/Z upward.

* **Structure frame (x, z).** It is fixed to the platform. The origin is on the platform axis, at the still water line of the upright position. It rotates with the platform. All the quantities above are computed in this frame, upright, as in the MATLAB script.
* **Earth frame (X, Z).** It is fixed to the ground, with the origin at the still water line. At a pitch angle θ, a point of the structure moves to:

  X = x cos θ + z sin θ, &nbsp; Z = −x sin θ + z cos θ

The two centres behave differently when the platform pitches:

* **CoM.** The masses are rigidly attached to the structure. So the CoM has fixed structure coordinates and simply rotates with the platform.
* **CoB.** The CoB is the centroid of the *submerged volume*, and that volume changes shape when the platform tilts. The immersed side gains a wedge of volume and the emerged side loses one, so the CoB moves towards the immersed side. It is *not* a point fixed to the hull.

For small angles (the same assumption behind K), the CoB moves on an arc of radius BM = J/V_s around the metacentre M. M is fixed in the structure, at z_M = z_CoB + BM. The CoB positions are:

* structure frame: (BM sin θ, z_M − BM cos θ);
* earth frame: (z_M sin θ, z_M cos θ − BM), always directly below M.

The weight acts at the CoM and the buoyancy at the CoB. Their horizontal distance in the earth frame is the lever arm of the **righting couple**:

M g (X_CoB − X_CoM) ≈ ρ_w g V_s (z_M − z_CoM) θ − x_CoM M g = K θ − x_CoM M g

At the static pitch, this couple balances the thrust moment F_T h_hub. The table *structure frame vs. earth frame* shows it numerically.

Two checks of the arc formula:

* For a wall-sided box (the barge), the exact centroid of the tilted submerged volume is (BM tan θ, z_CoB + BM tan²θ / 2). This matches the arc formula to second order: (2.188, −3.426) m vs (2.183, −3.426) m for the reference barge.
* For the spar, BM is only 0.15 m, so the CoB hardly moves inside the structure. The spar is stable because its CoM is well below its CoB, not because of its waterplane.

Platform-specific formulas:

| | V_s(D) | z_CoB | J | ballast area |
|---|---|---|---|---|
| Semisub | (π d²/4 + 3 π d_EC²/4) D + 3 L_P W_P H_P | weighted columns + pontoons | 1.5 s_EC² π d_EC²/4 + π d⁴/64 + 3 π d_EC⁴/64 | 3 π d_EC²/4 |
| Spar | π d²/4 · D | −D/2 | π d⁴/64 | π d²/4 |
| Barge | W² D | −D/2 | W⁴/12 | W² |

Constants: ρ_w = 1025 kg/m³ and g = 9.80665 m/s².

**Check against MATLAB.** The pitch lines marked `%Complete` in `exercise_statics.m` were filled in with the Exercise 2 formula. With the reference inputs, the tool and MATLAB give the same values:

| | Ballast | h_b | J | K | Static pitch |
|---|---|---|---|---|---|
| Semisub | 3 833 378 kg | 4.01 m | 502 970 m⁴ | 2.61 GN·m/rad | 5.68° |
| Spar | 15 333 202 kg | 15.25 m | 3 217 m⁴ | 3.07 GN·m/rad | 4.82° |
| Barge | 14 301 200 kg | 5.16 m | 609 301 m⁴ | 3.81 GN·m/rad | 3.89° |

### Failure and warning checks

| Check | Condition | Level |
|---|---|---|
| Invalid geometry | semisub: the external columns overlap the central column, or H_P ≥ H_col | failure |
| No room for ballast | h_b larger than the hull height | failure |
| Sinking | M_tot > ρ_w V_s of the fully submerged hull | failure |
| Static instability | K ≤ 0 (GM ≤ 0): it capsizes even without wind | failure |
| Capsize under thrust | \|θ\| larger than the capsize angle (see below) | failure |
| **Blade tip clearance** | the lowest blade tip is closer to the SWL than the minimum clearance (default 20 m), upright or at the static pitch | failure |
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

### Simplifications (to discuss in class)

* The model is linear and small-angle. The stiffness is computed at the upright position and the draft does not change while the platform pitches.
* Steel centre of mass:
  * semisub: at mid-height of the columns;
  * spar: at mid-length;
  * barge: at mid-height of the hull (this is z = 0 for the reference, as in MATLAB).
* The ballast is treated as a solid block. The free-surface effect of liquid ballast (important for the barge!) is neglected.
* Semisub: the columns and pontoons overlap at the keel and their volume is counted twice, as in the MATLAB script.
* The spar has no tapered section, and the barge pedestal mass is included in the steel mass.
* The thrust is horizontal and is applied at the hub. Moments are taken about the still water line, and there are no mooring forces.

---

## 5. Suggested activities

1. **Reference designs.** Check the MATLAB results on all three platforms: θ ≈ 5.7° (semisub), 4.8° (spar), 3.9° (barge).
2. **Three ways to be stable.** Compare J, z_CoB, z_CoM, K_h and K_g of the three references (tables). Which platform relies on its waterplane? Which one on a low CoM?
   * In the close-up, look at how far the CoB moves away from CoB₀ on the semisub and the barge, and how little it moves on the spar.
   * Where is M with respect to the CoM in each case?
   * Why does the spar CoB move *upwind* in the earth frame while the platform leans downwind? (Look at the frames table: the whole deep hull swings upwind.)
3. **Waterplane inertia (semisub).** Change s_EC and d_EC by the same percentage. Which one changes J more, and why? (Compare s² with d⁴.)
4. **Role of the ballast.** Set the ballast to 0 on each platform. Why does the semisub pitch *increase*? Why does the spar become unstable? Why does the barge capsize?
5. **Spar draft (Exercise 3).** Use the design helper to change the draft of the spar (adjust L so that FB stays 15 m). Find the draft that gives exactly 5° of pitch. What happens with concrete instead of iron ore?
6. **Barge width (Exercise 4).** Find the smallest W that keeps the static pitch below 5°. Where does the barge become unstable?
7. **Blade clearance.** Lower the hub height until the blade clearance check fails. On which platform does a deeper draft (smaller freeboard) bring the blades closer to the sea?
8. **Ballasting limits.** Increase the ballast until the platform sinks. How large is the reserve buoyancy of each reference design?
9. **Realistic steel.** Turn on *scale with hull surface area*. Is a wide semisub or barge still "free"?

---

## 6. Files

| File | Content |
|---|---|
| `index.html` | page layout (open this one) |
| `style.css` | appearance, light and dark mode |
| `model.js` | **physics only**, commented, to read next to `exercise_statics.m` |
| `app.js` | platform switch, sliders, scenarios, messages, figures (hand-drawn SVG, no external libraries) |

**For instructors.**

* To change a reference design, edit the `DEFAULTS` and `refDraft` of the platform in `model.js`. The default ballast is computed automatically from `refDraft`.
* To change the turbine data, edit `TURBINE_DEFAULTS` in `model.js`.
* To add or change a slider, edit the `groups` of the platform (or `TURBINE_GROUP`) in `app.js`.
* To add a scenario, add a line to the `presets` of the platform in `app.js`.
