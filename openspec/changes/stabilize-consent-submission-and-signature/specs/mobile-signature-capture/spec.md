# Mobile Signature Capture Specification

## Purpose

Keep an in-progress public signature usable and intact when a mobile viewport, orientation, or device-pixel ratio changes.

## Requirements

### Requirement: Stable display and backing-surface sizing

The signature surface MUST derive its display size from stable layout dimensions and MUST size its backing surface for the active device-pixel ratio. A sizing change MUST NOT clear the logical signature or falsely report that no stroke exists.

#### Scenario: Size for the active pixel ratio

- GIVEN the signature surface has stable non-zero layout dimensions
- WHEN it is initialized at the active device-pixel ratio
- THEN its displayed dimensions match the layout dimensions
- AND its backing dimensions provide the corresponding device-pixel resolution

#### Scenario: Change device-pixel ratio

- GIVEN an in-progress signature contains one or more strokes
- WHEN the active device-pixel ratio changes and the surface is resized
- THEN the logical strokes remain present
- AND the signature remains marked as containing strokes

### Requirement: Preserve strokes across viewport changes

The signature surface MUST preserve or redraw all logical stroke data across viewport resize and orientation changes. Preserved strokes MUST retain their relative path and placement within the resized signing area and MUST remain eligible for submission.

#### Scenario: Preserve strokes after viewport resize

- GIVEN the user has drawn an in-progress signature
- WHEN the mobile viewport changes size
- THEN every existing logical stroke remains represented on the resized surface
- AND the signature remains eligible for submission

#### Scenario: Preserve strokes after orientation change

- GIVEN the user has drawn multiple strokes in portrait orientation
- WHEN the device changes to landscape orientation or back to portrait
- THEN the strokes are redrawn without being discarded
- AND their relative path and placement are preserved

#### Scenario: Preserve strokes across combined resize and pixel-ratio change

- GIVEN the user has drawn an in-progress signature
- WHEN orientation, viewport dimensions, and device-pixel ratio change in the same sizing cycle
- THEN the resulting surface contains the same logical strokes exactly once
- AND no resize event clears or duplicates the signature

### Requirement: Mobile drawing and controls remain usable

The signature surface MUST support pointer and touch drawing after initialization and after any resize. Interactive signature controls MUST provide a touch target of at least 44 by 44 CSS pixels.

#### Scenario: Continue drawing after resize

- GIVEN existing strokes have survived a resize
- WHEN the user adds a stroke using touch or pointer input
- THEN the new stroke is captured together with the preserved strokes
- AND input continues without an unintended clear

#### Scenario: Use signature controls on a narrow viewport

- GIVEN the public wizard is displayed at a 375 CSS-pixel viewport width
- WHEN signature controls are presented
- THEN each interactive control has a touch target at least 44 CSS pixels wide and 44 CSS pixels high
- AND the signing surface remains usable in portrait and landscape orientations
