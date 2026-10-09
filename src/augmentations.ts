import { factionExclusiveAugmentations, preventingFactions } from "types/factions";
import { FactionName, NS } from "@ns";



export async function main(ns: NS) {
    // Accept faction invitations

    // Find next augmentations to buy

}

function checkFactionInvite(ns: NS, faction: FactionName): boolean {

    // If faction does not block us from joining other factions, we can safely join
    if (!preventingFactions.get(faction)) {
        return true;
    }

    // Else, check if we have the exclusive augmentation from this faction
    const exclusiveAugmentations = factionExclusiveAugmentations.get(faction);

    for (const exclusiveAugmentation of exclusiveAugmentations ?? []) {
        // If we do not have the exclusive augmentation, we can join the faction
        if (!ns.singularity.getOwnedAugmentations().includes(exclusiveAugmentation)) {
            return true;
        }
    }

    // We do have all exclusive augmentations, so we do not join this faction
    return false;
}
