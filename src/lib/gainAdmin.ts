import { AutocompleteData, NS } from "@ns";
import { ITraversalFunction, Traversal, TraversalContext } from "/types/traversal";

export function autocomplete(data: AutocompleteData,) {
    return [...data.servers];
}

function countAvailableTools(ns: NS): number {
    let numberOfTools = 0;
    numberOfTools += ns.fileExists("BruteSSH.exe") ? 1 : 0;
    numberOfTools += ns.fileExists("FTPCrack.exe") ? 1 : 0;
    numberOfTools += ns.fileExists("relaySMTP.exe") ? 1 : 0;
    numberOfTools += ns.fileExists("HTTPWorm.exe") ? 1 : 0;
    numberOfTools += ns.fileExists("SQLinject.exe") ? 1 : 0;

    return numberOfTools;
}

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
 * @arg {string} hostname
 */
export async function main(ns: NS) {
    const hostname = ns.args[0] as string;
    ns.singularity.connect("home");

    const portOpeners = countAvailableTools(ns);
    const serversHacked: string[] = [];

    new Traversal(escalate, true, ["w0r1d_d43m0n"]).start(ns, ns.getHostname(), { portOpeners: portOpeners, serversHacked: serversHacked });
}
