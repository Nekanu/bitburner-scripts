import { CrimeType, NS, WorkStats } from "@ns";

const CrimeTimesSeconds: Map<CrimeType, number> = new Map([
    ["Shoplift", 2],
    ["Rob Store", 60],
    ["Mug", 4],
    ["Larceny", 90],
    ["Deal Drugs", 10],
    ["Bond Forgery", 300],
    ["Traffick Arms", 40],
    ["Homicide", 3],
    ["Grand Theft Auto", 80],
    ["Kidnap", 120],
    ["Assassination", 300],
    ["Heist", 600],
]);

async function main(ns: NS) {
    ns.disableLog("ALL");

    const player = ns.getPlayer();
}

async function getMostProfitableWork(ns: NS) {
    const player = ns.getPlayer();
    const formulas = ns.formulas.work;

    for (const faction of player.factions) {
        for (const workType of Object.values(ns.enums.FactionWorkType)) {
            const work: WorkStats = formulas.factionGains(player, workType, ns.singularity.getFactionFavor(faction));
        }
    }
}
