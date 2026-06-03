// context.ts

import type { Reactor } from "./Reactor";

export let activeReactor: Reactor | null = null;

export function setActiveReactor(reactor: Reactor | null) {
    activeReactor = reactor;
}