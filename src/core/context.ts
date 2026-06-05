// context.ts

import type { Reactor } from "./reactor";

export let active_reactor: Reactor | null = null;

export function setActiveReactor(reactor: Reactor | null) {
    active_reactor = reactor;
}