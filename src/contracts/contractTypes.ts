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

    new Contract("Total Ways to Sum", (data: number) => {
        // Given a number, how many different distinct ways can a number be written as a sum of at least two positive integers?

        const ways = [1]
        ways.length = data + 1
        ways.fill(0, 1)
        for (let i = 1; i < data; ++i) {
            for (let j = i; j <= data; ++j) {
                ways[j] += ways[j - i];
            }
        }
        return ways[data];

    }),

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

    new Contract("Total Ways to Sum", (data: number) => {
        const ways = [1]
        ways.length = data + 1
        ways.fill(0, 1)
        for (let i = 1; i < data; ++i) {
            for (let j = i; j <= data; ++j) {
                ways[j] += ways[j - i]
            }
        }
        return ways[data]
    }),

    new Contract("Spiralize Matrix", (data: number[][]) => {
        const solution: number[] = [];
        const matrix = data;

        while (matrix.length) {
            solution.push(...matrix.shift()!);
            for (let i = 0; i < matrix.length; i++) {
                solution.push(matrix[i].pop()!);
            }
            solution.push(...(matrix.pop() || []).reverse());
            for (let i = matrix.length - 1; i >= 0; i--) {
                solution.push(matrix[i].shift()!);
            }
        }

        return solution;
    }),

    new Contract("Algorithmic Stock Trader I", (data: number[]) => {
        let maxProfit = 0;
        let minPrice = Number.MAX_VALUE;

        for (let i = 0; i < data.length; i++) {
            if (data[i] < minPrice) {
                minPrice = data[i];
            } else if (data[i] - minPrice > maxProfit) {
                maxProfit = data[i] - minPrice;
            }
        }

        return maxProfit;
    }),
];