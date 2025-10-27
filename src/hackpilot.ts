
import { NS } from "@ns";
import { ITraversalFunction, Traversal, TraversalContext } from "types/traversal";
import { getRamMapping } from "types/ramMapping";
import { findAndExecuteScriptOnServers } from "/lib/helpers";
import { reserveHomeRamGb, tempFolder } from "/lib/constants";

const weakenScript = "/lib/weaken.js";
const growScript = "/lib/grow.js";
const hackScript = "/lib/hack.js";
const shareScript = "/lib/share.js";

const persistStatusFile = `${tempFolder}/hackpilot.txt"`;

let status = new Map<string, HackStatus>();
let profitableServers: [string, number][] = [];

/**
 * The main function of the script
 * 
 * @param {NS} ns
 */
export async function main(ns: NS) {
    ns.disableLog("ALL");

    // Read the status from the file
    try {
        const parsedStatus = JSON.parse(ns.read(persistStatusFile)) as [string, HackStatus][];
        status = new Map<string, HackStatus>();
        parsedStatus.forEach(([server, hackStatus]) => {
            status.set(server, Object.assign(new HackStatus(ns, server), hackStatus));
        });
    } catch (e) {
        // Ignore (we assume the file does not exist, is empty or currupted and start anew)
        ns.tprint("Could not read status file: " + e);
    }

    let hackingLevel = 0;

    let pidsRead = 0;
    status.forEach((hackStatus,) => { pidsRead += hackStatus.monitorPids.length; });
    ns.tprintf("Read %d servers with %d PIDs to monitor", status.size, pidsRead);

    // Perform initial escalation
    ns.exec("escalate.js", "home", 1);

    profitableServers = sortServersAfterProfit(ns);

    while (true) {

        // Monitor the servers
        for (const [, hackStatus] of status) {
            hackStatus.monitor(ns);
        }

        // Check if we can hack a new server
        if (hackingLevel < ns.getHackingLevel()) {
            hackingLevel = ns.getHackingLevel();
            ns.exec("escalate.js", "home", 1);
            profitableServers = sortServersAfterProfit(ns);
        }

        // Prefer running hacks
        status.forEach((hackStatus,) => {
            if (hackStatus.state === HackState.Running) {
                hackStatus.performAction(ns);
            }
        });

        let ramMapping = getRamMapping(ns, ["home"]);

        // Select new servers with the highest profit, if there is enough RAM left
        for (const [server,] of profitableServers) {
            if (!status.has(server)) {
                status.set(server, new HackStatus(ns, server));
            }

            ramMapping = getRamMapping(ns, ["home"]);
            if (ramMapping.totalRamFree > reserveHomeRamGb) {
                status.get(server)!.performAction(ns);
            }
        }

        // Persist new status
        ns.write(persistStatusFile, JSON.stringify(Array.from(status.entries())), "w");

        // If there is enough free ram, run share script and wait until it is done
        if (ramMapping.totalRamFree > 20000) {

            //findAndExecuteScriptOnServers(ns, profitableServers[0][0], weakenScript, Number.MAX_VALUE);
            findAndExecuteScriptOnServers(ns, "", shareScript, Number.MAX_VALUE, reserveHomeRamGb, false);
            await ns.sleep(5300);
        }

        // Check for new contracts
        ns.exec("contracts/contractor.js", "home", 1);

        await ns.sleep(5000);
    }
}

/**
 * Calculates the number of threads needed to weaken a server to its minimum security level
 * 
 * @param {NS} ns
 * @arg {string} target
 * @returns {number} The number of threads needed to weaken the target server to minimum security level
 */
function calculateWeakenThreads(ns: NS, target: string) {
    let threads = 1;
    while (ns.weakenAnalyze(threads, 1) < (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target))) {
        threads++;
    }

    return threads;
}

/**
 * Calculates the number of threads needed to grow a server to its maximum money level
 * (Becomes unreliable if the server has no money)
 * 
 * @param {NS} ns
 * @arg {string} target
 * @returns {number} The number of threads needed to grow the target server to maximum money level
 */
function calculateGrowThreads(ns: NS, target: string) {

    // Use 100 000 as base value if server has no money (to avoid division by zero)
    const targetCurrentMoney = ns.getServerMoneyAvailable(target) == 0 ? 100000 : ns.getServerMoneyAvailable(target);
    const targetMaxMoney = ns.getServerMaxMoney(target);
    return Math.ceil(ns.growthAnalyze(target, targetMaxMoney / targetCurrentMoney));
}

/**
 * Calculates the number of threads needed to hack a server to get a specific amount of money
 * 
 * @param {NS} ns
 * @param {string} target The target to hack
 * @param {number} percentage The percentage of the target server's available money to hack
 * @returns {number} The number of threads needed to hack the target server to get the specified percentage of its available money
 */
function calculateHackThreads(ns: NS, target: string, percentage: number) {
    // Do only hack 75% of the money of this server to make sure we can re-grow it relatively easily
    return Math.ceil(ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) * percentage));
}

/**
 * Returns a sorted list of all servers sorted by their profitability
 * 
 * @param {NS} ns
 * @returns {[string, number]} A list of all servers sorted by their profitability
 */
function sortServersAfterProfit(ns: NS) {

    const serversWithMoney: ITraversalFunction = (ns: NS, context: TraversalContext, args: { result: Map<string, number> }) => {
        const server = context.hostname;

        // Do not consider servers that are not yet hijacked
        if (!ns.hasRootAccess(server)) {
            return;
        }

        const money = ns.getServerMaxMoney(server);

        // Filter for servers that have money
        if (money > ns.getTotalScriptIncome()[0]) {
            args.result.set(server, money);
        }
    };

    const serversWithMoneyMap = new Map<string, number>();

    new Traversal(serversWithMoney, false, ["home"]).start(ns, "home", { result: serversWithMoneyMap });

    return Array.from(serversWithMoneyMap.entries()).sort((a, b) => {
        let stateA: HackStatus | undefined = status.get(a[0]);
        let stateB: HackStatus | undefined = status.get(b[0]);

        // Prefer strongly running hacks
        if (stateA?.state !== stateB?.state) {

            if (stateA?.state === HackState.Running) {
                return -1;
            }
            else if (stateB?.state === HackState.Running) {
                return 1;
            }
        }

        // Prefer later stages of hacks (weaken -> grow -> hack)
        if (stateA?.state === HackState.Running && stateB?.state === HackState.Running) {
            // Prefer servers with a higher progression
            // Strongly prefer servers in Hack action
            if (stateA?.action === HackAction.Hack) {
                return -1;
            }
            if (stateB?.action === HackAction.Hack) {
                return 1;
            }

            // Do not permanently resort the list of running hacks to avoid long waits
            return 0;
        }

        const progressionA = (ns.getServerMoneyAvailable(a[0]) / ns.getServerMaxMoney(a[0]))
            - (ns.getServerSecurityLevel(a[0]) / ns.getServerMinSecurityLevel(a[0]));
        const progressionB = (ns.getServerMoneyAvailable(b[0]) / ns.getServerMaxMoney(b[0]))
            - (ns.getServerSecurityLevel(b[0]) / ns.getServerMinSecurityLevel(b[0]));

        return progressionB - progressionA;
    });
}

class HackStatus {
    target: string;
    action: HackAction;
    state: HackState = HackState.Waiting;
    monitorPids: number[] = [];
    threadsNeeded: number;

    constructor(ns: NS, target: string) {
        this.target = target;
        this.action = HackStatus.determineAction(ns, target);
        this.threadsNeeded = HackStatus.calculateThreadsNeeded(ns, target, this.action);
    }

    /**
     * Performs the action specified by this status to best ability
     */
    public performAction(ns: NS) {
        let newPids: [number, number][] = [];
        switch (this.action) {
            case HackAction.None:
                return;
            case HackAction.Weaken:
                newPids = findAndExecuteScriptOnServers(ns, this.target, weakenScript, this.threadsNeeded, reserveHomeRamGb);
                break;
            case HackAction.Grow:
                newPids = findAndExecuteScriptOnServers(ns, this.target, growScript, this.threadsNeeded, reserveHomeRamGb);
                break;
            case HackAction.Hack:
                newPids = findAndExecuteScriptOnServers(ns, this.target, hackScript, this.threadsNeeded, reserveHomeRamGb);
                break;
        }

        if (newPids.length > 0) {
            this.state = HackState.Running;
        }

        // Add the new pids to the monitor list and adjust the threads needed
        newPids.forEach(([pid, threads]) => {
            this.monitorPids.push(pid);
            this.threadsNeeded -= threads;
        });

        // If we have no more threads needed, we wait until all scripts are finished
        if (this.threadsNeeded <= 0) {
            this.action = HackAction.None;
        }
    }

    /**
     * Determines the next action that should be performed on the target server
     * 
     * @param {NS} ns
     * @param {string} target The server to target
     * @returns {HackAction} The next action that should be performed on the target server
     */
    static determineAction(ns: NS, target: string): HackAction {
        // If the server is not hijacked, we cannot target it. 
        // So we wait until it is
        if (!ns.hasRootAccess(target)) {
            return HackAction.None;
        }

        // Try to hack the server only if it is at minimum security level and maximum possible money
        if (ns.getServerMinSecurityLevel(target) < ns.getServerSecurityLevel(target) * 0.9) {
            return HackAction.Weaken;
        } else if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.9) {
            return HackAction.Grow;
        } else {
            return HackAction.Hack;
        }
    }

    /**
     * Calculates the number of threads needed to perform the specified action on the target server
     * 
     * @param {NS} ns
     * @param {string} target The server to target
     * @param {HackAction} action The action to perform
     * @returns {number} The number of threads needed to perform the specified action
     */
    static calculateThreadsNeeded(ns: NS, target: string, action: HackAction): number {
        switch (action) {
            case HackAction.Weaken:
                return calculateWeakenThreads(ns, target);
            case HackAction.Grow:
                return calculateGrowThreads(ns, target);
            case HackAction.Hack:
                return calculateHackThreads(ns, target, 0.75);
            default:
                return 0;
        }
    }

    /**
     * Checks if the specified pids is still running and updates the status accordingly
     * If all pids are finished, the next status is determined
     * 
     * @param {NS} ns
     */
    public monitor(ns: NS) {
        this.monitorPids = this.monitorPids.filter(pid => ns.isRunning(pid));

        if (this.monitorPids.length == 0 && this.threadsNeeded <= 0) {
            const prevAction = this.action;



            this.action = HackStatus.determineAction(ns, this.target);
            this.threadsNeeded = HackStatus.calculateThreadsNeeded(ns, this.target, this.action);

            // Let this hack wait
            if (prevAction == HackAction.Hack && (this.action == HackAction.Weaken || this.action == HackAction.Grow)) {
                this.state = HackState.Waiting;
            }
        }
    }
}

enum HackAction {
    None,
    Weaken,
    Grow,
    Hack
}

enum HackState {
    Waiting,
    Running
}
