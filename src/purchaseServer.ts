import { NS } from "types/Netscript";

export async function main(ns: NS) {
    ns.tprintf("Purchasing a %dGB server costs %d", ns.args[0], ns.getPurchasedServerCost(ns.args[0] as number));

    if (ns.args[1]) {
        ns.tprint("Purchasing...");
        ns.purchaseServer(ns.args[1] as string, ns.args[0] as number);
    }
}