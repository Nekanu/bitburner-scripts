import { AutocompleteData, NS, ProgramName } from "@ns";

const purchasablePrograms: ProgramName[] = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
    "Formulas.exe",
    "DarkscapeNavigator.exe",
    "AutoLink.exe",
    "DeepscanV1.exe",
    "ServerProfiler.exe",
    "DeepscanV2.exe"
];

export function purchasePrograms(ns: NS) {
    // Check if we can buy any new tools
    if (ns.singularity.purchaseTor()) {
        purchasablePrograms.forEach(program => {
            purchaseProgram(ns, program);
        });
    }
}

export function purchaseProgram(ns: NS, program: ProgramName): boolean {
    if (ns.singularity.purchaseTor()) {
        const purchased = ns.singularity.purchaseProgram(program);
        if (purchased) {
            ns.printf("SUCCESS -- Purchased program: \"%s\"", program);
        }
        return purchased;
    }
    return false;
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data: AutocompleteData,) {
  return purchasablePrograms;
}

/**
 * @param {NS} ns
 */
export async function main(ns: NS) {
    const program = ns.args[0] as ProgramName | null;
    if (program == null) {
        purchasePrograms(ns);
    }
    else {
        purchaseProgram(ns, program);
    }
}