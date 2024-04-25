export class ScheduledFunction {
    priority: number;
    fn: Function;
    threadCount: number;
    neededMemory: number;

    constructor(fn: Function, neededMemory: number, threadCount: number, priority: number) {
        this.fn = fn;
        this.priority = priority;
        this.neededMemory = neededMemory;
        this.threadCount = threadCount;
    }
}

export class ScheduleList implements Iterable<ScheduledFunction> {
    scheduledFunctions: ScheduledFunction[];

    constructor() {
        this.scheduledFunctions = [];
    }

    [Symbol.iterator](): Iterator<ScheduledFunction, any, undefined> {
        return this.scheduledFunctions[Symbol.iterator]();
    }

    insert(fn: Function, neededMemory: number, threadCount: number, priority: number) {
        const scheduledFunction = new ScheduledFunction(fn, neededMemory, threadCount, priority);
        this.scheduledFunctions.push(scheduledFunction);
        this.scheduledFunctions.sort((a, b) => {
            if (a.priority === b.priority) {
                return 0;
            }
            return a.priority < b.priority ? -1 : 1;
        });
    }
}