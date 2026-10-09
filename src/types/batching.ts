import { NS } from "@ns";

export class BatchThreads {
    hack: number;
    grow: number;
    weaken1: number;
    weaken2: number;

    public constructor(hackThreads: number, growThreads: number, weaken1Threads: number, weaken2Threads: number) {
        this.hack = hackThreads;
        this.grow = growThreads;
        this.weaken1 = weaken1Threads;
        this.weaken2 = weaken2Threads;
    }
}

export class Batch {

    ramNeeded?: number;

    public calculate(ns:NS) {
        const hackEffect = ns.formulas.hacking.hackPercent();
        ns.formulas.hacking.weakenEffect()
    }
}