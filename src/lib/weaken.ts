import { AutocompleteData, NS } from "@ns";


export function autocomplete(data: AutocompleteData,) {
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
    await ns.weaken(ns.args[0] as string, { threads: ns.args[1] as number, stock: true });
}
