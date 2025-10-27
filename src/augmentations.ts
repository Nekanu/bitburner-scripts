import { factionExclusiveAugmentations, preventingFactions } from "types/factions";
import { NS } from "@ns";



export async function main(ns: NS) {
    // Accept faction invitations
    for (const factionInvite in ns.singularity.checkFactionInvitations()) {
        if (checkFactionInvite(ns, factionInvite)) {
            ns.singularity.joinFaction(factionInvite);
        }
    }

    // Find next augmentations to buy

}

function checkFactionInvite(ns: NS, faction: string): boolean {

    // If faction does not block us from joining other factions, we can safely join
    if (!preventingFactions[faction]) {
        return true;
    }

    // Else, check if we have the exclusive augmentation from this faction
    const exclusiveAugmentations = factionExclusiveAugmentations[faction];

    for (const exclusiveAugmentation of exclusiveAugmentations) {
        // If we do not have the exclusive augmentation, we can join the faction
        if (!ns.singularity.getOwnedAugmentations().includes(exclusiveAugmentation)) {
            return true;
        }
    }

    // We do have all exclusive augmentations, so we do not join this faction
    return false;
}
