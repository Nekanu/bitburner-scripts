import { ITraversalFunction, Traversal } from "types/traversal";
import { NS } from "@ns";
import { getRamMapping } from "types/ramMapping";

export function executeOnAllServers(ns: NS, func: ITraversalFunction, suppressOutput: boolean) {
    let traversal = new Traversal(func, suppressOutput);
    traversal.start(ns, ns.getHostname());
}

export function convertToHumanReadable(ns: NS, bytes: number) {
    return ns.formatNumber(bytes, 3);
}

/**
 * Finds servers to run a script on and executes the script on them
 * 
 * @param {NS} ns
 * @param {string} target The target server needed for the script
 * @param {string} script The script to run
 * @param {number} threads The amount of threads needed for maximum efficiency
 * @returns {[number, number][]} The pid of the script and the amount of threads used for each server
 */
export function findAndExecuteScriptOnServers(ns: NS, target: string, script: string, threads: number = 1,
    freeHomeRamInGb: number = 0, outputEnabled: boolean = true): [number, number][] {

    // Get the free ram mapping
    const ramMapping = getRamMapping(ns, []);

    const scriptCost = ns.getScriptRam(script);
    let totalAvailableThreads = 0;
    let neededThreadsLeft = threads;
    const threadMap = new Map<string, number>();

    // Generate a map containing the amount of threads to perform on each server
    ramMapping.ramMap.forEach((ram, server) => {
        let availableServerThreads = 0;
        if (server === "home") {
            // Let some ram free on the home server
            availableServerThreads = Math.floor((ram.ramFree - freeHomeRamInGb) / scriptCost);
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
