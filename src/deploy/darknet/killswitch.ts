import { NS } from "@ns";
import { deploymentFolder } from "/lib/constants";
import { deployFolder } from "/lib/helpers";

const darknetFolder = `${deploymentFolder}/darknet`;
const initScript = `${darknetFolder}/init.js`;

export async function main(ns: NS) {
    const neighbors = ns.dnet.probe();

    for (const server of neighbors) {
        const details = ns.dnet.getServerDetails(server);
        if (!details.hasSession) {
            continue;
        }

        ns.killall(server);
        deployFolder(ns, server);
        const pid = ns.exec(initScript, server, { preventDuplicates: true });

        ns.tprintf("%-4s  %-18s killed + redeployed (pid %d)", pid > 0 ? "OK" : "FAIL", server, pid);
    }
}
