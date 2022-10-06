import { ITraversalFunction, Traversal } from "types/traversal";
import { NS } from "types/netscript";

export function executeOnAllServers(ns: NS, func: ITraversalFunction, suppressOutput: boolean) {
    let traversal = new Traversal(func, suppressOutput);
    traversal.start(ns, ns.getHostname());
}

export function convertToHumanReadable(ns: NS, bytes: number) {
    return ns.nFormat(bytes, "0.000a");
}
