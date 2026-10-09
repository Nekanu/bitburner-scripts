import { NS } from "@ns";

/* A simple lightweight script that is deployed
 * to remote and local servers to repeatedly hack
 * a particular server.
 * The smaller this is, the more threads can be deployed.
 * args[0] - server name
 * args[1] - threads to attack with
 * args[2] - server minimal security level
 * args[3] - server maximal money
 */
export async function main(ns: NS) {
    await hackServer(ns, ns.args[0] as string, ns.args[1] as number, ns.args[2] as number, ns.args[3] as number);
}

async function hackServer(ns: NS, server: string, threads: number, minSecurity: number, maxMoney: number) {
    ns.disableLog('getServerSecurityLevel');
    let serverSecurityThreshold = minSecurity + 10;
    let serverMoneyThreshold = maxMoney * 0.8;
    let opts = { threads: threads, stock: true };
    while (true) {
        // print current time
        ns.print(new Date().toLocaleTimeString());

        if (ns.getServerSecurityLevel(server) > serverSecurityThreshold) {
            await ns.weaken(server, opts);
        } else if (ns.getServerMoneyAvailable(server) < serverMoneyThreshold) {
            await ns.grow(server, opts);
        } else {
            await ns.hack(server, opts);
        }
        ns.printf("\n");
    }
}
