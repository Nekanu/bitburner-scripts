import { ITraversalFunction, Traversal } from "types/Traversal";
import { NS } from "types/Netscript";

export function executeOnAllServers(ns: NS, func: ITraversalFunction, suppressOutput: boolean) {
    let traversal = new Traversal(func, suppressOutput);
    traversal.start(ns, ns.getHostname());
}
