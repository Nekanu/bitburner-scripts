import { NS } from "@ns";
import { Traversal, ITraversalFunction, TraversalContext } from "./types/traversal";

const killScripts: ITraversalFunction = (ns: NS, traversalContext: TraversalContext) => {
    const hostname = traversalContext.hostname;

    if (!ns.hasRootAccess(hostname)) {
        return;
    }

    ns.killall(hostname, true);
};

/** @param {NS} ns */
export async function main(ns: NS) {
    ns.disableLog("ALL");

    new Traversal(killScripts, false).start(ns, ns.getHostname());
}
