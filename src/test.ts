//test.ts

import { Observable } from "./core/Observable";
import { Reactor } from "./core/Reactor";

// Helper helper function to inspect active listener counts
function getListenerCount(obs: Observable<any>): number {
    return obs.reactors.size;
}

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
    }, [a]); // Explicitly pass 'a', default init is null

    console.log("Initial value of a:", a.value);

    a.value = 1; // Logs b: 1
    a.value = 2; // Logs b: 1+2=3

    let alias = a; // Aliasing reference check
    alias.value = 3; // Logs b: 3+3=6

    r.stop();
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
    }, [a], true); // init: true means run immediately to log initial count (1)

    const r2 = Reactor(() => { }, [a]); // Add a second silent listener
    a.value = 6; // Triggers reactor_count -> logs 2

    r2.stop();
    a.value = 7; // Triggers reactor_count -> logs 1

    reactor_count.stop();
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
    }, [a]);

    // End-consumer reactor
    const r3 = Reactor(() => {
        console.log("   Consumer caught update! c =", c.value);
    }, [c]);

    a.value = 9; // Logs "c updated to: 9"
    a.value = 8; // Logs "c updated to: 8"

    a.value = 0; // Logs "c updated to: 0"
    a.value = 0; // Still Logs "c updated to: 0" because we are not doing dirty-checking.

    r3.stop();
    c_updater.stop();
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

    logger.stop();
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
        [state],
        () => { console.log("   Custom Init hook fired!"); }
    );
    // B: Auto-Tracking + Lazy Flag (init: false)
    console.log("Initializing Reactor B (Lazy Auto-Tracker)...");
    const rB = Reactor(
        () => {
            console.log("   Lazy Reactor B evaluated state:", state.value);
        },
        null,  // No explicit dependency
        false  // DO NOT run on startup (Lazy)
        // auto defaults to true because of deps=null
    );

    console.log("   Listeners on 'state' before manual poke:", getListenerCount(state)); // Should only be 1 (from rA)

    console.log("   Manually kicking off Lazy Reactor B...");
    rB.react(); // Forces initialization and hooks dependencies dynamically

    console.log("   Listeners on 'state' after manual poke:", getListenerCount(state)); // Should be 2 (rA + rB)

    rA.stop();
    rB.stop();
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
    r.auto = false; // Turn off dynamic tracking on-the-fly!

    console.log("   Mutating state while locked down...");
    a.value = "Frozen Dependencies"; // Still triggers because it was already inside the Set!

    // Now look what happens if we call reactor.react() while auto is false:
    // It will run the action, but because it skips reactor.stop() and context assignment,
    // it will never alter its dependency tree again. It is locked to whatever was in it.
    r.stop(); // Clear out all its connections manually

    // Wire up a single static listener manually
    a.reactors.add(r);
    r.observables.add(a);

    a.value = "Only I trigger it"; // Triggers action
    b.value = "I am permanently ignored"; // Silence, even though b is read in the action!

    // Turn auto back and see that it dynamically re-tracks again:
    console.log("   Re-enabling dynamic tracking...");
    r.auto = true;
    b.value = "Still ignored because we haven't re-evaluated yet"; // Silence

    r.react(); // Manually trigger to re-evaluate and re-track dependencies

    a.value = "Dynamic again"; // Triggers action
    b.value = "I am back in the game"; // Triggers action again because we re-tracked it!

    r.stop();
    console.log("✓ Test 6 Passed.\n");
}

console.log("==================================================");
console.log("      ALL REACTIVE TESTS COMPLETED SUCCESSFULLY   ");
console.log("==================================================");