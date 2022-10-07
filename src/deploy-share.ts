import { NS, ScriptArg } from "types/netscript";
import { ITraversalFunction, Traversal, TraversalContext } from "types/traversal";

var scriptFlags: { [key: string]: string[] | ScriptArg };
const shareScript = "/lib/share-loop.js";

/**
 * @param {NS} ns
 * @param {TraversalContext} context
 * @param {string} args Here a server list in which all servers that are completely free are returned
 */
const findFreeServers: ITraversalFunction = (ns: NS, context: TraversalContext, args: { serverList: string[] }) => {
    if (ns.hasRootAccess(context.hostname) && ns.getServerMaxRam(context.hostname) > 0 && ns.getServerUsedRam(context.hostname) == 0) {
        args.serverList.push(context.hostname);
    }
};



/** @param {NS} ns */
export async function main(ns: NS) {

    // "exclude" allows the exclusion of servers from the traversal (e.g. home)
    scriptFlags = ns.flags([
        ['exclude', []]
    ]);

    let result = { serverList: [] };

    new Traversal(findFreeServers, !scriptFlags["output"] as boolean, scriptFlags["exclude"] as string[])
        .start(ns, ns.getHostname(), result);

    const scriptRam = ns.getScriptRam(shareScript);

    result.serverList.forEach(server => {
        const scriptThreads = Math.floor(ns.getServerMaxRam(server) / scriptRam);

        ns.tprintf("INFO -- Deploying to %s with %d threads", server, scriptThreads);
        ns.scp(shareScript, server);

        ns.exec(shareScript, server, scriptThreads);
    });
}