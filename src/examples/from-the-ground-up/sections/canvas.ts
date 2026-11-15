// sections/canvas.ts
//
// Section 4: a canvas that pans and zooms, built by hand, then the example's
// Camera and Layer. Section 5: the Ising model, from one arrow. Section 6:
// where to find things.

import camera_src from "../../pan-zoom/camera.ts?raw";
import layer_src from "../../pan-zoom/layer.ts?raw";
import ising_src from "../../ising-model/ising.ts?raw";
import lattice_layer_src from "../../ising-model/canvas/lattice_layer.ts?raw";
import sprites_src from "../../ising-model/canvas/sprites.ts?raw";
import { Exercise, Fold, Note, Section, Snippet, Source } from "../kit.ts";
import { Lab } from "../lab/lab.ts";

const CAMERA = "src/examples/pan-zoom/camera.ts";
const LAYER = "src/examples/pan-zoom/layer.ts";
const ISING = "src/examples/ising-model/";

export const canvasSection = () => Section("canvas", "A canvas that pans and zooms",
    "This section builds dragging, zooming, easing and momentum for a canvas in about a hundred lines, then shows the Camera and Layer from the Pan & Zoom example, which do the same with more input devices and less repainting.", [

    "## goal | The finished canvas",
    Lab("camera", {
        peek: true, observers: "none", result: "above",
        text: `<p>Click the canvas, then drag it. Scroll or pinch to zoom; release a drag while moving and it keeps going. This is the Camera from the <a href="../pan-zoom/index.html">Pan &amp; Zoom</a> example.</p><p>The next part builds a smaller version of it.</p>`,
    }),

    "## steps | Step by step",
    Lab("canvas", {
        result: "above", observers: "closed",
        text: `<p>Four circles on a grid. Each step adds one behaviour.</p>`,
        steps: [
            { title: "Drawing through a view", text: `<p>The circles have fixed positions in <em>world</em> coordinates. <code>view</code> says which world point is at the middle of the canvas and how many pixels one world unit covers. <code>toScreen</code> and <code>toWorld</code> convert between world coordinates and canvas pixels using it.</p><p><code>view</code> is an Observable and the drawing is a Reactor that reads it. The later steps change the view from pointer and wheel handlers; with this arrangement those handlers only assign <code>view.value</code>, and the picture is redrawn because the Reactor depends on it.</p><p>Nothing moves yet. Edit the initial view, for example <code>x: 100</code> or <code>scale: 2</code>, to see the effect.</p>` },
            { title: "Dragging", text: `<p>While the pointer is pressed, each move shifts the view by the distance the pointer travelled, divided by the scale (at twice the scale, a pixel covers half as much of the world).</p><p>The handler assigns <code>view.value</code> and contains no drawing code.</p>` },
            { title: "Zooming about the pointer", text: `<p>When zooming, the world point under the pointer should stay under the pointer. <code>placeAt(wx, wy, sx, sy, s)</code> returns the view that shows a given world point at a given screen point at scale <code>s</code>. The wheel handler looks up the world point under the pointer, computes the new scale, and calls it.</p><p>Hold Ctrl and scroll over the canvas, or pinch on a trackpad. The buttons zoom about the middle.</p>` },
            { title: "Easing toward a target", text: `<p>The zoom in step 3 jumps. Now the wheel and the buttons change a second view, <code>target</code>, and a <code>requestAnimationFrame</code> loop moves <code>view</code> part of the way toward it each frame, stopping when it arrives.</p><p>The loop does not move <code>x</code>, <code>y</code> and <code>scale</code> independently, because then the point under the pointer drifts away during the animation and returns at the end. It moves the scale by a ratio and the world point under the anchor in a straight line, then rebuilds the view from those with <code>placeAt</code>, which keeps the anchored point exactly in place in every frame.</p><p>Dragging sets <code>view</code> and <code>target</code> together, so a drag is not delayed.</p>` },
            { title: "Momentum", text: `<p>The drag handler records how far the last move went. After release, <code>coast</code> keeps shifting the view by that amount each frame, reduced by 6% per frame, until it is under a third of a pixel.</p>` },
        ],
        tour: [
            ["view", "The view", `<p>One Observable holding <code>x</code>, <code>y</code> and <code>scale</code>. A change to any of them is one assignment and so one repaint.</p>`],
            ["convert", "World and screen coordinates", `<p>Both functions take the view as an optional third argument, so they can also convert for the target view.</p>`],
            ["paint", "The drawing", `<p>A Reactor that depends on <code>view</code> and <code>colors</code>.</p>`],
            ["place", "placeAt", `<p>Used by the wheel handler, the buttons and the easing loop.</p>`],
            ["ease", "The target and the frame loop", `<p><code>steer</code> sets the target and starts the loop if it is not running. The loop stops itself when the view has reached the target, so nothing runs while the canvas is still.</p>`],
            ["drag", "Dragging", `<p>Moves the view and the target together.</p>`],
            ["fling", "Momentum", `<p>A second loop, started on release.</p>`],
            ["wheel", "Zooming", `<p>Changes the target about a screen point.</p>`],
        ],
    }),
    Exercise(`<p><strong>A Home button.</strong> In step 4 or 5, add a button that eases the view back to <code>{ x: 0, y: 0, scale: 1 }</code>.</p>`,
        `<p>Next to the zoom buttons. <code>steer</code> takes the view to go to and the screen point to keep fixed.</p>`,
        Snippet(`row.append(Button("Home", () => steer({ x: 0, y: 0, scale: 1 }, w / 2, h / 2)));`)),

    "## blit | Repainting only what changed",
    Lab("blit", {
        result: "above", observers: "closed",
        text: `<p>Eight thousand dots that can be dragged. The line under the canvas reports how many dots each repaint drew and how long it took.</p>`,
        steps: [
            { title: "The whole canvas on every move", text: `<p>All drawing goes through <code>paintRegion</code>, which draws the dots that overlap a given rectangle and clips to it. The Reactor calls it for the whole canvas on every change of <code>offset</code>, so each drag frame draws a few hundred dots.</p>` },
            { title: "Shift the picture, paint the uncovered strips", text: `<p>After a drag of a few pixels, most of the new picture is the old picture, shifted. The Reactor now copies the canvas onto itself at the new offset with <code>drawImage</code> and calls <code>paintRegion</code> only for the strips the shift uncovered.</p><p><code>shown</code> records what the canvas currently shows. The copy is used only when the palette is unchanged and the shift is smaller than the canvas; otherwise everything is painted.</p><p>Drag again: a few dots per frame.</p>` },
        ],
        tour: [
            ["region", "Painting one rectangle", `<p>The clip keeps a strip's drawing inside the strip. Dots outside the rectangle are skipped before any drawing.</p>`],
            ["render", "Choosing how much to paint", `<p>A Reactor on <code>offset</code> and <code>colors</code>.</p>`],
        ],
    }),
    `<p>This relies on <code>paintRegion</code> drawing identical pixels for the same offset, so that a newly painted strip matches the copied pixels next to it. It applies to panning only: a zoom changes every pixel.</p>`,

    "## real | Camera and Layer",
    Lab("camera", {
        result: "above", observers: "open",
        text: `<p>The same four circles, drawn with the example's <code>Camera</code> and <code>Layer</code>. Click the canvas first: inside this guide a Camera takes the wheel only after a click, so that scrolling the page still works.</p>`,
        tour: [
            ["stage", "An element for the Camera", `<p>The Camera listens for input on <code>stage</code>. The canvas fills it and ignores the pointer (see <code>style.css</code>), so events reach the stage.</p>`],
            ["camera", "The Camera", `<p>It handles mouse, trackpad, touch, pen and keyboard, and does the easing, momentum and limits. It draws nothing. Its output is Observables: <code>camera.view</code>, <code>camera.tap</code>, <code>camera.last_input</code> and others. They appear in the table below the canvas.</p>`],
            ["paint", "The Layer and its paint function", `<p><code>Layer</code> decides how much of the canvas to repaint, as in the previous part, and calls <code>paint</code> with the region to fill, in world units (<code>world</code>) and in pixels (<code>screen</code>).</p><p><code>brush.useWorld()</code> sets the canvas transform from the view, so the circles are drawn at their world positions without converting each one. <code>deps: [colors]</code> lists the Observables the content depends on.</p>`],
            ["read", "Reactors on the Camera's Observables", `<p>These are subscribed to the Camera's Observables in the same way as to Observables created in this file.</p>`],
            ["move", "Moving the camera from code", `<p><code>goHome</code>, <code>zoomAt</code>, <code>fit</code>, <code>lookAt</code> and <code>panBy</code> change the target, like <code>steer</code> in the hand-built version.</p>`],
        ],
    }),
    `<p>Compared with the hand-built version, the Camera adds:</p>
     <ul>
       <li><strong>Easing by elapsed time.</strong> A fixed fraction per frame is faster on a 144 Hz display than on a 60 Hz one. The Camera uses <code>1 − e<sup>−dt/τ</sup></code>, which gives the same motion at any frame rate.</li>
       <li><strong>Input applied once per frame</strong>, through a manual stage, as in the pointer lab of the Schedulers section.</li>
       <li><strong>Touch.</strong> It uses the set of pointers currently down: the change in their average position is a pan, and the change in the distance between two of them is a zoom.</li>
       <li><strong>Mouse wheel and trackpad told apart.</strong> Both send <code>wheel</code> events; a wheel should zoom and a two-finger scroll should pan. The Camera classifies each burst of events, and <code>wheel_mode</code> overrides that.</li>
       <li><strong>Smoothing of wheel input.</strong> Wheel events are not aligned with frames (two in one frame, none in the next), so they change the target and the view follows over about two frames.</li>
       <li><strong>Limits</strong>: <code>zoom_limits</code> and <code>world_bounds</code>, both Observables.</li>
     </ul>
     <p>The Camera and the Layer do not call each other. The Layer needs an object with two Observables, <code>view</code> and <code>screen</code>, and repaints when they change. The example also has a <code>FixedCamera</code> with the same two Observables, which frames a rectangle and takes no input; the Ising explainer uses it for its figures.</p>`,
    Fold("The source of one Camera frame",
        Source(CAMERA, camera_src, "advance(now) {", "isMoving() {", [
            ["const dt = clamp(", "The time since the previous frame, limited to 64 ms."],
            ["// 1. input", "Runs the manual input stage."],
            ["// 2. momentum", "The equivalent of `coast`, with the decay measured in milliseconds."],
            ["// 3. ease toward", "The equivalent of `frame`."],
            ["const k = 1 - Math.exp", "The fraction to cover this frame, then the same interpolation as in step 4: the world point under the anchor, the scale by ratio, `placeAt`."],
            ["// 5. publish", "The only assignment to `view`, at most once per frame."],
        ])),
    Fold("The source of the Layer's choice between a shift and a full repaint",
        Source(LAYER, layer_src, "const last = self._.last;", "self._.needs_full = false;", [
            ["const last = self._.last;", "The equivalent of `shown`."],
            ["const same_zoom", "A shift is possible only when the scale and the size are unchanged."],
            ["// snap only when", "For copied and newly painted pixels to line up, the shift must be a whole number of device pixels, so the origin is rounded on pan frames."],
            ["// shift the old frame", "The copy, through a second off-screen canvas."],
            ["// the exposed strips", "The uncovered strips."],
        ], 4),
        Source(LAYER, layer_src, "// content changes force a full repaint", "return self;", [
            ["// content changes force", "A Reactor on the content's `deps`: it marks the whole canvas for repainting."],
            ["// camera, size and version", "A Reactor on the view, the size and that mark: it renders."],
        ])),
]);

export const isingSection = () => Section("ising", "The Ising model",
    "The Ising Model example shows a grid of spins that can be zoomed from the whole grid down to single arrows turning over. This section builds the drawing of one spin, then the simulation, then combines them with the Camera.", [

    "## goal | The finished lattice",
    Lab("ising-real", {
        peek: true, observers: "none", result: "above",
        text: `<p>Each square is a spin: it points up (dark) or down (light). A spin tends to match its four neighbours, and temperature makes spins flip at random.</p><p>Click the lattice and zoom in. The squares turn into discs with arrows, and a flipping spin's arrow rotates. The parts below build this. The full simulation and the physics behind it are in the <a href="../ising-model/index.html">Ising Model</a> example and its <a href="../ising-model/index.html#learn">explainer</a>.</p>`,
    }),

    "## sprite | Drawing one spin",
    Lab("spin", {
        result: "above", observers: "closed",
        text: `<p>Six steps, from one arrow to a grid of spins that changes appearance with zoom.</p>`,
        steps: [
            { title: "An arrow", text: `<p><code>drawArrow</code> draws a shaft and a head pointing up, relative to its own centre. It first moves the canvas origin to <code>(cx, cy)</code> and rotates it by <code>angle</code>, so the same drawing code serves any position and direction.</p><p>It is called once. Nothing changes after that, so no Observable or Reactor is needed.</p>` },
            { title: "An angle that can change", text: `<p>The slider should rotate the arrow. <code>angle</code> is an Observable that the slider assigns, and the drawing moves into a Reactor that reads <code>angle.value</code>. Each slider move runs the Reactor, which clears the canvas and draws the arrow at the new angle.</p><p>The Reactor also reads <code>colors.value</code>, an Observable holding the palette, so the arrow is redrawn if the system switches between light and dark.</p>` },
            { title: "A spin that flips over time", text: `<p>A spin has two states, so <code>angle</code> is replaced by <code>spin</code>, which is +1 or −1. Clicking the canvas negates it and stores the time in <code>flipped_at</code>.</p><p>The arrow should take 420 ms to turn. <code>arrowAngle(spin, age)</code> returns its angle from the spin and the time since the flip. The drawing therefore depends on the current time as well, and that is the Observable <code>clock</code>. After a click, <code>advance</code> assigns <code>clock</code> every frame for 420 ms and then stops, so the Reactor repaints while the arrow turns and not afterwards.</p><p>The only stored state of the animation is one timestamp.</p>` },
            { title: "A colored disc behind the arrow", text: `<p><code>drawBubble</code> fills a disc with the spin's color: the text color for up, the background color for down. During a flip it fills the previous color first and then the new color with an opacity that grows from 0 to 1 over the same 420 ms, which gives a cross-fade. The arrow is drawn in whichever of the two colors contrasts with the disc.</p>` },
            { title: "Appearance depends on size", text: `<p>Zoomed out, a spin should be a flat square that fills its cell. Zoomed in, a disc with an arrow. <code>detailAt(pixels)</code> maps the cell's size on screen to a number: 0 below 16 px, 1 above 46 px, rising smoothly between.</p><p><code>drawSpin</code> replaces <code>drawBubble</code> and derives everything from that number: the corner radius goes from 0 (a square) to half the side (a circle), a gap opens around the shape, and the arrow's opacity goes from 0 to 1.</p><p>Move the slider between 4 and 110. The shape changes continuously, with no size at which it switches.</p>` },
            { title: "A grid of spins", text: `<p>The same function is called for every cell of a 24 × 24 lattice. Two arrays hold each spin's value and the time of its last flip. A click flips the spin under the pointer.</p><p>At 4 px per spin, <code>detail</code> is 0 and each spin is one filled rectangle.</p>` },
        ],
        tour: [
            ["arrow", "The arrow", `<p>Drawn around the origin; positioned and rotated by the canvas transform.</p>`],
            ["state", "The state", `<p>The spins, the times of their last flips, and the clock.</p>`],
            ["turn", "Time", `<p><code>arrowAngle</code> computes the angle from a timestamp. <code>advance</code> runs only while a flip is in progress.</p>`],
            ["detail", "From size to detail", `<p>Pixels per spin in, a number from 0 to 1 out.</p>`],
            ["bubble", "The shape and its colors", `<p>Radius, gap, colors and arrow, computed from <code>detail</code> and from the time since the flip.</p>`],
            ["paint", "The drawing", `<p>A Reactor that depends on the clock, the cell size and the palette.</p>`],
        ],
    }),
    Note("Why a timestamp per spin", `<p>There is no list of running animations to maintain. A spin that flips again while turning gets a new timestamp and continues from there. Many spins flipping in the same frame allocate nothing. The code that flips a spin and the code that draws it share only the timestamp. The cost is that something must keep repainting until the last turn has finished.</p>`),
    Fold("The same sprite in the Ising example",
        `<p>The example does not fill each cell separately. Every cell adds its outline to a few shared paths, and each path is filled once, so thousands of cells take a few draw calls.</p>`,
        Source(ISING + "canvas/sprites.ts", sprites_src, "export function addSpin", "// Paints a batch", [
            ["const gap = t * GAP * s;", "`t` is the detail. The gap and the radius grow with it."],
            ["if (radius < 0.5)", "At low detail, a plain rectangle."],
            ["if (t === 0) return;", "No arrow below 16 px."],
            ["batch.shafts.moveTo", "The arrow, rotated with cos and sin and added to the shared paths."],
        ])),

    "## loop | The simulation",
    `<p>One step of the simulation:</p>
     <ol>
       <li>Pick a spin at random.</li>
       <li>Compute the energy that flipping it would cost: 2 × the spin × the sum of its four neighbours. Flipping a spin that agrees with its neighbours costs energy; flipping one that disagrees releases it.</li>
       <li>If the cost is zero or negative, flip it. Otherwise flip it with probability <i>e</i><sup>−cost/<i>T</i></sup>, where <i>T</i> is the temperature.</li>
     </ol>
     <p>A <em>sweep</em> is as many steps as there are spins.</p>`,
    Lab("ising", {
        result: "above", observers: "closed",
        steps: [
            { title: "A lattice drawn as pixels", text: `<p>9,216 spins in an <code>Int8Array</code>, set at random. To draw them, each spin becomes one pixel of a 96 × 96 image, and the image is drawn enlarged with smoothing off, so each pixel appears as a sharp square. The cost of drawing is the same at any zoom.</p><p><code>paint()</code> is called once. Nothing changes yet.</p>` },
            { title: "The loop", text: `<p><code>sweep()</code> performs 9,216 steps, changing the array in place. The frame loop calls it once per frame.</p><p>An Observable is not notified of changes inside an array (the to-do exercise). So the loop increments <code>sweeps</code>, an Observable counting completed sweeps, and <code>paint</code> reads it. <code>paint</code> is now run by a Reactor, and a second Reactor shows the count next to the slider. The loop could call <code>paint()</code> directly; the Observable is used because two things depend on a sweep having finished, and the loop does not need to know either of them.</p><p>Move the temperature slider. Below about 2.27 the spins form growing patches; above it they stay disordered.</p>` },
            { title: "A table of ten probabilities", text: `<p>A spin is ±1 and its neighbours sum to −4, −2, 0, 2 or 4, which gives ten possible costs. A Reactor that depends on <code>temperature</code> stores their probabilities in <code>odds</code>, and <code>sweep</code> reads from that list in place of calling <code>Math.exp</code> on every step.</p><p>The list is rebuilt when the slider moves and read about 550,000 times a second.</p>` },
        ],
        tour: [
            ["lattice", "The data", `<p>A typed array, plus a counter. The array is not held in an Observable because nothing depends on which array it is.</p>`],
            ["pixels", "Drawing", `<p>One 32-bit write per spin, then one image draw.</p>`],
            ["temperature", "The temperature control", `<p>An Observable, a slider that assigns it, and a Reactor that displays it.</p>`],
            ["odds", "Derived data", `<p>Recomputed only when <code>temperature</code> changes.</p>`],
            ["sweep", "The steps", `<p>The inner loop reads plain variables and arrays. No Observable is read or written inside it.</p>`],
            ["loop", "The frame loop", `<p>One sweep, then one assignment.</p>`],
        ],
    }),

    "## rule | Exercise: the acceptance rule",
    Lab("metropolis", {
        result: "above", observers: "none",
        exercise: {
            task: `<p>This lattice is at <i>T</i> = 1.5, where it should form large patches. It stays random because <code>accepts</code> returns <code>true</code> for every flip.</p><p>Make <code>accepts(cost, T)</code> return <code>true</code> when <code>cost</code> is zero or negative, and otherwise <code>true</code> with probability <i>e</i><sup>−cost/<i>T</i></sup>. The check calls the function several thousand times and compares the frequencies.</p>`,
            hint: `<p><code>Math.random() &lt; p</code> is true with probability <code>p</code>. <i>e</i><sup>−cost/<i>T</i></sup> is <code>Math.exp(-cost / T)</code>.</p>`,
            check: p => {
                const f = p.window.accepts;
                if (typeof f !== "function" || f(0, 1) !== true || f(-4, 1) !== true) return false;
                let often = 0, rarely = 0;
                for (let k = 0; k < 3000; k++) { if (f(2, 2)) often++; if (f(8, 0.5)) rarely++; }
                return Math.abs(often / 3000 - Math.exp(-1)) < 0.06 && rarely < 10;
            },
        },
    }),

    "## together | Sprite, simulation and Camera together",
    Lab("ising-zoom", {
        result: "above", observers: "closed",
        text: `<p>The sprite and the simulation from the previous parts, moved into two files, and drawn through the Camera. Click the lattice, zoom in, and watch single spins turn.</p>`,
        tour: [
            ["stage", "The page", `<p>An element for the Camera with a canvas in it, and a slider.</p>`],
            ["state", "The state", `<p><code>clock</code> holds the time the picture is drawn for. A Reactor passes each new <code>temperature</code> to <code>physics.js</code>, which rebuilds its table.</p>`],
            ["camera", "The Camera", `<p>World units are spins, so the Camera's <code>scale</code> is the number of pixels per spin, which is the input <code>detailAt</code> takes. Zooming therefore changes the sprites with no extra code.</p><p><code>auto_advance: false</code> stops the Camera from running its own frames, because the loop below advances it.</p>`],
            ["paint", "The Layer's paint function", `<p>For the region it is given, it finds the spins inside it (indices wrap, since the lattice repeats) and calls <code>drawSpin</code> for each with the time since its flip. <code>deps: [clock, colors]</code> makes the Layer repaint when either changes.</p>`],
            ["loop", "One frame loop", `<p>Each frame: the Camera processes input and may assign its view; <code>sweep</code> flips spins and stamps each flip with <code>now</code>; then <code>clock</code> is assigned once, and the Layer repaints.</p>`],
        ],
    }),
    `<p><code>physics.js</code> changes spins and timestamps and contains no drawing. <code>sprites.js</code> draws one spin from a value, an age and a detail level, on whatever canvas context it is given. The Camera turns input into a view. They meet in the paint function.</p>`,
    Exercise(`<p><strong>Flip a spin by tapping it.</strong> The Camera's <code>tap</code> Observable holds the latest tap, with world coordinates.</p>`,
        `<p>In <code>main.js</code>. A tap's <code>x</code> and <code>y</code> are in world units, which are spins.</p>`,
        Snippet(`
Reactor(() => {
    const tap = camera.tap.value;
    if (!tap) return;
    const i = ((Math.floor(tap.y) % N) + N) % N, j = ((Math.floor(tap.x) % N) + N) % N;
    spins[i * N + j] *= -1;
    flipped[i * N + j] = performance.now();
});`)),

    "## real | With the example's modules",
    Lab("ising-real", {
        result: "above", observers: "closed",
        text: `<p>The same program written with the Ising example's modules. <code>Lattice</code> and <code>step</code> correspond to <code>physics.js</code>, and <code>LatticeLayer</code> is a Layer with the paint function built in.</p>`,
        tour: [
            ["state", "The state", `<p>The lattice, a counter that is incremented after each frame's flips, and the temperature with its table.</p>`],
            ["view", "Camera and LatticeLayer", `<p><code>LatticeLayer</code> repaints when <code>tick</code> or the view changes.</p>`],
            ["loop", "The frame loop", `<p>The same three lines as before.</p>`],
        ],
    }),
    `<p>What the example's versions add:</p>
     <ul>
       <li><strong>Two drawing methods.</strong> At detail 0 it draws the one-pixel-per-spin image from the simulation lab; above 0 it draws sprites. At detail 0 a sprite is a flat square that fills its cell, the same pixels as the image, so changing method there is not visible.</li>
       <li><strong>Batched sprites</strong>, as in the source shown earlier.</li>
       <li><strong>Running totals.</strong> <code>step</code> updates the magnetization and the energy with each flip, so the readouts do not recount the lattice.</li>
       <li><strong>A render stage.</strong> In the full simulation the Camera's view and the tick can both change in one frame. The Layer renders on a Scheduler stage, so it paints once per frame.</li>
     </ul>`,
    Fold("The source of step()",
        Source(ISING + "ising.ts", ising_src, "export function step", "// Per-spin magnetization", [
            ["const exact = sweeps * nn + lat.carry;", "A fraction of a sweep is allowed; the remainder carries over to the next call."],
            ["const S = spins[", "The four neighbours. Wrapping is done with a comparison per side, which is cheaper than `%`."],
            ["const p = table[", "The table of ten probabilities."],
            ["if (p >= 1 || Math.random() < p) {", "A certain flip uses no random number. On a flip the totals are adjusted and the time is stored."],
        ])),
    Fold("The source of the pixel image",
        Source(ISING + "canvas/lattice_layer.ts", lattice_layer_src, "function pixels(lat: Lattice)", "return Layer(camera, canvas, {", [
            ["const key =", "A Layer may paint several strips in one render. The image is rebuilt when the spins or colors change, and reused between strips."],
            ["const px = new Uint32Array", "One 32-bit write per spin."],
        ])),
]);

export const referenceSection = () => Section("reference", "Reference",
    "Where to find the rest.", [
    `<p><strong>Docs.</strong> Every option, field and method of Observable, Reactor, Scheduler, Camera and Layer, with editable examples: <a href="./docs.html">the docs page</a>.</p>
     <p><strong>Examples.</strong> <a href="../pan-zoom/index.html">Pan &amp; Zoom</a>, <a href="../ising-model/index.html">Ising Model</a> and its <a href="../ising-model/index.html#learn">explainer</a>. Smaller ones: <a href="../click_counter/index.html">Click Counter</a>, <a href="../component-toggle/index.html">Component Toggle</a>, <a href="../cascades-and-schedules/index.html">Cascades &amp; Schedules</a>. All of them are in the <a href="../../../index.html">gallery</a>.</p>
     <p><strong>Source.</strong> <code>src/core</code> is under four hundred lines. The README's <a href="https://github.com/AlmostAPhysicist/excitejs#design-choices" target="_blank" rel="noopener">Design Choices</a> section lists the rules these sections demonstrate, and its task list names what ExciteJS does not have yet: templates, a way to dispose a group of Reactors together, tracking for Reactors created inside Reactors, reactivity for changes inside objects and arrays, and error handling for a reaction that throws.</p>
     <p><strong>Browser APIs</strong> used in the canvas sections, on MDN: <a href="https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events" target="_blank" rel="noopener">Pointer events</a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent" target="_blank" rel="noopener">WheelEvent</a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame" target="_blank" rel="noopener">requestAnimationFrame</a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D" target="_blank" rel="noopener">CanvasRenderingContext2D</a>.</p>
     <p><strong>Physics.</strong> N. Metropolis et al., <i>J. Chem. Phys.</i> 21, 1087 (1953). L. Onsager, <i>Phys. Rev.</i> 65, 117 (1944). C. N. Yang, <i>Phys. Rev.</i> 85, 808 (1952).</p>
     <p><strong>Type and color.</strong> Libron, from <a href="https://github.com/nicoverbruggen/ebook-fonts" target="_blank" rel="noopener">nicoverbruggen/ebook-fonts</a>. Fira Code Nerd Font Mono, from <a href="https://github.com/ryanoasis/nerd-fonts" target="_blank" rel="noopener">Nerd Fonts</a>. Colors from the Hubble palette in the <a href="../color-palettes/index.html">Color Palettes</a> example.</p>`,
]);
