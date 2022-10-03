import { NS } from "types/Netscript";
import { Traversal, ITraversalFunction, TraversalContext } from "types/Traversal";

const killScripts: ITraversalFunction = (ns: NS, traversalContext: TraversalContext) => {
    const hostname = traversalContext.hostname;

    if (!ns.hasRootAccess(hostname)) {
        return;
    }

    if (hostname != "home") {
        ns.killall(hostname);
    }
};

/** @param {NS} ns */
export async function main(ns: NS) {
    ns.disableLog("ALL");

    new Traversal(killScripts, false).start(ns, ns.getHostname());
}