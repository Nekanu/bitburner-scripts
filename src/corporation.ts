import { NS } from "types/netscript";

const setupDivision = "Agriculture";

export async function main(ns: NS) {
    ns.disableLog("ALL");

    // setup(ns);

    await topUpEnergyMorale(ns);
}

async function setup(ns: NS) {
    if (!ns.corporation.hasCorporation()) {
        ns.corporation.createCorporation("Nekanu Inc.", false);
    }

    ns.corporation.expandIndustry(setupDivision, setupDivision);
    ns.corporation.purchaseUnlock("Smart Supply");
    ns.corporation.hireAdVert(setupDivision);
    
    ns.corporation.getConstants().upgradeNames.forEach(upgrade => {
        if (upgrade === "Project Insight") return;
        if (upgrade === "Smart Storage") return;
        if (upgrade === "DreamSense") return;
        if (upgrade === "ABC SalesBots") return;
        if (upgrade === "Wilson Analytics") return;

        ns.corporation.levelUpgrade(upgrade);
        ns.corporation.levelUpgrade(upgrade);
    });

    for (const [_, city] of Object.entries(ns.enums.CityName)) {
        

        try {
            ns.corporation.expandCity(setupDivision, city);
            ns.corporation.purchaseWarehouse(setupDivision, city);
        } catch (e) {
            ns.print(`Failed to expand city ${city}`);
        }

        ns.corporation.setSmartSupply(setupDivision, city, true);
        ns.corporation.upgradeWarehouse(setupDivision, city, 2);

        ns.corporation.hireEmployee(setupDivision, city, "Operations");
        ns.corporation.hireEmployee(setupDivision, city, "Engineer");
        ns.corporation.hireEmployee(setupDivision, city, "Management");

        ns.corporation.sellMaterial(setupDivision, city, "Plants", "MAX", "MP");
        ns.corporation.sellMaterial(setupDivision, city, "Food", "MAX", "MP");

        ns.corporation.bulkPurchase(setupDivision, city, "Hardware", 125);
        ns.corporation.bulkPurchase(setupDivision, city, "AI Cores", 75);
        ns.corporation.bulkPurchase(setupDivision, city, "Real Estate", 25000);
    }

    let skipMoraleEnergy = false;

    // If investment offer is over 100B, accept it

    const investmentOffer = ns.corporation.getInvestmentOffer();
    ns.tprintf("Investment offer: %d", investmentOffer.funds);
    if (investmentOffer.funds > 100000000000) {
        ns.corporation.acceptInvestmentOffer();
        skipMoraleEnergy = true;
        ns.tprint("Accepted investment offer of 100B+. Skipping morale and energy checks.");
    }

    if (!skipMoraleEnergy) {
        await topUpEnergyMorale(ns);
        
        // Wait until we have a good offer
        while (ns.corporation.getInvestmentOffer().funds < 81000000000) {
            await ns.corporation.nextUpdate();
        }

        ns.corporation.acceptInvestmentOffer();
    }
}

async function topUpEnergyMorale(ns: NS) {
    let energyMoraleInsufficient = true;

    while (energyMoraleInsufficient) {
        energyMoraleInsufficient = false;

        for (const [_, city] of Object.entries(ns.enums.CityName)) {
            const office = ns.corporation.getOffice(setupDivision, city);

            if (office.avgEnergy < office.maxEnergy * 0.98) {
                energyMoraleInsufficient = true;
                ns.corporation.buyTea(setupDivision, city);
                ns.printf("Bought tea in %s", city);
            }

            if (office.avgMorale < office.maxMorale * 0.98) {
                energyMoraleInsufficient = true;
                ns.corporation.throwParty(setupDivision, city, 1000000);
                ns.printf("Threw Party in %s", city);
            }
        }

        // Wait one full update cycle
        const startWaitState = await ns.corporation.nextUpdate();
        while (await ns.corporation.nextUpdate() === startWaitState) {
            continue;
        }
    }
} 