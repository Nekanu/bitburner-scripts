import { NS } from "types/netscript";
import { getFreeRAM, ITraversalFunction, Traversal, TraversalContext } from "types/traversal";

const weakenScript = "/lib/weaken.js";
const growScript = "/lib/grow.js";
const hackScript = "/lib/hack.js";

let monitorServers = new Map<string, number[]>();

function determineActionAndNeededRam(ns: NS, target: string): { script: string, neededThreads: number } {
    const targetMinSecurity = ns.getServerMinSecurityLevel(target);

    if (targetMinSecurity < ns.getServerSecurityLevel(target) * 0.95) {
        return { script: weakenScript, neededThreads: calculateWeakenThreads(ns, target, targetMinSecurity) };
    } else if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.95) {
        return { script: growScript, neededThreads: calculateGrowThreads(ns, target) };
    } else {
        return { script: hackScript, neededThreads: calculateHackThreads(ns, target) };
    }
}

/**
 * @param {NS} ns
 * @arg {string} hostname
 */
export async function main(ns: NS) {
    ns.disableLog("ALL");
    ns.enableLog("exec");

    let hackingLevel = ns.getHackingLevel();

    let profitableServers = sortServersAfterProfit(ns);

    while (true) {

        // Check if any of the running pid's are done and filter
        for (const [server, pids] of monitorServers) {
            monitorServers.set(server, pids.filter(pid => ns.isRunning(pid)));

            if (monitorServers.get(server)!.length === 0) {
                monitorServers.delete(server);
            }
        }

        if (hackingLevel < ns.getHackingLevel() && hackingLevel < 2000) {
            hackingLevel = ns.getHackingLevel();
            ns.print("Hacking level increased, starting new escalation");
            ns.exec("escalate.js", "home", 1, "--silent");

            profitableServers = sortServersAfterProfit(ns);
        }

        for (const [server,] of profitableServers) {
            if (!monitorServers.has(server)) {
                const res = determineActionAndNeededRam(ns, server);
                const freeRam = getFreeRAM(ns);
                const neededRam = res.neededThreads * ns.getScriptRam(res.script);

                if (freeRam.totalAmount > neededRam) {
                    ns.printf("%s -- %s -> %s (%d threads - %d GB RAM)", new Date().toLocaleTimeString(), res.script, server, res.neededThreads, neededRam);
                    findAndExecuteScriptOnServers(ns, server, res.script, res.neededThreads);
                }
            }
        }

        await ns.sleep(1000);
    }
}

const findFreeScriptRAM: ITraversalFunction = (ns: NS, context: TraversalContext, args: { neededThreads: number, scriptCost: number, result: Map<string, number> }) => {
    const server = context.hostname;

    if (!ns.hasRootAccess(server)) return;

    const freeRAM = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
    const freeThreads = Math.floor(freeRAM / args.scriptCost);

    const threads = Math.min(freeThreads, args.neededThreads);

    if (threads > 0) {
        args.result.set(server, threads);
        args.neededThreads -= threads;
    }

    return args.neededThreads === 0;
};

function findAndExecuteScriptOnServers(ns: NS, target: string, script: string, neededThreads: number) {
    const threadMap = new Map<string, number>();

    new Traversal(findFreeScriptRAM, false, ["home"]).start(ns, "home", { neededThreads: neededThreads, scriptCost: ns.getScriptRam(script), result: threadMap });

    let pids: number[] = [];

    // ns.printf("%s -- %s on %s needs %d threads", new Date().toLocaleTimeString(), script, target, neededThreads);

    for (const [server, threads] of threadMap) {
        ns.rm(script, server);
        ns.scp(script, server);
        let pid = ns.exec(script, server, threads, target, threads, 0);
        // ns.printf("    %s -> %s threads, PID: %i", server, threads, pid);
        pids.push(pid);
    }

    monitorServers.set(target, pids);
}

function calculateWeakenThreads(ns: NS, target: string, targetMinSecurity: number) {
    // ns.printf("Performing weaken on %s to %s", target, targetMinSecurity);
    const targetCurrentSecurity = ns.getServerSecurityLevel(target);
    return Math.ceil((targetCurrentSecurity - targetMinSecurity) / 0.7);
}

function calculateGrowThreads(ns: NS, target: string) {
    const targetCurrentMoney = ns.getServerMoneyAvailable(target) + 1;
    const targetMaxMoney = ns.getServerMaxMoney(target);
    // ns.printf("Performing grow on %s: Has %s, max: %s", target, convertToHumanReadable(ns, targetCurrentMoney), convertToHumanReadable(ns, targetMaxMoney));
    return Math.ceil(ns.growthAnalyze(target, targetMaxMoney / targetCurrentMoney));
}

function calculateHackThreads(ns: NS, target: string) {
    // ns.printf("Performing hack on %s", target);
    return Math.ceil(ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) * 0.95));
}

function sortServersAfterProfit(ns: NS) {

    const serversWithMoney: ITraversalFunction = (ns: NS, context: TraversalContext, args: { result: Map<string, number> }) => {
        const server = context.hostname;

        // Filter for servers that are hackable
        if (!ns.hasRootAccess(server)) {
            return;
        }

        const money = ns.getServerMaxMoney(server);

        // Filter for servers that have money
        if (money > 0) {
            args.result.set(server, money);
        }
    };

    const serversWithMoneyMap = new Map<string, number>();

    new Traversal(serversWithMoney, false, ["home"]).start(ns, "home", { result: serversWithMoneyMap });

    return Array.from(serversWithMoneyMap.entries()).sort((a, b) => b[1] - a[1]);
}

