import { ITraversalFunction, Traversal, TraversalContext } from "types/traversal";
import { NS } from "@ns";

const escalate: ITraversalFunction = (ns: NS, traversalContext: TraversalContext,
    args: { portOpeners: number, serversHacked: [string, string[]][] }) => {
    const hostname = traversalContext.hostname;
    const suppressOutput = traversalContext.traversal.suppressOutput;

    const server = ns.getServer(hostname);

    // No escalation needed if we already have root access
    if (server.hasAdminRights) {
        return;
    }

    // Check if hacking skill is sufficient
    if (ns.getHackingLevel() - server.requiredHackingSkill! < 0) {
        if (!suppressOutput) {
            ns.printf("ERROR -- Hacking level %d required for %s!", ns.getServerRequiredHackingLevel(hostname), hostname);
        }
        return;
    }

    // Check if player has sufficent tools to hack
    if (args.portOpeners < server.numOpenPortsRequired!) {
        if (!suppressOutput) {
            ns.printf("WARNING -- %s needs more tools.", hostname);
        }
        return;
    }

    // Open the needed ports
    switch (server.numOpenPortsRequired) {
        case 5: ns.sqlinject(hostname);
        case 4: ns.httpworm(hostname);
        case 3: ns.relaysmtp(hostname);
        case 2: ns.ftpcrack(hostname);
        case 1: ns.brutessh(hostname);
    }

    // NUKE IT!!!1!
    ns.nuke(hostname);
    if (!suppressOutput) {
        ns.printf("SUCCESS -- Hacked %s!", hostname);
    }

    const path: string[] = [];
    let current: TraversalContext | undefined = traversalContext;
    let currentServer: string | undefined = traversalContext.hostname;
    while (!ns.getServer(currentServer).backdoorInstalled) {
        path.unshift(current!.hostname);
        current = current!.parent;
        currentServer = current!.hostname;
    }

    path.unshift(currentServer);

    args.serversHacked.push([traversalContext.hostname, path]);
};

/** 
 * @param {NS} ns 
 */
export async function main(ns: NS) {
    ns.disableLog("ALL");
    ns.enableLog("singularity.installBackdoor");

    const flags = ns.flags([
        ['silent', false],
        ['no-backdoor', false]
    ]);

    // Check if we can buy any new tools
    if (ns.singularity.purchaseTor()) {
        ns.singularity.purchaseProgram("BruteSSH.exe");
        ns.singularity.purchaseProgram("FTPCrack.exe");
        ns.singularity.purchaseProgram("relaySMTP.exe");
        ns.singularity.purchaseProgram("HTTPWorm.exe");
        ns.singularity.purchaseProgram("SQLInject.exe");

        // Buy all remaining tools
        ns.singularity.purchaseProgram("AutoLink.exe");
        ns.singularity.purchaseProgram("DeepscanV1.exe");
        ns.singularity.purchaseProgram("ServerProfiler.exe");
        ns.singularity.purchaseProgram("DeepscanV2.exe");
        ns.singularity.purchaseProgram("Formulas.exe");
    }

    // Check which port openers are available
    let portOpeners = ns.fileExists("BruteSSH.exe", "home") ? 1 : 0;
    portOpeners += ns.fileExists("FTPCrack.exe", "home") ? 1 : 0;
    portOpeners += ns.fileExists("relaySMTP.exe", "home") ? 1 : 0;
    portOpeners += ns.fileExists("HTTPWorm.exe", "home") ? 1 : 0;
    portOpeners += ns.fileExists("SQLInject.exe", "home") ? 1 : 0;

    const serversHacked: string[] = [];

    new Traversal(escalate, flags["silent"] as boolean, ["w0r1d_d43m0n"]).start(ns, ns.getHostname(), { portOpeners: portOpeners, serversHacked: serversHacked });

    if (!flags["no-backdoor"] as boolean) {
        let iter: number = 1;
        for (const [server, path] of serversHacked) {
            for (const hop of path) {
                ns.singularity.connect(hop);
            }

            ns.tprintf(`(${iter}/${serversHacked.length}) - Installing backdoor on ${server}`);
            await ns.singularity.installBackdoor();
            ns.singularity.connect("home");
            iter++;
        }
    }
}
