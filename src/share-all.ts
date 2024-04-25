import { NS } from "types/netscript";
import { getRamMapping } from "types/ramMapping";


const shareScript = "/lib/share.js";
const freeHomeRamInGB = 55555555;

/**
 * The main function of the script
 * 
 * @param {NS} ns
 */
export async function main(ns: NS) {

    while (true) {
        findAndExecuteScriptOnServers(ns, "", shareScript, Number.MAX_VALUE);
        await ns.sleep(10500);
    }
}

/**
 * Finds servers to run a script on and executes the script on them
 * 
 * @param {NS} ns
 * @param {string} target The target server needed for the script
 * @param {string} script The script to run
 * @param {number} neededThreads The amount of threads needed for maximum efficiency
 * @returns {[number, number][]} The pid of the script and the amount of threads used for each server
 */
function findAndExecuteScriptOnServers(ns: NS, target: string, script: string, neededThreads: number): [number, number][] {

    // Get the free ram mapping
    const ramMapping = getRamMapping(ns, []);

    const scriptCost = ns.getScriptRam(script);
    let totalAvailableThreads = 0;
    let neededThreadsLeft = neededThreads;
    const threadMap = new Map<string, number>();

    // Generate a map containing the amount of threads to perform on each server
    ramMapping.ramMap.forEach((ram, server) => {

        let availableServerThreads = 0;
        if (server === "home") {
            // Let some ram free on the home server
            availableServerThreads = Math.floor((ram.ramFree - freeHomeRamInGB) / scriptCost);
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
        // Removes the old script from the server
        if (server !== "home") {
            // ns.rm(script, server);
        }

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
    if (script !== shareScript) {
        let threadsStarted = pids.reduce((prev, [, threads]) => prev + threads, 0);
        ns.printf("%s -- %-4s -> %-18s (%d / %d => %d)", new Date().toLocaleTimeString(), 
            script.split("/")[2].slice(0,4), // Ugly way to get the shortened script name
            target, totalAvailableThreads, neededThreads, threadsStarted);
    }

    return pids;
}
