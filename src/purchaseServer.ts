import { NS } from "@ns";
import { convertToHumanReadable } from "lib/helpers";

function purchaseBestServer(ns: NS) {
    const playerMoney = ns.getPlayer().money;
    let ram = 16;
    while (ram <= 2 ** 18) {
        const purchaseCost = ns.cloud.getServerCost(ram);

        if (purchaseCost > playerMoney) {
            ram /= 2;
            break;
        }
        ram *= 2;
    }


    const purchasedServers = ns.cloud.getServerNames();
    const maxNumberServers = ns.cloud.getServerLimit();

    if (purchasedServers.length < maxNumberServers) {
        purchaseServer(ns, ram);
        return;
    }
    else {
        const minServer = findServerWithLowestRam(ns);
        if (minServer[1] > ram) {
            ns.print(`Cannot affort to upgrade ${minServer[0]} from ${minServer[1]} to ${ram}`);
        } 
        else {
            purchaseServer(ns, ram, minServer[0])
        }
    }
    
}

function findServerWithLowestRam(ns: NS): [string, number] {
    const purchasedServers = ns.cloud.getServerNames();
    return purchasedServers.reduce<[string, number]>(([minName, minRam], serverName) => {
        const ramB = ns.getServerMaxRam(serverName);
        return minRam < ramB ? [minName, minRam] : [serverName, ramB];
    }, ["", Number.MAX_VALUE])
}

function purchaseServer(ns: NS, ram: number, serverName?: string) {
    const purchasedServers = ns.cloud.getServerNames();
    const maxNumberServers = ns.cloud.getServerLimit();

    // Check if player has enough money
    if (ns.cloud.getServerCost(ram) > ns.getPlayer().money) {
        ns.tprintf("ERROR -- You don't have enough money to purchase this server!");
        return;
    }

    serverName ??= `prim${purchasedServers.length < 10 ? "0" : ""}${purchasedServers.length}`;

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
        ns.cloud.deleteServer(serverName);
    }

    if (ns.cloud.getServerNames().includes(serverName)) {
        ns.tprintf("ERROR -- You already have a server with name %s!", serverName);
        return;
    }

    ns.tprintf("SUCCESS -- Purchasing server %s with %d GB RAM for %s", serverName, ram, convertToHumanReadable(ns, ns.cloud.getServerCost(ram)));
    ns.cloud.purchaseServer(serverName, ram);
}

export async function main(ns: NS) {
    const playerMoney = ns.getPlayer().money;

    // If no arguments are given, print the prices of each RAM size (64 GB -> 1 PB)
    if (ns.args.length < 1) {
        let ram = 16;
        while (ram <= 2 ** 19) {
            const purchaseCost = ns.cloud.getServerCost(ram);

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

    if (ram == 0) {
        purchaseBestServer(ns);
        return;
    }

    // Check if RAM size is valid (must be a power of 2)
    if (!(ram && (ram & (ram - 1)) === 0)) {
        ns.tprintf("ERROR -- RAM must be a power of 2");
        return;
    }

    purchaseServer(ns, ram);
}
