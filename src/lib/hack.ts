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
    const targetHost: string = ns.args[0] as string;
    const threads: number = ns.args[1] as number;
    const sleepMilliseconds: number = ns.args[2] as number || 0;

    await ns.sleep(sleepMilliseconds);
    await ns.hack(targetHost, { threads: threads, stock: true });
}
