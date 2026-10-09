import { NS } from "@ns";
import { deploymentFolder } from "/lib/constants";

const darknetFolder = `${deploymentFolder}/darknet`;
const phishingScript = `${darknetFolder}/phishing.js`;
const hackScript = `${darknetFolder}/hack.js`;

export async function main(ns: NS) {
    while (true) {
        const freeRam = ns.getServerMaxRam() - ns.getServerUsedRam();
        const threads = Math.floor(freeRam / ns.getScriptRam(phishingScript));

        let pid = ns.exec(phishingScript, ns.getHostname(), {threads: threads, preventDuplicates: true});
        while (ns.isRunning(pid)) {
            await ns.sleep(1000);
        }

        pid = ns.exec(hackScript, ns.getHostname(), {preventDuplicates: true});
        while (ns.isRunning(pid)) {
            await ns.sleep(1000);
        }
    }
}

