import { NS } from "types/Netscript";

let maxSecondsWaitingMultiplier = 2;

/** @param {NS} ns */
export async function main(ns: NS) {
    ns.disableLog("sleep")
    while (true) {
        await run(ns);
        // Prevent blocking
        await ns.sleep(200);
    }
}

/** @param {NS} ns */
async function checkAndWaitForPurchase(ns: NS, purchaseCost: number, currentNodeProduction: number) {

    var maxSecondsWaiting = maxSecondsWaitingMultiplier * ns.hacknet.numNodes();

    if (purchaseCost == 0 || purchaseCost == Infinity) {
        return false;
    }

    const currentPlayerMoney = ns.getPlayer().money;
    const playerMoneyAfterMaxWaiting = currentPlayerMoney + (maxSecondsWaiting * currentNodeProduction);

    if (playerMoneyAfterMaxWaiting > purchaseCost) {
        if (currentPlayerMoney < purchaseCost) {
            // Waits for the appropiate amount of time (+ 0.5s as error margin)
            const waitTime = (purchaseCost - currentPlayerMoney) / currentNodeProduction + 0.5;
            ns.printf("Waiting for %i seconds", waitTime);
            await ns.sleep(waitTime * 1000);
        }
        return true;
    }

    return false;
}

/** @param {NS} ns */
async function run(ns: NS) {
    let currentNodeProduction = 0;

    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        currentNodeProduction += ns.hacknet.getNodeStats(i).production;
    }

    // Always prefer buying new nodes over upgrading existing ones
    if (await checkAndWaitForPurchase(ns, ns.hacknet.getPurchaseNodeCost(), currentNodeProduction)) {
        ns.print("Purchasing new Node");
        ns.hacknet.purchaseNode();
        return;
    }

    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        if (await checkAndWaitForPurchase(ns, ns.hacknet.getRamUpgradeCost(i, 1), currentNodeProduction)) {
            ns.print("Purchasing more RAM on node " + i);
            ns.hacknet.upgradeRam(i, 1);
            return;
        }

        if (await checkAndWaitForPurchase(ns, ns.hacknet.getCoreUpgradeCost(i, 1), currentNodeProduction)) {
            ns.print("Purchasing more cores on node " + i);
            ns.hacknet.upgradeCore(i, 1);
            return;
        }

        if (await checkAndWaitForPurchase(ns, ns.hacknet.getLevelUpgradeCost(i, 1), currentNodeProduction)) {
            ns.print("Purchasing higher level on node " + i);
            ns.hacknet.upgradeLevel(i, 1);
            return;
        }
    }
}