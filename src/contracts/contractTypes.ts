export class Contract {
    public name: string;
    public solver: (data: any) => any;

    constructor(name: string, solver: (data: any) => any) {
        this.name = name;
        this.solver = solver;
    }
}

export const contracts: Contract[] = [
    new Contract("Find Largest Prime Factor", (data: number) => {
        let num = data;
        let largestPrimeFactor = 0;

        for (let i = 2; i <= num; i++) {
            while (num % i === 0) {
                largestPrimeFactor = i;
                num /= i;
            }
        }

        return largestPrimeFactor;
    }),

    new Contract("Subarray with Maximum Sum", (data: number[]) => {
        const nums = data.slice()
        for (let i = 1; i < nums.length; i++) {
            nums[i] = Math.max(nums[i], nums[i] + nums[i - 1])
        }
        return Math.max.apply(Math, nums)
    }),

    //new Contract("Total Ways to Sum", (data: number) => {
    // TODO: Implement
    //}),

    new Contract("Sanitize Parentheses in Expression", (data: string) => {
        const expression = data.split("");
        const stack: number[] = [];
        for (let i = 0; i < expression.length; i++) {
            if (expression[i] === "(") {
                stack.push(i);
            } else if (expression[i] === ")") {
                if (stack.length > 0) {
                    stack.pop();
                } else {
                    expression[i] = "";
                }
            }
        }

        while (stack.length > 0) {
            expression[stack.pop()!] = "";
        }

        return expression.join("");
    }),
];