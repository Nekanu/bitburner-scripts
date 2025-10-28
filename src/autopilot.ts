import { CrimeType, NS, WorkStats } from "@ns";

const CrimeTimesSeconds: Map<CrimeType, number> = new Map([
    [CrimeType.shoplift, 2],
    [CrimeType.robStore, 60],
    [CrimeType.mug, 4],
    [CrimeType.larceny, 90],
    [CrimeType.dealDrugs, 10],
    [CrimeType.bondForgery, 300],
    [CrimeType.traffickArms, 40],
    [CrimeType.homicide, 3],
    [CrimeType.grandTheftAuto, 80],
    [CrimeType.kidnap, 120],
    [CrimeType.assassination, 300],
    [CrimeType.heist, 600],
]);

async function main(ns: NS) {
    ns.disableLog("ALL");

    const player = ns.getPlayer();

}

async function getMostProfitableWork(ns: NS) {
    const player = ns.getPlayer();
    const formulas = ns.formulas.work;

    for (const crime of Object.values(CrimeType)) {
        const duration = CrimeTimesSeconds.get(crime);
        if (duration === undefined) continue;
        const work: WorkStats = formulas.crimeGains(player, crime);
        const successRate = formulas.crimeSuccessChance(player, crime);


    }

    for (const faction of player.factions) {
        for (const workType of Object.values(ns.enums.FactionWorkType)) {
            const work: WorkStats = formulas.factionGains(player, workType, ns.singularity.getFactionFavor(faction));
            for (var key of Object.keys(work)) {
                work[key] *= 0.2; // Faction work is 20% as effective as normal work
            }
        }
    }
}
