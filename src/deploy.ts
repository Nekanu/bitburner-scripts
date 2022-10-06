import { NS, ScriptArg } from "types/netscript";
import { ITraversalFunction, Traversal, TraversalContext } from "types/traversal";

var scriptFlags: { [key: string]: string[] | ScriptArg };

const findServerWithMostMoney: ITraversalFunction = (ns: NS, context: TraversalContext, args: { server: string, previousMax: number }) => {
    if (ns.hasRootAccess(context.hostname) && ns.getServerMaxMoney(context.hostname) > args.previousMax) {
        args.server = context.hostname;
        args.previousMax = ns.getServerMaxMoney(context.hostname);
    }
};

const deployOnServer: ITraversalFunction = (ns: NS, traversalContext: TraversalContext, args: { target: string, script: string, minSecurity: number, maxMoney: number }) => {
    let hostname = traversalContext.hostname;

    if (ns.getServerUsedRam(hostname) !== 0) {
        return;
    }

    let threads = Math.floor((ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)) / ns.getScriptRam(args.script));

    if (!ns.hasRootAccess(hostname) || (scriptFlags["exclude"] as string[]).includes(hostname)) {
        return;
    }

    if (ns.isRunning(args.script, hostname, args.target, threads, args.minSecurity, args.maxMoney)) {
        ns.print("Skript is already running on " + hostname);
        return;
    }

    // ns.killall(hostname);

    if (hostname != "home" && threads > 0) {
        ns.scp(args.script, hostname);

        ns.exec(args.script, hostname, threads, args.target == "" ? hostname : args.target, threads, args.minSecurity, args.maxMoney);
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
    scriptFlags = ns.flags([
        ['output', false],
        ['target', ""],
        ['exclude', []],
        ["script", "hack.js"]
    ]);

    let args = { server: "home", previousMax: 0 };

    if (scriptFlags["target"] == "") {
        new Traversal(findServerWithMostMoney, !scriptFlags["output"] as boolean, scriptFlags["exclude"] as string[])
            .start(ns, ns.getHostname(), args);
    } else {
        args.server = scriptFlags["target"] as string;
    }

    let minSecurity = ns.getServerMinSecurityLevel(args.server);
    let maxMoney = ns.getServerMaxMoney(args.server);

    ns.tprintf("Targeting %s!\nMaximum money: %d\nMinimum Security: %d", args.server, maxMoney, minSecurity);

    new Traversal(deployOnServer, !scriptFlags["output"] as boolean, scriptFlags["exclude"] as string[])
        .start(ns, ns.getHostname(),
            {
                target: args.server,
                script: scriptFlags["script"] as string,
                minSecurity: minSecurity,
                maxMoney: maxMoney
            });
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