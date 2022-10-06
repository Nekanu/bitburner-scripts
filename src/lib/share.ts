import { NS } from "types/netscript";

/**
 * @param {NS} ns
 * @arg {string} hostname
 * @arg {number} threads
 * @arg {number} delay
 */
export async function main(ns: NS) {
    while (true) {
        await ns.sleep(ns.args[2] as number || 0);
        await ns.share();
    }
}