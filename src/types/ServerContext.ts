import { NS, Server as NSServer } from "./Netscript";
import { Graph } from 'typescript-graph';

export class ServerContext {
    servers = new Graph<Server>();

    constructor(ns: NS) {
        this.servers.insert(new Server(ns, this, ns.getHostname()));
    }

    getServer(ns: NS, hostname: string): Server {
        let server = this.servers.getNodes().find(s => s.hostname === hostname);
        if (server == undefined) {
            server = new Server(ns, this, hostname);
            this.servers.insert(server);
        }
        return server;
    }

    updateServer(ns: NS, hostname: string): Server {
        let server = this.getServer(ns, hostname);

        return server.update(ns);
    }


}

export class Server implements NSServer {
    context: ServerContext;

    cpuCores: number;
    ftpPortOpen: boolean;
    hasAdminRights: boolean;
    hostname: string;
    httpPortOpen: boolean;
    ip: string;
    isConnectedTo: boolean;
    maxRam: number;
    organizationName: string;
    ramUsed: number;
    smtpPortOpen: boolean;
    sqlPortOpen: boolean;
    sshPortOpen: boolean;
    purchasedByPlayer: boolean;
    backdoorInstalled: boolean;
    baseDifficulty: number;
    hackDifficulty: number;
    minDifficulty: number;
    moneyAvailable: number;
    moneyMax: number;
    numOpenPortsRequired: number;
    openPortCount: number;
    requiredHackingSkill: number;
    serverGrowth: number;

    neighbors: string[];

    constructor(ns: NS, context: ServerContext, hostname: string) {
        this.context = context;
        const server = ns.getServer(hostname);

        this.cpuCores = server.cpuCores;
        this.ftpPortOpen = server.ftpPortOpen;
        this.hasAdminRights = server.hasAdminRights;
        this.hostname = server.hostname;
        this.httpPortOpen = server.httpPortOpen;
        this.ip = server.ip;
        this.isConnectedTo = server.isConnectedTo;
        this.maxRam = server.maxRam;
        this.organizationName = server.organizationName;
        this.ramUsed = server.ramUsed;
        this.smtpPortOpen = server.smtpPortOpen;
        this.sqlPortOpen = server.sqlPortOpen;
        this.sshPortOpen = server.sshPortOpen;
        this.purchasedByPlayer = server.purchasedByPlayer;
        this.backdoorInstalled = server.backdoorInstalled;
        this.baseDifficulty = server.baseDifficulty;
        this.hackDifficulty = server.hackDifficulty;
        this.minDifficulty = server.minDifficulty;
        this.moneyAvailable = server.moneyAvailable;
        this.moneyMax = server.moneyMax;
        this.numOpenPortsRequired = server.numOpenPortsRequired;
        this.openPortCount = server.openPortCount;
        this.requiredHackingSkill = server.requiredHackingSkill;
        this.serverGrowth = server.serverGrowth;

        this.neighbors = ns.scan(hostname);
    }

    update(ns: NS): Server {
        const server = ns.getServer(this.hostname);

        this.cpuCores = server.cpuCores;
        this.ftpPortOpen = server.ftpPortOpen;
        this.hasAdminRights = server.hasAdminRights;
        this.httpPortOpen = server.httpPortOpen;
        this.ip = server.ip;
        this.isConnectedTo = server.isConnectedTo;
        this.maxRam = server.maxRam;
        this.organizationName = server.organizationName;
        this.ramUsed = server.ramUsed;
        this.smtpPortOpen = server.smtpPortOpen;
        this.sqlPortOpen = server.sqlPortOpen;
        this.sshPortOpen = server.sshPortOpen;
        this.purchasedByPlayer = server.purchasedByPlayer;
        this.backdoorInstalled = server.backdoorInstalled;
        this.baseDifficulty = server.baseDifficulty;
        this.hackDifficulty = server.hackDifficulty;
        this.minDifficulty = server.minDifficulty;
        this.moneyAvailable = server.moneyAvailable;
        this.moneyMax = server.moneyMax;
        this.numOpenPortsRequired = server.numOpenPortsRequired;
        this.openPortCount = server.openPortCount;
        this.requiredHackingSkill = server.requiredHackingSkill;
        this.serverGrowth = server.serverGrowth;

        this.neighbors = ns.scan(this.hostname);

        return this;
    }
}