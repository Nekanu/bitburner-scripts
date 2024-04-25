import { NS } from "types/netscript";
import { convertToHumanReadable } from "lib/helpers";

export async function main(ns: NS) {
    const playerMoney = ns.getPlayer().money;
    const purchasedServers = ns.getPurchasedServers();
    const maxNumberServers = ns.getPurchasedServerLimit();

    // If no arguments are given, print the prices of each RAM size (64 GB -> 1 PB)
    if (ns.args.length < 1) {
        let ram = 32;
        while (ram <= 2 ** 19) {
            const purchaseCost = ns.getPurchasedServerCost(ram);

            if (purchaseCost < playerMoney) {
                ns.tprintf("INFO -- %7d GB RAM: %s", ram, convertToHumanReadable(ns, purchaseCost));
            } else {
                ns.tprintf("WARN -- %7d GB RAM: %s", ram, convertToHumanReadable(ns, purchaseCost));
            }
            ram *= 2;
        }
        return;
    }

    const ram = ns.args[0] as number;

    // Check if RAM size is valid (must be a power of 2)
    if (!(ram && (ram & (ram - 1)) === 0)) {
        ns.tprintf("ERROR -- RAM must be a power of 2");
        return;
    }

    let serverName = ns.args[1] as string || `prim${purchasedServers.length < 10 ? "0" : ""}${purchasedServers.length}`;

    // If no server name is given, find the first available name OR replace the server with the lowest RAM
    if (ns.args[1] === undefined) {
        if (purchasedServers.length < maxNumberServers) {
            serverName = `prim${purchasedServers.length < 10 ? "0" : ""}${purchasedServers.length}`;
        } else {
            serverName = purchasedServers.reduce((a, b) =>
                ns.getServerMaxRam(a) < ns.getServerMaxRam(b) ? a : b
            );
        }
    }
    // Check if player has enough money
    if (ns.getPurchasedServerCost(ram) > ns.getPlayer().money) {
        ns.tprintf("ERROR -- You don't have enough money to purchase this server!");
        return;
    }

    // Cannot purchase more servers than the limit
    // Exception is if the server is already purchased
    if (purchasedServers.length >= maxNumberServers && !purchasedServers.includes(serverName)) {
        ns.tprintf("ERROR -- You can't purchase more servers!");
        return;
    }

    // Cannot purchase a server with the same name as an existing server
    // Exception is if the server is to be replaced
    if (purchasedServers.includes(serverName) && purchasedServers.length >= maxNumberServers) {

        const serverRAM = ns.getServerMaxRam(serverName);

        // Prevent the sever from being replaced with a server of the same size or downgraded
        if (ram <= serverRAM) {
            ns.tprintf("ERROR -- You can't replace a server with a smaller or equal RAM size! %d GB -> %d GB", serverRAM, ram);
            return;
        }

        ns.tprintf("WARNING -- Upgrading %s: %d GB -> %d GB!", serverName, serverRAM, ram);
        ns.killall(serverName);
        ns.deleteServer(serverName);
        ns.purchaseServer(serverName, ram);
        return;
    }

    if (purchasedServers.includes(serverName)) {
        ns.tprintf("ERROR -- You already have a server with this name!");
        return;
    }

    ns.tprintf("SUCCESS -- Purchasing server %s with %d GB RAM for %s", serverName, ram, convertToHumanReadable(ns, ns.getPurchasedServerCost(ram)));
    ns.purchaseServer(serverName, ram);
}