import { ITraversalFunction, Traversal, TraversalContext } from "types/Traversal";
import { NS } from "./types/Netscript";

const escalate: ITraversalFunction = (ns: NS, traversalContext: TraversalContext, args: { portOpeners: number }) => {
    const hostname = traversalContext.hostname;
    const suppressOutput = traversalContext.traversal.suppressOutput;

    // No escalation needed if we already have root access
    if (ns.hasRootAccess(hostname)) return;

    // Check if hacking skill is sufficient
    if (ns.getHackingLevel() - ns.getServerRequiredHackingLevel(hostname) < 0) {
        if (!suppressOutput) {
            ns.tprintf("ERROR -- Hacking level %d required for %s!", ns.getServerRequiredHackingLevel(hostname), hostname);
        }
        return;
    }

    // Check if player has sufficent tools to hack
    if (args.portOpeners < ns.getServerNumPortsRequired(hostname)) {
        if (!suppressOutput) {
            ns.tprintf("WARNING -- %s needs more tools.", hostname);
        }
        return;
    }

    // Open the needed ports
    switch (ns.getServerNumPortsRequired(hostname)) {
        case 5: ns.sqlinject(hostname);
        case 4: ns.httpworm(hostname);
        case 3: ns.relaysmtp(hostname);
        case 2: ns.ftpcrack(hostname);
        case 1: ns.brutessh(hostname);
    }

    // NUKE IT!!!1!
    ns.nuke(hostname);
    ns.tprintf("SUCCESS -- Hacked %s!", hostname);
};

/** 
 * @param {NS} ns 
 */
export async function main(ns: NS) {
    ns.disableLog("ALL");

    // Check which port openers are available
    let portOpeners = ns.fileExists("BruteSSH.exe", "home") ? 1 : 0;
    portOpeners += ns.fileExists("FTPCrack.exe", "home") ? 1 : 0;
    portOpeners += ns.fileExists("relaySMTP.exe", "home") ? 1 : 0;
    portOpeners += ns.fileExists("HTTPWorm.exe", "home") ? 1 : 0;
    portOpeners += ns.fileExists("SQLInject.exe", "home") ? 1 : 0;

    new Traversal(escalate, false).start(ns, ns.getHostname(), { portOpeners: portOpeners });
}