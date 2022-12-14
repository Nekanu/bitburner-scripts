import { NS } from "types/netscript";


export function autocomplete(data,) {
    return [...data.servers];
}

/**
 * @param {NS} ns
 * @arg {string} hostname
 * @arg {number} threads
 * @arg {number} delay
 */
export async function main(ns: NS) {
    await ns.sleep(ns.args[2] as number || 0);
    await ns.hack(ns.args[0] as string, { threads: ns.args[1] as number, stock: true });
}