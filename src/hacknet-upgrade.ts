import { NS } from "types/netscript";

let maxSecondsWaitingMultiplier = 2;

/** @param {NS} ns */
export async function main(ns: NS) {
    ns.disableLog("ALL");
    while (true) {
        await run(ns);
        // Prevent blocking
        await ns.sleep(200);
    }
}

/** @param {NS} ns */
function checkPurchase(ns: NS, purchaseCost: number, currentNodeProduction: number): number {

    var maxSecondsWaiting = maxSecondsWaitingMultiplier * ns.hacknet.numNodes();

    if (purchaseCost == 0 || purchaseCost == Infinity) {
        return -1;
    }

    const currentPlayerMoney = ns.getPlayer().money;
    const playerMoneyAfterMaxWaiting = currentPlayerMoney + (maxSecondsWaiting * currentNodeProduction);

    if (playerMoneyAfterMaxWaiting > purchaseCost) {
        if (currentPlayerMoney < purchaseCost) {
            // Waits for the appropiate amount of time (+ 0.5s as error margin)
            const waitTime = (purchaseCost - currentPlayerMoney) / currentNodeProduction + 0.5;
            return waitTime * 1000;
        }
        return 0;
    }

    return -1;
}

/** @param {NS} ns */
async function run(ns: NS) {
    let currentNodeProduction = 0;

    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        currentNodeProduction += ns.hacknet.getNodeStats(i).production;
    }

    let purchaseCheck = checkPurchase(ns, ns.hacknet.getPurchaseNodeCost(), currentNodeProduction);

    // Always prefer buying new nodes over upgrading existing ones
    if (purchaseCheck >= 0) {
        ns.printf("Purchasing new Node in %i seconds", purchaseCheck / 1000);
        await ns.sleep(purchaseCheck);
        ns.hacknet.purchaseNode();
        return;
    }

    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        const nodeStats = ns.hacknet.getNodeStats(i);

        // Prioritize level upgrading in the beginning
        if (nodeStats.level < 100) {
            if (nodeStats.level < 10) {
                purchaseCheck = checkPurchase(ns, ns.hacknet.getLevelUpgradeCost(i, nodeStats.level % 10), currentNodeProduction);

                if (purchaseCheck >= 0) {
                    ns.printf("Upgrading Node %i to level %i in %i seconds", i, nodeStats.level + nodeStats.level % 10, purchaseCheck / 1000);
                    await ns.sleep(purchaseCheck);
                    ns.hacknet.upgradeLevel(i, nodeStats.level % 10);
                    return;
                }
            }

            purchaseCheck = checkPurchase(ns, ns.hacknet.getLevelUpgradeCost(i, 10), currentNodeProduction);
            if (purchaseCheck >= 0) {
                ns.printf("Upgrading Node %i to level %i in %i seconds", i, nodeStats.level + 10, purchaseCheck / 1000);
                await ns.sleep(purchaseCheck);
                ns.hacknet.upgradeLevel(i, 10);
                return;
            }
        }

        purchaseCheck = checkPurchase(ns, ns.hacknet.getRamUpgradeCost(i, 1), currentNodeProduction);
        if (purchaseCheck >= 0) {
            ns.printf("Upgrading Node %i RAM to level %i in %i seconds", i, nodeStats.ram * 2, purchaseCheck / 1000);
            await ns.sleep(purchaseCheck);
            ns.hacknet.upgradeRam(i, 1);
            return;
        }

        purchaseCheck = checkPurchase(ns, ns.hacknet.getCoreUpgradeCost(i, 1), currentNodeProduction);
        if (purchaseCheck >= 0) {
            ns.printf("Upgrading Node %i Cores to %i in %i seconds", i, nodeStats.cores + 1, purchaseCheck / 1000);
            await ns.sleep(purchaseCheck);
            ns.hacknet.upgradeCore(i, 1);
            return;
        }

        purchaseCheck = checkPurchase(ns, ns.hacknet.getLevelUpgradeCost(i, 10), currentNodeProduction);
        if (purchaseCheck >= 0) {
            ns.printf("Upgrading Node %i to level %i in %i seconds", i, nodeStats.level + 10, purchaseCheck / 1000);
            await ns.sleep(purchaseCheck);
            ns.hacknet.upgradeLevel(i, 10);
            return;
        }
    }
}