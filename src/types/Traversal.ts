import { NS } from "types/netscript";

export interface ITraversalFunction extends Function {
    (ns: NS, traversalContext: TraversalContext, args?: any): void;
}

export class TraversalContext {
    public readonly traversal: Traversal;
    public readonly hostname: string;
    public readonly distanceFromStart: number;
    public readonly parent: TraversalContext | null;

    constructor(traversal: Traversal, parentContext: TraversalContext | null, hostname: string, distanceFromStart: number) {
        this.traversal = traversal;
        this.hostname = hostname;
        this.distanceFromStart = distanceFromStart;
        this.parent = parentContext;
    }
}

export class Traversal {
    private traversedServers: string[] = [];
    public readonly exclusionList: string[];
    public readonly suppressOutput: boolean;
    public readonly traversalFunction: ITraversalFunction;

    constructor(traversalFunction: ITraversalFunction, suppressOutput?: boolean, exclusions?: string[]) {
        this.traversalFunction = traversalFunction;
        this.suppressOutput = suppressOutput ?? false;
        this.exclusionList = exclusions ?? [];
    }

    public start(ns: NS, hostname: string, traversalFunctionArgs?: any) {
        this.traverseNode(null, ns, hostname, 0, traversalFunctionArgs);
    }

    private traverseNode(parentContext: TraversalContext | null, ns: NS, hostname: string, depth: number, traversalFunctionArgs?: any) {
        // Disallow backtracking
        this.traversedServers.push(hostname);

        let traversalContext: TraversalContext;

        if (!this.exclusionList.includes(hostname)) {
            traversalContext = new TraversalContext(this, parentContext, hostname, depth);
            this.traversalFunction(ns, traversalContext, traversalFunctionArgs);
        }

        let connectedServers = ns.scan(hostname);
        connectedServers.forEach((server) => {
            if (!this.traversedServers.includes(server)) {
                this.traverseNode(traversalContext, ns, server, depth + 1, traversalFunctionArgs);
            }
        });
    }
}

export function getRamMapping(ns: NS): { total: [number, number], ramMapping: Map<string, [number, number]> } {

    const result = {
        total: [0, 0] as [number, number],
        ramMapping: new Map<string, [number, number]>()
    };

    new Traversal((ns: NS, context: TraversalContext, args: { total: [number, number], ramMapping: Map<string, [number, number]> }) => {
        const server = context.hostname;

        if (!ns.hasRootAccess(server)) return;

        const maxRam = ns.getServerMaxRam(server);

        const freeRAM = maxRam - ns.getServerUsedRam(server);

        args.total[0] += freeRAM;
        args.total[1] += maxRam;
        args.ramMapping.set(server, [freeRAM, maxRam]);
    }, false, ["home"])
        .start(ns, "home", result);

    return result;
}