import { NS, ScriptArg } from "types/Netscript";
import { ITraversalFunction, Traversal, TraversalContext } from "types/Traversal";

var scriptFlags: { [key: string]: string[] | ScriptArg };

const findServerWithMostMoney: ITraversalFunction = (ns: NS, context: TraversalContext, args: { server: string, previousMax: number }) => {
    if (ns.hasRootAccess(context.hostname) && ns.getServerMaxMoney(context.hostname) > args.previousMax) {
        args.server = context.hostname;
        args.previousMax = ns.getServerMaxMoney(context.hostname);
    }
};

const deployOnServer: ITraversalFunction = (ns: NS, traversalContext: TraversalContext, args: { target: string, script: string }) => {
    let hostname = traversalContext.hostname;

    let threads = Math.floor(ns.getServerMaxRam(hostname) / ns.getScriptRam(args.script));

    if (!ns.hasRootAccess(hostname) || (scriptFlags["exclude"] as string[]).includes(hostname)) {
        return;
    }

    ns.kill(args.script, hostname);

    if (hostname != "home" && threads > 0) {
        ns.scp(args.script, hostname);
        ns.exec(args.script, hostname, threads, args.target == "" ? hostname : args.target, threads);
        if (!traversalContext.traversal.suppressOutput) {
            ns.tprintf("%s-- %s: DEPLOYED", generateWhiteSpaces(traversalContext.distanceFromStart), hostname);
        }
    }

    if (threads < 1) {
        if (!traversalContext.traversal.suppressOutput) {
            ns.tprintf("%s-- %s: NO RAM", generateWhiteSpaces(traversalContext.distanceFromStart), hostname);
        }
    }
}

/** @param {NS} ns */
export async function main(ns: NS) {
    ns.disableLog("ALL");

    scriptFlags = ns.flags([
        ['output', false],
        ['target', ""],
        ['exclude', []],
        ["script", "hack.js"]
    ]);

    let args = { server: "home", previousMax: 0 };

    new Traversal(findServerWithMostMoney, !scriptFlags["output"] as boolean, scriptFlags["exclude"] as string[])
        .start(ns, ns.getHostname(), args);

    ns.tprintf("Targeting %s with maximum money: %d", args.server, args.previousMax);

    new Traversal(deployOnServer, !scriptFlags["output"] as boolean, scriptFlags["exclude"] as string[])
        .start(ns, ns.getHostname(), { target: args.server, script: scriptFlags["script"] as string });
}

/** @param {Number} depth 
 * @returns {String}
*/
function generateWhiteSpaces(depth: number) {
    let string = "";
    for (let i = 0; i < depth; i++) {
        string += "  |";
    }
    return string;
}