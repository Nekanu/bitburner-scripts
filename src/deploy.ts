import { AutocompleteData, NS } from "@ns";
import { deployFolder } from "./lib/helpers";

export function autocomplete(data: AutocompleteData,) {
    return [...data.servers];
}

export function main(ns: NS) {
    const hostname = ns.args[0] as string;
    deployFolder(ns, hostname);
}