import { DarknetResult, NS } from "@ns";
import { solvers } from "./solvers";
import { deploymentFolder } from "/lib/constants";
import { deployFolder } from "/lib/helpers";

const darknetFolder = `${deploymentFolder}/darknet`;
const initScript = `${darknetFolder}/init.js`;

export async function crack(ns: NS, hostname: string): Promise<DarknetResult> {

    const details = ns.dnet.getServerDetails(hostname);

    if (details.hasSession) {
        return {
            code: 200,
            message: "",
            success: false
        };
    }

    const solver = solvers.get(details.modelId);
    if (solver == undefined) {
        ns.toast(`No solver found for model: ${details.modelId}`, "error");
        return {
            code: 503,
            message: "",
            success: false
        };
    }

    try {
        return await solver.solve(ns, hostname, details);
    }
    catch {
        return {
            code: 503,
            message: "",
            success: false
        };
    }
}

export async function main(ns: NS) {
    const connectedServers = ns.dnet.probe();
    for (const server of connectedServers) {
        const result = await crack(ns, server);
        if (!result.success) return;

        deployFolder(ns, server);
        ns.exec(initScript, server, {preventDuplicates: true});
    }
}