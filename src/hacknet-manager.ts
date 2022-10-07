import { NodeStats, NS } from "types/netscript";

const maxSecondsWaitingMultiplier = 1;
const playerMinimumMoney = 0;

let minimumNode: NodeStats = {
    level: 1,
    cores: 1,
    ram: 1,
    production: 0,
    timeOnline: 0,
    totalProduction: 0,
    name: "Minimum Node",
};

/** @param {NS} ns */
export async function main(ns: NS) {
    ns.disableLog("ALL");
    while (true) {
        await determinePurchase(ns);

        // Prevent blocking
        await ns.sleep(500);
    }
}

/** @param {NS} ns */
function checkPurchase(ns: NS, purchaseCost: number): number {

    const currentNodeProduction = getNodes(ns).reduce((a, b) => a + b.production, 0);

    var maxSecondsWaiting = maxSecondsWaitingMultiplier * ns.hacknet.numNodes();

    if (purchaseCost == 0 || purchaseCost == Infinity) {
        return -1;
    }

    const playerMoneyAvailable = ns.getPlayer().money - playerMinimumMoney;
    const playerMoneyAfterMaxWaiting = playerMoneyAvailable + (maxSecondsWaiting * currentNodeProduction);

    if (playerMoneyAfterMaxWaiting > purchaseCost) {
        if (playerMoneyAvailable < purchaseCost) {
            // Waits for the appropiate amount of time (+ 0.5s as error margin)
            const waitTime = (purchaseCost - playerMoneyAvailable) / currentNodeProduction + 0.5;
            return waitTime * 1000;
        }
        return 0;
    }

    return -1;
}

async function determinePurchase(ns: NS) {
    const nodePurchase = checkPurchase(ns, ns.hacknet.getPurchaseNodeCost());
    if (nodePurchase >= 0) {
        ns.printf("%s -- Purchasing new Node in %i seconds", new Date().toLocaleTimeString(), nodePurchase);
        await ns.sleep(nodePurchase);
        ns.hacknet.purchaseNode();

        // Reset minimum node to ensure that the new node is upgraded
        minimumNode.cores = 1;
        minimumNode.ram = 1;
        minimumNode.level = 1;

        return;
    }

    const nodes = getNodes(ns);

    // Upgrade all nodes to minimum Node template
    const nodesToUpgrade = nodes.filter(node => node.level < minimumNode.level || node.ram < minimumNode.ram || node.cores < minimumNode.cores);

    if (nodesToUpgrade.length > 0) {
        for (let i = 0; i < nodesToUpgrade.length; i++) {
            const node = nodesToUpgrade[i];
            const index = nodes.indexOf(node);
            if (node.level < minimumNode.level) {
                await tryLevelUpgrade(ns, index, node)
                return;
            }
            if (node.ram < minimumNode.ram) {
                await tryRamUpgrade(ns, index, node);
                return;
            }
            if (node.cores < minimumNode.cores) {
                await tryCoreUpgrade(ns, index, node)
                return;
            }
        }
    }

    // Detemine next upgrade
    determineNextUpgrade(ns);
}

async function tryLevelUpgrade(ns: NS, index: number, node: NodeStats) {
    const levelUpgrade = checkPurchase(ns, ns.hacknet.getLevelUpgradeCost(index, 1));
    if (levelUpgrade >= 0) {
        ns.printf("%s -- Upgrading Node %i to level %i in %i seconds", new Date().toLocaleTimeString(), index, node.level + 1, levelUpgrade / 1000);
        await ns.sleep(levelUpgrade);
        ns.hacknet.upgradeLevel(index, 1);
        return true;
    }
    return false;
}

async function tryRamUpgrade(ns: NS, index: number, node: NodeStats) {
    const ramUpgrade = checkPurchase(ns, ns.hacknet.getRamUpgradeCost(index, 1));
    if (ramUpgrade >= 0) {
        ns.printf("%s -- Upgrading Node %i RAM to %i GB in %i seconds", new Date().toLocaleTimeString(), index, node.ram * 2, ramUpgrade / 1000);
        await ns.sleep(ramUpgrade);
        ns.hacknet.upgradeRam(index, 1);
        return true;
    }
    return false;
}

async function tryCoreUpgrade(ns: NS, index: number, node: NodeStats) {
    const coreUpgrade = checkPurchase(ns, ns.hacknet.getCoreUpgradeCost(index, 1));
    if (coreUpgrade >= 0) {
        ns.printf("%s -- Upgrading Node %i Cores to %i in %i seconds", new Date().toLocaleTimeString(), index, node.cores + 1, coreUpgrade / 1000);
        await ns.sleep(coreUpgrade);
        ns.hacknet.upgradeCore(index, 1);
        return true;
    }
    return false;
}

function getNodes(ns: NS): NodeStats[] {
    let nodes: NodeStats[] = [];
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        nodes.push(ns.hacknet.getNodeStats(i));
    }
    return nodes;
}

function determineNextUpgrade(ns: NS) {

    if (minimumNode.level < 100) {
        minimumNode.level++;
        ns.printf("%s -- Upgrading minimum Node level to %i", new Date().toLocaleTimeString(), minimumNode.level);
        return;
    }

    if (minimumNode.ram < 64) {
        minimumNode.ram *= 2;
        ns.printf("%s -- Upgrading minimum Node RAM to %i GB", new Date().toLocaleTimeString(), minimumNode.ram);
        return
    }

    if (minimumNode.level < 180) {
        minimumNode.level++;
        ns.printf("%s -- Upgrading minimum Node level to %i", new Date().toLocaleTimeString(), minimumNode.level);
        return;
    }

    if (minimumNode.cores < 6) {
        minimumNode.cores++;
        ns.printf("%s -- Upgrading minimum Node cores to %i", new Date().toLocaleTimeString(), minimumNode.cores);
        return;
    }

    if (minimumNode.level < 200) {
        minimumNode.level++;
        ns.printf("%s -- Upgrading minimum Node level to %i", new Date().toLocaleTimeString(), minimumNode.level);
        return;
    }

    if (minimumNode.cores < 16) {
        minimumNode.cores++;
        ns.printf("%s -- Upgrading minimum Node cores to %i", new Date().toLocaleTimeString(), minimumNode.cores);
        return;
    }
}
