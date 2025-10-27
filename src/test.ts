import { NS } from "@ns";

const weakenScript = "/lib/weaken.js";
const growScript = "/lib/grow.js";
const hackScript = "/lib/hack.js";


export function autocomplete(data,) {
    return [...data.servers];
}

export function main(ns: NS) {
    let target = ns.args[0] as string;
    let action = determineActionAndNeededThreads(ns, target);

    const formulasAvailable = ns.fileExists("Formulas.exe", "home");
    const weakenTime = formulasAvailable ? timeToString(ns.formulas.hacking.weakenTime(ns.getServer(target), ns.getPlayer())) : undefined;
    const growTime = formulasAvailable ? timeToString(ns.formulas.hacking.growTime(ns.getServer(target), ns.getPlayer())) : undefined;
    const hackTime = formulasAvailable ? timeToString(ns.formulas.hacking.hackTime(ns.getServer(target), ns.getPlayer())) : undefined;

    ns.tprintf("%s:\n\tSecurity: %f <- %f\n\tMoney: %s / %s\n ", target, ns.getServerMinSecurityLevel(target), ns.getServerSecurityLevel(target), ns.nFormat(ns.getServerMoneyAvailable(target), "$0.000a"), ns.nFormat(ns.getServerMaxMoney(target), "$0.000a"));

    ns.tprintf("Weaken: %d (%s)", calculateWeakenThreads(ns, target), weakenTime ?? "unknown");
    ns.tprintf("Grow: %d (%s)", calculateGrowThreads(ns, target), growTime ?? "unknown");
    ns.tprintf("Hack: %d (%s)", calculateHackThreads(ns, target, 0.75), hackTime ?? "unknown");
    action.neededThreads;
    // ns.exec(action.script, target, action.neededThreads);
}

/**
 * Determines which action to take.
 * 
 * @param {NS} ns
 * @param {string} target
 * @returns The script to execute along with the number of threads needed
 */
function determineActionAndNeededThreads(ns: NS, target: string): { script: string, neededThreads: number } {

    if (ns.getServerMinSecurityLevel(target) < ns.getServerSecurityLevel(target)) {
        return { script: weakenScript, neededThreads: calculateWeakenThreads(ns, target) };
    } else if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
        return { script: growScript, neededThreads: calculateGrowThreads(ns, target) };
    } else {
        return { script: hackScript, neededThreads: calculateHackThreads(ns, target, 0.75) };
    }
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

function timeToString(time: number): string {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    const seconds = Math.floor(((time % 3600000) % 60000) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
}
