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

    constructor(maxRam: number, ramFree: number) {
        this.maxRam = maxRam;
        this.ramFree = ramFree;
    }
}

export function getRamMapping(ns: NS, exclusions: string[] = []): RamMapping {

    const result = new RamMapping();

    new Traversal((ns: NS, context: TraversalContext, args: RamMapping) => {
        const server = context.hostname;

        if (!ns.hasRootAccess(server)) return;

        const maxRam = ns.getServerMaxRam(server);

        const freeRAM = maxRam - ns.getServerUsedRam(server);

        args.totalRam += maxRam;
        args.totalRamFree += freeRAM;
        args.ramMap.set(server, new ServerRamMapping(maxRam, freeRAM));
    }, false, exclusions)
        .start(ns, "home", result);

    return result;
}
