import { DarknetResult, DarknetServerDetails, NS } from "@ns";

const digits = "0123456789";
const lower = "abcdefghijklmnopqrstuvwxyz";
const higher = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const commonPasswordDictionary = [
  "123456",
  "password",
  "12345678",
  "qwerty",
  "123456789",
  "12345",
  "1234",
  "111111",
  "1234567",
  "dragon",
  "123123",
  "baseball",
  "abc123",
  "football",
  "monkey",
  "letmein",
  "696969",
  "shadow",
  "master",
  "666666",
  "qwertyuiop",
  "123321",
  "mustang",
  "1234567890",
  "michael",
  "654321",
  "superman",
  "1qaz2wsx",
  "7777777",
  "121212",
  "0",
  "qazwsx",
  "123qwe",
  "trustno1",
  "jordan",
  "jennifer",
  "zxcvbnm",
  "asdfgh",
  "hunter",
  "buster",
  "soccer",
  "harley",
  "batman",
  "andrew",
  "tigger",
  "sunshine",
  "iloveyou",
  "2000",
  "charlie",
  "robert",
  "thomas",
  "hockey",
  "ranger",
  "daniel",
  "starwars",
  "112233",
  "george",
  "computer",
  "michelle",
  "jessica",
  "pepper",
  "1111",
  "zxcvbn",
  "555555",
  "11111111",
  "131313",
  "freedom",
  "777777",
  "pass",
  "maggie",
  "159753",
  "aaaaaa",
  "ginger",
  "princess",
  "joshua",
  "cheese",
  "amanda",
  "summer",
  "love",
  "ashley",
  "6969",
  "nicole",
  "chelsea",
  "biteme",
  "matthew",
  "access",
  "yankees",
  "987654321",
  "dallas",
  "austin",
  "thunder",
  "taylor",
  "matrix",
];

export const EUCountries = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Republic of Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
];

export interface DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult>;
}

class NoPasswordAuthenticator implements DarknetAuthenticator {
    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        return await ns.dnet.authenticate(hostname, "");
    }
}

class CaptchaPasswordSolver implements DarknetAuthenticator {
    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        return await ns.dnet.authenticate(hostname, details.data.replace(/[^0-9]/g, ""));
    }
}

class EchoVulnPasswordSolver implements DarknetAuthenticator {
    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        return await ns.dnet.authenticate(hostname, details.passwordHint.replace(/[^0-9]/g, ""));
    }
}

class DictionarySolver implements DarknetAuthenticator {
    dictionary: string[];

    constructor(dictionary: string[]) {
        this.dictionary = dictionary;
    }

    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        for (const word of this.dictionary) {
            const result = await ns.dnet.authenticate(hostname, word);
            if (result.success) {
                return result;
            }
        }
        return {
            code: 401,
            message: "No dictionary entry matched",
            success: false
        };
    }
}

class RomanNumeralSolver implements DarknetAuthenticator {
    private romanNumeralDecoder(input: string): number {
        if (input.toLowerCase() === "nulla") {
            return 0;
        }

        const romanToInt: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
        let total = 0;
        let prevValue = 0;

        for (let i = input.length - 1; i >= 0; i--) {
            const currentValue = romanToInt[input[i]];
            if (currentValue < prevValue) {
                total -= currentValue;
            } else {
                total += currentValue;
            }
            prevValue = currentValue;
        }

        return total;
    }

    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // At higher difficulty the server only exposes a "min,max" range instead of the exact
        // encoded password, which can only be narrowed down via live higher/lower feedback.
        if (details.data.includes(",")) {
            return { code: 401, message: "Password only bounded by a range, cannot solve statically", success: false };
        }
        const password = this.romanNumeralDecoder(details.data).toString();
        return await ns.dnet.authenticate(hostname, password);
    }
}

class ConvertToBase10Solver implements DarknetAuthenticator {
    private parseBaseNNumberString(numberString: string, base: number): number {
        const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let result = 0;
        let index = 0;
        let digit = numberString.split(".")[0].length - 1;

        while (index < numberString.length) {
            const currentDigit = numberString[index];
            if (currentDigit === ".") {
                index += 1;
                continue;
            }
            result += characters.indexOf(currentDigit) * base ** digit;
            index += 1;
            digit -= 1;
        }

        return result;
    }

    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        const [baseStr, encoded] = details.data.split(",");
        const password = Math.round(this.parseBaseNNumberString(encoded, Number(baseStr))).toString();
        return await ns.dnet.authenticate(hostname, password);
    }
}

class LargestPrimeFactorSolver implements DarknetAuthenticator {
    private largestPrimeFactor(n: number): number {
        let num = n;
        let largest = 1;

        while (num % 2 === 0) {
            largest = 2;
            num /= 2;
        }
        for (let factor = 3; factor * factor <= num; factor += 2) {
            while (num % factor === 0) {
                largest = factor;
                num /= factor;
            }
        }
        if (num > 1) {
            largest = num;
        }

        return largest;
    }

    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        const password = this.largestPrimeFactor(Number(details.data)).toString();
        return await ns.dnet.authenticate(hostname, password);
    }
}

class BinaryEncodedFeedbackSolver implements DarknetAuthenticator {
    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        const password = details.data
            .split(" ")
            .map(bin => String.fromCharCode(parseInt(bin, 2)))
            .join("");
        return await ns.dnet.authenticate(hostname, password);
    }
}

class XorEncryptedPasswordSolver implements DarknetAuthenticator {
    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        const [encrypted, maskPart] = details.data.split(";");
        const masks = maskPart.split(" ").map(bin => parseInt(bin, 2));
        const password = encrypted
            .split("")
            .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ masks[i]))
            .join("");
        return await ns.dnet.authenticate(hostname, password);
    }
}

class ParsedExpressionSolver implements DarknetAuthenticator {
    private cleanArithmeticExpression(expression: string): string {
        const expressionWithFixedSymbols = expression
            .replaceAll("ҳ", "*")
            .replaceAll("÷", "/")
            .replaceAll("➕", "+")
            .replaceAll("➖", "-")
            .replaceAll("ns.exit(),", "");
        return expressionWithFixedSymbols.split(",")[0];
    }

    private parseSimpleArithmeticExpression(expression: string): number {
        const tokens = this.cleanArithmeticExpression(expression).split("");

        let currentDepth = 0;
        const depth = tokens.map((token) => {
            if (token === "(") {
                currentDepth += 1;
            } else if (token === ")") {
                currentDepth -= 1;
                return currentDepth + 1;
            }
            return currentDepth;
        });
        const depth1Start = depth.indexOf(1);
        const firstZeroAfterDepth1Start = depth.indexOf(0, depth1Start);
        const depth1End = firstZeroAfterDepth1Start === -1 ? depth.length - 1 : firstZeroAfterDepth1Start - 1;
        if (depth1Start !== -1) {
            const subExpression = tokens.slice(depth1Start + 1, depth1End).join("");
            const result = this.parseSimpleArithmeticExpression(subExpression);
            tokens.splice(depth1Start, depth1End - depth1Start + 1, result.toString());
            return this.parseSimpleArithmeticExpression(tokens.join(""));
        }

        let remainingExpression = tokens.join("");

        const multiplicationDivisionRegex = /(-?\d*\.?\d+) *([*/]) *(-?\d*\.?\d+)/;
        let match = remainingExpression.match(multiplicationDivisionRegex);

        while (match) {
            const [, left, operator, right] = match;
            const result = operator === "*" ? parseFloat(left) * parseFloat(right) : parseFloat(left) / parseFloat(right);
            const resultString = Math.abs(result) < 0.000001 ? result.toFixed(20) : result.toString();
            remainingExpression = remainingExpression.replace(match[0], resultString);
            match = remainingExpression.match(multiplicationDivisionRegex);
        }

        const additionSubtractionRegex = /(-?\d*\.?\d+) *([+-]) *(-?\d*\.?\d+)/;
        match = remainingExpression.match(additionSubtractionRegex);

        while (match) {
            const [, left, operator, right] = match;
            const result = operator === "+" ? parseFloat(left) + parseFloat(right) : parseFloat(left) - parseFloat(right);
            remainingExpression = remainingExpression.replace(match[0], result.toString());
            match = remainingExpression.match(additionSubtractionRegex);
        }

        const [, leftover] = remainingExpression.match(/(-?\d*\.?\d+)/) ?? ["", ""];

        return parseFloat(leftover);
    }

    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        const password = this.parseSimpleArithmeticExpression(details.data).toString();
        return await ns.dnet.authenticate(hostname, password);
    }
}

class MastermindHintSolver implements DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // Feedback per guess: details.data === "${exactCharacters},${misplacedCharacters}"
        // (exact = right char at right position, misplaced = right char at wrong position).
        throw new Error("Method not implemented.");
    }
}

class SortedEchoVulnSolver implements DarknetAuthenticator {
    private swap(array: string[], index1: number, index2: number): void {
        const c = array[index1];
        array[index1] = array[index2];
        array[index2] = c;
    }

    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // details.data holds the password's characters pre-sorted. There is no per-guess
        // positional feedback for this model, so the only way in is trying permutations of
        // details.data until one is accepted.
        const array = details.data.split('');
        const permutation_counter: number[] = Array(details.passwordLength).fill(0);

        let result = await ns.dnet.authenticate(hostname, array.join(''));
        if (result.success) return result;
        
        let i = 1;
        while (i < details.passwordLength) {
            if (permutation_counter[i] < i) {
                if (i % 2 == 0) {
                    this.swap(array, 0, i);
                }
                else {
                    this.swap(array, permutation_counter[i], i);
                }

                let result = await ns.dnet.authenticate(hostname, array.join(''));
                if (result.success) return result;

                permutation_counter[i]++;
                i = 1;
            }
            else {
                permutation_counter[i] = 0;
                i++;
            }
        }

        throw new Error("Permutation fail")
    }
}

class BufferOverflowSolver implements DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        return ns.dnet.authenticate(hostname, Array(details.passwordLength * 2).fill("a").join());
    }
}

class TimingAttackSolver implements DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // Failure message is "Found a mismatch while checking each character (N)", where N is
        // the index of the first character that differs from the real password.
        throw new Error("Method not implemented.");
    }
}

class SpiceLevelSolver implements DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // Feedback per guess: details.data === "<repeated pepper emoji, one per correct-position
        // character>/<passwordLength>" (e.g. "0/5" for no matches, no info on which position).
        throw new Error("Method not implemented.");
    }
}

class DivisibilityTestSolver implements DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // Submitting a number as the "password" never authenticates by itself - the server
        // replies with data "true"/"false" for whether the real password is divisible by it.
        // Use that to factor the password, then submit the reconstructed value directly.

        const maxNumber = (10 ** details.passwordLength) - 1;
        // Primes and its powers up to maxNumber/2
        throw new Error("Method not implemented.");
    }
}

class TripleModuloSolver implements DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // Feedback per guess: details.data === ((password % input) % ((input - 1) % 32 + 1)).toString(),
        // where input is the submitted guess.
        throw new Error("Method not implemented.");
    }
}

class GlobalMaximaSolver implements DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // Feedback per guess: details.data is an "altitude" that peaks the closer the guess is
        // to the real password (a noisy multi-hill function) - needs a hill-climbing strategy.
        throw new Error("Method not implemented.");
    }
}

class PacketSnifferSolver implements DarknetAuthenticator {
    solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        // Each guess's response data is a blob of noise text with " hostname:password " embedded
        // somewhere inside it (raw, undelimited password instead, at high difficulty).
        throw new Error("Method not implemented.");
    }
}

class GuessNumberSolver implements DarknetAuthenticator {
    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        const maxNumber = Number.parseInt(details.passwordHint.replace(/[^0-9]/g, ""));
        const bounds = [0, maxNumber];
        let guess = Math.floor(maxNumber / 2);
        while (true) {
            const result = await ns.dnet.authenticate(hostname, guess.toString());
            if (result.success) {
                return result;
            }

            const isLower = result.data!.toLowerCase() == "lower";
            if (isLower) {
                bounds[1] = guess - 1;
            }
            else {
                bounds[0] = guess + 1;
            }

            guess = Math.round(bounds[0] + (bounds[1] - bounds[0]) / 2);
        }
    }
}

class YesntSolver implements DarknetAuthenticator {
    async solve(ns: NS, hostname: string, details: DarknetServerDetails): Promise<DarknetResult> {
        const alphabet = digits.concat(lower, higher);
        const array: string[] = Array(details.passwordLength).fill("0");
        const found: boolean[] = Array(details.passwordLength).fill(false);
        for (let char = 0; char < alphabet.length; char++) {
            const result = await ns.dnet.authenticate(hostname, array.reduce((a,b) => a.concat(b)));

            if (result.success) return result;

            const resultArray = (result.data! as string).split(",").map(e => e == "yes" ? true : false);
            for (let i = 0; i < details.passwordLength; i++) {
                if (resultArray[i] || found[i]) {
                    found[i] = true;
                    continue;
                }
                array[i] = alphabet[char];
            }
        }

        return ns.dnet.authenticate(hostname, array.reduce((a,b) => a.concat(b)));
    }
}

export const solvers: Map<string, DarknetAuthenticator> = new Map([
    // Static Solvers
    ["ZeroLogon", new NoPasswordAuthenticator()],
    ["DeskMemo_3.1", new EchoVulnPasswordSolver()],
    ["CloudBlare(tm)", new CaptchaPasswordSolver()],
    ["FreshInstall_1.0", new DictionarySolver(["admin", "password", "0000", "12345"])],
    ["Laika4", new DictionarySolver(["fido", "spot", "rover", "max"])],
    ["TopPass", new DictionarySolver(commonPasswordDictionary)],
    ["EuroZone Free", new DictionarySolver(EUCountries)],
    ["BellaCuore", new RomanNumeralSolver()],
    ["OctantVoxel", new ConvertToBase10Solver()],
    ["PrimeTime 2", new LargestPrimeFactorSolver()],
    ["110100100", new BinaryEncodedFeedbackSolver()],
    ["OrdoXenos", new XorEncryptedPasswordSolver()],
    ["MathML", new ParsedExpressionSolver()],

    // Dynamic Solvers
    ["NIL", new YesntSolver()],
    ["AccountsManager_4.2", new GuessNumberSolver()],

    // Not yet implemented
    ["DeepGreen", new MastermindHintSolver()],
    ["PHP 5.4", new SortedEchoVulnSolver()],
    ["Pr0verFl0", new BufferOverflowSolver()],
    ["2G_cellular", new TimingAttackSolver()],
    ["RateMyPix.Auth", new SpiceLevelSolver()],
    ["Factori-Os", new DivisibilityTestSolver()],
    ["BigMo%od", new TripleModuloSolver()],
    ["KingOfTheHill", new GlobalMaximaSolver()],
    ["OpenWebAccessPoint", new PacketSnifferSolver()],
]);