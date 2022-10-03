import { NS } from "types/Netscript";

/* A simple lightweight script that is deployed
 * to remote and local servers to repeatedly hack
 * a particular server.
 * The smaller this is, the more threads can be deployed.
 * args[0] - server name
 * args[1] - threads to attack with
 */
export async function main(ns: NS) {
    await hackServer(ns, ns.args[0] as string, ns.args[1] as number);
}

async function hackServer(ns: NS, server: string, threads: number) {
    ns.disableLog('getServerSecurityLevel');
    let serverSecurityThreshold = ns.getServerMinSecurityLevel(server) + 10;
    let serverMoneyThreshold = ns.getServerMaxMoney(server) * 0.8;
    let opts = { threads: threads, stock: true };
    while (true) {
        if (ns.getServerSecurityLevel(server) > serverSecurityThreshold) {
            await ns.weaken(server, opts);
        } else if (ns.getServerMoneyAvailable(server) < serverMoneyThreshold) {
            await ns.grow(server, opts);
        } else {
            await ns.hack(server, opts);
        }
    }
}