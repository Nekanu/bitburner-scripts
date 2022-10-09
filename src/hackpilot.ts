
import { NS } from "types/netscript";
import { getRamMapping, ITraversalFunction, Traversal, TraversalContext } from "types/traversal";

const weakenScript = "/lib/weaken.js";
const growScript = "/lib/grow.js";
const hackScript = "/lib/hack.js";
const shareScript = "/lib/share.js";

const persistStatusFile = "/tmp/hack-manager.txt";

let status = new Map<string, HackStatus>();
let profitableServers: [string, number][] = [];

let enableHomeUse = true;

/**
 * The main function of the script
 * 
 * @param {NS} ns
 */
export async function main(ns: NS) {
    ns.disableLog("ALL");
    // ns.enableLog("exec");

    const flags = ns.flags([
        ["home", true],
    ]);

    // Read the status from the file
    try {
        (JSON.parse(ns.read(persistStatusFile)) as [string, HackStatus[]][]).forEach(([server, statuses]) => {
            statuses.forEach((s) => {
                status.set(server, s);
            });
        });
    } catch (e) {
        // Ignore (we assume the file does not exist, is empty or currupted and start anew)
    }

    enableHomeUse = flags["home"] as boolean || true;

    let hackingLevel = 0;

    profitableServers = sortServersAfterProfit(ns);

    while (true) {

        // Monitor the servers
        for (const [, hackStatus] of status) {
            hackStatus.monitor(ns);
        }

        // Check if we can hack a new server
        if (hackingLevel < ns.getHackingLevel()) {
            hackingLevel = ns.getHackingLevel();
            await escalate(ns);
        }

        // Prefer running hacks
        status.forEach((hackStatus,) => {
            if (hackStatus.state === HackState.Running) {
                hackStatus.performAction(ns);
            }
        });

        // Select new servers with the highest profit, if there is enough RAM left
        for (const [server,] of profitableServers) {
            if (!status.has(server)) {
                status.set(server, new HackStatus(ns, server));
            }

            status.get(server)!.performAction(ns);
        }

        // Persist new status
        ns.write(persistStatusFile, JSON.stringify([...status]), "w");

        let ramMapping = getRamMapping(ns, ["home"]);

        // If there is enough free ram, run share script and wait until it is done
        if (ramMapping.total[0] > 20000) {

            // Disable home as there is no longer need for RAM there
            enableHomeUse = false;

            //findAndExecuteScriptOnServers(ns, profitableServers[0][0], weakenScript, Number.MAX_VALUE);
            findAndExecuteScriptOnServers(ns, "", shareScript, Number.MAX_VALUE);
            await ns.sleep(10000);
        }

        await ns.sleep(1000);
    }
}

/**
 * Finds servers to run a script on and executes the script on them
 * 
 * @param {NS} ns
 * @param {string} target The target server needed for the script
 * @param {string} script The script to run
 * @param {number} neededThreads The amount of threads needed for maximum efficiency
 * @returns {[number, number][]} The pid of the script and the amount of threads used for each server
 */
function findAndExecuteScriptOnServers(ns: NS, target: string, script: string, neededThreads: number): [number, number][] {

    // Get the free ram mapping
    const ramMapping = getRamMapping(ns, enableHomeUse ? [] : ["home"]);

    const scriptCost = ns.getScriptRam(script);
    let totalAvailableThreads = 0;
    let neededThreadsLeft = neededThreads;
    const threadMap = new Map<string, number>();

    // Generate a map containing the amount of threads to perform on each server
    ramMapping.ramMapping.forEach((ram, server) => {

        let availableServerThreads = 0;
        if (server === "home") {
            // Let some ram free on the home server
            availableServerThreads = Math.floor((ram[0] - 16) / scriptCost);
        } else {
            availableServerThreads = Math.floor(ram[0] / scriptCost);
        }

        totalAvailableThreads += availableServerThreads;

        if (availableServerThreads > 0 && neededThreadsLeft > 0) {
            // Calculate the amount of threads to use on this server
            let threads = Math.min(availableServerThreads, neededThreadsLeft);

            threadMap.set(server, threads);
            neededThreadsLeft -= threads;
        }
    });

    // If there are no threads available, return
    if (totalAvailableThreads == 0) {
        return [];
    }

    let pids: [number, number][] = [];

    // Execute the script on the servers as specified in the threadMap
    for (const [server, threads] of threadMap) {
        // Removes the old script from the server
        if (server !== "home") {
            ns.rm(script, server);
        }

        // Copy the script to the server
        ns.scp(script, server);

        // Execute the script
        let pid = ns.exec(script, server, threads, target, threads, 0);

        // Push all successful started processes specified by their to the array
        if (pid > 0) {
            pids.push([pid, threads]);
        }
    }

    // Print information about the script execution, only if it is not the share script
    if (script !== shareScript) {
        let threadsStarted = pids.reduce((prev, [, threads]) => prev + threads, 0);
        ns.printf("%s -- %-14s -> %-18s (%d / %d / %d)", new Date().toLocaleTimeString(), script, target, threadsStarted, neededThreads, totalAvailableThreads);
    }

    return pids;
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
    while (ns.weakenAnalyze(threads, enableHomeUse ? ns.getServer("home").cpuCores : 1) < (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target))) {
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

    return Array.from(serversWithMoneyMap.entries()).sort((a, b) => b[1] - a[1]);
}

async function escalate(ns: NS) {
    let pid = ns.exec("escalate.js", "home", 1, "--silent");

    // Wait for the script to finish
    while (ns.isRunning(pid)) {
        await ns.sleep(1000);
    }

    profitableServers = sortServersAfterProfit(ns);
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
        this.state = HackState.Running;

        let newPids: [number, number][] = [];
        switch (this.action) {
            case HackAction.None:
                return;
            case HackAction.Weaken:
                newPids = findAndExecuteScriptOnServers(ns, this.target, weakenScript, this.threadsNeeded);
                break;
            case HackAction.Grow:
                newPids = findAndExecuteScriptOnServers(ns, this.target, growScript, this.threadsNeeded);
                break;
            case HackAction.Hack:
                newPids = findAndExecuteScriptOnServers(ns, this.target, hackScript, this.threadsNeeded);
                break;
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
        } else if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.95) {
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
            if (prevAction == HackAction.Hack && this.action == HackAction.Weaken) {
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