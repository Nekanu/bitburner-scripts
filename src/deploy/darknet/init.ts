import { NS } from "@ns";
import { deploymentFolder } from "/lib/constants";
import { DarknetServerInfo } from "/types/darknet";

export async function main(ns: NS) {
    await ns.dnet.memoryReallocation();
    const cacheFiles = ns.ls(ns.getHostname(), ".cache");
    cacheFiles.forEach(file => {
        const cache = ns.dnet.openCache(file);
    });

    const info: DarknetServerInfo = {
        maxRAM: ns.getServerMaxRam(ns.getHostname()),
        details: ns.dnet.getServerDetails()
    };
    ns.write("/tmp/info.json", JSON.stringify(info));
    
    ns.spawn(`${deploymentFolder}/darknet/agent.js`, {spawnDelay: 100, preventDuplicates: true});
}