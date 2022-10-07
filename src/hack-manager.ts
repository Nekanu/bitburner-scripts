import { NS } from "types/netscript";
import { getRamMapping, ITraversalFunction, Traversal, TraversalContext } from "types/traversal";

const weakenScript = "/lib/weaken.js";
const growScript = "/lib/grow.js";
const hackScript = "/lib/hack.js";
const shareScript = "/lib/share.js";

const monitorServers = new Map<string, number[]>();

/**
 * The main function of the script
 * 
 * @param {NS} ns
 */
export async function main(ns: NS) {
    ns.disableLog("ALL");
    // ns.enableLog("exec");

    let hackingLevel = 0;

    let profitableServers = sortServersAfterProfit(ns);
    let blockedServers: string[] = [];

    while (true) {

        // Check if any of the running pid's are done and filter
        for (const [server, pids] of monitorServers) {

            if (!ns.isRunning(pids[0], server)) {
                // ns.printf("%s -- %s finished! Resetting blocklist", new Date().toLocaleTimeString(), server);
                monitorServers.delete(server);
                blockedServers = [];
            }
        }

        if (hackingLevel < ns.getHackingLevel() && hackingLevel < 2000) {
            hackingLevel = ns.getHackingLevel();
            ns.exec("escalate.js", "home", 1, "--silent");
            profitableServers = sortServersAfterProfit(ns);
        }

        for (const [server,] of profitableServers) {
            if (!monitorServers.has(server) && !blockedServers.includes(server)) {
                const res = determineActionAndNeededThreads(ns, server);
                const freeRam = getRamMapping(ns);
                let availableThreads = 0;
                freeRam.ramMapping.forEach((ram,) => {
                    availableThreads += Math.floor(ram[0] / ns.getScriptRam(res.script));
                });

                if (availableThreads > 0) {
                    ns.printf("%s -- %-14s -> %-18s (%d / %d)", new Date().toLocaleTimeString(), res.script, server, res.neededThreads, availableThreads);
                    let pids = findAndExecuteScriptOnServers(ns, server, res.script, res.neededThreads);
                    monitorServers.set(server, pids);
                } else {
                    blockedServers.push(server);
                }
            }
        }

        // If there is enough free ram, run share script and wait until it is done
        if (getRamMapping(ns).total[0] > 20000) {
            //findAndExecuteScriptOnServers(ns, profitableServers[0][0], weakenScript, Number.MAX_VALUE);
            findAndExecuteScriptOnServers(ns, "", shareScript, Number.MAX_VALUE);
            await ns.sleep(10000);
        }

        await ns.sleep(1000);
    }
}

/**
 * Determines which action to take.
 * 
 * @param {NS} ns
 * @param {string} target
 * @returns The script to execute along with the number of threads needed
 */
function determineActionAndNeededThreads(ns: NS, target: string): { script: string, neededThreads: number } {

    if (ns.getServerMinSecurityLevel(target) < ns.getServerSecurityLevel(target) * 0.9) {
        return { script: weakenScript, neededThreads: calculateWeakenThreads(ns, target) };
    } else if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.95) {
        return { script: growScript, neededThreads: calculateGrowThreads(ns, target) };
    } else {
        return { script: hackScript, neededThreads: calculateHackThreads(ns, target, 0.75) };
    }
}

/**
 * Finds the 
 */
const findFreeScriptRAM: ITraversalFunction = (ns: NS, context: TraversalContext, args: { neededThreads: number, scriptCost: number, result: Map<string, number> }) => {
    const server = context.hostname;

    if (!ns.hasRootAccess(server)) return;

    let maxRam = ns.getServerMaxRam(server);

    const freeRAM = maxRam - ns.getServerUsedRam(server);
    const freeThreads = Math.floor(freeRAM / args.scriptCost);

    const threads = Math.min(freeThreads, args.neededThreads);

    if (threads > 0) {
        args.result.set(server, threads);
        args.neededThreads -= threads;
    }
};

function findAndExecuteScriptOnServers(ns: NS, target: string, script: string, neededThreads: number): number[] {
    const threadMap = new Map<string, number>();

    new Traversal(findFreeScriptRAM, false, ["home"]).start(ns, "home", { neededThreads: neededThreads, scriptCost: ns.getScriptRam(script), result: threadMap });

    let pids: number[] = [];

    // ns.printf("%s -- %s on %s needs %d threads", new Date().toLocaleTimeString(), script, target, neededThreads);

    for (const [server, threads] of threadMap) {
        if (server !== "home") {
            ns.rm(script, server);
        }

        ns.scp(script, server);
        let pid = ns.exec(script, server, threads, target, threads, 0);
        // ns.printf("    %s -> %s threads, PID: %i", server, threads, pid);
        if (pid > 0) {
            pids.push(pid);
        }
    }

    return pids;
}

/**
 * Calculates the number of threads needed to weaken a server to its minimum security level
 * 
 * @param {NS} ns
 * @arg {string} target
 * @returns {number} The number of threads needed to weaken the target server to minimum security level
 */
function calculateWeakenThreads(ns: NS, target: string) {
    let threads = 1;
    while (ns.weakenAnalyze(threads) < (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target))) {
        threads++;
    }

    return threads;
}

/**
 * Calculates the number of threads needed to grow a server to its maximum money level
 * (Becomes unreliable if the server has no money)
 * 
 * @param {NS} ns
 * @arg {string} target
 * @returns {number} The number of threads needed to grow the target server to maximum money level
 */
function calculateGrowThreads(ns: NS, target: string) {

    // Use 100 000 as base value if server has no money (to avoid division by zero)
    const targetCurrentMoney = ns.getServerMoneyAvailable(target) == 0 ? 100000 : ns.getServerMoneyAvailable(target);
    const targetMaxMoney = ns.getServerMaxMoney(target);
    return Math.ceil(ns.growthAnalyze(target, targetMaxMoney / targetCurrentMoney));
}

/**
 * Calculates the number of threads needed to hack a server to get a specific amount of money
 * 
 * @param {NS} ns
 * @param {string} target The target to hack
 * @param {number} percentage The percentage of the target server's available money to hack
 * @returns {number} The number of threads needed to hack the target server to get the specified percentage of its available money
 */
function calculateHackThreads(ns: NS, target: string, percentage: number) {
    // Do only hack 75% of the money of this server to make sure we can re-grow it relatively easily
    return Math.ceil(ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) * percentage));
}

/**
 * Returns a sorted list of all servers sorted by their profitability
 * 
 * @param {NS} ns
 * @returns {[string, number]} A list of all servers sorted by their profitability
 */
function sortServersAfterProfit(ns: NS) {

    const serversWithMoney: ITraversalFunction = (ns: NS, context: TraversalContext, args: { result: Map<string, number> }) => {
        const server = context.hostname;

        // Filter for servers that are hackable
        if (!ns.hasRootAccess(server)) {
            return;
        }

        const money = ns.getServerMaxMoney(server);

        // Filter for servers that have money
        if (money > ns.getTotalScriptIncome()[0]) {
            args.result.set(server, money);
        }
    };

    const serversWithMoneyMap = new Map<string, number>();

    new Traversal(serversWithMoney, false, ["home"]).start(ns, "home", { result: serversWithMoneyMap });

    return Array.from(serversWithMoneyMap.entries()).sort((a, b) => b[1] - a[1]);
}

