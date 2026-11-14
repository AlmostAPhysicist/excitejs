// main.ts
//
// Pan & Zoom: a full-screen canvas camera for mouse, trackpad, touch, pen
// and keyboard.
//
//   camera.ts        Camera: input → a view of the world (reusable)
//   layer.ts         Layer: view → pixels, blitting on pans; hands paint() a Brush (reusable)
//   spatial_grid.ts  SpatialGrid: world space cut into cells; which items are within a rect, or at a point (reusable)
//   palette.ts       Hubble colors as an Observable, and the `theme` Observable
//   theme_toggle.ts  the day/night switch (by Hari Bro on Uiverse, MIT)
//   scene.ts         the demo world: shapes, SVGs, photos, text, a fractal
//   demo.ts          wiring, readouts, toolbar, minimap

import { PanZoomDemo } from "./demo.ts";

PanZoomDemo();
