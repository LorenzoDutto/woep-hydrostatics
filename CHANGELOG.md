# Changelog

All notable changes to the Floating Wind Hydrostatics Lab are listed here.
The project uses [semantic versioning](https://semver.org/): MAJOR.MINOR.PATCH.

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
