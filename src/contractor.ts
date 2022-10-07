import { Contract, contracts } from "contracts/contractTypes";
import { NS } from "types/netscript";


export async function main(ns: NS) {
    let data = 11;
    let contract: Contract = contracts.find(c => c.name === "Total Ways to Sum")!;

    ns.tprint(contract.solver(data));
}