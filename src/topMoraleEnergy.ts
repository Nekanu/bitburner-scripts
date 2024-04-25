import { NS } from "types/netscript";

const setupDivision = "Agriculture";

export async function main(ns: NS) {
    ns.disableLog("ALL");

    // setup(ns);

    await topUpEnergyMorale(ns);
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