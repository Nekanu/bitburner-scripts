import { NS } from "@ns";
import { ScheduleList } from "types/scheduling";

const schedule: ScheduleList = new ScheduleList();

export async function main(ns: NS) {
    ns.disableLog("ALL");

    // Do not run if this script is already running
    if (ns.ps("home").find((p) => p.filename === "scheduler.js") !== null) {
        throw new Error("scheduler.js is already running");
    }

}
