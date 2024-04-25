import { NS } from "types/netscript";
import { getRamMapping } from "types/ramMapping";
import { HackingState } from "types/hacking";
import { findAndExecuteScriptOnServers } from "lib/helpers";
import { reserveHomeRamGb, tempFolder } from "lib/constants";

const shareScript = "/lib/share.js";

const persistStatusFile = `${tempFolder}/hackingpilot.txt`;

let state: HackingState;

/**
 * The main function of the script
 * 
 * @param {NS} ns
 */
export async function main(ns: NS) {
    ns.disableLog("ALL");

    // Read the status from the file
    try {
        let parsedState = JSON.parse(ns.read(persistStatusFile));
        state = new HackingState(parsedState);
    } catch (e) {
        // Ignore (we assume the file does not exist, is empty or currupted and start anew)
        ns.tprintf("Could not read status file: %s", e);
        state = new HackingState(ns);
    }

    // ns.tprintf("State: %s", JSON.stringify(state));

    if (state?.hackingLevel > ns.getHackingLevel()) {
        // Augmentations have been installed. Reset the state...
        state = new HackingState(ns);
    }

    // Perform initial escalation
    let escalationPid = ns.exec("escalate.js", "home", 1);

    // Wait for the initial escalation to finish
    while (ns.isRunning(escalationPid)) {
        await ns.sleep(5000);
    }

    while (true) {
        // Check if we can hack a new server
        if (state.hackingLevel < ns.getHackingLevel()) {
            state.hackingLevel = ns.getHackingLevel();
            ns.exec("escalate.js", "home", 1);
        }

        // Monitor the servers
        state.update(ns);

        state.performHack(ns);

        // Persist new status
        state.persist(ns, persistStatusFile);

        // Get the ram mapping
        const ramMapping = getRamMapping(ns);

        // If there is enough free ram, run share script and wait until it is done
        if (ramMapping.totalRamFree > 20000) {
            findAndExecuteScriptOnServers(ns, "", shareScript, Number.MAX_VALUE, reserveHomeRamGb, false);
            await ns.sleep(5300);
        }

        await ns.sleep(5000);
    }
}
