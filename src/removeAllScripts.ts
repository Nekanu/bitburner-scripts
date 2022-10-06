import { NS } from "types/netscript";
import { ITraversalFunction, Traversal, TraversalContext } from "types/traversal";

const removeAllScripts: ITraversalFunction = (ns: NS, traversalContext: TraversalContext) => {
    const hostname = traversalContext.hostname;

    if (!ns.hasRootAccess(hostname)) {
        return;
    }

    ns.killall(hostname);

    for (const script of ns.ls(hostname, ".js")) {
        ns.print(`Removing ${script} from ${hostname}`);
        ns.rm(script, hostname);
    }
}

export async function main(ns: NS) {
    ns.disableLog("killall");
    ns.disableLog("scan");

    new Traversal(removeAllScripts, false, ["home"]).start(ns, ns.getHostname());
}