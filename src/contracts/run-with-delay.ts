/**
 * MIT (c) 2021 Alain Bryden
 * 
 * @author Alain Bryden
 * @repository https://github.com/alainbryden/bitburner-scripts
 * 
 * Last updated: 2021-08-01
 */

import { NS } from "@ns";

/**
 * @param {NS} ns
 * Similar to ns.spawn, but can be run for cheaper (1GB for ns.run vs 2GB for ns.spawn), the delay can be shorter,
 * and you have the option to *not* shut down the current script, but instead continue execution.
 **/
export async function main(ns: NS) {
    var scriptpath = ns.args[0] as string; // Name of script to run is arg 0
    var delay = ns.args[1] as number; // Delay time is arg 1
    // Any additional args are forwarded to the script being run
    var forwardedArgs = ns.args.length > 2 ? ns.args.slice(2) : [];
    await ns.sleep(delay || 100);
    var pid = ns.run(scriptpath, 1, ...forwardedArgs);
    if (!pid)
        ns.tprint(`Failed to spawn "${scriptpath}" with args: ${forwardedArgs} (bad file name or insufficient RAM?)`);
}
