import { NS } from "../types/netscript";

/* A simple lightweight script that is deployed
 * to remote and local servers to repeatedly hack
 * a particular server.
 * The smaller this is, the more threads can be deployed.
 * args[0] - server name
 * args[1] - threads to attack with
 */
export async function main(ns: NS) {
    let opts = { threads: ns.args[1] as number, stock: true };
    while (true) {
        await ns.hack(ns.args[0] as string, opts);
    }
}