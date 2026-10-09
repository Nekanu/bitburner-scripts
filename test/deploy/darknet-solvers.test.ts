import { describe, expect, it, vi } from "vitest";
import type { DarknetServerDetails, NS } from "@ns";
import { EUCountries, solvers } from "../../src/deploy/darknet-solvers";

function makeDetails(overrides: Partial<DarknetServerDetails> = {}): DarknetServerDetails {
    return {
        isConnectedToCurrentServer: true,
        hasSession: false,
        modelId: "",
        passwordHint: "",
        data: "",
        logTrafficInterval: -1,
        passwordLength: 0,
        passwordFormat: "numeric",
        blockedRam: 0,
        difficulty: 1,
        depth: 1,
        requiredCharismaSkill: 1,
        isStationary: false,
        ...overrides,
    };
}

function makeNs(authenticate: (...args: [string, string]) => Promise<unknown>): NS {
    return { dnet: { authenticate } } as unknown as NS;
}

function solver(modelId: string) {
    const found = solvers.get(modelId);
    if (found == undefined) {
        throw new Error(`No solver registered for model "${modelId}"`);
    }
    return found;
}

describe("NoPasswordAuthenticator (ZeroLogon)", () => {
    it("authenticates with an empty password", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);

        const result = await solver("ZeroLogon").solve(ns, "host", makeDetails());

        expect(authenticate).toHaveBeenCalledWith("host", "");
        expect(result.success).toBe(true);
    });
});

describe("EchoVulnPasswordSolver (DeskMemo_3.1)", () => {
    it("extracts the digits embedded in the hint", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ passwordHint: "Remember to use 4821" });

        await solver("DeskMemo_3.1").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "4821");
    });
});

describe("CaptchaPasswordSolver (CloudBlare(tm))", () => {
    it("strips filler characters from the interspersed digits", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "3/[]8()~2:;1" });

        await solver("CloudBlare(tm)").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "3821");
    });
});

describe("DictionarySolver (FreshInstall_1.0)", () => {
    it("stops and returns success as soon as an entry matches", async () => {
        const authenticate = vi.fn(async (_host: string, password: string) => ({
            success: password === "0000",
            code: password === "0000" ? 200 : 401,
            message: password === "0000" ? "Success" : "Unauthorized",
        }));
        const ns = makeNs(authenticate);

        const result = await solver("FreshInstall_1.0").solve(ns, "host", makeDetails());

        expect(result.success).toBe(true);
        // admin, password, 0000 - should stop right after the match, not try 12345 too
        expect(authenticate).toHaveBeenCalledTimes(3);
    });

    it("reports failure once the whole dictionary is exhausted", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: false, code: 401, message: "Unauthorized" });
        const ns = makeNs(authenticate);

        const result = await solver("EuroZone Free").solve(ns, "host", makeDetails());

        expect(result.success).toBe(false);
        expect(authenticate).toHaveBeenCalledTimes(EUCountries.length);
    });
});

describe("RomanNumeralSolver (BellaCuore)", () => {
    it("decodes an exact roman numeral password", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "XIV" });

        await solver("BellaCuore").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "14");
    });

    it("gives up without guessing when only a min/max range is given", async () => {
        const authenticate = vi.fn();
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "X,XX" });

        const result = await solver("BellaCuore").solve(ns, "host", details);

        expect(authenticate).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
    });
});

describe("ConvertToBase10Solver (OctantVoxel)", () => {
    it("decodes a base-N encoded password to base 10", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "16,1A" }); // 0x1A == 26

        await solver("OctantVoxel").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "26");
    });
});

describe("LargestPrimeFactorSolver (PrimeTime 2)", () => {
    it("finds the largest prime factor of a composite number", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "360" }); // 2^3 * 3^2 * 5

        await solver("PrimeTime 2").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "5");
    });

    it("handles a number that is itself prime", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "9859" });

        await solver("PrimeTime 2").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "9859");
    });
});

describe("BinaryEncodedFeedbackSolver (110100100)", () => {
    it("decodes 8-bit binary characters back to ASCII", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "01000001 01000010" }); // "AB"

        await solver("110100100").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "AB");
    });
});

describe("XorEncryptedPasswordSolver (OrdoXenos)", () => {
    it("reverses the XOR mask to recover the password", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);

        const password = "AB3";
        const masks = [3, 12, 31];
        const encrypted = password
            .split("")
            .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ masks[i]))
            .join("");
        const maskBinary = masks.map((mask) => mask.toString(2).padStart(8, "0")).join(" ");
        const details = makeDetails({ data: `${encrypted};${maskBinary}` });

        await solver("OrdoXenos").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", password);
    });
});

describe("ParsedExpressionSolver (MathML)", () => {
    it("evaluates a simple arithmetic expression with operator precedence", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "4 + 5 * ( 6 + 7 ) / 2" }); // 4 + 5*13/2 = 36.5

        await solver("MathML").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "36.5");
    });

    it("translates the fancy unicode operators used at higher difficulty", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "4 ➕ 5 ҳ 2" }); // 4 + 5*2 = 14

        await solver("MathML").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "14");
    });

    it("ignores the code-injection easter egg appended to the expression", async () => {
        const authenticate = vi.fn().mockResolvedValue({ success: true, code: 200, message: "Success" });
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: "4 + 5 , !globalThis.pwn3d && alert('gotcha')" });

        await solver("MathML").solve(ns, "host", details);

        expect(authenticate).toHaveBeenCalledWith("host", "9");
    });
});

describe("GuessNumberSolver (AccountsManager_4.2)", () => {
    function makeGuessNumberNs(target: number) {
        const authenticate = vi.fn(async (_host: string, password: string) => {
            const guess = Number(password);
            if (guess === target) {
                return { success: true, code: 200, message: "Success" };
            }
            return {
                success: false,
                code: 401,
                message: "Unauthorized",
                data: guess > target ? "Lower" : "Higher",
            };
        });
        return { ns: makeNs(authenticate), authenticate };
    }

    it.each([0, 1, 7, 500, 999])("converges on the target password %i within a bounded number of guesses", async (target) => {
        const { ns, authenticate } = makeGuessNumberNs(target);
        const details = makeDetails({ passwordHint: "The password is a number between 0 and 1000" });

        const result = await solver("AccountsManager_4.2").solve(ns, "host", details);

        expect(result.success).toBe(true);
        // A correct binary search over 0..1000 should never need more than ~10-11 guesses
        expect(authenticate.mock.calls.length).toBeLessThanOrEqual(15);
        for (const [, guessString] of authenticate.mock.calls) {
            expect(Number.isInteger(Number(guessString))).toBe(true);
        }
    });
});

describe("YesntSolver (NIL)", () => {
    function makeYesntNs(secret: string) {
        const authenticate = vi.fn(async (_host: string, password: string) => {
            if (password === secret) {
                return { success: true, code: 200, message: "Success" };
            }
            const data = password
                .split("")
                .map((char, i) => (char === secret[i] ? "yes" : "yesn't"))
                .join(",");
            return { success: false, code: 401, message: "that wasn't right", data };
        });
        return { ns: makeNs(authenticate), authenticate };
    }

    it.each(["000", "111", "a1B", "Zz9"])("recovers the full alphanumeric password %s", async (secret) => {
        const { ns } = makeYesntNs(secret);
        const details = makeDetails({ passwordLength: secret.length });

        const result = await solver("NIL").solve(ns, "host", details);

        expect(result.success).toBe(true);
    });
});

// The solvers below are stubs (they throw "Method not implemented.") - these tests describe
// the expected behavior, ported from the game's own checkPassword logic, and are expected to
// fail (red) until each solver is implemented.

describe("MastermindHintSolver (DeepGreen)", () => {
    function makeMastermindNs(secret: string) {
        const authenticate = vi.fn(async (_host: string, password: string) => {
            if (password === secret) {
                return { success: true, code: 200, message: "Success" };
            }
            const exact = password.split("").filter((char, i) => char === secret[i]).length;
            const remainingSecret = secret.split("").filter((char, i) => char !== password[i]);
            const remainingGuess = password.split("").filter((char, i) => char !== secret[i]);
            const misplaced = remainingGuess.filter((char) => {
                const idx = remainingSecret.indexOf(char);
                if (idx === -1) return false;
                remainingSecret.splice(idx, 1);
                return true;
            }).length;
            return { success: false, code: 401, message: "Hint", data: `${exact},${misplaced}` };
        });
        return makeNs(authenticate);
    }

    it("finds a short numeric password from exact/misplaced feedback", async () => {
        const ns = makeMastermindNs("172");
        const details = makeDetails({ data: "", passwordLength: 3, passwordFormat: "numeric" });

        const result = await solver("DeepGreen").solve(ns, "host", details);

        expect(result.success).toBe(true);
    });
});

describe("SortedEchoVulnSolver (PHP 5.4)", () => {
    it("finds the password by trying permutations of the sorted characters", async () => {
        const secret = "b2a";
        const sorted = secret.split("").sort().join("");
        const authenticate = vi.fn(async (_host: string, password: string) => ({
            success: password === secret,
            code: password === secret ? 200 : 401,
            message: password === secret ? "Success" : "Unauthorized",
        }));
        const ns = makeNs(authenticate);
        const details = makeDetails({ data: sorted, passwordLength: secret.length });

        const result = await solver("PHP 5.4").solve(ns, "host", details);

        expect(result.success).toBe(true);
        // Every attempt should be an anagram of the sorted hint, not an arbitrary guess.
        for (const [, guess] of authenticate.mock.calls) {
            expect(guess.split("").sort().join("")).toBe(sorted);
        }
    });
});

describe("BufferOverflowSolver (Pr0verFl0)", () => {
    function makeBufferOverflowNs(secret: string) {
        const authenticate = vi.fn(async (_host: string, attemptedPassword: string) => {
            if (attemptedPassword === secret) {
                return { success: true, code: 200, message: "Success" };
            }
            // Ported from authentication.ts's ModelIds.BufferOverflow case.
            const maskCharacter = attemptedPassword === "■".repeat(secret.length) ? "?" : "■";
            const buffer = "ˍ".repeat(secret.length) + maskCharacter.repeat(secret.length);
            const overwrittenBuffer = attemptedPassword.slice(0, buffer.length) + buffer.slice(attemptedPassword.length);
            const receivedBuffer = overwrittenBuffer.slice(0, secret.length);
            const expectedValueBuffer = overwrittenBuffer.slice(secret.length);
            if (receivedBuffer === expectedValueBuffer) {
                return { success: true, code: 200, message: "Success" };
            }
            return {
                success: false,
                code: 401,
                message: `auth failed: received '${receivedBuffer}', expected '${expectedValueBuffer}'`,
                data: `${receivedBuffer},${expectedValueBuffer}`,
            };
        });
        return makeNs(authenticate);
    }

    it("exploits the overflow instead of needing to know the real password", async () => {
        const secret = "z9k2"; // never revealed to the solver via any guessable path
        const ns = makeBufferOverflowNs(secret);
        const details = makeDetails({ passwordHint: `Warning: password buffer is ${secret.length} bytes`, passwordLength: secret.length });

        const result = await solver("Pr0verFl0").solve(ns, "host", details);

        expect(result.success).toBe(true);
    });
});

describe("TimingAttackSolver (2G_cellular)", () => {
    function makeTimingAttackNs(secret: string) {
        const authenticate = vi.fn(async (_host: string, password: string) => {
            if (password === secret) {
                return { success: true, code: 200, message: "Success" };
            }
            const indexOfDifference = secret.split("").findIndex((char, i) => char !== password[i]);
            return {
                success: false,
                code: 401,
                message: `Found a mismatch while checking each character (${indexOfDifference})`,
            };
        });
        return makeNs(authenticate);
    }

    it("recovers the password one confirmed prefix character at a time", async () => {
        const secret = "4de9";
        const ns = makeTimingAttackNs(secret);
        const details = makeDetails({ passwordLength: secret.length });

        const result = await solver("2G_cellular").solve(ns, "host", details);

        expect(result.success).toBe(true);
    });
});

describe("SpiceLevelSolver (RateMyPix.Auth)", () => {
    function makeSpiceLevelNs(secret: string) {
        const authenticate = vi.fn(async (_host: string, password: string) => {
            if (password === secret) {
                return { success: true, code: 200, message: "Success" };
            }
            const exactCount = password.split("").filter((char, i) => char === secret[i]).length;
            const pepperRepresentation = exactCount > 0 ? "🌶️".repeat(exactCount) : "0";
            return {
                success: false,
                code: 401,
                message: "Not spicy enough",
                data: `${pepperRepresentation}/${secret.length}`,
            };
        });
        return makeNs(authenticate);
    }

    it("finds the password from a count of correct-position characters", async () => {
        const secret = "7b3";
        const ns = makeSpiceLevelNs(secret);
        const details = makeDetails({ passwordLength: secret.length });

        const result = await solver("RateMyPix.Auth").solve(ns, "host", details);

        expect(result.success).toBe(true);
    });
});

describe("DivisibilityTestSolver (Factori-Os)", () => {
    function makeDivisibilityNs(secret: number) {
        const authenticate = vi.fn(async (_host: string, attemptedPassword: string) => {
            if (attemptedPassword === secret.toString()) {
                return { success: true, code: 200, message: "Success" };
            }
            const attemptedDivisor = Number(attemptedPassword);
            const divisible = !(isNaN(+attemptedPassword) || secret % attemptedDivisor || attemptedPassword === "");
            return {
                success: false,
                code: 401,
                message: divisible
                    ? `Password IS divisible by '${attemptedPassword}'`
                    : `Password is not divisible by '${attemptedPassword}'`,
                data: divisible ? "true" : "false",
            };
        });
        return makeNs(authenticate);
    }

    it("factors the password via divisibility probes, then submits the exact value", async () => {
        const secret = 2 * 2 * 3 * 5; // = 60
        const ns = makeDivisibilityNs(secret);
        const details = makeDetails({ passwordHint: "Password is divisible by 1 ;)" });

        const result = await solver("Factori-Os").solve(ns, "host", details);

        expect(result.success).toBe(true);
    });
});

describe("TripleModuloSolver (BigMo%od)", () => {
    function makeTripleModuloNs(secret: number) {
        const authenticate = vi.fn(async (_host: string, attemptedPassword: string) => {
            if (attemptedPassword === secret.toString()) {
                return { success: true, code: 200, message: "Success" };
            }
            const input = Number(attemptedPassword);
            const result = (secret % input) % (((input - 1) % 32) + 1);
            return { success: false, code: 401, message: "(password % n) % (n % 32)", data: result.toString() };
        });
        return makeNs(authenticate);
    }

    it("reconstructs the password from repeated (password % n) % (n % 32) probes", async () => {
        const secret = 137;
        const ns = makeTripleModuloNs(secret);
        const details = makeDetails();

        const result = await solver("BigMo%od").solve(ns, "host", details);

        expect(result.success).toBe(true);
    });
});

describe("GlobalMaximaSolver (KingOfTheHill)", () => {
    // Simplified vs. the game's actual multi-hill WHRNG-seeded terrain: a single smooth peak
    // centered on the password, which is enough to validate a hill-climbing strategy.
    function makeGlobalMaximaNs(secret: number) {
        const authenticate = vi.fn(async (_host: string, attemptedPassword: string) => {
            if (attemptedPassword === secret.toString()) {
                return { success: true, code: 200, message: "Success" };
            }
            const x = Number(attemptedPassword);
            const altitude = 10000 * Math.exp(-((x - secret) ** 2) / 10 ** 8);
            return {
                success: false,
                code: 401,
                message: "Ascend the highest mountain!",
                data: altitude.toString(),
            };
        });
        return makeNs(authenticate);
    }

    it("climbs toward the peak altitude to find the password", async () => {
        const secret = 4200;
        const ns = makeGlobalMaximaNs(secret);
        const details = makeDetails();

        const result = await solver("KingOfTheHill").solve(ns, "host", details);

        expect(result.success).toBe(true);
    });
});

describe("PacketSnifferSolver (OpenWebAccessPoint)", () => {
    it("extracts the 'hostname:password' pair embedded in the sniffed noise", async () => {
        const secret = "n3tw0rk";
        const hostname = "some-host";
        const noise = "xkjqw ".repeat(20);
        const embedded = ` ${hostname}:${secret} `;
        const data = noise.slice(0, 40) + embedded + noise.slice(40);

        const authenticate = vi.fn(async (_host: string, password: string) => ({
            success: password === secret,
            code: password === secret ? 200 : 401,
            message: password === secret ? "Success" : "Unauthorized",
            data,
        }));
        const ns = makeNs(authenticate);
        const details = makeDetails({ data, difficulty: 5 });

        const result = await solver("OpenWebAccessPoint").solve(ns, hostname, details);

        expect(result.success).toBe(true);
    });
});
