import { NS } from "@ns";
import { Traversal, TraversalContext } from "types/traversal";

export class RamMapping {
    totalRam: number = 0;
    totalRamFree: number = 0;

    ramMap: Map<string, ServerRamMapping> = new Map<string, ServerRamMapping>();
}

export class ServerRamMapping {
    maxRam: number;
    ramFree: number;
    cores: number;

    constructor(maxRam: number, ramFree: number, cores: number) {
        this.maxRam = maxRam;
        this.ramFree = ramFree;
        this.cores = cores;
    }

    /**
     * Marks the given amount of ram as consumed, so a mapping shared across several
     * dispatches keeps reflecting the ram actually claimed so far.
     */
    consume(ramGb: number) {
        this.ramFree -= ramGb;
    }
}

export function getRamMapping(ns: NS, exclusions: string[] = []): RamMapping {

    const result = new RamMapping();

    new Traversal((ns: NS, context: TraversalContext, args: RamMapping) => {
        const server = context.hostname;

        if (!ns.hasRootAccess(server)) return;

        const maxRam = ns.getServerMaxRam(server);

        const freeRAM = maxRam - ns.getServerUsedRam(server);
        const cores = ns.getServer(server).cpuCores;

        args.totalRam += maxRam;
        args.totalRamFree += freeRAM;
        args.ramMap.set(server, new ServerRamMapping(maxRam, freeRAM, cores));
    }, false, exclusions)
        .start(ns, "home", result);

    return result;
}
