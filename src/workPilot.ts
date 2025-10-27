import { NS } from "@ns";
import { FactionWorkStats } from "types/factions";
import { tempFolder } from "./lib/constants";

const persistFile = `${tempFolder}/factionwork.txt`;

const cyan = "\u001b[36m";
const green = "\u001b[32m";
const reset = "\u001b[0m";

let factionStats: FactionWorkStats[] = [];


export async function main(ns: NS) {
    ns.disableLog("ALL");

    const player = ns.getPlayer();

    player.factions.forEach(faction => {

        // Exclude "Shadows of Anarchy" faction since it's not possible to work for them
        if (faction === "Shadows of Anarchy") {
            return;
        }

        let stats = factionStats.find(f => f.faction === faction);
        if (stats === undefined) {
            stats = new FactionWorkStats(ns, faction);
            factionStats.push(stats);
        }
        stats.update(ns);

        if (stats.currentFavor < ns.getFavorToDonate() && stats.reputationNeeded < 0) {
            ns.tprintf(`%s -- ${green}Need to reset to donate!${reset}`, faction);
        }

        if (stats.currentFavor > ns.getFavorToDonate()) {
            ns.tprintf(`%s -- ${green}No reputation needed!${reset}`, faction);
            return;
        }

        const workPerSecHacking = ns.formulas.work.factionGains(player, ns.enums.FactionWorkType.hacking, stats.currentFavor).reputation * 5;
        const workPerSecField = ns.formulas.work.factionGains(player, ns.enums.FactionWorkType.field, stats.currentFavor).reputation * 5;
        const workPerSecSecurity = ns.formulas.work.factionGains(player, ns.enums.FactionWorkType.security, stats.currentFavor).reputation * 5;

        const timeNeededInSecondsHacking = stats.reputationNeeded / workPerSecHacking;
        const timeNeededInSecondsField = stats.reputationNeeded / workPerSecField;
        const timeNeededInSecondsSecurity = stats.reputationNeeded / workPerSecSecurity;

        ns.tprintf(`%s -- %d reputation needed (Current Favor: %d):`, faction, stats.reputationNeeded, stats.currentFavor);
        ns.tprintf("\tHacking  (%.3f rep/s): %s", workPerSecHacking, formatTimeSeconds(timeNeededInSecondsHacking));
        ns.tprintf("\tField    (%.3f rep/s): %s", workPerSecField, formatTimeSeconds(timeNeededInSecondsField));
        ns.tprintf("\tSecurity (%.3f rep/s): %s", workPerSecSecurity, formatTimeSeconds(timeNeededInSecondsSecurity));
        ns.tprintf(`Reset will bring ${cyan}%d favor${reset}`, ns.singularity.getFactionFavorGain(faction));
        ns.tprint("");
    });

    // Persist new status
    ns.write(persistFile, JSON.stringify(factionStats), "w");
}

function formatTimeSeconds(seconds: number): string {
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds / 60) % 60)}m ${Math.floor(seconds % 60)}s`;
}
