# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

* Bezier & Circular Note example (site only, not part of the npm package)
  * Bezier editor: multiple curves, smooth point and whole-curve dragging, pan with momentum, wheel pan and ctrl/pinch zoom, a grid that moves with the camera
  * Circular markdown note: text wraps into the intersection of two semi-inscribed squares (an octagon), with a scroll wheel on the rim, rendered markdown, in-place editing, a text options toolbar, and a right-click menu (resize, reshape, flow, lock, color, border)
* README: Getting Started section (install, import, CDN)

## [0.2.1] - 2026-9-24

### Fixed

* npm package now ships its TypeScript declarations (the build was deleting them)
* Site assets from `public/` no longer end up in the npm package
* `require("excitejs")` works from CommonJS (Node 22+)
* `observable.ts` / `reactor.ts` filename casing, which broke builds on case-sensitive systems
* Themed Page example crashed on load

### Changed

* Separate package, test and site builds; `npm test` runs the test suite in Node
* npm package also ships the core source, the test suite, and the Directory and Click Counter examples
* Devtools (`window.Excite`) is no longer part of the package entry

### Added

* Example gallery home page, built with ExciteJS itself
* Click Counter example (moved from the old home page)
* Tests for preactions, `trigger()`, pause flags, schedules and priority
* README: corrected demos, a Design Choices section, and the development workflow

## [0.2.0] - 2026-7-17

### Added

* Preactions
* Scheduler
* Extensive list of Examples

### Planned

* JSX/TSX support
* Template literal rendering


## [0.1.0] - 2026-06-05

### Added

* Observable reactive state system
* Reactor dependency tracking system
* Automatic dependency detection
* Explicit dependency support
* Pause and resume functionality
* Priority control for reactors
* DOM clicker example
* TypeScript type declarations
* npm package publishing support

### Planned

* Scheduler
* JSX/TSX support
* Template literal rendering
