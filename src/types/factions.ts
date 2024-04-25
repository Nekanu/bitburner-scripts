import { FactionWorkType, NS } from "types/netscript";

export const factionExclusiveAugmentations = {
    "Aevum": ["PCMatrix"],
    "Chongqing": ["Neuregen Gene Modification"],
    "Ishima": ["INFRARET Enhancement"],
    "New Tokyo": ["NutriGen Implant"],
    "Sector-12": ["CashRoot Starter Kit"],
    "Volhaven": ["DermaForce Particle Barrier"],
    "The Black Hand": ["The Black Hand"],
    "NiteSec": ["Neural-Retention Enhancement", "CRTX42-AA Gene Modification"],
    "Tetrads": ["Bionic Arms"],
    "Slum Snakes": ["SmartSonar Implant"],
    "Tian Di Hui": ["Social Negotiation Assistant (S.N.A)", "Neuroreceptor Management Implant"],
    "BitRunners": ["Neural Accelerator", "Cranial Signal Processors - Gen V", "BitRunners Neurolink"],
    "The Syndicate": ["BrachiBlades"]
};

export const preventingFactions = {
    "Sector-12": ["Chongqing", "New Tokyo", "Ishima", "Volhaven"],
    "Chongqing": ["Sector-12", "Aevum", "Volhaven"],
    "New Tokyo": ["Sector-12", "Aevum", "Volhaven"],
    "Ishima": ["Sector-12", "Aevum", "Volhaven"],
    "Aevum": ["Chongqing", "New Tokyo", "Ishima", "Volhaven"],
    "Volhaven": ["Sector-12", "Chongqing", "New Tokyo", "Ishima", "Volhaven"],
};

export class FactionWorkStats {
    faction: string;
    donationNeeded: boolean;
    currentFavor: number;
    currentReputation: number;
    reputationNeededForAllAugmentations: number;
    reputationNeededForExclusiveAugmentations: number;
    reputationNeededToDonate: number;
    reputationNeeded: number;
    workSecondsNeeded: Map<FactionWorkType, number> = new Map();

    constructor(ns: NS, faction: string) {
        this.faction = faction;
        this.currentFavor = ns.singularity.getFactionFavor(faction);
        this.currentReputation = ns.singularity.getFactionRep(faction);

        this.reputationNeededForAllAugmentations = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(a => !ns.singularity.getOwnedAugmentations(true).includes(a))
            .reduce((a, b, _) => Math.max(a, ns.singularity.getAugmentationRepReq(b)), 0);

        this.reputationNeededForExclusiveAugmentations = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(a => !ns.singularity.getOwnedAugmentations(true).includes(a))
            //.filter(a => factionExclusiveAugmentations[faction].includes(a))
            .reduce((a, b, _) => Math.max(a, ns.singularity.getAugmentationRepReq(b)), 0);
            
        this.reputationNeededToDonate = ns.formulas.reputation.calculateFavorToRep(ns.getFavorToDonate());
        this.reputationNeeded = Math.min(this.reputationNeededForAllAugmentations, this.reputationNeededToDonate);
        this.donationNeeded = this.reputationNeededToDonate < this.reputationNeededForAllAugmentations;
    }

    public update(ns: NS) {
        this.currentFavor = ns.singularity.getFactionFavor(this.faction);
        this.currentReputation = ns.singularity.getFactionRep(this.faction);
        this.reputationNeeded = Math.min(this.reputationNeededForAllAugmentations, this.reputationNeededToDonate) 
            - this.currentReputation
            - (this.donationNeeded ? ns.formulas.reputation.calculateFavorToRep(this.currentFavor) : 0);
    }
}