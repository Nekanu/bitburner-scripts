import { NS } from "types/netscript";

export async function main(ns: NS) {
    ns.disableLog("ALL");

    await initialize(ns);



}

async function initialize(ns: NS) {
    if (!ns.gang.inGang()) {
        ns.tprint("Player is not in a gang. Exiting...");
        ns.exit();
    }
}

async function assignTasks(ns: NS) {
    
    const gangInfo = ns.gang.getGangInformation();
    const members = ns.gang.getMemberNames().sort((a, b) => getMemberAverageCombatStat(ns, b) - getMemberAverageCombatStat(ns, a));

    for (const member of members) {
        const memberInfo = ns.gang.getMemberInformation(member);

        let suggestedTask = "Train Combat";

        // Let members with less than 50 average combat stats train up
        if (getMemberAverageCombatStat(ns, member) < 50) {
            suggestedTask = "Train Combat";
        }

        if (memberInfo.task !== suggestedTask) {
            ns.gang.setMemberTask(member, suggestedTask);
        }
    }
}

async function recruitMembers(ns: NS) {
    if (ns.gang.canRecruitMember()) {
        ns.gang.recruitMember(`${ns.gang.getMemberNames().length}`);
    }
}

function getMemberAverageCombatStat(ns: NS, member: string): number {
    const stats = ns.gang.getMemberInformation(member);
    return (stats.str + stats.def + stats.dex + stats.agi) / 4;
}
