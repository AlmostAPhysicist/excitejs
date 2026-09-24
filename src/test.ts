//test.ts

import { Observable, Reactor, Scheduler } from "./index";
import { moveToTop } from "./core/priority";

// Helper helper function to inspect active listener counts
function getListenerCount(obs: Observable<any>): number {
    return obs.reactors.size;
}

// Throws (and fails `npm test`) if a condition doesn't hold
function check(condition: boolean, message: string): void {
    if (!condition) throw new Error(`✗ Check failed: ${message}`);
    console.log(`   ✓ ${message}`);
}

// Lets queued microtasks (auto-flushing schedules) run
const nextTick = () => new Promise<void>(resolve => queueMicrotask(resolve));

console.log("==================================================");
console.log("          EXCITEJS REACTIVE SUITE TESTS           ");
console.log("==================================================\n");

// ============================================================================
// TEST 1: EXPLICIT DEPENDENCIES & ALIASING
// ============================================================================
{
    console.log("--- TEST 1: Explicit Dependencies & Aliasing ---");
    const a = Observable(0);
    let b = 0;

    const r = Reactor(() => {
        b += a.value;
        console.log(`   Action fired! b is now: ${b}`);
    }, { deps: [a] }); // Explicitly pass 'a', default init is null

    console.log("Initial value of a:", a.value);

    a.value = 1; // Logs b: 1
    a.value = 2; // Logs b: 1+2=3

    let alias = a; // Aliasing reference check
    alias.value = 3; // Logs b: 3+3=6

    r.dispose();
    a.value = 4; // Silence
    console.log("Final value of a (after stop):", a.value);
    console.log("✓ Test 1 Passed.\n");
}

// ============================================================================
// TEST 2: RUNTIME INTROSPECTION (REACTOR COUNTING)
// ============================================================================
{
    console.log("--- TEST 2: Runtime Introspection ---");
    const a = Observable(0);

    const reactor_count = Reactor(() => {
        console.log("   Active reactors hooked to 'a':", getListenerCount(a));
    }, { deps: [a], initFn: true }); // init: true means run immediately to log initial count (1)

    const r2 = Reactor(() => { }, { deps: [a] }); // Add a second silent listener
    a.value = 6; // Triggers reactor_count -> logs 2

    r2.dispose();
    a.value = 7; // Triggers reactor_count -> logs 1

    reactor_count.dispose();
    a.value = 8; // Silence
    console.log("✓ Test 2 Passed.\n");
}

// ============================================================================
// TEST 3: MANUAL DERIVED OBSERVABLE CHAINS
// ============================================================================
{
    console.log("--- TEST 3: Manual Derived Chains ---");
    const a = Observable(0);
    const c = Observable(a.value); // State mirror

    // Intermediary bridge reactor
    const c_updater = Reactor(() => {
        c.value = a.value;
    }, { deps: [a] });

    // End-consumer reactor
    const r3 = Reactor(() => {
        console.log("   Consumer caught update! c =", c.value);
    }, { deps: [c] });

    a.value = 9; // Logs "c updated to: 9"

    r3.paused = true
    a.value = 8; // No log because r3 is paused, but c still updates to 8
    r3.paused = false;

    a.value = 0; // Logs "c updated to: 0"
    a.value = 0; // Still Logs "c updated to: 0" because we are not doing dirty-checking.

    r3.dispose();
    c_updater.dispose();
    console.log("✓ Test 3 Passed.\n");
}

// ============================================================================
// TEST 4: AUTO-TRACKING & DYNAMIC BRANCHING LOGIC
// ============================================================================
{
    console.log("--- TEST 4: Auto-Tracking & Dynamic Branching ---");
    const loggedIn = Observable(false);
    const userProfile = Observable("John Doe");

    // Dynamic auto-tracking reactor (No deps array passed)
    const logger = Reactor(() => {
        if (loggedIn.value) {
            console.log(`   [Secure Access] Welcome, ${userProfile.value}`);
        } else {
            console.log("   [Public Access] Please log in to view profile.");
        }
    }); // Runs automatically on startup to gather initial deps

    console.log("   Listeners on 'userProfile' initially:", getListenerCount(userProfile)); // Should be 0

    // Modifying user profile while logged out should NOT run the logger!
    userProfile.value = "Bob Stone"; // Silence (dynamic tree successfully skipped it)

    console.log("   Logging user in...");
    loggedIn.value = true; // Triggers loop, hits 'if' branch, links 'userProfile'

    console.log("   Listeners on 'userProfile' now:", getListenerCount(userProfile)); // Should be 1

    // Now modifying user profile SHOULD trigger the logger!
    userProfile.value = "Admin Smith"; // Logs "[Secure Access] Welcome, Admin Smith"

    logger.dispose();
    console.log("✓ Test 4 Passed.\n");
}

// ============================================================================
// TEST 5: INITIALIZATION VARIATIONS & LAZY LOADING
// ============================================================================
{
    console.log("--- TEST 5: Initialization Variations & Lazy Loading ---");
    const state = Observable(100);
    let runCount = 0;

    // A: Explicit + init function
    console.log("Initializing Reactor A (Custom init)...");
    const rA = Reactor(
        () => { runCount++; },
        { deps: [state], initFn: () => { console.log("   Custom Init hook fired!"); } }
    );
    // B: Auto-Tracking + Lazy Flag (init: false)
    console.log("Initializing Reactor B (Lazy Auto-Tracker)...");
    const rB = Reactor(
        () => {
            console.log("   Lazy Reactor B evaluated state:", state.value);
        },
        { deps: null, initFn: false }  // No explicit dependency, DO NOT run on startup (Lazy)
        // auto defaults to true because of deps=null
    );

    console.log("   Listeners on 'state' before manual poke:", getListenerCount(state)); // Should only be 1 (from rA)

    console.log("   Manually kicking off Lazy Reactor B...");
    rB.react(); // Forces initialization and hooks dependencies dynamically

    console.log("   Listeners on 'state' after manual poke:", getListenerCount(state)); // Should be 2 (rA + rB)

    rA.dispose();
    rB.dispose();
    console.log("✓ Test 5 Passed.\n");
}

// ============================================================================
// TEST 6: MID-FLIGHT GRAPH LOCKDOWN (MUTATING REACTOR.AUTO)
// ============================================================================
{
    console.log("--- TEST 6: Mid-Flight Graph Lockdown ---");
    const a = Observable("Dynamic");
    const b = Observable("Unlinked");

    const r = Reactor(() => {
        console.log(`   Reactor Output -> a: ${a.value} | b: ${b.value}`);
    }); // Starts in auto mode, hooks 'a' and 'b'

    a.value = "Changed Auto"; // Triggers completely normally

    console.log("   Locking down reactor graph...");
    r.auto_deps = false; // Turn off dynamic tracking on-the-fly!

    console.log("   Mutating state while locked down...");
    a.value = "Frozen Dependencies"; // Still triggers because it was already inside the Set!

    // Now look what happens if we call reactor.react() while auto is false:
    // It will run the action, but because it skips reactor.dispose() and context assignment,
    // it will never alter its dependency tree again. It is locked to whatever was in it.
    r.dispose(); // Clear out all its connections manually

    // Wire up a single static listener manually
    a.reactors.add(r);
    r.observables.add(a);

    a.value = "Only I trigger it"; // Triggers action
    b.value = "I am permanently ignored"; // Silence, even though b is read in the action!

    // Turn auto back and see that it dynamically re-tracks again:
    console.log("   Re-enabling dynamic tracking...");
    r.auto_deps = true;
    b.value = "Still ignored because we haven't re-evaluated yet"; // Silence

    r.react(); // Manually trigger to re-evaluate and re-track dependencies

    a.value = "Dynamic again"; // Triggers action
    b.value = "I am back in the game"; // Triggers action again because we re-tracked it!

    r.dispose();
    console.log("✓ Test 6 Passed.\n");
}

// ============================================================================
// TEST 7: PREACTION (CLEANUP) LIFECYCLE
// ============================================================================
{
    console.log("--- TEST 7: Preaction Lifecycle ---");
    const a = Observable(0);
    const log: string[] = [];

    const r = Reactor(() => {
        log.push(`run ${a.value}`);
        return () => log.push("cleanup"); // returned function becomes the preaction
    });
    check(log.join(",") === "run 0", "reaction runs once on creation");

    a.value = 1;
    check(log.join(",") === "run 0,cleanup,run 1", "cleanup runs before the next reaction");

    r.dispose();
    check(log.join(",") === "run 0,cleanup,run 1,cleanup", "cleanup runs on dispose");

    a.value = 2;
    check(log.length === 4, "nothing runs after dispose");
    console.log("✓ Test 7 Passed.\n");
}

// ============================================================================
// TEST 8: MANUAL TRIGGER ON IN-PLACE MUTATION
// ============================================================================
{
    console.log("--- TEST 8: Manual Trigger ---");
    const list = Observable<number[]>([]);
    let seen_length = -1;

    Reactor(() => { seen_length = list.value.length; });
    check(seen_length === 0, "reactor sees the initial empty list");

    list.value.push(1); // mutating in place does not go through the setter
    check(seen_length === 0, "in-place mutation alone does not react");

    list.trigger();
    check(seen_length === 1, "trigger() re-runs reactors without a new value");
    console.log("✓ Test 8 Passed.\n");
}

// ============================================================================
// TEST 9: PAUSE FLAGS
// ============================================================================
{
    console.log("--- TEST 9: Pause Flags ---");
    const a = Observable(0);
    let runs = 0;

    const r = Reactor(() => { runs++; }, { deps: [a] });

    r.paused = true;
    a.value = 1;
    check(runs === 0, "paused reactor ignores changes");

    r.paused = false;
    a.value = 2;
    check(runs === 1, "unpaused reactor reacts again");

    r.reaction_paused = true;
    a.value = 3;
    check(runs === 1, "reaction_paused skips the reaction");

    r.dispose();
    console.log("✓ Test 9 Passed.\n");
}

// ============================================================================
// TEST 10: SCHEDULE BATCHING
// ============================================================================
{
    console.log("--- TEST 10: Schedule Batching ---");
    const render = Scheduler().getOrCreate("render");
    const a = Observable(0);
    let runs = 0;

    Reactor(() => { runs++; }, { deps: [a], reaction_schedule: render });

    a.value = 1;
    a.value = 2;
    a.value = 3;
    check(runs === 0, "scheduled reactions don't run synchronously");

    await nextTick();
    check(runs === 1, "three changes flush as a single run");
    console.log("✓ Test 10 Passed.\n");
}

// ============================================================================
// TEST 11: SCHEDULE ORDERING & MANUAL FLUSH
// ============================================================================
{
    console.log("--- TEST 11: Schedule Ordering & Manual Flush ---");
    const a = Observable(0);

    // Ordering: schedules flush in creation order, not reactor declaration order
    const scheduler = Scheduler();
    const compute_s = scheduler.getOrCreate("compute"); // created first, flushes first
    const render_s = scheduler.getOrCreate("render");
    const log: string[] = [];

    // Declared render-first on purpose; schedule order should win
    Reactor(() => { log.push("render"); }, { deps: [a], reaction_schedule: render_s });
    Reactor(() => { log.push("compute"); }, { deps: [a], reaction_schedule: compute_s });

    a.value = 1;
    await nextTick();
    check(log.join(",") === "compute,render", "compute schedule flushes before render");

    // Manual flush: an auto_flush=false schedule (alone in its scheduler) waits for flush()
    const manual_scheduler = Scheduler();
    const manual_s = manual_scheduler.getOrCreate("manual", false);
    let manual_runs = 0;

    Reactor(() => { manual_runs++; }, { deps: [a], reaction_schedule: manual_s });

    a.value = 2;
    await nextTick();
    check(manual_runs === 0, "manual schedule does not flush on its own");

    manual_scheduler.flush(manual_s);
    check(manual_runs === 1, "manual schedule runs on flush()");
    console.log("✓ Test 11 Passed.\n");
}

// ============================================================================
// TEST 12: REACTOR PRIORITY
// ============================================================================
{
    console.log("--- TEST 12: Reactor Priority ---");
    const a = Observable(0);
    const log: string[] = [];

    Reactor(() => { log.push("first"); }, { deps: [a] });
    const second = Reactor(() => { log.push("second"); }, { deps: [a] });

    a.value = 1;
    check(log.join(",") === "first,second", "reactors run in subscription order");

    log.length = 0;
    moveToTop(a.reactors, second);
    a.value = 2;
    check(log.join(",") === "second,first", "moveToTop makes a reactor run first");
    console.log("✓ Test 12 Passed.\n");
}

console.log("==================================================");
console.log("      ALL REACTIVE TESTS COMPLETED SUCCESSFULLY   ");
console.log("==================================================");