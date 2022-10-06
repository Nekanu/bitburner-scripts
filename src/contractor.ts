import { Contract, contracts } from "contracts/contractTypes";
import { NS } from "types/netscript";


export async function main(ns: NS) {
    let data = "())(a))(a(";
    let contract: Contract = contracts.find(c => c.name === "Sanitize Parentheses in Expression")!;

    ns.tprint(contract.solver(data));
}