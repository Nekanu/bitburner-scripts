import { NS } from "types/netscript";
import { getRamMapping, ITraversalFunction, Traversal, TraversalContext } from "types/traversal";

const weakenScript = "/lib/weaken.js";
const growScript = "/lib/grow.js";
const hackScript = "/lib/hack.js";
const shareScript = "/lib/share.js";

const monitorServers = new Map<string, number[]>();

function determineActionAndNeededRam(ns: NS, target: string): { script: string, neededThreads: number } {

    // const growthFactor = ns.getHackingLevel() / 1000 < 0.95 ? ns.getHackingLevel() / 1000 : 0.95;

    if (ns.getServerMinSecurityLevel(target) < ns.getServerSecurityLevel(target) * 0.9) {
        return { script: weakenScript, neededThreads: calculateWeakenThreads(ns, target) };
    } else if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.95) {
        return { script: growScript, neededThreads: calculateGrowThreads(ns, target, 0.95) };
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
    // ns.enableLog("exec");

    let hackingLevel = 0;

    let profitableServers = sortServersAfterProfit(ns);
    let blockedServers: string[] = [];

    ns.printf("Most profitable server: %s -> %d", profitableServers[0][0], profitableServers[0][1]);

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
                const res = determineActionAndNeededRam(ns, server);
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

function findAndExecuteScriptOnServers(ns: NS, target: string, script: string, neededThreads: number): number[] {
    const threadMap = new Map<string, number>();

    new Traversal(findFreeScriptRAM, false, ["home"]).start(ns, "home", { neededThreads: neededThreads, scriptCost: ns.getScriptRam(script), result: threadMap });

    let pids: number[] = [];

    // ns.printf("%s -- %s on %s needs %d threads", new Date().toLocaleTimeString(), script, target, neededThreads);

    for (const [server, threads] of threadMap) {
        ns.rm(script, server);
        ns.scp(script, server);
        let pid = ns.exec(script, server, threads, target, threads, 0);
        // ns.printf("    %s -> %s threads, PID: %i", server, threads, pid);
        if (pid > 0) {
            pids.push(pid);
        }
    }

    return pids;
}

function calculateWeakenThreads(ns: NS, target: string) {
    // ns.printf("Performing weaken on %s to %s", target, targetMinSecurity);
    let threads = 1;
    while (ns.weakenAnalyze(threads) < (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target))) {
        threads++;
    }

    return threads;
}

function calculateGrowThreads(ns: NS, target: string, growthFactor: number) {
    const targetCurrentMoney = ns.getServerMoneyAvailable(target) + 1;
    const targetMaxMoney = ns.getServerMaxMoney(target) * growthFactor;
    //ns.printf("Performing grow on %s: Has %s, max: %s", target, convertToHumanReadable(ns, targetCurrentMoney), convertToHumanReadable(ns, targetMaxMoney));
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
        if (money > ns.getTotalScriptIncome()[0]) {
            args.result.set(server, money);
        }
    };

    const serversWithMoneyMap = new Map<string, number>();

    new Traversal(serversWithMoney, false, ["home"]).start(ns, "home", { result: serversWithMoneyMap });

    return Array.from(serversWithMoneyMap.entries()).sort((a, b) => b[1] - a[1]);
}

