import { NS } from "@ns";
import { Traversal, TraversalContext } from "types/traversal";
import { findAndExecuteScriptOnServers } from "lib/helpers";
import { reserveHomeRamGb } from "lib/constants";

const weakenScript = "/lib/weaken.js";
const growScript = "/lib/grow.js";
const hackScript = "/lib/hack.js";

// Hacking variables
const securityThreshold = 0.9; // The percentage of the minimum security level of a server that should be reached before we start hacking it
const moneyThreshold = 0.9; // The percentage of the maximum money of a server that should be reached before we start hacking it
const hackPercentage = 0.75; // The percentage of the available money of a server that should be hacked before we stop hacking it

const ignoreServers = ["home", "darkweb", "CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "The-Cave", "w0r1d_d43m0n",
    "prim00", "prim01", "prim02", "prim03", "prim04", "prim05", "prim06", "prim07", "prim08", "prim09",
    "prim10", "prim11", "prim12", "prim13", "prim14", "prim15", "prim16", "prim17", "prim18", "prim19",
    "prim20", "prim21", "prim22", "prim23", "prim24", "prim25"]; // I do not want to refactor just because of this

const profitSortFunction = (a: ServerHackStatus, b: ServerHackStatus) => {
    // Prefer servers that are rooted
    if (a.isHackable !== b.isHackable) {
        return a.isHackable ? -1 : 1;
    }

    // strongly prefer running hacks
    if (a.state !== b.state) {

        if (a.state === ServerHackState.Running) {
            return -1;
        }
        else if (b.state === ServerHackState.Running) {
            return 1;
        }
    }

    // Prefer later stages of hacks (weaken -> grow -> hack)
    if (a.state === ServerHackState.Running && b.state === ServerHackState.Running) {
        const progressionA = ((a.currentMoney / a.maxMoney) + (a.minSecurityLevel / a.currentSecurityLevel)) / 2;
        const progressionB = ((b.currentMoney / b.maxMoney) + (b.minSecurityLevel / b.currentSecurityLevel)) / 2;

        return progressionB - progressionA;
    }

    return b.maxMoney - a.maxMoney;
};


export class HackingState {
    hackingLevel: number = 0;

    serverHackQueue: ServerHackStatus[] = [];

    constructor(ns: NS);
    constructor(state: HackingState);
    constructor(ns: HackingState | NS) {
        if (ns instanceof HackingState) {
            this.hackingLevel = ns.hackingLevel;
            this.serverHackQueue = ns.serverHackQueue.map(status => new ServerHackStatus(status));
            return;
        }

        this.hackingLevel = ns.getHackingLevel();
        this.serverHackQueue = HackingState.initializeQueue(ns);
    }

    static initializeQueue(ns: NS): ServerHackStatus[] {
        let serverHackQueue: ServerHackStatus[] = [];

        new Traversal((ns: NS, context: TraversalContext, args: ServerHackStatus[]) => {
            args.push(new ServerHackStatus(ns, context.hostname));
        }, true, ignoreServers).start(ns, "home", serverHackQueue);

        serverHackQueue.sort(profitSortFunction);

        return serverHackQueue;
    }

    public update(ns: NS) {
        this.serverHackQueue.forEach(hack => hack.update(ns));
        this.serverHackQueue.sort(profitSortFunction);
    }

    public performHack(ns: NS) {
        this.serverHackQueue.forEach(hack => hack.performAction(ns));
    }

    public persist(ns: NS, path: string) {
        ns.write(path, JSON.stringify(this), "w");
    }
}

export class ServerHackStatus {
    /**
     * The target server
     */
    target: string;

    /**
     * Indicates if the server is hackable
     */
    isHackable: boolean;

    /**
     * The current amount of money on this server
     */
    currentMoney: number;

    /**
     * The maximum amount of money that can be gained from this server
     */
    maxMoney: number;

    /**
     * The current security level of this server
     */
    currentSecurityLevel: number;

    /**
     * The minimum security level of this server
     */
    minSecurityLevel: number;

    /**
     * The current state of the hack
     */
    state: ServerHackState = ServerHackState.Waiting;

    /**
     * The next action that should be performed hacking this target server
     */
    action: ServerHackAction;

    /**
     * The number of threads needed to perform the action on this target server
     */
    threadsNeeded: number;

    /**
     * The PIDs of the scripts that are currently attacking this target server
     */
    monitorPids: number[] = [];

    constructor(hackStatus: ServerHackStatus);
    constructor(ns: NS, target: string);

    /**
     * Creates a new ServerHackStatus
     * @param {NS} ns
     * @param {string} target The target server
     */
    constructor(ns: NS | ServerHackStatus, target?: string) {

        if (ns instanceof ServerHackStatus) {
            this.target = ns.target;
            this.isHackable = ns.isHackable;
            this.currentMoney = ns.currentMoney;
            this.maxMoney = ns.maxMoney;
            this.currentSecurityLevel = ns.currentSecurityLevel;
            this.minSecurityLevel = ns.minSecurityLevel;
            this.action = ns.action;
            this.threadsNeeded = ns.threadsNeeded;
            this.monitorPids = ns.monitorPids;
            return;
        }

        if (!target) {
            throw new Error("Target must be specified when creating a new ServerHackStatus");
        }

        this.target = target;
        this.isHackable = ns.hasRootAccess(target);
        this.currentMoney = ns.getServerMoneyAvailable(target);
        this.maxMoney = ns.getServerMaxMoney(target);

        this.currentSecurityLevel = ns.getServerSecurityLevel(target);
        this.minSecurityLevel = ns.getServerMinSecurityLevel(target);

        this.action = this.determineNextAction(ns);
        this.threadsNeeded = this.calculateThreadsNeeded(ns);
    }

    /**
     * Determines the next action that should be performed hacking the target server
     * 
     * @param {NS} ns
     * @returns {ServerHackAction} The next action that should be performed on the target server
     */
    public determineNextAction(ns: NS): ServerHackAction {
        // If the server is not hijacked, we cannot target it. 
        // So we wait until it is
        if (!ns.hasRootAccess(this.target)) {
            return ServerHackAction.None;
        }

        // Try to hack the server only if it is at minimum security level and maximum possible money
        if (this.minSecurityLevel < this.currentSecurityLevel * securityThreshold) {
            return ServerHackAction.Weaken;
        } else if (this.currentMoney < this.maxMoney * moneyThreshold) {
            return ServerHackAction.Grow;
        } else {
            return ServerHackAction.Hack;
        }
    }

    /**
     * Performs the action specified by this status to best ability
     */
    public performAction(ns: NS) {

        let newPids: [number, number][] = [];
        switch (this.action) {
            case ServerHackAction.None:
                return;
            case ServerHackAction.Weaken:
                newPids = findAndExecuteScriptOnServers(ns, this.target, weakenScript, this.threadsNeeded, reserveHomeRamGb);
                break;
            case ServerHackAction.Grow:
                newPids = findAndExecuteScriptOnServers(ns, this.target, growScript, this.threadsNeeded, reserveHomeRamGb);
                break;
            case ServerHackAction.Hack:
                newPids = findAndExecuteScriptOnServers(ns, this.target, hackScript, this.threadsNeeded, reserveHomeRamGb);
                break;
        }

        if (newPids.length > 0) {
            this.state = ServerHackState.Running;
        }

        // Add the new pids to the monitor list and adjust the threads needed
        newPids.forEach(([pid, threads]) => {
            this.monitorPids.push(pid);
            this.threadsNeeded -= threads;
        });

        // If we have no more threads needed, we wait until all scripts are finished
        if (this.threadsNeeded <= 0) {
            this.action = ServerHackAction.None;
        }
    }

    /**
     * Calculates the number of threads needed to perform the specified action on the target server
     * 
     * @param {NS} ns
     * @param {string} target The server to target
     * @param {ServerHackAction} action The action to perform
     * @returns {number} The number of threads needed to perform the specified action
     */
    public calculateThreadsNeeded(ns: NS): number {
        switch (this.action) {
            case ServerHackAction.Weaken:
                return calculateWeakenThreads(ns, this.target);
            case ServerHackAction.Grow:
                return calculateGrowThreads(ns, this.target);
            case ServerHackAction.Hack:
                return calculateHackThreads(ns, this.target, hackPercentage);
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
    public update(ns: NS) {
        this.monitorPids = this.monitorPids.filter(pid => ns.isRunning(pid));

        this.currentMoney = ns.getServerMoneyAvailable(this.target);
        this.currentSecurityLevel = ns.getServerSecurityLevel(this.target);

        if (this.monitorPids.length == 0 && this.threadsNeeded <= 0) {
            const prevAction = this.action;

            this.action = this.determineNextAction(ns);
            this.threadsNeeded = this.calculateThreadsNeeded(ns);

            // Let this hack wait if we are not hacking anymore
            if (prevAction == ServerHackAction.Hack && this.action !== ServerHackAction.Hack) {
                this.state = ServerHackState.Waiting;
            }
        }
    }
}

export enum ServerHackState {
    Waiting,
    Running
}

export enum ServerHackAction {
    None,
    Weaken,
    Grow,
    Hack
}



/**
 * Calculates the number of threads needed to weaken a server to its minimum security level
 * 
 * @param {NS} ns
 * @arg {string} target
 * @returns {number} The number of threads needed to weaken the target server to minimum security level
 */
function calculateWeakenThreads(ns: NS, target: string): number {
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
function calculateGrowThreads(ns: NS, target: string): number {

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
function calculateHackThreads(ns: NS, target: string, percentage: number): number {
    // Do only hack 75% of the money of this server to make sure we can re-grow it relatively easily
    return Math.ceil(ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) * percentage));
}
