import { ITraversalFunction, Traversal } from "types/traversal";
import { NS } from "@ns";
import { getRamMapping, RamMapping } from "types/ramMapping";
import { deploymentFolder } from "./constants";

export function executeOnAllServers(ns: NS, func: ITraversalFunction, suppressOutput: boolean) {
    let traversal = new Traversal(func, suppressOutput);
    traversal.start(ns, ns.getHostname());
}

export function convertToHumanReadable(ns: NS, bytes: number) {
    return ns.format.number(bytes, 3);
}

export function deployFolder(ns: NS, hostname: string) {
    const files = ns.ls(ns.getHostname(), deploymentFolder + '/')
                    .concat(ns.ls(ns.getHostname(), '/lib/'))
                    .concat(ns.ls(ns.getHostname(), '/types/'));
    ns.scp(files, hostname);
} 

/**
 * Determines how many threads of a script fit on the home server right now, and how many
 * CPU cores that execution would run with. Home is the only server that can have more than
 * one core, so this is the hook point for cores-aware thread math.
 *
 * @param {RamMapping} ramMapping An already-fetched ram mapping (see {@link getRamMapping})
 * @param {NS} ns
 * @param {string} script The script that would be run on home
 * @param {number} freeHomeRamInGb The amount of ram to keep free on the home server
 * @returns {{ threads: number, cores: number }} The amount of threads that fit on home and home's core count
 */
export function getHomeThreadCapacity(ramMapping: RamMapping, ns: NS, script: string,
    freeHomeRamInGb: number = 0): { threads: number, cores: number } {

    const home = ramMapping.ramMap.get("home");
    if (!home) return { threads: 0, cores: 1 };

    const scriptCost = ns.getScriptRam(script);
    const threads = Math.max(0, Math.floor((home.ramFree - freeHomeRamInGb) / scriptCost));

    return { threads, cores: home.cores };
}

/**
 * Finds servers to run a script on and executes the script on them
 *
 * @param {NS} ns
 * @param {string} target The target server needed for the script
 * @param {string} script The script to run
 * @param {number} threads The amount of threads needed for maximum efficiency
 * @param {number} freeHomeRamInGb The amount of ram to keep free on the home server
 * @param {boolean} outputEnabled Whether to print information about the script execution
 * @param {RamMapping} ramMapping A ram mapping to use and update in place, instead of fetching a
 * fresh one. Pass the same instance across several calls in one tick so each call sees ram already
 * claimed by earlier ones.
 * @returns {[number, number][]} The pid of the script and the amount of threads used for each server
 */
export function findAndExecuteScriptOnServers(ns: NS, target: string, script: string, threads: number = 1,
    freeHomeRamInGb: number = 0, outputEnabled: boolean = true, ramMapping: RamMapping = getRamMapping(ns, [])): [number, number][] {

    const scriptCost = ns.getScriptRam(script);
    let totalAvailableThreads = 0;
    let neededThreadsLeft = threads;
    const threadMap = new Map<string, number>();

    // Generate a map containing the amount of threads to perform on each server
    ramMapping.ramMap.forEach((ram, server) => {
        let availableServerThreads = 0;
        if (server === "home") {
            // Let some ram free on the home server
            availableServerThreads = getHomeThreadCapacity(ramMapping, ns, script, freeHomeRamInGb).threads;
        } else {
            availableServerThreads = Math.floor(ram.ramFree / scriptCost);
        }

        totalAvailableThreads += Math.max(availableServerThreads, 0);

        if (availableServerThreads > 0 && neededThreadsLeft > 0) {
            // Calculate the amount of threads to use on this server
            let threads = Math.min(availableServerThreads, neededThreadsLeft);

            threadMap.set(server, threads);
            neededThreadsLeft -= threads;
        }
    });

    // If there are no threads available, return
    if (totalAvailableThreads == 0) {
        return [];
    }

    let pids: [number, number][] = [];

    // Execute the script on the servers as specified in the threadMap
    for (const [server, threads] of threadMap) {
        // Copy the script to the server
        ns.scp(script, server);

        // Execute the script
        let pid = ns.exec(script, server, threads, target, threads, 0);

        // Push all successful started processes specified by their to the array
        if (pid > 0) {
            pids.push([pid, threads]);

            // Reflect the ram just claimed, so a mapping shared across several
            // calls this tick keeps seeing accurate remaining capacity
            const consumed = threads * scriptCost;
            ramMapping.ramMap.get(server)?.consume(consumed);
            ramMapping.totalRamFree -= consumed;
        }
    }

    // Print information about the script execution, only if it is not the share script
    if (outputEnabled) {
        let threadsStarted = pids.reduce((prev, [, threads]) => prev + threads, 0);
        ns.printf("%-4s -> %-18s (%d / %d => %d)",
            script.split("/")[2].slice(0, 4), // Ugly way to get the shortened script name
            target, totalAvailableThreads, threads, threadsStarted);
    }

    return pids;
}
